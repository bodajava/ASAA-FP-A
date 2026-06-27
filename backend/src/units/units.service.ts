import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { TenantService } from '../common/services/tenant.service';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class UnitsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantService: TenantService,
  ) {}

  async create(
    createUnitDto: CreateUnitDto,
    companyId: bigint,
    tenantId: bigint,
    userId: bigint,
  ) {
    await this.tenantService.ensureCompanyBelongsToTenant(companyId, tenantId);

    const unit = await this.prisma.unit.create({
      data: {
        companyId,
        name: createUnitDto.name,
        symbol: createUnitDto.symbol,
      },
    });

    // Write audit log
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        entityType: 'Unit',
        entityId: unit.id,
        action: 'create',
        newValues: JSON.stringify(unit),
      },
    });

    return unit;
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

    const where: Prisma.UnitWhereInput = {
      companyId,
    };

    if (paginationDto.search) {
      where.OR = [
        { name: { contains: paginationDto.search } },
        { symbol: { contains: paginationDto.search } },
      ];
    }

    const [total, data] = await Promise.all([
      this.prisma.unit.count({ where }),
      this.prisma.unit.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
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

    const unit = await this.prisma.unit.findFirst({
      where: { id, companyId },
    });

    if (!unit) {
      throw new NotFoundException(
        `Unit with ID ${id} not found under this company`,
      );
    }

    return unit;
  }

  async update(
    id: bigint,
    updateUnitDto: UpdateUnitDto,
    companyId: bigint,
    tenantId: bigint,
    userId: bigint,
  ) {
    const oldUnit = await this.findOne(id, companyId, tenantId);

    const updatedUnit = await this.prisma.unit.update({
      where: { id },
      data: {
        name: updateUnitDto.name,
        symbol: updateUnitDto.symbol,
      },
    });

    // Write audit log
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        entityType: 'Unit',
        entityId: id,
        action: 'update',
        oldValues: JSON.stringify(oldUnit),
        newValues: JSON.stringify(updatedUnit),
      },
    });

    return updatedUnit;
  }

  async remove(
    id: bigint,
    companyId: bigint,
    tenantId: bigint,
    userId: bigint,
  ) {
    await this.findOne(id, companyId, tenantId);

    const deletedUnit = await this.prisma.unit.delete({
      where: { id },
    });

    // Write audit log
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        entityType: 'Unit',
        entityId: id,
        action: 'delete',
        oldValues: JSON.stringify(deletedUnit),
      },
    });

    return deletedUnit;
  }
}
