/**
 * Template Generator Service
 *
 * Generates XLSX templates from the client workbook schema.
 * For transaction modules (budget, forecast, actuals), produces enhanced
 * templates with Instructions sheet, Reference sheets with live data,
 * and Excel data-validation dropdowns.
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import * as XLSX from 'xlsx';
import {
  CLIENT_WORKBOOK_SHEETS,
  getSheetByModule,
  type SheetDef,
} from './client-workbook-schema';

/** Friendly header → internal field mapping for transaction modules */
export const FRIENDLY_HEADER_MAP: Record<string, Record<string, string>> = {
  budgetlines: {
    budgetcycle: 'budgetcyclename',
    fiscalyear: 'fiscalyear',
    account: 'accountcode',
    site: 'sitecode',
    costcenter: 'costcentercode',
    product: 'productsku',
    material: 'materialcode',
    customer: 'customercode',
    month: 'periodmonth',
    quantity: 'quantity',
    unitprice: 'unitprice',
    amount: 'amount',
    notes: 'notes',
  },
  forecastlines: {
    forecastcycle: 'forecastcyclename',
    fiscalyear: 'fiscalyear',
    account: 'accountcode',
    site: 'sitecode',
    costcenter: 'costcentercode',
    product: 'productsku',
    material: 'materialcode',
    customer: 'customercode',
    month: 'periodmonth',
    quantity: 'quantity',
    unitprice: 'unitprice',
    amount: 'amount',
    drivertype: 'drivertype',
    notes: 'notes',
  },
  actuallines: {
    account: 'accountcode',
    site: 'sitecode',
    costcenter: 'costcentercode',
    product: 'productsku',
    material: 'materialcode',
    customer: 'customercode',
    transactiondate: 'transactiondate',
    quantity: 'quantity',
    unitprice: 'unitprice',
    amount: 'amount',
    referenceno: 'referenceno',
  },
};

/** Modules that get enhanced templates with reference sheets & dropdowns */
const ENHANCED_MODULES = new Set([
  'budgetlines',
  'forecastlines',
  'actuallines',
]);

/** Module dependency order for the Instructions sheet */
const IMPORT_ORDER = [
  { key: 'accounts', label: 'Accounts' },
  { key: 'sites', label: 'Sites' },
  { key: 'costcenters', label: 'Cost Centers' },
  { key: 'products', label: 'Products' },
  { key: 'budgetcycles', label: 'Budget Cycles' },
];

@Injectable()
export class TemplateGeneratorService {
  constructor(private readonly prisma: PrismaService) {}

  /* ─── Full Client Workbook Template ────────────────────────────────── */

  async generateFullWorkbook(companyId?: bigint): Promise<Buffer> {
    const wb = XLSX.utils.book_new();

    // 1. START HERE — Instruction sheet
    const startHereWs = this.buildStartHereSheet();
    XLSX.utils.book_append_sheet(wb, startHereWs, 'START HERE');

    // 2. Data sheets
    for (const sheet of CLIENT_WORKBOOK_SHEETS) {
      const ws = this.generateSheetWorksheet(sheet, true);
      XLSX.utils.book_append_sheet(wb, ws, sheet.sheetName);
    }

    // 3. Reference Lists — summary of all reference data
    if (companyId) {
      const refData = await this.fetchReferenceData(companyId);
      const refWs = this.buildReferenceListsSheet(refData);
      XLSX.utils.book_append_sheet(wb, refWs, 'Reference Lists');
    } else {
      const refWs = this.buildReferenceListsSheetEmpty();
      XLSX.utils.book_append_sheet(wb, refWs, 'Reference Lists');
    }

    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }

  private buildStartHereSheet(): XLSX.WorkSheet {
    const rows: string[][] = [
      ['Start Here — Harvest Client Workbook Template'],
      [],
      ['Welcome to the Harvest ERP Client Workbook Template.'],
      [''],
      ['HOW TO USE THIS WORKBOOK:'],
      [
        '1. Fill each data sheet with your information. Each column is labeled with the expected data.',
      ],
      [
        '2. Required columns are marked with *. Optional columns can be left blank.',
      ],
      [
        '3. Reference data (Accounts, Sites, Cost Centers, Products, etc.) must be imported first.',
      ],
      [
        '4. Transaction data (Budget, Forecast, Actuals) can be imported after master data is loaded.',
      ],
      [
        '5. Sheets labeled as "Reference" contain lookup data for dropdowns — do not modify these directly.',
      ],
      [''],
      ['SHEETS OVERVIEW:'],
      [
        '  • Data Sheets (importable): Companies, Sites, Units, Accounts, Cost Centers,',
      ],
      [
        '    Product Categories, Customers, Suppliers, Materials, Products, BOM Recipes,',
      ],
      [
        '    Budget, Forecast, Actuals, Material Prices, Production Planning, Exchange Rates, KPI Targets',
      ],
      ['  • Reference Sheets (not imported): Reference Lists'],
      ['  • Instruction Sheets (not imported): START HERE'],
      [''],
      ['IMPORT ORDER (required):'],
      [
        '1. Companies → Sites → Units → Accounts → Cost Centers → Product Categories',
      ],
      ['2. Customers → Suppliers → Materials → Products'],
      ['3. BOM Recipes → Budget → Forecast → Actuals'],
      [
        '4. Material Prices → Production Planning → Exchange Rates → KPI Targets',
      ],
      [''],
      ['ROUND-TRIP SAFETY:'],
      [
        'This template was generated by the system. You can fill in data, save, and re-upload it.',
      ],
      [
        'The system will automatically skip this sheet and all Reference sheets during import.',
      ],
      ['Only the data sheets will be processed.'],
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 90 }];
    return ws;
  }

  private buildReferenceListsSheet(
    ref: Awaited<ReturnType<TemplateGeneratorService['fetchReferenceData']>>,
  ): XLSX.WorkSheet {
    const rows: string[][] = [
      ['Reference Lists — Master Data Lookup Values'],
      [],
      [
        'This sheet summarizes all master data available in the system for reference.',
      ],
      [
        'It is not imported. It exists only to help you fill in the correct codes and names.',
      ],
      [],
    ];

    // Accounts
    rows.push(['=== ACCOUNTS ===', '', '']);
    rows.push(['Code', 'Name', '']);
    for (const a of ref.accounts) {
      rows.push([a.code, a.name, '']);
    }
    if (ref.accounts.length === 0)
      rows.push(['(No accounts loaded yet)', '', '']);
    rows.push([]);

    // Sites
    rows.push(['=== SITES ===', '']);
    rows.push(['Name', '']);
    for (const s of ref.sites) {
      rows.push([s.name, '']);
    }
    if (ref.sites.length === 0) rows.push(['(No sites loaded yet)', '']);
    rows.push([]);

    // Cost Centers
    rows.push(['=== COST CENTERS ===', '', '']);
    rows.push(['Code', 'Name', '']);
    for (const cc of ref.costCenters) {
      rows.push([cc.code ?? '', cc.name, '']);
    }
    if (ref.costCenters.length === 0)
      rows.push(['(No cost centers loaded yet)', '', '']);
    rows.push([]);

    // Products
    rows.push(['=== PRODUCTS ===', '', '']);
    rows.push(['SKU', 'Product Name', '']);
    for (const p of ref.products) {
      rows.push([p.sku, p.name, '']);
    }
    if (ref.products.length === 0)
      rows.push(['(No products loaded yet)', '', '']);
    rows.push([]);

    // Materials
    rows.push(['=== MATERIALS ===', '', '']);
    rows.push(['Code', 'Name', '']);
    for (const m of ref.materials) {
      rows.push([m.code, m.name, '']);
    }
    if (ref.materials.length === 0)
      rows.push(['(No materials loaded yet)', '', '']);
    rows.push([]);

    // Customers
    rows.push(['=== CUSTOMERS ===', '', '']);
    rows.push(['Code', 'Name', '']);
    for (const c of ref.customers) {
      rows.push([c.code, c.name, '']);
    }
    if (ref.customers.length === 0)
      rows.push(['(No customers loaded yet)', '', '']);
    rows.push([]);

    // Budget Cycles
    rows.push(['=== BUDGET CYCLES ===', '', '', '']);
    rows.push(['Budget Cycle', 'Fiscal Year', 'Status', '']);
    for (const bc of ref.budgetCycles) {
      rows.push([bc.name, String(bc.fiscalYear), bc.status ?? 'draft', '']);
    }
    if (ref.budgetCycles.length === 0)
      rows.push(['(No budget cycles loaded yet)', '', '', '']);

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 25 }, { wch: 40 }, { wch: 14 }, { wch: 14 }];
    return ws;
  }

  private buildReferenceListsSheetEmpty(): XLSX.WorkSheet {
    const rows: string[][] = [
      ['Reference Lists — Master Data Lookup Values'],
      [],
      ['This sheet summarizes all available master data.'],
      [
        'Since no company context was available, this reference sheet is empty.',
      ],
      [
        'After you import master data, download this template again to see populated reference values.',
      ],
      [],
      ['=== ACCOUNTS ===', '', ''],
      ['Code', 'Name', ''],
      ['(Import Accounts first, then re-download this template)', '', ''],
      [],
      ['=== SITES ===', ''],
      ['Name', ''],
      ['(Import Sites first, then re-download this template)', ''],
      [],
      ['=== COST CENTERS ===', '', ''],
      ['Code', 'Name', ''],
      ['(Import Cost Centers first, then re-download this template)', '', ''],
      [],
      ['=== PRODUCTS ===', '', ''],
      ['SKU', 'Product Name', ''],
      ['(Import Products first, then re-download this template)', '', ''],
      [],
      ['=== MATERIALS ===', '', ''],
      ['Code', 'Name', ''],
      ['(Import Materials first, then re-download this template)', '', ''],
      [],
      ['=== CUSTOMERS ===', '', ''],
      ['Code', 'Name', ''],
      ['(Import Customers first, then re-download this template)', '', ''],
      [],
      ['=== BUDGET CYCLES ===', '', '', ''],
      ['Budget Cycle', 'Fiscal Year', 'Status', ''],
      [
        '(Import Budget Cycles first, then re-download this template)',
        '',
        '',
        '',
      ],
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 50 }, { wch: 40 }, { wch: 14 }, { wch: 14 }];
    return ws;
  }

  /* ─── Per-Module Template ──────────────────────────────────────────── */

  async generateModuleTemplate(
    moduleKey: string,
    companyId?: bigint,
  ): Promise<Buffer> {
    const sheet = getSheetByModule(moduleKey);
    if (!sheet) {
      throw new Error(`Unknown module: ${moduleKey}`);
    }

    const wb = XLSX.utils.book_new();

    if (ENHANCED_MODULES.has(moduleKey) && companyId) {
      await this.generateEnhancedTemplate(wb, sheet, moduleKey, companyId);
    } else {
      const ws = this.generateSheetWorksheet(sheet);
      XLSX.utils.book_append_sheet(wb, ws, sheet.sheetName);
    }

    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }

  /* ─── Enhanced Template (Instructions + References + Dropdowns) ─────── */

  private async generateEnhancedTemplate(
    wb: XLSX.WorkBook,
    sheet: SheetDef,
    moduleKey: string,
    companyId: bigint,
  ): Promise<void> {
    // 1. Instructions sheet
    const instructionsWs = this.buildInstructionsSheet(sheet);
    XLSX.utils.book_append_sheet(wb, instructionsWs, 'Instructions');

    // 2. Main data sheet with dropdowns
    const dataWs = this.generateSheetWorksheet(sheet);
    XLSX.utils.book_append_sheet(wb, dataWs, sheet.sheetName);

    // 3. Reference sheets + populate dropdowns
    const refData = await this.fetchReferenceData(companyId);
    const dropdownMap = this.addReferenceSheets(wb, refData);
    this.addDataValidation(dataWs, sheet, moduleKey, dropdownMap);
  }

  /* ─── Instructions Sheet ───────────────────────────────────────────── */

  private buildInstructionsSheet(sheet: SheetDef): XLSX.WorkSheet {
    const mod = sheet.module;
    const isBudget = mod === 'budgetlines';
    const isForecast = mod === 'forecastlines';
    const isActuals = mod === 'actuallines';

    const cycleLabel = isBudget
      ? 'Budget Cycle'
      : isForecast
        ? 'Forecast Cycle'
        : '';
    const cycleExample = isBudget
      ? 'FY25 Annual Budget'
      : isForecast
        ? 'FY25 Rolling Q1'
        : '';

    const rows: string[][] = [
      [`${sheet.sheetName} Template — Instructions`],
      [],
      ['How to fill this template:'],
      ['1. Each row represents one budget line entry.', ''],
      [
        '2. Fill in the required columns (marked with *). Leave optional columns blank if not applicable.',
      ],
      [
        '3. You can enter either the Code or the Name for Account, Site, Cost Center, Product, Material, and Customer columns.',
      ],
      [
        '4. Use the dropdown lists in the data columns for quick selection from your existing master data.',
      ],
      [
        '5. Month must be a number between 1 and 12, a month name (e.g. January, Jan), or an Arabic month name.',
      ],
      [
        '6. Material and Customer are optional — leave blank if not applicable.',
      ],
      ['7. Save the file as .xlsx and upload it.'],
      [],
    ];

    if (isBudget || isForecast) {
      rows.push(
        [
          `${cycleLabel}*`,
          `Enter the ${cycleLabel.toLowerCase()} name. Example: ${cycleExample}`,
        ],
        ['Fiscal Year*', 'Enter the 4-digit fiscal year. Example: 2025'],
      );
    }

    rows.push([]);

    // Import order
    rows.push(['Required Import Order for Budget Lines:']);
    rows.push(['Master data must be imported BEFORE transaction data.']);
    rows.push([]);
    rows.push(['1. Accounts']);
    rows.push(['2. Sites']);
    rows.push(['3. Cost Centers']);
    rows.push(['4. Products']);
    rows.push(['5. Budget Cycles']);
    rows.push(['6. Budget Lines (this file)']);
    rows.push([]);

    // Accepted values
    rows.push(['Accepted Values:']);
    rows.push([
      '- Month: 1, 2, 3, ..., 12, or month names (January, Feb, Mar, ..., Dec), or Arabic month names (يناير, فبراير, ...)',
    ]);
    rows.push(['- Fiscal Year: e.g. 2024, 2025, 2026']);
    if (isForecast) {
      rows.push([
        '- Driver Type (Forecast only): driver_based, statistical, manual, trend, seasonal',
      ]);
    }
    rows.push([]);

    // Missing master data
    rows.push(['If Master Data is Missing:']);
    rows.push([
      `If you see errors about missing Accounts, Sites, Cost Centers, or Products,`,
    ]);
    rows.push([
      `first import the required master data using the corresponding templates, then re-upload this file.`,
    ]);
    rows.push([
      `Material and Customer are optional — you can leave those columns blank.`,
    ]);
    rows.push([
      `Download master data templates from the Excel Integration page.`,
    ]);

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 70 }, { wch: 50 }];
    return ws;
  }

  /* ─── Reference Data from DB ───────────────────────────────────────── */

  private async fetchReferenceData(companyId: bigint) {
    const [
      accounts,
      sites,
      costCenters,
      products,
      materials,
      customers,
      budgetCycles,
    ] = await Promise.all([
      this.prisma.account.findMany({
        where: { companyId, isActive: true },
        select: { code: true, name: true },
        orderBy: { code: 'asc' },
        take: 500,
      }),
      this.prisma.site.findMany({
        where: { companyId },
        select: { name: true },
        orderBy: { name: 'asc' },
        take: 500,
      }),
      this.prisma.costCenter.findMany({
        where: { companyId },
        select: { code: true, name: true },
        orderBy: { code: 'asc' },
        take: 500,
      }),
      this.prisma.product.findMany({
        where: { companyId, isActive: true },
        select: { sku: true, name: true },
        orderBy: { sku: 'asc' },
        take: 500,
      }),
      this.prisma.material.findMany({
        where: { companyId, isActive: true },
        select: { code: true, name: true },
        orderBy: { code: 'asc' },
        take: 500,
      }),
      this.prisma.customer.findMany({
        where: { companyId, isActive: true },
        select: { code: true, name: true },
        orderBy: { code: 'asc' },
        take: 500,
      }),
      this.prisma.budgetCycle.findMany({
        where: { companyId },
        select: { name: true, fiscalYear: true, status: true },
        orderBy: { fiscalYear: 'desc' },
        take: 200,
      }),
    ]);

    return {
      accounts,
      sites,
      costCenters,
      products,
      materials,
      customers,
      budgetCycles,
    };
  }

  /* ─── Add Reference Sheets ─────────────────────────────────────────── */

  private addReferenceSheets(
    wb: XLSX.WorkBook,
    ref: Awaited<ReturnType<TemplateGeneratorService['fetchReferenceData']>>,
  ): Map<string, string[]> {
    const dropdownMap = new Map<string, string[]>();

    // Accounts Reference: Code | Name
    const accRows: string[][] = [['Code', 'Name']];
    for (const a of ref.accounts) {
      accRows.push([a.code, a.name]);
      dropdownMap.set(`acc_${a.code}`, [a.code, a.name]);
    }
    if (ref.accounts.length === 0) {
      accRows.push(['No records found. Import Accounts first.', '']);
    }
    const accWs = XLSX.utils.aoa_to_sheet(accRows);
    accWs['!cols'] = [{ wch: 20 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, accWs, 'Accounts Reference');

    // Sites Reference: Name
    const siteRows: string[][] = [['Name']];
    for (const s of ref.sites) {
      siteRows.push([s.name]);
      dropdownMap.set(`site_${s.name}`, [s.name]);
    }
    if (ref.sites.length === 0) {
      siteRows.push(['No records found. Import Sites first.', '']);
    }
    const siteWs = XLSX.utils.aoa_to_sheet(siteRows);
    siteWs['!cols'] = [{ wch: 40 }];
    XLSX.utils.book_append_sheet(wb, siteWs, 'Sites Reference');

    // Cost Centers Reference: Code | Name
    const ccRows: string[][] = [['Code', 'Name']];
    for (const cc of ref.costCenters) {
      ccRows.push([cc.code ?? '', cc.name]);
      if (cc.code) dropdownMap.set(`cc_${cc.code}`, [cc.code, cc.name]);
    }
    if (ref.costCenters.length === 0) {
      ccRows.push(['No records found. Import Cost Centers first.', '']);
    }
    const ccWs = XLSX.utils.aoa_to_sheet(ccRows);
    ccWs['!cols'] = [{ wch: 20 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, ccWs, 'Cost Centers Reference');

    // Products Reference: SKU | Name
    const prodRows: string[][] = [['SKU', 'Product Name']];
    for (const p of ref.products) {
      prodRows.push([p.sku, p.name]);
      dropdownMap.set(`prod_${p.sku}`, [p.sku, p.name]);
    }
    if (ref.products.length === 0) {
      prodRows.push(['No records found. Import Products first.', '']);
    }
    const prodWs = XLSX.utils.aoa_to_sheet(prodRows);
    prodWs['!cols'] = [{ wch: 20 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, prodWs, 'Products Reference');

    // Materials Reference: Code | Name
    const matRows: string[][] = [['Code', 'Name']];
    for (const m of ref.materials) {
      matRows.push([m.code, m.name]);
      dropdownMap.set(`mat_${m.code}`, [m.code, m.name]);
    }
    if (ref.materials.length === 0) {
      matRows.push(['No records found. Import Materials first.', '']);
    }
    const matWs = XLSX.utils.aoa_to_sheet(matRows);
    matWs['!cols'] = [{ wch: 20 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, matWs, 'Materials Reference');

    // Customers Reference: Code | Name
    const custRows: string[][] = [['Code', 'Name']];
    for (const c of ref.customers) {
      custRows.push([c.code, c.name]);
      dropdownMap.set(`cust_${c.code}`, [c.code, c.name]);
    }
    if (ref.customers.length === 0) {
      custRows.push(['No records found. Import Customers first.', '']);
    }
    const custWs = XLSX.utils.aoa_to_sheet(custRows);
    custWs['!cols'] = [{ wch: 20 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, custWs, 'Customers Reference');

    // Budget Cycles Reference: Name | Fiscal Year | Status
    const cycleRows: string[][] = [['Budget Cycle', 'Fiscal Year', 'Status']];
    for (const bc of ref.budgetCycles) {
      cycleRows.push([bc.name, String(bc.fiscalYear), bc.status ?? 'draft']);
    }
    if (ref.budgetCycles.length === 0) {
      cycleRows.push([
        'No records found. Budget cycles will be created automatically.',
        '',
        '',
      ]);
    }
    const cycleWs = XLSX.utils.aoa_to_sheet(cycleRows);
    cycleWs['!cols'] = [{ wch: 30 }, { wch: 14 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, cycleWs, 'Budget Cycles Reference');

    return dropdownMap;
  }

  /* ─── Data Validation (Dropdowns) ──────────────────────────────────── */

  private addDataValidation(
    ws: XLSX.WorkSheet,
    sheet: SheetDef,
    moduleKey: string,
    _dropdownMap: Map<string, string[]>,
  ): void {
    const validations: any[] = [];
    const maxRows = 5000;

    for (let colIdx = 0; colIdx < sheet.columns.length; colIdx++) {
      const col = sheet.columns[colIdx];
      const colLetter = XLSX.utils.encode_col(colIdx);
      const sqref = `${colLetter}2:${colLetter}${maxRows}`;

      if (col.field === 'periodMonth') {
        validations.push({
          sqref,
          type: 'list',
          allowBlank: true,
          formulae: ['"1,2,3,4,5,6,7,8,9,10,11,12"'],
        });
      } else if (col.field === 'accountCode') {
        validations.push({
          sqref,
          type: 'list',
          allowBlank: true,
          formulae: [
            `"'Accounts Reference'!$A$2:$A$${Math.min(refAccountsCount(_dropdownMap, 'acc_') + 1, maxRows)}"`,
          ],
        });
      } else if (col.field === 'siteCode') {
        validations.push({
          sqref,
          type: 'list',
          allowBlank: true,
          formulae: [
            `"'Sites Reference'!$A$2:$A$${Math.min(refCount(_dropdownMap, 'site_') + 1, maxRows)}"`,
          ],
        });
      } else if (col.field === 'costCenterCode') {
        validations.push({
          sqref,
          type: 'list',
          allowBlank: true,
          formulae: [
            `"'Cost Centers Reference'!$A$2:$A$${Math.min(refCount(_dropdownMap, 'cc_') + 1, maxRows)}"`,
          ],
        });
      } else if (col.field === 'productSku') {
        validations.push({
          sqref,
          type: 'list',
          allowBlank: true,
          formulae: [
            `"'Products Reference'!$A$2:$A$${Math.min(refCount(_dropdownMap, 'prod_') + 1, maxRows)}"`,
          ],
        });
      } else if (col.field === 'materialCode') {
        validations.push({
          sqref,
          type: 'list',
          allowBlank: true,
          formulae: [
            `"'Materials Reference'!$A$2:$A$${Math.min(refCount(_dropdownMap, 'mat_') + 1, maxRows)}"`,
          ],
        });
      } else if (col.field === 'customerCode') {
        validations.push({
          sqref,
          type: 'list',
          allowBlank: true,
          formulae: [
            `"'Customers Reference'!$A$2:$A$${Math.min(refCount(_dropdownMap, 'cust_') + 1, maxRows)}"`,
          ],
        });
      }
    }

    if (validations.length > 0) {
      ws['!dataValidation'] = validations;
    }
  }

  /* ─── Sheet Worksheet Generation ───────────────────────────────────── */

  private generateSheetWorksheet(
    sheet: SheetDef,
    includeExamples = false,
  ): XLSX.WorkSheet {
    const headers = [...sheet.columns.map((c) => c.display)];
    const rows: string[][] = [headers];

    if (includeExamples) {
      const exampleRows = this.buildExampleRows(sheet);
      for (const exRow of exampleRows) {
        rows.push([...exRow, 'TRUE']);
      }
      headers.push('Example');
    }

    const ws = XLSX.utils.aoa_to_sheet(rows);

    ws['!cols'] = sheet.columns.map((c) => ({
      wch: Math.max(c.display.length + 4, 18),
    }));

    return ws;
  }

  private buildExampleRows(sheet: SheetDef): string[][] {
    const examples: Record<string, string[][]> = {
      companies: [
        [
          'Acme Corp',
          'Acme Corporation Legal Name',
          'food_processing',
          'EGP',
          '123-456-789',
          '1',
        ],
      ],
      sites: [
        [
          'Cairo Factory',
          'factory',
          'Cairo',
          '123 Industrial Zone',
          'Cairo',
          'Egypt',
          '+20 2 1234 5678',
          'active',
        ],
      ],
      units: [['Kilogram', 'kg', 'weight']],
      accounts: [['4000', 'Sales Revenue', 'revenue', '', 'true']],
      costcenters: [
        ['CC-001', 'Production Line A', 'production', 'Cairo Factory'],
      ],
      productcategories: [['Dairy Products', '']],
      customers: [
        [
          'CUST-001',
          'Retail Chain X',
          'retail',
          'Cairo',
          'Egypt',
          'Cairo',
          '+20 2 9876 5432',
          'info@retailchainx.com',
          '500000',
          '30',
          'true',
        ],
      ],
      suppliers: [
        [
          'SUPP-001',
          'Raw Materials Co',
          'raw_material',
          'Egypt',
          'Alexandria',
          '+20 3 5555 5555',
          'sales@rawmaterials.com',
          '14',
          'true',
        ],
      ],
      materials: [
        [
          'RM-001',
          'Sugar',
          'raw_material',
          'kg',
          '15.50',
          'SUPP-001',
          '1000',
          '500',
          'true',
        ],
      ],
      products: [
        [
          'P-001',
          'Yogurt 500ml',
          'finished_good',
          'Dairy Products',
          'pcs',
          '8.00',
          '12.00',
          '0.5',
          'true',
        ],
      ],
      bomrecipes: [
        ['P-001', 'v1', '1', '2', '0.50', '0.30', 'RM-001', '0.250', '1'],
      ],
      budget: [
        [
          'FY26 Annual Budget',
          '2026',
          '5000',
          'Cairo Factory',
          'CC-001',
          'P-001',
          '',
          '',
          '1',
          '10000',
          '10',
          '100000',
          'Example budget entry',
        ],
      ],
      forecast: [
        [
          'FY26 Rolling Q1',
          '2026',
          '4000',
          'Cairo Factory',
          'CC-001',
          'P-001',
          '',
          '',
          '1',
          '5000',
          '12',
          '60000',
          'manual',
          'Example forecast entry',
        ],
      ],
      actuals: [
        [
          '5000',
          'Cairo Factory',
          'CC-001',
          'P-001',
          '',
          '',
          '2026-01-15',
          '1000',
          '12',
          '12000',
          'INV-001',
        ],
      ],
    };

    return examples[sheet.module] ?? [];
  }

  /* ─── Utility: Get module list for dropdowns ───────────────────────── */

  getModuleList(): Array<{
    key: string;
    sheetName: string;
    description: string;
    columnCount: number;
  }> {
    return CLIENT_WORKBOOK_SHEETS.map((s) => ({
      key: s.module,
      sheetName: s.sheetName,
      description: s.description,
      columnCount: s.columns.length,
    }));
  }

  /* ─── Utility: Get CSV template (backward compat) ──────────────────── */

  generateModuleCSV(moduleKey: string): string {
    const sheet = getSheetByModule(moduleKey);
    if (!sheet) {
      throw new Error(`Unknown module: ${moduleKey}`);
    }

    const headers = sheet.columns.map((c) => c.display);
    return headers.join(',');
  }
}

/* ─── Helpers ─────────────────────────────────────────────────────────── */

function refAccountsCount(map: Map<string, string[]>, prefix: string): number {
  let count = 0;
  for (const key of map.keys()) {
    if (key.startsWith(prefix)) count++;
  }
  return count;
}

function refCount(map: Map<string, string[]>, prefix: string): number {
  let count = 0;
  for (const key of map.keys()) {
    if (key.startsWith(prefix)) count++;
  }
  return count;
}
