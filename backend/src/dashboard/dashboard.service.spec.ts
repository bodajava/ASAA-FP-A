import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '../prisma.service';

describe('DashboardService', () => {
  let service: DashboardService;

  const mockPrismaService = {
    company: {
      findFirst: jest.fn(),
    },
    $queryRaw: jest.fn(),
  };

  type DashboardServiceWithPrivate = {
    ensureCompanyBelongsToTenant: (
      companyId: bigint,
      tenantId: bigint,
    ) => Promise<void>;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
    jest.clearAllMocks();
  });

  describe('ensureCompanyBelongsToTenant', () => {
    it('should throw NotFoundException if company is not found under tenant', async () => {
      mockPrismaService.company.findFirst.mockResolvedValue(null);

      await expect(
        (
          service as unknown as DashboardServiceWithPrivate
        ).ensureCompanyBelongsToTenant(1n, 2n),
      ).rejects.toThrow(NotFoundException);
    });

    it('should not throw if company exists under tenant', async () => {
      mockPrismaService.company.findFirst.mockResolvedValue({
        id: 1n,
        tenantId: 2n,
      });

      await expect(
        (
          service as unknown as DashboardServiceWithPrivate
        ).ensureCompanyBelongsToTenant(1n, 2n),
      ).resolves.not.toThrow();
    });
  });

  describe('getSummary', () => {
    it('should retrieve and calculate correct KPIs', async () => {
      mockPrismaService.company.findFirst.mockResolvedValue({
        id: 1n,
        tenantId: 2n,
      });
      mockPrismaService.$queryRaw.mockResolvedValue([
        {
          revenue: 1250000n,
          expenses: 450000n,
          cogs: 500000n,
          cash_balance: 850000n,
          budget_revenue: 1000000n,
          budget_expense: 400000n,
          forecast_revenue: 1200000n,
        },
      ]);

      const result = await service.getSummary(1n, 2n, { fiscal_year: 2026 });
      expect(result).toEqual({
        revenue: 1250000,
        expenses: 450000,
        gross_profit: 750000, // 1250000 - 500000
        net_profit: 300000, // 750000 - 450000
        cash_balance: 850000,
        budget_utilization: 125, // 1250000 / 1000000
        forecast_accuracy: 96, // 1 - 50000 / 1250000 = 96%
      });
    });
  });

  describe('getBudgetUtilization', () => {
    it('should retrieve and calculate budget utilization percentages', async () => {
      mockPrismaService.company.findFirst.mockResolvedValue({
        id: 1n,
        tenantId: 2n,
      });
      mockPrismaService.$queryRaw.mockResolvedValue([
        {
          revenue: 95000,
          expenses: 10500,
          budget_revenue: 100000,
          budget_expense: 10000,
        },
      ]);

      const result = await service.getBudgetUtilization(1n, 2n, {
        fiscal_year: 2026,
      });
      expect(result).toEqual({
        revenue_utilization: 95,
        expense_utilization: 105,
      });
    });
  });

  describe('getTopProducts', () => {
    it('should retrieve top products sorted and limited to 5', async () => {
      mockPrismaService.company.findFirst.mockResolvedValue({
        id: 1n,
        tenantId: 2n,
      });
      mockPrismaService.$queryRaw.mockResolvedValue([
        { id: 3n, name: 'Product A', value: 500000 },
        { id: 4n, name: 'Product B', value: 300000 },
      ]);

      const result = await service.getTopProducts(1n, 2n, {
        fiscal_year: 2026,
      });
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: '3',
        name: 'Product A',
        value: 500000,
      });
    });
  });
});
