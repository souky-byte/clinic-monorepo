import { IsString, IsEmail, IsOptional, IsDateString, IsInt, MinLength, MaxLength, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePatientDto {
  @ApiProperty({ description: "Patient's full name", example: 'Alice Wonderland' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ description: "Patient's email address", example: 'alice@example.com' })
  @IsEmail()
  @IsOptional()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ description: "Patient's phone number", example: '+420123456789' })
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
  dateOfBirth?: string; // Přijímáme jako string, validátor ověří formát

  @ApiProperty({ description: "ID of the consultant assigned to this patient", example: 1 })
  @IsInt()
  @IsNotEmpty()
  consultantId: number;

  @ApiPropertyOptional({ description: "Optional notes about the patient", example: 'Allergic to cats.' })
  @IsString()
  @IsOptional()
  notes?: string;
} 