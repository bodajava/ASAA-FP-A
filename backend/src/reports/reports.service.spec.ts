import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { PrismaService } from '../prisma.service';

describe('ReportsService', () => {
  let service: ReportsService;

  const mockPrismaService = {
    company: {
      findFirst: jest.fn(),
    },
    $queryRaw: jest.fn(),
  };

  type ReportsServiceWithPrivate = {
    ensureCompanyBelongsToTenant: (
      companyId: bigint,
      tenantId: bigint,
    ) => Promise<void>;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
    jest.clearAllMocks();
  });

  describe('ensureCompanyBelongsToTenant', () => {
    it('should throw NotFoundException if company is not found under tenant', async () => {
      mockPrismaService.company.findFirst.mockResolvedValue(null);

      await expect(
        (
          service as unknown as ReportsServiceWithPrivate
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
          service as unknown as ReportsServiceWithPrivate
        ).ensureCompanyBelongsToTenant(1n, 2n),
      ).resolves.not.toThrow();
    });
  });

  describe('getPl', () => {
    it('should calculate and map profit and loss values correctly', async () => {
      mockPrismaService.company.findFirst.mockResolvedValue({
        id: 1n,
        tenantId: 2n,
      });
      mockPrismaService.$queryRaw.mockResolvedValue([
        {
          period_month: 6,
          budget_revenue: 100000n,
          budget_cogs: 60000n,
          budget_expense: 20000n,
          actual_revenue: 95000n,
          actual_cogs: 58000n,
          actual_expense: 21000n,
          forecast_revenue: 98000n,
          forecast_cogs: 59000n,
          forecast_expense: 20500n,
        },
      ]);

      const result = await service.getPl(1n, 2n, { fiscal_year: 2026 });
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        period_month: 6,
        budget_revenue: 100000,
        budget_cogs: 60000,
        budget_gross_profit: 40000,
        budget_expense: 20000,
        budget_net_profit: 20000,
        actual_revenue: 95000,
        actual_cogs: 58000,
        actual_gross_profit: 37000,
        actual_expense: 21000,
        actual_net_profit: 16000,
        forecast_revenue: 98000,
        forecast_cogs: 59000,
        forecast_gross_profit: 39000,
        forecast_expense: 20500,
        forecast_net_profit: 18500,
      });
    });
  });

  describe('getCashFlow', () => {
    it('should calculate cash flow inflows, outflows, and net correctly', async () => {
      mockPrismaService.company.findFirst.mockResolvedValue({
        id: 1n,
        tenantId: 2n,
      });
      mockPrismaService.$queryRaw.mockResolvedValue([
        {
          period_month: 6,
          budget_inflow: 80000n,
          budget_outflow: 50000n,
          actual_inflow: 75000n,
          actual_outflow: 52000n,
          forecast_inflow: 78000n,
          forecast_outflow: 51000n,
        },
      ]);

      const result = await service.getCashFlow(1n, 2n, { fiscal_year: 2026 });
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        period_month: 6,
        budget_inflow: 80000,
        budget_outflow: 50000,
        budget_net: 30000,
        actual_inflow: 75000,
        actual_outflow: 52000,
        actual_net: 23000,
        forecast_inflow: 78000,
        forecast_outflow: 51000,
        forecast_net: 27000,
      });
    });
  });

  describe('getGrossMargin', () => {
    it('should calculate gross margins and percentages correctly', async () => {
      mockPrismaService.company.findFirst.mockResolvedValue({
        id: 1n,
        tenantId: 2n,
      });
      mockPrismaService.$queryRaw.mockResolvedValue([
        {
          period_month: 6,
          budget_revenue: 100000,
          budget_cogs: 60000,
          actual_revenue: 95000,
          actual_cogs: 58000,
          forecast_revenue: 0,
          forecast_cogs: 0,
        },
      ]);

      const result = await service.getGrossMargin(1n, 2n, {
        fiscal_year: 2026,
      });
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        period_month: 6,
        budget_revenue: 100000,
        budget_cogs: 60000,
        budget_margin: 40000,
        budget_margin_pct: 40,
        actual_revenue: 95000,
        actual_cogs: 58000,
        actual_margin: 37000,
        actual_margin_pct: 38.95,
        forecast_revenue: 0,
        forecast_cogs: 0,
        forecast_margin: 0,
        forecast_margin_pct: 0,
      });
    });
  });

  describe('getForecastAccuracy', () => {
    it('should calculate forecast accuracy percentages correctly', async () => {
      mockPrismaService.company.findFirst.mockResolvedValue({
        id: 1n,
        tenantId: 2n,
      });
      mockPrismaService.$queryRaw.mockResolvedValue([
        {
          period_month: 6,
          actual_amount: 10000,
          forecast_amount: 9500,
        },
      ]);

      const result = await service.getForecastAccuracy(1n, 2n, {
        fiscal_year: 2026,
      });
      expect(result).toHaveLength(1);
      expect(result[0].accuracy_pct).toBe(95); // 1 - 500 / 10000 = 95%
    });
  });

  describe('getWastageAnalysis', () => {
    it('should correctly map standard and actual wastage', async () => {
      mockPrismaService.company.findFirst.mockResolvedValue({
        id: 1n,
        tenantId: 2n,
      });
      mockPrismaService.$queryRaw.mockResolvedValue([
        {
          product_id: 3n,
          product_name: 'Chocolate Ice Cream',
          material_id: 7n,
          material_name: 'Raw Cocoa',
          standard_wastage_pct: 5.0,
          actual_wastage_pct: 5.8,
        },
      ]);

      const result = await service.getWastageAnalysis(1n, 2n, {
        product_id: '3',
      });
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        product_id: '3',
        product_name: 'Chocolate Ice Cream',
        material_id: '7',
        material_name: 'Raw Cocoa',
        standard_wastage_pct: 5.0,
        actual_wastage_pct: 5.8,
        variance_pct: 0.8,
      });
    });
  });
});
