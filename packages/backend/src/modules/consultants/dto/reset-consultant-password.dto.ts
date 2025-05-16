import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, IsNotEmpty } from 'class-validator';

export class ResetConsultantPasswordDto {
  @ApiProperty({ example: 'NewStr0ngP@sswOrd', description: 'New password (at least 8 characters)' })
  @IsString()
  @MinLength(8)
  @IsNotEmpty()
  password: string;
} 