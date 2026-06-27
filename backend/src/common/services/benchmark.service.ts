import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

export interface BenchmarkResult {
  testName: string;
  rows: number;
  durationMs: number;
  rowsPerSecond: number;
  memoryUsageMb: number;
  success: boolean;
  error?: string;
}

interface GenerateOptions {
  rowCount: number;
  module: string;
}

@Injectable()
export class BenchmarkService {
  constructor(private readonly prisma: PrismaService) {}

  async generateTestData(
    companyId: bigint,
    options: GenerateOptions,
  ): Promise<BenchmarkResult> {
    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed;

    try {
      const { rowCount, module } = options;

      switch (module) {
        case 'accounts':
          await this.generateAccounts(companyId, rowCount);
          break;
        case 'products':
          await this.generateProducts(companyId, rowCount);
          break;
        case 'customers':
          await this.generateCustomers(companyId, rowCount);
          break;
        case 'materials':
          await this.generateMaterials(companyId, rowCount);
          break;
        case 'actuals':
          await this.generateActualLines(companyId, rowCount);
          break;
        case 'budgets':
          await this.generateBudgetLines(companyId, rowCount);
          break;
        default:
          throw new Error(`Unknown module: ${module}`);
      }

      const endTime = Date.now();
      const endMemory = process.memoryUsage().heapUsed;

      return {
        testName: `Generate ${rowCount} ${module}`,
        rows: rowCount,
        durationMs: endTime - startTime,
        rowsPerSecond: Math.round(
          rowCount / ((endTime - startTime) / 1000),
        ),
        memoryUsageMb: Math.round(
          (endMemory - startMemory) / 1024 / 1024,
        ),
        success: true,
      };
    } catch (error) {
      return {
        testName: `Generate ${options.rowCount} ${options.module}`,
        rows: options.rowCount,
        durationMs: Date.now() - startTime,
        rowsPerSecond: 0,
        memoryUsageMb: Math.round(
          (process.memoryUsage().heapUsed - startMemory) / 1024 / 1024,
        ),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async benchmarkImport(
    companyId: bigint,
    options: GenerateOptions,
  ): Promise<BenchmarkResult> {
    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed;

    try {
      const { rowCount } = options;

      const accounts = await this.prisma.account.findMany({
        where: { companyId },
        take: 10,
      });

      if (accounts.length === 0) {
        throw new Error('No accounts found. Create accounts first.');
      }

      const batchSize = 1000;
      const batches = Math.ceil(rowCount / batchSize);
      let inserted = 0;

      for (let b = 0; b < batches; b++) {
        const batchRows = Math.min(batchSize, rowCount - inserted);
        const lines = Array.from({ length: batchRows }, (_, i) => ({
          actualImportId: BigInt(1),
          accountId: accounts[i % accounts.length].id,
          transactionDate: new Date(
            2025,
            Math.floor(Math.random() * 12),
            Math.floor(Math.random() * 28) + 1,
          ),
          amount: Math.random() * 100000,
          quantity: Math.random() * 1000,
          unitPrice: Math.random() * 100,
        }));

        await this.prisma.actualLine.createMany({
          data: lines,
          skipDuplicates: true,
        });
        inserted += batchRows;
      }

      const endTime = Date.now();
      const endMemory = process.memoryUsage().heapUsed;

      return {
        testName: `Import ${rowCount} actual lines`,
        rows: rowCount,
        durationMs: endTime - startTime,
        rowsPerSecond: Math.round(
          rowCount / ((endTime - startTime) / 1000),
        ),
        memoryUsageMb: Math.round(
          (endMemory - startMemory) / 1024 / 1024,
        ),
        success: true,
      };
    } catch (error) {
      return {
        testName: `Import ${options.rowCount} actual lines`,
        rows: options.rowCount,
        durationMs: Date.now() - startTime,
        rowsPerSecond: 0,
        memoryUsageMb: Math.round(
          (process.memoryUsage().heapUsed - startMemory) / 1024 / 1024,
        ),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async benchmarkQuery(companyId: bigint): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = [];
    const startMemory = process.memoryUsage().heapUsed;

    let start = Date.now();
    await this.prisma.$queryRaw`
      SELECT
        SUM(CASE WHEN a.type = 'revenue' THEN v.actual_amount ELSE 0 END) AS revenue
      FROM vw_budget_actual_forecast v
      JOIN accounts a ON a.id = v.account_id
      WHERE v.company_id = ${companyId}
    `;
    results.push({
      testName: 'Dashboard Summary Query',
      rows: 1,
      durationMs: Date.now() - start,
      rowsPerSecond: 0,
      memoryUsageMb: Math.round(
        (process.memoryUsage().heapUsed - startMemory) / 1024 / 1024,
      ),
      success: true,
    });

    start = Date.now();
    await this.prisma.$queryRaw`
      SELECT product_id, product_name, SUM(sales) AS value
      FROM vw_product_profitability
      WHERE company_id = ${companyId}
      GROUP BY product_id, product_name
      ORDER BY value DESC
      LIMIT 10
    `;
    results.push({
      testName: 'Product Profitability Query',
      rows: 1,
      durationMs: Date.now() - start,
      rowsPerSecond: 0,
      memoryUsageMb: Math.round(
        (process.memoryUsage().heapUsed - startMemory) / 1024 / 1024,
      ),
      success: true,
    });

    start = Date.now();
    await this.prisma.$queryRaw`
      SELECT COUNT(*) as cnt FROM vw_inventory_coverage
      WHERE company_id = ${companyId}
    `;
    results.push({
      testName: 'Inventory Coverage Query',
      rows: 1,
      durationMs: Date.now() - start,
      rowsPerSecond: 0,
      memoryUsageMb: Math.round(
        (process.memoryUsage().heapUsed - startMemory) / 1024 / 1024,
      ),
      success: true,
    });

    return results;
  }

  async runFullBenchmark(companyId: bigint): Promise<{
    dataGeneration: BenchmarkResult[];
    importSpeed: BenchmarkResult[];
    queryPerformance: BenchmarkResult[];
    summary: string;
  }> {
    const dataGeneration: BenchmarkResult[] = [];
    const sizes = [1000, 10000, 100000];

    for (const size of sizes) {
      const result = await this.generateTestData(companyId, {
        rowCount: size,
        module: 'accounts',
      });
      dataGeneration.push(result);
    }

    const importSpeed: BenchmarkResult[] = [];
    for (const size of [10000, 100000]) {
      const result = await this.benchmarkImport(companyId, {
        rowCount: size,
        module: 'actuals',
      });
      importSpeed.push(result);
    }

    const queryPerformance = await this.benchmarkQuery(companyId);

    const summary = this.buildSummary(
      dataGeneration,
      importSpeed,
      queryPerformance,
    );

    return { dataGeneration, importSpeed, queryPerformance, summary };
  }

  private buildSummary(
    dataGen: BenchmarkResult[],
    imports: BenchmarkResult[],
    queries: BenchmarkResult[],
  ): string {
    const lines = ['=== Benchmark Summary ===', ''];
    lines.push('Data Generation:');
    for (const r of dataGen) {
      lines.push(
        `  ${r.testName}: ${r.durationMs}ms (${r.rowsPerSecond} rows/sec) ${r.success ? '✓' : '✗ ' + (r.error ?? '')}`,
      );
    }
    lines.push('');
    lines.push('Import Speed:');
    for (const r of imports) {
      lines.push(
        `  ${r.testName}: ${r.durationMs}ms (${r.rowsPerSecond} rows/sec) ${r.success ? '✓' : '✗ ' + (r.error ?? '')}`,
      );
    }
    lines.push('');
    lines.push('Query Performance:');
    for (const r of queries) {
      lines.push(
        `  ${r.testName}: ${r.durationMs}ms ${r.success ? '✓' : '✗ ' + (r.error ?? '')}`,
      );
    }
    return lines.join('\n');
  }

  private async generateAccounts(
    companyId: bigint,
    count: number,
  ): Promise<void> {
    const types = [
      'revenue',
      'expense',
      'cogs',
      'asset',
      'liability',
    ] as const;
    const batchSize = 500;
    const batches = Math.ceil(count / batchSize);

    for (let b = 0; b < batches; b++) {
      const batch = Math.min(batchSize, count - b * batchSize);
      const data = Array.from({ length: batch }, (_, i) => ({
        companyId,
        code: `BENCH-${(b * batchSize + i + 1).toString().padStart(6, '0')}`,
        name: `Benchmark Account ${b * batchSize + i + 1}`,
        type: types[i % types.length],
        isActive: true,
      }));

      await this.prisma.account.createMany({
        data,
        skipDuplicates: true,
      });
    }
  }

  private async generateProducts(
    companyId: bigint,
    count: number,
  ): Promise<void> {
    const batchSize = 500;
    const batches = Math.ceil(count / batchSize);

    for (let b = 0; b < batches; b++) {
      const batch = Math.min(batchSize, count - b * batchSize);
      const data = Array.from({ length: batch }, (_, i) => ({
        companyId,
        sku: `BENCH-PROD-${(b * batchSize + i + 1).toString().padStart(6, '0')}`,
        name: `Benchmark Product ${b * batchSize + i + 1}`,
        salePrice: Math.random() * 1000,
        standardCost: Math.random() * 500,
        isActive: true,
      }));

      await this.prisma.product.createMany({
        data,
        skipDuplicates: true,
      });
    }
  }

  private async generateCustomers(
    companyId: bigint,
    count: number,
  ): Promise<void> {
    const batchSize = 500;
    const batches = Math.ceil(count / batchSize);

    for (let b = 0; b < batches; b++) {
      const batch = Math.min(batchSize, count - b * batchSize);
      const data = Array.from({ length: batch }, (_, i) => ({
        companyId,
        code: `BENCH-CUST-${(b * batchSize + i + 1).toString().padStart(6, '0')}`,
        name: `Benchmark Customer ${b * batchSize + i + 1}`,
        isActive: true,
      }));

      await this.prisma.customer.createMany({
        data,
        skipDuplicates: true,
      });
    }
  }

  private async generateMaterials(
    companyId: bigint,
    count: number,
  ): Promise<void> {
    const batchSize = 500;
    const batches = Math.ceil(count / batchSize);

    for (let b = 0; b < batches; b++) {
      const batch = Math.min(batchSize, count - b * batchSize);
      const data = Array.from({ length: batch }, (_, i) => ({
        companyId,
        code: `BENCH-MAT-${(b * batchSize + i + 1).toString().padStart(6, '0')}`,
        name: `Benchmark Material ${b * batchSize + i + 1}`,
        purchasePrice: Math.random() * 500,
        isActive: true,
      }));

      await this.prisma.material.createMany({
        data,
        skipDuplicates: true,
      });
    }
  }

  private async generateActualLines(
    companyId: bigint,
    count: number,
  ): Promise<void> {
    const accounts = await this.prisma.account.findMany({
      where: { companyId },
      take: 10,
    });
    if (accounts.length === 0) return;

    const importRecord = await this.prisma.actualImport.create({
      data: {
        companyId,
        sourceSystem: 'excel',
        importType: 'gl',
        periodFrom: new Date('2025-01-01'),
        periodTo: new Date('2025-12-31'),
        status: 'posted',
      },
    });

    const batchSize = 1000;
    const batches = Math.ceil(count / batchSize);

    for (let b = 0; b < batches; b++) {
      const batch = Math.min(batchSize, count - b * batchSize);
      const data = Array.from({ length: batch }, (_, i) => ({
        actualImportId: importRecord.id,
        accountId: accounts[i % accounts.length].id,
        transactionDate: new Date(
          2025,
          Math.floor(Math.random() * 12),
          Math.floor(Math.random() * 28) + 1,
        ),
        amount: Math.random() * 100000,
      }));

      await this.prisma.actualLine.createMany({ data });
    }
  }

  private async generateBudgetLines(
    companyId: bigint,
    count: number,
  ): Promise<void> {
    const accounts = await this.prisma.account.findMany({
      where: { companyId },
      take: 10,
    });
    if (accounts.length === 0) return;

    const cycle = await this.prisma.budgetCycle.create({
      data: {
        companyId,
        name: `Benchmark Budget ${Date.now()}`,
        fiscalYear: 2025,
        periodType: 'monthly',
        status: 'draft',
      },
    });

    const batchSize = 1000;
    const batches = Math.ceil(count / batchSize);

    for (let b = 0; b < batches; b++) {
      const batch = Math.min(batchSize, count - b * batchSize);
      const data = Array.from({ length: batch }, (_, i) => ({
        budgetCycleId: cycle.id,
        accountId: accounts[i % accounts.length].id,
        periodMonth: (i % 12) + 1,
        amount: Math.random() * 100000,
      }));

      await this.prisma.budgetLine.createMany({ data });
    }
  }
}
