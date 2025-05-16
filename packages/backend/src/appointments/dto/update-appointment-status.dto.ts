import { IsEnum, IsNotEmpty } from 'class-validator';
import { AppointmentStatus } from '../entities/appointment.entity';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateAppointmentStatusDto {
  @ApiProperty({
    description: 'The new status for the appointment',
    enum: AppointmentStatus,
    example: AppointmentStatus.CANCELLED,
  })
  @IsEnum(AppointmentStatus)
  @IsNotEmpty()
  status: AppointmentStatus;
} 