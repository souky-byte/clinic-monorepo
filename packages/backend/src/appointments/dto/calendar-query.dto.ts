import { IsISO8601, IsOptional, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CalendarQueryDto {
  @ApiProperty({
    description: 'Start date for the calendar view in ISO 8601 format (YYYY-MM-DD)',
    example: '2023-12-01',
  })
  @IsISO8601()
  startDate: string;

  @ApiProperty({
    description: 'End date for the calendar view in ISO 8601 format (YYYY-MM-DD)',
    example: '2023-12-31',
  })
  @IsISO8601()
  endDate: string;

  @ApiPropertyOptional({
    description: 'Optional consultant ID to filter appointments in calendar view',
    example: 5,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'consultantId must be an integer number if provided' })
  consultantId?: number;
} 