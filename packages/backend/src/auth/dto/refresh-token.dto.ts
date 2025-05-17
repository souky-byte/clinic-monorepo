import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiProperty({
    description: 'Refresh token used to obtain a new access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InBhdGllbnQuYWxwaGEuZGV1eEBleGFtcGxlLmNvbSIsInN1YiI6NSwiaWF0IjoxNzQ2NjIzNTAwLCJleHAiOjE3NDkyMTU1MDB9.xyz789uvw012',
  })
  @IsNotEmpty()
  @IsString()
  refreshToken: string;
} 