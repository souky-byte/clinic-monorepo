import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager, Between } from 'typeorm';
import { WorkingHours } from './entities/working-hours.entity';
import { User, UserRole } from '../auth/entities/user.entity';
import { DayOfWeek } from './enums/day-of-week.enum';
import { CreateWorkingHoursDto, WorkingHoursEntryDto, GetSlotsQueryDto, SlotDto } from './dto';
import { Appointment } from '../appointments/entities/appointment.entity';
import { AppointmentType } from '../appointment-types/entities/appointment-type.entity';
import { DateTime, Duration, Interval, Settings as LuxonSettings } from 'luxon';

@Injectable()
export class WorkingHoursService {
  private readonly logger = new Logger(WorkingHoursService.name);

  constructor(
    @InjectRepository(WorkingHours)
    private workingHoursRepository: Repository<WorkingHours>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private entityManager: EntityManager,
    @InjectRepository(Appointment)
    private appointmentRepository: Repository<Appointment>,
    @InjectRepository(AppointmentType)
    private appointmentTypeRepository: Repository<AppointmentType>,
  ) {
    // LuxonSettings.defaultZone = 'Europe/Prague'; // Set a default timezone for all luxon operations if needed
  }

  async getWorkingHoursForUser(targetUserId: number, requestingUser: User): Promise<WorkingHours[]> {
    this.logger.debug(`User ${requestingUser.id} (${requestingUser.role}) requesting working hours for user ${targetUserId}`);

    const targetUser = await this.usersRepository.findOneBy({ id: targetUserId });
    if (!targetUser || (targetUser.role !== UserRole.ADMIN && targetUser.role !== UserRole.CONSULTANT)) {
      throw new NotFoundException(`User with ID ${targetUserId} not found or is not a consultant/admin.`);
    }

    if (requestingUser.role !== UserRole.ADMIN && requestingUser.id !== targetUserId) {
      throw new ForbiddenException('You are not authorized to view these working hours.');
    }

    return this.workingHoursRepository.find({
      where: { userId: targetUserId },
      order: { dayOfWeek: 'ASC', startTime: 'ASC' }, // Optional: order them consistently
    });
  }

  async setWorkingHoursForUser(
    targetUserId: number,
    dto: CreateWorkingHoursDto,
    requestingUser: User,
  ): Promise<WorkingHours[]> {
    this.logger.log(
      `User ${requestingUser.id} (${requestingUser.role}) setting working hours for user ${targetUserId} with ${dto.entries.length} entries.`,
    );

    const targetUser = await this.usersRepository.findOneBy({ id: targetUserId });
    if (!targetUser || (targetUser.role !== UserRole.ADMIN && targetUser.role !== UserRole.CONSULTANT)) {
      throw new NotFoundException(
        `User with ID ${targetUserId} not found or is not a consultant/admin for whom working hours can be set.`,
      );
    }

    if (requestingUser.role !== UserRole.ADMIN && requestingUser.id !== targetUserId) {
      throw new ForbiddenException('You are not authorized to set these working hours.');
    }

    const newWorkingHoursEntries: WorkingHours[] = [];

    for (const entry of dto.entries) {
      // Basic time validation: endTime must be after startTime
      if (entry.startTime >= entry.endTime) {
        throw new BadRequestException(
          `For day ${entry.dayOfWeek}, endTime (${entry.endTime}) must be after startTime (${entry.startTime}).`,
        );
      }
      // TODO: Add validation for overlapping intervals for the same day if needed.
      // This can be complex, e.g., check if new [startTime, endTime] overlaps with existing ones for this day.
      // For now, we are replacing all, so overlap check is against entries within the DTO for the same day.
    }
    
    // Validate for overlaps within the DTO itself (simplified check)
    const dailyEntriesMap = new Map<DayOfWeek, WorkingHoursEntryDto[]>();
    for (const entry of dto.entries) {
        if(!dailyEntriesMap.has(entry.dayOfWeek)) dailyEntriesMap.set(entry.dayOfWeek, []);
        dailyEntriesMap.get(entry.dayOfWeek)!.push(entry);
    }

    for(const [day, entries] of dailyEntriesMap.entries()){
        entries.sort((a,b) => a.startTime.localeCompare(b.startTime));
        for(let i = 0; i < entries.length - 1; i++){
            if(entries[i].endTime > entries[i+1].startTime){
                 throw new BadRequestException(
                    `Overlapping time intervals detected for ${day}: [${entries[i].startTime}-${entries[i].endTime}] and [${entries[i+1].startTime}-${entries[i+1].endTime}].`
                );
            }
        }
    }

    return this.entityManager.transaction(async transactionalEntityManager => {
      // 1. Delete all existing working hours for this user
      await transactionalEntityManager.delete(WorkingHours, { userId: targetUserId });
      this.logger.log(`Deleted existing working hours for user ${targetUserId}.`);

      // 2. Create new working hours entries
      if (dto.entries && dto.entries.length > 0) {
        for (const entryDto of dto.entries) {
          const newEntry = transactionalEntityManager.create(WorkingHours, {
            userId: targetUserId,
            dayOfWeek: entryDto.dayOfWeek,
            startTime: entryDto.startTime,
            endTime: entryDto.endTime,
          });
          newWorkingHoursEntries.push(newEntry);
        }
        await transactionalEntityManager.save(WorkingHours, newWorkingHoursEntries);
        this.logger.log(`Saved ${newWorkingHoursEntries.length} new working hour entries for user ${targetUserId}.`);
      } else {
        this.logger.log(`No new working hour entries provided for user ${targetUserId}. All previous hours cleared.`);
      }
      return newWorkingHoursEntries; // Return the newly created (and saved) entries
    });
  }

  async getAvailableSlots(
    consultantId: number,
    query: GetSlotsQueryDto,
    requestingUser: User,
  ): Promise<SlotDto[]> {
    this.logger.debug(
      `User ${requestingUser.id} (${requestingUser.role}) requesting slots for consultant ${consultantId} with query: ${JSON.stringify(query)}`,
    );

    const targetUser = await this.usersRepository.findOneBy({ id: consultantId });
    if (!targetUser || (targetUser.role !== UserRole.ADMIN && targetUser.role !== UserRole.CONSULTANT)) {
      throw new NotFoundException(`Consultant with ID ${consultantId} not found or is not a consultant/admin.`);
    }

    // Authorization: Admin can see anyone's slots, consultant can see their own.
    // Patients will have a different endpoint or this logic will be expanded.
    if (requestingUser.role !== UserRole.ADMIN && requestingUser.id !== consultantId) {
      // Allowing patients to query any consultant's slots. Fine for now as this is for slot display.
      // More restrictive checks might be needed if this endpoint was for booking directly.
      // For now, let's allow if the requesting user is a patient, or an admin, or the consultant themselves.
      if (requestingUser.role !== UserRole.PATIENT) {
         throw new ForbiddenException('You are not authorized to view these slots.');
      }
    }

    const appointmentType = await this.appointmentTypeRepository.findOneBy({ id: query.appointmentTypeId });
    if (!appointmentType) {
      throw new NotFoundException(`AppointmentType with ID ${query.appointmentTypeId} not found.`);
    }
    const appointmentDuration = Duration.fromObject({ minutes: appointmentType.durationMinutes });

    const queryDateStr = query.date; // YYYY-MM-DD
    const timeZone = query.timeZone || LuxonSettings.defaultZone.name || 'UTC'; // Use provided, Luxon default, or UTC

    let queryDate;
    try {
      queryDate = DateTime.fromISO(queryDateStr, { zone: timeZone });
      if (!queryDate.isValid) throw new Error(queryDate.invalidReason || 'Invalid date');
    } catch (e) {
      throw new BadRequestException(`Invalid date format or timezone: ${queryDateStr} in ${timeZone}. ${e.message}`);
    }

    // Luxon's weekday: 1 (Monday) to 7 (Sunday). Our DayOfWeek enum: 0 (Sunday) to 6 (Saturday).
    const luxonWeekday = queryDate.weekday; // 1 for Monday, ..., 7 for Sunday
    const dayOfWeekStringValues = [
      DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY,
      DayOfWeek.THURSDAY, DayOfWeek.FRIDAY, DayOfWeek.SATURDAY, DayOfWeek.SUNDAY
    ];
    const dayOfWeekForDb = dayOfWeekStringValues[luxonWeekday - 1];

    if (!dayOfWeekForDb) {
      this.logger.error(`Failed to map Luxon weekday ${luxonWeekday} (from date ${queryDate.toISODate()}) to a DayOfWeek string. This indicates an unexpected weekday value from Luxon.`);
      // This error should ideally not be reached if Luxon behaves as expected (1-7 for weekday)
      throw new Error('Internal server error: Could not determine day of week for query.');
    }
    const appDayOfWeek = luxonWeekday === 7 ? DayOfWeek.SUNDAY : (luxonWeekday as DayOfWeek); // map luxon weekday to our enum

    const workingHoursEntries = await this.workingHoursRepository.find({
      where: { userId: consultantId, dayOfWeek: dayOfWeekForDb },
      order: { startTime: 'ASC' },
    });

    if (!workingHoursEntries || workingHoursEntries.length === 0) {
      return []; // No working hours defined for this day
    }

    // Fetch existing appointments for the consultant on the given day
    const dayStart = queryDate.startOf('day');
    const dayEnd = queryDate.endOf('day');

    const existingAppointments = await this.appointmentRepository.find({
      where: {
        consultantId: consultantId,
        date: Between(dayStart.toJSDate(), dayEnd.toJSDate()), // TypeORM expects JS Date for Between
        // status: Not(In([AppointmentStatus.CANCELLED])) // Optionally filter out cancelled appointments
      },
      relations: ['appointmentType'], // Ensure durationMinutes is loaded if not eager
    });

    const bookedSlotsIntervals: Interval[] = existingAppointments.map(app => {
      const appStartTime = DateTime.fromJSDate(app.date, { zone: timeZone });
      // Ensure appointmentType and durationMinutes are available for existing appointments
      const appDurationMinutes = app.appointmentType?.durationMinutes || appointmentDuration.as('minutes'); 
      const appEndTime = appStartTime.plus({ minutes: appDurationMinutes });
      return Interval.fromDateTimes(appStartTime, appEndTime);
    });

    const availableSlots: SlotDto[] = [];

    for (const wh of workingHoursEntries) {
      const [startHour, startMinute] = wh.startTime.split(':').map(Number);
      const [endHour, endMinute] = wh.endTime.split(':').map(Number);

      let slotStart = queryDate.set({ hour: startHour, minute: startMinute, second: 0, millisecond: 0 });
      const workPeriodEnd = queryDate.set({ hour: endHour, minute: endMinute, second: 0, millisecond: 0 });
      
      const workingInterval = Interval.fromDateTimes(slotStart, workPeriodEnd);
      if (!workingInterval.isValid) {
          this.logger.warn(`Invalid working interval for WH ID ${wh.id}: ${slotStart.toISO()} - ${workPeriodEnd.toISO()}`);
          continue;
      }

      while (slotStart.plus(appointmentDuration) <= workPeriodEnd) {
        const slotEnd = slotStart.plus(appointmentDuration);
        const potentialSlotInterval = Interval.fromDateTimes(slotStart, slotEnd);

        let isOverlapping = false;
        for (const bookedInterval of bookedSlotsIntervals) {
          if (potentialSlotInterval.overlaps(bookedInterval)) {
            isOverlapping = true;
            break;
          }
        }

        if (!isOverlapping) {
          availableSlots.push({ startAt: slotStart.toISO(), endAt: slotEnd.toISO() });
        }
        slotStart = slotStart.plus(appointmentDuration); // For now, step is same as duration
        // To make slots every 15 mins for a 30 min appointment, you'd use slotStart.plus({ minutes: 15 })
      }
    }
    return availableSlots;
  }
}
 