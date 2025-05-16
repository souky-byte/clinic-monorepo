import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { Patient } from '../../patients/entities/patient.entity';
import { PurchaseItem } from './purchase-item.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

@Entity('purchases')
export class Purchase {
  @ApiProperty({ description: 'Unique identifier for the purchase', example: 2 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'Patient who made the purchase', type: () => Patient })
  @ManyToOne(() => Patient, patient => patient.purchases, { nullable: false, onDelete: 'RESTRICT', eager: true }) // Added eager based on curl output
  @JoinColumn({ name: 'patientId' })
  patient: Patient;

  @ApiProperty({ description: 'ID of the patient', example: 1 })
  @Column()
  patientId: number;

  @ApiProperty({ description: 'Consultant who recorded the purchase', type: () => User })
  @ManyToOne(() => User, user => user.recordedPurchases, { nullable: false, onDelete: 'RESTRICT', eager: true }) // Added eager based on curl output
  @JoinColumn({ name: 'consultantId' })
  consultant: User;

  @ApiProperty({ description: 'ID of the consultant', example: 2 })
  @Column()
  consultantId: number;

  @ApiProperty({ description: 'Items included in the purchase', type: () => [PurchaseItem] })
  @OneToMany(() => PurchaseItem, item => item.purchase, { cascade: true, eager: true })
  items: PurchaseItem[];

  @ApiProperty({ description: 'Date of the purchase', example: '2025-05-06T19:06:36.140Z', type: 'string', format: 'date-time' })
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  purchaseDate: Date;

  @ApiProperty({ description: 'Total amount of the purchase', example: '550.00', type: 'string' })
  @Column('decimal', { precision: 10, scale: 2 })
  totalAmount: number; // TypeORM converts to number, response is string

  @ApiPropertyOptional({ description: 'Additional notes for the purchase', example: 'Nákup vitamínu C', nullable: true })
  @Column({ type: 'text', nullable: true })
  notes?: string;

  @ApiProperty({ description: 'Timestamp of purchase creation', example: '2025-05-06T17:06:36.036Z' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'Timestamp of last purchase update', example: '2025-05-06T17:06:36.036Z' })
  @UpdateDateColumn()
  updatedAt: Date;
} 