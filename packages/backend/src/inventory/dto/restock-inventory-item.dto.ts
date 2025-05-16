import { IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RestockInventoryItemDto {
  @ApiProperty({
    description: 'Quantity to add to the stock. Must be a positive number.',
    example: 50,
    minimum: 1,
  })
  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  quantity: number;

  @ApiPropertyOptional({
    description: 'Optional notes for the restock operation',
    example: 'Received new shipment from supplier X',
  })
  @IsOptional()
  @IsString()
  notes?: string;
} 