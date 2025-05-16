import { Injectable, NotFoundException, ConflictException, InternalServerErrorException, Logger, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Brackets, IsNull } from 'typeorm';
import { Patient } from './entities/patient.entity';
import { CreatePatientDto } from './dto/create-patient.dto';
import { User, UserRole } from '../auth/entities/user.entity';
import { PatientQueryDto } from './dto/patient-query.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { Purchase } from '../purchases/entities/purchase.entity';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { AppointmentsService } from '../appointments/appointments.service';
import { Appointment } from '../appointments/entities/appointment.entity';
import { AppointmentQueryDto } from '../appointments/dto/appointment-query.dto';
import { AuditLogService } from '../modules/audit-log/audit-log.service';

@Injectable()
export class PatientsService {
  private readonly logger = new Logger(PatientsService.name);

  constructor(
    @InjectRepository(Patient)
    private patientsRepository: Repository<Patient>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Purchase)
    private purchasesRepository: Repository<Purchase>,
    @Inject(forwardRef(() => AppointmentsService))
    private appointmentsService: AppointmentsService,
    private auditLogService: AuditLogService,
  ) {}

  async create(createPatientDto: CreatePatientDto, currentUser: User): Promise<Patient> {
    const { consultantId, email, ...patientData } = createPatientDto;

    const consultant = await this.usersRepository.findOne({
      where: { 
        id: consultantId,
        // Volitelně ověřit, zda je to skutečně konzultant nebo admin:
        // role: In([UserRole.CONSULTANT, UserRole.ADMIN]) 
      }
    });

    if (!consultant) {
      throw new NotFoundException(`Consultant with ID "${consultantId}" not found.`);
    }

    // Příklad dodatečné kontroly oprávnění:
    // if (currentUser.role === UserRole.CONSULTANT && currentUser.id !== consultant.id) {
    //   throw new ForbiddenException('Consultants can only assign patients to themselves.');
    // }

    if (email) {
      const existingPatientByEmail = await this.patientsRepository.findOne({ where: { email } });
      if (existingPatientByEmail) {
        throw new ConflictException(`Patient with email "${email}" already exists.`);
      }
    }
    
    const newPatient = this.patientsRepository.create({
      ...patientData,
      email,
      consultant: consultant, 
      consultantId: consultant.id,
    });

    try {
      await this.patientsRepository.save(newPatient);
      this.auditLogService.logAction({
          userId: currentUser.id,
          userName: currentUser.name,
          action: 'PATIENT_CREATED',
          details: { 
            patientId: newPatient.id, 
            patientName: newPatient.name,
            consultantId: newPatient.consultantId,
            initialData: createPatientDto 
          },
      });
      return newPatient; 
    } catch (error) {
      this.logger.error(`Failed to create patient: ${(error as Error).message}`, (error as Error).stack);
      this.auditLogService.logAction({
          userId: currentUser.id,
          userName: currentUser.name,
          action: 'PATIENT_CREATE_FAILED',
          details: { data: createPatientDto, error: (error as Error).message },
      });
      if ((error as any).code === '23505') {
        throw new ConflictException('Patient with this email or other unique field already exists.');
      }
      throw new InternalServerErrorException('Error creating patient.');
    }
  }

  async findAll(
    queryDto: PatientQueryDto,
    currentUser: User,
  ): Promise<{ data: Patient[]; total: number; page: number; limit: number; totalPages: number }> {
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'DESC', search, consultantId, lastVisitFrom, lastVisitTo } = queryDto;
    const skip = (page - 1) * limit;

    const queryBuilder = this.patientsRepository.createQueryBuilder('patient')
      .leftJoinAndSelect('patient.consultant', 'consultant');

    if (currentUser.role === UserRole.CONSULTANT) {
      queryBuilder.where('patient.consultantId = :currentUserId', { currentUserId: currentUser.id });
    } else if (currentUser.role === UserRole.ADMIN && consultantId) {
      queryBuilder.where('patient.consultantId = :filterConsultantId', { filterConsultantId: consultantId });
    } else {
        if (queryBuilder.expressionMap.wheres.length > 0) {
            queryBuilder.andWhere('patient.deletedAt IS NULL');
        } else {
            queryBuilder.where('patient.deletedAt IS NULL');
        }
    }
    
    if (currentUser.role === UserRole.CONSULTANT || (currentUser.role === UserRole.ADMIN && consultantId)) {
        queryBuilder.andWhere('patient.deletedAt IS NULL');
    }

    if (search) {
      queryBuilder.andWhere(
        new Brackets(qb => {
          qb.where('patient.name ILIKE :search', { search: `%${search}%` })
            .orWhere('patient.email ILIKE :search', { search: `%${search}%` })
            .orWhere('patient.phone ILIKE :search', { search: `%${search}%` });
        })
      );
    }

    if (lastVisitFrom) {
      queryBuilder.andWhere('patient.lastVisit >= :lastVisitFrom', { lastVisitFrom });
    }
    if (lastVisitTo) {
      queryBuilder.andWhere('patient.lastVisit <= :lastVisitTo', { lastVisitTo });
    }
    
    const validSortByFields = ['id', 'name', 'email', 'createdAt', 'updatedAt', 'lastVisit', 'totalSpent'];
    const safeSortBy = validSortByFields.includes(sortBy) ? sortBy : 'createdAt';
    queryBuilder.orderBy(`patient.${safeSortBy}`, sortOrder.toUpperCase() as 'ASC' | 'DESC');

    queryBuilder.skip(skip).take(limit);

    try {
      const [data, total] = await queryBuilder.getManyAndCount();
      const totalPages = Math.ceil(total / limit);
      return { data, total, page, limit, totalPages };
    } catch (error) {
      this.logger.error(`Failed to find all patients: ${(error as Error).message}`, (error as Error).stack);
      throw new InternalServerErrorException('Error fetching patients.');
    }
  }

  async findOne(id: number, currentUser: User): Promise<Patient> {
    const queryBuilder = this.patientsRepository.createQueryBuilder('patient')
      .leftJoinAndSelect('patient.consultant', 'consultant')
      .where('patient.id = :id', { id })
      .andWhere('patient.deletedAt IS NULL');

    const patient = await queryBuilder.getOne();

    if (!patient) {
      throw new NotFoundException(`Patient with ID "${id}" not found.`);
    }

    if (currentUser.role === UserRole.CONSULTANT && patient.consultantId !== currentUser.id) {
      throw new ForbiddenException('You do not have permission to view this patient.');
    }
    
    return patient;
  }

  async update(id: number, updatePatientDto: UpdatePatientDto, currentUser: User): Promise<Patient> {
    const patientToUpdate = await this.findOne(id, currentUser); 

    const originalData = { ...patientToUpdate };

    const { email, consultantId, ...patientData } = updatePatientDto;

    if (email && email !== patientToUpdate.email) {
      const existingPatientByEmail = await this.patientsRepository.findOne({ where: { email } });
      if (existingPatientByEmail) {
        throw new ConflictException(`Patient with email "${email}" already exists.`);
      }
      patientToUpdate.email = email;
    } else if (email === null && updatePatientDto.hasOwnProperty('email')) { 
      patientToUpdate.email = undefined; 
    }

    if (consultantId && consultantId !== patientToUpdate.consultantId) {
      if (currentUser.role !== UserRole.ADMIN) {
        throw new ForbiddenException('Only administrators can change the assigned consultant.');
      }
      const newConsultant = await this.usersRepository.findOne({ where: { id: consultantId } });
      if (!newConsultant) {
        throw new NotFoundException(`New consultant with ID "${consultantId}" not found.`);
      }
      patientToUpdate.consultant = newConsultant;
      patientToUpdate.consultantId = newConsultant.id;
    }

    Object.assign(patientToUpdate, patientData);

    try {
      const savedPatient = await this.patientsRepository.save(patientToUpdate);

      const changes = {};
      for(const key in updatePatientDto) {
          if(originalData[key] !== savedPatient[key]) {
              if (key === 'consultantId' && originalData.consultantId !== savedPatient.consultantId) {
                  changes[key] = { old: originalData.consultantId, new: savedPatient.consultantId };
              } else if (key !== 'consultantId') {
                  changes[key] = { old: originalData[key], new: savedPatient[key] };
              }
          }
      }

      if (Object.keys(changes).length > 0) {
        this.auditLogService.logAction({
            userId: currentUser.id,
            userName: currentUser.name,
            action: 'PATIENT_UPDATED',
            details: { 
              patientId: savedPatient.id, 
              patientName: savedPatient.name,
              changes: changes
            },
        });
      }
      return savedPatient;
    } catch (error) {
      this.logger.error(`Failed to update patient with ID "${id}": ${(error as Error).message}`, (error as Error).stack);
      this.auditLogService.logAction({
            userId: currentUser.id,
            userName: currentUser.name,
            action: 'PATIENT_UPDATE_FAILED',
            details: { patientId: id, data: updatePatientDto, error: (error as Error).message },
      });
      if ((error as any).code === '23505') { 
        throw new ConflictException('Error updating patient due to a conflict (e.g., duplicate email).');
      }
      throw new InternalServerErrorException('Error updating patient.');
    }
  }

  async remove(id: number, currentUser: User): Promise<void> {
    if (currentUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only administrators can delete patients.');
    }
    const patientToRemove = await this.findOne(id, currentUser);

    try {
      const result = await this.patientsRepository.softDelete(id);
      
      if (result.affected === 0) {
        throw new NotFoundException(`Patient with ID "${id}" not found for soft deletion.`);
      }

      this.auditLogService.logAction({
            userId: currentUser.id,
            userName: currentUser.name,
            action: 'PATIENT_SOFT_DELETED',
            details: { patientId: id, patientName: patientToRemove.name },
      });
    } catch (error) {
      this.logger.error(`Failed to soft delete patient ID ${id}: ${(error as Error).message}`, (error as Error).stack);
      this.auditLogService.logAction({
            userId: currentUser.id,
            userName: currentUser.name,
            action: 'PATIENT_SOFT_DELETE_FAILED',
            details: { patientId: id, error: (error as Error).message },
      });
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Error soft deleting patient.');
    }
  }

  async findPurchasesForPatient(
    patientId: number,
    queryDto: PaginationQueryDto, 
    currentUser: User,
  ): Promise<{ data: Purchase[]; total: number; page: number; limit: number; totalPages: number }> {
    await this.findOne(patientId, currentUser);

    const { page = 1, limit = 10, sortBy = 'purchaseDate', sortOrder = 'DESC' } = queryDto;
    const skip = (page - 1) * limit;

    const queryBuilder = this.purchasesRepository.createQueryBuilder('purchase')
      .leftJoinAndSelect('purchase.patient', 'patient')
      .leftJoinAndSelect('purchase.consultant', 'consultant')
      .leftJoinAndSelect('purchase.items', 'purchaseItem') 
      .leftJoinAndSelect('purchaseItem.inventoryItem', 'inventoryItem') 
      .where('purchase.patientId = :patientId', { patientId });

    const validSortByFields = ['purchaseDate', 'totalAmount', 'createdAt'];
    const safeSortBy = validSortByFields.includes(sortBy) ? `purchase.${sortBy}` : 'purchase.purchaseDate';
    queryBuilder.orderBy(safeSortBy, sortOrder.toUpperCase() as 'ASC' | 'DESC');

    queryBuilder.skip(skip).take(limit);

    try {
      const [data, total] = await queryBuilder.getManyAndCount();
      const totalPages = Math.ceil(total / limit);
      return { data, total, page, limit, totalPages };
    } catch (error) {
      this.logger.error(`Failed to find purchases for patient ID "${patientId}": ${(error as Error).message}`, (error as Error).stack);
      throw new InternalServerErrorException('Error fetching patient purchases.');
    }
  }

  async findAppointmentsForPatient(
    patientId: number,
    queryDto: AppointmentQueryDto,
    currentUser: User,
  ): Promise<{ data: Appointment[]; total: number; page: number; limit: number; totalPages: number }> {
    await this.findOne(patientId, currentUser);

    const appointmentsQueryDto: AppointmentQueryDto = {
      ...queryDto,
      patientId: patientId,
    };

    return this.appointmentsService.findAll(appointmentsQueryDto, currentUser);
  }

  async getStats(currentUser: User): Promise<any> { 
    const queryBuilderBase = this.patientsRepository.createQueryBuilder('patient');

    if (currentUser.role === UserRole.CONSULTANT) {
      queryBuilderBase.where('patient.consultantId = :currentUserId', { currentUserId: currentUser.id });
    }

    try {
      const totalPatients = await queryBuilderBase.getCount();

      const today = new Date();
      // Použijeme startOfMonth z date-fns, pokud ji máme, jinak jednoduchá implementace:
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      
      const newPatientsQueryBuilder = queryBuilderBase.clone();
      newPatientsQueryBuilder.andWhere('patient.createdAt >= :firstDayOfMonth', { firstDayOfMonth });
      const newPatientsThisMonth = await newPatientsQueryBuilder.getCount();

      const averageSpendPerPatient = 0; 
      const topSpendingPatients = [];   

      let patientsByConsultant: Array<{ consultantId: number; consultantName: string; patientCount: number }> = [];
      if (currentUser.role === UserRole.ADMIN) {
        const result = await this.patientsRepository.createQueryBuilder('patient')
          .select('patient.consultantId', 'consultantId')
          .addSelect('COUNT(patient.id)', 'patientCount')
          .leftJoin('patient.consultant', 'consultantUser')
          .addSelect('consultantUser.name', 'consultantName')
          .groupBy('patient.consultantId')
          .addGroupBy('consultantUser.name')
          .getRawMany(); 
        
        patientsByConsultant = result.map(r => ({
            consultantId: r.consultantId,
            consultantName: r.consultantName,
            patientCount: parseInt(r.patientCount, 10)
        }));
      } else if (currentUser.role === UserRole.CONSULTANT) {
        patientsByConsultant = [{
            consultantId: currentUser.id,
            consultantName: currentUser.name,
            patientCount: totalPatients 
        }];
      }

      return {
        totalPatients,
        newPatientsThisMonth,
        averageSpendPerPatient,
        topSpendingPatients,
        patientsByConsultant,
      };
    } catch (error) {
      this.logger.error(`Failed to get patient stats: ${(error as Error).message}`, (error as Error).stack);
      throw new InternalServerErrorException('Error fetching patient statistics.');
    }
  }
}
