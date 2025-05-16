import { IsString, IsNotEmpty, IsNumber, IsOptional, IsBoolean, IsArray, Min, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateInventoryItemDto {
  @ApiProperty({ description: 'Name of the inventory item', example: 'Vitamin C 1000mg' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Optional description of the item', example: 'High potency Vitamin C supplement' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Current quantity in stock', example: 100, minimum: 0 })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Type(() => Number) // Pro transformaci z query/form-data
  quantity: number;

  @ApiProperty({ description: 'Price without VAT', example: 10.99, type: 'number', format: 'float' })
  @IsNotEmpty()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Type(() => Number)
  priceWithoutVAT: number;

  @ApiProperty({ description: 'VAT rate in percentage (e.g., 21 for 21%)', example: 21, minimum: 0 })
  @IsNotEmpty()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0) // DPH může být 0
  @Type(() => Number)
  vatRate: number; // Např. 21 pro 21%

  @ApiPropertyOptional({ description: 'Whether the item is visible to all consultants by default', example: true, default: true })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  visibleToAll?: boolean = true;

  // Pole ID konzultantů, pokud visibleToAll je false
  @ApiPropertyOptional({
    description: 'Array of consultant IDs if item visibility is restricted (used if visibleToAll is false)',
    example: [1, 2, 3],
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  @Type(() => Number) // Type pro každý prvek pole, ale IsNumber kontroluje každý prvek
  visibleToSpecificConsultantIds?: number[];
} 