import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsNotEmpty, IsString, ValidateNested, Matches, ValidateIf } from 'class-validator';
import { DayOfWeek } from '../enums/day-of-week.enum';

export class WorkingHoursEntryDto {
  @ApiProperty({ enum: DayOfWeek, example: DayOfWeek.MONDAY })
  @IsNotEmpty()
  @IsEnum(DayOfWeek)
  dayOfWeek: DayOfWeek;

  @ApiProperty({ 
    description: 'Start time in HH:mm format', 
    example: '09:00', 
    pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$'
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'startTime must be in HH:mm format' })
  startTime: string;

  @ApiProperty({ 
    description: 'End time in HH:mm format', 
    example: '17:30', 
    pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$'
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'endTime must be in HH:mm format' })
  // TODO: Add custom validation to ensure endTime > startTime
  endTime: string;
}

export class CreateWorkingHoursDto {
  @ApiProperty({
    description: 'An array of working hours entries for different days/times. Replaces all existing working hours for the user.',
    type: [WorkingHoursEntryDto],
    example: [
      { dayOfWeek: DayOfWeek.MONDAY, startTime: '09:00', endTime: '12:30' },
      { dayOfWeek: DayOfWeek.MONDAY, startTime: '13:30', endTime: '17:00' },
      { dayOfWeek: DayOfWeek.TUESDAY, startTime: '10:00', endTime: '16:00' },
    ]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkingHoursEntryDto)
  // @ArrayMinSize(1) // If at least one entry is required, or allow empty to clear all
  entries: WorkingHoursEntryDto[];
} 