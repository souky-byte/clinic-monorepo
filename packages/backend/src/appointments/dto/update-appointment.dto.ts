import { PartialType } from '@nestjs/mapped-types';
import { CreateAppointmentDto } from './create-appointment.dto';
// Remove status related imports if no longer needed
// import { IsEnum, IsOptional } from 'class-validator';
// import { AppointmentStatus } from '../entities/appointment.entity';
// import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateAppointmentDto extends PartialType(CreateAppointmentDto) {
  // Status is updated via a dedicated endpoint, remove from general update DTO
  // @ApiPropertyOptional({
  //   description: 'New status for the appointment',
  //   enum: AppointmentStatus,
  //   example: AppointmentStatus.COMPLETED,
  // })
  // @IsOptional()
  // @IsEnum(AppointmentStatus)
  // status?: AppointmentStatus;
} 