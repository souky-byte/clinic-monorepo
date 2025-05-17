import { Injectable, NotFoundException, ConflictException, InternalServerErrorException, Logger, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Brackets, IsNull, EntityManager } from 'typeorm';
import { PatientProfile } from './entities/patient-profile.entity';
import { CreatePatientDto } from './dto/create-patient.dto';
import { User, UserRole } from '../auth/entities/user.entity';
import { PatientQueryDto } from './dto/patient-query.dto';
import { UpdatePatientDto, UpdatePatientProfileDto } from './dto/update-patient.dto';
import { Purchase } from '../purchases/entities/purchase.entity';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { AppointmentsService } from '../appointments/appointments.service';
import { Appointment } from '../appointments/entities/appointment.entity';
import { AppointmentQueryDto } from '../appointments/dto/appointment-query.dto';
import { AuditLogService } from '../modules/audit-log/audit-log.service';
import { AuthService } from '../auth/auth.service';
import { PatientStatsDto } from './dto/patient-stats.dto';

@Injectable()
export class PatientsService {
  private readonly logger = new Logger(PatientsService.name);

  constructor(
    @InjectRepository(PatientProfile)
    private patientProfilesRepository: Repository<PatientProfile>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Purchase)
    private purchasesRepository: Repository<Purchase>,
    @Inject(forwardRef(() => AppointmentsService))
    private appointmentsService: AppointmentsService,
    private auditLogService: AuditLogService,
    private readonly authService: AuthService,
    private entityManager: EntityManager,
  ) {}

  async create(createPatientDto: CreatePatientDto, currentUser: User): Promise<PatientProfile> {
    const { name, email, password, primaryConsultantId, ...profileData } = createPatientDto;

    let patientUserAccount: Omit<User, 'password' | 'hashedRefreshToken' | 'validatePassword' | 'hashPassword'>;
    try {
      const existingUser = await this.usersRepository.findOne({ where: { email } });
      if (existingUser) {
        throw new ConflictException(`User account with email "${email}" already exists.`);
      }
      patientUserAccount = await this.authService.createUser({
        name,
        email, 
        password, 
        role: UserRole.PATIENT 
      });
    } catch (error) {
      this.logger.error(`Failed to create user account for patient: ${error.message}`, error.stack);
      if (error instanceof ConflictException) throw error;
      throw new InternalServerErrorException('Error creating user account for patient.');
    }

    let primaryConsultant: User | null = null;
    if (primaryConsultantId) {
      primaryConsultant = await this.usersRepository.findOne({
        where: { id: primaryConsultantId, role: In([UserRole.ADMIN, UserRole.CONSULTANT]) }
      });
      if (!primaryConsultant) {
        this.logger.warn(`Primary consultant with ID "${primaryConsultantId}" not found or not valid role.`);
        throw new NotFoundException(`Primary consultant with ID "${primaryConsultantId}" not found or is not a valid consultant/admin.`);
      }
    }
    
    const newPatientProfile = this.patientProfilesRepository.create({
      ...profileData,
      name,
      userId: patientUserAccount.id,
      primaryConsultantId: primaryConsultant?.id,
    });
    if(primaryConsultant) newPatientProfile.primaryConsultant = primaryConsultant;

    try {
      const savedProfile = await this.patientProfilesRepository.save(newPatientProfile);
      this.auditLogService.logAction({
          userId: currentUser.id,
          userName: currentUser.name,
          action: 'PATIENT_PROFILE_CREATED',
          details: { 
            patientProfileId: savedProfile.id, 
            patientUserId: patientUserAccount.id,
            patientName: savedProfile.name,
            primaryConsultantId: savedProfile.primaryConsultantId,
          },
      });
      return this.patientProfilesRepository.findOneOrFail({where: {id: savedProfile.id}, relations: ['user', 'primaryConsultant']});
    } catch (error) {
      this.logger.error(`Failed to create patient profile: ${(error as Error).message}`, error.stack);
      this.auditLogService.logAction({
          userId: currentUser.id,
          userName: currentUser.name,
          action: 'PATIENT_PROFILE_CREATE_FAILED',
          details: { userId: patientUserAccount.id, data: createPatientDto, error: (error as Error).message },
      });
      throw new InternalServerErrorException('Error creating patient profile after user creation.');
    }
  }

  async findAll(
    queryDto: PatientQueryDto,
    currentUser: User,
  ): Promise<{ data: PatientProfile[]; total: number; page: number; limit: number; totalPages: number }> {
    const { page = 1, limit = 10 } = queryDto;
    const skip = (page - 1) * limit;

    const queryBuilder = this.patientProfilesRepository.createQueryBuilder('patientProfile')
      .leftJoinAndSelect('patientProfile.user', 'user')
      .leftJoinAndSelect('patientProfile.primaryConsultant', 'consultant');

    queryBuilder.where({ deletedAt: IsNull() });

    // Role and consultantId filters
    if (currentUser.role === UserRole.CONSULTANT) {
      queryBuilder.andWhere('patientProfile.primaryConsultantId = :currentUserId', { currentUserId: currentUser.id });
    } else if (currentUser.role === UserRole.ADMIN && queryDto.consultantId) {
      queryBuilder.andWhere('patientProfile.primaryConsultantId = :consultantId', { consultantId: queryDto.consultantId });
    }

    // Search block remains commented out
    // Date filters remain commented out
    /*
    if (lastVisitFrom) {
      queryBuilder.andWhere('patientProfile.lastVisit >= :lastVisitFrom', { lastVisitFrom });
    }
    if (lastVisitTo) {
      queryBuilder.andWhere('patientProfile.lastVisit <= :lastVisitTo', { lastVisitTo });
    }
    */
    
    queryBuilder.orderBy('patientProfile.id', 'ASC'); // Keep fixed order

    queryBuilder.skip(skip).take(limit);

    try {
      this.logger.debug('Executing findAll query for PatientProfile with JOINS RESTORED');
      const [data, total] = await queryBuilder.getManyAndCount();
      const totalPages = Math.ceil(total / limit);
      this.logger.debug(`findAll query with joins successful. Found ${total} items.`);
      return { data, total, page, limit, totalPages };
    } catch (error) {
      this.logger.error(`Failed to find all patient profiles (debug - with joins): ${(error as Error).message}`, (error as Error).stack);
      throw new InternalServerErrorException('Error fetching patient profiles (debug - with joins).');
    }
  }

  async findOne(id: number, currentUser: User): Promise<PatientProfile> {
    const queryBuilder = this.patientProfilesRepository.createQueryBuilder('patientProfile')
      .leftJoinAndSelect('patientProfile.user', 'user')
      .leftJoinAndSelect('patientProfile.primaryConsultant', 'consultant')
      .where('patientProfile.id = :id', { id })
      .andWhere('patientProfile.deletedAt IS NULL');

    const patientProfile = await queryBuilder.getOne();

    if (!patientProfile) {
      throw new NotFoundException(`Patient profile with ID "${id}" not found.`);
    }

    if (currentUser.role === UserRole.CONSULTANT && patientProfile.primaryConsultantId !== currentUser.id) {
      throw new ForbiddenException('You do not have permission to view this patient profile.');
    }
    
    return patientProfile;
  }

  async update(id: number, updateDto: UpdatePatientProfileDto, currentUser: User): Promise<PatientProfile> {
    const patientProfileToUpdate = await this.findOne(id, currentUser); 

    const originalData = { 
        name: patientProfileToUpdate.name,
        phone: patientProfileToUpdate.phone,
        address: patientProfileToUpdate.address,
        dateOfBirth: patientProfileToUpdate.dateOfBirth ? new Date(patientProfileToUpdate.dateOfBirth).toISOString().split('T')[0] : undefined,
        notes: patientProfileToUpdate.notes,
        primaryConsultantId: patientProfileToUpdate.primaryConsultantId
    };

    const { primaryConsultantId, ...profileDataToUpdate } = updateDto;

    Object.assign(patientProfileToUpdate, profileDataToUpdate);

    let consultantChanged = false;
    if (primaryConsultantId !== undefined && primaryConsultantId !== patientProfileToUpdate.primaryConsultantId) {
      if (currentUser.role !== UserRole.ADMIN) {
        throw new ForbiddenException('Only administrators can change the assigned primary consultant.');
      }
      if (primaryConsultantId === null) {
        patientProfileToUpdate.primaryConsultant = undefined;
        patientProfileToUpdate.primaryConsultantId = undefined;
        consultantChanged = true;
      } else {
        const newConsultant = await this.usersRepository.findOne({ where: { id: primaryConsultantId, role: In([UserRole.ADMIN, UserRole.CONSULTANT]) } });
        if (!newConsultant) {
          throw new NotFoundException(`New primary consultant with ID "${primaryConsultantId}" not found or is not a valid role.`);
        }
        patientProfileToUpdate.primaryConsultant = newConsultant;
        patientProfileToUpdate.primaryConsultantId = newConsultant.id;
        consultantChanged = true;
      }
    }

    try {
      const savedProfile = await this.patientProfilesRepository.save(patientProfileToUpdate);

      const changes = {};
      for(const key in profileDataToUpdate) {
          if(originalData[key] !== savedProfile[key] && savedProfile[key] !== undefined) {
              if (key === 'dateOfBirth' && originalData.dateOfBirth !== (savedProfile.dateOfBirth ? new Date(savedProfile.dateOfBirth).toISOString().split('T')[0] : undefined)) {
                changes[key] = { old: originalData.dateOfBirth, new: (savedProfile.dateOfBirth ? new Date(savedProfile.dateOfBirth).toISOString().split('T')[0] : undefined) };
              } else if (key !== 'dateOfBirth') {
                changes[key] = { old: originalData[key], new: savedProfile[key] };
              }
          }
      }
      if (consultantChanged || (primaryConsultantId === null && originalData.primaryConsultantId !== null)) {
          changes['primaryConsultantId'] = { old: originalData.primaryConsultantId, new: savedProfile.primaryConsultantId };
      }

      if (Object.keys(changes).length > 0) {
        this.auditLogService.logAction({
            userId: currentUser.id,
            userName: currentUser.name,
            action: 'PATIENT_PROFILE_UPDATED',
            details: { 
              patientProfileId: savedProfile.id, 
              patientName: savedProfile.name,
              changes: changes
            },
        });
      }
      return this.patientProfilesRepository.findOneOrFail({where: {id: savedProfile.id}, relations: ['user', 'primaryConsultant']});
    } catch (error) {
      this.logger.error(`Failed to update patient profile with ID "${id}": ${(error as Error).message}`, error.stack);
      this.auditLogService.logAction({
            userId: currentUser.id,
            userName: currentUser.name,
            action: 'PATIENT_PROFILE_UPDATE_FAILED',
            details: { patientProfileId: id, data: updateDto, error: (error as Error).message },
      });
      throw new InternalServerErrorException('Error updating patient profile.');
    }
  }

  async remove(id: number, currentUser: User): Promise<void> {
    if (currentUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only administrators can delete patient profiles.');
    }
    const patientProfileToRemove = await this.findOne(id, currentUser);

    try {
      const result = await this.patientProfilesRepository.softDelete(patientProfileToRemove.id);
      
      if (result.affected === 0) {
        throw new NotFoundException(`Patient profile with ID "${id}" not found for soft deletion.`);
      }

      this.auditLogService.logAction({
            userId: currentUser.id,
            userName: currentUser.name,
            action: 'PATIENT_PROFILE_SOFT_DELETED',
            details: { patientProfileId: id, patientName: patientProfileToRemove.name },
      });
    } catch (error) {
      this.logger.error(`Failed to soft delete patient profile ID ${id}: ${(error as Error).message}`, (error as Error).stack);
      this.auditLogService.logAction({
            userId: currentUser.id,
            userName: currentUser.name,
            action: 'PATIENT_PROFILE_SOFT_DELETE_FAILED',
            details: { patientProfileId: id, error: (error as Error).message },
      });
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
         throw error;
      }
      throw new InternalServerErrorException('Error soft deleting patient profile.');
    }
  }

  async findPurchasesForPatient(
    patientProfileId: number,
    queryDto: PaginationQueryDto, 
    currentUser: User,
  ): Promise<{ data: Purchase[]; total: number; page: number; limit: number; totalPages: number }> {
    await this.findOne(patientProfileId, currentUser);

    const { page = 1, limit = 10, sortBy = 'purchaseDate', sortOrder = 'DESC' } = queryDto;
    const skip = (page - 1) * limit;

    const queryBuilder = this.purchasesRepository.createQueryBuilder('purchase')
      .leftJoinAndSelect('purchase.patientProfile', 'patientProfile')
      .leftJoinAndSelect('purchase.consultant', 'consultant')
      .leftJoinAndSelect('purchase.items', 'purchaseItem') 
      .leftJoinAndSelect('purchaseItem.inventoryItem', 'inventoryItem') 
      .where('purchase.patientProfileId = :patientProfileId', { patientProfileId });

    const validSortByFields = ['purchaseDate', 'totalAmount', 'createdAt'];
    const safeSortBy = validSortByFields.includes(sortBy) ? `purchase.${sortBy}` : 'purchase.purchaseDate';
    queryBuilder.orderBy(safeSortBy, sortOrder.toUpperCase() as 'ASC' | 'DESC');

    queryBuilder.skip(skip).take(limit);

    try {
      const [data, total] = await queryBuilder.getManyAndCount();
      const totalPages = Math.ceil(total / limit);
      return { data, total, page, limit, totalPages };
    } catch (error) {
      this.logger.error(`Failed to find purchases for patient profile ID "${patientProfileId}": ${(error as Error).message}`, (error as Error).stack);
      throw new InternalServerErrorException('Error fetching patient purchases.');
    }
  }

  async findAppointmentsForPatient(
    patientProfileId: number,
    queryDto: AppointmentQueryDto,
    currentUser: User,
  ): Promise<{ data: Appointment[]; total: number; page: number; limit: number; totalPages: number }> {
    await this.findOne(patientProfileId, currentUser);

    const appointmentsQueryDto: AppointmentQueryDto = {
      ...queryDto,
      patientProfileId: patientProfileId,
    };

    return this.appointmentsService.findAll(appointmentsQueryDto, currentUser);
  }

  async getStats(currentUser: User): Promise<PatientStatsDto> {
    const baseQuery = this.patientProfilesRepository.createQueryBuilder('patientProfile')
      .where('patientProfile.deletedAt IS NULL');

    if (currentUser.role === UserRole.CONSULTANT) {
      baseQuery.andWhere('patientProfile.primaryConsultantId = :currentUserId', { currentUserId: currentUser.id });
    }

    try {
      const totalPatients = await baseQuery.getCount();

      const today = new Date();
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      const newPatientsThisMonth = await baseQuery.clone()
        .andWhere('patientProfile.createdAt >= :firstDayOfMonth', { firstDayOfMonth })
        .getCount();

      let averageSpendPerPatient = 0;
      if (totalPatients > 0) {
        const totalSpentResult = await baseQuery.clone()
          .select('SUM(patientProfile.totalSpent)', 'sumTotalSpent')
          .getRawOne();
        const sumTotalSpent = totalSpentResult && totalSpentResult.sumTotalSpent ? parseFloat(totalSpentResult.sumTotalSpent) : 0;
        averageSpendPerPatient = totalPatients > 0 ? parseFloat((sumTotalSpent / totalPatients).toFixed(2)) : 0;
      }
      
      // topSpendingPatients - placeholder for now, requires more complex query (ordering and limiting)
      const topSpendingPatients = []; 

      let patientsByConsultant: Array<{ consultantId: number; consultantName: string; patientCount: number }> = [];
      if (currentUser.role === UserRole.ADMIN) {
        const consultantStatsQuery = this.patientProfilesRepository.createQueryBuilder('patientProfile')
          .select('patientProfile.primaryConsultantId', 'consultantId')
          .addSelect('COUNT(patientProfile.id)', 'patientCount')
          .leftJoin('patientProfile.primaryConsultant', 'consultantUser')
          .addSelect('consultantUser.name', 'consultantName')
          .where('patientProfile.deletedAt IS NULL')
          .andWhere('patientProfile.primaryConsultantId IS NOT NULL')
          .groupBy('patientProfile.primaryConsultantId')
          .addGroupBy('consultantUser.name')
          .orderBy('patientCount', 'DESC');
        
        const result = await consultantStatsQuery.getRawMany();
        patientsByConsultant = result.map(r => ({
            consultantId: r.consultantId,
            consultantName: r.consultantName || 'Unassigned',
            patientCount: parseInt(r.patientCount, 10)
        }));

      } else if (currentUser.role === UserRole.CONSULTANT) {
        // For a consultant, they are the only entry in patientsByConsultant for their own stats view
        patientsByConsultant = [{
            consultantId: currentUser.id,
            consultantName: currentUser.name,
            patientCount: totalPatients // totalPatients is already filtered for this consultant
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
