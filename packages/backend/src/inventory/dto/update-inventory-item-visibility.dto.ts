import { IsBoolean, IsOptional, IsArray, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateInventoryItemVisibilityDto {
  @ApiPropertyOptional({
    description: 'Set to true if the item should be visible to all, false if visibility is restricted by specific consultant IDs.',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  visibleToAll?: boolean;

  @ApiPropertyOptional({
    description: 'Array of consultant IDs who can see this item. Used when visibleToAll is false. Send an empty array to make it visible to no specific consultants (if visibleToAll is also false).',
    example: [10, 12],
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  @Type(() => Number)
  visibleToSpecificConsultantIds?: number[];
} 