import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { UserStatus } from './update-consultant.dto'; // Import UserStatus

export enum ConsultantSortBy {
  NAME = 'name',
  EMAIL = 'email',
  LAST_ACTIVE = 'lastActive',
  CREATED_AT = 'createdAt',
  STATUS = 'status',
}

export class ConsultantQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Search by name or email',
    example: 'Doe'
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: UserStatus,
    example: UserStatus.ACTIVE
  })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiPropertyOptional({
    enum: ConsultantSortBy,
    default: ConsultantSortBy.CREATED_AT,
    description: 'Field to sort by',
    example: ConsultantSortBy.NAME
  })
  @IsOptional()
  @IsEnum(ConsultantSortBy)
  sortBy?: ConsultantSortBy = ConsultantSortBy.CREATED_AT;

  // sortOrder is inherited from PaginationQueryDto
} 