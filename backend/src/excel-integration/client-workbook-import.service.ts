import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AccountType, ImportType, Prisma } from '@prisma/client';
import * as XLSX from 'xlsx';
import {
  detectFileTypeFromBuffer,
  detectFileType,
  FileTypeMismatchError,
} from '../common/utils/file-type-detection.util';
import {
  mapRowWithAliases,
  whitelistFields,
  coerceValue,
  normalizeImportType,
  normalizeSourceSystem,
  generateDefaults,
  normalizeImportError,
  getModuleTitle,
  inferAccountType,
  normalizeHeaderToField,
  findOriginalRowValue,
  MODULE_COLUMN_ALIASES,
  MODEL_FIELD_WHITELIST,
} from './import-utils';

const MONTH_MAP: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
  يناير: 1,
  فبراير: 2,
  مارس: 3,
  أبريل: 4,
  مايو: 5,
  يونيو: 6,
  يوليو: 7,
  أغسطس: 8,
  سبتمبر: 9,
  أكتوبر: 10,
  نوفمبر: 11,
  ديسمبر: 12,
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
  totals: Record<string, number>;
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
      reason: string;
      message: string;
      value: unknown;
    }>;
    warnings: string[];
    status: string;
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

  private cache = {
    companies: new Map<string, bigint>(),
    sites: new Map<string, bigint>(),
    units: new Map<string, bigint>(),
    accounts: new Map<string, bigint>(),
    costCenters: new Map<string, bigint>(),
    productCategories: new Map<string, bigint>(),
    customers: new Map<string, bigint>(),
    suppliers: new Map<string, bigint>(),
    materials: new Map<string, bigint>(),
    products: new Map<string, bigint>(),
    budgetCycles: new Map<string, bigint>(),
    forecastCycles: new Map<string, bigint>(),
  };

  private async initializeCache(companyId: bigint) {
    this.cache = {
      companies: new Map<string, bigint>(),
      sites: new Map<string, bigint>(),
      units: new Map<string, bigint>(),
      accounts: new Map<string, bigint>(),
      costCenters: new Map<string, bigint>(),
      productCategories: new Map<string, bigint>(),
      customers: new Map<string, bigint>(),
      suppliers: new Map<string, bigint>(),
      materials: new Map<string, bigint>(),
      products: new Map<string, bigint>(),
      budgetCycles: new Map<string, bigint>(),
      forecastCycles: new Map<string, bigint>(),
    };

    const [
      companies,
      sites,
      units,
      accounts,
      costCenters,
      productCategories,
      customers,
      suppliers,
      materials,
      products,
      budgetCycles,
      forecastCycles,
    ] = await Promise.all([
      this.prisma.company.findMany({ select: { id: true, name: true } }),
      this.prisma.site.findMany({ where: { companyId }, select: { id: true, name: true } }),
      this.prisma.unit.findMany({ where: { companyId }, select: { id: true, symbol: true, name: true } }),
      this.prisma.account.findMany({ where: { companyId }, select: { id: true, code: true, name: true } }),
      this.prisma.costCenter.findMany({ where: { companyId }, select: { id: true, code: true, name: true } }),
      this.prisma.productCategory.findMany({ where: { companyId }, select: { id: true, name: true } }),
      this.prisma.customer.findMany({ where: { companyId }, select: { id: true, code: true, name: true } }),
      this.prisma.supplier.findMany({ where: { companyId }, select: { id: true, name: true } }),
      this.prisma.material.findMany({ where: { companyId }, select: { id: true, code: true, name: true } }),
      this.prisma.product.findMany({ where: { companyId }, select: { id: true, sku: true, name: true } }),
      this.prisma.budgetCycle.findMany({ where: { companyId }, select: { id: true, name: true } }),
      this.prisma.forecastCycle.findMany({ where: { companyId }, select: { id: true, name: true } }),
    ]);

    for (const c of companies) {
      this.cache.companies.set(c.name.toLowerCase().trim(), c.id);
    }
    for (const s of sites) {
      this.cache.sites.set(s.name.toLowerCase().trim(), s.id);
    }
    for (const u of units) {
      this.cache.units.set(u.symbol.toLowerCase().trim(), u.id);
      this.cache.units.set(u.name.toLowerCase().trim(), u.id);
    }
    for (const a of accounts) {
      this.cache.accounts.set(a.code.toLowerCase().trim(), a.id);
      this.cache.accounts.set(a.name.toLowerCase().trim(), a.id);
    }
    for (const cc of costCenters) {
      if (cc.code) this.cache.costCenters.set(cc.code.toLowerCase().trim(), cc.id);
      this.cache.costCenters.set(cc.name.toLowerCase().trim(), cc.id);
    }
    for (const pc of productCategories) {
      this.cache.productCategories.set(pc.name.toLowerCase().trim(), pc.id);
    }
    for (const cust of customers) {
      if (cust.code) this.cache.customers.set(cust.code.toLowerCase().trim(), cust.id);
      this.cache.customers.set(cust.name.toLowerCase().trim(), cust.id);
    }
    for (const supp of suppliers) {
      this.cache.suppliers.set(supp.name.toLowerCase().trim(), supp.id);
    }
    for (const m of materials) {
      this.cache.materials.set(m.code.toLowerCase().trim(), m.id);
      this.cache.materials.set(m.name.toLowerCase().trim(), m.id);
    }
    for (const p of products) {
      this.cache.products.set(p.sku.toLowerCase().trim(), p.id);
      this.cache.products.set(p.name.toLowerCase().trim(), p.id);
    }
    for (const bc of budgetCycles) {
      this.cache.budgetCycles.set(bc.name.toLowerCase().trim(), bc.id);
    }
    for (const fc of forecastCycles) {
      this.cache.forecastCycles.set(fc.name.toLowerCase().trim(), fc.id);
    }
  }

  mapAndValidateRow(
    row: Record<string, unknown>,
    module: string,
    companyId?: bigint,
    rowNumber?: number,
  ): { clean: Record<string, any>; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const modelMap: Record<string, string> = {
      companies: 'company',
      sites: 'site',
      units: 'unit',
      accounts: 'account',
      costcenters: 'costCenter',
      productcategories: 'productCategory',
      customers: 'customer',
      suppliers: 'supplier',
      materials: 'material',
      products: 'product',
      bomrecipes: 'bomRecipe',
      bomlines: 'bomLine',
      budgetlines: 'budgetLine',
      forecastlines: 'forecastLine',
      actuallines: 'actualLine',
      productionplans: 'productionPlan',
      kpitargets: 'kpiTarget',
      exchangerates: 'exchangeRate',
      promotions: 'promotion',
      rawmaterialprices: 'rawMaterialPrice',
    };

    const modelName = modelMap[module];
    if (!modelName) {
      return { clean: {}, errors: [`Unknown module: ${module}`], warnings: [] };
    }

    // 1. Map columns using aliases
    let mapped = mapRowWithAliases(row, module);

    if (companyId) {
      mapped.companyId = companyId;
    }

    // 2. Generate defaults
    mapped = generateDefaults(mapped, module, rowNumber);

    // 3. Coerce values
    const coerced: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(mapped)) {
      coerced[key] = coerceValue(val, key, modelName);
    }

    // 4. Whitelist fields (keep database model fields, Excel schema fields, and metadata)
    const { getSheetByModule } = require('./client-workbook-schema');
    const sheetDef = getSheetByModule(module);

    const allowedFields = new Set<string>();
    if (MODEL_FIELD_WHITELIST[modelName]) {
      (MODEL_FIELD_WHITELIST[modelName] as string[]).forEach((f: string) => allowedFields.add(f));
    }
    if (sheetDef && sheetDef.columns) {
      sheetDef.columns.forEach((c: any) => allowedFields.add(c.field));
    }
    allowedFields.add('companyId');
    allowedFields.add('createdBy');
    allowedFields.add('createdAt');
    allowedFields.add('updatedAt');

    const clean: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(coerced)) {
      if (allowedFields.has(k)) {
        clean[k] = v;
      }
    }

    // 5. Schema Validation (check required fields)
    if (sheetDef) {
      for (const col of sheetDef.columns) {
        let val = clean[col.field] ?? coerced[col.field];
        // For "Unit Symbol" display field, also accept unitSymbol or string unitId
        if (col.display === 'Unit Symbol') {
          val = clean.unitSymbol ?? coerced.unitSymbol ?? clean.unitId ?? coerced.unitId ?? val;
        }
        if (col.required && (val === null || val === undefined || val === '')) {
          errors.push(`Missing required field: ${col.display}`);
        }
        if (col.allowedValues && val !== null && val !== undefined) {
          const strVal = String(val).trim();
          if (!col.allowedValues.includes(strVal)) {
            warnings.push(
              `Value "${strVal}" is not in the allowed list: ${col.allowedValues.join(', ')}`,
            );
          }
        }
      }
    }

    return { clean, errors, warnings };
  }

  private async resolveSite(nameOrCode: string, companyId: bigint): Promise<bigint> {
    const key = nameOrCode.toLowerCase().trim();
    if (this.cache.sites.has(key)) return this.cache.sites.get(key)!;
    const site = await this.prisma.site.create({
      data: {
        companyId,
        name: nameOrCode,
        type: 'factory',
        status: 'active',
      }
    });
    this.cache.sites.set(key, site.id);
    return site.id;
  }

  private async resolveUnit(symbolOrName: string, companyId: bigint): Promise<bigint> {
    const key = symbolOrName.toLowerCase().trim();
    if (this.cache.units.has(key)) return this.cache.units.get(key)!;
    const unit = await this.prisma.unit.create({
      data: {
        companyId,
        name: symbolOrName,
        symbol: symbolOrName,
      }
    });
    this.cache.units.set(key, unit.id);
    return unit.id;
  }

  private async resolveAccount(codeOrName: string, companyId: bigint): Promise<bigint> {
    const key = codeOrName.toLowerCase().trim();
    if (this.cache.accounts.has(key)) return this.cache.accounts.get(key)!;
    const isCode = /^\d+$/.test(codeOrName);
    const code = isCode ? codeOrName : `ACC-${Math.floor(Math.random() * 10000)}`;
    const name = isCode ? `Account ${codeOrName}` : codeOrName;
    const type = inferAccountType(code) as AccountType;
    const acc = await this.prisma.account.create({
      data: {
        companyId,
        code,
        name,
        type,
        isActive: true,
      }
    });
    this.cache.accounts.set(key, acc.id);
    if (code !== key) this.cache.accounts.set(code.toLowerCase(), acc.id);
    return acc.id;
  }

  private async resolveCostCenter(codeOrName: string, companyId: bigint, siteId?: bigint | null): Promise<bigint> {
    const key = codeOrName.toLowerCase().trim();
    if (this.cache.costCenters.has(key)) return this.cache.costCenters.get(key)!;
    const isCode = /^[A-Z0-9-]+$/i.test(codeOrName) && codeOrName.length < 10;
    const code = isCode ? codeOrName : `CC-${Math.floor(Math.random() * 10000)}`;
    const name = isCode ? `Cost Center ${codeOrName}` : codeOrName;
    const cc = await this.prisma.costCenter.create({
      data: {
        companyId,
        code,
        name,
        type: 'production',
        siteId: siteId || null,
      }
    });
    this.cache.costCenters.set(key, cc.id);
    if (code !== key) this.cache.costCenters.set(code.toLowerCase(), cc.id);
    return cc.id;
  }

  private async resolveProductCategory(name: string, companyId: bigint): Promise<bigint> {
    const key = name.toLowerCase().trim();
    if (this.cache.productCategories.has(key)) return this.cache.productCategories.get(key)!;
    const pc = await this.prisma.productCategory.create({
      data: {
        companyId,
        name,
      }
    });
    this.cache.productCategories.set(key, pc.id);
    return pc.id;
  }

  private async resolveCustomer(codeOrName: string, companyId: bigint): Promise<bigint> {
    const key = codeOrName.toLowerCase().trim();
    if (this.cache.customers.has(key)) return this.cache.customers.get(key)!;
    const isCode = /^[A-Z0-9-]+$/i.test(codeOrName) && codeOrName.length < 15;
    const code = isCode ? codeOrName : `CUST-${Math.floor(Math.random() * 10000)}`;
    const name = isCode ? `Customer ${codeOrName}` : codeOrName;
    const cust = await this.prisma.customer.create({
      data: {
        companyId,
        code,
        name,
        isActive: true,
      }
    });
    this.cache.customers.set(key, cust.id);
    if (code !== key) this.cache.customers.set(code.toLowerCase(), cust.id);
    return cust.id;
  }

  private async resolveSupplier(name: string, companyId: bigint): Promise<bigint> {
    const key = name.toLowerCase().trim();
    if (this.cache.suppliers.has(key)) return this.cache.suppliers.get(key)!;
    const supp = await this.prisma.supplier.create({
      data: {
        companyId,
        name,
      }
    });
    this.cache.suppliers.set(key, supp.id);
    return supp.id;
  }

  private async resolveProduct(skuOrName: string, companyId: bigint, defaults?: { categoryId?: bigint | null; unitId?: bigint | null }): Promise<bigint> {
    const key = skuOrName.toLowerCase().trim();
    if (this.cache.products.has(key)) return this.cache.products.get(key)!;
    const isSku = /^[A-Z0-9-]+$/i.test(skuOrName) && skuOrName.length < 20;
    const sku = isSku ? skuOrName : `P-${Math.floor(Math.random() * 10000)}`;
    const name = isSku ? `Product ${skuOrName}` : skuOrName;
    const prod = await this.prisma.product.create({
      data: {
        companyId,
        sku,
        name,
        productType: 'finished_good',
        categoryId: defaults?.categoryId || null,
        unitId: defaults?.unitId || null,
        isActive: true,
      }
    });
    this.cache.products.set(key, prod.id);
    if (sku !== key) this.cache.products.set(sku.toLowerCase(), prod.id);
    return prod.id;
  }

  private async resolveMaterial(codeOrName: string, companyId: bigint, defaults?: { unitId?: bigint | null; supplierId?: bigint | null }): Promise<bigint> {
    const key = codeOrName.toLowerCase().trim();
    if (this.cache.materials.has(key)) return this.cache.materials.get(key)!;
    const isCode = /^[A-Z0-9-]+$/i.test(codeOrName) && codeOrName.length < 20;
    const code = isCode ? codeOrName : `RM-${Math.floor(Math.random() * 10000)}`;
    const name = isCode ? `Material ${codeOrName}` : codeOrName;
    const mat = await this.prisma.material.create({
      data: {
        companyId,
        code,
        name,
        materialType: 'raw_material',
        unitId: defaults?.unitId || null,
        supplierId: defaults?.supplierId || null,
        isActive: true,
      }
    });
    this.cache.materials.set(key, mat.id);
    if (code !== key) this.cache.materials.set(code.toLowerCase(), mat.id);
    return mat.id;
  }

  private async resolveBudgetCycle(name: string, companyId: bigint, userId: bigint, fiscalYear?: number): Promise<bigint> {
    const key = name.toLowerCase().trim();
    if (this.cache.budgetCycles.has(key)) return this.cache.budgetCycles.get(key)!;
    const fy = fiscalYear || new Date().getFullYear();
    const bc = await this.prisma.budgetCycle.create({
      data: {
        companyId,
        name,
        fiscalYear: fy,
        status: 'draft',
        createdBy: userId,
      }
    });
    this.cache.budgetCycles.set(key, bc.id);
    return bc.id;
  }

  private async resolveForecastCycle(name: string, companyId: bigint, userId: bigint, fiscalYear?: number): Promise<bigint> {
    const key = name.toLowerCase().trim();
    if (this.cache.forecastCycles.has(key)) return this.cache.forecastCycles.get(key)!;
    const fy = fiscalYear || new Date().getFullYear();
    const fc = await this.prisma.forecastCycle.create({
      data: {
        companyId,
        name,
        fiscalYear: fy,
        basePeriod: new Date(fy, 0, 1),
        status: 'draft',
        createdBy: userId,
      }
    });
    this.cache.forecastCycles.set(key, fc.id);
    return fc.id;
  }

  async resolveRowReferences(
    clean: Record<string, any>,
    module: string,
    companyId: bigint,
    userId: bigint,
  ): Promise<Record<string, any>> {
    const resolved = { ...clean };

    if ('createdBy' in resolved || module === 'exchangerates' || module === 'kpitargets' || module === 'promotions') {
      resolved.createdBy = userId;
    }

    if ('accountCode' in resolved || ('accountId' in resolved && typeof resolved.accountId === 'string')) {
      const code = String(resolved.accountCode || resolved.accountId);
      resolved.accountId = await this.resolveAccount(code, companyId);
      delete resolved.accountCode;
    }

    if ('siteCode' in resolved || 'siteName' in resolved || ('siteId' in resolved && typeof resolved.siteId === 'string')) {
      const name = String(resolved.siteCode || resolved.siteName || resolved.siteId);
      resolved.siteId = await this.resolveSite(name, companyId);
      delete resolved.siteCode;
      delete resolved.siteName;
    }

    if ('costCenterCode' in resolved || ('costCenterId' in resolved && typeof resolved.costCenterId === 'string')) {
      const code = String(resolved.costCenterCode || resolved.costCenterId);
      resolved.costCenterId = await this.resolveCostCenter(code, companyId, resolved.siteId);
      delete resolved.costCenterCode;
    }

    if ('unitSymbol' in resolved || 'uom' in resolved || ('unitId' in resolved && typeof resolved.unitId === 'string')) {
      const sym = String(resolved.unitSymbol || resolved.uom || resolved.unitId);
      if (sym && sym !== 'null' && sym !== 'undefined') {
        resolved.unitId = await this.resolveUnit(sym, companyId);
      } else {
        resolved.unitId = null;
      }
      delete resolved.unitSymbol;
      delete resolved.uom;
    }

    if ('categoryName' in resolved || ('categoryId' in resolved && typeof resolved.categoryId === 'string')) {
      const cat = String(resolved.categoryName || resolved.categoryId);
      if (cat && cat !== 'null' && cat !== 'undefined') {
        resolved.categoryId = await this.resolveProductCategory(cat, companyId);
      } else {
        resolved.categoryId = null;
      }
      delete resolved.categoryName;
    }

    if ('supplierName' in resolved || ('supplierId' in resolved && typeof resolved.supplierId === 'string')) {
      const supp = String(resolved.supplierName || resolved.supplierId);
      if (supp && supp !== 'null' && supp !== 'undefined') {
        resolved.supplierId = await this.resolveSupplier(supp, companyId);
      } else {
        resolved.supplierId = null;
      }
      delete resolved.supplierName;
    }

    if ('productSku' in resolved || 'productCode' in resolved || ('productId' in resolved && typeof resolved.productId === 'string')) {
      const sku = String(resolved.productSku || resolved.productCode || resolved.productId);
      resolved.productId = await this.resolveProduct(sku, companyId);
      delete resolved.productSku;
      delete resolved.productCode;
    }

    if ('materialCode' in resolved || ('materialId' in resolved && typeof resolved.materialId === 'string')) {
      const code = String(resolved.materialCode || resolved.materialId);
      resolved.materialId = await this.resolveMaterial(code, companyId);
      delete resolved.materialCode;
    }

    if ('customerCode' in resolved || ('customerId' in resolved && typeof resolved.customerId === 'string')) {
      const code = String(resolved.customerCode || resolved.customerId);
      resolved.customerId = await this.resolveCustomer(code, companyId);
      delete resolved.customerCode;
    }

    if ('budgetCycleName' in resolved) {
      const name = String(resolved.budgetCycleName);
      resolved.budgetCycleId = await this.resolveBudgetCycle(name, companyId, userId, resolved.fiscalYear);
      delete resolved.budgetCycleName;
    }

    if ('forecastCycleName' in resolved) {
      const name = String(resolved.forecastCycleName);
      resolved.forecastCycleId = await this.resolveForecastCycle(name, companyId, userId, resolved.fiscalYear);
      delete resolved.forecastCycleName;
    }

    if ('effectiveDate' in resolved) {
      resolved.priceDate = resolved.effectiveDate;
      delete resolved.effectiveDate;
    }

    if ('notes' in resolved && module === 'rawmaterialprices') {
      resolved.source = resolved.notes;
      delete resolved.notes;
    }

    return resolved;
  }

  /* ═══════════════════════════════════════════════════════════════════════
   * PUBLIC: Preview
   * ═══════════════════════════════════════════════════════════════════════ */

  async preview(
    buffer: Buffer,
    fileName: string,
  ): Promise<WorkbookPreviewResult> {
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
        invalidImportableRows += s.rowCount - s.validRows;
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
    const detectedType = detectFileTypeFromBuffer(buffer);
    if (detectedType === 'csv') {
      return this.makeErrorResult(
        fileName,
        'CSV files do not support multi-sheet import. Please upload an Excel workbook (.xlsx).',
      );
    }

    const typeResult = detectFileType(buffer, fileName);
    if (typeResult.mismatch) {
      return this.makeErrorResult(
        fileName,
        `The uploaded file format does not match. The file has a .${fileName.split('.').pop()} extension but is actually a ${typeResult.label}.`,
      );
    }

    let fullWorkbook: XLSX.WorkBook;
    try {
      fullWorkbook = XLSX.read(buffer, { type: 'buffer' });
    } catch {
      return this.makeErrorResult(
        fileName,
        'The Excel file could not be read. Please ensure the file is not corrupted.',
      );
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
      totals: {},
      warnings: [],
      errors: [],
      sheetResults: [],
    };

    await this.initializeCache(companyId);

    const { classifySheetRole } = require('./client-workbook-schema');
    for (const name of fullWorkbook.SheetNames) {
      const { role } = classifySheetRole(name);
      const ws = fullWorkbook.Sheets[name];

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
        await this.importPlanningCosting(
          fullWorkbook,
          companyId,
          userId,
          result,
        );
      } else {
        result.errors.push(
          'Could not determine workbook type. Please check the file format.',
        );
        result.success = false;
      }
    } catch (err: any) {
      const { friendly } = normalizeImportError(err);
      this.logger.error(`Import failed: ${err?.message || err}`);
      result.errors.push(friendly);
      result.success = false;
    }

    return result;
  }

  private makeErrorResult(fileName: string, msg: string): WorkbookImportResult {
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
      totals: {},
      warnings: [],
      errors: [msg],
      sheetResults: [],
    };
  }

  /* ═══════════════════════════════════════════════════════════════════════
   * WORKBOOK TYPE DETECTION
   * ═══════════════════════════════════════════════════════════════════════ */

  detectWorkbookType(workbook: XLSX.WorkBook): WorkbookType {
    const sheetNames = workbook.SheetNames.map((s) =>
      s.toLowerCase().replace(/[_\s-]/g, ''),
    );

    const hasSalesColumns = this.sheetHasColumnPattern(workbook, [
      'PERIOD',
      'CUSTOMER_NUMBER',
      'ITEM_CODE',
      'TOTAL_QTY',
      'EGP_NET_AMOUNT',
    ]);
    if (hasSalesColumns) return 'sales_analysis';

    const planningPatterns = [
      'p&l',
      'data',
      'forcasteqty',
      'forecastqty',
      'forecasteqty',
      'drilldown',
      'hvrm.price',
      'smg&a',
      's&mg&a',
      'weigperearton',
      'weightpercarton',
      'bomrecipes',
      'actualsales',
    ];
    const matchCount = sheetNames.filter((s) =>
      planningPatterns.some((p) => s.includes(p)),
    ).length;
    if (matchCount >= 2) return 'planning_costing';

    const directCheck = workbook.SheetNames.filter((s) => {
      const sl = s.toLowerCase();
      return [
        'p&l',
        'data',
        'forecast qty',
        'forcaste qty',
        'drill down',
        'hrv m.price',
        'discount',
        'weight per carton',
        'companies',
        'products',
        'bom recipes',
      ].includes(sl);
    });
    if (directCheck.length >= 2) return 'planning_costing';

    return 'unknown';
  }

  private sheetHasColumnPattern(
    workbook: XLSX.WorkBook,
    patterns: string[],
  ): boolean {
    for (const name of workbook.SheetNames) {
      const ws = workbook.Sheets[name];
      if (!ws) continue;
      // Read only the first row (headers) — avoid deserialising thousands of rows
      const firstRow = (XLSX.utils.sheet_to_json<unknown[]>(ws, {
        header: 1,
        range: 0,
        defval: null,
      }) as unknown[][])[0] ?? [];
      const headers = firstRow.map((h) => String(h ?? '').toUpperCase().trim());
      const matched = patterns.filter((p) => headers.includes(p));
      if (matched.length >= 3) return true;
    }
    return false;
  }

  /* ═══════════════════════════════════════════════════════════════════════
   * PREVIEW HELPERS
   * ═══════════════════════════════════════════════════════════════════════ */

  private previewSheetsV2(workbook: XLSX.WorkBook) {
    const {
      classifySheetRole,
    } = require('./client-workbook-schema');
    return workbook.SheetNames.map((name) => {
      const ws = workbook.Sheets[name];
      const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
        defval: null,
      });
      const headers = rawData.length > 0 ? Object.keys(rawData[0]) : [];
      const { role } = classifySheetRole(name);
      const mappedModule =
        role === 'data' ? this.mapSheetToModuleV3(name, headers) : '';
      const importable =
        role === 'data' &&
        mappedModule !== 'unknown' &&
        mappedModule !== '' &&
        !mappedModule.startsWith('informational_');
      const sampleRows = rawData.slice(0, 3);

      const errors: Array<{
        row: number;
        column: string;
        reason: string;
        message: string;
        value: unknown;
      }> = [];
      const warnings: string[] = [];

      if (
        role === 'data' &&
        (mappedModule === 'unknown' || mappedModule === '')
      ) {
        errors.push({
          row: 0,
          column: '',
          reason: 'unsupported_sheet',
          message: `Sheet "${name}" has no matching ERP module. This sheet requires implementation.`,
          value: name,
        });
      }

      let status: string;
      if (role === 'instruction') status = 'instruction';
      else if (role === 'reference') status = 'reference';
      else if (role === 'ignored') status = 'ignored';
      else if (mappedModule === 'unknown' || mappedModule === '')
        status = 'unsupported';
      else if (mappedModule.startsWith('informational_')) status = 'reference';
      else status = 'ready';

      let validRowsCount = 0;
      if (importable && mappedModule) {
        rawData.forEach((row, idx) => {
          const rowNum = idx + 2;
          const { errors: rowErrors, warnings: rowWarnings } = this.mapAndValidateRow(row, mappedModule, undefined, rowNum);
          if (rowErrors.length > 0) {
            rowErrors.forEach(err => {
              errors.push({
                row: rowNum,
                column: '',
                reason: 'validation_error',
                message: err,
                value: null
              });
            });
          } else {
            validRowsCount++;
          }
          if (rowWarnings.length > 0) {
            rowWarnings.forEach(w => warnings.push(`Row ${rowNum}: ${w}`));
          }
        });
      } else {
        validRowsCount = status === 'ready' ? rawData.length : 0;
      }

      return {
        name,
        sheetRole: role,
        rowCount: rawData.length,
        columnCount: headers.length,
        headers,
        mappedModule,
        importable,
        validRows: validRowsCount,
        errors,
        warnings,
        status,
        sampleRows,
      };
    });
  }

  mapSheetToModuleV3(sheetName: string, headers: string[]): string {
    const sn = sheetName.toLowerCase().replace(/[_\s-]+/g, '');
    const hUpper = headers.map((h) => h.toUpperCase().trim());

    if (sn === 'companies') return 'companies';
    if (sn === 'sites') return 'sites';
    if (sn === 'units') return 'units';
    if (sn === 'accounts') return 'accounts';
    if (sn === 'costcenters') return 'costcenters';
    if (sn === 'productcategories' || sn === 'categories')
      return 'productcategories';
    if (sn === 'customers') return 'customers';
    if (sn === 'suppliers') return 'suppliers';
    if (sn === 'materials') return 'materials';
    if (sn === 'products') return 'products';

    if (
      sn === 'bomrecipes' ||
      sn.includes('drilldown') ||
      (hUpper.includes('PRD NO') && hUpper.includes('ING NO'))
    )
      return 'bomrecipes';
    if (sn === 'bomlines') return 'bomlines';

    if (sn === 'budget' || sn === 'budgetlines') return 'budgetlines';

    if (
      sn === 'forecastqty' ||
      sn.includes('forcasteqty') ||
      sn.includes('forecasteqty')
    )
      return 'forecastlines';

    if (sn === 'actualsales' || sn === 'actuals') return 'actuallines';

    if (
      sn === 'materialprices' ||
      sn.includes('materialprice') ||
      sn.includes('hrvmprice') ||
      sn.includes('hrvm')
    )
      return 'rawmaterialprices';

    if (sn.includes('productionplan')) return 'productionplans';
    if (sn.includes('kpitarget')) return 'kpitargets';
    if (sn.includes('exchangerate')) return 'exchangerates';

    if (
      sn.includes('pricelist') ||
      sn === 'pricelist(2)' ||
      sn === 'pricelist (2)'
    )
      return 'priceList';
    if (sn.includes('discount')) return 'promotions';
    if (sn.includes('smga') || sn.includes('s&mg&a') || sn === 'sm&ga')
      return 'informational_smga';
    if (sn.includes('weightpercarton')) return 'informational_weight';
    if (sn.includes('hrvrates')) return 'informational_hrv';
    if (sn.includes('bawadirate')) return 'informational_bawadi';
    if (sn === 'starthere' || sn === 'referencelists' || sn === 'instructions')
      return 'informational_skipped';

    return 'unknown';
  }

  mapSheetToModule(sheetName: string, headers: string[]): string {
    return this.mapSheetToModuleV3(sheetName, headers);
  }

  private buildAutoCreatePlan(
    workbookType: WorkbookType,
    sheets: WorkbookPreviewResult['sheets'],
  ): string[] {
    const plan: string[] = [];
    if (workbookType === 'sales_analysis') {
      plan.push(
        'Units',
        'Sites',
        'Product Categories',
        'Products',
        'Customers',
        'Revenue Account',
        'Actual Import batch',
        'Sales transaction lines',
      );
    } else if (workbookType === 'planning_costing') {
      plan.push(
        'Units',
        'Sites',
        'Product Categories',
        'Products',
        'Materials',
        'Cost Centers',
        'Forecast Cycles + Forecast Lines',
        'Material Prices',
        'BOM Recipes + BOM Lines',
        'Discount entries',
        'Price List entries',
        'Cost Allocations',
      );
    }
    return plan;
  }

  private buildPreviewWarningsV2(
    workbookType: WorkbookType,
    sheets: WorkbookPreviewResult['sheets'],
  ): string[] {
    const warnings: string[] = [];
    if (workbookType === 'unknown') {
      warnings.push(
        'Could not automatically detect workbook type. Import may not work correctly.',
      );
    }
    let totalImportableRows = 0;
    let unsupportedCount = 0;
    for (const sheet of sheets) {
      if (sheet.importable) totalImportableRows += sheet.rowCount;
      if (
        sheet.sheetRole === 'data' &&
        (sheet.mappedModule === 'unknown' || sheet.mappedModule === '')
      ) {
        unsupportedCount++;
        warnings.push(
          `Sheet "${sheet.name}" → unsupported (no matching ERP module). Requires implementation.`,
        );
      }
    }
    if (totalImportableRows === 0 && unsupportedCount === 0) {
      warnings.push(
        'This workbook contains no importable data rows. Fill the Data sheets first, then upload again.',
      );
    }
    return warnings;
  }

  /* ═══════════════════════════════════════════════════════════════════════
   * SALES ANALYSIS IMPORT
   * ═══════════════════════════════════════════════════════════════════════ */

  private async importSalesAnalysis(
    workbook: XLSX.WorkBook,
    companyId: bigint,
    userId: bigint,
    result: WorkbookImportResult,
  ): Promise<void> {
    const sheetName = workbook.SheetNames.find((s) => {
      const ws = workbook.Sheets[s];
      if (!ws) return false;
      const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
        range: 1,
      });
      if (data.length === 0) return false;
      const headers = Object.keys(data[0]).map((h) => h.toUpperCase().trim());
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
      result.sheetResults.push({
        sheetName,
        sheetRole: 'data',
        status: 'skipped',
        rowsImported: 0,
        message: 'No data rows',
      });
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      const revenueAccount = await this.getOrCreateDefaultAccount(
        tx,
        companyId,
        '4000',
        'Sales Revenue',
        'revenue',
      );
      result.autoCreated.push({
        type: 'Account',
        code: '4000',
        name: 'Sales Revenue',
        created: false,
      });

      const locations = new Set<string>();
      const organizations = new Set<string>();
      const uomSet = new Set<string>();
      const products = new Map<
        number,
        { desc: string; arabicDesc: string; major: string; minor: string }
      >();
      const customers = new Map<number, string>();
      const categories = new Set<string>();

      for (const row of rows) {
        if (row['LOCATION']) locations.add(String(row['LOCATION']).trim());
        if (row['ORGANIZATION'])
          organizations.add(String(row['ORGANIZATION']).trim());
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

      for (const uom of uomSet) {
        const unit = await tx.unit.findFirst({
          where: { symbol: uom, companyId },
        });
        if (!unit) {
          await tx.unit.create({ data: { companyId, name: uom, symbol: uom } });
          result.autoCreated.push({
            type: 'Unit',
            code: uom,
            name: uom,
            created: true,
          });
          result.totals.units = (result.totals.units || 0) + 1;
        }
      }

      const allLocations = new Set([...locations, ...organizations]);
      for (const loc of allLocations) {
        const site = await tx.site.findFirst({
          where: { name: loc, companyId },
        });
        if (!site) {
          await tx.site.create({
            data: {
              companyId,
              name: loc,
              type: loc.toLowerCase().includes('warehouse')
                ? 'warehouse'
                : loc.toLowerCase().includes('office')
                  ? 'office'
                  : 'branch',
              status: 'active',
            },
          });
          result.autoCreated.push({
            type: 'Site',
            code: loc,
            name: loc,
            created: true,
          });
          result.totals.sites = (result.totals.sites || 0) + 1;
        }
      }

      const categoryMap = new Map<string, bigint>();
      for (const catName of categories) {
        const existing = await tx.productCategory.findFirst({
          where: { name: catName, companyId },
        });
        if (existing) {
          categoryMap.set(catName, existing.id);
        } else {
          const created = await tx.productCategory.create({
            data: { companyId, name: catName },
          });
          categoryMap.set(catName, created.id);
          result.autoCreated.push({
            type: 'ProductCategory',
            code: catName,
            name: catName,
            created: true,
          });
          result.totals.categories = (result.totals.categories || 0) + 1;
        }
      }

      const productMap = new Map<number, bigint>();
      for (const [code, info] of products) {
        const sku = String(code);
        const existing = await tx.product.findFirst({
          where: { sku, companyId },
        });
        if (existing) {
          productMap.set(code, existing.id);
        } else {
          const unit = await tx.unit.findFirst({
            where: { symbol: 'PCS', companyId },
          });
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
          result.autoCreated.push({
            type: 'Product',
            code: sku,
            name: info.desc || `Product ${sku}`,
            created: true,
          });
          result.totals.products = (result.totals.products || 0) + 1;
        }
      }

      const customerMap = new Map<number, bigint>();
      for (const [num, name] of customers) {
        const code = String(num);
        const existing = await tx.customer.findFirst({
          where: {
            OR: [
              { code, companyId },
              { name, companyId },
            ],
            isActive: true,
          },
        });
        if (existing) {
          customerMap.set(num, existing.id);
        } else {
          const created = await tx.customer.create({
            data: {
              companyId,
              code,
              name: name || `Customer ${code}`,
              customerType: 'wholesale',
              isActive: true,
            },
          });
          customerMap.set(num, created.id);
          result.autoCreated.push({
            type: 'Customer',
            code,
            name: name || `Customer ${code}`,
            created: true,
          });
          result.totals.customers = (result.totals.customers || 0) + 1;
        }
      }

      const firstRow = rows[0];
      const periodDate = this.parseExcelDate(firstRow['PERIOD']);
      const fiscalYear = periodDate.getFullYear();
      const actualImport = await tx.actualImport.create({
        data: {
          companyId,
          importType: 'gl',
          periodFrom: new Date(fiscalYear, 0, 1),
          periodTo: new Date(fiscalYear, 11, 31),
          status: 'posted',
          importedBy: userId,
        },
      });

      let imported = 0;
      for (const row of rows) {
        const itemCode = row['ITEM_CODE'] ? Number(row['ITEM_CODE']) : null;
        const custNum = row['CUSTOMER_NUMBER']
          ? Number(row['CUSTOMER_NUMBER'])
          : null;
        const location = String(row['LOCATION'] || '').trim();
        const org = String(row['ORGANIZATION'] || '').trim();

        const site = await tx.site.findFirst({
          where: {
            OR: [
              { name: location, companyId },
              { name: org, companyId },
            ],
          },
        });

        const productId = itemCode ? (productMap.get(itemCode) ?? null) : null;
        const customerId = custNum ? (customerMap.get(custNum) ?? null) : null;
        const trxDate = this.parseExcelDate(row['TRX_DATE']);
        const qty = row['TOTAL_QTY'] ? Number(row['TOTAL_QTY']) : 0;
        const netAmount = row['EGP_NET_AMOUNT']
          ? Number(row['EGP_NET_AMOUNT'])
          : 0;
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
        result.totals.actualLines = (result.totals.actualLines || 0) + 1;
      }

      result.sheetResults.push({
        sheetName,
        sheetRole: 'data',
        status: 'imported',
        rowsImported: imported,
        message: `Imported ${imported} sales transactions`,
      });
      result.sheetsImported++;
    });
  }

  /* ═══════════════════════════════════════════════════════════════════════
   * PLANNING/COSTING IMPORT
   * ═══════════════════════════════════════════════════════════════════════ */

  private async importPlanningCosting(
    workbook: XLSX.WorkBook,
    companyId: bigint,
    userId: bigint,
    result: WorkbookImportResult,
  ): Promise<void> {
    // Build sheet→module index once (reads only first row of each sheet)
    const sheetIndex = this.buildSheetModuleIndex(workbook);
    this.logger.log(`Sheet index built: ${JSON.stringify(Object.fromEntries([...sheetIndex.entries()].map(([k,v])=>[v,k])))}`);

    // Phase 0: Import all generic master data sheets (Companies, Sites, Units, etc.)
    await this.importAllGenericSheets(workbook, companyId, userId, result, {}, sheetIndex);

    // Phase 1: Extract master data from 'Data' sheet
    const masterData = this.extractDataSheetMasterData(workbook);
    const productMap = new Map<number, bigint>();
    const materialMap = new Map<number, bigint>();

    await this.prisma.$transaction(async (tx) => {
      for (const uom of masterData.units) {
        const existing = await tx.unit.findFirst({
          where: { symbol: uom, companyId },
        });
        if (!existing) {
          await tx.unit.create({ data: { companyId, name: uom, symbol: uom } });
          result.autoCreated.push({
            type: 'Unit',
            code: uom,
            name: uom,
            created: true,
          });
          result.totals.units = (result.totals.units || 0) + 1;
        }
      }

      for (const org of masterData.organizations) {
        const existing = await tx.site.findFirst({
          where: { name: org, companyId },
        });
        if (!existing) {
          await tx.site.create({
            data: {
              companyId,
              name: org,
              type: org.toLowerCase().includes('bawadi')
                ? 'factory'
                : 'factory',
              status: 'active',
            },
          });
          result.autoCreated.push({
            type: 'Site',
            code: org,
            name: org,
            created: true,
          });
          result.totals.sites = (result.totals.sites || 0) + 1;
        }
      }

      const categoryMap = new Map<string, bigint>();
      for (const cat of masterData.categories) {
        const existing = await tx.productCategory.findFirst({
          where: { name: cat, companyId },
        });
        if (existing) {
          categoryMap.set(cat, existing.id);
        } else {
          const created = await tx.productCategory.create({
            data: { companyId, name: cat },
          });
          categoryMap.set(cat, created.id);
          result.autoCreated.push({
            type: 'ProductCategory',
            code: cat,
            name: cat,
            created: true,
          });
          result.totals.categories = (result.totals.categories || 0) + 1;
        }
      }

      const costCenterMap = new Map<string, bigint>();
      for (const cc of masterData.costCenters) {
        if (!cc) continue;
        const existing = await tx.costCenter.findFirst({
          where: { name: cc, companyId },
        });
        if (existing) {
          costCenterMap.set(cc, existing.id);
        } else {
          const created = await tx.costCenter.create({
            data: { companyId, name: cc, type: 'production' },
          });
          costCenterMap.set(cc, created.id);
          result.autoCreated.push({
            type: 'CostCenter',
            code: cc,
            name: cc,
            created: true,
          });
          result.totals.costCenters = (result.totals.costCenters || 0) + 1;
        }
      }

      for (const [code, info] of masterData.products) {
        const sku = String(code);
        const existing = await tx.product.findFirst({
          where: { sku, companyId },
        });
        if (existing) {
          productMap.set(code, existing.id);
        } else {
          const unit =
            masterData.units.size > 0
              ? await tx.unit.findFirst({
                  where: { symbol: info.uom || 'PCS', companyId },
                })
              : null;
          const catId = info.major
            ? (categoryMap.get(info.major) ?? null)
            : null;
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
          result.autoCreated.push({
            type: 'Product',
            code: sku,
            name: info.desc || `Product ${sku}`,
            created: true,
          });
          result.totals.products = (result.totals.products || 0) + 1;
        }
      }

      for (const [code, info] of masterData.materials) {
        const matCode = String(code);
        const existing = await tx.material.findFirst({
          where: { code: matCode, companyId },
        });
        if (existing) {
          materialMap.set(code, existing.id);
        } else {
          const unit = await tx.unit.findFirst({
            where: { symbol: info.uom || 'KGS', companyId },
          });
          const created = await tx.material.create({
            data: {
              companyId,
              code: matCode,
              name: info.desc || `Material ${matCode}`,
              materialType: info.type || 'raw_material',
              unitId: unit?.id ?? null,
              isActive: true,
            },
          });
          materialMap.set(code, created.id);
          result.autoCreated.push({
            type: 'Material',
            code: matCode,
            name: info.desc || `Material ${matCode}`,
            created: true,
          });
          result.totals.materials = (result.totals.materials || 0) + 1;
        }
      }
    });

    // Phase 2: Import non-master sheets in dependency order
    await this.importGenericSheetByModule(
      workbook,
      'forecastlines',
      companyId,
      userId,
      result,
      { productMap, materialMap },
      sheetIndex,
    );
    await this.importDrillDown(
      workbook,
      companyId,
      productMap,
      materialMap,
      result,
    );
    await this.importGenericSheetByModule(
      workbook,
      'rawmaterialprices',
      companyId,
      userId,
      result,
      { materialMap },
      sheetIndex,
    );
    await this.importGenericSheetByModule(
      workbook,
      'priceList',
      companyId,
      userId,
      result,
      { productMap },
      sheetIndex,
    );
    await this.importGenericSheetByModule(
      workbook,
      'promotions',
      companyId,
      userId,
      result,
      { productMap },
      sheetIndex,
    );
    await this.importGenericSheetByModule(
      workbook,
      'informational_weight',
      companyId,
      userId,
      result,
      { productMap },
      sheetIndex,
    );
    await this.importGenericSheetByModule(
      workbook,
      'informational_hrv',
      companyId,
      userId,
      result,
      {},
      sheetIndex,
    );
    await this.importGenericSheetByModule(
      workbook,
      'informational_bawadi',
      companyId,
      userId,
      result,
      {},
      sheetIndex,
    );
    await this.importGenericSheetByModule(
      workbook,
      'actuallines',
      companyId,
      userId,
      result,
      { productMap, materialMap },
      sheetIndex,
    );
    await this.importGenericSheetByModule(
      workbook,
      'budgetlines',
      companyId,
      userId,
      result,
      { productMap, materialMap },
      sheetIndex,
    );
    await this.importGenericSheetByModule(
      workbook,
      'bomlines',
      companyId,
      userId,
      result,
      { productMap, materialMap },
      sheetIndex,
    );
    await this.importGenericSheetByModule(
      workbook,
      'productionplans',
      companyId,
      userId,
      result,
      { productMap },
      sheetIndex,
    );
    await this.importGenericSheetByModule(
      workbook,
      'kpitargets',
      companyId,
      userId,
      result,
      {},
      sheetIndex,
    );
    await this.importGenericSheetByModule(
      workbook,
      'exchangerates',
      companyId,
      userId,
      result,
      {},
      sheetIndex,
    );
  }

  /* ─── Generic Sheet Import ─────────────────────────────────────────── */

  private async importAllGenericSheets(
    workbook: XLSX.WorkBook,
    companyId: bigint,
    userId: bigint,
    result: WorkbookImportResult,
    context: Record<string, any>,
    sheetIndex?: Map<string, string>,
  ): Promise<void> {
    const masterModules = [
      'companies',
      'sites',
      'units',
      'accounts',
      'costcenters',
      'productcategories',
      'customers',
      'suppliers',
      'materials',
      'products',
    ];
    for (const module of masterModules) {
      await this.importGenericSheetByModule(
        workbook,
        module,
        companyId,
        userId,
        result,
        context,
        sheetIndex,
      );
    }
  }

  private async importGenericSheetByModule(
    workbook: XLSX.WorkBook,
    module: string,
    companyId: bigint,
    userId: bigint,
    result: WorkbookImportResult,
    context: {
      productMap?: Map<number, bigint>;
      materialMap?: Map<number, bigint>;
    },
    sheetIndex?: Map<string, string>,
  ): Promise<void> {
    // Find the sheet that maps to this module (use cached index if available)
    const sheetName = sheetIndex?.get(module) ?? this.findSheetByModule(workbook, module);
    if (!sheetName) {
      return; // Sheet not found, skip silently
    }

    const ws = workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
      defval: null,
    });

    // Skip reference/instruction sheets
    const { classifySheetRole } = require('./client-workbook-schema');
    const { role } = classifySheetRole(sheetName);
    if (role !== 'data') return;

    result.sheetsProcessed++;
    this.logger.log(
      `Importing sheet "${sheetName}" as module "${module}" (${rawRows.length} rows)`,
    );

    // Handle informational/reference sheets gracefully
    if (module.startsWith('informational_')) {
      const message = this.getInformationalMessage(module, sheetName);
      result.sheetResults.push({
        sheetName,
        sheetRole: 'data',
        status: 'skipped',
        rowsImported: 0,
        message,
      });
      result.sheetsSkipped++;
      result.warnings.push(message);
      return;
    }

    // Special handling for certain modules
    if (module === 'rawmaterialprices') {
      // Delegate to the dedicated HRV Material Prices handler
      if (workbook.Sheets['HRV M.Price']) {
        const emptyMap = new Map<number, bigint>();
        await this.importHrvMaterialPrices(workbook, companyId, emptyMap, result);
        return;
      }
      // Fallback: import via generic path using rawMaterialPrice model, not materials
      // The module name 'rawmaterialprices' ensures modelName is 'rawMaterialPrice'
      // (line 1906), so it creates RawMaterialPrice records, not Material records.
      this.logger.log(
        `No HRV M.Price sheet — importing "${sheetName}" as rawMaterialPrice records`,
      );
      // Continue to the generic insert path below
    }

    if (module === 'priceList') {
      await this.importPriceListSheet(workbook, companyId, result);
      return;
    }

    if (module === 'promotions') {
      await this.importDiscountsSheet(workbook, companyId, result, context);
      return;
    }

    if (module === 'forecastlines') {
      await this.importForcasteQty(
        workbook,
        companyId,
        userId,
        context.productMap || new Map(),
        result,
      );
      return;
    }

    if (module === 'bomlines') {
      // Handled by importDrillDown which handles BOM Recipes + BOM Lines from Drill Down sheet
      return;
    }

    if (module === 'actuallines') {
      await this.importActualsFromDataSheet(
        workbook,
        companyId,
        userId,
        result,
        context,
      );
      return;
    }

    if (module === 'budgetlines') {
      await this.importBudgetFromDataSheet(
        workbook,
        companyId,
        result,
        context,
      );
      return;
    }

    if (rawRows.length === 0) {
      result.sheetResults.push({
        sheetName,
        sheetRole: 'data',
        status: 'skipped',
        rowsImported: 0,
        message: 'No data rows',
      });
      result.sheetsSkipped++;
      return;
    }

    // For master data sheets, use generic import
    const modelMap: Record<string, string> = {
      companies: 'company',
      sites: 'site',
      units: 'unit',
      accounts: 'account',
      costcenters: 'costCenter',
      productcategories: 'productCategory',
      customers: 'customer',
      suppliers: 'supplier',
      materials: 'material',
      products: 'product',
      budgetlines: 'budgetLine',
      forecastlines: 'forecastLine',
      actuallines: 'actualLine',
      productionplans: 'productionPlan',
      kpitargets: 'kpiTarget',
      exchangerates: 'exchangeRate',
      promotions: 'promotion',
      rawmaterialprices: 'rawMaterialPrice',
    };

    const modelName = modelMap[module];
    if (!modelName) {
      result.sheetResults.push({
        sheetName,
        sheetRole: 'data',
        status: 'skipped',
        rowsImported: 0,
        message: `No import handler for module: ${module}`,
      });
      result.sheetsSkipped++;
      return;
    }

    const prismaModel = this.getPrismaModelByModule(module);
    if (!prismaModel) {
      result.sheetResults.push({
        sheetName,
        sheetRole: 'data',
        status: 'error',
        rowsImported: 0,
        message: `No Prisma model for module: ${module}`,
      });
      result.errors.push(`No Prisma model for module: ${module}`);
      return;
    }

    let imported = 0;
    let failed = 0;
    const errors: string[] = [];

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      const rowNum = i + 2; // Excel row numbering (1-indexed + header)

      // 1. Map and validate
      const { clean, errors: rowErrors } = this.mapAndValidateRow(row, module, companyId, rowNum);
      if (rowErrors.length > 0) {
        errors.push(`Row ${rowNum}: ${rowErrors.join(', ')}`);
        failed++;
        continue;
      }

      // Skip rows with no meaningful data
      const relevantKeys = Object.keys(clean).filter((k) => k !== 'companyId');
      if (relevantKeys.length === 0) {
        this.logger.warn(`Row ${rowNum} in "${sheetName}" (${module}): all fields empty/whitelisted-out after mapping — keys in clean: ${Object.keys(clean).join(',')}`);
        continue;
      }

      // 2. Resolve references
      let resolved: Record<string, any>;
      try {
        resolved = await this.resolveRowReferences(clean, module, companyId, userId);
      } catch (err: any) {
        errors.push(`Row ${rowNum}: Ref resolution failed - ${err.message}`);
        failed++;
        continue;
      }

      // 3. Whitelist again to keep only prisma model fields
      const prismaClean = whitelistFields(resolved, modelName);

      // Special upsert handling for each master data model to avoid duplicates
      try {
        let existingId: bigint | null = null;
        if (module === 'companies') {
          // Never set tenantId from Excel — always keep existing tenant
          delete (prismaClean as any).tenantId;
          delete (prismaClean as any).tenant_id;
          await this.prisma.company.update({ where: { id: companyId }, data: prismaClean as Prisma.CompanyUpdateInput });
        } else if (module === 'sites') {
          const name = String(prismaClean.name);
          existingId = this.cache.sites.get(name.toLowerCase().trim()) || null;
          if (existingId) {
            await this.prisma.site.update({ where: { id: existingId }, data: prismaClean as Prisma.SiteUpdateInput });
          } else {
            const created = await this.prisma.site.create({ data: prismaClean as Prisma.SiteCreateInput });
            this.cache.sites.set(name.toLowerCase().trim(), created.id);
          }
        } else if (module === 'units') {
          const name = String(prismaClean.name);
          const symbol = String(prismaClean.symbol || name);
          existingId = this.cache.units.get(symbol.toLowerCase().trim()) || this.cache.units.get(name.toLowerCase().trim()) || null;
          if (existingId) {
            await this.prisma.unit.update({ where: { id: existingId }, data: prismaClean as Prisma.UnitUpdateInput });
          } else {
            const created = await this.prisma.unit.create({ data: prismaClean as Prisma.UnitCreateInput });
            this.cache.units.set(name.toLowerCase().trim(), created.id);
            this.cache.units.set(symbol.toLowerCase().trim(), created.id);
          }
        } else if (module === 'accounts') {
          const code = String(prismaClean.code);
          const name = String(prismaClean.name || `Account ${code}`);
          existingId = this.cache.accounts.get(code.toLowerCase().trim()) || this.cache.accounts.get(name.toLowerCase().trim()) || null;
          if (existingId) {
            await this.prisma.account.update({ where: { id: existingId }, data: prismaClean as Prisma.AccountUpdateInput });
          } else {
            const created = await this.prisma.account.create({ data: prismaClean as Prisma.AccountCreateInput });
            this.cache.accounts.set(code.toLowerCase().trim(), created.id);
            this.cache.accounts.set(name.toLowerCase().trim(), created.id);
          }
        } else if (module === 'costcenters') {
          const code = String(prismaClean.code);
          const name = String(prismaClean.name || `Cost Center ${code}`);
          existingId = this.cache.costCenters.get(code.toLowerCase().trim()) || this.cache.costCenters.get(name.toLowerCase().trim()) || null;
          if (existingId) {
            await this.prisma.costCenter.update({ where: { id: existingId }, data: prismaClean as Prisma.CostCenterUpdateInput });
          } else {
            const created = await this.prisma.costCenter.create({ data: prismaClean as Prisma.CostCenterCreateInput });
            this.cache.costCenters.set(code.toLowerCase().trim(), created.id);
            this.cache.costCenters.set(name.toLowerCase().trim(), created.id);
          }
        } else if (module === 'productcategories') {
          const name = String(prismaClean.name);
          existingId = this.cache.productCategories.get(name.toLowerCase().trim()) || null;
          if (existingId) {
            await this.prisma.productCategory.update({ where: { id: existingId }, data: prismaClean as Prisma.ProductCategoryUpdateInput });
          } else {
            const created = await this.prisma.productCategory.create({ data: prismaClean as Prisma.ProductCategoryCreateInput });
            this.cache.productCategories.set(name.toLowerCase().trim(), created.id);
          }
        } else if (module === 'customers') {
          const code = String(prismaClean.code);
          const name = String(prismaClean.name || `Customer ${code}`);
          existingId = this.cache.customers.get(code.toLowerCase().trim()) || this.cache.customers.get(name.toLowerCase().trim()) || null;
          if (existingId) {
            await this.prisma.customer.update({ where: { id: existingId }, data: prismaClean as Prisma.CustomerUpdateInput });
          } else {
            const created = await this.prisma.customer.create({ data: prismaClean as Prisma.CustomerCreateInput });
            this.cache.customers.set(code.toLowerCase().trim(), created.id);
            this.cache.customers.set(name.toLowerCase().trim(), created.id);
          }
        } else if (module === 'suppliers') {
          const name = String(prismaClean.name);
          existingId = this.cache.suppliers.get(name.toLowerCase().trim()) || null;
          if (existingId) {
            await this.prisma.supplier.update({ where: { id: existingId }, data: prismaClean as Prisma.SupplierUpdateInput });
          } else {
            const created = await this.prisma.supplier.create({ data: prismaClean as Prisma.SupplierCreateInput });
            this.cache.suppliers.set(name.toLowerCase().trim(), created.id);
          }
        } else if (module === 'materials') {
          const code = String(prismaClean.code);
          const name = String(prismaClean.name || `Material ${code}`);
          existingId = this.cache.materials.get(code.toLowerCase().trim()) || this.cache.materials.get(name.toLowerCase().trim()) || null;
          if (existingId) {
            await this.prisma.material.update({ where: { id: existingId }, data: prismaClean as Prisma.MaterialUpdateInput });
          } else {
            const created = await this.prisma.material.create({ data: prismaClean as Prisma.MaterialCreateInput });
            this.cache.materials.set(code.toLowerCase().trim(), created.id);
            this.cache.materials.set(name.toLowerCase().trim(), created.id);
          }
        } else if (module === 'products') {
          const sku = String(prismaClean.sku);
          const name = String(prismaClean.name || `Product ${sku}`);
          existingId = this.cache.products.get(sku.toLowerCase().trim()) || this.cache.products.get(name.toLowerCase().trim()) || null;
          if (existingId) {
            await this.prisma.product.update({ where: { id: existingId }, data: prismaClean as Prisma.ProductUpdateInput });
          } else {
            const created = await this.prisma.product.create({ data: prismaClean as Prisma.ProductCreateInput });
            this.cache.products.set(sku.toLowerCase().trim(), created.id);
            this.cache.products.set(name.toLowerCase().trim(), created.id);
          }
        } else if (module === 'exchangerates') {
          const _p = prismaClean as any;
          _p.rateDate = new Date(_p.rateDate);
          await this.prisma.exchangeRate.upsert({
            where: {
              companyId_fromCurrency_toCurrency_rateDate: {
                companyId: _p.companyId,
                fromCurrency: _p.fromCurrency,
                toCurrency: _p.toCurrency,
                rateDate: _p.rateDate,
              },
            },
            create: _p,
            update: _p,
          });
        } else if (module === 'productionplans') {
          const _p = prismaClean as any;
          _p.companyId = typeof _p.companyId === 'bigint' ? _p.companyId : companyId;
          if (!_p.siteId) {
            this.logger.warn(`Row ${rowNum}: Production plan missing siteId — skipping`);
            this.logger.debug(`Prisma payload: ${JSON.stringify(prismaClean, (_k, v) => typeof v === 'bigint' ? v.toString() : v)}`);
            failed++;
            continue;
          }
          if (!_p.productId) {
            this.logger.warn(`Row ${rowNum}: Production plan missing productId — skipping`);
            this.logger.debug(`Prisma payload: ${JSON.stringify(prismaClean, (_k, v) => typeof v === 'bigint' ? v.toString() : v)}`);
            failed++;
            continue;
          }
          const existingPlan = await this.prisma.productionPlan.findFirst({
            where: {
              companyId: _p.companyId,
              siteId: _p.siteId,
              productId: _p.productId,
              fiscalYear: _p.fiscalYear,
              periodMonth: _p.periodMonth,
            },
          });
          if (existingPlan) {
            await this.prisma.productionPlan.update({ where: { id: existingPlan.id }, data: _p });
          } else {
            await this.prisma.productionPlan.create({ data: _p });
          }
        } else {
          // General create fallback
          await prismaModel.create({ data: prismaClean });
        }
        imported++;
        result.totals[module] = (result.totals[module] || 0) + 1;
      } catch (err: any) {
        const { friendly } = normalizeImportError(err, {
          module,
          row: rowNum,
          sheet: sheetName,
        });
        errors.push(`Row ${rowNum}: ${friendly}`);
        failed++;
        this.logger.error(`Row ${rowNum} in "${sheetName}" (${module}) failed: ${err.message}`);
        this.logger.error(`Prisma payload: ${JSON.stringify(prismaClean, (_k, v) => typeof v === 'bigint' ? v.toString() : v)}`);
      }
    }

    if (imported === 0 && rawRows.length > 0) {
      this.logger.warn(`Zero rows imported for "${sheetName}" (${module}) — ${rawRows.length} rows present, ${failed} failed. First error: ${errors[0] || 'none'}`);
    }

    const status = imported > 0 ? 'imported' : 'skipped';
    const message =
      imported > 0
        ? `Imported ${imported} ${getModuleTitle(module).toLowerCase()} records${failed > 0 ? ` (${failed} rows skipped)` : ''}`
        : `${failed > 0 ? `All ${failed} rows had errors` : 'No data rows'}`;

    result.sheetResults.push({
      sheetName,
      sheetRole: 'data',
      status,
      rowsImported: imported,
      message,
    });
    if (imported > 0) result.sheetsImported++;
    else result.sheetsSkipped++;
    if (errors.length > 0) {
      result.errors.push(...errors);
    }
  }

  private getInformationalMessage(module: string, sheetName: string): string {
    const msgs: Record<string, string> = {
      informational_skipped: `Sheet "${sheetName}" is used for reference only and was skipped`,
      informational_weight: `Sheet "${sheetName}" (Weight per Carton) is informational and was skipped`,
      informational_hrv: `Sheet "${sheetName}" (HRV Rates) is informational and was skipped`,
      informational_bawadi: `Sheet "${sheetName}" (Bawadi Rates) is informational and was skipped`,
      informational_smga: `Sheet "${sheetName}" (S&M G&A) is informational and was skipped`,
    };
    return msgs[module] || `Sheet "${sheetName}" was skipped (informational)`;
  }

  private getPrismaModelByModule(module: string): any {
    const map: Record<string, any> = {
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
      bomlines: this.prisma.bomLine,
      budgetlines: this.prisma.budgetLine,
      forecastlines: this.prisma.forecastLine,
      actuallines: this.prisma.actualLine,
      productionplans: this.prisma.productionPlan,
      kpitargets: this.prisma.kpiTarget,
      exchangerates: this.prisma.exchangeRate,
      promotions: this.prisma.promotion,
      rawmaterialprices: this.prisma.rawMaterialPrice,
    };
    return map[module] || null;
  }

  /**
   * Build a module→sheetName index in a SINGLE pass over the workbook.
   * Reads only the first row of each sheet (not the full data) so it is O(S)
   * rather than O(S×M) when called repeatedly from importGenericSheetByModule.
   */
  private buildSheetModuleIndex(workbook: XLSX.WorkBook): Map<string, string> {
    const index = new Map<string, string>(); // module → sheetName
    for (const name of workbook.SheetNames) {
      const ws = workbook.Sheets[name];
      if (!ws) continue;
      // Read only first row to extract header keys (header:1 → string[][])
      const firstRows = (XLSX.utils.sheet_to_json<unknown[]>(ws, {
        range: 0,
        header: 1,
        defval: null,
      }) as unknown[][]);
      const headerKeys: string[] = firstRows.length > 0
        ? firstRows[0].map((v) => (v ? String(v).trim() : ''))
        : [];
      const mod = this.mapSheetToModuleV3(name, headerKeys);
      if (mod && mod !== 'unknown') {
        index.set(mod, name);
      }
    }
    return index;
  }

  private findSheetByModule(
    workbook: XLSX.WorkBook,
    module: string,
  ): string | null {
    for (const name of workbook.SheetNames) {
      const ws = workbook.Sheets[name];
      if (!ws) continue;
      const headers = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
        range: 0,
        defval: null,
      });
      const headerKeys = headers.length > 0 ? Object.keys(headers[0]) : [];
      if (this.mapSheetToModuleV3(name, headerKeys) === module) {
        return name;
      }
    }
    return null;
  }

  /* ─── Price List Import ──────────────────────────────────────────────── */

  private async importPriceListSheet(
    workbook: XLSX.WorkBook,
    companyId: bigint,
    result: WorkbookImportResult,
  ): Promise<void> {
    // Try sheet name "Price list (2)" or find by module mapping
    let sheetName = workbook.SheetNames.find(
      (s) =>
        s.toLowerCase().includes('price list') ||
        s.toLowerCase().includes('pricelist'),
    );
    if (!sheetName) {
      // Try default name
      sheetName = 'Price list (2)';
      if (!workbook.Sheets[sheetName]) return;
    }

    const ws = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
      header: 1,
      defval: null,
    }) as unknown as unknown[][];
    result.sheetsProcessed++;

    // Try to find header row (scan for month columns)
    let headerIdx = -1;
    for (let i = 0; i < Math.min(rows.length, 10); i++) {
      const row = rows[i];
      if (!row) continue;
      const rowStr = row.map((v) => String(v || '').toLowerCase());
      if (
        rowStr.some(
          (v) =>
            v.includes('item code') ||
            v.includes('code-') ||
            v.includes('code'),
        )
      ) {
        headerIdx = i;
        break;
      }
    }
    if (headerIdx < 0) {
      result.sheetResults.push({
        sheetName,
        sheetRole: 'data',
        status: 'skipped',
        rowsImported: 0,
        message: 'No header row found',
      });
      result.sheetsSkipped++;
      return;
    }

    const headerRow = rows[headerIdx];
    const h = headerRow.map((v: unknown) =>
      v ? String(v).trim().toLowerCase() : '',
    );

    const codeCol = h.findIndex(
      (v: string) =>
        v === 'item code' || v === 'code-' || v === 'code' || v === 'code-',
    );
    // Try month-column format
    const monthCols: Array<{ col: number; month: number; year: number }> = [];
    // Also try salePrice column format (simple columnar)
    const salePriceCol = h.findIndex(
      (v: string) =>
        v === 'saleprice' || v === 'sale_price' || v === 'price' || v === 'sellingprice',
    );
    const skuCol = h.findIndex(
      (v: string) =>
        v === 'productsku' || v === 'product_sku' || v === 'sku' || v === 'itemcode' || v === 'code',
    );
    for (let i = 0; i < h.length; i++) {
      const parsed = this.parseMonthYearString(h[i]);
      if (parsed)
        monthCols.push({ col: i, month: parsed.month, year: parsed.year });
    }

    let imported = 0;

    if (monthCols.length > 0) {
      // Month-column format
      for (let i = headerIdx + 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length < 2) continue;

        const codeVal = codeCol >= 0 ? row[codeCol] : row[0];
        if (!codeVal) continue;

        const sku = String(codeVal).trim();

        for (const mc of monthCols) {
          const price =
            typeof row[mc.col] === 'number' ? (row[mc.col] as number) : null;
          if (!price || price <= 0) continue;

          try {
            const updated = await this.prisma.product.updateMany({
              where: { sku, companyId },
              data: { salePrice: price },
            });
            if (updated.count === 0) {
              this.logger.warn(`Price list: product not found for SKU "${sku}"`);
            }
            imported++;
            result.totals.priceListEntries =
              (result.totals.priceListEntries || 0) + 1;
          } catch (err: any) {
            this.logger.warn(`Price list row skipped for SKU "${sku}": ${err.message}`);
          }
        }
      }
    } else if (salePriceCol >= 0 && skuCol >= 0) {
      // Simple columnar format: productSku | salePrice
      for (let i = headerIdx + 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length < 2) continue;

        const codeVal = row[skuCol];
        if (!codeVal) continue;

        const sku = String(codeVal).trim();
        const price =
          typeof row[salePriceCol] === 'number' ? (row[salePriceCol] as number) : null;
        if (!price || price <= 0) continue;

        try {
          const updated = await this.prisma.product.updateMany({
            where: { sku, companyId },
            data: { salePrice: price },
          });
          if (updated.count === 0) {
            this.logger.warn(`Price list: product not found for SKU "${sku}"`);
          }
          imported++;
          result.totals.priceListEntries =
            (result.totals.priceListEntries || 0) + 1;
        } catch (err: any) {
          this.logger.warn(`Price list row skipped for SKU "${sku}": ${err.message}`);
        }
      }
    }

    result.sheetResults.push({
      sheetName,
      sheetRole: 'data',
      status: imported > 0 ? 'imported' : 'skipped',
      rowsImported: imported,
      message:
        imported > 0
          ? `Updated ${imported} product prices`
          : 'No price data found',
    });
    if (imported > 0) result.sheetsImported++;
    else result.sheetsSkipped++;
  }

  /* ─── Discounts / Promotions Import ──────────────────────────────────── */

  private async importDiscountsSheet(
    workbook: XLSX.WorkBook,
    companyId: bigint,
    result: WorkbookImportResult,
    context: { productMap?: Map<number, bigint> },
  ): Promise<void> {
    let sheetName = workbook.SheetNames.find((s) =>
      s.toLowerCase().includes('discount'),
    );
    if (!sheetName) {
      sheetName = 'Discount';
      if (!workbook.Sheets[sheetName]) return;
    }

    const ws = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
      header: 1,
      defval: null,
    }) as unknown as unknown[][];
    result.sheetsProcessed++;

    let headerIdx = -1;
    for (let i = 0; i < Math.min(rows.length, 10); i++) {
      const row = rows[i];
      if (!row) continue;
      const rowStr = row.map((v) => String(v || '').toLowerCase());
      if (
        rowStr.some((v) => v.includes('code-') || v.includes('code')) &&
        rowStr.some((v) => v.includes('discount'))
      ) {
        headerIdx = i;
        break;
      }
    }
    if (headerIdx < 0) {
      result.sheetResults.push({
        sheetName,
        sheetRole: 'data',
        status: 'skipped',
        rowsImported: 0,
        message: 'No header row found',
      });
      result.sheetsSkipped++;
      return;
    }

    const headerRow = rows[headerIdx];
    const h = headerRow.map((v: unknown) =>
      v ? String(v).trim().toLowerCase() : '',
    );
    const codeCol = h.findIndex((v: string) => v === 'code-' || v === 'code');
    const descCol = h.findIndex(
      (v: string) => v === 'item desc' || v === 'description',
    );

    let imported = 0;
    for (let i = headerIdx + 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 2) continue;

      const codeVal = codeCol >= 0 ? row[codeCol] : row[0];
      if (!codeVal) continue;

      const sku = String(codeVal).trim();
      const productSku = sku;
      const productName = descCol >= 0 ? String(row[descCol] || '').trim() : '';

      // Find customer code column if present
      const custCol = h.findIndex((v: string) => v.includes('custom') || v.includes('client') || v.includes('cust'));
      const customerCode = custCol >= 0 ? String(row[custCol] || '').trim() : '';

      // Aggregate discounts across month columns
      for (let j = 2; j < Math.min(h.length, row.length); j++) {
        const val = typeof row[j] === 'number' ? (row[j] as number) : 0;
        if (val === 0) continue;
        if (h[j].includes('discount')) {
          // Create a promotion record
          const discountCust = customerCode || productName || 'Customer';
          const promoName = `${productSku} discount - ${discountCust}`;
          try {
            await this.prisma.promotion.create({
              data: {
                companyId,
                name: promoName,
                discountPct: Math.abs(val),
                startDate: new Date(),
                isActive: true,
              },
            });
            imported++;
            result.totals.promotions = (result.totals.promotions || 0) + 1;
          } catch (err: any) {
            this.logger.warn(`Discount row skipped for SKU "${productSku}": ${err.message}`);
          }
        }
      }
    }

    result.sheetResults.push({
      sheetName,
      sheetRole: 'data',
      status: imported > 0 ? 'imported' : 'skipped',
      rowsImported: imported,
      message:
        imported > 0
          ? `Created ${imported} promotion entries`
          : 'No discount data found',
    });
    if (imported > 0) result.sheetsImported++;
    else result.sheetsSkipped++;
  }

  /* ─── Actual Lines from Data Sheet ──────────────────────────────────── */

  private async importActualsFromDataSheet(
    workbook: XLSX.WorkBook,
    companyId: bigint,
    userId: bigint,
    result: WorkbookImportResult,
    context: {
      productMap?: Map<number, bigint>;
      materialMap?: Map<number, bigint>;
    },
  ): Promise<void> {
    // Look for the sheet that maps to actuallines
    const sheetName = this.findSheetByModule(workbook, 'actuallines');
    if (!sheetName) return;

    const ws = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
      defval: null,
    });
    result.sheetsProcessed++;

    if (rows.length === 0) {
      result.sheetResults.push({
        sheetName,
        sheetRole: 'data',
        status: 'skipped',
        rowsImported: 0,
        message: 'No data rows',
      });
      result.sheetsSkipped++;
      return;
    }

    const headers = Object.keys(rows[0]);
    this.logger.log(`Actuals sheet headers: ${headers.join(', ')}`);

    // Map headers to fields using aliases
    const fieldMap: Record<string, string> = {};
    for (const h of headers) {
      const hl = h.toLowerCase().trim();
      // Map date-like headers to transactionDate
      if (/^(date|transaction\s*date|actual\s*date|invoice\s*date|posting\s*date|trx_date|trxdate)$/i.test(hl.replace(/[\s_-]+/g, '').trim())) {
        fieldMap[h] = 'transactionDate';
        continue;
      }
      const field =
        normalizeHeaderToField(h, 'actuallines') ||
        normalizeHeaderToField(h, 'accounts') ||
        normalizeHeaderToField(h, 'customers') ||
        normalizeHeaderToField(h, 'materials') ||
        normalizeHeaderToField(h, 'products');
      if (field) fieldMap[h] = field;
    }

    // Try to find or create default account for actuals
    let account = await this.prisma.account.findFirst({
      where: { companyId, code: '4000', isActive: true },
    });
    if (!account) {
      account = await this.prisma.account.create({
        data: {
          companyId,
          code: '4000',
          name: 'Sales Revenue',
          type: 'revenue',
          isActive: true,
        },
      });
    }

    // Try to find actual import or create one
    const fiscalYear = new Date().getFullYear();
    const importType: ImportType = 'sales';
    let actualImport = await this.prisma.actualImport.findFirst({
      where: { companyId, importType, status: 'posted' },
      orderBy: { createdAt: 'desc' },
    });
    if (!actualImport) {
      actualImport = await this.prisma.actualImport.create({
        data: {
          companyId,
          importType,
          periodFrom: new Date(fiscalYear, 0, 1),
          periodTo: new Date(fiscalYear, 11, 31),
          status: 'posted',
          importedBy: userId,
        },
      });
    }

    let imported = 0;
    let failed = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;
      try {
        // Map fields
        const mapped: Record<string, unknown> = {};
        for (const [header, val] of Object.entries(row)) {
          if (val === null || val === undefined || val === '') continue;
          const field = fieldMap[header];
          if (field) {
            if (field === 'code' || field === 'accountCode') {
              mapped.accountCode = val;
            } else if (field === 'customerCode') {
              mapped.customerCode = val;
            } else if (field === 'materialCode') {
              mapped.materialCode = val;
            } else if (field === 'productSku' || field === 'sku') {
              mapped.productSku = val;
            } else {
              mapped[field] = val;
            }
          }
        }

        // Resolve accountId
        let accountId = account.id;
        if (mapped.accountCode) {
          const acc = await this.prisma.account.findFirst({
            where: {
              OR: [
                { code: String(mapped.accountCode), companyId },
                { name: String(mapped.accountCode), companyId },
              ],
            },
          });
          if (acc) accountId = acc.id;
        }

        // Resolve productId
        let productId: bigint | null = null;
        if (mapped.productSku) {
          const prod = await this.prisma.product.findFirst({
            where: {
              OR: [
                { sku: String(mapped.productSku), companyId },
                { name: String(mapped.productSku), companyId },
              ],
            },
          });
          if (prod) productId = prod.id;
        }

        // Find transactionDate from mapped fields (try mapped first, then raw row)
        let trxDateVal = mapped.transactionDate;
        if (!trxDateVal) {
          trxDateVal = row['Transaction Date'] || row['Actual Date'] || row['Invoice Date'] || row['Posting Date'] || row['trx_date'];
        }
        if (!trxDateVal) {
          for (const [header, field] of Object.entries(fieldMap)) {
            if (field === 'transactionDate') {
              trxDateVal = row[header];
              break;
            }
          }
        }
        // Fallback: try periodMonth or importDate from current row
        if (!trxDateVal && row['periodMonth']) {
          trxDateVal = row['periodMonth'];
        }
        if (!trxDateVal && row['importDate']) {
          trxDateVal = row['importDate'];
        }

        // Create actual line with connect pattern
        await this.prisma.actualLine.create({
          data: {
            actualImportId: actualImport.id,
            accountId,
            productId,
            transactionDate: trxDateVal
              ? this.parseExcelDate(trxDateVal)
              : new Date(),
            amount: mapped['amount']
              ? Number(mapped['amount'])
              : Number(row['amount'] || row['Amount'] || 0),
            quantity:
              mapped['quantity'] || row['quantity'] || row['Quantity']
                ? Number(mapped['quantity'] || row['quantity'] || row['Quantity'])
                : 0,
            referenceNo:
              mapped['referenceNo'] || mapped['referenceNo'] || row['referenceNo'] || row['Reference No']
                ? String(mapped['referenceNo'] || row['referenceNo'] || row['Reference No'])
                : null,
          },
        });
        imported++;
        result.totals.actualLines = (result.totals.actualLines || 0) + 1;
      } catch (err: any) {
        const { friendly } = normalizeImportError(err);
        this.logger.error(`Actual Line row ${rowNum}: ${err?.message || err}`);
        errors.push(`Row ${rowNum}: ${friendly}`);
        failed++;
      }
    }

    if (imported === 0 && rows.length > 0) {
      this.logger.warn(`Zero rows imported for Actuals — ${rows.length} rows present, ${failed} failed`);
    }

    result.sheetResults.push({
      sheetName,
      sheetRole: 'data',
      status: imported > 0 ? 'imported' : 'skipped',
      rowsImported: imported,
      message:
        imported > 0
          ? `Imported ${imported} actual lines${failed > 0 ? ` (${failed} rows skipped)` : ''}`
          : 'No actual lines imported',
    });
    if (imported > 0) result.sheetsImported++;
    else result.sheetsSkipped++;
    if (errors.length > 0) result.errors.push(...errors);
  }

  /* ─── Budget Lines from Data Sheet ──────────────────────────────────── */

  private async importBudgetFromDataSheet(
    workbook: XLSX.WorkBook,
    companyId: bigint,
    result: WorkbookImportResult,
    context: {
      productMap?: Map<number, bigint>;
      materialMap?: Map<number, bigint>;
    },
  ): Promise<void> {
    const sheetName = this.findSheetByModule(workbook, 'budgetlines');
    if (!sheetName) return;

    const ws = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
      defval: null,
    });
    result.sheetsProcessed++;

    if (rows.length === 0) {
      result.sheetResults.push({
        sheetName,
        sheetRole: 'data',
        status: 'skipped',
        rowsImported: 0,
        message: 'No data rows',
      });
      result.sheetsSkipped++;
      return;
    }

    // Try to find or create a budget cycle
    let cycle = await this.prisma.budgetCycle.findFirst({
      where: { companyId, fiscalYear: new Date().getFullYear() },
      orderBy: { createdAt: 'desc' },
    });
    if (!cycle) {
      const fy = new Date().getFullYear();
      cycle = await this.prisma.budgetCycle.create({
        data: {
          companyId,
          name: `FY${fy} Budget`,
          fiscalYear: fy,
          status: 'draft',
        },
      });
    }

    // Use a default account
    let account = await this.prisma.account.findFirst({
      where: { companyId, code: '5000', isActive: true },
    });
    if (!account) {
      account = await this.prisma.account.create({
        data: {
          companyId,
          code: '5000',
          name: 'Budget Default',
          type: 'expense',
          isActive: true,
        },
      });
    }

    const headers = Object.keys(rows[0]);
    const dateCols = headers.filter((h) => {
      const parsed = this.parseMonthYearString(h);
      return parsed !== null;
    });

    let imported = 0;
    let failed = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;
      try {
        // Try each date column
        for (const dateCol of dateCols) {
          const amount = Number(row[dateCol] || 0);
          if (amount === 0) continue;

          const parsed = this.parseMonthYearString(dateCol);
          if (!parsed) continue;

          // Resolve account from row if available
          let accountId = account.id;
          const accountVal =
            row['accountCode'] ||
            row['accountcode'] ||
            row['Account Code'] ||
            row['account'] ||
            row['Account'];
          if (accountVal) {
            const acc = await this.prisma.account.findFirst({
              where: {
                OR: [
                  { code: String(accountVal), companyId },
                  { name: String(accountVal), companyId },
                ],
              },
            });
            if (acc) accountId = acc.id;
          }

          await this.prisma.budgetLine.create({
            data: {
              budgetCycleId: cycle.id,
              accountId,
              periodMonth: parsed.month,
              amount,
            },
          });
          imported++;
          result.totals.budgetLines = (result.totals.budgetLines || 0) + 1;
        }
      } catch (err: any) {
        failed++;
      }
    }

    result.sheetResults.push({
      sheetName,
      sheetRole: 'data',
      status: imported > 0 ? 'imported' : 'skipped',
      rowsImported: imported,
      message:
        imported > 0
          ? `Imported ${imported} budget lines${failed > 0 ? ` (${failed} rows skipped)` : ''}`
          : 'No budget data',
    });
    if (imported > 0) result.sheetsImported++;
    else result.sheetsSkipped++;
  }

  /* ─── Extract Data Sheet Master Data ─────────────────────────────────── */

  private extractDataSheetMasterData(workbook: XLSX.WorkBook) {
    const units = new Set<string>();
    const organizations = new Set<string>();
    const categories = new Set<string>();
    const costCenters = new Set<string>();
    const products = new Map<
      number,
      { desc: string; uom: string; major: string; minor: string }
    >();
    const materials = new Map<
      number,
      { desc: string; uom: string; type: string }
    >();

    const dataSheet = workbook.Sheets['Data'];
    if (!dataSheet)
      return {
        units,
        organizations,
        categories,
        costCenters,
        products,
        materials,
      };

    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(dataSheet, {
      defval: null,
    });
    if (rows.length < 3)
      return {
        units,
        organizations,
        categories,
        costCenters,
        products,
        materials,
      };

    const headerRow = rows[2];
    const headers: string[] = [];
    for (const key of Object.keys(headerRow)) {
      const val = headerRow[key];
      headers.push(val ? String(val).trim() : key);
    }

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
      const mainCat =
        colIdx.mainCategory >= 0 ? values[colIdx.mainCategory] : null;
      const minor = colIdx.subCategory >= 0 ? values[colIdx.subCategory] : null;

      if (code && typeof code === 'number' && code > 10000) {
        const codeNum = Math.floor(code);
        const descStr = desc ? String(desc).trim() : '';
        const uomStr = uom ? String(uom).trim() : 'PCS';
        const majorStr = mainCat ? String(mainCat).trim() : '';
        const minorStr = minor ? String(minor).trim() : '';
        const typeStr = type ? String(type).trim() : '';

        if (!products.has(codeNum)) {
          products.set(codeNum, {
            desc: descStr,
            uom: uomStr,
            major: majorStr,
            minor: minorStr,
          });
        }

        if (org) organizations.add(String(org).trim());
        if (uom) units.add(uomStr);
        if (mainCat) categories.add(String(mainCat).trim());
        if (cc && String(cc).trim()) costCenters.add(String(cc).trim());
      }
    }

    return {
      units,
      organizations,
      categories,
      costCenters,
      products,
      materials,
    };
  }

  private buildColumnIndex(headers: string[]): Record<string, number> {
    const idx: Record<string, number> = {
      year: -1,
      month: -1,
      month2: -1,
      org: -1,
      type: -1,
      code: -1,
      description: -1,
      uom: -1,
      cc: -1,
      mainCategory: -1,
      category: -1,
      subCategory: -1,
      weightPerCtn: -1,
      rm: -1,
      pkg: -1,
      totalDm: -1,
      dlc: -1,
      laborRate: -1,
      totalDlc: -1,
      voh: -1,
      foh: -1,
      totalCostPerCtn: -1,
      priceList: -1,
      forecasteQty: -1,
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
      else if (h === 'forcaste qty' || h === 'forecaste qty')
        idx.forecasteQty = i;
    }

    return idx;
  }

  /* ─── Forecast QTY Import ────────────────────────────────────────────── */

  private async importForcasteQty(
    workbook: XLSX.WorkBook,
    companyId: bigint,
    userId: bigint,
    productMap: Map<number, bigint>,
    result: WorkbookImportResult,
  ): Promise<void> {
    const sheetName = workbook.SheetNames.find((s) => {
      const sl = s.toLowerCase().replace(/[_\s-]/g, '');
      return sl.includes('forcasteqty') || sl.includes('forecasteqty');
    });
    if (!sheetName) {
      result.warnings.push('Forecast QTY sheet not found');
      return;
    }

    const ws = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
      header: 1,
      defval: null,
    }) as unknown as unknown[][];
    result.sheetsProcessed++;

    if (rows.length < 2) {
      result.sheetResults.push({
        sheetName,
        sheetRole: 'data',
        status: 'skipped',
        rowsImported: 0,
        message: 'No data',
      });
      return;
    }

    const headerRow = rows[1];
    const monthHeaders: Array<{ col: number; month: number; year: number }> =
      [];
    for (let i = 4; i < headerRow.length; i++) {
      const val = headerRow[i];
      if (!val) continue;
      const parsed = this.parseMonthYearString(String(val));
      if (parsed)
        monthHeaders.push({ col: i, month: parsed.month, year: parsed.year });
    }

    if (monthHeaders.length === 0) {
      result.sheetResults.push({
        sheetName,
        sheetRole: 'data',
        status: 'skipped',
        rowsImported: 0,
        message: 'No month columns found',
      });
      return;
    }

    const fiscalYear = monthHeaders[0].year;
    const cycleName = `FY${String(fiscalYear).slice(2)} Planning`;
    const cycle =
      (await this.prisma.forecastCycle.findFirst({
        where: { name: cycleName, companyId },
      })) ??
      (await this.prisma.forecastCycle.create({
        data: {
          companyId,
          name: cycleName,
          fiscalYear,
          basePeriod: new Date(fiscalYear, 0, 1),
          status: 'draft',
          createdBy: userId,
        },
      }));

    const account = await this.getOrCreateDefaultAccount(
      this.prisma,
      companyId,
      '5000',
      'Cost of Goods Sold',
      'cogs',
    );

    let imported = 0;
    for (let i = 2; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      const code =
        typeof row[2] === 'number'
          ? row[2]
          : typeof row[2] === 'string'
            ? Number(row[2])
            : null;
      if (!code || isNaN(code)) continue;

      const productId = productMap.get(code) ?? null;

      for (const mh of monthHeaders) {
        const qty = row[mh.col];
        const quantity =
          typeof qty === 'number'
            ? qty
            : typeof qty === 'string'
              ? Number(String(qty).replace(/,/g, ''))
              : 0;
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
        result.totals.forecastLines = (result.totals.forecastLines || 0) + 1;
      }
    }

    result.sheetResults.push({
      sheetName,
      sheetRole: 'data',
      status: imported > 0 ? 'imported' : 'skipped',
      rowsImported: imported,
      message: `Imported ${imported} forecast lines`,
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
    if (!ws) {
      result.warnings.push('Drill Down sheet not found');
      return;
    }

    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
      header: 1,
      defval: null,
    }) as unknown as unknown[][];
    result.sheetsProcessed++;

    if (rows.length < 4) {
      result.sheetResults.push({
        sheetName: 'Drill Down',
        sheetRole: 'data',
        status: 'skipped',
        rowsImported: 0,
        message: 'No data rows',
      });
      return;
    }

    const headerRow = rows[2];
    const h = headerRow.map((v: unknown) =>
      v ? String(v).trim().toLowerCase() : '',
    );

    const orgCol = h.findIndex((v: string) => v === 'org.');
    const prdNoCol = h.findIndex((v: string) => v === 'prd no');
    const prdDescCol = h.findIndex((v: string) => v === 'prd desc');
    const majorCol = h.findIndex((v: string) => v === 'major');
    const ingNoCol = h.findIndex((v: string) => v === 'ing no');
    const ingDescCol = h.findIndex((v: string) => v === 'ing desc');
    const planQtyCol = h.findIndex((v: string) => v === 'plan qty');
    const uomCol = h.findIndex((v: string) => v === 'ing uom');

    // Instead of grouping, process each row individually
    let bomRecipesCreated = 0;
    let bomLinesImported = 0;
    let failedRows = 0;
    const errors: string[] = [];

    for (let i = 3; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1; // Excel row number

      if (!row || row.length < 8) {
        failedRows++;
        errors.push(`Row ${rowNum}: Insufficient columns`);
        continue;
      }

      try {
        const prdNo = prdNoCol >= 0 ? Number(row[prdNoCol]) : 0;
        if (!prdNo || isNaN(prdNo)) {
          failedRows++;
          errors.push(`Row ${rowNum}: Invalid product number`);
          continue;
        }

        const ingNo = ingNoCol >= 0 ? Number(row[ingNoCol]) : 0;
        if (!ingNo || isNaN(ingNo)) {
          failedRows++;
          errors.push(`Row ${rowNum}: Invalid ingredient number`);
          continue;
        }

        let productId = productMap.get(prdNo);
        if (!productId) {
          productId = this.cache.products.get(String(prdNo).toLowerCase().trim()) || undefined;
        }
        if (!productId) {
          const existingProduct = await this.prisma.product.findFirst({
            where: { sku: String(prdNo), companyId }
          });
          if (existingProduct) {
            productId = existingProduct.id;
            productMap.set(prdNo, existingProduct.id);
            this.cache.products.set(String(prdNo).toLowerCase().trim(), existingProduct.id);
          }
        }
        if (!productId) {
          failedRows++;
          errors.push(`Row ${rowNum}: Product ${prdNo} not found in database`);
          continue;
        }

        // Get or create material
        const matCode = String(ingNo);
        let matId = materialMap.get(ingNo);
        if (!matId) {
          const existing = await this.prisma.material.findFirst({
            where: { code: matCode, companyId },
          });
          if (existing) {
            matId = existing.id;
            materialMap.set(ingNo, existing.id);
          } else {
            const ingDesc =
              ingDescCol >= 0 ? String(row[ingDescCol] || '').trim() : '';
            const uom =
              uomCol >= 0 ? String(row[uomCol] || 'KGS').trim() : 'KGS';
            const unit = await this.prisma.unit.findFirst({
              where: { symbol: uom, companyId },
            });
            const created = await this.prisma.material.create({
              data: {
                companyId,
                code: matCode,
                name: ingDesc || `Material ${matCode}`,
                materialType: 'raw_material',
                unitId: unit?.id ?? null,
                isActive: true,
              },
            });
            matId = created.id;
            materialMap.set(ingNo, created.id);
            result.autoCreated.push({
              type: 'Material',
              code: matCode,
              name: ingDesc || `Material ${matCode}`,
              created: true,
            });
            result.totals.materials = (result.totals.materials || 0) + 1;
          }
        }

        // Find existing BOM recipe for this product or create one
        let recipe = await this.prisma.bomRecipe.findFirst({
          where: { companyId, productId },
        });
        if (!recipe) {
          recipe = await this.prisma.bomRecipe.create({
            data: {
              companyId,
              productId,
              version: 'v1',
              outputQty: 1,
              wastagePct: 0,
              isActive: true,
            },
          });
          bomRecipesCreated++;
          result.totals.bomRecipes = (result.totals.bomRecipes || 0) + 1;
        }

        // Create BOM Line
        const planQty = planQtyCol >= 0 ? Number(row[planQtyCol] || 0) : 0;
        await this.prisma.bomLine.create({
          data: {
            bomId: recipe.id,
            materialId: matId,
            quantity: planQty,
            qtyPerOutput: planQty,
            wastagePct: 0,
          },
        });
        bomLinesImported++;
        result.totals.bomLines = (result.totals.bomLines || 0) + 1;
      } catch (err: any) {
        failedRows++;
        errors.push(`Row ${rowNum}: ${err.message}`);
      }
    }

    const totalImported = bomRecipesCreated + bomLinesImported;
    result.sheetResults.push({
      sheetName: 'Drill Down',
      sheetRole: 'data',
      status: totalImported > 0 ? 'imported' : 'skipped',
      rowsImported: totalImported,
      message: `Imported ${bomRecipesCreated} BOM recipes with ${bomLinesImported} material lines${failedRows > 0 ? ` (${failedRows} rows skipped)` : ''}`,
    });
    if (totalImported > 0) result.sheetsImported++;
    else result.sheetsSkipped++;
    if (errors.length > 0) result.errors.push(...errors);
  }

  /* ─── HRV Material Prices ────────────────────────────────────────────── */

  private async importHrvMaterialPrices(
    workbook: XLSX.WorkBook,
    companyId: bigint,
    materialMap: Map<number, bigint>,
    result: WorkbookImportResult,
  ): Promise<void> {
    const ws = workbook.Sheets['HRV M.Price'];
    if (!ws) {
      result.warnings.push('HRV M.Price sheet not found');
      return;
    }

    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
      header: 1,
      defval: null,
    }) as unknown as unknown[][];
    result.sheetsProcessed++;

    if (rows.length < 3) {
      result.sheetResults.push({
        sheetName: 'HRV M.Price',
        sheetRole: 'data',
        status: 'skipped',
        rowsImported: 0,
        message: 'Insufficient data',
      });
      return;
    }

    const headerRow = rows[1];
    const monthCols: Array<{ col: number; month: number; year: number }> = [];

    for (let i = 4; i < headerRow.length; i++) {
      const val = headerRow[i];
      if (!val) continue;
      const parsed = this.parseMonthYearString(String(val));
      if (parsed)
        monthCols.push({ col: i, month: parsed.month, year: parsed.year });
    }

    let imported = 0;
    for (let i = 2; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 3) continue;

      const code = row[0] ? String(row[0]).trim() : '';
      const name = row[1] ? String(row[1]).trim() : '';
      if (!code || !name) continue;

      const codeNum = Number(code);
      let matId = materialMap.get(codeNum);
      if (!matId) {
        const existing = await this.prisma.material.findFirst({
          where: { code, companyId },
        });
        if (existing) {
          matId = existing.id;
          materialMap.set(codeNum, existing.id);
        } else {
          const created = await this.prisma.material.create({
            data: {
              companyId,
              code,
              name,
              materialType: 'raw_material',
              isActive: true,
            },
          });
          matId = created.id;
          materialMap.set(codeNum, created.id);
          result.autoCreated.push({
            type: 'Material',
            code,
            name,
            created: true,
          });
          result.totals.materials = (result.totals.materials || 0) + 1;
        }
      }

      for (const mc of monthCols) {
        const price =
          typeof row[mc.col] === 'number' ? (row[mc.col] as number) : null;
        if (!price || price <= 0) continue;

        await this.prisma.rawMaterialPrice.create({
          data: {
            companyId,
            materialId: matId,
            price,
            priceDate: new Date(mc.year, mc.month - 1, 1),
          },
        });
        imported++;
        result.totals.materialPrices = (result.totals.materialPrices || 0) + 1;
      }
    }

    result.sheetResults.push({
      sheetName: 'HRV M.Price',
      sheetRole: 'data',
      status: imported > 0 ? 'imported' : 'skipped',
      rowsImported: imported,
      message: `Imported ${imported} material price entries`,
    });
    if (imported > 0) result.sheetsImported++;
    else result.sheetsSkipped++;
  }

  /* ═══════════════════════════════════════════════════════════════════════
   * UTILITY HELPERS
   * ═══════════════════════════════════════════════════════════════════════ */

  private async getOrCreateDefaultAccount(
    tx: any,
    companyId: bigint,
    code: string,
    name: string,
    type: string,
  ) {
    const existing = await tx.account.findFirst({
      where: {
        OR: [
          { code, companyId },
          { name, companyId },
        ],
        isActive: true,
      },
    });
    if (existing) return existing;
    return tx.account.create({
      data: {
        companyId,
        code,
        name,
        type: type as AccountType,
        isActive: true,
      },
    });
  }

  private parseExcelDate(value: unknown): Date {
    if (value instanceof Date) return value;
    if (typeof value === 'number') {
      const excelEpoch = new Date(1899, 11, 30);
      const msPerDay = 86400000;
      return new Date(excelEpoch.getTime() + value * msPerDay);
    }
    if (typeof value === 'string') {
      const d = new Date(value);
      if (!isNaN(d.getTime())) return d;
      const match = value.match(/(\w+)-(\d{2,4})/);
      if (match) {
        const month = MONTH_MAP[match[1].toLowerCase()] ?? 1;
        const year =
          match[2].length === 2 ? 2000 + Number(match[2]) : Number(match[2]);
        return new Date(year, month - 1, 1);
      }
    }
    return new Date();
  }

  private parseMonthYearString(
    str: string,
  ): { month: number; year: number } | null {
    const s = str.toLowerCase().trim();
    const match = s.match(/(\w+)-(\d{2,4})/);
    if (match) {
      const month = MONTH_MAP[match[1].toLowerCase()];
      if (!month) return null;
      const year =
        match[2].length === 2 ? 2000 + Number(match[2]) : Number(match[2]);
      return { month, year };
    }
    return null;
  }
}
