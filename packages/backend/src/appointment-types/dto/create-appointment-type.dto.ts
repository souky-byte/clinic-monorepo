import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsArray, Min, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAppointmentTypeDto {
  @ApiProperty({ description: 'Name of the appointment type', example: 'Initial Consultation' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Optional description of the appointment type', example: 'First meeting with a new patient.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Price of the appointment', example: 50.00, type: 'number', format: 'float' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  price: number;

  @ApiProperty({ description: 'Duration of the appointment in minutes', example: 60, minimum: 15 })
  @IsNotEmpty()
  @IsInt()
  @Min(15)
  @Type(() => Number)
  durationMinutes: number;

  @ApiProperty({ description: 'Whether this appointment type is visible to all consultants by default', example: true })
  @IsBoolean()
  @Type(() => Boolean)
  visibleToAll: boolean;

  @ApiPropertyOptional({
    description: 'Array of consultant IDs if appointment type visibility is restricted (used if visibleToAll is false)',
    example: [1, 5],
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  @Type(() => Number)
  visibleToSpecificConsultantIds?: number[];
} 