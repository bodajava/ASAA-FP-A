import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PlReportDto {
  @ApiProperty({ example: 6 })
  period_month!: number;

  @ApiProperty({ example: 100000 })
  budget_revenue!: number;
  @ApiProperty({ example: 60000 })
  budget_cogs!: number;
  @ApiProperty({ example: 40000 })
  budget_gross_profit!: number;
  @ApiProperty({ example: 20000 })
  budget_expense!: number;
  @ApiProperty({ example: 20000 })
  budget_net_profit!: number;

  @ApiProperty({ example: 95000 })
  actual_revenue!: number;
  @ApiProperty({ example: 58000 })
  actual_cogs!: number;
  @ApiProperty({ example: 37000 })
  actual_gross_profit!: number;
  @ApiProperty({ example: 21000 })
  actual_expense!: number;
  @ApiProperty({ example: 16000 })
  actual_net_profit!: number;

  @ApiProperty({ example: 98000 })
  forecast_revenue!: number;
  @ApiProperty({ example: 59000 })
  forecast_cogs!: number;
  @ApiProperty({ example: 39000 })
  forecast_gross_profit!: number;
  @ApiProperty({ example: 20500 })
  forecast_expense!: number;
  @ApiProperty({ example: 18500 })
  forecast_net_profit!: number;
}

export class CashFlowReportDto {
  @ApiProperty({ example: 6 })
  period_month!: number;

  @ApiProperty({ example: 80000 })
  budget_inflow!: number;
  @ApiProperty({ example: 50000 })
  budget_outflow!: number;
  @ApiProperty({ example: 30000 })
  budget_net!: number;

  @ApiProperty({ example: 75000 })
  actual_inflow!: number;
  @ApiProperty({ example: 52000 })
  actual_outflow!: number;
  @ApiProperty({ example: 23000 })
  actual_net!: number;

  @ApiProperty({ example: 78000 })
  forecast_inflow!: number;
  @ApiProperty({ example: 51000 })
  forecast_outflow!: number;
  @ApiProperty({ example: 27000 })
  forecast_net!: number;
}

export class GrossMarginReportDto {
  @ApiProperty({ example: 6 })
  period_month!: number;

  @ApiProperty({ example: 100000 })
  budget_revenue!: number;
  @ApiProperty({ example: 60000 })
  budget_cogs!: number;
  @ApiProperty({ example: 40000 })
  budget_margin!: number;
  @ApiProperty({ example: 40.0 })
  budget_margin_pct!: number;

  @ApiProperty({ example: 95000 })
  actual_revenue!: number;
  @ApiProperty({ example: 58000 })
  actual_cogs!: number;
  @ApiProperty({ example: 37000 })
  actual_margin!: number;
  @ApiProperty({ example: 38.95 })
  actual_margin_pct!: number;

  @ApiProperty({ example: 98000 })
  forecast_revenue!: number;
  @ApiProperty({ example: 59000 })
  forecast_cogs!: number;
  @ApiProperty({ example: 39000 })
  forecast_margin!: number;
  @ApiProperty({ example: 39.8 })
  forecast_margin_pct!: number;
}

export class NetProfitReportDto {
  @ApiProperty({ example: 6 })
  period_month!: number;

  @ApiProperty({ example: 100000 })
  budget_revenue!: number;
  @ApiProperty({ example: 20000 })
  budget_net_profit!: number;
  @ApiProperty({ example: 20.0 })
  budget_net_profit_pct!: number;

  @ApiProperty({ example: 95000 })
  actual_revenue!: number;
  @ApiProperty({ example: 16000 })
  actual_net_profit!: number;
  @ApiProperty({ example: 16.84 })
  actual_net_profit_pct!: number;

  @ApiProperty({ example: 98000 })
  forecast_revenue!: number;
  @ApiProperty({ example: 18500 })
  forecast_net_profit!: number;
  @ApiProperty({ example: 18.88 })
  forecast_net_profit_pct!: number;
}

export class BudgetVsActualReportDto {
  @ApiProperty({ example: '10' })
  account_id!: string;
  @ApiProperty({ example: '411000' })
  account_code!: string;
  @ApiProperty({ example: 'Sales Revenue' })
  account_name!: string;
  @ApiProperty({ example: 100000 })
  budget_amount!: number;
  @ApiProperty({ example: 95000 })
  actual_amount!: number;
  @ApiProperty({ example: -5000 })
  variance_amount!: number;
  @ApiProperty({ example: -5.0, nullable: true })
  variance_pct!: number | null;
}

export class ForecastAccuracyReportDto {
  @ApiProperty({ example: 6 })
  period_month!: number;
  @ApiProperty({ example: 95000 })
  actual_amount!: number;
  @ApiProperty({ example: 98000 })
  forecast_amount!: number;
  @ApiProperty({ example: 3000 })
  absolute_error!: number;
  @ApiProperty({ example: 96.84, nullable: true })
  accuracy_pct!: number | null;
}

export class ProductProfitabilityReportDto {
  @ApiProperty({ example: '3' })
  product_id!: string;
  @ApiProperty({ example: 'SKU-001' })
  product_sku!: string;
  @ApiProperty({ example: 'Chocolate Ice Cream' })
  product_name!: string;
  @ApiProperty({ example: 50000 })
  revenue!: number;
  @ApiProperty({ example: 30000 })
  cogs!: number;
  @ApiProperty({ example: 20000 })
  gross_margin!: number;
  @ApiProperty({ example: 40.0, nullable: true })
  gross_margin_pct!: number | null;
}

export class BranchProfitabilityReportDto {
  @ApiProperty({ example: '2' })
  site_id!: string;
  @ApiProperty({ example: 'Zamalek Branch' })
  site_name!: string;
  @ApiProperty({ example: 120000 })
  revenue!: number;
  @ApiProperty({ example: 70000 })
  cogs!: number;
  @ApiProperty({ example: 25000 })
  expenses!: number;
  @ApiProperty({ example: 50000 })
  gross_profit!: number;
  @ApiProperty({ example: 25000 })
  net_profit!: number;
}

export class FactoryCostingReportDto {
  @ApiProperty({ example: '1' })
  site_id!: string;
  @ApiProperty({ example: 'Main Factory' })
  site_name!: string;
  @ApiProperty({ example: 250000 })
  raw_material_cost!: number;
  @ApiProperty({ example: 80000 })
  labor_cost!: number;
  @ApiProperty({ example: 45000 })
  overhead_cost!: number;
  @ApiProperty({ example: 375000 })
  total_cost!: number;
}

export class InventoryCoverageReportDto {
  @ApiProperty({ example: '1' })
  site_id!: string;
  @ApiProperty({ example: 'Main Warehouse' })
  site_name!: string;
  @ApiProperty({ example: '3' })
  product_id!: string;
  @ApiProperty({ example: 'SKU-001' })
  product_sku!: string;
  @ApiProperty({ example: 'Chocolate Ice Cream' })
  product_name!: string;
  @ApiProperty({ example: 1500 })
  qty_on_hand!: number;
  @ApiProperty({ example: 50 })
  avg_daily_qty!: number;
  @ApiProperty({ example: 30.0, nullable: true })
  coverage_days!: number | null;
  @ApiProperty({ example: 75000 })
  inventory_value!: number;
}

export class SlowMovingItemsReportDto {
  @ApiProperty({ example: '1' })
  site_id!: string;
  @ApiProperty({ example: 'Main Warehouse' })
  site_name!: string;
  @ApiProperty({ example: '4' })
  product_id!: string;
  @ApiProperty({ example: 'SKU-002' })
  product_sku!: string;
  @ApiProperty({ example: 'Vanilla Ice Cream' })
  product_name!: string;
  @ApiProperty({ example: 1000 })
  qty_on_hand!: number;
  @ApiProperty({ example: 50000 })
  inventory_value!: number;
  @ApiProperty({ example: 0 })
  moved_qty_90!: number;
  @ApiPropertyOptional({ example: '2026-03-01' })
  last_movement_date?: string | null;
  @ApiProperty({ example: 1 })
  is_slow_moving!: number;
}

export class WastageAnalysisReportDto {
  @ApiProperty({ example: '3' })
  product_id!: string;
  @ApiProperty({ example: 'Chocolate Ice Cream' })
  product_name!: string;
  @ApiProperty({ example: '7' })
  material_id!: string;
  @ApiProperty({ example: 'Raw Cocoa' })
  material_name!: string;
  @ApiProperty({ example: 5.0 })
  standard_wastage_pct!: number;
  @ApiProperty({ example: 5.8 })
  actual_wastage_pct!: number;
  @ApiProperty({ example: 0.8 })
  variance_pct!: number;
}

export class CustomerProfitabilityReportDto {
  @ApiProperty({ example: '5' })
  customer_id!: string;
  @ApiProperty({ example: 'Metro Market' })
  customer_name!: string;
  @ApiPropertyOptional({ example: 'Cairo' })
  region?: string | null;
  @ApiProperty({ example: 90000 })
  revenue!: number;
  @ApiProperty({ example: 50000 })
  cogs!: number;
  @ApiProperty({ example: 15000 })
  expenses!: number;
  @ApiProperty({ example: 40000 })
  gross_profit!: number;
  @ApiProperty({ example: 25000 })
  net_profit!: number;
}

export class ProductCostVarianceReportDto {
  @ApiProperty({ example: '1' })
  product_id!: string;
  @ApiProperty({ example: 'SKU-001' })
  product_sku!: string;
  @ApiProperty({ example: 'Chocolate Ice Cream' })
  product_name!: string;
  @ApiProperty({ example: 2026 })
  fiscal_year!: number;
  @ApiProperty({ example: 6 })
  period_month!: number;
  @ApiProperty({ example: 10000 })
  planned_qty!: number;
  @ApiProperty({ example: 9500 })
  actual_qty!: number;
  @ApiProperty({ example: 5.5 })
  budget_cost_per_unit!: number;
  @ApiProperty({ example: 1.2 })
  budget_labor_per_unit!: number;
  @ApiProperty({ example: 0.8 })
  budget_overhead_per_unit!: number;
  @ApiProperty({ example: 7.5 })
  budget_total_unit_cost!: number;
  @ApiProperty({ example: 55000 })
  budget_total_material!: number;
  @ApiProperty({ example: 12000 })
  budget_total_labor!: number;
  @ApiProperty({ example: 8000 })
  budget_total_overhead!: number;
  @ApiProperty({ example: 52250 })
  actual_total_material!: number;
  @ApiProperty({ example: 11400 })
  actual_total_labor!: number;
  @ApiProperty({ example: 8400 })
  actual_total_overhead!: number;
  @ApiProperty({ example: 72050 })
  actual_total_cost!: number;
  @ApiProperty({ example: 7.58 })
  actual_cost_per_unit!: number;
  @ApiProperty({ example: -2750 })
  material_variance!: number;
  @ApiProperty({ example: -600 })
  labor_variance!: number;
  @ApiProperty({ example: 400 })
  overhead_variance!: number;
}

export class ProductionCapacityReportDto {
  @ApiProperty({ example: '1' })
  site_id!: string;
  @ApiProperty({ example: 'Main Factory' })
  site_name!: string;
  @ApiProperty({ example: 2026 })
  fiscal_year!: number;
  @ApiProperty({ example: 6 })
  period_month!: number;
  @ApiProperty({ example: '3' })
  product_id!: string;
  @ApiProperty({ example: 'Chocolate Ice Cream' })
  product_name!: string;
  @ApiProperty({ example: 'SKU-001' })
  product_sku!: string;
  @ApiProperty({ example: 10000 })
  planned_qty!: number;
  @ApiProperty({ example: 8500 })
  actual_qty!: number;
  @ApiProperty({ example: 85.0, nullable: true })
  capacity_utilization_pct!: number | null;
  @ApiProperty({ example: 50000 })
  estimated_cost!: number;
  @ApiProperty({ example: 48000 })
  actual_cost!: number;
  @ApiProperty({ example: 96.0, nullable: true })
  cost_utilization_pct!: number | null;
  @ApiProperty({ example: -1500 })
  qty_variance!: number;
}

export class CashFlowForecastReportDto {
  @ApiProperty({ example: 6 })
  period_month!: number;
  @ApiProperty({ example: 100000 })
  actual_inflow!: number;
  @ApiProperty({ example: 75000 })
  actual_outflow!: number;
  @ApiProperty({ example: 25000 })
  actual_net!: number;
  @ApiProperty({ example: 110000 })
  budget_inflow!: number;
  @ApiProperty({ example: 80000 })
  budget_outflow!: number;
  @ApiProperty({ example: 30000 })
  budget_net!: number;
  @ApiProperty({ example: 50000 })
  ar_collections!: number;
  @ApiProperty({ example: 45000 })
  ap_payments!: number;
  @ApiProperty({ example: 5000 })
  working_capital_net!: number;
}

export class ExportResultDto {
  @ApiProperty({ description: 'Base64 encoded file content' })
  content!: string;
  @ApiProperty({
    example:
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  mimeType!: string;
  @ApiProperty({ example: 'report-pl.xlsx' })
  filename!: string;
}

export class PaginatedReportResponseDto<T> {
  @ApiProperty({ example: 120 })
  total!: number;
  @ApiProperty({ example: 1 })
  page!: number;
  @ApiProperty({ example: 10 })
  limit!: number;
  @ApiProperty({ example: 12 })
  totalPages!: number;
  data!: T[];
}
