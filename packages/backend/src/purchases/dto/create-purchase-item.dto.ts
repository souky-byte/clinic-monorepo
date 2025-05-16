import { IsInt, IsNotEmpty, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePurchaseItemDto {
  @ApiProperty({
    description: 'ID of the inventory item being purchased',
    example: 101,
  })
  @IsInt()
  @IsNotEmpty()
  inventoryItemId: number;

  @ApiProperty({
    description: 'Quantity of the item being purchased, must be at least 1',
    example: 2,
    minimum: 1,
  })
  @IsInt()
  @IsNotEmpty()
  @Min(1) // Musí být zakoupeno alespoň 1 kus
  quantity: number;
} 