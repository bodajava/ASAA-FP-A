import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, AuditLog } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { AuditLogResponseDto } from './dto/audit-log-response.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

function mapAuditLogToResponse(log: AuditLog): AuditLogResponseDto {
  const parseJsonSafe = (val: any): any => {
    if (!val) return null;
    if (typeof val === 'object') return val;
    try {
      return JSON.parse(val);
    } catch {
      return null;
    }
  };

  return {
    id: log.id.toString(),
    tenantId: log.tenantId.toString(),
    userId: log.userId ? log.userId.toString() : null,
    entityType: log.entityType,
    entityId: log.entityId ? log.entityId.toString() : null,
    action: log.action,
    oldValues: parseJsonSafe(log.oldValues),
    newValues: parseJsonSafe(log.newValues),
    ipAddress: log.ipAddress,
    userAgent: log.userAgent,
    createdAt: log.createdAt,
  };
}

@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    tenantId: bigint,
    paginationDto: PaginationDto,
  ): Promise<{ total: number; data: AuditLogResponseDto[] }> {
    const whereClause: Prisma.AuditLogWhereInput = {
      tenantId,
      ...(paginationDto.search
        ? {
            OR: [
              { action: { contains: paginationDto.search } },
              { entityType: { contains: paginationDto.search } },
            ],
          }
        : {}),
    };

    const page = paginationDto.page ?? 1;
    const limit = paginationDto.limit ?? 10;
    const skip = (page - 1) * limit;

    const [total, logs] = await Promise.all([
      this.prisma.auditLog.count({ where: whereClause }),
      this.prisma.auditLog.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      total,
      data: logs.map(mapAuditLogToResponse),
    };
  }

  async findOne(id: bigint, tenantId: bigint): Promise<AuditLogResponseDto> {
    const log = await this.prisma.auditLog.findFirst({
      where: { id, tenantId },
    });

    if (!log) {
      throw new NotFoundException(
        `Audit log record ${id} not found under this tenant`,
      );
    }

    return mapAuditLogToResponse(log);
  }
}
