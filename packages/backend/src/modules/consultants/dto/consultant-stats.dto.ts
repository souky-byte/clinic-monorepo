import { ApiProperty } from '@nestjs/swagger';

class AppointmentByTypeStatsDto {
  @ApiProperty({ example: 1, description: 'ID of the appointment type' })
  typeId: number;

  @ApiProperty({ example: 'Initial Consultation', description: 'Name of the appointment type' })
  typeName: string;

  @ApiProperty({ example: 10, description: 'Number of appointments of this type' })
  count: number;
}

class RecentAppointmentStatsDto {
  @ApiProperty({ example: 101, description: 'ID of the appointment' })
  id: number;

  @ApiProperty({ example: 'John Doe', description: 'Name of the patient' })
  patientName: string;

  @ApiProperty({ example: '2024-07-30T10:00:00.000Z', description: 'Date and time of the appointment' })
  date: string;

  @ApiProperty({ example: 'Follow-up', description: 'Name of the appointment type' })
  typeName: string;
}

export class ConsultantStatsDto {
  @ApiProperty({ example: 50, description: 'Total number of patients assigned to the consultant' })
  totalPatients: number;

  @ApiProperty({ example: 120, description: 'Total number of appointments conducted by the consultant' })
  totalAppointments: number;

  @ApiProperty({ example: 15000.50, description: 'Total revenue generated from the consultant\'s appointments' })
  totalRevenue: number;

  @ApiProperty({ type: [AppointmentByTypeStatsDto], description: 'Breakdown of appointments by type' })
  appointmentsByType: AppointmentByTypeStatsDto[];

  @ApiProperty({ type: [RecentAppointmentStatsDto], description: 'List of recent appointments' })
  recentAppointments: RecentAppointmentStatsDto[];
} 