/**
 * ERP Module Mapper Service
 *
 * Maps each analyzed sheet to an ERP module with column mappings,
 * validation rules, and database target table configuration.
 * Handles unknown sheets gracefully with manual mapping support.
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  SheetAnalysis,
  ErpModuleMapping,
  ColumnMapping,
  ColumnAnalysis,
} from './types/excel-integration.types';

@Injectable()
export class ErpModuleMapperService {
  private readonly logger = new Logger(ErpModuleMapperService.name);

  /* ─── Module Registry ──────────────────────────────────────────────── */

  private readonly MODULE_REGISTRY: Array<{
    key: string;
    patterns: RegExp[];
    description: string;
    targetTable: string;
    requiresParent?: string;
    columnDefaults: Record<string, string>;
  }> = [
    {
      key: 'companies',
      patterns: [/^compan(y|ies)$/i],
      description: 'Company master data',
      targetTable: 'Company',
      columnDefaults: {
        code: 'code',
        name: 'name',
        legalname: 'legalName',
        industrytype: 'industryType',
        taxnumber: 'taxNumber',
        fiscalyearstartmonth: 'fiscalYearStartMonth',
        currency: 'baseCurrency',
      },
    },
    {
      key: 'sites',
      patterns: [
        /^site(s)?$/i,
        /^branch(es)?$/i,
        /^factor(y|ies)$/i,
        /^warehouse(s)?$/i,
      ],
      description: 'Sites, branches, factories, warehouses',
      targetTable: 'Site',
      requiresParent: 'companies',
      columnDefaults: {
        code: 'code',
        name: 'name',
        type: 'type',
        sitecode: 'code',
        companyid: 'companyId',
      },
    },
    {
      key: 'units',
      patterns: [/^unit(s)?$/i, /^uom$/i],
      description: 'Units of measurement',
      targetTable: 'Unit',
      columnDefaults: { code: 'code', symbol: 'symbol', name: 'name' },
    },
    {
      key: 'accounts',
      patterns: [
        /^account(s)?$/i,
        /^chart[_\s]?of[_\s]?account(s)?$/i,
        /^coa$/i,
      ],
      description: 'Chart of accounts',
      targetTable: 'Account',
      columnDefaults: {
        code: 'code',
        name: 'name',
        type: 'type',
        accountcode: 'code',
        glcode: 'code',
      },
    },
    {
      key: 'costcenters',
      patterns: [/^cost[_\s]?center(s)?$/i, /^department(s)?$/i],
      description: 'Cost centers / departments',
      targetTable: 'CostCenter',
      columnDefaults: { code: 'code', name: 'name', costcentercode: 'code' },
    },
    {
      key: 'productcategories',
      patterns: [/^product[_\s]?categor(y|ies)$/i, /^categor(y|ies)$/i],
      description: 'Product categories',
      targetTable: 'ProductCategory',
      columnDefaults: {
        code: 'code',
        name: 'name',
        description: 'description',
      },
    },
    {
      key: 'customers',
      patterns: [/^customer(s)?$/i, /^client(s)?$/i],
      description: 'Customer master data',
      targetTable: 'Customer',
      columnDefaults: {
        code: 'code',
        name: 'name',
        type: 'type',
        email: 'email',
        phone: 'phone',
        address: 'address',
        customertype: 'customerType',
      },
    },
    {
      key: 'suppliers',
      patterns: [/^supplier(s)?$/i, /^vendor(s)?$/i],
      description: 'Supplier / vendor master data',
      targetTable: 'Supplier',
      columnDefaults: {
        code: 'code',
        name: 'name',
        type: 'type',
        email: 'email',
        phone: 'phone',
        address: 'address',
        suppliertype: 'supplierType',
      },
    },
    {
      key: 'materials',
      patterns: [
        /^material(s)?$/i,
        /^raw[_\s]?material(s)?$/i,
        /^rm$/i,
        /^packaging$/i,
      ],
      description: 'Raw materials & packaging',
      targetTable: 'Material',
      columnDefaults: {
        code: 'code',
        name: 'name',
        type: 'type',
        unit: 'unit',
        weight: 'weight',
        materialcode: 'code',
        materialtype: 'materialType',
      },
    },
    {
      key: 'products',
      patterns: [
        /^product(s)?$/i,
        /^finished[_\s]?good(s)?$/i,
        /^fg$/i,
        /^item(s)?$/i,
      ],
      description: 'Finished goods / products',
      targetTable: 'Product',
      columnDefaults: {
        code: 'code',
        sku: 'sku',
        name: 'name',
        type: 'type',
        unit: 'unit',
        price: 'price',
        sellingprice: 'sellingPrice',
        weight: 'weight',
        categoryid: 'productCategoryId',
      },
    },
    {
      key: 'bomrecipes',
      patterns: [
        /^bom[_\s]?recipe(s)?$/i,
        /^bill[_\s]?of[_\s]?material(s)?$/i,
        /^bom$/i,
      ],
      description: 'Bill of materials',
      targetTable: 'BomRecipe',
      requiresParent: 'products',
      columnDefaults: {
        code: 'code',
        name: 'name',
        productsku: 'productSku',
        yieldpct: 'yieldPct',
        wastagepct: 'wastagePct',
        version: 'version',
      },
    },
    {
      key: 'bomlines',
      patterns: [/^bom[_\s]?line(s)?$/i, /^bom[_\s]?detail(s)?$/i],
      description: 'BOM line items',
      targetTable: 'BomLine',
      requiresParent: 'bomrecipes',
      columnDefaults: {
        bomid: 'bomRecipeId',
        materialcode: 'materialCode',
        quantity: 'quantity',
        unit: 'unit',
        cost: 'cost',
      },
    },
    {
      key: 'productionplans',
      patterns: [
        /^production[_\s]?plan/i,
        /^manufacturing[_\s]?plan/i,
        /^pp$/i,
      ],
      description: 'Production planning',
      targetTable: 'ProductionPlan',
      requiresParent: 'products',
      columnDefaults: {
        productsku: 'productSku',
        periodmonth: 'periodMonth',
        fiscalyear: 'fiscalYear',
        plannedquantity: 'plannedQuantity',
        sitecode: 'siteCode',
      },
    },
    {
      key: 'inventory',
      patterns: [
        /^inventory|stock|warehouse[_\s]?stock|opening[_\s]?stock|closing[_\s]?stock/i,
      ],
      description: 'Inventory snapshots',
      targetTable: 'InventorySnapshot',
      requiresParent: 'materials',
      columnDefaults: {
        materialcode: 'materialCode',
        quantity: 'quantity',
        snapshotdate: 'snapshotDate',
        sitecode: 'siteCode',
      },
    },
    {
      key: 'materialprices',
      patterns: [
        /^raw[_\s]?material[_\s]?price(s)?|material[_\s]?price(s)?|rm[_\s]?price(s)?|price[_\s]?list$/i,
      ],
      description: 'Raw material prices',
      targetTable: 'RawMaterialPrice',
      requiresParent: 'materials',
      columnDefaults: {
        materialcode: 'materialCode',
        price: 'price',
        priceDate: 'priceDate',
        currency: 'currency',
      },
    },
    {
      key: 'budgetlines',
      patterns: [/^budget[_\s]?line/i, /^budget/i, /^annual[_\s]?budget/i],
      description: 'Budget data',
      targetTable: 'BudgetLine',
      columnDefaults: {
        accountcode: 'accountCode',
        periodmonth: 'periodMonth',
        fiscalyear: 'fiscalYear',
        amount: 'amount',
        sitecode: 'siteCode',
        costcentercode: 'costCenterCode',
        budgetcyclename: 'budgetCycleName',
        productsku: 'productSku',
        materialcode: 'materialCode',
        customercode: 'customerCode',
        quantity: 'quantity',
        unitprice: 'unitPrice',
        notes: 'notes',
      },
    },
    {
      key: 'forecastlines',
      patterns: [
        /^forecast[_\s]?line/i,
        /^forecast/i,
        /^monthly[_\s]?forecast/i,
      ],
      description: 'Forecast data',
      targetTable: 'ForecastLine',
      columnDefaults: {
        accountcode: 'accountCode',
        periodmonth: 'periodMonth',
        fiscalyear: 'fiscalYear',
        amount: 'amount',
        scenario: 'scenario',
        sitecode: 'siteCode',
        forecastcyclename: 'forecastCycleName',
        costcentercode: 'costCenterCode',
        productsku: 'productSku',
        materialcode: 'materialCode',
        customercode: 'customerCode',
        quantity: 'quantity',
        unitprice: 'unitPrice',
        drivertype: 'driverType',
        notes: 'notes',
      },
    },
    {
      key: 'actuallines',
      patterns: [
        /^actual(s)?|actual[_\s]?line(s)?|gl[_\s]?entry(s)?|journal[_\s]?entry(s)?|transaction(s)?|p&l|profit[_\s]?&[_\s]?loss|income[_\s]?statement|financial[_\s]?statement|data|s&m|g&a|operating[_\s]?expense/i,
      ],
      description: 'Actual transactions / GL entries',
      targetTable: 'ActualLine',
      columnDefaults: {
        accountcode: 'accountCode',
        periodmonth: 'periodMonth',
        fiscalyear: 'fiscalYear',
        amount: 'amount',
        sitecode: 'siteCode',
        costcentercode: 'costCenterCode',
        sourcesystem: 'sourceSystem',
        importtype: 'importType',
        periodfrom: 'periodFrom',
        periodto: 'periodTo',
        productsku: 'productSku',
        materialcode: 'materialCode',
        customercode: 'customerCode',
        transactiondate: 'transactionDate',
        quantity: 'quantity',
        unitprice: 'unitPrice',
        referenceno: 'referenceNo',
      },
    },
    {
      key: 'kpitargets',
      patterns: [/^kpi[_\s]?target(s)?|kpi(s)?$/i],
      description: 'KPI targets',
      targetTable: 'KpiTarget',
      columnDefaults: {
        kpiname: 'kpiName',
        kpicategory: 'kpiCategory',
        targetvalue: 'targetValue',
        actualvalue: 'actualValue',
        periodmonth: 'periodMonth',
        fiscalyear: 'fiscalYear',
      },
    },
    {
      key: 'exchangerates',
      patterns: [
        /^exchange[_\s]?rate(s)?|currency[_\s]?rate(s)?|fx[_\s]?rate(s)?$/i,
      ],
      description: 'Exchange rates',
      targetTable: 'ExchangeRate',
      columnDefaults: {
        fromcurrency: 'fromCurrency',
        tocurrency: 'toCurrency',
        rate: 'rate',
        ratedate: 'rateDate',
      },
    },
    {
      key: 'promotions',
      patterns: [
        /^promotion(s)?|discount(s)?|offer(s)?|commercial[_\s]?polic(y|ies)/i,
      ],
      description: 'Promotions & discounts',
      targetTable: 'Promotion',
      columnDefaults: {
        code: 'code',
        name: 'name',
        type: 'type',
        discountpct: 'discountPct',
        productsku: 'productSku',
      },
    },
    {
      key: 'headcountplans',
      patterns: [
        /^headcount[_\s]?plan/i,
        /^hr[_\s]?plan/i,
        /^staffing[_\s]?plan/i,
        /^headcount/i,
      ],
      description: 'Headcount planning',
      targetTable: 'HeadcountPlan',
      columnDefaults: {
        sitecode: 'siteCode',
        department: 'department',
        position: 'position',
        headcount: 'headCount',
        costcentercode: 'costCenterCode',
        periodmonth: 'periodMonth',
        fiscalyear: 'fiscalYear',
      },
    },
    {
      key: 'notificationrules',
      patterns: [/^notification[_\s]?rule(s)?|alert[_\s]?rule(s)?$/i],
      description: 'Notification rules',
      targetTable: 'NotificationRule',
      columnDefaults: {
        name: 'name',
        type: 'type',
        condition: 'condition',
        channel: 'channel',
      },
    },
    {
      key: 'informational',
      patterns: [
        /^start[_\s]?here/i,
        /^reference[_\s]?lists?/i,
        /^instructions?/i,
        /^notes?/i,
        /^weight[_\s]?per[_\s]?carton/i,
        /^hrv[_\s]?rates/i,
        /^price[_\s]?list/i,
      ],
      description: 'Informational Sheets',
      targetTable: '',
      columnDefaults: {},
    },
  ];

  /* ─── Main Mapping Function ────────────────────────────────────────── */

  mapSheetsToModules(sheets: SheetAnalysis[]): ErpModuleMapping[] {
    return sheets.map((sheet) => this.mapSheet(sheet));
  }

  private mapSheet(sheet: SheetAnalysis): ErpModuleMapping {
    // Find matching module
    const moduleDef = this.findModuleDefinition(sheet);

    if (!moduleDef) {
      // Unknown sheet — treat as generic data
      return this.createGenericMapping(sheet);
    }

    // Build column mappings
    const columnMappings = this.buildColumnMappings(
      sheet,
      moduleDef.columnDefaults,
    );

    return {
      sheetName: sheet.sheetName,
      module: moduleDef.key,
      description: moduleDef.description,
      confidence: this.calculateConfidence(sheet, moduleDef),
      columnMappings,
      requiresParent: moduleDef.requiresParent,
      targetTable: moduleDef.targetTable,
    };
  }

  /* ─── Module Matching ──────────────────────────────────────────────── */

  private findModuleDefinition(
    sheet: SheetAnalysis,
  ): (typeof this.MODULE_REGISTRY)[0] | null {
    const cleaned = sheet.sheetName.replace(/[_\s-]+/g, '').toLowerCase();

    for (const mod of this.MODULE_REGISTRY) {
      for (const pattern of mod.patterns) {
        if (pattern.test(cleaned) || pattern.test(sheet.sheetName)) {
          return mod;
        }
      }
    }
    return null;
  }

  private calculateConfidence(
    sheet: SheetAnalysis,
    moduleDef: (typeof this.MODULE_REGISTRY)[0],
  ): number {
    // High confidence if sheet name matches module pattern exactly
    const nameMatch = moduleDef.patterns.some((p) => p.test(sheet.sheetName));
    if (nameMatch) return 0.95;

    // Medium confidence based on column analysis
    const matchCount = sheet.columns.filter((c: ColumnAnalysis) =>
      Object.keys(moduleDef.columnDefaults).includes(c.normalizedKey),
    ).length;

    return Math.min(
      0.9,
      0.3 + (matchCount / Math.max(sheet.columns.length, 1)) * 0.6,
    );
  }

  /* ─── Column Mapping Builder ───────────────────────────────────────── */

  private buildColumnMappings(
    sheet: SheetAnalysis,
    columnDefaults: Record<string, string>,
  ): ColumnMapping[] {
    const mappings: ColumnMapping[] = [];

    for (const col of sheet.columns) {
      const erpField = columnDefaults[col.normalizedKey];

      if (erpField) {
        mappings.push({
          excelColumn: col.originalName,
          erpField,
          type: 'direct',
          confidence: 0.9,
        });
      } else if (col.mappedErpField) {
        mappings.push({
          excelColumn: col.originalName,
          erpField: col.mappedErpField,
          type: 'direct',
          confidence: col.mappingConfidence,
        });
      } else {
        // Unknown column — skip during import
        mappings.push({
          excelColumn: col.originalName,
          erpField: col.normalizedKey,
          type: 'skip',
          confidence: 0.1,
        });
      }
    }

    return mappings;
  }

  /* ─── Generic Mapping (Unknown Sheets) ─────────────────────────────── */

  private createGenericMapping(sheet: SheetAnalysis): ErpModuleMapping {
    const columnMappings: ColumnMapping[] = sheet.columns.map(
      (col: ColumnAnalysis) => ({
        excelColumn: col.originalName,
        erpField: col.mappedErpField || col.normalizedKey,
        type: 'skip' as const,
        confidence: 0.1,
      }),
    );

    return {
      sheetName: sheet.sheetName,
      module: 'unknown',
      description: `Unknown sheet "${sheet.sheetName}" — requires manual mapping`,
      confidence: 0.1,
      columnMappings,
      targetTable: 'unknown',
    };
  }

  /* ─── Utilities ────────────────────────────────────────────────────── */

  getModuleByKey(key: string): (typeof this.MODULE_REGISTRY)[0] | undefined {
    return this.MODULE_REGISTRY.find((m) => m.key === key);
  }

  getAllModules(): Array<{
    key: string;
    description: string;
    targetTable: string;
  }> {
    return this.MODULE_REGISTRY.map((m) => ({
      key: m.key,
      description: m.description,
      targetTable: m.targetTable,
    }));
  }

  /**
   * Get the dependency graph for all modules.
   * Used by the orchestrator to determine import order.
   */
  getDependencyGraph(): Record<string, string[]> {
    const graph: Record<string, string[]> = {};
    for (const mod of this.MODULE_REGISTRY) {
      graph[mod.key] = mod.requiresParent ? [mod.requiresParent] : [];
    }
    return graph;
  }
}
