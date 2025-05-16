import { IsOptional, IsInt, IsString, IsDateString, Min, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { AppointmentStatus } from '../entities/appointment.entity';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum AppointmentSortBy {
  DATE = 'date',
  PATIENT_NAME = 'patient.name',
  CONSULTANT_NAME = 'consultant.name',
  TYPE_NAME = 'appointmentType.name',
  STATUS = 'status',
  CREATED_AT = 'createdAt',
}

export class AppointmentQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Search term for appointments (e.g., patient name, notes - if implemented in service)',
    example: 'Doe',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter appointments by status',
    enum: AppointmentStatus,
    example: AppointmentStatus.UPCOMING,
  })
  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;

  @ApiPropertyOptional({
    description: 'Filter appointments by consultant ID',
    example: 4,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  consultantId?: number;

  @ApiPropertyOptional({
    description: 'Filter appointments by patient ID',
    example: 22,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  patientId?: number;

  @ApiPropertyOptional({
    description: 'Filter appointments by appointment type ID',
    example: 3,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  appointmentTypeId?: number;

  @ApiPropertyOptional({
    description: 'Filter appointments starting on or after this date (YYYY-MM-DD)',
    example: '2023-12-01',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Filter appointments ending on or before this date (YYYY-MM-DD)',
    example: '2023-12-31',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Field to sort appointments by',
    enum: AppointmentSortBy,
    example: AppointmentSortBy.DATE,
    default: AppointmentSortBy.DATE,
  })
  @IsOptional()
  @IsEnum(AppointmentSortBy)
  sortBy?: AppointmentSortBy = AppointmentSortBy.DATE;
  // sortOrder is inherited from PaginationQueryDto
} 