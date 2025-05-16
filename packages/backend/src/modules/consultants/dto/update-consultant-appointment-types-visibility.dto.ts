import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNumber } from 'class-validator';

export class UpdateConsultantAppointmentTypesVisibilityDto {
  @ApiProperty({
    description: 'An array of appointment type IDs that should be visible to the consultant.',
    type: [Number],
    example: [1, 2, 3],
  })
  @IsArray()
  @IsNumber({}, { each: true })
  appointmentTypeIds: number[];
} 