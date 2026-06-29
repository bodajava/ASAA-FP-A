import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsArray,
} from 'class-validator';

export class CostBreakdownDto {
  @ApiProperty()
  rawMaterialCost!: number;

  @ApiProperty()
  packagingCost!: number;

  @ApiProperty()
  manufacturingCost!: number;

  @ApiProperty()
  laborCost!: number;

  @ApiProperty()
  utilitiesCost!: number;

  @ApiProperty()
  overheadCost!: number;

  @ApiProperty()
  warehouseCost!: number;

  @ApiProperty()
  freightCost!: number;

  @ApiProperty()
  sellingCost!: number;

  @ApiProperty()
  totalCost!: number;

  @ApiProperty()
  sellingPrice!: number;

  @ApiProperty()
  grossProfit!: number;

  @ApiProperty()
  grossMarginPct!: number;

  @ApiProperty()
  netProfit!: number;

  @ApiProperty()
  netMarginPct!: number;
}

export class ProductCostingDetailDto {
  @ApiProperty()
  productId!: string;

  @ApiProperty()
  sku!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  bomVersion?: string;

  @ApiProperty({ type: () => CostBreakdownDto })
  standard!: CostBreakdownDto;

  @ApiProperty({ type: () => CostBreakdownDto })
  actual!: CostBreakdownDto;
}

export class ProductCostSnapshotDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  productId!: string;

  @ApiPropertyOptional()
  bomId?: string;

  @ApiProperty()
  period!: string;

  @ApiProperty()
  snapshotDate!: string;

  @ApiProperty({ type: () => CostBreakdownDto })
  standard!: CostBreakdownDto;

  @ApiProperty({ type: () => CostBreakdownDto })
  actual!: CostBreakdownDto;
}

export class ProductProfitabilityItemDto {
  @ApiProperty()
  productId!: string;

  @ApiProperty()
  sku!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  revenue!: number;

  @ApiProperty()
  quantitySold!: number;

  @ApiProperty()
  standardCost!: number;

  @ApiProperty()
  actualCost!: number;

  @ApiProperty()
  grossProfit!: number;

  @ApiProperty()
  grossMarginPct!: number;

  @ApiProperty()
  netProfit!: number;

  @ApiProperty()
  netMarginPct!: number;
}

export class CostDriverItemDto {
  @ApiProperty()
  name!: string;

  @ApiProperty()
  driverType!: string;

  @ApiProperty()
  impactPct!: number;

  @ApiPropertyOptional()
  affectedEntityId?: string;

  @ApiProperty()
  description!: string;
}

export class StandardVsActualItemDto {
  @ApiProperty()
  productId!: string;

  @ApiProperty()
  sku!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  standardCost!: number;

  @ApiProperty()
  actualCost!: number;

  @ApiProperty()
  variance!: number;

  @ApiProperty()
  variancePct!: number;

  @ApiProperty()
  reason!: string;
}

export class RecalculateResponseDto {
  @ApiProperty()
  success!: boolean;

  @ApiProperty()
  message!: string;

  @ApiProperty({ type: () => CostBreakdownDto })
  standardCostBreakdown!: CostBreakdownDto;

  @ApiProperty({ type: () => CostBreakdownDto })
  actualCostBreakdown!: CostBreakdownDto;
}

export class CreateAllocationDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  siteId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  productId?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  period!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  costCategory!: string;

  @ApiProperty()
  @IsNumber()
  allocatedAmount!: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  allocationMethod!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;
}

export class CostBreakdownReportItemDto extends CostBreakdownDto {
  @ApiProperty()
  productId!: string;

  @ApiProperty()
  sku!: string;

  @ApiProperty()
  name!: string;
}

export class ManufacturingCostReportItemDto {
  @ApiProperty()
  productId!: string;

  @ApiProperty()
  sku!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  laborCost!: number;

  @ApiProperty()
  utilitiesCost!: number;

  @ApiProperty()
  overheadCost!: number;

  @ApiProperty()
  totalMfgCost!: number;

  @ApiProperty()
  productionQty!: number;
}

export class PackagingCostReportItemDto {
  @ApiProperty()
  productId!: string;

  @ApiProperty()
  sku!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  canBodyCost!: number;

  @ApiProperty()
  lidCost!: number;

  @ApiProperty()
  labelCost!: number;

  @ApiProperty()
  cartonCost!: number;

  @ApiProperty()
  totalPackagingCost!: number;
}

export class MaterialConsumptionReportItemDto {
  @ApiProperty()
  materialId!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  unit!: string;

  @ApiProperty()
  consumedQty!: number;

  @ApiProperty()
  averagePrice!: number;

  @ApiProperty()
  totalSpend!: number;
}

export class YieldAnalysisReportItemDto {
  @ApiProperty()
  productId!: string;

  @ApiProperty()
  sku!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  inputQty!: number;

  @ApiProperty()
  outputQty!: number;

  @ApiProperty()
  wasteQty!: number;

  @ApiProperty()
  yieldPct!: number;

  @ApiProperty()
  wastePct!: number;
}

/** Typed assumptions for scenario cost simulation */
export interface CostingAssumptions {
  subtype?: string;
  percentage?: number;
  materialIds?: string[];
  isPackagingOnly?: boolean;
  rateMultiplier?: number;
  newRate?: number;
  fromCurrency?: string;
  toCurrency?: string;
}

/** Return shape of createAllocation */
export interface CostAllocationResult {
  id: string;
  companyId: string;
  siteId: string | null;
  productId: string | null;
  period: string;
  costCategory: string;
  allocatedAmount: number;
  allocationMethod: string;
  description: string | null;
}

/** Dashboard summary result shape */
export interface CostingDashboardSummary {
  averageProductCost: number;
  highestCostProduct: { id: string; name: string; sku: string; cost: number };
  lowestCostProduct: { id: string; name: string; sku: string; cost: number };
  highestMarginProduct: {
    id: string;
    name: string;
    sku: string;
    marginPct: number;
  };
  lowestMarginProduct: {
    id: string;
    name: string;
    sku: string;
    marginPct: number;
  };
  manufacturingCost: number;
  packagingCost: number;
  materialCost: number;
  wasteCost: number;
  costTrend: {
    period: string;
    averageStandardCost: number;
    averageActualCost: number;
  }[];
  top10ProfitableProducts: {
    id: string;
    name: string;
    sku: string;
    profit: number;
    marginPct: number;
  }[];
  top10LossProducts: {
    id: string;
    name: string;
    sku: string;
    profit: number;
    marginPct: number;
  }[];
}
