import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException, InternalServerErrorException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager, In, Brackets, EntityNotFoundError, FindOptionsWhere, Between } from 'typeorm';
import { Appointment, AppointmentStatus } from './entities/appointment.entity';
import { AppointmentProductItem } from './entities/appointment-product-item.entity';
import { User, UserRole } from '../auth/entities/user.entity';
import { PatientProfile } from '../patients/entities/patient-profile.entity';
import { AppointmentType } from '../appointment-types/entities/appointment-type.entity';
import { InventoryItem } from '../inventory/entities/inventory-item.entity';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { AppointmentQueryDto, AppointmentSortBy } from './dto/appointment-query.dto';
import { UpdateAppointmentStatusDto } from './dto/update-appointment-status.dto';
import { CalendarQueryDto } from './dto/calendar-query.dto';
import { CalendarAppointmentItemDto } from './dto/calendar-appointment-item.dto';
import { AuditLogService } from '../modules/audit-log/audit-log.service';
import { MoreThan, LessThan } from 'typeorm'; // Pokud již není, nebo podobný import pro operátory
import { WorkingHoursService } from '../working-hours/working-hours.service';
import { BookAppointmentDto } from './dto/book-appointment.dto';

@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name);

  constructor(
    @InjectRepository(Appointment)
    private appointmentsRepository: Repository<Appointment>,
    @InjectRepository(AppointmentProductItem)
    private appointmentProductItemsRepository: Repository<AppointmentProductItem>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(PatientProfile)
    private patientProfilesRepository: Repository<PatientProfile>,
    @InjectRepository(AppointmentType)
    private appointmentTypesRepository: Repository<AppointmentType>,
    @InjectRepository(InventoryItem)
    private inventoryItemsRepository: Repository<InventoryItem>,
    private entityManager: EntityManager,
    private auditLogService: AuditLogService,
    @Inject(forwardRef(() => WorkingHoursService))
    private workingHoursService: WorkingHoursService,
  ) {}

  async create(createDto: CreateAppointmentDto, currentUser: User): Promise<Appointment> {
    return this.entityManager.transaction(async transactionalEntityManager => {
      const { patientId, appointmentTypeId, consultantId, date, notes, products: productDtos = [], status: requestedStatus } = createDto;
      const itemDetailsForLog: {id: number, name: string, quantity: number}[] = [];

      const patientProfile = await transactionalEntityManager.findOne(PatientProfile, { where: { id: patientId } });
      if (!patientProfile) throw new NotFoundException(`Patient profile with ID "${patientId}" not found.`);

      const appointmentType = await transactionalEntityManager.findOne(AppointmentType, { where: { id: appointmentTypeId } });
      if (!appointmentType) throw new NotFoundException(`Appointment type with ID "${appointmentTypeId}" not found.`);

      if (currentUser.role === UserRole.CONSULTANT) {
        if (!appointmentType.visibleToAll) {
          const isVisible = await transactionalEntityManager.exists(AppointmentType, {
            where: { 
              id: appointmentTypeId, 
              visibleToSpecificConsultants: { id: currentUser.id } 
            } as FindOptionsWhere<AppointmentType>,
          });
          if (!isVisible) {
            throw new ForbiddenException(`Appointment type "${appointmentType.name}" is not available to you.`);
          }
        }
      }
      
      let assignedConsultant: User;
      if (currentUser.role === UserRole.ADMIN) {
        if (!consultantId) throw new BadRequestException('Admin must specify consultantId.');
        const foundConsultant = await transactionalEntityManager.findOne(User, { where: { id: consultantId, role: In([UserRole.ADMIN, UserRole.CONSULTANT])} });
        if (!foundConsultant) throw new NotFoundException(`Assigned consultant with ID "${consultantId}" not found or is not a consultant/admin.`);
        assignedConsultant = foundConsultant;
      } else { 
        if (consultantId && consultantId !== currentUser.id) {
          throw new ForbiddenException('Consultants can only create appointments for themselves.');
        }
        assignedConsultant = currentUser;
      }

      let productsTotalPrice = 0;
      const appointmentProductItems: AppointmentProductItem[] = [];

      for (const itemDto of productDtos) {
        const inventoryItem = await transactionalEntityManager.findOne(InventoryItem, { where: { id: itemDto.inventoryItemId } });
        if (!inventoryItem) throw new NotFoundException(`Inventory item with ID "${itemDto.inventoryItemId}" not found.`);
        if (inventoryItem.quantity < itemDto.quantity) {
          throw new BadRequestException(`Not enough stock for item "${inventoryItem.name}". Available: ${inventoryItem.quantity}, Requested: ${itemDto.quantity}.`);
        }

        inventoryItem.quantity -= itemDto.quantity;
        await transactionalEntityManager.save(InventoryItem, inventoryItem);

        const priceAtTime = parseFloat(inventoryItem.priceWithoutVAT as any);
        const vatAtTime = parseFloat(inventoryItem.vatRate as any);
        const subTotalProduct = parseFloat((itemDto.quantity * priceAtTime * (1 + vatAtTime / 100)).toFixed(2));
        productsTotalPrice += subTotalProduct;

        const newProductItem = transactionalEntityManager.create(AppointmentProductItem, {
          inventoryItemId: inventoryItem.id,
          inventoryItem: inventoryItem,
          quantity: itemDto.quantity,
          priceAtTimeOfBooking: priceAtTime,
          vatRateAtTimeOfBooking: vatAtTime,
        });
        appointmentProductItems.push(newProductItem);
        itemDetailsForLog.push({ id: inventoryItem.id, name: inventoryItem.name, quantity: itemDto.quantity });
      }

      const appointmentTypePrice = parseFloat(appointmentType.price as any);
      const finalTotalPrice = parseFloat((appointmentTypePrice + productsTotalPrice).toFixed(2));

      const newAppointment = transactionalEntityManager.create(Appointment, {
        patientProfileId: patientProfile.id,
        patientProfile: patientProfile,
        appointmentTypeId: appointmentType.id,
        appointmentType: appointmentType,
        consultantId: assignedConsultant.id,
        consultant: assignedConsultant,
        date: new Date(date),
        notes,
        status: requestedStatus || AppointmentStatus.UPCOMING,
        appointmentProducts: appointmentProductItems, 
        totalPrice: finalTotalPrice,
      });
      
      const savedAppointment = await transactionalEntityManager.save(Appointment, newAppointment);
      
      const currentTotalSpent = parseFloat(patientProfile.totalSpent as any || '0');
      patientProfile.totalSpent = parseFloat((currentTotalSpent + finalTotalPrice).toFixed(2));
      
      const patientAppointmentsForLastVisit = await transactionalEntityManager.find(Appointment, {
        where: { patientProfileId: patientProfile.id, status: In([AppointmentStatus.UPCOMING, AppointmentStatus.COMPLETED]) },
        order: { date: 'DESC' },
      });
      if (patientAppointmentsForLastVisit.length > 0) {
        patientProfile.lastVisit = patientAppointmentsForLastVisit[0].date;
      } else {
        patientProfile.lastVisit = undefined;
      }
      await transactionalEntityManager.save(PatientProfile, patientProfile);

      this.auditLogService.logAction({
        userId: currentUser.id,
        userName: currentUser.name,
        action: 'APPOINTMENT_CREATED',
        details: {
          appointmentId: savedAppointment.id,
          patientProfileId: patientProfile.id,
          patientName: patientProfile.name,
          appointmentTypeId: appointmentType.id,
          appointmentTypeName: appointmentType.name,
          consultantId: assignedConsultant.id,
          consultantName: assignedConsultant.name,
          date: savedAppointment.date,
          totalPrice: savedAppointment.totalPrice,
          status: savedAppointment.status,
          items: itemDetailsForLog,
        }
      });

      const resultAppointment = await transactionalEntityManager.findOne(Appointment, {
        where: { id: savedAppointment.id },
        relations: ['patientProfile', 'consultant', 'appointmentType', 'appointmentProducts', 'appointmentProducts.inventoryItem'],
      });
      
      if (!resultAppointment) {
          this.logger.error(`Failed to re-fetch appointment with ID ${savedAppointment.id} after saving in transaction.`);
          throw new InternalServerErrorException('Error finalizing appointment creation details.');
      }
      this.logger.log(`Appointment ID ${resultAppointment.id} created successfully.`);
      return resultAppointment;
    }).catch(error => {
        this.logger.error(`Failed to create appointment transaction: ${(error as Error).message}`, (error as Error).stack);
        this.auditLogService.logAction({
          userId: currentUser.id,
          userName: currentUser.name,
          action: 'APPOINTMENT_CREATE_FAILED',
          details: { data: createDto, error: (error as Error).message },
        });
        throw error;
    });
  }

  async findAll(
    queryDto: AppointmentQueryDto,
    currentUser: User,
  ): Promise<{ data: Appointment[]; total: number; page: number; limit: number; totalPages: number }> {
    const {
      page = 1,
      limit = 10,
      sortBy = AppointmentSortBy.DATE,
      sortOrder = 'DESC',
      search,
      status,
      consultantId: filterConsultantId,
      patientProfileId,
      appointmentTypeId,
      startDate,
      endDate,
    } = queryDto;
    const skip = (page - 1) * limit;

    const queryBuilder = this.appointmentsRepository.createQueryBuilder('appointment')
      .leftJoinAndSelect('appointment.patientProfile', 'patientProfile')
      .leftJoinAndSelect('patientProfile.user', 'patientUser')
      .leftJoinAndSelect('appointment.consultant', 'consultant')
      .leftJoinAndSelect('appointment.appointmentType', 'appointmentType')
      .leftJoinAndSelect('appointment.appointmentProducts', 'appointmentProductItem')
      .leftJoinAndSelect('appointmentProductItem.inventoryItem', 'inventoryItem');

    if (currentUser.role === UserRole.CONSULTANT) {
      queryBuilder.where('appointment.consultantId = :currentUserId', { currentUserId: currentUser.id });
    } else if (currentUser.role === UserRole.ADMIN && filterConsultantId) {
      queryBuilder.where('appointment.consultantId = :filterConsultantId', { filterConsultantId });
    }

    if (patientProfileId) {
      queryBuilder.andWhere('appointment.patientProfileId = :patientProfileId', { patientProfileId });
    }
    if (appointmentTypeId) {
      queryBuilder.andWhere('appointment.appointmentTypeId = :appointmentTypeId', { appointmentTypeId });
    }
    if (status) {
      queryBuilder.andWhere('appointment.status = :status', { status });
    }
    if (startDate) {
      queryBuilder.andWhere('appointment.date >= :startDate', { startDate });
    }
    if (endDate) {
      const inclusiveEndDate = new Date(endDate);
      inclusiveEndDate.setDate(inclusiveEndDate.getDate() + 1);
      queryBuilder.andWhere('appointment.date < :inclusiveEndDate', { inclusiveEndDate: inclusiveEndDate.toISOString().split('T')[0] });
    }

    if (search) {
      queryBuilder.andWhere(
        new Brackets(qb => {
          qb.where('patientProfile.name ILIKE :search', { search: `%${search}%` })
            .orWhere('patientUser.email ILIKE :search', { search: `%${search}%` })
            .orWhere('consultant.name ILIKE :search', { search: `%${search}%` })
            .orWhere('appointmentType.name ILIKE :search', { search: `%${search}%` })
            .orWhere('appointment.notes ILIKE :search', { search: `%${search}%` });
        }),
      );
    }

    const validSortByFields: Record<AppointmentSortBy, string> = {
      [AppointmentSortBy.DATE]: 'appointment.date',
      [AppointmentSortBy.PATIENT_NAME]: 'patientProfile.name',
      [AppointmentSortBy.CONSULTANT_NAME]: 'consultant.name',
      [AppointmentSortBy.TYPE_NAME]: 'appointmentType.name',
      [AppointmentSortBy.STATUS]: 'appointment.status',
      [AppointmentSortBy.CREATED_AT]: 'appointment.createdAt',
    };
    const safeSortBy = validSortByFields[sortBy] || 'appointment.date';
    queryBuilder.orderBy(safeSortBy, sortOrder.toUpperCase() as 'ASC' | 'DESC');

    queryBuilder.skip(skip).take(limit);

    try {
      const [data, total] = await queryBuilder.getManyAndCount();
      const totalPages = Math.ceil(total / limit);
      return { data, total, page, limit, totalPages };
    } catch (error) {
      this.logger.error(`Failed to find all appointments: ${(error as Error).message}`, (error as Error).stack);
      throw new InternalServerErrorException('Error fetching appointments.');
    }
  }

  async findMyNestedAppointments(currentUser: User, queryDto: AppointmentQueryDto): Promise<Appointment[]> {
    this.logger.debug(`User ${currentUser.id} (${currentUser.role}) fetching their appointments.`);
    const { page = 1, limit = 100, sortBy = AppointmentSortBy.DATE, sortOrder = 'DESC', status, startDate, endDate, appointmentTypeId } = queryDto; // Zvýšený defaultní limit pro "moje" schůzky
    const skip = (page - 1) * limit;

    const queryBuilder = this.appointmentsRepository.createQueryBuilder('appointment')
      .leftJoinAndSelect('appointment.patientProfile', 'patientProfile')
      .leftJoinAndSelect('patientProfile.user', 'patientUser') // Pro případ, že bychom potřebovali info z User entity pacienta
      .leftJoinAndSelect('appointment.consultant', 'consultant')
      .leftJoinAndSelect('appointment.appointmentType', 'appointmentType')
      .leftJoinAndSelect('appointment.appointmentProducts', 'appointmentProductItem')
      .leftJoinAndSelect('appointmentProductItem.inventoryItem', 'inventoryItem');

    if (currentUser.role === UserRole.PATIENT) {
      const patientProfile = await this.patientProfilesRepository.findOne({ where: { userId: currentUser.id } });
      if (!patientProfile) {
        this.logger.warn(`No patient profile found for user ID ${currentUser.id}. Returning empty array for /me.`);
        return [];
      }
      queryBuilder.where('appointment.patientProfileId = :patientProfileId', { patientProfileId: patientProfile.id });
    } else if (currentUser.role === UserRole.CONSULTANT) {
      queryBuilder.where('appointment.consultantId = :consultantId', { consultantId: currentUser.id });
    } else {
      this.logger.warn(`User role ${currentUser.role} is not explicitly handled for /appointments/me. Returning empty array.`);
      return [];
    }

    if (status) {
      queryBuilder.andWhere('appointment.status = :status', { status });
    }
    if (appointmentTypeId) {
      queryBuilder.andWhere('appointment.appointmentTypeId = :appointmentTypeId', { appointmentTypeId });
    }
    if (startDate) {
      queryBuilder.andWhere('appointment.date >= :startDate', { startDate });
    }
    if (endDate) {
      const inclusiveEndDate = new Date(endDate);
      inclusiveEndDate.setDate(inclusiveEndDate.getDate() + 1);
      queryBuilder.andWhere('appointment.date < :inclusiveEndDate', { inclusiveEndDate: inclusiveEndDate.toISOString().split('T')[0] });
    }
    
    const validSortByFields: Record<AppointmentSortBy, string> = {
      [AppointmentSortBy.DATE]: 'appointment.date',
      [AppointmentSortBy.PATIENT_NAME]: 'patientProfile.name',
      [AppointmentSortBy.CONSULTANT_NAME]: 'consultant.name',
      [AppointmentSortBy.TYPE_NAME]: 'appointmentType.name',
      [AppointmentSortBy.STATUS]: 'appointment.status',
      [AppointmentSortBy.CREATED_AT]: 'appointment.createdAt',
    };

    const safeSortBy = validSortByFields[sortBy] || validSortByFields[AppointmentSortBy.DATE];
    queryBuilder.orderBy(safeSortBy, sortOrder.toUpperCase() as 'ASC' | 'DESC');

    queryBuilder.skip(skip).take(limit);

    try {
      const appointments = await queryBuilder.getMany();
      return appointments;
    } catch (error) {
      this.logger.error(`Failed to fetch appointments for user ${currentUser.id}: ${(error as Error).message}`, (error as Error).stack);
      throw new InternalServerErrorException('Error fetching appointments.');
    }
  }

  async findOne(id: number, currentUser: User): Promise<Appointment> {
    const appointment = await this.appointmentsRepository.findOne({
      where: { id },
      relations: [
        'patientProfile', 
        'consultant', 
        'appointmentType', 
        'appointmentProducts', 
        'appointmentProducts.inventoryItem'
      ],
    });

    if (!appointment) {
      throw new NotFoundException(`Appointment with ID "${id}" not found.`);
    }

    if (currentUser.role === UserRole.CONSULTANT && appointment.consultantId !== currentUser.id) {
      throw new ForbiddenException('You do not have permission to view this appointment.');
    }

    return appointment;
  }

  async update(id: number, updateDto: UpdateAppointmentDto, currentUser: User): Promise<Appointment> {
    return this.entityManager.transaction(async transactionalEntityManager => {
      this.logger.log(`Attempting to update appointment with ID: ${id} by user ID: ${currentUser.id}`);

      const appointment = await transactionalEntityManager.findOne(Appointment, {
        where: { id },
        relations: [
          'patientProfile', 
          'consultant',
          'appointmentType',
          'appointmentProducts',
          'appointmentProducts.inventoryItem',
        ],
      });

      if (!appointment) {
        throw new NotFoundException(`Appointment with ID "${id}" not found.`);
      }

      if (currentUser.role === UserRole.CONSULTANT) {
        if (appointment.consultantId !== currentUser.id) {
          throw new ForbiddenException('Consultants can only update their own appointments.');
        }
        if (updateDto.consultantId && updateDto.consultantId !== currentUser.id) {
          throw new ForbiddenException('Consultants cannot change the assigned consultant.');
        }
      }
      
      if (appointment.status === AppointmentStatus.CANCELLED) {
          throw new BadRequestException('Cannot update a cancelled appointment.');
      }
      if (appointment.status === AppointmentStatus.COMPLETED) {
          this.logger.log(`Updating a COMPLETED appointment (ID: ${id}). Caution: Certain changes might be restricted or have unintended side effects.`);
      }

      const originalAppointmentTotalPrice = parseFloat(appointment.totalPrice as any);
      const patientProfile = await transactionalEntityManager.findOneOrFail(PatientProfile, { where: { id: appointment.patientProfileId } });
      const originalPatientTotalSpent = parseFloat(patientProfile.totalSpent as any);
      const originalAppointmentProducts = [...appointment.appointmentProducts];

      if (updateDto.notes !== undefined) {
        appointment.notes = updateDto.notes;
      }
      if (updateDto.date) {
        const newDate = new Date(updateDto.date);
        appointment.date = newDate;
      }

      let newAppointmentTypePrice = parseFloat(appointment.appointmentType.price as any);
      if (updateDto.appointmentTypeId && updateDto.appointmentTypeId !== appointment.appointmentTypeId) {
        const newAppointmentType = await transactionalEntityManager.findOne(AppointmentType, { where: { id: updateDto.appointmentTypeId } });
        if (!newAppointmentType) throw new NotFoundException(`New appointment type with ID "${updateDto.appointmentTypeId}" not found.`);
        
        if (currentUser.role === UserRole.CONSULTANT) {
            if (!newAppointmentType.visibleToAll) {
                const isVisible = await transactionalEntityManager.exists(AppointmentType, {
                    where: { 
                        id: newAppointmentType.id, 
                        visibleToSpecificConsultants: { id: currentUser.id } 
                    } as FindOptionsWhere<AppointmentType>,
                });
                if (!isVisible) throw new ForbiddenException(`New appointment type "${newAppointmentType.name}" is not available to you.`);
            }
        }
        appointment.appointmentType = newAppointmentType;
        appointment.appointmentTypeId = newAppointmentType.id;
        newAppointmentTypePrice = parseFloat(newAppointmentType.price as any);
        this.logger.log(`Appointment type updated to ID: ${newAppointmentType.id} for appointment ID: ${id}`);
      }

      if (currentUser.role === UserRole.ADMIN && updateDto.consultantId && updateDto.consultantId !== appointment.consultantId) {
        const newConsultant = await transactionalEntityManager.findOne(User, { where: { id: updateDto.consultantId, role: In([UserRole.ADMIN, UserRole.CONSULTANT]) } });
        if (!newConsultant) throw new NotFoundException(`New consultant with ID "${updateDto.consultantId}" not found or is not a consultant/admin.`);
        appointment.consultant = newConsultant;
        appointment.consultantId = newConsultant.id;
        this.logger.log(`Consultant updated to ID: ${newConsultant.id} for appointment ID: ${id}`);
      }
      
      let currentProductsTotalPrice = 0;
      const finalProductItemsForAppointment: AppointmentProductItem[] = [];

      if (updateDto.products !== undefined) {
        this.logger.log(`Updating products for appointment ID: ${id}. DTO contains ${updateDto.products.length} products.`);
        const productDtos = updateDto.products;
        const existingProductItemsMap = new Map(originalAppointmentProducts.map(p => [p.inventoryItemId, p]));

        for (const itemDto of productDtos) {
          const inventoryItemEntity = await transactionalEntityManager.findOne(InventoryItem, { where: { id: itemDto.inventoryItemId } });
          if (!inventoryItemEntity) throw new NotFoundException(`Inventory item with ID "${itemDto.inventoryItemId}" not found during update.`);
          
          const existingProductItem = existingProductItemsMap.get(itemDto.inventoryItemId);

          if (existingProductItem) {
            const quantityDifference = itemDto.quantity - existingProductItem.quantity;
            if (quantityDifference > 0 && inventoryItemEntity.quantity < quantityDifference) {
              throw new BadRequestException(`Not enough stock for item "${inventoryItemEntity.name}" to increase quantity. Available: ${inventoryItemEntity.quantity}, Required additional: ${quantityDifference}.`);
            }
            inventoryItemEntity.quantity -= quantityDifference; 
            
            existingProductItem.quantity = itemDto.quantity;
            currentProductsTotalPrice += parseFloat((existingProductItem.quantity * parseFloat(existingProductItem.priceAtTimeOfBooking as any) * (1 + parseFloat(existingProductItem.vatRateAtTimeOfBooking as any) / 100)).toFixed(2));
            finalProductItemsForAppointment.push(existingProductItem);
            existingProductItemsMap.delete(itemDto.inventoryItemId); 
          } else {
            if (inventoryItemEntity.quantity < itemDto.quantity) {
              throw new BadRequestException(`Not enough stock for new item "${inventoryItemEntity.name}". Available: ${inventoryItemEntity.quantity}, Requested: ${itemDto.quantity}.`);
            }
            inventoryItemEntity.quantity -= itemDto.quantity;
            
            const priceAtTime = parseFloat(inventoryItemEntity.priceWithoutVAT as any);
            const vatAtTime = parseFloat(inventoryItemEntity.vatRate as any);
            currentProductsTotalPrice += parseFloat((itemDto.quantity * priceAtTime * (1 + vatAtTime / 100)).toFixed(2));

            const newProductItem = transactionalEntityManager.create(AppointmentProductItem, {
              appointment: appointment, 
              inventoryItemId: inventoryItemEntity.id,
              inventoryItem: inventoryItemEntity,
              quantity: itemDto.quantity,
              priceAtTimeOfBooking: priceAtTime,
              vatRateAtTimeOfBooking: vatAtTime,
            });
            finalProductItemsForAppointment.push(newProductItem);
          }
          await transactionalEntityManager.save(InventoryItem, inventoryItemEntity);
        }

        for (const productItemToRemove of existingProductItemsMap.values()) {
          const invItem = await transactionalEntityManager.findOne(InventoryItem, { where: { id: productItemToRemove.inventoryItemId }});
          if (invItem) {
            invItem.quantity += productItemToRemove.quantity;
            await transactionalEntityManager.save(InventoryItem, invItem);
          }
          await transactionalEntityManager.remove(AppointmentProductItem, productItemToRemove);
          this.logger.log(`Product ID ${productItemToRemove.inventoryItemId} (AP_Item ID: ${productItemToRemove.id}) removed from appointment ${id}. Stock updated.`);
        }
        appointment.appointmentProducts = finalProductItemsForAppointment;
      } else { 
        this.logger.log(`Products field not present in DTO for appointment ID: ${id}. Existing products and their prices retained.`);
        originalAppointmentProducts.forEach(p => {
            currentProductsTotalPrice += parseFloat((p.quantity * parseFloat(p.priceAtTimeOfBooking as any) * (1 + parseFloat(p.vatRateAtTimeOfBooking as any) / 100)).toFixed(2));
        });
        appointment.appointmentProducts = originalAppointmentProducts; 
      }
      
      appointment.totalPrice = parseFloat((newAppointmentTypePrice + currentProductsTotalPrice).toFixed(2));
      this.logger.log(`Appointment ID ${id} new total price: ${appointment.totalPrice}`);
      
      const savedAppointment = await transactionalEntityManager.save(Appointment, appointment); 

      const priceDifference = parseFloat(savedAppointment.totalPrice as any) - originalAppointmentTotalPrice;
      patientProfile.totalSpent = parseFloat((originalPatientTotalSpent + priceDifference).toFixed(2));
      this.logger.log(`Patient ID ${patientProfile.id} total spent updated from ${originalPatientTotalSpent.toFixed(2)} to: ${patientProfile.totalSpent.toFixed(2)} (difference: ${priceDifference.toFixed(2)})`);
      
      const patientAppointments = await transactionalEntityManager.find(Appointment, {
        where: { patientProfileId: patientProfile.id, status: In([AppointmentStatus.UPCOMING, AppointmentStatus.COMPLETED]) },
        order: { date: 'DESC' },
      });

      const oldLastVisitTime = patientProfile.lastVisit instanceof Date ? patientProfile.lastVisit.getTime() : null;
      if (patientAppointments.length > 0) {
        patientProfile.lastVisit = patientAppointments[0].date;
      } else {
        patientProfile.lastVisit = undefined;
      }
      const newLastVisitTime = patientProfile.lastVisit instanceof Date ? patientProfile.lastVisit.getTime() : null;

      if (oldLastVisitTime !== newLastVisitTime) {
          this.logger.log(`Patient ID ${patientProfile.id} last visit reliably updated to: ${patientProfile.lastVisit ? patientProfile.lastVisit.toISOString() : 'undefined'}`);
      }
      await transactionalEntityManager.save(PatientProfile, patientProfile);

      const changes = this.diffObjects(originalAppointmentProducts, savedAppointment.appointmentProducts);
      if (Object.keys(changes).length > 0) {
         this.auditLogService.logAction({
            userId: currentUser.id,
            userName: currentUser.name,
            action: 'APPOINTMENT_UPDATED',
            details: { appointmentId: id, changes },
         });
      }

      const resultAppointment = await transactionalEntityManager.findOneOrFail(Appointment, {
        where: { id: savedAppointment.id }, 
        relations: ['patientProfile', 'consultant', 'appointmentType', 'appointmentProducts', 'appointmentProducts.inventoryItem'],
      });
      this.logger.log(`Appointment ID ${id} successfully updated and re-fetched.`);
      return resultAppointment;
    }).catch(error => {
        this.logger.error(`Failed to update appointment transaction ID ${id}: ${(error as Error).message}`, (error as Error).stack);
        this.auditLogService.logAction({
          userId: currentUser.id,
          userName: currentUser.name,
          action: 'APPOINTMENT_UPDATE_FAILED',
          details: { appointmentId: id, data: updateDto, error: (error as Error).message },
        });
        throw error;
    });
  }

  async updateStatus(id: number, updateStatusDto: UpdateAppointmentStatusDto, currentUser: User): Promise<Appointment> {
    return this.entityManager.transaction(async transactionalEntityManager => {
      const appointment = await transactionalEntityManager.findOne(Appointment, { 
          where: { id },
          relations: ['consultant', 'patientProfile', 'appointmentType', 'appointmentProducts', 'appointmentProducts.inventoryItem'], 
      });
      if (!appointment) throw new NotFoundException(`Appointment with ID "${id}" not found.`);

      if (currentUser.role === UserRole.CONSULTANT && appointment.consultantId !== currentUser.id) {
          throw new ForbiddenException('You do not have permission to update status of this appointment.');
      }
      
      const oldStatus = appointment.status;
      const newStatus = updateStatusDto.status;
      
      if (oldStatus === newStatus) return appointment;

      appointment.status = newStatus;

      if (oldStatus !== AppointmentStatus.CANCELLED && newStatus === AppointmentStatus.CANCELLED) {
        this.logger.log(`Appointment ID ${id} status changed to CANCELLED. Reverting inventory and patient stats.`);
        await this.entityManager.transaction(async transactionalEntityManager => {
          const patient = await transactionalEntityManager.findOneOrFail(PatientProfile, { where: {id: appointment.patientProfileId }});
          const originalAppointmentPriceForCancellation = parseFloat(appointment.totalPrice as any);

          for (const aptProduct of appointment.appointmentProducts) {
            const inventoryItem = await transactionalEntityManager.findOne(InventoryItem, { where: { id: aptProduct.inventoryItemId } });
            if (inventoryItem) {
              inventoryItem.quantity += aptProduct.quantity;
              await transactionalEntityManager.save(InventoryItem, inventoryItem);
              this.logger.log(`Returned ${aptProduct.quantity} of item ID ${aptProduct.inventoryItemId} to stock for cancelled appointment ${id}.`);
            }
          }
          appointment.totalPrice = 0;

          patient.totalSpent = parseFloat( (parseFloat(patient.totalSpent as any) - originalAppointmentPriceForCancellation).toFixed(2) );
          if (patient.totalSpent < 0) patient.totalSpent = 0;

          const patientAppointments = await transactionalEntityManager.find(Appointment, {
              where: { patientProfileId: patient.id, status: In([AppointmentStatus.UPCOMING, AppointmentStatus.COMPLETED]) },
              order: { date: 'DESC' },
          });
          if (patientAppointments.length > 0) {
              patient.lastVisit = patientAppointments[0].date;
          } else {
              patient.lastVisit = undefined;
          }
          await transactionalEntityManager.save(PatientProfile, patient);
          await transactionalEntityManager.save(Appointment, appointment);
        });
      } else if (oldStatus === AppointmentStatus.CANCELLED && (newStatus === AppointmentStatus.UPCOMING || newStatus === AppointmentStatus.COMPLETED)) {
          this.logger.log(`Appointment ID ${id} status changed from ${oldStatus} to ${newStatus}. Ensure patient stats are correct.`);
          if (oldStatus === AppointmentStatus.CANCELLED && 
              (newStatus === AppointmentStatus.UPCOMING || newStatus === AppointmentStatus.COMPLETED)) {
             throw new BadRequestException(`Reverting a CANCELLED appointment status to ${newStatus} via this endpoint is complex and not fully supported. Please use the full update endpoint if you need to reconstruct a cancelled appointment.`);
          }
           await this.entityManager.transaction(async transactionalEntityManager => {
              const patient = await transactionalEntityManager.findOneOrFail(PatientProfile, { where: {id: appointment.patientProfileId }});
              const patientAppointments = await transactionalEntityManager.find(Appointment, {
                  where: { patientProfileId: patient.id, status: In([AppointmentStatus.UPCOMING, AppointmentStatus.COMPLETED]) },
                  order: { date: 'DESC' },
              });
              if (patientAppointments.length > 0) {
                  patient.lastVisit = patientAppointments[0].date;
              } else {
                  patient.lastVisit = undefined;
              }
              await transactionalEntityManager.save(PatientProfile, patient);
              await transactionalEntityManager.save(Appointment, appointment);
          });
      } else {
           await this.appointmentsRepository.save(appointment);
      }

      const savedAppointment = await transactionalEntityManager.save(Appointment, appointment);

      this.auditLogService.logAction({
        userId: currentUser.id,
        userName: currentUser.name,
        action: 'APPOINTMENT_STATUS_UPDATED',
        details: {
          appointmentId: id,
          oldStatus: oldStatus,
          newStatus: newStatus,
          patientProfileId: savedAppointment.patientProfileId,
          consultantId: savedAppointment.consultantId,
        }
      });

      return savedAppointment;
    }).catch(error => {
      this.logger.error(`Failed to update appointment status transaction ID ${id}: ${(error as Error).message}`, (error as Error).stack);
      this.auditLogService.logAction({
        userId: currentUser.id,
        userName: currentUser.name,
        action: 'APPOINTMENT_STATUS_UPDATE_FAILED',
        details: { appointmentId: id, status: updateStatusDto.status, error: (error as Error).message },
      });
      throw error;
    });
  }

  async deleteAppointment(id: number, currentUser: User): Promise<Appointment> {
    this.logger.log(`Attempting to 'soft delete' (cancel) appointment ID: ${id} by user ID: ${currentUser.id}`);
    return this.updateStatus(id, { status: AppointmentStatus.CANCELLED }, currentUser);
  }

  async getCalendarAppointments(
    queryDto: CalendarQueryDto,
    currentUser: User,
  ): Promise<CalendarAppointmentItemDto[]> {
    this.logger.debug(`getCalendarAppointments called with DTO: ${JSON.stringify(queryDto)} by user ${currentUser.id}`);
    const { startDate, endDate, consultantId } = queryDto;

    const queryBuilder = this.appointmentsRepository.createQueryBuilder('appointment')
      .leftJoinAndSelect('appointment.patientProfile', 'patientProfile')
      .leftJoinAndSelect('appointment.consultant', 'consultant')
      .leftJoinAndSelect('appointment.appointmentType', 'appointmentType')
      .where('appointment.date >= :startDate', { startDate: new Date(startDate) })
      .andWhere('appointment.date <= :endDate', { endDate: new Date(endDate) });

    if (currentUser.role === UserRole.CONSULTANT) {
      queryBuilder.andWhere('appointment.consultantId = :consultantId', { consultantId: currentUser.id });
    } else if (currentUser.role === UserRole.ADMIN) {
      if (consultantId !== undefined) {
        this.logger.debug(`Admin querying calendar for consultantId: ${consultantId}`);
        queryBuilder.andWhere('appointment.consultantId = :consultantId', { consultantId });
      }
    }

    queryBuilder.orderBy('appointment.date', 'ASC');

    const appointments = await queryBuilder.getMany();
    
    return appointments.map(app => {
        const appointmentEnd = new Date(app.date);
        const duration = typeof app.appointmentType?.durationMinutes === 'number' 
                         ? app.appointmentType.durationMinutes 
                         : 60;
        appointmentEnd.setMinutes(appointmentEnd.getMinutes() + duration);

        return {
            id: app.id,
            title: `${app.patientProfile?.name || 'N/A'} - ${app.appointmentType?.name || 'N/A'}`,
            start: app.date.toISOString(),
            end: appointmentEnd.toISOString(),
            patientProfileId: app.patientProfileId,
            patientName: app.patientProfile?.name || 'N/A',
            appointmentTypeId: app.appointmentTypeId,
            appointmentTypeName: app.appointmentType?.name || 'N/A',
            consultantId: app.consultantId,
            consultantName: app.consultant?.name || 'N/A',
            status: app.status,
            notes: app.notes,
            durationMinutes: duration,
        };
    });
  }

  private diffObjects(obj1: any, obj2: any): Record<string, any> {
      const diff = {};
      for (const key in obj2) {
          if (obj1.hasOwnProperty(key) && JSON.stringify(obj1[key]) !== JSON.stringify(obj2[key])) {
              if (!(obj2[key] instanceof Object) && !(Array.isArray(obj2[key]))) {
                 diff[key] = { old: obj1[key], new: obj2[key] };
              }
          }
      }
      return diff;
  }

  async bookAppointment(bookDto: BookAppointmentDto, currentUser: User): Promise<Appointment> {
    this.logger.log(`User ${currentUser.id} (role: ${currentUser.role}) attempting to book appointment with DTO: ${JSON.stringify(bookDto)}`);

    if (currentUser.role !== UserRole.PATIENT) {
      throw new ForbiddenException('Only patients can book appointments.');
    }

    const { consultantId, appointmentTypeId, startAt, notes } = bookDto;

    const patientProfile = await this.patientProfilesRepository.findOne({ where: { userId: currentUser.id } });
    if (!patientProfile) {
      throw new NotFoundException(`Patient profile not found for current user (ID: ${currentUser.id}).`);
    }
    this.logger.debug(`Patient profile ID ${patientProfile.id} found for user ${currentUser.id}`);

    return this.entityManager.transaction(async transactionalEntityManager => {
      const consultant = await transactionalEntityManager.findOne(User, {
        where: { id: consultantId, role: In([UserRole.CONSULTANT, UserRole.ADMIN]) },
      });
      if (!consultant) {
        throw new NotFoundException(`Consultant with ID "${consultantId}" not found or is not a valid consultant.`);
      }
      this.logger.debug(`Consultant ID ${consultant.id} found.`);

      const appointmentType = await transactionalEntityManager.findOne(AppointmentType, { where: { id: appointmentTypeId } });
      if (!appointmentType) {
        throw new NotFoundException(`Appointment type with ID "${appointmentTypeId}" not found.`);
      }
      this.logger.debug(`Appointment type ID ${appointmentType.id} (${appointmentType.name}) found.`);

      const appointmentStartDate = new Date(startAt);
      if (isNaN(appointmentStartDate.getTime())) {
          throw new BadRequestException('Invalid startAt date format.');
      }
      
      // TODO: Implement robust slot availability check using workingHoursService
      // and overlap check for both consultant and patient.

      const appointmentEndDate = new Date(appointmentStartDate);
      appointmentEndDate.setMinutes(appointmentEndDate.getMinutes() + appointmentType.durationMinutes);

      const conflictingAppointment = await transactionalEntityManager.createQueryBuilder(Appointment, 'app')
        .leftJoin('app.appointmentType', 'at') // Join with AppointmentType to access durationMinutes
        .where('app.consultantId = :consultantId', { consultantId })
        .andWhere('app.status NOT IN (:...cancelledStatuses)', { cancelledStatuses: [AppointmentStatus.CANCELLED, AppointmentStatus.REJECTED] })
        .andWhere(new Brackets(qb => {
            // Check for overlap: (new_start < existing_end) AND (existing_start < new_end)
            // existing_end is calculated as app.date + (at.durationMinutes * interval '1 minute')
            qb.where(':appointmentStartDate < (app.date + (at.durationMinutes * interval \'1 minute\'))', { 
                appointmentStartDate // new_start from a variable
             })
              .andWhere('app.date < :appointmentEndDate', { 
                appointmentEndDate // new_end from a variable
              });
        }))
        .getOne();

      if (conflictingAppointment) {
        this.logger.warn(`Found conflicting appointment ID ${conflictingAppointment.id} for consultant ${consultantId} at ${startAt}`);
        throw new BadRequestException(
          `The selected time slot conflicts with an existing appointment for consultant ${consultantId}. Please choose a different time.`,
        );
      }
       const conflictingPatientAppointment = await transactionalEntityManager.createQueryBuilder(Appointment, 'app')
        .leftJoin('app.appointmentType', 'at') // Join with AppointmentType to access durationMinutes
        .where('app.patientProfileId = :patientProfileId', { patientProfileId: patientProfile.id })
        .andWhere('app.status NOT IN (:...cancelledStatuses)', { cancelledStatuses: [AppointmentStatus.CANCELLED, AppointmentStatus.REJECTED] })
        .andWhere(new Brackets(qb => {
            // Check for overlap: (new_start < existing_end) AND (existing_start < new_end)
            // existing_end is calculated as app.date + (at.durationMinutes * interval '1 minute')
            qb.where(':appointmentStartDate < (app.date + (at.durationMinutes * interval \'1 minute\'))', {
                appointmentStartDate // new_start from a variable
             })
              .andWhere('app.date < :appointmentEndDate', {
                appointmentEndDate // new_end from a variable
              });
        }))
        .getOne();

      if (conflictingPatientAppointment) {
         this.logger.warn(`Found conflicting appointment ID ${conflictingPatientAppointment.id} for patient ${patientProfile.id} at ${startAt}`);
        throw new BadRequestException(
          `You already have an appointment that conflicts with the selected time slot. Please choose a different time.`,
        );
      }

      const newAppointment = transactionalEntityManager.create(Appointment, {
        patientProfileId: patientProfile.id,
        consultantId: consultant.id,
        appointmentTypeId: appointmentType.id,
        date: appointmentStartDate,
        endDate: appointmentEndDate,
        notes: notes,
        price: appointmentType.price,
        status: AppointmentStatus.SCHEDULED,
        createdBy: currentUser.id,
        updatedBy: currentUser.id,
      });

      const savedAppointment = await transactionalEntityManager.save(newAppointment);
      this.logger.log(`New appointment ID ${savedAppointment.id} booked successfully by patient ${patientProfile.id} with consultant ${consultant.id}.`);

      await this.auditLogService.logAction({
        userId: currentUser.id,
        userName: currentUser.name, // Assuming User entity has 'name'
        action: 'APPOINTMENT_BOOKED_BY_PATIENT',
        details: { 
          appointmentId: savedAppointment.id,
          consultantId: savedAppointment.consultantId,
          patientProfileId: savedAppointment.patientProfileId,
          appointmentTypeId: savedAppointment.appointmentTypeId,
          date: savedAppointment.date.toISOString(),
        },
        // ipAddress and userAgent can be populated if available from the request
      });

      return savedAppointment;
    });
  }

  async getTotalRevenueFromCompletedAppointments(): Promise<number> {
    try {
      const result = await this.appointmentsRepository
        .createQueryBuilder('appointment')
        .select('SUM(appointment.totalPrice)', 'total')
        .where('appointment.status = :status', { status: AppointmentStatus.COMPLETED })
        .getRawOne();

      this.logger.log(`Raw total completed appointment revenue: ${JSON.stringify(result)}`);
      return result && result.total ? parseFloat(result.total) : 0;
    } catch (error) {
      this.logger.error(`Failed to get total revenue from completed appointments: ${(error as Error).message}`, (error as Error).stack);
      throw new InternalServerErrorException('Error calculating total revenue from completed appointments.');
    }
  }
} 