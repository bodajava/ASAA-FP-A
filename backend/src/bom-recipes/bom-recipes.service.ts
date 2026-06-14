import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CreateBomRecipeDto } from './dto/create-bom-recipe.dto';
import { UpdateBomRecipeDto } from './dto/update-bom-recipe.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import Decimal from 'decimal.js';

export type QueryBomRecipe = Prisma.BomRecipeGetPayload<{
  include: {
    product: {
      select: {
        id: true;
        name: true;
        sku: true;
      };
    };
    bomLines: {
      include: {
        material: {
          select: {
            id: true;
            name: true;
            code: true;
            purchasePrice: true;
          };
        };
      };
    };
  };
}>;

export interface BomRecipeResponseDto {
  id: string;
  companyId: string;
  productId: string;
  version: string | null;
  outputQty: number;
  wastagePct: number;
  laborCost: number;
  overheadCost: number;
  isActive: boolean;
  createdAt: Date | null;
  updatedAt: Date | null;
  product: {
    id: string;
    name: string;
    sku: string;
  };
  bomLines: {
    id: string;
    materialId: string;
    qtyPerOutput: number;
    unitCost: number;
    wastagePct: number;
    material: {
      id: string;
      name: string;
      code: string;
      purchasePrice: number;
    };
  }[];
  totalMaterialCost: number;
  estimatedCost: number;
  estimatedCostPerUnit: number;
}

export function mapRecipeToResponse(
  recipe: QueryBomRecipe,
): BomRecipeResponseDto {
  let totalMaterialCost = new Decimal(0);

  const mappedLines = recipe.bomLines.map((line) => {
    const defaultPrice = Number(line.material.purchasePrice);
    const unitCostNum = Number(line.unitCost);
    const price = unitCostNum > 0 ? unitCostNum : defaultPrice;
    const lineWastage = Number(line.wastagePct);
    const qty = Number(line.qtyPerOutput);

    const lineCost = new Decimal(qty)
      .times(price)
      .times(new Decimal(1).plus(new Decimal(lineWastage).div(100)));
    totalMaterialCost = totalMaterialCost.plus(lineCost);

    return {
      id: line.id.toString(),
      materialId: line.materialId.toString(),
      qtyPerOutput: qty,
      unitCost: unitCostNum,
      wastagePct: lineWastage,
      material: {
        id: line.material.id.toString(),
        name: line.material.name,
        code: line.material.code,
        purchasePrice: defaultPrice,
      },
    };
  });

  const outputQty = Number(recipe.outputQty);
  const recipeWastage = Number(recipe.wastagePct);
  const labor = Number(recipe.laborCost);
  const overhead = Number(recipe.overheadCost);

  const estimatedCost = totalMaterialCost
    .plus(labor)
    .plus(overhead)
    .times(new Decimal(1).plus(new Decimal(recipeWastage).div(100)));
  const estimatedCostPerUnit = outputQty > 0
    ? estimatedCost.div(outputQty)
    : new Decimal(0);

  return {
    id: recipe.id.toString(),
    companyId: recipe.companyId.toString(),
    productId: recipe.productId.toString(),
    version: recipe.version,
    outputQty,
    wastagePct: recipeWastage,
    laborCost: labor,
    overheadCost: overhead,
    isActive: recipe.isActive,
    createdAt: recipe.createdAt,
    updatedAt: recipe.updatedAt,
    product: {
      id: recipe.product.id.toString(),
      name: recipe.product.name,
      sku: recipe.product.sku,
    },
    bomLines: mappedLines,
    totalMaterialCost: totalMaterialCost.toNumber(),
    estimatedCost: estimatedCost.toNumber(),
    estimatedCostPerUnit: estimatedCostPerUnit.toNumber(),
  };
}

@Injectable()
export class BomRecipesService {
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
    createDto: CreateBomRecipeDto,
    companyId: bigint,
    tenantId: bigint,
    userId: bigint,
  ): Promise<BomRecipeResponseDto> {
    await this.ensureCompanyBelongsToTenant(companyId, tenantId);

    // Validate that product belongs to the active company
    const product = await this.prisma.product.findFirst({
      where: { id: BigInt(createDto.productId), companyId },
    });
    if (!product) {
      throw new BadRequestException(
        `Product with ID ${createDto.productId} does not belong to the active company`,
      );
    }

    // Validate that every material belongs to the active company
    if (createDto.bomLines && createDto.bomLines.length > 0) {
      const materialIds = createDto.bomLines.map((line) =>
        BigInt(line.materialId),
      );
      const uniqueIds = Array.from(new Set(materialIds));
      const dbMaterials = await this.prisma.material.findMany({
        where: { id: { in: uniqueIds }, companyId },
      });
      if (dbMaterials.length !== uniqueIds.length) {
        throw new BadRequestException(
          'One or more materials do not exist or do not belong to the active company',
        );
      }
    }

    // Perform database operations in transaction
    const recipe = await this.prisma.$transaction(async (tx) => {
      const createdRecipe = await tx.bomRecipe.create({
        data: {
          companyId,
          productId: BigInt(createDto.productId),
          version: createDto.version ?? 'v1',
          outputQty: createDto.outputQty ?? 1,
          wastagePct: createDto.wastagePct ?? 0,
          laborCost: createDto.laborCost ?? 0,
          overheadCost: createDto.overheadCost ?? 0,
          isActive: createDto.isActive ?? true,
        },
      });

      if (createDto.bomLines && createDto.bomLines.length > 0) {
        await tx.bomLine.createMany({
          data: createDto.bomLines.map((line) => ({
            bomId: createdRecipe.id,
            materialId: BigInt(line.materialId),
            qtyPerOutput: line.qtyPerOutput,
            unitCost: line.unitCost ?? 0,
            wastagePct: line.wastagePct ?? 0,
          })),
        });
      }

      return createdRecipe;
    });

    const fullRecipe = await this.prisma.bomRecipe.findUnique({
      where: { id: recipe.id },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
          },
        },
        bomLines: {
          include: {
            material: {
              select: {
                id: true,
                name: true,
                code: true,
                purchasePrice: true,
              },
            },
          },
        },
      },
    });

    if (!fullRecipe) {
      throw new NotFoundException('Failed to retrieve created BOM recipe');
    }

    // Write audit log
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        entityType: 'BomRecipe',
        entityId: recipe.id,
        action: 'create',
        newValues: JSON.stringify(fullRecipe),
      },
    });

    return mapRecipeToResponse(fullRecipe);
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

    const where: Prisma.BomRecipeWhereInput = {
      companyId,
    };

    if (paginationDto.search) {
      where.OR = [
        { version: { contains: paginationDto.search } },
        {
          product: {
            OR: [
              { name: { contains: paginationDto.search } },
              { sku: { contains: paginationDto.search } },
            ],
          },
        },
      ];
    }

    const [total, data] = await Promise.all([
      this.prisma.bomRecipe.count({ where }),
      this.prisma.bomRecipe.findMany({
        where,
        skip,
        take: limit,
        orderBy: { version: 'asc' },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
            },
          },
          bomLines: {
            include: {
              material: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                  purchasePrice: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const mappedData = data.map((recipe) => mapRecipeToResponse(recipe));

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: mappedData,
    };
  }

  async findOne(
    id: bigint,
    companyId: bigint,
    tenantId: bigint,
  ): Promise<BomRecipeResponseDto> {
    await this.ensureCompanyBelongsToTenant(companyId, tenantId);

    const recipe = await this.prisma.bomRecipe.findFirst({
      where: { id, companyId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
          },
        },
        bomLines: {
          include: {
            material: {
              select: {
                id: true,
                name: true,
                code: true,
                purchasePrice: true,
              },
            },
          },
        },
      },
    });

    if (!recipe) {
      throw new NotFoundException(
        `BOM Recipe with ID ${id} not found under this company`,
      );
    }

    return mapRecipeToResponse(recipe);
  }

  async update(
    id: bigint,
    updateDto: UpdateBomRecipeDto,
    companyId: bigint,
    tenantId: bigint,
    userId: bigint,
  ): Promise<BomRecipeResponseDto> {
    await this.ensureCompanyBelongsToTenant(companyId, tenantId);

    // Check if recipe exists and belongs to active company
    const oldRecipe = await this.prisma.bomRecipe.findFirst({
      where: { id, companyId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
          },
        },
        bomLines: {
          include: {
            material: {
              select: {
                id: true,
                name: true,
                code: true,
                purchasePrice: true,
              },
            },
          },
        },
      },
    });
    if (!oldRecipe) {
      throw new NotFoundException(
        `BOM Recipe with ID ${id} not found under this company`,
      );
    }

    // Validate that product belongs to the active company if updated
    if (updateDto.productId) {
      const product = await this.prisma.product.findFirst({
        where: { id: BigInt(updateDto.productId), companyId },
      });
      if (!product) {
        throw new BadRequestException(
          `Product with ID ${updateDto.productId} does not belong to the active company`,
        );
      }
    }

    // Validate that every material belongs to the active company if updated
    if (updateDto.bomLines) {
      const materialIds = updateDto.bomLines.map((line) =>
        BigInt(line.materialId),
      );
      const uniqueIds = Array.from(new Set(materialIds));
      const dbMaterials = await this.prisma.material.findMany({
        where: { id: { in: uniqueIds }, companyId },
      });
      if (dbMaterials.length !== uniqueIds.length) {
        throw new BadRequestException(
          'One or more materials do not exist or do not belong to the active company',
        );
      }
    }

    // Perform database operations in transaction
    const updatedRecipe = await this.prisma.$transaction(async (tx) => {
      const recipe = await tx.bomRecipe.update({
        where: { id },
        data: {
          productId: updateDto.productId
            ? BigInt(updateDto.productId)
            : undefined,
          version: updateDto.version,
          outputQty: updateDto.outputQty,
          wastagePct: updateDto.wastagePct,
          laborCost: updateDto.laborCost,
          overheadCost: updateDto.overheadCost,
          isActive: updateDto.isActive,
        },
      });

      if (updateDto.bomLines) {
        // Drop old lines and recreate new ones
        await tx.bomLine.deleteMany({
          where: { bomId: id },
        });

        if (updateDto.bomLines.length > 0) {
          await tx.bomLine.createMany({
            data: updateDto.bomLines.map((line) => ({
              bomId: id,
              materialId: BigInt(line.materialId),
              qtyPerOutput: line.qtyPerOutput,
              unitCost: line.unitCost ?? 0,
              wastagePct: line.wastagePct ?? 0,
            })),
          });
        }
      }

      return recipe;
    });

    const fullRecipe = await this.prisma.bomRecipe.findUnique({
      where: { id: updatedRecipe.id },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
          },
        },
        bomLines: {
          include: {
            material: {
              select: {
                id: true,
                name: true,
                code: true,
                purchasePrice: true,
              },
            },
          },
        },
      },
    });

    if (!fullRecipe) {
      throw new NotFoundException('Failed to retrieve updated BOM recipe');
    }

    // Write audit log
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        entityType: 'BomRecipe',
        entityId: id,
        action: 'update',
        oldValues: JSON.stringify(oldRecipe),
        newValues: JSON.stringify(fullRecipe),
      },
    });

    return mapRecipeToResponse(fullRecipe);
  }

  async remove(
    id: bigint,
    companyId: bigint,
    tenantId: bigint,
    userId: bigint,
  ): Promise<BomRecipeResponseDto> {
    const recipe = await this.findOne(id, companyId, tenantId);

    await this.prisma.bomRecipe.delete({
      where: { id },
    });

    // Write audit log
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        entityType: 'BomRecipe',
        entityId: id,
        action: 'delete',
        oldValues: JSON.stringify(recipe),
      },
    });

    return recipe;
  }

  async explodeSalesPlan(
    companyId: bigint,
    salesPlanLines: { productId: string; quantity: number }[],
  ): Promise<any> {
    const productsList: any[] = [];
    const materialReqMap = new Map<
      string,
      {
        name: string;
        code: string;
        requiredQty: InstanceType<typeof Decimal>;
        unitPrice: number;
        totalCost: InstanceType<typeof Decimal>;
        wastageQty: InstanceType<typeof Decimal>;
        wastageCost: InstanceType<typeof Decimal>;
      }
    >();

    let totalSalesQty = 0;
    let totalMaterialCost = new Decimal(0);
    let totalLaborCost = new Decimal(0);
    let totalOverheadCost = new Decimal(0);
    let totalWastageCost = new Decimal(0);
    let grandTotalCost = new Decimal(0);

    for (const line of salesPlanLines) {
      const pId = BigInt(line.productId);
      const qty = Number(line.quantity);
      totalSalesQty += qty;

      // Find active BOM Recipe
      const recipe = await this.prisma.bomRecipe.findFirst({
        where: { productId: pId, companyId, isActive: true },
        include: {
          product: true,
          bomLines: {
            include: {
              material: true,
            },
          },
        },
      });

      if (!recipe) {
        continue;
      }

      const factor = new Decimal(qty).div(Number(recipe.outputQty));
      let productMaterialCost = new Decimal(0);
      let productWastageCost = new Decimal(0);

      for (const bomLine of recipe.bomLines) {
        const matId = bomLine.materialId.toString();
        const matDefaultPrice = Number(bomLine.material.purchasePrice);
        const matPrice =
          Number(bomLine.unitCost) > 0
            ? Number(bomLine.unitCost)
            : matDefaultPrice;
        const lineWastagePct = Number(bomLine.wastagePct);

        const baseQty = new Decimal(Number(bomLine.qtyPerOutput)).times(factor);
        const wastageQty = baseQty.times(lineWastagePct).div(100);
        const totalLineQty = baseQty.plus(wastageQty);

        const baseCost = baseQty.times(matPrice);
        const wastageCost = wastageQty.times(matPrice);
        const totalLineCost = totalLineQty.times(matPrice);

        productMaterialCost = productMaterialCost.plus(totalLineCost);
        productWastageCost = productWastageCost.plus(wastageCost);

        const existing = materialReqMap.get(matId);
        if (existing) {
          existing.requiredQty = existing.requiredQty.plus(totalLineQty);
          existing.totalCost = existing.totalCost.plus(totalLineCost);
          existing.wastageQty = existing.wastageQty.plus(wastageQty);
          existing.wastageCost = existing.wastageCost.plus(wastageCost);
        } else {
          materialReqMap.set(matId, {
            name: bomLine.material.name,
            code: bomLine.material.code,
            requiredQty: totalLineQty,
            unitPrice: matPrice,
            totalCost: totalLineCost,
            wastageQty,
            wastageCost,
          });
        }
      }

      const productLaborCost = new Decimal(Number(recipe.laborCost)).times(factor);
      const productOverheadCost = new Decimal(Number(recipe.overheadCost)).times(factor);
      const recipeWastagePct = Number(recipe.wastagePct);
      const recipeWastageCost = productMaterialCost
        .plus(productLaborCost)
        .plus(productOverheadCost)
        .times(recipeWastagePct)
        .div(100);
      const productTotalCost = productMaterialCost
        .plus(productLaborCost)
        .plus(productOverheadCost)
        .plus(recipeWastageCost);

      totalMaterialCost = totalMaterialCost.plus(productMaterialCost);
      totalLaborCost = totalLaborCost.plus(productLaborCost);
      totalOverheadCost = totalOverheadCost.plus(productOverheadCost);
      totalWastageCost = totalWastageCost.plus(recipeWastageCost);
      grandTotalCost = grandTotalCost.plus(productTotalCost);

      productsList.push({
        productId: line.productId,
        name: recipe.product.name,
        sku: recipe.product.sku,
        salesQty: qty,
        recipeVersion: recipe.version,
        materialCost: productMaterialCost.toNumber(),
        laborCost: productLaborCost.toNumber(),
        overheadCost: productOverheadCost.toNumber(),
        recipeWastageCost: recipeWastageCost.toNumber(),
        totalCost: productTotalCost.toNumber(),
      });
    }

    const materialsList = Array.from(materialReqMap.entries()).map(
      ([id, val]) => ({
        materialId: id,
        name: val.name,
        code: val.code,
        requiredQty: val.requiredQty.toNumber(),
        unitPrice: val.unitPrice,
        totalCost: val.totalCost.toNumber(),
        wastageQty: val.wastageQty.toNumber(),
        wastageCost: val.wastageCost.toNumber(),
      }),
    );

    const capacityLimit = 50000;
    const capacityUtilizationPct = Number(
      ((totalSalesQty / capacityLimit) * 100).toFixed(2),
    );

    return {
      products: productsList,
      materials: materialsList,
      totalSalesQty,
      totalMaterialCost: totalMaterialCost.toNumber(),
      totalLaborCost: totalLaborCost.toNumber(),
      totalOverheadCost: totalOverheadCost.toNumber(),
      totalWastageCost: totalWastageCost.toNumber(),
      grandTotalCost: grandTotalCost.toNumber(),
      capacityUtilizationPct,
    };
  }
}
