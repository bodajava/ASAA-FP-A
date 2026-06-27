import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { PaginationDto } from '../common/dto/pagination.dto';
import { AlertResponseDto } from './dto/alert-response.dto';
import { CostingService } from '../costing/costing.service';

function mapAlertToResponse(alert: {
  id: bigint;
  companyId: bigint;
  userId: bigint | null;
  title: string;
  description: string | null;
  priority: string;
  severity: string;
  category: string;
  entityType: string | null;
  entityId: bigint | null;
  actionUrl: string | null;
  isRead: boolean;
  isArchived: boolean;
  expiresAt: Date | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}): AlertResponseDto {
  return {
    id: alert.id.toString(),
    companyId: alert.companyId.toString(),
    userId: alert.userId?.toString() ?? null,
    title: alert.title,
    description: alert.description,
    priority: alert.priority,
    severity: alert.severity,
    category: alert.category,
    entityType: alert.entityType,
    entityId: alert.entityId?.toString() ?? null,
    actionUrl: alert.actionUrl,
    isRead: alert.isRead,
    isArchived: alert.isArchived,
    expiresAt: alert.expiresAt,
    createdAt: alert.createdAt,
    updatedAt: alert.updatedAt,
  };
}

interface AlertCreateParams {
  companyId: bigint;
  userId?: bigint;
  title: string;
  description?: string;
  priority?: string;
  severity?: string;
  category?: string;
  entityType?: string;
  entityId?: bigint;
  actionUrl?: string;
  expiresAt?: Date;
  /** i18n: translation key for the alert title */
  titleKey?: string;
  /** i18n: translation key for the alert description/message */
  messageKey?: string;
  /** i18n: interpolation params for the translation keys */
  params?: Record<string, string | number>;
}

interface AlertFilters {
  category?: string;
  priority?: string;
  severity?: string;
  isRead?: boolean;
  search?: string;
}

@Injectable()
export class AlertsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly costingService: CostingService,
  ) {}

  async createAlert(params: AlertCreateParams) {
    const { titleKey, messageKey, params: i18nParams, ...prismaData } = params;

    // If i18n keys are provided, encode them as a JSON prefix in description
    // Format: __i18n__:<json>\n<original description>
    // Frontend detects __i18n__ prefix and translates using the keys
    let description = params.description;
    if (titleKey && description) {
      const i18n = { titleKey, messageKey, params: i18nParams };
      description = `__i18n__:${JSON.stringify(i18n)}\n${description}`;
    }

    return this.prisma.alert.create({
      data: { ...prismaData, description },
    });
  }

  async findAll(
    companyId: bigint,
    pagination: PaginationDto,
    filters?: AlertFilters,
  ) {
    const where: Prisma.AlertWhereInput = {
      companyId,
      isArchived: false,
    };

    if (filters?.category) where.category = filters.category;
    if (filters?.priority) where.priority = filters.priority;
    if (filters?.severity) where.severity = filters.severity;
    if (filters?.isRead !== undefined) where.isRead = filters.isRead;
    if (filters?.search) {
      where.OR = [
        { title: { contains: filters.search } },
        { description: { contains: filters.search } },
      ];
    }

    const page = pagination.page ?? 1;
    const limit = Math.min(pagination.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const [total, data] = await Promise.all([
      this.prisma.alert.count({ where }),
      this.prisma.alert.findMany({
        where,
        orderBy: [{ isRead: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
    ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: data.map(mapAlertToResponse),
    };
  }

  async getUnreadCount(companyId: bigint): Promise<number> {
    return this.prisma.alert.count({
      where: { companyId, isRead: false, isArchived: false },
    });
  }

  async markAsRead(id: bigint, companyId: bigint): Promise<AlertResponseDto> {
    const alert = await this.prisma.alert.findFirst({
      where: { id, companyId },
    });
    if (!alert) {
      throw new NotFoundException(`Alert ${id} not found`);
    }
    const updated = await this.prisma.alert.update({
      where: { id },
      data: { isRead: true },
    });
    return mapAlertToResponse(updated);
  }

  async markAllAsRead(
    companyId: bigint,
  ): Promise<{ count: number }> {
    const result = await this.prisma.alert.updateMany({
      where: { companyId, isRead: false },
      data: { isRead: true },
    });
    return { count: result.count };
  }

  async archive(
    id: bigint,
    companyId: bigint,
  ): Promise<AlertResponseDto> {
    const alert = await this.prisma.alert.findFirst({
      where: { id, companyId },
    });
    if (!alert) {
      throw new NotFoundException(`Alert ${id} not found`);
    }
    const updated = await this.prisma.alert.update({
      where: { id },
      data: { isArchived: true },
    });
    return mapAlertToResponse(updated);
  }

  async remove(id: bigint, companyId: bigint): Promise<AlertResponseDto> {
    const alert = await this.prisma.alert.findFirst({
      where: { id, companyId },
    });
    if (!alert) {
      throw new NotFoundException(`Alert ${id} not found`);
    }
    await this.prisma.alert.delete({ where: { id } });
    return mapAlertToResponse(alert);
  }

  async bulkMarkAsRead(ids: string[], companyId: bigint): Promise<{ count: number }> {
    const bigIntIds = ids.map((id) => BigInt(id));
    const result = await this.prisma.alert.updateMany({
      where: { id: { in: bigIntIds }, companyId },
      data: { isRead: true },
    });
    return { count: result.count };
  }

  async bulkArchive(ids: string[], companyId: bigint): Promise<{ count: number }> {
    const bigIntIds = ids.map((id) => BigInt(id));
    const result = await this.prisma.alert.updateMany({
      where: { id: { in: bigIntIds }, companyId },
      data: { isArchived: true },
    });
    return { count: result.count };
  }

  async bulkDelete(ids: string[], companyId: bigint): Promise<{ count: number }> {
    const bigIntIds = ids.map((id) => BigInt(id));
    const result = await this.prisma.alert.deleteMany({
      where: { id: { in: bigIntIds }, companyId },
    });
    return { count: result.count };
  }

  async cleanupExpired(): Promise<{ count: number }> {
    const result = await this.prisma.alert.deleteMany({
      where: { expiresAt: { lt: new Date() }, isArchived: false },
    });
    return { count: result.count };
  }

  // ============================================================
  // ALERT GENERATION RULES - check business conditions
  // ============================================================

  async checkAndGenerateAlerts(companyId: bigint) {
    await this.checkBudgetAlerts(companyId);
    await this.checkInventoryAlerts(companyId);
    await this.checkApprovalAlerts(companyId);
    await this.checkImportAlerts(companyId);
    await this.checkCostingAlerts(companyId);
    await this.checkYieldWasteAlerts(companyId);
    await this.checkForecastMarginAlerts(companyId);
  }

  private async checkBudgetAlerts(companyId: bigint) {
    const rows = await this.prisma.$queryRawUnsafe<
      {
        account_name: string;
        budget_amount: number;
        actual_amount: number;
        utilization_pct: number;
      }[]
    >(
      `SELECT 
        a.name as account_name,
        SUM(v.budget_amount) as budget_amount,
        SUM(v.actual_amount) as actual_amount,
        CASE WHEN SUM(v.budget_amount) > 0 
          THEN (SUM(v.actual_amount) / SUM(v.budget_amount) * 100)
          ELSE 0 END as utilization_pct
      FROM vw_budget_vs_actual v
      JOIN accounts a ON a.id = v.account_id
      WHERE v.company_id = ?
      GROUP BY a.id, a.name
      HAVING utilization_pct > 90`,
      companyId,
    );

    for (const row of rows) {
      const existing = await this.prisma.alert.findFirst({
        where: {
          companyId,
          category: 'budget',
          entityType: 'Account',
          title: { contains: row.account_name },
          isRead: false,
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      });
      if (!existing) {
        await this.createAlert({
          companyId,
          title: `Budget Alert: ${row.account_name} at ${Number(row.utilization_pct).toFixed(1)}%`,
          description: `Budget utilization for "${row.account_name}" has reached ${Number(row.utilization_pct).toFixed(1)}%. Budget: ${Number(row.budget_amount).toFixed(2)}, Actual: ${Number(row.actual_amount).toFixed(2)}.`,
          priority: Number(row.utilization_pct) > 100 ? 'critical' : 'high',
          severity: Number(row.utilization_pct) > 100 ? 'error' : 'warning',
          category: 'budget',
          actionUrl: '/variance',
        });
      }
    }
  }

  private async checkInventoryAlerts(companyId: bigint) {
    const rows = await this.prisma.$queryRawUnsafe<
      {
        item_name: string;
        qty_on_hand: number;
        safety_stock: number;
      }[]
    >(
      `SELECT 
        COALESCE(p.name, m.name) as item_name,
        i.qty_on_hand,
        COALESCE(m.safety_stock_qty, 0) as safety_stock
      FROM inventory_snapshots i
      LEFT JOIN products p ON p.id = i.product_id
      LEFT JOIN materials m ON m.id = i.material_id
      WHERE i.company_id = ?
        AND i.snapshot_date = (SELECT MAX(snapshot_date) FROM inventory_snapshots WHERE company_id = ?)
        AND i.qty_on_hand <= COALESCE(m.safety_stock_qty, 0)
        AND COALESCE(m.safety_stock_qty, 0) > 0`,
      companyId,
      companyId,
    );

    for (const row of rows) {
      const existing = await this.prisma.alert.findFirst({
        where: {
          companyId,
          category: 'inventory',
          title: { contains: row.item_name },
          isRead: false,
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      });
      if (!existing) {
        await this.createAlert({
          companyId,
          title: `Low Stock: ${row.item_name}`,
          description: `"${row.item_name}" is below safety stock level. Current: ${Number(row.qty_on_hand)}, Safety: ${Number(row.safety_stock)}.`,
          priority: 'high',
          severity: 'warning',
          category: 'inventory',
          actionUrl: '/inventory',
        });
      }
    }
  }

  private async checkApprovalAlerts(companyId: bigint) {
    const tenant = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { tenantId: true },
    });
    if (!tenant) return;

    const count = await this.prisma.approval.count({
      where: { tenantId: tenant.tenantId, status: 'pending' },
    });

    if (count > 0) {
      const existing = await this.prisma.alert.findFirst({
        where: {
          companyId,
          category: 'approval',
          isRead: false,
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      });
      if (!existing) {
        await this.createAlert({
          companyId,
          title: `Pending Approvals: ${count} awaiting review`,
          description: `${count} approval(s) are pending and require attention.`,
          priority: 'medium',
          severity: 'info',
          category: 'approval',
          actionUrl: '/approvals',
        });
      }
    }
  }

  private async checkImportAlerts(companyId: bigint) {
    const failedCount = await this.prisma.actualImport.count({
      where: { companyId, status: 'failed' },
    });

    if (failedCount > 0) {
      const existing = await this.prisma.alert.findFirst({
        where: {
          companyId,
          category: 'import',
          isRead: false,
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      });
      if (!existing) {
        await this.createAlert({
          companyId,
          title: `Failed Imports: ${failedCount} import(s) failed`,
          description: `${failedCount} import(s) have failed. Please review and retry.`,
          priority: 'high',
          severity: 'error',
          category: 'import',
          actionUrl: '/actuals',
        });
      }
    }
  }

  private async checkCostingAlerts(companyId: bigint) {
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    if (!company) return;
    const tenantId = company.tenantId;

    const products = await this.prisma.product.findMany({
      where: { companyId, isActive: true },
    });

    const today = new Date();
    const period = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

    for (const product of products) {
      try {
        const standard = await this.costingService.calculateStandardCost(product.id, companyId, tenantId);
        const actual = await this.costingService.calculateActualCost(product.id, companyId, tenantId, period);

        // 1. Negative standard/actual margins
        if (standard.netProfit < 0 || actual.netProfit < 0) {
          const existing = await this.prisma.alert.findFirst({
            where: {
              companyId,
              category: 'costing',
              entityType: 'Product',
              entityId: product.id,
              title: { contains: 'Negative Margin' },
              isRead: false,
              createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
            },
          });

          if (!existing) {
            await this.createAlert({
              companyId,
              title: `Negative Margin Alert: ${product.name}`,
              description: `Product "${product.name}" is operating at a negative margin. Standard Net Profit: ${standard.netProfit.toFixed(2)}, Actual Net Profit: ${actual.netProfit.toFixed(2)}.`,
              priority: 'critical',
              severity: 'error',
              category: 'costing',
              entityType: 'Product',
              entityId: product.id,
              actionUrl: `/products`,
            });
          }
        }

        // 2. Low margins (e.g. Gross Margin < 10% or Net Margin < 3%)
        else if (standard.grossMarginPct < 10 || actual.grossMarginPct < 10 || standard.netMarginPct < 3 || actual.netMarginPct < 3) {
          const existing = await this.prisma.alert.findFirst({
            where: {
              companyId,
              category: 'costing',
              entityType: 'Product',
              entityId: product.id,
              title: { contains: 'Low Margin' },
              isRead: false,
              createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
            },
          });

          if (!existing) {
            await this.createAlert({
              companyId,
              title: `Low Margin Alert: ${product.name}`,
              description: `Product "${product.name}" has low profit margins. Gross Margin: ${actual.grossMarginPct.toFixed(1)}%, Net Margin: ${actual.netMarginPct.toFixed(1)}%.`,
              priority: 'high',
              severity: 'warning',
              category: 'costing',
              entityType: 'Product',
              entityId: product.id,
              actionUrl: `/products`,
            });
          }
        }

        // 3. Raw material price spike (Actual vs Standard > 15%)
        if (standard.rawMaterialCost > 0) {
          const spikePct = ((actual.rawMaterialCost - standard.rawMaterialCost) / standard.rawMaterialCost) * 100;
          if (spikePct > 15) {
            const existing = await this.prisma.alert.findFirst({
              where: {
                companyId,
                category: 'costing',
                entityType: 'Product',
                entityId: product.id,
                title: { contains: 'Raw Material Cost Spike' },
                isRead: false,
                createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
              },
            });

            if (!existing) {
              await this.createAlert({
                companyId,
                title: `Raw Material Cost Spike: ${product.name}`,
                description: `Raw material cost for "${product.name}" spiked by ${spikePct.toFixed(1)}% above standard. Standard: ${standard.rawMaterialCost.toFixed(2)}, Actual: ${actual.rawMaterialCost.toFixed(2)}.`,
                priority: 'high',
                severity: 'warning',
                category: 'costing',
                entityType: 'Product',
                entityId: product.id,
                actionUrl: `/products`,
              });
            }
          }
        }

        // 4. Packaging cost spike (Actual vs Standard > 15%)
        if (standard.packagingCost > 0) {
          const spikePct = ((actual.packagingCost - standard.packagingCost) / standard.packagingCost) * 100;
          if (spikePct > 15) {
            const existing = await this.prisma.alert.findFirst({
              where: {
                companyId,
                category: 'costing',
                entityType: 'Product',
                entityId: product.id,
                title: { contains: 'Packaging Cost Spike' },
                isRead: false,
                createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
              },
            });

            if (!existing) {
              await this.createAlert({
                companyId,
                title: `Packaging Cost Spike: ${product.name}`,
                description: `Packaging cost for "${product.name}" spiked by ${spikePct.toFixed(1)}% above standard. Standard: ${standard.packagingCost.toFixed(2)}, Actual: ${actual.packagingCost.toFixed(2)}.`,
                priority: 'medium',
                severity: 'warning',
                category: 'costing',
                entityType: 'Product',
                entityId: product.id,
                actionUrl: `/products`,
              });
            }
          }
        }
      } catch (err) {
        // Ignore individual product costing calculation errors
      }
    }
  }

  private async checkYieldWasteAlerts(companyId: bigint) {
    const boms = await this.prisma.bomRecipe.findMany({
      where: { companyId, isActive: true },
      include: { product: { select: { id: true, name: true, sku: true } } },
    });

    for (const bom of boms) {
      const yieldPct = 100 - Number(bom.wastagePct ?? 0);
      if (yieldPct < 85 && yieldPct > 0) {
        const existing = await this.prisma.alert.findFirst({
          where: {
            companyId,
            category: 'costing',
            entityType: 'BomRecipe',
            entityId: bom.id,
            title: { contains: 'Low Yield' },
            isRead: false,
            createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
        });
        if (!existing) {
          await this.createAlert({
            companyId,
            title: `Low Yield Alert: ${bom.product.name}`,
            description: `Product "${bom.product.name}" has yield of ${yieldPct.toFixed(1)}% which is below the 85% threshold.`,
            priority: 'high',
            severity: 'warning',
            category: 'costing',
            entityType: 'BomRecipe',
            entityId: bom.id,
            actionUrl: '/bom-recipes',
          });
        }
      }

      const wastePct = Number(bom.wastagePct ?? 0);
      if (wastePct > 15) {
        const existing = await this.prisma.alert.findFirst({
          where: {
            companyId,
            category: 'costing',
            entityType: 'BomRecipe',
            entityId: bom.id,
            title: { contains: 'High Waste' },
            isRead: false,
            createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
        });
        if (!existing) {
          await this.createAlert({
            companyId,
            title: `High Waste Alert: ${bom.product.name}`,
            description: `Product "${bom.product.name}" has wastage of ${wastePct.toFixed(1)}% which exceeds the 15% threshold.`,
            priority: 'medium',
            severity: 'warning',
            category: 'costing',
            entityType: 'BomRecipe',
            entityId: bom.id,
            actionUrl: '/bom-recipes',
          });
        }
      }
    }
  }

  private async checkForecastMarginAlerts(companyId: bigint) {
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    if (!company) return;
    const tenantId = company.tenantId;

    const approvedForecasts = await this.prisma.forecastCycle.findMany({
      where: { companyId, status: 'approved' },
      include: { forecastLines: true },
    });

    for (const forecast of approvedForecasts) {
      const lines = forecast.forecastLines;
      const accountIds = [...new Set(lines.map(l => l.accountId))];
      const productIds = [...new Set(lines.filter(l => l.productId).map(l => l.productId!))];

      if (accountIds.length === 0 || productIds.length === 0) continue;

      const [accounts, products] = await Promise.all([
        this.prisma.account.findMany({ where: { id: { in: accountIds }, companyId } }),
        this.prisma.product.findMany({ where: { id: { in: productIds }, companyId } }),
      ]);

      const accountTypeMap = new Map(accounts.map(a => [a.id, a.type]));
      const productMap = new Map(products.map(p => [p.id, p]));

      const productData = new Map<bigint, { revenue: number; cogs: number }>();
      for (const line of lines) {
        if (!line.productId) continue;
        const accType = accountTypeMap.get(line.accountId);
        const amt = Number(line.amount);
        let entry = productData.get(line.productId);
        if (!entry) {
          entry = { revenue: 0, cogs: 0 };
          productData.set(line.productId, entry);
        }
        if (accType === 'revenue') entry.revenue += amt;
        else if (accType === 'cogs') entry.cogs += amt;
      }

      for (const [productId, data] of productData) {
        const product = productMap.get(productId);
        if (!product || data.revenue === 0) continue;

        const forecastedMargin = ((data.revenue - data.cogs) / data.revenue) * 100;

        if (forecastedMargin < 0) {
          const existing = await this.prisma.alert.findFirst({
            where: {
              companyId,
              category: 'costing',
              entityType: 'ForecastCycle',
              entityId: forecast.id,
              title: { contains: 'Forecast Negative Margin' },
              isRead: false,
              createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
            },
          });

          if (!existing) {
            await this.createAlert({
              companyId,
              title: `Forecast Negative Margin: ${product.name}`,
              description: `Forecasted margin for "${product.name}" in cycle "${forecast.name}" is negative at ${forecastedMargin.toFixed(1)}%. Revenue: ${data.revenue.toFixed(2)}, COGS: ${data.cogs.toFixed(2)}.`,
              priority: 'critical',
              severity: 'error',
              category: 'costing',
              entityType: 'ForecastCycle',
              entityId: forecast.id,
              actionUrl: '/forecasts',
              titleKey: 'alert.costing.forecastNegativeMargin.title',
              messageKey: 'alert.costing.forecastNegativeMargin.message',
              params: { product: product.name, cycle: forecast.name, margin: forecastedMargin.toFixed(1), revenue: data.revenue.toFixed(2), cogs: data.cogs.toFixed(2) },
            });
          }
        } else if (forecastedMargin < 10) {
          const existing = await this.prisma.alert.findFirst({
            where: {
              companyId,
              category: 'costing',
              entityType: 'ForecastCycle',
              entityId: forecast.id,
              title: { contains: 'Forecast Low Margin' },
              isRead: false,
              createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
            },
          });

          if (!existing) {
            await this.createAlert({
              companyId,
              title: `Forecast Low Margin: ${product.name}`,
              description: `Forecasted margin for "${product.name}" in cycle "${forecast.name}" is below target at ${forecastedMargin.toFixed(1)}%.`,
              priority: 'high',
              severity: 'warning',
              category: 'costing',
              entityType: 'ForecastCycle',
              entityId: forecast.id,
              actionUrl: '/forecasts',
              titleKey: 'alert.costing.forecastLowMargin.title',
              messageKey: 'alert.costing.forecastLowMargin.message',
              params: { product: product.name, cycle: forecast.name, margin: forecastedMargin.toFixed(1) },
            });
          }
        }
      }
    }
  }
}
