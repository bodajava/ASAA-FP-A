import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min, Max } from 'class-validator';

export class YoYComparisonQueryDto {
  @ApiProperty({
    description: 'Current fiscal year to analyze (e.g. 2026)',
    example: 2026,
  })
  @IsInt()
  @Min(1900)
  @Max(2100)
  @Type(() => Number)
  fiscalYear!: number;

  @ApiPropertyOptional({
    description: 'Site ID filter',
    example: '1',
  })
  @IsString()
  @IsOptional()
  siteId?: string;

  @ApiPropertyOptional({
    description: 'Product ID filter',
    example: '1',
  })
  @IsString()
  @IsOptional()
  productId?: string;

  @ApiPropertyOptional({
    description: 'Category ID filter',
    example: '1',
  })
  @IsString()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({
    description: 'Customer ID filter',
    example: '1',
  })
  @IsString()
  @IsOptional()
  customerId?: string;

  @ApiPropertyOptional({
    description: 'Material ID filter',
    example: '1',
  })
  @IsString()
  @IsOptional()
  materialId?: string;
}

export class YoYMetricRecordDto {
  @ApiProperty({ example: 'revenue' })
  metric!: string;

  @ApiProperty({ example: 'Revenue' })
  metricName!: string;

  @ApiProperty({ example: 1200000 })
  previousYearValue!: number;

  @ApiProperty({ example: 1450000 })
  currentYearValue!: number;

  @ApiProperty({ example: 1500000 })
  planValue!: number;

  @ApiProperty({ example: 250000 })
  varianceAmount!: number;

  @ApiProperty({ example: 20.83, nullable: true })
  variancePct!: number | null;

  @ApiProperty({ example: -50000 })
  planVarianceAmount!: number;

  @ApiProperty({ example: -3.33, nullable: true })
  planVariancePct!: number | null;

  @ApiProperty({ example: 'up' })
  trend!: 'up' | 'down' | 'stable';

  @ApiProperty({ example: 'good' })
  status!: 'good' | 'warning' | 'bad';
}

export class YoYComparisonResponseDto {
  @ApiProperty({ type: [YoYMetricRecordDto] })
  metrics!: YoYMetricRecordDto[];
}
