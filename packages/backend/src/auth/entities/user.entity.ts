import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, BeforeInsert, BeforeUpdate, OneToMany, ManyToMany, OneToOne, JoinColumn } from 'typeorm';
import * as argon2 from 'argon2';
import { Exclude } from 'class-transformer';
import { InventoryItem } from '../../inventory/entities/inventory-item.entity';
import { Purchase } from '../../purchases/entities/purchase.entity';
import { Appointment } from '../../appointments/entities/appointment.entity';
import { AppointmentType } from '../../appointment-types/entities/appointment-type.entity';
import { UserStatus } from '../../modules/consultants/dto/update-consultant.dto';
import { UserRole } from '../enums/user-role.enum';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PatientProfile } from '../../patients/entities/patient-profile.entity';

export { UserRole };

@Entity('users')
export class User {
  @ApiProperty({ description: 'Unique user identifier', example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'User\'s full name', example: 'Admin User' })
  @Column({ length: 100 })
  name: string;

  @ApiProperty({ description: 'User\'s unique email address', example: 'admin@example.com' })
  @Column({ unique: true, length: 100 })
  email: string;

  @Column()
  @Exclude()
  password: string;

  @ApiProperty({ description: 'User\'s role', enum: UserRole, example: UserRole.ADMIN })
  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.CONSULTANT,
  })
  role: UserRole;

  @ApiProperty({ description: 'User\'s account status', enum: UserStatus, example: UserStatus.ACTIVE })
  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.ACTIVE,
  })
  status: UserStatus;

  @Column({ nullable: true })
  @Exclude()
  hashedRefreshToken?: string;

  @ApiProperty({ description: 'Timestamp of the user\'s last activity', example: '2025-05-07T13:05:44.879Z', nullable: true })
  @Column({ type: 'timestamp', nullable: true, default: () => 'CURRENT_TIMESTAMP' })
  lastActive?: Date;

  @ApiProperty({ description: 'Timestamp when the user was created', example: '2025-05-06T16:20:51.170Z' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'Timestamp of the last update to the user profile', example: '2025-05-07T11:05:44.931Z' })
  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  @Exclude()
  passwordResetToken?: string;

  @Column({ type: 'timestamp', nullable: true })
  @Exclude()
  passwordResetExpires?: Date;

  @ApiPropertyOptional({ description: "Patient's specific profile data, if user is a patient", type: () => PatientProfile, nullable: true })
  @OneToOne(() => PatientProfile, patientProfile => patientProfile.user, { cascade: true, nullable: true, eager: false })
  patientProfile?: PatientProfile;

  @OneToMany(() => InventoryItem, item => item.createdBy)
  createdInventoryItems: InventoryItem[];

  @OneToMany(() => InventoryItem, item => item.updatedBy)
  updatedInventoryItems: InventoryItem[];

  @ManyToMany(() => InventoryItem, item => item.visibleToSpecificConsultants)
  visibleInventoryItems: InventoryItem[];

  @OneToMany(() => PatientProfile, patientProfile => patientProfile.primaryConsultant)
  assignedPatients: PatientProfile[];

  @OneToMany(() => Purchase, purchase => purchase.consultant)
  recordedPurchases: Purchase[];

  @OneToMany(() => Appointment, appointment => appointment.consultant)
  appointmentsAsConsultant: Appointment[];

  @ManyToMany(() => AppointmentType, appointmentType => appointmentType.visibleToSpecificConsultants)
  visibleAppointmentTypes: AppointmentType[];

  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    if (this.password && !this.password.startsWith('$argon2') && this.password.length < 60) {
      this.password = await argon2.hash(this.password);
    }
  }

  async validatePassword(password: string): Promise<boolean> {
    return argon2.verify(this.password, password);
  }
} 