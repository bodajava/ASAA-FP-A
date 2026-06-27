import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { TenantService } from '../common/services/tenant.service';
import { CreateKpiTargetDto } from './dto/create-kpi-target.dto';

@Injectable()
export class KpiTargetsService {
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

  async create(companyId: bigint, userId: bigint, dto: CreateKpiTargetDto) {
    return this.prisma.kpiTarget.create({
      data: {
        companyId,
        siteId: dto.siteId ? BigInt(dto.siteId) : null,
        kpiName: dto.kpiName,
        kpiCategory: (dto.kpiCategory as any) ?? 'financial',
        fiscalYear: dto.fiscalYear,
        periodMonth: dto.periodMonth ?? null,
        targetValue: dto.targetValue,
        unit: dto.unit,
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  async findAll(
    companyId: bigint,
    fiscalYear?: number,
    category?: string,
    siteId?: number,
  ) {
    const where: any = { companyId };
    if (fiscalYear) where.fiscalYear = fiscalYear;
    if (category) where.kpiCategory = category;
    if (siteId) where.siteId = BigInt(siteId);

    const rows = await this.prisma.kpiTarget.findMany({
      where,
      orderBy: [
        { fiscalYear: 'desc' },
        { kpiCategory: 'asc' },
        { kpiName: 'asc' },
      ],
      include: {
        site: { select: { id: true, name: true } },
      },
    });

    return rows.map((r) => ({
      id: this.s(r.id),
      kpiName: r.kpiName,
      kpiCategory: r.kpiCategory,
      fiscalYear: r.fiscalYear,
      periodMonth: r.periodMonth,
      targetValue: this.n(r.targetValue),
      unit: r.unit,
      site: r.site ? { id: this.s(r.site.id), name: r.site.name } : null,
    }));
  }

  async update(
    id: bigint,
    companyId: bigint,
    dto: Partial<CreateKpiTargetDto>,
    tenantId: bigint,
    userId: bigint,
  ) {
    await this.tenantService.ensureCompanyBelongsToTenant(companyId, tenantId);

    const existing = await this.prisma.kpiTarget.findFirst({
      where: { id, companyId },
    });
    if (!existing) throw new NotFoundException('KPI Target not found');

    const updated = await this.prisma.kpiTarget.update({
      where: { id },
      data: {
        kpiName: dto.kpiName,
        kpiCategory: dto.kpiCategory as any,
        fiscalYear: dto.fiscalYear,
        periodMonth: dto.periodMonth,
        targetValue: dto.targetValue,
        unit: dto.unit,
        updatedAt: new Date(),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        entityType: 'KpiTarget',
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

    const existing = await this.prisma.kpiTarget.findFirst({
      where: { id, companyId },
    });
    if (!existing) throw new NotFoundException('KPI Target not found');

    await this.prisma.kpiTarget.delete({ where: { id } });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        entityType: 'KpiTarget',
        entityId: id,
        action: 'delete',
        oldValues: JSON.stringify(existing),
      },
    });

    return existing;
  }
}
