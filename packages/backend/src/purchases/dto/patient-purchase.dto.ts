import { ApiProperty } from '@nestjs/swagger';
import { InventoryItem } from '../../inventory/entities/inventory-item.entity';

export class PatientPurchaseDto {
  @ApiProperty({ description: 'Unique identifier for the purchase record (either Purchase ID or AppointmentProductItem ID)', example: 1 })
  id: number;

  @ApiProperty({ description: 'Indicates the source of the purchase', enum: ['purchase', 'appointment'], example: 'purchase' })
  sourceType: 'purchase' | 'appointment';

  @ApiProperty({ description: 'Identifier of the source entity (Purchase ID or Appointment ID)', example: 101 })
  sourceId: number;

  @ApiProperty({ description: 'Date of the purchase or appointment', example: '2023-05-20T10:00:00.000Z' })
  date: string; // ISO 8601 date string

  @ApiProperty({ type: () => InventoryItem, description: 'Details of the purchased inventory item' })
  inventoryItem: InventoryItem;

  @ApiProperty({ description: 'Quantity of the item purchased', example: 2 })
  quantity: number;

  @ApiProperty({ description: 'Price per unit at the time of purchase/booking', example: '150.00', type: 'string' })
  price: string;

  @ApiProperty({ description: 'VAT rate at the time of purchase/booking', example: '21.00', type: 'string' })
  vatRate: string;
}
