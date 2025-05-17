import { IsInt, IsNotEmpty, IsOptional, IsString, IsDateString, IsArray, ValidateNested, Min, ArrayMinSize, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AppointmentStatus } from '../entities/appointment.entity';

class AppointmentProductItemDto {
  @ApiProperty({ description: 'ID of the inventory item (product) sold during the appointment', example: 101, minimum: 1 })
  @IsInt()
  @Min(1)
  inventoryItemId: number;

  @ApiProperty({ description: 'Quantity of the product sold', example: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  quantity: number;
}

export class CreateAppointmentDto {
  @ApiProperty({ description: "Patient's ID for the appointment", example: 15, minimum: 1 })
  @IsInt()
  @Min(1)
  patientId: number;

  @ApiProperty({ description: 'ID of the appointment type', example: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  appointmentTypeId: number;

  @ApiProperty({ description: "Consultant's ID for the appointment", example: 2, minimum: 1 })
  @IsInt()
  @Min(1)
  consultantId: number;

  @ApiProperty({ description: 'Date and time of the appointment in ISO 8601 format', example: '2023-11-15T14:30:00.000Z' })
  @IsDateString()
  date: string;

  @ApiPropertyOptional({
    description: 'Status of the appointment',
    enum: AppointmentStatus,
    default: AppointmentStatus.UPCOMING,
    example: AppointmentStatus.COMPLETED,
  })
  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;

  @ApiPropertyOptional({ description: 'Optional notes for the appointment', example: 'Patient needs to discuss test results.' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Optional array of products sold during the appointment.',
    type: [AppointmentProductItemDto],
    example: [{ inventoryItemId: 1, quantity: 1 }, { inventoryItemId: 3, quantity: 2 }]
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(0) // Umožňuje prázdné pole, pokud nejsou prodány žádné produkty
  @Type(() => AppointmentProductItemDto)
  products?: AppointmentProductItemDto[];
} 