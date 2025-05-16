import { Expose, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class AppointmentTypeResponseDto {
  @ApiProperty({ description: 'Unique identifier of the appointment type', example: 1 })
  @Expose()
  id: number;

  @ApiProperty({ description: 'Name of the appointment type', example: 'Follow-up Consultation' })
  @Expose()
  name: string;

  @ApiProperty({ description: 'Description of the appointment type', example: 'Regular check-up for existing patients.', nullable: true })
  @Expose()
  description: string;

  @ApiProperty({ description: 'Price of the appointment', example: 35.00, type: 'number', format: 'float' })
  @Expose()
  @Type(() => Number)
  price: number;

  @ApiProperty({ description: 'Duration of the appointment in minutes', example: 30 })
  @Expose()
  durationMinutes: number;

  @ApiProperty({ description: 'Indicates if the appointment type is visible to all consultants by default', example: true })
  @Expose()
  visibleToAll: boolean;

  @ApiProperty({
    description: 'Array of specific consultant IDs this appointment type is visible to (if not visible to all)',
    example: [2, 4],
    type: [Number],
  })
  @Expose()
  visibleTo: number[];

  @ApiProperty({ description: 'Timestamp of when the appointment type was created', example: '2023-01-15T10:30:00.000Z' })
  @Expose()
  createdAt: Date;

  @ApiProperty({ description: 'Timestamp of the last update to the appointment type', example: '2023-01-16T11:00:00.000Z' })
  @Expose()
  updatedAt: Date;

  @ApiProperty({ description: 'Count of appointments associated with this type', example: 25 })
  @Expose()
  appointmentsCount: number;
} 