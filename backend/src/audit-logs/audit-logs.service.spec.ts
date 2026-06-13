import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service';
import { PrismaService } from '../prisma.service';

describe('AuditLogsService', () => {
  let service: AuditLogsService;

  const mockPrismaService = {
    auditLog: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AuditLogsService>(AuditLogsService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should list audit logs for the specified tenant with pagination', async () => {
      mockPrismaService.auditLog.count.mockResolvedValue(1);
      mockPrismaService.auditLog.findMany.mockResolvedValue([
        {
          id: 1000n,
          tenantId: 2n,
          userId: 3n,
          entityType: 'Site',
          entityId: 10n,
          action: 'create',
          oldValues: null,
          newValues: { name: 'Main' },
          ipAddress: '127.0.0.1',
          userAgent: 'Chrome',
          createdAt: new Date(),
        },
      ]);

      const res = await service.findAll(2n, { page: 1, limit: 10 });
      expect(res.total).toBe(1);
      expect(res.data[0].action).toBe('create');
      expect(res.data[0].tenantId).toBe('2');
    });
  });

  describe('findOne', () => {
    it('should retrieve a specific log if it belongs to user tenant', async () => {
      mockPrismaService.auditLog.findFirst.mockResolvedValue({
        id: 1000n,
        tenantId: 2n,
        userId: 3n,
        entityType: 'Site',
        entityId: 10n,
        action: 'create',
        oldValues: null,
        newValues: null,
        ipAddress: null,
        userAgent: null,
        createdAt: new Date(),
      });

      const res = await service.findOne(1000n, 2n);
      expect(res.id).toBe('1000');
    });

    it('should throw NotFoundException if log does not belong to user tenant', async () => {
      mockPrismaService.auditLog.findFirst.mockResolvedValue(null);

      await expect(service.findOne(1000n, 3n)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
