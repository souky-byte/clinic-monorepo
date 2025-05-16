import { IsOptional, IsInt, IsString, IsDateString, Min, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum PurchaseSortBy {
  PURCHASE_DATE = 'purchaseDate',
  TOTAL_AMOUNT = 'totalAmount',
  CREATED_AT = 'createdAt',
  PATIENT_NAME = 'patient.name', 
  CONSULTANT_NAME = 'consultant.name' 
}

export class PurchaseQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Search term for purchases (e.g., patient name, product name - if implemented in service)',
    example: 'Vitamin D',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter purchases by patient ID',
    example: 12,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  patientId?: number;

  @ApiPropertyOptional({
    description: 'Filter purchases by consultant ID',
    example: 3,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  consultantId?: number;

  @ApiPropertyOptional({
    description: 'Filter purchases made on or after this date (YYYY-MM-DD)',
    example: '2023-05-01',
  })
  @IsOptional()
  @IsDateString()
  purchaseDateFrom?: string;

  @ApiPropertyOptional({
    description: 'Filter purchases made on or before this date (YYYY-MM-DD)',
    example: '2023-05-31',
  })
  @IsOptional()
  @IsDateString()
  purchaseDateTo?: string;

  @ApiPropertyOptional({
    description: 'Field to sort purchases by',
    enum: PurchaseSortBy,
    example: PurchaseSortBy.PURCHASE_DATE,
    default: PurchaseSortBy.PURCHASE_DATE,
  })
  @IsOptional()
  @IsEnum(PurchaseSortBy)
  sortBy?: PurchaseSortBy = PurchaseSortBy.PURCHASE_DATE;
} 