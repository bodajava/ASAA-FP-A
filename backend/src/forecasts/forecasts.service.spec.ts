import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ForecastsService, mapForecastCycleToResponse } from './forecasts.service';
import { ForecastEngineService } from './forecast-engine.service';
import { PrismaService } from '../prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateForecastCycleDto } from './dto/create-forecast-cycle.dto';
import { UpdateForecastCycleDto } from './dto/update-forecast-cycle.dto';
import { UpdateForecastStatusDto } from './dto/update-forecast-status.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { ForecastMethod } from '@prisma/client';

describe('ForecastsService', () => {
  let service: ForecastsService;
  let prisma: jest.Mocked<PrismaService>;
  let forecastEngine: jest.Mocked<ForecastEngineService>;
  let notificationsService: jest.Mocked<NotificationsService>;

  const mockPrisma = {
    company: { findFirst: jest.fn() },
    scenario: { findFirst: jest.fn() },
    account: { findMany: jest.fn() },
    site: { findMany: jest.fn() },
    costCenter: { findMany: jest.fn() },
    product: { findMany: jest.fn() },
    material: { findMany: jest.fn() },
    customer: { findMany: jest.fn() },
    forecastCycle: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    forecastLine: {
      create: jest.fn(),
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    budgetCycle: { findFirst: jest.fn() },
    actualLine: { findMany: jest.fn() },
    seasonalIndex: { findMany: jest.fn() },
    forecastAccuracyLog: {
      createMany: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    auditLog: { create: jest.fn() },
    $transaction: jest.fn(),
  };

  const mockForecastEngine = {
    weightedMovingAverage: jest.fn().mockReturnValue(0),
    exponentialSmoothing: jest.fn().mockReturnValue(0),
    holtLinear: jest.fn().mockReturnValue([0]),
    holtWinters: jest.fn().mockReturnValue([0]),
    seasonalNaive: jest.fn().mockReturnValue(0),
    detectSeasonality: jest.fn().mockReturnValue({ hasSeasonality: false, seasonalFactors: [] }),
    detectTrend: jest.fn().mockReturnValue({ hasTrend: false, slope: 0 }),
    adjustForRamadan: jest.fn().mockReturnValue(0),
    adjustForInflation: jest.fn().mockReturnValue(0),
    getForecast: jest.fn().mockReturnValue({
      amount: 0,
      confidence: 0,
      driverType: 'no_data',
      seasonalityDetected: false,
      trendDetected: false,
    }),
    computeAccuracy: jest.fn().mockReturnValue({ mape: 10.5, mae: 100, rmse: 150, r2: 0.5 }),
    prepareMonthlyData: jest.fn().mockReturnValue([]),
    buildTimeSeries: jest.fn().mockReturnValue([]),
  };

  const mockNotificationsService = {
    triggerBudgetApproval: jest.fn().mockResolvedValue(undefined),
    triggerForecastApproval: jest.fn().mockResolvedValue(undefined),
  };

  const mockCompany = { id: 1, tenantId: 1, name: 'Test Co' };
  const mockCompanyId = BigInt(1);
  const mockTenantId = BigInt(1);
  const mockUserId = BigInt(1);
  const mockCycleId = 1;

  const mockForecastCycle = {
    id: 1,
    companyId: 1,
    scenarioId: null,
    name: 'FY2026 Forecast',
    fiscalYear: 2026,
    basePeriod: new Date('2026-01-01'),
    method: 'manual',
    status: 'draft',
    createdBy: 1,
    approvedBy: null,
    approvedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    forecastLines: [],
  };

  const createDto: CreateForecastCycleDto = {
    name: 'FY2026 Forecast',
    fiscalYear: 2026,
    basePeriod: '2026-01-01',
    method: 'manual',
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma.$transaction.mockImplementation((cb: any) => cb(mockPrisma));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ForecastsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ForecastEngineService, useValue: mockForecastEngine },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<ForecastsService>(ForecastsService);
    prisma = module.get(PrismaService);
    forecastEngine = module.get(ForecastEngineService);
    notificationsService = module.get(NotificationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a forecast cycle', async () => {
      mockPrisma.company.findFirst.mockResolvedValue(mockCompany);
      mockPrisma.forecastCycle.create.mockResolvedValue(mockForecastCycle);
      mockPrisma.forecastCycle.findUnique.mockResolvedValue(mockForecastCycle);

      const result = await service.create(createDto, mockCompanyId, mockTenantId, mockUserId);

      expect(mockPrisma.company.findFirst).toHaveBeenCalledWith({
        where: { id: mockCompanyId, tenantId: mockTenantId },
      });
      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockPrisma.forecastCycle.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          companyId: mockCompanyId,
          name: 'FY2026 Forecast',
          fiscalYear: 2026,
          status: 'draft',
          createdBy: mockUserId,
        }),
      });
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
      expect(result.name).toBe('FY2026 Forecast');
    });

    it('should throw NotFoundException if company not found', async () => {
      mockPrisma.company.findFirst.mockResolvedValue(null);

      await expect(
        service.create(createDto, mockCompanyId, mockTenantId, mockUserId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return paginated forecasts', async () => {
      mockPrisma.company.findFirst.mockResolvedValue(mockCompany);
      mockPrisma.forecastCycle.count.mockResolvedValue(1);
      mockPrisma.forecastCycle.findMany.mockResolvedValue([mockForecastCycle]);

      const pagination: PaginationDto = { page: 1, limit: 10 };
      const result = await service.findAll(mockCompanyId, mockTenantId, pagination);

      expect(result.total).toBe(1);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('FY2026 Forecast');
    });
  });

  describe('findOne', () => {
    it('should return a forecast cycle by id', async () => {
      mockPrisma.company.findFirst.mockResolvedValue(mockCompany);
      mockPrisma.forecastCycle.findFirst.mockResolvedValue(mockForecastCycle);

      const result = await service.findOne(mockCycleId, mockCompanyId, mockTenantId);

      expect(result.id).toBe('1');
      expect(result.name).toBe('FY2026 Forecast');
    });

    it('should throw NotFoundException if forecast not found', async () => {
      mockPrisma.company.findFirst.mockResolvedValue(mockCompany);
      mockPrisma.forecastCycle.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne(mockCycleId, mockCompanyId, mockTenantId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const updateDto: UpdateForecastCycleDto = { name: 'Updated Forecast' };

    it('should update a forecast cycle', async () => {
      mockPrisma.company.findFirst.mockResolvedValue(mockCompany);
      mockPrisma.forecastCycle.findFirst.mockResolvedValue(mockForecastCycle);
      mockPrisma.forecastCycle.update.mockResolvedValue({ ...mockForecastCycle, name: 'Updated Forecast' });
      mockPrisma.forecastCycle.findUnique.mockResolvedValue({ ...mockForecastCycle, name: 'Updated Forecast' });

      const result = await service.update(mockCycleId, updateDto, mockCompanyId, mockTenantId, mockUserId);

      expect(result.name).toBe('Updated Forecast');
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException if forecast not found', async () => {
      mockPrisma.company.findFirst.mockResolvedValue(mockCompany);
      mockPrisma.forecastCycle.findFirst.mockResolvedValue(null);

      await expect(
        service.update(mockCycleId, updateDto, mockCompanyId, mockTenantId, mockUserId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if forecast is approved', async () => {
      mockPrisma.company.findFirst.mockResolvedValue(mockCompany);
      mockPrisma.forecastCycle.findFirst.mockResolvedValue({ ...mockForecastCycle, status: 'approved' });

      await expect(
        service.update(mockCycleId, updateDto, mockCompanyId, mockTenantId, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if forecast is locked', async () => {
      mockPrisma.company.findFirst.mockResolvedValue(mockCompany);
      mockPrisma.forecastCycle.findFirst.mockResolvedValue({ ...mockForecastCycle, status: 'locked' });

      await expect(
        service.update(mockCycleId, updateDto, mockCompanyId, mockTenantId, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should delete a draft forecast cycle', async () => {
      mockPrisma.company.findFirst.mockResolvedValue(mockCompany);
      mockPrisma.forecastCycle.findFirst.mockResolvedValue(mockForecastCycle);
      mockPrisma.forecastCycle.delete.mockResolvedValue(mockForecastCycle);

      const result = await service.remove(mockCycleId, mockCompanyId, mockTenantId, mockUserId);

      expect(mockPrisma.forecastCycle.delete).toHaveBeenCalledWith({ where: { id: mockCycleId } });
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw BadRequestException if forecast is approved', async () => {
      mockPrisma.company.findFirst.mockResolvedValue(mockCompany);
      mockPrisma.forecastCycle.findFirst.mockResolvedValue({ ...mockForecastCycle, status: 'approved' });

      await expect(
        service.remove(mockCycleId, mockCompanyId, mockTenantId, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if forecast is locked', async () => {
      mockPrisma.company.findFirst.mockResolvedValue(mockCompany);
      mockPrisma.forecastCycle.findFirst.mockResolvedValue({ ...mockForecastCycle, status: 'locked' });

      await expect(
        service.remove(mockCycleId, mockCompanyId, mockTenantId, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if forecast not found', async () => {
      mockPrisma.company.findFirst.mockResolvedValue(mockCompany);
      mockPrisma.forecastCycle.findFirst.mockResolvedValue(null);

      await expect(
        service.remove(mockCycleId, mockCompanyId, mockTenantId, mockUserId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateStatus', () => {
    it('should transition from draft to submitted', async () => {
      mockPrisma.company.findFirst.mockResolvedValue(mockCompany);
      mockPrisma.forecastCycle.findFirst.mockResolvedValue(mockForecastCycle);
      mockPrisma.forecastCycle.update.mockResolvedValue({ ...mockForecastCycle, status: 'submitted' });

      const result = await service.updateStatus(
        mockCycleId, { status: 'submitted' }, mockCompanyId, mockTenantId, mockUserId,
      );

      expect(result.status).toBe('submitted');
    });

    it('should transition draft->approved and trigger notification', async () => {
      mockPrisma.company.findFirst.mockResolvedValue(mockCompany);
      mockPrisma.forecastCycle.findFirst.mockResolvedValue(mockForecastCycle);
      mockPrisma.forecastCycle.update.mockResolvedValue({ ...mockForecastCycle, status: 'approved', approvedBy: 1 });

      const result = await service.updateStatus(
        mockCycleId, { status: 'approved' }, mockCompanyId, mockTenantId, mockUserId,
      );

      expect(result.status).toBe('approved');
      expect(notificationsService.triggerForecastApproval).toHaveBeenCalled();
    });

    it('should transition approved->locked', async () => {
      mockPrisma.company.findFirst.mockResolvedValue(mockCompany);
      mockPrisma.forecastCycle.findFirst.mockResolvedValue({ ...mockForecastCycle, status: 'approved', approvedBy: 1 });
      mockPrisma.forecastCycle.update.mockResolvedValue({ ...mockForecastCycle, status: 'locked' });

      const result = await service.updateStatus(
        mockCycleId, { status: 'locked' }, mockCompanyId, mockTenantId, mockUserId,
      );

      expect(result.status).toBe('locked');
    });

    it('should return same cycle if status unchanged', async () => {
      mockPrisma.company.findFirst.mockResolvedValue(mockCompany);
      mockPrisma.forecastCycle.findFirst.mockResolvedValue(mockForecastCycle);

      const result = await service.updateStatus(
        mockCycleId, { status: 'draft' }, mockCompanyId, mockTenantId, mockUserId,
      );

      expect(mockPrisma.forecastCycle.update).not.toHaveBeenCalled();
      expect(result.status).toBe('draft');
    });

    it('should throw if locked cycle is transitioned', async () => {
      mockPrisma.company.findFirst.mockResolvedValue(mockCompany);
      mockPrisma.forecastCycle.findFirst.mockResolvedValue({ ...mockForecastCycle, status: 'locked' });

      await expect(
        service.updateStatus(mockCycleId, { status: 'approved' }, mockCompanyId, mockTenantId, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if non-approved cycle is locked directly', async () => {
      mockPrisma.company.findFirst.mockResolvedValue(mockCompany);
      mockPrisma.forecastCycle.findFirst.mockResolvedValue(mockForecastCycle);

      await expect(
        service.updateStatus(mockCycleId, { status: 'locked' }, mockCompanyId, mockTenantId, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if forecast not found', async () => {
      mockPrisma.company.findFirst.mockResolvedValue(mockCompany);
      mockPrisma.forecastCycle.findFirst.mockResolvedValue(null);

      await expect(
        service.updateStatus(mockCycleId, { status: 'submitted' }, mockCompanyId, mockTenantId, mockUserId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('generateForecast', () => {
    it('should generate forecast lines for a draft cycle', async () => {
      mockPrisma.company.findFirst.mockResolvedValue(mockCompany);
      mockPrisma.forecastCycle.findFirst.mockResolvedValue({
        ...mockForecastCycle,
        method: ForecastMethod.rolling,
        scenario: null,
      });
      mockPrisma.forecastLine.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.account.findMany.mockResolvedValue([]);
      mockPrisma.budgetCycle.findFirst.mockResolvedValue(null);
      mockPrisma.actualLine.findMany.mockResolvedValue([]);
      mockPrisma.seasonalIndex.findMany.mockResolvedValue([]);
      mockPrisma.forecastCycle.findUnique.mockResolvedValue(mockForecastCycle);

      const result = await service.generateForecastLines(mockCycleId, mockCompanyId, mockTenantId);

      expect(mockPrisma.forecastLine.deleteMany).toHaveBeenCalledWith({
        where: { forecastCycleId: mockCycleId },
      });
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException if cycle not found', async () => {
      mockPrisma.company.findFirst.mockResolvedValue(mockCompany);
      mockPrisma.forecastCycle.findFirst.mockResolvedValue(null);

      await expect(
        service.generateForecastLines(mockCycleId, mockCompanyId, mockTenantId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for approved cycle', async () => {
      mockPrisma.company.findFirst.mockResolvedValue(mockCompany);
      mockPrisma.forecastCycle.findFirst.mockResolvedValue({
        ...mockForecastCycle, status: 'approved', scenario: null, forecastLines: [],
      });

      await expect(
        service.generateForecastLines(mockCycleId, mockCompanyId, mockTenantId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getAccuracyMetrics', () => {
    it('should return accuracy metrics', async () => {
      mockPrisma.company.findFirst.mockResolvedValue(mockCompany);
      mockPrisma.forecastAccuracyLog.findMany.mockResolvedValue([
        { id: 1, companyId: 1, forecastCycleId: 1, accountId: 1, fiscalYear: 2026, periodMonth: 1, forecastAmount: 1000, actualAmount: 1100, variancePct: 10, methodUsed: 'manual', confidenceScore: 90, createdAt: new Date() },
      ]);

      const result = await service.getAccuracyMetrics(mockCompanyId, mockTenantId);

      expect(result.overallMape).toBe(10.5);
      expect(result.recentLogs).toHaveLength(1);
    });
  });

  describe('getAccuracyLogs', () => {
    it('should return accuracy logs with account names', async () => {
      mockPrisma.company.findFirst.mockResolvedValue(mockCompany);
      mockPrisma.forecastAccuracyLog.count.mockResolvedValue(1);
      mockPrisma.forecastAccuracyLog.findMany.mockResolvedValue([
        { id: 1, companyId: 1, forecastCycleId: 1, accountId: 1, fiscalYear: 2026, periodMonth: 1, forecastAmount: 1000, actualAmount: 1100, variancePct: 10, methodUsed: 'manual', confidenceScore: 90, createdAt: new Date() },
      ]);
      mockPrisma.account.findMany.mockResolvedValue([{ id: 1, name: 'Revenue' }]);

      const result = await service.getAccuracyLogs(mockCompanyId, mockTenantId);

      expect(result.total).toBe(1);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].accountName).toBe('Revenue');
    });
  });
});
