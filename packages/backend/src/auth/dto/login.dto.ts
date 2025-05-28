import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: 'User email for login',
    example: 'patient.alpha.deux@example.com',
  })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'User password for login',
    example: 'password123',
  })
  @IsNotEmpty()
  @IsString()
  password: string;
} 