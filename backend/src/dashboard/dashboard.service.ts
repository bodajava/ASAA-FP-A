import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { TenantService } from '../common/services/tenant.service';
import { CostingService } from '../costing/costing.service';
import { Prisma } from '@prisma/client';
import { SimpleCache } from '../common/utils/cache.util';
import { DashboardQueryDto } from './dto/dashboard-query.dto';
import {
  DashboardKpisDto,
  MonthlyTrendItemDto,
  UtilizationDto,
  AccuracyDto,
  RankedItemDto,
} from './dto/dashboard-response.dto';
import {
  ExecutiveSummaryDto,
  ExecutiveKpiDto,
  ExchangeRatesDto,
} from './dto/executive-summary.dto';

export interface DashboardCostingSummaryDto {
  averageProductCost: number;
  totalRawMaterialCost: number;
  totalPackagingCost: number;
  totalManufacturingCost: number;
  totalWasteCost: number;
  grossMarginPct: number;
  netMarginPct: number;
  topProfitableProducts: {
    id: string;
    name: string;
    sku: string;
    profit: number;
    marginPct: number;
  }[];
  lowestMarginProducts: {
    id: string;
    name: string;
    sku: string;
    marginPct: number;
  }[];
  highestCostDrivers: {
    name: string;
    impactPct: number;
    description: string;
  }[];
  productsWithNegativeMargin: {
    id: string;
    name: string;
    sku: string;
    marginPct: number;
  }[];
}

interface RawKpiRow {
  revenue: number | string | bigint | null;
  expenses: number | string | bigint | null;
  cogs: number | string | bigint | null;
  cash_balance: number | string | bigint | null;
  budget_revenue: number | string | bigint | null;
  budget_expense: number | string | bigint | null;
  forecast_revenue: number | string | bigint | null;
}

interface RawTrendRow {
  period_month: number | bigint;
  actual: number | string | bigint | null;
  budget: number | string | bigint | null;
  forecast: number | string | bigint | null;
}

interface RawGProfitRow {
  period_month: number | bigint;
  actual_revenue: number | string | bigint | null;
  actual_cogs: number | string | bigint | null;
  budget_revenue: number | string | bigint | null;
  budget_cogs: number | string | bigint | null;
  forecast_revenue: number | string | bigint | null;
  forecast_cogs: number | string | bigint | null;
}

interface RawNProfitRow {
  period_month: number | bigint;
  actual_revenue: number | string | bigint | null;
  actual_cogs: number | string | bigint | null;
  actual_expense: number | string | bigint | null;
  budget_revenue: number | string | bigint | null;
  budget_cogs: number | string | bigint | null;
  budget_expense: number | string | bigint | null;
  forecast_revenue: number | string | bigint | null;
  forecast_cogs: number | string | bigint | null;
  forecast_expense: number | string | bigint | null;
}

interface RawRankedItem {
  id: bigint | string;
  name: string;
  value: number | string | bigint | null;
}

interface RawFinancialRow {
  revenue: number | string | bigint | null;
  cogs: number | string | bigint | null;
  expenses: number | string | bigint | null;
  cashflow: number | string | bigint | null;
  budget_revenue: number | string | bigint | null;
  budget_expense: number | string | bigint | null;
  forecast_revenue: number | string | bigint | null;
}

interface RawAccountBalanceRow {
  total: number | string | bigint | null;
}

interface RawImportCountRow {
  status: string;
  count: number | bigint | null;
}

interface RawInventoryRow {
  inventory_value: number | string | bigint | null;
  coverage_days: number | string | bigint | null;
}

interface RawProductionCostRow {
  production_cost: number | string | bigint | null;
  manufacturing_cost: number | string | bigint | null;
}

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantService: TenantService,
    private readonly costingService: CostingService,
  ) {
    const methodsToCache = [
      'getSummary',
      'getRevenueTrend',
      'getExpensesTrend',
      'getGrossProfitTrend',
      'getNetProfitTrend',
      'getCashBalanceTrend',
      'getBudgetUtilization',
      'getForecastAccuracy',
      'getTopProducts',
      'getTopCustomers',
      'getTopBranches',
      'getExecutiveSummary',
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
          const cacheKey = `dashboard:${method}:${companyId}:${tenantId}:${JSON.stringify(queryDto || {})}`;
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

  private toNum(val: number | string | bigint | null | undefined): number {
    if (val === null || val === undefined) return 0;
    return Number(val);
  }

  private toStrId(val: bigint | string | null | undefined): string {
    if (val === null || val === undefined) return '';
    return val.toString();
  }

  private buildWhereClause(
    companyId: bigint,
    queryDto: DashboardQueryDto,
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

    return Prisma.join(conditions, ' AND ');
  }

  async getSummary(
    companyId: bigint,
    tenantId: bigint,
    queryDto: DashboardQueryDto,
  ): Promise<DashboardKpisDto> {
    await this.tenantService.ensureCompanyBelongsToTenant(companyId, tenantId);
    const fiscalYear = queryDto.fiscal_year ?? new Date().getFullYear();
    const whereClause = this.buildWhereClause(companyId, {
      ...queryDto,
      fiscal_year: fiscalYear,
    });

    const rawRows = await this.prisma.$queryRaw<RawKpiRow[]>`
      SELECT 
        SUM(CASE WHEN a.type = 'revenue' THEN v.actual_amount ELSE 0 END) AS revenue,
        SUM(CASE WHEN a.type = 'expense' THEN v.actual_amount ELSE 0 END) AS expenses,
        SUM(CASE WHEN a.type = 'cogs' THEN v.actual_amount ELSE 0 END) AS cogs,
        SUM(CASE WHEN a.type = 'cashflow' THEN v.actual_amount ELSE 0 END) AS cash_balance,
        SUM(CASE WHEN a.type = 'revenue' THEN v.budget_amount ELSE 0 END) AS budget_revenue,
        SUM(CASE WHEN a.type = 'expense' THEN v.budget_amount ELSE 0 END) AS budget_expense,
        SUM(CASE WHEN a.type = 'revenue' THEN v.forecast_amount ELSE 0 END) AS forecast_revenue
      FROM vw_budget_actual_forecast v
      JOIN accounts a ON a.id = v.account_id
      WHERE ${whereClause}
    `;

    const row = rawRows[0];
    const revenue = this.toNum(row?.revenue);
    const expenses = this.toNum(row?.expenses);
    const cogs = this.toNum(row?.cogs);
    const cashBalance = this.toNum(row?.cash_balance);

    const budgetRevenue = this.toNum(row?.budget_revenue);
    const forecastRevenue = this.toNum(row?.forecast_revenue);

    const grossProfit = revenue - cogs;
    const netProfit = grossProfit - expenses;

    const budgetUtilization =
      budgetRevenue === 0
        ? 0
        : Math.round((revenue / budgetRevenue) * 100 * 100) / 100;
    const error = Math.abs(revenue - forecastRevenue);
    const forecastAccuracy =
      revenue === 0
        ? forecastRevenue === 0
          ? 100
          : 0
        : Math.max(0, Math.round((1 - error / revenue) * 100 * 100) / 100);

    return {
      revenue,
      expenses,
      gross_profit: grossProfit,
      net_profit: netProfit,
      cash_balance: cashBalance,
      budget_utilization: budgetUtilization,
      forecast_accuracy: forecastAccuracy,
    };
  }

  async getRevenueTrend(
    companyId: bigint,
    tenantId: bigint,
    queryDto: DashboardQueryDto,
  ): Promise<MonthlyTrendItemDto[]> {
    await this.tenantService.ensureCompanyBelongsToTenant(companyId, tenantId);
    const fiscalYear = queryDto.fiscal_year ?? new Date().getFullYear();
    const whereClause = this.buildWhereClause(companyId, {
      ...queryDto,
      fiscal_year: fiscalYear,
    });

    const rawRows = await this.prisma.$queryRaw<RawTrendRow[]>`
      SELECT 
        v.period_month,
        SUM(v.actual_amount) AS actual,
        SUM(v.budget_amount) AS budget,
        SUM(v.forecast_amount) AS forecast
      FROM vw_budget_actual_forecast v
      JOIN accounts a ON a.id = v.account_id
      WHERE ${whereClause} AND a.type = 'revenue'
      GROUP BY v.period_month
      ORDER BY v.period_month ASC
    `;

    return rawRows.map((row) => ({
      period_month: Number(row.period_month),
      actual: this.toNum(row.actual),
      budget: this.toNum(row.budget),
      forecast: this.toNum(row.forecast),
    }));
  }

  async getExpensesTrend(
    companyId: bigint,
    tenantId: bigint,
    queryDto: DashboardQueryDto,
  ): Promise<MonthlyTrendItemDto[]> {
    await this.tenantService.ensureCompanyBelongsToTenant(companyId, tenantId);
    const fiscalYear = queryDto.fiscal_year ?? new Date().getFullYear();
    const whereClause = this.buildWhereClause(companyId, {
      ...queryDto,
      fiscal_year: fiscalYear,
    });

    const rawRows = await this.prisma.$queryRaw<RawTrendRow[]>`
      SELECT 
        v.period_month,
        SUM(v.actual_amount) AS actual,
        SUM(v.budget_amount) AS budget,
        SUM(v.forecast_amount) AS forecast
      FROM vw_budget_actual_forecast v
      JOIN accounts a ON a.id = v.account_id
      WHERE ${whereClause} AND a.type = 'expense'
      GROUP BY v.period_month
      ORDER BY v.period_month ASC
    `;

    return rawRows.map((row) => ({
      period_month: Number(row.period_month),
      actual: this.toNum(row.actual),
      budget: this.toNum(row.budget),
      forecast: this.toNum(row.forecast),
    }));
  }

  async getGrossProfitTrend(
    companyId: bigint,
    tenantId: bigint,
    queryDto: DashboardQueryDto,
  ): Promise<MonthlyTrendItemDto[]> {
    await this.tenantService.ensureCompanyBelongsToTenant(companyId, tenantId);
    const fiscalYear = queryDto.fiscal_year ?? new Date().getFullYear();
    const whereClause = this.buildWhereClause(companyId, {
      ...queryDto,
      fiscal_year: fiscalYear,
    });

    const rawRows = await this.prisma.$queryRaw<RawGProfitRow[]>`
      SELECT 
        v.period_month,
        SUM(CASE WHEN a.type = 'revenue' THEN v.actual_amount ELSE 0 END) AS actual_revenue,
        SUM(CASE WHEN a.type = 'cogs' THEN v.actual_amount ELSE 0 END) AS actual_cogs,
        SUM(CASE WHEN a.type = 'revenue' THEN v.budget_amount ELSE 0 END) AS budget_revenue,
        SUM(CASE WHEN a.type = 'cogs' THEN v.budget_amount ELSE 0 END) AS budget_cogs,
        SUM(CASE WHEN a.type = 'revenue' THEN v.forecast_amount ELSE 0 END) AS forecast_revenue,
        SUM(CASE WHEN a.type = 'cogs' THEN v.forecast_amount ELSE 0 END) AS forecast_cogs
      FROM vw_budget_actual_forecast v
      JOIN accounts a ON a.id = v.account_id
      WHERE ${whereClause}
      GROUP BY v.period_month
      ORDER BY v.period_month ASC
    `;

    return rawRows.map((row) => {
      const act = this.toNum(row.actual_revenue) - this.toNum(row.actual_cogs);
      const budg = this.toNum(row.budget_revenue) - this.toNum(row.budget_cogs);
      const fore =
        this.toNum(row.forecast_revenue) - this.toNum(row.forecast_cogs);
      return {
        period_month: Number(row.period_month),
        actual: act,
        budget: budg,
        forecast: fore,
      };
    });
  }

  async getNetProfitTrend(
    companyId: bigint,
    tenantId: bigint,
    queryDto: DashboardQueryDto,
  ): Promise<MonthlyTrendItemDto[]> {
    await this.tenantService.ensureCompanyBelongsToTenant(companyId, tenantId);
    const fiscalYear = queryDto.fiscal_year ?? new Date().getFullYear();
    const whereClause = this.buildWhereClause(companyId, {
      ...queryDto,
      fiscal_year: fiscalYear,
    });

    const rawRows = await this.prisma.$queryRaw<RawNProfitRow[]>`
      SELECT 
        v.period_month,
        SUM(CASE WHEN a.type = 'revenue' THEN v.actual_amount ELSE 0 END) AS actual_revenue,
        SUM(CASE WHEN a.type = 'cogs' THEN v.actual_amount ELSE 0 END) AS actual_cogs,
        SUM(CASE WHEN a.type = 'expense' THEN v.actual_amount ELSE 0 END) AS actual_expense,
        SUM(CASE WHEN a.type = 'revenue' THEN v.budget_amount ELSE 0 END) AS budget_revenue,
        SUM(CASE WHEN a.type = 'cogs' THEN v.budget_amount ELSE 0 END) AS budget_cogs,
        SUM(CASE WHEN a.type = 'expense' THEN v.budget_amount ELSE 0 END) AS budget_expense,
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
      const act =
        this.toNum(row.actual_revenue) -
        this.toNum(row.actual_cogs) -
        this.toNum(row.actual_expense);
      const budg =
        this.toNum(row.budget_revenue) -
        this.toNum(row.budget_cogs) -
        this.toNum(row.budget_expense);
      const fore =
        this.toNum(row.forecast_revenue) -
        this.toNum(row.forecast_cogs) -
        this.toNum(row.forecast_expense);
      return {
        period_month: Number(row.period_month),
        actual: act,
        budget: budg,
        forecast: fore,
      };
    });
  }

  async getCashBalanceTrend(
    companyId: bigint,
    tenantId: bigint,
    queryDto: DashboardQueryDto,
  ): Promise<MonthlyTrendItemDto[]> {
    await this.tenantService.ensureCompanyBelongsToTenant(companyId, tenantId);
    const fiscalYear = queryDto.fiscal_year ?? new Date().getFullYear();
    const whereClause = this.buildWhereClause(companyId, {
      ...queryDto,
      fiscal_year: fiscalYear,
    });

    const rawRows = await this.prisma.$queryRaw<RawTrendRow[]>`
      SELECT 
        v.period_month,
        SUM(v.actual_amount) AS actual,
        SUM(v.budget_amount) AS budget,
        SUM(v.forecast_amount) AS forecast
      FROM vw_budget_actual_forecast v
      JOIN accounts a ON a.id = v.account_id
      WHERE ${whereClause} AND a.type = 'cashflow'
      GROUP BY v.period_month
      ORDER BY v.period_month ASC
    `;

    return rawRows.map((row) => ({
      period_month: Number(row.period_month),
      actual: this.toNum(row.actual),
      budget: this.toNum(row.budget),
      forecast: this.toNum(row.forecast),
    }));
  }

  async getBudgetUtilization(
    companyId: bigint,
    tenantId: bigint,
    queryDto: DashboardQueryDto,
  ): Promise<UtilizationDto> {
    await this.tenantService.ensureCompanyBelongsToTenant(companyId, tenantId);
    const fiscalYear = queryDto.fiscal_year ?? new Date().getFullYear();
    const whereClause = this.buildWhereClause(companyId, {
      ...queryDto,
      fiscal_year: fiscalYear,
    });

    const rawRows = await this.prisma.$queryRaw<RawKpiRow[]>`
      SELECT 
        SUM(CASE WHEN a.type = 'revenue' THEN v.actual_amount ELSE 0 END) AS revenue,
        SUM(CASE WHEN a.type = 'expense' THEN v.actual_amount ELSE 0 END) AS expenses,
        SUM(CASE WHEN a.type = 'revenue' THEN v.budget_amount ELSE 0 END) AS budget_revenue,
        SUM(CASE WHEN a.type = 'expense' THEN v.budget_amount ELSE 0 END) AS budget_expense
      FROM vw_budget_actual_forecast v
      JOIN accounts a ON a.id = v.account_id
      WHERE ${whereClause}
    `;

    const row = rawRows[0];
    const actRev = this.toNum(row?.revenue);
    const actExp = this.toNum(row?.expenses);
    const budgRev = this.toNum(row?.budget_revenue);
    const budgExp = this.toNum(row?.budget_expense);

    return {
      revenue_utilization:
        budgRev === 0 ? 0 : Math.round((actRev / budgRev) * 100 * 100) / 100,
      expense_utilization:
        budgExp === 0 ? 0 : Math.round((actExp / budgExp) * 100 * 100) / 100,
    };
  }

  async getForecastAccuracy(
    companyId: bigint,
    tenantId: bigint,
    queryDto: DashboardQueryDto,
  ): Promise<AccuracyDto> {
    await this.tenantService.ensureCompanyBelongsToTenant(companyId, tenantId);
    const fiscalYear = queryDto.fiscal_year ?? new Date().getFullYear();
    const whereClause = this.buildWhereClause(companyId, {
      ...queryDto,
      fiscal_year: fiscalYear,
    });

    const rawRows = await this.prisma.$queryRaw<RawTrendRow[]>`
      SELECT 
        v.period_month,
        SUM(v.actual_amount) AS actual,
        SUM(v.forecast_amount) AS forecast
      FROM vw_budget_actual_forecast v
      JOIN accounts a ON a.id = v.account_id
      WHERE ${whereClause} AND a.type = 'revenue'
      GROUP BY v.period_month
      ORDER BY v.period_month ASC
    `;

    let totalActual = 0;
    let totalForecast = 0;

    const monthlyAccuracy: MonthlyTrendItemDto[] = rawRows.map((row) => {
      const act = this.toNum(row.actual);
      const fore = this.toNum(row.forecast);
      totalActual += act;
      totalForecast += fore;

      const error = Math.abs(act - fore);
      const acc =
        act === 0
          ? fore === 0
            ? 100
            : 0
          : Math.max(0, (1 - error / act) * 100);

      return {
        period_month: Number(row.period_month),
        actual: act,
        budget: 0,
        forecast: Math.round(acc * 100) / 100,
      };
    });

    const overallError = Math.abs(totalActual - totalForecast);
    const overallAccuracy =
      totalActual === 0
        ? totalForecast === 0
          ? 100
          : 0
        : Math.max(
            0,
            Math.round((1 - overallError / totalActual) * 100 * 100) / 100,
          );

    return {
      overall_accuracy: overallAccuracy,
      monthly_accuracy: monthlyAccuracy,
    };
  }

  async getTopProducts(
    companyId: bigint,
    tenantId: bigint,
    queryDto: DashboardQueryDto,
  ): Promise<RankedItemDto[]> {
    await this.tenantService.ensureCompanyBelongsToTenant(companyId, tenantId);
    const fiscalYear = queryDto.fiscal_year ?? new Date().getFullYear();

    const rawRows = await this.prisma.$queryRaw<RawRankedItem[]>`
      SELECT
        product_id AS id,
        product_name AS name,
        SUM(sales) AS value
      FROM vw_product_profitability
      WHERE company_id = ${companyId}
        AND fiscal_year = ${fiscalYear}
      GROUP BY product_id, product_name
      ORDER BY value DESC
      LIMIT 5
    `;

    return rawRows.map((row) => ({
      id: this.toStrId(row.id),
      name: row.name,
      value: this.toNum(row.value),
    }));
  }

  async getTopCustomers(
    companyId: bigint,
    tenantId: bigint,
    queryDto: DashboardQueryDto,
  ): Promise<RankedItemDto[]> {
    await this.tenantService.ensureCompanyBelongsToTenant(companyId, tenantId);
    const fiscalYear = queryDto.fiscal_year ?? new Date().getFullYear();

    const rawRows = await this.prisma.$queryRaw<RawRankedItem[]>`
      SELECT
        customer_id AS id,
        customer_name AS name,
        SUM(revenue) AS value
      FROM vw_customer_profitability
      WHERE company_id = ${companyId}
        AND fiscal_year = ${fiscalYear}
      GROUP BY customer_id, customer_name
      ORDER BY value DESC
      LIMIT 5
    `;

    return rawRows.map((row) => ({
      id: this.toStrId(row.id),
      name: row.name,
      value: this.toNum(row.value),
    }));
  }

  async getTopBranches(
    companyId: bigint,
    tenantId: bigint,
    queryDto: DashboardQueryDto,
  ): Promise<RankedItemDto[]> {
    await this.tenantService.ensureCompanyBelongsToTenant(companyId, tenantId);
    const fiscalYear = queryDto.fiscal_year ?? new Date().getFullYear();

    const rawRows = await this.prisma.$queryRaw<RawRankedItem[]>`
      SELECT
        site_id AS id,
        site_name AS name,
        SUM(net_profit) AS value
      FROM vw_branch_profitability
      WHERE company_id = ${companyId}
        AND fiscal_year = ${fiscalYear}
      GROUP BY site_id, site_name
      ORDER BY value DESC
      LIMIT 5
    `;

    return rawRows.map((row) => ({
      id: this.toStrId(row.id),
      name: row.name,
      value: this.toNum(row.value),
    }));
  }

  async getExecutiveSummary(
    companyId: bigint,
    tenantId: bigint,
    queryDto: DashboardQueryDto,
  ): Promise<ExecutiveSummaryDto> {
    await this.tenantService.ensureCompanyBelongsToTenant(companyId, tenantId);

    const now = new Date();
    const currentYear = queryDto.fiscal_year ?? now.getFullYear();
    const currentMonth = queryDto.period_month ?? now.getMonth() + 1;
    const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const prevMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;
    const prevYear = currentYear - 1;

    // 1-3. Financial data for current month, previous month, and previous year (parallel)
    const [
      currentFinancialRows,
      prevMonthFinancialRows,
      prevYearFinancialRows,
    ] = await Promise.all([
      this.prisma.$queryRaw<RawFinancialRow[]>`
        SELECT
          SUM(CASE WHEN a.type = 'revenue' THEN v.actual_amount ELSE 0 END) AS revenue,
          SUM(CASE WHEN a.type = 'cogs' THEN v.actual_amount ELSE 0 END) AS cogs,
          SUM(CASE WHEN a.type = 'expense' THEN v.actual_amount ELSE 0 END) AS expenses,
          SUM(CASE WHEN a.type = 'cashflow' THEN v.actual_amount ELSE 0 END) AS cashflow,
          SUM(CASE WHEN a.type = 'revenue' THEN v.budget_amount ELSE 0 END) AS budget_revenue,
          SUM(CASE WHEN a.type = 'expense' THEN v.budget_amount ELSE 0 END) AS budget_expense,
          SUM(CASE WHEN a.type = 'revenue' THEN v.forecast_amount ELSE 0 END) AS forecast_revenue
        FROM vw_budget_actual_forecast v
        JOIN accounts a ON a.id = v.account_id
        WHERE v.company_id = ${companyId}
          AND v.fiscal_year = ${currentYear}
          AND v.period_month = ${currentMonth}
      `,
      this.prisma.$queryRaw<RawFinancialRow[]>`
        SELECT
          SUM(CASE WHEN a.type = 'revenue' THEN v.actual_amount ELSE 0 END) AS revenue,
          SUM(CASE WHEN a.type = 'cogs' THEN v.actual_amount ELSE 0 END) AS cogs,
          SUM(CASE WHEN a.type = 'expense' THEN v.actual_amount ELSE 0 END) AS expenses,
          SUM(CASE WHEN a.type = 'cashflow' THEN v.actual_amount ELSE 0 END) AS cashflow,
          SUM(CASE WHEN a.type = 'revenue' THEN v.budget_amount ELSE 0 END) AS budget_revenue,
          SUM(CASE WHEN a.type = 'expense' THEN v.budget_amount ELSE 0 END) AS budget_expense,
          SUM(CASE WHEN a.type = 'revenue' THEN v.forecast_amount ELSE 0 END) AS forecast_revenue
        FROM vw_budget_actual_forecast v
        JOIN accounts a ON a.id = v.account_id
        WHERE v.company_id = ${companyId}
          AND v.fiscal_year = ${prevMonthYear}
          AND v.period_month = ${prevMonth}
      `,
      this.prisma.$queryRaw<RawFinancialRow[]>`
        SELECT
          SUM(CASE WHEN a.type = 'revenue' THEN v.actual_amount ELSE 0 END) AS revenue,
          SUM(CASE WHEN a.type = 'cogs' THEN v.actual_amount ELSE 0 END) AS cogs,
          SUM(CASE WHEN a.type = 'expense' THEN v.actual_amount ELSE 0 END) AS expenses,
          SUM(CASE WHEN a.type = 'cashflow' THEN v.actual_amount ELSE 0 END) AS cashflow,
          SUM(CASE WHEN a.type = 'revenue' THEN v.budget_amount ELSE 0 END) AS budget_revenue,
          SUM(CASE WHEN a.type = 'expense' THEN v.budget_amount ELSE 0 END) AS budget_expense,
          SUM(CASE WHEN a.type = 'revenue' THEN v.forecast_amount ELSE 0 END) AS forecast_revenue
        FROM vw_budget_actual_forecast v
        JOIN accounts a ON a.id = v.account_id
        WHERE v.company_id = ${companyId}
          AND v.fiscal_year = ${prevYear}
          AND v.period_month = ${currentMonth}
      `,
    ]);

    const cur = currentFinancialRows[0];
    const pm = prevMonthFinancialRows[0];
    const py = prevYearFinancialRows[0];

    const curRevenue = this.toNum(cur?.revenue);
    const curCogs = this.toNum(cur?.cogs);
    const curExpenses = this.toNum(cur?.expenses);
    const curCashflow = this.toNum(cur?.cashflow);
    const curBudgetRevenue = this.toNum(cur?.budget_revenue);
    const curBudgetExpense = this.toNum(cur?.budget_expense);
    const curForecastRevenue = this.toNum(cur?.forecast_revenue);

    const pmRevenue = this.toNum(pm?.revenue);
    const pmCogs = this.toNum(pm?.cogs);
    const pmExpenses = this.toNum(pm?.expenses);
    const pmCashflow = this.toNum(pm?.cashflow);

    const pyRevenue = this.toNum(py?.revenue);
    const pyCogs = this.toNum(py?.cogs);
    const pyExpenses = this.toNum(py?.expenses);
    const pyCashflow = this.toNum(py?.cashflow);

    // Derived financials
    const curGrossProfit = curRevenue - curCogs;
    const curNetProfit = curGrossProfit - curExpenses;
    const curOperatingProfit = curNetProfit; // simplified: no other income/expense lines
    const curEbitda = curNetProfit; // simplified: no depreciation/interest/tax accounts identified
    const curTotalBudget = curBudgetRevenue + curBudgetExpense;
    const curActualCost = curRevenue + curCogs + curExpenses; // total activity
    const curRemainingBudget = curTotalBudget - curActualCost;

    const pmGrossProfit = pmRevenue - pmCogs;
    const pmNetProfit = pmGrossProfit - pmExpenses;
    const pmOperatingProfit = pmNetProfit;
    const pmEbitda = pmNetProfit;
    const pmTotalBudget = 0;
    const pmActualCost = pmRevenue + pmCogs + pmExpenses;
    const pmRemainingBudget = pmTotalBudget - pmActualCost;

    const pyGrossProfit = pyRevenue - pyCogs;
    const pyNetProfit = pyGrossProfit - pyExpenses;
    const pyOperatingProfit = pyNetProfit;
    const pyEbitda = pyNetProfit;
    const pyTotalBudget = 0;
    const pyActualCost = pyRevenue + pyCogs + pyExpenses;
    const pyRemainingBudget = pyTotalBudget - pyActualCost;

    // Budget utilization %
    const curBudgetUtil =
      curBudgetRevenue === 0
        ? 0
        : Math.round((curRevenue / curBudgetRevenue) * 100 * 100) / 100;
    const pmBudgetUtil = pmRevenue === 0 ? 0 : 0;
    const pyBudgetUtil = pyRevenue === 0 ? 0 : 0;

    // Forecast accuracy %
    const curForecastErr = Math.abs(curRevenue - curForecastRevenue);
    const curForecastAcc =
      curRevenue === 0
        ? curForecastRevenue === 0
          ? 100
          : 0
        : Math.max(
            0,
            Math.round((1 - curForecastErr / curRevenue) * 100 * 100) / 100,
          );

    // 4-5. AR, AP, assets, liabilities for current period (parallel)
    const [arRows, apRows, assetRows, liabilityRows] = await Promise.all([
      this.prisma.$queryRaw<RawAccountBalanceRow[]>`
        SELECT COALESCE(SUM(v.actual_amount), 0) AS total
        FROM vw_budget_actual_forecast v
        JOIN accounts a ON a.id = v.account_id
        WHERE v.company_id = ${companyId}
          AND v.fiscal_year = ${currentYear}
          AND v.period_month = ${currentMonth}
          AND a.type = 'asset'
          AND (LOWER(a.name) LIKE '%receivable%')
      `,
      this.prisma.$queryRaw<RawAccountBalanceRow[]>`
        SELECT COALESCE(SUM(v.actual_amount), 0) AS total
        FROM vw_budget_actual_forecast v
        JOIN accounts a ON a.id = v.account_id
        WHERE v.company_id = ${companyId}
          AND v.fiscal_year = ${currentYear}
          AND v.period_month = ${currentMonth}
          AND a.type = 'liability'
          AND (LOWER(a.name) LIKE '%payable%')
      `,
      this.prisma.$queryRaw<RawAccountBalanceRow[]>`
        SELECT COALESCE(SUM(v.actual_amount), 0) AS total
        FROM vw_budget_actual_forecast v
        JOIN accounts a ON a.id = v.account_id
        WHERE v.company_id = ${companyId}
          AND v.fiscal_year = ${currentYear}
          AND v.period_month = ${currentMonth}
          AND a.type = 'asset'
      `,
      this.prisma.$queryRaw<RawAccountBalanceRow[]>`
        SELECT COALESCE(SUM(v.actual_amount), 0) AS total
        FROM vw_budget_actual_forecast v
        JOIN accounts a ON a.id = v.account_id
        WHERE v.company_id = ${companyId}
          AND v.fiscal_year = ${currentYear}
          AND v.period_month = ${currentMonth}
          AND a.type = 'liability'
      `,
    ]);

    const curAR = this.toNum(arRows[0]?.total);
    const curAP = this.toNum(apRows[0]?.total);
    const curAssets = this.toNum(assetRows[0]?.total);
    const curLiabilities = this.toNum(liabilityRows[0]?.total);
    const curWorkingCapital = curAssets - curLiabilities;

    // Previous month & previous year AR/AP/working capital (parallel)
    const [
      pmArRows,
      pmApRows,
      pmAssetRows,
      pmLiabilityRows,
      pyArRows,
      pyApRows,
    ] = await Promise.all([
      this.prisma.$queryRaw<RawAccountBalanceRow[]>`
        SELECT COALESCE(SUM(v.actual_amount), 0) AS total
        FROM vw_budget_actual_forecast v
        JOIN accounts a ON a.id = v.account_id
        WHERE v.company_id = ${companyId}
          AND v.fiscal_year = ${prevMonthYear}
          AND v.period_month = ${prevMonth}
          AND a.type = 'asset'
          AND (LOWER(a.name) LIKE '%receivable%')
      `,
      this.prisma.$queryRaw<RawAccountBalanceRow[]>`
        SELECT COALESCE(SUM(v.actual_amount), 0) AS total
        FROM vw_budget_actual_forecast v
        JOIN accounts a ON a.id = v.account_id
        WHERE v.company_id = ${companyId}
          AND v.fiscal_year = ${prevMonthYear}
          AND v.period_month = ${prevMonth}
          AND a.type = 'liability'
          AND (LOWER(a.name) LIKE '%payable%')
      `,
      this.prisma.$queryRaw<RawAccountBalanceRow[]>`
        SELECT COALESCE(SUM(v.actual_amount), 0) AS total
        FROM vw_budget_actual_forecast v
        JOIN accounts a ON a.id = v.account_id
        WHERE v.company_id = ${companyId}
          AND v.fiscal_year = ${prevMonthYear}
          AND v.period_month = ${prevMonth}
          AND a.type = 'asset'
      `,
      this.prisma.$queryRaw<RawAccountBalanceRow[]>`
        SELECT COALESCE(SUM(v.actual_amount), 0) AS total
        FROM vw_budget_actual_forecast v
        JOIN accounts a ON a.id = v.account_id
        WHERE v.company_id = ${companyId}
          AND v.fiscal_year = ${prevMonthYear}
          AND v.period_month = ${prevMonth}
          AND a.type = 'liability'
      `,
      this.prisma.$queryRaw<RawAccountBalanceRow[]>`
        SELECT COALESCE(SUM(v.actual_amount), 0) AS total
        FROM vw_budget_actual_forecast v
        JOIN accounts a ON a.id = v.account_id
        WHERE v.company_id = ${companyId}
          AND v.fiscal_year = ${prevYear}
          AND v.period_month = ${currentMonth}
          AND a.type = 'asset'
          AND (LOWER(a.name) LIKE '%receivable%')
      `,
      this.prisma.$queryRaw<RawAccountBalanceRow[]>`
        SELECT COALESCE(SUM(v.actual_amount), 0) AS total
        FROM vw_budget_actual_forecast v
        JOIN accounts a ON a.id = v.account_id
        WHERE v.company_id = ${companyId}
          AND v.fiscal_year = ${prevYear}
          AND v.period_month = ${currentMonth}
          AND a.type = 'liability'
          AND (LOWER(a.name) LIKE '%payable%')
      `,
    ]);

    const pmAR = this.toNum(pmArRows[0]?.total);
    const pmAP = this.toNum(pmApRows[0]?.total);
    const pyAR = this.toNum(pyArRows[0]?.total);
    const pyAP = this.toNum(pyApRows[0]?.total);

    const pmAssets = this.toNum(pmAssetRows[0]?.total);
    const pmLiabilities = this.toNum(pmLiabilityRows[0]?.total);
    const pmWorkingCapital = pmAssets - pmLiabilities;

    // Previous year working capital (parallel)
    const [pyAssetRows, pyLiabilityRows] = await Promise.all([
      this.prisma.$queryRaw<RawAccountBalanceRow[]>`
        SELECT COALESCE(SUM(v.actual_amount), 0) AS total
        FROM vw_budget_actual_forecast v
        JOIN accounts a ON a.id = v.account_id
        WHERE v.company_id = ${companyId}
          AND v.fiscal_year = ${prevYear}
          AND v.period_month = ${currentMonth}
          AND a.type = 'asset'
      `,
      this.prisma.$queryRaw<RawAccountBalanceRow[]>`
        SELECT COALESCE(SUM(v.actual_amount), 0) AS total
        FROM vw_budget_actual_forecast v
        JOIN accounts a ON a.id = v.account_id
        WHERE v.company_id = ${companyId}
          AND v.fiscal_year = ${prevYear}
          AND v.period_month = ${currentMonth}
          AND a.type = 'liability'
      `,
    ]);
    const pyAssets = this.toNum(pyAssetRows[0]?.total);
    const pyLiabilities = this.toNum(pyLiabilityRows[0]?.total);
    const pyWorkingCapital = pyAssets - pyLiabilities;

    // 6. Inventory from inventory_snapshots (latest snapshot for current month)
    const inventoryRows = await this.prisma.$queryRaw<RawInventoryRow[]>`
      SELECT
        COALESCE(SUM(inv.inventory_value), 0) AS inventory_value,
        0 AS coverage_days
      FROM inventory_snapshots inv
      WHERE inv.company_id = ${companyId}
        AND MONTH(inv.snapshot_date) = ${currentMonth}
        AND YEAR(inv.snapshot_date) = ${currentYear}
    `;

    const pmInventoryRows = await this.prisma.$queryRaw<RawInventoryRow[]>`
      SELECT
        COALESCE(SUM(inv.inventory_value), 0) AS inventory_value,
        0 AS coverage_days
      FROM inventory_snapshots inv
      WHERE inv.company_id = ${companyId}
        AND MONTH(inv.snapshot_date) = ${prevMonth}
        AND YEAR(inv.snapshot_date) = ${prevMonthYear}
    `;

    const pyInventoryRows = await this.prisma.$queryRaw<RawInventoryRow[]>`
      SELECT
        COALESCE(SUM(inv.inventory_value), 0) AS inventory_value,
        0 AS coverage_days
      FROM inventory_snapshots inv
      WHERE inv.company_id = ${companyId}
        AND MONTH(inv.snapshot_date) = ${currentMonth}
        AND YEAR(inv.snapshot_date) = ${prevYear}
    `;

    const curInventoryValue = this.toNum(inventoryRows[0]?.inventory_value);
    const pmInventoryValue = this.toNum(pmInventoryRows[0]?.inventory_value);
    const pyInventoryValue = this.toNum(pyInventoryRows[0]?.inventory_value);
    const curInventoryCoverage = this.toNum(inventoryRows[0]?.coverage_days);
    const pmInventoryCoverage = this.toNum(pmInventoryRows[0]?.coverage_days);
    const pyInventoryCoverage = this.toNum(pyInventoryRows[0]?.coverage_days);

    // 7. Production cost from production_plans
    const prodCostRows = await this.prisma.$queryRaw<RawProductionCostRow[]>`
      SELECT
        COALESCE(SUM(pp.actual_cost), 0) AS production_cost,
        COALESCE(SUM(pp.estimated_cost), 0) AS manufacturing_cost
      FROM production_plans pp
      WHERE pp.company_id = ${companyId}
        AND pp.fiscal_year = ${currentYear}
        AND pp.period_month = ${currentMonth}
    `;

    const pmProdCostRows = await this.prisma.$queryRaw<RawProductionCostRow[]>`
      SELECT
        COALESCE(SUM(pp.actual_cost), 0) AS production_cost,
        COALESCE(SUM(pp.estimated_cost), 0) AS manufacturing_cost
      FROM production_plans pp
      WHERE pp.company_id = ${companyId}
        AND pp.fiscal_year = ${prevMonthYear}
        AND pp.period_month = ${prevMonth}
    `;

    const pyProdCostRows = await this.prisma.$queryRaw<RawProductionCostRow[]>`
      SELECT
        COALESCE(SUM(pp.actual_cost), 0) AS production_cost,
        COALESCE(SUM(pp.estimated_cost), 0) AS manufacturing_cost
      FROM production_plans pp
      WHERE pp.company_id = ${companyId}
        AND pp.fiscal_year = ${prevYear}
        AND pp.period_month = ${currentMonth}
    `;

    const curProductionCost = this.toNum(prodCostRows[0]?.production_cost);
    const pmProductionCost = this.toNum(pmProdCostRows[0]?.production_cost);
    const pyProductionCost = this.toNum(pyProdCostRows[0]?.production_cost);

    const curManufacturingCost = this.toNum(
      prodCostRows[0]?.manufacturing_cost,
    );
    const pmManufacturingCost = this.toNum(
      pmProdCostRows[0]?.manufacturing_cost,
    );
    const pyManufacturingCost = this.toNum(
      pyProdCostRows[0]?.manufacturing_cost,
    );

    // 8. Entity counts via Prisma ORM
    const [
      totalCustomers,
      totalSuppliers,
      totalProducts,
      totalMaterials,
      totalUsers,
      pendingApprovals,
      notificationCount,
    ] = await Promise.all([
      this.prisma.customer.count({ where: { companyId } }),
      this.prisma.supplier.count({ where: { companyId } }),
      this.prisma.product.count({ where: { companyId } }),
      this.prisma.material.count({ where: { companyId } }),
      this.prisma.user.count({ where: { tenantId } }),
      this.prisma.approval.count({
        where: { tenantId, status: 'pending' },
      }),
      this.prisma.notification.count({
        where: { companyId, status: { not: 'read' } },
      }),
    ]);

    // 9. Import counts
    const importRows = await this.prisma.$queryRaw<RawImportCountRow[]>`
      SELECT status, COUNT(*) AS count
      FROM actual_imports
      WHERE company_id = ${companyId}
      GROUP BY status
    `;

    let failedImports = 0;
    let successfulImports = 0;
    for (const row of importRows) {
      const cnt = Number(row.count ?? 0);
      if (row.status === 'failed') failedImports = cnt;
      if (row.status === 'posted') successfulImports = cnt;
    }

    // 10. Latest exchange rates (USD, EUR, SAR, GBP → EGP)
    interface RawExchangeRateRow {
      from_currency: string;
      rate: number | string | bigint;
    }
    const exchangeRateRows = await this.prisma.$queryRaw<RawExchangeRateRow[]>`
      SELECT er.from_currency, er.rate
      FROM exchange_rates er
      INNER JOIN (
        SELECT from_currency, MAX(rate_date) AS max_date
        FROM exchange_rates
        WHERE company_id = ${companyId}
          AND to_currency = 'EGP'
          AND from_currency IN ('USD', 'EUR', 'SAR', 'GBP')
        GROUP BY from_currency
      ) latest
      ON er.from_currency = latest.from_currency
      AND er.rate_date = latest.max_date
      AND er.to_currency = 'EGP'
      AND er.company_id = ${companyId}
    `;

    const rateMap = new Map<string, number>();
    for (const row of exchangeRateRows) {
      rateMap.set(row.from_currency, Number(row.rate));
    }

    const exchangeRates: ExchangeRatesDto = {
      usdToEgp: rateMap.get('USD') ?? 0,
      eurToEgp: rateMap.get('EUR') ?? 0,
      sarToEgp: rateMap.get('SAR') ?? 0,
      gbpToEgp: rateMap.get('GBP') ?? 0,
    };

    // Helper to build ExecutiveKpiDto
    const buildKpi = (
      current: number,
      previousMonth: number,
      previousYear: number,
    ): ExecutiveKpiDto => {
      const denominator = Math.abs(previousYear);
      const growthPct =
        denominator === 0
          ? current === 0
            ? 0
            : 100
          : Math.round(((current - previousYear) / denominator) * 100 * 100) /
            100;
      const trend: 'up' | 'down' | 'neutral' =
        growthPct > 0 ? 'up' : growthPct < 0 ? 'down' : 'neutral';
      return { current, previousMonth, previousYear, growthPct, trend };
    };

    return {
      revenue: buildKpi(curRevenue, pmRevenue, pyRevenue),
      grossProfit: buildKpi(curGrossProfit, pmGrossProfit, pyGrossProfit),
      netProfit: buildKpi(curNetProfit, pmNetProfit, pyNetProfit),
      ebitda: buildKpi(curEbitda, pmEbitda, pyEbitda),
      operatingProfit: buildKpi(
        curOperatingProfit,
        pmOperatingProfit,
        pyOperatingProfit,
      ),
      cashFlow: buildKpi(curCashflow, pmCashflow, pyCashflow),
      cashBalance: buildKpi(curCashflow, pmCashflow, pyCashflow),
      workingCapital: buildKpi(
        curWorkingCapital,
        pmWorkingCapital,
        pyWorkingCapital,
      ),
      accountsReceivable: buildKpi(curAR, pmAR, pyAR),
      accountsPayable: buildKpi(curAP, pmAP, pyAP),
      inventoryValue: buildKpi(
        curInventoryValue,
        pmInventoryValue,
        pyInventoryValue,
      ),
      inventoryCoverage: buildKpi(
        curInventoryCoverage,
        pmInventoryCoverage,
        pyInventoryCoverage,
      ),
      productionCost: buildKpi(
        curProductionCost,
        pmProductionCost,
        pyProductionCost,
      ),
      manufacturingCost: buildKpi(
        curManufacturingCost,
        pmManufacturingCost,
        pyManufacturingCost,
      ),
      totalBudget: buildKpi(curTotalBudget, pmTotalBudget, pyTotalBudget),
      actualCost: buildKpi(curActualCost, pmActualCost, pyActualCost),
      remainingBudget: buildKpi(
        curRemainingBudget,
        pmRemainingBudget,
        pyRemainingBudget,
      ),
      budgetUtilization: buildKpi(curBudgetUtil, pmBudgetUtil, pyBudgetUtil),
      forecastAccuracy: buildKpi(curForecastAcc, 0, 0),
      totalExpenses: buildKpi(curExpenses, pmExpenses, pyExpenses),
      totalIncome: buildKpi(curRevenue, pmRevenue, pyRevenue),
      totalCustomers: buildKpi(totalCustomers, totalCustomers, totalCustomers),
      totalSuppliers: buildKpi(totalSuppliers, totalSuppliers, totalSuppliers),
      totalProducts: buildKpi(totalProducts, totalProducts, totalProducts),
      totalMaterials: buildKpi(totalMaterials, totalMaterials, totalMaterials),
      totalUsers: buildKpi(totalUsers, totalUsers, totalUsers),
      pendingApprovals: buildKpi(
        pendingApprovals,
        pendingApprovals,
        pendingApprovals,
      ),
      notificationCount: buildKpi(
        notificationCount,
        notificationCount,
        notificationCount,
      ),
      failedImports: buildKpi(failedImports, failedImports, failedImports),
      successfulImports: buildKpi(
        successfulImports,
        successfulImports,
        successfulImports,
      ),
      exchangeRates,
    };
  }

  async getCostingSummary(
    companyId: bigint,
    tenantId: bigint,
    queryDto: DashboardQueryDto,
  ): Promise<DashboardCostingSummaryDto> {
    await this.tenantService.ensureCompanyBelongsToTenant(companyId, tenantId);

    const now = new Date();
    const fiscalYear = queryDto.fiscal_year ?? now.getFullYear();
    const periodMonth = queryDto.period_month ?? now.getMonth() + 1;
    const period = `${fiscalYear}-${String(periodMonth).padStart(2, '0')}`;

    const rawSummary = await this.costingService.getCostingDashboardSummary(
      companyId,
      tenantId,
      period,
    );

    const top10Profitable = (rawSummary.top10ProfitableProducts ?? []) as {
      id: string;
      name: string;
      sku: string;
      profit: number;
      marginPct: number;
    }[];
    const top10Loss = (rawSummary.top10LossProducts ?? []) as {
      id: string;
      name: string;
      sku: string;
      profit: number;
      marginPct: number;
    }[];

    const lowestMarginProducts = top10Loss.slice(0, 5).map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      marginPct: p.marginPct,
    }));

    const productsWithNegativeMargin = top10Loss
      .filter((p) => p.marginPct < 0)
      .map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        marginPct: p.marginPct,
      }));

    const materialCost = Number(rawSummary.materialCost ?? 0);
    const packagingCost = Number(rawSummary.packagingCost ?? 0);
    const manufacturingCost = Number(rawSummary.manufacturingCost ?? 0);
    const wasteCost = Number(rawSummary.wasteCost ?? 0);
    const totalCost = materialCost + packagingCost + manufacturingCost;

    const highestCostDrivers: {
      name: string;
      impactPct: number;
      description: string;
    }[] = [];
    if (totalCost > 0) {
      highestCostDrivers.push({
        name: 'Raw Materials',
        impactPct: Math.round((materialCost / totalCost) * 100 * 100) / 100,
        description: `Raw material cost averages ${materialCost.toFixed(2)} per unit`,
      });
      highestCostDrivers.push({
        name: 'Manufacturing',
        impactPct:
          Math.round((manufacturingCost / totalCost) * 100 * 100) / 100,
        description: `Manufacturing cost averages ${manufacturingCost.toFixed(2)} per unit`,
      });
      highestCostDrivers.push({
        name: 'Packaging',
        impactPct: Math.round((packagingCost / totalCost) * 100 * 100) / 100,
        description: `Packaging cost averages ${packagingCost.toFixed(2)} per unit`,
      });
    }

    const weightedMarginPct =
      top10Profitable.length > 0
        ? top10Profitable.reduce((sum, p) => sum + p.marginPct, 0) /
          top10Profitable.length
        : 0;

    return {
      averageProductCost: Number(rawSummary.averageProductCost ?? 0),
      totalRawMaterialCost: materialCost,
      totalPackagingCost: packagingCost,
      totalManufacturingCost: manufacturingCost,
      totalWasteCost: wasteCost,
      grossMarginPct: weightedMarginPct,
      netMarginPct: weightedMarginPct,
      topProfitableProducts: top10Profitable.slice(0, 5),
      lowestMarginProducts,
      highestCostDrivers,
      productsWithNegativeMargin,
    };
  }

  async getModuleSummary(
    companyId: bigint,
    tenantId: bigint,
  ): Promise<Record<string, number>> {
    await this.tenantService.ensureCompanyBelongsToTenant(companyId, tenantId);

    const [
      companyCount,
      siteCount,
      unitCount,
      accountCount,
      costCenterCount,
      categoryCount,
      productCount,
      materialCount,
      supplierCount,
      customerCount,
      bomCount,
      budgetCycleCount,
      forecastCycleCount,
      scenarioCount,
      productionPlanCount,
      headcountPlanCount,
      actualImportCount,
      exchangeRateCount,
      kpiTargetCount,
      promotionCount,
      rawMaterialPriceCount,
      notificationRuleCount,
      userCount,
      pendingApprovalCount,
      unreadNotificationCount,
      unreadAlertCount,
    ] = await Promise.all([
      this.prisma.company.count(),
      this.prisma.site.count({ where: { companyId } }),
      this.prisma.unit.count({ where: { companyId } }),
      this.prisma.account.count({ where: { companyId } }),
      this.prisma.costCenter.count({ where: { companyId } }),
      this.prisma.productCategory.count({ where: { companyId } }),
      this.prisma.product.count({ where: { companyId } }),
      this.prisma.material.count({ where: { companyId } }),
      this.prisma.supplier.count({ where: { companyId } }),
      this.prisma.customer.count({ where: { companyId } }),
      this.prisma.bomRecipe.count({ where: { companyId } }),
      this.prisma.budgetCycle.count({ where: { companyId } }),
      this.prisma.forecastCycle.count({ where: { companyId } }),
      this.prisma.scenario.count({ where: { companyId } }),
      this.prisma.productionPlan.count({ where: { companyId } }),
      this.prisma.headcountPlan.count(),
      this.prisma.actualImport.count({ where: { companyId } }),
      this.prisma.exchangeRate.count({ where: { companyId } }),
      this.prisma.kpiTarget.count({ where: { companyId } }),
      this.prisma.promotion.count({ where: { companyId } }),
      this.prisma.rawMaterialPrice.count({ where: { companyId } }),
      this.prisma.notificationRule.count({ where: { companyId } }),
      this.prisma.user.count({ where: { tenantId } }),
      this.prisma.approval.count({ where: { tenantId, status: 'pending' } }),
      this.prisma.notification.count({
        where: { companyId, status: { not: 'read' } },
      }),
      this.prisma.alert.count({
        where: { companyId, isRead: false, isArchived: false },
      }),
    ]);

    return {
      companies: companyCount,
      sites: siteCount,
      units: unitCount,
      accounts: accountCount,
      costCenters: costCenterCount,
      productCategories: categoryCount,
      products: productCount,
      materials: materialCount,
      suppliers: supplierCount,
      customers: customerCount,
      bomRecipes: bomCount,
      budgetCycles: budgetCycleCount,
      forecastCycles: forecastCycleCount,
      scenarios: scenarioCount,
      productionPlans: productionPlanCount,
      headcountPlans: headcountPlanCount,
      actualImports: actualImportCount,
      exchangeRates: exchangeRateCount,
      kpiTargets: kpiTargetCount,
      promotions: promotionCount,
      rawMaterialPrices: rawMaterialPriceCount,
      notificationRules: notificationRuleCount,
      users: userCount,
      pendingApprovals: pendingApprovalCount,
      unreadNotifications: unreadNotificationCount,
      unreadAlerts: unreadAlertCount,
    };
  }
}
