import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, IsNotEmpty, IsEnum } from 'class-validator';
import { UserRole } from '../../../auth/enums/user-role.enum';

export class CreateConsultantDto {
  @ApiProperty({ example: 'John Doe', description: 'Full name of the consultant' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'john.consultant@example.com', description: 'Email address (must be unique)' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'Str0ngP@sswOrd', description: 'Password (at least 8 characters)' })
  @IsString()
  @MinLength(8)
  @IsNotEmpty()
  password: string;

  @ApiProperty({
    enum: UserRole,
    description: 'Role of the user. For this endpoint, typically \'consultant\' or \'admin\'.',
    example: UserRole.CONSULTANT,
  })
  @IsEnum(UserRole)
  @IsNotEmpty()
  role: UserRole;
} 