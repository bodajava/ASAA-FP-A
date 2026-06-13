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
  constructor(private readonly prisma: PrismaService) {}

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
    let originalTotal = 0;
    let simulatedTotal = 0;

    if (assumptions.subtype === 'increase_material_prices') {
      const recipes = await this.prisma.bomRecipe.findMany({
        where: { companyId, isActive: true },
        include: { bomLines: { include: { material: true } } },
      });

      const productCostFactors = new Map<bigint, number>();
      for (const recipe of recipes) {
        let originalMatCost = 0;
        let simulatedMatCost = 0;

        for (const line of recipe.bomLines) {
          const rawPrice = Number(line.material.purchasePrice);
          const qty = Number(line.qtyPerOutput);
          const lineWastage = Number(line.wastagePct);

          const originalLineCost = qty * rawPrice * (1 + lineWastage);
          originalMatCost += originalLineCost;

          let isAffected = true;
          if (assumptions.materialIds && assumptions.materialIds.length > 0) {
            isAffected = assumptions.materialIds.includes(
              line.materialId.toString(),
            );
          }

          const simPrice = isAffected
            ? rawPrice * (1 + (assumptions.percentage ?? 0) / 100)
            : rawPrice;
          const simLineCost = qty * simPrice * (1 + lineWastage);
          simulatedMatCost += simLineCost;
        }

        const wastage = Number(recipe.wastagePct);
        const labor = Number(recipe.laborCost);
        const overhead = Number(recipe.overheadCost);

        const originalTotalCost =
          originalMatCost * (1 + wastage) + labor + overhead;
        const simulatedTotalCost =
          simulatedMatCost * (1 + wastage) + labor + overhead;

        if (originalTotalCost > 0) {
          productCostFactors.set(
            recipe.productId,
            simulatedTotalCost / originalTotalCost,
          );
        }
      }

      for (const line of originalLines) {
        const origAmt = Number(line.amount);
        let simAmt = origAmt;

        if (line.materialId) {
          let isAffected = true;
          if (assumptions.materialIds && assumptions.materialIds.length > 0) {
            isAffected = assumptions.materialIds.includes(
              line.materialId.toString(),
            );
          }
          if (isAffected) {
            simAmt = origAmt * (1 + (assumptions.percentage ?? 0) / 100);
          }
        } else if (line.productId) {
          const accType = accountMap.get(line.accountId);
          if (accType === 'cogs' || accType === 'expense') {
            const factor = productCostFactors.get(line.productId) ?? 1;
            simAmt = origAmt * factor;
          }
        }

        originalTotal += origAmt;
        simulatedTotal += simAmt;

        simulatedLines.push({
          accountId: line.accountId.toString(),
          siteId: line.siteId ? line.siteId.toString() : null,
          costCenterId: line.costCenterId ? line.costCenterId.toString() : null,
          productId: line.productId ? line.productId.toString() : null,
          materialId: line.materialId ? line.materialId.toString() : null,
          customerId: line.customerId ? line.customerId.toString() : null,
          periodMonth: line.periodMonth,
          originalAmount: origAmt,
          simulatedAmount: simAmt,
          variance: simAmt - origAmt,
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
      const rateMultiplier = (assumptions.newRate ?? oldRate) / oldRate;

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
        const origAmt = Number(line.amount);
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
          simAmt = origAmt * rateMultiplier;
        }

        originalTotal += origAmt;
        simulatedTotal += simAmt;

        simulatedLines.push({
          accountId: line.accountId.toString(),
          siteId: line.siteId ? line.siteId.toString() : null,
          costCenterId: line.costCenterId ? line.costCenterId.toString() : null,
          productId: line.productId ? line.productId.toString() : null,
          materialId: line.materialId ? line.materialId.toString() : null,
          customerId: line.customerId ? line.customerId.toString() : null,
          periodMonth: line.periodMonth,
          originalAmount: origAmt,
          simulatedAmount: simAmt,
          variance: simAmt - origAmt,
        });
      }
    } else if (assumptions.subtype === 'demand_decrease') {
      for (const line of originalLines) {
        const origAmt = Number(line.amount);
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
            simAmt = origAmt * (1 - (assumptions.percentage ?? 0) / 100);
          }
        }

        originalTotal += origAmt;
        simulatedTotal += simAmt;

        simulatedLines.push({
          accountId: line.accountId.toString(),
          siteId: line.siteId ? line.siteId.toString() : null,
          costCenterId: line.costCenterId ? line.costCenterId.toString() : null,
          productId: line.productId ? line.productId.toString() : null,
          materialId: line.materialId ? line.materialId.toString() : null,
          customerId: line.customerId ? line.customerId.toString() : null,
          periodMonth: line.periodMonth,
          originalAmount: origAmt,
          simulatedAmount: simAmt,
          variance: simAmt - origAmt,
        });
      }
    } else if (assumptions.subtype === 'branch_expansion') {
      for (const line of originalLines) {
        const origAmt = Number(line.amount);
        originalTotal += origAmt;
        simulatedTotal += origAmt;

        simulatedLines.push({
          accountId: line.accountId.toString(),
          siteId: line.siteId ? line.siteId.toString() : null,
          costCenterId: line.costCenterId ? line.costCenterId.toString() : null,
          productId: line.productId ? line.productId.toString() : null,
          materialId: line.materialId ? line.materialId.toString() : null,
          customerId: line.customerId ? line.customerId.toString() : null,
          periodMonth: line.periodMonth,
          originalAmount: origAmt,
          simulatedAmount: origAmt,
          variance: 0,
        });
      }

      // Add simulated branch lines distributed equally over 12 months
      const simulatedRevenuePerMonth = (assumptions.revenueAmount ?? 0) / 12;
      const simulatedExpensePerMonth = (assumptions.expenseAmount ?? 0) / 12;

      for (let month = 1; month <= 12; month++) {
        // Simulated Revenue
        simulatedTotal += simulatedRevenuePerMonth;
        simulatedLines.push({
          accountId: assumptions.revenueAccountId!,
          siteId: null, // Simulated branch (Alexander/siteName is not saved as DB site yet)
          costCenterId: null,
          productId: null,
          materialId: null,
          customerId: null,
          periodMonth: month,
          originalAmount: 0,
          simulatedAmount: simulatedRevenuePerMonth,
          variance: simulatedRevenuePerMonth,
        });

        // Simulated Expense
        simulatedTotal += simulatedExpensePerMonth;
        simulatedLines.push({
          accountId: assumptions.expenseAccountId!,
          siteId: null,
          costCenterId: null,
          productId: null,
          materialId: null,
          customerId: null,
          periodMonth: month,
          originalAmount: 0,
          simulatedAmount: simulatedExpensePerMonth,
          variance: simulatedExpensePerMonth,
        });
      }
    }

    return {
      originalTotal,
      simulatedTotal,
      varianceAmount: simulatedTotal - originalTotal,
      variancePercentage:
        originalTotal > 0
          ? ((simulatedTotal - originalTotal) / originalTotal) * 100
          : 0,
      lines: simulatedLines,
    };
  }
}
