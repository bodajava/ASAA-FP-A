import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../prisma.service';
import {
  TriggerType,
  NotificationChannel,
  NotificationStatus,
} from '@prisma/client';

describe('NotificationsService', () => {
  let service: NotificationsService;

  const mockPrismaService = {
    company: {
      findFirst: jest.fn(),
    },
    notificationRule: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    notification: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
    account: {
      findFirst: jest.fn(),
    },
    site: {
      findFirst: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    $queryRawUnsafe: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    jest.clearAllMocks();
  });

  describe('Rule CRUD', () => {
    it('should create notification rule successfully', async () => {
      mockPrismaService.company.findFirst.mockResolvedValue({
        id: 1n,
        tenantId: 2n,
      });
      mockPrismaService.notificationRule.create.mockResolvedValue({
        id: 10n,
        companyId: 1n,
        ruleName: 'Test Rule',
        triggerType: TriggerType.import_failed,
        thresholdValue: null,
        accountId: null,
        siteId: null,
        notifyRoles: ['admin'],
        notifyUsers: null,
        channel: 'system',
        isActive: true,
        createdBy: 3n,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await service.createRule(
        {
          ruleName: 'Test Rule',
          triggerType: TriggerType.import_failed,
          notifyRoles: ['admin'],
        },
        1n,
        2n,
        3n,
      );

      expect(res.ruleName).toBe('Test Rule');
      expect(res.triggerType).toBe(TriggerType.import_failed);
      expect(mockPrismaService.notificationRule.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException if thresholdValue is missing for variance type', async () => {
      mockPrismaService.company.findFirst.mockResolvedValue({
        id: 1n,
        tenantId: 2n,
      });

      await expect(
        service.createRule(
          {
            ruleName: 'Variance Rule',
            triggerType: TriggerType.variance_pct,
          },
          1n,
          2n,
          3n,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Notification Management', () => {
    it('should list notifications with pagination', async () => {
      mockPrismaService.company.findFirst.mockResolvedValue({
        id: 1n,
        tenantId: 2n,
      });
      mockPrismaService.notification.count.mockResolvedValue(1);
      mockPrismaService.notification.findMany.mockResolvedValue([
        {
          id: 100n,
          ruleId: 10n,
          companyId: 1n,
          userId: 3n,
          title: 'Alert',
          body: 'Check details',
          channel: NotificationChannel.system,
          entityType: null,
          entityId: null,
          triggerData: null,
          status: NotificationStatus.pending,
          sentAt: null,
          readAt: null,
          errorMessage: null,
          createdAt: new Date(),
        },
      ]);

      const res = await service.findAllNotifications(1n, 2n, {
        page: 1,
        limit: 10,
      });
      expect(res.total).toBe(1);
      expect(res.data[0].title).toBe('Alert');
    });

    it('should mark a notification as read', async () => {
      mockPrismaService.company.findFirst.mockResolvedValue({
        id: 1n,
        tenantId: 2n,
      });
      mockPrismaService.notification.findFirst.mockResolvedValue({
        id: 100n,
        companyId: 1n,
      });
      mockPrismaService.notification.update.mockResolvedValue({
        id: 100n,
        ruleId: null,
        companyId: 1n,
        userId: 3n,
        title: 'Alert',
        body: 'Check details',
        channel: NotificationChannel.system,
        entityType: null,
        entityId: null,
        triggerData: null,
        status: NotificationStatus.read,
        sentAt: null,
        readAt: new Date(),
        errorMessage: null,
        createdAt: new Date(),
      });

      const res = await service.markAsRead(100n, 1n, 2n);
      expect(res.status).toBe(NotificationStatus.read);
    });
  });

  describe('Notification Triggers', () => {
    it('should trigger notifications on failed imports', async () => {
      mockPrismaService.notificationRule.findMany.mockResolvedValue([
        {
          id: 10n,
          notifyUsers: ['3'],
          notifyRoles: null,
          channel: 'system',
        },
      ]);

      await service.triggerImportFailed(1n, 2n, 50n, 'Invalid account code');
      expect(mockPrismaService.notification.create).toHaveBeenCalled();
    });

    it('should trigger notifications on budget approval', async () => {
      mockPrismaService.notificationRule.findMany.mockResolvedValue([
        {
          id: 10n,
          notifyUsers: null,
          notifyRoles: ['admin'],
          channel: 'system',
        },
      ]);
      mockPrismaService.user.findMany.mockResolvedValue([{ id: 3n }]);

      await service.triggerBudgetApproval(1n, 2n, 30n, 'FY 2026 Budget');
      expect(mockPrismaService.notification.create).toHaveBeenCalled();
    });
  });
});
