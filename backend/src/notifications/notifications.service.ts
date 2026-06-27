import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  Prisma,
  NotificationRule,
  Notification,
  TriggerType,
  NotificationChannel,
  NotificationStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { TenantService } from '../common/services/tenant.service';
import { CreateNotificationRuleDto } from './dto/create-notification-rule.dto';
import { UpdateNotificationRuleDto } from './dto/update-notification-rule.dto';
import { NotificationRuleResponseDto } from './dto/notification-rule-response.dto';
import { NotificationResponseDto } from './dto/notification-response.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { AlertsService } from './alerts.service';

function parseJsonArraySafe(val: any): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try {
    const parsed = typeof val === 'string' ? JSON.parse(val) : val;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function mapRuleToResponse(
  rule: NotificationRule,
): NotificationRuleResponseDto {
  return {
    id: rule.id.toString(),
    companyId: rule.companyId.toString(),
    ruleName: rule.ruleName,
    triggerType: rule.triggerType,
    thresholdValue: rule.thresholdValue ? Number(rule.thresholdValue) : null,
    accountId: rule.accountId ? rule.accountId.toString() : null,
    siteId: rule.siteId ? rule.siteId.toString() : null,
    notifyRoles: rule.notifyRoles ? parseJsonArraySafe(rule.notifyRoles) : null,
    notifyUsers: rule.notifyUsers ? parseJsonArraySafe(rule.notifyUsers) : null,
    channel: rule.channel,
    isActive: rule.isActive,
    createdBy: rule.createdBy ? rule.createdBy.toString() : null,
    createdAt: rule.createdAt,
    updatedAt: rule.updatedAt,
  };
}

function mapNotificationToResponse(
  notif: Notification,
): NotificationResponseDto {
  return {
    id: notif.id.toString(),
    ruleId: notif.ruleId ? notif.ruleId.toString() : null,
    companyId: notif.companyId.toString(),
    userId: notif.userId ? notif.userId.toString() : null,
    title: notif.title,
    body: notif.body,
    channel: notif.channel,
    entityType: notif.entityType,
    entityId: notif.entityId ? notif.entityId.toString() : null,
    triggerData: notif.triggerData
      ? (JSON.parse(notif.triggerData) as Record<string, string | number | boolean | null>)
      : null,
    status: notif.status,
    sentAt: notif.sentAt,
    readAt: notif.readAt,
    errorMessage: notif.errorMessage,
    createdAt: notif.createdAt,
  };
}

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly alertsService: AlertsService,
    private readonly tenantService: TenantService,
  ) {}

  // ============================================================
  // NOTIFICATION RULES CRUD
  // ============================================================

  async createRule(
    dto: CreateNotificationRuleDto,
    companyId: bigint,
    tenantId: bigint,
    userId: bigint,
  ): Promise<NotificationRuleResponseDto> {
    await this.tenantService.ensureCompanyBelongsToTenant(companyId, tenantId);

    if (
      (dto.triggerType === TriggerType.variance_pct ||
        dto.triggerType === TriggerType.variance_amount ||
        dto.triggerType === TriggerType.kpi_breach) &&
      (dto.thresholdValue === undefined || dto.thresholdValue === null)
    ) {
      throw new BadRequestException(
        `thresholdValue is required for trigger type: ${dto.triggerType}`,
      );
    }

    let accountId: bigint | null = null;
    if (dto.accountId) {
      accountId = BigInt(dto.accountId);
      const acc = await this.prisma.account.findFirst({
        where: { id: accountId, companyId },
      });
      if (!acc) {
        throw new BadRequestException(`Account ID ${dto.accountId} not found`);
      }
    }

    let siteId: bigint | null = null;
    if (dto.siteId) {
      siteId = BigInt(dto.siteId);
      const site = await this.prisma.site.findFirst({
        where: { id: siteId, companyId },
      });
      if (!site) {
        throw new BadRequestException(`Site ID ${dto.siteId} not found`);
      }
    }

    const rule = await this.prisma.notificationRule.create({
      data: {
        companyId,
        ruleName: dto.ruleName,
        triggerType: dto.triggerType,
        thresholdValue: dto.thresholdValue ?? null,
        accountId,
        siteId,
        notifyRoles: dto.notifyRoles
          ? JSON.stringify(dto.notifyRoles)
          : null,
        notifyUsers: dto.notifyUsers
          ? JSON.stringify(dto.notifyUsers)
          : null,
        channel: dto.channel ?? 'system,email',
        isActive: dto.isActive ?? true,
        createdBy: userId,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        entityType: 'NotificationRule',
        entityId: rule.id,
        action: 'create',
        newValues: JSON.stringify(mapRuleToResponse(rule)),
      },
    });

    return mapRuleToResponse(rule);
  }

  async findAllRules(
    companyId: bigint,
    tenantId: bigint,
    paginationDto: PaginationDto,
  ): Promise<{ total: number; data: NotificationRuleResponseDto[] }> {
    await this.tenantService.ensureCompanyBelongsToTenant(companyId, tenantId);

    const whereClause: Prisma.NotificationRuleWhereInput = {
      companyId,
      ...(paginationDto.search
        ? {
            ruleName: {
              contains: paginationDto.search,
            },
          }
        : {}),
    };

    const page = paginationDto.page ?? 1;
    const limit = paginationDto.limit ?? 10;
    const skip = (page - 1) * limit;

    const [total, rules] = await Promise.all([
      this.prisma.notificationRule.count({ where: whereClause }),
      this.prisma.notificationRule.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      total,
      data: rules.map(mapRuleToResponse),
    };
  }

  async findOneRule(
    id: bigint,
    companyId: bigint,
    tenantId: bigint,
  ): Promise<NotificationRuleResponseDto> {
    await this.tenantService.ensureCompanyBelongsToTenant(companyId, tenantId);

    const rule = await this.prisma.notificationRule.findFirst({
      where: { id, companyId },
    });

    if (!rule) {
      throw new NotFoundException(`Notification rule ${id} not found`);
    }

    return mapRuleToResponse(rule);
  }

  async updateRule(
    id: bigint,
    dto: UpdateNotificationRuleDto,
    companyId: bigint,
    tenantId: bigint,
    userId: bigint,
  ): Promise<NotificationRuleResponseDto> {
    await this.tenantService.ensureCompanyBelongsToTenant(companyId, tenantId);

    const rule = await this.prisma.notificationRule.findFirst({
      where: { id, companyId },
    });

    if (!rule) {
      throw new NotFoundException(`Notification rule ${id} not found`);
    }

    const updatedData: Prisma.NotificationRuleUpdateInput = {};
    if (dto.ruleName !== undefined) updatedData.ruleName = dto.ruleName;
    if (dto.triggerType !== undefined)
      updatedData.triggerType = dto.triggerType;
    if (dto.thresholdValue !== undefined)
      updatedData.thresholdValue = dto.thresholdValue;
    if (dto.channel !== undefined) updatedData.channel = dto.channel;
    if (dto.isActive !== undefined) updatedData.isActive = dto.isActive;

    if (dto.accountId !== undefined) {
      if (dto.accountId === null) {
        updatedData.account = { disconnect: true };
      } else {
        const accountId = BigInt(dto.accountId);
        const acc = await this.prisma.account.findFirst({
          where: { id: accountId, companyId },
        });
        if (!acc) {
          throw new BadRequestException(
            `Account ID ${dto.accountId} not found`,
          );
        }
        updatedData.account = { connect: { id: accountId } };
      }
    }

    if (dto.siteId !== undefined) {
      if (dto.siteId === null) {
        updatedData.site = { disconnect: true };
      } else {
        const siteId = BigInt(dto.siteId);
        const site = await this.prisma.site.findFirst({
          where: { id: siteId, companyId },
        });
        if (!site) {
          throw new BadRequestException(`Site ID ${dto.siteId} not found`);
        }
        updatedData.site = { connect: { id: siteId } };
      }
    }

    if (dto.notifyRoles !== undefined) {
      updatedData.notifyRoles = dto.notifyRoles
        ? JSON.stringify(dto.notifyRoles)
        : null;
    }
    if (dto.notifyUsers !== undefined) {
      updatedData.notifyUsers = dto.notifyUsers
        ? JSON.stringify(dto.notifyUsers)
        : null;
    }

    const updatedRule = await this.prisma.notificationRule.update({
      where: { id },
      data: updatedData,
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        entityType: 'NotificationRule',
        entityId: id,
        action: 'update',
        oldValues: JSON.stringify(mapRuleToResponse(rule)),
        newValues: JSON.stringify(mapRuleToResponse(updatedRule)),
      },
    });

    return mapRuleToResponse(updatedRule);
  }

  async removeRule(
    id: bigint,
    companyId: bigint,
    tenantId: bigint,
    userId: bigint,
  ): Promise<NotificationRuleResponseDto> {
    await this.tenantService.ensureCompanyBelongsToTenant(companyId, tenantId);

    const rule = await this.prisma.notificationRule.findFirst({
      where: { id, companyId },
    });

    if (!rule) {
      throw new NotFoundException(`Notification rule ${id} not found`);
    }

    await this.prisma.notificationRule.delete({
      where: { id },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        entityType: 'NotificationRule',
        entityId: id,
        action: 'delete',
        oldValues: JSON.stringify(mapRuleToResponse(rule)),
      },
    });

    return mapRuleToResponse(rule);
  }

  // ============================================================
  // NOTIFICATIONS LIST & UPDATE
  // ============================================================

  async findAllNotifications(
    companyId: bigint,
    tenantId: bigint,
    paginationDto: PaginationDto,
    statusFilter?: NotificationStatus,
  ): Promise<{ total: number; data: NotificationResponseDto[] }> {
    await this.tenantService.ensureCompanyBelongsToTenant(companyId, tenantId);

    const whereClause: Prisma.NotificationWhereInput = {
      companyId,
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(paginationDto.search
        ? {
            OR: [
              { title: { contains: paginationDto.search } },
              { body: { contains: paginationDto.search } },
            ],
          }
        : {}),
    };

    const page = paginationDto.page ?? 1;
    const limit = paginationDto.limit ?? 10;
    const skip = (page - 1) * limit;

    const [total, notifications] = await Promise.all([
      this.prisma.notification.count({ where: whereClause }),
      this.prisma.notification.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      total,
      data: notifications.map(mapNotificationToResponse),
    };
  }

  async findOneNotification(
    id: bigint,
    companyId: bigint,
    tenantId: bigint,
  ): Promise<NotificationResponseDto> {
    await this.tenantService.ensureCompanyBelongsToTenant(companyId, tenantId);

    const notif = await this.prisma.notification.findFirst({
      where: { id, companyId },
    });

    if (!notif) {
      throw new NotFoundException(
        `Notification ${id} not found under this company`,
      );
    }

    return mapNotificationToResponse(notif);
  }

  async markAsRead(
    id: bigint,
    companyId: bigint,
    tenantId: bigint,
  ): Promise<NotificationResponseDto> {
    await this.tenantService.ensureCompanyBelongsToTenant(companyId, tenantId);

    const notif = await this.prisma.notification.findFirst({
      where: { id, companyId },
    });

    if (!notif) {
      throw new NotFoundException(
        `Notification ${id} not found under this company`,
      );
    }

    const updated = await this.prisma.notification.update({
      where: { id },
      data: {
        status: NotificationStatus.read,
        readAt: new Date(),
      },
    });

    return mapNotificationToResponse(updated);
  }

  async getUnreadCount(
    companyId: bigint,
    tenantId: bigint,
  ): Promise<number> {
    await this.tenantService.ensureCompanyBelongsToTenant(companyId, tenantId);
    return this.prisma.notification.count({
      where: { companyId, status: { not: NotificationStatus.read } },
    });
  }

  async markAllAsRead(
    companyId: bigint,
    tenantId: bigint,
  ): Promise<{ count: number }> {
    await this.tenantService.ensureCompanyBelongsToTenant(companyId, tenantId);
    const result = await this.prisma.notification.updateMany({
      where: { companyId, status: { not: NotificationStatus.read } },
      data: { status: NotificationStatus.read, readAt: new Date() },
    });
    return { count: result.count };
  }

  // ============================================================
  // NOTIFICATION TRIGGER HOOKS
  // ============================================================

  private async getTargetUsers(
    rule: NotificationRule,
    tenantId: bigint,
  ): Promise<bigint[]> {
    const userIds: bigint[] = [];

    // 1. Explicit users list
    if (rule.notifyUsers) {
      const explicitIds = parseJsonArraySafe(rule.notifyUsers);
      for (const strId of explicitIds) {
        userIds.push(BigInt(strId));
      }
    }

    // 2. Resolve roles to users
    if (rule.notifyRoles) {
      const explicitRoles = parseJsonArraySafe(rule.notifyRoles);
      const usersWithRoles = await this.prisma.user.findMany({
        where: {
          tenantId,
          role: {
            name: { in: explicitRoles },
          },
        },
      });
      for (const u of usersWithRoles) {
        if (!userIds.includes(u.id)) {
          userIds.push(u.id);
        }
      }
    }

    // 3. Fallback: Notify all active users if no one resolved
    if (userIds.length === 0) {
      const fallbackUsers = await this.prisma.user.findMany({
        where: { tenantId, status: 'active' },
      });
      for (const u of fallbackUsers) {
        userIds.push(u.id);
      }
    }

    return userIds;
  }

  async triggerImportFailed(
    companyId: bigint,
    tenantId: bigint,
    importId: bigint,
    errorLog: string,
  ): Promise<void> {
    const rules = await this.prisma.notificationRule.findMany({
      where: {
        companyId,
        triggerType: TriggerType.import_failed,
        isActive: true,
      },
    });

    for (const rule of rules) {
      const userIds = await this.getTargetUsers(rule, tenantId);
      const title = 'Actual Data Import Failed';
      const body = `Import (ID: ${importId}) failed validation. Logs: ${errorLog.slice(0, 300)}`;

      if (userIds.length > 0) {
        await this.prisma.notification.createMany({
          data: userIds.map((uId) => ({
            companyId,
            ruleId: rule.id,
            userId: uId,
            title,
            body,
            channel: NotificationChannel.system,
            status: NotificationStatus.pending,
            entityType: 'ActualImport',
            entityId: importId,
            triggerData: JSON.stringify({
              importId: importId.toString(),
              errorLog,
            }),
          })),
        });
      }
    }

    await this.alertsService.checkAndGenerateAlerts(companyId).catch(() => {});
  }

  async triggerBudgetApproval(
    companyId: bigint,
    tenantId: bigint,
    budgetCycleId: bigint,
    budgetName: string,
  ): Promise<void> {
    const rules = await this.prisma.notificationRule.findMany({
      where: {
        companyId,
        triggerType: TriggerType.budget_approval,
        isActive: true,
      },
    });

    for (const rule of rules) {
      const userIds = await this.getTargetUsers(rule, tenantId);
      const title = 'Budget Approved';
      const body = `Budget Cycle "${budgetName}" has been approved.`;

      if (userIds.length > 0) {
        await this.prisma.notification.createMany({
          data: userIds.map((uId) => ({
            companyId,
            ruleId: rule.id,
            userId: uId,
            title,
            body,
            channel: NotificationChannel.system,
            status: NotificationStatus.pending,
            entityType: 'BudgetCycle',
            entityId: budgetCycleId,
            triggerData: JSON.stringify({
              budgetCycleId: budgetCycleId.toString(),
              name: budgetName,
            }),
          })),
        });
      }
    }

    await this.alertsService.checkAndGenerateAlerts(companyId).catch(() => {});
  }

  async triggerForecastApproval(
    companyId: bigint,
    tenantId: bigint,
    forecastCycleId: bigint,
    forecastName: string,
  ): Promise<void> {
    const rules = await this.prisma.notificationRule.findMany({
      where: {
        companyId,
        triggerType: TriggerType.forecast_approval,
        isActive: true,
      },
    });

    for (const rule of rules) {
      const userIds = await this.getTargetUsers(rule, tenantId);
      const title = 'Forecast Approved';
      const body = `Forecast Cycle "${forecastName}" has been approved.`;

      if (userIds.length > 0) {
        await this.prisma.notification.createMany({
          data: userIds.map((uId) => ({
            companyId,
            ruleId: rule.id,
            userId: uId,
            title,
            body,
            channel: NotificationChannel.system,
            status: NotificationStatus.pending,
            entityType: 'ForecastCycle',
            entityId: forecastCycleId,
            triggerData: JSON.stringify({
              forecastCycleId: forecastCycleId.toString(),
              name: forecastName,
            }),
          })),
        });
      }
    }

    await this.alertsService.checkAndGenerateAlerts(companyId).catch(() => {});
  }

  async checkAndTriggerVarianceBreaches(
    companyId: bigint,
    tenantId: bigint,
    fiscalYear: number,
  ): Promise<void> {
    const rules = await this.prisma.notificationRule.findMany({
      where: {
        companyId,
        isActive: true,
        OR: [
          { triggerType: TriggerType.variance_pct },
          { triggerType: TriggerType.variance_amount },
        ],
      },
    });

    if (rules.length === 0) return;

    // Fetch budget vs actual comparison records
    const comparisons = await this.prisma.$queryRawUnsafe<
      {
        accountId: bigint;
        accountCode: string;
        accountName: string;
        periodMonth: number;
        budgetAmount: number;
        actualAmount: number;
        varianceAmount: number;
        variancePct: number;
      }[]
    >(
      `SELECT account_id as accountId, code as accountCode, name as accountName, period_month as periodMonth,
              SUM(budget_amount) as budgetAmount, SUM(actual_amount) as actualAmount,
              (SUM(actual_amount) - SUM(budget_amount)) as varianceAmount,
              CASE WHEN SUM(budget_amount) = 0 THEN 0 ELSE (SUM(actual_amount) - SUM(budget_amount)) / SUM(budget_amount) * 100 END as variancePct
       FROM vw_budget_vs_actual
       WHERE company_id = ? AND fiscal_year = ?
       GROUP BY account_id, code, name, period_month`,
      companyId,
      fiscalYear,
    );

    for (const comp of comparisons) {
      const varAmountAbs = Math.abs(Number(comp.varianceAmount));
      const varPctAbs = Math.abs(Number(comp.variancePct));

      for (const rule of rules) {
        // Scope rule filters (optional accountId, siteId etc.)
        if (rule.accountId && rule.accountId !== comp.accountId) continue;

        let isBreached = false;
        let details = '';

        const threshold = rule.thresholdValue ? Number(rule.thresholdValue) : 0;

        if (
          rule.triggerType === TriggerType.variance_pct &&
          varPctAbs > threshold
        ) {
          isBreached = true;
          details = `Variance percentage ${comp.variancePct.toFixed(1)}% breached threshold ${threshold}%`;
        } else if (
          rule.triggerType === TriggerType.variance_amount &&
          varAmountAbs > threshold
        ) {
          isBreached = true;
          details = `Variance amount EGP ${comp.varianceAmount.toFixed(2)} breached threshold EGP ${threshold}`;
        }

        if (isBreached) {
          // Prevent duplication: check if notification was already sent for this account, period and rule
          const monthStr = comp.periodMonth.toString();
          const existingNotifications = await this.prisma.notification.findMany({
            where: {
              ruleId: rule.id,
              entityType: 'Account',
              entityId: comp.accountId,
            },
          });
          const existing = existingNotifications.find(n => {
            if (!n.triggerData) return false;
            try {
              const data = JSON.parse(n.triggerData);
              return data.periodMonth === monthStr;
            } catch {
              return false;
            }
          });

          if (!existing) {
            const userIds = await this.getTargetUsers(rule, tenantId);
            const title = 'Variance Threshold Breach';
            const body = `Account "${comp.accountName}" breached variance threshold in period ${comp.periodMonth}. ${details}`;

            for (const uId of userIds) {
              await this.prisma.notification.create({
                data: {
                  companyId,
                  ruleId: rule.id,
                  userId: uId,
                  title,
                  body,
                  channel: NotificationChannel.system,
                  status: NotificationStatus.pending,
                  entityType: 'Account',
                  entityId: comp.accountId,
                  triggerData: JSON.stringify({
                    periodMonth: monthStr,
                    fiscalYear: fiscalYear.toString(),
                    varianceAmount: comp.varianceAmount.toString(),
                    variancePct: comp.variancePct.toString(),
                  }),
                },
              });
            }
          }
        }
      }
    }

    await this.alertsService.checkAndGenerateAlerts(companyId).catch(() => {});
  }
}
