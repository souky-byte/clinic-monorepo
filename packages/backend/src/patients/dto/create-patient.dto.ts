import { IsString, IsEmail, IsOptional, IsDateString, IsInt, MinLength, MaxLength, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePatientDto {
  @ApiProperty({ description: "Full name for the patient's account and profile", example: 'Alice Wonderland' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(255)
  name: string;

  @ApiProperty({ description: "Login email address for the patient's user account", example: 'alice.patient@example.com' })
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(255)
  email: string;

  @ApiProperty({ description: 'Password for the patient\'s user account (min 8 characters)', example: 'AlicePass123!' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({ description: "Patient's contact phone number", example: '+420123456789' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional({ description: "Patient's home address", example: '123 Rabbit Hole, Wonderland' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ description: "Patient's date of birth in YYYY-MM-DD format", example: '1990-01-01' })
  @IsDateString()
  @IsOptional()
  dateOfBirth?: string;

  @ApiPropertyOptional({ description: "ID of the primary consultant assigned to this patient (optional at creation)", example: 1, nullable: true })
  @IsInt()
  @IsOptional()
  primaryConsultantId?: number;

  @ApiPropertyOptional({ description: "Optional notes about the patient", example: 'Allergic to cats.' })
  @IsString()
  @IsOptional()
  notes?: string;
} 