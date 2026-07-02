/**
 * Template Generator Service
 *
 * Generates blank Excel (.xlsx) templates with HEADERS ONLY.
 * No sample data rows, no demo rows, no fake business data.
 *
 * Column definitions are read from import-definitions.ts (single source of truth).
 * Sheet names come from client-workbook-schema.ts.
 *
 * Endpoints served:
 *   GET /excel-integration/templates/:module       → single-sheet workbook
 *   GET /excel-integration/templates/client-workbook → multi-sheet workbook
 *   GET /imports/sample/:module                     → single-sheet workbook (fallback CSV)
 */

import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import {
  getAllDefinitions,
  getDefinition,
  resolveModuleKey,
  type ImportDefinition,
} from '../imports/import-definitions';

const MODULE_SHEET_NAME: Record<string, string> = {
  'companies': 'Companies',
  'sites': 'Sites',
  'units': 'Units',
  'accounts': 'Accounts',
  'cost-centers': 'Cost Centers',
  'product-categories': 'Product Categories',
  'customers': 'Customers',
  'suppliers': 'Suppliers',
  'materials': 'Materials',
  'products': 'Products',
  'bom-recipes': 'BOM Recipes',
  'budget-lines': 'Budget',
  'forecast-lines': 'Forecast',
  'actual-lines': 'Actuals',
  'raw-material-prices': 'Material Prices',
  'production-plans': 'Production Planning',
  'exchange-rates': 'Exchange Rates',
  'kpi-targets': 'KPI Targets',
  'promotions': 'Promotions',
  'notification-rules': 'Notification Rules',
  'headcount-plans': 'Headcount Plans',
  'production-allocations': 'Production Allocations',
  'yield-waste': 'Yield & Waste',
  'sales-plans': 'Sales Plans',
};

export interface ModuleListEntry {
  module: string;
  displayName: string;
  sheetName: string;
  columnCount: number;
  requiredColumns: string[];
}

@Injectable()
export class TemplateGeneratorService {
  private readonly logger = new Logger(TemplateGeneratorService.name);
  private readonly staticDir: string;

  constructor() {
    // Resolve path relative to project root (two levels up from dist/)
    this.staticDir = path.resolve(__dirname, '../../static-templates');
    // Also try from cwd
    if (!fs.existsSync(this.staticDir)) {
      this.staticDir = path.resolve(process.cwd(), 'static-templates');
    }
  }

  /**
   * Generate a single-sheet XLSX template for a given module.
   * Loading order:
   *   1. Check backend/static-templates/{moduleKey}_template.xlsx
   *   2. If exists, return it
   *   3. If missing, generate dynamic headers-only XLSX
   * Contains the header row ONLY — no data rows.
   */
  generateModuleTemplate(moduleKey: string): Buffer {
    const resolved = resolveModuleKey(moduleKey) ?? moduleKey;
    const def = getDefinition(resolved);
    if (!def) {
      throw new BadRequestException(`Unknown module: ${moduleKey}`);
    }

    // Step 1: Try static file
    const staticFile = path.join(this.staticDir, `${resolved}_template.xlsx`);
    if (fs.existsSync(staticFile)) {
      this.logger.log(`Serving static template: ${staticFile}`);
      return fs.readFileSync(staticFile);
    }

    // Step 2: Fall back to dynamic generation
    this.logger.log(`No static template found for ${resolved}, generating dynamically`);
    return this.buildWorkbook([def]);
  }

  /**
   * Generate a multi-sheet XLSX workbook containing every registered module.
   * Each sheet has the header row ONLY — no data rows.
   */
  generateFullWorkbook(): Buffer {
    const defs = getAllDefinitions();
    return this.buildWorkbook(defs);
  }

  /**
   * Return the expected file path for a static template.
   */
  getStaticTemplatePath(moduleKey: string): string {
    const resolved = resolveModuleKey(moduleKey) ?? moduleKey;
    return path.join(this.staticDir, `${resolved}_template.xlsx`);
  }

  /**
   * Return a list of all modules available for template download.
   */
  getModuleList(): ModuleListEntry[] {
    return getAllDefinitions().map((def) => ({
      module: def.moduleKey,
      displayName: def.displayName,
      sheetName: MODULE_SHEET_NAME[def.moduleKey] ?? def.moduleKey,
      columnCount: def.columns.length,
      requiredColumns: def.columns
        .filter((c) => c.required)
        .map((c) => c.display),
    }));
  }

  /* ─── Internal ─────────────────────────────────────────────────── */

  private buildWorkbook(defs: ImportDefinition[]): Buffer {
    const wb = XLSX.utils.book_new();

    for (const def of defs) {
      const sheetName = MODULE_SHEET_NAME[def.moduleKey] ?? def.moduleKey;
      const headers = def.columns.map((c) => c.display);
      // Single row containing only the headers — no data rows.
      const aoa: string[][] = [headers];
      const ws = XLSX.utils.aoa_to_sheet(aoa);

      // Set column widths for readability.
      ws['!cols'] = def.columns.map((c) => ({
        wch: Math.max(c.display.length + 4, 14),
      }));

      XLSX.utils.book_append_sheet(wb, ws, this.truncateSheetName(sheetName));
    }

    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }

  /**
   * Excel sheet names have a 31-character limit.
   */
  private truncateSheetName(name: string): string {
    return name.length > 31 ? name.substring(0, 31) : name;
  }
}
