import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { SimpleCache } from '../common/utils/cache.util';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { PromotionResponseDto } from './dto/promotion-response.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

type QueryPromotion = Prisma.PromotionGetPayload<{
  include: {
    product: { select: { id: true; name: true } };
    customer: { select: { id: true; name: true } };
    creator: { select: { id: true; name: true } };
  };
}>;

function mapPromotionToResponse(promo: QueryPromotion): PromotionResponseDto {
  return {
    id: promo.id.toString(),
    companyId: promo.companyId.toString(),
    name: promo.name,
    description: promo.description,
    productId: promo.productId?.toString() ?? null,
    customerId: promo.customerId?.toString() ?? null,
    discountPct: promo.discountPct ? Number(promo.discountPct) : null,
    discountAmt: promo.discountAmt ? Number(promo.discountAmt) : null,
    startDate: promo.startDate,
    endDate: promo.endDate,
    budgetAmt: Number(promo.budgetAmt),
    actualCost: Number(promo.actualCost),
    incrementalRevenue: Number(promo.incrementalRevenue),
    roi: promo.roi ? Number(promo.roi) : null,
    isActive: promo.isActive,
    createdBy: promo.createdBy?.toString() ?? null,
    createdAt: promo.createdAt,
    updatedAt: promo.updatedAt,
    product: promo.product
      ? { id: promo.product.id.toString(), name: promo.product.name }
      : null,
    customer: promo.customer
      ? { id: promo.customer.id.toString(), name: promo.customer.name }
      : null,
    creator: promo.creator
      ? { id: promo.creator.id.toString(), name: promo.creator.name }
      : null,
  };
}

@Injectable()
export class PromotionsService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureCompanyBelongsToTenant(
    companyId: bigint,
    tenantId: bigint,
  ): Promise<void> {
    const company = await this.prisma.company.findFirst({
      where: { id: companyId, tenantId },
    });
    if (!company) {
      throw new NotFoundException('Company not found under this tenant');
    }
  }

  private validateForeignEntity<T extends { id: bigint }>(
    entity: T | null,
    entityName: string,
    id: string,
  ): void {
    if (!entity) {
      throw new BadRequestException(
        `${entityName} with ID ${id} does not belong to the active company`,
      );
    }
  }

  private computeRoi(
    incrementalRevenue: number | null | undefined,
    actualCost: number | null | undefined,
  ): number | null {
    const revenue = Number(incrementalRevenue ?? 0);
    const cost = Number(actualCost ?? 0);
    if (cost > 0 && revenue > 0) {
      return Number((((revenue - cost) / cost) * 100).toFixed(2));
    }
    return null;
  }

  async create(
    createDto: CreatePromotionDto,
    companyId: bigint,
    tenantId: bigint,
    userId: bigint,
  ): Promise<PromotionResponseDto> {
    await this.ensureCompanyBelongsToTenant(companyId, tenantId);

    if (createDto.productId) {
      const product = await this.prisma.product.findFirst({
        where: { id: BigInt(createDto.productId), companyId },
      });
      this.validateForeignEntity(product, 'Product', createDto.productId);
    }

    if (createDto.customerId) {
      const customer = await this.prisma.customer.findFirst({
        where: { id: BigInt(createDto.customerId), companyId },
      });
      this.validateForeignEntity(customer, 'Customer', createDto.customerId);
    }

    const roi = this.computeRoi(
      createDto.incrementalRevenue,
      createDto.actualCost,
    );

    const promotion = await this.prisma.promotion.create({
      data: {
        companyId,
        name: createDto.name,
        description: createDto.description,
        productId: createDto.productId
          ? BigInt(createDto.productId)
          : undefined,
        customerId: createDto.customerId
          ? BigInt(createDto.customerId)
          : undefined,
        discountPct: createDto.discountPct,
        discountAmt: createDto.discountAmt,
        startDate: createDto.startDate,
        endDate: createDto.endDate,
        budgetAmt: createDto.budgetAmt ?? 0,
        actualCost: createDto.actualCost ?? 0,
        incrementalRevenue: createDto.incrementalRevenue ?? 0,
        roi: roi ?? undefined,
        isActive: createDto.isActive ?? true,
        createdBy: userId,
      },
      include: {
        product: { select: { id: true, name: true } },
        customer: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } },
      },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        entityType: 'Promotion',
        entityId: promotion.id,
        action: 'create',
        newValues: JSON.stringify(promotion),
      },
    });

    SimpleCache.clear();

    return mapPromotionToResponse(promotion);
  }

  async findAll(
    companyId: bigint,
    tenantId: bigint,
    paginationDto: PaginationDto & {
      isActive?: string;
      productId?: string;
      customerId?: string;
      startDate?: string;
      endDate?: string;
    },
  ) {
    await this.ensureCompanyBelongsToTenant(companyId, tenantId);

    const page = paginationDto.page ?? 1;
    const limit = paginationDto.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Prisma.PromotionWhereInput = { companyId };

    if (paginationDto.search) {
      where.name = { contains: paginationDto.search };
    }

    if (paginationDto.isActive !== undefined) {
      where.isActive = paginationDto.isActive === 'true';
    }

    if (paginationDto.productId) {
      where.productId = BigInt(paginationDto.productId);
    }

    if (paginationDto.customerId) {
      where.customerId = BigInt(paginationDto.customerId);
    }

    if (paginationDto.startDate || paginationDto.endDate) {
      where.startDate = {};
      if (paginationDto.startDate) {
        where.startDate.gte = new Date(paginationDto.startDate);
      }
      if (paginationDto.endDate) {
        where.startDate.lte = new Date(paginationDto.endDate);
      }
    }

    const cacheKey = `promotions:${companyId}:${JSON.stringify(where)}:${page}:${limit}`;
    const cached = SimpleCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const [total, data] = await Promise.all([
      this.prisma.promotion.count({ where }),
      this.prisma.promotion.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          product: { select: { id: true, name: true } },
          customer: { select: { id: true, name: true } },
          creator: { select: { id: true, name: true } },
        },
      }),
    ]);

    const mappedData = data.map((promo) => mapPromotionToResponse(promo));
    const result = {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: mappedData,
    };

    SimpleCache.set(cacheKey, result, 60000);

    return result;
  }

  async findOne(
    id: bigint,
    companyId: bigint,
    tenantId: bigint,
  ): Promise<PromotionResponseDto> {
    await this.ensureCompanyBelongsToTenant(companyId, tenantId);

    const promotion = await this.prisma.promotion.findFirst({
      where: { id, companyId },
      include: {
        product: { select: { id: true, name: true } },
        customer: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } },
      },
    });

    if (!promotion) {
      throw new NotFoundException(
        `Promotion with ID ${id} not found under this company`,
      );
    }

    return mapPromotionToResponse(promotion);
  }

  async update(
    id: bigint,
    updateDto: UpdatePromotionDto,
    companyId: bigint,
    tenantId: bigint,
    userId: bigint,
  ): Promise<PromotionResponseDto> {
    const oldPromotion = await this.prisma.promotion.findFirst({
      where: { id, companyId },
      include: {
        product: { select: { id: true, name: true } },
        customer: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } },
      },
    });

    if (!oldPromotion) {
      throw new NotFoundException(
        `Promotion with ID ${id} not found under this company`,
      );
    }

    if (updateDto.productId) {
      const product = await this.prisma.product.findFirst({
        where: { id: BigInt(updateDto.productId), companyId },
      });
      this.validateForeignEntity(product, 'Product', updateDto.productId);
    }

    if (updateDto.customerId) {
      const customer = await this.prisma.customer.findFirst({
        where: { id: BigInt(updateDto.customerId), companyId },
      });
      this.validateForeignEntity(customer, 'Customer', updateDto.customerId);
    }

    const incRev =
      updateDto.incrementalRevenue !== undefined
        ? updateDto.incrementalRevenue
        : oldPromotion.incrementalRevenue;
    const actCost =
      updateDto.actualCost !== undefined
        ? updateDto.actualCost
        : oldPromotion.actualCost;
    const roi = this.computeRoi(
      incRev != null ? Number(incRev) : null,
      actCost != null ? Number(actCost) : null,
    );

    const updatedPromotion = await this.prisma.promotion.update({
      where: { id },
      data: {
        name: updateDto.name,
        description: updateDto.description,
        productId: updateDto.productId
          ? BigInt(updateDto.productId)
          : undefined,
        customerId: updateDto.customerId
          ? BigInt(updateDto.customerId)
          : undefined,
        discountPct: updateDto.discountPct,
        discountAmt: updateDto.discountAmt,
        startDate: updateDto.startDate,
        endDate: updateDto.endDate,
        budgetAmt: updateDto.budgetAmt,
        actualCost: updateDto.actualCost,
        incrementalRevenue: updateDto.incrementalRevenue,
        roi: roi,
        isActive: updateDto.isActive,
      },
      include: {
        product: { select: { id: true, name: true } },
        customer: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } },
      },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        entityType: 'Promotion',
        entityId: id,
        action: 'update',
        oldValues: JSON.stringify(oldPromotion),
        newValues: JSON.stringify(updatedPromotion),
      },
    });

    SimpleCache.clear();

    return mapPromotionToResponse(updatedPromotion);
  }

  async remove(
    id: bigint,
    companyId: bigint,
    tenantId: bigint,
    userId: bigint,
  ): Promise<PromotionResponseDto> {
    const promotion = await this.findOne(id, companyId, tenantId);

    await this.prisma.promotion.delete({
      where: { id },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        entityType: 'Promotion',
        entityId: id,
        action: 'delete',
        oldValues: JSON.stringify(promotion),
      },
    });

    SimpleCache.clear();

    return promotion;
  }
}
