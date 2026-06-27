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
  ImportError, ImportReport, SheetValidationResult,
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
    companyId: number,
    options?: { dryRun?: boolean; skipErrors?: boolean },
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
    companyId: number,
    options?: { dryRun?: boolean; skipErrors?: boolean },
  ): Promise<SheetImportResult> {
    const startTime = Date.now();
    const { analysis, rows, mappings, validation } = sheet;

    this.logger.log(`Importing sheet "${analysis.sheetName}" → module "${analysis.erpModule}" (${rows.length} rows)`);

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
      };
    }

    // Filter out rows with errors (unless skipErrors)
    const importableRows = options?.skipErrors
      ? rows.filter((_, i) => !validation.errorRowNumbers.includes(i + 1))
      : rows.filter((_, i) => validation.errorRowNumbers.length === 0 || !validation.errorRowNumbers.includes(i + 1));

    // Build column map for this module
    const columnMap = this.buildColumnMap(mappings);

    // Process in chunks
    let insertedCount = 0;
    const errors: ImportError[] = [];
    const chunks = this.chunkArray(importableRows, this.CHUNK_SIZE);

    for (let chunkIdx = 0; chunkIdx < chunks.length; chunkIdx++) {
      const chunk = chunks[chunkIdx];
      const mappedChunk = chunk.map(row => this.mapRow(row, columnMap, companyId));

      try {
        const result = await this.insertChunk(analysis.erpModule, mappedChunk);
        insertedCount += result.count;
        this.logger.debug(`Chunk ${chunkIdx + 1}/${chunks.length}: inserted ${result.count} rows`);
      } catch (err) {
        this.logger.error(`Chunk ${chunkIdx + 1} failed: ${err}`);
        // Add errors for all rows in this chunk
        chunk.forEach((row, i) => {
          errors.push({
            row: chunkIdx * this.CHUNK_SIZE + i + 1,
            column: '_chunk',
            message: `Batch insert failed: ${err}`,
            value: null,
          });
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
    companyId: number,
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

  /* ─── Database Insert ──────────────────────────────────────────────── */

  private async insertChunk(
    module: string,
    rows: Record<string, unknown>[],
  ): Promise<{ count: number }> {
    if (rows.length === 0) return { count: 0 };

    // Map module to Prisma model
    const model = this.getPrismaModel(module);
    if (!model) {
      throw new Error(`Unknown module: ${module}`);
    }

    // Use createMany for batch insert
    const result = await (model as any).createMany({
      data: rows,
      skipDuplicates: true,
    });

    return { count: result.count };
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

    return reports;
  }
}
