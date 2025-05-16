import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Appointment } from './appointment.entity';
import { InventoryItem } from '../../inventory/entities/inventory-item.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';

@Entity('appointment_product_items')
export class AppointmentProductItem {
  @ApiProperty({ description: 'Unique identifier for the appointment product item', example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  // appointmentId is implicitly part of the relation, usually not exposed directly in nested DTOs if `appointment` object is present.
  @Exclude() // Exclude if it's redundant with the nested appointment object, or make ApiPropertyOptional
  @Column()
  appointmentId: number;

  @Exclude() // Often excluded to prevent circular dependencies in responses; depends on desired API output
  @ManyToOne(() => Appointment, appointment => appointment.appointmentProducts)
  @JoinColumn({ name: 'appointmentId' })
  appointment: Appointment;

  @ApiProperty({ description: 'ID of the associated inventory item', example: 1 })
  @Column()
  inventoryItemId: number;

  @ApiProperty({ description: 'Details of the associated inventory item', type: () => InventoryItem })
  @ManyToOne(() => InventoryItem, { eager: true })
  @JoinColumn({ name: 'inventoryItemId' })
  inventoryItem: InventoryItem;

  @ApiProperty({ description: 'Quantity of the item for this appointment', example: 1 })
  @Column()
  quantity: number;

  @ApiProperty({ description: 'Price of one unit at the time of booking', example: '250.00', type: 'string' })
  @Column({ type: 'decimal', precision: 10, scale: 2, comment: 'Price of one unit at the time of booking/purchase' })
  priceAtTimeOfBooking: number; // TypeORM handles conversion, response is string

  @ApiProperty({ description: 'VAT rate at the time of booking', example: '10.00', type: 'string' })
  @Column({ type: 'decimal', precision: 10, scale: 2, comment: 'VAT rate at the time of booking/purchase' })
  vatRateAtTimeOfBooking: number; // TypeORM handles conversion, response is string
} 