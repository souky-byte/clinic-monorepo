import { IsOptional, IsString, IsBoolean, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class InventoryQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Search term to filter inventory items by name or description',
    example: 'vitamin',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter for items with low stock (exact definition of low stock depends on service logic)',
    example: true,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  lowStock?: boolean;

  // ID konzultanta, pro kterého se mají zobrazit položky
  // Toto bude aplikováno v servise na základě role přihlášeného uživatele
  // nebo explicitnímu filtru pro admina
  @ApiPropertyOptional({
    description: 'Filter items visible to a specific consultant ID (primarily for admin use)',
    example: 15,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  visibleToConsultantId?: number; 
} 