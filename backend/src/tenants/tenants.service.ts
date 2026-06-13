import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createTenantDto: CreateTenantDto, userId?: bigint) {
    const { planId, trialEndsAt, ...rest } = createTenantDto;

    const parsedPlanId = planId ? BigInt(planId) : null;
    const parsedTrialEndsAt = trialEndsAt ? new Date(trialEndsAt) : null;

    const tenant = await this.prisma.tenant.create({
      data: {
        name: rest.name,
        slug: rest.slug,
        status: rest.status,
        planId: parsedPlanId,
        trialEndsAt: parsedTrialEndsAt,
      },
    });

    // Write audit log for tenant creation
    await this.prisma.auditLog.create({
      data: {
        tenantId: tenant.id,
        userId: userId ?? null,
        entityType: 'Tenant',
        entityId: tenant.id,
        action: 'create',
        newValues: JSON.stringify(tenant),
      },
    });

    return tenant;
  }

  async findAll() {
    return this.prisma.tenant.findMany();
  }

  async findPlans() {
    return this.prisma.plan.findMany({
      where: { isActive: true },
    });
  }

  async findOne(id: bigint) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
    });
    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${id} not found`);
    }
    return tenant;
  }

  async findCurrentTenant(id: bigint) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: { plan: true },
    });
    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${id} not found`);
    }
    return tenant;
  }

  async update(id: bigint, updateTenantDto: UpdateTenantDto, userId?: bigint) {
    // Check if tenant exists
    await this.findOne(id);

    const { planId, trialEndsAt, ...rest } = updateTenantDto;

    const data: Prisma.TenantUpdateInput = {};
    if (rest.name !== undefined) data.name = rest.name;
    if (rest.slug !== undefined) data.slug = rest.slug;
    if (rest.status !== undefined) data.status = rest.status;
    if (planId !== undefined) {
      data.plan = planId
        ? { connect: { id: BigInt(planId) } }
        : { disconnect: true };
    }
    if (trialEndsAt !== undefined) {
      data.trialEndsAt = trialEndsAt ? new Date(trialEndsAt) : null;
    }

    const updatedTenant = await this.prisma.tenant.update({
      where: { id },
      data,
    });

    // Write audit log for tenant update
    await this.prisma.auditLog.create({
      data: {
        tenantId: id,
        userId: userId ?? null,
        entityType: 'Tenant',
        entityId: id,
        action: 'update',
        newValues: JSON.stringify(updatedTenant),
      },
    });

    return updatedTenant;
  }

  async remove(id: bigint, userId?: bigint) {
    // Check if tenant exists
    await this.findOne(id);

    const deletedTenant = await this.prisma.tenant.delete({
      where: { id },
    });

    // Write audit log for tenant deletion
    await this.prisma.auditLog.create({
      data: {
        tenantId: id,
        userId: userId ?? null,
        entityType: 'Tenant',
        entityId: id,
        action: 'delete',
        oldValues: JSON.stringify(deletedTenant),
      },
    });

    return deletedTenant;
  }
}
