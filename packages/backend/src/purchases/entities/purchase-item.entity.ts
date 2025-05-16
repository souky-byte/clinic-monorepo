import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Purchase } from './purchase.entity';
import { InventoryItem } from '../../inventory/entities/inventory-item.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';

@Entity('purchase_items')
export class PurchaseItem {
  @ApiProperty({ description: 'Unique identifier for the purchase item line', example: 2 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiPropertyOptional({ description: 'ID of the parent purchase (often redundant if nested)', example: 2 })
  @Column()
  purchaseId: number; // Included as per curl response

  @Exclude() // Exclude parent purchase object to prevent circular dependencies in default serialization
  @ManyToOne(() => Purchase, purchase => purchase.items, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'purchaseId' })
  purchase: Purchase;

  @ApiProperty({ description: 'Details of the purchased inventory item', type: () => InventoryItem })
  @ManyToOne(() => InventoryItem, { nullable: false, eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'inventoryItemId' })
  inventoryItem: InventoryItem;

  @ApiProperty({ description: 'ID of the purchased inventory item', example: 1 })
  @Column()
  inventoryItemId: number;

  @ApiProperty({ description: 'Quantity of the item purchased', example: 2 })
  @Column('int')
  quantity: number;

  @ApiProperty({ description: 'Price per unit at the time of purchase', example: '250.00', type: 'string' })
  @Column('decimal', { precision: 10, scale: 2 })
  priceAtPurchase: number; // Response is string

  @ApiProperty({ description: 'VAT rate (%) at the time of purchase', example: '10.00', type: 'string' })
  @Column('decimal', { precision: 5, scale: 2 })
  vatRateAtPurchase: number; // Response is string

  @ApiProperty({ description: 'Subtotal for this line item (price * quantity with VAT)', example: '550.00', type: 'string' })
  @Column('decimal', { precision: 10, scale: 2 })
  subTotal: number; // Response is string
} 