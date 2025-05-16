import { ApiProperty } from '@nestjs/swagger';

class PatientsByConsultantDto {
  @ApiProperty({ example: 2, description: 'ID of the consultant' })
  consultantId: number;

  @ApiProperty({ example: 'Consultant User', description: 'Name of the consultant' })
  consultantName: string;

  @ApiProperty({ example: 2, description: 'Number of patients assigned to this consultant' })
  patientCount: number;
}

// Shell DTO for TopSpendingPatientDto - can be fleshed out later
class TopSpendingPatientDto {
  @ApiProperty({ example: 1, description: 'ID of the patient (placeholder)', required: false })
  patientId?: number;

  @ApiProperty({ example: 'Jana Nováková', description: 'Name of the patient (placeholder)', required: false })
  patientName?: string;

  @ApiProperty({ example: '5825.00', description: 'Total amount spent by the patient (placeholder)', required: false })
  totalSpent?: string;
}

export class PatientStatsDto {
  @ApiProperty({ example: 4, description: 'Total number of active patients' })
  totalPatients: number;

  @ApiProperty({ example: 4, description: 'Number of new patients registered this month' })
  newPatientsThisMonth: number;

  @ApiProperty({ example: 0, description: 'Average amount spent per patient' }) // Example is 0 from curl
  averageSpendPerPatient: number;

  @ApiProperty({
    description: 'List of top spending patients',
    type: [TopSpendingPatientDto],
    example: [] // Actual example from curl was an empty array
  })
  topSpendingPatients: TopSpendingPatientDto[];

  @ApiProperty({ type: [PatientsByConsultantDto], description: 'Breakdown of patient counts by consultant' })
  patientsByConsultant: PatientsByConsultantDto[];
} 