import { PartialType } from '@nestjs/swagger';
import { CreatePatientDto } from './create-patient.dto';
import { IsOptional, IsString, IsInt, IsEmail, IsDateString, MaxLength, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

// Create a new DTO that does not include password and login email for update via this endpoint
export class UpdatePatientProfileDto {
  @ApiPropertyOptional({ description: "Patient's full name for the profile", example: 'Alice P. Wonderland' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name?: string;

  // contactEmail is specific to PatientProfile, login email (User.email) should be updated via auth/user management endpoints
  // @ApiPropertyOptional({ description: "Patient's contact email address", example: 'contact.alice@example.com' })
  // @IsOptional()
  // @IsEmail()
  // @MaxLength(255)
  // contactEmail?: string; 

  @ApiPropertyOptional({ description: "Patient's contact phone number", example: '+420987654321' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional({ description: "Patient's home address", example: '456 Looking-Glass Lane, Wonderland' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: "Patient's date of birth in YYYY-MM-DD format", example: '1990-02-14' })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({ description: "ID of the new primary consultant for this patient (Admin only)", example: 2, nullable: true })
  @IsOptional()
  @IsInt()
  primaryConsultantId?: number;

  @ApiPropertyOptional({ description: "Optional notes about the patient", example: 'Follow-up scheduled.' })
  @IsOptional()
  @IsString()
  notes?: string;
}

// Keep UpdatePatientDto if it's used elsewhere, or refactor its uses.
// For now, let's assume the main update DTO for the patient profile is UpdatePatientProfileDto.
// If UpdatePatientDto was just PartialType(CreatePatientDto), it would include password and login email, which is not desired for a profile update.
export class UpdatePatientDto extends PartialType(CreatePatientDto) {}
// This UpdatePatientDto might now be problematic as CreatePatientDto contains password and login email.
// We should ideally use UpdatePatientProfileDto for PUT /patients/:id. 