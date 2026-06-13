import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min, Max } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class VarianceQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Fiscal year filter',
    example: 2026,
  })
  @IsInt()
  @Min(1900)
  @Max(2100)
  @Type(() => Number)
  @IsOptional()
  fiscal_year?: number;

  @ApiPropertyOptional({
    description: 'Period month filter (1-12)',
    example: 6,
  })
  @IsInt()
  @Min(1)
  @Max(12)
  @Type(() => Number)
  @IsOptional()
  period_month?: number;

  @ApiPropertyOptional({
    description: 'Account ID filter (string representation of bigint)',
    example: '1',
  })
  @IsString()
  @IsOptional()
  account_id?: string;

  @ApiPropertyOptional({
    description: 'Site ID filter (string representation of bigint)',
    example: '1',
  })
  @IsString()
  @IsOptional()
  site_id?: string;

  @ApiPropertyOptional({
    description: 'Product ID filter (string representation of bigint)',
    example: '1',
  })
  @IsString()
  @IsOptional()
  product_id?: string;

  @ApiPropertyOptional({
    description: 'Customer ID filter (string representation of bigint)',
    example: '1',
  })
  @IsString()
  @IsOptional()
  customer_id?: string;
}
