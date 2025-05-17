import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';
import { Appointment } from './entities/appointment.entity';
import { AppointmentProductItem } from './entities/appointment-product-item.entity';
import { AuthModule } from '../auth/auth.module';
import { PatientsModule } from '../patients/patients.module';
import { AppointmentTypesModule } from '../appointment-types/appointment-types.module';
import { InventoryModule } from '../inventory/inventory.module';
import { AuditLogModule } from '../modules/audit-log/audit-log.module';
import { WorkingHoursModule } from '../working-hours/working-hours.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Appointment, AppointmentProductItem]),
    AuthModule,
    forwardRef(() => PatientsModule),
    forwardRef(() => AppointmentTypesModule),
    forwardRef(() => InventoryModule),
    AuditLogModule,
    forwardRef(() => WorkingHoursModule),
  ],
  controllers: [AppointmentsController],
  providers: [AppointmentsService],
  exports: [AppointmentsService, TypeOrmModule.forFeature([Appointment])],
})
export class AppointmentsModule {} 