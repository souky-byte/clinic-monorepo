import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsString, IsInt, Min, IsDateString, IsEnum, IsNumber } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export enum AuditLogSortBy {
  TIMESTAMP = 'timestamp',
  USER_NAME = 'userName',
  ACTION = 'action',
  // USER_ID = 'userId' // Pokud bychom chtěli explicitně řadit podle userId
}

export class AuditLogQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by User ID (if numeric string) or User Name (substring match)',
    example: 'john.doe' // Example for userName search
  })
  @IsOptional()
  @IsString()
  user?: string;

  @ApiPropertyOptional({
    description: 'Filter by action type (e.g., USER_CREATED, INVENTORY_ITEM_UPDATED)',
    example: 'USER_LOGIN_SUCCESS' // Example for action type
  })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({
    description: 'Filter by start date (ISO date string, YYYY-MM-DDTHH:mm:ss.sssZ)',
    example: '2024-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Filter by end date (ISO date string, YYYY-MM-DDTHH:mm:ss.sssZ)',
    example: '2024-01-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Search term for details field (performs a substring match on the stringified JSON content)',
    example: 'itemId:5'
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: AuditLogSortBy,
    default: AuditLogSortBy.TIMESTAMP,
    description: 'Field to sort audit logs by',
    example: AuditLogSortBy.TIMESTAMP // Explicit example matching default
  })
  @IsOptional()
  @IsEnum(AuditLogSortBy)
  sortBy?: AuditLogSortBy = AuditLogSortBy.TIMESTAMP;

  // sortOrder is inherited from PaginationQueryDto and already has @ApiPropertyOptional
} 