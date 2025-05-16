import { ApiProperty } from '@nestjs/swagger';

export class ConsultantInventoryVisibilityDto {
  @ApiProperty({ example: 1, description: 'ID of the inventory item' })
  id: number;

  @ApiProperty({ example: 'Vitamin C 500mg', description: 'Name of the inventory item' })
  name: string;

  @ApiProperty({ example: true, description: 'Whether the item is visible to the consultant' })
  visible: boolean;
} 