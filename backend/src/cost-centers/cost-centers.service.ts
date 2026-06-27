import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { TenantService } from '../common/services/tenant.service';
import { CreateCostCenterDto } from './dto/create-cost-center.dto';
import { UpdateCostCenterDto } from './dto/update-cost-center.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class CostCentersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantService: TenantService,
  ) {}

  async create(
    createCostCenterDto: CreateCostCenterDto,
    companyId: bigint,
    tenantId: bigint,
    userId: bigint,
  ) {
    await this.tenantService.ensureCompanyBelongsToTenant(companyId, tenantId);

    // Validate site ID if provided
    if (createCostCenterDto.siteId) {
      const siteId = BigInt(createCostCenterDto.siteId);
      const site = await this.prisma.site.findFirst({
        where: { id: siteId, companyId },
      });
      if (!site) {
        throw new BadRequestException('Site must belong to the same company');
      }
    }

    // Validate parent cost center ID if provided
    if (createCostCenterDto.parentId) {
      const parentId = BigInt(createCostCenterDto.parentId);
      const parentCC = await this.prisma.costCenter.findFirst({
        where: { id: parentId, companyId },
      });
      if (!parentCC) {
        throw new BadRequestException(
          'Parent cost center must belong to the same company',
        );
      }
    }

    const costCenter = await this.prisma.costCenter.create({
      data: {
        companyId,
        siteId: createCostCenterDto.siteId
          ? BigInt(createCostCenterDto.siteId)
          : null,
        parentId: createCostCenterDto.parentId
          ? BigInt(createCostCenterDto.parentId)
          : null,
        code: createCostCenterDto.code ?? null,
        name: createCostCenterDto.name,
        type: createCostCenterDto.type ?? 'other',
      },
    });

    // Write audit log
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        entityType: 'CostCenter',
        entityId: costCenter.id,
        action: 'create',
        newValues: JSON.stringify(costCenter),
      },
    });

    return costCenter;
  }

  async findAll(
    companyId: bigint,
    tenantId: bigint,
    paginationDto: PaginationDto,
  ) {
    await this.tenantService.ensureCompanyBelongsToTenant(companyId, tenantId);

    const page = paginationDto.page ?? 1;
    const limit = paginationDto.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Prisma.CostCenterWhereInput = {
      companyId,
    };

    if (paginationDto.search) {
      where.OR = [
        { name: { contains: paginationDto.search } },
        { code: { contains: paginationDto.search } },
      ];
    }

    const [total, data] = await Promise.all([
      this.prisma.costCenter.count({ where }),
      this.prisma.costCenter.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          site: {
            select: {
              id: true,
              name: true,
            },
          },
          parent: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
        },
      }),
    ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data,
    };
  }

  async findOne(id: bigint, companyId: bigint, tenantId: bigint) {
    await this.tenantService.ensureCompanyBelongsToTenant(companyId, tenantId);

    const costCenter = await this.prisma.costCenter.findFirst({
      where: { id, companyId },
      include: {
        site: {
          select: {
            id: true,
            name: true,
          },
        },
        parent: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        children: {
          select: {
            id: true,
            code: true,
            name: true,
            type: true,
          },
        },
      },
    });

    if (!costCenter) {
      throw new NotFoundException(
        `Cost center with ID ${id} not found under this company`,
      );
    }

    return costCenter;
  }

  async update(
    id: bigint,
    updateCostCenterDto: UpdateCostCenterDto,
    companyId: bigint,
    tenantId: bigint,
    userId: bigint,
  ) {
    const oldCC = await this.findOne(id, companyId, tenantId);

    // Validate site ID if provided
    if (updateCostCenterDto.siteId) {
      const siteId = BigInt(updateCostCenterDto.siteId);
      const site = await this.prisma.site.findFirst({
        where: { id: siteId, companyId },
      });
      if (!site) {
        throw new BadRequestException('Site must belong to the same company');
      }
    }

    // Validate parent cost center ID if provided
    if (updateCostCenterDto.parentId) {
      const parentId = BigInt(updateCostCenterDto.parentId);
      if (parentId === id) {
        throw new BadRequestException('A cost center cannot be its own parent');
      }
      const parentCC = await this.prisma.costCenter.findFirst({
        where: { id: parentId, companyId },
      });
      if (!parentCC) {
        throw new BadRequestException(
          'Parent cost center must belong to the same company',
        );
      }
    }

    const updatedCC = await this.prisma.costCenter.update({
      where: { id },
      data: {
        siteId: updateCostCenterDto.siteId
          ? BigInt(updateCostCenterDto.siteId)
          : undefined,
        parentId: updateCostCenterDto.parentId
          ? BigInt(updateCostCenterDto.parentId)
          : undefined,
        code: updateCostCenterDto.code,
        name: updateCostCenterDto.name,
        type: updateCostCenterDto.type,
      },
    });

    // Write audit log
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        entityType: 'CostCenter',
        entityId: id,
        action: 'update',
        oldValues: JSON.stringify(oldCC),
        newValues: JSON.stringify(updatedCC),
      },
    });

    return updatedCC;
  }

  async remove(
    id: bigint,
    companyId: bigint,
    tenantId: bigint,
    userId: bigint,
  ) {
    const oldCC = await this.findOne(id, companyId, tenantId);

    // Prevent deletion if it has child cost centers
    if (oldCC.children.length > 0) {
      throw new BadRequestException(
        'Cannot delete cost center with sub-cost centers',
      );
    }

    const deletedCC = await this.prisma.costCenter.delete({
      where: { id },
    });

    // Write audit log
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        entityType: 'CostCenter',
        entityId: id,
        action: 'delete',
        oldValues: JSON.stringify(deletedCC),
      },
    });

    return deletedCC;
  }
}
