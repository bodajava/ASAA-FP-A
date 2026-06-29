import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma, ApprovalStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateApprovalDto } from './dto/create-approval.dto';
import {
  UpdateApprovalStatusDto,
  ApprovalAction,
} from './dto/update-approval-status.dto';
import { ApprovalResponseDto } from './dto/approval-response.dto';
export { ApprovalResponseDto };
import { PaginationDto } from '../common/dto/pagination.dto';

function mapApprovalToResponse(approval: any): ApprovalResponseDto {
  return {
    id: approval.id.toString(),
    tenantId: approval.tenantId.toString(),
    entityType: approval.entityType,
    entityId: approval.entityId.toString(),
    stepOrder: approval.stepOrder ?? null,
    status: approval.status,
    requestedBy: approval.requestedBy ? approval.requestedBy.toString() : null,
    approvedBy: approval.approvedBy ? approval.approvedBy.toString() : null,
    approvedAt: approval.approvedAt ? approval.approvedAt.toISOString() : null,
    comments: approval.comments ?? null,
    createdAt: approval.createdAt,
    updatedAt: approval.updatedAt,
  };
}

@Injectable()
export class ApprovalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private async ensureEntityBelongsToCompany(
    entityType: string,
    entityId: bigint,
    companyId: bigint,
    tenantId: bigint,
  ): Promise<void> {
    switch (entityType) {
      case 'BudgetCycle': {
        const entity = await this.prisma.budgetCycle.findFirst({
          where: { id: entityId, companyId },
        });
        if (!entity) {
          throw new NotFoundException(
            `BudgetCycle not found under this company`,
          );
        }
        break;
      }
      case 'ForecastCycle': {
        const entity = await this.prisma.forecastCycle.findFirst({
          where: { id: entityId, companyId },
        });
        if (!entity) {
          throw new NotFoundException(
            `ForecastCycle not found under this company`,
          );
        }
        break;
      }
      default:
        throw new BadRequestException(`Unsupported entity type: ${entityType}`);
    }
  }

  async create(
    createDto: CreateApprovalDto,
    companyId: bigint,
    tenantId: bigint,
    userId: bigint,
  ): Promise<ApprovalResponseDto> {
    const entityId = BigInt(createDto.entityId);

    await this.ensureEntityBelongsToCompany(
      createDto.entityType,
      entityId,
      companyId,
      tenantId,
    );

    const approval = await this.prisma.approval.create({
      data: {
        tenantId,
        entityType: createDto.entityType,
        entityId,
        stepOrder: createDto.stepOrder ?? 1,
        status: ApprovalStatus.pending,
        requestedBy: userId,
        comments: createDto.comments,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        entityType: 'Approval',
        entityId: approval.id,
        action: 'create',
        newValues: JSON.stringify(approval),
      },
    });

    return mapApprovalToResponse(approval);
  }

  async findAll(
    companyId: bigint,
    tenantId: bigint,
    paginationDto: PaginationDto & {
      entityType?: string;
      entityId?: string;
      status?: string;
    },
  ) {
    const page = paginationDto.page ?? 1;
    const limit = paginationDto.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Prisma.ApprovalWhereInput = {
      tenantId,
    };

    if (paginationDto.entityType) {
      where.entityType = paginationDto.entityType;
    }
    if (paginationDto.entityId) {
      where.entityId = BigInt(paginationDto.entityId);
    }
    if (paginationDto.status) {
      where.status = paginationDto.status as ApprovalStatus;
    }

    const [total, data] = await Promise.all([
      this.prisma.approval.count({ where }),
      this.prisma.approval.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: data.map(mapApprovalToResponse),
    };
  }

  async findOne(id: bigint, tenantId: bigint): Promise<ApprovalResponseDto> {
    const approval = await this.prisma.approval.findFirst({
      where: { id, tenantId },
    });

    if (!approval) {
      throw new NotFoundException(
        `Approval with ID ${id} not found under this tenant`,
      );
    }

    return mapApprovalToResponse(approval);
  }

  async updateStatus(
    id: bigint,
    statusDto: UpdateApprovalStatusDto,
    companyId: bigint,
    tenantId: bigint,
    userId: bigint,
  ): Promise<ApprovalResponseDto> {
    const approval = await this.prisma.approval.findFirst({
      where: { id, tenantId },
    });

    if (!approval) {
      throw new NotFoundException(
        `Approval with ID ${id} not found under this tenant`,
      );
    }

    if (approval.status !== ApprovalStatus.pending) {
      throw new BadRequestException(
        `Cannot ${statusDto.action} an approval that is already ${approval.status}`,
      );
    }

    let newStatus: ApprovalStatus;
    let approvedBy: bigint | null = null;
    let approvedAt: Date | null = null;

    switch (statusDto.action) {
      case ApprovalAction.approve:
        newStatus = ApprovalStatus.approved;
        approvedBy = userId;
        approvedAt = new Date();
        break;
      case ApprovalAction.reject:
        newStatus = ApprovalStatus.rejected;
        break;
      case ApprovalAction.cancel:
        newStatus = ApprovalStatus.cancelled;
        break;
    }

    const updated = await this.prisma.approval.update({
      where: { id },
      data: {
        status: newStatus,
        approvedBy,
        approvedAt,
        comments: statusDto.comments ?? approval.comments,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        entityType: 'Approval',
        entityId: id,
        action: 'status_change',
        oldValues: JSON.stringify(approval),
        newValues: JSON.stringify(updated),
      },
    });

    if (newStatus === ApprovalStatus.approved) {
      this.notificationsService
        .triggerBudgetApproval(
          companyId,
          tenantId,
          approval.entityId,
          `Approval for ${approval.entityType}`,
        )
        .catch(() => {});
    }

    return mapApprovalToResponse(updated);
  }

  async remove(
    id: bigint,
    tenantId: bigint,
    userId: bigint,
  ): Promise<ApprovalResponseDto> {
    const approval = await this.prisma.approval.findFirst({
      where: { id, tenantId },
    });

    if (!approval) {
      throw new NotFoundException(
        `Approval with ID ${id} not found under this tenant`,
      );
    }

    await this.prisma.approval.delete({
      where: { id },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        entityType: 'Approval',
        entityId: id,
        action: 'delete',
        oldValues: JSON.stringify(approval),
      },
    });

    return mapApprovalToResponse(approval);
  }
}
