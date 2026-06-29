/**
 * Streaming Import Service
 *
 * Processes validated Excel data in chunks with batch inserts.
 * Uses createMany() for performance. Tracks progress and generates reports.
 * Respects dependency order across sheets.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import {
  SheetAnalysis, ColumnMapping, ImportExecutionResult, SheetImportResult,
  ImportError, ImportReport, SheetValidationResult, RowLevelReport,
} from './types/excel-integration.types';

export interface ImportChunk {
  sheetName: string;
  rows: Record<string, unknown>[];
  columnMappings: ColumnMapping[];
  chunkIndex: number;
}

@Injectable()
export class StreamingImportService {
  private readonly logger = new Logger(StreamingImportService.name);
  private readonly CHUNK_SIZE = 1000;

  constructor(private readonly prisma: PrismaService) {}

  /* ─── Main Import Entry ────────────────────────────────────────────── */

  async importWorkbook(
    sheets: { analysis: SheetAnalysis; rows: Record<string, unknown>[]; mappings: ColumnMapping[]; validation: SheetValidationResult }[],
    companyId: bigint,
    options?: { dryRun?: boolean; skipErrors?: boolean; userId?: bigint | null },
  ): Promise<ImportExecutionResult> {
    const startTime = Date.now();
    const results: SheetImportResult[] = [];
    let totalInserted = 0;
    let totalFailed = 0;
    let totalSkipped = 0;

    this.logger.log(`Starting import for ${sheets.length} sheets, company=${companyId}`);

    for (const sheet of sheets) {
      // Skip sheets with no valid rows
      if (sheet.validation.validRows === 0 && sheet.validation.errors.length > 0) {
        results.push({
          sheetName: sheet.analysis.sheetName,
          erpModule: sheet.analysis.erpModule,
          status: 'skipped',
          totalRows: sheet.rows.length,
          insertedRows: 0,
          failedRows: 0,
          skippedRows: sheet.rows.length,
          durationMs: 0,
          rowsPerSecond: 0,
          errors: [],
          rowReports: sheet.rows.map((_, i) => ({
            sheetName: sheet.analysis.sheetName,
            rowNumber: i + 2,
            module: sheet.analysis.erpModule,
            status: 'skipped',
            reason: 'Sheet skipped due to 0 valid rows and >0 errors',
          })),
        });
        totalSkipped += sheet.rows.length;
        continue;
      }

      const sheetResult = await this.importSheet(sheet, companyId, options);
      results.push(sheetResult);
      totalInserted += sheetResult.insertedRows;
      totalFailed += sheetResult.failedRows;
      totalSkipped += sheetResult.skippedRows;
    }

    const totalRows = results.reduce((sum, r) => sum + r.totalRows, 0);
    const durationMs = Date.now() - startTime;
    const rowsPerSecond = totalRows / (durationMs / 1000);

    // Generate reports
    const reports = this.generateReports(results);

    const status = totalFailed === 0 ? 'completed' : totalInserted > 0 ? 'partial' : 'failed';

    this.logger.log(`Import complete: ${status}, ${totalInserted} inserted, ${totalFailed} failed, ${totalSkipped} skipped in ${durationMs}ms`);

    return {
      sheets: results,
      status,
      totalRows,
      insertedRows: totalInserted,
      failedRows: totalFailed,
      skippedRows: totalSkipped,
      durationMs,
      rowsPerSecond,
      reports,
    };
  }

  /* ─── Import a Single Sheet ────────────────────────────────────────── */

  private async importSheet(
    sheet: { analysis: SheetAnalysis; rows: Record<string, unknown>[]; mappings: ColumnMapping[]; validation: SheetValidationResult },
    companyId: bigint,
    options?: { dryRun?: boolean; skipErrors?: boolean; userId?: bigint | null },
  ): Promise<SheetImportResult> {
    const startTime = Date.now();
    const { analysis, rows, mappings, validation } = sheet;

    this.logger.log(`Importing sheet "${analysis.sheetName}" → module "${analysis.erpModule}" (${rows.length} rows)`);

    const rowReports: RowLevelReport[] = [];

    if (options?.dryRun) {
      return {
        sheetName: analysis.sheetName,
        erpModule: analysis.erpModule,
        status: 'completed',
        totalRows: rows.length,
        insertedRows: 0,
        failedRows: 0,
        skippedRows: rows.length,
        durationMs: Date.now() - startTime,
        rowsPerSecond: 0,
        errors: [],
        rowReports: rows.map((_, i) => ({
          sheetName: analysis.sheetName,
          rowNumber: i + 2,
          module: analysis.erpModule,
          status: 'skipped',
          reason: 'Dry run'
        }))
      };
    }

    if (validation.errorRowNumbers.length > 0) {
      validation.errorRowNumbers.forEach(rowNum => {
        rowReports.push({ sheetName: analysis.sheetName, rowNumber: rowNum, module: analysis.erpModule, status: 'skipped', reason: 'Validation error' });
      });
    }

    const rowsWithMeta = rows.map((row, i) => ({ row, rowNum: i + 2 }));

    const importableRows = options?.skipErrors
      ? rowsWithMeta.filter(x => !validation.errorRowNumbers.includes(x.rowNum))
      : validation.errorRowNumbers.length === 0 ? rowsWithMeta : [];

    if (validation.errorRowNumbers.length > 0 && !options?.skipErrors) {
      rowsWithMeta.filter(x => !validation.errorRowNumbers.includes(x.rowNum)).forEach(x => {
        rowReports.push({ sheetName: analysis.sheetName, rowNumber: x.rowNum, module: analysis.erpModule, status: 'skipped', reason: 'Skipped due to validation errors elsewhere in sheet' });
      });
    }

    const columnMap = this.buildColumnMap(mappings);
    let insertedCount = 0;
    const errors: ImportError[] = [];
    const chunks = this.chunkArray(importableRows, this.CHUNK_SIZE);

    for (let chunkIdx = 0; chunkIdx < chunks.length; chunkIdx++) {
      const chunkMeta = chunks[chunkIdx];
      const mappedChunk = chunkMeta.map(x => this.mapRow(x.row, columnMap, companyId));

      try {
        const resolvedChunk = await this.resolveReferences(analysis.erpModule, mappedChunk, companyId, options);
        const result = await this.insertChunk(analysis.erpModule, resolvedChunk, chunkMeta.map(x => x.rowNum));
        insertedCount += result.count;
        
        result.rowReports.forEach(r => {
          rowReports.push({ sheetName: analysis.sheetName, module: analysis.erpModule, ...r });
          if (r.status === 'failed') {
            errors.push({ row: r.rowNumber, column: '_insert', message: r.reason || 'Insert failed', value: null });
          }
        });

        this.logger.debug(`Chunk ${chunkIdx + 1}/${chunks.length}: inserted ${result.count} rows`);
      } catch (err: any) {
        this.logger.error(`Chunk ${chunkIdx + 1} failed: ${err}`);
        chunkMeta.forEach(x => {
          errors.push({ row: x.rowNum, column: '_chunk', message: `Batch insert failed: ${err.message || err}`, value: null });
          rowReports.push({ sheetName: analysis.sheetName, rowNumber: x.rowNum, module: analysis.erpModule, status: 'failed', reason: `Batch insert failed: ${err.message || err}` });
        });
      }
    }

    const durationMs = Date.now() - startTime;
    const rowsPerSecond = rows.length / (durationMs / 1000);
    const failedRows = rows.length - insertedCount - (rows.length - importableRows.length);
    const skippedRows = rows.length - importableRows.length;

    const status = insertedCount === rows.length ? 'completed' : insertedCount > 0 ? 'partial' : 'failed';

    return {
      sheetName: analysis.sheetName,
      erpModule: analysis.erpModule,
      status,
      totalRows: rows.length,
      insertedRows: insertedCount,
      failedRows,
      skippedRows,
      durationMs,
      rowsPerSecond,
      errors,
      rowReports,
    };
  }

  /* ─── Column Mapping ───────────────────────────────────────────────── */

  private buildColumnMap(mappings: ColumnMapping[]): Map<string, string> {
    const map = new Map<string, string>();
    for (const m of mappings) {
      if (m.type === 'skip') continue;
      map.set(m.excelColumn, m.erpField);
    }
    return map;
  }

  private mapRow(
    row: Record<string, unknown>,
    columnMap: Map<string, string>,
    companyId: bigint,
  ): Record<string, unknown> {
    const mapped: Record<string, unknown> = {};

    for (const [excelCol, erpField] of columnMap) {
      const value = row[excelCol];
      if (value !== null && value !== undefined && value !== '') {
        mapped[erpField] = this.coerceType(value, erpField);
      }
    }

    // Always inject companyId
    mapped.companyId = companyId;

    return mapped;
  }

  /* ─── Type Coercion ────────────────────────────────────────────────── */

  private coerceType(value: unknown, field: string): unknown {
    const str = String(value).trim();

    // Numeric fields
    if (/^(price|cost|amount|rate|quantity|qty|total|sum|value|target|actual|weight|limit|discount|yield|wastage|budget|forecast|planned)$/i.test(field)) {
      const cleaned = str.replace(/[$€£EGP,\s]/g, '');
      const num = Number(cleaned);
      return isNaN(num) ? str : num;
    }

    // Boolean fields
    if (/^(isactive|active|enabled)$/i.test(field)) {
      return /^(true|yes|1)$/i.test(str);
    }

    // Date fields
    if (/^(date|effectivedate|startdate|enddate|duedate|createdat|snapshotdate|ratedate|fiscalmonth|fiscalyear)$/i.test(field)) {
      const d = new Date(str);
      return isNaN(d.getTime()) ? str : d;
    }

    return str;
  }

  /* ─── ID Pre-Resolution Phase ──────────────────────────────────────── */

  private async resolveReferences(
    module: string,
    rows: Record<string, unknown>[],
    companyId: bigint,
    options?: { dryRun?: boolean; skipErrors?: boolean; userId?: bigint | null }
  ): Promise<Record<string, unknown>[]> {
    if (rows.length === 0) return rows;

    // Resolve userId for createdBy
    let defaultUserId: bigint | undefined = undefined;
    if (options?.userId) {
      defaultUserId = options.userId;
    } else {
      const admin = await this.prisma.user.findFirst({ where: { email: 'admin@idiibi.com' } });
      if (admin) defaultUserId = admin.id;
    }

    // Collect all unique string identifiers from the rows
    const uniqueIds = {
      productSku: new Set<string>(),
      siteCode: new Set<string>(),
      costCenterCode: new Set<string>(),
      accountCode: new Set<string>(),
      customerCode: new Set<string>(),
      supplierCode: new Set<string>(),
      materialCode: new Set<string>(),
      unit: new Set<string>(),
      categoryId: new Set<string>(),
    };

    rows.forEach(row => {
      if (row.productSku) uniqueIds.productSku.add(String(row.productSku));
      if (row.siteCode) uniqueIds.siteCode.add(String(row.siteCode));
      if (row.costCenterCode) uniqueIds.costCenterCode.add(String(row.costCenterCode));
      if (row.accountCode) uniqueIds.accountCode.add(String(row.accountCode));
      if (row.customerCode) uniqueIds.customerCode.add(String(row.customerCode));
      if (row.supplierCode) uniqueIds.supplierCode.add(String(row.supplierCode));
      if (row.materialCode) uniqueIds.materialCode.add(String(row.materialCode));
      if (row.unit) uniqueIds.unit.add(String(row.unit));
      if (row.productCategoryId) uniqueIds.categoryId.add(String(row.productCategoryId));
    });

    const lookups = {
      product: new Map<string, bigint>(),
      site: new Map<string, bigint>(),
      costCenter: new Map<string, bigint>(),
      account: new Map<string, bigint>(),
      customer: new Map<string, bigint>(),
      supplier: new Map<string, bigint>(),
      material: new Map<string, bigint>(),
      unit: new Map<string, bigint>(),
      category: new Map<string, bigint>(),
    };

    // Bulk resolve and auto-create
    if (uniqueIds.productSku.size > 0) {
      const skus = Array.from(uniqueIds.productSku);
      const items = await this.prisma.product.findMany({ where: { companyId, sku: { in: skus } } });
      items.forEach(i => lookups.product.set(i.sku, i.id));
      const missing = skus.filter(s => !lookups.product.has(s));
      if (missing.length > 0) {
        await this.prisma.product.createMany({
          data: missing.map(sku => ({ companyId, sku, name: `Product ${sku}` }))
        });
        const created = await this.prisma.product.findMany({ where: { companyId, sku: { in: missing } } });
        created.forEach(i => lookups.product.set(i.sku, i.id));
      }
    }

    if (uniqueIds.siteCode.size > 0) {
      const names = Array.from(uniqueIds.siteCode);
      const items = await this.prisma.site.findMany({ where: { companyId, name: { in: names } } });
      items.forEach(i => lookups.site.set(i.name, i.id));
      const missing = names.filter(n => !lookups.site.has(n));
      if (missing.length > 0) {
        await this.prisma.site.createMany({
          data: missing.map(name => ({ companyId, name, type: 'branch' as any }))
        });
        const created = await this.prisma.site.findMany({ where: { companyId, name: { in: missing } } });
        created.forEach(i => lookups.site.set(i.name, i.id));
      }
    }

    if (uniqueIds.costCenterCode.size > 0) {
      const codes = Array.from(uniqueIds.costCenterCode);
      const items = await this.prisma.costCenter.findMany({ where: { companyId, code: { in: codes } } });
      items.forEach(i => { if (i.code) lookups.costCenter.set(i.code, i.id) });
      const missing = codes.filter(c => !lookups.costCenter.has(c));
      if (missing.length > 0) {
        await this.prisma.costCenter.createMany({
          data: missing.map(code => ({ companyId, code, name: `Cost Center ${code}`, type: 'department' as any }))
        });
        const created = await this.prisma.costCenter.findMany({ where: { companyId, code: { in: missing } } });
        created.forEach(i => { if (i.code) lookups.costCenter.set(i.code, i.id) });
      }
    }

    if (uniqueIds.accountCode.size > 0) {
      const codes = Array.from(uniqueIds.accountCode);
      const items = await this.prisma.account.findMany({ where: { companyId, code: { in: codes } } });
      items.forEach(i => lookups.account.set(i.code, i.id));
      const missing = codes.filter(c => !lookups.account.has(c));
      if (missing.length > 0) {
        const toCreate = missing.map(code => {
          // Attempt to find name and type from row
          const row = rows.find(r => String(r.accountCode) === code);
          const type = row?.type ? String(row.type).toLowerCase() : 'expense';
          const name = row?.name ? String(row.name) : `Account ${code}`;
          return { companyId, code, name, type: type as any };
        });
        await this.prisma.account.createMany({ data: toCreate });
        const created = await this.prisma.account.findMany({ where: { companyId, code: { in: missing } } });
        created.forEach(i => lookups.account.set(i.code, i.id));
      }
    }

    if (uniqueIds.customerCode.size > 0) {
      const codes = Array.from(uniqueIds.customerCode);
      const items = await this.prisma.customer.findMany({ where: { companyId, code: { in: codes } } });
      items.forEach(i => lookups.customer.set(i.code, i.id));
      const missing = codes.filter(c => !lookups.customer.has(c));
      if (missing.length > 0) {
        await this.prisma.customer.createMany({
          data: missing.map(code => ({ companyId, code, name: `Customer ${code}` }))
        });
        const created = await this.prisma.customer.findMany({ where: { companyId, code: { in: missing } } });
        created.forEach(i => lookups.customer.set(i.code, i.id));
      }
    }

    if (uniqueIds.supplierCode.size > 0) {
      const names = Array.from(uniqueIds.supplierCode);
      const items = await this.prisma.supplier.findMany({ where: { companyId, name: { in: names } } });
      items.forEach(i => lookups.supplier.set(i.name, i.id));
      const missing = names.filter(n => !lookups.supplier.has(n));
      if (missing.length > 0) {
        if (!options?.dryRun) {
          await this.prisma.supplier.createMany({
            data: missing.map(name => ({ companyId, name }))
          });
          const created = await this.prisma.supplier.findMany({ where: { companyId, name: { in: missing } } });
          created.forEach(i => lookups.supplier.set(i.name, i.id));
        }
      }
    }

    if (uniqueIds.materialCode.size > 0) {
      const codes = Array.from(uniqueIds.materialCode);
      const items = await this.prisma.material.findMany({ where: { companyId, code: { in: codes } } });
      items.forEach(i => lookups.material.set(i.code, i.id));
      const missing = codes.filter(c => !lookups.material.has(c));
      if (missing.length > 0) {
        await this.prisma.material.createMany({
          data: missing.map(code => ({ companyId, code, name: `Material ${code}` }))
        });
        const created = await this.prisma.material.findMany({ where: { companyId, code: { in: missing } } });
        created.forEach(i => lookups.material.set(i.code, i.id));
      }
    }

    if (uniqueIds.unit.size > 0) {
      const names = Array.from(uniqueIds.unit);
      const items = await this.prisma.unit.findMany({ where: { companyId, name: { in: names } } });
      items.forEach(i => lookups.unit.set(i.name, i.id));
      const missing = names.filter(n => !lookups.unit.has(n));
      if (missing.length > 0) {
        await this.prisma.unit.createMany({
          data: missing.map(name => ({ companyId, name, symbol: name.substring(0, 3) }))
        });
        const created = await this.prisma.unit.findMany({ where: { companyId, name: { in: missing } } });
        created.forEach(i => lookups.unit.set(i.name, i.id));
      }
    }
    
    if (uniqueIds.categoryId.size > 0) {
      const names = Array.from(uniqueIds.categoryId);
      const items = await this.prisma.productCategory.findMany({ where: { companyId, name: { in: names } } });
      items.forEach(i => lookups.category.set(i.name, i.id));
      const missing = names.filter(n => !lookups.category.has(n));
      if (missing.length > 0) {
        await this.prisma.productCategory.createMany({
          data: missing.map(name => ({ companyId, name }))
        });
        const created = await this.prisma.productCategory.findMany({ where: { companyId, name: { in: missing } } });
        created.forEach(i => lookups.category.set(i.name, i.id));
      }
    }

    // Substitute strings with IDs
    return rows.map(row => {
      const newRow = { ...row };

      if (newRow.productSku) {
        newRow.productId = lookups.product.get(String(newRow.productSku));
        delete newRow.productSku;
      }
      if (newRow.siteCode) {
        newRow.siteId = lookups.site.get(String(newRow.siteCode));
        delete newRow.siteCode;
      }
      if (newRow.costCenterCode) {
        newRow.costCenterId = lookups.costCenter.get(String(newRow.costCenterCode));
        delete newRow.costCenterCode;
      }
      if (newRow.accountCode) {
        newRow.accountId = lookups.account.get(String(newRow.accountCode));
        delete newRow.accountCode;
      }
      if (newRow.customerCode) {
        newRow.customerId = lookups.customer.get(String(newRow.customerCode));
        delete newRow.customerCode;
      }
      if (newRow.supplierCode) {
        newRow.supplierId = lookups.supplier.get(String(newRow.supplierCode));
        delete newRow.supplierCode;
      }
      if (newRow.materialCode) {
        newRow.materialId = lookups.material.get(String(newRow.materialCode));
        delete newRow.materialCode;
      }
      if (newRow.unit) {
        newRow.unitId = lookups.unit.get(String(newRow.unit));
        delete newRow.unit;
      }
      if (newRow.productCategoryId) {
        newRow.categoryId = lookups.category.get(String(newRow.productCategoryId));
        delete newRow.productCategoryId;
      }

      // Handle createdBy globally if needed by specific modules like ForecastCycle
      if (defaultUserId) {
        // Some models map createdBy to 'created_by' but Prisma handles camelCase mapping if defined
        // We will just provide createdById if that's the relation field name.
        // Wait, what is the exact field name for User relation in ForecastCycle?
        // Let's just set `createdById` and `createdBy` to defaultUserId safely. 
        // We will remove non-schema fields later if needed, but Prisma silently ignores or throws if strict.
        if (module === 'forecastcycles' || module === 'budgetcycles' || module === 'exchangerates' || module === 'actualimports') {
           newRow.createdBy = defaultUserId;
        }
      }

      return newRow;
    });
  }

  /* ─── Database Insert ──────────────────────────────────────────────── */

  private async insertChunk(
    module: string,
    rows: Record<string, unknown>[],
    rowNums: number[]
  ): Promise<{ count: number; rowReports: { rowNumber: number; status: 'success' | 'failed'; reason?: string; createdId?: bigint | null }[] }> {
    if (rows.length === 0) return { count: 0, rowReports: [] };

    // Map module to Prisma model
    const model = this.getPrismaModel(module);
    if (!model) {
      throw new Error(`Unknown module: ${module}`);
    }

    try {
      // Try fast path first
      const result = await (model as any).createMany({
        data: rows,
        skipDuplicates: true,
      });
      return { 
        count: result.count, 
        rowReports: rowNums.map(rn => ({ rowNumber: rn, status: 'success', createdId: null })) 
      };
    } catch (e: any) {
      // Fallback to sequential to get row-level errors
      let count = 0;
      const rowReports: { rowNumber: number; status: 'success' | 'failed'; reason?: string; createdId?: bigint | null }[] = [];
      for (let i = 0; i < rows.length; i++) {
        try {
          const created = await (model as any).create({ data: rows[i] });
          rowReports.push({ rowNumber: rowNums[i], status: 'success', createdId: created.id });
          count++;
        } catch (err: any) {
          rowReports.push({ rowNumber: rowNums[i], status: 'failed', reason: err.message || String(err) });
        }
      }
      return { count, rowReports };
    }
  }

  private getPrismaModel(module: string): any {
    const modelMap: Record<string, any> = {
      companies: this.prisma.company,
      sites: this.prisma.site,
      units: this.prisma.unit,
      accounts: this.prisma.account,
      costcenters: this.prisma.costCenter,
      productcategories: this.prisma.productCategory,
      customers: this.prisma.customer,
      suppliers: this.prisma.supplier,
      materials: this.prisma.material,
      products: this.prisma.product,
      bomrecipes: this.prisma.bomRecipe,
      bomlines: this.prisma.bomLine,
      productionplans: this.prisma.productionPlan,
      inventory: this.prisma.inventorySnapshot,
      materialprices: this.prisma.rawMaterialPrice,
      budgetlines: this.prisma.budgetLine,
      forecastlines: this.prisma.forecastLine,
      actuallines: this.prisma.actualLine,
      kpitargets: this.prisma.kpiTarget,
      exchangerates: this.prisma.exchangeRate,
      promotions: this.prisma.promotion,
      headcountplans: this.prisma.headcountPlan,
    };

    return modelMap[module] || null;
  }

  /* ─── Utilities ────────────────────────────────────────────────────── */

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private generateReports(results: SheetImportResult[]): ImportReport[] {
    const reports: ImportReport[] = [];

    // Summary report
    reports.push({
      type: 'summary',
      sheetName: 'ALL',
      title: 'Import Summary',
      data: results.map(r => ({
        sheet: r.sheetName,
        module: r.erpModule,
        status: r.status,
        inserted: r.insertedRows,
        failed: r.failedRows,
        skipped: r.skippedRows,
        speed: `${r.rowsPerSecond.toFixed(0)} rows/sec`,
      })),
    });

    // Error reports per sheet
    for (const r of results) {
      if (r.errors.length > 0) {
        reports.push({
          type: 'error',
          sheetName: r.sheetName,
          title: `Errors in "${r.sheetName}"`,
          data: r.errors,
        });
      }
    }

    // Row-level reporting aggregation
    const allRowReports = results.flatMap(r => r.rowReports || []);
    if (allRowReports.length > 0) {
      reports.push({
        type: 'row_level',
        sheetName: 'ALL',
        title: 'Row Level Report',
        data: allRowReports
      });
    }

    return reports;
  }
}
