import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma } from '@prisma/client';
import { VarianceQueryDto } from './dto/variance-query.dto';
import {
  VarianceRecordDto,
  PaginatedVarianceResponseDto,
} from './dto/variance-response.dto';
import {
  YoYComparisonQueryDto,
  YoYComparisonResponseDto,
  YoYMetricRecordDto,
} from './dto/yoy-comparison.dto';

interface RawBudgetVsActual {
  company_id: bigint;
  fiscal_year: number;
  period_month: number;
  account_id: bigint;
  site_id: bigint | null;
  product_id: bigint | null;
  customer_id: bigint | null;
  budget_amount: bigint | number | string | null;
  actual_amount: bigint | number | string | null;
  variance_amount: bigint | number | string | null;
  variance_pct: bigint | number | string | null;
}

interface RawBudgetActualForecast {
  company_id: bigint;
  fiscal_year: number;
  period_month: number;
  account_id: bigint;
  site_id: bigint | null;
  product_id: bigint | null;
  customer_id: bigint | null;
  budget_amount: bigint | number | string | null;
  actual_amount: bigint | number | string | null;
  forecast_amount: bigint | number | string | null;
  actual_vs_budget: bigint | number | string | null;
  forecast_vs_budget: bigint | number | string | null;
  actual_variance_pct: bigint | number | string | null;
  forecast_variance_pct: bigint | number | string | null;
}

interface CountResult {
  count: bigint | number;
}

@Injectable()
export class VarianceService {
  constructor(private readonly prisma: PrismaService) {}

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

  private toStrId(val: bigint | string | null | undefined): string | null {
    if (val === null || val === undefined) return null;
    return val.toString();
  }

  private buildWhereClause(
    companyId: bigint,
    queryDto: VarianceQueryDto,
  ): Prisma.Sql {
    const conditions: Prisma.Sql[] = [Prisma.sql`company_id = ${companyId}`];

    if (queryDto.fiscal_year) {
      conditions.push(Prisma.sql`fiscal_year = ${queryDto.fiscal_year}`);
    }
    if (queryDto.period_month) {
      conditions.push(Prisma.sql`period_month = ${queryDto.period_month}`);
    }
    if (queryDto.account_id) {
      conditions.push(Prisma.sql`account_id = ${BigInt(queryDto.account_id)}`);
    }
    if (queryDto.site_id) {
      conditions.push(Prisma.sql`site_id = ${BigInt(queryDto.site_id)}`);
    }
    if (queryDto.product_id) {
      conditions.push(Prisma.sql`product_id = ${BigInt(queryDto.product_id)}`);
    }
    if (queryDto.customer_id) {
      conditions.push(
        Prisma.sql`customer_id = ${BigInt(queryDto.customer_id)}`,
      );
    }

    return Prisma.join(conditions, ' AND ');
  }

  async compareBudgetVsActual(
    companyId: bigint,
    tenantId: bigint,
    queryDto: VarianceQueryDto,
  ): Promise<PaginatedVarianceResponseDto> {
    await this.ensureCompanyBelongsToTenant(companyId, tenantId);

    const page = queryDto.page ?? 1;
    const limit = queryDto.limit ?? 50;
    const offset = (page - 1) * limit;

    const whereClause = this.buildWhereClause(companyId, queryDto);

    const countResult = await this.prisma.$queryRaw<CountResult[]>`
      SELECT COUNT(*) as count FROM vw_budget_vs_actual WHERE ${whereClause}
    `;
    const total = Number(countResult[0]?.count ?? 0);

    const rawRows = await this.prisma.$queryRaw<RawBudgetVsActual[]>`
      SELECT * FROM vw_budget_vs_actual
      WHERE ${whereClause}
      LIMIT ${limit} OFFSET ${offset}
    `;

    const mappedData: VarianceRecordDto[] = rawRows.map((row) => ({
      company_id: row.company_id.toString(),
      fiscal_year: Number(row.fiscal_year),
      period_month: Number(row.period_month),
      account_id: row.account_id.toString(),
      site_id: this.toStrId(row.site_id),
      product_id: this.toStrId(row.product_id),
      customer_id: this.toStrId(row.customer_id),
      budget_amount: this.toNum(row.budget_amount),
      actual_amount: this.toNum(row.actual_amount),
      forecast_amount: 0,
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

  async compareBudgetVsForecast(
    companyId: bigint,
    tenantId: bigint,
    queryDto: VarianceQueryDto,
  ): Promise<PaginatedVarianceResponseDto> {
    await this.ensureCompanyBelongsToTenant(companyId, tenantId);

    const page = queryDto.page ?? 1;
    const limit = queryDto.limit ?? 50;
    const offset = (page - 1) * limit;

    const whereClause = this.buildWhereClause(companyId, queryDto);

    const countResult = await this.prisma.$queryRaw<CountResult[]>`
      SELECT COUNT(*) as count FROM vw_budget_actual_forecast WHERE ${whereClause}
    `;
    const total = Number(countResult[0]?.count ?? 0);

    const rawRows = await this.prisma.$queryRaw<RawBudgetActualForecast[]>`
      SELECT * FROM vw_budget_actual_forecast
      WHERE ${whereClause}
      LIMIT ${limit} OFFSET ${offset}
    `;

    const mappedData: VarianceRecordDto[] = rawRows.map((row) => ({
      company_id: row.company_id.toString(),
      fiscal_year: Number(row.fiscal_year),
      period_month: Number(row.period_month),
      account_id: row.account_id.toString(),
      site_id: this.toStrId(row.site_id),
      product_id: this.toStrId(row.product_id),
      customer_id: this.toStrId(row.customer_id),
      budget_amount: this.toNum(row.budget_amount),
      actual_amount: this.toNum(row.actual_amount),
      forecast_amount: this.toNum(row.forecast_amount),
      variance_amount: this.toNum(row.forecast_vs_budget),
      variance_pct: this.toNullableNum(row.forecast_variance_pct),
    }));

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: mappedData,
    };
  }

  async compareActualVsForecast(
    companyId: bigint,
    tenantId: bigint,
    queryDto: VarianceQueryDto,
  ): Promise<PaginatedVarianceResponseDto> {
    await this.ensureCompanyBelongsToTenant(companyId, tenantId);

    const page = queryDto.page ?? 1;
    const limit = queryDto.limit ?? 50;
    const offset = (page - 1) * limit;

    const whereClause = this.buildWhereClause(companyId, queryDto);

    const countResult = await this.prisma.$queryRaw<CountResult[]>`
      SELECT COUNT(*) as count FROM vw_budget_actual_forecast WHERE ${whereClause}
    `;
    const total = Number(countResult[0]?.count ?? 0);

    const rawRows = await this.prisma.$queryRaw<RawBudgetActualForecast[]>`
      SELECT * FROM vw_budget_actual_forecast
      WHERE ${whereClause}
      LIMIT ${limit} OFFSET ${offset}
    `;

    const mappedData: VarianceRecordDto[] = rawRows.map((row) => {
      const actualAmt = this.toNum(row.actual_amount);
      const forecastAmt = this.toNum(row.forecast_amount);
      const varianceAmt = forecastAmt - actualAmt; // Forecast - Actual
      const variancePct =
        actualAmt === 0
          ? null
          : Math.round((varianceAmt / actualAmt) * 100 * 100) / 100;

      return {
        company_id: row.company_id.toString(),
        fiscal_year: Number(row.fiscal_year),
        period_month: Number(row.period_month),
        account_id: row.account_id.toString(),
        site_id: this.toStrId(row.site_id),
        product_id: this.toStrId(row.product_id),
        customer_id: this.toStrId(row.customer_id),
        budget_amount: this.toNum(row.budget_amount),
        actual_amount: actualAmt,
        forecast_amount: forecastAmt,
        variance_amount: varianceAmt,
        variance_pct: variancePct,
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

  async compareBudgetVsActualVsForecast(
    companyId: bigint,
    tenantId: bigint,
    queryDto: VarianceQueryDto,
  ): Promise<PaginatedVarianceResponseDto> {
    await this.ensureCompanyBelongsToTenant(companyId, tenantId);

    const page = queryDto.page ?? 1;
    const limit = queryDto.limit ?? 50;
    const offset = (page - 1) * limit;

    const whereClause = this.buildWhereClause(companyId, queryDto);

    const countResult = await this.prisma.$queryRaw<CountResult[]>`
      SELECT COUNT(*) as count FROM vw_budget_actual_forecast WHERE ${whereClause}
    `;
    const total = Number(countResult[0]?.count ?? 0);

    const rawRows = await this.prisma.$queryRaw<RawBudgetActualForecast[]>`
      SELECT * FROM vw_budget_actual_forecast
      WHERE ${whereClause}
      LIMIT ${limit} OFFSET ${offset}
    `;

    const mappedData: VarianceRecordDto[] = rawRows.map((row) => {
      const budgetAmt = this.toNum(row.budget_amount);
      const actualAmt = this.toNum(row.actual_amount);
      const forecastAmt = this.toNum(row.forecast_amount);

      const actVsBudgAmt = this.toNum(row.actual_vs_budget);
      const actVsBudgPct = this.toNullableNum(row.actual_variance_pct);

      const foreVsBudgAmt = this.toNum(row.forecast_vs_budget);
      const foreVsBudgPct = this.toNullableNum(row.forecast_variance_pct);

      const foreVsActAmt = forecastAmt - actualAmt;
      const foreVsActPct =
        actualAmt === 0
          ? null
          : Math.round((foreVsActAmt / actualAmt) * 100 * 100) / 100;

      return {
        company_id: row.company_id.toString(),
        fiscal_year: Number(row.fiscal_year),
        period_month: Number(row.period_month),
        account_id: row.account_id.toString(),
        site_id: this.toStrId(row.site_id),
        product_id: this.toStrId(row.product_id),
        customer_id: this.toStrId(row.customer_id),
        budget_amount: budgetAmt,
        actual_amount: actualAmt,
        forecast_amount: forecastAmt,
        variance_amount: actVsBudgAmt, // Default compatibility variance
        variance_pct: actVsBudgPct, // Default compatibility percentage
        actual_vs_budget_amount: actVsBudgAmt,
        actual_vs_budget_pct: actVsBudgPct,
        forecast_vs_budget_amount: foreVsBudgAmt,
        forecast_vs_budget_pct: foreVsBudgPct,
        forecast_vs_actual_amount: foreVsActAmt,
        forecast_vs_actual_pct: foreVsActPct,
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

  private getFiscalYearDateRange(
    fiscalYear: number,
    startMonth: number,
  ): { start: Date; end: Date } {
    const start = new Date(fiscalYear, startMonth - 1, 1);
    const end = new Date(
      fiscalYear + (startMonth === 1 ? 0 : 1),
      startMonth === 1 ? 12 : startMonth - 1,
      0,
      23,
      59,
      59,
      999,
    );
    return { start, end };
  }

  async getYoYComparison(
    companyId: bigint,
    tenantId: bigint,
    queryDto: YoYComparisonQueryDto,
  ): Promise<YoYComparisonResponseDto> {
    await this.ensureCompanyBelongsToTenant(companyId, tenantId);

    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });
    if (!company) {
      throw new NotFoundException(`Company not found`);
    }
    const startMonth = company.fiscalYearStartMonth ?? 1;
    const currentYear = queryDto.fiscalYear;
    const previousYear = currentYear - 1;

    const currentRange = this.getFiscalYearDateRange(currentYear, startMonth);
    const previousRange = this.getFiscalYearDateRange(previousYear, startMonth);

    // Build actual filters
    const actualWhereCurrent: Prisma.ActualLineWhereInput = {
      actualImport: { companyId, status: 'posted' },
      transactionDate: { gte: currentRange.start, lte: currentRange.end },
    };
    const actualWherePrevious: Prisma.ActualLineWhereInput = {
      actualImport: { companyId, status: 'posted' },
      transactionDate: { gte: previousRange.start, lte: previousRange.end },
    };

    if (queryDto.siteId) {
      actualWhereCurrent.siteId = BigInt(queryDto.siteId);
      actualWherePrevious.siteId = BigInt(queryDto.siteId);
    }
    if (queryDto.productId) {
      actualWhereCurrent.productId = BigInt(queryDto.productId);
      actualWherePrevious.productId = BigInt(queryDto.productId);
    }
    if (queryDto.categoryId) {
      actualWhereCurrent.product = { categoryId: BigInt(queryDto.categoryId) };
      actualWherePrevious.product = { categoryId: BigInt(queryDto.categoryId) };
    }
    if (queryDto.customerId) {
      actualWhereCurrent.customerId = BigInt(queryDto.customerId);
      actualWherePrevious.customerId = BigInt(queryDto.customerId);
    }
    if (queryDto.materialId) {
      actualWhereCurrent.materialId = BigInt(queryDto.materialId);
      actualWherePrevious.materialId = BigInt(queryDto.materialId);
    }

    // Get all accounts once to map account types and names
    const accounts = await this.prisma.account.findMany({
      where: { companyId },
      select: { id: true, type: true, name: true },
    });
    const accountMap = new Map<string, { type: string; name: string }>();
    accounts.forEach((a) =>
      accountMap.set(a.id.toString(), { type: a.type, name: a.name }),
    );

    // Group actuals by account ID
    const actualsCurrentGroup = await this.prisma.actualLine.groupBy({
      by: ['accountId'],
      where: actualWhereCurrent,
      _sum: { amount: true },
    });

    const actualsPreviousGroup = await this.prisma.actualLine.groupBy({
      by: ['accountId'],
      where: actualWherePrevious,
      _sum: { amount: true },
    });

    // Group budgets by account ID for current year
    const activeBudget = await this.prisma.budgetCycle.findFirst({
      where: { companyId, fiscalYear: currentYear, status: 'approved' },
      orderBy: { updatedAt: 'desc' },
    });

    const budgetWhere: Prisma.BudgetLineWhereInput = {
      budgetCycleId: activeBudget?.id ?? -1n,
    };
    if (queryDto.siteId) budgetWhere.siteId = BigInt(queryDto.siteId);
    if (queryDto.productId) budgetWhere.productId = BigInt(queryDto.productId);
    if (queryDto.categoryId)
      budgetWhere.product = { categoryId: BigInt(queryDto.categoryId) };
    if (queryDto.customerId)
      budgetWhere.customerId = BigInt(queryDto.customerId);
    if (queryDto.materialId)
      budgetWhere.materialId = BigInt(queryDto.materialId);

    const budgetGroup = activeBudget
      ? await this.prisma.budgetLine.groupBy({
          by: ['accountId'],
          where: budgetWhere,
          _sum: { amount: true },
        })
      : [];

    // Map amounts into categories
    let revCur = 0,
      revPrev = 0,
      revPlan = 0;
    let cogsCur = 0,
      cogsPrev = 0,
      cogsPlan = 0;
    let expCur = 0,
      expPrev = 0,
      expPlan = 0;
    let matCur = 0,
      matPrev = 0,
      matPlan = 0;
    let packCur = 0,
      packPrev = 0,
      packPlan = 0;

    const getCat = (accIdStr: string) => {
      const acc = accountMap.get(accIdStr);
      if (!acc) return 'other';
      const nameLower = acc.name.toLowerCase();
      if (acc.type === 'cogs') {
        if (nameLower.includes('material') || nameLower.includes('raw'))
          return 'material';
        if (
          nameLower.includes('package') ||
          nameLower.includes('can') ||
          nameLower.includes('carton') ||
          nameLower.includes('box')
        )
          return 'packaging';
        return 'cogs';
      }
      return acc.type;
    };

    actualsCurrentGroup.forEach((g) => {
      const amt = Number(g._sum.amount ?? 0);
      const cat = getCat(g.accountId.toString());
      if (cat === 'revenue') revCur += amt;
      else if (cat === 'cogs') cogsCur += amt;
      else if (cat === 'expense') expCur += amt;
      else if (cat === 'material') {
        cogsCur += amt;
        matCur += amt;
      } else if (cat === 'packaging') {
        cogsCur += amt;
        packCur += amt;
      }
    });

    actualsPreviousGroup.forEach((g) => {
      const amt = Number(g._sum.amount ?? 0);
      const cat = getCat(g.accountId.toString());
      if (cat === 'revenue') revPrev += amt;
      else if (cat === 'cogs') cogsPrev += amt;
      else if (cat === 'expense') expPrev += amt;
      else if (cat === 'material') {
        cogsPrev += amt;
        matPrev += amt;
      } else if (cat === 'packaging') {
        cogsPrev += amt;
        packPrev += amt;
      }
    });

    budgetGroup.forEach((g) => {
      const amt = Number(g._sum.amount ?? 0);
      const cat = getCat(g.accountId.toString());
      if (cat === 'revenue') revPlan += amt;
      else if (cat === 'cogs') cogsPlan += amt;
      else if (cat === 'expense') expPlan += amt;
      else if (cat === 'material') {
        cogsPlan += amt;
        matPlan += amt;
      } else if (cat === 'packaging') {
        cogsPlan += amt;
        packPlan += amt;
      }
    });

    // Compute Production volumes from ProductionPlan
    const prodPlansCurrent = await this.prisma.productionPlan.aggregate({
      where: {
        companyId,
        fiscalYear: currentYear,
        productId: queryDto.productId ? BigInt(queryDto.productId) : undefined,
        siteId: queryDto.siteId ? BigInt(queryDto.siteId) : undefined,
      },
      _sum: { actualQty: true, plannedQty: true },
    });

    const prodPlansPrevious = await this.prisma.productionPlan.aggregate({
      where: {
        companyId,
        fiscalYear: previousYear,
        productId: queryDto.productId ? BigInt(queryDto.productId) : undefined,
        siteId: queryDto.siteId ? BigInt(queryDto.siteId) : undefined,
      },
      _sum: { actualQty: true },
    });

    const prodCur = Number(prodPlansCurrent._sum.actualQty ?? 0);
    const prodPrev = Number(prodPlansPrevious._sum.actualQty ?? 0);
    const prodPlan = Number(prodPlansCurrent._sum.plannedQty ?? 0);

    // Compute average wastage percent from recipes
    const bomsCurrent = await this.prisma.bomRecipe.aggregate({
      where: {
        companyId,
        isActive: true,
        productId: queryDto.productId ? BigInt(queryDto.productId) : undefined,
      },
      _avg: { wastagePct: true },
    });
    const wasteCur = Number(bomsCurrent._avg.wastagePct ?? 0);
    const wastePrev = wasteCur;
    const wastePlan = wasteCur;

    const buildMetric = (
      metric: string,
      metricName: string,
      cur: number,
      prev: number,
      plan: number,
      isExpense: boolean,
    ): YoYMetricRecordDto => {
      const varianceAmount = cur - prev;
      const variancePct =
        prev === 0
          ? null
          : Math.round((varianceAmount / prev) * 100 * 100) / 100;
      const planVarianceAmount = cur - plan;
      const planVariancePct =
        plan === 0
          ? null
          : Math.round((planVarianceAmount / plan) * 100 * 100) / 100;

      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (varianceAmount > 0) trend = 'up';
      else if (varianceAmount < 0) trend = 'down';

      let status: 'good' | 'warning' | 'bad' = 'good';
      if (isExpense) {
        status = varianceAmount > 0 ? 'bad' : 'good';
      } else {
        status = varianceAmount >= 0 ? 'good' : 'bad';
      }

      return {
        metric,
        metricName,
        previousYearValue: prev,
        currentYearValue: cur,
        planValue: plan,
        varianceAmount,
        variancePct,
        planVarianceAmount,
        planVariancePct,
        trend,
        status,
      };
    };

    const metrics: YoYMetricRecordDto[] = [];
    metrics.push(
      buildMetric('revenue', 'Revenue', revCur, revPrev, revPlan, false),
    );
    metrics.push(
      buildMetric(
        'cogs',
        'Cost of Goods Sold (COGS)',
        cogsCur,
        cogsPrev,
        cogsPlan,
        true,
      ),
    );
    metrics.push(
      buildMetric(
        'gross_profit',
        'Gross Profit',
        revCur - cogsCur,
        revPrev - cogsPrev,
        revPlan - cogsPlan,
        false,
      ),
    );
    metrics.push(
      buildMetric('expenses', 'Expenses', expCur, expPrev, expPlan, true),
    );
    metrics.push(
      buildMetric(
        'net_profit',
        'Net Profit',
        revCur - cogsCur - expCur,
        revPrev - cogsPrev - expPrev,
        revPlan - cogsPlan - expPlan,
        false,
      ),
    );
    metrics.push(
      buildMetric(
        'production',
        'Production Volume',
        prodCur,
        prodPrev,
        prodPlan,
        false,
      ),
    );
    metrics.push(
      buildMetric(
        'wastage',
        'Wastage Rate (%)',
        wasteCur,
        wastePrev,
        wastePlan,
        true,
      ),
    );
    metrics.push(
      buildMetric(
        'material_costs',
        'Raw Material Costs',
        matCur,
        matPrev,
        matPlan,
        true,
      ),
    );
    metrics.push(
      buildMetric(
        'packaging_costs',
        'Packaging Costs',
        packCur,
        packPrev,
        packPlan,
        true,
      ),
    );

    return { metrics };
  }
}
