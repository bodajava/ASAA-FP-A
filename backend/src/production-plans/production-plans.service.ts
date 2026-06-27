import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { TenantService } from '../common/services/tenant.service';
import { CreateProductionPlanDto } from './dto/create-production-plan.dto';
import { SaveFromExplosionDto } from './dto/save-from-explosion.dto';
import { PlanSource } from '@prisma/client';

@Injectable()
export class ProductionPlansService {
  constructor(
    private prisma: PrismaService,
    private readonly tenantService: TenantService,
  ) {}

  private s(v: any) {
    return v?.toString() ?? null;
  }
  private n(v: any) {
    return v == null ? 0 : Number(v);
  }

  async create(companyId: bigint, dto: CreateProductionPlanDto) {
    return this.prisma.productionPlan.create({
      data: {
        companyId,
        siteId: BigInt(dto.siteId),
        productId: BigInt(dto.productId),
        planSource: dto.planSource ?? PlanSource.manual,
        fiscalYear: dto.fiscalYear,
        periodMonth: dto.periodMonth,
        plannedQty: dto.plannedQty,
        actualQty: dto.actualQty ?? 0,
        estimatedCost: dto.estimatedCost ?? 0,
        actualCost: dto.actualCost ?? 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  async findAll(
    companyId: bigint,
    siteId?: number,
    fiscalYear?: number,
    periodMonth?: number,
  ) {
    const where: any = { companyId };
    if (siteId) where.siteId = BigInt(siteId);
    if (fiscalYear) where.fiscalYear = fiscalYear;
    if (periodMonth) where.periodMonth = periodMonth;

    const rows = await this.prisma.productionPlan.findMany({
      where,
      orderBy: [{ fiscalYear: 'desc' }, { periodMonth: 'asc' }],
      include: {
        site: { select: { id: true, name: true } },
        product: { select: { id: true, name: true, sku: true } },
      },
    });

    return rows.map((r) => ({
      id: this.s(r.id),
      companyId: this.s(r.companyId),
      siteId: this.s(r.siteId),
      productId: this.s(r.productId),
      planSource: r.planSource,
      fiscalYear: r.fiscalYear,
      periodMonth: r.periodMonth,
      plannedQty: this.n(r.plannedQty),
      actualQty: this.n(r.actualQty),
      estimatedCost: this.n(r.estimatedCost),
      actualCost: this.n(r.actualCost),
      site: r.site ? { id: this.s(r.site.id), name: r.site.name } : null,
      product: r.product
        ? { id: this.s(r.product.id), name: r.product.name, sku: r.product.sku }
        : null,
    }));
  }

  async update(
    id: bigint,
    companyId: bigint,
    dto: Partial<CreateProductionPlanDto>,
    tenantId: bigint,
    userId: bigint,
  ) {
    await this.tenantService.ensureCompanyBelongsToTenant(companyId, tenantId);

    const existing = await this.prisma.productionPlan.findFirst({
      where: { id, companyId },
    });
    if (!existing) throw new NotFoundException('Production Plan not found');

    const updateData: any = { updatedAt: new Date() };
    if (dto.plannedQty !== undefined) updateData.plannedQty = dto.plannedQty;
    if (dto.actualQty !== undefined) updateData.actualQty = dto.actualQty;
    if (dto.estimatedCost !== undefined)
      updateData.estimatedCost = dto.estimatedCost;
    if (dto.actualCost !== undefined) updateData.actualCost = dto.actualCost;
    if (dto.planSource !== undefined) updateData.planSource = dto.planSource;

    const updated = await this.prisma.productionPlan.update({
      where: { id },
      data: updateData,
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        entityType: 'ProductionPlan',
        entityId: id,
        action: 'update',
        oldValues: JSON.stringify(existing),
        newValues: JSON.stringify(updated),
      },
    });

    return updated;
  }

  async remove(
    id: bigint,
    companyId: bigint,
    tenantId: bigint,
    userId: bigint,
  ) {
    await this.tenantService.ensureCompanyBelongsToTenant(companyId, tenantId);

    const existing = await this.prisma.productionPlan.findFirst({
      where: { id, companyId },
    });
    if (!existing) throw new NotFoundException('Production Plan not found');

    await this.prisma.productionPlan.delete({ where: { id } });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        entityType: 'ProductionPlan',
        entityId: id,
        action: 'delete',
        oldValues: JSON.stringify(existing),
      },
    });

    return existing;
  }

  async saveFromExplosion(companyId: bigint, dto: SaveFromExplosionDto) {
    const siteId = BigInt(dto.siteId);

    // Validate site
    const site = await this.prisma.site.findFirst({
      where: { id: siteId, companyId },
    });
    if (!site) throw new NotFoundException('Site not found under this company');

    const results = [];
    for (const item of dto.items) {
      const productId = BigInt(item.productId);

      // Upsert production plan
      const row = await this.prisma.productionPlan.upsert({
        where: {
          companyId_siteId_productId_fiscalYear_periodMonth: {
            companyId,
            siteId,
            productId,
            fiscalYear: dto.fiscalYear,
            periodMonth: dto.periodMonth,
          },
        },
        update: {
          plannedQty: item.plannedQty,
          estimatedCost: item.estimatedCost,
          planSource: PlanSource.budget,
          updatedAt: new Date(),
        },
        create: {
          companyId,
          siteId,
          productId,
          fiscalYear: dto.fiscalYear,
          periodMonth: dto.periodMonth,
          plannedQty: item.plannedQty,
          estimatedCost: item.estimatedCost,
          planSource: PlanSource.budget,
          actualQty: 0,
          actualCost: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      results.push(row);
    }

    return { success: true, count: results.length };
  }

  async getVarianceReport(
    companyId: bigint,
    siteId?: number,
    fiscalYear?: number,
  ) {
    const where: any = { companyId };
    if (siteId) where.siteId = BigInt(siteId);
    if (fiscalYear) where.fiscalYear = fiscalYear;

    const rows = await this.prisma.productionPlan.findMany({
      where,
      include: {
        site: { select: { id: true, name: true } },
        product: { select: { id: true, name: true, sku: true } },
      },
      orderBy: [{ periodMonth: 'asc' }],
    });

    return rows.map((r) => {
      const plannedQty = this.n(r.plannedQty);
      const actualQty = this.n(r.actualQty);
      const estimatedCost = this.n(r.estimatedCost);
      const actualCost = this.n(r.actualCost);

      const qtyVariance = actualQty - plannedQty;
      const qtyVariancePct =
        plannedQty === 0 ? 0 : (qtyVariance / plannedQty) * 100;

      const costVariance = actualCost - estimatedCost;
      const costVariancePct =
        estimatedCost === 0 ? 0 : (costVariance / estimatedCost) * 100;

      return {
        id: this.s(r.id),
        site: r.site ? { id: this.s(r.site.id), name: r.site.name } : null,
        product: r.product
          ? {
              id: this.s(r.product.id),
              name: r.product.name,
              sku: r.product.sku,
            }
          : null,
        fiscalYear: r.fiscalYear,
        periodMonth: r.periodMonth,
        plannedQty,
        actualQty,
        qtyVariance,
        qtyVariancePct: Number(qtyVariancePct.toFixed(2)),
        estimatedCost,
        actualCost,
        costVariance,
        costVariancePct: Number(costVariancePct.toFixed(2)),
      };
    });
  }
}
