import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CreateMaterialDto } from './dto/create-material.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class MaterialsService {
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
    createMaterialDto: CreateMaterialDto,
    companyId: bigint,
    tenantId: bigint,
    userId: bigint,
  ) {
    await this.ensureCompanyBelongsToTenant(companyId, tenantId);

    // Validate code uniqueness in this company
    const codeExists = await this.prisma.material.findFirst({
      where: { companyId, code: createMaterialDto.code },
    });
    if (codeExists) {
      throw new BadRequestException(
        `Material code "${createMaterialDto.code}" already exists in this company`,
      );
    }

    // Validate supplier belongs to same company
    if (createMaterialDto.supplierId) {
      const supplierId = BigInt(createMaterialDto.supplierId);
      const supplier = await this.prisma.supplier.findFirst({
        where: { id: supplierId, companyId },
      });
      if (!supplier) {
        throw new BadRequestException(
          'Supplier must belong to the same company',
        );
      }
    }

    // Validate unit belongs to same company
    if (createMaterialDto.unitId) {
      const unitId = BigInt(createMaterialDto.unitId);
      const unit = await this.prisma.unit.findFirst({
        where: { id: unitId, companyId },
      });
      if (!unit) {
        throw new BadRequestException(
          'Unit of measurement must belong to the same company',
        );
      }
    }

    const material = await this.prisma.material.create({
      data: {
        companyId,
        code: createMaterialDto.code,
        name: createMaterialDto.name,
        supplierId: createMaterialDto.supplierId
          ? BigInt(createMaterialDto.supplierId)
          : null,
        unitId: createMaterialDto.unitId
          ? BigInt(createMaterialDto.unitId)
          : null,
        purchasePrice: createMaterialDto.purchasePrice ?? 0,
        safetyStockQty: createMaterialDto.safetyStockQty ?? 0,
        isActive: createMaterialDto.isActive ?? true,
      },
    });

    // Write audit log
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        entityType: 'Material',
        entityId: material.id,
        action: 'create',
        newValues: JSON.parse(
          JSON.stringify(material),
        ) as Prisma.InputJsonValue,
      },
    });

    return material;
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

    const where: Prisma.MaterialWhereInput = {
      companyId,
    };

    if (paginationDto.search) {
      where.OR = [
        { name: { contains: paginationDto.search } },
        { code: { contains: paginationDto.search } },
      ];
    }

    const [total, data] = await Promise.all([
      this.prisma.material.count({ where }),
      this.prisma.material.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          supplier: {
            select: {
              id: true,
              name: true,
            },
          },
          unit: {
            select: {
              id: true,
              name: true,
              symbol: true,
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
    await this.ensureCompanyBelongsToTenant(companyId, tenantId);

    const material = await this.prisma.material.findFirst({
      where: { id, companyId },
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
          },
        },
        unit: {
          select: {
            id: true,
            name: true,
            symbol: true,
          },
        },
      },
    });

    if (!material) {
      throw new NotFoundException(
        `Material with ID ${id} not found under this company`,
      );
    }

    return material;
  }

  async update(
    id: bigint,
    updateMaterialDto: UpdateMaterialDto,
    companyId: bigint,
    tenantId: bigint,
    userId: bigint,
  ) {
    const oldMaterial = await this.findOne(id, companyId, tenantId);

    // Validate code uniqueness if updated
    if (updateMaterialDto.code && updateMaterialDto.code !== oldMaterial.code) {
      const codeExists = await this.prisma.material.findFirst({
        where: { companyId, code: updateMaterialDto.code },
      });
      if (codeExists) {
        throw new BadRequestException(
          `Material code "${updateMaterialDto.code}" already exists in this company`,
        );
      }
    }

    // Validate supplier belongs to same company
    if (updateMaterialDto.supplierId) {
      const supplierId = BigInt(updateMaterialDto.supplierId);
      const supplier = await this.prisma.supplier.findFirst({
        where: { id: supplierId, companyId },
      });
      if (!supplier) {
        throw new BadRequestException(
          'Supplier must belong to the same company',
        );
      }
    }

    // Validate unit belongs to same company
    if (updateMaterialDto.unitId) {
      const unitId = BigInt(updateMaterialDto.unitId);
      const unit = await this.prisma.unit.findFirst({
        where: { id: unitId, companyId },
      });
      if (!unit) {
        throw new BadRequestException(
          'Unit of measurement must belong to the same company',
        );
      }
    }

    const updatedMaterial = await this.prisma.material.update({
      where: { id },
      data: {
        code: updateMaterialDto.code,
        name: updateMaterialDto.name,
        supplierId: updateMaterialDto.supplierId
          ? BigInt(updateMaterialDto.supplierId)
          : undefined,
        unitId: updateMaterialDto.unitId
          ? BigInt(updateMaterialDto.unitId)
          : undefined,
        purchasePrice: updateMaterialDto.purchasePrice,
        safetyStockQty: updateMaterialDto.safetyStockQty,
        isActive: updateMaterialDto.isActive,
      },
    });

    // Write audit log
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        entityType: 'Material',
        entityId: id,
        action: 'update',
        oldValues: JSON.parse(
          JSON.stringify(oldMaterial),
        ) as Prisma.InputJsonValue,
        newValues: JSON.parse(
          JSON.stringify(updatedMaterial),
        ) as Prisma.InputJsonValue,
      },
    });

    return updatedMaterial;
  }

  async remove(
    id: bigint,
    companyId: bigint,
    tenantId: bigint,
    userId: bigint,
  ) {
    await this.findOne(id, companyId, tenantId);

    const deletedMaterial = await this.prisma.material.delete({
      where: { id },
    });

    // Write audit log
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        entityType: 'Material',
        entityId: id,
        action: 'delete',
        oldValues: JSON.parse(
          JSON.stringify(deletedMaterial),
        ) as Prisma.InputJsonValue,
      },
    });

    return deletedMaterial;
  }
}
