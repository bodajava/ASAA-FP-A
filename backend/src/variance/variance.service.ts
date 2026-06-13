import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma } from '@prisma/client';
import { VarianceQueryDto } from './dto/variance-query.dto';
import {
  VarianceRecordDto,
  PaginatedVarianceResponseDto,
} from './dto/variance-response.dto';

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
}
