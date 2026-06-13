import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { IntegrationsService } from './integrations.service';
import { PrismaService } from '../prisma.service';
import { ActualImportsService } from '../actual-imports/actual-imports.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  ConnectionType,
  SyncSchedule,
  ImportSourceSystem,
  ImportType,
} from '@prisma/client';

describe('IntegrationsService', () => {
  let service: IntegrationsService;

  const mockPrismaService = {
    company: {
      findFirst: jest.fn(),
    },
    integrationConnection: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    importMapping: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    actualImport: {
      create: jest.fn(),
    },
    actualLine: {
      create: jest.fn(),
      createMany: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    account: {
      findFirst: jest.fn(),
    },
    site: {
      findFirst: jest.fn(),
    },
    costCenter: {
      findFirst: jest.fn(),
    },
    product: {
      findFirst: jest.fn(),
    },
    material: {
      findFirst: jest.fn(),
    },
    customer: {
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockActualImportsService = {
    resolveRowsWithMapping: jest.fn(),
  };

  const mockNotificationsService = {
    triggerImportFailed: jest.fn(),
    checkAndTriggerVarianceBreaches: jest.fn(),
  };

  beforeEach(async () => {
    mockPrismaService.$transaction.mockImplementation(
      (cb: (tx: typeof mockPrismaService) => Promise<unknown>) =>
        cb(mockPrismaService),
    );
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntegrationsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ActualImportsService,
          useValue: mockActualImportsService,
        },
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
      ],
    }).compile();

    service = module.get<IntegrationsService>(IntegrationsService);
    jest.clearAllMocks();
  });

  describe('ensureCompanyBelongsToTenant', () => {
    it('should throw NotFoundException if company is not found under tenant', async () => {
      mockPrismaService.company.findFirst.mockResolvedValue(null);

      await expect(
        service.createConnection(
          {
            name: 'Conn',
            connectionType: ConnectionType.oracle,
          },
          1n,
          2n,
          3n,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Connection CRUD', () => {
    it('should create connection with encrypted password and API key', async () => {
      mockPrismaService.company.findFirst.mockResolvedValue({
        id: 1n,
        tenantId: 2n,
      });
      mockPrismaService.integrationConnection.create.mockResolvedValue({
        id: 10n,
        companyId: 1n,
        name: 'My Connection',
        connectionType: ConnectionType.oracle,
        host: 'localhost',
        port: 1521,
        databaseName: 'XE',
        username: 'system',
        passwordEnc: 'encrypted_pass',
        apiBaseUrl: null,
        apiKeyEnc: null,
        extraConfig: null,
        syncSchedule: SyncSchedule.manual,
        lastSyncAt: null,
        lastSyncStatus: null,
        lastSyncLog: null,
        isActive: true,
        createdBy: 3n,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await service.createConnection(
        {
          name: 'My Connection',
          connectionType: ConnectionType.oracle,
          host: 'localhost',
          port: 1521,
          databaseName: 'XE',
          username: 'system',
          password: 'my-raw-password',
        },
        1n,
        2n,
        3n,
      );

      expect(res.name).toBe('My Connection');
      expect(res.passwordEnc).toBe('[ENCRYPTED]');
      expect(mockPrismaService.integrationConnection.create).toHaveBeenCalled();
      expect(mockPrismaService.auditLog.create).toHaveBeenCalled();
    });

    it('should find all connections with search and pagination', async () => {
      mockPrismaService.company.findFirst.mockResolvedValue({
        id: 1n,
        tenantId: 2n,
      });
      mockPrismaService.integrationConnection.count.mockResolvedValue(1);
      mockPrismaService.integrationConnection.findMany.mockResolvedValue([
        {
          id: 10n,
          companyId: 1n,
          name: 'My Connection',
          connectionType: ConnectionType.rest_api,
          host: null,
          port: null,
          databaseName: null,
          username: null,
          passwordEnc: null,
          apiBaseUrl: 'https://api.example.com',
          apiKeyEnc: 'key_enc',
          extraConfig: null,
          syncSchedule: SyncSchedule.manual,
          lastSyncAt: null,
          lastSyncStatus: null,
          lastSyncLog: null,
          isActive: true,
          createdBy: 3n,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const res = await service.findAllConnections(1n, 2n, {
        page: 1,
        limit: 10,
        search: 'My',
      });
      expect(res.total).toBe(1);
      expect(res.data[0].apiKeyEnc).toBe('[ENCRYPTED]');
    });

    it('should find one connection', async () => {
      mockPrismaService.company.findFirst.mockResolvedValue({
        id: 1n,
        tenantId: 2n,
      });
      mockPrismaService.integrationConnection.findFirst.mockResolvedValue({
        id: 10n,
        companyId: 1n,
        name: 'My Connection',
        connectionType: ConnectionType.oracle,
        host: null,
        port: null,
        databaseName: null,
        username: null,
        passwordEnc: 'pwd',
        apiBaseUrl: null,
        apiKeyEnc: null,
        extraConfig: null,
        syncSchedule: null,
        lastSyncAt: null,
        lastSyncStatus: null,
        lastSyncLog: null,
        isActive: true,
        createdBy: 3n,
      });

      const res = await service.findOneConnection(10n, 1n, 2n);
      expect(res.id).toBe('10');
      expect(res.passwordEnc).toBe('[ENCRYPTED]');
    });

    it('should update connection and encrypt new credentials', async () => {
      mockPrismaService.company.findFirst.mockResolvedValue({
        id: 1n,
        tenantId: 2n,
      });
      mockPrismaService.integrationConnection.findFirst.mockResolvedValue({
        id: 10n,
        companyId: 1n,
        name: 'Old Connection',
        connectionType: ConnectionType.oracle,
        host: 'localhost',
      });
      mockPrismaService.integrationConnection.update.mockResolvedValue({
        id: 10n,
        companyId: 1n,
        name: 'New Connection',
        connectionType: ConnectionType.oracle,
        host: 'localhost',
        passwordEnc: 'new_encrypted_pass',
      });

      const res = await service.updateConnection(
        10n,
        { name: 'New Connection', password: 'new-password' },
        1n,
        2n,
        3n,
      );

      expect(res.name).toBe('New Connection');
      expect(res.passwordEnc).toBe('[ENCRYPTED]');
      expect(mockPrismaService.integrationConnection.update).toHaveBeenCalled();
    });

    it('should delete connection', async () => {
      mockPrismaService.company.findFirst.mockResolvedValue({
        id: 1n,
        tenantId: 2n,
      });
      mockPrismaService.integrationConnection.findFirst.mockResolvedValue({
        id: 10n,
        companyId: 1n,
        name: 'To Delete',
        connectionType: ConnectionType.oracle,
      });

      const res = await service.removeConnection(10n, 1n, 2n, 3n);
      expect(res.name).toBe('To Delete');
      expect(mockPrismaService.integrationConnection.delete).toHaveBeenCalled();
    });
  });

  describe('ImportMapping CRUD', () => {
    it('should create import mapping with valid config', async () => {
      mockPrismaService.company.findFirst.mockResolvedValue({
        id: 1n,
        tenantId: 2n,
      });
      mockPrismaService.importMapping.create.mockResolvedValue({
        id: 20n,
        companyId: 1n,
        connectionId: null,
        name: 'Sales Map',
        sourceSystem: ImportSourceSystem.excel,
        importType: ImportType.sales,
        mappingConfig: {
          accountCode: 'AccCode',
          amount: 'AmountVal',
          transactionDate: 'TxDate',
        },
        skipErrors: false,
        isDefault: false,
        isActive: true,
        createdBy: 3n,
      });

      const res = await service.createMapping(
        {
          name: 'Sales Map',
          sourceSystem: ImportSourceSystem.excel,
          importType: ImportType.sales,
          mappingConfig: {
            accountCode: 'AccCode',
            amount: 'AmountVal',
            transactionDate: 'TxDate',
          },
        },
        1n,
        2n,
        3n,
      );

      expect(res.name).toBe('Sales Map');
      expect(res.mappingConfig.accountCode).toBe('AccCode');
      expect(mockPrismaService.importMapping.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException if mappingConfig does not contain required fields', async () => {
      mockPrismaService.company.findFirst.mockResolvedValue({
        id: 1n,
        tenantId: 2n,
      });

      await expect(
        service.createMapping(
          {
            name: 'Invalid Map',
            sourceSystem: ImportSourceSystem.excel,
            importType: ImportType.sales,
            mappingConfig: {
              accountCode: 'Acc',
            },
          },
          1n,
          2n,
          3n,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update mapping config and validate strictly', async () => {
      mockPrismaService.company.findFirst.mockResolvedValue({
        id: 1n,
        tenantId: 2n,
      });
      mockPrismaService.importMapping.findFirst.mockResolvedValue({
        id: 20n,
        companyId: 1n,
        name: 'Old Map',
      });
      mockPrismaService.importMapping.update.mockResolvedValue({
        id: 20n,
        companyId: 1n,
        name: 'Old Map',
        mappingConfig: {
          accountCode: 'AccCodeNew',
          amount: 'AmountValNew',
          transactionDate: 'TxDateNew',
        },
      });

      const res = await service.updateMapping(
        20n,
        {
          mappingConfig: {
            accountCode: 'AccCodeNew',
            amount: 'AmountValNew',
            transactionDate: 'TxDateNew',
          },
        },
        1n,
        2n,
        3n,
      );

      expect(res.mappingConfig.accountCode).toBe('AccCodeNew');
    });
  });

  describe('Connection Testing', () => {
    it('should test connection on-the-fly and return success', async () => {
      mockPrismaService.company.findFirst.mockResolvedValue({
        id: 1n,
        tenantId: 2n,
      });

      const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
        status: 200,
      } as Response);

      const res = await service.testConnection(
        {
          connectionType: ConnectionType.rest_api,
          apiBaseUrl: 'http://localhost/mock/api',
        },
        1n,
        2n,
        3n,
      );

      expect(res.success).toBe(true);
      expect(res.message).toContain('completed with status 200');
      fetchSpy.mockRestore();
    });

    it('should fail connection test if connection is invalid', async () => {
      mockPrismaService.company.findFirst.mockResolvedValue({
        id: 1n,
        tenantId: 2n,
      });

      const res = await service.testConnection(
        {
          connectionType: ConnectionType.sftp,
          host: '127.0.0.1',
          port: 9999,
        },
        1n,
        2n,
        3n,
      );

      expect(res.success).toBe(false);
      expect(res.message).toBeDefined();
    });
  });

  describe('Manual Sync Trigger', () => {
    it('should trigger manual sync, create actual import record and save actual lines', async () => {
      mockPrismaService.company.findFirst.mockResolvedValue({
        id: 1n,
        tenantId: 2n,
      });
      mockPrismaService.importMapping.findFirst.mockResolvedValue({
        id: 20n,
        companyId: 1n,
        connectionId: 10n,
        name: 'Sales Map',
        sourceSystem: ImportSourceSystem.excel,
        importType: ImportType.sales,
        mappingConfig: {
          accountCode: 'AccCode',
          amount: 'AmountVal',
          transactionDate: 'TxDate',
        },
      });

      mockPrismaService.account.findFirst.mockResolvedValue({
        id: 101n,
        code: '6010',
      });

      mockActualImportsService.resolveRowsWithMapping.mockResolvedValue([
        {
          rowIdx: 0,
          success: true,
          errors: [],
          line: {
            accountId: 101n,
            transactionDate: new Date('2026-06-15'),
            amount: 5000,
          },
        },
      ]);

      mockPrismaService.actualImport.create.mockResolvedValue({
        id: 50n,
      });

      const res = await service.triggerManualSync(
        {
          mappingId: '20',
          rawRows: [
            {
              AccCode: '6010',
              AmountVal: 5000,
              TxDate: '2026-06-15',
            },
          ],
        },
        1n,
        2n,
        3n,
      );

      expect(res.importId).toBe('50');
      expect(res.status).toBe('validated');
      expect(res.recordsSynced).toBe(1);
      expect(mockPrismaService.actualLine.createMany).toHaveBeenCalled();
    });
  });
});
