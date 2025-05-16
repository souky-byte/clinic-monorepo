import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PasswordResetDto {
  @ApiProperty({
    description: 'Password reset token received via email',
    example: 'longrandomstringtoken12345',
  })
  @IsNotEmpty()
  @IsString()
  token: string;

  @ApiProperty({
    description: 'New password, at least 8 characters long',
    example: 'newSecurePassword123',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  // Volitelně přidat komplexnější regex pro sílu hesla
  password: string;

  @ApiProperty({
    description: 'Confirmation of the new password, must match password field',
    example: 'newSecurePassword123',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  // Zde by měl být custom validátor pro shodu s 'password'
  // Prozatím jen základní validace, shodu ověříme v servise
  passwordConfirmation: string; 
} 