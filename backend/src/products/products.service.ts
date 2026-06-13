import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class ProductsService {
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
    createProductDto: CreateProductDto,
    companyId: bigint,
    tenantId: bigint,
    userId: bigint,
  ) {
    await this.ensureCompanyBelongsToTenant(companyId, tenantId);

    // Validate SKU uniqueness in this company
    const skuExists = await this.prisma.product.findFirst({
      where: { companyId, sku: createProductDto.sku },
    });
    if (skuExists) {
      throw new BadRequestException(
        `Product SKU "${createProductDto.sku}" already exists in this company`,
      );
    }

    // Validate category belongs to same company
    if (createProductDto.categoryId) {
      const categoryId = BigInt(createProductDto.categoryId);
      const category = await this.prisma.productCategory.findFirst({
        where: { id: categoryId, companyId },
      });
      if (!category) {
        throw new BadRequestException(
          'Product category must belong to the same company',
        );
      }
    }

    // Validate unit belongs to same company
    if (createProductDto.unitId) {
      const unitId = BigInt(createProductDto.unitId);
      const unit = await this.prisma.unit.findFirst({
        where: { id: unitId, companyId },
      });
      if (!unit) {
        throw new BadRequestException(
          'Unit of measurement must belong to the same company',
        );
      }
    }

    const product = await this.prisma.product.create({
      data: {
        companyId,
        sku: createProductDto.sku,
        name: createProductDto.name,
        categoryId: createProductDto.categoryId
          ? BigInt(createProductDto.categoryId)
          : null,
        unitId: createProductDto.unitId
          ? BigInt(createProductDto.unitId)
          : null,
        productType: createProductDto.productType ?? 'finished_good',
        salePrice: createProductDto.salePrice ?? 0,
        standardCost: createProductDto.standardCost ?? 0,
        isActive: createProductDto.isActive ?? true,
      },
    });

    // Write audit log
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        entityType: 'Product',
        entityId: product.id,
        action: 'create',
        newValues: JSON.stringify(product),
      },
    });

    return product;
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

    const where: Prisma.ProductWhereInput = {
      companyId,
    };

    if (paginationDto.search) {
      where.OR = [
        { name: { contains: paginationDto.search } },
        { sku: { contains: paginationDto.search } },
      ];
    }

    const [total, data] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          category: {
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

    const product = await this.prisma.product.findFirst({
      where: { id, companyId },
      include: {
        category: {
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

    if (!product) {
      throw new NotFoundException(
        `Product with ID ${id} not found under this company`,
      );
    }

    return product;
  }

  async update(
    id: bigint,
    updateProductDto: UpdateProductDto,
    companyId: bigint,
    tenantId: bigint,
    userId: bigint,
  ) {
    const oldProduct = await this.findOne(id, companyId, tenantId);

    // Validate SKU uniqueness if updated
    if (updateProductDto.sku && updateProductDto.sku !== oldProduct.sku) {
      const skuExists = await this.prisma.product.findFirst({
        where: { companyId, sku: updateProductDto.sku },
      });
      if (skuExists) {
        throw new BadRequestException(
          `Product SKU "${updateProductDto.sku}" already exists in this company`,
        );
      }
    }

    // Validate category belongs to same company
    if (updateProductDto.categoryId) {
      const categoryId = BigInt(updateProductDto.categoryId);
      const category = await this.prisma.productCategory.findFirst({
        where: { id: categoryId, companyId },
      });
      if (!category) {
        throw new BadRequestException(
          'Product category must belong to the same company',
        );
      }
    }

    // Validate unit belongs to same company
    if (updateProductDto.unitId) {
      const unitId = BigInt(updateProductDto.unitId);
      const unit = await this.prisma.unit.findFirst({
        where: { id: unitId, companyId },
      });
      if (!unit) {
        throw new BadRequestException(
          'Unit of measurement must belong to the same company',
        );
      }
    }

    const updatedProduct = await this.prisma.product.update({
      where: { id },
      data: {
        sku: updateProductDto.sku,
        name: updateProductDto.name,
        categoryId: updateProductDto.categoryId
          ? BigInt(updateProductDto.categoryId)
          : undefined,
        unitId: updateProductDto.unitId
          ? BigInt(updateProductDto.unitId)
          : undefined,
        productType: updateProductDto.productType,
        salePrice: updateProductDto.salePrice,
        standardCost: updateProductDto.standardCost,
        isActive: updateProductDto.isActive,
      },
    });

    // Write audit log
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        entityType: 'Product',
        entityId: id,
        action: 'update',
        oldValues: JSON.stringify(oldProduct),
        newValues: JSON.stringify(updatedProduct),
      },
    });

    return updatedProduct;
  }

  async remove(
    id: bigint,
    companyId: bigint,
    tenantId: bigint,
    userId: bigint,
  ) {
    await this.findOne(id, companyId, tenantId);

    const deletedProduct = await this.prisma.product.delete({
      where: { id },
    });

    // Write audit log
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        entityType: 'Product',
        entityId: id,
        action: 'delete',
        oldValues: JSON.stringify(deletedProduct),
      },
    });

    return deletedProduct;
  }
}
