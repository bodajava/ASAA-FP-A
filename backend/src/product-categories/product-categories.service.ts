import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CreateProductCategoryDto } from './dto/create-product-category.dto';
import { UpdateProductCategoryDto } from './dto/update-product-category.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class ProductCategoriesService {
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
    createProductCategoryDto: CreateProductCategoryDto,
    companyId: bigint,
    tenantId: bigint,
    userId: bigint,
  ) {
    await this.ensureCompanyBelongsToTenant(companyId, tenantId);

    // Validate parent category if provided
    if (createProductCategoryDto.parentId) {
      if (!/^\d+$/.test(createProductCategoryDto.parentId)) {
        throw new BadRequestException('parentId must be a valid numeric ID');
      }
      const parentId = BigInt(createProductCategoryDto.parentId);
      const parentCategory = await this.prisma.productCategory.findFirst({
        where: { id: parentId, companyId },
      });
      if (!parentCategory) {
        throw new BadRequestException(
          'Parent category must belong to the same company',
        );
      }
    }

    const category = await this.prisma.productCategory.create({
      data: {
        companyId,
        parentId: createProductCategoryDto.parentId
          ? BigInt(createProductCategoryDto.parentId)
          : null,
        name: createProductCategoryDto.name,
      },
    });

    // Write audit log
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        entityType: 'ProductCategory',
        entityId: category.id,
        action: 'create',
        newValues: JSON.stringify(category),
      },
    });

    return category;
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

    const where: Prisma.ProductCategoryWhereInput = {
      companyId,
    };

    if (paginationDto.search) {
      where.name = {
        contains: paginationDto.search,
      };
    }

    const [total, data] = await Promise.all([
      this.prisma.productCategory.count({ where }),
      this.prisma.productCategory.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          parent: {
            select: {
              id: true,
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
    await this.ensureCompanyBelongsToTenant(companyId, tenantId);

    const category = await this.prisma.productCategory.findFirst({
      where: { id, companyId },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
        children: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException(
        `Product category with ID ${id} not found under this company`,
      );
    }

    return category;
  }

  async update(
    id: bigint,
    updateProductCategoryDto: UpdateProductCategoryDto,
    companyId: bigint,
    tenantId: bigint,
    userId: bigint,
  ) {
    const oldCategory = await this.findOne(id, companyId, tenantId);

    // Validate parent category if provided
    if (updateProductCategoryDto.parentId) {
      if (!/^\d+$/.test(updateProductCategoryDto.parentId)) {
        throw new BadRequestException('parentId must be a valid numeric ID');
      }
      const parentId = BigInt(updateProductCategoryDto.parentId);
      if (parentId === id) {
        throw new BadRequestException('A category cannot be its own parent');
      }
      const parentCategory = await this.prisma.productCategory.findFirst({
        where: { id: parentId, companyId },
      });
      if (!parentCategory) {
        throw new BadRequestException(
          'Parent category must belong to the same company',
        );
      }
    }

    const updatedCategory = await this.prisma.productCategory.update({
      where: { id },
      data: {
        parentId: updateProductCategoryDto.parentId
          ? BigInt(updateProductCategoryDto.parentId)
          : undefined,
        name: updateProductCategoryDto.name,
      },
    });

    // Write audit log
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        entityType: 'ProductCategory',
        entityId: id,
        action: 'update',
        oldValues: JSON.stringify(oldCategory),
        newValues: JSON.stringify(updatedCategory),
      },
    });

    return updatedCategory;
  }

  async remove(
    id: bigint,
    companyId: bigint,
    tenantId: bigint,
    userId: bigint,
  ) {
    const oldCategory = await this.findOne(id, companyId, tenantId);

    // Prevent deletion if it has subcategories
    if (oldCategory.children.length > 0) {
      throw new BadRequestException(
        'Cannot delete category with subcategories',
      );
    }

    const deletedCategory = await this.prisma.productCategory.delete({
      where: { id },
    });

    // Write audit log
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        entityType: 'ProductCategory',
        entityId: id,
        action: 'delete',
        oldValues: JSON.stringify(deletedCategory),
      },
    });

    return deletedCategory;
  }
}
