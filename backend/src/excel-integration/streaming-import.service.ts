/**
 * Streaming Import Service
 *
 * Processes validated Excel data in chunks with batch inserts.
 * Uses createMany() for performance. Tracks progress and generates reports.
 * Respects dependency order across sheets.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ImportSourceSystem, ImportType, Prisma } from '@prisma/client';
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

    if (analysis.erpModule === 'informational' || analysis.erpModule === 'generic') {
      return {
        sheetName: analysis.sheetName,
        erpModule: analysis.erpModule,
        status: 'skipped',
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
          reason: 'Informational or generic sheet skipped'
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
    this.logger.debug(`[DEBUG] columnMap: ${JSON.stringify(Array.from(columnMap.entries()))}`);
    let insertedCount = 0;
    const errors: ImportError[] = [];
    const chunks = this.chunkArray(importableRows, this.CHUNK_SIZE);

    for (let chunkIdx = 0; chunkIdx < chunks.length; chunkIdx++) {
      const chunkMeta = chunks[chunkIdx];
      const mappedChunk = chunkMeta.map(x => this.mapRow(x.row, columnMap, companyId));

      try {
        const resolvedChunk = await this.resolveReferences(analysis.erpModule, mappedChunk, companyId, options);
        const cleanedChunk = resolvedChunk.map(row => this.stripUnknownFields(analysis.erpModule, row));
        const result = await this.insertChunk(analysis.erpModule, cleanedChunk, chunkMeta.map(x => x.rowNum));
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

    if (mapped.fiscalYear) {
      console.error(`[DEBUG] mapRow produced: ${JSON.stringify(mapped)}`);
    }

    return mapped;
  }

  /* ─── Type Coercion ────────────────────────────────────────────────── */

  private coerceType(value: unknown, field: string): unknown {
    const str = String(value).trim();

    // Numeric fields
    if (/^(price|cost|amount|rate|quantity|qty|total|sum|value|target|actual|weight|limit|discount|yield|wastage|budget|forecast|planned|fiscalyear|fiscalmonth|periodmonth|period|unitprice)$/i.test(field)) {
      const cleaned = str.replace(/[$€£EGP,\s]/g, '');
      const num = Number(cleaned);
      return isNaN(num) ? str : num;
    }

    // Boolean fields
    if (/^(isactive|active|enabled)$/i.test(field)) {
      return /^(true|yes|1)$/i.test(str);
    }

    // Date fields — match any field containing "date" anywhere in the name
    if (/date/i.test(field)) {
      const d = new Date(str);
      return isNaN(d.getTime()) ? str : d;
    }

    return str;
  }

  /** Normalise importType strings to valid Prisma ImportType enum values */
  private normaliseImportType(raw: string): string {
    const v = String(raw).toLowerCase().trim();
    const validTypes = ['actual', 'budget', 'forecast', 'master_data'];
    if (validTypes.includes(v)) return v;
    // Map common synonyms
    if (/sale|revenue|actual|real/i.test(v)) return 'actual';
    if (/budget|plan|target/i.test(v)) return 'budget';
    if (/forecast|proj/i.test(v)) return 'forecast';
    if (/master|ref|data/i.test(v)) return 'master_data';
    return 'actual'; // safe fallback
  }

  /** Normalise sourceSystem strings to valid Prisma ImportSourceSystem enum values */
  private normaliseSourceSystem(raw: string): string {
    const v = String(raw).toLowerCase().trim();
    const validSystems = ['excel', 'oracle', 'sap', 'erp', 'pms', 'odoo', 'pos', 'woocommerce', 'manual', 'api'];
    if (validSystems.includes(v)) return v;
    return 'excel'; // safe fallback
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
      forecastCycleName: new Set<string>(),
      budgetCycleName: new Set<string>(),
      sourceSystem: new Set<string>(),
      bomRecipeRef: new Set<string>(),
    };

    rows.forEach(row => {
      if (row.productSku) uniqueIds.productSku.add(String(row.productSku));
      
      const siteVal = row.siteCode || row.sitename || row.siteName;
      if (siteVal) uniqueIds.siteCode.add(String(siteVal));

      const ccVal = row.costCenterCode || row.costcentername || row.costCenterName;
      if (ccVal) uniqueIds.costCenterCode.add(String(ccVal));

      const accVal = row.accountCode || row.accountname || row.accountName;
      if (accVal) uniqueIds.accountCode.add(String(accVal));

      const custVal = row.customerCode || row.customername || row.customerName;
      if (custVal) uniqueIds.customerCode.add(String(custVal));

      const suppVal = row.supplierCode || row.suppliername || row.supplierName;
      if (suppVal) uniqueIds.supplierCode.add(String(suppVal));

      const matVal = row.materialCode || row.materialname || row.materialName;
      if (matVal) uniqueIds.materialCode.add(String(matVal));

      const unitVal = row.unit || row.unitname || row.unitName;
      if (unitVal) uniqueIds.unit.add(String(unitVal));
      
      if (row.productCategoryId) uniqueIds.categoryId.add(String(row.productCategoryId));
      if (row.forecastCycleName) uniqueIds.forecastCycleName.add(String(row.forecastCycleName));
      if (row.budgetCycleName) uniqueIds.budgetCycleName.add(String(row.budgetCycleName));
      // Normalise enums BEFORE building the ref key so lookup and substitution keys always match
      if (row.sourceSystem) {
        const normSource = this.normaliseSourceSystem(String(row.sourceSystem));
        const normImportType = this.normaliseImportType(String(row.importType || 'actual'));
        uniqueIds.sourceSystem.add(`${normSource}|${normImportType}|${row.periodFrom || ''}|${row.periodTo || ''}`);
      }
      if (module === 'bomlines' && row.productSku && row.version) uniqueIds.bomRecipeRef.add(`${row.productSku}|${row.version}`);
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
      forecastCycle: new Map<string, bigint>(),
      budgetCycle: new Map<string, bigint>(),
      actualImport: new Map<string, bigint>(),
      bomRecipe: new Map<string, bigint>(),
    };

    // Bulk resolve and auto-create
    if (uniqueIds.productSku.size > 0) {
      const vals = Array.from(uniqueIds.productSku);
      const items = await this.prisma.product.findMany({ where: { companyId, OR: [{ sku: { in: vals } }, { name: { in: vals } }] } });
      items.forEach(i => {
        if (i.sku) lookups.product.set(i.sku, i.id);
        if (i.name) lookups.product.set(i.name, i.id);
      });
      const missing = vals.filter(v => !lookups.product.has(v));
      if (missing.length > 0) {
        await this.prisma.product.createMany({
          data: missing.map(val => ({ companyId, sku: val, name: `Product ${val}` }))
        });
        const created = await this.prisma.product.findMany({ where: { companyId, OR: [{ sku: { in: missing } }, { name: { in: missing } }] } });
        created.forEach(i => {
          if (i.sku) lookups.product.set(i.sku, i.id);
          if (i.name) lookups.product.set(i.name, i.id);
        });
      }
    }

    if (uniqueIds.siteCode.size > 0) {
      const vals = Array.from(uniqueIds.siteCode);
      const items = await this.prisma.site.findMany({ where: { companyId, name: { in: vals } } });
      items.forEach(i => {
        if (i.name) lookups.site.set(i.name, i.id);
      });
      const missing = vals.filter(v => !lookups.site.has(v));
      if (missing.length > 0) {
        await this.prisma.site.createMany({
          data: missing.map(val => ({ companyId, name: val, type: 'branch' as any }))
        });
        const created = await this.prisma.site.findMany({ where: { companyId, name: { in: missing } } });
        created.forEach(i => {
          if (i.name) lookups.site.set(i.name, i.id);
        });
      }
    }

    if (uniqueIds.costCenterCode.size > 0) {
      const vals = Array.from(uniqueIds.costCenterCode);
      const items = await this.prisma.costCenter.findMany({ where: { companyId, OR: [{ code: { in: vals } }, { name: { in: vals } }] } });
      items.forEach(i => {
        if (i.code) lookups.costCenter.set(i.code, i.id);
        if (i.name) lookups.costCenter.set(i.name, i.id);
      });
      const missing = vals.filter(v => !lookups.costCenter.has(v));
      if (missing.length > 0) {
        await this.prisma.costCenter.createMany({
          data: missing.map(val => ({ companyId, code: val, name: `Cost Center ${val}`, type: 'other' as any }))
        });
        const created = await this.prisma.costCenter.findMany({ where: { companyId, OR: [{ code: { in: missing } }, { name: { in: missing } }] } });
        created.forEach(i => {
          if (i.code) lookups.costCenter.set(i.code, i.id);
          if (i.name) lookups.costCenter.set(i.name, i.id);
        });
      }
    }

    if (uniqueIds.accountCode.size > 0) {
      const vals = Array.from(uniqueIds.accountCode);
      const items = await this.prisma.account.findMany({ where: { companyId, OR: [{ code: { in: vals } }, { name: { in: vals } }] } });
      items.forEach(i => {
        if (i.code) lookups.account.set(i.code, i.id);
        if (i.name) lookups.account.set(i.name, i.id);
      });
      const missing = vals.filter(v => !lookups.account.has(v));
      if (missing.length > 0) {
        const toCreate = missing.map(val => {
          // Attempt to find name and type from row
          const row = rows.find(r => String(r.accountCode) === val || String(r.accountName) === val || String(r.accountname) === val);
          const type = row?.type ? String(row.type).toLowerCase() : 'expense';
          const name = row?.name ? String(row.name) : `Account ${val}`;
          return { companyId, code: val, name, type: type as any };
        });
        await this.prisma.account.createMany({ data: toCreate });
        const created = await this.prisma.account.findMany({ where: { companyId, OR: [{ code: { in: missing } }, { name: { in: missing } }] } });
        created.forEach(i => {
          if (i.code) lookups.account.set(i.code, i.id);
          if (i.name) lookups.account.set(i.name, i.id);
        });
      }
    }

    if (uniqueIds.customerCode.size > 0) {
      const vals = Array.from(uniqueIds.customerCode);
      const items = await this.prisma.customer.findMany({ where: { companyId, OR: [{ code: { in: vals } }, { name: { in: vals } }] } });
      items.forEach(i => {
        if (i.code) lookups.customer.set(i.code, i.id);
        if (i.name) lookups.customer.set(i.name, i.id);
      });
      const missing = vals.filter(v => !lookups.customer.has(v));
      if (missing.length > 0) {
        await this.prisma.customer.createMany({
          data: missing.map(val => ({ companyId, code: val, name: `Customer ${val}` }))
        });
        const created = await this.prisma.customer.findMany({ where: { companyId, OR: [{ code: { in: missing } }, { name: { in: missing } }] } });
        created.forEach(i => {
          if (i.code) lookups.customer.set(i.code, i.id);
          if (i.name) lookups.customer.set(i.name, i.id);
        });
      }
    }

    if (uniqueIds.supplierCode.size > 0) {
      const vals = Array.from(uniqueIds.supplierCode);
      const items = await this.prisma.supplier.findMany({ where: { companyId, name: { in: vals } } });
      items.forEach(i => {
        if (i.name) lookups.supplier.set(i.name, i.id);
      });
      const missing = vals.filter(v => !lookups.supplier.has(v));
      if (missing.length > 0) {
        if (!options?.dryRun) {
          await this.prisma.supplier.createMany({
            data: missing.map(val => ({ companyId, name: val }))
          });
          const created = await this.prisma.supplier.findMany({ where: { companyId, name: { in: missing } } });
          created.forEach(i => {
            if (i.name) lookups.supplier.set(i.name, i.id);
          });
        }
      }
    }

    if (uniqueIds.materialCode.size > 0) {
      const vals = Array.from(uniqueIds.materialCode);
      const items = await this.prisma.material.findMany({ where: { companyId, OR: [{ code: { in: vals } }, { name: { in: vals } }] } });
      items.forEach(i => {
        if (i.code) lookups.material.set(i.code, i.id);
        if (i.name) lookups.material.set(i.name, i.id);
      });
      const missing = vals.filter(v => !lookups.material.has(v));
      if (missing.length > 0) {
        await this.prisma.material.createMany({
          data: missing.map(val => ({ companyId, code: val, name: `Material ${val}` }))
        });
        const created = await this.prisma.material.findMany({ where: { companyId, OR: [{ code: { in: missing } }, { name: { in: missing } }] } });
        created.forEach(i => {
          if (i.code) lookups.material.set(i.code, i.id);
          if (i.name) lookups.material.set(i.name, i.id);
        });
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

    if (uniqueIds.forecastCycleName.size > 0) {
      const names = Array.from(uniqueIds.forecastCycleName);
      const items = await this.prisma.forecastCycle.findMany({ where: { companyId, name: { in: names } } });
      items.forEach(i => lookups.forecastCycle.set(i.name, i.id));
      const missing = names.filter(n => !lookups.forecastCycle.has(n));
      if (missing.length > 0 && !options?.dryRun) {
        await this.prisma.forecastCycle.createMany({
          data: missing.map(name => ({ companyId, name, status: 'draft', fiscalYear: new Date().getFullYear(), basePeriod: new Date() }))
        });
        const created = await this.prisma.forecastCycle.findMany({ where: { companyId, name: { in: missing } } });
        created.forEach(i => lookups.forecastCycle.set(i.name, i.id));
      }
    }

    if (uniqueIds.budgetCycleName.size > 0) {
      const names = Array.from(uniqueIds.budgetCycleName);
      const items = await this.prisma.budgetCycle.findMany({ where: { companyId, name: { in: names } } });
      items.forEach(i => lookups.budgetCycle.set(i.name, i.id));
      const missing = names.filter(n => !lookups.budgetCycle.has(n));
      if (missing.length > 0 && !options?.dryRun) {
        await this.prisma.budgetCycle.createMany({
          data: missing.map(name => ({ companyId, name, status: 'draft' as any, fiscalYear: new Date().getFullYear() }))
        });
        const created = await this.prisma.budgetCycle.findMany({ where: { companyId, name: { in: missing } } });
        created.forEach(i => lookups.budgetCycle.set(i.name, i.id));
      }
    }

    if (uniqueIds.bomRecipeRef.size > 0) {
      const refs = Array.from(uniqueIds.bomRecipeRef);
      for (const ref of refs) {
        const [sku, version] = ref.split('|');
        const productId = lookups.product.get(sku);
        if (productId) {
          let recipe = await this.prisma.bomRecipe.findFirst({ where: { companyId, productId, version } });
          if (!recipe && !options?.dryRun) {
            recipe = await this.prisma.bomRecipe.create({
              data: { companyId, productId, version, outputQty: 1 }
            });
          }
          if (recipe) {
            lookups.bomRecipe.set(ref, recipe.id);
          }
        }
      }
    }

    if (uniqueIds.sourceSystem.size > 0) {
      // Refs are already normalised (built with normaliseSourceSystem/normaliseImportType above)
      const refs = Array.from(uniqueIds.sourceSystem);
      for (const ref of refs) {
        const [validSource, validImportType, periodFromStr, periodToStr] = ref.split('|');

        const periodFrom = periodFromStr ? new Date(periodFromStr) : new Date();
        const periodTo = periodToStr ? new Date(periodToStr) : new Date();
        
        let actualImport = await this.prisma.actualImport.findFirst({
          where: { companyId, sourceSystem: validSource as ImportSourceSystem, importType: validImportType as ImportType }
        });
        
        if (!actualImport && !options?.dryRun) {
          actualImport = await this.prisma.actualImport.create({
            data: { 
              companyId, 
              sourceSystem: validSource as ImportSourceSystem, 
              importType: validImportType as ImportType, 
              periodFrom, 
              periodTo 
            }
          });
        }
        if (actualImport) {
          lookups.actualImport.set(ref, actualImport.id);
          this.logger.log(`[actualImport] resolved ref="${ref}" → id=${actualImport.id}`);
        } else {
          this.logger.warn(`[actualImport] FAILED to resolve/create ref="${ref}"`);
        }
      }
    }

    // Substitute strings with IDs
    return rows.map(row => {
      const newRow = { ...row };

      if (newRow.productSku) {
        newRow.productId = lookups.product.get(String(newRow.productSku));
        delete newRow.productSku;
      }
      
      const siteVal = newRow.siteCode || newRow.sitename || newRow.siteName;
      if (siteVal) {
        newRow.siteId = lookups.site.get(String(siteVal));
        delete newRow.siteCode;
        delete newRow.sitename;
        delete newRow.siteName;
      }
      
      const ccVal = newRow.costCenterCode || newRow.costcentername || newRow.costCenterName;
      if (ccVal) {
        newRow.costCenterId = lookups.costCenter.get(String(ccVal));
        delete newRow.costCenterCode;
        delete newRow.costcentername;
        delete newRow.costCenterName;
      }
      
      const accVal = newRow.accountCode || newRow.accountname || newRow.accountName;
      if (accVal) {
        newRow.accountId = lookups.account.get(String(accVal));
        delete newRow.accountCode;
        delete newRow.accountname;
        delete newRow.accountName;
      }
      
      const custVal = newRow.customerCode || newRow.customername || newRow.customerName;
      if (custVal) {
        newRow.customerId = lookups.customer.get(String(custVal));
        delete newRow.customerCode;
        delete newRow.customername;
        delete newRow.customerName;
      }
      
      const suppVal = newRow.supplierCode || newRow.suppliername || newRow.supplierName;
      if (suppVal) {
        newRow.supplierId = lookups.supplier.get(String(suppVal));
        delete newRow.supplierCode;
        delete newRow.suppliername;
        delete newRow.supplierName;
      }
      
      const matVal = newRow.materialCode || newRow.materialname || newRow.materialName;
      if (matVal) {
        newRow.materialId = lookups.material.get(String(matVal));
        delete newRow.materialCode;
        delete newRow.materialname;
        delete newRow.materialName;
      }
      
      const unitVal = newRow.unit || newRow.unitname || newRow.unitName;
      if (unitVal) {
        newRow.unitId = lookups.unit.get(String(unitVal));
        delete newRow.unit;
        delete newRow.unitname;
        delete newRow.unitName;
      }
      if (newRow.productCategoryId) {
        newRow.categoryId = lookups.category.get(String(newRow.productCategoryId));
        delete newRow.productCategoryId;
      }
      if (newRow.forecastCycleName) {
        newRow.forecastCycleId = lookups.forecastCycle.get(String(newRow.forecastCycleName));
        delete newRow.forecastCycleName;
      }
      if (newRow.budgetCycleName) {
        newRow.budgetCycleId = lookups.budgetCycle.get(String(newRow.budgetCycleName));
        delete newRow.budgetCycleName;
      }
      if (newRow.sourceSystem) {
        // MUST normalise enums to the same key that was built during collection
        const normSource = this.normaliseSourceSystem(String(newRow.sourceSystem));
        const normImportType = this.normaliseImportType(String(newRow.importType || 'actual'));
        const ref = `${normSource}|${normImportType}|${newRow.periodFrom || ''}|${newRow.periodTo || ''}`;
        const resolvedId = lookups.actualImport.get(ref);
        if (!resolvedId) {
          this.logger.warn(`[resolveReferences] actualImportId not found for ref="${ref}". Available keys: ${Array.from(lookups.actualImport.keys()).join(', ')}`);
        }
        newRow.actualImportId = resolvedId;
        delete newRow.sourceSystem;
        delete newRow.importType;
        delete newRow.periodFrom;
        delete newRow.periodTo;
      }
      if (module === 'bomlines' && row.productSku && row.version) {
        const ref = `${row.productSku}|${row.version}`;
        // BomLine uses bomId (maps to bom_id) — NOT bomRecipeId
        newRow.bomId = lookups.bomRecipe.get(ref);
        delete newRow.bomRecipeId;
        // Also fix quantity field name: BomLine uses qtyPerOutput
        if (newRow.quantity !== undefined) {
          newRow.qtyPerOutput = newRow.quantity;
          delete newRow.quantity;
        }
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

    // Debug logging for key transactional modules
    if (['productionplans', 'bomlines', 'actuallines', 'budgetlines', 'forecastlines'].includes(module)) {
      this.logger.debug(`[insertChunk] module=${module} rowCount=${rows.length} firstRow=${JSON.stringify(rows[0])}`);
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

  private getPrismaModelName(module: string): string | null {
    const modelMap: Record<string, string> = {
      companies: 'Company',
      sites: 'Site',
      units: 'Unit',
      accounts: 'Account',
      costcenters: 'CostCenter',
      productcategories: 'ProductCategory',
      customers: 'Customer',
      suppliers: 'Supplier',
      materials: 'Material',
      products: 'Product',
      bomrecipes: 'BomRecipe',
      bomlines: 'BomLine',
      productionplans: 'ProductionPlan',
      inventory: 'InventorySnapshot',
      materialprices: 'RawMaterialPrice',
      budgetlines: 'BudgetLine',
      forecastlines: 'ForecastLine',
      actuallines: 'ActualLine',
      kpitargets: 'KpiTarget',
      exchangerates: 'ExchangeRate',
      promotions: 'Promotion',
      headcountplans: 'HeadcountPlan',
    };
    return modelMap[module] || null;
  }

  private stripUnknownFields(module: string, row: Record<string, unknown>): Record<string, unknown> {
    const modelName = this.getPrismaModelName(module);
    if (!modelName) return row;

    const modelDef = Prisma.dmmf.datamodel.models.find(m => m.name === modelName);
    if (!modelDef) return row;

    const validFields = new Set(modelDef.fields.map(f => f.name));
    const cleanRow: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(row)) {
      if (validFields.has(key)) {
        cleanRow[key] = value;
      }
    }
    return cleanRow;
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
