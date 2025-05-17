import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601, IsNotEmpty, IsNumber, IsOptional, IsString, Matches } from 'class-validator';
import { Type } from 'class-transformer';

export class GetSlotsQueryDto {
  @ApiProperty({
    description: 'Date for which to find slots, in YYYY-MM-DD format.',
    example: '2024-07-25',
    type: String,
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Date must be in YYYY-MM-DD format.',
  })
  date: string;

  @ApiProperty({
    description: 'ID of the appointment type to determine slot duration.',
    example: 1,
    type: Number,
  })
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  appointmentTypeId: number;

  @ApiProperty({
    description: 'Optional: Preferred time zone for slot calculation (IANA format). Defaults to system/consultant preferred if not set.',
    example: 'Europe/Prague',
    required: false,
    type: String,
  })
  @IsOptional()
  @IsString()
  // TODO: Add validation for IANA timezone format if possible using a library or regex
  timeZone?: string; 
}
