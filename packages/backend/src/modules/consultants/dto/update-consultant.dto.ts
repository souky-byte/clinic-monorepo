import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, IsOptional, IsEnum } from 'class-validator';
import { UserRole } from '../../../auth/enums/user-role.enum';

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  // PENDING_VERIFICATION = 'pending_verification',
  // SUSPENDED = 'suspended',
}

export class UpdateConsultantDto {
  @ApiPropertyOptional({ example: 'Johnathan Doe', description: 'Full name of the consultant' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'john.doe.new@example.com', description: 'Email address (must be unique)' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    enum: UserRole,
    description: 'Role of the user',
    example: 'consultant',
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({
    enum: UserStatus,
    description: 'Status of the consultant account',
    example: UserStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
} 