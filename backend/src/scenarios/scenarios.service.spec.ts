import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ScenariosService, mapScenarioToResponse } from './scenarios.service';
import { PrismaService } from '../prisma.service';
import { CreateScenarioDto } from './dto/create-scenario.dto';
import { UpdateScenarioDto } from './dto/update-scenario.dto';
import { PreviewSimulationDto, BaseCycleType } from './dto/preview-simulation.dto';
import { ScenarioAssumptionsDto } from './dto/scenario-assumptions.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { ScenarioType } from '@prisma/client';

describe('ScenariosService', () => {
  let service: ScenariosService;
  let prisma: jest.Mocked<PrismaService>;

  const mockPrisma = {
    company: { findFirst: jest.fn() },
    scenario: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    auditLog: { create: jest.fn() },
    material: { findMany: jest.fn() },
    supplier: { findMany: jest.fn() },
    customer: { findMany: jest.fn() },
    account: { findMany: jest.fn() },
    product: { findMany: jest.fn() },
    budgetCycle: { findFirst: jest.fn() },
    forecastCycle: { findFirst: jest.fn() },
    bomRecipe: { findMany: jest.fn() },
    bomLine: { findMany: jest.fn() },
    exchangeRate: { findFirst: jest.fn() },
    $transaction: jest.fn(),
  };

  // Use plain numbers for mock data to avoid BigInt JSON.stringify issues
  const mockCompany = { id: 1, tenantId: 1, name: 'Test Co' };
  const mockCompanyId = BigInt(1);
  const mockTenantId = BigInt(1);
  const mockUserId = BigInt(1);
  const mockScenarioId = 1;

  const mockScenario = {
    id: 1,
    companyId: 1,
    name: 'Test Scenario',
    scenarioType: ScenarioType.custom,
    assumptionsJson: JSON.stringify({
      subtype: 'branch_expansion',
      siteName: 'New Branch',
      revenueAmount: 100000,
      expenseAmount: 50000,
      revenueAccountId: '1',
      expenseAccountId: '2',
    }),
    createdBy: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const createDto: CreateScenarioDto = {
    name: 'Test Scenario',
    scenarioType: ScenarioType.custom,
    assumptions: {
      subtype: 'branch_expansion',
      siteName: 'New Branch',
      revenueAmount: 100000,
      expenseAmount: 50000,
      revenueAccountId: '1',
      expenseAccountId: '2',
    },
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    mockPrisma.$transaction.mockImplementation((cb: any) => cb(mockPrisma));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScenariosService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ScenariosService>(ScenariosService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a scenario', async () => {
      mockPrisma.company.findFirst.mockResolvedValue(mockCompany);
      mockPrisma.account.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);
      mockPrisma.scenario.create.mockResolvedValue(mockScenario);

      const result = await service.create(createDto, mockCompanyId, mockTenantId, mockUserId);

      expect(mockPrisma.company.findFirst).toHaveBeenCalledWith({
        where: { id: mockCompanyId, tenantId: mockTenantId },
      });
      expect(mockPrisma.scenario.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          companyId: mockCompanyId,
          name: 'Test Scenario',
          createdBy: mockUserId,
        }),
      });
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
      expect(result.name).toBe('Test Scenario');
    });

    it('should throw NotFoundException if company not found under tenant', async () => {
      mockPrisma.company.findFirst.mockResolvedValue(null);

      await expect(
        service.create(createDto, mockCompanyId, mockTenantId, mockUserId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for invalid assumptions subtype', async () => {
      mockPrisma.company.findFirst.mockResolvedValue(mockCompany);
      const invalidDto = { ...createDto, assumptions: { subtype: 'invalid_type' } as any };

      await expect(
        service.create(invalidDto, mockCompanyId, mockTenantId, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for branch_expansion missing accounts', async () => {
      mockPrisma.company.findFirst.mockResolvedValue(mockCompany);
      mockPrisma.account.findMany.mockResolvedValue([{ id: 1 }]); // Only 1 account found, needs 2

      await expect(
        service.create(createDto, mockCompanyId, mockTenantId, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return paginated scenarios', async () => {
      mockPrisma.company.findFirst.mockResolvedValue(mockCompany);
      mockPrisma.scenario.count.mockResolvedValue(1);
      mockPrisma.scenario.findMany.mockResolvedValue([mockScenario]);

      const pagination: PaginationDto = { page: 1, limit: 10 };
      const result = await service.findAll(mockCompanyId, mockTenantId, pagination);

      expect(result.total).toBe(1);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('Test Scenario');
    });

    it('should filter scenarios by type search', async () => {
      mockPrisma.company.findFirst.mockResolvedValue(mockCompany);
      mockPrisma.scenario.count.mockResolvedValue(1);
      mockPrisma.scenario.findMany.mockResolvedValue([mockScenario]);

      const pagination: PaginationDto = { page: 1, limit: 10, search: 'CUSTOM' };
      await service.findAll(mockCompanyId, mockTenantId, pagination);

      expect(mockPrisma.scenario.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ scenarioType: ScenarioType.custom }),
        }),
      );
    });

    it('should filter scenarios by name search', async () => {
      mockPrisma.company.findFirst.mockResolvedValue(mockCompany);
      mockPrisma.scenario.count.mockResolvedValue(0);
      mockPrisma.scenario.findMany.mockResolvedValue([]);

      const pagination: PaginationDto = { page: 1, limit: 10, search: 'Test' };
      await service.findAll(mockCompanyId, mockTenantId, pagination);

      expect(mockPrisma.scenario.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ name: { contains: 'Test' } }),
        }),
      );
    });

    it('should throw NotFoundException if company not found', async () => {
      mockPrisma.company.findFirst.mockResolvedValue(null);

      await expect(
        service.findAll(mockCompanyId, mockTenantId, { page: 1, limit: 10 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOne', () => {
    it('should return a scenario by id', async () => {
      mockPrisma.company.findFirst.mockResolvedValue(mockCompany);
      mockPrisma.scenario.findFirst.mockResolvedValue(mockScenario);

      const result = await service.findOne(mockScenarioId, mockCompanyId, mockTenantId);

      expect(result.id).toBe('1');
      expect(result.name).toBe('Test Scenario');
    });

    it('should throw NotFoundException if scenario not found', async () => {
      mockPrisma.company.findFirst.mockResolvedValue(mockCompany);
      mockPrisma.scenario.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne(mockScenarioId, mockCompanyId, mockTenantId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const updateDto: UpdateScenarioDto = { name: 'Updated Scenario' };

    it('should update a scenario', async () => {
      mockPrisma.company.findFirst.mockResolvedValue(mockCompany);
      mockPrisma.scenario.findFirst.mockResolvedValue(mockScenario);
      mockPrisma.scenario.update.mockResolvedValue({ ...mockScenario, name: 'Updated Scenario' });

      const result = await service.update(mockScenarioId, updateDto, mockCompanyId, mockTenantId, mockUserId);

      expect(mockPrisma.scenario.update).toHaveBeenCalledWith({
        where: { id: mockScenarioId },
        data: expect.objectContaining({ name: 'Updated Scenario' }),
      });
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
      expect(result.name).toBe('Updated Scenario');
    });

    it('should throw NotFoundException if scenario not found', async () => {
      mockPrisma.company.findFirst.mockResolvedValue(mockCompany);
      mockPrisma.scenario.findFirst.mockResolvedValue(null);

      await expect(
        service.update(mockScenarioId, updateDto, mockCompanyId, mockTenantId, mockUserId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should validate assumptions on update if provided', async () => {
      mockPrisma.company.findFirst.mockResolvedValue(mockCompany);
      mockPrisma.account.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);
      mockPrisma.scenario.findFirst.mockResolvedValue(mockScenario);
      mockPrisma.scenario.update.mockResolvedValue(mockScenario);

      const updateWithAssumptions: UpdateScenarioDto = {
        assumptions: {
          subtype: 'branch_expansion',
          siteName: 'Another Branch',
          revenueAmount: 200000,
          expenseAmount: 80000,
          revenueAccountId: '1',
          expenseAccountId: '2',
        },
      };

      const result = await service.update(mockScenarioId, updateWithAssumptions, mockCompanyId, mockTenantId, mockUserId);
      expect(result).toBeDefined();
    });
  });

  describe('remove', () => {
    it('should delete a scenario', async () => {
      mockPrisma.company.findFirst.mockResolvedValue(mockCompany);
      mockPrisma.scenario.findFirst.mockResolvedValue(mockScenario);
      mockPrisma.scenario.delete.mockResolvedValue(mockScenario);

      const result = await service.remove(mockScenarioId, mockCompanyId, mockTenantId, mockUserId);

      expect(mockPrisma.scenario.delete).toHaveBeenCalledWith({ where: { id: mockScenarioId } });
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          entityType: 'Scenario',
          action: 'delete',
        }),
      });
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException if scenario not found', async () => {
      mockPrisma.company.findFirst.mockResolvedValue(mockCompany);
      mockPrisma.scenario.findFirst.mockResolvedValue(null);

      await expect(
        service.remove(mockScenarioId, mockCompanyId, mockTenantId, mockUserId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('simulateImpact', () => {
    it('should simulate branch_expansion with overrideAssumptions', async () => {
      mockPrisma.company.findFirst.mockResolvedValue(mockCompany);
      mockPrisma.account.findMany.mockResolvedValue([{ id: 1, type: 'revenue' }, { id: 2, type: 'expense' }]);
      mockPrisma.budgetCycle.findFirst.mockResolvedValue({
        id: 1,
        budgetLines: [{ accountId: 1, siteId: null, costCenterId: null, productId: null, materialId: null, customerId: null, periodMonth: 1, amount: 1000 }],
      } as any);

      const previewDto: PreviewSimulationDto = {
        baseType: BaseCycleType.BUDGET,
        baseId: '1',
        overrideAssumptions: {
          subtype: 'branch_expansion',
          siteName: 'Alex Branch',
          revenueAmount: 120000,
          expenseAmount: 60000,
          revenueAccountId: '1',
          expenseAccountId: '2',
        },
      };

      const result = await service.simulateImpact(previewDto, mockCompanyId, mockTenantId);

      expect(result.originalTotal).toBe(1000);
      expect(result.simulatedTotal).toBeGreaterThan(0);
      expect(result.lines.length).toBeGreaterThan(0);
      expect(result.variancePercentage).toBeDefined();
    });

    it('should simulate using scenarioId', async () => {
      mockPrisma.company.findFirst.mockResolvedValue(mockCompany);
      mockPrisma.account.findMany.mockResolvedValue([{ id: 1, type: 'revenue' }, { id: 2, type: 'expense' }]);
      mockPrisma.scenario.findFirst.mockResolvedValue(mockScenario);
      mockPrisma.budgetCycle.findFirst.mockResolvedValue({
        id: 1,
        budgetLines: [{ accountId: 1, siteId: null, costCenterId: null, productId: null, materialId: null, customerId: null, periodMonth: 1, amount: 5000 }],
      } as any);

      const previewDto: PreviewSimulationDto = {
        baseType: BaseCycleType.BUDGET,
        baseId: '1',
        scenarioId: '1',
      };

      const result = await service.simulateImpact(previewDto, mockCompanyId, mockTenantId);

      expect(result).toBeDefined();
      expect(result.originalTotal).toBe(5000);
    });

    it('should throw BadRequestException if neither overrideAssumptions nor scenarioId provided', async () => {
      mockPrisma.company.findFirst.mockResolvedValue(mockCompany);

      const previewDto: PreviewSimulationDto = {
        baseType: BaseCycleType.BUDGET,
        baseId: '1',
      };

      await expect(
        service.simulateImpact(previewDto, mockCompanyId, mockTenantId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should simulate demand_decrease correctly', async () => {
      mockPrisma.company.findFirst.mockResolvedValue(mockCompany);
      mockPrisma.account.findMany.mockResolvedValue([{ id: 1, type: 'revenue' }]);
      mockPrisma.budgetCycle.findFirst.mockResolvedValue({
        id: 1,
        budgetLines: [{ accountId: 1, siteId: null, costCenterId: null, productId: null, materialId: null, customerId: null, periodMonth: 1, amount: 10000 }],
      } as any);

      const previewDto: PreviewSimulationDto = {
        baseType: BaseCycleType.BUDGET,
        baseId: '1',
        overrideAssumptions: {
          subtype: 'demand_decrease',
          percentage: 10,
        },
      };

      const result = await service.simulateImpact(previewDto, mockCompanyId, mockTenantId);

      expect(result.originalTotal).toBe(10000);
      expect(result.simulatedTotal).toBe(9000);
      expect(result.varianceAmount).toBe(-1000);
    });

    it('should simulate increase_material_prices correctly', async () => {
      mockPrisma.company.findFirst.mockResolvedValue(mockCompany);
      mockPrisma.account.findMany.mockResolvedValue([{ id: 1, type: 'cogs' }]);
      mockPrisma.budgetCycle.findFirst.mockResolvedValue({
        id: 1,
        budgetLines: [
          { accountId: 1, siteId: null, costCenterId: null, productId: null, materialId: 10, customerId: null, periodMonth: 1, amount: 1000 },
        ],
      } as any);
      mockPrisma.bomRecipe.findMany.mockResolvedValue([]);

      const previewDto: PreviewSimulationDto = {
        baseType: BaseCycleType.BUDGET,
        baseId: '1',
        overrideAssumptions: {
          subtype: 'increase_material_prices',
          percentage: 15,
        },
      };

      const result = await service.simulateImpact(previewDto, mockCompanyId, mockTenantId);

      expect(result.originalTotal).toBe(1000);
      expect(result.simulatedTotal).toBe(1150);
      expect(result.varianceAmount).toBe(150);
    });

    it('should throw NotFoundException if base budget cycle not found', async () => {
      mockPrisma.company.findFirst.mockResolvedValue(mockCompany);
      mockPrisma.account.findMany.mockResolvedValue([{ id: 1, type: 'revenue' }, { id: 2, type: 'expense' }]);
      mockPrisma.budgetCycle.findFirst.mockResolvedValue(null);

      const previewDto: PreviewSimulationDto = {
        baseType: BaseCycleType.BUDGET,
        baseId: '999',
        overrideAssumptions: {
          subtype: 'branch_expansion',
          siteName: 'Test',
          revenueAmount: 100,
          expenseAmount: 50,
          revenueAccountId: '1',
          expenseAccountId: '2',
        },
      };

      await expect(
        service.simulateImpact(previewDto, mockCompanyId, mockTenantId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('simulateImpact - currency_rate_change', () => {
    it('should simulate currency rate change correctly', async () => {
      mockPrisma.company.findFirst.mockResolvedValue(mockCompany);
      mockPrisma.account.findMany.mockResolvedValue([{ id: 1, type: 'expense' }]);
      mockPrisma.exchangeRate.findFirst.mockResolvedValue({ id: 1, rate: 30, fromCurrency: 'USD', toCurrency: 'EGP', rateDate: new Date() });
      mockPrisma.material.findMany.mockResolvedValue([{ id: 10, name: 'Raw Mat', supplierId: 5 }]);
      mockPrisma.supplier.findMany.mockResolvedValue([{ id: 5, name: 'Test Supplier' }]);
      mockPrisma.budgetCycle.findFirst.mockResolvedValue({
        id: 1,
        budgetLines: [
          { accountId: 1, siteId: null, costCenterId: null, productId: null, materialId: 10, customerId: null, periodMonth: 1, amount: 3000 },
        ],
      } as any);

      const previewDto: PreviewSimulationDto = {
        baseType: BaseCycleType.BUDGET,
        baseId: '1',
        overrideAssumptions: {
          subtype: 'currency_rate_change',
          fromCurrency: 'USD',
          toCurrency: 'EGP',
          newRate: 45,
          targetSupplierIds: ['5'],
        },
      };

      const result = await service.simulateImpact(previewDto, mockCompanyId, mockTenantId);

      expect(result.originalTotal).toBe(3000);
      expect(result.simulatedTotal).toBe(4500);
    });
  });
});
