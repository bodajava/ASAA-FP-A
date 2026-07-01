import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

interface AuditLogParams {
  tenantId: bigint;
  userId?: bigint | null;
  entityType: string;
  entityId: bigint;
  action: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(params: AuditLogParams): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          tenantId: params.tenantId,
          userId: params.userId ?? null,
          entityType: params.entityType,
          entityId: params.entityId,
          action: params.action,
          oldValues: params.oldValues ? JSON.stringify(params.oldValues) : null,
          newValues: params.newValues ? JSON.stringify(params.newValues) : null,
          ipAddress: params.ipAddress ?? null,
          userAgent: params.userAgent ?? null,
        },
      });
    } catch (error) {
      this.logger.error('Failed to write audit log:', error instanceof Error ? error.message : String(error));
    }
  }

  async logBatch(logs: AuditLogParams[]): Promise<void> {
    try {
      await this.prisma.auditLog.createMany({
        data: logs.map((l) => ({
          tenantId: l.tenantId,
          userId: l.userId ?? null,
          entityType: l.entityType,
          entityId: l.entityId,
          action: l.action,
          oldValues: l.oldValues ? JSON.stringify(l.oldValues) : null,
          newValues: l.newValues ? JSON.stringify(l.newValues) : null,
          ipAddress: l.ipAddress ?? null,
          userAgent: l.userAgent ?? null,
        })),
      });
    } catch (error) {
      this.logger.error('Failed to write batch audit logs:', error instanceof Error ? error.message : String(error));
    }
  }
}
