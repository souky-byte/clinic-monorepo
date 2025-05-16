import { Injectable, Logger, BadRequestException, ForbiddenException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AppointmentType } from './entities/appointment-type.entity';
import { User, UserRole } from '../auth/entities/user.entity';
import { CreateAppointmentTypeDto } from './dto/create-appointment-type.dto';
import { AppointmentTypeResponseDto } from './dto/appointment-type-response.dto';
import { UpdateAppointmentTypeDto } from './dto/update-appointment-type.dto';
import { AuditLogService } from '../modules/audit-log/audit-log.service';

@Injectable()
export class AppointmentTypesService {
  private readonly logger = new Logger(AppointmentTypesService.name);

  constructor(
    @InjectRepository(AppointmentType)
    private appointmentTypesRepository: Repository<AppointmentType>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private auditLogService: AuditLogService,
  ) {}

  async create(createDto: CreateAppointmentTypeDto, currentUser: User): Promise<AppointmentType> {
    if (currentUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only administrators can create appointment types.');
    }

    const { name, description, price, durationMinutes, visibleToAll, visibleToSpecificConsultantIds } = createDto;

    const newAppointmentType = this.appointmentTypesRepository.create({
      name,
      description,
      price,
      durationMinutes,
      visibleToAll,
    });

    if (visibleToAll) {
      newAppointmentType.visibleToSpecificConsultants = []; // Pokud je viditelné pro všechny, pole konzultantů je prázdné
    } else {
      if (!visibleToSpecificConsultantIds || visibleToSpecificConsultantIds.length === 0) {
        throw new BadRequestException('If not visible to all, specific consultant IDs must be provided.');
      }
      const consultants = await this.usersRepository.find({
        where: {
          id: In(visibleToSpecificConsultantIds),
          role: UserRole.CONSULTANT, // Zajistíme, že přidáváme pouze konzultanty
        },
      });
      if (consultants.length !== visibleToSpecificConsultantIds.length) {
        throw new NotFoundException('One or more specified consultant IDs not found or are not consultants.');
      }
      newAppointmentType.visibleToSpecificConsultants = consultants;
    }

    try {
      const savedType = await this.appointmentTypesRepository.save(newAppointmentType);
      this.auditLogService.logAction({
        userId: currentUser.id,
        userName: currentUser.name,
        action: 'APPOINTMENT_TYPE_CREATED',
        details: { typeId: savedType.id, name: savedType.name, data: createDto },
      });
      return savedType;
    } catch (error) {
      if ((error as any).code === '23505') { // Unikátní omezení (např. název, pokud bychom ho přidali)
        throw new BadRequestException(`Appointment type with name '${name}' might already exist or another unique constraint failed.`);
      }
      this.logger.error(`Failed to create appointment type: ${error.message}`, error.stack);
      this.auditLogService.logAction({
        userId: currentUser.id,
        userName: currentUser.name,
        action: 'APPOINTMENT_TYPE_CREATE_FAILED',
        details: { data: createDto, error: (error as Error).message },
      });
      throw new InternalServerErrorException('Error creating appointment type.');
    }
  }

  async findAll(currentUser: User): Promise<AppointmentTypeResponseDto[]> {
    let queryBuilder = this.appointmentTypesRepository.createQueryBuilder('appointmentType')
        .leftJoinAndSelect('appointmentType.visibleToSpecificConsultants', 'visibleConsultants')
        .loadRelationCountAndMap('appointmentType.appointmentsCount', 'appointmentType.appointments');

    if (currentUser.role === UserRole.CONSULTANT) {
      queryBuilder = queryBuilder
        .where('appointmentType.visibleToAll = :isTrue', { isTrue: true })
        .orWhere('visibleConsultants.id = :consultantId', { consultantId: currentUser.id });
    }
    // Pro admina se načtou všechny, včetně informací o visibleConsultants

    const types = await queryBuilder.getMany();

    return types.map(type => {
      const visibleTo = type.visibleToSpecificConsultants
                        ? type.visibleToSpecificConsultants.map(c => c.id)
                        : [];
      // appointmentsCount je již namapováno díky loadRelationCountAndMap
      // Musíme odebrat pole `appointments` a `visibleToSpecificConsultants` z výsledného objektu,
      // aby se neposílaly celé entity konzultantů a schůzek.
      const { appointments, visibleToSpecificConsultants, ...rest } = type as any;
      return {
        ...rest,
        visibleTo,
        appointmentsCount: (type as any).appointmentsCount || 0,
      } as AppointmentTypeResponseDto;
    });
  }

  async findOne(id: number, currentUser: User): Promise<AppointmentTypeResponseDto> {
    const queryBuilder = this.appointmentTypesRepository.createQueryBuilder('appointmentType')
      .leftJoinAndSelect('appointmentType.visibleToSpecificConsultants', 'visibleConsultants')
      .loadRelationCountAndMap('appointmentType.appointmentsCount', 'appointmentType.appointments')
      .where('appointmentType.id = :id', { id });

    const type = await queryBuilder.getOne();

    if (!type) {
      throw new NotFoundException(`Appointment type with ID "${id}" not found.`);
    }

    if (currentUser.role === UserRole.CONSULTANT) {
      const isVisibleToThisConsultant = type.visibleToSpecificConsultants && type.visibleToSpecificConsultants.some(c => c.id === currentUser.id);
      if (!type.visibleToAll && !isVisibleToThisConsultant) {
        throw new ForbiddenException('You do not have permission to view this appointment type.');
      }
    }

    // Transformace na DTO
    const visibleTo = type.visibleToSpecificConsultants
                      ? type.visibleToSpecificConsultants.map(c => c.id)
                      : [];
    const { appointments, visibleToSpecificConsultants, ...rest } = type as any;
    
    return {
      ...rest,
      visibleTo,
      appointmentsCount: (type as any).appointmentsCount || 0,
      // Ujistíme se, že cena je číslo, pokud by to bylo potřeba explicitně řešit
      // price: parseFloat(rest.price) 
    } as AppointmentTypeResponseDto;
  }

  async update(id: number, updateDto: UpdateAppointmentTypeDto, currentUser: User): Promise<AppointmentTypeResponseDto> {
    if (currentUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only administrators can update appointment types.');
    }

    const appointmentTypeToUpdate = await this.appointmentTypesRepository.findOne({
        where: { id },
        relations: ['visibleToSpecificConsultants'] 
    });

    if (!appointmentTypeToUpdate) {
      throw new NotFoundException(`Appointment type with ID "${id}" not found.`);
    }

    const originalData = JSON.parse(JSON.stringify(appointmentTypeToUpdate)); // Pro logování změn

    const { name, description, price, durationMinutes, visibleToAll, visibleToSpecificConsultantIds } = updateDto;

    if (name !== undefined) appointmentTypeToUpdate.name = name;
    if (description !== undefined) appointmentTypeToUpdate.description = description;
    if (price !== undefined) appointmentTypeToUpdate.price = price;
    if (durationMinutes !== undefined) appointmentTypeToUpdate.durationMinutes = durationMinutes;
    
    if (visibleToAll !== undefined) {
      appointmentTypeToUpdate.visibleToAll = visibleToAll;
      if (visibleToAll) {
        appointmentTypeToUpdate.visibleToSpecificConsultants = [];
      } else {
        if (visibleToSpecificConsultantIds !== undefined) {
            if (visibleToSpecificConsultantIds.length === 0) {
                 throw new BadRequestException('If not visible to all, specific consultant IDs must be provided when updating visibility.');
            }
            const consultants = await this.usersRepository.find({
              where: { id: In(visibleToSpecificConsultantIds), role: UserRole.CONSULTANT },
            });
            if (consultants.length !== visibleToSpecificConsultantIds.length) {
              throw new NotFoundException('One or more specified consultant IDs not found or are not consultants for visibility update.');
            }
            appointmentTypeToUpdate.visibleToSpecificConsultants = consultants;
        } else if (appointmentTypeToUpdate.visibleToSpecificConsultants.length === 0) {
            // visibleToAll bylo nastaveno na false, ale nebyly poskytnuty IDs a ani předtím žádné nebyly
            throw new BadRequestException('If not visible to all, specific consultant IDs must be provided.');
        }
      }
    } else if (visibleToSpecificConsultantIds !== undefined) {
        if (appointmentTypeToUpdate.visibleToAll) {
            throw new BadRequestException('Cannot set specific consultants if type is still marked as visibleToAll. Set visibleToAll to false first or in the same request.');
        }
        if (visibleToSpecificConsultantIds.length === 0 && !appointmentTypeToUpdate.visibleToAll) {
             throw new BadRequestException('Cannot set an empty list of specific consultants unless visibleToAll is true.');
        }
        const consultants = await this.usersRepository.find({
            where: { id: In(visibleToSpecificConsultantIds), role: UserRole.CONSULTANT },
        });
        if (consultants.length !== visibleToSpecificConsultantIds.length) {
            throw new NotFoundException('One or more specified consultant IDs not found or are not consultants.');
        }
        appointmentTypeToUpdate.visibleToSpecificConsultants = consultants;
    }

    try {
      const updatedTypeRaw = await this.appointmentTypesRepository.save(appointmentTypeToUpdate);
      const changes = this.diffObjects(originalData, updatedTypeRaw); // Pomocná funkce pro diff
      if (Object.keys(changes).length > 0) {
        this.auditLogService.logAction({
          userId: currentUser.id,
          userName: currentUser.name,
          action: 'APPOINTMENT_TYPE_UPDATED',
          details: { typeId: id, changes },
        });
      }
      return this.findOne(updatedTypeRaw.id, currentUser); 
    } catch (error) {
      if ((error as any).code === '23505') {
        throw new BadRequestException(`Update failed: Appointment type with name '${name}' might already exist or another unique constraint failed.`);
      }
      this.logger.error(`Failed to update appointment type with ID "${id}": ${error.message}`, error.stack);
      this.auditLogService.logAction({
        userId: currentUser.id,
        userName: currentUser.name,
        action: 'APPOINTMENT_TYPE_UPDATE_FAILED',
        details: { typeId: id, data: updateDto, error: (error as Error).message },
      });
      throw new InternalServerErrorException('Error updating appointment type.');
    }
  }

  async remove(id: number, currentUser: User): Promise<void> {
    if (currentUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only administrators can delete appointment types.');
    }

    const existingAppointments = await this.appointmentTypesRepository.query(
        `SELECT COUNT(*) as count FROM appointments WHERE "appointmentTypeId" = $1`, [id]
    );
    if (existingAppointments && parseInt(existingAppointments[0].count, 10) > 0) {
         throw new BadRequestException(`Cannot delete appointment type with ID "${id}" because it has ${existingAppointments[0].count} associated appointments. Please reassign or delete those appointments first.`);
    }

    const result = await this.appointmentTypesRepository.delete(id);

    if (result.affected === 0) {
      throw new NotFoundException(`Appointment type with ID "${id}" not found.`);
    }
  }

  // Pomocná funkce pro zjištění rozdílů mezi objekty (velmi zjednodušená)
  private diffObjects(obj1: any, obj2: any): Record<string, any> {
      const diff = {};
      for (const key in obj2) {
          if (obj1.hasOwnProperty(key) && JSON.stringify(obj1[key]) !== JSON.stringify(obj2[key])) {
              if (!(obj2[key] instanceof Object) && !(Array.isArray(obj2[key])) && key !== 'visibleToSpecificConsultants' && key !== 'appointments') {
                 diff[key] = { old: obj1[key], new: obj2[key] };
              }
          }
      }
      // Zvláštní ošetření pro visibleToSpecificConsultantIds (pokud jsou v DTO)
      const oldConsultantIds = obj1.visibleToSpecificConsultants?.map(c => c.id).sort() || [];
      const newConsultantIds = obj2.visibleToSpecificConsultants?.map(c => c.id).sort() || [];
      if (JSON.stringify(oldConsultantIds) !== JSON.stringify(newConsultantIds)) {
          diff['visibleToSpecificConsultantIds'] = { old: oldConsultantIds, new: newConsultantIds };
      }
      return diff;
  }

  // Zde budou metody služby
} 