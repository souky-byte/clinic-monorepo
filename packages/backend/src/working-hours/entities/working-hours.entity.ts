import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { DayOfWeek } from '../enums/day-of-week.enum';
import { ApiProperty } from '@nestjs/swagger';

@Entity('working_hours')
export class WorkingHours {
  @ApiProperty({ description: 'Unique identifier for the working hours entry', example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'ID of the user (consultant/admin) these working hours belong to', example: 1 })
  @Column()
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' }) // If user is deleted, their working hours are also deleted
  @JoinColumn({ name: 'userId' })
  user: User;

  @ApiProperty({ description: 'Day of the week', enum: DayOfWeek, example: DayOfWeek.MONDAY })
  @Column({
    type: 'enum',
    enum: DayOfWeek,
  })
  dayOfWeek: DayOfWeek;

  @ApiProperty({ description: 'Start time of the working interval', example: '09:00', pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$ C' })
  @Column({ type: 'time' }) // Using TIME type for HH:mm
  startTime: string; // Store as HH:mm string, e.g., "09:00"

  @ApiProperty({ description: 'End time of the working interval', example: '17:00', pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$ C' })
  @Column({ type: 'time' }) // Using TIME type for HH:mm
  endTime: string;   // Store as HH:mm string, e.g., "17:00"

  @ApiProperty({ description: 'Timestamp of creation' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'Timestamp of last update' })
  @UpdateDateColumn()
  updatedAt: Date;
} 