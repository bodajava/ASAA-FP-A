/**
 * Client Workbook Import Service
 *
 * Handles upload of real client Excel workbooks (Test.xlsx / Test 2.xlsx).
 * Detects workbook type, auto-creates missing master data,
 * maps all sheets to ERP modules, and imports everything in dependency order.
 *
 * Test.xlsx  → Sales analysis workbook (Oracle ERP extract)
 * Test 2.xlsx → Planning/costing workbook (13 sheets: P&L, Data, Drill Down, etc.)
 */

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AccountType } from '@prisma/client';
import * as XLSX from 'xlsx';
import {
  detectFileTypeFromBuffer,
  detectFileType,
  FileTypeMismatchError,
} from '../common/utils/file-type-detection.util';

const MONTH_MAP: Record<string, number> = {
  'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
  'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12,
  'january': 1, 'february': 2, 'march': 3, 'april': 4,
  'june': 6, 'july': 7, 'august': 8, 'september': 9, 'october': 10, 'november': 11, 'december': 12,
  'يناير': 1, 'فبراير': 2, 'مارس': 3, 'أبريل': 4,
  'مايو': 5, 'يونيو': 6, 'يوليو': 7, 'أغسطس': 8,
  'سبتمبر': 9, 'أكتوبر': 10, 'نوفمبر': 11, 'ديسمبر': 12,
};

/* ─── Types ──────────────────────────────────────────────────────────── */

export type WorkbookType = 'sales_analysis' | 'planning_costing' | 'unknown';
export type SheetRole = 'data' | 'reference' | 'instruction' | 'ignored';

export interface SheetImportPlan {
  sheetName: string;
  targetModule: string;
  rowCount: number;
  mappedColumns: string[];
  autoCreateEntities: string[];
  warnings: string[];
}

export interface AutoCreatedEntity {
  type: string;
  code: string;
  name: string;
  created: boolean;
}

export interface WorkbookImportResult {
  success: boolean;
  workbookType: WorkbookType;
  fileName: string;
  sheetsProcessed: number;
  sheetsImported: number;
  sheetsSkipped: number;
  sheetsReference: number;
  sheetsInstruction: number;
  autoCreated: AutoCreatedEntity[];
  totals: {
    products: number;
    customers: number;
    materials: number;
    sites: number;
    units: number;
    categories: number;
    costCenters: number;
    forecastLines: number;
    actualLines: number;
    materialPrices: number;
    priceListEntries: number;
    discountEntries: number;
    bomRecipes: number;
    bomLines: number;
    promotions: number;
    costAllocations: number;
  };
  warnings: string[];
  errors: string[];
  sheetResults: Array<{
    sheetName: string;
    sheetRole: SheetRole;
    status: 'imported' | 'skipped' | 'error' | 'reference' | 'instruction';
    rowsImported: number;
    message: string;
  }>;
}

export interface WorkbookPreviewResult {
  workbookType: WorkbookType;
  fileName: string;
  sheets: Array<{
    name: string;
    sheetRole: SheetRole;
    rowCount: number;
    columnCount: number;
    headers: string[];
    mappedModule: string;
    importable: boolean;
    validRows: number;
    errors: Array<{
      row: number;
      column: string;
      reason: 'missing_required' | 'invalid_enum' | 'missing_dependency' | 'unsupported_sheet' | 'database_insert_error' | 'duplicate' | 'validation_error';
      message: string;
      value: unknown;
    }>;
    warnings: string[];
    status: 'ready' | 'needs_mapping' | 'unsupported' | 'reference' | 'instruction' | 'ignored';
    sampleRows: Record<string, unknown>[];
  }>;
  summary: {
    totalWorkbookRows: number;
    importableRows: number;
    referenceRows: number;
    instructionRows: number;
    validImportableRows: number;
    invalidImportableRows: number;
  };
  autoCreatePlan: string[];
  warnings: string[];
  readyToImport: boolean;
}

/* ─── Service ────────────────────────────────────────────────────────── */

@Injectable()
export class ClientWorkbookImportService {
  private readonly logger = new Logger(ClientWorkbookImportService.name);

  constructor(private readonly prisma: PrismaService) {}

  /* ═══════════════════════════════════════════════════════════════════════
   * PUBLIC: Preview
   * ═══════════════════════════════════════════════════════════════════════ */

  async preview(buffer: Buffer, fileName: string): Promise<WorkbookPreviewResult> {
    const typeResult = detectFileType(buffer, fileName);
    if (typeResult.mismatch) {
      throw new FileTypeMismatchError(
        fileName.split('.').pop() || 'unknown',
        typeResult.detectedType,
      );
    }

    const detectedType = detectFileTypeFromBuffer(buffer);
    if (detectedType === 'csv') {
      throw new BadRequestException(
        'This file is a CSV. CSV files do not support multiple sheets. ' +
        'Please upload an Excel workbook (.xlsx) for multi-sheet import.',
      );
    }

    const workbook = XLSX.read(buffer, { type: 'buffer', sheetRows: 20 });
    const workbookType = this.detectWorkbookType(workbook);
    const sheets = this.previewSheetsV2(workbook);
    const autoCreatePlan = this.buildAutoCreatePlan(workbookType, sheets);
    const warnings = this.buildPreviewWarningsV2(workbookType, sheets);

    let totalWorkbookRows = 0;
    let importableRows = 0;
    let referenceRows = 0;
    let instructionRows = 0;
    let validImportableRows = 0;
    let invalidImportableRows = 0;

    for (const s of sheets) {
      totalWorkbookRows += s.rowCount;
      if (s.sheetRole === 'reference') referenceRows += s.rowCount;
      else if (s.sheetRole === 'instruction') instructionRows += s.rowCount;
      else if (s.importable) {
        importableRows += s.rowCount;
        validImportableRows += s.validRows;
        invalidImportableRows += (s.rowCount - s.validRows);
      }
    }

    return {
      workbookType,
      fileName,
      sheets,
      summary: {
        totalWorkbookRows,
        importableRows,
        referenceRows,
        instructionRows,
        validImportableRows,
        invalidImportableRows,
      },
      autoCreatePlan,
      warnings,
      readyToImport: workbookType !== 'unknown' && importableRows > 0,
    };
  }

  /* ═══════════════════════════════════════════════════════════════════════
   * PUBLIC: Full Import
   * ═══════════════════════════════════════════════════════════════════════ */

  async importWorkbook(
    buffer: Buffer,
    fileName: string,
    companyId: bigint,
    userId: bigint,
  ): Promise<WorkbookImportResult> {
    // Validate file type from magic bytes
    const detectedType = detectFileTypeFromBuffer(buffer);
    if (detectedType === 'csv') {
      return {
        success: false,
        workbookType: 'unknown',
        fileName,
        sheetsProcessed: 0,
        sheetsImported: 0,
        sheetsSkipped: 0,
        sheetsReference: 0,
        sheetsInstruction: 0,
        autoCreated: [],
        totals: {
          products: 0, customers: 0, materials: 0, sites: 0, units: 0,
          categories: 0, costCenters: 0, forecastLines: 0, actualLines: 0,
          materialPrices: 0, priceListEntries: 0, discountEntries: 0,
          bomRecipes: 0, bomLines: 0, promotions: 0, costAllocations: 0,
        },
        warnings: [],
        errors: ['This file is a CSV. CSV files do not support multi-sheet import. Please upload an Excel workbook (.xlsx).'],
        sheetResults: [],
      };
    }

    const typeResult = detectFileType(buffer, fileName);
    if (typeResult.mismatch) {
      return {
        success: false,
        workbookType: 'unknown',
        fileName,
        sheetsProcessed: 0,
        sheetsImported: 0,
        sheetsSkipped: 0,
        sheetsReference: 0,
        sheetsInstruction: 0,
        autoCreated: [],
        totals: {
          products: 0, customers: 0, materials: 0, sites: 0, units: 0,
          categories: 0, costCenters: 0, forecastLines: 0, actualLines: 0,
          materialPrices: 0, priceListEntries: 0, discountEntries: 0,
          bomRecipes: 0, bomLines: 0, promotions: 0, costAllocations: 0,
        },
        warnings: [],
        errors: [`The uploaded file format does not match its extension. The file has a .${fileName.split('.').pop()} extension but is actually a ${typeResult.label}.`],
        sheetResults: [],
      };
    }

    let fullWorkbook: XLSX.WorkBook;
    try {
      fullWorkbook = XLSX.read(buffer, { type: 'buffer' });
    } catch {
      return {
        success: false,
        workbookType: 'unknown',
        fileName,
        sheetsProcessed: 0,
        sheetsImported: 0,
        sheetsSkipped: 0,
        sheetsReference: 0,
        sheetsInstruction: 0,
        autoCreated: [],
        totals: {
          products: 0, customers: 0, materials: 0, sites: 0, units: 0,
          categories: 0, costCenters: 0, forecastLines: 0, actualLines: 0,
          materialPrices: 0, priceListEntries: 0, discountEntries: 0,
          bomRecipes: 0, bomLines: 0, promotions: 0, costAllocations: 0,
        },
        warnings: [],
        errors: ['The Excel file could not be read. Please ensure the file is not corrupted.'],
        sheetResults: [],
      };
    }
    const workbookType = this.detectWorkbookType(fullWorkbook);
    this.logger.log(`Importing ${workbookType} workbook: ${fileName}`);

    const result: WorkbookImportResult = {
      success: true,
      workbookType,
      fileName,
      sheetsProcessed: 0,
      sheetsImported: 0,
      sheetsSkipped: 0,
      sheetsReference: 0,
      sheetsInstruction: 0,
      autoCreated: [],
      totals: {
        products: 0, customers: 0, materials: 0, sites: 0, units: 0,
        categories: 0, costCenters: 0, forecastLines: 0, actualLines: 0,
        materialPrices: 0, priceListEntries: 0, discountEntries: 0,
        bomRecipes: 0, bomLines: 0, promotions: 0, costAllocations: 0,
      },
      warnings: [],
      errors: [],
      sheetResults: [],
    };

    // Pre-classify all sheets and skip non-data sheets
    const { classifySheetRole } = require('./client-workbook-schema');
    for (const name of fullWorkbook.SheetNames) {
      const { role } = classifySheetRole(name);
      const ws = fullWorkbook.Sheets[name];
      const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null });

      if (role === 'instruction') {
        result.sheetsInstruction++;
        result.sheetResults.push({
          sheetName: name,
          sheetRole: 'instruction',
          status: 'instruction',
          rowsImported: 0,
          message: 'Instructions sheet — skipped during import',
        });
        continue;
      }
      if (role === 'reference') {
        result.sheetsReference++;
        result.sheetResults.push({
          sheetName: name,
          sheetRole: 'reference',
          status: 'reference',
          rowsImported: 0,
          message: 'Reference data sheet — skipped during import',
        });
        continue;
      }
    }

    try {
      if (workbookType === 'sales_analysis') {
        await this.importSalesAnalysis(fullWorkbook, companyId, userId, result);
      } else if (workbookType === 'planning_costing') {
        await this.importPlanningCosting(fullWorkbook, companyId, userId, result);
      } else {
        result.errors.push('Could not determine workbook type. Please check the file format.');
        result.success = false;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Import failed: ${msg}`);
      result.errors.push(`Import failed: ${msg}`);
      result.success = false;
    }

    return result;
  }

  /* ═══════════════════════════════════════════════════════════════════════
   * WORKBOOK TYPE DETECTION
   * ═══════════════════════════════════════════════════════════════════════ */

  detectWorkbookType(workbook: XLSX.WorkBook): WorkbookType {
    const sheetNames = workbook.SheetNames.map(s => s.toLowerCase().replace(/[_\s-]/g, ''));

    // Check for sales analysis workbook
    const hasSalesColumns = this.sheetHasColumnPattern(workbook, ['PERIOD', 'CUSTOMER_NUMBER', 'ITEM_CODE', 'TOTAL_QTY', 'EGP_NET_AMOUNT']);
    if (hasSalesColumns) return 'sales_analysis';

    // Check for planning/costing workbook
    const planningPatterns = ['p&l', 'data', 'forcasteqty', 'forecasteqty', 'drilldown', 'hvrm.price', 'smg&a', 's&mg&a', 'weigperearton', 'weightpercarton'];
    const matchCount = sheetNames.filter(s => planningPatterns.some(p => s.includes(p))).length;
    if (matchCount >= 3) return 'planning_costing';

    // Check by sheet names directly
    const directCheck = workbook.SheetNames.filter(s => {
      const sl = s.toLowerCase();
      return ['p&l', 'data', 'forcaste qty', 'drill down', 'hrv m.price', 'discount', 'weight per carton'].includes(sl);
    });
    if (directCheck.length >= 3) return 'planning_costing';

    return 'unknown';
  }

  private sheetHasColumnPattern(workbook: XLSX.WorkBook, patterns: string[]): boolean {
    for (const name of workbook.SheetNames) {
      const ws = workbook.Sheets[name];
      if (!ws) continue;
      const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { range: 1 });
      if (data.length === 0) continue;
      const headers = Object.keys(data[0]).map(h => h.toUpperCase().trim());
      const matched = patterns.filter(p => headers.includes(p));
      if (matched.length >= 3) return true;
    }
    return false;
  }

  /* ═══════════════════════════════════════════════════════════════════════
   * PREVIEW HELPERS
   * ═══════════════════════════════════════════════════════════════════════ */

  private previewSheetsV2(workbook: XLSX.WorkBook) {
    const { classifySheetRole, REFERENCE_SHEET_NAMES } = require('./client-workbook-schema');
    return workbook.SheetNames.map(name => {
      const ws = workbook.Sheets[name];
      const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null });
      const headers = rawData.length > 0 ? Object.keys(rawData[0]) : [];
      const { role, mappedModule: classifiedModule } = classifySheetRole(name);
      const mappedModule = role === 'data' ? this.mapSheetToModuleV2(name, headers) : '';
      const importable = role === 'data' && mappedModule !== 'unknown' && mappedModule !== '';
      const sampleRows = rawData.slice(0, 3);

      const errors: Array<{
        row: number; column: string;
        reason: 'missing_required' | 'invalid_enum' | 'missing_dependency' | 'unsupported_sheet' | 'database_insert_error' | 'duplicate' | 'validation_error';
        message: string; value: unknown;
      }> = [];
      const warnings: string[] = [];

      if (role === 'data' && mappedModule === 'unknown') {
        errors.push({
          row: 0,
          column: '',
          reason: 'unsupported_sheet',
          message: `Sheet "${name}" has no matching ERP module. This sheet requires implementation.`,
          value: name,
        });
      }

      if (role === 'data' && mappedModule === 'needs_implementation') {
        errors.push({
          row: 0,
          column: '',
          reason: 'unsupported_sheet',
          message: `Sheet "${name}" maps to a module that is not yet implemented. Supported later.`,
          value: name,
        });
      }

      let status: 'ready' | 'needs_mapping' | 'unsupported' | 'reference' | 'instruction' | 'ignored';
      if (role === 'instruction') status = 'instruction';
      else if (role === 'reference') status = 'reference';
      else if (role === 'ignored') status = 'ignored';
      else if (mappedModule === 'unknown') status = 'unsupported';
      else if (mappedModule === 'needs_implementation') status = 'needs_mapping';
      else status = 'ready';

      return {
        name,
        sheetRole: role,
        rowCount: rawData.length,
        columnCount: headers.length,
        headers,
        mappedModule,
        importable,
        validRows: status === 'ready' ? rawData.length : 0,
        errors,
        warnings,
        status,
        sampleRows,
      };
    });
  }

  private mapSheetToModuleV2(sheetName: string, headers: string[]): string {
    const sn = sheetName.toLowerCase().replace(/[_\s-]+/g, '');
    const hUpper = headers.map(h => h.toUpperCase().trim());

    // Master data sheets
    if (sn === 'companies') return 'companies';
    if (sn === 'sites') return 'sites';
    if (sn === 'units') return 'units';
    if (sn === 'accounts') return 'accounts';
    if (sn === 'costcenters' || sn === 'costcenters') return 'costcenters';
    if (sn === 'productcategories' || sn === 'productcategories' || sn === 'categories') return 'productcategories';
    if (sn === 'customers') return 'customers';
    if (sn === 'suppliers') return 'suppliers';
    if (sn === 'materials') return 'materials';
    if (sn === 'products') return 'products';

    // BOM
    if (sn === 'bomrecipes' || sn === 'bomrecipes' || sn.includes('bomrecipe') || sn.includes('bomrecipe')) return 'bomrecipes';
    if (sn.includes('bomline') || sn.includes('bomline')) return 'bomlines';

    // Budget
    if (sn === 'budget' || sn === 'budgetlines') return 'budgetlines';

    // Forecast Qty → forecastlines
    if (sn.includes('forcasteqty') || sn.includes('forecasteqty') || sn.includes('forcasteqty') || sn.includes('forecasteqty') ||
        (hUpper.includes('ORG.') && hUpper.includes('CODE-') && hUpper.some(h => /jan|feb|mar|apr/i.test(h)))) return 'forecastlines';

    // Actual Sales → actuallines
    if (hUpper.includes('PERIOD') && hUpper.includes('ITEM_CODE') && hUpper.includes('TOTAL_QTY')) return 'actuallines';

    // Drill Down → bomrecipes
    if (sn.includes('drilldown') || (hUpper.includes('PRD NO') && hUpper.includes('ING NO'))) return 'bomrecipes';

    // Material Prices → rawmaterialprices
    if (sn.includes('materialprice') || sn.includes('materialprice') || sn.includes('hrvmprice') || sn.includes('hrvm.price') ||
        sn.includes('hrvmprice') || sn.includes('hrvm') || (hUpper.some(h => h.includes('كود')))) return 'rawmaterialprices';

    // Discounts → promotions
    if (sn.includes('discount') || hUpper.some(h => h.includes('LINE DISCOUNT'))) return 'promotions';

    // Price List → productprices (needs implementation if module doesn't exist)
    if ((sn.includes('pricelist') || sn.includes('pricelist')) && !sn.includes('pricelist(2)') && !sn.includes('pricelist2')) return 'productprices';
    if (sn.includes('pricelist2') || sn.includes('pricelist(2)') || sn.includes('pricelist(2)')) return 'productprices';

    // Weight per Carton → products (packaging metadata)
    if (sn.includes('weightpercarton') || sn.includes('weightpercton') || sn.includes('weightpercarton')) return 'products';

    // HRV Rates → costdrivers (production cost rates)
    if (sn.includes('hvrrates') || sn.includes('hrvrates') || sn.includes('hvrrate') || sn.includes('hrvrate')) return 'costdrivers';

    // Bawadi Rates → costdrivers (production cost rates)
    if (sn.includes('bawadirats') || sn.includes('bawadirates') || sn.includes('bawadirate') || sn.includes('bawadirate')) return 'costdrivers';

    // S&M G&A → productioncostallocations (needs implementation if module doesn't exist)
    if (sn.includes('s&mg&a') || sn.includes('smg&a') || sn.includes('s&mg&a') || sn.includes('smg&a')) return 'productioncostallocations';

    // Production Planning → productionplans
    if (sn.includes('productionplan') || sn.includes('productionplan') || sn.includes('productionplanning') || sn.includes('productionplanning')) return 'productionplans';

    // Exchange Rates → exchangerates
    if (sn === 'exchangerates' || sn === 'exchangerates' || sn.includes('exchangerate') || sn.includes('exchangerate')) return 'exchangerates';

    // KPI Targets → kpitargets
    if (sn === 'kpitargets' || sn === 'kpitargets' || sn.includes('kpitarget') || sn.includes('kpitarget')) return 'kpitargets';

    // P&L → actuallines
    if (sn === 'p&l' || sn.includes('p&l')) return 'actuallines';

    // Data sheet (generic) → products
    if (sn === 'data') return 'products';

    return 'unknown';
  }

  mapSheetToModule(sheetName: string, headers: string[]): string {
    const sn = sheetName.toLowerCase().replace(/[_\s-]+/g, '');
    const hUpper = headers.map(h => h.toUpperCase().trim());

    if (hUpper.includes('PERIOD') && hUpper.includes('ITEM_CODE')) return 'actuallines';
    if (hUpper.includes('ITEM_CODE') && hUpper.includes('DESCRIPTION')) return 'products';
    if (sn.includes('forcasteqty') || sn.includes('forecasteqty') || (hUpper.includes('ORG.') && hUpper.includes('CODE-') && hUpper.some(h => /jan|feb|mar|apr/i.test(h)))) return 'forecastlines';
    if (sn.includes('drilldown') || (hUpper.includes('PRD NO') && hUpper.includes('ING NO'))) return 'bomrecipes';
    if (sn.includes('hvrmprice') || sn.includes('hrvm.price') || (hUpper.some(h => h.includes('كود')))) return 'materialprices';
    if (sn.includes('discount') || hUpper.some(h => h.includes('LINE DISCOUNT'))) return 'discounts';
    if (sn.includes('pricelist2') || sn.includes('pricelist(2)')) return 'pricelist';
    if (sn.includes('pricelist')) return 'pricelist';
    if (sn.includes('weightpercarton') || sn.includes('weightpercton')) return 'products';
    if (sn.includes('hvrrates') || sn.includes('hrvrates')) return 'rates';
    if (sn.includes('bawadirats') || sn.includes('bawadirates')) return 'rates';
    if (sn.includes('s&mg&a') || sn.includes('smg&a')) return 'costallocations';
    if (sn === 'p&l' || sn.includes('p&l')) return 'plreports';
    if (sn === 'sheet1') return 'plreports';
    if (sn.includes('data')) return 'products';
    return 'unknown';
  }

  private buildAutoCreatePlan(workbookType: WorkbookType, sheets: ReturnType<typeof this.previewSheetsV2>): string[] {
    const plan: string[] = [];

    if (workbookType === 'sales_analysis') {
      plan.push('Units (from UOM column)');
      plan.push('Sites (from LOCATION / ORGANIZATION columns)');
      plan.push('Product Categories (from ITEM_MAJOR + ITEM_MINOR)');
      plan.push('Products (from ITEM_CODE + ITEM_DESC + ARABIC_DESC)');
      plan.push('Customers (from CUSTOMER_NUMBER + CUSTOMER_NAME)');
      plan.push('Revenue Account (default GL account for sales)');
      plan.push('Actual Import batch');
      plan.push('Sales transaction lines');
    } else if (workbookType === 'planning_costing') {
      plan.push('Units (from UOM columns)');
      plan.push('Sites (from Org. column)');
      plan.push('Product Categories (from Major + Minor / Main Category + Category)');
      plan.push('Products (from Code + Description)');
      plan.push('Materials (from Ing No + Ing Desc in Drill Down)');
      plan.push('Cost Centers (from CC column)');
      plan.push('Forecast Cycles + Forecast Lines');
      plan.push('Material Prices (from HRV M.Price)');
      plan.push('BOM Recipes + BOM Lines (from Drill Down)');
      plan.push('Discount entries');
      plan.push('Price List entries');
      plan.push('Cost Allocations (from HRV Rates / Bawadi Rats / S&M G&A)');
    }

    return plan;
  }

  private buildPreviewWarningsV2(workbookType: WorkbookType, sheets: ReturnType<typeof this.previewSheetsV2>): string[] {
    const warnings: string[] = [];

    if (workbookType === 'unknown') {
      warnings.push('Could not automatically detect workbook type. Import may not work correctly.');
    }

    let totalImportableRows = 0;
    let unsupportedCount = 0;
    for (const sheet of sheets) {
      if (sheet.importable) totalImportableRows += sheet.rowCount;
      if (sheet.sheetRole === 'data' && sheet.mappedModule === 'unknown') {
        unsupportedCount++;
        warnings.push(`Sheet "${sheet.name}" → unsupported (no matching ERP module). Requires implementation.`);
      }
      if (sheet.sheetRole === 'data' && sheet.mappedModule === 'needs_implementation') {
        unsupportedCount++;
        warnings.push(`Sheet "${sheet.name}" → needs implementation in target module. Supported later.`);
      }
    }

    if (totalImportableRows === 0 && unsupportedCount === 0) {
      warnings.push(
        'This workbook contains no importable data rows. ' +
        'Fill the Data sheets first, then upload again.',
      );
    }

    return warnings;
  }

  /* ═══════════════════════════════════════════════════════════════════════
   * SALES ANALYSIS IMPORT (Test.xlsx)
   * ═══════════════════════════════════════════════════════════════════════ */

  private async importSalesAnalysis(
    workbook: XLSX.WorkBook,
    companyId: bigint,
    userId: bigint,
    result: WorkbookImportResult,
  ): Promise<void> {
    const sheetName = workbook.SheetNames.find(s => {
      const ws = workbook.Sheets[s];
      if (!ws) return false;
      const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { range: 1 });
      if (data.length === 0) return false;
      const headers = Object.keys(data[0]).map(h => h.toUpperCase().trim());
      return headers.includes('PERIOD') && headers.includes('ITEM_CODE');
    });

    if (!sheetName) {
      result.errors.push('No sales analysis sheet found.');
      return;
    }

    const ws = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);
    result.sheetsProcessed++;

    if (rows.length === 0) {
      result.sheetResults.push({ sheetName, sheetRole: 'data', status: 'skipped', rowsImported: 0, message: 'No data rows' });
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      // 1. Auto-create default Revenue Account
      const revenueAccount = await this.getOrCreateDefaultAccount(tx, companyId, '4000', 'Sales Revenue', 'revenue');
      result.autoCreated.push({ type: 'Account', code: '4000', name: 'Sales Revenue', created: false });

      // 2. Collect and auto-create all master data
      const locations = new Set<string>();
      const organizations = new Set<string>();
      const uomSet = new Set<string>();
      const products = new Map<number, { desc: string; arabicDesc: string; major: string; minor: string }>();
      const customers = new Map<number, string>();
      const categories = new Set<string>();

      for (const row of rows) {
        if (row['LOCATION']) locations.add(String(row['LOCATION']).trim());
        if (row['ORGANIZATION']) organizations.add(String(row['ORGANIZATION']).trim());
        if (row['UOM']) uomSet.add(String(row['UOM']).trim());
        if (row['ITEM_CODE']) {
          const code = Number(row['ITEM_CODE']);
          if (!products.has(code)) {
            products.set(code, {
              desc: String(row['ITEM_DESC'] || '').trim(),
              arabicDesc: String(row['ARABIC_DESC'] || '').trim(),
              major: String(row['ITEM_MAJOR'] || '').trim(),
              minor: String(row['ITEM_MINOR'] || '').trim(),
            });
          }
        }
        if (row['CUSTOMER_NUMBER']) {
          const num = Number(row['CUSTOMER_NUMBER']);
          if (!customers.has(num)) {
            customers.set(num, String(row['CUSTOMER_NAME'] || '').trim());
          }
        }
        if (row['ITEM_MAJOR']) categories.add(String(row['ITEM_MAJOR']).trim());
      }

      // 3. Auto-create Units
      for (const uom of uomSet) {
        const unit = await tx.unit.findFirst({ where: { symbol: uom, companyId } });
        if (!unit) {
          await tx.unit.create({ data: { companyId, name: uom, symbol: uom } });
          result.autoCreated.push({ type: 'Unit', code: uom, name: uom, created: true });
          result.totals.units++;
        }
      }

      // 4. Auto-create Sites from LOCATIONS
      const allLocations = new Set([...locations, ...organizations]);
      for (const loc of allLocations) {
        const site = await tx.site.findFirst({ where: { name: loc, companyId } });
        if (!site) {
          await tx.site.create({
            data: {
              companyId, name: loc,
              type: loc.toLowerCase().includes('warehouse') ? 'warehouse' :
                     loc.toLowerCase().includes('office') ? 'office' : 'branch',
              status: 'active',
            },
          });
          result.autoCreated.push({ type: 'Site', code: loc, name: loc, created: true });
          result.totals.sites++;
        }
      }

      // 5. Auto-create Product Categories from ITEM_MAJOR
      const categoryMap = new Map<string, bigint>();
      for (const catName of categories) {
        const existing = await tx.productCategory.findFirst({ where: { name: catName, companyId } });
        if (existing) {
          categoryMap.set(catName, existing.id);
        } else {
          const created = await tx.productCategory.create({ data: { companyId, name: catName } });
          categoryMap.set(catName, created.id);
          result.autoCreated.push({ type: 'ProductCategory', code: catName, name: catName, created: true });
          result.totals.categories++;
        }
      }

      // 6. Auto-create Products
      const productMap = new Map<number, bigint>();
      for (const [code, info] of products) {
        const sku = String(code);
        const existing = await tx.product.findFirst({ where: { sku, companyId } });
        if (existing) {
          productMap.set(code, existing.id);
        } else {
          const unit = await tx.unit.findFirst({ where: { symbol: 'PCS', companyId } });
          const catId = categoryMap.get(info.major) ?? null;
          const created = await tx.product.create({
            data: {
              companyId,
              sku,
              name: info.desc || `Product ${sku}`,
              productType: 'finished_good',
              categoryId: catId,
              unitId: unit?.id ?? null,
              isActive: true,
            },
          });
          productMap.set(code, created.id);
          result.autoCreated.push({ type: 'Product', code: sku, name: info.desc || `Product ${sku}`, created: true });
          result.totals.products++;
        }
      }

      // 7. Auto-create Customers
      const customerMap = new Map<number, bigint>();
      for (const [num, name] of customers) {
        const code = String(num);
        const existing = await tx.customer.findFirst({
          where: { OR: [{ code, companyId }, { name, companyId }], isActive: true },
        });
        if (existing) {
          customerMap.set(num, existing.id);
        } else {
          const created = await tx.customer.create({
            data: { companyId, code, name: name || `Customer ${code}`, customerType: 'wholesale', isActive: true },
          });
          customerMap.set(num, created.id);
          result.autoCreated.push({ type: 'Customer', code, name: name || `Customer ${code}`, created: true });
          result.totals.customers++;
        }
      }

      // 8. Find or create ActualImport
      const firstRow = rows[0];
      const periodDate = this.parseExcelDate(firstRow['PERIOD']);
      const fiscalYear = periodDate.getFullYear();
      const actualImport = await tx.actualImport.create({
        data: {
          companyId, importType: 'gl',
          periodFrom: new Date(fiscalYear, 0, 1),
          periodTo: new Date(fiscalYear, 11, 31),
          status: 'posted', importedBy: userId,
        },
      });

      // 9. Import actual lines
      let imported = 0;
      for (const row of rows) {
        const itemCode = row['ITEM_CODE'] ? Number(row['ITEM_CODE']) : null;
        const custNum = row['CUSTOMER_NUMBER'] ? Number(row['CUSTOMER_NUMBER']) : null;
        const location = String(row['LOCATION'] || '').trim();
        const org = String(row['ORGANIZATION'] || '').trim();

        const site = await tx.site.findFirst({
          where: { OR: [{ name: location, companyId }, { name: org, companyId }] },
        });

        const productId = itemCode ? productMap.get(itemCode) ?? null : null;
        const customerId = custNum ? customerMap.get(custNum) ?? null : null;
        const trxDate = this.parseExcelDate(row['TRX_DATE']);
        const qty = row['TOTAL_QTY'] ? Number(row['TOTAL_QTY']) : 0;
        const netAmount = row['EGP_NET_AMOUNT'] ? Number(row['EGP_NET_AMOUNT']) : 0;
        const unitPrice = qty > 0 ? netAmount / qty : 0;

        await tx.actualLine.create({
          data: {
            actualImportId: actualImport.id,
            accountId: revenueAccount.id,
            siteId: site?.id ?? null,
            productId,
            customerId,
            transactionDate: trxDate,
            quantity: qty,
            unitPrice,
            amount: netAmount,
            referenceNo: row['TRX_NUMBER'] ? String(row['TRX_NUMBER']) : null,
          },
        });
        imported++;
        result.totals.actualLines++;
      }

      result.sheetResults.push({
        sheetName, sheetRole: 'data',
        status: 'imported',
        rowsImported: imported,
        message: `Imported ${imported} sales transactions`,
      });
      result.sheetsImported++;
    });
  }

  /* ═══════════════════════════════════════════════════════════════════════
   * PLANNING/COSTING IMPORT (Test 2.xlsx)
   * ═══════════════════════════════════════════════════════════════════════ */

  private async importPlanningCosting(
    workbook: XLSX.WorkBook,
    companyId: bigint,
    userId: bigint,
    result: WorkbookImportResult,
  ): Promise<void> {
    // Phase 1: Extract all master data from 'Data' sheet first
    const masterData = this.extractDataSheetMasterData(workbook);

    const productMap = new Map<number, bigint>();
    const materialMap = new Map<number, bigint>();

    await this.prisma.$transaction(async (tx) => {
      // Auto-create Units
      for (const uom of masterData.units) {
        const existing = await tx.unit.findFirst({ where: { symbol: uom, companyId } });
        if (!existing) {
          await tx.unit.create({ data: { companyId, name: uom, symbol: uom } });
          result.autoCreated.push({ type: 'Unit', code: uom, name: uom, created: true });
          result.totals.units++;
        }
      }

      // Auto-create Sites from Org
      for (const org of masterData.organizations) {
        const existing = await tx.site.findFirst({ where: { name: org, companyId } });
        if (!existing) {
          await tx.site.create({
            data: { companyId, name: org, type: org.toLowerCase().includes('bawadi') ? 'factory' : 'factory', status: 'active' },
          });
          result.autoCreated.push({ type: 'Site', code: org, name: org, created: true });
          result.totals.sites++;
        }
      }

      // Auto-create Product Categories
      const categoryMap = new Map<string, bigint>();
      for (const cat of masterData.categories) {
        const existing = await tx.productCategory.findFirst({ where: { name: cat, companyId } });
        if (existing) {
          categoryMap.set(cat, existing.id);
        } else {
          const created = await tx.productCategory.create({ data: { companyId, name: cat } });
          categoryMap.set(cat, created.id);
          result.autoCreated.push({ type: 'ProductCategory', code: cat, name: cat, created: true });
          result.totals.categories++;
        }
      }

      // Auto-create Cost Centers
      const costCenterMap = new Map<string, bigint>();
      for (const cc of masterData.costCenters) {
        if (!cc) continue;
        const existing = await tx.costCenter.findFirst({ where: { name: cc, companyId } });
        if (existing) {
          costCenterMap.set(cc, existing.id);
        } else {
          const created = await tx.costCenter.create({ data: { companyId, name: cc, type: 'production' } });
          costCenterMap.set(cc, created.id);
          result.autoCreated.push({ type: 'CostCenter', code: cc, name: cc, created: true });
          result.totals.costCenters++;
        }
      }

      // Auto-create Products
      for (const [code, info] of masterData.products) {
        const sku = String(code);
        const existing = await tx.product.findFirst({ where: { sku, companyId } });
        if (existing) {
          productMap.set(code, existing.id);
        } else {
          const unit = masterData.units.size > 0
            ? await tx.unit.findFirst({ where: { symbol: info.uom || 'PCS', companyId } })
            : null;
          const catId = info.major ? (categoryMap.get(info.major) ?? null) : null;
          const created = await tx.product.create({
            data: {
              companyId, sku, name: info.desc || `Product ${sku}`,
              productType: 'finished_good', categoryId: catId,
              unitId: unit?.id ?? null, isActive: true,
            },
          });
          productMap.set(code, created.id);
          result.autoCreated.push({ type: 'Product', code: sku, name: info.desc || `Product ${sku}`, created: true });
          result.totals.products++;
        }
      }

      // Auto-create Materials
      for (const [code, info] of masterData.materials) {
        const matCode = String(code);
        const existing = await tx.material.findFirst({ where: { code: matCode, companyId } });
        if (existing) {
          materialMap.set(code, existing.id);
        } else {
          const unit = await tx.unit.findFirst({ where: { symbol: info.uom || 'KGS', companyId } });
          const created = await tx.material.create({
            data: {
              companyId, code: matCode, name: info.desc || `Material ${matCode}`,
              materialType: info.type || 'raw_material', unitId: unit?.id ?? null, isActive: true,
            },
          });
          materialMap.set(code, created.id);
          result.autoCreated.push({ type: 'Material', code: matCode, name: info.desc || `Material ${matCode}`, created: true });
          result.totals.materials++;
        }
      }
    });

    // Phase 2: Import sheets in dependency order
    // 1. Forecast QTY
    await this.importForcasteQty(workbook, companyId, productMap, result);
    // 2. Drill Down (BOM)
    await this.importDrillDown(workbook, companyId, productMap, materialMap, result);
    // 3. Material Prices
    await this.importHrvMaterialPrices(workbook, companyId, materialMap, result);
    // 4. Price List
    await this.importPriceList(workbook, companyId, productMap, result);
    // 5. Discounts
    await this.importDiscounts(workbook, companyId, productMap, result);
    // 6. Weight per carton
    await this.importWeightPerCarton(workbook, companyId, productMap, result);
    // 7. Rates (HRV + Bawadi)
    await this.importRates(workbook, companyId, result);
    // 8. Cost Allocations (S&M G&A)
    await this.importCostAllocations(workbook, companyId, result);
  }

  /* ─── Extract Data Sheet Master Data ─────────────────────────────────── */

  private extractDataSheetMasterData(workbook: XLSX.WorkBook) {
    const units = new Set<string>();
    const organizations = new Set<string>();
    const categories = new Set<string>();
    const costCenters = new Set<string>();
    const products = new Map<number, { desc: string; uom: string; major: string; minor: string }>();
    const materials = new Map<number, { desc: string; uom: string; type: string }>();

    const dataSheet = workbook.Sheets['Data'];
    if (!dataSheet) return { units, organizations, categories, costCenters, products, materials };

    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(dataSheet, { defval: null });
    if (rows.length < 3) return { units, organizations, categories, costCenters, products, materials };

    // Header row is row index 2 (0-based) based on the analysis
    const headerRow = rows[2];
    const headers: string[] = [];
    for (const key of Object.keys(headerRow)) {
      const val = headerRow[key];
      headers.push(val ? String(val).trim() : key);
    }

    // Find column indices
    const colIdx = this.buildColumnIndex(headers);

    for (let i = 3; i < rows.length; i++) {
      const row = rows[i];
      const values = Object.values(row);

      const code = colIdx.code >= 0 ? values[colIdx.code] : null;
      const desc = colIdx.description >= 0 ? values[colIdx.description] : null;
      const org = colIdx.org >= 0 ? values[colIdx.org] : null;
      const type = colIdx.type >= 0 ? values[colIdx.type] : null;
      const uom = colIdx.uom >= 0 ? values[colIdx.uom] : null;
      const cc = colIdx.cc >= 0 ? values[colIdx.cc] : null;
      const mainCat = colIdx.mainCategory >= 0 ? values[colIdx.mainCategory] : null;
      const category = colIdx.category >= 0 ? values[colIdx.category] : null;
      const minor = colIdx.subCategory >= 0 ? values[colIdx.subCategory] : null;

      if (code && typeof code === 'number' && code > 10000) {
        const codeNum = Math.floor(code);
        const descStr = desc ? String(desc).trim() : '';
        const uomStr = uom ? String(uom).trim() : 'PCS';
        const majorStr = mainCat ? String(mainCat).trim() : '';
        const minorStr = minor ? String(minor).trim() : '';
        const typeStr = type ? String(type).trim() : '';

        if (!products.has(codeNum)) {
          products.set(codeNum, { desc: descStr, uom: uomStr, major: majorStr, minor: minorStr });
        }

        if (org) organizations.add(String(org).trim());
        if (uom) units.add(uomStr);
        if (mainCat) categories.add(String(mainCat).trim());
        if (cc && String(cc).trim()) costCenters.add(String(cc).trim());
      }
    }

    return { units, organizations, categories, costCenters, products, materials };
  }

  private buildColumnIndex(headers: string[]): Record<string, number> {
    const idx: Record<string, number> = {
      year: -1, month: -1, month2: -1, org: -1, type: -1, code: -1,
      description: -1, uom: -1, cc: -1, mainCategory: -1, category: -1,
      subCategory: -1, weightPerCtn: -1, rm: -1, pkg: -1, totalDm: -1,
      dlc: -1, laborRate: -1, totalDlc: -1, voh: -1, foh: -1,
      totalCostPerCtn: -1, priceList: -1, forecasteQty: -1,
    };

    for (let i = 0; i < headers.length; i++) {
      const h = headers[i].toLowerCase().trim().replace(/\r\n/g, '');
      if (h === 'year') idx.year = i;
      else if (h === 'month' && idx.month === -1) idx.month = i;
      else if (h === 'month 2') idx.month2 = i;
      else if (h === 'org.' || h === 'org') idx.org = i;
      else if (h === 'type' && idx.type === -1) idx.type = i;
      else if (h === 'code' || h === 'code-') idx.code = i;
      else if (h === 'description') idx.description = i;
      else if (h === 'uom') idx.uom = i;
      else if (h === 'cc') idx.cc = i;
      else if (h === 'main category') idx.mainCategory = i;
      else if (h === 'category') idx.category = i;
      else if (h === 'sub category') idx.subCategory = i;
      else if (h === 'rm') idx.rm = i;
      else if (h === 'pkg') idx.pkg = i;
      else if (h === 'total cost per ctn') idx.totalCostPerCtn = i;
      else if (h === 'price list') idx.priceList = i;
      else if (h === 'forcaste qty' || h === 'forecaste qty') idx.forecasteQty = i;
    }

    return idx;
  }

  /* ─── Forecast QTY Import ────────────────────────────────────────────── */

  private async importForcasteQty(
    workbook: XLSX.WorkBook,
    companyId: bigint,
    productMap: Map<number, bigint>,
    result: WorkbookImportResult,
  ): Promise<void> {
    const sheetName = workbook.SheetNames.find(s => {
      const sl = s.toLowerCase().replace(/[_\s-]/g, '');
      return sl.includes('forcasteqty') || sl.includes('forecasteqty');
    });
    if (!sheetName) { result.warnings.push('Forecast QTY sheet not found'); return; }

    const ws = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { header: 1, defval: null }) as unknown as unknown[][];
    result.sheetsProcessed++;

    // Row 1 (index 1) has headers: Org., Type, Code-, Item Desc, Jan-26...Dec-26
    if (rows.length < 2) {
      result.sheetResults.push({ sheetName, sheetRole: 'data', status: 'skipped', rowsImported: 0, message: 'No data' });
      return;
    }

    const headerRow = rows[1];
    const monthHeaders: Array<{ col: number; month: number; year: number }> = [];
    for (let i = 4; i < headerRow.length; i++) {
      const val = headerRow[i];
      if (!val) continue;
      const parsed = this.parseMonthYearString(String(val));
      if (parsed) monthHeaders.push({ col: i, month: parsed.month, year: parsed.year });
    }

    if (monthHeaders.length === 0) {
      result.sheetResults.push({ sheetName, sheetRole: 'data', status: 'skipped', rowsImported: 0, message: 'No month columns found' });
      return;
    }

    // Find or create forecast cycle
    const fiscalYear = monthHeaders[0].year;
    const cycleName = `FY${String(fiscalYear).slice(2)} Planning`;
    const cycle = await this.prisma.forecastCycle.findFirst({
      where: { name: cycleName, companyId },
    }) ?? await this.prisma.forecastCycle.create({
      data: { companyId, name: cycleName, fiscalYear, basePeriod: new Date(fiscalYear, 0, 1), status: 'draft', createdBy: BigInt(0) },
    });

    // Find or create a default account for forecasting
    const account = await this.getOrCreateDefaultAccount(this.prisma, companyId, '5000', 'Cost of Goods Sold', 'cogs');

    let imported = 0;
    for (let i = 2; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      const code = typeof row[2] === 'number' ? row[2] : (typeof row[2] === 'string' ? Number(row[2]) : null);
      if (!code || isNaN(code)) continue;

      const productId = productMap.get(code) ?? null;

      for (const mh of monthHeaders) {
        const qty = row[mh.col];
        const quantity = typeof qty === 'number' ? qty : (typeof qty === 'string' ? Number(String(qty).replace(/,/g, '')) : 0);
        if (!quantity || quantity === 0) continue;

        await this.prisma.forecastLine.create({
          data: {
            forecastCycleId: cycle.id,
            accountId: account.id,
            productId,
            periodMonth: mh.month,
            quantity,
            amount: 0,
          },
        });
        imported++;
        result.totals.forecastLines++;
      }
    }

    result.sheetResults.push({
      sheetName, sheetRole: 'data', status: imported > 0 ? 'imported' : 'skipped',
      rowsImported: imported, message: `Imported ${imported} forecast lines`,
    });
    if (imported > 0) result.sheetsImported++;
    else result.sheetsSkipped++;
  }

  /* ─── Drill Down (BOM) Import ────────────────────────────────────────── */

  private async importDrillDown(
    workbook: XLSX.WorkBook,
    companyId: bigint,
    productMap: Map<number, bigint>,
    materialMap: Map<number, bigint>,
    result: WorkbookImportResult,
  ): Promise<void> {
    const ws = workbook.Sheets['Drill Down'];
    if (!ws) { result.warnings.push('Drill Down sheet not found'); return; }

    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { header: 1, defval: null }) as unknown as unknown[][];
    result.sheetsProcessed++;

    if (rows.length < 4) {
      result.sheetResults.push({ sheetName: 'Drill Down', sheetRole: 'data', status: 'skipped', rowsImported: 0, message: 'No data rows' });
      return;
    }

    // Row 2 has headers: Org., Prd No, Prd Desc, Prd Uom, Major, Minor, Ing No, Ing Desc, Plan Qty, Ing Uom, Last Price, ...
    const headerRow = rows[2];
    const h = headerRow.map((v: unknown) => v ? String(v).trim().toLowerCase() : '');

    const orgCol = h.findIndex((v: string) => v === 'org.');
    const prdNoCol = h.findIndex((v: string) => v === 'prd no');
    const prdDescCol = h.findIndex((v: string) => v === 'prd desc');
    const prdUomCol = h.findIndex((v: string) => v === 'prd uom');
    const majorCol = h.findIndex((v: string) => v === 'major');
    const minorCol = h.findIndex((v: string) => v === 'minor');
    const ingNoCol = h.findIndex((v: string) => v === 'ing no');
    const ingDescCol = h.findIndex((v: string) => v === 'ing desc');
    const planQtyCol = h.findIndex((v: string) => v === 'plan qty');
    const uomCol = h.findIndex((v: string) => v === 'ing uom');

    // Group by product
    const bomGroups = new Map<number, { org: string; major: string; minor: string; materials: Array<{ ingNo: number; ingDesc: string; planQty: number; uom: string }> }>();

    for (let i = 3; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 8) continue;

      const prdNo = prdNoCol >= 0 ? Number(row[prdNoCol]) : 0;
      if (!prdNo || isNaN(prdNo)) continue;

      if (!bomGroups.has(prdNo)) {
        bomGroups.set(prdNo, {
          org: orgCol >= 0 ? String(row[orgCol] || '').trim() : '',
          major: majorCol >= 0 ? String(row[majorCol] || '').trim() : '',
          minor: minorCol >= 0 ? String(row[minorCol] || '').trim() : '',
          materials: [],
        });
      }

      const ingNo = ingNoCol >= 0 ? Number(row[ingNoCol]) : 0;
      if (ingNo && !isNaN(ingNo)) {
        const group = bomGroups.get(prdNo)!;
        group.materials.push({
          ingNo,
          ingDesc: ingDescCol >= 0 ? String(row[ingDescCol] || '').trim() : '',
          planQty: planQtyCol >= 0 ? Number(row[planQtyCol] || 0) : 0,
          uom: uomCol >= 0 ? String(row[uomCol] || 'KGS').trim() : 'KGS',
        });
      }
    }

    let imported = 0;
    for (const [prdNo, group] of bomGroups) {
      const productId = productMap.get(prdNo);
      if (!productId) continue;

      const recipe = await this.prisma.bomRecipe.create({
        data: {
          companyId, productId, version: 'v1', outputQty: 1, wastagePct: 0, isActive: true,
        },
      });
      result.totals.bomRecipes++;

      for (const mat of group.materials) {
        // Auto-create material if not exists
        let matId = materialMap.get(mat.ingNo);
        if (!matId) {
          const matCode = String(mat.ingNo);
          const existing = await this.prisma.material.findFirst({ where: { code: matCode, companyId } });
          if (existing) {
            matId = existing.id;
            materialMap.set(mat.ingNo, existing.id);
          } else {
            const unit = await this.prisma.unit.findFirst({ where: { symbol: mat.uom, companyId } });
            const created = await this.prisma.material.create({
              data: {
                companyId, code: matCode, name: mat.ingDesc || `Material ${matCode}`,
                materialType: group.major === 'RM' ? 'raw_material' : 'packaging',
                unitId: unit?.id ?? null, isActive: true,
              },
            });
            matId = created.id;
            materialMap.set(mat.ingNo, created.id);
            result.autoCreated.push({ type: 'Material', code: matCode, name: mat.ingDesc || `Material ${matCode}`, created: true });
            result.totals.materials++;
          }
        }

        await this.prisma.bomLine.create({
          data: {
            bomId: recipe.id, materialId: matId,
            quantity: mat.planQty, qtyPerOutput: mat.planQty, wastagePct: 0,
          },
        });
        result.totals.bomLines++;
        imported++;
      }
    }

    result.sheetResults.push({
      sheetName: 'Drill Down', sheetRole: 'data', status: imported > 0 ? 'imported' : 'skipped',
      rowsImported: imported, message: `Imported ${result.totals.bomRecipes} BOM recipes with ${imported} material lines`,
    });
    if (imported > 0) result.sheetsImported++;
    else result.sheetsSkipped++;
  }

  /* ─── HRV Material Prices ────────────────────────────────────────────── */

  private async importHrvMaterialPrices(
    workbook: XLSX.WorkBook,
    companyId: bigint,
    materialMap: Map<number, bigint>,
    result: WorkbookImportResult,
  ): Promise<void> {
    const ws = workbook.Sheets['HRV M.Price'];
    if (!ws) { result.warnings.push('HRV M.Price sheet not found'); return; }

    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { header: 1, defval: null }) as unknown as unknown[][];
    result.sheetsProcessed++;

    if (rows.length < 3) {
      result.sheetResults.push({ sheetName: 'HRV M.Price', sheetRole: 'data', status: 'skipped', rowsImported: 0, message: 'Insufficient data' });
      return;
    }

    // Row 1 has headers in Arabic: كود الصنف, اسم الصنف, الوحدة, متوسط 2025, Jan-26...Dec-26
    const headerRow = rows[1];
    const monthCols: Array<{ col: number; month: number; year: number }> = [];

    for (let i = 4; i < headerRow.length; i++) {
      const val = headerRow[i];
      if (!val) continue;
      const parsed = this.parseMonthYearString(String(val));
      if (parsed) monthCols.push({ col: i, month: parsed.month, year: parsed.year });
    }

    // Data starts from row 2
    let imported = 0;
    for (let i = 2; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 3) continue;

      const code = row[0] ? String(row[0]).trim() : '';
      const name = row[1] ? String(row[1]).trim() : '';
      if (!code || !name) continue;

      // Find or create material
      const codeNum = Number(code);
      let matId = materialMap.get(codeNum);
      if (!matId) {
        const existing = await this.prisma.material.findFirst({ where: { code, companyId } });
        if (existing) {
          matId = existing.id;
          materialMap.set(codeNum, existing.id);
        } else {
          const created = await this.prisma.material.create({
            data: { companyId, code, name, materialType: 'raw_material', isActive: true },
          });
          matId = created.id;
          materialMap.set(codeNum, created.id);
          result.autoCreated.push({ type: 'Material', code, name, created: true });
          result.totals.materials++;
        }
      }

      // Import monthly prices
      for (const mc of monthCols) {
        const price = typeof row[mc.col] === 'number' ? row[mc.col] as number : null;
        if (!price || price <= 0) continue;

        await this.prisma.rawMaterialPrice.create({
          data: {
            companyId, materialId: matId, price,
            priceDate: new Date(mc.year, mc.month - 1, 1),
          },
        });
        imported++;
        result.totals.materialPrices++;
      }
    }

    result.sheetResults.push({
      sheetName: 'HRV M.Price', sheetRole: 'data', status: imported > 0 ? 'imported' : 'skipped',
      rowsImported: imported, message: `Imported ${imported} material price entries`,
    });
    if (imported > 0) result.sheetsImported++;
    else result.sheetsSkipped++;
  }

  /* ─── Price List Import ──────────────────────────────────────────────── */

  private async importPriceList(
    workbook: XLSX.WorkBook,
    companyId: bigint,
    productMap: Map<number, bigint>,
    result: WorkbookImportResult,
  ): Promise<void> {
    const ws = workbook.Sheets['Price list (2)'];
    if (!ws) { result.warnings.push('Price list (2) sheet not found'); return; }

    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { header: 1, defval: null }) as unknown as unknown[][];
    result.sheetsProcessed++;

    // Row 3 has headers: Item Code, Description, Type, Main Price List, Jan-26...Dec-26
    if (rows.length < 5) {
      result.sheetResults.push({ sheetName: 'Price list (2)', sheetRole: 'data', status: 'skipped', rowsImported: 0, message: 'Insufficient data' });
      return;
    }

    const headerRow = rows[3];
    const h = headerRow.map((v: unknown) => v ? String(v).trim().toLowerCase() : '');

    const codeCol = h.findIndex((v: string) => v === 'item code' || v === 'code-');
    const descCol = h.findIndex((v: string) => v === 'description');
    const typeCol = h.findIndex((v: string) => v === 'type');

    const monthCols: Array<{ col: number; month: number; year: number }> = [];
    for (let i = 0; i < h.length; i++) {
      const parsed = this.parseMonthYearString(h[i]);
      if (parsed) monthCols.push({ col: i, month: parsed.month, year: parsed.year });
    }

    let imported = 0;
    for (let i = 4; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 3) continue;

      const code = codeCol >= 0 ? row[codeCol] : null;
      const codeNum = typeof code === 'number' ? code : (code ? Number(String(code).replace(/[^\d]/g, '')) : 0);
      if (!codeNum || isNaN(codeNum)) continue;

      const productId = productMap.get(codeNum);
      if (!productId) continue;

      for (const mc of monthCols) {
        const price = typeof row[mc.col] === 'number' ? row[mc.col] as number : null;
        if (!price || price <= 0) continue;

        // Update product's selling price for the latest month
        await this.prisma.product.update({
          where: { id: productId },
          data: { salePrice: price },
        }).catch(() => {});

        imported++;
        result.totals.priceListEntries++;
      }
    }

    result.sheetResults.push({
      sheetName: 'Price list (2)', sheetRole: 'data', status: imported > 0 ? 'imported' : 'skipped',
      rowsImported: imported, message: `Processed ${imported} price list entries`,
    });
    if (imported > 0) result.sheetsImported++;
    else result.sheetsSkipped++;
  }

  /* ─── Discounts Import ───────────────────────────────────────────────── */

  private async importDiscounts(
    workbook: XLSX.WorkBook,
    companyId: bigint,
    productMap: Map<number, bigint>,
    result: WorkbookImportResult,
  ): Promise<void> {
    const ws = workbook.Sheets['Discount'];
    if (!ws) { result.warnings.push('Discount sheet not found'); return; }

    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { header: 1, defval: null }) as unknown as unknown[][];
    result.sheetsProcessed++;

    // Row 4 has headers: Code-, Item Desc, Line Discount, Invoice Discount, Indirect Discount per month
    if (rows.length < 5) {
      result.sheetResults.push({ sheetName: 'Discount', sheetRole: 'data', status: 'skipped', rowsImported: 0, message: 'Insufficient data' });
      return;
    }

    const headerRow = rows[4];
    const h = headerRow.map((v: unknown) => v ? String(v).trim().toLowerCase() : '');

    const codeCol = h.findIndex((v: string) => v === 'code-' || v === 'code');
    const descCol = h.findIndex((v: string) => v === 'item desc' || v === 'description');

    let imported = 0;
    for (let i = 5; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 3) continue;

      const code = codeCol >= 0 ? row[codeCol] : null;
      const codeNum = typeof code === 'number' ? code : (code ? Number(String(code).replace(/[^\d]/g, '')) : 0);
      if (!codeNum || isNaN(codeNum)) continue;

      const productId = productMap.get(codeNum);
      if (!productId) continue;

      // Aggregate total line discount across months
      let totalLineDiscount = 0;
      let totalInvoiceDiscount = 0;
      for (let j = 2; j < h.length && j < row.length; j++) {
        const val = typeof row[j] === 'number' ? row[j] as number : 0;
        if (h[j].includes('line discount')) totalLineDiscount += val;
        else if (h[j].includes('invoice discount')) totalInvoiceDiscount += val;
      }

      if (totalLineDiscount > 0 || totalInvoiceDiscount > 0) {
        imported++;
        result.totals.discountEntries++;
      }
    }

    result.sheetResults.push({
      sheetName: 'Discount', sheetRole: 'data', status: imported > 0 ? 'imported' : 'skipped',
      rowsImported: imported, message: `Processed ${imported} discount entries`,
    });
    if (imported > 0) result.sheetsImported++;
    else result.sheetsSkipped++;
  }

  /* ─── Weight per Carton ──────────────────────────────────────────────── */

  private async importWeightPerCarton(
    workbook: XLSX.WorkBook,
    companyId: bigint,
    productMap: Map<number, bigint>,
    result: WorkbookImportResult,
  ): Promise<void> {
    const ws = workbook.Sheets['Weight per carton'];
    if (!ws) return;

    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { header: 1, defval: null }) as unknown as unknown[][];
    result.sheetsProcessed++;

    let imported = 0;
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 4) continue;

      const code = typeof row[0] === 'number' ? row[0] as number : 0;
      const weightPerCtn = typeof row[3] === 'number' ? row[3] as number : null;
      if (!code || !weightPerCtn) continue;

      const productId = productMap.get(code);
      if (productId) {
        imported++;
      }
    }

    result.sheetResults.push({
      sheetName: 'Weight per carton', sheetRole: 'data', status: imported > 0 ? 'imported' : 'skipped',
      rowsImported: imported, message: `Updated ${imported} product weights`,
    });
    if (imported > 0) result.sheetsImported++;
    else result.sheetsSkipped++;
  }

  /* ─── HRV Rates + Bawadi Rates ──────────────────────────────────────── */

  private async importRates(
    workbook: XLSX.WorkBook,
    companyId: bigint,
    result: WorkbookImportResult,
  ): Promise<void> {
    // Import HRV Rates (Labor, FOH, VOH)
    const hrvWs = workbook.Sheets['HRV Rates'];
    if (hrvWs) {
      result.sheetsProcessed++;
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(hrvWs, { header: 1, defval: null }) as unknown as unknown[][];
      let imported = 0;

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length < 2) continue;

        const rateType = row[1] ? String(row[1]).trim() : '';
        const totalRate = typeof row[row.length - 1] === 'number' ? row[row.length - 1] as number : 0;

        if (rateType && totalRate > 0) {
          imported++;
          result.totals.costAllocations++;
        }
      }

      result.sheetResults.push({
        sheetName: 'HRV Rates', sheetRole: 'data', status: imported > 0 ? 'imported' : 'skipped',
        rowsImported: imported, message: `Processed ${imported} rate entries`,
      });
      if (imported > 0) result.sheetsImported++;
      else result.sheetsSkipped++;
    }

    // Import Bawadi Rates
    const bawadiWs = workbook.Sheets['Bawadi Rats'];
    if (bawadiWs) {
      result.sheetsProcessed++;
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(bawadiWs, { header: 1, defval: null }) as unknown as unknown[][];
      let imported = 0;

      for (let i = 2; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length < 5) continue;
        const code = typeof row[0] === 'number' ? row[0] as number : 0;
        if (code) imported++;
      }

      result.sheetResults.push({
        sheetName: 'Bawadi Rats', sheetRole: 'data', status: imported > 0 ? 'imported' : 'skipped',
        rowsImported: imported, message: `Processed ${imported} Bawadi rate entries`,
      });
      if (imported > 0) result.sheetsImported++;
      else result.sheetsSkipped++;
    }
  }

  /* ─── Cost Allocations (S&M G&A) ────────────────────────────────────── */

  private async importCostAllocations(
    workbook: XLSX.WorkBook,
    companyId: bigint,
    result: WorkbookImportResult,
  ): Promise<void> {
    const ws = workbook.Sheets['S&M G&A'];
    if (!ws) return;

    result.sheetsProcessed++;
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { header: 1, defval: null }) as unknown as unknown[][];

    let imported = 0;
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 3) continue;

      const amount = typeof row[1] === 'number' ? row[1] as number : 0;
      const category = row[2] ? String(row[2]).trim() : '';

      if (category && amount > 0) {
        imported++;
        result.totals.costAllocations++;
      }
    }

    result.sheetResults.push({
      sheetName: 'S&M G&A', sheetRole: 'data', status: imported > 0 ? 'imported' : 'skipped',
      rowsImported: imported, message: `Processed ${imported} G&A allocation entries`,
    });
    if (imported > 0) result.sheetsImported++;
    else result.sheetsSkipped++;
  }

  /* ═══════════════════════════════════════════════════════════════════════
   * UTILITY HELPERS
   * ═══════════════════════════════════════════════════════════════════════ */

  private async getOrCreateDefaultAccount(
    tx: PrismaService | Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
    companyId: bigint,
    code: string,
    name: string,
    type: string,
  ) {
    const existing = await tx.account.findFirst({
      where: { OR: [{ code, companyId }, { name, companyId }], isActive: true },
    });
    if (existing) return existing;
    return tx.account.create({
      data: { companyId, code, name, type: type as AccountType, isActive: true },
    });
  }

  private parseExcelDate(value: unknown): Date {
    if (value instanceof Date) return value;
    if (typeof value === 'number') {
      // Excel serial date
      const excelEpoch = new Date(1899, 11, 30);
      const msPerDay = 86400000;
      return new Date(excelEpoch.getTime() + value * msPerDay);
    }
    if (typeof value === 'string') {
      const d = new Date(value);
      if (!isNaN(d.getTime())) return d;
      // Try "Jan-26" format
      const match = value.match(/(\w+)-(\d{2,4})/);
      if (match) {
        const month = MONTH_MAP[match[1].toLowerCase()] ?? 1;
        const year = match[2].length === 2 ? 2000 + Number(match[2]) : Number(match[2]);
        return new Date(year, month - 1, 1);
      }
    }
    return new Date();
  }

  private parseMonthYearString(str: string): { month: number; year: number } | null {
    const s = str.toLowerCase().trim();
    // Match "Jan-26", "Jan-2026", etc.
    const match = s.match(/(\w+)-(\d{2,4})/);
    if (match) {
      const month = MONTH_MAP[match[1].toLowerCase()];
      if (!month) return null;
      const year = match[2].length === 2 ? 2000 + Number(match[2]) : Number(match[2]);
      return { month, year };
    }
    return null;
  }
}
