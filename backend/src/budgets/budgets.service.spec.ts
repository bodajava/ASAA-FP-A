import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { BudgetsService, mapBudgetCycleToResponse } from './budgets.service';
import { PrismaService } from '../prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateBudgetCycleDto } from './dto/create-budget-cycle.dto';
import { UpdateBudgetCycleDto } from './dto/update-budget-cycle.dto';
import { UpdateBudgetStatusDto } from './dto/update-budget-status.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

describe('BudgetsService', () => {
  let service: BudgetsService;
  let prisma: jest.Mocked<PrismaService>;
  let notificationsService: jest.Mocked<NotificationsService>;

  const mockPrisma = {
    company: { findFirst: jest.fn() },
    account: { findMany: jest.fn() },
    site: { findMany: jest.fn() },
    costCenter: { findMany: jest.fn() },
    product: { findMany: jest.fn() },
    material: { findMany: jest.fn() },
    customer: { findMany: jest.fn() },
    budgetCycle: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    budgetLine: {
      create: jest.fn(),
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockNotificationsService = {
    triggerBudgetApproval: jest.fn().mockResolvedValue(undefined),
    triggerForecastApproval: jest.fn().mockResolvedValue(undefined),
  };

  const mockCompany = { id: 1, tenantId: 1, name: 'Test Company' };
  const mockCycleId = 1;
  const mockCompanyId = BigInt(1);
  const mockTenantId = BigInt(1);
  const mockUserId = BigInt(1);

  const mockBudgetCycle = {
    id: 1,
    companyId: 1,
    name: 'FY2026 Budget',
    fiscalYear: 2026,
    periodType: 'annual',
    version: 1,
    status: 'draft',
    createdBy: 1,
    approvedBy: null,
    approvedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    budgetLines: [],
  };

  const createDto: CreateBudgetCycleDto = {
    name: 'FY2026 Budget',
    fiscalYear: 2026,
    periodType: 'annual',
    version: 1,
    budgetLines: [
      {
        accountId: '1',
        periodMonth: 1,
        amount: 1000,
        quantity: 10,
        unitPrice: 100,
        notes: null,
      },
    ],
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma.$transaction.mockImplementation((cb: any) => cb(mockPrisma));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BudgetsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<BudgetsService>(BudgetsService);
    prisma = module.get(PrismaService);
    notificationsService = module.get(NotificationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a budget cycle with lines', async () => {
      mockPrisma.company.findFirst.mockResolvedValue(mockCompany);
      mockPrisma.account.findMany.mockResolvedValue([{ id: 1 }]);
      mockPrisma.budgetCycle.create.mockResolvedValue(mockBudgetCycle);
      mockPrisma.budgetCycle.findUnique.mockResolvedValue(mockBudgetCycle);

      const result = await service.create(
        createDto,
        mockCompanyId,
        mockTenantId,
        mockUserId,
      );

      expect(mockPrisma.company.findFirst).toHaveBeenCalledWith({
        where: { id: mockCompanyId, tenantId: mockTenantId },
      });
      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockPrisma.budgetCycle.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          companyId: mockCompanyId,
          name: 'FY2026 Budget',
          fiscalYear: 2026,
          status: 'draft',
          createdBy: mockUserId,
        }),
      });
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: mockTenantId,
          userId: mockUserId,
          entityType: 'BudgetCycle',
          action: 'create',
        }),
      });
      expect(result).toBeDefined();
      expect(result.name).toBe('FY2026 Budget');
    });

    it('should throw NotFoundException if company not found under tenant', async () => {
      mockPrisma.company.findFirst.mockResolvedValue(null);

      await expect(
        service.create(createDto, mockCompanyId, mockTenantId, mockUserId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if account references are invalid', async () => {
      mockPrisma.company.findFirst.mockResolvedValue(mockCompany);
      mockPrisma.account.findMany.mockResolvedValue([]);

      await expect(
        service.create(createDto, mockCompanyId, mockTenantId, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return paginated budgets', async () => {
      mockPrisma.company.findFirst.mockResolvedValue(mockCompany);
      mockPrisma.budgetCycle.count.mockResolvedValue(1);
      mockPrisma.budgetCycle.findMany.mockResolvedValue([mockBudgetCycle]);

      const pagination: PaginationDto = { page: 1, limit: 10 };
      const result = await service.findAll(
        mockCompanyId,
        mockTenantId,
        pagination,
      );

      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('FY2026 Budget');
    });

    it('should throw NotFoundException if company not found', async () => {
      mockPrisma.company.findFirst.mockResolvedValue(null);

      await expect(
        service.findAll(mockCompanyId, mockTenantId, { page: 1, limit: 10 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOne', () => {
    it('should return a budget cycle by id', async () => {
      mockPrisma.company.findFirst.mockResolvedValue(mockCompany);
      mockPrisma.budgetCycle.findFirst.mockResolvedValue(mockBudgetCycle);

      const result = await service.findOne(
        mockCycleId,
        mockCompanyId,
        mockTenantId,
      );

      expect(result.id).toBe('1');
      expect(result.name).toBe('FY2026 Budget');
    });

    it('should throw NotFoundException if budget not found', async () => {
      mockPrisma.company.findFirst.mockResolvedValue(mockCompany);
      mockPrisma.budgetCycle.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne(mockCycleId, mockCompanyId, mockTenantId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const updateDto: UpdateBudgetCycleDto = { name: 'Updated Budget' };

    it('should update a budget cycle', async () => {
      mockPrisma.company.findFirst.mockResolvedValue(mockCompany);
      mockPrisma.budgetCycle.findFirst.mockResolvedValue(mockBudgetCycle);
      mockPrisma.budgetCycle.update.mockResolvedValue({
        ...mockBudgetCycle,
        name: 'Updated Budget',
      });
      mockPrisma.budgetCycle.findUnique.mockResolvedValue({
        ...mockBudgetCycle,
        name: 'Updated Budget',
      });

      const result = await service.update(
        mockCycleId,
        updateDto,
        mockCompanyId,
        mockTenantId,
        mockUserId,
      );

      expect(result.name).toBe('Updated Budget');
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException if budget not found', async () => {
      mockPrisma.company.findFirst.mockResolvedValue(mockCompany);
      mockPrisma.budgetCycle.findFirst.mockResolvedValue(null);

      await expect(
        service.update(
          mockCycleId,
          updateDto,
          mockCompanyId,
          mockTenantId,
          mockUserId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if budget is approved', async () => {
      mockPrisma.company.findFirst.mockResolvedValue(mockCompany);
      mockPrisma.budgetCycle.findFirst.mockResolvedValue({
        ...mockBudgetCycle,
        status: 'approved',
      });

      await expect(
        service.update(
          mockCycleId,
          updateDto,
          mockCompanyId,
          mockTenantId,
          mockUserId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if budget is locked', async () => {
      mockPrisma.company.findFirst.mockResolvedValue(mockCompany);
      mockPrisma.budgetCycle.findFirst.mockResolvedValue({
        ...mockBudgetCycle,
        status: 'locked',
      });

      await expect(
        service.update(
          mockCycleId,
          updateDto,
          mockCompanyId,
          mockTenantId,
          mockUserId,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should delete a budget cycle', async () => {
      mockPrisma.company.findFirst.mockResolvedValue(mockCompany);
      mockPrisma.budgetCycle.findFirst.mockResolvedValue(mockBudgetCycle);
      mockPrisma.budgetCycle.delete.mockResolvedValue(mockBudgetCycle);

      const result = await service.remove(
        mockCycleId,
        mockCompanyId,
        mockTenantId,
        mockUserId,
      );

      expect(mockPrisma.budgetCycle.delete).toHaveBeenCalledWith({
        where: { id: mockCycleId },
      });
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException if budget not found', async () => {
      mockPrisma.company.findFirst.mockResolvedValue(mockCompany);
      mockPrisma.budgetCycle.findFirst.mockResolvedValue(null);

      await expect(
        service.remove(mockCycleId, mockCompanyId, mockTenantId, mockUserId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if budget is approved', async () => {
      mockPrisma.company.findFirst.mockResolvedValue(mockCompany);
      mockPrisma.budgetCycle.findFirst.mockResolvedValue({
        ...mockBudgetCycle,
        status: 'approved',
      });

      await expect(
        service.remove(mockCycleId, mockCompanyId, mockTenantId, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if budget is locked', async () => {
      mockPrisma.company.findFirst.mockResolvedValue(mockCompany);
      mockPrisma.budgetCycle.findFirst.mockResolvedValue({
        ...mockBudgetCycle,
        status: 'locked',
      });

      await expect(
        service.remove(mockCycleId, mockCompanyId, mockTenantId, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateStatus', () => {
    it('should transition from draft to submitted', async () => {
      mockPrisma.company.findFirst.mockResolvedValue(mockCompany);
      mockPrisma.budgetCycle.findFirst.mockResolvedValue(mockBudgetCycle);
      mockPrisma.budgetCycle.update.mockResolvedValue({
        ...mockBudgetCycle,
        status: 'submitted',
      });

      const result = await service.updateStatus(
        mockCycleId,
        { status: 'submitted' },
        mockCompanyId,
        mockTenantId,
        mockUserId,
      );

      expect(mockPrisma.budgetCycle.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockCycleId },
          data: expect.objectContaining({ status: 'submitted' }),
        }),
      );
      expect(result.status).toBe('submitted');
    });

    it('should transition from draft to approved and trigger notification', async () => {
      mockPrisma.company.findFirst.mockResolvedValue(mockCompany);
      mockPrisma.budgetCycle.findFirst.mockResolvedValue(mockBudgetCycle);
      mockPrisma.budgetCycle.update.mockResolvedValue({
        ...mockBudgetCycle,
        status: 'approved',
        approvedBy: 1,
      });

      const result = await service.updateStatus(
        mockCycleId,
        { status: 'approved' },
        mockCompanyId,
        mockTenantId,
        mockUserId,
      );

      expect(mockPrisma.budgetCycle.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockCycleId },
          data: expect.objectContaining({ status: 'approved' }),
        }),
      );
      expect(notificationsService.triggerBudgetApproval).toHaveBeenCalled();
      expect(result.status).toBe('approved');
    });

    it('should transition from approved to locked', async () => {
      mockPrisma.company.findFirst.mockResolvedValue(mockCompany);
      mockPrisma.budgetCycle.findFirst.mockResolvedValue({
        ...mockBudgetCycle,
        status: 'approved',
        approvedBy: 1,
      });
      mockPrisma.budgetCycle.update.mockResolvedValue({
        ...mockBudgetCycle,
        status: 'locked',
      });

      const result = await service.updateStatus(
        mockCycleId,
        { status: 'locked' },
        mockCompanyId,
        mockTenantId,
        mockUserId,
      );

      expect(result.status).toBe('locked');
    });

    it('should return same cycle if status unchanged', async () => {
      mockPrisma.company.findFirst.mockResolvedValue(mockCompany);
      mockPrisma.budgetCycle.findFirst.mockResolvedValue(mockBudgetCycle);

      const result = await service.updateStatus(
        mockCycleId,
        { status: 'draft' },
        mockCompanyId,
        mockTenantId,
        mockUserId,
      );

      expect(mockPrisma.budgetCycle.update).not.toHaveBeenCalled();
      expect(result.status).toBe('draft');
    });

    it('should throw if locked cycle is transitioned', async () => {
      mockPrisma.company.findFirst.mockResolvedValue(mockCompany);
      mockPrisma.budgetCycle.findFirst.mockResolvedValue({
        ...mockBudgetCycle,
        status: 'locked',
      });

      await expect(
        service.updateStatus(
          mockCycleId,
          { status: 'approved' },
          mockCompanyId,
          mockTenantId,
          mockUserId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if non-approved cycle is locked directly', async () => {
      mockPrisma.company.findFirst.mockResolvedValue(mockCompany);
      mockPrisma.budgetCycle.findFirst.mockResolvedValue(mockBudgetCycle);

      await expect(
        service.updateStatus(
          mockCycleId,
          { status: 'locked' },
          mockCompanyId,
          mockTenantId,
          mockUserId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if budget not found', async () => {
      mockPrisma.company.findFirst.mockResolvedValue(mockCompany);
      mockPrisma.budgetCycle.findFirst.mockResolvedValue(null);

      await expect(
        service.updateStatus(
          mockCycleId,
          { status: 'submitted' },
          mockCompanyId,
          mockTenantId,
          mockUserId,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
