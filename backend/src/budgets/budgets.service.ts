import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  Prisma,
  BudgetCycle,
  BudgetLine,
  CycleStatus,
  PeriodType,
} from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateBudgetCycleDto } from './dto/create-budget-cycle.dto';
import { UpdateBudgetCycleDto } from './dto/update-budget-cycle.dto';
import { UpdateBudgetStatusDto } from './dto/update-budget-status.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

export type QueryBudgetCycle = BudgetCycle & {
  budgetLines: BudgetLine[];
};

export interface BudgetLineResponseDto {
  id: string;
  budgetCycleId: string;
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
  notes: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface BudgetCycleResponseDto {
  id: string;
  companyId: string;
  name: string;
  fiscalYear: number;
  periodType: PeriodType | null;
  version: number | null;
  status: CycleStatus | null;
  createdBy: string | null;
  approvedBy: string | null;
  approvedAt: Date | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  budgetLines?: BudgetLineResponseDto[];
}

export function mapBudgetCycleToResponse(
  cycle: QueryBudgetCycle,
  allowedSiteIds?: bigint[] | null,
): BudgetCycleResponseDto {
  let lines = cycle.budgetLines || [];
  if (allowedSiteIds !== undefined && allowedSiteIds !== null) {
    lines = lines.filter(
      (line) => line.siteId !== null && allowedSiteIds.includes(line.siteId),
    );
  }

  const mappedLines = lines.map((line) => ({
    id: line.id.toString(),
    budgetCycleId: line.budgetCycleId.toString(),
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
    notes: line.notes,
    createdAt: line.createdAt,
    updatedAt: line.updatedAt,
  }));

  return {
    id: cycle.id.toString(),
    companyId: cycle.companyId.toString(),
    name: cycle.name,
    fiscalYear: cycle.fiscalYear,
    periodType: cycle.periodType,
    version: cycle.version,
    status: cycle.status,
    createdBy: cycle.createdBy ? cycle.createdBy.toString() : null,
    approvedBy: cycle.approvedBy ? cycle.approvedBy.toString() : null,
    approvedAt: cycle.approvedAt,
    createdAt: cycle.createdAt,
    updatedAt: cycle.updatedAt,
    budgetLines: mappedLines,
  };
}

@Injectable()
export class BudgetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private async ensureCompanyBelongsToTenant(
    companyId: bigint,
    tenantId: bigint,
  ) {
    const company = await this.prisma.company.findFirst({
      where: { id: companyId, tenantId },
    });
    if (!company) {
      throw new NotFoundException(`Company not found under this tenant`);
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

    // Validate accounts
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

    // Validate sites
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

    // Validate cost centers
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

    // Validate products
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

    // Validate materials
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

    // Validate customers
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
    createDto: CreateBudgetCycleDto,
    companyId: bigint,
    tenantId: bigint,
    userId: bigint,
  ): Promise<BudgetCycleResponseDto> {
    await this.ensureCompanyBelongsToTenant(companyId, tenantId);

    // Validate references in lines
    if (createDto.budgetLines) {
      await this.validateLineReferences(createDto.budgetLines, companyId);
    }

    const cycle = await this.prisma.$transaction(async (tx) => {
      const createdCycle = await tx.budgetCycle.create({
        data: {
          companyId,
          name: createDto.name,
          fiscalYear: createDto.fiscalYear,
          periodType: createDto.periodType,
          version: createDto.version ?? 1,
          status: 'draft',
          createdBy: userId,
        },
      });

      if (createDto.budgetLines && createDto.budgetLines.length > 0) {
        await tx.budgetLine.createMany({
          data: createDto.budgetLines.map((line) => ({
            budgetCycleId: createdCycle.id,
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
            notes: line.notes,
          })),
        });
      }

      return createdCycle;
    });

    const fullCycle = await this.prisma.budgetCycle.findUnique({
      where: { id: cycle.id },
      include: { budgetLines: true },
    });

    if (!fullCycle) {
      throw new NotFoundException('Failed to retrieve created budget cycle');
    }

    // Write audit log
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        entityType: 'BudgetCycle',
        entityId: cycle.id,
        action: 'create',
        newValues: JSON.parse(
          JSON.stringify(fullCycle),
        ) as Prisma.InputJsonValue,
      },
    });

    return mapBudgetCycleToResponse(fullCycle);
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

    const where: Prisma.BudgetCycleWhereInput = {
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
        where.name = { contains: paginationDto.search };
      }
    }

    const [total, data] = await Promise.all([
      this.prisma.budgetCycle.count({ where }),
      this.prisma.budgetCycle.findMany({
        where,
        skip,
        take: limit,
        orderBy: { fiscalYear: 'desc' },
        include: { budgetLines: true },
      }),
    ]);

    const allowedSiteIds = userId
      ? await this.getManagedSiteIdsForUser(userId, roleName)
      : null;

    const mappedData = data.map((cycle) =>
      mapBudgetCycleToResponse(cycle, allowedSiteIds),
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
  ): Promise<BudgetCycleResponseDto> {
    await this.ensureCompanyBelongsToTenant(companyId, tenantId);

    const cycle = await this.prisma.budgetCycle.findFirst({
      where: { id, companyId },
      include: { budgetLines: true },
    });

    if (!cycle) {
      throw new NotFoundException(
        `Budget cycle with ID ${id} not found under this company`,
      );
    }

    const allowedSiteIds = userId
      ? await this.getManagedSiteIdsForUser(userId, roleName)
      : null;

    return mapBudgetCycleToResponse(cycle, allowedSiteIds);
  }

  async update(
    id: bigint,
    updateDto: UpdateBudgetCycleDto,
    companyId: bigint,
    tenantId: bigint,
    userId: bigint,
  ): Promise<BudgetCycleResponseDto> {
    // 1. Check if cycle exists and belongs to active company
    const oldCycle = await this.prisma.budgetCycle.findFirst({
      where: { id, companyId },
      include: { budgetLines: true },
    });
    if (!oldCycle) {
      throw new NotFoundException(
        `Budget cycle with ID ${id} not found under this company`,
      );
    }

    // 2. Reject editing if approved or locked
    if (oldCycle.status === 'approved' || oldCycle.status === 'locked') {
      throw new BadRequestException(
        `Cannot edit approved or locked budget cycles. Current status is ${oldCycle.status}`,
      );
    }

    // 3. Validate references in lines if updated
    if (updateDto.budgetLines) {
      await this.validateLineReferences(updateDto.budgetLines, companyId);
    }

    // 4. Update cycle and its lines in a transaction
    const updatedCycle = await this.prisma.$transaction(async (tx) => {
      const cycle = await tx.budgetCycle.update({
        where: { id },
        data: {
          name: updateDto.name,
          fiscalYear: updateDto.fiscalYear,
          periodType: updateDto.periodType,
          version: updateDto.version,
        },
      });

      if (updateDto.budgetLines) {
        // Drop old lines and recreate new ones
        await tx.budgetLine.deleteMany({
          where: { budgetCycleId: id },
        });

        if (updateDto.budgetLines.length > 0) {
          await tx.budgetLine.createMany({
            data: updateDto.budgetLines.map((line) => ({
              budgetCycleId: id,
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
              notes: line.notes,
            })),
          });
        }
      }

      return cycle;
    });

    const fullCycle = await this.prisma.budgetCycle.findUnique({
      where: { id: updatedCycle.id },
      include: { budgetLines: true },
    });

    if (!fullCycle) {
      throw new NotFoundException('Failed to retrieve updated budget cycle');
    }

    // Write audit log
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        entityType: 'BudgetCycle',
        entityId: id,
        action: 'update',
        oldValues: JSON.parse(
          JSON.stringify(oldCycle),
        ) as Prisma.InputJsonValue,
        newValues: JSON.parse(
          JSON.stringify(fullCycle),
        ) as Prisma.InputJsonValue,
      },
    });

    return mapBudgetCycleToResponse(fullCycle);
  }

  async remove(
    id: bigint,
    companyId: bigint,
    tenantId: bigint,
    userId: bigint,
  ): Promise<BudgetCycleResponseDto> {
    const cycle = await this.findOne(id, companyId, tenantId);

    // Reject removing if approved or locked
    if (cycle.status === 'approved' || cycle.status === 'locked') {
      throw new BadRequestException(
        `Cannot delete approved or locked budget cycles. Current status is ${cycle.status}`,
      );
    }

    await this.prisma.budgetCycle.delete({
      where: { id },
    });

    // Write audit log
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        entityType: 'BudgetCycle',
        entityId: id,
        action: 'delete',
        oldValues: JSON.parse(JSON.stringify(cycle)) as Prisma.InputJsonValue,
      },
    });

    return cycle;
  }

  async updateStatus(
    id: bigint,
    statusDto: UpdateBudgetStatusDto,
    companyId: bigint,
    tenantId: bigint,
    userId: bigint,
  ): Promise<BudgetCycleResponseDto> {
    await this.ensureCompanyBelongsToTenant(companyId, tenantId);

    const oldCycle = await this.prisma.budgetCycle.findFirst({
      where: { id, companyId },
      include: { budgetLines: true },
    });
    if (!oldCycle) {
      throw new NotFoundException(
        `Budget cycle with ID ${id} not found under this company`,
      );
    }

    const currentStatus = oldCycle.status;
    const targetStatus = statusDto.status;

    if (currentStatus === targetStatus) {
      return mapBudgetCycleToResponse(oldCycle);
    }

    if (currentStatus === 'locked') {
      throw new BadRequestException(
        'Locked budget cycles cannot be modified or transitioned',
      );
    }

    if (targetStatus === 'locked' && currentStatus !== 'approved') {
      throw new BadRequestException(
        'Only approved budget cycles can be locked',
      );
    }

    let approvedBy: bigint | null = oldCycle.approvedBy;
    let approvedAt: Date | null = oldCycle.approvedAt;
    if (targetStatus === 'approved') {
      approvedBy = userId;
      approvedAt = new Date();
    }

    const updatedCycle = await this.prisma.budgetCycle.update({
      where: { id },
      data: {
        status: targetStatus,
        approvedBy,
        approvedAt,
      },
      include: { budgetLines: true },
    });

    // Write audit log
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        entityType: 'BudgetCycle',
        entityId: id,
        action: 'status_change',
        oldValues: JSON.parse(
          JSON.stringify(oldCycle),
        ) as Prisma.InputJsonValue,
        newValues: JSON.parse(
          JSON.stringify(updatedCycle),
        ) as Prisma.InputJsonValue,
      },
    });

    if (targetStatus === 'approved') {
      await this.notificationsService
        .triggerBudgetApproval(companyId, tenantId, id, updatedCycle.name)
        .catch(() => {});
    }

    return mapBudgetCycleToResponse(updatedCycle);
  }
}
