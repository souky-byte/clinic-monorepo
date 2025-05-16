import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenResponseDto {
  @ApiProperty({
    description: 'New access token generated after successful refresh',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImFkbWluQGV4YW1wbGUuY29tIiwic3ViIjoxLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3NDY2MjM1MDAsImV4cCI6MTc0NjYyNzEwMH0.abcdef1234567890'
  })
  accessToken: string;
} 