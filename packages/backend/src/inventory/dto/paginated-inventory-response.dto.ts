import { ApiProperty } from '@nestjs/swagger';
import { InventoryItem } from '../entities/inventory-item.entity';

class PaginationMetaDto {
  @ApiProperty({ example: 7, description: 'Total number of items available' })
  total: number;

  @ApiProperty({ example: 1, description: 'Current page number' })
  page: number;

  @ApiProperty({ example: 10, description: 'Number of items per page' })
  limit: number;

  @ApiProperty({ example: 1, description: 'Total number of pages' })
  totalPages: number;
}

export class PaginatedInventoryResponseDto {
  @ApiProperty({
    type: [InventoryItem],
    example: [
      {
        id: 8,
        name: 'AuditTest Vitamin C (Updated)',
        description: 'Vitamin C for audit log testing - updated description',
        quantity: 90,
        priceWithoutVAT: '10.50',
        vatRate: '21.00',
        priceWithVAT: '12.71',
        visibleToAll: true,
        visibleToSpecificConsultants: [],
        createdAt: '2025-05-07T08:49:49.782Z',
        updatedAt: '2025-05-07T08:49:56.571Z',
      },
      {
        id: 9,
        name: 'Omega 3 Capsules',
        description: 'High-quality fish oil supplement',
        quantity: 150,
        priceWithoutVAT: '22.00',
        vatRate: '10.00',
        priceWithVAT: '24.20',
        visibleToAll: false,
        visibleToSpecificConsultants: [13],
        createdAt: '2025-05-08T10:00:00.000Z',
        updatedAt: '2025-05-08T10:00:00.000Z',
      }
    ],
    description: 'Array of inventory items for the current page'
  })
  data: InventoryItem[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
} 