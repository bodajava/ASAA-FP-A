import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import {
  Prisma,
  ForecastCycle,
  ForecastLine,
  CycleStatus,
  ForecastMethod,
} from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ApprovalsService } from '../approvals/approvals.service';
import { ForecastEngineService } from './forecast-engine.service';
import { CreateForecastCycleDto } from './dto/create-forecast-cycle.dto';
import { UpdateForecastCycleDto } from './dto/update-forecast-cycle.dto';
import { UpdateForecastStatusDto } from './dto/update-forecast-status.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { CostingService } from '../costing/costing.service';
import { ExchangeRatesService } from '../exchange-rates/exchange-rates.service';

export type QueryForecastCycle = ForecastCycle & {
  forecastLines: (ForecastLine & {
    account?: { id: bigint; code: string; name: string; type: string; parentId: bigint | null } | null;
  })[];
};

export interface ForecastLineResponseDto {
  id: string;
  forecastCycleId: string;
  accountId: string;
  siteId: string | null;
  costCenterId: string | null;
  productId: string | null;
  materialId: string | null;
  customerId: string | null;
  periodMonth: number;
  quantity: number;
  unitPrice: number;
  amount: number;
  driverType: string | null;
  notes: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  account?: {
    id: string;
    code: string;
    name: string;
    type: string;
    parentId: string | null;
  } | null;
}

export interface ForecastCycleResponseDto {
  id: string;
  companyId: string;
  scenarioId: string | null;
  name: string;
  fiscalYear: number;
  basePeriod: Date;
  method: ForecastMethod | null;
  status: CycleStatus | null;
  createdBy: string | null;
  approvedBy: string | null;
  approvedAt: Date | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  forecastLines?: ForecastLineResponseDto[];
}

export interface ForecastCostingSummaryDto {
  forecastCycleId: string;
  forecastName: string;
  fiscalYear: number;
  productCostSummaries: {
    productId: string;
    productName: string;
    sku: string;
    forecastedRevenue: number;
    forecastedCogs: number;
    forecastedGrossProfit: number;
    forecastedGrossMarginPct: number;
    standardCostPerUnit: number;
    forecastedQuantity: number;
  }[];
  totals: {
    totalForecastedRevenue: number;
    totalForecastedCogs: number;
    totalForecastedGrossProfit: number;
    overallGrossMarginPct: number;
  };
}

export function mapForecastCycleToResponse(
  cycle: QueryForecastCycle,
  allowedSiteIds?: bigint[] | null,
): ForecastCycleResponseDto {
  let lines = cycle.forecastLines || [];
  if (allowedSiteIds !== undefined && allowedSiteIds !== null) {
    lines = lines.filter(
      (line) => line.siteId !== null && allowedSiteIds.includes(line.siteId),
    );
  }

  const mappedLines = lines.map((line) => ({
    id: line.id.toString(),
    forecastCycleId: line.forecastCycleId.toString(),
    accountId: line.accountId.toString(),
    siteId: line.siteId ? line.siteId.toString() : null,
    costCenterId: line.costCenterId ? line.costCenterId.toString() : null,
    productId: line.productId ? line.productId.toString() : null,
    materialId: line.materialId ? line.materialId.toString() : null,
    customerId: line.customerId ? line.customerId.toString() : null,
    periodMonth: line.periodMonth,
    quantity: line.quantity ? Number(line.quantity) : 0,
    unitPrice: line.unitPrice ? Number(line.unitPrice) : 0,
    amount: Number(line.amount),
    driverType: line.driverType,
    notes: line.notes,
    createdAt: line.createdAt,
    updatedAt: line.updatedAt,
    account: line.account
      ? {
          id: line.account.id.toString(),
          code: line.account.code,
          name: line.account.name,
          type: line.account.type,
          parentId: line.account.parentId ? line.account.parentId.toString() : null,
        }
      : null,
  }));

  return {
    id: cycle.id.toString(),
    companyId: cycle.companyId.toString(),
    scenarioId: cycle.scenarioId ? cycle.scenarioId.toString() : null,
    name: cycle.name,
    fiscalYear: cycle.fiscalYear,
    basePeriod: cycle.basePeriod,
    method: cycle.method,
    status: cycle.status,
    createdBy: cycle.createdBy ? cycle.createdBy.toString() : null,
    approvedBy: cycle.approvedBy ? cycle.approvedBy.toString() : null,
    approvedAt: cycle.approvedAt,
    createdAt: cycle.createdAt,
    updatedAt: cycle.updatedAt,
    forecastLines: mappedLines,
  };
}

@Injectable()
export class ForecastsService {
  private readonly logger = new Logger(ForecastsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly forecastEngine: ForecastEngineService,
    private readonly notificationsService: NotificationsService,
    private readonly approvalsService: ApprovalsService,
    private readonly costingService: CostingService,
    private readonly exchangeRatesService: ExchangeRatesService,
  ) {}

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

  private async validateScenarioReference(
    scenarioId: string | undefined,
    companyId: bigint,
  ): Promise<void> {
    if (!scenarioId) return;
    const scenario = await this.prisma.scenario.findFirst({
      where: { id: BigInt(scenarioId), companyId },
    });
    if (!scenario) {
      throw new BadRequestException(
        `Scenario with ID ${scenarioId} does not exist or belongs to another company`,
      );
    }
  }

  private async validateLineReferences(
    lines: {
      accountId: string;
      siteId?: string;
      costCenterId?: string;
      productId?: string;
      materialId?: string;
      customerId?: string;
    }[],
    companyId: bigint,
  ): Promise<void> {
    if (!lines || lines.length === 0) return;

    const accountIds = new Set<bigint>();
    const siteIds = new Set<bigint>();
    const ccIds = new Set<bigint>();
    const productIds = new Set<bigint>();
    const materialIds = new Set<bigint>();
    const customerIds = new Set<bigint>();

    for (const line of lines) {
      if (line.accountId) accountIds.add(BigInt(line.accountId));
      if (line.siteId) siteIds.add(BigInt(line.siteId));
      if (line.costCenterId) ccIds.add(BigInt(line.costCenterId));
      if (line.productId) productIds.add(BigInt(line.productId));
      if (line.materialId) materialIds.add(BigInt(line.materialId));
      if (line.customerId) customerIds.add(BigInt(line.customerId));
    }

    if (accountIds.size > 0) {
      const dbAccounts = await this.prisma.account.findMany({
        where: { id: { in: Array.from(accountIds) }, companyId },
      });
      if (dbAccounts.length !== accountIds.size) {
        throw new BadRequestException(
          'One or more account IDs do not exist or belong to another company',
        );
      }
    }

    if (siteIds.size > 0) {
      const dbSites = await this.prisma.site.findMany({
        where: { id: { in: Array.from(siteIds) }, companyId },
      });
      if (dbSites.length !== siteIds.size) {
        throw new BadRequestException(
          'One or more site IDs do not exist or belong to another company',
        );
      }
    }

    if (ccIds.size > 0) {
      const dbCCs = await this.prisma.costCenter.findMany({
        where: { id: { in: Array.from(ccIds) }, companyId },
      });
      if (dbCCs.length !== ccIds.size) {
        throw new BadRequestException(
          'One or more cost center IDs do not exist or belong to another company',
        );
      }
    }

    if (productIds.size > 0) {
      const dbProducts = await this.prisma.product.findMany({
        where: { id: { in: Array.from(productIds) }, companyId },
      });
      if (dbProducts.length !== productIds.size) {
        throw new BadRequestException(
          'One or more product IDs do not exist or belong to another company',
        );
      }
    }

    if (materialIds.size > 0) {
      const dbMaterials = await this.prisma.material.findMany({
        where: { id: { in: Array.from(materialIds) }, companyId },
      });
      if (dbMaterials.length !== materialIds.size) {
        throw new BadRequestException(
          'One or more material IDs do not exist or belong to another company',
        );
      }
    }

    if (customerIds.size > 0) {
      const dbCustomers = await this.prisma.customer.findMany({
        where: { id: { in: Array.from(customerIds) }, companyId },
      });
      if (dbCustomers.length !== customerIds.size) {
        throw new BadRequestException(
          'One or more customer IDs do not exist or belong to another company',
        );
      }
    }
  }

  async create(
    createDto: CreateForecastCycleDto,
    companyId: bigint,
    tenantId: bigint,
    userId: bigint,
  ): Promise<ForecastCycleResponseDto> {
    await this.ensureCompanyBelongsToTenant(companyId, tenantId);
    await this.validateScenarioReference(createDto.scenarioId, companyId);

    if (createDto.forecastLines) {
      await this.validateLineReferences(createDto.forecastLines, companyId);
    }

    const cycle = await this.prisma.$transaction(async (tx) => {
      const createdCycle = await tx.forecastCycle.create({
        data: {
          companyId,
          scenarioId: createDto.scenarioId
            ? BigInt(createDto.scenarioId)
            : null,
          name: createDto.name,
          fiscalYear: createDto.fiscalYear,
          basePeriod: new Date(createDto.basePeriod),
          method: createDto.method ?? 'manual',
          status: 'draft',
          createdBy: userId,
        },
      });

      if (createDto.forecastLines && createDto.forecastLines.length > 0) {
        await tx.forecastLine.createMany({
          data: createDto.forecastLines.map((line) => ({
            forecastCycleId: createdCycle.id,
            accountId: BigInt(line.accountId),
            siteId: line.siteId ? BigInt(line.siteId) : null,
            costCenterId: line.costCenterId ? BigInt(line.costCenterId) : null,
            productId: line.productId ? BigInt(line.productId) : null,
            materialId: line.materialId ? BigInt(line.materialId) : null,
            customerId: line.customerId ? BigInt(line.customerId) : null,
            periodMonth: line.periodMonth,
            quantity: line.quantity ?? 0,
            unitPrice: line.unitPrice ?? 0,
            amount: line.amount,
            driverType: line.driverType ?? null,
            notes: line.notes ?? null,
          })),
        });
      }

      return createdCycle;
    });

    const fullCycle = await this.prisma.forecastCycle.findUnique({
      where: { id: cycle.id },
      include: { forecastLines: true },
    });

    if (!fullCycle) {
      throw new NotFoundException('Failed to retrieve created forecast cycle');
    }

    // Write audit log
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        entityType: 'ForecastCycle',
        entityId: cycle.id,
        action: 'create',
        newValues: JSON.stringify(fullCycle),
      },
    });

    return mapForecastCycleToResponse(fullCycle);
  }

  private async getManagedSiteIdsForUser(
    userId: bigint,
    roleName?: string,
  ): Promise<bigint[] | null> {
    const rName = roleName?.toLowerCase() || '';
    if (
      rName.includes('branch manager') ||
      rName.includes('warehouse manager') ||
      rName.includes('site manager')
    ) {
      const sites = await this.prisma.site.findMany({
        where: { managerUserId: userId },
        select: { id: true },
      });
      return sites.map((s) => s.id);
    }
    return null;
  }

  async findAll(
    companyId: bigint,
    tenantId: bigint,
    paginationDto: PaginationDto,
    userId?: bigint,
    roleName?: string,
  ) {
    await this.ensureCompanyBelongsToTenant(companyId, tenantId);

    const page = paginationDto.page ?? 1;
    const limit = paginationDto.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Prisma.ForecastCycleWhereInput = {
      companyId,
    };

    if (paginationDto.search) {
      const searchNumber = Number(paginationDto.search);
      if (!isNaN(searchNumber)) {
        where.OR = [
          { name: { contains: paginationDto.search } },
          { fiscalYear: searchNumber },
        ];
      } else {
        const searchStatus = paginationDto.search.toLowerCase();
        const statusMatch = Object.values(CycleStatus).find(
          (s) => s.toLowerCase() === searchStatus,
        );

        if (statusMatch) {
          where.status = statusMatch;
        } else {
          where.name = { contains: paginationDto.search };
        }
      }
    }

    const [total, data] = await Promise.all([
      this.prisma.forecastCycle.count({ where }),
      this.prisma.forecastCycle.findMany({
        where,
        skip,
        take: limit,
        orderBy: { fiscalYear: 'desc' },
        include: { forecastLines: true },
      }),
    ]);

    const allowedSiteIds = userId
      ? await this.getManagedSiteIdsForUser(userId, roleName)
      : null;

    const mappedData = data.map((cycle) =>
      mapForecastCycleToResponse(cycle, allowedSiteIds),
    );

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: mappedData,
    };
  }

  async findOne(
    id: bigint,
    companyId: bigint,
    tenantId: bigint,
    userId?: bigint,
    roleName?: string,
  ): Promise<ForecastCycleResponseDto> {
    await this.ensureCompanyBelongsToTenant(companyId, tenantId);

    const cycle = await this.prisma.forecastCycle.findFirst({
      where: { id, companyId },
      include: {
        forecastLines: {
          include: {
            account: { select: { id: true, code: true, name: true, type: true, parentId: true } },
          },
        },
      },
    });

    if (!cycle) {
      throw new NotFoundException(
        `Forecast cycle with ID ${id} not found under this company`,
      );
    }

    const allowedSiteIds = userId
      ? await this.getManagedSiteIdsForUser(userId, roleName)
      : null;

    return mapForecastCycleToResponse(cycle, allowedSiteIds);
  }

  async update(
    id: bigint,
    updateDto: UpdateForecastCycleDto,
    companyId: bigint,
    tenantId: bigint,
    userId: bigint,
  ): Promise<ForecastCycleResponseDto> {
    await this.ensureCompanyBelongsToTenant(companyId, tenantId);

    const oldCycle = await this.prisma.forecastCycle.findFirst({
      where: { id, companyId },
      include: { forecastLines: true },
    });
    if (!oldCycle) {
      throw new NotFoundException(
        `Forecast cycle with ID ${id} not found under this company`,
      );
    }

    if (oldCycle.status === 'approved' || oldCycle.status === 'locked') {
      throw new BadRequestException(
        `Cannot edit approved or locked forecast cycles. Current status is ${oldCycle.status}`,
      );
    }

    await this.validateScenarioReference(updateDto.scenarioId, companyId);

    if (updateDto.forecastLines) {
      await this.validateLineReferences(updateDto.forecastLines, companyId);
    }

    const updatedCycle = await this.prisma.$transaction(async (tx) => {
      const cycle = await tx.forecastCycle.update({
        where: { id },
        data: {
          scenarioId:
            updateDto.scenarioId !== undefined
              ? updateDto.scenarioId
                ? BigInt(updateDto.scenarioId)
                : null
              : undefined,
          name: updateDto.name,
          fiscalYear: updateDto.fiscalYear,
          basePeriod: updateDto.basePeriod
            ? new Date(updateDto.basePeriod)
            : undefined,
          method: updateDto.method,
        },
      });

      if (updateDto.forecastLines) {
        await tx.forecastLine.deleteMany({
          where: { forecastCycleId: id },
        });

        if (updateDto.forecastLines.length > 0) {
          await tx.forecastLine.createMany({
            data: updateDto.forecastLines.map((line) => ({
              forecastCycleId: id,
              accountId: BigInt(line.accountId),
              siteId: line.siteId ? BigInt(line.siteId) : null,
              costCenterId: line.costCenterId
                ? BigInt(line.costCenterId)
                : null,
              productId: line.productId ? BigInt(line.productId) : null,
              materialId: line.materialId ? BigInt(line.materialId) : null,
              customerId: line.customerId ? BigInt(line.customerId) : null,
              periodMonth: line.periodMonth,
              quantity: line.quantity ?? 0,
              unitPrice: line.unitPrice ?? 0,
              amount: line.amount,
              driverType: line.driverType ?? null,
              notes: line.notes ?? null,
            })),
          });
        }
      }

      return cycle;
    });

    const fullCycle = await this.prisma.forecastCycle.findUnique({
      where: { id: updatedCycle.id },
      include: { forecastLines: true },
    });

    if (!fullCycle) {
      throw new NotFoundException('Failed to retrieve updated forecast cycle');
    }

    // Write audit log
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        entityType: 'ForecastCycle',
        entityId: id,
        action: 'update',
        oldValues: JSON.stringify(oldCycle),
        newValues: JSON.stringify(fullCycle),
      },
    });

    return mapForecastCycleToResponse(fullCycle);
  }

  async remove(
    id: bigint,
    companyId: bigint,
    tenantId: bigint,
    userId: bigint,
  ): Promise<ForecastCycleResponseDto> {
    const cycle = await this.findOne(id, companyId, tenantId);

    if (cycle.status === 'approved' || cycle.status === 'locked') {
      throw new BadRequestException(
        `Cannot delete approved or locked forecast cycles. Current status is ${cycle.status}`,
      );
    }

    await this.prisma.forecastCycle.delete({
      where: { id },
    });

    // Write audit log
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        entityType: 'ForecastCycle',
        entityId: id,
        action: 'delete',
        oldValues: JSON.stringify(cycle),
      },
    });

    return cycle;
  }

  async updateStatus(
    id: bigint,
    statusDto: UpdateForecastStatusDto,
    companyId: bigint,
    tenantId: bigint,
    userId: bigint,
  ): Promise<ForecastCycleResponseDto> {
    await this.ensureCompanyBelongsToTenant(companyId, tenantId);

    const oldCycle = await this.prisma.forecastCycle.findFirst({
      where: { id, companyId },
      include: { forecastLines: true },
    });
    if (!oldCycle) {
      throw new NotFoundException(
        `Forecast cycle with ID ${id} not found under this company`,
      );
    }

    const currentStatus = oldCycle.status;
    const targetStatus = statusDto.status;

    if (currentStatus === targetStatus) {
      return mapForecastCycleToResponse(oldCycle);
    }

    if (currentStatus === 'locked') {
      throw new BadRequestException(
        'Locked forecast cycles cannot be modified or transitioned',
      );
    }

    if (targetStatus === 'locked' && currentStatus !== 'approved') {
      throw new BadRequestException(
        'Only approved forecast cycles can be locked',
      );
    }

    let approvedBy: bigint | null = oldCycle.approvedBy;
    let approvedAt: Date | null = oldCycle.approvedAt;
    if (targetStatus === 'approved') {
      approvedBy = userId;
      approvedAt = new Date();
    }

    const updatedCycle = await this.prisma.forecastCycle.update({
      where: { id },
      data: {
        status: targetStatus,
        approvedBy,
        approvedAt,
      },
      include: { forecastLines: true },
    });

    // Write audit log
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        entityType: 'ForecastCycle',
        entityId: id,
        action: 'status_change',
        oldValues: JSON.stringify(oldCycle),
        newValues: JSON.stringify(updatedCycle),
      },
    });

    // Create approval request when submitting for approval
    if (currentStatus === 'draft' && targetStatus === 'submitted') {
      await this.approvalsService
        .create(
          { entityType: 'ForecastCycle', entityId: id.toString(), comments: `Submitted for approval` },
          companyId,
          tenantId,
          userId,
        )
        .catch((err: unknown) => {
          this.logger.error({
            operation: 'submitForApproval',
            entity: 'ForecastCycle',
            entityId: id.toString(),
            companyId: companyId.toString(),
            userId: userId.toString(),
            error: err instanceof Error ? err.message : String(err),
            stack: err instanceof Error ? err.stack : undefined,
          });
        });
    }

    if (targetStatus === 'approved') {
      await this.notificationsService
        .triggerForecastApproval(companyId, tenantId, id, updatedCycle.name)
        .catch((err: unknown) => {
          this.logger.error({
            operation: 'triggerForecastApproval',
            entity: 'ForecastCycle',
            entityId: id.toString(),
            companyId: companyId.toString(),
            userId: userId.toString(),
            error: err instanceof Error ? err.message : String(err),
            stack: err instanceof Error ? err.stack : undefined,
          });
        });
    }

    return mapForecastCycleToResponse(updatedCycle);
  }

  async generateForecastLines(
    id: bigint,
    companyId: bigint,
    tenantId: bigint,
  ): Promise<ForecastCycleResponseDto> {
    await this.ensureCompanyBelongsToTenant(companyId, tenantId);

    const cycle = await this.prisma.forecastCycle.findFirst({
      where: { id, companyId },
      include: { scenario: true, forecastLines: true },
    });

    if (!cycle) {
      throw new NotFoundException(
        `Forecast cycle with ID ${id} not found under this company`,
      );
    }

    if (cycle.status === 'approved' || cycle.status === 'locked') {
      throw new BadRequestException(
        `Cannot generate lines for approved or locked forecast cycles. Current status is ${cycle.status}`,
      );
    }

    const fiscalYear = cycle.fiscalYear;
    const basePeriodDate = new Date(cycle.basePeriod);
    const baseMonth = basePeriodDate.getMonth() + 1; // 1-indexed

    // Clear existing forecast lines first
    await this.prisma.forecastLine.deleteMany({
      where: { forecastCycleId: id },
    });

    // 1. Fetch all accounts for this company
    const accounts = await this.prisma.account.findMany({
      where: { companyId, isActive: true },
    });

    // 2. Fetch the approved budget cycle for this fiscal year, if any
    const budgetCycle = await this.prisma.budgetCycle.findFirst({
      where: { companyId, fiscalYear, status: 'approved' },
      include: { budgetLines: true },
    });

    // 3. Aggregate actual lines by account+month using SQL instead of loading all rows
    const dateFrom = new Date(fiscalYear, 0, 1);
    const dateTo = new Date(fiscalYear, 11, 31);

    const actualsAggregated = await this.prisma.$queryRaw<
      {
        account_id: bigint;
        month: number;
        total_qty: unknown;
        total_amount: unknown;
      }[]
    >`
      SELECT
        al.account_id,
        MONTH(al.transaction_date) AS month,
        SUM(COALESCE(al.quantity, 0)) AS total_qty,
        SUM(COALESCE(al.amount, 0)) AS total_amount
      FROM actual_lines al
      INNER JOIN actual_imports ai ON al.actual_import_id = ai.id
      WHERE ai.company_id = ${companyId}
        AND ai.status = 'posted'
        AND al.transaction_date >= ${dateFrom}
        AND al.transaction_date <= ${dateTo}
      GROUP BY al.account_id, MONTH(al.transaction_date)
    `;

    // Build actualsMap from aggregated SQL results
    const actualsMap = new Map<string, { qty: number; amount: number }>();
    for (const row of actualsAggregated) {
      const key = `${row.account_id}:${row.month}`;
      actualsMap.set(key, {
        qty: Number(row.total_qty),
        amount: Number(row.total_amount),
      });
    }

    // Group budget lines by account + month
    const budgetMap = new Map<
      string,
      {
        qty: number;
        amount: number;
        unitPrice: number;
        siteId: bigint | null;
        costCenterId: bigint | null;
        productId: bigint | null;
        materialId: bigint | null;
        customerId: bigint | null;
      }
    >();
    if (budgetCycle) {
      for (const line of budgetCycle.budgetLines) {
        const key = `${line.accountId}:${line.periodMonth}`;
        budgetMap.set(key, {
          qty: Number(line.quantity ?? 0),
          amount: Number(line.amount),
          unitPrice: Number(line.unitPrice ?? 0),
          siteId: line.siteId,
          costCenterId: line.costCenterId,
          productId: line.productId,
          materialId: line.materialId,
          customerId: line.customerId,
        });
      }
    }

    // Prepare scenario growth factor & Egyptian market params
    let revenueGrowth = 0;
    let cogsGrowth = 0;
    let expenseGrowth = 0;
    let ramadanMonth = 0;
    let monthlyInflation = 0;
    if (cycle.scenario && cycle.scenario.assumptionsJson) {
      const assumptions = cycle.scenario.assumptionsJson
        ? (JSON.parse(cycle.scenario.assumptionsJson) as Record<
            string,
            string | number | boolean
          >)
        : {};
      revenueGrowth = Number(
        assumptions['sales_volume_growth'] ??
          assumptions['revenue_growth'] ??
          0,
      );
      cogsGrowth = Number(
        assumptions['cogs_increase_pct'] ?? assumptions['cogs_growth'] ?? 0,
      );
      expenseGrowth = Number(
        assumptions['expense_growth'] ?? assumptions['inflation_rate'] ?? 0,
      );
      ramadanMonth = Number(assumptions['ramadan_month'] ?? 0);
      monthlyInflation = Number(assumptions['monthly_inflation'] ?? 0);

      if (Math.abs(revenueGrowth) > 1) revenueGrowth /= 100;
      if (Math.abs(cogsGrowth) > 1) cogsGrowth /= 100;
      if (Math.abs(expenseGrowth) > 1) expenseGrowth /= 100;
      if (Math.abs(monthlyInflation) > 1) monthlyInflation /= 100;
    }

    // Fetch pre-computed seasonal indices for this company
    const seasonalIndices = await this.prisma.seasonalIndex.findMany({
      where: { companyId },
    });
    const seasonalMap = new Map<string, number>();
    for (const si of seasonalIndices) {
      seasonalMap.set(`${si.accountId}:${si.month}`, Number(si.factor));
    }

    const forecastLinesData: Prisma.ForecastLineCreateManyInput[] = [];

    // Build historical data from aggregated actuals for smart methods
    const historicalMonthlyMap = new Map<
      string,
      { year: number; month: number; amount: number }[]
    >();
    // Re-fetch actual line details only for historical analysis (needed for time-series)
    const actualLineDetails = await this.prisma.$queryRaw<
      { account_id: bigint; transaction_date: Date; amount: unknown }[]
    >`
      SELECT al.account_id, al.transaction_date, COALESCE(al.amount, 0) AS amount
      FROM actual_lines al
      INNER JOIN actual_imports ai ON al.actual_import_id = ai.id
      WHERE ai.company_id = ${companyId}
        AND ai.status = 'posted'
        AND al.transaction_date >= ${dateFrom}
        AND al.transaction_date <= ${dateTo}
    `;
    for (const line of actualLineDetails) {
      const dt = new Date(line.transaction_date);
      const key = line.account_id.toString();
      if (!historicalMonthlyMap.has(key)) historicalMonthlyMap.set(key, []);
      historicalMonthlyMap.get(key)!.push({
        year: dt.getFullYear(),
        month: dt.getMonth() + 1,
        amount: Number(line.amount),
      });
    }

    // Loop through all active accounts and all 12 months
    for (const acc of accounts) {
      const accKey = acc.id.toString();
      const historicalData = this.forecastEngine.buildTimeSeries(
        historicalMonthlyMap.get(accKey) ?? [],
      );
      const accountSeasonalFactor =
        seasonalMap.get(`${acc.id}:${baseMonth + 1}`) ?? 1;

      for (let month = 1; month <= 12; month++) {
        const key = `${acc.id}:${month}`;
        let qty = 0;
        let amount = 0;
        let unitPrice = 0;
        let siteId: bigint | null = null;
        let costCenterId: bigint | null = null;
        let productId: bigint | null = null;
        let materialId: bigint | null = null;
        let customerId: bigint | null = null;
        let driverType = 'manual';
        let confidence: number | null = null;

        // Check if month is actual or forecast period
        if (month <= baseMonth) {
          const act = actualsMap.get(key);
          if (act) {
            qty = act.qty;
            amount = act.amount;
          }
          driverType = 'actuals';
        } else {
          const budget = budgetMap.get(key);
          if (budget) {
            qty = budget.qty;
            amount = budget.amount;
            unitPrice = budget.unitPrice;
            siteId = budget.siteId;
            costCenterId = budget.costCenterId;
            productId = budget.productId;
            materialId = budget.materialId;
            customerId = budget.customerId;
          }

          if (productId) {
            const scenarioAssumptions = cycle.scenario?.assumptionsJson
              ? JSON.parse(cycle.scenario.assumptionsJson)
              : undefined;
            const costing = await this.costingService.calculateStandardCost(
              productId,
              companyId,
              tenantId,
              undefined,
              scenarioAssumptions,
            );

            const company = await this.prisma.company.findUnique({
              where: { id: companyId },
            });
            const companyCurrency = company?.currencyCode ?? 'EGP';

            if (acc.type === 'cogs') {
              unitPrice = costing.totalCost;
            } else if (acc.type === 'revenue') {
              unitPrice = costing.sellingPrice;
            }

            if (
              scenarioAssumptions &&
              scenarioAssumptions.subtype === 'currency_rate_change'
            ) {
              const fromCurrency =
                (scenarioAssumptions.fromCurrency as string) || 'USD';
              const toCurrency =
                (scenarioAssumptions.toCurrency as string) || companyCurrency;
              const liveRate = await this.exchangeRatesService.getRate(
                companyId,
                fromCurrency,
                toCurrency,
              );
              const oldRate = scenarioAssumptions.oldRate
                ? Number(scenarioAssumptions.oldRate)
                : 1;
              const rateMultiplier = oldRate > 0 ? liveRate / oldRate : 1;
              unitPrice = unitPrice * rateMultiplier;
            }

            amount = qty * unitPrice;
          }

          if (cycle.method === ForecastMethod.rolling) {
            driverType = 'rolling_budget';
          } else if (cycle.method === ForecastMethod.driver_based) {
            if (acc.type === 'revenue') {
              amount = amount * (1 + revenueGrowth);
              qty = qty * (1 + revenueGrowth);
              driverType = 'growth_driver';
            } else if (acc.type === 'cogs') {
              amount = amount * (1 + cogsGrowth);
              qty = qty * (1 + cogsGrowth);
              driverType = 'cogs_driver';
            } else if (acc.type === 'expense') {
              amount = amount * (1 + expenseGrowth);
              driverType = 'expense_driver';
            } else {
              driverType = 'budget';
            }
          } else if (
            cycle.method === ForecastMethod.ai_assisted ||
            cycle.method === ForecastMethod.seasonal_adjusted ||
            cycle.method === ForecastMethod.hybrid
          ) {
            const historical = [...historicalData].filter((v) => v > 0);
            let engineAmount = 0;
            let engineConfidence = 0;

            if (cycle.method === ForecastMethod.hybrid) {
              const wma = this.forecastEngine.weightedMovingAverage(
                historical,
                6,
              );
              const exp = this.forecastEngine.exponentialSmoothing(historical);
              const holt = this.forecastEngine.holtLinear(historical);
              const result = this.forecastEngine.getForecast(historical, {
                baseMonth,
                ramadanMonth: ramadanMonth || undefined,
                monthlyInflationRate: monthlyInflation,
              });
              const holtLast = holt[0] ?? exp;
              engineAmount =
                wma * 0.2 + exp * 0.2 + holtLast * 0.25 + result.amount * 0.35;
              engineConfidence = result.confidence;
              driverType = `hybrid_${result.driverType}`;
              confidence = result.confidence;
            } else {
              const result = this.forecastEngine.getForecast(historical, {
                baseMonth,
                ramadanMonth: ramadanMonth || undefined,
                monthlyInflationRate: monthlyInflation,
              });
              engineAmount = result.amount;
              engineConfidence = result.confidence;
              driverType = result.driverType;
              confidence = result.confidence;

              if (cycle.method === ForecastMethod.seasonal_adjusted) {
                driverType = `seasonal_${result.driverType}`;
              }
            }

            // Apply seasonal factor from DB if available
            if (accountSeasonalFactor !== 1 && engineAmount > 0) {
              const seasonalAdj = engineAmount * accountSeasonalFactor;
              amount = Number(
                (engineAmount * 0.6 + seasonalAdj * 0.4).toFixed(2),
              );
              driverType = `${driverType}_db_adjusted`;
            } else {
              amount = engineAmount;
            }

            // Fall back to budget if engine couldn't produce a value
            if (amount <= 0 && budget && budget.amount > 0) {
              amount = budget.amount;
              driverType = 'budget_fallback';
              confidence = null;
            }
          }
        }

        if (amount !== 0 || qty !== 0) {
          forecastLinesData.push({
            forecastCycleId: id,
            accountId: acc.id,
            siteId,
            costCenterId,
            productId,
            materialId,
            customerId,
            periodMonth: month,
            quantity: qty,
            unitPrice,
            amount,
            driverType,
            notes: `Auto-generated using ${
              cycle.method === ForecastMethod.hybrid
                ? 'hybrid_engine'
                : cycle.method === ForecastMethod.seasonal_adjusted
                  ? 'seasonal_engine'
                  : cycle.method === ForecastMethod.ai_assisted
                    ? 'ai_statistical_engine'
                    : cycle.method
            } method`,
          });
        }
      }
    }

    if (forecastLinesData.length > 0) {
      await this.prisma.forecastLine.createMany({
        data: forecastLinesData,
      });
    }

    // Log forecast accuracy for past months (background, non-critical)
    try {
      const currentMonth = baseMonth;
      const accuracyLogs: Prisma.ForecastAccuracyLogCreateManyInput[] = [];
      for (const line of forecastLinesData) {
        if (line.periodMonth <= currentMonth) {
          const actKey = `${line.accountId}:${line.periodMonth}`;
          const actual = actualsMap.get(actKey);
          if (actual && actual.amount > 0) {
            const forecastAmt = Number(line.amount);
            const actualAmt = Number(actual.amount);
            const variance =
              actualAmt !== 0
                ? ((forecastAmt - actualAmt) / actualAmt) * 100
                : 0;
            const absVariance = Math.abs(variance);
            const confidenceScore = Math.max(
              0,
              Math.min(99, 100 - absVariance),
            );
            accuracyLogs.push({
              companyId,
              forecastCycleId: id,
              accountId: line.accountId,
              fiscalYear,
              periodMonth: line.periodMonth,
              forecastAmount: forecastAmt,
              actualAmount: actualAmt,
              variancePct: Number(variance.toFixed(2)),
              methodUsed: line.driverType ?? cycle.method ?? 'unknown',
              confidenceScore: Number(confidenceScore.toFixed(2)),
            });
          }
        }
      }
      if (accuracyLogs.length > 0) {
        await this.prisma.forecastAccuracyLog.createMany({
          data: accuracyLogs,
          skipDuplicates: true,
        });
      }
    } catch (err: unknown) {
      this.logger.error({
        operation: 'calculateAndLogAccuracy',
        entity: 'ForecastCycle',
        entityId: id.toString(),
        companyId: companyId.toString(),
        userId: 'system',
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });
    }

    const finalCycle = await this.prisma.forecastCycle.findUnique({
      where: { id },
      include: { forecastLines: true },
    });

    if (!finalCycle) {
      throw new NotFoundException(
        'Failed to retrieve forecast cycle after generation',
      );
    }

    return mapForecastCycleToResponse(finalCycle);
  }

  async getAccuracyMetrics(
    companyId: bigint,
    tenantId: bigint,
    cycleId?: bigint,
    fiscalYear?: number,
  ): Promise<{
    overallMape: number;
    overallMae: number;
    overallRmse: number;
    byMethod: Record<string, { count: number; mape: number }>;
    recentLogs: Array<{
      id: string;
      periodMonth: number;
      forecastAmount: number;
      actualAmount: number;
      variancePct: number;
      methodUsed: string;
      confidenceScore: number | null;
      accountName?: string;
    }>;
  }> {
    await this.ensureCompanyBelongsToTenant(companyId, tenantId);

    const where: Prisma.ForecastAccuracyLogWhereInput = { companyId };
    if (cycleId) where.forecastCycleId = cycleId;
    if (fiscalYear) where.fiscalYear = fiscalYear;

    const logs = await this.prisma.forecastAccuracyLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    if (logs.length === 0) {
      return {
        overallMape: 0,
        overallMae: 0,
        overallRmse: 0,
        byMethod: {},
        recentLogs: [],
      };
    }

    const actuals = logs.map((l) => Number(l.actualAmount));
    const forecasts = logs.map((l) => Number(l.forecastAmount));
    const metrics = this.forecastEngine.computeAccuracy(actuals, forecasts);

    const byMethod: Record<string, { count: number; mape: number }> = {};
    for (const log of logs) {
      const method = log.methodUsed;
      if (!byMethod[method]) byMethod[method] = { count: 0, mape: 0 };
      byMethod[method].count++;
      const actualAmt = Number(log.actualAmount);
      if (actualAmt !== 0) {
        byMethod[method].mape +=
          (Math.abs(Number(log.forecastAmount) - actualAmt) / actualAmt) * 100;
      }
    }
    for (const method of Object.keys(byMethod)) {
      byMethod[method].mape = Number(
        (byMethod[method].mape / byMethod[method].count).toFixed(2),
      );
    }

    const recentLogs = logs.slice(0, 20).map((l) => ({
      id: l.id.toString(),
      periodMonth: l.periodMonth,
      forecastAmount: Number(l.forecastAmount),
      actualAmount: Number(l.actualAmount),
      variancePct: Number(l.variancePct),
      methodUsed: l.methodUsed,
      confidenceScore: l.confidenceScore ? Number(l.confidenceScore) : null,
    }));

    return {
      overallMape: metrics.mape,
      overallMae: metrics.mae,
      overallRmse: metrics.rmse,
      byMethod,
      recentLogs,
    };
  }

  async getAccuracyLogs(
    companyId: bigint,
    tenantId: bigint,
    cycleId?: bigint,
    limit: number = 20,
  ): Promise<{
    total: number;
    data: Array<{
      id: string;
      periodMonth: number;
      forecastAmount: number;
      actualAmount: number;
      variancePct: number;
      methodUsed: string;
      confidenceScore: number | null;
      accountName?: string;
      cycleName?: string;
    }>;
  }> {
    await this.ensureCompanyBelongsToTenant(companyId, tenantId);

    const where: Prisma.ForecastAccuracyLogWhereInput = { companyId };
    if (cycleId) where.forecastCycleId = cycleId;

    const [total, logs] = await Promise.all([
      this.prisma.forecastAccuracyLog.count({ where }),
      this.prisma.forecastAccuracyLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
    ]);

    const accountIds = [...new Set(logs.map((l) => l.accountId))];
    const accounts = await this.prisma.account.findMany({
      where: { id: { in: accountIds } },
      select: { id: true, name: true },
    });
    const accountNames = new Map(
      accounts.map((a) => [a.id.toString(), a.name]),
    );

    const data = logs.map((l) => ({
      id: l.id.toString(),
      periodMonth: l.periodMonth,
      forecastAmount: Number(l.forecastAmount),
      actualAmount: Number(l.actualAmount),
      variancePct: Number(l.variancePct),
      methodUsed: l.methodUsed,
      confidenceScore: l.confidenceScore ? Number(l.confidenceScore) : null,
      accountName: accountNames.get(l.accountId.toString()),
    }));

    return { total, data };
  }

  async getForecastCostingSummary(
    forecastCycleId: bigint,
    companyId: bigint,
    tenantId: bigint,
  ): Promise<ForecastCostingSummaryDto> {
    await this.ensureCompanyBelongsToTenant(companyId, tenantId);

    const cycle = await this.prisma.forecastCycle.findFirst({
      where: { id: forecastCycleId, companyId },
      include: { forecastLines: true },
    });

    if (!cycle) {
      throw new NotFoundException(
        `Forecast cycle with ID ${forecastCycleId} not found under this company`,
      );
    }

    const lines = cycle.forecastLines;

    const productLineMap = new Map<
      bigint,
      { totalRevenue: number; totalCogs: number; totalQuantity: number }
    >();

    const accountIds = [...new Set(lines.map((l) => l.accountId))];
    const accounts = await this.prisma.account.findMany({
      where: { id: { in: accountIds }, companyId },
    });
    const accountTypeMap = new Map(accounts.map((a) => [a.id, a.type]));

    const productIds = [
      ...new Set(lines.filter((l) => l.productId).map((l) => l.productId!)),
    ];
    const products =
      productIds.length > 0
        ? await this.prisma.product.findMany({
            where: { id: { in: productIds }, companyId },
          })
        : [];
    const productMap = new Map(products.map((p) => [p.id, p]));

    for (const line of lines) {
      if (!line.productId) continue;

      const accType = accountTypeMap.get(line.accountId);
      const amount = Number(line.amount);
      const qty = line.quantity ? Number(line.quantity) : 0;

      let entry = productLineMap.get(line.productId);
      if (!entry) {
        entry = { totalRevenue: 0, totalCogs: 0, totalQuantity: 0 };
        productLineMap.set(line.productId, entry);
      }

      if (accType === 'revenue') {
        entry.totalRevenue += amount;
      } else if (accType === 'cogs') {
        entry.totalCogs += amount;
      }
      entry.totalQuantity += qty;
    }

    const productCostSummaries: ForecastCostingSummaryDto['productCostSummaries'] =
      [];

    for (const [productId, lineData] of productLineMap) {
      const product = productMap.get(productId);
      if (!product) continue;

      let standardCostPerUnit = 0;
      try {
        const costing = await this.costingService.calculateStandardCost(
          productId,
          companyId,
          tenantId,
        );
        standardCostPerUnit = costing.totalCost;
      } catch (err: unknown) {
        this.logger.error({
          operation: 'calculateStandardCost',
          entity: 'Product',
          entityId: productId.toString(),
          companyId: companyId.toString(),
          userId: 'system',
          error: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined,
        });
        standardCostPerUnit = 0;
      }

      const forecastedRevenue = lineData.totalRevenue;
      const forecastedCogs = lineData.totalCogs;
      const forecastedGrossProfit = forecastedRevenue - forecastedCogs;
      const forecastedGrossMarginPct =
        forecastedRevenue > 0
          ? (forecastedGrossProfit / forecastedRevenue) * 100
          : 0;

      productCostSummaries.push({
        productId: product.id.toString(),
        productName: product.name,
        sku: product.sku,
        forecastedRevenue: Number(forecastedRevenue.toFixed(2)),
        forecastedCogs: Number(forecastedCogs.toFixed(2)),
        forecastedGrossProfit: Number(forecastedGrossProfit.toFixed(2)),
        forecastedGrossMarginPct: Number(forecastedGrossMarginPct.toFixed(2)),
        standardCostPerUnit,
        forecastedQuantity: lineData.totalQuantity,
      });
    }

    const totalForecastedRevenue = productCostSummaries.reduce(
      (s, p) => s + p.forecastedRevenue,
      0,
    );
    const totalForecastedCogs = productCostSummaries.reduce(
      (s, p) => s + p.forecastedCogs,
      0,
    );
    const totalForecastedGrossProfit =
      totalForecastedRevenue - totalForecastedCogs;
    const overallGrossMarginPct =
      totalForecastedRevenue > 0
        ? (totalForecastedGrossProfit / totalForecastedRevenue) * 100
        : 0;

    return {
      forecastCycleId: cycle.id.toString(),
      forecastName: cycle.name,
      fiscalYear: cycle.fiscalYear,
      productCostSummaries,
      totals: {
        totalForecastedRevenue: Number(totalForecastedRevenue.toFixed(2)),
        totalForecastedCogs: Number(totalForecastedCogs.toFixed(2)),
        totalForecastedGrossProfit: Number(
          totalForecastedGrossProfit.toFixed(2),
        ),
        overallGrossMarginPct: Number(overallGrossMarginPct.toFixed(2)),
      },
    };
  }
}
