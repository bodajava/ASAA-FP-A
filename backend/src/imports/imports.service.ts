/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma } from '@prisma/client';
import * as XLSX from 'xlsx';
import { parse as csvParse } from 'csv-parse/sync';
import { SimpleCache } from '../common/utils/cache.util';
import {
  detectFileType,
  detectFileTypeFromBuffer,
  FileTypeMismatchError,
} from '../common/utils/file-type-detection.util';
import {
  getDefinition,
  resolveModuleKey,
  type ImportDefinition,
  type ImportColumnDef,
  type FkLookupDef,
} from './import-definitions';

type RowData = any;
type PrismaTx = Omit<
  PrismaService,
  | '$connect'
  | '$disconnect'
  | '$on'
  | '$transaction'
  | '$use'
  | '$extends'
  | 'onModuleInit'
  | 'onModuleDestroy'
>;

export interface MissingDataItem {
  type: string;
  value: string;
  row: number;
  column: string;
  howToFix: string;
}

export interface ImportErrorResponse {
  success: false;
  errorType: string;
  title: string;
  message: string;
  steps: string[];
  missingData: MissingDataItem[];
  actions: string[];
}

export interface RowPreviewResult {
  index: number;
  data: Record<string, any>;
  isValid: boolean;
  errors: string[];
}

export interface PreviewSummary {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  skippedRows: number;
  warnings: string[];
  errors: string[];
}

export interface PreviewResponse {
  summary: PreviewSummary;
  rows: RowPreviewResult[];
}

export interface ImportCommitResult {
  expectedRows: number;
  insertedRows: number;
  updatedRows: number;
  skippedRows: number;
  failedRows: number;
  dbVerified: boolean;
  beforeCount: number;
  afterCount: number;
}

const SUPPORTED_EXTENSIONS = /\.(csv|xlsx|xls)$/i;
const UNSUPPORTED_EXTENSIONS = /\.(numbers)$/i;

@Injectable()
export class ImportsService {
  private readonly logger = new Logger(ImportsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /* ─── Resolve module key with backward compat ──────────────────────── */

  private resolve(mod: string): string | undefined {
    return resolveModuleKey(mod) ?? (getDefinition(mod) ? mod : undefined);
  }

  /* ─── Date parsing (Excel serial + string) ─────────────────────────── */

  private parseDateValue(value: unknown): Date | null {
    if (value == null || value === '') return null;

    const num = Number(value);
    if (!isNaN(num) && Number.isInteger(num) && num > 40000 && num < 200000) {
      const adjusted = num >= 61 ? num - 2 : num - 1;
      const date = new Date(Date.UTC(1899, 11, 30));
      date.setUTCDate(date.getUTCDate() + adjusted);
      if (!isNaN(date.getTime())) return date;
    }

    const d = new Date(String(value));
    if (!isNaN(d.getTime())) return d;

    return null;
  }

  /* ─── Normalize row keys via definition column aliases ─────────────── */

  private normalizeKeys(row: RowData, module?: string): RowData {
    const normalized: RowData = {};
    for (const key of Object.keys(row)) {
      const cleanKey = key
        .replace(/\s+/g, '')
        .replace(/_+/g, '')
        .replace(/-+/g, '')
        .toLowerCase();
      normalized[cleanKey] = row[key];
    }

    if (module) {
      const resolved = this.resolve(module);
      if (resolved) {
        const def = getDefinition(resolved);
        if (def) {
          const aliasToField = new Map<string, string>();
          for (const col of def.columns) {
            aliasToField.set(col.field.toLowerCase(), col.field);
            for (const alias of col.aliases) {
              const clean = alias.toLowerCase().replace(/[\s_-]+/g, '');
              aliasToField.set(clean, col.field);
            }
          }

          for (const [key, value] of Object.entries(normalized)) {
            const field = aliasToField.get(key.toLowerCase());
            if (field && field !== key) {
              normalized[field] = value;
            }
          }
        }
      }
    }

    return normalized;
  }

  /* ─── Generic FK Resolution ────────────────────────────────────────── */

  private async resolveFKColumn(
    fk: FkLookupDef,
    value: string,
    companyId: bigint,
    errors: string[],
    rowNum?: number,
  ): Promise<bigint | null> {
    const trimmed = String(value).trim();
    if (!trimmed) return null;

    const prismaModel = (this.prisma as any)[fk.model] as any;
    if (!prismaModel?.findFirst) return null;

    const orConditions = fk.lookupFields.map((f) => {
      if (f === 'name' || f === 'code' || f === 'sku') {
        return { [f]: trimmed, companyId };
      }
      return { [f]: trimmed, companyId };
    });

    const record = await prismaModel.findFirst({
      where: orConditions.length > 1 ? { OR: orConditions } : orConditions[0],
      select: { id: true },
    });

    if (record) return record.id;

    const rowInfo = rowNum ? ` (row ${rowNum})` : '';
    errors.push(
      `${fk.label} "${value}" was not found${rowInfo}. Please import ${fk.label}s first.`,
    );
    return null;
  }

  /* ─── Resolve Transaction References ───────────────────────────────── */

  private async resolveTransactionReferences(
    row: RowData,
    module: string,
    companyId: bigint,
    errors: string[],
    rowNum: number,
  ): Promise<RowData> {
    const resolved = { ...row };
    const resolvedMod = this.resolve(module);
    if (!resolvedMod) return resolved;

    const def = getDefinition(resolvedMod);
    if (!def) return resolved;

    for (const col of def.columns) {
      if (!col.fkLookup) continue;
      const raw = row[col.field];
      if (raw == null || raw === '') continue;

      const fkId = await this.resolveFKColumn(
        col.fkLookup,
        String(raw),
        companyId,
        errors,
        rowNum,
      );
      if (fkId !== null) {
        resolved[col.fkLookup.assignField] = fkId;
      }
    }

    return resolved;
  }

  /* ─── Month parsing ────────────────────────────────────────────────── */

  private parseMonthValue(value: string | number): number | null {
    if (value === null || value === undefined || value === '') return null;

    if (typeof value === 'number') {
      return value >= 1 && value <= 12 ? value : null;
    }

    const strVal = String(value).trim().toLowerCase();

    const arabicMonths: Record<string, number> = {
      يناير: 1, فبراير: 2, مارس: 3, أبريل: 4, مايو: 5, يونيو: 6,
      يوليو: 7, أغسطس: 8, سبتمبر: 9, أكتوبر: 10, نوفمبر: 11, ديسمبر: 12,
    };
    if (arabicMonths[strVal]) return arabicMonths[strVal];

    const monthMap: Record<string, number> = {
      jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3,
      apr: 4, april: 4, may: 5, jun: 6, june: 6, jul: 7, july: 7,
      aug: 8, august: 8, sep: 9, september: 9, oct: 10, october: 10,
      nov: 11, november: 11, dec: 12, december: 12,
    };
    if (monthMap[strVal]) return monthMap[strVal];

    if (/^Q[1-4]$/i.test(strVal)) {
      const q = parseInt(strVal[1], 10);
      return (q - 1) * 3 + 1;
    }

    const num = parseInt(strVal, 10);
    if (!isNaN(num) && num >= 1 && num <= 12) return num;

    return null;
  }

  /* ─── Preview ──────────────────────────────────────────────────────── */

  async preview(
    module: string,
    fileContent: string,
    fileName: string,
    companyId: bigint,
    tenantId: bigint,
  ): Promise<PreviewResponse> {
    const lowerName = fileName.toLowerCase();
    if (UNSUPPORTED_EXTENSIONS.test(lowerName)) {
      throw new BadRequestException(
        'Apple Numbers files (.numbers) are not supported. Please export your spreadsheet as CSV or Excel (.xlsx) before uploading.',
      );
    }
    if (!SUPPORTED_EXTENSIONS.test(lowerName)) {
      throw new BadRequestException(
        'This file type is not supported. Please upload a CSV (.csv) or Excel (.xlsx, .xls) file.',
      );
    }

    let rawRows: RowData[] = [];
    let detectedFileType: 'csv' | 'xlsx' | 'xls' = 'csv';

    try {
      const buffer = Buffer.from(fileContent, 'base64');

      if (buffer.length === 0) {
        throw new BadRequestException(
          'The uploaded file is empty. Please add data before importing.',
        );
      }

      const typeResult = detectFileType(buffer, fileName);
      detectedFileType = typeResult.detectedType;

      if (typeResult.mismatch) {
        throw new FileTypeMismatchError(
          lowerName.split('.').pop() || 'unknown',
          typeResult.detectedType,
        );
      }

      if (detectedFileType === 'csv') {
        rawRows = this.parseCsvSafe(buffer);
      } else {
        rawRows = this.parseExcelSafe(buffer, detectedFileType);
      }
    } catch (err: unknown) {
      if (err instanceof BadRequestException) throw err;
      if (err instanceof FileTypeMismatchError) {
        throw new BadRequestException(err.message);
      }
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('Invalid Opening Quote') || message.includes('PK')) {
        throw new BadRequestException(
          'The uploaded file format does not match its extension. ' +
            'The file appears to be an Excel workbook saved with a .csv extension. ' +
            'Please rename it with the correct .xlsx extension.',
        );
      }
      throw new BadRequestException(
        'The uploaded file could not be parsed. ' +
          'Please ensure the file is not corrupted and is in CSV or Excel format.',
      );
    }

    if (rawRows.length === 0) {
      throw new BadRequestException(
        'The uploaded template contains no data. Please add at least one row before importing.',
      );
    }

    const results: RowPreviewResult[] = [];
    const allWarnings: string[] = [];
    const allErrors: string[] = [];

    const mod = this.resolve(module) ?? module;
    for (let i = 0; i < rawRows.length; i++) {
      const rawRow = rawRows[i];
      const normalized = this.normalizeKeys(rawRow, mod);
      const errors: string[] = [];

      const resolved = await this.resolveTransactionReferences(
        normalized,
        mod,
        companyId,
        errors,
        i + 1,
      );

      await this.validateRow(mod, resolved, companyId, tenantId, errors);

      if (errors.length > 0) {
        allErrors.push(...errors.map((e) => `Row ${i + 1}: ${e}`));
      }

      results.push({
        index: i + 1,
        data: rawRow,
        isValid: errors.length === 0,
        errors,
      });
    }

    const summary: PreviewSummary = {
      totalRows: rawRows.length,
      validRows: results.filter((r) => r.isValid).length,
      invalidRows: results.filter((r) => !r.isValid).length,
      skippedRows: 0,
      warnings: allWarnings,
      errors: allErrors,
    };

    return { summary, rows: results };
  }

  /* ─── CSV / Excel Parsers ──────────────────────────────────────────── */

  private parseCsvSafe(buffer: Buffer): RowData[] {
    try {
      return csvParse(buffer.toString('utf-8'), {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('Invalid Opening Quote')) {
        throw new BadRequestException(
          'The uploaded file format does not match its extension. ' +
            'This file appears to be an Excel workbook (.xlsx) saved with a .csv extension. ' +
            'Please rename it with the correct .xlsx extension and upload again.',
        );
      }
      throw new BadRequestException(
        'The CSV file could not be parsed. Please ensure it uses proper CSV formatting with comma-separated values.',
      );
    }
  }

  private parseExcelSafe(buffer: Buffer, fileType: 'xlsx' | 'xls'): RowData[] {
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        throw new BadRequestException(
          'The Excel workbook contains no sheets. Please ensure the file is not empty.',
        );
      }
      const sheet = workbook.Sheets[sheetName];
      return XLSX.utils.sheet_to_json(sheet);
    } catch (err: unknown) {
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException(
        `The ${fileType === 'xlsx' ? 'Excel' : 'Excel 97-2003'} file could not be parsed. ` +
          'Please ensure the file is not corrupted.',
      );
    }
  }

  parseExcelAllSheets(
    buffer: Buffer,
  ): { sheetName: string; rows: RowData[] }[] {
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      return workbook.SheetNames.map((name) => {
        const sheet = workbook.Sheets[name];
        return {
          sheetName: name,
          rows: XLSX.utils.sheet_to_json(sheet),
        };
      });
    } catch {
      return [];
    }
  }

  /* ─── Validate Row (data-driven from definition) ───────────────────── */

  private async validateRow(
    module: string,
    row: RowData,
    companyId: bigint,
    tenantId: bigint,
    errors: string[],
  ): Promise<void> {
    const mod = this.resolve(module) ?? module;
    const def = getDefinition(mod);
    if (!def) {
      errors.push(`Unknown module: ${module}`);
      return;
    }

    for (const col of def.columns) {
      const val = row[col.field];

      if (col.required && (val === undefined || val === null || val === '')) {
        errors.push(`${col.display} is required.`);
        continue;
      }

      if (val === undefined || val === null || val === '') continue;

      if (col.type === 'number') {
        const num = Number(val);
        if (isNaN(num)) {
          errors.push(`${col.display} must be a number.`);
        }
      }

      if (col.type === 'date') {
        const parsed = this.parseDateValue(val);
        if (!parsed) {
          errors.push(`${col.display} must be a valid date.`);
        }
      }

      if (col.type === 'enum' && col.allowedValues && col.allowedValues.length > 0) {
        const strVal = String(val).trim().toLowerCase();
        const allowedLower = col.allowedValues.map((a) => a.toLowerCase());
        if (!allowedLower.includes(strVal)) {
          errors.push(
            `${col.display} must be one of: ${col.allowedValues.join(', ')}.`,
          );
        }
      }

      if (col.fkLookup && !row[col.fkLookup.assignField]) {
        const raw = String(val).trim();
        if (raw) {
          const id = await this.resolveFKColumn(col.fkLookup, raw, companyId, errors);
          if (id !== null) {
            row[col.fkLookup.assignField] = id;
          }
        }
      }
    }

    if (mod === 'accounts') {
      if (row['code'] && companyId) {
        const exists = await this.prisma.account.findFirst({
          where: { code: String(row['code']).trim(), companyId },
        });
        if (exists) {
          errors.push(`Account Code "${row['code']}" already exists in the company.`);
        }
      }
    }


  }

  /* ─── Get Sample CSV (backward compat) ─────────────────────────────── */

  getSampleCSV(module: string): string {
    const mod = this.resolve(module) ?? module;
    const def = getDefinition(mod);
    if (!def) return '';

    const headers = def.columns.map((c) => c.display).join(',');
    const rows = def.sampleRows
      .slice(0, 3)
      .map((r) => r.join(','))
      .join('\n');

    return rows ? `${headers}\n${rows}` : headers;
  }

  /* ─── Generate Error CSV ───────────────────────────────────────────── */

  generateErrorCsv(
    rows: Array<{
      index: number;
      data: Record<string, unknown>;
      isValid: boolean;
      errors: string[];
    }>,
    module: string,
    type: 'errors' | 'skipped',
  ): string {
    const filtered =
      type === 'errors'
        ? rows.filter((r) => !r.isValid)
        : rows.filter((r) => r.isValid);

    if (filtered.length === 0) return '';

    const allKeys = new Set<string>();
    for (const row of filtered) {
      for (const key of Object.keys(row.data)) {
        allKeys.add(key);
      }
    }
    const columns = Array.from(allKeys);

    const header = ['Row', ...columns, 'Errors'].join(',');
    const lines = filtered.map((row) => {
      const values = columns.map((col) => {
        const val = row.data[col];
        if (val == null) return '';
        const str = String(val);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      });
      return [row.index, ...values, row.errors.join('; ')].join(',');
    });

    return [header, ...lines].join('\n');
  }

  /* ─── Commit ───────────────────────────────────────────────────────── */

  async commit(
    module: string,
    rows: RowData[],
    companyId: bigint,
    tenantId: bigint,
    userId: bigint,
  ): Promise<ImportCommitResult> {
    const mod = this.resolve(module) ?? module;

    const def = getDefinition(mod);
    if (!def) {
      throw new BadRequestException(`Unknown module: ${module}`);
    }

    const validRows: RowData[] = [];
    let failCount = 0;

    for (const rawRow of rows) {
      const normalized = this.normalizeKeys(rawRow, mod);
      const errors: string[] = [];
      const resolved = await this.resolveTransactionReferences(
        normalized,
        mod,
        companyId,
        errors,
        0,
      );
      await this.validateRow(mod, resolved, companyId, tenantId, errors);
      if (errors.length === 0) {
        validRows.push(resolved);
      } else {
        failCount++;
      }
    }

    const expectedRows = validRows.length;
    if (expectedRows === 0) {
      return {
        expectedRows: 0,
        insertedRows: 0,
        updatedRows: 0,
        skippedRows: 0,
        failedRows: failCount,
        dbVerified: true,
        beforeCount: 0,
        afterCount: 0,
      };
    }

    const isUpdateOnly = def.updateOnly;

    const {
      beforeCount,
      afterCount,
      actualInserts,
      actualUpdates,
      actualSkips,
    } = await this.prisma.$transaction(async (tx) => {
      const execCount = async (): Promise<number> => {
        if (def.countQuery) {
          return eval(`tx.${def.countQuery}`);
        }
        return (tx as any)[def.prismaModel].count({ where: { companyId } }) as Promise<number>;
      };

      const before = await execCount();

      let ins = 0;
      let upd = 0;
      let skp = 0;

      for (const row of validRows) {
        const handled = await this.commitRow(mod, row, companyId, tenantId, userId, tx);
        if (handled === 'insert') ins++;
        else if (handled === 'update') upd++;
        else skp++;
      }

      const after = await execCount();

      return { beforeCount: before, afterCount: after, actualInserts: ins, actualUpdates: upd, actualSkips: skp };
    });

    let dbVerified = true;
    const netIncrease = afterCount - beforeCount;

    if (!isUpdateOnly && def.hasCompanyId) {
      if (netIncrease !== actualInserts) {
        dbVerified = false;
        this.logger.error({
          operation: 'import-commit-verify',
          module: mod,
          companyId: companyId.toString(),
          userId: userId.toString(),
          expectedInserts: actualInserts,
          actualNetIncrease: netIncrease,
          beforeCount,
          afterCount,
          message: `DB count mismatch: expected +${actualInserts} rows, got +${netIncrease}`,
        });
      }
    }

    if (actualInserts > 0 && netIncrease === 0 && !isUpdateOnly && def.hasCompanyId) {
      dbVerified = false;
      this.logger.error({
        operation: 'import-commit-zero-insert',
        module: mod,
        companyId: companyId.toString(),
        userId: userId.toString(),
        error: `Expected ${actualInserts} inserts but DB count did not change (before=${beforeCount}, after=${afterCount})`,
        stack: new Error().stack,
      });
      throw new InternalServerErrorException(
        `Import verification failed: expected ${actualInserts} row(s) to be inserted but the database count did not change. No data was persisted.`,
      );
    }

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        entityType: 'Import',
        entityId: null,
        action: 'import',
        newValues: JSON.stringify({
          module: mod,
          expectedRows,
          insertedRows: actualInserts,
          updatedRows: actualUpdates,
          skippedRows: actualSkips,
          failedRows: failCount,
          beforeCount,
          afterCount,
          dbVerified,
        }),
      },
    });

    SimpleCache.clear();

    this.logger.log({
      operation: 'import-commit',
      module: mod,
      companyId: companyId.toString(),
      userId: userId.toString(),
      expectedRows,
      insertedRows: actualInserts,
      updatedRows: actualUpdates,
      skippedRows: actualSkips,
      failedRows: failCount,
      beforeCount,
      afterCount,
      dbVerified,
    });

    return {
      expectedRows,
      insertedRows: actualInserts,
      updatedRows: actualUpdates,
      skippedRows: actualSkips,
      failedRows: failCount,
      dbVerified,
      beforeCount,
      afterCount,
    };
  }

  /* ─── Commit Single Row (dispatched by definition strategy) ────────── */

  private async commitRow(
    mod: string,
    row: RowData,
    companyId: bigint,
    tenantId: bigint,
    userId: bigint,
    tx: PrismaTx,
  ): Promise<'insert' | 'update' | 'skip'> {
    const def = getDefinition(mod);
    if (!def) return 'skip';

    switch (def.strategy) {
      case 'insert-child':
        return this.commitInsertChild(mod, row, companyId, tenantId, userId, tx);

      case 'update':
        return this.commitUpdate(mod, row, companyId, tx);

      default:
        return this.commitSimpleInsert(mod, row, companyId, tenantId, userId, tx);
    }
  }

  /* ─── Simple Insert ────────────────────────────────────────────────── */

  private coerceValue(val: unknown, col: ImportColumnDef): unknown {
    if (val === undefined || val === null || val === '') return undefined;
    if (col.type === 'number') {
      const n = Number(val);
      return isNaN(n) ? undefined : n;
    }
    if (col.type === 'date') {
      return this.parseDateValue(val) ?? undefined;
    }
    if (col.type === 'boolean') {
      if (typeof val === 'boolean') return val;
      return ['true', 'yes', '1', 'active'].includes(String(val).toLowerCase().trim());
    }
    if (col.type === 'string') {
      return String(val).trim();
    }
    return val;
  }

  private async commitSimpleInsert(
    mod: string,
    row: RowData,
    companyId: bigint,
    tenantId: bigint,
    userId: bigint,
    tx: PrismaTx,
  ): Promise<'insert' | 'update' | 'skip'> {
    const def = getDefinition(mod)!;
    const data: Record<string, unknown> = {};

    for (const col of def.columns) {
      const field = col.prismaField ?? col.field;

      if (col.fkLookup && row[col.fkLookup.assignField]) {
        data[col.fkLookup.assignField] = row[col.fkLookup.assignField];
        continue;
      }

      const raw = row[col.field] ?? row[field];
      const coerced = this.coerceValue(raw, col);
      if (coerced !== undefined) {
        data[field] = coerced;
      } else if (col.defaultValue !== undefined) {
        data[field] = col.defaultValue;
      }
    }

    if (def.hasCompanyId) {
      data.companyId = companyId;
    }
    if (def.prismaModel === 'company') {
      data.tenantId = companyId;
    }

    try {
      await (tx as any)[def.prismaModel].create({ data });
      return 'insert';
    } catch (err: unknown) {
      this.logger.warn({ mod, row, error: String(err) });
      return 'skip';
    }
  }

  /* ─── Insert-Child Strategy (parent find-or-create + child create) ─── */

  private async commitInsertChild(
    mod: string,
    row: RowData,
    companyId: bigint,
    tenantId: bigint,
    userId: bigint,
    tx: PrismaTx,
  ): Promise<'insert' | 'skip'> {
    const def = getDefinition(mod)!;

    switch (def.moduleKey) {
      case 'bom-recipes': {
        const product = await (tx as any).product.findFirst({
          where: { sku: String(row.productsku).trim(), companyId },
        });
        if (!product) return 'skip';

        const material = await (tx as any).material.findFirst({
          where: { code: String(row.materialcode).trim(), companyId },
        });
        if (!material) return 'skip';

        const version = row.version ? String(row.version).trim() : 'v1';
        let recipe = await (tx as any).bomRecipe.findFirst({
          where: { productId: product.id, version, companyId },
        });
        if (!recipe) {
          recipe = await (tx as any).bomRecipe.create({
            data: {
              companyId,
              productId: product.id,
              version,
              outputQty: row.outputqty ? Number(row.outputqty) : 1,
              wastagePct: row.wastagepct ? Number(row.wastagepct) : 0,
              laborCost: row.laborcost ? Number(row.laborcost) : 0,
              overheadCost: row.overheadcost ? Number(row.overheadcost) : 0,
            },
          });
        }
        await (tx as any).bomLine.create({
          data: {
            bomId: recipe.id,
            materialId: material.id,
            qtyPerOutput: Number(row.qtyperoutput),
            wastagePct: row.bomlinewastagepct ? Number(row.bomlinewastagepct) : 0,
          },
        });
        return 'insert';
      }

      case 'budget-lines': {
        const acc = await (tx as any).account.findFirst({
          where: { OR: [{ code: String(row.accountcode).trim(), companyId }, { name: String(row.accountcode).trim(), companyId }], isActive: true },
        });
        if (!acc) return 'skip';

        const fiscalYear = Number(row.fiscalyear);
        const cycleName = String(row.budgetcyclename).trim();
        let cycle = await (tx as any).budgetCycle.findFirst({
          where: { name: cycleName, fiscalYear, companyId },
        });
        if (!cycle) {
          cycle = await (tx as any).budgetCycle.create({
            data: { companyId, name: cycleName, fiscalYear, status: 'draft', createdBy: userId },
          });
        }

        await (tx as any).budgetLine.create({
          data: {
            budgetCycleId: cycle.id,
            accountId: acc.id,
            siteId: row.siteId ?? null,
            costCenterId: row.costCenterId ?? null,
            productId: row.productId ?? null,
            materialId: row.materialId ?? null,
            customerId: row.customerId ?? null,
            periodMonth: Number(row.periodmonth),
            quantity: row.quantity ? Number(row.quantity) : 0,
            unitPrice: row.unitprice ? Number(row.unitprice) : 0,
            amount: Number(row.amount),
            notes: row.notes ? String(row.notes).trim() : null,
          },
        });
        return 'insert';
      }

      case 'forecast-lines': {
        const acc = await (tx as any).account.findFirst({
          where: { OR: [{ code: String(row.accountcode).trim(), companyId }, { name: String(row.accountcode).trim(), companyId }], isActive: true },
        });
        if (!acc) return 'skip';

        const fiscalYear = Number(row.fiscalyear);
        const cycleName = String(row.forecastcyclename).trim();
        let cycle = await (tx as any).forecastCycle.findFirst({
          where: { name: cycleName, fiscalYear, companyId },
        });
        if (!cycle) {
          cycle = await (tx as any).forecastCycle.create({
            data: { companyId, name: cycleName, fiscalYear, basePeriod: new Date(fiscalYear, 0, 1), status: 'draft', createdBy: userId },
          });
        }

        await (tx as any).forecastLine.create({
          data: {
            forecastCycleId: cycle.id,
            accountId: acc.id,
            siteId: row.siteId ?? null,
            costCenterId: row.costCenterId ?? null,
            productId: row.productId ?? null,
            materialId: row.materialId ?? null,
            customerId: row.customerId ?? null,
            periodMonth: Number(row.periodmonth),
            quantity: row.quantity ? Number(row.quantity) : 0,
            unitPrice: row.unitprice ? Number(row.unitprice) : 0,
            amount: Number(row.amount),
            driverType: row.drivertype ? String(row.drivertype).trim() : null,
            notes: row.notes ? String(row.notes).trim() : null,
          },
        });
        return 'insert';
      }

      case 'actual-lines': {
        const acc = await (tx as any).account.findFirst({
          where: { OR: [{ code: String(row.accountcode).trim(), companyId }, { name: String(row.accountcode).trim(), companyId }], isActive: true },
        });
        if (!acc) return 'skip';

        const transactionDate = new Date(row.transactiondate);
        const fiscalYear = transactionDate.getFullYear();

        let imp = await (tx as any).actualImport.findFirst({
          where: { companyId, importType: 'gl', status: 'posted' },
        });
        if (!imp) {
          imp = await (tx as any).actualImport.create({
            data: { companyId, importType: 'gl', periodFrom: new Date(fiscalYear, 0, 1), periodTo: new Date(fiscalYear, 11, 31), status: 'posted', importedBy: userId },
          });
        }

        await (tx as any).actualLine.create({
          data: {
            actualImportId: imp.id,
            accountId: acc.id,
            siteId: row.siteId ?? null,
            costCenterId: row.costCenterId ?? null,
            productId: row.productId ?? null,
            materialId: row.materialId ?? null,
            customerId: row.customerId ?? null,
            transactionDate,
            quantity: row.quantity ? Number(row.quantity) : 0,
            unitPrice: row.unitprice ? Number(row.unitprice) : 0,
            amount: Number(row.amount),
            referenceNo: row.referenceno ? String(row.referenceno).trim() : null,
          },
        });
        return 'insert';
      }

      default:
        return 'skip';
    }
  }

  /* ─── Update Strategy ──────────────────────────────────────────────── */

  private async commitUpdate(
    mod: string,
    row: RowData,
    companyId: bigint,
    tx: PrismaTx,
  ): Promise<'insert' | 'update' | 'skip'> {
    const def = getDefinition(mod)!;

    switch (def.moduleKey) {
      case 'yield-waste': {
        const product = await (tx as any).product.findFirst({
          where: { sku: String(row.productsku).trim(), companyId },
        });
        if (!product) return 'skip';

        const recipe = await (tx as any).bomRecipe.findFirst({
          where: { productId: product.id, companyId, isActive: true },
        });
        if (!recipe) return 'skip';

        const updateData: Record<string, unknown> = {};
        if (row.wastagepct !== undefined && row.wastagepct !== '') {
          updateData.wastagePct = Number(row.wastagepct);
        }

        if (Object.keys(updateData).length > 0) {
          await (tx as any).bomRecipe.update({
            where: { id: recipe.id },
            data: updateData,
          });
          return 'update';
        }
        return 'skip';
      }

      case 'raw-material-prices': {
        const material = await (tx as any).material.findFirst({
          where: { code: String(row.materialcode).trim(), companyId },
        });
        if (!material) return 'skip';

        const effectiveDate = this.parseDateValue(row.effectivedate) ?? new Date();

        await (tx as any).material.update({
          where: { id: material.id },
          data: { purchasePrice: Number(row.price) },
        });

        await (tx as any).rawMaterialPrice.create({
          data: {
            companyId,
            materialId: material.id,
            price: Number(row.price),
            priceDate: effectiveDate,
          },
        });
        return 'insert';
      }

      default:
        return 'skip';
    }
  }
}
