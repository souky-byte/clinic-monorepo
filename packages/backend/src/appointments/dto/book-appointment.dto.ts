import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class BookAppointmentDto {
  @ApiProperty({
    description: 'ID of the consultant for the appointment.',
    example: 1,
  })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  consultantId: number;

  @ApiProperty({
    description: 'ID of the appointment type.',
    example: 1,
  })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  appointmentTypeId: number;

  @ApiProperty({
    description: 'Start date and time of the appointment in ISO 8601 format (UTC).',
    example: '2024-07-25T10:00:00.000Z',
  })
  @IsNotEmpty()
  @IsDateString()
  startAt: string;

  @ApiProperty({
    description: 'Optional notes for the appointment.',
    example: 'Discussing recent lab results.',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
