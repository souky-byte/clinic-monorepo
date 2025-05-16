import { ApiProperty } from '@nestjs/swagger';
import { Purchase } from '../../purchases/entities/purchase.entity'; // Assuming Purchase entity path

// Reusable PaginationMetaDto (could be moved to a common/shared DTO directory)
class PaginationMetaDto {
  @ApiProperty({ example: 1, description: 'Total number of items available' })
  total: number;

  @ApiProperty({ example: 1, description: 'Current page number' })
  page: number;

  @ApiProperty({ example: 10, description: 'Number of items per page' })
  limit: number;

  @ApiProperty({ example: 1, description: 'Total number of pages' })
  totalPages: number;
}

export class PaginatedPurchasesResponseDto {
  @ApiProperty({
    type: () => [Purchase],
    example: [
      {
        id: 2,
        // patient: { id: 1, name: "Jana Nováková", consultantId: 2, ... }, // Full Patient DTO will be used by Swagger
        patientId: 1,
        // consultant: { id: 2, name: "Consultant User", ... }, // Full User DTO will be used
        consultantId: 2,
        items: [
          {
            id: 2,
            // inventoryItem: { id: 1, name: "Vitamin C Forte", ... }, // Full InventoryItem DTO
            inventoryItemId: 1,
            quantity: 2,
            priceAtPurchase: '250.00',
            vatRateAtPurchase: '10.00',
            subTotal: '550.00',
            // purchaseId: 2, // Usually excluded from item if item is part of purchase
          }
        ],
        purchaseDate: '2025-05-06T19:06:36.140Z',
        totalAmount: '550.00',
        notes: 'Nákup vitamínu C',
        createdAt: '2025-05-06T17:06:36.036Z',
        updatedAt: '2025-05-06T17:06:36.036Z'
      }
    ],
    description: 'Array of purchase records for the current page'
  })
  data: Purchase[]; // Should ideally be PurchaseResponseDto[] or similar

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
} 