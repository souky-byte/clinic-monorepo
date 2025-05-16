import { IsInt, IsNotEmpty, IsOptional, IsDateString, ValidateNested, ArrayMinSize, IsArray, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { CreatePurchaseItemDto } from './create-purchase-item.dto';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePurchaseDto {
  @ApiProperty({ description: "Patient's ID for this purchase", example: 7 })
  @IsInt()
  @IsNotEmpty()
  patientId: number;

  // consultantId se často vezme z currentUser, ale může být i explicitně zadáno adminem
  @ApiProperty({ description: "Consultant's ID who made the sale", example: 2 })
  @IsInt()
  @IsNotEmpty()
  consultantId: number; 

  @ApiPropertyOptional({
    description: "Date of purchase in YYYY-MM-DD format. Defaults to current date if not provided.",
    example: '2023-10-26',
  })
  @IsOptional()
  @IsDateString()
  purchaseDate?: string; // Pokud není zadáno, použije se aktuální datum v service

  @ApiProperty({
    description: 'Array of items included in the purchase. Must contain at least one item.',
    type: [CreatePurchaseItemDto], // Důležité pro Swagger, aby věděl typ pole
    // Example pro pole objektů je složitější, Swagger UI to často zvládne z `type`
    // example: [{ inventoryItemId: 101, quantity: 2 }, { inventoryItemId: 105, quantity: 1 }]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1) // Nákup musí mít alespoň jednu položku
  @Type(() => CreatePurchaseItemDto)
  items: CreatePurchaseItemDto[];

  @ApiPropertyOptional({ description: 'Optional notes for the purchase', example: 'Patient requested discrete packaging.' })
  @IsOptional()
  @IsString()
  notes?: string;
} 