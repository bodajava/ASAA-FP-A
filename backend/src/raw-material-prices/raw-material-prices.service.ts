import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CreateRawMaterialPriceDto } from './dto/create-raw-material-price.dto';
import { UpdateRawMaterialPricesDto } from './dto/update-raw-material-prices.dto';

@Injectable()
export class RawMaterialPricesService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureCompanyBelongsToTenant(
    companyId: bigint,
    tenantId: bigint,
  ) {
    const company = await this.prisma.company.findFirst({
      where: { id: companyId, tenantId },
    });
    if (!company) {
      throw new NotFoundException('Company not found under this tenant');
    }
  }

  private async ensureMaterialBelongsToCompany(
    materialId: bigint,
    companyId: bigint,
  ) {
    const material = await this.prisma.material.findFirst({
      where: { id: materialId, companyId },
    });
    if (!material) {
      throw new BadRequestException('Material must belong to the same company');
    }
    return material;
  }

  async create(
    dto: CreateRawMaterialPriceDto,
    companyId: bigint,
    tenantId: bigint,
    userId: bigint,
  ) {
    await this.ensureCompanyBelongsToTenant(companyId, tenantId);

    const materialId = BigInt(dto.materialId);
    await this.ensureMaterialBelongsToCompany(materialId, companyId);

    const priceDate = new Date(dto.priceDate);

    const existing = await this.prisma.rawMaterialPrice.findFirst({
      where: { companyId, materialId, priceDate },
    });

    let record;
    if (existing) {
      record = await this.prisma.rawMaterialPrice.update({
        where: { id: existing.id },
        data: {
          price: dto.price,
          source: dto.source ?? 'manual',
        },
      });
    } else {
      record = await this.prisma.rawMaterialPrice.create({
        data: {
          companyId,
          materialId,
          price: dto.price,
          priceDate,
          source: dto.source ?? 'manual',
        },
      });
    }

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        entityType: 'RawMaterialPrice',
        entityId: record.id,
        action: existing ? 'update' : 'create',
        oldValues: existing
          ? (JSON.stringify(existing))
          : undefined,
        newValues: JSON.stringify(record),
      },
    });

    return {
      ...record,
      id: record.id.toString(),
      companyId: record.companyId.toString(),
      materialId: record.materialId.toString(),
      price: Number(record.price),
    };
  }

  async findAll(
    companyId: bigint,
    tenantId: bigint,
    pagination: { page?: number; limit?: number; search?: string },
    dateFrom?: string,
    dateTo?: string,
  ) {
    await this.ensureCompanyBelongsToTenant(companyId, tenantId);

    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Prisma.RawMaterialPriceWhereInput = { companyId };

    if (pagination.search) {
      where.material = {
        name: { contains: pagination.search },
      };
    }

    if (dateFrom || dateTo) {
      where.priceDate = {};
      if (dateFrom) where.priceDate.gte = new Date(dateFrom);
      if (dateTo) where.priceDate.lte = new Date(dateTo);
    }

    const [total, data] = await Promise.all([
      this.prisma.rawMaterialPrice.count({ where }),
      this.prisma.rawMaterialPrice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { priceDate: 'desc' },
        include: {
          material: {
            select: { id: true, name: true, code: true },
          },
        },
      }),
    ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: data.map((r) => ({
        ...r,
        id: r.id.toString(),
        companyId: r.companyId.toString(),
        materialId: r.materialId.toString(),
        price: Number(r.price),
        material: r.material
          ? {
              id: r.material.id.toString(),
              name: r.material.name,
              code: r.material.code,
            }
          : null,
      })),
    };
  }

  async findOne(id: bigint, companyId: bigint, tenantId: bigint) {
    await this.ensureCompanyBelongsToTenant(companyId, tenantId);

    const record = await this.prisma.rawMaterialPrice.findFirst({
      where: { id, companyId },
      include: {
        material: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    if (!record) {
      throw new NotFoundException(
        `Raw material price with ID ${id} not found under this company`,
      );
    }

    return {
      ...record,
      id: record.id.toString(),
      companyId: record.companyId.toString(),
      materialId: record.materialId.toString(),
      price: Number(record.price),
      material: record.material
        ? {
            id: record.material.id.toString(),
            name: record.material.name,
            code: record.material.code,
          }
        : null,
    };
  }

  async getLatestByMaterial(
    materialId: bigint,
    companyId: bigint,
    tenantId: bigint,
  ) {
    await this.ensureCompanyBelongsToTenant(companyId, tenantId);
    await this.ensureMaterialBelongsToCompany(materialId, companyId);

    const record = await this.prisma.rawMaterialPrice.findFirst({
      where: { companyId, materialId },
      orderBy: { priceDate: 'desc' },
      include: {
        material: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    if (!record) {
      throw new NotFoundException(
        `No price found for material ${materialId} under this company`,
      );
    }

    return {
      ...record,
      id: record.id.toString(),
      companyId: record.companyId.toString(),
      materialId: record.materialId.toString(),
      price: Number(record.price),
      material: record.material
        ? {
            id: record.material.id.toString(),
            name: record.material.name,
            code: record.material.code,
          }
        : null,
    };
  }

  async getHistory(
    materialId: bigint,
    companyId: bigint,
    tenantId: bigint,
    dateFrom?: string,
    dateTo?: string,
  ) {
    await this.ensureCompanyBelongsToTenant(companyId, tenantId);
    await this.ensureMaterialBelongsToCompany(materialId, companyId);

    const where: Prisma.RawMaterialPriceWhereInput = {
      companyId,
      materialId,
    };

    if (dateFrom || dateTo) {
      where.priceDate = {};
      if (dateFrom) where.priceDate.gte = new Date(dateFrom);
      if (dateTo) where.priceDate.lte = new Date(dateTo);
    }

    const records = await this.prisma.rawMaterialPrice.findMany({
      where,
      orderBy: { priceDate: 'desc' },
      include: {
        material: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    return records.map((r) => ({
      ...r,
      id: r.id.toString(),
      companyId: r.companyId.toString(),
      materialId: r.materialId.toString(),
      price: Number(r.price),
      material: r.material
        ? {
            id: r.material.id.toString(),
            name: r.material.name,
            code: r.material.code,
          }
        : null,
    }));
  }

  async update(
    id: bigint,
    dto: UpdateRawMaterialPricesDto,
    companyId: bigint,
    tenantId: bigint,
    userId: bigint,
  ) {
    const oldRecord = await this.findOne(id, companyId, tenantId);

    const materialId = dto.materialId
      ? BigInt(dto.materialId)
      : BigInt(oldRecord.materialId);

    if (dto.materialId) {
      await this.ensureMaterialBelongsToCompany(materialId, companyId);
    }

    const data: any = {};
    if (dto.price !== undefined) data.price = dto.price;
    if (dto.priceDate !== undefined) data.priceDate = new Date(dto.priceDate);
    if (dto.source !== undefined) data.source = dto.source;
    if (dto.materialId !== undefined) data.materialId = materialId;

    const updatedRecord = await this.prisma.rawMaterialPrice.update({
      where: { id },
      data,
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        entityType: 'RawMaterialPrice',
        entityId: id,
        action: 'update',
        oldValues: JSON.stringify(oldRecord),
        newValues: JSON.stringify(updatedRecord),
      },
    });

    return {
      ...updatedRecord,
      id: updatedRecord.id.toString(),
      companyId: updatedRecord.companyId.toString(),
      materialId: updatedRecord.materialId.toString(),
      price: Number(updatedRecord.price),
    };
  }

  async remove(
    id: bigint,
    companyId: bigint,
    tenantId: bigint,
    userId: bigint,
  ) {
    const oldRecord = await this.findOne(id, companyId, tenantId);

    const deletedRecord = await this.prisma.rawMaterialPrice.delete({
      where: { id },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        entityType: 'RawMaterialPrice',
        entityId: id,
        action: 'delete',
        oldValues: JSON.stringify(oldRecord),
      },
    });

    return {
      ...deletedRecord,
      id: deletedRecord.id.toString(),
      companyId: deletedRecord.companyId.toString(),
      materialId: deletedRecord.materialId.toString(),
      price: Number(deletedRecord.price),
    };
  }
}
