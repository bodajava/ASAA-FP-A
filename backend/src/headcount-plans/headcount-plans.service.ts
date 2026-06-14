import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateHeadcountPlanDto } from './dto/create-headcount-plan.dto';

@Injectable()
export class HeadcountPlansService {
  constructor(private prisma: PrismaService) {}

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

  private toNumber(v: any) {
    return v == null ? 0 : Number(v);
  }
  private toStr(v: any) {
    return v == null ? null : v.toString();
  }

  private async verifyBudgetCycleScope(
    companyId: bigint,
    budgetCycleId: bigint,
  ) {
    const cycle = await this.prisma.budgetCycle.findFirst({
      where: { id: budgetCycleId, companyId },
    });
    if (!cycle) {
      throw new BadRequestException(
        'Budget cycle not found or does not belong to your company',
      );
    }
  }

  async create(companyId: bigint, dto: CreateHeadcountPlanDto) {
    const budgetCycleId = /^\d+$/.test(String(dto.budgetCycleId))
      ? BigInt(dto.budgetCycleId)
      : null;
    if (!budgetCycleId) {
      throw new BadRequestException(
        'budgetCycleId is required and must be a valid ID',
      );
    }

    await this.verifyBudgetCycleScope(companyId, budgetCycleId);

    const headcount = dto.headcount ?? 1;
    const basicSalary = dto.basicSalary ?? 0;
    const allowances = dto.allowances ?? 0;
    const socialInsurance = dto.socialInsurance ?? 0;
    const totalCost = (basicSalary + allowances + socialInsurance) * headcount;

    return this.prisma.headcountPlan.create({
      data: {
        budgetCycleId,
        siteId:
          dto.siteId && /^\d+$/.test(String(dto.siteId))
            ? BigInt(dto.siteId)
            : null,
        costCenterId:
          dto.costCenterId && /^\d+$/.test(String(dto.costCenterId))
            ? BigInt(dto.costCenterId)
            : null,
        jobTitle: dto.jobTitle,
        department: dto.department,
        employmentType: (dto.employmentType as any) ?? 'full_time',
        headcount,
        periodMonth: dto.periodMonth,
        basicSalary,
        allowances,
        socialInsurance,
        totalCost,
        notes: dto.notes,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      include: {
        site: { select: { id: true, name: true } },
        costCenter: { select: { id: true, name: true } },
      },
    });
  }

  async findByCycle(companyId: bigint, budgetCycleId: bigint) {
    await this.verifyBudgetCycleScope(companyId, budgetCycleId);

    const rows = await this.prisma.headcountPlan.findMany({
      where: { budgetCycleId },
      orderBy: [{ periodMonth: 'asc' }, { jobTitle: 'asc' }],
      include: {
        site: { select: { id: true, name: true } },
        costCenter: { select: { id: true, name: true } },
      },
    });

    return rows.map((r) => ({
      id: this.toStr(r.id),
      budgetCycleId: this.toStr(r.budgetCycleId),
      siteId: this.toStr(r.siteId),
      costCenterId: this.toStr(r.costCenterId),
      jobTitle: r.jobTitle,
      department: r.department,
      employmentType: r.employmentType,
      headcount: r.headcount,
      periodMonth: r.periodMonth,
      basicSalary: this.toNumber(r.basicSalary),
      allowances: this.toNumber(r.allowances),
      socialInsurance: this.toNumber(r.socialInsurance),
      totalCost: this.toNumber(r.totalCost),
      notes: r.notes,
      site: r.site ? { id: this.toStr(r.site.id), name: r.site.name } : null,
      costCenter: r.costCenter
        ? { id: this.toStr(r.costCenter.id), name: r.costCenter.name }
        : null,
    }));
  }

  async getSummary(companyId: bigint, budgetCycleId: bigint) {
    await this.verifyBudgetCycleScope(companyId, budgetCycleId);

    const rows = await this.prisma.headcountPlan.findMany({
      where: { budgetCycleId },
      select: {
        periodMonth: true,
        headcount: true,
        totalCost: true,
        employmentType: true,
        department: true,
        site: { select: { name: true } },
      },
    });

    const monthlyMap: Record<number, { headcount: number; totalCost: number }> =
      {};
    let grandTotal = 0;
    let grandHeadcount = 0;

    for (const r of rows) {
      const m = r.periodMonth;
      if (!monthlyMap[m]) monthlyMap[m] = { headcount: 0, totalCost: 0 };
      monthlyMap[m].headcount += r.headcount ?? 0;
      monthlyMap[m].totalCost += this.toNumber(r.totalCost);
      grandTotal += this.toNumber(r.totalCost);
      grandHeadcount += r.headcount ?? 0;
    }

    const monthly = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      headcount: monthlyMap[i + 1]?.headcount ?? 0,
      totalCost: monthlyMap[i + 1]?.totalCost ?? 0,
    }));

    const deptMap: Record<string, number> = {};
    for (const r of rows) {
      const dept = r.department ?? 'Other';
      deptMap[dept] = (deptMap[dept] ?? 0) + this.toNumber(r.totalCost);
    }

    return {
      grandTotalCost: grandTotal,
      grandHeadcount,
      monthly,
      byDepartment: Object.entries(deptMap).map(([dept, cost]) => ({
        dept,
        cost,
      })),
    };
  }

  async update(
    companyId: bigint,
    id: bigint,
    dto: Partial<CreateHeadcountPlanDto>,
    tenantId: bigint,
    userId: bigint,
  ) {
    await this.ensureCompanyBelongsToTenant(companyId, tenantId);

    const existing = await this.prisma.headcountPlan.findUnique({
      where: { id },
      include: { budgetCycle: { select: { companyId: true } } },
    });
    if (!existing) throw new NotFoundException('Headcount plan not found');
    if (existing.budgetCycle.companyId !== companyId) {
      throw new NotFoundException('Headcount plan not found');
    }

    const headcount = dto.headcount ?? existing.headcount ?? 1;
    const basicSalary = dto.basicSalary ?? this.toNumber(existing.basicSalary);
    const allowances = dto.allowances ?? this.toNumber(existing.allowances);
    const socialInsurance =
      dto.socialInsurance ?? this.toNumber(existing.socialInsurance);
    const totalCost = (basicSalary + allowances + socialInsurance) * headcount;

    const updated = await this.prisma.headcountPlan.update({
      where: { id },
      data: {
        jobTitle: dto.jobTitle,
        department: dto.department,
        employmentType: dto.employmentType as any,
        headcount,
        periodMonth: dto.periodMonth,
        basicSalary,
        allowances,
        socialInsurance,
        totalCost,
        notes: dto.notes,
        updatedAt: new Date(),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        entityType: 'HeadcountPlan',
        entityId: id,
        action: 'update',
        oldValues: JSON.stringify(existing),
        newValues: JSON.stringify(updated),
      },
    });

    return updated;
  }

  async remove(
    companyId: bigint,
    id: bigint,
    tenantId: bigint,
    userId: bigint,
  ) {
    await this.ensureCompanyBelongsToTenant(companyId, tenantId);

    const existing = await this.prisma.headcountPlan.findUnique({
      where: { id },
      include: { budgetCycle: { select: { companyId: true } } },
    });
    if (!existing) throw new NotFoundException('Headcount plan not found');
    if (existing.budgetCycle.companyId !== companyId) {
      throw new NotFoundException('Headcount plan not found');
    }

    await this.prisma.headcountPlan.delete({ where: { id } });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        entityType: 'HeadcountPlan',
        entityId: id,
        action: 'delete',
        oldValues: JSON.stringify(existing),
      },
    });

    return existing;
  }
}
