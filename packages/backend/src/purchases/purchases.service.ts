import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException, Logger, Inject, forwardRef, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager, Brackets } from 'typeorm';
import { Purchase } from './entities/purchase.entity';
import { PurchaseItem } from './entities/purchase-item.entity';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { User, UserRole } from '../auth/entities/user.entity';
import { Patient } from '../patients/entities/patient.entity';
import { InventoryItem } from '../inventory/entities/inventory-item.entity';
import { PurchaseQueryDto, PurchaseSortBy } from './dto/purchase-query.dto';
import { AuditLogService } from '../modules/audit-log/audit-log.service';
// PatientsService a InventoryService zde nebudeme přímo injectovat, raději použijeme přímo jejich repositories,
// abychom se vyhnuli možným cyklickým závislostem na úrovni služeb, pokud by to bylo složité.
// forwardRef je již použit v modulu pro repositories.

@Injectable()
export class PurchasesService {
  private readonly logger = new Logger(PurchasesService.name);

  constructor(
    @InjectRepository(Purchase)
    private purchasesRepository: Repository<Purchase>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Patient)
    private patientsRepository: Repository<Patient>,
    @InjectRepository(InventoryItem)
    private inventoryItemsRepository: Repository<InventoryItem>,
    private entityManager: EntityManager, 
    private auditLogService: AuditLogService,
  ) {}

  async create(createPurchaseDto: CreatePurchaseDto, currentUser: User): Promise<Purchase> {
    return this.entityManager.transaction(async transactionalEntityManager => {
      const { patientId, consultantId, purchaseDate, items: purchaseItemsDto, notes } = createPurchaseDto;

      const patient = await transactionalEntityManager.findOne(Patient, { where: { id: patientId } });
      if (!patient) {
        throw new NotFoundException(`Patient with ID "${patientId}" not found.`);
      }

      let recordingConsultant = currentUser;
      if (consultantId && consultantId !== currentUser.id) {
        if (currentUser.role !== UserRole.ADMIN) {
          throw new BadRequestException('You can only record purchases for yourself unless you are an admin.');
        }
        const assignedConsultant = await transactionalEntityManager.findOne(User, { where: { id: consultantId } });
        if (!assignedConsultant) {
          throw new NotFoundException(`Consultant with ID "${consultantId}" (who the purchase is being assigned to) not found.`);
        }
        recordingConsultant = assignedConsultant; 
      }

      let totalAmount = 0;
      const purchaseItemsToSave: PurchaseItem[] = []; 
      const itemDetailsForLog: {id: number, name: string, quantity: number}[] = []; 

      for (const itemDto of purchaseItemsDto) {
        const inventoryItem = await transactionalEntityManager.findOne(InventoryItem, { 
            where: { id: itemDto.inventoryItemId } 
        });
        if (!inventoryItem) {
          throw new NotFoundException(`Inventory item with ID "${itemDto.inventoryItemId}" not found.`);
        }
        if (inventoryItem.quantity < itemDto.quantity) {
          throw new BadRequestException(`Not enough stock for item "${inventoryItem.name}". Available: ${inventoryItem.quantity}, Requested: ${itemDto.quantity}.`);
        }

        inventoryItem.quantity -= itemDto.quantity;
        await transactionalEntityManager.save(InventoryItem, inventoryItem);

        const priceAtPurchase = inventoryItem.priceWithoutVAT; 
        const vatRateAtPurchase = inventoryItem.vatRate;
        const subTotal = parseFloat((itemDto.quantity * priceAtPurchase * (1 + vatRateAtPurchase / 100)).toFixed(2));
        
        totalAmount += subTotal;

        const newPurchaseItem = transactionalEntityManager.create(PurchaseItem, {
          inventoryItemId: inventoryItem.id, 
          quantity: itemDto.quantity,
          priceAtPurchase,
          vatRateAtPurchase,
          subTotal,
        });
        purchaseItemsToSave.push(newPurchaseItem);
        itemDetailsForLog.push({ id: inventoryItem.id, name: inventoryItem.name, quantity: itemDto.quantity });
      }

      const newPurchase = transactionalEntityManager.create(Purchase, {
        patientId: patient.id,
        consultantId: recordingConsultant.id,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
        items: purchaseItemsToSave, 
        totalAmount: parseFloat(totalAmount.toFixed(2)),
        notes,
      });

      const savedPurchase = await transactionalEntityManager.save(Purchase, newPurchase);
      
      patient.totalSpent = parseFloat((Number(patient.totalSpent) + savedPurchase.totalAmount).toFixed(2));
      await transactionalEntityManager.save(Patient, patient);
    
      this.auditLogService.logAction({
          userId: currentUser.id, 
          userName: currentUser.name,
          action: 'PURCHASE_CREATED',
          details: { 
            purchaseId: savedPurchase.id, 
            patientId: patient.id, 
            patientName: patient.name,
            consultantId: recordingConsultant.id, 
            consultantName: recordingConsultant.name,
            totalAmount: savedPurchase.totalAmount,
            items: itemDetailsForLog,
          },
      });

      const resultPurchase = await transactionalEntityManager.findOne(Purchase, {
        where: { id: savedPurchase.id },
        relations: ['patient', 'consultant', 'items', 'items.inventoryItem'], 
      });
       if (!resultPurchase) { 
          this.logger.error(`Failed to re-fetch purchase with ID ${savedPurchase.id} after saving in transaction.`);
          throw new InternalServerErrorException('Error finalizing purchase creation details.');
      }
      return resultPurchase;
    }).catch(error => {
        this.logger.error(`Failed to create purchase transaction: ${(error as Error).message}`, (error as Error).stack);
        this.auditLogService.logAction({
          userId: currentUser.id,
          userName: currentUser.name,
          action: 'PURCHASE_CREATE_FAILED',
          details: { data: createPurchaseDto, error: (error as Error).message },
        });
        throw error;
    });
  }

  async findOne(id: number, currentUser: User): Promise<Purchase> {
    const purchase = await this.purchasesRepository.findOne({
      where: { id },
      relations: ['patient', 'consultant', 'items', 'items.inventoryItem'],
    });

    if (!purchase) {
      throw new NotFoundException(`Purchase with ID "${id}" not found.`);
    }

    if (currentUser.role === UserRole.CONSULTANT) {
      if (purchase.consultantId !== currentUser.id) {
         const patientOfPurchase = await this.patientsRepository.findOne({where: {id: purchase.patientId, consultantId: currentUser.id}});
         if (!patientOfPurchase) {
            throw new ForbiddenException('You do not have permission to view this purchase.');
         }
      }
    }
    return purchase;
  }

  async findAll(
    queryDto: PurchaseQueryDto,
    currentUser: User,
  ): Promise<{ data: Purchase[]; total: number; page: number; limit: number; totalPages: number }> {
    const {
      page = 1,
      limit = 10,
      sortBy = PurchaseSortBy.PURCHASE_DATE,
      sortOrder = 'DESC',
      search,
      patientId,
      consultantId,
      purchaseDateFrom,
      purchaseDateTo,
    } = queryDto;
    const skip = (page - 1) * limit;

    const queryBuilder = this.purchasesRepository.createQueryBuilder('purchase')
      .leftJoinAndSelect('purchase.patient', 'patient')
      .leftJoinAndSelect('purchase.consultant', 'consultant')
      .leftJoinAndSelect('purchase.items', 'purchaseItem')
      .leftJoinAndSelect('purchaseItem.inventoryItem', 'inventoryItem');

    if (currentUser.role === UserRole.CONSULTANT) {
      queryBuilder.where(new Brackets(qb => {
        qb.where('purchase.consultantId = :currentUserId', { currentUserId: currentUser.id })
          .orWhere('patient.consultantId = :currentUserIdForPatient', { currentUserIdForPatient: currentUser.id });
      }));
    } else if (currentUser.role === UserRole.ADMIN && consultantId) {
      queryBuilder.where('purchase.consultantId = :filterConsultantId', { filterConsultantId: consultantId });
    }
    
    if (patientId) {
        if (queryBuilder.expressionMap.wheres.length > 0) {
            queryBuilder.andWhere('purchase.patientId = :patientIdParam', { patientIdParam: patientId });
        } else {
            queryBuilder.where('purchase.patientId = :patientIdParam', { patientIdParam: patientId });
        }
    }

    if (search) {
      const searchCondition = new Brackets(qb => {
        qb.where('patient.name ILIKE :search', { search: `%${search}%` })
          .orWhere('patient.email ILIKE :search', { search: `%${search}%` })
          .orWhere('consultant.name ILIKE :search', { search: `%${search}%` })
          .orWhere('inventoryItem.name ILIKE :search', { search: `%${search}%` })
          .orWhere('purchase.notes ILIKE :search', { search: `%${search}%` });
      });
      if (queryBuilder.expressionMap.wheres.length > 0) {
        queryBuilder.andWhere(searchCondition);
      } else {
        queryBuilder.where(searchCondition);
      }
    }

    if (purchaseDateFrom) {
      const condition = 'purchase.purchaseDate >= :purchaseDateFrom';
      queryBuilder.expressionMap.wheres.length > 0 ? queryBuilder.andWhere(condition, { purchaseDateFrom }) : queryBuilder.where(condition, { purchaseDateFrom });
    }
    if (purchaseDateTo) {
      const condition = 'purchase.purchaseDate <= :purchaseDateTo';
      queryBuilder.expressionMap.wheres.length > 0 ? queryBuilder.andWhere(condition, { purchaseDateTo }) : queryBuilder.where(condition, { purchaseDateTo });
    }

    const validSortByFields: Record<PurchaseSortBy, string> = {
      [PurchaseSortBy.PURCHASE_DATE]: 'purchase.purchaseDate',
      [PurchaseSortBy.TOTAL_AMOUNT]: 'purchase.totalAmount',
      [PurchaseSortBy.CREATED_AT]: 'purchase.createdAt',
      [PurchaseSortBy.PATIENT_NAME]: 'patient.name',
      [PurchaseSortBy.CONSULTANT_NAME]: 'consultant.name',
    };
    const safeSortBy = validSortByFields[sortBy] || 'purchase.purchaseDate';
    queryBuilder.orderBy(safeSortBy, sortOrder.toUpperCase() as 'ASC' | 'DESC');

    queryBuilder.skip(skip).take(limit);

    try {
      const [data, total] = await queryBuilder.getManyAndCount();
      const totalPages = Math.ceil(total / limit);
      return { data, total, page, limit, totalPages };
    } catch (error) {
      this.logger.error(`Failed to find all purchases: ${(error as Error).message}`, (error as Error).stack);
      throw new InternalServerErrorException('Error fetching purchases.');
    }
  }

  async getTotalRevenue(): Promise<number> {
    try {
      const result = await this.purchasesRepository
        .createQueryBuilder('purchase')
        .select('SUM(purchase.totalAmount)', 'total')
        .getRawOne();
      
      this.logger.log(`Raw total purchase revenue: ${JSON.stringify(result)}`);
      // result will be like { total: '12345.67' } or { total: null } if no purchases
      return result && result.total ? parseFloat(result.total) : 0;
    } catch (error) {
      this.logger.error(`Failed to get total purchase revenue: ${(error as Error).message}`, (error as Error).stack);
      throw new InternalServerErrorException('Error calculating total purchase revenue.');
    }
  }
}
