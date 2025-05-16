import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppointmentTypesController } from './appointment-types.controller';
import { AppointmentTypesService } from './appointment-types.service';
import { AppointmentType } from './entities/appointment-type.entity';
import { AuthModule } from '../auth/auth.module';
import { User } from '../auth/entities/user.entity';
import { AuditLogModule } from '../modules/audit-log/audit-log.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AppointmentType, User]),
    AuthModule,
    AuditLogModule,
  ],
  controllers: [AppointmentTypesController],
  providers: [AppointmentTypesService],
  exports: [AppointmentTypesService, TypeOrmModule.forFeature([AppointmentType])],
})
export class AppointmentTypesModule {} 