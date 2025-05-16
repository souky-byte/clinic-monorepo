import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToMany, JoinTable, ManyToOne, BeforeUpdate, BeforeInsert } from 'typeorm';
import { User } from '../../auth/entities/user.entity'; // Předpokládáme existenci User entity
import { Transform, Exclude } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'; // Import Swagger decorators

@Entity('inventory_items')
export class InventoryItem {
  @ApiProperty({ description: 'Unique identifier for the inventory item', example: 8 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'Name of the inventory item', example: 'AuditTest Vitamin C (Updated)' })
  @Column({ length: 255 })
  name: string;

  @ApiPropertyOptional({ description: 'Description of the item', example: 'Vitamin C for audit log testing - updated description', nullable: true })
  @Column({ type: 'text', nullable: true })
  description?: string;

  @ApiProperty({ description: 'Current quantity in stock', example: 90 })
  @Column('int', { default: 0 })
  quantity: number;

  @ApiProperty({ description: 'Price without VAT', example: '10.50', type: 'number', format: 'float' })
  @Column('decimal', { precision: 10, scale: 2 })
  priceWithoutVAT: number;

  @ApiProperty({ description: 'VAT rate in percentage', example: '21.00', type: 'number', format: 'float' })
  @Column('decimal', { precision: 5, scale: 2 })
  vatRate: number;

  @ApiPropertyOptional({ description: 'Calculated price including VAT', example: '12.71', type: 'number', format: 'float', nullable: true })
  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  priceWithVAT?: number;

  @ApiProperty({ description: 'Indicates if the item is visible to all consultants by default', example: true })
  @Column({ default: true })
  visibleToAll: boolean;

  @ApiProperty({ description: 'Array of consultant IDs this item is specifically visible to (if visibleToAll is false). Transformed from User[] relation on serialization.', example: [13], type: [Number] })
  @ManyToMany(() => User, user => user.visibleInventoryItems, { eager: false })
  @JoinTable({
    name: 'inventory_item_visible_consultants',
    joinColumn: { name: 'inventoryItemId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'userId', referencedColumnName: 'id' },
  })
  @Transform(({ value }) => {
    if (Array.isArray(value)) {
      return value.map(user => user.id);
    }
    return [];
  }, { toPlainOnly: true })
  visibleToSpecificConsultants: User[] | number[]; // Type is User[] internally, number[] when serialized

  @Exclude()
  @ManyToOne(() => User, user => user.createdInventoryItems, { nullable: true, eager: false })
  createdBy?: User;

  @Exclude()
  @ManyToOne(() => User, user => user.updatedInventoryItems, { nullable: true, eager: false })
  updatedBy?: User;

  @ApiProperty({ description: 'Timestamp when the item was created', example: '2025-05-07T08:49:49.782Z' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'Timestamp of the last update to the item', example: '2025-05-07T08:49:56.571Z' })
  @UpdateDateColumn()
  updatedAt: Date;

  @BeforeInsert()
  @BeforeUpdate()
  calculatePriceWithVAT() {
    if (this.priceWithoutVAT !== undefined && this.priceWithoutVAT !== null && this.vatRate !== undefined && this.vatRate !== null) {
      const price = parseFloat(this.priceWithoutVAT as any);
      const rate = parseFloat(this.vatRate as any) / 100;
      this.priceWithVAT = parseFloat((price * (1 + rate)).toFixed(2));
    } else if (this.priceWithoutVAT !== undefined && this.priceWithoutVAT !== null) {
      this.priceWithVAT = parseFloat(this.priceWithoutVAT as any);
    }
  }
} 