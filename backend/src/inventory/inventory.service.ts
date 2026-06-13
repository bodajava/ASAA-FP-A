import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CreateInventorySnapshotDto } from './dto/create-inventory-snapshot.dto';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  private s(v: any) {
    return v?.toString() ?? null;
  }
  private n(v: any) {
    return v == null ? 0 : Number(v);
  }

  async recordSnapshot(companyId: bigint, dto: CreateInventorySnapshotDto) {
    const siteId = BigInt(dto.siteId);
    const productId = dto.productId ? BigInt(dto.productId) : null;
    const materialId = dto.materialId ? BigInt(dto.materialId) : null;

    if (!productId && !materialId) {
      throw new BadRequestException(
        'Either productId or materialId must be provided',
      );
    }

    const date = new Date(dto.snapshotDate);

    // Try to find if snapshot already exists on this date for this item
    const existing = await this.prisma.inventorySnapshot.findFirst({
      where: {
        companyId,
        siteId,
        productId,
        materialId,
        snapshotDate: date,
      },
    });

    if (existing) {
      return this.prisma.inventorySnapshot.update({
        where: { id: existing.id },
        data: {
          qtyOnHand: dto.qtyOnHand,
          inventoryValue: dto.inventoryValue,
          updatedAt: new Date(),
        },
      });
    }

    return this.prisma.inventorySnapshot.create({
      data: {
        companyId,
        siteId,
        productId,
        materialId,
        snapshotDate: date,
        qtyOnHand: dto.qtyOnHand,
        inventoryValue: dto.inventoryValue,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  async getSnapshots(
    companyId: bigint,
    siteId?: number,
    productId?: string,
    materialId?: string,
    date?: string,
  ) {
    const where: any = { companyId };
    if (siteId) where.siteId = BigInt(siteId);
    if (productId) where.productId = BigInt(productId);
    if (materialId) where.materialId = BigInt(materialId);
    if (date) where.snapshotDate = new Date(date);

    const rows = await this.prisma.inventorySnapshot.findMany({
      where,
      orderBy: { snapshotDate: 'desc' },
      include: {
        site: { select: { id: true, name: true } },
        product: { select: { id: true, name: true, sku: true } },
        material: { select: { id: true, name: true, code: true } },
      },
    });

    return rows.map((r) => ({
      id: this.s(r.id),
      siteId: this.s(r.siteId),
      productId: this.s(r.productId),
      materialId: this.s(r.materialId),
      snapshotDate: r.snapshotDate,
      qtyOnHand: this.n(r.qtyOnHand),
      inventoryValue: this.n(r.inventoryValue),
      site: r.site ? { id: this.s(r.site.id), name: r.site.name } : null,
      product: r.product
        ? { id: this.s(r.product.id), name: r.product.name, sku: r.product.sku }
        : null,
      material: r.material
        ? {
            id: this.s(r.material.id),
            name: r.material.name,
            code: r.material.code,
          }
        : null,
    }));
  }

  async getCoverageDays(companyId: bigint, siteId?: number) {
    // 1. Get latest inventory snapshot for each item
    const whereConditions: Prisma.Sql[] = [
      Prisma.sql`company_id = ${companyId}`,
    ];
    if (siteId) {
      whereConditions.push(Prisma.sql`site_id = ${siteId}`);
    }
    const whereClause = Prisma.join(whereConditions, ' AND ');

    const latestSnapshots = await this.prisma.$queryRaw<any[]>`
      SELECT s1.*
      FROM inventory_snapshots s1
      INNER JOIN (
        SELECT company_id, site_id, product_id, material_id, MAX(snapshot_date) as max_date
        FROM inventory_snapshots
        WHERE ${whereClause}
        GROUP BY company_id, site_id, product_id, material_id
      ) s2
      ON s1.company_id = s2.company_id
      AND s1.site_id = s2.site_id
      AND (s1.product_id = s2.product_id OR (s1.product_id IS NULL AND s2.product_id IS NULL))
      AND (s1.material_id = s2.material_id OR (s1.material_id IS NULL AND s2.material_id IS NULL))
      AND s1.snapshot_date = s2.max_date
    `;

    // 2. Fetch daily sales/usage rates from Actual Lines over last 90 days
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - 90);

    const productSales = await this.prisma.actualLine.groupBy({
      by: ['productId'],
      where: {
        actualImport: { companyId },
        productId: { not: null },
        transactionDate: { gte: dateLimit },
      },
      _sum: { quantity: true },
    });

    const materialConsumption = await this.prisma.actualLine.groupBy({
      by: ['materialId'],
      where: {
        actualImport: { companyId },
        materialId: { not: null },
        transactionDate: { gte: dateLimit },
      },
      _sum: { quantity: true },
    });

    const salesRateMap = new Map<string, number>();
    for (const p of productSales) {
      if (p.productId) {
        salesRateMap.set(p.productId.toString(), this.n(p._sum.quantity) / 90);
      }
    }

    const consumptionRateMap = new Map<string, number>();
    for (const m of materialConsumption) {
      if (m.materialId) {
        consumptionRateMap.set(
          m.materialId.toString(),
          this.n(m._sum.quantity) / 90,
        );
      }
    }

    // Resolve site, product, material details
    const resolvedSnapshots = [];
    for (const row of latestSnapshots) {
      const isProduct = !!row.product_id;
      const itemId = isProduct
        ? row.product_id.toString()
        : row.material_id.toString();

      let rate = 0;
      let name = '';
      let codeOrSku = '';

      if (isProduct) {
        rate = salesRateMap.get(itemId) ?? 0.1; // fallback to avoid division by zero
        const prod = await this.prisma.product.findUnique({
          where: { id: row.product_id },
        });
        name = prod?.name ?? 'Unknown Product';
        codeOrSku = prod?.sku ?? '';
      } else {
        rate = consumptionRateMap.get(itemId) ?? 0.1;
        const mat = await this.prisma.material.findUnique({
          where: { id: row.material_id },
        });
        name = mat?.name ?? 'Unknown Material';
        codeOrSku = mat?.code ?? '';
      }

      const qty = this.n(row.qty_on_hand);
      const coverageDays = rate > 0 ? qty / rate : 999;

      const site = await this.prisma.site.findUnique({
        where: { id: row.site_id },
        select: { name: true },
      });

      resolvedSnapshots.push({
        id: row.id.toString(),
        siteName: site?.name ?? 'Unknown Site',
        itemId,
        name,
        codeOrSku,
        type: isProduct ? 'product' : 'material',
        qtyOnHand: qty,
        value: this.n(row.inventory_value),
        avgDailyUsage: Number(rate.toFixed(4)),
        coverageDays:
          coverageDays > 365 ? 365 : Number(coverageDays.toFixed(1)),
      });
    }

    return resolvedSnapshots;
  }

  async getSlowMovingItems(companyId: bigint, siteId?: number) {
    const coverage = await this.getCoverageDays(companyId, siteId);

    // Slow moving if coverage days > 90 days or average daily usage is very close to zero
    return coverage
      .filter(
        (c) =>
          c.coverageDays > 90 || (c.qtyOnHand > 0 && c.avgDailyUsage <= 0.1),
      )
      .map((c) => ({
        ...c,
        status: c.coverageDays > 180 ? 'critical' : 'warning',
      }));
  }
}
