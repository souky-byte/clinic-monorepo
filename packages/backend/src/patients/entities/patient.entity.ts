import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany, DeleteDateColumn } from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { Purchase } from '../../purchases/entities/purchase.entity';
import { Appointment } from '../../appointments/entities/appointment.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';

@Entity('patients')
export class Patient {
  @ApiProperty({ description: 'Unique identifier for the patient', example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'Full name of the patient', example: 'Jana Nováková' })
  @Column({ length: 255 })
  name: string;

  @ApiPropertyOptional({ description: 'Email address of the patient', example: 'jana.novakova@example.com', nullable: true })
  @Column({ length: 255, unique: true, nullable: true })
  email?: string;

  @ApiPropertyOptional({ description: 'Phone number of the patient', example: '777555333', nullable: true })
  @Column({ length: 50, nullable: true })
  phone?: string;

  @ApiPropertyOptional({ description: 'Address of the patient', example: 'Dlouhá 1, Praha', nullable: true })
  @Column({ type: 'text', nullable: true })
  address?: string;

  @ApiPropertyOptional({ description: 'Date of birth of the patient', example: '1985-05-15', type: 'string', format: 'date', nullable: true })
  @Column({ type: 'date', nullable: true })
  dateOfBirth?: Date; // Will be serialized as string YYYY-MM-DD

  @ApiPropertyOptional({ description: 'Additional notes about the patient', example: 'Aktualizované poznámky k Janě.', nullable: true })
  @Column({ type: 'text', nullable: true })
  notes?: string;

  @ApiProperty({ description: 'Assigned consultant details', type: () => User }) // Assumes User entity is properly decorated for responses
  @ManyToOne(() => User, user => user.assignedPatients, { nullable: false, eager: true }) 
  @JoinColumn({ name: 'consultantId' })
  consultant: User;

  @ApiProperty({ description: 'ID of the assigned consultant', example: 2 })
  @Column()
  consultantId: number;

  @ApiPropertyOptional({ description: 'Date of the patient\'s last visit', example: '2025-05-08', type: 'string', format: 'date', nullable: true })
  @Column({ type: 'date', nullable: true })
  lastVisit?: Date; // Will be serialized as string YYYY-MM-DD

  @ApiProperty({ description: 'Total amount spent by the patient', example: '5825.00', type: 'string' }) // Is string in response
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalSpent: number; // TypeORM handles conversion

  @ApiProperty({ description: 'Timestamp of patient creation', example: '2025-05-06T16:53:27.179Z' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'Timestamp of last patient update', example: '2025-05-06T17:30:56.807Z' })
  @UpdateDateColumn()
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Timestamp when the patient was soft-deleted', nullable: true, example: null })
  @DeleteDateColumn()
  @Exclude({ toPlainOnly: true })
  deletedAt?: Date;

  @ApiPropertyOptional({ description: 'List of purchases made by the patient', type: () => [Purchase] }) // Not in GET all list response
  @OneToMany(() => Purchase, purchase => purchase.patient)
  purchases: Purchase[];

  @ApiPropertyOptional({ description: 'List of appointments for the patient', type: () => [Appointment] }) // Not in GET all list response
  @OneToMany(() => Appointment, appointment => appointment.patient)
  appointments: Appointment[];
} 