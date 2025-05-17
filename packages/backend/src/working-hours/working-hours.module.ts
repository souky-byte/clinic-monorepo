import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkingHours } from './entities/working-hours.entity';
import { User } from '../auth/entities/user.entity';
import { Appointment } from '../appointments/entities/appointment.entity';
import { AppointmentType } from '../appointment-types/entities/appointment-type.entity';
import { WorkingHoursService } from './working-hours.service';
import { WorkingHoursController } from './working-hours.controller';
import { AuthModule } from '../auth/auth.module'; // For guards

@Module({
  imports: [
    TypeOrmModule.forFeature([WorkingHours, User, Appointment, AppointmentType]), // User, Appointment, AppointmentType are needed
    AuthModule, // To use AuthGuard, RolesGuard
  ],
  providers: [WorkingHoursService],
  controllers: [WorkingHoursController],
  exports: [WorkingHoursService] // Export if other services need to consume it directly
})
export class WorkingHoursModule {} 