import { Injectable, NotFoundException, ForbiddenException, InternalServerErrorException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions, ILike, In, IsNull, Not } from 'typeorm';
import { InventoryItem } from './entities/inventory-item.entity';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { UpdateInventoryItemDto } from './dto/update-inventory-item.dto';
import { InventoryQueryDto } from './dto/inventory-query.dto';
import { RestockInventoryItemDto } from './dto/restock-inventory-item.dto';
import { UpdateInventoryItemVisibilityDto } from './dto/update-inventory-item-visibility.dto';
import { User, UserRole } from '../auth/entities/user.entity'; // Potřebujeme User a UserRole
import { AuditLogService } from '../modules/audit-log/audit-log.service'; // Import AuditLogService

const LOW_STOCK_THRESHOLD = 10;

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    @InjectRepository(InventoryItem)
    private inventoryItemsRepository: Repository<InventoryItem>,
    @InjectRepository(User) // Abychom mohli načítat konzultanty pro visibility
    private usersRepository: Repository<User>,
    private auditLogService: AuditLogService, // Injekt AuditLogService
  ) {}

  async create(
    createInventoryItemDto: CreateInventoryItemDto,
    currentUser: User,
  ): Promise<InventoryItem> {
    const { visibleToSpecificConsultantIds, ...itemData } = createInventoryItemDto;

    const newItem = this.inventoryItemsRepository.create({
      ...itemData,
      createdBy: currentUser,
      updatedBy: currentUser,
    });

    if (visibleToSpecificConsultantIds && visibleToSpecificConsultantIds.length > 0 && !newItem.visibleToAll) {
      const consultants = await this.usersRepository.findBy({ 
        id: In(visibleToSpecificConsultantIds),
        role: UserRole.CONSULTANT,
      });
      newItem.visibleToSpecificConsultants = consultants;
    }

    try {
      const savedItem = await this.inventoryItemsRepository.save(newItem);
      // Přidáno logování
      this.auditLogService.logAction({
        userId: currentUser.id,
        userName: currentUser.name,
        action: 'INVENTORY_ITEM_CREATED',
        details: { 
          itemId: savedItem.id, 
          itemName: savedItem.name,
          initialData: createInventoryItemDto 
        },
      });
      return savedItem;
    } catch (error) {
      this.logger.error(`Failed to create inventory item: ${(error as Error).message}`, (error as Error).stack);
      // Přidáno logování selhání
      this.auditLogService.logAction({
        userId: currentUser.id,
        userName: currentUser.name,
        action: 'INVENTORY_ITEM_CREATE_FAILED',
        details: { data: createInventoryItemDto, error: (error as Error).message },
      });
      throw new InternalServerErrorException('Error creating inventory item');
    }
  }

  async findAll(
    queryDto: InventoryQueryDto,
    currentUser: User,
  ): Promise<{ data: InventoryItem[]; total: number; page: number; limit: number; totalPages: number }> {
    const { page = 1, limit = 10, sortBy, sortOrder, search, lowStock, visibleToConsultantId } = queryDto;
    const skip = (page - 1) * limit;

    const queryBuilder = this.inventoryItemsRepository.createQueryBuilder('item');

    // Podmínka viditelnosti
    if (currentUser.role === UserRole.CONSULTANT) {
      queryBuilder.leftJoinAndSelect('item.visibleToSpecificConsultants', 'consultant_visibility')
        .where('item.visibleToAll = :visibleToAll', { visibleToAll: true })
        .orWhere('consultant_visibility.id = :userId', { userId: currentUser.id });
    } else if (currentUser.role === UserRole.ADMIN && visibleToConsultantId) {
        // Admin filtruje pro konkrétního konzultanta
        queryBuilder.leftJoin('item.visibleToSpecificConsultants', 'specific_consultant')
            .where('item.visibleToAll = :visibleToAll OR specific_consultant.id = :consultantId', {
                visibleToAll: true, // Admin by měl vidět i 'visibleToAll' položky, pokud filtruje pro konzultanta
                consultantId: visibleToConsultantId,
            });
    }
    // Admin bez filtru na konzultanta vidí vše (žádná další podmínka where není potřeba pro viditelnost)

    if (search) {
      this.logger.debug(`Applying search filter: ${search}`);
      queryBuilder.andWhere(
        '(item.name ILIKE :search OR item.description ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (lowStock === true) {
      this.logger.debug(`Applying lowStock filter. Threshold: ${LOW_STOCK_THRESHOLD}`);
      queryBuilder.andWhere('item.quantity < :lowStockThreshold', { lowStockThreshold: LOW_STOCK_THRESHOLD });
    }

    if (sortBy && sortOrder) {
      queryBuilder.orderBy(`item.${sortBy}`, sortOrder.toUpperCase() as 'ASC' | 'DESC');
    } else {
      queryBuilder.orderBy('item.createdAt', 'DESC'); // Defaultní řazení
    }

    queryBuilder.skip(skip).take(limit);
    
    // Načtení vztahů, pokud jsou potřeba pro zobrazení (např. pro admina, který chce vidět, kdo má co vidět)
    // Pokud je to admin, možná budeme chtít načíst `visibleToSpecificConsultants` vždy.
    if (currentUser.role === UserRole.ADMIN) {
        queryBuilder.leftJoinAndSelect('item.visibleToSpecificConsultants', 'consultants_admin_view');
    }

    try {
      const [data, total] = await queryBuilder.getManyAndCount();
      const totalPages = Math.ceil(total / limit);
      return { data, total, page, limit, totalPages };
    } catch (error) {
      this.logger.error(`Failed to find all inventory items: ${(error as Error).message}`, (error as Error).stack);
      throw new InternalServerErrorException('Error fetching inventory items');
    }
  }

  async findOne(id: number, currentUser: User): Promise<InventoryItem> {
    const queryBuilder = this.inventoryItemsRepository.createQueryBuilder('item')
        .where('item.id = :id', { id });

    if (currentUser.role === UserRole.ADMIN) {
        queryBuilder.leftJoinAndSelect('item.visibleToSpecificConsultants', 'consultants_admin_view');
    }

    const item = await queryBuilder.getOne();

    if (!item) {
      throw new NotFoundException(`Inventory item with ID "${id}" not found`);
    }

    // Kontrola viditelnosti pro konzultanta
    if (currentUser.role === UserRole.CONSULTANT) {
      if (!item.visibleToAll) {
        // Musíme explicitně načíst vztah, pokud nebyl načten (eager: false)
        const itemWithVisibility = await this.inventoryItemsRepository.findOne({
            where: { id }, 
            relations: ['visibleToSpecificConsultants']
        });
        const isVisibleToThisConsultant = itemWithVisibility?.visibleToSpecificConsultants?.some(c => c.id === currentUser.id);
        if (!isVisibleToThisConsultant) {
          throw new ForbiddenException('You do not have permission to view this item.');
        }
      }
    }
    return item;
  }

  async update(
    id: number,
    updateInventoryItemDto: UpdateInventoryItemDto,
    currentUser: User,
  ): Promise<InventoryItem> {
    const itemToUpdate = await this.inventoryItemsRepository.findOne({
        where: { id },
        relations: ['visibleToSpecificConsultants'], 
    });

    if (!itemToUpdate) {
      throw new NotFoundException(`Inventory item with ID "${id}" not found`);
    }

    if (currentUser.role === UserRole.CONSULTANT) {
        throw new ForbiddenException('Consultants cannot directly update inventory items.');
    }

    const originalData = { ...itemToUpdate }; 
    const originalVisibleIds = itemToUpdate.visibleToSpecificConsultants?.map(c => c.id) || [];

    const { visibleToSpecificConsultantIds, ...itemData } = updateInventoryItemDto;

    Object.assign(itemToUpdate, itemData);
    itemToUpdate.updatedBy = currentUser; 

    let visibilityChanged = false;
    if (visibleToSpecificConsultantIds !== undefined) {
      const currentVisibleIds = itemToUpdate.visibleToSpecificConsultants?.map(c => c.id) || [];
      if (itemData.visibleToAll === false && visibleToSpecificConsultantIds.length > 0) {
        const consultants = await this.usersRepository.findBy({
          id: In(visibleToSpecificConsultantIds),
          role: UserRole.CONSULTANT,
        });
        itemToUpdate.visibleToSpecificConsultants = consultants;
      } else {
        itemToUpdate.visibleToSpecificConsultants = [];
      }
      const newVisibleIds = itemToUpdate.visibleToSpecificConsultants?.map(c => c.id) || [];
      if (JSON.stringify(currentVisibleIds.sort()) !== JSON.stringify(newVisibleIds.sort())) {
          visibilityChanged = true;
      }
    } 

    if (itemData.visibleToAll === true && itemToUpdate.visibleToSpecificConsultants && itemToUpdate.visibleToSpecificConsultants.length > 0) {
        if (visibleToSpecificConsultantIds === undefined || visibleToSpecificConsultantIds.length === 0) {
            if (itemToUpdate.visibleToSpecificConsultants.length > 0) visibilityChanged = true;
            itemToUpdate.visibleToSpecificConsultants = [];
        }
    }

    try {
      const savedItem = await this.inventoryItemsRepository.save(itemToUpdate);
      
      const changes = {};
      for(const key in itemData) {
          if(originalData[key] !== savedItem[key]) {
              changes[key] = { old: originalData[key], new: savedItem[key] };
          }
      }
      if (visibilityChanged) {
          changes['visibleToSpecificConsultantIds'] = { 
              old: originalVisibleIds,
              new: savedItem.visibleToSpecificConsultants?.map(c => c.id) || [] 
          };
      }

      if (Object.keys(changes).length > 0) {
        // Přidáno logování
        this.auditLogService.logAction({
          userId: currentUser.id,
          userName: currentUser.name,
          action: 'INVENTORY_ITEM_UPDATED',
          details: { 
            itemId: savedItem.id, 
            itemName: savedItem.name,
            changes: changes
          },
        });
      }
      return savedItem;
    } catch (error) {
      this.logger.error(`Failed to update inventory item ID ${id}: ${(error as Error).message}`, (error as Error).stack);
      // Přidáno logování selhání
      this.auditLogService.logAction({
        userId: currentUser.id,
        userName: currentUser.name,
        action: 'INVENTORY_ITEM_UPDATE_FAILED',
        details: { itemId: id, data: updateInventoryItemDto, error: (error as Error).message },
      });
      throw new InternalServerErrorException('Error updating inventory item');
    }
  }

  async remove(id: number, currentUser: User): Promise<void> {
    if (currentUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can delete inventory items.');
    }
    const itemToRemove = await this.inventoryItemsRepository.findOneBy({ id });
    if (!itemToRemove) {
      throw new NotFoundException(`Inventory item with ID "${id}" not found`);
    }
    try {
      await this.inventoryItemsRepository.remove(itemToRemove);
      // Přidáno logování
      this.auditLogService.logAction({
        userId: currentUser.id,
        userName: currentUser.name,
        action: 'INVENTORY_ITEM_DELETED',
        details: { itemId: id, itemName: itemToRemove.name },
      });
    } catch (error) {
      this.logger.error(`Failed to delete inventory item ID ${id}: ${(error as Error).message}`, (error as Error).stack);
      // Přidáno logování selhání
      this.auditLogService.logAction({
        userId: currentUser.id,
        userName: currentUser.name,
        action: 'INVENTORY_ITEM_DELETE_FAILED',
        details: { itemId: id, error: (error as Error).message },
      });
      throw new InternalServerErrorException('Error deleting inventory item');
    }
  }

  async restock(
    id: number,
    restockDto: RestockInventoryItemDto,
    currentUser: User, // Pro případné ověření oprávnění dle viditelnosti
  ): Promise<InventoryItem> {
    const item = await this.findOne(id, currentUser); // findOne již řeší NotFound a viditelnost pro konzultanta
    // Pokud by konzultant neměl mít právo naskladnit, řešilo by se to guardem v controlleru.

    item.quantity += restockDto.quantity;
    // TODO: Zde by se měl vytvořit záznam do AuditLogu o naskladnění, včetně restockDto.notes

    try {
      return await this.inventoryItemsRepository.save(item);
    } catch (error) {
      this.logger.error(`Failed to restock inventory item with ID "${id}": ${(error as Error).message}`, (error as Error).stack);
      throw new InternalServerErrorException('Error restocking inventory item');
    }
  }

  async updateVisibility(
    id: number,
    updateVisibilityDto: UpdateInventoryItemVisibilityDto,
    currentUser: User, // Musí být Admin
  ): Promise<void> {
    if (currentUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only administrators can update item visibility.');
    }

    const itemToUpdate = await this.inventoryItemsRepository.findOne({
        where: { id },
        relations: ['visibleToSpecificConsultants'],
    });

    if (!itemToUpdate) {
      throw new NotFoundException(`Inventory item with ID "${id}" not found`);
    }

    const { visibleToAll, visibleToSpecificConsultantIds } = updateVisibilityDto;

    let visibilityChanged = false;
    const originalVisibleIds = itemToUpdate.visibleToSpecificConsultants?.map(c => c.id).sort() || [];

    if (visibleToAll !== undefined && itemToUpdate.visibleToAll !== visibleToAll) {
      itemToUpdate.visibleToAll = visibleToAll;
      visibilityChanged = true; 
    }

    if (visibleToSpecificConsultantIds !== undefined) {
      let consultants: User[] = [];
      if (itemToUpdate.visibleToAll === false && visibleToSpecificConsultantIds.length > 0) {
        consultants = await this.usersRepository.findBy({
          id: In(visibleToSpecificConsultantIds),
          role: UserRole.CONSULTANT,
        });
        // Log if some provided consultant IDs were not found or were not consultants?
      }
      // Compare new consultant list with old one
      const newVisibleIds = consultants.map(c => c.id).sort();
      if(JSON.stringify(originalVisibleIds) !== JSON.stringify(newVisibleIds)){
        visibilityChanged = true;
      }
      itemToUpdate.visibleToSpecificConsultants = consultants;
    } else if (itemToUpdate.visibleToAll === true && itemToUpdate.visibleToSpecificConsultants?.length > 0) {
      // If visibleToAll is true and specific list was not provided, clear the specific list
      itemToUpdate.visibleToSpecificConsultants = [];
      visibilityChanged = true; // Visibility changed because specific list was cleared
    }

    try {
      await this.inventoryItemsRepository.save(itemToUpdate); // Just save, don't return
      // Log the action (consider logging only if visibility actually changed)
      if (visibilityChanged) {
          this.auditLogService.logAction({
              userId: currentUser.id,
              userName: currentUser.name,
              action: 'INVENTORY_ITEM_VISIBILITY_UPDATED',
              details: {
                  itemId: itemToUpdate.id,
                  itemName: itemToUpdate.name,
                  visibleToAll: itemToUpdate.visibleToAll,
                  visibleToSpecificConsultantIds: itemToUpdate.visibleToSpecificConsultants?.map(c => c.id) || []
              }
          });
      }
    } catch (error) {
      this.logger.error(`Failed to update visibility for item ID "${id}": ${(error as Error).message}`, (error as Error).stack);
      // Log failure
      this.auditLogService.logAction({
        userId: currentUser.id,
        userName: currentUser.name,
        action: 'INVENTORY_ITEM_VISIBILITY_UPDATE_FAILED',
        details: { itemId: id, data: updateVisibilityDto, error: (error as Error).message },
      });
      throw new InternalServerErrorException('Error updating item visibility');
    }
  }

  async getStats(currentUser: User): Promise<any> { // Typ odpovědi podle API specifikace
    const queryBuilder = this.inventoryItemsRepository.createQueryBuilder('item');

    // Aplikace filtru viditelnosti na základě role uživatele
    if (currentUser.role === UserRole.CONSULTANT) {
      queryBuilder.leftJoin('item.visibleToSpecificConsultants', 'consultant_visibility') // Pouze join, nepotřebujeme selectovat konzultanty zde
        .where('item.visibleToAll = :visibleToAll', { visibleToAll: true })
        .orWhere('consultant_visibility.id = :userId', { userId: currentUser.id });
    }
    // Admin vidí vše, není třeba další podmínka

    try {
      const items = await queryBuilder.getMany();
      
      const totalItems = items.length;
      let totalValueWithoutVAT = 0;
      let totalValueWithVAT = 0;
      const lowStockThreshold = 5; // Stejný threshold jako v findAll
      let lowStockItemsCount = 0;

      items.forEach(item => {
        totalValueWithoutVAT += Number(item.priceWithoutVAT) * item.quantity;
        if (item.priceWithVAT) { // priceWithVAT může být null, pokud chybí sazba DPH
            totalValueWithVAT += Number(item.priceWithVAT) * item.quantity;
        }
        if (item.quantity < lowStockThreshold) {
          lowStockItemsCount++;
        }
      });

      // mostSoldItems a recentRestocks vyžadují další logiku/entity, které teď nemáme
      // Vrátíme prázdná pole nebo zjednodušenou verzi, pokud je to možné

      return {
        totalItems,
        totalValue: totalValueWithVAT, // API specifikace má jen `totalValue`, předpokládám s DPH
        totalValueWithoutVAT: totalValueWithoutVAT, // Pro úplnost, pokud by se hodilo
        lowStockItems: lowStockItemsCount,
        mostSoldItems: [], // Placeholder
        recentRestocks: [], // Placeholder
      };
    } catch (error) {
        this.logger.error(`Failed to get inventory stats: ${(error as Error).message}`, (error as Error).stack);
        throw new InternalServerErrorException('Error fetching inventory statistics');
    }
  }
}
