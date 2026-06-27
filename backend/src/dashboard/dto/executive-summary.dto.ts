import { ApiProperty } from '@nestjs/swagger';

export class ExecutiveKpiDto {
  @ApiProperty({ example: 1250000.0 })
  current!: number;

  @ApiProperty({ example: 1100000.0 })
  previousMonth!: number;

  @ApiProperty({ example: 1000000.0 })
  previousYear!: number;

  @ApiProperty({ example: 25.0 })
  growthPct!: number;

  @ApiProperty({ enum: ['up', 'down', 'neutral'], example: 'up' })
  trend!: 'up' | 'down' | 'neutral';
}

export class ExchangeRatesDto {
  @ApiProperty({ example: 49.5 })
  usdToEgp!: number;

  @ApiProperty({ example: 53.8 })
  eurToEgp!: number;

  @ApiProperty({ example: 13.2 })
  sarToEgp!: number;

  @ApiProperty({ example: 62.5 })
  gbpToEgp!: number;
}

export class ExecutiveSummaryDto {
  @ApiProperty({ type: ExecutiveKpiDto })
  revenue!: ExecutiveKpiDto;

  @ApiProperty({ type: ExecutiveKpiDto })
  grossProfit!: ExecutiveKpiDto;

  @ApiProperty({ type: ExecutiveKpiDto })
  netProfit!: ExecutiveKpiDto;

  @ApiProperty({ type: ExecutiveKpiDto })
  ebitda!: ExecutiveKpiDto;

  @ApiProperty({ type: ExecutiveKpiDto })
  operatingProfit!: ExecutiveKpiDto;

  @ApiProperty({ type: ExecutiveKpiDto })
  cashFlow!: ExecutiveKpiDto;

  @ApiProperty({ type: ExecutiveKpiDto })
  cashBalance!: ExecutiveKpiDto;

  @ApiProperty({ type: ExecutiveKpiDto })
  workingCapital!: ExecutiveKpiDto;

  @ApiProperty({ type: ExecutiveKpiDto })
  accountsReceivable!: ExecutiveKpiDto;

  @ApiProperty({ type: ExecutiveKpiDto })
  accountsPayable!: ExecutiveKpiDto;

  @ApiProperty({ type: ExecutiveKpiDto })
  inventoryValue!: ExecutiveKpiDto;

  @ApiProperty({ type: ExecutiveKpiDto })
  inventoryCoverage!: ExecutiveKpiDto;

  @ApiProperty({ type: ExecutiveKpiDto })
  productionCost!: ExecutiveKpiDto;

  @ApiProperty({ type: ExecutiveKpiDto })
  manufacturingCost!: ExecutiveKpiDto;

  @ApiProperty({ type: ExecutiveKpiDto })
  totalBudget!: ExecutiveKpiDto;

  @ApiProperty({ type: ExecutiveKpiDto })
  actualCost!: ExecutiveKpiDto;

  @ApiProperty({ type: ExecutiveKpiDto })
  remainingBudget!: ExecutiveKpiDto;

  @ApiProperty({ type: ExecutiveKpiDto })
  budgetUtilization!: ExecutiveKpiDto;

  @ApiProperty({ type: ExecutiveKpiDto })
  forecastAccuracy!: ExecutiveKpiDto;

  @ApiProperty({ type: ExecutiveKpiDto })
  totalExpenses!: ExecutiveKpiDto;

  @ApiProperty({ type: ExecutiveKpiDto })
  totalIncome!: ExecutiveKpiDto;

  @ApiProperty({ type: ExecutiveKpiDto })
  totalCustomers!: ExecutiveKpiDto;

  @ApiProperty({ type: ExecutiveKpiDto })
  totalSuppliers!: ExecutiveKpiDto;

  @ApiProperty({ type: ExecutiveKpiDto })
  totalProducts!: ExecutiveKpiDto;

  @ApiProperty({ type: ExecutiveKpiDto })
  totalMaterials!: ExecutiveKpiDto;

  @ApiProperty({ type: ExecutiveKpiDto })
  totalUsers!: ExecutiveKpiDto;

  @ApiProperty({ type: ExecutiveKpiDto })
  pendingApprovals!: ExecutiveKpiDto;

  @ApiProperty({ type: ExecutiveKpiDto })
  notificationCount!: ExecutiveKpiDto;

  @ApiProperty({ type: ExecutiveKpiDto })
  failedImports!: ExecutiveKpiDto;

  @ApiProperty({ type: ExecutiveKpiDto })
  successfulImports!: ExecutiveKpiDto;

  @ApiProperty({ type: ExchangeRatesDto, required: false })
  exchangeRates?: ExchangeRatesDto;
}
