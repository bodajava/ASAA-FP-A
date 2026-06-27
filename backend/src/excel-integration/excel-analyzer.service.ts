/**
 * Excel Analyzer Service
 *
 * Reads any Excel workbook and produces a complete structural analysis.
 * Preserves all original sheet names, column names, and business terminology.
 * Detects relationships between sheets automatically.
 * Determines correct import order via topological sort.
 */

import { Injectable, Logger } from '@nestjs/common';
import * as XLSX from 'xlsx';
import {
  WorkbookAnalysis, SheetAnalysis, ColumnAnalysis, ForeignKeyRelation,
  ValidationRule, DuplicateRule, AnalysisWarning,
} from './types/excel-integration.types';

@Injectable()
export class ExcelAnalyzerService {
  private readonly logger = new Logger(ExcelAnalyzerService.name);

  /* ─── Well-known column name patterns for FK detection ──────────────── */

  private readonly FK_PATTERNS: Array<{
    pattern: RegExp;
    referenceSheet: string;
    referenceColumn: string;
  }> = [
    { pattern: /^(company[_\s]?id|company[_\s]?code|company[_\s]?name)$/i, referenceSheet: 'companies', referenceColumn: 'code' },
    { pattern: /^(site[_\s]?id|site[_\s]?code|site[_\s]?name|branch[_\s]?code|warehouse[_\s]?code|factory[_\s]?code)$/i, referenceSheet: 'sites', referenceColumn: 'code' },
    { pattern: /^(unit[_\s]?id|unit[_\s]?symbol|uom)$/i, referenceSheet: 'units', referenceColumn: 'symbol' },
    { pattern: /^(account[_\s]?code|gl[_\s]?code|account[_\s]?number)$/i, referenceSheet: 'accounts', referenceColumn: 'code' },
    { pattern: /^(cost[_\s]?center[_\s]?code|cc[_\s]?code|department[_\s]?code)$/i, referenceSheet: 'costcenters', referenceColumn: 'code' },
    { pattern: /^(category[_\s]?id|category[_\s]?name|product[_\s]?category)$/i, referenceSheet: 'productcategories', referenceColumn: 'name' },
    { pattern: /^(supplier[_\s]?id|supplier[_\s]?code|supplier[_\s]?name|vendor[_\s]?code|vendor[_\s]?name)$/i, referenceSheet: 'suppliers', referenceColumn: 'code' },
    { pattern: /^(customer[_\s]?id|customer[_\s]?code|customer[_\s]?name|client[_\s]?code)$/i, referenceSheet: 'customers', referenceColumn: 'code' },
    { pattern: /^(product[_\s]?sku|sku|product[_\s]?code|item[_\s]?code|item[_\s]?sku)$/i, referenceSheet: 'products', referenceColumn: 'sku' },
    { pattern: /^(material[_\s]?code|material[_\s]?id|raw[_\s]?material[_\s]?code|rm[_\s]?code)$/i, referenceSheet: 'materials', referenceColumn: 'code' },
    { pattern: /^(bom[_\s]?id|recipe[_\s]?id|bill[_\s]?of[_\s]?material)$/i, referenceSheet: 'bomrecipes', referenceColumn: 'id' },
    { pattern: /^(scenario[_\s]?id|scenario[_\s]?name)$/i, referenceSheet: 'scenarios', referenceColumn: 'name' },
    { pattern: /^(budget[_\s]?cycle[_\s]?id|budget[_\s]?cycle[_\s]?name|budget[_\s]?name)$/i, referenceSheet: 'budgetcycles', referenceColumn: 'name' },
    { pattern: /^(forecast[_\s]?cycle[_\s]?id|forecast[_\s]?cycle[_\s]?name|forecast[_\s]?name)$/i, referenceSheet: 'forecastcycles', referenceColumn: 'name' },
    { pattern: /^(import[_\s]?id|import[_\s]?reference)$/i, referenceSheet: 'actualimports', referenceColumn: 'id' },
    { pattern: /^(customer[_\s]?code|client[_\s]?code)$/i, referenceSheet: 'customers', referenceColumn: 'code' },
  ];

  /* ─── Sheet name → module mapping patterns ─────────────────────────── */

  private readonly SHEET_MODULE_MAP: Array<{ pattern: RegExp; module: string; description: string }> = [
    { pattern: /^compan(y|ies)$/i, module: 'companies', description: 'Company master data' },
    { pattern: /^site(s)?$/i, module: 'sites', description: 'Sites, branches, factories, warehouses' },
    { pattern: /^unit(s)?$/i, module: 'units', description: 'Units of measurement' },
    { pattern: /^account(s)?$/i, module: 'accounts', description: 'Chart of accounts' },
    { pattern: /^cost[_\s]?center(s)?$/i, module: 'costcenters', description: 'Cost centers / departments' },
    { pattern: /^product[_\s]?categor(y|ies)$/i, module: 'productcategories', description: 'Product categories' },
    { pattern: /^customer(s)?$/i, module: 'customers', description: 'Customer master data' },
    { pattern: /^supplier(s)?|vendor(s)?$/i, module: 'suppliers', description: 'Supplier / vendor master data' },
    { pattern: /^material(s)?|raw[_\s]?material(s)?$/i, module: 'materials', description: 'Raw materials & packaging' },
    { pattern: /^product(s)?$/i, module: 'products', description: 'Finished goods / products' },
    { pattern: /^bom[_\s]?recipe(s)?|bill[_\s]?of[_\s]?material(s)?|bom$/i, module: 'bomrecipes', description: 'Bill of materials' },
    { pattern: /^bom[_\s]?line(s)?|bom[_\s]?detail(s)?$/i, module: 'bomlines', description: 'BOM line items' },
    { pattern: /^production[_\s]?plan(s)?|manufacturing[_\s]?plan(s)?$/i, module: 'productionplans', description: 'Production planning' },
    { pattern: /^inventory|stock|warehouse[_\s]?stock/i, module: 'inventory', description: 'Inventory snapshots' },
    { pattern: /^raw[_\s]?material[_\s]?price(s)?|material[_\s]?price(s)?|rm[_\s]?price(s)?|price[_\s]?list$/i, module: 'materialprices', description: 'Raw material prices' },
    { pattern: /^budget[_\s]?line(s)?|budget(s)?$/i, module: 'budgetlines', description: 'Budget data' },
    { pattern: /^forecast[_\s]?line(s)?|forecast(s)?$/i, module: 'forecastlines', description: 'Forecast data' },
    { pattern: /^actual(s)?|actual[_\s]?line(s)?|gl[_\s]?entry(s)?|journal[_\s]?entry(s)?|transaction(s)?$/i, module: 'actuallines', description: 'Actual transactions / GL entries' },
    { pattern: /^kpi[_\s]?target(s)?|kpi(s)?$/i, module: 'kpitargets', description: 'KPI targets' },
    { pattern: /^exchange[_\s]?rate(s)?|currency[_\s]?rate(s)?|fx[_\s]?rate(s)?$/i, module: 'exchangerates', description: 'Exchange rates' },
    { pattern: /^promotion(s)?|discount(s)?|offer(s)?$/i, module: 'promotions', description: 'Promotions & discounts' },
    { pattern: /^headcount[_\s]?plan(s)?|hr[_\s]?plan(s)?|staffing[_\s]?plan(s)?$/i, module: 'headcountplans', description: 'Headcount planning' },
    { pattern: /^notification[_\s]?rule(s)?|alert[_\s]?rule(s)?$/i, module: 'notificationrules', description: 'Notification rules' },
    { pattern: /^p&l|profit[_\s]?&[_\s]?loss|income[_\s]?statement|financial[_\s]?statement/i, module: 'actuallines', description: 'P&L data (maps to actual transactions)' },
    { pattern: /^selling[_\s]?price(s)?|price[_\s]?list|customer[_\s]?price/i, module: 'products', description: 'Selling prices (updates product prices)' },
    { pattern: /^discount(s)?|commercial[_\s]?polic(y|ies)/i, module: 'promotions', description: 'Commercial policies / discounts' },
    { pattern: /^packaging|carton|weight[_\s]?per[_\s]?carton/i, module: 'materials', description: 'Packaging master data' },
    { pattern: /^data$/i, module: 'actuallines', description: 'Generic data sheet (maps to actual transactions)' },
    { pattern: /^s&m|s[_\s]&[_\s]m|g&a|g[_\s]&[_\s]a|operating[_\s]?expense/i, module: 'actuallines', description: 'S&M / G&A expenses (maps to actuals)' },
  ];

  /* ─── Main Analysis Entry Point ────────────────────────────────────── */

  /**
   * Analyze an entire Excel workbook.
   * Returns a complete structural analysis with import order and validation rules.
   */
  analyzeWorkbook(buffer: Buffer, fileName: string): WorkbookAnalysis {
    this.logger.log(`Analyzing workbook: ${fileName}`);
    const workbook = XLSX.read(buffer, { type: 'buffer', cellStyles: false });

    const sheets: SheetAnalysis[] = [];
    const allRelationships: ForeignKeyRelation[] = [];
    const globalWarnings: AnalysisWarning[] = [];

    // Phase 1: Analyze each sheet independently
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) continue;

      const analysis = this.analyzeSheet(sheetName, sheet, workbook.SheetNames);
      sheets.push(analysis);
      allRelationships.push(...analysis.foreignKeys);
    }

    // Phase 2: Resolve cross-sheet dependencies and determine import order
    this.resolveDependencies(sheets);

    // Phase 3: Topological sort for import order
    const importOrder = this.topologicalSort(sheets);

    // Phase 4: Detect global warnings
    this.detectGlobalWarnings(sheets, globalWarnings);

    const totalRows = sheets.reduce((sum, s) => sum + s.rowCount, 0);

    return {
      fileName,
      analyzedAt: new Date().toISOString(),
      sheets,
      importOrder,
      relationships: allRelationships,
      warnings: globalWarnings,
      isReady: sheets.every(s => s.isReady) && globalWarnings.filter(w => w.type === 'orphan_data').length === 0,
      totalRows,
    };
  }

  /* ─── Sheet Analysis ───────────────────────────────────────────────── */

  private analyzeSheet(
    sheetName: string,
    sheet: XLSX.WorkSheet,
    allSheetNames: string[],
  ): SheetAnalysis {
    // Parse rows with original headers preserved
    const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });
    const headers = Object.keys(rawData[0] || {});
    const normalizedHeaders = headers.map(h => this.normalizeKey(h));

    // Detect module from sheet name
    const detectedModule = this.detectModule(sheetName);

    // Analyze each column
    const columns: ColumnAnalysis[] = headers.map((header, idx) => {
      const values = rawData.map(row => row[header]);
      return this.analyzeColumn(header, normalizedHeaders[idx], values, allSheetNames);
    });

    // Build validation rules
    const validationRules = this.buildValidationRules(columns, detectedModule);

    // Build duplicate rules
    const duplicateRules = this.buildDuplicateRules(columns, detectedModule);

    // Detect foreign keys
    const foreignKeys = this.detectForeignKeys(columns, allSheetNames);

    // Determine required/optional columns
    const requiredColumns = columns
      .filter(c => this.isLikelyRequired(c, detectedModule))
      .map(c => c.originalName);

    const optionalColumns = columns
      .filter(c => !this.isLikelyRequired(c, detectedModule))
      .map(c => c.originalName);

    // Generate warnings for this sheet
    const warnings = this.detectSheetWarnings(columns, rawData.length);

    return {
      sheetName,
      detectedModule,
      erpModule: detectedModule,
      columns,
      rowCount: rawData.length,
      requiredColumns,
      optionalColumns,
      foreignKeys,
      validationRules,
      duplicateRules,
      dependsOn: foreignKeys.map(fk => fk.referenceSheet),
      dependedOnBy: [],
      importOrder: 0,
      isReady: rawData.length > 0 && requiredColumns.every(rc =>
        columns.some(c => c.originalName === rc && c.fillRate > 50),
      ),
      warnings,
    };
  }

  /* ─── Column Analysis ──────────────────────────────────────────────── */

  private analyzeColumn(
    originalName: string,
    normalizedKey: string,
    values: unknown[],
    allSheetNames: string[],
  ): ColumnAnalysis {
    const nonNull = values.filter(v => v !== null && v !== undefined && v !== '');
    const fillRate = values.length > 0 ? (nonNull.length / values.length) * 100 : 0;
    const sampleValues = nonNull.slice(0, 5).map(String);

    // Detect type
    const detectedType = this.detectColumnType(nonNull);

    // Detect potential FK
    const fkMatch = this.matchFKPattern(normalizedKey, allSheetNames);
    const isPotentialFK = fkMatch !== null;

    // Detect if potential primary key
    const isPotentialKey = this.isPotentialPrimaryKey(normalizedKey, nonNull);

    // Map to ERP field
    const erpMapping = this.mapToErpField(normalizedKey, detectedType);

    return {
      originalName,
      normalizedKey,
      detectedType,
      hasData: nonNull.length > 0,
      fillRate: Math.round(fillRate * 10) / 10,
      sampleValues,
      isPotentialKey,
      isPotentialFK,
      references: fkMatch ? { sheet: fkMatch.referenceSheet, column: fkMatch.referenceColumn } : undefined,
      mappedErpField: erpMapping.field,
      mappingConfidence: erpMapping.confidence,
      userOverride: false,
    };
  }

  private detectColumnType(values: unknown[]): ColumnAnalysis['detectedType'] {
    if (values.length === 0) return 'empty';

    let numbers = 0;
    let dates = 0;
    let booleans = 0;
    let currencies = 0;

    for (const v of values) {
      const s = String(v).trim();
      if (s === '') continue;

      if (this.isDateString(s)) dates++;
      else if (this.isBooleanString(s)) booleans++;
      else if (this.isCurrencyString(s)) currencies++;
      else if (this.isNumericString(s)) numbers++;
    }

    const total = values.length;
    if (dates / total > 0.7) return 'date';
    if (booleans / total > 0.7) return 'boolean';
    if (currencies / total > 0.7) return 'currency';
    if (numbers / total > 0.7) return 'number';

    // Mixed if significant portions are different types
    const typeCount = [dates, booleans, currencies, numbers].filter(n => n / total > 0.2).length;
    if (typeCount > 1) return 'mixed';

    return 'string';
  }

  private isDateString(s: string): boolean {
    if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(s)) return true;
    if (/^\d{1,2}[-/]\d{1,2}[-/]\d{4}/.test(s)) return true;
    if (/^\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{4}/i.test(s)) return true;
    const d = new Date(s);
    return !isNaN(d.getTime()) && d.getFullYear() > 1990 && d.getFullYear() < 2100;
  }

  private isBooleanString(s: string): boolean {
    return /^(true|false|yes|no|y|n|0|1)$/i.test(s);
  }

  private isCurrencyString(s: string): boolean {
    return /^[$€£EGP|USD|EUR|SAR|AED]?\s*[\d,]+\.?\d*$/.test(s.replace(/\s/g, ''));
  }

  private isNumericString(s: string): boolean {
    return /^-?[\d,]+\.?\d*$/.test(s.replace(/\s/g, ''));
  }

  /* ─── FK Detection ─────────────────────────────────────────────────── */

  private matchFKPattern(
    normalizedKey: string,
    allSheetNames: string[],
  ): { referenceSheet: string; referenceColumn: string } | null {
    for (const fk of this.FK_PATTERNS) {
      if (fk.pattern.test(normalizedKey)) {
        // Check if the referenced sheet exists in the workbook
        const refSheetExists = allSheetNames.some(name =>
          name.toLowerCase().replace(/[_\s-]/g, '').includes(fk.referenceSheet.toLowerCase()),
        );
        if (refSheetExists) {
          return { referenceSheet: fk.referenceSheet, referenceColumn: fk.referenceColumn };
        }
        // Even if the sheet doesn't exist, the pattern match is still valid
        // (the FK target might be in the database already)
        return { referenceSheet: fk.referenceSheet, referenceColumn: fk.referenceColumn };
      }
    }
    return null;
  }

  private isPotentialPrimaryKey(normalizedKey: string, values: unknown[]): boolean {
    const keyPatterns = /^(id|code|sku|number|key|ref|reference|code|barcode|batch|serial)$/i;
    if (!keyPatterns.test(normalizedKey)) return false;
    const uniqueValues = new Set(values.map(String));
    return uniqueValues.size === values.length && values.length > 0;
  }

  /* ─── Foreign Key Detection ────────────────────────────────────────── */

  private detectForeignKeys(
    columns: ColumnAnalysis[],
    allSheetNames: string[],
  ): ForeignKeyRelation[] {
    const relations: ForeignKeyRelation[] = [];

    for (const col of columns) {
      if (col.isPotentialFK && col.references) {
        relations.push({
          localColumn: col.originalName,
          referenceSheet: col.references.sheet,
          referenceColumn: col.references.column,
          type: 'required',
          detectionMethod: 'name_match',
        });
      }
    }

    return relations;
  }

  /* ─── ERP Field Mapping ────────────────────────────────────────────── */

  private mapToErpField(normalizedKey: string, type: string): { field: string; confidence: number } {
    const mappings: Array<{ pattern: RegExp; field: string; confidence: number }> = [
      { pattern: /^(id|row[_\s]?id|line[_\s]?id)$/i, field: 'id', confidence: 1 },
      { pattern: /^(code|account[_\s]?code|gl[_\s]?code|account[_\s]?number|number)$/i, field: 'code', confidence: 1 },
      { pattern: /^(sku|product[_\s]?sku|item[_\s]?sku|item[_\s]?code|product[_\s]?code)$/i, field: 'sku', confidence: 1 },
      { pattern: /^(name|description|title|item[_\s]?name|product[_\s]?name|material[_\s]?name)$/i, field: 'name', confidence: 0.9 },
      { pattern: /^(type|category|class|classification)$/i, field: 'type', confidence: 0.8 },
      { pattern: /^(price|cost|amount|rate|unit[_\s]?price|unit[_\s]?cost|purchase[_\s]?price|selling[_\s]?price|standard[_\s]?cost)$/i, field: 'price', confidence: 0.9 },
      { pattern: /^(quantity|qty|amount|volume|stock|balance|opening|closing)$/i, field: 'quantity', confidence: 0.8 },
      { pattern: /^(date|transaction[_\s]?date|effective[_\s]?date|start[_\s]?date|end[_\s]?date|due[_\s]?date|created[_\s]?at)$/i, field: 'date', confidence: 0.9 },
      { pattern: /^(currency|curr|ccy)$/i, field: 'currency', confidence: 1 },
      { pattern: /^(unit|uom|unit[_\s]?of[_\s]?measure|measure)$/i, field: 'unit', confidence: 0.9 },
      { pattern: /^(status|state)$/i, field: 'status', confidence: 0.8 },
      { pattern: /^(address|location|street|city|country|region|zip|postal)$/i, field: 'address', confidence: 0.7 },
      { pattern: /^(phone|telephone|mobile|fax)$/i, field: 'phone', confidence: 0.9 },
      { pattern: /^(email|e-mail|mail)$/i, field: 'email', confidence: 1 },
      { pattern: /^(notes|remarks|comment|comments|description)$/i, field: 'notes', confidence: 0.6 },
      { pattern: /^(month|period|period[_\s]?month|fiscal[_\s]?month)$/i, field: 'periodMonth', confidence: 0.9 },
      { pattern: /^(year|fiscal[_\s]?year)$/i, field: 'fiscalYear', confidence: 0.9 },
      { pattern: /^(amount|total|sum|value|budget[_\s]?amount|forecast[_\s]?amount)$/i, field: 'amount', confidence: 0.9 },
      { pattern: /^(weight|weight[_\s]?kg|net[_\s]?weight|gross[_\s]?weight)$/i, field: 'weight', confidence: 0.9 },
      { pattern: /^(version|ver)$/i, field: 'version', confidence: 0.9 },
      { pattern: /^(is[_\s]?active|active|enabled)$/i, field: 'isActive', confidence: 0.9 },
      { pattern: /^(parent[_\s]?id|parent[_\s]?code|parent[_\s]?name)$/i, field: 'parentId', confidence: 0.8 },
      { pattern: /^(site[_\s]?code|branch[_\s]?code|warehouse[_\s]?code|factory[_\s]?code)$/i, field: 'siteCode', confidence: 0.9 },
      { pattern: /^(cost[_\s]?center[_\s]?code|cc[_\s]?code|department[_\s]?code)$/i, field: 'costCenterCode', confidence: 0.9 },
      { pattern: /^(customer[_\s]?code|client[_\s]?code)$/i, field: 'customerCode', confidence: 0.9 },
      { pattern: /^(supplier[_\s]?code|vendor[_\s]?code)$/i, field: 'supplierCode', confidence: 0.9 },
      { pattern: /^(material[_\s]?code|rm[_\s]?code|raw[_\s]?material[_\s]?code)$/i, field: 'materialCode', confidence: 0.9 },
      { pattern: /^(product[_\s]?sku|product[_\s]?code|item[_\s]?sku)$/i, field: 'productSku', confidence: 0.9 },
      { pattern: /^(yield[_\s]?%|yield[_\s]?pct|yield[_\s]?percent)$/i, field: 'yieldPct', confidence: 1 },
      { pattern: /^(waste[_\s]?%|wastage[_\s]?%|waste[_\s]?pct)$/i, field: 'wastagePct', confidence: 1 },
      { pattern: /^(discount[_\s]?%|discount[_\s]?pct)$/i, field: 'discountPct', confidence: 1 },
      { pattern: /^(credit[_\s]?limit)$/i, field: 'creditLimit', confidence: 1 },
      { pattern: /^(payment[_\s]?terms|terms)$/i, field: 'paymentTerms', confidence: 0.9 },
      { pattern: /^(legal[_\s]?name|company[_\s]?name)$/i, field: 'legalName', confidence: 0.8 },
      { pattern: /^(industry[_\s]?type|industry)$/i, field: 'industryType', confidence: 0.9 },
      { pattern: /^(tax[_\s]?number|vat[_\s]?number|tin)$/i, field: 'taxNumber', confidence: 1 },
      { pattern: /^(fiscal[_\s]?year[_\s]?start[_\s]?month)$/i, field: 'fiscalYearStartMonth', confidence: 1 },
      { pattern: /^(driver[_\s]?type)$/i, field: 'driverType', confidence: 0.9 },
      { pattern: /^(kpi[_\s]?name|kpi)$/i, field: 'kpiName', confidence: 0.9 },
      { pattern: /^(kpi[_\s]?category)$/i, field: 'kpiCategory', confidence: 0.9 },
      { pattern: /^(target[_\s]?value|target)$/i, field: 'targetValue', confidence: 0.9 },
      { pattern: /^(actual[_\s]?value|actual)$/i, field: 'actualValue', confidence: 0.9 },
      { pattern: /^(from[_\s]?currency|source[_\s]?currency)$/i, field: 'fromCurrency', confidence: 1 },
      { pattern: /^(to[_\s]?currency|target[_\s]?currency)$/i, field: 'toCurrency', confidence: 1 },
      { pattern: /^(exchange[_\s]?rate|rate)$/i, field: 'rate', confidence: 0.9 },
      { pattern: /^(rate[_\s]?date|fx[_\s]?date)$/i, field: 'rateDate', confidence: 1 },
      { pattern: /^(snapshot[_\s]?date|inventory[_\s]?date)$/i, field: 'snapshotDate', confidence: 1 },
      { pattern: /^(batch[_\s]?number|batch)$/i, field: 'batchNumber', confidence: 0.9 },
      { pattern: /^(barcode|upc|ean|gtin)$/i, field: 'barcode', confidence: 1 },
      { pattern: /^(min[_\s]?stock|minimum[_\s]?stock|safety[_\s]?stock)$/i, field: 'minStock', confidence: 0.9 },
      { pattern: /^(reorder[_\s]?point|reorder)$/i, field: 'reorderPoint', confidence: 0.9 },
      { pattern: /^(material[_\s]?type|type[_\s]?of[_\s]?material)$/i, field: 'materialType', confidence: 0.9 },
      { pattern: /^(product[_\s]?type|type[_\s]?of[_\s]?product)$/i, field: 'productType', confidence: 0.9 },
      { pattern: /^(customer[_\s]?type|type[_\s]?of[_\s]?customer)$/i, field: 'customerType', confidence: 0.9 },
      { pattern: /^(supplier[_\s]?type|vendor[_\s]?type)$/i, field: 'supplierType', confidence: 0.9 },
    ];

    for (const m of mappings) {
      if (m.pattern.test(normalizedKey)) {
        return { field: m.field, confidence: m.confidence };
      }
    }

    return { field: normalizedKey, confidence: 0.3 };
  }

  /* ─── Module Detection ─────────────────────────────────────────────── */

  private detectModule(sheetName: string): string {
    const cleaned = sheetName.replace(/[_\s-]+/g, '').toLowerCase();
    for (const m of this.SHEET_MODULE_MAP) {
      if (m.pattern.test(cleaned) || m.pattern.test(sheetName)) {
        return m.module;
      }
    }
    // Fallback: use cleaned sheet name as module key
    return cleaned;
  }

  /* ─── Validation Rules ─────────────────────────────────────────────── */

  private buildValidationRules(columns: ColumnAnalysis[], module: string): ValidationRule[] {
    const rules: ValidationRule[] = [];

    for (const col of columns) {
      // Required field rule
      if (this.isLikelyRequired(col, module)) {
        rules.push({
          column: col.originalName,
          type: 'required',
          description: `${col.originalName} is required`,
          severity: 'error',
        });
      }

      // Type-based rules
      if (col.detectedType === 'number' || col.detectedType === 'currency') {
        rules.push({
          column: col.originalName,
          type: 'type',
          description: `${col.originalName} must be a valid number`,
          expectedType: 'number',
          severity: 'error',
        });
      }

      if (col.detectedType === 'date') {
        rules.push({
          column: col.originalName,
          type: 'type',
          description: `${col.originalName} must be a valid date`,
          expectedType: 'date',
          severity: 'error',
        });
      }

      // FK rules
      if (col.isPotentialFK && col.references) {
        rules.push({
          column: col.originalName,
          type: 'fk',
          description: `${col.originalName} must reference a valid ${col.references.sheet}.${col.references.column}`,
          fkReference: col.references,
          severity: 'error',
        });
      }
    }

    return rules;
  }

  private buildDuplicateRules(columns: ColumnAnalysis[], module: string): DuplicateRule[] {
    const rules: DuplicateRule[] = [];
    const keyColumns = columns.filter(c => c.isPotentialKey);

    if (keyColumns.length > 0) {
      rules.push({
        columns: keyColumns.map(c => c.originalName),
        type: 'exact',
        description: `Unique key: ${keyColumns.map(c => c.originalName).join(', ')}`,
      });
    }

    return rules;
  }

  /* ─── Required Field Detection ─────────────────────────────────────── */

  private isLikelyRequired(col: ColumnAnalysis, module: string): boolean {
    const requiredPatterns = /^(id|code|sku|name|type|account[_\s]?code|transaction[_\s]?date|amount|period[_\s]?month|fiscal[_\s]?year)$/i;
    if (requiredPatterns.test(col.normalizedKey)) return true;
    if (col.fillRate > 90 && col.detectedType === 'string') return true;
    return false;
  }

  /* ─── Sheet Warnings ───────────────────────────────────────────────── */

  private detectSheetWarnings(columns: ColumnAnalysis[], rowCount: number): AnalysisWarning[] {
    const warnings: AnalysisWarning[] = [];

    for (const col of columns) {
      if (!col.hasData) {
        warnings.push({
          type: 'empty_column',
          column: col.originalName,
          message: `Column "${col.originalName}" is completely empty`,
          suggestion: 'This column will be skipped during import',
        });
      } else if (col.fillRate < 30) {
        warnings.push({
          type: 'low_fill_rate',
          column: col.originalName,
          message: `Column "${col.originalName}" has only ${col.fillRate}% data`,
          suggestion: 'Consider if this column is needed for import',
        });
      }

      if (col.detectedType === 'mixed') {
        warnings.push({
          type: 'type_mismatch',
          column: col.originalName,
          message: `Column "${col.originalName}" contains mixed data types`,
          suggestion: 'All values will be treated as text. Consider standardizing the column.',
        });
      }

      if (/^\d+$/.test(col.originalName.trim())) {
        warnings.push({
          type: 'naming_convention',
          column: col.originalName,
          message: `Column "${col.originalName}" appears to be a numbered column without a header`,
          suggestion: 'Add a descriptive header name in the Excel file',
        });
      }
    }

    if (rowCount === 0) {
      warnings.push({
        type: 'orphan_data',
        message: 'Sheet has headers but no data rows',
        suggestion: 'Add data rows or remove this sheet',
      });
    }

    return warnings;
  }

  /* ─── Global Warnings ──────────────────────────────────────────────── */

  private detectGlobalWarnings(sheets: SheetAnalysis[], warnings: AnalysisWarning[]): void {
    // Check for sheets with no recognized module
    for (const sheet of sheets) {
      if (sheet.detectedModule === sheet.sheetName.toLowerCase().replace(/[_\s-]/g, '')) {
        warnings.push({
          type: 'naming_convention',
          message: `Sheet "${sheet.sheetName}" was not auto-recognized as an ERP module`,
          suggestion: 'Review the sheet name or manually map it to the correct module',
        });
      }
    }

    // Check for circular dependencies
    for (const sheet of sheets) {
      if (sheet.dependsOn.includes(sheet.sheetName)) {
        warnings.push({
          type: 'orphan_data',
          message: `Sheet "${sheet.sheetName}" has a circular dependency with itself`,
          suggestion: 'Review foreign key references',
        });
      }
    }
  }

  /* ─── Dependency Resolution ────────────────────────────────────────── */

  private resolveDependencies(sheets: SheetAnalysis[]): void {
    const sheetMap = new Map(sheets.map(s => [s.sheetName, s]));

    // Build reverse dependencies (dependedOnBy)
    for (const sheet of sheets) {
      for (const dep of sheet.dependsOn) {
        const depSheet = sheetMap.get(dep);
        if (depSheet && !depSheet.dependedOnBy.includes(sheet.sheetName)) {
          depSheet.dependedOnBy.push(sheet.sheetName);
        }
      }
    }
  }

  /* ─── Topological Sort ─────────────────────────────────────────────── */

  private topologicalSort(sheets: SheetAnalysis[]): string[] {
    const visited = new Set<string>();
    const order: string[] = [];
    const sheetMap = new Map(sheets.map(s => [s.sheetName, s]));

    const visit = (sheetName: string) => {
      if (visited.has(sheetName)) return;
      visited.add(sheetName);

      const sheet = sheetMap.get(sheetName);
      if (sheet) {
        for (const dep of sheet.dependsOn) {
          if (sheetMap.has(dep)) visit(dep);
        }
      }

      order.push(sheetName);
    };

    for (const sheet of sheets) {
      visit(sheet.sheetName);
    }

    // Assign import order numbers
    order.forEach((name, idx) => {
      const sheet = sheetMap.get(name);
      if (sheet) sheet.importOrder = idx + 1;
    });

    return order;
  }

  /* ─── Utilities ────────────────────────────────────────────────────── */

  private normalizeKey(key: string): string {
    return key.toLowerCase().replace(/[\s_-]+/g, '').replace(/[^a-z0-9]/g, '');
  }
}
