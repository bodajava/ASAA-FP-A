import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma, Scenario, ScenarioType } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CreateScenarioDto } from './dto/create-scenario.dto';
import { UpdateScenarioDto } from './dto/update-scenario.dto';
import { ScenarioAssumptionsDto } from './dto/scenario-assumptions.dto';
import {
  PreviewSimulationDto,
  BaseCycleType,
} from './dto/preview-simulation.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import Decimal from 'decimal.js';

type DecimalValue = InstanceType<typeof Decimal>;
import { CostingService } from '../costing/costing.service';

export interface ScenarioResponseDto {
  id: string;
  companyId: string;
  name: string;
  scenarioType: ScenarioType;
  assumptions: ScenarioAssumptionsDto;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface SimulatedLineDto {
  accountId: string;
  siteId: string | null;
  costCenterId: string | null;
  productId: string | null;
  materialId: string | null;
  customerId: string | null;
  periodMonth: number;
  originalAmount: number;
  simulatedAmount: number;
  variance: number;
}

export interface SimulationResultDto {
  originalTotal: number;
  simulatedTotal: number;
  varianceAmount: number;
  variancePercentage: number;
  lines: SimulatedLineDto[];
}

export interface ScenarioCostingImpactDto {
  scenarioId: string;
  scenarioName: string;
  affectedProducts: {
    productId: string;
    productName: string;
    sku: string;
    previousStandardCost: number;
    newSimulatedStandardCost: number;
    costIncreaseAmount: number;
    costIncreasePct: number;
    previousGrossMarginPct: number;
    newGrossMarginPct: number;
    profitImpact: number;
    marginImpact: number;
  }[];
  topCostDrivers: {
    name: string;
    impactPct: number;
    description: string;
  }[];
  summary: {
    totalProducts: number;
    affectedCount: number;
    averageCostIncreasePct: number;
    totalProfitImpact: number;
  };
}

export function mapScenarioToResponse(scenario: Scenario): ScenarioResponseDto {
  return {
    id: scenario.id.toString(),
    companyId: scenario.companyId.toString(),
    name: scenario.name,
    scenarioType: scenario.scenarioType ?? ScenarioType.custom,
    assumptions: scenario.assumptionsJson
      ? (JSON.parse(scenario.assumptionsJson) as ScenarioAssumptionsDto)
      : ({} as ScenarioAssumptionsDto),
    createdAt: scenario.createdAt,
    updatedAt: scenario.updatedAt,
  };
}

@Injectable()
export class ScenariosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly costingService: CostingService,
  ) {}

  private async ensureCompanyBelongsToTenant(
    companyId: bigint,
    tenantId: bigint,
  ): Promise<void> {
    const company = await this.prisma.company.findFirst({
      where: { id: companyId, tenantId },
    });
    if (!company) {
      throw new NotFoundException(`Company not found under this tenant`);
    }
  }

  private async validateAssumptions(
    assumptions: ScenarioAssumptionsDto,
    companyId: bigint,
  ): Promise<void> {
    if (assumptions.subtype === 'increase_material_prices') {
      if (
        assumptions.percentage === undefined ||
        assumptions.percentage === null
      ) {
        throw new BadRequestException(
          'percentage is required for raw material price increase assumptions',
        );
      }
      if (assumptions.materialIds && assumptions.materialIds.length > 0) {
        const materialIds = assumptions.materialIds.map((id: string) =>
          BigInt(id),
        );
        const dbMaterials = await this.prisma.material.findMany({
          where: { id: { in: materialIds }, companyId },
        });
        if (dbMaterials.length !== materialIds.length) {
          throw new BadRequestException(
            'One or more material IDs in assumptions do not exist or belong to another company',
          );
        }
      }
    } else if (assumptions.subtype === 'currency_rate_change') {
      if (!assumptions.fromCurrency || !assumptions.toCurrency) {
        throw new BadRequestException(
          'fromCurrency and toCurrency are required for currency exchange rate change assumptions',
        );
      }
      if (assumptions.newRate === undefined || assumptions.newRate === null) {
        throw new BadRequestException(
          'newRate is required for currency exchange rate change assumptions',
        );
      }
      if (
        assumptions.targetSupplierIds &&
        assumptions.targetSupplierIds.length > 0
      ) {
        const supplierIds = assumptions.targetSupplierIds.map((id: string) =>
          BigInt(id),
        );
        const dbSuppliers = await this.prisma.supplier.findMany({
          where: { id: { in: supplierIds }, companyId },
        });
        if (dbSuppliers.length !== supplierIds.length) {
          throw new BadRequestException(
            'One or more supplier IDs in assumptions do not exist or belong to another company',
          );
        }
      }
      if (
        assumptions.targetCustomerIds &&
        assumptions.targetCustomerIds.length > 0
      ) {
        const customerIds = assumptions.targetCustomerIds.map((id: string) =>
          BigInt(id),
        );
        const dbCustomers = await this.prisma.customer.findMany({
          where: { id: { in: customerIds }, companyId },
        });
        if (dbCustomers.length !== customerIds.length) {
          throw new BadRequestException(
            'One or more customer IDs in assumptions do not exist or belong to another company',
          );
        }
      }
      if (
        assumptions.targetAccountIds &&
        assumptions.targetAccountIds.length > 0
      ) {
        const accountIds = assumptions.targetAccountIds.map((id: string) =>
          BigInt(id),
        );
        const dbAccounts = await this.prisma.account.findMany({
          where: { id: { in: accountIds }, companyId },
        });
        if (dbAccounts.length !== accountIds.length) {
          throw new BadRequestException(
            'One or more account IDs in assumptions do not exist or belong to another company',
          );
        }
      }
    } else if (assumptions.subtype === 'demand_decrease') {
      if (
        assumptions.percentage === undefined ||
        assumptions.percentage === null
      ) {
        throw new BadRequestException(
          'percentage is required for demand decrease assumptions',
        );
      }
      if (assumptions.productIds && assumptions.productIds.length > 0) {
        const productIds = assumptions.productIds.map((id: string) =>
          BigInt(id),
        );
        const dbProducts = await this.prisma.product.findMany({
          where: { id: { in: productIds }, companyId },
        });
        if (dbProducts.length !== productIds.length) {
          throw new BadRequestException(
            'One or more product IDs in assumptions do not exist or belong to another company',
          );
        }
      }
    } else if (assumptions.subtype === 'branch_expansion') {
      if (!assumptions.siteName) {
        throw new BadRequestException(
          'siteName is required for branch expansion assumptions',
        );
      }
      if (
        assumptions.revenueAmount === undefined ||
        assumptions.expenseAmount === undefined
      ) {
        throw new BadRequestException(
          'revenueAmount and expenseAmount are required for branch expansion assumptions',
        );
      }
      if (!assumptions.revenueAccountId || !assumptions.expenseAccountId) {
        throw new BadRequestException(
          'revenueAccountId and expenseAccountId are required for branch expansion assumptions',
        );
      }
      const accountIds = [
        BigInt(assumptions.revenueAccountId),
        BigInt(assumptions.expenseAccountId),
      ];
      const dbAccounts = await this.prisma.account.findMany({
        where: { id: { in: accountIds }, companyId },
      });
      if (dbAccounts.length !== 2) {
        throw new BadRequestException(
          'One or both simulated account IDs do not exist or belong to another company',
        );
      }
    } else if (
      assumptions.subtype === 'labor_cost_increase' ||
      assumptions.subtype === 'utilities_cost_increase' ||
      assumptions.subtype === 'freight_cost_increase' ||
      assumptions.subtype === 'waste_increase' ||
      assumptions.subtype === 'yield_decrease' ||
      assumptions.subtype === 'selling_price_change'
    ) {
      if (
        assumptions.percentage === undefined ||
        assumptions.percentage === null
      ) {
        throw new BadRequestException(
          `percentage is required for ${assumptions.subtype} assumptions`,
        );
      }
    } else {
      throw new BadRequestException('Invalid scenario assumptions subtype');
    }
  }

  async create(
    createDto: CreateScenarioDto,
    companyId: bigint,
    tenantId: bigint,
    userId: bigint,
  ): Promise<ScenarioResponseDto> {
    await this.ensureCompanyBelongsToTenant(companyId, tenantId);
    await this.validateAssumptions(createDto.assumptions, companyId);

    const scenario = await this.prisma.scenario.create({
      data: {
        companyId,
        name: createDto.name,
        scenarioType: createDto.scenarioType,
        assumptionsJson: JSON.stringify(createDto.assumptions),
        createdBy: userId,
      },
    });

    // Write audit log
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        entityType: 'Scenario',
        entityId: scenario.id,
        action: 'create',
        newValues: JSON.stringify(scenario),
      },
    });

    return mapScenarioToResponse(scenario);
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

    const where: Prisma.ScenarioWhereInput = {
      companyId,
    };

    if (paginationDto.search) {
      const searchType = paginationDto.search.toUpperCase();
      const typeMatch = Object.values(ScenarioType).find(
        (s) => s.toUpperCase() === searchType,
      );

      if (typeMatch) {
        where.scenarioType = typeMatch;
      } else {
        where.name = { contains: paginationDto.search };
      }
    }

    const [total, data] = await Promise.all([
      this.prisma.scenario.count({ where }),
      this.prisma.scenario.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const mappedData = data.map((scenario) => mapScenarioToResponse(scenario));

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
  ): Promise<ScenarioResponseDto> {
    await this.ensureCompanyBelongsToTenant(companyId, tenantId);

    const scenario = await this.prisma.scenario.findFirst({
      where: { id, companyId },
    });

    if (!scenario) {
      throw new NotFoundException(
        `Scenario with ID ${id} not found under this company`,
      );
    }

    return mapScenarioToResponse(scenario);
  }

  async update(
    id: bigint,
    updateDto: UpdateScenarioDto,
    companyId: bigint,
    tenantId: bigint,
    userId: bigint,
  ): Promise<ScenarioResponseDto> {
    await this.ensureCompanyBelongsToTenant(companyId, tenantId);

    const oldScenario = await this.prisma.scenario.findFirst({
      where: { id, companyId },
    });
    if (!oldScenario) {
      throw new NotFoundException(
        `Scenario with ID ${id} not found under this company`,
      );
    }

    if (updateDto.assumptions) {
      await this.validateAssumptions(updateDto.assumptions, companyId);
    }

    const updatedScenario = await this.prisma.scenario.update({
      where: { id },
      data: {
        name: updateDto.name,
        scenarioType: updateDto.scenarioType,
        assumptionsJson: updateDto.assumptions
          ? JSON.stringify(updateDto.assumptions)
          : undefined,
      },
    });

    // Write audit log
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        entityType: 'Scenario',
        entityId: id,
        action: 'update',
        oldValues: JSON.stringify(oldScenario),
        newValues: JSON.stringify(updatedScenario),
      },
    });

    return mapScenarioToResponse(updatedScenario);
  }

  async remove(
    id: bigint,
    companyId: bigint,
    tenantId: bigint,
    userId: bigint,
  ): Promise<ScenarioResponseDto> {
    const scenario = await this.findOne(id, companyId, tenantId);

    await this.prisma.scenario.delete({
      where: { id },
    });

    // Write audit log
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        entityType: 'Scenario',
        entityId: id,
        action: 'delete',
        oldValues: JSON.stringify(scenario),
      },
    });

    return scenario;
  }

  async simulateImpact(
    previewDto: PreviewSimulationDto,
    companyId: bigint,
    tenantId: bigint,
  ): Promise<SimulationResultDto> {
    await this.ensureCompanyBelongsToTenant(companyId, tenantId);

    let assumptions: ScenarioAssumptionsDto;

    if (previewDto.overrideAssumptions) {
      await this.validateAssumptions(previewDto.overrideAssumptions, companyId);
      assumptions = previewDto.overrideAssumptions;
    } else if (previewDto.scenarioId) {
      const scenario = await this.prisma.scenario.findFirst({
        where: { id: BigInt(previewDto.scenarioId), companyId },
      });
      if (!scenario) {
        throw new NotFoundException(
          `Scenario with ID ${previewDto.scenarioId} not found under this company`,
        );
      }
      assumptions = scenario.assumptionsJson
        ? (JSON.parse(scenario.assumptionsJson) as ScenarioAssumptionsDto)
        : ({} as ScenarioAssumptionsDto);
    } else {
      throw new BadRequestException(
        'Either overrideAssumptions or scenarioId must be provided',
      );
    }

    const baseId = BigInt(previewDto.baseId);
    let originalLines: {
      accountId: bigint;
      siteId: bigint | null;
      costCenterId: bigint | null;
      productId: bigint | null;
      materialId: bigint | null;
      customerId: bigint | null;
      periodMonth: number;
      amount: DecimalPrismaType;
    }[] = [];

    type DecimalPrismaType = { toString(): string } | number;

    if (previewDto.baseType === BaseCycleType.BUDGET) {
      const budget = await this.prisma.budgetCycle.findFirst({
        where: { id: baseId, companyId },
        include: { budgetLines: true },
      });
      if (!budget) {
        throw new NotFoundException(
          'Budget cycle not found under this company',
        );
      }
      originalLines = budget.budgetLines;
    } else if (previewDto.baseType === BaseCycleType.FORECAST) {
      const forecast = await this.prisma.forecastCycle.findFirst({
        where: { id: baseId, companyId },
        include: { forecastLines: true },
      });
      if (!forecast) {
        throw new NotFoundException(
          'Forecast cycle not found under this company',
        );
      }
      originalLines = forecast.forecastLines;
    }

    const accounts = await this.prisma.account.findMany({
      where: { companyId },
    });
    const accountMap = new Map<bigint, string>();
    for (const acc of accounts) {
      accountMap.set(acc.id, acc.type);
    }

    const simulatedLines: SimulatedLineDto[] = [];
    let originalTotal = new Decimal(0);
    let simulatedTotal = new Decimal(0);

    const costingSubtypes = [
      'increase_material_prices',
      'labor_cost_increase',
      'utilities_cost_increase',
      'freight_cost_increase',
      'waste_increase',
      'yield_decrease',
      'selling_price_change',
    ];

    if (costingSubtypes.includes(assumptions.subtype)) {
      const recipes = await this.prisma.bomRecipe.findMany({
        where: { companyId, isActive: true },
      });

      const productCostFactors = new Map<bigint, DecimalValue>();
      const productPriceFactors = new Map<bigint, DecimalValue>();

      for (const recipe of recipes) {
        const originalCost = await this.costingService.calculateStandardCost(
          recipe.productId,
          companyId,
          tenantId,
          recipe.id,
        );
        const simulatedCost = await this.costingService.calculateStandardCost(
          recipe.productId,
          companyId,
          tenantId,
          recipe.id,
          assumptions,
        );

        if (originalCost.totalCost > 0) {
          productCostFactors.set(
            recipe.productId,
            new Decimal(simulatedCost.totalCost).div(originalCost.totalCost),
          );
        } else {
          productCostFactors.set(recipe.productId, new Decimal(1));
        }

        if (originalCost.sellingPrice > 0) {
          productPriceFactors.set(
            recipe.productId,
            new Decimal(simulatedCost.sellingPrice).div(originalCost.sellingPrice),
          );
        } else {
          productPriceFactors.set(recipe.productId, new Decimal(1));
        }
      }

      for (const line of originalLines) {
        const origAmt = new Decimal(Number(line.amount));
        let simAmt = origAmt;

        if (line.materialId && assumptions.subtype === 'increase_material_prices') {
          let isAffected = true;
          if (assumptions.materialIds && assumptions.materialIds.length > 0) {
            isAffected = assumptions.materialIds.includes(
              line.materialId.toString(),
            );
          }
          if (isAffected) {
            // Check packaging flag if set
            const dbMat = await this.prisma.material.findFirst({ where: { id: line.materialId } });
            if (dbMat) {
              const rawCat = (dbMat.materialType ?? 'raw_material').toLowerCase();
              const isPackaging = ['packaging_material', 'packaging', 'can_container', 'lid_cover', 'label', 'carton_box', 'shrink_plastic', 'can', 'lid', 'carton', 'shrink'].includes(rawCat);
              if (assumptions.isPackagingOnly && !isPackaging) {
                isAffected = false;
              } else if (!assumptions.isPackagingOnly && isPackaging) {
                isAffected = false;
              }
            }
          }
          if (isAffected) {
            simAmt = origAmt.times(
              new Decimal(1).plus(new Decimal(assumptions.percentage ?? 0).div(100)),
            );
          }
        } else if (line.productId) {
          const accType = accountMap.get(line.accountId);
          if (accType === 'cogs' || accType === 'expense') {
            const factor = productCostFactors.get(line.productId) ?? new Decimal(1);
            simAmt = origAmt.times(factor);
          } else if (accType === 'revenue') {
            const factor = productPriceFactors.get(line.productId) ?? new Decimal(1);
            simAmt = origAmt.times(factor);
          }
        } else {
          // General GL accounts for labor, utilities, or freight without a product
          const accType = accountMap.get(line.accountId);
          if (accType === 'expense' || accType === 'cogs') {
            const dbAcc = await this.prisma.account.findUnique({ where: { id: line.accountId } });
            if (dbAcc) {
              const accName = dbAcc.name.toLowerCase();
              let isAffected = false;
              const percentage = Number(assumptions.percentage ?? 0);

              if (assumptions.subtype === 'labor_cost_increase' && (accName.includes('labor') || accName.includes('salary') || accName.includes('payroll'))) {
                isAffected = true;
              } else if (assumptions.subtype === 'utilities_cost_increase' && (accName.includes('utility') || accName.includes('utilities') || accName.includes('power') || accName.includes('water') || accName.includes('electricity'))) {
                isAffected = true;
              } else if (assumptions.subtype === 'freight_cost_increase' && (accName.includes('freight') || accName.includes('shipping') || accName.includes('transport') || accName.includes('delivery'))) {
                isAffected = true;
              }

              if (isAffected) {
                simAmt = origAmt.times(new Decimal(1).plus(new Decimal(percentage).div(100)));
              }
            }
          }
        }

        originalTotal = originalTotal.plus(origAmt);
        simulatedTotal = simulatedTotal.plus(simAmt);

        simulatedLines.push({
          accountId: line.accountId.toString(),
          siteId: line.siteId ? line.siteId.toString() : null,
          costCenterId: line.costCenterId ? line.costCenterId.toString() : null,
          productId: line.productId ? line.productId.toString() : null,
          materialId: line.materialId ? line.materialId.toString() : null,
          customerId: line.customerId ? line.customerId.toString() : null,
          periodMonth: line.periodMonth,
          originalAmount: origAmt.toNumber(),
          simulatedAmount: simAmt.toNumber(),
          variance: simAmt.minus(origAmt).toNumber(),
        });
      }
    } else if (assumptions.subtype === 'currency_rate_change') {
      const rateRecord = await this.prisma.exchangeRate.findFirst({
        where: {
          companyId,
          fromCurrency: assumptions.fromCurrency,
          toCurrency: assumptions.toCurrency,
        },
        orderBy: { rateDate: 'desc' },
      });
      const oldRate = rateRecord ? Number(rateRecord.rate) : 1;
      const rateMultiplier = new Decimal(assumptions.newRate ?? oldRate).div(oldRate);

      const materials = await this.prisma.material.findMany({
        where: { companyId },
      });
      const materialSupplierMap = new Map<bigint, bigint>();
      for (const mat of materials) {
        if (mat.supplierId) {
          materialSupplierMap.set(mat.id, mat.supplierId);
        }
      }

      for (const line of originalLines) {
        const origAmt = new Decimal(Number(line.amount));
        let simAmt = origAmt;

        let isAffected = false;
        if (
          assumptions.targetAccountIds &&
          assumptions.targetAccountIds.includes(line.accountId.toString())
        ) {
          isAffected = true;
        } else if (
          line.customerId &&
          assumptions.targetCustomerIds &&
          assumptions.targetCustomerIds.includes(line.customerId.toString())
        ) {
          isAffected = true;
        } else if (line.materialId) {
          const supplierId = materialSupplierMap.get(line.materialId);
          if (
            supplierId &&
            assumptions.targetSupplierIds &&
            assumptions.targetSupplierIds.includes(supplierId.toString())
          ) {
            isAffected = true;
          }
        }

        if (isAffected) {
          simAmt = origAmt.times(rateMultiplier);
        }

        originalTotal = originalTotal.plus(origAmt);
        simulatedTotal = simulatedTotal.plus(simAmt);

        simulatedLines.push({
          accountId: line.accountId.toString(),
          siteId: line.siteId ? line.siteId.toString() : null,
          costCenterId: line.costCenterId ? line.costCenterId.toString() : null,
          productId: line.productId ? line.productId.toString() : null,
          materialId: line.materialId ? line.materialId.toString() : null,
          customerId: line.customerId ? line.customerId.toString() : null,
          periodMonth: line.periodMonth,
          originalAmount: origAmt.toNumber(),
          simulatedAmount: simAmt.toNumber(),
          variance: simAmt.minus(origAmt).toNumber(),
        });
      }
    } else if (assumptions.subtype === 'demand_decrease') {
      for (const line of originalLines) {
        const origAmt = new Decimal(Number(line.amount));
        let simAmt = origAmt;

        const accType = accountMap.get(line.accountId);
        if (accType === 'revenue' || accType === 'cogs') {
          let isAffected = true;
          if (assumptions.productIds && assumptions.productIds.length > 0) {
            isAffected = line.productId
              ? assumptions.productIds.includes(line.productId.toString())
              : false;
          }
          if (isAffected) {
            simAmt = origAmt.times(
              new Decimal(1).minus(new Decimal(assumptions.percentage ?? 0).div(100)),
            );
          }
        }

        originalTotal = originalTotal.plus(origAmt);
        simulatedTotal = simulatedTotal.plus(simAmt);

        simulatedLines.push({
          accountId: line.accountId.toString(),
          siteId: line.siteId ? line.siteId.toString() : null,
          costCenterId: line.costCenterId ? line.costCenterId.toString() : null,
          productId: line.productId ? line.productId.toString() : null,
          materialId: line.materialId ? line.materialId.toString() : null,
          customerId: line.customerId ? line.customerId.toString() : null,
          periodMonth: line.periodMonth,
          originalAmount: origAmt.toNumber(),
          simulatedAmount: simAmt.toNumber(),
          variance: simAmt.minus(origAmt).toNumber(),
        });
      }
    } else if (assumptions.subtype === 'branch_expansion') {
      for (const line of originalLines) {
        const origAmt = new Decimal(Number(line.amount));
        originalTotal = originalTotal.plus(origAmt);
        simulatedTotal = simulatedTotal.plus(origAmt);

        simulatedLines.push({
          accountId: line.accountId.toString(),
          siteId: line.siteId ? line.siteId.toString() : null,
          costCenterId: line.costCenterId ? line.costCenterId.toString() : null,
          productId: line.productId ? line.productId.toString() : null,
          materialId: line.materialId ? line.materialId.toString() : null,
          customerId: line.customerId ? line.customerId.toString() : null,
          periodMonth: line.periodMonth,
          originalAmount: origAmt.toNumber(),
          simulatedAmount: origAmt.toNumber(),
          variance: 0,
        });
      }

      // Add simulated branch lines distributed equally over 12 months
      const simulatedRevenuePerMonth = new Decimal(assumptions.revenueAmount ?? 0).div(12);
      const simulatedExpensePerMonth = new Decimal(assumptions.expenseAmount ?? 0).div(12);

      for (let month = 1; month <= 12; month++) {
        // Simulated Revenue
        simulatedTotal = simulatedTotal.plus(simulatedRevenuePerMonth);
        simulatedLines.push({
          accountId: assumptions.revenueAccountId!,
          siteId: null, // Simulated branch (Alexander/siteName is not saved as DB site yet)
          costCenterId: null,
          productId: null,
          materialId: null,
          customerId: null,
          periodMonth: month,
          originalAmount: 0,
          simulatedAmount: simulatedRevenuePerMonth.toNumber(),
          variance: simulatedRevenuePerMonth.toNumber(),
        });

        // Simulated Expense
        simulatedTotal = simulatedTotal.plus(simulatedExpensePerMonth);
        simulatedLines.push({
          accountId: assumptions.expenseAccountId!,
          siteId: null,
          costCenterId: null,
          productId: null,
          materialId: null,
          customerId: null,
          periodMonth: month,
          originalAmount: 0,
          simulatedAmount: simulatedExpensePerMonth.toNumber(),
          variance: simulatedExpensePerMonth.toNumber(),
        });
      }
    }

    return {
      originalTotal: originalTotal.toNumber(),
      simulatedTotal: simulatedTotal.toNumber(),
      varianceAmount: simulatedTotal.minus(originalTotal).toNumber(),
      variancePercentage:
        originalTotal.gt(0)
          ? simulatedTotal.minus(originalTotal).div(originalTotal).times(100).toNumber()
          : 0,
      lines: simulatedLines,
    };
  }

  async getCostingImpact(
    scenarioId: bigint,
    companyId: bigint,
    tenantId: bigint,
  ): Promise<ScenarioCostingImpactDto> {
    await this.ensureCompanyBelongsToTenant(companyId, tenantId);

    const scenario = await this.prisma.scenario.findFirst({
      where: { id: scenarioId, companyId },
    });
    if (!scenario) {
      throw new NotFoundException(`Scenario with ID ${scenarioId} not found under this company`);
    }

    const assumptions: ScenarioAssumptionsDto = scenario.assumptionsJson
      ? (JSON.parse(scenario.assumptionsJson) as ScenarioAssumptionsDto)
      : ({} as ScenarioAssumptionsDto);

    const recipes = await this.prisma.bomRecipe.findMany({
      where: { companyId, isActive: true },
    });

    const productIds = [...new Set(recipes.map((r) => r.productId))];
    if (productIds.length === 0) {
      return {
        scenarioId: scenario.id.toString(),
        scenarioName: scenario.name,
        affectedProducts: [],
        topCostDrivers: [],
        summary: {
          totalProducts: 0,
          affectedCount: 0,
          averageCostIncreasePct: 0,
          totalProfitImpact: 0,
        },
      };
    }

    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, companyId },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    const recipeMap = new Map<bigint, bigint>();
    for (const recipe of recipes) {
      if (!recipeMap.has(recipe.productId)) {
        recipeMap.set(recipe.productId, recipe.id);
      }
    }

    const affectedProducts: ScenarioCostingImpactDto['affectedProducts'] = [];

    for (const productId of productIds) {
      const product = productMap.get(productId);
      if (!product) continue;

      const recipeId = recipeMap.get(productId);
      const originalCost = await this.costingService.calculateStandardCost(
        productId,
        companyId,
        tenantId,
        recipeId,
      );
      const simulatedCost = await this.costingService.calculateStandardCost(
        productId,
        companyId,
        tenantId,
        recipeId,
        assumptions,
      );

      const previousStandardCost = originalCost.totalCost;
      const newSimulatedStandardCost = simulatedCost.totalCost;
      const costIncreaseAmount = newSimulatedStandardCost - previousStandardCost;
      const costIncreasePct = previousStandardCost > 0
        ? (costIncreaseAmount / previousStandardCost) * 100
        : 0;
      const previousGrossMarginPct = originalCost.grossMarginPct;
      const newGrossMarginPct = simulatedCost.grossMarginPct;
      const profitImpact = simulatedCost.grossProfit - originalCost.grossProfit;
      const marginImpact = newGrossMarginPct - previousGrossMarginPct;

      affectedProducts.push({
        productId: product.id.toString(),
        productName: product.name,
        sku: product.sku,
        previousStandardCost,
        newSimulatedStandardCost,
        costIncreaseAmount,
        costIncreasePct: Number(costIncreasePct.toFixed(2)),
        previousGrossMarginPct,
        newGrossMarginPct,
        profitImpact,
        marginImpact: Number(marginImpact.toFixed(2)),
      });
    }

    affectedProducts.sort((a, b) => Math.abs(b.costIncreasePct) - Math.abs(a.costIncreasePct));

    const totalProducts = affectedProducts.length;
    const affectedCount = affectedProducts.filter((p) => p.costIncreaseAmount !== 0).length;
    const averageCostIncreasePct = totalProducts > 0
      ? affectedProducts.reduce((sum, p) => sum + p.costIncreasePct, 0) / totalProducts
      : 0;
    const totalProfitImpact = affectedProducts.reduce((sum, p) => sum + p.profitImpact, 0);

    const topCostDrivers: ScenarioCostingImpactDto['topCostDrivers'] = [];
    if (assumptions.subtype && assumptions.percentage) {
      const driverName = assumptions.subtype.replace(/_/g, ' ');
      topCostDrivers.push({
        name: driverName,
        impactPct: assumptions.percentage,
        description: `Scenario assumption: ${driverName} of ${assumptions.percentage}%`,
      });
    }

    return {
      scenarioId: scenario.id.toString(),
      scenarioName: scenario.name,
      affectedProducts,
      topCostDrivers,
      summary: {
        totalProducts,
        affectedCount,
        averageCostIncreasePct: Number(averageCostIncreasePct.toFixed(2)),
        totalProfitImpact: Number(totalProfitImpact.toFixed(2)),
      },
    };
  }

  async getComparison(
    companyId: bigint,
    tenantId: bigint,
    previousYear: number,
    currentYear: number,
    scenarioId?: bigint,
    productId?: bigint,
  ) {
    const productFilter = productId ? { productId } : {};

    const getYearTotals = async (fy: number) => {
      const budgetLines = await this.prisma.budgetLine.findMany({
        where: {
          budgetCycle: { companyId, fiscalYear: fy },
          ...productFilter,
        },
      });
      const actualLines = await this.prisma.actualLine.findMany({
        where: {
          actualImport: { companyId },
          transactionDate: {
            gte: new Date(fy, 0, 1),
            lt: new Date(fy + 1, 0, 1),
          },
          ...productFilter,
        },
      });

      const accounts = await this.prisma.account.findMany({ where: { companyId } });
      const accountMap = new Map(accounts.map(a => [a.id.toString(), a.type]));

      let sales = 0, inventory = 0, rawMaterials = 0, packaging = 0, labor = 0, utilities = 0, overhead = 0;
      let productionQty = 0, waste = 0;

      const allLines = [...budgetLines, ...actualLines];
      for (const line of allLines) {
        const amt = Number(line.amount);
        const acctType = accountMap.get(line.accountId.toString());
        if (acctType === 'revenue') sales += amt;
        else if (acctType === 'cogs') rawMaterials += amt;
        else if (acctType === 'expense') overhead += amt;
      }

      const productionPlans = await this.prisma.productionPlan.findMany({
        where: { companyId, fiscalYear: fy, ...productFilter },
      });
      for (const p of productionPlans) {
        productionQty += Number(p.plannedQty) || Number(p.actualQty) || 0;
      }

      const inventorySnapshots = await this.prisma.inventorySnapshot.findMany({
        where: { companyId, snapshotDate: { gte: new Date(fy, 0, 1), lt: new Date(fy + 1, 0, 1) }, ...productFilter },
      });
      inventory = inventorySnapshots.reduce((sum, s) => sum + Number(s.inventoryValue), 0);

      const bomRecipes = await this.prisma.bomRecipe.findMany({
        where: { companyId, isActive: true },
        include: { bomLines: { include: { material: true } } },
      });
      for (const bom of bomRecipes) {
        const outputQty = Number(bom.outputQty) || 1;
        const wastePct = Number(bom.wastagePct) || 0;
        waste += wastePct;
        for (const line of bom.bomLines) {
          const cat = (line.costCategory || line.material.materialType || 'raw_material').toLowerCase();
          const lineCost = Number(line.qtyPerOutput) * Number(line.unitCost || line.material.purchasePrice);
          if (cat === 'raw_material') rawMaterials += lineCost / outputQty;
          else if (['packaging', 'packaging_material', 'can', 'lid', 'carton', 'label'].includes(cat)) packaging += lineCost / outputQty;
          else if (cat === 'labor') labor += lineCost / outputQty;
          else if (cat === 'utilities' || cat === 'utility') utilities += lineCost / outputQty;
          else if (cat === 'overhead') overhead += lineCost / outputQty;
        }
      }
      if (bomRecipes.length > 0) waste = waste / bomRecipes.length;

      const grossMargin = sales > 0 ? ((sales - rawMaterials - packaging) / sales) * 100 : 0;
      const netMargin = sales > 0 ? ((sales - rawMaterials - packaging - labor - utilities - overhead) / sales) * 100 : 0;

      return { sales, inventory, rawMaterials, packaging, labor, utilities, overhead, productionQty, waste, grossMargin, netMargin };
    };

    const prevYearData = await getYearTotals(previousYear);
    const currYearData = await getYearTotals(currentYear);

    let scenarioData = currYearData;
    if (scenarioId) {
      const scenario = await this.prisma.scenario.findFirst({
        where: { id: scenarioId, companyId },
      });
      if (scenario) {
        const assumptions = (scenario.assumptionsJson ? JSON.parse(scenario.assumptionsJson as string) : {}) as ScenarioAssumptionsDto;
        const percentage = Number(assumptions.percentage ?? 0);
        scenarioData = { ...currYearData };
        if (assumptions.subtype === 'increase_material_prices') {
          scenarioData.rawMaterials = currYearData.rawMaterials * (1 + percentage / 100);
        } else if (assumptions.subtype === 'demand_decrease') {
          scenarioData.sales = currYearData.sales * (1 - percentage / 100);
          scenarioData.productionQty = currYearData.productionQty * (1 - percentage / 100);
        } else if (assumptions.subtype === 'labor_cost_increase') {
          scenarioData.labor = currYearData.labor * (1 + percentage / 100);
        } else if (assumptions.subtype === 'utilities_cost_increase') {
          scenarioData.utilities = currYearData.utilities * (1 + percentage / 100);
        }
      }
    }

    const categories = ['sales', 'inventory', 'rawMaterials', 'packaging', 'labor', 'utilities', 'overhead', 'productionQty', 'waste', 'grossMargin', 'netMargin'] as const;
    const labels: Record<string, string> = {
      sales: 'Sales', inventory: 'Inventory Value', rawMaterials: 'Raw Materials', packaging: 'Packaging',
      labor: 'Labor', utilities: 'Utilities', overhead: 'Overhead', productionQty: 'Production Quantity',
      waste: 'Waste %', grossMargin: 'Gross Margin %', netMargin: 'Net Margin %',
    };

    return categories.map(cat => {
      const prev = Number(prevYearData[cat]);
      const curr = Number(currYearData[cat]);
      const scen = Number(scenarioData[cat]);
      const variancePct = curr !== 0 ? ((scen - curr) / Math.abs(curr)) * 100 : 0;
      return {
        category: labels[cat],
        previousYear: Number(prev.toFixed(2)),
        currentYear: Number(curr.toFixed(2)),
        scenarioValue: Number(scen.toFixed(2)),
        variance: Number((scen - curr).toFixed(2)),
        variancePct: Number(variancePct.toFixed(2)),
      };
    });
  }
}
