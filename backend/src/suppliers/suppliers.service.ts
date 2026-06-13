import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

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

  async create(
    createSupplierDto: CreateSupplierDto,
    companyId: bigint,
    tenantId: bigint,
    userId: bigint,
  ) {
    await this.ensureCompanyBelongsToTenant(companyId, tenantId);

    const supplier = await this.prisma.supplier.create({
      data: {
        companyId,
        name: createSupplierDto.name,
        phone: createSupplierDto.phone ?? null,
        email: createSupplierDto.email ?? null,
      },
    });

    // Write audit log
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        entityType: 'Supplier',
        entityId: supplier.id,
        action: 'create',
        newValues: JSON.parse(
          JSON.stringify(supplier),
        ) as Prisma.InputJsonValue,
      },
    });

    return supplier;
  }

  async findAll(
    companyId: bigint,
    tenantId: bigint,
    paginationDto: PaginationDto,
  ) {
    await this.ensureCompanyBelongsToTenant(companyId, tenantId);

    const page = paginationDto.page ?? 1;
    const limit = paginationDto.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Prisma.SupplierWhereInput = {
      companyId,
    };

    if (paginationDto.search) {
      where.OR = [
        { name: { contains: paginationDto.search } },
        { email: { contains: paginationDto.search } },
        { phone: { contains: paginationDto.search } },
      ];
    }

    const [total, data] = await Promise.all([
      this.prisma.supplier.count({ where }),
      this.prisma.supplier.findMany({
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
    await this.ensureCompanyBelongsToTenant(companyId, tenantId);

    const supplier = await this.prisma.supplier.findFirst({
      where: { id, companyId },
    });

    if (!supplier) {
      throw new NotFoundException(
        `Supplier with ID ${id} not found under this company`,
      );
    }

    return supplier;
  }

  async update(
    id: bigint,
    updateSupplierDto: UpdateSupplierDto,
    companyId: bigint,
    tenantId: bigint,
    userId: bigint,
  ) {
    const oldSupplier = await this.findOne(id, companyId, tenantId);

    const updatedSupplier = await this.prisma.supplier.update({
      where: { id },
      data: {
        name: updateSupplierDto.name,
        phone: updateSupplierDto.phone,
        email: updateSupplierDto.email,
      },
    });

    // Write audit log
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        entityType: 'Supplier',
        entityId: id,
        action: 'update',
        oldValues: JSON.parse(
          JSON.stringify(oldSupplier),
        ) as Prisma.InputJsonValue,
        newValues: JSON.parse(
          JSON.stringify(updatedSupplier),
        ) as Prisma.InputJsonValue,
      },
    });

    return updatedSupplier;
  }

  async remove(
    id: bigint,
    companyId: bigint,
    tenantId: bigint,
    userId: bigint,
  ) {
    await this.findOne(id, companyId, tenantId);

    const deletedSupplier = await this.prisma.supplier.delete({
      where: { id },
    });

    // Write audit log
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        entityType: 'Supplier',
        entityId: id,
        action: 'delete',
        oldValues: JSON.parse(
          JSON.stringify(deletedSupplier),
        ) as Prisma.InputJsonValue,
      },
    });

    return deletedSupplier;
  }
}
