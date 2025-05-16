import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiProperty({
    description: 'Refresh token used to obtain a new access token',
    example: 'anotherlongrandomstringrefreshtoken67890',
  })
  @IsNotEmpty()
  @IsString()
  refreshToken: string;
} 