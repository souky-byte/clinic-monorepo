import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNumber, IsOptional } from 'class-validator';

export class UpdateConsultantInventoryVisibilityDto {
  @ApiProperty({
    description: 'Array of inventory item IDs to be made visible to the consultant. Replaces existing specific visibilities.',
    type: [Number],
    example: [1, 2, 3],
  })
  @IsArray()
  @IsNumber({}, { each: true })
  @IsOptional() // Může být i prázdné pole pro odstranění všech specifických viditelností
  inventoryItemIds?: number[];
} 