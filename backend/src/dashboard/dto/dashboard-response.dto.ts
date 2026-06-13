import { ApiProperty } from '@nestjs/swagger';

export class DashboardKpisDto {
  @ApiProperty({ example: 1250000.0 })
  revenue!: number;
  @ApiProperty({ example: 450000.0 })
  expenses!: number;
  @ApiProperty({ example: 750000.0 })
  gross_profit!: number;
  @ApiProperty({ example: 300000.0 })
  net_profit!: number;
  @ApiProperty({ example: 850000.0 })
  cash_balance!: number;
  @ApiProperty({ example: 92.5 })
  budget_utilization!: number;
  @ApiProperty({ example: 96.8 })
  forecast_accuracy!: number;
}

export class MonthlyTrendItemDto {
  @ApiProperty({ example: 6 })
  period_month!: number;
  @ApiProperty({ example: 100000.0 })
  actual!: number;
  @ApiProperty({ example: 95000.0 })
  budget!: number;
  @ApiProperty({ example: 98000.0 })
  forecast!: number;
}

export class DashboardTrendDto {
  @ApiProperty({ type: [MonthlyTrendItemDto] })
  trend!: MonthlyTrendItemDto[];
}

export class UtilizationDto {
  @ApiProperty({ example: 95.2 })
  revenue_utilization!: number;
  @ApiProperty({ example: 102.5 })
  expense_utilization!: number;
}

export class AccuracyDto {
  @ApiProperty({ example: 96.8 })
  overall_accuracy!: number;
  @ApiProperty({ type: [MonthlyTrendItemDto] })
  monthly_accuracy!: MonthlyTrendItemDto[];
}

export class RankedItemDto {
  @ApiProperty({ example: '1' })
  id!: string;
  @ApiProperty({ example: 'Main Product' })
  name!: string;
  @ApiProperty({ example: 250000.0 })
  value!: number;
}

export class TopItemsDto {
  @ApiProperty({ type: [RankedItemDto] })
  items!: RankedItemDto[];
}
