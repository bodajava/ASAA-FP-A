import {
  Injectable,
  NotFoundException,
  BadRequestException,
  OnApplicationBootstrap,
} from '@nestjs/common';
import {
  Prisma,
  IntegrationConnection,
  ImportMapping,
  ConnectionType,
  SyncSchedule,
  SyncStatus,
  ImportStatus,
  ImportType,
} from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CreateConnectionDto } from './dto/create-connection.dto';
import { UpdateConnectionDto } from './dto/update-connection.dto';
import { CreateMappingDto } from './dto/create-mapping.dto';
import { UpdateMappingDto } from './dto/update-mapping.dto';
import { TestConnectionDto } from './dto/test-connection.dto';
import { SyncTriggerDto } from './dto/sync-trigger.dto';
import {
  ConnectionResponseDto,
  MappingResponseDto,
} from './dto/integrations-response.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { encrypt, decrypt } from '../common/utils/crypto.util';
import { ActualImportsService } from '../actual-imports/actual-imports.service';
import { NotificationsService } from '../notifications/notifications.service';
import * as net from 'net';

function maskConnection(conn: IntegrationConnection): ConnectionResponseDto {
  return {
    id: conn.id.toString(),
    companyId: conn.companyId.toString(),
    name: conn.name,
    connectionType: conn.connectionType,
    host: conn.host,
    port: conn.port,
    databaseName: conn.databaseName,
    username: conn.username,
    passwordEnc: conn.passwordEnc ? '[ENCRYPTED]' : null,
    apiBaseUrl: conn.apiBaseUrl,
    apiKeyEnc: conn.apiKeyEnc ? '[ENCRYPTED]' : null,
    extraConfig: conn.extraConfig as Record<
      string,
      string | number | boolean | null
    > | null,
    syncSchedule: conn.syncSchedule,
    lastSyncAt: conn.lastSyncAt,
    lastSyncStatus: conn.lastSyncStatus,
    lastSyncLog: conn.lastSyncLog,
    isActive: conn.isActive,
    createdBy: conn.createdBy ? conn.createdBy.toString() : null,
    createdAt: conn.createdAt,
    updatedAt: conn.updatedAt,
  };
}

function mapMappingToResponse(mapping: ImportMapping): MappingResponseDto {
  return {
    id: mapping.id.toString(),
    companyId: mapping.companyId.toString(),
    connectionId: mapping.connectionId ? mapping.connectionId.toString() : null,
    name: mapping.name,
    sourceSystem: mapping.sourceSystem,
    importType: mapping.importType,
    mappingConfig: mapping.mappingConfig as Record<string, string | null>,
    skipErrors: mapping.skipErrors,
    isDefault: mapping.isDefault,
    isActive: mapping.isActive,
    lastUsedAt: mapping.lastUsedAt,
    createdBy: mapping.createdBy ? mapping.createdBy.toString() : null,
    createdAt: mapping.createdAt,
    updatedAt: mapping.updatedAt,
  };
}

@Injectable()
export class IntegrationsService implements OnApplicationBootstrap {
  constructor(
    private readonly prisma: PrismaService,
    private readonly actualImportsService: ActualImportsService,
    private readonly notificationsService: NotificationsService,
  ) {}

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

  private validateMappingConfig(config: Record<string, string | null>): void {
    if (!config || typeof config !== 'object') {
      throw new BadRequestException(
        'mappingConfig must be a valid JSON object',
      );
    }
    const requiredKeys = ['accountCode', 'amount', 'transactionDate'];
    for (const key of requiredKeys) {
      const val = config[key];
      if (val === undefined || val === null || val === '') {
        throw new BadRequestException(
          `mappingConfig must contain a non-empty mapping for "${key}"`,
        );
      }
    }
    const allowedKeys = [
      'accountCode',
      'siteCode',
      'costCenterCode',
      'productSku',
      'materialCode',
      'customerCode',
      'quantity',
      'unitPrice',
      'amount',
      'transactionDate',
      'referenceNo',
    ];
    for (const key of Object.keys(config)) {
      if (!allowedKeys.includes(key)) {
        throw new BadRequestException(
          `Invalid field "${key}" in mappingConfig`,
        );
      }
      const val = config[key];
      if (val !== null && (typeof val !== 'string' || val.trim() === '')) {
        throw new BadRequestException(
          `Mapping value for field "${key}" must be a non-empty string or null`,
        );
      }
    }
  }

  // ============================================================
  // CONNECTION CRUD
  // ============================================================

  async createConnection(
    dto: CreateConnectionDto,
    companyId: bigint,
    tenantId: bigint,
    userId: bigint,
  ): Promise<ConnectionResponseDto> {
    await this.ensureCompanyBelongsToTenant(companyId, tenantId);

    const passwordEnc = dto.password ? encrypt(dto.password) : null;
    const apiKeyEnc = dto.apiKey ? encrypt(dto.apiKey) : null;

    const connection = await this.prisma.integrationConnection.create({
      data: {
        companyId,
        name: dto.name,
        connectionType: dto.connectionType,
        host: dto.host ?? null,
        port: dto.port ?? null,
        databaseName: dto.databaseName ?? null,
        username: dto.username ?? null,
        passwordEnc,
        apiBaseUrl: dto.apiBaseUrl ?? null,
        apiKeyEnc,
        extraConfig:
          dto.extraConfig !== undefined
            ? dto.extraConfig
              ? (dto.extraConfig as Prisma.InputJsonValue)
              : Prisma.DbNull
            : undefined,
        syncSchedule: dto.syncSchedule ?? SyncSchedule.manual,
        isActive: dto.isActive ?? true,
        createdBy: userId,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        entityType: 'IntegrationConnection',
        entityId: connection.id,
        action: 'create',
        newValues: JSON.parse(
          JSON.stringify(maskConnection(connection)),
        ) as Prisma.InputJsonValue,
      },
    });

    if (
      connection.connectionType === ConnectionType.oracle &&
      connection.host?.toLowerCase() !== 'mock'
    ) {
      await this.runCompanySyncForConnection(connection, tenantId).catch(
        console.error,
      );
    }

    return maskConnection(connection);
  }

  async findAllConnections(
    companyId: bigint,
    tenantId: bigint,
    paginationDto: PaginationDto,
  ): Promise<{ total: number; data: ConnectionResponseDto[] }> {
    await this.ensureCompanyBelongsToTenant(companyId, tenantId);

    const whereClause: Prisma.IntegrationConnectionWhereInput = {
      companyId,
      ...(paginationDto.search
        ? {
            name: {
              contains: paginationDto.search,
            },
          }
        : {}),
    };

    const page = paginationDto.page ?? 1;
    const limit = paginationDto.limit ?? 10;
    const skip = (page - 1) * limit;

    const [total, connections] = await Promise.all([
      this.prisma.integrationConnection.count({ where: whereClause }),
      this.prisma.integrationConnection.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      total,
      data: connections.map(maskConnection),
    };
  }

  async findOneConnection(
    id: bigint,
    companyId: bigint,
    tenantId: bigint,
  ): Promise<ConnectionResponseDto> {
    await this.ensureCompanyBelongsToTenant(companyId, tenantId);

    const connection = await this.prisma.integrationConnection.findFirst({
      where: { id, companyId },
    });

    if (!connection) {
      throw new NotFoundException(
        `Connection with ID ${id} not found under this company`,
      );
    }

    return maskConnection(connection);
  }

  async updateConnection(
    id: bigint,
    dto: UpdateConnectionDto,
    companyId: bigint,
    tenantId: bigint,
    userId: bigint,
  ): Promise<ConnectionResponseDto> {
    await this.ensureCompanyBelongsToTenant(companyId, tenantId);

    const connection = await this.prisma.integrationConnection.findFirst({
      where: { id, companyId },
    });

    if (!connection) {
      throw new NotFoundException(
        `Connection with ID ${id} not found under this company`,
      );
    }

    const updatedData: Prisma.IntegrationConnectionUpdateInput = {};

    if (dto.name !== undefined) updatedData.name = dto.name;
    if (dto.connectionType !== undefined)
      updatedData.connectionType = dto.connectionType;
    if (dto.host !== undefined) updatedData.host = dto.host;
    if (dto.port !== undefined) updatedData.port = dto.port;
    if (dto.databaseName !== undefined)
      updatedData.databaseName = dto.databaseName;
    if (dto.username !== undefined) updatedData.username = dto.username;
    if (dto.apiBaseUrl !== undefined) updatedData.apiBaseUrl = dto.apiBaseUrl;
    if (dto.extraConfig !== undefined) {
      updatedData.extraConfig = dto.extraConfig
        ? dto.extraConfig
        : Prisma.DbNull;
    }
    if (dto.syncSchedule !== undefined)
      updatedData.syncSchedule = dto.syncSchedule;
    if (dto.isActive !== undefined) updatedData.isActive = dto.isActive;

    if (dto.password !== undefined) {
      updatedData.passwordEnc = dto.password ? encrypt(dto.password) : null;
    }
    if (dto.apiKey !== undefined) {
      updatedData.apiKeyEnc = dto.apiKey ? encrypt(dto.apiKey) : null;
    }

    const updatedConnection = await this.prisma.integrationConnection.update({
      where: { id },
      data: updatedData,
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        entityType: 'IntegrationConnection',
        entityId: id,
        action: 'update',
        oldValues: JSON.parse(
          JSON.stringify(maskConnection(connection)),
        ) as Prisma.InputJsonValue,
        newValues: JSON.parse(
          JSON.stringify(maskConnection(updatedConnection)),
        ) as Prisma.InputJsonValue,
      },
    });

    if (
      updatedConnection.connectionType === ConnectionType.oracle &&
      updatedConnection.host?.toLowerCase() !== 'mock'
    ) {
      await this.runCompanySyncForConnection(updatedConnection, tenantId).catch(
        console.error,
      );
    }

    return maskConnection(updatedConnection);
  }

  async removeConnection(
    id: bigint,
    companyId: bigint,
    tenantId: bigint,
    userId: bigint,
  ): Promise<ConnectionResponseDto> {
    await this.ensureCompanyBelongsToTenant(companyId, tenantId);

    const connection = await this.prisma.integrationConnection.findFirst({
      where: { id, companyId },
    });

    if (!connection) {
      throw new NotFoundException(
        `Connection with ID ${id} not found under this company`,
      );
    }

    await this.prisma.integrationConnection.delete({
      where: { id },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        entityType: 'IntegrationConnection',
        entityId: id,
        action: 'delete',
        oldValues: JSON.parse(
          JSON.stringify(maskConnection(connection)),
        ) as Prisma.InputJsonValue,
      },
    });

    return maskConnection(connection);
  }

  // ============================================================
  // MAPPING CRUD
  // ============================================================

  async createMapping(
    dto: CreateMappingDto,
    companyId: bigint,
    tenantId: bigint,
    userId: bigint,
  ): Promise<MappingResponseDto> {
    await this.ensureCompanyBelongsToTenant(companyId, tenantId);
    this.validateMappingConfig(dto.mappingConfig);

    let connectionId: bigint | null = null;
    if (dto.connectionId) {
      connectionId = BigInt(dto.connectionId);
      const conn = await this.prisma.integrationConnection.findFirst({
        where: { id: connectionId, companyId },
      });
      if (!conn) {
        throw new BadRequestException(
          `Connection ID ${dto.connectionId} not found under this company`,
        );
      }
    }

    const mapping = await this.prisma.importMapping.create({
      data: {
        companyId,
        connectionId,
        name: dto.name,
        sourceSystem: dto.sourceSystem,
        importType: dto.importType,
        mappingConfig: dto.mappingConfig,
        skipErrors: dto.skipErrors ?? false,
        isDefault: dto.isDefault ?? false,
        isActive: dto.isActive ?? true,
        createdBy: userId,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        entityType: 'ImportMapping',
        entityId: mapping.id,
        action: 'create',
        newValues: JSON.parse(
          JSON.stringify(mapMappingToResponse(mapping)),
        ) as Prisma.InputJsonValue,
      },
    });

    return mapMappingToResponse(mapping);
  }

  async findAllMappings(
    companyId: bigint,
    tenantId: bigint,
    paginationDto: PaginationDto,
  ): Promise<{ total: number; data: MappingResponseDto[] }> {
    await this.ensureCompanyBelongsToTenant(companyId, tenantId);

    const whereClause: Prisma.ImportMappingWhereInput = {
      companyId,
      ...(paginationDto.search
        ? {
            name: {
              contains: paginationDto.search,
            },
          }
        : {}),
    };

    const page = paginationDto.page ?? 1;
    const limit = paginationDto.limit ?? 10;
    const skip = (page - 1) * limit;

    const [total, mappings] = await Promise.all([
      this.prisma.importMapping.count({ where: whereClause }),
      this.prisma.importMapping.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      total,
      data: mappings.map(mapMappingToResponse),
    };
  }

  async findOneMapping(
    id: bigint,
    companyId: bigint,
    tenantId: bigint,
  ): Promise<MappingResponseDto> {
    await this.ensureCompanyBelongsToTenant(companyId, tenantId);

    const mapping = await this.prisma.importMapping.findFirst({
      where: { id, companyId },
    });

    if (!mapping) {
      throw new NotFoundException(
        `Mapping template with ID ${id} not found under this company`,
      );
    }

    return mapMappingToResponse(mapping);
  }

  async updateMapping(
    id: bigint,
    dto: UpdateMappingDto,
    companyId: bigint,
    tenantId: bigint,
    userId: bigint,
  ): Promise<MappingResponseDto> {
    await this.ensureCompanyBelongsToTenant(companyId, tenantId);

    const mapping = await this.prisma.importMapping.findFirst({
      where: { id, companyId },
    });

    if (!mapping) {
      throw new NotFoundException(
        `Mapping template with ID ${id} not found under this company`,
      );
    }

    const updatedData: Prisma.ImportMappingUpdateInput = {};

    if (dto.name !== undefined) updatedData.name = dto.name;
    if (dto.sourceSystem !== undefined)
      updatedData.sourceSystem = dto.sourceSystem;
    if (dto.importType !== undefined) updatedData.importType = dto.importType;
    if (dto.skipErrors !== undefined) updatedData.skipErrors = dto.skipErrors;
    if (dto.isDefault !== undefined) updatedData.isDefault = dto.isDefault;
    if (dto.isActive !== undefined) updatedData.isActive = dto.isActive;

    if (dto.connectionId !== undefined) {
      if (dto.connectionId === null) {
        updatedData.connection = { disconnect: true };
      } else {
        const connectionId = BigInt(dto.connectionId);
        const conn = await this.prisma.integrationConnection.findFirst({
          where: { id: connectionId, companyId },
        });
        if (!conn) {
          throw new BadRequestException(
            `Connection ID ${dto.connectionId} not found under this company`,
          );
        }
        updatedData.connection = { connect: { id: connectionId } };
      }
    }

    if (dto.mappingConfig !== undefined) {
      this.validateMappingConfig(dto.mappingConfig);
      updatedData.mappingConfig = dto.mappingConfig;
    }

    const updatedMapping = await this.prisma.importMapping.update({
      where: { id },
      data: updatedData,
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        entityType: 'ImportMapping',
        entityId: id,
        action: 'update',
        oldValues: JSON.parse(
          JSON.stringify(mapMappingToResponse(mapping)),
        ) as Prisma.InputJsonValue,
        newValues: JSON.parse(
          JSON.stringify(mapMappingToResponse(updatedMapping)),
        ) as Prisma.InputJsonValue,
      },
    });

    return mapMappingToResponse(updatedMapping);
  }

  async removeMapping(
    id: bigint,
    companyId: bigint,
    tenantId: bigint,
    userId: bigint,
  ): Promise<MappingResponseDto> {
    await this.ensureCompanyBelongsToTenant(companyId, tenantId);

    const mapping = await this.prisma.importMapping.findFirst({
      where: { id, companyId },
    });

    if (!mapping) {
      throw new NotFoundException(
        `Mapping template with ID ${id} not found under this company`,
      );
    }

    await this.prisma.importMapping.delete({
      where: { id },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        entityType: 'ImportMapping',
        entityId: id,
        action: 'delete',
        oldValues: JSON.parse(
          JSON.stringify(mapMappingToResponse(mapping)),
        ) as Prisma.InputJsonValue,
      },
    });

    return mapMappingToResponse(mapping);
  }

  // ============================================================
  // CONNECTION TESTING
  // ============================================================

  private testTcpConnection(
    host: string,
    port: number,
    label: string,
  ): Promise<{ success: boolean; message: string }> {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(3000);
      socket.on('connect', () => {
        socket.destroy();
        resolve({
          success: true,
          message: `Successfully established TCP connection to ${label} at ${host}:${port}.`,
        });
      });
      socket.on('timeout', () => {
        socket.destroy();
        resolve({
          success: false,
          message: `Connection to ${label} at ${host}:${port} timed out after 3 seconds.`,
        });
      });
      socket.on('error', (err) => {
        socket.destroy();
        resolve({
          success: false,
          message: `Connection to ${label} at ${host}:${port} failed: ${err.message}`,
        });
      });
      socket.connect(port, host);
    });
  }

  private parseCompanyId(companyCode: string): bigint | null {
    const match = companyCode.match(/\d+/);
    return match ? BigInt(match[0]) : null;
  }

  async syncCompaniesAndConnections(
    connInstance: any,
    tenantId: bigint,
    originConnection: any,
  ): Promise<void> {
    let oracledb: any;
    try {
      oracledb = require('oracledb');
    } catch {
      throw new BadRequestException('Oracle client is not configured.');
    }

    const result = await connInstance.execute(
      `SELECT COMPANY_CODE, COMPANY_NAME, INDUSTRY_TYPE, CURRENCY_CODE FROM FP_COMPANIES`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );

    const rows = (result.rows || []) as {
      COMPANY_CODE: string;
      COMPANY_NAME: string;
      INDUSTRY_TYPE?: string | null;
      CURRENCY_CODE?: string | null;
    }[];

    for (const row of rows) {
      const companyId = this.parseCompanyId(row.COMPANY_CODE);
      if (!companyId) continue;

      let industry: any = 'mixed';
      const indStr = row.INDUSTRY_TYPE?.toLowerCase();
      if (
        ['food_manufacturing', 'food_retail', 'mixed', 'other'].includes(
          indStr || '',
        )
      ) {
        industry = indStr;
      }

      // 1. Create or update company
      await this.prisma.company.upsert({
        where: { id: companyId },
        update: {
          name: row.COMPANY_NAME,
          industryType: industry,
          currencyCode: row.CURRENCY_CODE || 'EGP',
        },
        create: {
          id: companyId,
          tenantId,
          name: row.COMPANY_NAME,
          industryType: industry,
          currencyCode: row.CURRENCY_CODE || 'EGP',
        },
      });

      // 2. Propagate connection
      if (companyId !== originConnection.companyId) {
        const existingConn = await this.prisma.integrationConnection.findFirst({
          where: {
            companyId,
            connectionType: originConnection.connectionType,
            name: originConnection.name,
          },
        });

        if (existingConn) {
          await this.prisma.integrationConnection.update({
            where: { id: existingConn.id },
            data: {
              host: originConnection.host,
              port: originConnection.port,
              databaseName: originConnection.databaseName,
              username: originConnection.username,
              passwordEnc: originConnection.passwordEnc,
              apiBaseUrl: originConnection.apiBaseUrl,
              apiKeyEnc: originConnection.apiKeyEnc,
              extraConfig: originConnection.extraConfig,
              isActive: originConnection.isActive,
              syncSchedule: originConnection.syncSchedule,
            },
          });
        } else {
          await this.prisma.integrationConnection.create({
            data: {
              companyId,
              name: originConnection.name,
              connectionType: originConnection.connectionType,
              host: originConnection.host,
              port: originConnection.port,
              databaseName: originConnection.databaseName,
              username: originConnection.username,
              passwordEnc: originConnection.passwordEnc,
              apiBaseUrl: originConnection.apiBaseUrl,
              apiKeyEnc: originConnection.apiKeyEnc,
              extraConfig: originConnection.extraConfig,
              isActive: originConnection.isActive,
              syncSchedule: originConnection.syncSchedule,
              createdBy: originConnection.createdBy,
            },
          });
        }
      }

      // 3. Propagate default import mappings
      const mappingTypes = [
        {
          name: `${row.COMPANY_NAME} Sales`,
          type: 'sales',
          source: 'oracle',
          config: {
            accountCode: 'Account Code',
            amount: 'Amount',
            transactionDate: 'Date',
            quantity: 'Quantity',
            unitPrice: 'Unit Price',
            referenceNo: 'Reference',
            productSku: 'Product SKU',
            customerCode: 'Customer Code',
            siteCode: 'Site Code',
          },
        },
        {
          name: `${row.COMPANY_NAME} Expenses`,
          type: 'expenses',
          source: 'oracle',
          config: {
            accountCode: 'Account Code',
            amount: 'Amount',
            transactionDate: 'Date',
            quantity: 'Quantity',
            unitPrice: 'Unit Price',
            referenceNo: 'Reference',
            productSku: 'Product SKU',
            customerCode: 'Customer Code',
            siteCode: 'Site Code',
          },
        },
        {
          name: `${row.COMPANY_NAME} GL Actuals`,
          type: 'gl',
          source: 'oracle',
          config: {
            accountCode: 'Account Code',
            amount: 'Amount',
            transactionDate: 'Date',
            quantity: 'Quantity',
            unitPrice: 'Unit Price',
            referenceNo: 'Reference',
            productSku: 'Product SKU',
            customerCode: 'Customer Code',
            siteCode: 'Site Code',
          },
        },
      ];

      for (const mData of mappingTypes) {
        const conn = await this.prisma.integrationConnection.findFirst({
          where: {
            companyId,
            connectionType: originConnection.connectionType,
            name: originConnection.name,
          },
        });

        const existingMap = await this.prisma.importMapping.findFirst({
          where: {
            companyId,
            importType: mData.type as any,
            sourceSystem: mData.source as any,
          },
        });

        if (!existingMap) {
          await this.prisma.importMapping.create({
            data: {
              companyId,
              connectionId: conn?.id || null,
              name: mData.name,
              sourceSystem: mData.source as any,
              importType: mData.type as any,
              mappingConfig: mData.config as any,
              isActive: true,
              isDefault: true,
              createdBy: originConnection.createdBy,
            },
          });
        } else if (conn && !existingMap.connectionId) {
          await this.prisma.importMapping.update({
            where: { id: existingMap.id },
            data: { connectionId: conn.id },
          });
        }
      }
    }
  }

  async syncMasterData(connInstance: any, companyId: bigint): Promise<void> {
    const companyCode = `COMP-${companyId}`;
    let oracledb: any;
    try {
      oracledb = require('oracledb');
    } catch {
      throw new BadRequestException('Oracle client is not configured.');
    }

    // 1. Sync Accounts
    const accountsResult = await connInstance.execute(
      `SELECT ACCOUNT_CODE, ACCOUNT_NAME, ACCOUNT_TYPE FROM FP_ACCOUNTS WHERE COMPANY_CODE = :companyCode`,
      [companyCode],
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    const accountRows = (accountsResult.rows || []) as {
      ACCOUNT_CODE: string;
      ACCOUNT_NAME: string;
      ACCOUNT_TYPE: string;
    }[];
    for (const row of accountRows) {
      const typeStr = row.ACCOUNT_TYPE?.toLowerCase() || 'expense';
      let type: any = 'expense';
      if (
        [
          'revenue',
          'cogs',
          'expense',
          'asset',
          'liability',
          'equity',
          'cashflow',
        ].includes(typeStr)
      ) {
        type = typeStr;
      }
      await this.prisma.account.upsert({
        where: { companyId_code: { companyId, code: row.ACCOUNT_CODE } },
        update: { name: row.ACCOUNT_NAME, type, isActive: true },
        create: {
          companyId,
          code: row.ACCOUNT_CODE,
          name: row.ACCOUNT_NAME,
          type,
          isActive: true,
        },
      });
    }

    // 2. Sync Sites
    const sitesResult = await connInstance.execute(
      `SELECT SITE_CODE, SITE_NAME, SITE_TYPE, REGION FROM FP_SITES WHERE COMPANY_CODE = :companyCode`,
      [companyCode],
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    const siteRows = (sitesResult.rows || []) as {
      SITE_CODE: string;
      SITE_NAME: string;
      SITE_TYPE: string;
      REGION?: string | null;
    }[];
    for (const row of siteRows) {
      const typeStr = row.SITE_TYPE?.toLowerCase() || 'factory';
      let type: any = 'factory';
      if (
        [
          'factory',
          'branch',
          'warehouse',
          'office',
          'distribution_center',
        ].includes(typeStr)
      ) {
        type = typeStr;
      }
      const existing = await this.prisma.site.findFirst({
        where: { companyId, name: row.SITE_NAME },
      });
      if (existing) {
        await this.prisma.site.update({
          where: { id: existing.id },
          data: { type, region: row.REGION },
        });
      } else {
        await this.prisma.site.create({
          data: {
            companyId,
            name: row.SITE_NAME,
            type,
            region: row.REGION,
            status: 'active',
          },
        });
      }
    }

    // 3. Sync Customers
    const customersResult = await connInstance.execute(
      `SELECT CUSTOMER_CODE, CUSTOMER_NAME, CUSTOMER_TYPE, REGION FROM FP_CUSTOMERS WHERE COMPANY_CODE = :companyCode`,
      [companyCode],
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    const customerRows = (customersResult.rows || []) as {
      CUSTOMER_CODE: string;
      CUSTOMER_NAME: string;
      CUSTOMER_TYPE: string;
      REGION?: string | null;
    }[];
    for (const row of customerRows) {
      const typeStr = row.CUSTOMER_TYPE?.toLowerCase() || 'retail';
      let type: any = 'retail';
      if (
        ['retail', 'wholesale', 'distributor', 'internal', 'other'].includes(
          typeStr,
        )
      ) {
        type = typeStr;
      }
      await this.prisma.customer.upsert({
        where: { companyId_code: { companyId, code: row.CUSTOMER_CODE } },
        update: {
          name: row.CUSTOMER_NAME,
          customerType: type,
          region: row.REGION,
          isActive: true,
        },
        create: {
          companyId,
          code: row.CUSTOMER_CODE,
          name: row.CUSTOMER_NAME,
          customerType: type,
          region: row.REGION,
          isActive: true,
        },
      });
    }

    // 4. Sync Products
    const productsResult = await connInstance.execute(
      `SELECT PRODUCT_CODE, PRODUCT_NAME, CATEGORY_CODE AS CATEGORY, UNIT_CODE AS UNIT, SALE_PRICE, STANDARD_COST FROM FP_PRODUCTS WHERE COMPANY_CODE = :companyCode`,
      [companyCode],
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    const productRows = (productsResult.rows || []) as {
      PRODUCT_CODE: string;
      PRODUCT_NAME: string;
      CATEGORY?: string | null;
      UNIT?: string | null;
      SALE_PRICE?: number | null;
      STANDARD_COST?: number | null;
    }[];
    for (const row of productRows) {
      let categoryId: bigint | null = null;
      if (row.CATEGORY) {
        let cat = await this.prisma.productCategory.findFirst({
          where: { companyId, name: row.CATEGORY },
        });
        if (!cat) {
          cat = await this.prisma.productCategory.create({
            data: { companyId, name: row.CATEGORY },
          });
        }
        categoryId = cat.id;
      }

      let unitId: bigint | null = null;
      if (row.UNIT) {
        let unit = await this.prisma.unit.findFirst({
          where: { companyId, symbol: row.UNIT },
        });
        if (!unit) {
          unit = await this.prisma.unit.create({
            data: { companyId, symbol: row.UNIT, name: row.UNIT },
          });
        }
        unitId = unit.id;
      }

      await this.prisma.product.upsert({
        where: { companyId_sku: { companyId, sku: row.PRODUCT_CODE } },
        update: {
          name: row.PRODUCT_NAME,
          salePrice: row.SALE_PRICE || 0,
          standardCost: row.STANDARD_COST || 0,
          categoryId,
          unitId,
          isActive: true,
        },
        create: {
          companyId,
          sku: row.PRODUCT_CODE,
          name: row.PRODUCT_NAME,
          salePrice: row.SALE_PRICE || 0,
          standardCost: row.STANDARD_COST || 0,
          categoryId,
          unitId,
          isActive: true,
        },
      });
    }

    // 5. Sync Materials
    const materialsResult = await connInstance.execute(
      `SELECT MATERIAL_CODE, MATERIAL_NAME, UNIT_CODE AS UNIT, PURCHASE_PRICE, SUPPLIER_CODE FROM FP_MATERIALS WHERE COMPANY_CODE = :companyCode`,
      [companyCode],
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    const materialRows = (materialsResult.rows || []) as {
      MATERIAL_CODE: string;
      MATERIAL_NAME: string;
      UNIT?: string | null;
      PURCHASE_PRICE?: number | null;
      SUPPLIER_CODE?: string | null;
    }[];
    for (const row of materialRows) {
      let unitId: bigint | null = null;
      if (row.UNIT) {
        let unit = await this.prisma.unit.findFirst({
          where: { companyId, symbol: row.UNIT },
        });
        if (!unit) {
          unit = await this.prisma.unit.create({
            data: { companyId, symbol: row.UNIT, name: row.UNIT },
          });
        }
        unitId = unit.id;
      }

      let supplierId: bigint | null = null;
      if (row.SUPPLIER_CODE) {
        let supp = await this.prisma.supplier.findFirst({
          where: { companyId, name: row.SUPPLIER_CODE },
        });
        if (!supp) {
          supp = await this.prisma.supplier.create({
            data: { companyId, name: row.SUPPLIER_CODE },
          });
        }
        supplierId = supp.id;
      }

      await this.prisma.material.upsert({
        where: { companyId_code: { companyId, code: row.MATERIAL_CODE } },
        update: {
          name: row.MATERIAL_NAME,
          purchasePrice: row.PURCHASE_PRICE || 0,
          unitId,
          supplierId,
          isActive: true,
        },
        create: {
          companyId,
          code: row.MATERIAL_CODE,
          name: row.MATERIAL_NAME,
          purchasePrice: row.PURCHASE_PRICE || 0,
          unitId,
          supplierId,
          isActive: true,
        },
      });
    }

    // 6. Sync Cost Centers
    const costCentersResult = await connInstance.execute(
      `SELECT COST_CENTER_CODE, COST_CENTER_NAME, COST_CENTER_TYPE FROM FP_COST_CENTERS WHERE COMPANY_CODE = :companyCode`,
      [companyCode],
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    const ccRows = (costCentersResult.rows || []) as {
      COST_CENTER_CODE: string;
      COST_CENTER_NAME: string;
      COST_CENTER_TYPE?: string | null;
    }[];
    for (const row of ccRows) {
      const existing = await this.prisma.costCenter.findFirst({
        where: { companyId, code: row.COST_CENTER_CODE },
      });
      const typeStr = row.COST_CENTER_TYPE?.toLowerCase() || 'other';
      const ccType = [
        'sales',
        'production',
        'admin',
        'marketing',
        'logistics',
        'maintenance',
        'other',
      ].includes(typeStr)
        ? typeStr
        : 'other';
      if (existing) {
        await this.prisma.costCenter.update({
          where: { id: existing.id },
          data: { name: row.COST_CENTER_NAME, type: ccType as any },
        });
      } else {
        await this.prisma.costCenter.create({
          data: {
            companyId,
            code: row.COST_CENTER_CODE,
            name: row.COST_CENTER_NAME,
            type: ccType as any,
          },
        });
      }
    }

    // 7. Sync Product Categories (standalone)
    const categoriesResult = await connInstance.execute(
      `SELECT CATEGORY_CODE, CATEGORY_NAME FROM FP_PRODUCT_CATEGORIES WHERE COMPANY_CODE = :companyCode`,
      [companyCode],
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    const catRows = (categoriesResult.rows || []) as {
      CATEGORY_CODE: string;
      CATEGORY_NAME: string;
    }[];
    for (const row of catRows) {
      const existing = await this.prisma.productCategory.findFirst({
        where: { companyId, name: row.CATEGORY_NAME },
      });
      if (!existing) {
        await this.prisma.productCategory.create({
          data: { companyId, name: row.CATEGORY_NAME },
        });
      }
    }

    // 8. Sync Units (standalone)
    const unitsResult = await connInstance.execute(
      `SELECT UNIT_CODE, UNIT_NAME FROM FP_UNITS WHERE COMPANY_CODE = :companyCode`,
      [companyCode],
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    const unitRows = (unitsResult.rows || []) as {
      UNIT_CODE: string;
      UNIT_NAME: string;
    }[];
    for (const row of unitRows) {
      const existing = await this.prisma.unit.findFirst({
        where: { companyId, symbol: row.UNIT_CODE },
      });
      if (!existing) {
        await this.prisma.unit.create({
          data: {
            companyId,
            symbol: row.UNIT_CODE,
            name: row.UNIT_NAME || row.UNIT_CODE,
          },
        });
      }
    }

    // 9. Sync Suppliers (standalone)
    const suppliersResult = await connInstance.execute(
      `SELECT SUPPLIER_CODE, SUPPLIER_NAME, PHONE AS SUPPLIER_PHONE, EMAIL AS SUPPLIER_EMAIL FROM FP_SUPPLIERS WHERE COMPANY_CODE = :companyCode`,
      [companyCode],
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    const suppRows = (suppliersResult.rows || []) as {
      SUPPLIER_CODE: string;
      SUPPLIER_NAME: string;
      SUPPLIER_PHONE?: string | null;
      SUPPLIER_EMAIL?: string | null;
    }[];
    for (const row of suppRows) {
      const existing = await this.prisma.supplier.findFirst({
        where: { companyId, name: row.SUPPLIER_NAME },
      });
      if (existing) {
        await this.prisma.supplier.update({
          where: { id: existing.id },
          data: {
            phone: row.SUPPLIER_PHONE ?? null,
            email: row.SUPPLIER_EMAIL ?? null,
          },
        });
      } else {
        await this.prisma.supplier.create({
          data: {
            companyId,
            name: row.SUPPLIER_NAME,
            phone: row.SUPPLIER_PHONE ?? null,
            email: row.SUPPLIER_EMAIL ?? null,
          },
        });
      }
    }

    // 10. Sync BOM Recipes
    const recipesResult = await connInstance.execute(
      `SELECT RECIPE_CODE, PRODUCT_CODE, VERSION, OUTPUT_QTY, LABOR_COST, OVERHEAD_COST FROM FP_BOM_RECIPES WHERE COMPANY_CODE = :companyCode`,
      [companyCode],
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    const recipeRows = (recipesResult.rows || []) as {
      RECIPE_CODE: string;
      PRODUCT_CODE: string;
      VERSION?: string | null;
      OUTPUT_QTY?: number | null;
      LABOR_COST?: number | null;
      OVERHEAD_COST?: number | null;
    }[];

    const recipeIdMap = new Map<string, bigint>();

    for (const row of recipeRows) {
      const product = await this.prisma.product.findFirst({
        where: { companyId, sku: row.PRODUCT_CODE },
      });
      if (!product) continue;

      const existingRecipe = await this.prisma.bomRecipe.findFirst({
        where: {
          companyId,
          productId: product.id,
          version: row.VERSION || 'v1',
        },
      });

      if (existingRecipe) {
        await this.prisma.bomRecipe.update({
          where: { id: existingRecipe.id },
          data: {
            outputQty: row.OUTPUT_QTY ?? 1,
            laborCost: row.LABOR_COST ?? 0,
            overheadCost: row.OVERHEAD_COST ?? 0,
          },
        });
        recipeIdMap.set(row.RECIPE_CODE, existingRecipe.id);
      } else {
        const created = await this.prisma.bomRecipe.create({
          data: {
            companyId,
            productId: product.id,
            version: row.VERSION || 'v1',
            outputQty: row.OUTPUT_QTY ?? 1,
            laborCost: row.LABOR_COST ?? 0,
            overheadCost: row.OVERHEAD_COST ?? 0,
          },
        });
        recipeIdMap.set(row.RECIPE_CODE, created.id);
      }
    }

    // 11. Sync BOM Lines
    const bomLinesResult = await connInstance.execute(
      `SELECT LINE_ID, RECIPE_CODE, MATERIAL_CODE, QTY_PER_OUTPUT, UNIT_COST FROM FP_BOM_LINES WHERE COMPANY_CODE = :companyCode`,
      [companyCode],
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    const bomLineRows = (bomLinesResult.rows || []) as {
      LINE_ID: string;
      RECIPE_CODE: string;
      MATERIAL_CODE: string;
      QTY_PER_OUTPUT?: number | null;
      UNIT_COST?: number | null;
    }[];

    for (const row of bomLineRows) {
      const bomId = recipeIdMap.get(row.RECIPE_CODE);
      if (!bomId) continue;

      const material = await this.prisma.material.findFirst({
        where: { companyId, code: row.MATERIAL_CODE },
      });
      if (!material) continue;

      const existingLine = await this.prisma.bomLine.findFirst({
        where: { bomId, materialId: material.id },
      });

      if (existingLine) {
        await this.prisma.bomLine.update({
          where: { id: existingLine.id },
          data: {
            qtyPerOutput: row.QTY_PER_OUTPUT ?? 1,
            unitCost: row.UNIT_COST ?? 0,
          },
        });
      } else {
        await this.prisma.bomLine.create({
          data: {
            bomId,
            materialId: material.id,
            qtyPerOutput: row.QTY_PER_OUTPUT ?? 1,
            unitCost: row.UNIT_COST ?? 0,
          },
        });
      }
    }

    // ============================================================
    // 12. Sync Inventory Snapshots (FP_INVENTORY_SNAPSHOTS)
    // ============================================================
    try {
      await this.prisma.inventorySnapshot.deleteMany({ where: { companyId } });
      const invResult = await connInstance.execute(
        `SELECT SITE_CODE, PRODUCT_CODE, MATERIAL_CODE, SNAPSHOT_DATE, QTY_ON_HAND, INVENTORY_VALUE FROM FP_INVENTORY_SNAPSHOTS WHERE COMPANY_CODE = :companyCode`,
        [companyCode],
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );
      const invRows = (invResult.rows || []) as any[];
      for (const row of invRows) {
        const site = await this.prisma.site.findFirst({ where: { companyId, name: row.SITE_CODE } });
        if (!site) continue;
        let productId: bigint | null = null;
        if (row.PRODUCT_CODE) {
          const p = await this.prisma.product.findFirst({ where: { companyId, sku: row.PRODUCT_CODE } });
          if (p) productId = p.id;
        }
        let materialId: bigint | null = null;
        if (row.MATERIAL_CODE) {
          const m = await this.prisma.material.findFirst({ where: { companyId, code: row.MATERIAL_CODE } });
          if (m) materialId = m.id;
        }
        await this.prisma.inventorySnapshot.create({
          data: {
            companyId,
            siteId: site.id,
            productId,
            materialId,
            snapshotDate: new Date(row.SNAPSHOT_DATE),
            qtyOnHand: row.QTY_ON_HAND ?? 0,
            inventoryValue: row.INVENTORY_VALUE ?? 0,
          },
        });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[syncMasterData] FP_INVENTORY_SNAPSHOTS failed: ${msg}`);
    }

    // ============================================================
    // 13. Sync Budget Lines (FP_BUDGET_LINES)
    // ============================================================
    try {
      const budgetYear = new Date().getFullYear();
      let budgetCycle = await this.prisma.budgetCycle.findFirst({
        where: { companyId, fiscalYear: budgetYear },
      });
      if (!budgetCycle) {
        budgetCycle = await this.prisma.budgetCycle.create({
          data: {
            companyId,
            name: `FY ${budgetYear} - Oracle Sync`,
            fiscalYear: budgetYear,
            status: 'approved' as any,
            startDate: new Date(`${budgetYear}-01-01`),
            endDate: new Date(`${budgetYear}-12-31`),
          },
        });
      }
      await this.prisma.budgetLine.deleteMany({ where: { budgetCycleId: budgetCycle.id } });
      const budgetResult = await connInstance.execute(
        `SELECT ACCOUNT_CODE, SITE_CODE, COST_CENTER_CODE, PRODUCT_CODE, MATERIAL_CODE, CUSTOMER_CODE, PERIOD_MONTH, QUANTITY, UNIT_PRICE, AMOUNT, NOTES FROM FP_BUDGET_LINES WHERE COMPANY_CODE = :companyCode`,
        [companyCode],
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );
      const budgetRows = (budgetResult.rows || []) as any[];
      for (const row of budgetRows) {
        const account = await this.prisma.account.findFirst({ where: { companyId, code: row.ACCOUNT_CODE } });
        if (!account) continue;
        let siteId: bigint | null = null;
        if (row.SITE_CODE) { const s = await this.prisma.site.findFirst({ where: { companyId, name: row.SITE_CODE } }); if (s) siteId = s.id; }
        let costCenterId: bigint | null = null;
        if (row.COST_CENTER_CODE) { const cc = await this.prisma.costCenter.findFirst({ where: { companyId, code: row.COST_CENTER_CODE } }); if (cc) costCenterId = cc.id; }
        let productId: bigint | null = null;
        if (row.PRODUCT_CODE) { const p = await this.prisma.product.findFirst({ where: { companyId, sku: row.PRODUCT_CODE } }); if (p) productId = p.id; }
        let materialId: bigint | null = null;
        if (row.MATERIAL_CODE) { const m = await this.prisma.material.findFirst({ where: { companyId, code: row.MATERIAL_CODE } }); if (m) materialId = m.id; }
        let customerId: bigint | null = null;
        if (row.CUSTOMER_CODE) { const c = await this.prisma.customer.findFirst({ where: { companyId, code: row.CUSTOMER_CODE } }); if (c) customerId = c.id; }
        await this.prisma.budgetLine.create({
          data: {
            budgetCycleId: budgetCycle.id,
            accountId: account.id,
            siteId, costCenterId, productId, materialId, customerId,
            periodMonth: row.PERIOD_MONTH,
            quantity: row.QUANTITY ?? 0,
            unitPrice: row.UNIT_PRICE ?? 0,
            amount: row.AMOUNT ?? 0,
            notes: row.NOTES ?? null,
          },
        });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[syncMasterData] FP_BUDGET_LINES failed: ${msg}`);
    }

    // ============================================================
    // 14. Sync Forecast Lines (FP_FORECAST_LINES)
    // ============================================================
    try {
      const budgetYear = new Date().getFullYear();
      let forecastCycle = await this.prisma.forecastCycle.findFirst({
        where: { companyId, fiscalYear: budgetYear },
      });
      if (!forecastCycle) {
        forecastCycle = await this.prisma.forecastCycle.create({
          data: {
            companyId,
            name: `FY ${budgetYear} - Oracle Sync`,
            fiscalYear: budgetYear,
            basePeriod: new Date(`${budgetYear}-01-01`),
            status: 'approved' as any,
          },
        });
      }
      await this.prisma.forecastLine.deleteMany({ where: { forecastCycleId: forecastCycle.id } });
      const forecastResult = await connInstance.execute(
        `SELECT ACCOUNT_CODE, SITE_CODE, COST_CENTER_CODE, PRODUCT_CODE, MATERIAL_CODE, CUSTOMER_CODE, PERIOD_MONTH, QUANTITY, UNIT_PRICE, AMOUNT, DRIVER_TYPE, NOTES FROM FP_FORECAST_LINES WHERE COMPANY_CODE = :companyCode`,
        [companyCode],
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );
      const forecastRows = (forecastResult.rows || []) as any[];
      for (const row of forecastRows) {
        const account = await this.prisma.account.findFirst({ where: { companyId, code: row.ACCOUNT_CODE } });
        if (!account) continue;
        let siteId: bigint | null = null;
        if (row.SITE_CODE) { const s = await this.prisma.site.findFirst({ where: { companyId, name: row.SITE_CODE } }); if (s) siteId = s.id; }
        let costCenterId: bigint | null = null;
        if (row.COST_CENTER_CODE) { const cc = await this.prisma.costCenter.findFirst({ where: { companyId, code: row.COST_CENTER_CODE } }); if (cc) costCenterId = cc.id; }
        let productId: bigint | null = null;
        if (row.PRODUCT_CODE) { const p = await this.prisma.product.findFirst({ where: { companyId, sku: row.PRODUCT_CODE } }); if (p) productId = p.id; }
        let materialId: bigint | null = null;
        if (row.MATERIAL_CODE) { const m = await this.prisma.material.findFirst({ where: { companyId, code: row.MATERIAL_CODE } }); if (m) materialId = m.id; }
        let customerId: bigint | null = null;
        if (row.CUSTOMER_CODE) { const c = await this.prisma.customer.findFirst({ where: { companyId, code: row.CUSTOMER_CODE } }); if (c) customerId = c.id; }
        await this.prisma.forecastLine.create({
          data: {
            forecastCycleId: forecastCycle.id,
            accountId: account.id,
            siteId, costCenterId, productId, materialId, customerId,
            periodMonth: row.PERIOD_MONTH,
            quantity: row.QUANTITY ?? 0,
            unitPrice: row.UNIT_PRICE ?? 0,
            amount: row.AMOUNT ?? 0,
            driverType: row.DRIVER_TYPE ?? null,
            notes: row.NOTES ?? null,
          },
        });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[syncMasterData] FP_FORECAST_LINES failed: ${msg}`);
    }

    // ============================================================
    // 15. Sync Production Plans (FP_PRODUCTION_PLANS)
    // ============================================================
    try {
      await this.prisma.productionPlan.deleteMany({ where: { companyId } });
      const ppResult = await connInstance.execute(
        `SELECT SITE_CODE, PRODUCT_CODE, PLAN_SOURCE, FISCAL_YEAR, PERIOD_MONTH, PLANNED_QTY, ACTUAL_QTY, ESTIMATED_COST, ACTUAL_COST FROM FP_PRODUCTION_PLANS WHERE COMPANY_CODE = :companyCode`,
        [companyCode],
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );
      const ppRows = (ppResult.rows || []) as any[];
      for (const row of ppRows) {
        const site = await this.prisma.site.findFirst({ where: { companyId, name: row.SITE_CODE } });
        if (!site) continue;
        const product = await this.prisma.product.findFirst({ where: { companyId, sku: row.PRODUCT_CODE } });
        if (!product) continue;
        const planSource = row.PLAN_SOURCE?.toLowerCase() === 'auto' ? 'auto' as any : 'manual' as any;
        await this.prisma.productionPlan.upsert({
          where: {
            companyId_siteId_productId_fiscalYear_periodMonth: {
              companyId, siteId: site.id, productId: product.id,
              fiscalYear: row.FISCAL_YEAR, periodMonth: row.PERIOD_MONTH,
            },
          },
          update: { plannedQty: row.PLANNED_QTY ?? 0, actualQty: row.ACTUAL_QTY, estimatedCost: row.ESTIMATED_COST, actualCost: row.ACTUAL_COST, planSource },
          create: {
            companyId, siteId: site.id, productId: product.id,
            fiscalYear: row.FISCAL_YEAR, periodMonth: row.PERIOD_MONTH,
            plannedQty: row.PLANNED_QTY ?? 0, actualQty: row.ACTUAL_QTY, estimatedCost: row.ESTIMATED_COST, actualCost: row.ACTUAL_COST, planSource,
          },
        });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[syncMasterData] FP_PRODUCTION_PLANS failed: ${msg}`);
    }

    // ============================================================
    // 16. Sync Headcount Plans (FP_HEADCOUNT_PLANS)
    // ============================================================
    try {
      let hcBudgetCycle = await this.prisma.budgetCycle.findFirst({
        where: { companyId, fiscalYear: new Date().getFullYear() },
      });
      if (!hcBudgetCycle) {
        const y = new Date().getFullYear();
        hcBudgetCycle = await this.prisma.budgetCycle.create({
          data: {
            companyId, name: `FY ${y} - Oracle Sync`, fiscalYear: y,
            status: 'approved' as any, startDate: new Date(`${y}-01-01`), endDate: new Date(`${y}-12-31`),
          },
        });
      }
      await this.prisma.headcountPlan.deleteMany({ where: { budgetCycleId: hcBudgetCycle.id } });
      const hcResult = await connInstance.execute(
        `SELECT SITE_CODE, COST_CENTER_CODE, JOB_TITLE, DEPARTMENT, EMPLOYMENT_TYPE, HEADCOUNT, PERIOD_MONTH, BASIC_SALARY, ALLOWANCES, SOCIAL_INSURANCE, TOTAL_COST, NOTES FROM FP_HEADCOUNT_PLANS WHERE COMPANY_CODE = :companyCode`,
        [companyCode],
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );
      const hcRows = (hcResult.rows || []) as any[];
      const validEmpTypes = ['full_time', 'part_time', 'contractor', 'intern'];
      for (const row of hcRows) {
        let siteId: bigint | null = null;
        if (row.SITE_CODE) { const s = await this.prisma.site.findFirst({ where: { companyId, name: row.SITE_CODE } }); if (s) siteId = s.id; }
        let costCenterId: bigint | null = null;
        if (row.COST_CENTER_CODE) { const cc = await this.prisma.costCenter.findFirst({ where: { companyId, code: row.COST_CENTER_CODE } }); if (cc) costCenterId = cc.id; }
        const empType = row.EMPLOYMENT_TYPE?.toLowerCase() || 'full_time';
        await this.prisma.headcountPlan.create({
          data: {
            budgetCycleId: hcBudgetCycle.id, siteId, costCenterId,
            jobTitle: row.JOB_TITLE, department: row.DEPARTMENT,
            employmentType: validEmpTypes.includes(empType) ? empType as any : 'full_time',
            headcount: row.HEADCOUNT ?? 1, periodMonth: row.PERIOD_MONTH,
            basicSalary: row.BASIC_SALARY ?? 0, allowances: row.ALLOWANCES ?? 0,
            socialInsurance: row.SOCIAL_INSURANCE ?? 0, totalCost: row.TOTAL_COST ?? 0,
            notes: row.NOTES ?? null,
          },
        });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[syncMasterData] FP_HEADCOUNT_PLANS failed: ${msg}`);
    }

    // ============================================================
    // 17. Sync Promotions (FP_PROMOTIONS)
    // ============================================================
    try {
      await this.prisma.promotion.deleteMany({ where: { companyId } });
      const promoResult = await connInstance.execute(
        `SELECT NAME, DESCRIPTION, PRODUCT_CODE, CUSTOMER_CODE, DISCOUNT_PCT, DISCOUNT_AMOUNT, START_DATE, END_DATE, BUDGET_AMOUNT, ACTUAL_COST, INCREMENTAL_REVENUE, ROI, IS_ACTIVE FROM FP_PROMOTIONS WHERE COMPANY_CODE = :companyCode`,
        [companyCode],
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );
      const promoRows = (promoResult.rows || []) as any[];
      for (const row of promoRows) {
        let productId: bigint | null = null;
        if (row.PRODUCT_CODE) { const p = await this.prisma.product.findFirst({ where: { companyId, sku: row.PRODUCT_CODE } }); if (p) productId = p.id; }
        let customerId: bigint | null = null;
        if (row.CUSTOMER_CODE) { const c = await this.prisma.customer.findFirst({ where: { companyId, code: row.CUSTOMER_CODE } }); if (c) customerId = c.id; }
        const isActive = row.IS_ACTIVE === 'Y' || row.IS_ACTIVE === 1 || row.IS_ACTIVE === true;
        await this.prisma.promotion.create({
          data: {
            companyId, name: row.NAME, description: row.DESCRIPTION,
            productId, customerId,
            discountPct: row.DISCOUNT_PCT, discountAmt: row.DISCOUNT_AMOUNT,
            startDate: new Date(row.START_DATE),
            endDate: row.END_DATE ? new Date(row.END_DATE) : null,
            budgetAmt: row.BUDGET_AMOUNT ?? 0, actualCost: row.ACTUAL_COST ?? 0,
            incrementalRevenue: row.INCREMENTAL_REVENUE ?? 0, roi: row.ROI,
            isActive,
          },
        });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[syncMasterData] FP_PROMOTIONS failed: ${msg}`);
    }

    // ============================================================
    // 18. Sync Raw Material Prices (FP_RAW_MATERIAL_PRICES)
    // ============================================================
    try {
      await this.prisma.rawMaterialPrice.deleteMany({ where: { companyId } });
      const rmpResult = await connInstance.execute(
        `SELECT MATERIAL_CODE, PRICE, PRICE_DATE, SOURCE FROM FP_RAW_MATERIAL_PRICES WHERE COMPANY_CODE = :companyCode`,
        [companyCode],
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );
      const rmpRows = (rmpResult.rows || []) as any[];
      for (const row of rmpRows) {
        const material = await this.prisma.material.findFirst({ where: { companyId, code: row.MATERIAL_CODE } });
        if (!material) continue;
        await this.prisma.rawMaterialPrice.create({
          data: {
            companyId, materialId: material.id,
            price: row.PRICE ?? 0,
            priceDate: new Date(row.PRICE_DATE),
            source: row.SOURCE ?? 'oracle-sync',
          },
        });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[syncMasterData] FP_RAW_MATERIAL_PRICES failed: ${msg}`);
    }

    // ============================================================
    // 19. Sync GL Actuals (FP_GL_ACTUALS) → actual_imports + actual_lines
    // ============================================================
    try {
      const glResult = await connInstance.execute(
        `SELECT ACCOUNT_CODE, SITE_CODE, PRODUCT_CODE, CUSTOMER_CODE, QUANTITY, AMOUNT, TRANSACTION_DATE, REFERENCE_NO FROM FP_GL_ACTUALS WHERE COMPANY_CODE = :companyCode`,
        [companyCode],
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );
      const glRows = (glResult.rows || []) as any[];
      if (glRows.length > 0) {
        let minDate = new Date('9999-12-31');
        let maxDate = new Date('1900-01-01');
        for (const row of glRows) {
          const d = new Date(row.TRANSACTION_DATE);
          if (d < minDate) minDate = d;
          if (d > maxDate) maxDate = d;
        }
        const actualImport = await this.prisma.actualImport.create({
          data: {
            companyId, sourceSystem: 'oracle', importType: 'expenses',
            periodFrom: minDate, periodTo: maxDate,
            status: 'validated', importedBy: null,
          },
        });
        for (const row of glRows) {
          const account = await this.prisma.account.findFirst({ where: { companyId, code: row.ACCOUNT_CODE } });
          if (!account) continue;
          let siteId: bigint | null = null;
          if (row.SITE_CODE) { const s = await this.prisma.site.findFirst({ where: { companyId, name: row.SITE_CODE } }); if (s) siteId = s.id; }
          let productId: bigint | null = null;
          if (row.PRODUCT_CODE) { const p = await this.prisma.product.findFirst({ where: { companyId, sku: row.PRODUCT_CODE } }); if (p) productId = p.id; }
          let customerId: bigint | null = null;
          if (row.CUSTOMER_CODE) { const c = await this.prisma.customer.findFirst({ where: { companyId, code: row.CUSTOMER_CODE } }); if (c) customerId = c.id; }
          await this.prisma.actualLine.create({
            data: {
              actualImportId: actualImport.id, accountId: account.id,
              siteId, productId, customerId,
              quantity: row.QUANTITY ?? 0, amount: row.AMOUNT ?? 0,
              transactionDate: new Date(row.TRANSACTION_DATE),
              referenceNo: row.REFERENCE_NO ?? null,
            },
          });
        }
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[syncMasterData] FP_GL_ACTUALS failed: ${msg}`);
    }
  }

  async runCompanySyncForConnection(
    connection: any,
    tenantId: bigint,
  ): Promise<void> {
    if (
      connection.connectionType !== ConnectionType.oracle ||
      connection.host?.toLowerCase() === 'mock'
    ) {
      return;
    }

    let oracledb: any;
    try {
      oracledb = require('oracledb');
    } catch {
      return;
    }

    const password = connection.passwordEnc
      ? decrypt(connection.passwordEnc)
      : '';
    const connectString = `${connection.host}:${connection.port || 1521}/${connection.databaseName || ''}`;

    let connInstance: any;
    try {
      connInstance = await oracledb.getConnection({
        user: connection.username || '',
        password,
        connectString,
      });
      await this.syncCompaniesAndConnections(
        connInstance,
        tenantId,
        connection,
      );
    } catch (err) {
      console.error('Failed to sync companies during connection event:', err);
    } finally {
      if (connInstance) {
        await connInstance.close().catch(() => {});
      }
    }
  }

  async testConnection(
    dto: TestConnectionDto,
    companyId: bigint,
    tenantId: bigint,
    userId: bigint,
  ): Promise<{ success: boolean; message: string }> {
    await this.ensureCompanyBelongsToTenant(companyId, tenantId);

    let connectionType = dto.connectionType;
    let host = dto.host;
    let port = dto.port;
    let apiBaseUrl = dto.apiBaseUrl;
    let username = dto.username;
    let databaseName = dto.databaseName;

    if (dto.connectionId) {
      const conn = await this.prisma.integrationConnection.findFirst({
        where: { id: BigInt(dto.connectionId), companyId },
      });
      if (!conn) {
        throw new NotFoundException(
          `Connection template with ID ${dto.connectionId} not found`,
        );
      }
      connectionType = conn.connectionType;
      host = conn.host ?? undefined;
      port = conn.port ?? undefined;
      apiBaseUrl = conn.apiBaseUrl ?? undefined;
      username = conn.username ?? undefined;
      databaseName = conn.databaseName ?? undefined;
    }

    if (!connectionType) {
      throw new BadRequestException(
        'connectionType is required to test a connection',
      );
    }

    let success = true;
    let message = 'Connection test successful';

    if (connectionType === ConnectionType.oracle) {
      if (host?.toLowerCase() === 'mock') {
        success = true;
        message = 'Successfully connected to Oracle DB (MOCK MODE).';
      } else {
        let oracledb: any;
        try {
          // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
          oracledb = require('oracledb');
        } catch {
          success = false;
          message = 'Oracle client is not configured on this server.';
        }

        if (success) {
          if (!host || !username) {
            success = false;
            message =
              'Oracle host and username are required for connection testing.';
          } else {
            let connPassword = dto.password || '';
            if (!connPassword && dto.connectionId) {
              const conn = await this.prisma.integrationConnection.findFirst({
                where: { id: BigInt(dto.connectionId), companyId },
              });
              if (conn && conn.passwordEnc) {
                connPassword = decrypt(conn.passwordEnc);
              }
            }

            const connectString = `${host}:${port || 1521}/${databaseName || ''}`;

            let connInstance: any;
            try {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
              connInstance = await oracledb.getConnection({
                user: username,
                password: connPassword,
                connectString: connectString,
              });

              if (dto.connectionId) {
                const conn = await this.prisma.integrationConnection.findFirst({
                  where: { id: BigInt(dto.connectionId), companyId },
                });
                if (conn) {
                  await this.syncCompaniesAndConnections(
                    connInstance,
                    tenantId,
                    conn,
                  );
                }
              }

              // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
              await connInstance.close();
              success = true;
              message = `Successfully connected to Oracle DB at ${connectString}.`;
            } catch (err: unknown) {
              success = false;
              message = `Oracle DB connection failed: ${err instanceof Error ? err.message : String(err)}`;
            }
          }
        }
      }
    } else if (
      connectionType === ConnectionType.sap ||
      connectionType === ConnectionType.erp ||
      connectionType === ConnectionType.pms ||
      connectionType === ConnectionType.pos ||
      connectionType === ConnectionType.custom
    ) {
      // Real TCP connection test for on-premise systems
      if (!host) {
        success = false;
        message = `${connectionType.toUpperCase()} host is required`;
      } else {
        const tcpPort = port || 3200;
        const res = await this.testTcpConnection(host, tcpPort, connectionType);
        success = res.success;
        message = res.message;
      }
    } else if (
      connectionType === ConnectionType.odoo ||
      connectionType === ConnectionType.woocommerce
    ) {
      // Real HTTP connection test for cloud-based systems
      let targetUrl = apiBaseUrl || host;
      if (!targetUrl) {
        success = false;
        message = `${connectionType.toUpperCase()} URL or host is missing`;
      } else {
        if (
          !targetUrl.startsWith('http://') &&
          !targetUrl.startsWith('https://')
        ) {
          targetUrl = 'http://' + targetUrl;
        }
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 4000);
          const res = await fetch(targetUrl, { signal: controller.signal });
          clearTimeout(timeoutId);
          if (res.status >= 200 && res.status < 400) {
            success = true;
            message = `Successfully connected to ${connectionType.toUpperCase()} at ${targetUrl} with status ${res.status}.`;
          } else {
            success = false;
            message = `${connectionType.toUpperCase()} at ${targetUrl} responded with status ${res.status}.`;
          }
        } catch (err: unknown) {
          success = false;
          const errMsg =
            err instanceof Error ? err.message : 'Host is unreachable.';
          message = `Failed to connect to ${connectionType.toUpperCase()} at ${targetUrl}: ${errMsg}`;
        }
      }
    } else if (connectionType === ConnectionType.sftp) {
      if (!host) {
        success = false;
        message = 'SFTP host is missing';
      } else {
        const sftpPort = port || 22;
        const res = await this.testTcpConnection(host, sftpPort, 'SFTP');
        success = res.success;
        message = res.message;
      }
    } else if (connectionType === ConnectionType.rest_api) {
      let targetUrl = apiBaseUrl || host;
      if (!targetUrl) {
        success = false;
        message = 'REST API Base URL or host is missing';
      } else {
        if (
          !targetUrl.startsWith('http://') &&
          !targetUrl.startsWith('https://')
        ) {
          targetUrl = 'http://' + targetUrl;
        }
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 4000);
          const res = await fetch(targetUrl, { signal: controller.signal });
          clearTimeout(timeoutId);
          if (res.status >= 200 && res.status < 400) {
            success = true;
            message = `HTTP request to ${targetUrl} completed with status ${res.status}.`;
          } else {
            success = false;
            message = `HTTP request to ${targetUrl} failed with status ${res.status}.`;
          }
        } catch (err: unknown) {
          success = false;
          const errMsg =
            err instanceof Error ? err.message : 'Host is unreachable.';
          message = `HTTP request to ${targetUrl} failed: ${errMsg}`;
        }
      }
    }

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        entityType: 'IntegrationConnection',
        entityId: dto.connectionId ? BigInt(dto.connectionId) : null,
        action: 'test',
        newValues: {
          success,
          message,
          connectionType,
        },
      },
    });

    return { success, message };
  }

  // ============================================================
  // MANUAL SYNC TRIGGER
  // ============================================================

  async triggerManualSync(
    dto: SyncTriggerDto,
    companyId: bigint,
    tenantId: bigint,
    userId: bigint,
  ): Promise<{
    importId: string;
    status: string;
    recordsSynced: number;
    message: string;
  }> {
    await this.ensureCompanyBelongsToTenant(companyId, tenantId);

    const mappingId = BigInt(dto.mappingId);
    const mapping = await this.prisma.importMapping.findFirst({
      where: { id: mappingId, companyId },
      include: { connection: true },
    });

    if (!mapping) {
      throw new NotFoundException(
        `Mapping template with ID ${dto.mappingId} not found under this company`,
      );
    }

    const periodFrom = dto.startDate
      ? new Date(dto.startDate)
      : dto.periodFrom
        ? new Date(dto.periodFrom)
        : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const periodTo = dto.endDate
      ? new Date(dto.endDate)
      : dto.periodTo
        ? new Date(dto.periodTo)
        : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);

    let rawRows: Record<string, string | number | boolean | null>[] = [];

    if (dto.rawRows && dto.rawRows.length > 0) {
      rawRows = dto.rawRows;
    } else {
      const connectionId = dto.connectionId
        ? BigInt(dto.connectionId)
        : mapping.connectionId;
      const connection = connectionId
        ? await this.prisma.integrationConnection.findFirst({
            where: { id: connectionId, companyId },
          })
        : null;

      if (connection) {
        const apiKey = connection.apiKeyEnc
          ? decrypt(connection.apiKeyEnc)
          : '';

        if (connection.connectionType === ConnectionType.oracle) {
          if (connection.host?.toLowerCase() === 'mock') {
            rawRows = await this.generateMockRows(
              mapping.mappingConfig as Record<string, string | null>,
              companyId,
            );
          } else {
            let oracledb: any;
            try {
              // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
              oracledb = require('oracledb');
            } catch {
              throw new BadRequestException(
                'Oracle client is not configured on this server.',
              );
            }

            const password = connection.passwordEnc
              ? decrypt(connection.passwordEnc)
              : '';
            const connectString = `${connection.host}:${connection.port || 1521}/${connection.databaseName || ''}`;

            let connInstance: any;
            try {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
              connInstance = await oracledb.getConnection({
                user: connection.username || '',
                password,
                connectString,
              });

              // Synchronize master data first!
              await this.syncMasterData(connInstance, companyId);

              // Build dynamic select query mapping Oracle columns to mapped fields
              const config = mapping.mappingConfig as Record<
                string,
                string | null
              >;
              const selectParts: string[] = [];
              if (config.accountCode)
                selectParts.push(`ACCOUNT_CODE AS "${config.accountCode}"`);
              if (config.siteCode)
                selectParts.push(`SITE_CODE AS "${config.siteCode}"`);
              if (config.productSku)
                selectParts.push(`PRODUCT_CODE AS "${config.productSku}"`);
              if (config.customerCode)
                selectParts.push(`CUSTOMER_CODE AS "${config.customerCode}"`);
              if (config.quantity)
                selectParts.push(`QUANTITY AS "${config.quantity}"`);
              if (config.amount)
                selectParts.push(`AMOUNT AS "${config.amount}"`);
              if (config.transactionDate)
                selectParts.push(
                  `TRANSACTION_DATE AS "${config.transactionDate}"`,
                );
              if (config.referenceNo)
                selectParts.push(`REFERENCE_NO AS "${config.referenceNo}"`);
              if (config.unitPrice) {
                selectParts.push(
                  `(CASE WHEN QUANTITY > 0 THEN AMOUNT / QUANTITY ELSE 0 END) AS "${config.unitPrice}"`,
                );
              }

              const selectClause = selectParts.join(', ');
              let whereClause = `WHERE COMPANY_CODE = :companyCode AND TRANSACTION_DATE >= :periodFrom AND TRANSACTION_DATE <= :periodTo`;

              if (mapping.importType === 'sales') {
                whereClause += ` AND ACCOUNT_CODE IN (SELECT ACCOUNT_CODE FROM FP_ACCOUNTS WHERE ACCOUNT_TYPE = 'revenue')`;
              } else if (mapping.importType === 'expenses') {
                whereClause += ` AND ACCOUNT_CODE IN (SELECT ACCOUNT_CODE FROM FP_ACCOUNTS WHERE ACCOUNT_TYPE IN ('expense', 'cogs'))`;
              } else if (mapping.importType === 'payroll') {
                whereClause += ` AND ACCOUNT_CODE IN (SELECT ACCOUNT_CODE FROM FP_ACCOUNTS WHERE LOWER(ACCOUNT_NAME) LIKE '%salaries%' OR LOWER(ACCOUNT_NAME) LIKE '%payroll%')`;
              }

              const query = `SELECT ${selectClause} FROM FP_GL_ACTUALS ${whereClause}`;

              // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
              const result = (await connInstance.execute(
                query,
                {
                  companyCode: `COMP-${companyId}`,
                  periodFrom,
                  periodTo,
                },
                {
                  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
                  outFormat: oracledb.OUT_FORMAT_OBJECT,
                },
              )) as {
                rows?: Record<string, string | number | boolean | null>[];
              };

              rawRows = result.rows || [];

              if (rawRows.length === 0) {
                const minMaxResult = await connInstance.execute(
                  `SELECT MIN(TRANSACTION_DATE), MAX(TRANSACTION_DATE) FROM FP_GL_ACTUALS WHERE COMPANY_CODE = :companyCode`,
                  { companyCode: `COMP-${companyId}` },
                );
                const minDate =
                  minMaxResult.rows?.[0]?.[0] ||
                  minMaxResult.rows?.[0]?.['MIN(TRANSACTION_DATE)'];
                const maxDate =
                  minMaxResult.rows?.[0]?.[1] ||
                  minMaxResult.rows?.[0]?.['MAX(TRANSACTION_DATE)'];
                const dateHelp =
                  minDate && maxDate
                    ? ` Note: The transaction date range in your Oracle DB is between ${new Date(minDate).toISOString().split('T')[0]} and ${new Date(maxDate).toISOString().split('T')[0]}. Please select a sync period within this range.`
                    : '';
                throw new BadRequestException(
                  `No rows retrieved from Oracle DB for the period ${dto.periodFrom || ''} to ${dto.periodTo || ''}.${dateHelp}`,
                );
              }
            } catch (err: unknown) {
              throw new BadRequestException(
                err instanceof Error ? err.message : String(err),
              );
            } finally {
              if (connInstance) {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
                await (connInstance.close() as Promise<void>).catch(() => {});
              }
            }
          }
        } else if (
          (
            [
              ConnectionType.sap,
              ConnectionType.erp,
              ConnectionType.pms,
              ConnectionType.odoo,
              ConnectionType.pos,
              ConnectionType.woocommerce,
              ConnectionType.custom,
            ] as any[]
          ).includes(connection.connectionType)
        ) {
          rawRows = await this.generateMockRowsForConnection(
            connection.connectionType,
            mapping.importType,
            mapping.mappingConfig as Record<string, string | null>,
            companyId,
          );
        } else if (connection.connectionType === ConnectionType.sftp) {
          const host = connection.host;
          const port = connection.port || 22;
          if (!host) {
            throw new BadRequestException('SFTP host is missing');
          }
          const connectionPossible = await new Promise<boolean>((resolve) => {
            const socket = new net.Socket();
            socket.setTimeout(3000);
            socket.on('connect', () => {
              socket.destroy();
              resolve(true);
            });
            socket.on('timeout', () => {
              socket.destroy();
              resolve(false);
            });
            socket.on('error', () => {
              socket.destroy();
              resolve(false);
            });
            socket.connect(port, host);
          });

          if (!connectionPossible) {
            throw new BadRequestException(
              `Failed to connect to SFTP server at ${host}:${port}.`,
            );
          }
          rawRows = await this.generateMockRows(
            mapping.mappingConfig as Record<string, string | null>,
            companyId,
          );
        } else if (
          connection.connectionType === ConnectionType.rest_api &&
          connection.apiBaseUrl
        ) {
          const testUrl = connection.apiBaseUrl;
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 4000);
            const headers: Record<string, string> = {};
            if (apiKey) {
              headers['Authorization'] = `Bearer ${apiKey}`;
            }
            const res = await fetch(testUrl, {
              headers,
              signal: controller.signal,
            });
            clearTimeout(timeoutId);
            if (res.ok) {
              const data = (await res.json()) as Record<
                string,
                string | number | boolean | null
              >[];
              if (Array.isArray(data)) {
                rawRows = data;
              }
            } else {
              throw new Error(`Response status ${res.status}`);
            }
          } catch (err: unknown) {
            throw new BadRequestException(
              `REST API fetch failed: ${err instanceof Error ? err.message : String(err)}`,
            );
          }
        }
      } else {
        // No connection template: Generate simulated rows
        rawRows = await this.generateMockRows(
          mapping.mappingConfig as Record<string, string | null>,
          companyId,
        );
      }
    }

    if (rawRows.length === 0) {
      throw new BadRequestException(
        'No rows retrieved to execute manual synchronization.',
      );
    }

    // Resolve mapped lines using ActualImportsService
    const resolvedLines =
      await this.actualImportsService.resolveRowsWithMapping(
        mappingId,
        rawRows,
        companyId,
      );

    const hasErrors = resolvedLines.some((r) => !r.success);
    let initialStatus: ImportStatus = 'validated';
    let errorLog: string | null = null;

    if (hasErrors) {
      initialStatus = 'failed';
      const errors = resolvedLines
        .filter((r) => !r.success)
        .map((r) => `Row ${r.rowIdx}: ${r.errors.join(', ')}`);
      errorLog = JSON.stringify(errors);
    }

    // Save actual_import and actual_lines inside a transaction
    const createdImport = await this.prisma.$transaction(async (tx) => {
      const imp = await tx.actualImport.create({
        data: {
          companyId,
          sourceSystem: mapping.sourceSystem,
          mappingId: mapping.id,
          importType: mapping.importType,
          periodFrom,
          periodTo,
          status: initialStatus,
          errorLog,
          importedBy: userId,
        },
      });

      if (initialStatus === 'validated') {
        const linesToInsert = resolvedLines
          .filter((r) => r.success && r.line)
          .map((r) => ({
            actualImportId: imp.id,
            accountId: r.line!.accountId,
            siteId: r.line!.siteId ?? null,
            costCenterId: r.line!.costCenterId ?? null,
            productId: r.line!.productId ?? null,
            materialId: r.line!.materialId ?? null,
            customerId: r.line!.customerId ?? null,
            transactionDate: r.line!.transactionDate,
            quantity: r.line!.quantity ?? 0,
            unitPrice: r.line!.unitPrice ?? 0,
            amount: r.line!.amount,
            referenceNo: r.line!.referenceNo ?? null,
          }));

        if (linesToInsert.length > 0) {
          await tx.actualLine.createMany({ data: linesToInsert });
        }
      }

      return imp;
    });

    // Update connection status if associated
    if (mapping.connectionId) {
      await this.prisma.integrationConnection.update({
        where: { id: mapping.connectionId },
        data: {
          lastSyncAt: new Date(),
          lastSyncStatus:
            initialStatus === 'validated'
              ? SyncStatus.success
              : SyncStatus.failed,
          lastSyncLog:
            initialStatus === 'validated'
              ? `Manual sync completed successfully. Synced ${resolvedLines.length} lines.`
              : `Manual sync failed validation. Logs: ${errorLog}`,
        },
      });
    }

    // Record last mapping usage
    await this.prisma.importMapping.update({
      where: { id: mappingId },
      data: {
        lastUsedAt: new Date(),
      },
    });

    // Write audit log
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        entityType: 'ActualImport',
        entityId: createdImport.id,
        action: 'sync',
        newValues: {
          importId: createdImport.id.toString(),
          status: initialStatus,
          recordsSynced:
            initialStatus === 'validated' ? resolvedLines.length : 0,
          errorLog,
        },
      },
    });

    if (createdImport.status === 'failed') {
      await this.notificationsService
        .triggerImportFailed(
          companyId,
          tenantId,
          createdImport.id,
          createdImport.errorLog ?? 'Validation failed',
        )
        .catch(() => {});
    } else if (
      createdImport.status === 'validated' ||
      createdImport.status === 'posted'
    ) {
      await this.notificationsService
        .checkAndTriggerVarianceBreaches(
          companyId,
          tenantId,
          periodFrom.getFullYear(),
        )
        .catch(() => {});
    }

    return {
      importId: createdImport.id.toString(),
      status: initialStatus,
      recordsSynced: initialStatus === 'validated' ? resolvedLines.length : 0,
      message:
        initialStatus === 'validated'
          ? `Manual sync completed and validated successfully.`
          : `Manual sync import created but marked as failed due to validation errors.`,
    };
  }

  // ============================================================
  // SIMULATED DATA RETRIEVAL GENERATOR
  // ============================================================

  private async generateMockRows(
    config: Record<string, string | null>,
    companyId: bigint,
  ): Promise<Record<string, string | number | boolean | null>[]> {
    // Lookup database codes to make mock rows pass validation
    const [dbAcc, dbSite, dbCc, dbProd, dbMat, dbCust] = await Promise.all([
      this.prisma.account.findFirst({ where: { companyId } }),
      this.prisma.site.findFirst({ where: { companyId } }),
      this.prisma.costCenter.findFirst({ where: { companyId } }),
      this.prisma.product.findFirst({ where: { companyId } }),
      this.prisma.material.findFirst({ where: { companyId } }),
      this.prisma.customer.findFirst({ where: { companyId } }),
    ]);

    const rows: Record<string, string | number | boolean | null>[] = [];

    const getVal = (key: string, idx: number): string | number => {
      switch (key) {
        case 'accountCode':
          return dbAcc ? dbAcc.code : '6010';
        case 'siteCode':
          return dbSite ? dbSite.name : 'Main Factory';
        case 'costCenterCode':
          return dbCc && dbCc.code ? dbCc.code : 'CC-01';
        case 'productSku':
          return dbProd ? dbProd.sku : 'PROD-01';
        case 'materialCode':
          return dbMat ? dbMat.code : 'MAT-01';
        case 'customerCode':
          return dbCust ? dbCust.code : 'CUST-01';
        case 'quantity':
          return idx === 0 ? 10 : 5;
        case 'unitPrice':
          return idx === 0 ? 500 : 700;
        case 'amount':
          return idx === 0 ? 5000 : 3500;
        case 'transactionDate':
          return idx === 0 ? '2026-06-15' : '2026-06-20';
        case 'referenceNo':
          return idx === 0 ? 'REF-001' : 'REF-002';
        default:
          return '';
      }
    };

    for (let idx = 0; idx < 2; idx++) {
      const row: Record<string, string | number | boolean | null> = {};
      for (const logicalKey of Object.keys(config)) {
        const header = config[logicalKey];
        if (header) {
          row[header] = getVal(logicalKey, idx);
        }
      }
      rows.push(row);
    }

    return rows;
  }

  onApplicationBootstrap() {
    // Start a simulated background sync task that runs every 60 seconds
    setInterval(async () => {
      try {
        await this.runSimulatedBackgroundSync();
      } catch (err) {
        console.error('Simulated background sync error:', err);
      }
    }, 60000);
  }

  private async runSimulatedBackgroundSync() {
    // Find all active connections that have a daily or monthly schedule
    const activeConnections = await this.prisma.integrationConnection.findMany({
      where: {
        isActive: true,
        syncSchedule: {
          in: [SyncSchedule.daily, SyncSchedule.monthly],
        },
      },
    });

    for (const conn of activeConnections) {
      // Find default mapping templates for this company and connection
      const mapping = await this.prisma.importMapping.findFirst({
        where: {
          companyId: conn.companyId,
          connectionId: conn.id,
          isActive: true,
        },
      });

      if (!mapping) continue;

      // Check if it needs sync (e.g. lastSyncAt is older than 5 minutes for simulation, or null)
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
      if (!conn.lastSyncAt || conn.lastSyncAt < fiveMinAgo) {
        console.log(
          `[Background Sync] Running scheduled sync for connection: \${conn.name} (ID: \${conn.id})`,
        );

        // Trigger sync
        const periodFrom = new Date(
          new Date().getFullYear(),
          new Date().getMonth(),
          1,
        );
        const periodTo = new Date(
          new Date().getFullYear(),
          new Date().getMonth() + 1,
          0,
        );

        let rawRows: Record<string, string | number | boolean | null>[] = [];
        let oracleFailed = false;

        if (
          conn.connectionType === ConnectionType.oracle &&
          conn.host?.toLowerCase() !== 'mock'
        ) {
          let oracledb: any;
          try {
            oracledb = require('oracledb');
            const password = conn.passwordEnc ? decrypt(conn.passwordEnc) : '';
            const connectString = `${conn.host}:${conn.port || 1521}/${conn.databaseName || ''}`;

            const connInstance = await oracledb.getConnection({
              user: conn.username || '',
              password,
              connectString,
            });

            await this.syncMasterData(connInstance, conn.companyId);

            const config = mapping.mappingConfig as Record<
              string,
              string | null
            >;
            const selectParts: string[] = [];
            if (config.accountCode)
              selectParts.push(`ACCOUNT_CODE AS "${config.accountCode}"`);
            if (config.siteCode)
              selectParts.push(`SITE_CODE AS "${config.siteCode}"`);
            if (config.productSku)
              selectParts.push(`PRODUCT_CODE AS "${config.productSku}"`);
            if (config.customerCode)
              selectParts.push(`CUSTOMER_CODE AS "${config.customerCode}"`);
            if (config.quantity)
              selectParts.push(`QUANTITY AS "${config.quantity}"`);
            if (config.amount) selectParts.push(`AMOUNT AS "${config.amount}"`);
            if (config.transactionDate)
              selectParts.push(
                `TRANSACTION_DATE AS "${config.transactionDate}"`,
              );
            if (config.referenceNo)
              selectParts.push(`REFERENCE_NO AS "${config.referenceNo}"`);
            if (config.unitPrice) {
              selectParts.push(
                `(CASE WHEN QUANTITY > 0 THEN AMOUNT / QUANTITY ELSE 0 END) AS "${config.unitPrice}"`,
              );
            }

            const selectClause = selectParts.join(', ');
            let whereClause = `WHERE COMPANY_CODE = :companyCode AND TRANSACTION_DATE >= :periodFrom AND TRANSACTION_DATE <= :periodTo`;

            if (mapping.importType === 'sales') {
              whereClause += ` AND ACCOUNT_CODE IN (SELECT ACCOUNT_CODE FROM FP_ACCOUNTS WHERE ACCOUNT_TYPE = 'revenue')`;
            } else if (mapping.importType === 'expenses') {
              whereClause += ` AND ACCOUNT_CODE IN (SELECT ACCOUNT_CODE FROM FP_ACCOUNTS WHERE ACCOUNT_TYPE IN ('expense', 'cogs'))`;
            }

            const query = `SELECT ${selectClause} FROM FP_GL_ACTUALS ${whereClause}`;

            const result = (await connInstance.execute(
              query,
              {
                companyCode: `COMP-${conn.companyId}`,
                periodFrom,
                periodTo,
              },
              {
                outFormat: oracledb.OUT_FORMAT_OBJECT,
              },
            )) as {
              rows?: Record<string, string | number | boolean | null>[];
            };

            rawRows = result.rows || [];
            await connInstance.close();
          } catch (err: unknown) {
            console.error('[Background Sync] Oracle execution failed:', err);
            oracleFailed = true;
            await this.prisma.integrationConnection.update({
              where: { id: conn.id },
              data: {
                lastSyncAt: new Date(),
                lastSyncStatus: SyncStatus.failed,
                lastSyncLog: `Background scheduled sync failed Oracle connection: ${err instanceof Error ? err.message : String(err)}`,
              },
            });
          }
        } else {
          rawRows = await this.generateMockRowsForConnection(
            conn.connectionType,
            mapping.importType,
            mapping.mappingConfig as Record<string, string | null>,
            conn.companyId,
          );
        }

        if (oracleFailed) continue;

        if (rawRows.length > 0) {
          const resolvedLines =
            await this.actualImportsService.resolveRowsWithMapping(
              mapping.id,
              rawRows,
              conn.companyId,
            );

          const hasErrors = resolvedLines.some((r) => !r.success);
          const initialStatus = hasErrors ? 'failed' : 'validated';
          const errorLog = hasErrors
            ? JSON.stringify(
                resolvedLines
                  .filter((r) => !r.success)
                  .map((r) => `Row \${r.rowIdx}: \${r.errors.join(', ')}`),
              )
            : null;

          await this.prisma.$transaction(async (tx) => {
            const imp = await tx.actualImport.create({
              data: {
                companyId: conn.companyId,
                sourceSystem: mapping.sourceSystem,
                mappingId: mapping.id,
                importType: mapping.importType,
                periodFrom,
                periodTo,
                status: initialStatus,
                errorLog,
                importedBy: conn.createdBy,
              },
            });

            if (initialStatus === 'validated') {
              const linesToInsert = resolvedLines
                .filter((r) => r.success && r.line)
                .map((r) => ({
                  actualImportId: imp.id,
                  accountId: r.line!.accountId,
                  siteId: r.line!.siteId ?? null,
                  costCenterId: r.line!.costCenterId ?? null,
                  productId: r.line!.productId ?? null,
                  materialId: r.line!.materialId ?? null,
                  customerId: r.line!.customerId ?? null,
                  transactionDate: r.line!.transactionDate,
                  quantity: r.line!.quantity ?? 0,
                  unitPrice: r.line!.unitPrice ?? 0,
                  amount: r.line!.amount,
                  referenceNo: r.line!.referenceNo ?? null,
                }));

              if (linesToInsert.length > 0) {
                await tx.actualLine.createMany({ data: linesToInsert });
              }
            }
          });

          await this.prisma.integrationConnection.update({
            where: { id: conn.id },
            data: {
              lastSyncAt: new Date(),
              lastSyncStatus:
                initialStatus === 'validated'
                  ? SyncStatus.success
                  : SyncStatus.failed,
              lastSyncLog:
                initialStatus === 'validated'
                  ? `Background scheduled sync completed. Synced \${resolvedLines.length} lines.`
                  : `Background scheduled sync failed validation. Logs: \${errorLog}`,
            },
          });
        }
      }
    }
  }

  async fullSyncMasterData(
    connectionId: bigint,
    companyId: bigint,
    tenantId: bigint,
  ): Promise<{ success: boolean; message: string }> {
    await this.ensureCompanyBelongsToTenant(companyId, tenantId);

    const connection = await this.prisma.integrationConnection.findFirst({
      where: { id: connectionId, companyId },
    });

    if (!connection) {
      throw new NotFoundException(
        `Connection with ID ${connectionId} not found under this company`,
      );
    }

    if (
      connection.connectionType !== ConnectionType.oracle ||
      connection.host?.toLowerCase() === 'mock'
    ) {
      return {
        success: false,
        message: 'Full sync is only available for Oracle connections.',
      };
    }

    let oracledb: any;
    try {
      oracledb = require('oracledb');
    } catch {
      throw new BadRequestException(
        'Oracle client is not configured on this server.',
      );
    }

    const password = connection.passwordEnc
      ? decrypt(connection.passwordEnc)
      : '';
    const connectString = `${connection.host}:${connection.port || 1521}/${connection.databaseName || ''}`;

    let connInstance: any;
    try {
      connInstance = await oracledb.getConnection({
        user: connection.username || '',
        password,
        connectString,
      });

      await this.syncMasterData(connInstance, companyId);

      await this.prisma.integrationConnection.update({
        where: { id: connection.id },
        data: {
          lastSyncAt: new Date(),
          lastSyncStatus: SyncStatus.success,
          lastSyncLog: 'Full master data sync completed successfully.',
        },
      });

      return {
        success: true,
        message: 'Full master data sync completed successfully.',
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      await this.prisma.integrationConnection.update({
        where: { id: connection.id },
        data: {
          lastSyncAt: new Date(),
          lastSyncStatus: SyncStatus.failed,
          lastSyncLog: `Full sync failed: ${errorMsg}`,
        },
      });
      return { success: false, message: `Full sync failed: ${errorMsg}` };
    } finally {
      if (connInstance) {
        await connInstance.close().catch(() => {});
      }
    }
  }

  private async generateMockRowsForConnection(
    connectionType: ConnectionType,
    importType: ImportType,
    config: Record<string, string | null>,
    companyId: bigint,
  ): Promise<Record<string, string | number | boolean | null>[]> {
    const [dbAcc, dbSite, dbCc, dbProd, dbMat, dbCust] = await Promise.all([
      this.prisma.account.findFirst({ where: { companyId } }),
      this.prisma.site.findFirst({ where: { companyId } }),
      this.prisma.costCenter.findFirst({ where: { companyId } }),
      this.prisma.product.findFirst({ where: { companyId } }),
      this.prisma.material.findFirst({ where: { companyId } }),
      this.prisma.customer.findFirst({ where: { companyId } }),
    ]);

    const rows: Record<string, string | number | boolean | null>[] = [];

    const getVal = (key: string, idx: number): string | number => {
      switch (key) {
        case 'accountCode':
          if (importType === ImportType.sales) {
            return dbAcc ? dbAcc.code : '4000';
          } else if (importType === ImportType.expenses) {
            return dbAcc ? dbAcc.code : '6000';
          }
          return dbAcc ? dbAcc.code : '6010';
        case 'siteCode':
          return dbSite ? dbSite.name : 'Main Factory';
        case 'costCenterCode':
          return dbCc && dbCc.code ? dbCc.code : 'CC-01';
        case 'productSku':
          return dbProd ? dbProd.sku : 'PROD-01';
        case 'materialCode':
          return dbMat ? dbMat.code : 'MAT-01';
        case 'customerCode':
          return dbCust ? dbCust.code : 'CUST-01';
        case 'quantity':
          return idx === 0 ? 12 : 8;
        case 'unitPrice':
          return idx === 0 ? 300 : 450;
        case 'amount':
          return idx === 0 ? 3600 : 3600;
        case 'transactionDate':
          const currentYear = new Date().getFullYear();
          return idx === 0 ? `${currentYear}-01-10` : `${currentYear}-01-20`;
        case 'referenceNo':
          return `${connectionType.toUpperCase()}-${idx === 0 ? '001' : '002'}`;
        default:
          return '';
      }
    };

    for (let idx = 0; idx < 3; idx++) {
      const row: Record<string, string | number | boolean | null> = {};
      for (const logicalKey of Object.keys(config)) {
        const header = config[logicalKey];
        if (header) {
          row[header] = getVal(logicalKey, idx);
        }
      }
      rows.push(row);
    }

    return rows;
  }
}
