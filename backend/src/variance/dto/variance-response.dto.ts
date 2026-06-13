import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class VarianceRecordDto {
  @ApiProperty({
    description: 'The company ID',
    example: '1',
  })
  company_id!: string;

  @ApiProperty({
    description: 'Fiscal year',
    example: 2026,
  })
  fiscal_year!: number;

  @ApiProperty({
    description: 'Period month (1-12)',
    example: 6,
  })
  period_month!: number;

  @ApiProperty({
    description: 'Account ID',
    example: '10',
  })
  account_id!: string;

  @ApiPropertyOptional({
    description: 'Site ID, if applicable',
    example: '2',
    nullable: true,
  })
  site_id?: string | null;

  @ApiPropertyOptional({
    description: 'Product ID, if applicable',
    example: '3',
    nullable: true,
  })
  product_id?: string | null;

  @ApiPropertyOptional({
    description: 'Customer ID, if applicable',
    example: '4',
    nullable: true,
  })
  customer_id?: string | null;

  @ApiProperty({
    description: 'Budget amount',
    example: 100000.0,
  })
  budget_amount!: number;

  @ApiProperty({
    description: 'Actual amount',
    example: 95000.0,
  })
  actual_amount!: number;

  @ApiProperty({
    description: 'Forecast amount',
    example: 98000.0,
  })
  forecast_amount!: number;

  @ApiProperty({
    description:
      'Variance amount calculated based on the endpoint comparison direction',
    example: -5000.0,
  })
  variance_amount!: number;

  @ApiProperty({
    description:
      'Variance percentage calculated relative to the baseline amount',
    example: -5.0,
    nullable: true,
  })
  variance_pct!: number | null;

  // Additional fields for the Budget vs Actual vs Forecast three-way comparison
  @ApiPropertyOptional({
    description: 'Actual vs Budget variance amount (Actual - Budget)',
    example: -5000.0,
  })
  actual_vs_budget_amount?: number;

  @ApiPropertyOptional({
    description: 'Actual vs Budget variance percentage',
    example: -5.0,
    nullable: true,
  })
  actual_vs_budget_pct?: number | null;

  @ApiPropertyOptional({
    description: 'Forecast vs Budget variance amount (Forecast - Budget)',
    example: -2000.0,
  })
  forecast_vs_budget_amount?: number;

  @ApiPropertyOptional({
    description: 'Forecast vs Budget variance percentage',
    example: -2.0,
    nullable: true,
  })
  forecast_vs_budget_pct?: number | null;

  @ApiPropertyOptional({
    description: 'Forecast vs Actual variance amount (Forecast - Actual)',
    example: 3000.0,
  })
  forecast_vs_actual_amount?: number;

  @ApiPropertyOptional({
    description: 'Forecast vs Actual variance percentage',
    example: 3.16,
    nullable: true,
  })
  forecast_vs_actual_pct?: number | null;
}

export class PaginatedVarianceResponseDto {
  @ApiProperty({
    description: 'Total number of records matching filters',
    example: 120,
  })
  total!: number;

  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page!: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 50,
  })
  limit!: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 3,
  })
  totalPages!: number;

  @ApiProperty({
    description: 'List of variance records',
    type: [VarianceRecordDto],
  })
  data!: VarianceRecordDto[];
}
