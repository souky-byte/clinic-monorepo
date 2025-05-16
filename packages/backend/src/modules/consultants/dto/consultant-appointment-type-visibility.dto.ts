import { ApiProperty } from '@nestjs/swagger';

export class ConsultantAppointmentTypeVisibilityDto {
  @ApiProperty({ example: 1, description: 'The ID of the appointment type' })
  id: number;

  @ApiProperty({ example: 'Initial Consultation', description: 'The name of the appointment type' })
  name: string;

  @ApiProperty({ example: true, description: 'Whether the appointment type is visible to the consultant' })
  visible: boolean;
} 