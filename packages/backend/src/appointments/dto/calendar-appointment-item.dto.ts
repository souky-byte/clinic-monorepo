import { ApiProperty } from '@nestjs/swagger';
import { AppointmentStatus } from "../entities/appointment.entity";

// Převedeno na třídu pro použití s @ApiProperty
export class CalendarAppointmentItemDto {
  @ApiProperty({ description: 'Unique ID of the appointment', example: 101 })
  id: number;

  @ApiProperty({ description: 'Title of the calendar event (e.g., Patient Name - Appointment Type)', example: 'Alice Wonderland - Initial Consultation' })
  title: string;

  @ApiProperty({ description: 'Start date and time of the appointment in ISO 8601 format', example: '2023-12-20T10:00:00.000Z' })
  start: string; // ISO string

  @ApiProperty({ description: 'End date and time of the appointment in ISO 8601 format', example: '2023-12-20T11:00:00.000Z' })
  end: string;   // ISO string

  @ApiProperty({ description: 'ID of the patient profile', example: 15 })
  patientProfileId: number;

  @ApiProperty({ description: 'Name of the patient', example: 'Alice Wonderland' })
  patientName: string;

  @ApiProperty({ description: 'ID of the appointment type', example: 1 })
  appointmentTypeId: number;

  @ApiProperty({ description: 'Name of the appointment type', example: 'Initial Consultation' })
  appointmentTypeName: string;

  @ApiProperty({ description: 'ID of the consultant', example: 2 })
  consultantId: number;

  @ApiProperty({ description: 'Name of the consultant', example: 'Dr. Bob' })
  consultantName: string;

  @ApiProperty({ description: 'Status of the appointment', enum: AppointmentStatus, example: AppointmentStatus.UPCOMING })
  status: AppointmentStatus;
} 