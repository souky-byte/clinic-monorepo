import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { Patient } from '../../patients/entities/patient.entity';
import { AppointmentType } from '../../appointment-types/entities/appointment-type.entity';
import { AppointmentProductItem } from './appointment-product-item.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum AppointmentStatus {
  UPCOMING = 'upcoming',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('appointments')
export class Appointment {
  @ApiProperty({ description: 'Unique identifier for the appointment', example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'ID of the patient for this appointment', example: 1 })
  @Column()
  patientId: number;

  @ApiProperty({ description: 'Patient details', type: () => Patient })
  @ManyToOne(() => Patient, patient => patient.appointments, { eager: true })
  @JoinColumn({ name: 'patientId' })
  patient: Patient;

  @ApiProperty({ description: 'ID of the appointment type', example: 2 })
  @Column()
  appointmentTypeId: number;

  @ApiProperty({ description: 'Appointment type details', type: () => AppointmentType })
  @ManyToOne(() => AppointmentType, { eager: true })
  @JoinColumn({ name: 'appointmentTypeId' })
  appointmentType: AppointmentType;

  @ApiProperty({ description: 'ID of the consultant for this appointment', example: 2 })
  @Column()
  consultantId: number;

  @ApiProperty({ description: 'Consultant details', type: () => User })
  @ManyToOne(() => User, user => user.appointmentsAsConsultant, { eager: true })
  @JoinColumn({ name: 'consultantId' })
  consultant: User;

  @ApiProperty({ description: 'Date and time of the appointment', example: '2025-05-07T21:30:48.000Z', type: 'string', format: 'date-time' })
  @Column({ type: 'timestamp with time zone' })
  date: Date;

  @ApiPropertyOptional({ description: 'Notes for the appointment', example: 'Schůzka pro Janu - vitamíny', nullable: true })
  @Column({ type: 'text', nullable: true })
  notes: string;

  @ApiProperty({ description: 'Products associated with the appointment', type: () => [AppointmentProductItem] })
  @OneToMany(() => AppointmentProductItem, item => item.appointment, { cascade: true, eager: true })
  appointmentProducts: AppointmentProductItem[];

  @ApiPropertyOptional({ description: 'Total price of the appointment including products', example: '2775.00', type: 'string', nullable: true })
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  totalPrice: number;

  @ApiProperty({ description: 'Status of the appointment', enum: AppointmentStatus, example: AppointmentStatus.CANCELLED })
  @Column({
    type: 'enum',
    enum: AppointmentStatus,
    default: AppointmentStatus.UPCOMING,
  })
  status: AppointmentStatus;

  @ApiProperty({ description: 'Timestamp of appointment creation', example: '2025-05-06T17:30:49.008Z' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'Timestamp of last appointment update', example: '2025-05-06T17:38:50.265Z' })
  @UpdateDateColumn()
  updatedAt: Date;
} 