import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToMany, JoinTable, OneToMany } from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { Appointment } from '../../appointments/entities/appointment.entity';

@Entity('appointment_types')
export class AppointmentType {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'int', comment: 'Duration of the appointment in minutes', default: 60 })
  durationMinutes: number;

  @Column({ default: true })
  visibleToAll: boolean;

  @ManyToMany(() => User, user => user.visibleAppointmentTypes, { eager: false }) 
  @JoinTable({
    name: 'appointment_type_visibility_consultants',
    joinColumn: { name: 'appointmentTypeId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'consultantId', referencedColumnName: 'id' },
  })
  visibleToSpecificConsultants: User[];

  @OneToMany(() => Appointment, appointment => appointment.appointmentType)
  appointments: Appointment[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 