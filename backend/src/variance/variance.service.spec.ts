import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { VarianceService } from './variance.service';
import { PrismaService } from '../prisma.service';
import { VarianceQueryDto } from './dto/variance-query.dto';

describe('VarianceService', () => {
  let service: VarianceService;

  const mockPrismaService = {
    company: {
      findFirst: jest.fn(),
    },
    $queryRaw: jest.fn(),
  };

  type ServiceWithPrivate = {
    ensureCompanyBelongsToTenant: (
      companyId: bigint,
      tenantId: bigint,
    ) => Promise<void>;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VarianceService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<VarianceService>(VarianceService);
    jest.clearAllMocks();
  });

  describe('ensureCompanyBelongsToTenant', () => {
    it('should pass if company exists under tenant', async () => {
      mockPrismaService.company.findFirst.mockResolvedValue({
        id: 1n,
        tenantId: 2n,
      });

      await expect(
        (service as unknown as ServiceWithPrivate).ensureCompanyBelongsToTenant(
          1n,
          2n,
        ),
      ).resolves.not.toThrow();
    });

    it('should throw NotFoundException if company does not exist or belong to tenant', async () => {
      mockPrismaService.company.findFirst.mockResolvedValue(null);

      await expect(
        (service as unknown as ServiceWithPrivate).ensureCompanyBelongsToTenant(
          1n,
          2n,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('compareBudgetVsActual', () => {
    it('should successfully retrieve and map budget vs actual data', async () => {
      mockPrismaService.company.findFirst.mockResolvedValue({
        id: 1n,
        tenantId: 2n,
      });
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([{ count: 1n }]) // first call count query
        .mockResolvedValueOnce([
          // second call select * query
          {
            company_id: 1n,
            fiscal_year: 2026,
            period_month: 6,
            account_id: 10n,
            site_id: 2n,
            product_id: 3n,
            customer_id: 4n,
            budget_amount: 100000n,
            actual_amount: 95000n,
            variance_amount: -5000n,
            variance_pct: -5.0,
          },
        ]);

      const queryDto: VarianceQueryDto = {
        page: 1,
        limit: 10,
        fiscal_year: 2026,
        period_month: 6,
      };

      const result = await service.compareBudgetVsActual(1n, 2n, queryDto);

      expect(mockPrismaService.company.findFirst).toHaveBeenCalledWith({
        where: { id: 1n, tenantId: 2n },
      });
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(1);
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toEqual({
        company_id: '1',
        fiscal_year: 2026,
        period_month: 6,
        account_id: '10',
        site_id: '2',
        product_id: '3',
        customer_id: '4',
        budget_amount: 100000,
        actual_amount: 95000,
        forecast_amount: 0,
        variance_amount: -5000,
        variance_pct: -5.0,
      });
    });
  });

  describe('compareBudgetVsForecast', () => {
    it('should successfully retrieve and map budget vs forecast data', async () => {
      mockPrismaService.company.findFirst.mockResolvedValue({
        id: 1n,
        tenantId: 2n,
      });
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([{ count: 2n }])
        .mockResolvedValueOnce([
          {
            company_id: 1n,
            fiscal_year: 2026,
            period_month: 6,
            account_id: 10n,
            site_id: null,
            product_id: null,
            customer_id: null,
            budget_amount: '1000.00',
            actual_amount: '0.00',
            forecast_amount: '1200.00',
            forecast_vs_budget: '200.00',
            forecast_variance_pct: '20.00',
          },
        ]);

      const queryDto: VarianceQueryDto = {};

      const result = await service.compareBudgetVsForecast(1n, 2n, queryDto);

      expect(result.total).toBe(2);
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toEqual({
        company_id: '1',
        fiscal_year: 2026,
        period_month: 6,
        account_id: '10',
        site_id: null,
        product_id: null,
        customer_id: null,
        budget_amount: 1000,
        actual_amount: 0,
        forecast_amount: 1200,
        variance_amount: 200,
        variance_pct: 20,
      });
    });
  });

  describe('compareActualVsForecast', () => {
    it('should successfully retrieve and calculate actual vs forecast variance (Forecast - Actual)', async () => {
      mockPrismaService.company.findFirst.mockResolvedValue({
        id: 1n,
        tenantId: 2n,
      });
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([{ count: 1 }])
        .mockResolvedValueOnce([
          {
            company_id: 1n,
            fiscal_year: 2026,
            period_month: 6,
            account_id: 10n,
            site_id: 5n,
            product_id: null,
            customer_id: null,
            budget_amount: 0,
            actual_amount: 5000,
            forecast_amount: 6000,
          },
        ]);

      const result = await service.compareActualVsForecast(1n, 2n, {});

      expect(result.total).toBe(1);
      expect(result.data[0].variance_amount).toBe(1000); // 6000 - 5000
      expect(result.data[0].variance_pct).toBe(20); // (1000 / 5000) * 100
    });

    it('should return null variance_pct if actual amount is 0', async () => {
      mockPrismaService.company.findFirst.mockResolvedValue({
        id: 1n,
        tenantId: 2n,
      });
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([{ count: 1 }])
        .mockResolvedValueOnce([
          {
            company_id: 1n,
            fiscal_year: 2026,
            period_month: 6,
            account_id: 10n,
            site_id: 5n,
            product_id: null,
            customer_id: null,
            budget_amount: 0,
            actual_amount: 0,
            forecast_amount: 6000,
          },
        ]);

      const result = await service.compareActualVsForecast(1n, 2n, {});
      expect(result.data[0].variance_pct).toBeNull();
    });
  });

  describe('compareBudgetVsActualVsForecast', () => {
    it('should successfully calculate all three variances and return mapped values', async () => {
      mockPrismaService.company.findFirst.mockResolvedValue({
        id: 1n,
        tenantId: 2n,
      });
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([{ count: 1 }])
        .mockResolvedValueOnce([
          {
            company_id: 1n,
            fiscal_year: 2026,
            period_month: 6,
            account_id: 10n,
            site_id: 5n,
            product_id: null,
            customer_id: null,
            budget_amount: 5000,
            actual_amount: 4000,
            forecast_amount: 4500,
            actual_vs_budget: -1000,
            actual_variance_pct: -20,
            forecast_vs_budget: -500,
            forecast_variance_pct: -10,
          },
        ]);

      const result = await service.compareBudgetVsActualVsForecast(1n, 2n, {});

      expect(result.data[0]).toEqual(
        expect.objectContaining({
          budget_amount: 5000,
          actual_amount: 4000,
          forecast_amount: 4500,
          variance_amount: -1000,
          variance_pct: -20,
          actual_vs_budget_amount: -1000,
          actual_vs_budget_pct: -20,
          forecast_vs_budget_amount: -500,
          forecast_vs_budget_pct: -10,
          forecast_vs_actual_amount: 500, // 4500 - 4000
          forecast_vs_actual_pct: 12.5, // (500 / 4000) * 100
        }),
      );
    });
  });
});
