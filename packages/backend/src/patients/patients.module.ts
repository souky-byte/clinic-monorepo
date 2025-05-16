import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PatientsController } from './patients.controller';
import { PatientsService } from './patients.service';
import { Patient } from './entities/patient.entity';
import { AuthModule } from '../auth/auth.module';
import { PurchasesModule } from '../purchases/purchases.module';
import { User } from '../auth/entities/user.entity';
import { Purchase } from '../purchases/entities/purchase.entity';
import { AppointmentsModule } from '../appointments/appointments.module';
import { AuditLogModule } from '../modules/audit-log/audit-log.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Patient, User, Purchase]),
    AuthModule,
    forwardRef(() => PurchasesModule),
    forwardRef(() => AppointmentsModule),
    AuditLogModule,
  ],
  controllers: [PatientsController],
  providers: [PatientsService],
  exports: [PatientsService, TypeOrmModule.forFeature([Patient])]
})
export class PatientsModule {}
