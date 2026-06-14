import { Injectable, NotFoundException, StreamableFile } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma } from '@prisma/client';
import { SimpleCache } from '../common/utils/cache.util';
import { ReportQueryDto } from './dto/report-query.dto';
import {
  PlReportDto,
  CashFlowReportDto,
  GrossMarginReportDto,
  NetProfitReportDto,
  BudgetVsActualReportDto,
  ForecastAccuracyReportDto,
  ProductProfitabilityReportDto,
  BranchProfitabilityReportDto,
  FactoryCostingReportDto,
  InventoryCoverageReportDto,
  SlowMovingItemsReportDto,
  WastageAnalysisReportDto,
  CustomerProfitabilityReportDto,
  ProductCostVarianceReportDto,
  ProductionCapacityReportDto,
  CashFlowForecastReportDto,
  ExportResultDto,
  PaginatedReportResponseDto,
} from './dto/report-response.dto';

interface CountResult {
  count: bigint | number;
}

interface RawPlRow {
  period_month: number | bigint;
  budget_revenue: number | string | bigint | null;
  budget_cogs: number | string | bigint | null;
  budget_expense: number | string | bigint | null;
  actual_revenue: number | string | bigint | null;
  actual_cogs: number | string | bigint | null;
  actual_expense: number | string | bigint | null;
  forecast_revenue: number | string | bigint | null;
  forecast_cogs: number | string | bigint | null;
  forecast_expense: number | string | bigint | null;
}

interface RawCashFlowRow {
  period_month: number | bigint;
  budget_inflow: number | string | bigint | null;
  budget_outflow: number | string | bigint | null;
  actual_inflow: number | string | bigint | null;
  actual_outflow: number | string | bigint | null;
  forecast_inflow: number | string | bigint | null;
  forecast_outflow: number | string | bigint | null;
}

interface RawBudgetVsActualRow {
  account_id: bigint;
  account_code: string;
  account_name: string;
  budget_amount: number | string | bigint | null;
  actual_amount: number | string | bigint | null;
  variance_amount: number | string | bigint | null;
  variance_pct: number | string | bigint | null;
}

interface RawForecastAccuracyRow {
  period_month: number | bigint;
  actual_amount: number | string | bigint | null;
  forecast_amount: number | string | bigint | null;
}

interface RawProductProfitabilityRow {
  product_id: bigint;
  product_sku: string;
  product_name: string;
  revenue: number | string | bigint | null;
  cogs: number | string | bigint | null;
  gross_margin: number | string | bigint | null;
}

interface RawBranchProfitabilityRow {
  site_id: bigint;
  site_name: string;
  revenue: number | string | bigint | null;
  cogs: number | string | bigint | null;
  expenses: number | string | bigint | null;
  gross_profit: number | string | bigint | null;
  net_profit: number | string | bigint | null;
}

interface RawFactoryCostingRow {
  site_id: bigint;
  site_name: string;
  raw_material_cost: number | string | bigint | null;
  labor_cost: number | string | bigint | null;
  overhead_cost: number | string | bigint | null;
  total_cost: number | string | bigint | null;
}

interface RawInventoryCoverageRow {
  site_id: bigint;
  site_name: string;
  product_id: bigint;
  product_sku: string;
  product_name: string;
  snapshot_date: Date | string;
  qty_on_hand: number | string | bigint | null;
  avg_daily_qty: number | string | bigint | null;
  coverage_days: number | string | bigint | null;
  inventory_value: number | string | bigint | null;
}

interface RawSlowMovingItemRow {
  site_id: bigint;
  site_name: string;
  product_id: bigint;
  product_sku: string;
  product_name: string;
  snapshot_date: Date | string;
  qty_on_hand: number | string | bigint | null;
  inventory_value: number | string | bigint | null;
  moved_qty_90: number | string | bigint | null;
  last_movement_date: Date | string | null;
  is_slow_moving: number | bigint;
}

interface RawWastageAnalysisRow {
  product_id: bigint;
  product_name: string;
  material_id: bigint;
  material_name: string;
  standard_wastage_pct: number | string | bigint | null;
  actual_wastage_pct: number | string | bigint | null;
}

interface RawCustomerProfitabilityRow {
  customer_id: bigint;
  customer_name: string;
  region: string | null;
  revenue: number | string | bigint | null;
  cogs: number | string | bigint | null;
  expenses: number | string | bigint | null;
  gross_profit: number | string | bigint | null;
  net_profit: number | string | bigint | null;
}

interface RawProductCostVarianceRow {
  product_id: bigint;
  product_sku: string;
  product_name: string;
  fiscal_year: number | bigint;
  period_month: number | bigint;
  planned_qty: number | string | bigint | null;
  actual_qty: number | string | bigint | null;
  budget_cost_per_unit: number | string | bigint | null;
  budget_labor_per_unit: number | string | bigint | null;
  budget_overhead_per_unit: number | string | bigint | null;
  budget_total_unit_cost: number | string | bigint | null;
  budget_total_material: number | string | bigint | null;
  budget_total_labor: number | string | bigint | null;
  budget_total_overhead: number | string | bigint | null;
  actual_total_material: number | string | bigint | null;
  actual_total_labor: number | string | bigint | null;
  actual_total_overhead: number | string | bigint | null;
  actual_total_cost: number | string | bigint | null;
  actual_cost_per_unit: number | string | bigint | null;
  material_variance: number | string | bigint | null;
  labor_variance: number | string | bigint | null;
  overhead_variance: number | string | bigint | null;
}

interface RawProductionCapacityRow {
  site_id: bigint;
  site_name: string;
  fiscal_year: number | bigint;
  period_month: number | bigint;
  product_id: bigint;
  product_name: string;
  product_sku: string;
  planned_qty: number | string | bigint | null;
  actual_qty: number | string | bigint | null;
  capacity_utilization_pct: number | string | bigint | null;
  estimated_cost: number | string | bigint | null;
  actual_cost: number | string | bigint | null;
  cost_utilization_pct: number | string | bigint | null;
  qty_variance: number | string | bigint | null;
}

interface RawCashFlowForecastRow {
  period_month: number | bigint;
  actual_inflow: number | string | bigint | null;
  actual_outflow: number | string | bigint | null;
  actual_net: number | string | bigint | null;
  budget_inflow: number | string | bigint | null;
  budget_outflow: number | string | bigint | null;
  budget_net: number | string | bigint | null;
  ar_collections: number | string | bigint | null;
  ap_payments: number | string | bigint | null;
  working_capital_net: number | string | bigint | null;
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {
    const methodsToCache = [
      'getPl',
      'getCashFlow',
      'getGrossMargin',
      'getNetProfit',
      'getBudgetVsActual',
      'getForecastAccuracy',
      'getProductProfitability',
      'getBranchProfitability',
      'getFactoryCosting',
      'getInventoryCoverage',
      'getSlowMovingItems',
      'getWastageAnalysis',
      'getCustomerProfitability',
      'getProductCostVariance',
      'getProductionCapacity',
      'getCashFlowForecast',
    ];

    for (const method of methodsToCache) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const original = (this as any)[method];
      if (typeof original === 'function') {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        (this as any)[method] = async function (
          companyId: bigint,
          tenantId: bigint,
          queryDto: unknown,
          ...args: unknown[]
        ) {
          const cacheKey = `reports:${method}:${companyId}:${tenantId}:${JSON.stringify(queryDto || {})}`;
          const cached = SimpleCache.get(cacheKey);
          if (cached !== null) {
            return cached;
          }

          const result = await (
            original as (...a: unknown[]) => Promise<unknown>
          ).apply(this, [companyId, tenantId, queryDto, ...args]);
          SimpleCache.set(cacheKey, result, 600000); // 10m TTL
          return result;
        };
      }
    }
  }

  private async ensureCompanyBelongsToTenant(
    companyId: bigint,
    tenantId: bigint,
  ): Promise<void> {
    const company = await this.prisma.company.findFirst({
      where: { id: companyId, tenantId },
    });
    if (!company) {
      throw new NotFoundException(`Company not found under this tenant`);
    }
  }

  private toNum(val: number | string | bigint | null | undefined): number {
    if (val === null || val === undefined) return 0;
    return Number(val);
  }

  private toNullableNum(
    val: number | string | bigint | null | undefined,
  ): number | null {
    if (val === null || val === undefined) return null;
    return Number(val);
  }

  private toStrId(val: bigint | string | null | undefined): string {
    if (val === null || val === undefined) return '';
    return val.toString();
  }

  private toNullableStrId(
    val: bigint | string | null | undefined,
  ): string | null {
    if (val === null || val === undefined) return null;
    return val.toString();
  }

  private buildWhereClause(
    companyId: bigint,
    queryDto: ReportQueryDto,
  ): Prisma.Sql {
    const conditions: Prisma.Sql[] = [Prisma.sql`v.company_id = ${companyId}`];

    if (queryDto.fiscal_year) {
      conditions.push(Prisma.sql`v.fiscal_year = ${queryDto.fiscal_year}`);
    }
    if (queryDto.period_month) {
      conditions.push(Prisma.sql`v.period_month = ${queryDto.period_month}`);
    }
    if (queryDto.site_id) {
      conditions.push(Prisma.sql`v.site_id = ${BigInt(queryDto.site_id)}`);
    }
    if (queryDto.product_id) {
      conditions.push(
        Prisma.sql`v.product_id = ${BigInt(queryDto.product_id)}`,
      );
    }
    if (queryDto.customer_id) {
      conditions.push(
        Prisma.sql`v.customer_id = ${BigInt(queryDto.customer_id)}`,
      );
    }

    return Prisma.join(conditions, ' AND ');
  }

  async getPl(
    companyId: bigint,
    tenantId: bigint,
    queryDto: ReportQueryDto,
  ): Promise<PlReportDto[]> {
    await this.ensureCompanyBelongsToTenant(companyId, tenantId);
    const fiscalYear = queryDto.fiscal_year ?? new Date().getFullYear();
    const whereClause = this.buildWhereClause(companyId, {
      ...queryDto,
      fiscal_year: fiscalYear,
    });

    const rawRows = await this.prisma.$queryRaw<RawPlRow[]>`
      SELECT 
        v.period_month,
        SUM(CASE WHEN a.type = 'revenue' THEN v.budget_amount ELSE 0 END) AS budget_revenue,
        SUM(CASE WHEN a.type = 'cogs' THEN v.budget_amount ELSE 0 END) AS budget_cogs,
        SUM(CASE WHEN a.type = 'expense' THEN v.budget_amount ELSE 0 END) AS budget_expense,
        SUM(CASE WHEN a.type = 'revenue' THEN v.actual_amount ELSE 0 END) AS actual_revenue,
        SUM(CASE WHEN a.type = 'cogs' THEN v.actual_amount ELSE 0 END) AS actual_cogs,
        SUM(CASE WHEN a.type = 'expense' THEN v.actual_amount ELSE 0 END) AS actual_expense,
        SUM(CASE WHEN a.type = 'revenue' THEN v.forecast_amount ELSE 0 END) AS forecast_revenue,
        SUM(CASE WHEN a.type = 'cogs' THEN v.forecast_amount ELSE 0 END) AS forecast_cogs,
        SUM(CASE WHEN a.type = 'expense' THEN v.forecast_amount ELSE 0 END) AS forecast_expense
      FROM vw_budget_actual_forecast v
      JOIN accounts a ON a.id = v.account_id
      WHERE ${whereClause}
      GROUP BY v.period_month
      ORDER BY v.period_month ASC
    `;

    return rawRows.map((row) => {
      const budgetRev = this.toNum(row.budget_revenue);
      const budgetCogs = this.toNum(row.budget_cogs);
      const budgetGP = budgetRev - budgetCogs;
      const budgetExp = this.toNum(row.budget_expense);

      const actualRev = this.toNum(row.actual_revenue);
      const actualCogs = this.toNum(row.actual_cogs);
      const actualGP = actualRev - actualCogs;
      const actualExp = this.toNum(row.actual_expense);

      const forecastRev = this.toNum(row.forecast_revenue);
      const forecastCogs = this.toNum(row.forecast_cogs);
      const forecastGP = forecastRev - forecastCogs;
      const forecastExp = this.toNum(row.forecast_expense);

      return {
        period_month: Number(row.period_month),
        budget_revenue: budgetRev,
        budget_cogs: budgetCogs,
        budget_gross_profit: budgetGP,
        budget_expense: budgetExp,
        budget_net_profit: budgetGP - budgetExp,
        actual_revenue: actualRev,
        actual_cogs: actualCogs,
        actual_gross_profit: actualGP,
        actual_expense: actualExp,
        actual_net_profit: actualGP - actualExp,
        forecast_revenue: forecastRev,
        forecast_cogs: forecastCogs,
        forecast_gross_profit: forecastGP,
        forecast_expense: forecastExp,
        forecast_net_profit: forecastGP - forecastExp,
      };
    });
  }

  async getCashFlow(
    companyId: bigint,
    tenantId: bigint,
    queryDto: ReportQueryDto,
  ): Promise<CashFlowReportDto[]> {
    await this.ensureCompanyBelongsToTenant(companyId, tenantId);
    const fiscalYear = queryDto.fiscal_year ?? new Date().getFullYear();
    const whereClause = this.buildWhereClause(companyId, {
      ...queryDto,
      fiscal_year: fiscalYear,
    });

    const rawRows = await this.prisma.$queryRaw<RawCashFlowRow[]>`
      SELECT 
        v.period_month,
        SUM(CASE WHEN a.type = 'cashflow' AND v.budget_amount > 0 THEN v.budget_amount ELSE 0 END) AS budget_inflow,
        SUM(CASE WHEN a.type = 'cashflow' AND v.budget_amount < 0 THEN ABS(v.budget_amount) ELSE 0 END) AS budget_outflow,
        SUM(CASE WHEN a.type = 'cashflow' AND v.actual_amount > 0 THEN v.actual_amount ELSE 0 END) AS actual_inflow,
        SUM(CASE WHEN a.type = 'cashflow' AND v.actual_amount < 0 THEN ABS(v.actual_amount) ELSE 0 END) AS actual_outflow,
        SUM(CASE WHEN a.type = 'cashflow' AND v.forecast_amount > 0 THEN v.forecast_amount ELSE 0 END) AS forecast_inflow,
        SUM(CASE WHEN a.type = 'cashflow' AND v.forecast_amount < 0 THEN ABS(v.forecast_amount) ELSE 0 END) AS forecast_outflow
      FROM vw_budget_actual_forecast v
      JOIN accounts a ON a.id = v.account_id
      WHERE ${whereClause}
      GROUP BY v.period_month
      ORDER BY v.period_month ASC
    `;

    return rawRows.map((row) => {
      const bIn = this.toNum(row.budget_inflow);
      const bOut = this.toNum(row.budget_outflow);
      const aIn = this.toNum(row.actual_inflow);
      const aOut = this.toNum(row.actual_outflow);
      const fIn = this.toNum(row.forecast_inflow);
      const fOut = this.toNum(row.forecast_outflow);

      return {
        period_month: Number(row.period_month),
        budget_inflow: bIn,
        budget_outflow: bOut,
        budget_net: bIn - bOut,
        actual_inflow: aIn,
        actual_outflow: aOut,
        actual_net: aIn - aOut,
        forecast_inflow: fIn,
        forecast_outflow: fOut,
        forecast_net: fIn - fOut,
      };
    });
  }

  async getGrossMargin(
    companyId: bigint,
    tenantId: bigint,
    queryDto: ReportQueryDto,
  ): Promise<GrossMarginReportDto[]> {
    await this.ensureCompanyBelongsToTenant(companyId, tenantId);
    const fiscalYear = queryDto.fiscal_year ?? new Date().getFullYear();
    const whereClause = this.buildWhereClause(companyId, {
      ...queryDto,
      fiscal_year: fiscalYear,
    });

    const rawRows = await this.prisma.$queryRaw<RawPlRow[]>`
      SELECT 
        v.period_month,
        SUM(CASE WHEN a.type = 'revenue' THEN v.budget_amount ELSE 0 END) AS budget_revenue,
        SUM(CASE WHEN a.type = 'cogs' THEN v.budget_amount ELSE 0 END) AS budget_cogs,
        SUM(CASE WHEN a.type = 'revenue' THEN v.actual_amount ELSE 0 END) AS actual_revenue,
        SUM(CASE WHEN a.type = 'cogs' THEN v.actual_amount ELSE 0 END) AS actual_cogs,
        SUM(CASE WHEN a.type = 'revenue' THEN v.forecast_amount ELSE 0 END) AS forecast_revenue,
        SUM(CASE WHEN a.type = 'cogs' THEN v.forecast_amount ELSE 0 END) AS forecast_cogs
      FROM vw_budget_actual_forecast v
      JOIN accounts a ON a.id = v.account_id
      WHERE ${whereClause}
      GROUP BY v.period_month
      ORDER BY v.period_month ASC
    `;

    return rawRows.map((row) => {
      const bRev = this.toNum(row.budget_revenue);
      const bCogs = this.toNum(row.budget_cogs);
      const bMargin = bRev - bCogs;
      const bMarginPct =
        bRev === 0 ? 0 : Math.round((bMargin / bRev) * 100 * 100) / 100;

      const aRev = this.toNum(row.actual_revenue);
      const aCogs = this.toNum(row.actual_cogs);
      const aMargin = aRev - aCogs;
      const aMarginPct =
        aRev === 0 ? 0 : Math.round((aMargin / aRev) * 100 * 100) / 100;

      const fRev = this.toNum(row.forecast_revenue);
      const fCogs = this.toNum(row.forecast_cogs);
      const fMargin = fRev - fCogs;
      const fMarginPct =
        fRev === 0 ? 0 : Math.round((fMargin / fRev) * 100 * 100) / 100;

      return {
        period_month: Number(row.period_month),
        budget_revenue: bRev,
        budget_cogs: bCogs,
        budget_margin: bMargin,
        budget_margin_pct: bMarginPct,
        actual_revenue: aRev,
        actual_cogs: aCogs,
        actual_margin: aMargin,
        actual_margin_pct: aMarginPct,
        forecast_revenue: fRev,
        forecast_cogs: fCogs,
        forecast_margin: fMargin,
        forecast_margin_pct: fMarginPct,
      };
    });
  }

  async getNetProfit(
    companyId: bigint,
    tenantId: bigint,
    queryDto: ReportQueryDto,
  ): Promise<NetProfitReportDto[]> {
    await this.ensureCompanyBelongsToTenant(companyId, tenantId);
    const fiscalYear = queryDto.fiscal_year ?? new Date().getFullYear();
    const whereClause = this.buildWhereClause(companyId, {
      ...queryDto,
      fiscal_year: fiscalYear,
    });

    const rawRows = await this.prisma.$queryRaw<RawPlRow[]>`
      SELECT 
        v.period_month,
        SUM(CASE WHEN a.type = 'revenue' THEN v.budget_amount ELSE 0 END) AS budget_revenue,
        SUM(CASE WHEN a.type = 'cogs' THEN v.budget_amount ELSE 0 END) AS budget_cogs,
        SUM(CASE WHEN a.type = 'expense' THEN v.budget_amount ELSE 0 END) AS budget_expense,
        SUM(CASE WHEN a.type = 'revenue' THEN v.actual_amount ELSE 0 END) AS actual_revenue,
        SUM(CASE WHEN a.type = 'cogs' THEN v.actual_amount ELSE 0 END) AS actual_cogs,
        SUM(CASE WHEN a.type = 'expense' THEN v.actual_amount ELSE 0 END) AS actual_expense,
        SUM(CASE WHEN a.type = 'revenue' THEN v.forecast_amount ELSE 0 END) AS forecast_revenue,
        SUM(CASE WHEN a.type = 'cogs' THEN v.forecast_amount ELSE 0 END) AS forecast_cogs,
        SUM(CASE WHEN a.type = 'expense' THEN v.forecast_amount ELSE 0 END) AS forecast_expense
      FROM vw_budget_actual_forecast v
      JOIN accounts a ON a.id = v.account_id
      WHERE ${whereClause}
      GROUP BY v.period_month
      ORDER BY v.period_month ASC
    `;

    return rawRows.map((row) => {
      const bRev = this.toNum(row.budget_revenue);
      const bNP =
        bRev - this.toNum(row.budget_cogs) - this.toNum(row.budget_expense);
      const bNPPct =
        bRev === 0 ? 0 : Math.round((bNP / bRev) * 100 * 100) / 100;

      const aRev = this.toNum(row.actual_revenue);
      const aNP =
        aRev - this.toNum(row.actual_cogs) - this.toNum(row.actual_expense);
      const aNPPct =
        aRev === 0 ? 0 : Math.round((aNP / aRev) * 100 * 100) / 100;

      const fRev = this.toNum(row.forecast_revenue);
      const fNP =
        fRev - this.toNum(row.forecast_cogs) - this.toNum(row.forecast_expense);
      const fNPPct =
        fRev === 0 ? 0 : Math.round((fNP / fRev) * 100 * 100) / 100;

      return {
        period_month: Number(row.period_month),
        budget_revenue: bRev,
        budget_net_profit: bNP,
        budget_net_profit_pct: bNPPct,
        actual_revenue: aRev,
        actual_net_profit: aNP,
        actual_net_profit_pct: aNPPct,
        forecast_revenue: fRev,
        forecast_net_profit: fNP,
        forecast_net_profit_pct: fNPPct,
      };
    });
  }

  async getBudgetVsActual(
    companyId: bigint,
    tenantId: bigint,
    queryDto: ReportQueryDto,
  ): Promise<PaginatedReportResponseDto<BudgetVsActualReportDto>> {
    await this.ensureCompanyBelongsToTenant(companyId, tenantId);
    const fiscalYear = queryDto.fiscal_year ?? new Date().getFullYear();

    // Explicitly scope by company and fiscal year
    const whereClause = this.buildWhereClause(companyId, {
      ...queryDto,
      fiscal_year: fiscalYear,
    });

    const page = queryDto.page ?? 1;
    const limit = queryDto.limit ?? 10;
    const offset = (page - 1) * limit;

    const countRes = await this.prisma.$queryRaw<CountResult[]>`
      SELECT COUNT(DISTINCT v.account_id) as count 
      FROM vw_budget_vs_actual v
      WHERE ${whereClause}
    `;
    const total = Number(countRes[0]?.count ?? 0);

    const rawRows = await this.prisma.$queryRaw<RawBudgetVsActualRow[]>`
      SELECT 
        v.account_id,
        a.code AS account_code,
        a.name AS account_name,
        SUM(v.budget_amount) AS budget_amount,
        SUM(v.actual_amount) AS actual_amount,
        SUM(v.variance_amount) AS variance_amount,
        AVG(v.variance_pct) AS variance_pct
      FROM vw_budget_vs_actual v
      JOIN accounts a ON a.id = v.account_id
      WHERE ${whereClause}
      GROUP BY v.account_id, a.code, a.name
      ORDER BY a.code ASC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const mappedData = rawRows.map((row) => ({
      account_id: this.toStrId(row.account_id),
      account_code: row.account_code,
      account_name: row.account_name,
      budget_amount: this.toNum(row.budget_amount),
      actual_amount: this.toNum(row.actual_amount),
      variance_amount: this.toNum(row.variance_amount),
      variance_pct: this.toNullableNum(row.variance_pct),
    }));

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: mappedData,
    };
  }

  async getForecastAccuracy(
    companyId: bigint,
    tenantId: bigint,
    queryDto: ReportQueryDto,
  ): Promise<ForecastAccuracyReportDto[]> {
    await this.ensureCompanyBelongsToTenant(companyId, tenantId);
    const fiscalYear = queryDto.fiscal_year ?? new Date().getFullYear();
    const whereClause = this.buildWhereClause(companyId, {
      ...queryDto,
      fiscal_year: fiscalYear,
    });

    const rawRows = await this.prisma.$queryRaw<RawForecastAccuracyRow[]>`
      SELECT 
        v.period_month,
        SUM(v.actual_amount) AS actual_amount,
        SUM(v.forecast_amount) AS forecast_amount
      FROM vw_budget_actual_forecast v
      WHERE ${whereClause}
      GROUP BY v.period_month
      ORDER BY v.period_month ASC
    `;

    return rawRows.map((row) => {
      const act = this.toNum(row.actual_amount);
      const fore = this.toNum(row.forecast_amount);
      const absErr = Math.abs(act - fore);
      let accPct = 0;
      if (act === 0) {
        accPct = fore === 0 ? 100 : 0;
      } else {
        accPct = Math.max(0, (1 - absErr / act) * 100);
      }

      return {
        period_month: Number(row.period_month),
        actual_amount: act,
        forecast_amount: fore,
        absolute_error: absErr,
        accuracy_pct: Math.round(accPct * 100) / 100,
      };
    });
  }

  async getProductProfitability(
    companyId: bigint,
    tenantId: bigint,
    queryDto: ReportQueryDto,
  ): Promise<PaginatedReportResponseDto<ProductProfitabilityReportDto>> {
    await this.ensureCompanyBelongsToTenant(companyId, tenantId);
    const fiscalYear = queryDto.fiscal_year ?? new Date().getFullYear();
    const whereClause = this.buildWhereClause(companyId, {
      ...queryDto,
      fiscal_year: fiscalYear,
    });

    const page = queryDto.page ?? 1;
    const limit = queryDto.limit ?? 10;
    const offset = (page - 1) * limit;

    const countRes = await this.prisma.$queryRaw<CountResult[]>`
      SELECT COUNT(DISTINCT v.product_id) as count 
      FROM vw_product_profitability v
      WHERE ${whereClause}
    `;
    const total = Number(countRes[0]?.count ?? 0);

    const rawRows = await this.prisma.$queryRaw<RawProductProfitabilityRow[]>`
      SELECT 
        v.product_id,
        v.product_sku,
        v.product_name,
        SUM(v.sales) AS revenue,
        SUM(v.cogs) AS cogs,
        SUM(v.gross_margin) AS gross_margin
      FROM vw_product_profitability v
      WHERE ${whereClause}
      GROUP BY v.product_id, v.product_sku, v.product_name
      ORDER BY revenue DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const mappedData = rawRows.map((row) => {
      const rev = this.toNum(row.revenue);
      const cogs = this.toNum(row.cogs);
      const gm = rev - cogs;
      const gmPct = rev === 0 ? 0 : Math.round((gm / rev) * 100 * 100) / 100;

      return {
        product_id: this.toStrId(row.product_id),
        product_sku: row.product_sku,
        product_name: row.product_name,
        revenue: rev,
        cogs,
        gross_margin: gm,
        gross_margin_pct: gmPct,
      };
    });

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: mappedData,
    };
  }

  async getBranchProfitability(
    companyId: bigint,
    tenantId: bigint,
    queryDto: ReportQueryDto,
  ): Promise<PaginatedReportResponseDto<BranchProfitabilityReportDto>> {
    await this.ensureCompanyBelongsToTenant(companyId, tenantId);
    const fiscalYear = queryDto.fiscal_year ?? new Date().getFullYear();
    const whereClause = this.buildWhereClause(companyId, {
      ...queryDto,
      fiscal_year: fiscalYear,
    });

    const page = queryDto.page ?? 1;
    const limit = queryDto.limit ?? 10;
    const offset = (page - 1) * limit;

    const countRes = await this.prisma.$queryRaw<CountResult[]>`
      SELECT COUNT(DISTINCT v.site_id) as count 
      FROM vw_branch_profitability v
      WHERE ${whereClause}
    `;
    const total = Number(countRes[0]?.count ?? 0);

    const rawRows = await this.prisma.$queryRaw<RawBranchProfitabilityRow[]>`
      SELECT 
        v.site_id,
        v.site_name,
        SUM(v.revenue) AS revenue,
        SUM(v.cogs) AS cogs,
        SUM(v.expenses) AS expenses,
        SUM(v.gross_profit) AS gross_profit,
        SUM(v.net_profit) AS net_profit
      FROM vw_branch_profitability v
      WHERE ${whereClause}
      GROUP BY v.site_id, v.site_name
      ORDER BY revenue DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const mappedData = rawRows.map((row) => ({
      site_id: this.toStrId(row.site_id),
      site_name: row.site_name,
      revenue: this.toNum(row.revenue),
      cogs: this.toNum(row.cogs),
      expenses: this.toNum(row.expenses),
      gross_profit: this.toNum(row.gross_profit),
      net_profit: this.toNum(row.net_profit),
    }));

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: mappedData,
    };
  }

  async getFactoryCosting(
    companyId: bigint,
    tenantId: bigint,
    queryDto: ReportQueryDto,
  ): Promise<FactoryCostingReportDto[]> {
    await this.ensureCompanyBelongsToTenant(companyId, tenantId);

    // Filter by factory sites
    const conditions: Prisma.Sql[] = [
      Prisma.sql`ai.company_id = ${companyId}`,
      Prisma.sql`s.type = 'factory'`,
    ];

    if (queryDto.fiscal_year) {
      conditions.push(
        Prisma.sql`YEAR(al.transaction_date) = ${queryDto.fiscal_year}`,
      );
    }
    if (queryDto.period_month) {
      conditions.push(
        Prisma.sql`MONTH(al.transaction_date) = ${queryDto.period_month}`,
      );
    }
    if (queryDto.site_id) {
      conditions.push(Prisma.sql`al.site_id = ${BigInt(queryDto.site_id)}`);
    }

    const whereClause = Prisma.join(conditions, ' AND ');

    const rawRows = await this.prisma.$queryRaw<RawFactoryCostingRow[]>`
      SELECT
        s.id AS site_id,
        s.name AS site_name,
        SUM(CASE WHEN al.material_id IS NOT NULL OR a.type = 'cogs' THEN al.amount ELSE 0 END) AS raw_material_cost,
        SUM(CASE WHEN a.name LIKE '%labor%' OR a.name LIKE '%salary%' OR a.name LIKE '%payroll%' THEN al.amount ELSE 0 END) AS labor_cost,
        SUM(CASE WHEN a.type = 'expense' AND a.name NOT LIKE '%labor%' AND a.name NOT LIKE '%salary%' AND a.name NOT LIKE '%payroll%' THEN al.amount ELSE 0 END) AS overhead_cost,
        SUM(al.amount) AS total_cost
      FROM actual_lines al
      JOIN actual_imports ai ON ai.id = al.actual_import_id
      JOIN sites s ON s.id = al.site_id
      JOIN accounts a ON a.id = al.account_id
      WHERE ${whereClause}
      GROUP BY s.id, s.name
      ORDER BY total_cost DESC
    `;

    return rawRows.map((row) => ({
      site_id: this.toStrId(row.site_id),
      site_name: row.site_name,
      raw_material_cost: this.toNum(row.raw_material_cost),
      labor_cost: this.toNum(row.labor_cost),
      overhead_cost: this.toNum(row.overhead_cost),
      total_cost: this.toNum(row.total_cost),
    }));
  }

  async getInventoryCoverage(
    companyId: bigint,
    tenantId: bigint,
    queryDto: ReportQueryDto,
  ): Promise<PaginatedReportResponseDto<InventoryCoverageReportDto>> {
    await this.ensureCompanyBelongsToTenant(companyId, tenantId);

    const conditions: Prisma.Sql[] = [Prisma.sql`v.company_id = ${companyId}`];
    if (queryDto.site_id) {
      conditions.push(Prisma.sql`v.site_id = ${BigInt(queryDto.site_id)}`);
    }
    if (queryDto.product_id) {
      conditions.push(
        Prisma.sql`v.product_id = ${BigInt(queryDto.product_id)}`,
      );
    }

    const whereClause = Prisma.join(conditions, ' AND ');

    const page = queryDto.page ?? 1;
    const limit = queryDto.limit ?? 10;
    const offset = (page - 1) * limit;

    const countRes = await this.prisma.$queryRaw<CountResult[]>`
      SELECT COUNT(*) as count FROM vw_inventory_coverage v WHERE ${whereClause}
    `;
    const total = Number(countRes[0]?.count ?? 0);

    const rawRows = await this.prisma.$queryRaw<RawInventoryCoverageRow[]>`
      SELECT * FROM vw_inventory_coverage v
      WHERE ${whereClause}
      ORDER BY coverage_days ASC, inventory_value DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const mappedData = rawRows.map((row) => ({
      site_id: this.toStrId(row.site_id),
      site_name: row.site_name,
      product_id: this.toStrId(row.product_id),
      product_sku: row.product_sku,
      product_name: row.product_name,
      snapshot_date:
        typeof row.snapshot_date === 'string'
          ? row.snapshot_date
          : row.snapshot_date.toISOString().split('T')[0],
      qty_on_hand: this.toNum(row.qty_on_hand),
      avg_daily_qty: this.toNum(row.avg_daily_qty),
      coverage_days: this.toNullableNum(row.coverage_days),
      inventory_value: this.toNum(row.inventory_value),
    }));

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: mappedData,
    };
  }

  async getSlowMovingItems(
    companyId: bigint,
    tenantId: bigint,
    queryDto: ReportQueryDto,
  ): Promise<PaginatedReportResponseDto<SlowMovingItemsReportDto>> {
    await this.ensureCompanyBelongsToTenant(companyId, tenantId);

    const conditions: Prisma.Sql[] = [Prisma.sql`v.company_id = ${companyId}`];
    if (queryDto.site_id) {
      conditions.push(Prisma.sql`v.site_id = ${BigInt(queryDto.site_id)}`);
    }
    if (queryDto.product_id) {
      conditions.push(
        Prisma.sql`v.product_id = ${BigInt(queryDto.product_id)}`,
      );
    }

    const whereClause = Prisma.join(conditions, ' AND ');

    const page = queryDto.page ?? 1;
    const limit = queryDto.limit ?? 10;
    const offset = (page - 1) * limit;

    const countRes = await this.prisma.$queryRaw<CountResult[]>`
      SELECT COUNT(*) as count FROM vw_slow_moving_items v WHERE ${whereClause}
    `;
    const total = Number(countRes[0]?.count ?? 0);

    const rawRows = await this.prisma.$queryRaw<RawSlowMovingItemRow[]>`
      SELECT * FROM vw_slow_moving_items v
      WHERE ${whereClause}
      ORDER BY is_slow_moving DESC, inventory_value DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const mappedData = rawRows.map((row) => ({
      site_id: this.toStrId(row.site_id),
      site_name: row.site_name,
      product_id: this.toStrId(row.product_id),
      product_sku: row.product_sku,
      product_name: row.product_name,
      snapshot_date:
        typeof row.snapshot_date === 'string'
          ? row.snapshot_date
          : row.snapshot_date.toISOString().split('T')[0],
      qty_on_hand: this.toNum(row.qty_on_hand),
      inventory_value: this.toNum(row.inventory_value),
      moved_qty_90: this.toNum(row.moved_qty_90),
      last_movement_date: row.last_movement_date
        ? typeof row.last_movement_date === 'string'
          ? row.last_movement_date
          : row.last_movement_date.toISOString().split('T')[0]
        : null,
      is_slow_moving: Number(row.is_slow_moving),
    }));

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: mappedData,
    };
  }

  async getWastageAnalysis(
    companyId: bigint,
    tenantId: bigint,
    queryDto: ReportQueryDto,
  ): Promise<WastageAnalysisReportDto[]> {
    await this.ensureCompanyBelongsToTenant(companyId, tenantId);

    const conditions: Prisma.Sql[] = [Prisma.sql`br.company_id = ${companyId}`];
    if (queryDto.product_id) {
      conditions.push(
        Prisma.sql`br.product_id = ${BigInt(queryDto.product_id)}`,
      );
    }

    const whereClause = Prisma.join(conditions, ' AND ');

    // Calculates standard vs actual wastage based on BOM definitions vs actual material consumption
    const rawRows = await this.prisma.$queryRaw<RawWastageAnalysisRow[]>`
      WITH prod_qty AS (
        SELECT 
          al.product_id,
          SUM(al.quantity) AS produced_qty
        FROM actual_lines al
        JOIN actual_imports ai ON ai.id = al.actual_import_id
        WHERE ai.company_id = ${companyId}
          AND al.product_id IS NOT NULL
        GROUP BY al.product_id
      ),
      std_needed AS (
        SELECT 
          pq.product_id,
          bl.material_id,
          SUM(pq.produced_qty * bl.qty_per_output) AS std_qty_needed,
          AVG(bl.wastage_pct) AS std_wastage_pct
        FROM prod_qty pq
        JOIN bom_recipes br ON br.product_id = pq.product_id AND br.is_active = 1
        JOIN bom_lines bl ON bl.bom_id = br.id
        WHERE ${whereClause}
        GROUP BY pq.product_id, bl.material_id
      ),
      act_consumed AS (
        SELECT 
          al.material_id,
          SUM(al.quantity) AS act_qty_consumed
        FROM actual_lines al
        JOIN actual_imports ai ON ai.id = al.actual_import_id
        WHERE ai.company_id = ${companyId}
          AND al.material_id IS NOT NULL
        GROUP BY al.material_id
      )
      SELECT
        p.id AS product_id,
        p.name AS product_name,
        m.id AS material_id,
        m.name AS material_name,
        COALESCE(sn.std_wastage_pct, 0) AS standard_wastage_pct,
        CASE 
          WHEN COALESCE(sn.std_qty_needed, 0) = 0 THEN 0
          ELSE ROUND(GREATEST(0, (COALESCE(ac.act_qty_consumed, 0) / sn.std_qty_needed - 1) * 100), 2)
        END AS actual_wastage_pct
      FROM std_needed sn
      JOIN products p ON p.id = sn.product_id
      JOIN materials m ON m.id = sn.material_id
      LEFT JOIN act_consumed ac ON ac.material_id = sn.material_id
      ORDER BY p.name ASC, m.name ASC
    `;

    return rawRows.map((row) => {
      const std = this.toNum(row.standard_wastage_pct);
      const act = this.toNum(row.actual_wastage_pct);
      return {
        product_id: this.toStrId(row.product_id),
        product_name: row.product_name,
        material_id: this.toStrId(row.material_id),
        material_name: row.material_name,
        standard_wastage_pct: std,
        actual_wastage_pct: act,
        variance_pct: Math.round((act - std) * 100) / 100,
      };
    });
  }

  async getCustomerProfitability(
    companyId: bigint,
    tenantId: bigint,
    queryDto: ReportQueryDto,
  ): Promise<PaginatedReportResponseDto<CustomerProfitabilityReportDto>> {
    await this.ensureCompanyBelongsToTenant(companyId, tenantId);
    const fiscalYear = queryDto.fiscal_year ?? new Date().getFullYear();
    const whereClause = this.buildWhereClause(companyId, {
      ...queryDto,
      fiscal_year: fiscalYear,
    });

    const page = queryDto.page ?? 1;
    const limit = queryDto.limit ?? 10;
    const offset = (page - 1) * limit;

    const countRes = await this.prisma.$queryRaw<CountResult[]>`
      SELECT COUNT(DISTINCT v.customer_id) as count 
      FROM vw_customer_profitability v
      WHERE ${whereClause}
    `;
    const total = Number(countRes[0]?.count ?? 0);

    const rawRows = await this.prisma.$queryRaw<RawCustomerProfitabilityRow[]>`
      SELECT 
        v.customer_id,
        v.customer_name,
        v.region,
        SUM(v.revenue) AS revenue,
        SUM(v.cogs) AS cogs,
        SUM(v.expenses) AS expenses,
        SUM(v.gross_profit) AS gross_profit,
        SUM(v.net_profit) AS net_profit
      FROM vw_customer_profitability v
      WHERE ${whereClause}
      GROUP BY v.customer_id, v.customer_name, v.region
      ORDER BY revenue DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const mappedData = rawRows.map((row) => ({
      customer_id: this.toStrId(row.customer_id),
      customer_name: row.customer_name,
      region: row.region,
      revenue: this.toNum(row.revenue),
      cogs: this.toNum(row.cogs),
      expenses: this.toNum(row.expenses),
      gross_profit: this.toNum(row.gross_profit),
      net_profit: this.toNum(row.net_profit),
    }));

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: mappedData,
    };
  }

  // ============================================================
  // Product Cost Variance - مقارنة تكلفة المنتج المخططة بالفعلي
  // ============================================================
  async getProductCostVariance(
    companyId: bigint,
    tenantId: bigint,
    queryDto: ReportQueryDto,
  ): Promise<PaginatedReportResponseDto<ProductCostVarianceReportDto>> {
    await this.ensureCompanyBelongsToTenant(companyId, tenantId);

    const conditions: Prisma.Sql[] = [Prisma.sql`v.company_id = ${companyId}`];
    if (queryDto.fiscal_year) {
      conditions.push(Prisma.sql`v.fiscal_year = ${queryDto.fiscal_year}`);
    }
    if (queryDto.period_month) {
      conditions.push(Prisma.sql`v.period_month = ${queryDto.period_month}`);
    }
    if (queryDto.product_id) {
      conditions.push(
        Prisma.sql`v.product_id = ${BigInt(queryDto.product_id)}`,
      );
    }

    const whereClause = Prisma.join(conditions, ' AND ');
    const page = queryDto.page ?? 1;
    const limit = queryDto.limit ?? 10;
    const offset = (page - 1) * limit;

    const countRes = await this.prisma.$queryRaw<CountResult[]>`
      SELECT COUNT(*) as count FROM vw_product_cost_variance v WHERE ${whereClause}
    `;
    const total = Number(countRes[0]?.count ?? 0);

    const rawRows = await this.prisma.$queryRaw<RawProductCostVarianceRow[]>`
      SELECT * FROM vw_product_cost_variance v
      WHERE ${whereClause}
      ORDER BY v.fiscal_year DESC, v.period_month ASC, v.product_name ASC
      LIMIT ${limit} OFFSET ${offset}
    `;

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: rawRows.map((r) => ({
        product_id: this.toStrId(r.product_id),
        product_sku: r.product_sku,
        product_name: r.product_name,
        fiscal_year: Number(r.fiscal_year),
        period_month: Number(r.period_month),
        planned_qty: this.toNum(r.planned_qty),
        actual_qty: this.toNum(r.actual_qty),
        budget_cost_per_unit: this.toNum(r.budget_cost_per_unit),
        budget_labor_per_unit: this.toNum(r.budget_labor_per_unit),
        budget_overhead_per_unit: this.toNum(r.budget_overhead_per_unit),
        budget_total_unit_cost: this.toNum(r.budget_total_unit_cost),
        budget_total_material: this.toNum(r.budget_total_material),
        budget_total_labor: this.toNum(r.budget_total_labor),
        budget_total_overhead: this.toNum(r.budget_total_overhead),
        actual_total_material: this.toNum(r.actual_total_material),
        actual_total_labor: this.toNum(r.actual_total_labor),
        actual_total_overhead: this.toNum(r.actual_total_overhead),
        actual_total_cost: this.toNum(r.actual_total_cost),
        actual_cost_per_unit: this.toNum(r.actual_cost_per_unit),
        material_variance: this.toNum(r.material_variance),
        labor_variance: this.toNum(r.labor_variance),
        overhead_variance: this.toNum(r.overhead_variance),
      })),
    };
  }

  // ============================================================
  // Production Capacity Analysis - تحليل الطاقة الإنتاجية
  // ============================================================
  async getProductionCapacity(
    companyId: bigint,
    tenantId: bigint,
    queryDto: ReportQueryDto,
  ): Promise<PaginatedReportResponseDto<ProductionCapacityReportDto>> {
    await this.ensureCompanyBelongsToTenant(companyId, tenantId);

    const conditions: Prisma.Sql[] = [Prisma.sql`v.company_id = ${companyId}`];
    if (queryDto.fiscal_year) {
      conditions.push(Prisma.sql`v.fiscal_year = ${queryDto.fiscal_year}`);
    }
    if (queryDto.period_month) {
      conditions.push(Prisma.sql`v.period_month = ${queryDto.period_month}`);
    }
    if (queryDto.site_id) {
      conditions.push(Prisma.sql`v.site_id = ${BigInt(queryDto.site_id)}`);
    }
    if (queryDto.product_id) {
      conditions.push(
        Prisma.sql`v.product_id = ${BigInt(queryDto.product_id)}`,
      );
    }

    const whereClause = Prisma.join(conditions, ' AND ');
    const page = queryDto.page ?? 1;
    const limit = queryDto.limit ?? 10;
    const offset = (page - 1) * limit;

    const countRes = await this.prisma.$queryRaw<CountResult[]>`
      SELECT COUNT(*) as count FROM vw_production_capacity v WHERE ${whereClause}
    `;
    const total = Number(countRes[0]?.count ?? 0);

    const rawRows = await this.prisma.$queryRaw<RawProductionCapacityRow[]>`
      SELECT * FROM vw_production_capacity v
      WHERE ${whereClause}
      ORDER BY v.capacity_utilization_pct ASC, v.fiscal_year DESC, v.period_month ASC
      LIMIT ${limit} OFFSET ${offset}
    `;

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: rawRows.map((r) => ({
        site_id: this.toStrId(r.site_id),
        site_name: r.site_name,
        fiscal_year: Number(r.fiscal_year),
        period_month: Number(r.period_month),
        product_id: this.toStrId(r.product_id),
        product_name: r.product_name,
        product_sku: r.product_sku,
        planned_qty: this.toNum(r.planned_qty),
        actual_qty: this.toNum(r.actual_qty),
        capacity_utilization_pct: this.toNullableNum(
          r.capacity_utilization_pct,
        ),
        estimated_cost: this.toNum(r.estimated_cost),
        actual_cost: this.toNum(r.actual_cost),
        cost_utilization_pct: this.toNullableNum(r.cost_utilization_pct),
        qty_variance: this.toNum(r.qty_variance),
      })),
    };
  }

  // ============================================================
  // Cash Flow Forecast - توقع التدفقات النقدية
  // ============================================================
  async getCashFlowForecast(
    companyId: bigint,
    tenantId: bigint,
    queryDto: ReportQueryDto,
  ): Promise<CashFlowForecastReportDto[]> {
    await this.ensureCompanyBelongsToTenant(companyId, tenantId);

    const conditions: Prisma.Sql[] = [Prisma.sql`v.company_id = ${companyId}`];
    if (queryDto.fiscal_year) {
      conditions.push(Prisma.sql`v.fiscal_year = ${queryDto.fiscal_year}`);
    }
    if (queryDto.period_month) {
      conditions.push(Prisma.sql`v.period_month = ${queryDto.period_month}`);
    }

    const whereClause = Prisma.join(conditions, ' AND ');

    const rawRows = await this.prisma.$queryRaw<RawCashFlowForecastRow[]>`
      SELECT * FROM vw_cash_flow_forecast v
      WHERE ${whereClause}
      ORDER BY v.fiscal_year ASC, v.period_month ASC
    `;

    return rawRows.map((r) => ({
      period_month: Number(r.period_month),
      actual_inflow: this.toNum(r.actual_inflow),
      actual_outflow: this.toNum(r.actual_outflow),
      actual_net: this.toNum(r.actual_net),
      budget_inflow: this.toNum(r.budget_inflow),
      budget_outflow: this.toNum(r.budget_outflow),
      budget_net: this.toNum(r.budget_net),
      ar_collections: this.toNum(r.ar_collections),
      ap_payments: this.toNum(r.ap_payments),
      working_capital_net: this.toNum(r.working_capital_net),
    }));
  }

  getReportMetas() {
    return [
      { value: 'pl', label: 'Profit & Loss (P&L)', description: 'Summary of revenues, costs, and expenses over months', category: 'financial', paginated: false },
      { value: 'cashflow', label: 'Cash Flow Statement', description: 'Analysis of cash inflows and outflows by month', category: 'financial', paginated: false },
      { value: 'gross-margin', label: 'Gross Margin Analysis', description: 'Revenues, cost of goods sold, and gross margins', category: 'financial', paginated: false },
      { value: 'net-profit', label: 'Net Profit Margin', description: 'Bottom-line net profit performance and margins', category: 'financial', paginated: false },
      { value: 'budget-vs-actual', label: 'Budget vs Actuals', description: 'Itemized variances comparing budgets against actual data', category: 'performance', paginated: true },
      { value: 'forecast-accuracy', label: 'Forecast Accuracy', description: 'Assessment of forecast variances and absolute errors', category: 'performance', paginated: false },
      { value: 'product-profitability', label: 'Product Profitability', description: 'Margins, COGS, and sales performance by SKU', category: 'performance', paginated: true },
      { value: 'branch-profitability', label: 'Branch / Site Profitability', description: 'Revenue and expense performance broken down by site', category: 'performance', paginated: true },
      { value: 'customer-profitability', label: 'Customer Profitability', description: 'Top client margins and net profitability contribution', category: 'performance', paginated: true },
      { value: 'factory-costing', label: 'Factory Cost Analysis', description: 'Direct materials, direct labor, and manufacturing overhead costs', category: 'operations', paginated: false },
      { value: 'inventory-coverage', label: 'Inventory Coverage', description: 'Daily burn rate, stock quantities, and inventory value', category: 'operations', paginated: true },
      { value: 'slow-moving-items', label: 'Slow Moving Stock', description: 'Items with slow movement speeds over the last 90 days', category: 'operations', paginated: true },
      { value: 'wastage-analysis', label: 'Standard vs Actual Wastage', description: 'Raw material yield variances and product wastage', category: 'operations', paginated: false },
      { value: 'product-cost-variance', label: 'Product Cost Variance', description: 'Planned vs actual cost comparison by product (material, labor, overhead)', category: 'operations', paginated: true },
      { value: 'production-capacity', label: 'Production Capacity', description: 'Capacity utilization analysis by factory and product line', category: 'operations', paginated: true },
      { value: 'cash-flow-forecast', label: 'Cash Flow Forecast', description: 'AR/AP-based cash flow forecasting with working capital analysis', category: 'financial', paginated: false },
    ];
  }

  // ============================================================
  // Export Report to CSV
  // ============================================================
  async exportReport(
    companyId: bigint,
    tenantId: bigint,
    reportType: string,
    queryDto: ReportQueryDto,
  ): Promise<ExportResultDto> {
    // Fetch the raw data for the given report type
    let rows: Record<string, unknown>[] = [];

    switch (reportType) {
      case 'pl': {
        const data = await this.getPl(companyId, tenantId, queryDto);
        rows = data as unknown as Record<string, unknown>[];
        break;
      }
      case 'cashflow': {
        const data = await this.getCashFlow(companyId, tenantId, queryDto);
        rows = data as unknown as Record<string, unknown>[];
        break;
      }
      case 'gross-margin': {
        const data = await this.getGrossMargin(companyId, tenantId, queryDto);
        rows = data as unknown as Record<string, unknown>[];
        break;
      }
      case 'net-profit': {
        const data = await this.getNetProfit(companyId, tenantId, queryDto);
        rows = data as unknown as Record<string, unknown>[];
        break;
      }
      case 'budget-vs-actual': {
        const data = await this.getBudgetVsActual(
          companyId,
          tenantId,
          queryDto,
        );
        rows = data.data as unknown as Record<string, unknown>[];
        break;
      }
      case 'forecast-accuracy': {
        const data = await this.getForecastAccuracy(
          companyId,
          tenantId,
          queryDto,
        );
        rows = data as unknown as Record<string, unknown>[];
        break;
      }
      case 'product-profitability': {
        const data = await this.getProductProfitability(
          companyId,
          tenantId,
          queryDto,
        );
        rows = data.data as unknown as Record<string, unknown>[];
        break;
      }
      case 'branch-profitability': {
        const data = await this.getBranchProfitability(
          companyId,
          tenantId,
          queryDto,
        );
        rows = data.data as unknown as Record<string, unknown>[];
        break;
      }
      case 'factory-costing': {
        const data = await this.getFactoryCosting(
          companyId,
          tenantId,
          queryDto,
        );
        rows = data as unknown as Record<string, unknown>[];
        break;
      }
      case 'inventory-coverage': {
        const data = await this.getInventoryCoverage(
          companyId,
          tenantId,
          queryDto,
        );
        rows = data.data as unknown as Record<string, unknown>[];
        break;
      }
      case 'slow-moving-items': {
        const data = await this.getSlowMovingItems(
          companyId,
          tenantId,
          queryDto,
        );
        rows = data.data as unknown as Record<string, unknown>[];
        break;
      }
      case 'wastage-analysis': {
        const data = await this.getWastageAnalysis(
          companyId,
          tenantId,
          queryDto,
        );
        rows = data as unknown as Record<string, unknown>[];
        break;
      }
      case 'customer-profitability': {
        const data = await this.getCustomerProfitability(
          companyId,
          tenantId,
          queryDto,
        );
        rows = data.data as unknown as Record<string, unknown>[];
        break;
      }
      case 'product-cost-variance': {
        const data = await this.getProductCostVariance(
          companyId,
          tenantId,
          queryDto,
        );
        rows = data.data as unknown as Record<string, unknown>[];
        break;
      }
      case 'production-capacity': {
        const data = await this.getProductionCapacity(
          companyId,
          tenantId,
          queryDto,
        );
        rows = data.data as unknown as Record<string, unknown>[];
        break;
      }
      default:
        throw new NotFoundException(`Unknown report type: ${reportType}`);
    }

    if (rows.length === 0) {
      return {
        content: Buffer.from('No data').toString('base64'),
        mimeType: 'text/csv',
        filename: `report-${reportType}.csv`,
      };
    }

    // Build CSV
    const headers = Object.keys(rows[0]);
    const csvLines: string[] = [
      headers.map((h) => `"${h}"`).join(','),
      ...rows.map((row) =>
        headers
          .map((h) => {
            const val = row[h];
            if (val === null || val === undefined) return '';
            return `"${String(val).replace(/"/g, '""')}"`;
          })
          .join(','),
      ),
    ];

    const csvContent = csvLines.join('\n');
    return {
      content: Buffer.from(csvContent).toString('base64'),
      mimeType: 'text/csv',
      filename: `report-${reportType}.csv`,
    };
  }
}
