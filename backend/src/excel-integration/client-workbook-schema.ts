/**
 * Client Workbook Schema
 *
 * Thin adapter over import-definitions.ts.
 * Column definitions, sample data, and aliases are now the single source
 * of truth in import-definitions.ts. This file handles workbook-level
 * concerns (sheet names, roles, classification) only.
 */

import {
  getAllDefinitions,
  getDefinition,
  resolveModuleKey,
  type ImportColumnDef,
} from '../imports/import-definitions';

export interface ColumnDef {
  display: string;
  field: string;
  required: boolean;
  type: 'string' | 'number' | 'date' | 'boolean';
  description: string;
  allowedValues?: string[];
}

export type SheetRole = 'data' | 'reference' | 'instruction' | 'ignored';

export interface SheetDef {
  sheetName: string;
  module: string;
  description: string;
  columns: ColumnDef[];
  requiresParent?: string;
  role: SheetRole;
}

/* ─── Sheet name mapping: moduleKey → friendly sheet name ─────────── */

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

function mapColType(t: ImportColumnDef['type']): ColumnDef['type'] {
  if (t === 'enum') return 'string';
  return t;
}

function toColumnDef(c: ImportColumnDef): ColumnDef {
  return {
    display: c.display,
    field: c.field,
    required: c.required,
    type: mapColType(c.type),
    description: c.description,
    allowedValues: c.allowedValues,
  };
}

const SHEETS_CACHE: SheetDef[] | null = null;

function buildSheets(): SheetDef[] {
  const defs = getAllDefinitions();
  const sheets: SheetDef[] = [];

  for (const def of defs) {
    const sheetName = MODULE_SHEET_NAME[def.moduleKey];
    if (!sheetName) continue;

    const parentModule = def.dependencies.length > 0 ? def.dependencies[0] : undefined;
    const parentSheet = parentModule ? MODULE_SHEET_NAME[parentModule] : undefined;

    sheets.push({
      sheetName,
      module: def.moduleKey,
      description: def.description,
      role: 'data',
      columns: def.columns.map(toColumnDef),
      requiresParent: parentSheet,
    });
  }

  return sheets;
}

export const CLIENT_WORKBOOK_SHEETS: SheetDef[] = buildSheets();

/* ─── Non-data sheet names (reference/instruction) ──────────────────── */

export const NON_DATA_SHEET_NAMES = new Set([
  'start here',
  'instructions',
  'reference lists',
  'accounts reference',
  'sites reference',
  'cost centers reference',
  'products reference',
  'materials reference',
  'customers reference',
  'budget cycles reference',
]);

export const REFERENCE_SHEET_NAMES = new Set([
  'reference lists',
  'accounts reference',
  'sites reference',
  'cost centers reference',
  'products reference',
  'materials reference',
  'customers reference',
  'budget cycles reference',
]);

export function classifySheetRole(sheetName: string): {
  role: SheetRole;
  mappedModule: string;
} {
  const sn = sheetName.toLowerCase().trim();
  if (sn === 'start here' || sn === 'instructions') {
    return { role: 'instruction', mappedModule: '' };
  }
  if (REFERENCE_SHEET_NAMES.has(sn)) {
    return { role: 'reference', mappedModule: '' };
  }
  if (sn.startsWith('_') || sn.startsWith('hidden') || sn === 'sheet1') {
    return { role: 'ignored', mappedModule: '' };
  }
  return { role: 'data', mappedModule: '' };
}

/* ─── Helper functions ───────────────────────────────────────────────── */

export function getSheetByModule(moduleKey: string): SheetDef | undefined {
  const key = resolveModuleKey(moduleKey) ?? moduleKey;
  return CLIENT_WORKBOOK_SHEETS.find((s) => s.module === key);
}

export function getSheetByName(sheetName: string): SheetDef | undefined {
  return CLIENT_WORKBOOK_SHEETS.find(
    (s) => s.sheetName.toLowerCase() === sheetName.toLowerCase().trim(),
  );
}

export function getAllModuleKeys(): string[] {
  return CLIENT_WORKBOOK_SHEETS.map((s) => s.module);
}

export function getModuleDescription(moduleKey: string): string {
  const def = getDefinition(moduleKey);
  return def?.description ?? moduleKey;
}
