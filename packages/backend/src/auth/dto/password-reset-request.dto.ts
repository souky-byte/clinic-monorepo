import { IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PasswordResetRequestDto {
  @ApiProperty({
    description: 'Email address to send password reset link to',
    example: 'user@example.com',
  })
  @IsNotEmpty()
  @IsEmail()
  email: string;
} 