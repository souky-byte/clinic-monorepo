import { IsOptional, IsString, IsInt, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';

// Prozatím nebudeme implementovat vnořené filtrování `filter[field]`,
// ale přímo pojmenované vlastnosti pro jednoduchost.
// Pokud bychom chtěli přesně `filter[consultantId]`, museli bychom použít vlastní pipe nebo složitější DTO.

export class PatientQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Search term to filter patients by name, email, etc.',
    example: 'Alice',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter patients assigned to a specific consultant ID',
    example: 5,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number) // Zajistí transformaci stringu z query na číslo
  consultantId?: number;

  @ApiPropertyOptional({
    description: "Filter patients whose last visit was on or after this date (YYYY-MM-DD)",
    example: '2023-01-01',
  })
  @IsOptional()
  @IsDateString()
  lastVisitFrom?: string;

  @ApiPropertyOptional({
    description: "Filter patients whose last visit was on or before this date (YYYY-MM-DD)",
    example: '2023-12-31',
  })
  @IsOptional()
  @IsDateString()
  lastVisitTo?: string;
} 