import { Injectable, Inject, forwardRef, ConflictException, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets, In } from 'typeorm';
import { User, UserRole } from '../../auth/entities/user.entity';
import { AuthService } from '../../auth/auth.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreateConsultantDto } from './dto/create-consultant.dto';
import { UpdateConsultantDto, UserStatus } from './dto/update-consultant.dto';
import { ConsultantQueryDto, ConsultantSortBy } from './dto/consultant-query.dto';
import { ResetConsultantPasswordDto } from './dto/reset-consultant-password.dto';
import { InventoryItem } from '../../inventory/entities/inventory-item.entity';
import { ConsultantInventoryVisibilityDto } from './dto/consultant-inventory-visibility.dto';
import { AppointmentType } from '../../appointment-types/entities/appointment-type.entity';
import { ConsultantAppointmentTypeVisibilityDto } from './dto/consultant-appointment-type-visibility.dto';
import { Appointment, AppointmentStatus } from '../../appointments/entities/appointment.entity';
import { PatientProfile } from '../../patients/entities/patient-profile.entity';
import { ConsultantStatsDto } from './dto/consultant-stats.dto';

// DTO pro odpověď
// export interface ConsultantAppointmentTypeVisibilityDto {
//   id: number;
//   name: string;
//   visible: boolean;
// }

@Injectable()
export class ConsultantsService {
  private readonly logger = new Logger(ConsultantsService.name);

  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(InventoryItem)
    private inventoryItemsRepository: Repository<InventoryItem>,
    @InjectRepository(AppointmentType)
    private appointmentTypesRepository: Repository<AppointmentType>,
    @InjectRepository(Appointment)
    private appointmentsRepository: Repository<Appointment>,
    @InjectRepository(PatientProfile)
    private patientProfilesRepository: Repository<PatientProfile>,
    @Inject(forwardRef(() => AuthService))
    private authService: AuthService,
    private auditLogService: AuditLogService,
  ) {}

  async create(createConsultantDto: CreateConsultantDto, currentUser: User): Promise<Omit<User, 'password' | 'hashedRefreshToken' | 'validatePassword' | 'hashPassword'>> {
    // Ověření, zda role v DTO je povolena (např. pouze consultant nebo admin)
    // if (createConsultantDto.role !== UserRole.CONSULTANT && createConsultantDto.role !== UserRole.ADMIN) {
    //   throw new BadRequestException('Invalid role specified. Only consultant or admin can be created here.');
    // }

    try {
      // AuthService.createUser by měl řešit kontrolu existence emailu a hashování hesla
      const newUser = await this.authService.createUser(createConsultantDto);

      this.auditLogService.logAction({
        userId: currentUser.id,
        userName: currentUser.name,
        action: 'USER_CREATED_BY_ADMIN', // Specifičtější akce
        details: {
          createdUserId: newUser.id,
          createdUserName: newUser.name,
          createdUserEmail: newUser.email,
          createdUserRole: newUser.role,
        },
      });

      return newUser;
    } catch (error) {
      this.logger.error(`Failed to create consultant/user: ${error.message}`, error.stack);
      if (error instanceof ConflictException) {
        throw error; // AuthService by měl vyhodit ConflictException při duplicitním emailu
      }
      // Zde by se mohlo přidat logování selhání do audit logu
      this.auditLogService.logAction({
        userId: currentUser.id,
        userName: currentUser.name,
        action: 'USER_CREATE_BY_ADMIN_FAILED',
        details: { data: createConsultantDto, error: error.message },
      });
      throw new InternalServerErrorException('Error creating consultant/user.');
    }
  }

  async findAll(
    queryDto: ConsultantQueryDto,
  ): Promise<{ data: Omit<User, 'password' | 'hashedRefreshToken' | 'validatePassword' | 'hashPassword'>[]; total: number; page: number; limit: number; totalPages: number }> {
    const { page = 1, limit = 10, sortBy = ConsultantSortBy.CREATED_AT, sortOrder = 'DESC', search, status } = queryDto;
    const skip = (page - 1) * limit;

    const queryBuilder = this.usersRepository.createQueryBuilder('user');

    // Filtrujeme primárně konzultanty
    queryBuilder.where('user.role = :role', { role: UserRole.CONSULTANT });
    // Pokud bychom chtěli i adminy (např. pro kompletní správu uživatelů přes toto API):
    // queryBuilder.where({ role: In([UserRole.CONSULTANT, UserRole.ADMIN]) });

    if (status) {
      queryBuilder.andWhere('user.status = :status', { status });
    }

    if (search) {
      queryBuilder.andWhere(
        new Brackets(qb => {
          qb.where('user.name ILIKE :search', { search: `%${search}%` })
            .orWhere('user.email ILIKE :search', { search: `%${search}%` });
        }),
      );
    }

    const validSortByFields: Record<ConsultantSortBy, string> = {
      [ConsultantSortBy.NAME]: 'user.name',
      [ConsultantSortBy.EMAIL]: 'user.email',
      [ConsultantSortBy.LAST_ACTIVE]: 'user.lastActive',
      [ConsultantSortBy.CREATED_AT]: 'user.createdAt',
      [ConsultantSortBy.STATUS]: 'user.status',
    };
    const safeSortBy = validSortByFields[sortBy] || 'user.createdAt';

    queryBuilder.orderBy(safeSortBy, sortOrder.toUpperCase() as 'ASC' | 'DESC');
    queryBuilder.skip(skip).take(limit);

    try {
      const [data, total] = await queryBuilder.getManyAndCount();
      const totalPages = Math.ceil(total / limit);
      return { data, total, page, limit, totalPages };
    } catch (error) {
      this.logger.error(`Failed to find consultants: ${(error as Error).message}`, (error as Error).stack);
      throw new InternalServerErrorException('Error fetching consultants.');
    }
  }

  async findOne(id: number): Promise<Omit<User, 'password' | 'hashedRefreshToken' | 'validatePassword' | 'hashPassword'> | null> {
    const consultant = await this.usersRepository.findOne({
      where: {
        id,
        role: UserRole.CONSULTANT, // Zajistíme, že hledáme pouze konzultanty
        // Pokud bychom chtěli i adminy: role: In([UserRole.CONSULTANT, UserRole.ADMIN])
      },
    });

    if (!consultant) {
      this.logger.warn(`Consultant with ID ${id} not found or is not a consultant.`);
      throw new NotFoundException(`Consultant with ID ${id} not found or is not a consultant.`);
    }
    // Heslo a refresh token by měly být automaticky odstraněny ClassSerializerInterceptorem
    return consultant;
  }

  async update(
    id: number,
    updateConsultantDto: UpdateConsultantDto,
    currentUser: User, // Pro audit log
  ): Promise<Omit<User, 'password' | 'hashedRefreshToken' | 'validatePassword' | 'hashPassword'> | null> {
    const consultantToUpdate = await this.usersRepository.findOne({
      where: { id, role: In([UserRole.CONSULTANT, UserRole.ADMIN]) }, // Umožníme aktualizovat i admina, pokud by byl spravován zde
    });

    if (!consultantToUpdate) {
      throw new NotFoundException(`User with ID ${id} not found or is not a manageable role (consultant/admin).`);
    }

    const originalData = { ...consultantToUpdate }; // Pro audit log změn

    const { name, email, role, status } = updateConsultantDto;

    if (email && email !== consultantToUpdate.email) {
      const existingUserByEmail = await this.usersRepository.findOne({ where: { email } });
      if (existingUserByEmail && existingUserByEmail.id !== id) {
        throw new ConflictException(`User with email "${email}" already exists.`);
      }
      consultantToUpdate.email = email;
    }

    if (name) {
      consultantToUpdate.name = name;
    }

    // Opatrně se změnou role, zvláště pokud by to byl jediný admin
    if (role) {
      // Zde by mohla být dodatečná logika/omezení pro změnu role
      consultantToUpdate.role = role;
    }

    if (status) {
      consultantToUpdate.status = status;
    }

    try {
      const updatedConsultant = await this.usersRepository.save(consultantToUpdate);

      // Logování změn
      const changes = {};
      if (originalData.name !== updatedConsultant.name && updatedConsultant.name !== undefined) changes['name'] = { old: originalData.name, new: updatedConsultant.name };
      if (originalData.email !== updatedConsultant.email && updatedConsultant.email !== undefined) changes['email'] = { old: originalData.email, new: updatedConsultant.email };
      if (originalData.role !== updatedConsultant.role && updatedConsultant.role !== undefined) changes['role'] = { old: originalData.role, new: updatedConsultant.role };
      if (originalData.status !== updatedConsultant.status && updatedConsultant.status !== undefined) changes['status'] = { old: originalData.status, new: updatedConsultant.status };

      if (Object.keys(changes).length > 0) {
        this.auditLogService.logAction({
          userId: currentUser.id,
          userName: currentUser.name,
          action: 'USER_UPDATED_BY_ADMIN',
          details: {
            updatedUserId: updatedConsultant.id,
            updatedUserName: updatedConsultant.name,
            changes,
          },
        });
      }
      return updatedConsultant;
    } catch (error) {
      this.logger.error(`Failed to update user ${id}: ${error.message}`, error.stack);
      this.auditLogService.logAction({
        userId: currentUser.id,
        userName: currentUser.name,
        action: 'USER_UPDATE_BY_ADMIN_FAILED',
        details: { targetUserId: id, data: updateConsultantDto, error: error.message },
      });
      if (error instanceof ConflictException) throw error;
      throw new InternalServerErrorException('Error updating user.');
    }
  }

  async resetPasswordByAdmin(
    id: number,
    resetPasswordDto: ResetConsultantPasswordDto,
    currentUser: User, // Admin provádějící akci
  ): Promise<void> {
    this.logger.log(`Admin ${currentUser.id} attempting to reset password for user ${id}`);
    const userToReset = await this.usersRepository.findOne({
      where: { id, role: In([UserRole.CONSULTANT, UserRole.ADMIN]) }, // Umožníme resetovat i adminům
    });

    if (!userToReset) {
      throw new NotFoundException(`User with ID ${id} not found or is not a role whose password can be reset here.`);
    }

    // Entita User má BeforeUpdate hook, který zahashuje heslo automaticky
    userToReset.password = resetPasswordDto.password;
    // Odstraníme tokeny pro reset hesla iniciovaný uživatelem, pokud existují, pro konzistenci
    userToReset.passwordResetToken = undefined;
    userToReset.passwordResetExpires = undefined;

    try {
      await this.usersRepository.save(userToReset);
      this.auditLogService.logAction({
        userId: currentUser.id,
        userName: currentUser.name,
        action: 'USER_PASSWORD_RESET_BY_ADMIN',
        details: {
          targetUserId: userToReset.id,
          targetUserName: userToReset.name,
        },
      });
      this.logger.log(`Password for user ${id} has been successfully reset by admin ${currentUser.id}`);
    } catch (error) {
      this.logger.error(`Failed to reset password for user ${id} by admin ${currentUser.id}: ${error.message}`, error.stack);
      this.auditLogService.logAction({
        userId: currentUser.id,
        userName: currentUser.name,
        action: 'USER_PASSWORD_RESET_BY_ADMIN_FAILED',
        details: { targetUserId: id, error: error.message },
      });
      throw new InternalServerErrorException('Error resetting user password.');
    }
  }

  async getConsultantInventoryVisibility(consultantId: number): Promise<ConsultantInventoryVisibilityDto[]> {
    const consultant = await this.usersRepository.findOne({
      where: { id: consultantId, role: UserRole.CONSULTANT },
      relations: ['visibleInventoryItems'], // Načteme explicitně viditelné položky
    });

    if (!consultant) {
      throw new NotFoundException(`Consultant with ID ${consultantId} not found.`);
    }

    const allInventoryItems = await this.inventoryItemsRepository.find();
    const visibleItemIds = new Set(consultant.visibleInventoryItems.map(item => item.id));

    return allInventoryItems.map(item => ({
      id: item.id,
      name: item.name,
      visible: item.visibleToAll || visibleItemIds.has(item.id),
    }));
  }

  async updateConsultantInventoryVisibility(
    consultantId: number,
    inventoryItemIds: number[],
    currentUser: User,
  ): Promise<void> {
    this.logger.log(`Admin ${currentUser.id} updating inventory visibility for consultant ${consultantId} with item IDs: ${inventoryItemIds.join(', ')}`);
    const consultant = await this.usersRepository.findOne({
      where: { id: consultantId, role: UserRole.CONSULTANT },
      relations: ['visibleInventoryItems'],
    });
    if (!consultant) {
      throw new NotFoundException(`Consultant with ID ${consultantId} not found.`);
    }
    const originalVisibleItemIds = consultant.visibleInventoryItems.map(item => item.id).sort();
    let itemsToMakeVisible: InventoryItem[] = [];
    if (inventoryItemIds && inventoryItemIds.length > 0) {
      itemsToMakeVisible = await this.inventoryItemsRepository.findBy({ id: In(inventoryItemIds) });
      if (itemsToMakeVisible.length !== inventoryItemIds.length) {
        const foundIds = itemsToMakeVisible.map(i => i.id);
        const notFoundIds = inventoryItemIds.filter(id => !foundIds.includes(id));
        this.logger.warn(`Inventory items with IDs [${notFoundIds.join(', ')}] not found while updating visibility for consultant ${consultantId}.`);
      }
    }
    consultant.visibleInventoryItems = itemsToMakeVisible;
    try {
      await this.usersRepository.save(consultant);
      const newVisibleItemIds = itemsToMakeVisible.map(item => item.id).sort();
      if (JSON.stringify(originalVisibleItemIds) !== JSON.stringify(newVisibleItemIds)) {
        this.auditLogService.logAction({
          userId: currentUser.id,
          userName: currentUser.name,
          action: 'CONSULTANT_INVENTORY_VISIBILITY_UPDATED',
          details: {
            consultantId: consultant.id,
            consultantName: consultant.name,
            newlyVisibleItemIds: newVisibleItemIds,
            oldVisibleItemIds: originalVisibleItemIds,
          },
        });
      }
      this.logger.log(`Inventory visibility for consultant ${consultantId} successfully updated by admin ${currentUser.id}.`);
    } catch (error) {
      this.logger.error(`Failed to update inventory visibility for consultant ${consultantId}: ${error.message}`, error.stack);
      this.auditLogService.logAction({
        userId: currentUser.id,
        userName: currentUser.name,
        action: 'CONSULTANT_INVENTORY_VISIBILITY_UPDATE_FAILED',
        details: { consultantId, inventoryItemIds, error: error.message },
      });
      throw new InternalServerErrorException('Error updating consultant inventory visibility.');
    }
  }

  async getConsultantAppointmentTypesVisibility(consultantId: number): Promise<ConsultantAppointmentTypeVisibilityDto[]> {
    this.logger.debug(`Fetching appointment types visibility for consultant ID: ${consultantId}`);
    const consultant = await this.usersRepository.findOne({
      where: { id: consultantId, role: UserRole.CONSULTANT },
      relations: ['visibleAppointmentTypes'], // Načteme explicitně viditelné typy schůzek
    });

    if (!consultant) {
      this.logger.warn(`Consultant with ID ${consultantId} not found when getting appt type visibility.`);
      throw new NotFoundException(`Consultant with ID ${consultantId} not found.`);
    }

    this.logger.debug(`Consultant ${consultantId} loaded. Raw visibleAppointmentTypes: ${JSON.stringify(consultant.visibleAppointmentTypes)}`);

    // Defensive check
    if (!Array.isArray(consultant.visibleAppointmentTypes)) {
        this.logger.error(`For consultant ${consultantId}, visibleAppointmentTypes is not an array or is null/undefined. Value: ${consultant.visibleAppointmentTypes === null ? 'null' : consultant.visibleAppointmentTypes}`);
        // Initialize to empty array to allow processing, but this indicates a deeper issue.
        consultant.visibleAppointmentTypes = []; 
    }
    
    const visibleTypeIds = new Set(consultant.visibleAppointmentTypes.map(type => type.id));
    this.logger.debug(`Visible type IDs for consultant ${consultantId}: ${JSON.stringify(Array.from(visibleTypeIds))}`);

    const allAppointmentTypes = await this.appointmentTypesRepository.find();
    this.logger.debug(`Found ${allAppointmentTypes.length} total appointment types.`);

    return allAppointmentTypes.map(type => {
      const isVisible = type.visibleToAll || visibleTypeIds.has(type.id);
      this.logger.debug(`Mapping type ID ${type.id} (${type.name}): visibleToAll=${type.visibleToAll}, inSet=${visibleTypeIds.has(type.id)}, finalVisible=${isVisible}`);
      return {
        id: type.id,
        name: type.name,
        visible: isVisible,
      };
    });
  }

  async updateConsultantAppointmentTypesVisibility(
    consultantId: number,
    appointmentTypeIds: number[],
    currentUser: User,
  ): Promise<void> {
    this.logger.log(
      `Admin ${currentUser.id} (${currentUser.name}) starting update of appointment types visibility for consultant ${consultantId} with type IDs: [${appointmentTypeIds ? appointmentTypeIds.join(', ') : ''}]`,
    );
    const consultant = await this.usersRepository.findOne({
      where: { id: consultantId, role: UserRole.CONSULTANT },
      relations: ['visibleAppointmentTypes'],
    });

    if (!consultant) {
      this.logger.warn(`Consultant with ID ${consultantId} not found during update appt type visibility by admin ${currentUser.id}.`);
      throw new NotFoundException(`Consultant with ID ${consultantId} not found.`);
    }
    
    this.logger.debug(`Consultant ${consultantId} loaded for update. Raw current visibleAppointmentTypes: ${JSON.stringify(consultant.visibleAppointmentTypes)}`);

    // Defensive check for originalVisibleTypeIds
    const originalVisibleTypeIds = Array.isArray(consultant.visibleAppointmentTypes) 
        ? consultant.visibleAppointmentTypes.map(type => type.id).sort() 
        : [];

    if (!Array.isArray(consultant.visibleAppointmentTypes)) {
        this.logger.warn(`Consultant ${consultantId}'s visibleAppointmentTypes was not an array during update. Initialized originalVisibleTypeIds to empty. Value: ${consultant.visibleAppointmentTypes === null ? 'null' : consultant.visibleAppointmentTypes}`);
    }

    let typesToMakeVisible: AppointmentType[] = [];
    if (appointmentTypeIds && appointmentTypeIds.length > 0) {
      this.logger.debug(`Finding appointment types by IDs: [${appointmentTypeIds.join(', ')}] for consultant ${consultantId}`);
      typesToMakeVisible = await this.appointmentTypesRepository.findBy({ id: In(appointmentTypeIds) });
      if (typesToMakeVisible.length !== appointmentTypeIds.length) {
        const foundIds = typesToMakeVisible.map(t => t.id);
        const notFoundIds = appointmentTypeIds.filter(id => !foundIds.includes(id));
        this.logger.warn(
          `Appointment types with IDs [${notFoundIds.join(', ')}] not found while updating visibility for consultant ${consultantId}. Proceeding with found types.`,
        );
      }
    }
    this.logger.debug(`Appointment types to make visible for consultant ${consultantId}: ${JSON.stringify(typesToMakeVisible.map(t=>t.id))}`);

    consultant.visibleAppointmentTypes = typesToMakeVisible;

    try {
      await this.usersRepository.save(consultant);
      const newVisibleTypeIds = typesToMakeVisible.map(type => type.id).sort();

      if (JSON.stringify(originalVisibleTypeIds) !== JSON.stringify(newVisibleTypeIds)) {
        this.auditLogService.logAction({
          userId: currentUser.id,
          userName: currentUser.name,
          action: 'CONSULTANT_APPOINTMENT_TYPES_VISIBILITY_UPDATED',
          details: {
            consultantId: consultant.id,
            consultantName: consultant.name,
            newlyVisibleTypeIds: newVisibleTypeIds,
            oldVisibleTypeIds: originalVisibleTypeIds,
          },
        });
      }
      this.logger.log(
        `Appointment types visibility for consultant ${consultantId} successfully updated by admin ${currentUser.id}.`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to update appointment types visibility for consultant ${consultantId}: ${error.message}`,
        error.stack,
      );
      this.auditLogService.logAction({
        userId: currentUser.id,
        userName: currentUser.name,
        action: 'CONSULTANT_APPOINTMENT_TYPES_VISIBILITY_UPDATE_FAILED',
        details: { consultantId, appointmentTypeIds, error: error.message },
      });
      throw new InternalServerErrorException('Error updating consultant appointment types visibility.');
    }
  }

  async getConsultantStats(consultantId: number): Promise<ConsultantStatsDto> {
    const consultant = await this.usersRepository.findOneBy({ id: consultantId, role: UserRole.CONSULTANT });
    if (!consultant) {
      throw new NotFoundException(`Consultant with ID ${consultantId} not found.`);
    }

    const totalPatients = await this.patientProfilesRepository.count({ where: { primaryConsultantId: consultantId } });

    // Získáváme všechny schůzky konzultanta pro flexibilní filtrování
    const allConsultantAppointments = await this.appointmentsRepository.find({
        where: { consultant: { id: consultantId } },
        relations: ['appointmentType', 'patientProfile'], // Načteme potřebné relace
    });

    // Filtrujeme relevantní schůzky pro statistiky (např. pouze dokončené)
    const completedAppointments = allConsultantAppointments.filter(
        (app) => app.status === AppointmentStatus.COMPLETED
    );

    const totalAppointments = completedAppointments.length; // Počet dokončených schůzek

    const totalRevenue = completedAppointments.reduce((sum, app) => sum + (Number(app.totalPrice) || 0), 0);

    const appointmentsByType: { typeId: number; typeName: string; count: number }[] = completedAppointments.reduce((acc, app) => {
      if (app.appointmentType) {
        const typeName = app.appointmentType.name;
        const typeId = app.appointmentType.id;
        const existingEntry = acc.find(e => e.typeId === typeId);
        if (existingEntry) {
          existingEntry.count++;
        } else {
          acc.push({ typeId, typeName, count: 1 });
        }
      }
      return acc;
    }, [] as { typeId: number; typeName: string; count: number }[]).sort((a,b) => b.count - a.count);

    // Získání posledních 5 schůzek (např. podle data sestupně, všechny stavy pro přehled)
    const recentAppointmentsData = allConsultantAppointments
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 5);

    const recentAppointments = recentAppointmentsData.map(app => ({
      id: app.id,
      patientName: app.patientProfile?.name || 'N/A',
      date: app.date.toISOString(),
      typeName: app.appointmentType?.name || 'N/A',
    }));

    return {
      totalPatients,
      totalAppointments,
      totalRevenue,
      appointmentsByType,
      recentAppointments,
    };
  }

  // Další metody služby (pokud budou)
}
