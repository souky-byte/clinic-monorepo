import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, ManyToOne, JoinColumn, OneToMany, OneToOne } from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { Purchase } from '../../purchases/entities/purchase.entity';
import { Appointment } from '../../appointments/entities/appointment.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

@Entity('patient_profiles') // New table name
export class PatientProfile {
  @ApiProperty({ description: 'Unique identifier for the patient profile', example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  // User relation for login credentials
  @OneToOne(() => User, user => user.patientProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ApiProperty({ description: 'ID of the associated user account for this patient profile', example: 20 })
  @Column({ unique: true }) // Each user can have only one patient profile
  userId: number;

  // Fields specific to patient profile, previously in Patient entity
  @ApiProperty({ description: 'Full name of the patient (can be different from User name if needed)', example: 'Jana Nováková' })
  @Column({ length: 255 })
  name: string; // Name specific to patient context, User.name is for account holder

  @ApiPropertyOptional({ description: 'Contact email address for the patient (can be different from User login email)', example: 'kontakt.jana@example.com', nullable: true })
  @Column({ length: 255, nullable: true })
  contactEmail?: string;

  @ApiPropertyOptional({ description: 'Phone number of the patient', example: '777555333', nullable: true })
  @Column({ length: 50, nullable: true })
  phone?: string;

  @ApiPropertyOptional({ description: 'Address of the patient', example: 'Dlouhá 1, Praha', nullable: true })
  @Column({ type: 'text', nullable: true })
  address?: string;

  @ApiPropertyOptional({ description: 'Date of birth of the patient', example: '1985-05-15', type: 'string', format: 'date', nullable: true })
  @Column({ type: 'date', nullable: true })
  dateOfBirth?: Date;

  @ApiPropertyOptional({ description: 'Additional notes about the patient', example: 'Aktualizované poznámky k Janě.', nullable: true })
  @Column({ type: 'text', nullable: true })
  notes?: string;

  // Relation to the primary consultant for this patient
  @ApiPropertyOptional({ description: 'Primary consultant assigned to this patient profile', type: () => User, nullable: true })
  @ManyToOne(() => User, { nullable: true, eager: false }) // A patient might not have a primary consultant initially, or it might be managed differently
  @JoinColumn({ name: 'primaryConsultantId' })
  primaryConsultant?: User;

  @ApiPropertyOptional({ description: 'ID of the primary assigned consultant', example: 2, nullable: true })
  @Column({ nullable: true })
  primaryConsultantId?: number;

  @ApiPropertyOptional({ description: 'Date of the patient\'s last visit', example: '2025-05-08', type: 'string', format: 'date', nullable: true })
  @Column({ type: 'date', nullable: true })
  lastVisit?: Date;

  @ApiProperty({ description: 'Total amount spent by the patient (calculated from purchases)', example: '5825.00', type: 'string' })
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalSpent: number;

  @ApiProperty({ description: 'Timestamp of profile creation' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'Timestamp of last profile update' })
  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;

  // Relations to other entities (e.g., purchases, appointments made by this patient)
  @OneToMany(() => Purchase, purchase => purchase.patientProfile)
  purchases: Purchase[];

  @OneToMany(() => Appointment, appointment => appointment.patientProfile)
  appointments: Appointment[];
} 