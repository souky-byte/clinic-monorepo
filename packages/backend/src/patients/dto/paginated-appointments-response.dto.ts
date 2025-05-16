import { ApiProperty } from '@nestjs/swagger';
import { Appointment } from '../../appointments/entities/appointment.entity'; // Assuming Appointment entity path

// Reusable PaginationMetaDto (could be moved to a common/shared DTO directory)
class PaginationMetaDto {
  @ApiProperty({ example: 2, description: 'Total number of items available' })
  total: number;

  @ApiProperty({ example: 1, description: 'Current page number' })
  page: number;

  @ApiProperty({ example: 10, description: 'Number of items per page' })
  limit: number;

  @ApiProperty({ example: 1, description: 'Total number of pages' })
  totalPages: number;
}

export class PaginatedAppointmentsResponseDto {
  @ApiProperty({
    type: () => [Appointment],
    example: [
      {
        id: 1,
        patientId: 1,
        appointmentTypeId: 2,
        consultantId: 2,
        date: '2025-05-07T21:30:48.000Z',
        notes: 'Schůzka pro Janu - vitamíny',
        appointmentProducts: [
          {
            id: 1,
            inventoryItemId: 1,
            quantity: 1,
            priceAtTimeOfBooking: '250.00',
            vatRateAtTimeOfBooking: '10.00'
          }
        ],
        totalPrice: '2775.00',
        status: 'cancelled',
        createdAt: '2025-05-06T17:30:49.008Z',
        updatedAt: '2025-05-06T17:38:50.265Z'
      }
    ],
    description: 'Array of appointment records for the current page'
  })
  data: Appointment[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
} 