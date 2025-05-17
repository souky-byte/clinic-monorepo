import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConsultantsController } from './consultants.controller';
import { ConsultantsService } from './consultants.service';
import { User } from '../../auth/entities/user.entity';
import { AuthModule } from '../../auth/auth.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { InventoryItem } from '../../inventory/entities/inventory-item.entity';
import { AppointmentType } from '../../appointment-types/entities/appointment-type.entity';
import { Appointment } from '../../appointments/entities/appointment.entity';
import { PatientProfile } from '../../patients/entities/patient-profile.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      InventoryItem,
      AppointmentType,
      Appointment,
      PatientProfile,
    ]),
    forwardRef(() => AuthModule), // forwardRef pro AuthModule, pokud by ConsultantsService byl injectován do AuthService
    AuditLogModule,
  ],
  controllers: [ConsultantsController],
  providers: [ConsultantsService],
  exports: [ConsultantsService] // Export pro případné použití v jiných modulech
})
export class ConsultantsModule {}
