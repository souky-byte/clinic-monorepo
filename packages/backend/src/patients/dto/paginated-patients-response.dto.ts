import { ApiProperty } from '@nestjs/swagger';
import { PatientProfile } from '../entities/patient-profile.entity';

// Reusable PaginationMetaDto (could be moved to a common/shared DTO directory)
class PaginationMetaDto {
  @ApiProperty({ example: 4, description: 'Total number of items available' })
  total: number;

  @ApiProperty({ example: 1, description: 'Current page number' })
  page: number;

  @ApiProperty({ example: 10, description: 'Number of items per page' })
  limit: number;

  @ApiProperty({ example: 1, description: 'Total number of pages' })
  totalPages: number;
}

export class PaginatedPatientsResponseDto {
  @ApiProperty({
    type: () => [PatientProfile], // Use arrow function for circular dependency avoidance with entities
    example: [
      {
        id: 1,
        name: 'Jana Nováková',
        email: 'jana.novakova@example.com',
        phone: '777555333',
        address: 'Dlouhá 1, Praha',
        dateOfBirth: '1985-05-15',
        notes: 'Aktualizované poznámky k Janě.',
        consultant: { // Example of nested consultant User (simplified)
          id: 2,
          name: 'Consultant User',
          email: 'consultant@example.com',
          role: 'consultant'
        },
        consultantId: 2,
        lastVisit: '2025-05-08',
        totalSpent: '5825.00',
        createdAt: '2025-05-06T16:53:27.179Z',
        updatedAt: '2025-05-06T17:30:56.807Z'
      }
      // Add another patient example if desired
    ],
    description: 'Array of patient records for the current page'
  })
  data: PatientProfile[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
} 