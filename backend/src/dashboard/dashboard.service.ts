import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
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

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {
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
    await this.ensureCompanyBelongsToTenant(companyId, tenantId);
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
    await this.ensureCompanyBelongsToTenant(companyId, tenantId);
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
    await this.ensureCompanyBelongsToTenant(companyId, tenantId);
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
    await this.ensureCompanyBelongsToTenant(companyId, tenantId);
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
    await this.ensureCompanyBelongsToTenant(companyId, tenantId);
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
    await this.ensureCompanyBelongsToTenant(companyId, tenantId);
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
    await this.ensureCompanyBelongsToTenant(companyId, tenantId);
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
    await this.ensureCompanyBelongsToTenant(companyId, tenantId);
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
    await this.ensureCompanyBelongsToTenant(companyId, tenantId);
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
    await this.ensureCompanyBelongsToTenant(companyId, tenantId);
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
    await this.ensureCompanyBelongsToTenant(companyId, tenantId);
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
}
