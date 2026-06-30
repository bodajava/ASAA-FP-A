/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import * as XLSX from 'xlsx';
import { parse as csvParse } from 'csv-parse/sync';
import { SimpleCache } from '../common/utils/cache.util';
import { FRIENDLY_HEADER_MAP } from '../excel-integration/template-generator.service';
import {
  detectFileType,
  detectFileTypeFromBuffer,
  FileTypeMismatchError,
} from '../common/utils/file-type-detection.util';

type RowData = any;

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

const SUPPORTED_EXTENSIONS = /\.(csv|xlsx|xls)$/i;
const UNSUPPORTED_EXTENSIONS = /\.(numbers)$/i;

@Injectable()
export class ImportsService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeModuleName(moduleName: string): string {
    const mod = moduleName.toLowerCase().replace(/[-_]/g, '');
    if (mod === 'rawmaterialprices') return 'materialprices';
    return mod;
  }

  private parseDateValue(value: unknown): Date | null {
    if (value == null || value === '') return null;

    // Check for Excel serial date number (e.g. 46022 = 2025-12-31)
    const num = Number(value);
    if (!isNaN(num) && Number.isInteger(num) && num > 40000 && num < 200000) {
      // Excel serial date: 1 = 1900-01-01
      // Feb 29, 1900 bug: serial 60 doesn't exist, so adjust for serial >= 61
      const adjusted = num >= 61 ? num - 2 : num - 1;
      const date = new Date(Date.UTC(1899, 11, 30));
      date.setUTCDate(date.getUTCDate() + adjusted);
      if (!isNaN(date.getTime())) return date;
    }

    // Try standard date string parsing
    const d = new Date(String(value));
    if (!isNaN(d.getTime())) return d;

    return null;
  }

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

    // Apply friendly header → internal field mapping for transaction modules
    if (module) {
      const mod = this.normalizeModuleName(module);
      const mapping = FRIENDLY_HEADER_MAP[mod];
      if (mapping) {
        for (const [friendly, internal] of Object.entries(mapping)) {
          if (
            normalized[friendly] !== undefined &&
            normalized[internal] === undefined
          ) {
            normalized[internal] = normalized[friendly];
            delete normalized[friendly];
          }
        }
      }
    }

    return normalized;
  }

  /* ─── Name → Code Resolution ────────────────────────────────────────── */

  private async resolveNameToCode(
    value: string,
    model:
      | 'account'
      | 'site'
      | 'costCenter'
      | 'product'
      | 'material'
      | 'customer',
    companyId: bigint,
  ): Promise<{ resolved: string; isAmbiguous?: boolean; matches?: string[] }> {
    const trimmed = String(value).trim();
    if (!trimmed) return { resolved: '' };

    switch (model) {
      case 'account': {
        // 1. Exact code match
        const byCode = await this.prisma.account.findFirst({
          where: { code: trimmed, companyId, isActive: true },
          select: { code: true },
        });
        if (byCode) return { resolved: byCode.code };

        // 2. Exact name match
        const byName = await this.prisma.account.findFirst({
          where: { name: trimmed, companyId, isActive: true },
          select: { code: true },
        });
        if (byName) return { resolved: byName.code };

        // 3. Case-insensitive match
        const all = await this.prisma.account.findMany({
          where: { companyId, isActive: true },
          select: { code: true, name: true },
        });
        const lower = trimmed.toLowerCase();
        const matches = all.filter(
          (a) =>
            a.code.toLowerCase() === lower || a.name.toLowerCase() === lower,
        );
        if (matches.length === 1) return { resolved: matches[0].code };
        if (matches.length > 1) {
          return {
            resolved: trimmed,
            isAmbiguous: true,
            matches: matches.map((m) => `${m.code} (${m.name})`),
          };
        }
        return { resolved: trimmed };
      }
      case 'site': {
        const byName = await this.prisma.site.findFirst({
          where: { name: trimmed, companyId },
          select: { name: true },
        });
        if (byName) return { resolved: byName.name };

        const all = await this.prisma.site.findMany({
          where: { companyId },
          select: { name: true },
        });
        const lower = trimmed.toLowerCase();
        const matches = all.filter((s) => s.name.toLowerCase() === lower);
        if (matches.length === 1) return { resolved: matches[0].name };
        if (matches.length > 1) {
          return {
            resolved: trimmed,
            isAmbiguous: true,
            matches: matches.map((m) => m.name),
          };
        }
        return { resolved: trimmed };
      }
      case 'costCenter': {
        // 1. Try code match (only if code is not empty)
        if (trimmed) {
          const byCode = await this.prisma.costCenter.findFirst({
            where: { code: trimmed, companyId },
            select: { code: true, name: true },
          });
          if (byCode) return { resolved: byCode.code ?? byCode.name };
        }

        // 2. Exact name match
        const byName = await this.prisma.costCenter.findFirst({
          where: { name: trimmed, companyId },
          select: { code: true, name: true },
        });
        if (byName) return { resolved: byName.code ?? byName.name };

        // 3. Case-insensitive match
        const all = await this.prisma.costCenter.findMany({
          where: { companyId },
          select: { code: true, name: true },
        });
        const lower = trimmed.toLowerCase();
        const matches = all.filter(
          (cc) =>
            cc.code?.toLowerCase() === lower || cc.name.toLowerCase() === lower,
        );
        if (matches.length === 1)
          return { resolved: matches[0].code ?? matches[0].name };
        if (matches.length > 1) {
          return {
            resolved: trimmed,
            isAmbiguous: true,
            matches: matches.map((m) => `${m.code ?? m.name} (${m.name})`),
          };
        }
        return { resolved: trimmed };
      }
      case 'product': {
        const bySku = await this.prisma.product.findFirst({
          where: { sku: trimmed, companyId, isActive: true },
          select: { sku: true },
        });
        if (bySku) return { resolved: bySku.sku };

        const byName = await this.prisma.product.findFirst({
          where: { name: trimmed, companyId, isActive: true },
          select: { sku: true },
        });
        if (byName) return { resolved: byName.sku };

        const all = await this.prisma.product.findMany({
          where: { companyId, isActive: true },
          select: { sku: true, name: true },
        });
        const lower = trimmed.toLowerCase();
        const matches = all.filter(
          (p) =>
            p.sku.toLowerCase() === lower || p.name.toLowerCase() === lower,
        );
        if (matches.length === 1) return { resolved: matches[0].sku };
        if (matches.length > 1) {
          return {
            resolved: trimmed,
            isAmbiguous: true,
            matches: matches.map((m) => `${m.sku} (${m.name})`),
          };
        }
        return { resolved: trimmed };
      }
      case 'material': {
        const byCode = await this.prisma.material.findFirst({
          where: { code: trimmed, companyId, isActive: true },
          select: { code: true },
        });
        if (byCode) return { resolved: byCode.code };

        const byName = await this.prisma.material.findFirst({
          where: { name: trimmed, companyId, isActive: true },
          select: { code: true },
        });
        if (byName) return { resolved: byName.code };

        const all = await this.prisma.material.findMany({
          where: { companyId, isActive: true },
          select: { code: true, name: true },
        });
        const lower = trimmed.toLowerCase();
        const matches = all.filter(
          (m) =>
            m.code.toLowerCase() === lower || m.name.toLowerCase() === lower,
        );
        if (matches.length === 1) return { resolved: matches[0].code };
        if (matches.length > 1) {
          return {
            resolved: trimmed,
            isAmbiguous: true,
            matches: matches.map((m) => `${m.code} (${m.name})`),
          };
        }
        return { resolved: trimmed };
      }
      case 'customer': {
        const byCode = await this.prisma.customer.findFirst({
          where: { code: trimmed, companyId, isActive: true },
          select: { code: true },
        });
        if (byCode) return { resolved: byCode.code };

        const byName = await this.prisma.customer.findFirst({
          where: { name: trimmed, companyId, isActive: true },
          select: { code: true },
        });
        if (byName) return { resolved: byName.code };

        const all = await this.prisma.customer.findMany({
          where: { companyId, isActive: true },
          select: { code: true, name: true },
        });
        const lower = trimmed.toLowerCase();
        const matches = all.filter(
          (c) =>
            c.code.toLowerCase() === lower || c.name.toLowerCase() === lower,
        );
        if (matches.length === 1) return { resolved: matches[0].code };
        if (matches.length > 1) {
          return {
            resolved: trimmed,
            isAmbiguous: true,
            matches: matches.map((m) => `${m.code} (${m.name})`),
          };
        }
        return { resolved: trimmed };
      }
    }
  }

  private async resolveTransactionReferences(
    row: RowData,
    mod: string,
    companyId: bigint,
    errors: string[],
    rowIndex: number,
  ): Promise<RowData> {
    const resolved = { ...row };

    const resolveField = async (
      internalField: string,
      model:
        | 'account'
        | 'site'
        | 'costCenter'
        | 'product'
        | 'material'
        | 'customer',
      columnLabel: string,
    ) => {
      if (!resolved[internalField]) return;
      const result = await this.resolveNameToCode(
        String(resolved[internalField]),
        model,
        companyId,
      );
      if (result.isAmbiguous) {
        errors.push(
          `Row ${rowIndex}: ${columnLabel} "${resolved[internalField]}" matches multiple records: ${result.matches?.join(', ')}. Please use the exact code.`,
        );
      } else if (result.resolved) {
        resolved[internalField] = result.resolved;
      }
    };

    if (
      mod === 'budgetlines' ||
      mod === 'forecastlines' ||
      mod === 'actuallines'
    ) {
      await resolveField('accountcode', 'account', 'Account');
      await resolveField('sitecode', 'site', 'Site');
      await resolveField('costcentercode', 'costCenter', 'Cost Center');
      await resolveField('productsku', 'product', 'Product');
      if (resolved['materialcode']) {
        await resolveField('materialcode', 'material', 'Material');
      }
      if (resolved['customercode']) {
        await resolveField('customercode', 'customer', 'Customer');
      }
    }

    return resolved;
  }

  /* ─── Month Name Parsing ────────────────────────────────────────────── */

  private parseMonthValue(value: string | number): number | null {
    const num = Number(value);
    if (!isNaN(num) && num >= 1 && num <= 12) return num;

    const str = String(value).trim().toLowerCase();
    const monthMap: Record<string, number> = {
      january: 1,
      february: 2,
      march: 3,
      april: 4,
      may: 5,
      june: 6,
      july: 7,
      august: 8,
      september: 9,
      october: 10,
      november: 11,
      december: 12,
      jan: 1,
      feb: 2,
      mar: 3,
      apr: 4,
      jun: 6,
      jul: 7,
      aug: 8,
      sep: 9,
      oct: 10,
      nov: 11,
      dec: 12,
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
    return monthMap[str] ?? null;
  }

  getSampleCSV(module: string): string {
    const mod = this.normalizeModuleName(module);
    const h = (header: string, rows: string[]) =>
      [header, ...rows].join('\n');
    switch (mod) {
      case 'companies':
        return h(
          'name,legalName,industryType,currencyCode,taxNumber',
          [
            'Acme Corp,Acme Corporation LLC,Manufacturing,USD,TAX-12345',
            'Global Trade Inc,Global Trade Incorporated,Trading,EUR,TAX-67890',
            'TechStart Ltd,TechStart Limited,Technology,USD,TAX-11111',
          ],
        );
      case 'sites':
        return h(
          'name,type,region,address',
          [
            'Main Plant,Manufacturing,Central,123 Factory Road',
            'North Warehouse,Warehouse,North,456 Storage Ave',
            'South Distribution Center,Distribution,South,789 Logistics Blvd',
            'HQ Office,Office,Central,100 Corporate Plaza',
          ],
        );
      case 'units':
        return h(
          'name,symbol,type',
          [
            'Kilogram,kg,weight',
            'Liter,L,volume',
            'Piece,pcs,quantity',
            'Meter,m,length',
          ],
        );
      case 'accounts':
        return h(
          'code,name,type,parentCode,isActive',
          [
            '4000,Revenue,Sales Revenue,,true',
            '4001,Product Sales,Sales Revenue,4000,true',
            '5000,Cost of Goods Sold,Cost of Goods Sold,,true',
            '5001,Raw Material Cost,Cost of Goods Sold,5000,true',
            '6000,Operating Expenses,Operating Expenses,,true',
            '6001,Salaries,Operating Expenses,6000,true',
          ],
        );
      case 'costcenters':
      case 'cost-centers':
        return h(
          'code,name,type,siteCode,parentCode',
          [
            'C100,Production Dept,Production,Main Plant,',
            'C110,Packaging Line,Packaging,Main Plant,C100',
            'C200,Logistics,Logistics,North Warehouse,',
            'C300,Administration,Admin,HQ Office,',
          ],
        );
      case 'productcategories':
      case 'product-categories':
        return h(
          'name,parentCategoryName',
          [
            'Beverages,',
            'Carbonated Drinks,Beverages',
            'Juices,Beverages',
            'Snacks,',
          ],
        );
      case 'suppliers':
        return h(
          'name,phone,email',
          [
            'RawMaterials Co,+201001234567,info@rawmats.com',
            'PackagingPlus,+201009876543,sales@packplus.com',
            'LogisticsPro,+201005551234,ops@logipro.com',
          ],
        );
      case 'customers':
        return h(
          'code,name,customerType,region,phone,email,creditLimit,paymentTerms',
          [
            'CUST001,RetailMax Inc,Retailer,Central,+201011111111,orders@retailmax.com,500000,Net30',
            'CUST002,WholesaleDirect,Wholesaler,North,+201022222222,info@wholesaledirect.com,1000000,Net45',
            'CUST003,DistributorPlus,Distributor,South,+201033333333,purchasing@distplus.com,750000,Net30',
            'CUST004,ExportPartner,Exporter,International,+201044444444,export@partner.com,2000000,Net60',
          ],
        );
      case 'products':
        return h(
          'sku,name,productType,salePrice,standardCost,categoryName,unitSymbol',
          [
            'SKU001,Cola Classic,Carbonated Drink,1.50,0.75,Carbonated Drinks,pcs',
            'SKU002,Orange Juice,Natural Juice,2.00,1.20,Juices,pcs',
            'SKU003,Apple Juice,Natural Juice,2.25,1.30,Juices,pcs',
            'SKU004,Potato Chips 50g,Packaged Snack,0.80,0.45,Snacks,pcs',
            'SKU005,Cola Zero,Carbonated Drink,1.50,0.80,Carbonated Drinks,pcs',
          ],
        );
      case 'materials':
        return h(
          'code,name,purchasePrice,safetyStockQty,supplierName,unitSymbol',
          [
            'RM001,Sugar,1.20,10000,RawMaterials Co,kg',
            'RM002,Concentrate Syrup,5.50,5000,RawMaterials Co,kg',
            'RM003,Plastic Bottle 500ml,0.15,50000,PackagingPlus,pcs',
            'RM004,Aluminum Can 330ml,0.25,30000,PackagingPlus,pcs',
            'RM005,Cardboard Box,0.35,20000,PackagingPlus,pcs',
          ],
        );
      case 'bomrecipes':
      case 'bom-recipes':
        return h(
          'productSku,version,outputQty,wastagePct,laborCost,overheadCost,materialCode,qtyPerOutput,bomLineWastagePct',
          [
            'SKU001,1,1,2,0.10,0.05,RM001,0.15,1',
            'SKU001,1,1,2,0.10,0.05,RM002,0.02,1',
            'SKU001,1,1,2,0.10,0.05,RM004,1,1',
            'SKU002,1,1,3,0.12,0.06,RM001,0.10,1',
            'SKU002,1,1,3,0.12,0.06,RM002,0.03,1',
            'SKU002,1,1,3,0.12,0.06,RM003,1,1',
          ],
        );
      case 'budgetlines':
      case 'budget-lines':
        return h(
          'budgetCycleName,fiscalYear,accountCode,siteName,costCenterCode,productSku,customerCode,periodMonth,quantity,unitPrice,amount,notes',
          [
            'Budget 2025,2025,4001,Main Plant,C100,SKU001,CUST001,2025-01,10000,1.50,15000,Sales revenue',
            'Budget 2025,2025,4001,Main Plant,C100,SKU001,CUST001,2025-02,12000,1.50,18000,',
            'Budget 2025,2025,5001,Main Plant,C100,SKU001,CUST001,2025-01,10000,0.75,7500,COGS',
            'Budget 2025,2025,4001,North Warehouse,C200,SKU002,CUST002,2025-01,8000,2.00,16000,',
            'Budget 2025,2025,5001,North Warehouse,C200,SKU002,CUST002,2025-01,8000,1.20,9600,',
          ],
        );
      case 'forecastlines':
      case 'forecast-lines':
        return h(
          'forecastCycleName,fiscalYear,accountCode,siteName,costCenterCode,productSku,customerCode,periodMonth,quantity,unitPrice,amount,notes',
          [
            'Forecast H1 2025,2025,4001,Main Plant,C100,SKU001,CUST001,2025-01,11000,1.50,16500,Revised up',
            'Forecast H1 2025,2025,4001,Main Plant,C100,SKU001,CUST001,2025-02,13000,1.50,19500,',
            'Forecast H1 2025,2025,5001,Main Plant,C100,SKU001,CUST001,2025-01,11000,0.75,8250,',
            'Forecast H1 2025,2025,4001,North Warehouse,C200,SKU002,CUST002,2025-01,9000,2.00,18000,Growth expected',
            'Forecast H1 2025,2025,5001,North Warehouse,C200,SKU002,CUST002,2025-01,9000,1.20,10800,',
          ],
        );
      case 'actuallines':
      case 'actual-lines':
        return h(
          'accountCode,siteCode,costCenterCode,productSku,materialCode,customerCode,transactionDate,quantity,unitPrice,amount,referenceNo',
          [
            '4001,Main Plant,C100,SKU001,,CUST001,2025-01-15,5000,1.50,7500,INV-001',
            '4001,Main Plant,C100,SKU001,,CUST001,2025-01-31,4800,1.50,7200,INV-002',
            '5001,Main Plant,C100,SKU001,,CUST001,2025-01-15,5000,0.75,3750,PO-001',
            '5001,Main Plant,C100,SKU001,,CUST001,2025-01-31,4800,0.75,3600,PO-002',
            '4001,North Warehouse,C200,SKU002,,CUST002,2025-01-20,3000,2.00,6000,INV-003',
          ],
        );
      case 'materialprices':
      case 'material-prices':
        return h(
          'materialCode,price,effectiveDate,notes',
          [
            'RM001,1.25,2025-01-01,Annual price update',
            'RM002,5.75,2025-01-01,',
            'RM003,0.16,2025-02-01,New supplier pricing',
            'RM004,0.26,2025-01-15,Per contract',
          ],
        );
      case 'packagingprices':
      case 'packaging-prices':
        return h(
          'materialCode,price,effectiveDate,notes',
          [
            'RM003,0.16,2025-01-01,',
            'RM004,0.26,2025-01-01,',
            'RM005,0.38,2025-02-01,New box price',
          ],
        );
      case 'productionallocations':
      case 'production-allocations':
        return h(
          'siteCode,period,allocatedAmount,allocationBasis,notes',
          [
            'Main Plant,2025-01,50000,machine_hours,',
            'Main Plant,2025-02,52000,machine_hours,',
            'North Warehouse,2025-01,30000,floor_area,',
          ],
        );
      case 'yieldwaste':
      case 'yield-waste':
        return h(
          'productSku,yieldPct,wastagePct,notes',
          [
            'SKU001,98,2,Standard yield',
            'SKU002,97,3,',
            'SKU003,97,3,',
            'SKU004,99,1,',
          ],
        );
      default:
        throw new BadRequestException(`Unknown module template: ${module}`);
    }
  }

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

  async preview(
    module: string,
    fileContent: string,
    fileName: string,
    companyId: bigint,
    tenantId: bigint,
  ): Promise<PreviewResponse> {
    // Validate file extension
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

      // Detect actual file type from magic bytes
      const typeResult = detectFileType(buffer, fileName);
      detectedFileType = typeResult.detectedType;

      // Block mismatched file types
      if (typeResult.mismatch) {
        throw new FileTypeMismatchError(
          lowerName.split('.').pop() || 'unknown',
          typeResult.detectedType,
        );
      }

      if (detectedFileType === 'csv') {
        // Parse as CSV
        rawRows = this.parseCsvSafe(buffer);
      } else {
        // Parse as Excel (xlsx or xls)
        rawRows = this.parseExcelSafe(buffer, detectedFileType);
      }
    } catch (err: unknown) {
      if (err instanceof BadRequestException) throw err;
      if (err instanceof FileTypeMismatchError) {
        throw new BadRequestException(err.message);
      }
      // Wrap all parser errors with friendly messages
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

    // Detect header-only (empty data)
    if (rawRows.length === 0) {
      throw new BadRequestException(
        'The uploaded template contains no data. Please add at least one row before importing.',
      );
    }

    const results: RowPreviewResult[] = [];
    const allWarnings: string[] = [];
    const allErrors: string[] = [];

    const mod = this.normalizeModuleName(module);
    for (let i = 0; i < rawRows.length; i++) {
      const rawRow = rawRows[i];
      const normalized = this.normalizeKeys(rawRow, mod);
      const errors: string[] = [];

      // Resolve friendly names to codes for transaction modules
      const resolved = await this.resolveTransactionReferences(
        normalized,
        mod,
        companyId,
        errors,
        i + 1,
      );

      // Validate references and columns according to module
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

  /**
   * Parse CSV with friendly error wrapping.
   */
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

  /**
   * Parse Excel (XLSX/XLS) with friendly error wrapping.
   */
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

  /**
   * Parse all sheets from an Excel workbook for preview purposes.
   * Returns rows from the first sheet (primary import sheet).
   */
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

  private async validateRow(
    module: string,
    row: RowData,
    companyId: bigint,
    tenantId: bigint,
    errors: string[],
  ): Promise<void> {
    const mod = this.normalizeModuleName(module);

    switch (mod) {
      case 'companies': {
        if (!row.name) errors.push('Company Name is required.');
        if (row.currencycode && row.currencycode.length !== 3) {
          errors.push('Currency Code must be exactly 3 characters.');
        }
        if (
          row.industrytype &&
          !['mixed', 'retail', 'manufacturing', 'services'].includes(
            row.industrytype,
          )
        ) {
          errors.push(
            'Industry Type must be mixed, retail, manufacturing, or services.',
          );
        }
        break;
      }
      case 'sites': {
        if (!row.name) errors.push('Site Name is required.');
        if (!row.type) errors.push('Site Type is required.');
        else if (
          ![
            'factory',
            'branch',
            'warehouse',
            'office',
            'distribution_center',
          ].includes(row.type)
        ) {
          errors.push(
            'Site Type must be factory, branch, warehouse, office, or distribution_center.',
          );
        }
        break;
      }
      case 'units': {
        if (!row.name) errors.push('Unit Name is required.');
        if (!row.symbol) errors.push('Unit Symbol is required.');
        break;
      }
      case 'accounts': {
        if (!row.code) errors.push('Account Code is required.');
        if (!row.name) errors.push('Account Name is required.');
        if (!row.type) errors.push('Account Type is required.');
        else if (
          ![
            'revenue',
            'cogs',
            'expense',
            'asset',
            'liability',
            'equity',
            'cashflow',
          ].includes(row.type)
        ) {
          errors.push(
            'Account Type must be revenue, cogs, expense, asset, liability, equity, or cashflow.',
          );
        }
        if (row.code && companyId) {
          const accExists = await this.prisma.account.findFirst({
            where: { code: String(row.code).trim(), companyId },
          });
          if (accExists) {
            errors.push(
              `Account Code "${row.code}" already exists in the company.`,
            );
          }
        }
        if (row.parentcode && companyId) {
          const parent = await this.prisma.account.findFirst({
            where: { code: String(row.parentcode).trim(), companyId },
          });
          if (!parent) {
            errors.push(
              `Parent Account with code "${row.parentcode}" does not exist.`,
            );
          }
        }
        break;
      }
      case 'costcenters': {
        if (!row.code) errors.push('Cost Center Code is required.');
        if (!row.name) errors.push('Cost Center Name is required.');
        if (
          row.type &&
          ![
            'sales',
            'production',
            'admin',
            'marketing',
            'logistics',
            'maintenance',
            'other',
          ].includes(row.type)
        ) {
          errors.push(
            'Cost Center Type must be sales, production, admin, marketing, logistics, maintenance, or other.',
          );
        }
        if (row.sitecode && companyId) {
          const site = await this.prisma.site.findFirst({
            where: { name: String(row.sitecode).trim(), companyId },
          });
          if (!site) {
            errors.push(`Site with name "${row.sitecode}" does not exist.`);
          }
        }
        if (row.parentcode && companyId) {
          const parent = await this.prisma.costCenter.findFirst({
            where: { code: String(row.parentcode).trim(), companyId },
          });
          if (!parent) {
            errors.push(
              `Parent Cost Center with code "${row.parentcode}" does not exist.`,
            );
          }
        }
        break;
      }
      case 'productcategories': {
        if (!row.name) errors.push('Category Name is required.');
        if (row.parentcategoryname && companyId) {
          const parent = await this.prisma.productCategory.findFirst({
            where: { name: String(row.parentcategoryname).trim(), companyId },
          });
          if (!parent) {
            errors.push(
              `Parent Product Category with name "${row.parentcategoryname}" does not exist.`,
            );
          }
        }
        break;
      }
      case 'suppliers': {
        if (!row.name) errors.push('Supplier Name is required.');
        break;
      }
      case 'customers': {
        if (!row.code) errors.push('Customer Code is required.');
        if (!row.name) errors.push('Customer Name is required.');
        if (
          row.customertype &&
          !['retail', 'wholesale', 'distributor', 'internal', 'other'].includes(
            row.customertype,
          )
        ) {
          errors.push(
            'Customer Type must be retail, wholesale, distributor, internal, or other.',
          );
        }
        break;
      }
      case 'products': {
        if (!row.sku) errors.push('SKU is required.');
        if (!row.name) errors.push('Product Name is required.');
        if (
          row.producttype &&
          !['finished_good', 'semi_finished', 'service'].includes(
            row.producttype,
          )
        ) {
          errors.push(
            'Product Type must be finished_good, semi_finished, or service.',
          );
        }
        if (row.categoryname && companyId) {
          const cat = await this.prisma.productCategory.findFirst({
            where: { name: String(row.categoryname).trim(), companyId },
          });
          if (!cat) {
            errors.push(`Category "${row.categoryname}" does not exist.`);
          }
        }
        if (row.unitsymbol && companyId) {
          const unit = await this.prisma.unit.findFirst({
            where: { symbol: String(row.unitsymbol).trim(), companyId },
          });
          if (!unit) {
            errors.push(`Unit Symbol "${row.unitsymbol}" does not exist.`);
          }
        }
        break;
      }
      case 'materials': {
        if (!row.code) errors.push('Material Code is required.');
        if (!row.name) errors.push('Material Name is required.');
        if (row.suppliername && companyId) {
          const supplier = await this.prisma.supplier.findFirst({
            where: { name: String(row.suppliername).trim(), companyId },
          });
          if (!supplier) {
            errors.push(`Supplier "${row.suppliername}" does not exist.`);
          }
        }
        if (row.unitsymbol && companyId) {
          const unit = await this.prisma.unit.findFirst({
            where: { symbol: String(row.unitsymbol).trim(), companyId },
          });
          if (!unit) {
            errors.push(`Unit Symbol "${row.unitsymbol}" does not exist.`);
          }
        }
        break;
      }
      case 'bomrecipes': {
        if (!row.productsku) errors.push('Product SKU is required.');
        if (!row.materialcode) errors.push('Material Code is required.');
        if (!row.qtyperoutput) errors.push('Quantity Per Output is required.');
        else if (isNaN(Number(row.qtyperoutput)))
          errors.push('Quantity Per Output must be a number.');

        if (row.productsku && companyId) {
          const product = await this.prisma.product.findFirst({
            where: { sku: String(row.productsku).trim(), companyId },
          });
          if (!product) {
            errors.push(`Product with SKU "${row.productsku}" does not exist.`);
          }
        }
        if (row.materialcode && companyId) {
          const material = await this.prisma.material.findFirst({
            where: { code: String(row.materialcode).trim(), companyId },
          });
          if (!material) {
            errors.push(
              `Material with Code "${row.materialcode}" does not exist.`,
            );
          }
        }
        break;
      }
      case 'budgetlines': {
        if (!row.budgetcyclename) errors.push('Budget Cycle is required.');
        if (!row.fiscalyear) errors.push('Fiscal Year is required.');
        if (!row.accountcode) errors.push('Account is required.');
        if (!row.periodmonth) errors.push('Month is required.');
        else {
          const parsed = this.parseMonthValue(row.periodmonth);
          if (parsed === null) {
            errors.push(
              'Month must be a number (1-12), month name (e.g. January, Jan), or Arabic month name.',
            );
          }
        }
        if (!row.amount) errors.push('Amount is required.');
        else if (isNaN(Number(row.amount)))
          errors.push('Amount must be a number.');

        if (row.accountcode && companyId) {
          const acc = await this.prisma.account.findFirst({
            where: {
              OR: [
                { code: String(row.accountcode).trim(), companyId },
                { name: String(row.accountcode).trim(), companyId },
              ],
              isActive: true,
            },
          });
          if (!acc)
            errors.push(
              `Account "${row.accountcode}" was not found.\nPlease import Accounts first, or choose an existing Account from the reference sheet.`,
            );
        }
        if (row.sitecode && companyId) {
          const site = await this.prisma.site.findFirst({
            where: { name: String(row.sitecode).trim(), companyId },
          });
          if (!site)
            errors.push(
              `Site "${row.sitecode}" was not found.\nPlease import Sites first, or choose an existing Site from the reference sheet.`,
            );
        }
        if (row.costcentercode && companyId) {
          const ccVal = String(row.costcentercode).trim();
          const cc = await this.prisma.costCenter.findFirst({
            where: {
              OR: [
                { code: ccVal, companyId },
                { name: ccVal, companyId },
              ],
            },
          });
          if (!cc)
            errors.push(
              `Cost Center "${row.costcentercode}" was not found.\nPlease import Cost Centers first, or choose an existing Cost Center from the reference sheet.`,
            );
        }
        if (row.productsku && companyId) {
          const prodVal = String(row.productsku).trim();
          const prod = await this.prisma.product.findFirst({
            where: {
              OR: [
                { sku: prodVal, companyId, isActive: true },
                { name: prodVal, companyId, isActive: true },
              ],
            },
          });
          if (!prod)
            errors.push(
              `Product "${row.productsku}" was not found.\nPlease import Products first, or choose an existing Product from the reference sheet.`,
            );
        }
        if (row.materialcode && companyId) {
          const matVal = String(row.materialcode).trim();
          const mat = await this.prisma.material.findFirst({
            where: {
              OR: [
                { code: matVal, companyId, isActive: true },
                { name: matVal, companyId, isActive: true },
              ],
            },
          });
          if (!mat)
            errors.push(
              `Material "${row.materialcode}" was not found.\nPlease import Materials first, or choose an existing Material from the reference sheet.`,
            );
        }
        if (row.customercode && companyId) {
          const custVal = String(row.customercode).trim();
          const cust = await this.prisma.customer.findFirst({
            where: {
              OR: [
                { code: custVal, companyId, isActive: true },
                { name: custVal, companyId, isActive: true },
              ],
            },
          });
          if (!cust)
            errors.push(
              `Customer "${row.customercode}" was not found.\nPlease import Customers first, or choose an existing Customer from the reference sheet.`,
            );
        }
        break;
      }
      case 'forecastlines': {
        if (!row.forecastcyclename) errors.push('Forecast Cycle is required.');
        if (!row.fiscalyear) errors.push('Fiscal Year is required.');
        if (!row.accountcode) errors.push('Account is required.');
        if (!row.periodmonth) errors.push('Month is required.');
        else {
          const parsed = this.parseMonthValue(row.periodmonth);
          if (parsed === null) {
            errors.push(
              'Month must be a number (1-12), month name (e.g. January, Jan), or Arabic month name.',
            );
          }
        }
        if (!row.amount) errors.push('Amount is required.');
        else if (isNaN(Number(row.amount)))
          errors.push('Amount must be a number.');

        if (row.accountcode && companyId) {
          const acc = await this.prisma.account.findFirst({
            where: {
              OR: [
                { code: String(row.accountcode).trim(), companyId },
                { name: String(row.accountcode).trim(), companyId },
              ],
              isActive: true,
            },
          });
          if (!acc)
            errors.push(
              `Account "${row.accountcode}" was not found.\nPlease import Accounts first, or choose an existing Account from the reference sheet.`,
            );
        }
        if (row.sitecode && companyId) {
          const site = await this.prisma.site.findFirst({
            where: { name: String(row.sitecode).trim(), companyId },
          });
          if (!site)
            errors.push(
              `Site "${row.sitecode}" was not found.\nPlease import Sites first, or choose an existing Site from the reference sheet.`,
            );
        }
        if (row.costcentercode && companyId) {
          const ccVal = String(row.costcentercode).trim();
          const cc = await this.prisma.costCenter.findFirst({
            where: {
              OR: [
                { code: ccVal, companyId },
                { name: ccVal, companyId },
              ],
            },
          });
          if (!cc)
            errors.push(
              `Cost Center "${row.costcentercode}" was not found.\nPlease import Cost Centers first, or choose an existing Cost Center from the reference sheet.`,
            );
        }
        if (row.productsku && companyId) {
          const prodVal = String(row.productsku).trim();
          const prod = await this.prisma.product.findFirst({
            where: {
              OR: [
                { sku: prodVal, companyId, isActive: true },
                { name: prodVal, companyId, isActive: true },
              ],
            },
          });
          if (!prod)
            errors.push(
              `Product "${row.productsku}" was not found.\nPlease import Products first, or choose an existing Product from the reference sheet.`,
            );
        }
        if (row.materialcode && companyId) {
          const matVal = String(row.materialcode).trim();
          const mat = await this.prisma.material.findFirst({
            where: {
              OR: [
                { code: matVal, companyId, isActive: true },
                { name: matVal, companyId, isActive: true },
              ],
            },
          });
          if (!mat)
            errors.push(
              `Material "${row.materialcode}" was not found.\nPlease import Materials first, or choose an existing Material from the reference sheet.`,
            );
        }
        if (row.customercode && companyId) {
          const custVal = String(row.customercode).trim();
          const cust = await this.prisma.customer.findFirst({
            where: {
              OR: [
                { code: custVal, companyId, isActive: true },
                { name: custVal, companyId, isActive: true },
              ],
            },
          });
          if (!cust)
            errors.push(
              `Customer "${row.customercode}" was not found.\nPlease import Customers first, or choose an existing Customer from the reference sheet.`,
            );
        }
        break;
      }
      case 'actuallines': {
        if (!row.accountcode) errors.push('Account Code is required.');
        if (!row.transactiondate) errors.push('Transaction Date is required.');
        else if (isNaN(Date.parse(row.transactiondate))) {
          errors.push(
            'Transaction Date must be a valid date format (e.g. YYYY-MM-DD).',
          );
        }
        if (!row.amount) errors.push('Amount is required.');
        else if (isNaN(Number(row.amount)))
          errors.push('Amount must be a number.');

        if (row.accountcode && companyId) {
          const acc = await this.prisma.account.findFirst({
            where: { code: String(row.accountcode).trim(), companyId },
          });
          if (!acc)
            errors.push(`Account Code "${row.accountcode}" does not exist.`);
        }
        if (row.sitecode && companyId) {
          const site = await this.prisma.site.findFirst({
            where: { name: String(row.sitecode).trim(), companyId },
          });
          if (!site) errors.push(`Site "${row.sitecode}" does not exist.`);
        }
        if (row.costcentercode && companyId) {
          const cc = await this.prisma.costCenter.findFirst({
            where: { code: String(row.costcentercode).trim(), companyId },
          });
          if (!cc)
            errors.push(
              `Cost Center Code "${row.costcentercode}" does not exist.`,
            );
        }
        if (row.productsku && companyId) {
          const prod = await this.prisma.product.findFirst({
            where: { sku: String(row.productsku).trim(), companyId },
          });
          if (!prod)
            errors.push(`Product SKU "${row.productsku}" does not exist.`);
        }
        if (row.materialcode && companyId) {
          const mat = await this.prisma.material.findFirst({
            where: { code: String(row.materialcode).trim(), companyId },
          });
          if (!mat)
            errors.push(`Material Code "${row.materialcode}" does not exist.`);
        }
        if (row.customercode && companyId) {
          const cust = await this.prisma.customer.findFirst({
            where: { code: String(row.customercode).trim(), companyId },
          });
          if (!cust)
            errors.push(`Customer Code "${row.customercode}" does not exist.`);
        }
        break;
      }
      case 'materialprices': {
        if (!row.materialcode) errors.push('Material Code is required.');
        if (!row.price) errors.push('Price is required.');
        else if (isNaN(Number(row.price)))
          errors.push('Price must be a number.');
        if (row.effectivedate && !this.parseDateValue(row.effectivedate)) {
          errors.push(`Date format is invalid for effectiveDate: "${row.effectivedate}". Use YYYY-MM-DD or Excel serial date format.`);
        }
        if (row.materialcode && companyId) {
          const mat = await this.prisma.material.findFirst({
            where: { code: String(row.materialcode).trim(), companyId },
          });
          if (!mat)
            errors.push(`Material Code "${row.materialcode}" does not exist.`);
        }
        break;
      }
      case 'packagingprices': {
        if (!row.materialcode) errors.push('Material Code is required.');
        if (!row.price) errors.push('Price is required.');
        else if (isNaN(Number(row.price)))
          errors.push('Price must be a number.');
        if (row.materialcode && companyId) {
          const mat = await this.prisma.material.findFirst({
            where: { code: String(row.materialcode).trim(), companyId },
          });
          if (!mat)
            errors.push(`Material Code "${row.materialcode}" does not exist.`);
        }
        break;
      }
      case 'productionallocations': {
        if (!row.sitecode) errors.push('Site Code is required.');
        if (!row.period) errors.push('Period is required.');
        if (!row.allocatedamount) errors.push('Allocated Amount is required.');
        else if (isNaN(Number(row.allocatedamount)))
          errors.push('Allocated Amount must be a number.');
        if (row.sitecode && companyId) {
          const site = await this.prisma.site.findFirst({
            where: { name: String(row.sitecode).trim(), companyId },
          });
          if (!site) errors.push(`Site "${row.sitecode}" does not exist.`);
        }
        break;
      }
      case 'yieldwaste': {
        if (!row.productsku) errors.push('Product SKU is required.');
        if (row.yieldpct !== undefined && row.yieldpct !== '') {
          const y = Number(row.yieldpct);
          if (isNaN(y) || y < 0 || y > 100)
            errors.push('Yield % must be a number between 0 and 100.');
        }
        if (row.wastagepct !== undefined && row.wastagepct !== '') {
          const w = Number(row.wastagepct);
          if (isNaN(w) || w < 0 || w > 100)
            errors.push('Wastage % must be a number between 0 and 100.');
        }
        if (row.productsku && companyId) {
          const prod = await this.prisma.product.findFirst({
            where: { sku: String(row.productsku).trim(), companyId },
          });
          if (!prod)
            errors.push(`Product SKU "${row.productsku}" does not exist.`);
        }
        break;
      }
      default:
        break;
    }
  }

  async commit(
    module: string,
    rows: RowData[],
    companyId: bigint,
    tenantId: bigint,
    userId: bigint,
  ): Promise<{ successCount: number; failCount: number }> {
    const validRows: RowData[] = [];
    let failCount = 0;
    const mod = this.normalizeModuleName(module);

    for (const rawRow of rows) {
      const normalized = this.normalizeKeys(rawRow, mod);
      const errors: string[] = [];

      // Resolve friendly names to codes for transaction modules
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

    if (validRows.length === 0) {
      return { successCount: 0, failCount };
    }

    await this.prisma.$transaction(async (tx) => {
      for (const row of validRows) {
        switch (mod) {
          case 'companies': {
            await tx.company.create({
              data: {
                tenantId,
                name: String(row.name).trim(),
                legalName: row.legalname ? String(row.legalname).trim() : null,
                industryType: row.industrytype || 'mixed',
                currencyCode: row.currencycode
                  ? String(row.currencycode).trim()
                  : 'EGP',
                taxNumber: row.taxnumber ? String(row.taxnumber).trim() : null,
              },
            });
            break;
          }
          case 'sites': {
            await tx.site.create({
              data: {
                companyId,
                name: String(row.name).trim(),
                type: row.type,
                region: row.region ? String(row.region).trim() : null,
                address: row.address ? String(row.address).trim() : null,
              },
            });
            break;
          }
          case 'units': {
            await tx.unit.create({
              data: {
                companyId,
                name: String(row.name).trim(),
                symbol: String(row.symbol).trim(),
              },
            });
            break;
          }
          case 'accounts': {
            let parentId: bigint | null = null;
            if (row.parentcode) {
              const p = await tx.account.findFirst({
                where: { code: String(row.parentcode).trim(), companyId },
              });
              parentId = p ? p.id : null;
            }
            await tx.account.create({
              data: {
                companyId,
                code: String(row.code).trim(),
                name: String(row.name).trim(),
                type: row.type,
                parentId,
              },
            });
            break;
          }
          case 'costcenters': {
            let siteId: bigint | null = null;
            if (row.sitecode) {
              const s = await tx.site.findFirst({
                where: { name: String(row.sitecode).trim(), companyId },
              });
              siteId = s ? s.id : null;
            }
            let parentId: bigint | null = null;
            if (row.parentcode) {
              const p = await tx.costCenter.findFirst({
                where: { code: String(row.parentcode).trim(), companyId },
              });
              parentId = p ? p.id : null;
            }
            await tx.costCenter.create({
              data: {
                companyId,
                siteId,
                parentId,
                code: String(row.code).trim(),
                name: String(row.name).trim(),
                type: row.type || 'other',
              },
            });
            break;
          }
          case 'productcategories': {
            let parentId: bigint | null = null;
            if (row.parentcategoryname) {
              const p = await tx.productCategory.findFirst({
                where: {
                  name: String(row.parentcategoryname).trim(),
                  companyId,
                },
              });
              parentId = p ? p.id : null;
            }
            await tx.productCategory.create({
              data: {
                companyId,
                name: String(row.name).trim(),
                parentId,
              },
            });
            break;
          }
          case 'suppliers': {
            await tx.supplier.create({
              data: {
                companyId,
                name: String(row.name).trim(),
                phone: row.phone ? String(row.phone).trim() : null,
                email: row.email ? String(row.email).trim() : null,
              },
            });
            break;
          }
          case 'customers': {
            await tx.customer.create({
              data: {
                companyId,
                code: String(row.code).trim(),
                name: String(row.name).trim(),
                customerType: row.customertype || 'retail',
                region: row.region ? String(row.region).trim() : null,
                phone: row.phone ? String(row.phone).trim() : null,
                email: row.email ? String(row.email).trim() : null,
                creditLimit: row.creditlimit ? Number(row.creditlimit) : 0,
                paymentTerms: row.paymentterms ? Number(row.paymentterms) : 30,
              },
            });
            break;
          }
          case 'products': {
            let categoryId: bigint | null = null;
            if (row.categoryname) {
              const c = await tx.productCategory.findFirst({
                where: { name: String(row.categoryname).trim(), companyId },
              });
              categoryId = c ? c.id : null;
            }
            let unitId: bigint | null = null;
            if (row.unitsymbol) {
              const u = await tx.unit.findFirst({
                where: { symbol: String(row.unitsymbol).trim(), companyId },
              });
              unitId = u ? u.id : null;
            }
            await tx.product.create({
              data: {
                companyId,
                sku: String(row.sku).trim(),
                name: String(row.name).trim(),
                productType: row.producttype || 'finished_good',
                salePrice: row.saleprice ? Number(row.saleprice) : 0,
                standardCost: row.standardcost ? Number(row.standardcost) : 0,
                categoryId,
                unitId,
              },
            });
            break;
          }
          case 'materials': {
            let supplierId: bigint | null = null;
            if (row.suppliername) {
              const s = await tx.supplier.findFirst({
                where: { name: String(row.suppliername).trim(), companyId },
              });
              supplierId = s ? s.id : null;
            }
            let unitId: bigint | null = null;
            if (row.unitsymbol) {
              const u = await tx.unit.findFirst({
                where: { symbol: String(row.unitsymbol).trim(), companyId },
              });
              unitId = u ? u.id : null;
            }
            await tx.material.create({
              data: {
                companyId,
                code: String(row.code).trim(),
                name: String(row.name).trim(),
                purchasePrice: row.purchaseprice
                  ? Number(row.purchaseprice)
                  : 0,
                safetyStockQty: row.safetystockqty
                  ? Number(row.safetystockqty)
                  : 0,
                supplierId,
                unitId,
              },
            });
            break;
          }
          case 'bomrecipes': {
            const product = await tx.product.findFirst({
              where: { sku: String(row.productsku).trim(), companyId },
            });
            const material = await tx.material.findFirst({
              where: { code: String(row.materialcode).trim(), companyId },
            });
            if (product && material) {
              const version = row.version ? String(row.version).trim() : 'v1';
              let recipe = await tx.bomRecipe.findFirst({
                where: { productId: product.id, version, companyId },
              });
              if (!recipe) {
                recipe = await tx.bomRecipe.create({
                  data: {
                    companyId,
                    productId: product.id,
                    version,
                    outputQty: row.outputqty ? Number(row.outputqty) : 1,
                    wastagePct: row.wastagepct ? Number(row.wastagepct) : 0,
                    laborCost: row.laborcost ? Number(row.laborcost) : 0,
                    overheadCost: row.overheadcost
                      ? Number(row.overheadcost)
                      : 0,
                  },
                });
              }
              await tx.bomLine.create({
                data: {
                  bomId: recipe.id,
                  materialId: material.id,
                  qtyPerOutput: Number(row.qtyperoutput),
                  wastagePct: row.bomlinewastagepct
                    ? Number(row.bomlinewastagepct)
                    : 0,
                },
              });
            }
            break;
          }
          case 'budgetlines': {
            const acc = await tx.account.findFirst({
              where: {
                OR: [
                  { code: String(row.accountcode).trim(), companyId },
                  { name: String(row.accountcode).trim(), companyId },
                ],
                isActive: true,
              },
            });
            if (!acc) break;

            const fiscalYear = Number(row.fiscalyear);
            const cycleName = String(row.budgetcyclename).trim();
            let cycle = await tx.budgetCycle.findFirst({
              where: { name: cycleName, fiscalYear, companyId },
            });
            if (!cycle) {
              cycle = await tx.budgetCycle.create({
                data: {
                  companyId,
                  name: cycleName,
                  fiscalYear,
                  status: 'draft',
                  createdBy: userId,
                },
              });
            }

            let siteId: bigint | null = null;
            if (row.sitecode) {
              const s = await tx.site.findFirst({
                where: { name: String(row.sitecode).trim(), companyId },
              });
              siteId = s ? s.id : null;
            }
            let costCenterId: bigint | null = null;
            if (row.costcentercode) {
              const ccVal = String(row.costcentercode).trim();
              const cc = await tx.costCenter.findFirst({
                where: {
                  OR: [
                    { code: ccVal, companyId },
                    { name: ccVal, companyId },
                  ],
                },
              });
              costCenterId = cc ? cc.id : null;
            }
            let productId: bigint | null = null;
            if (row.productsku) {
              const prodVal = String(row.productsku).trim();
              const p = await tx.product.findFirst({
                where: {
                  OR: [
                    { sku: prodVal, companyId, isActive: true },
                    { name: prodVal, companyId, isActive: true },
                  ],
                },
              });
              productId = p ? p.id : null;
            }
            let materialId: bigint | null = null;
            if (row.materialcode) {
              const matVal = String(row.materialcode).trim();
              const m = await tx.material.findFirst({
                where: {
                  OR: [
                    { code: matVal, companyId, isActive: true },
                    { name: matVal, companyId, isActive: true },
                  ],
                },
              });
              materialId = m ? m.id : null;
            }
            let customerId: bigint | null = null;
            if (row.customercode) {
              const custVal = String(row.customercode).trim();
              const c = await tx.customer.findFirst({
                where: {
                  OR: [
                    { code: custVal, companyId, isActive: true },
                    { name: custVal, companyId, isActive: true },
                  ],
                },
              });
              customerId = c ? c.id : null;
            }

            await tx.budgetLine.create({
              data: {
                budgetCycleId: cycle.id,
                accountId: acc.id,
                siteId,
                costCenterId,
                productId,
                materialId,
                customerId,
                periodMonth: Number(row.periodmonth),
                quantity: row.quantity ? Number(row.quantity) : 0,
                unitPrice: row.unitprice ? Number(row.unitprice) : 0,
                amount: Number(row.amount),
                notes: row.notes ? String(row.notes).trim() : null,
              },
            });
            break;
          }
          case 'forecastlines': {
            const acc = await tx.account.findFirst({
              where: {
                OR: [
                  { code: String(row.accountcode).trim(), companyId },
                  { name: String(row.accountcode).trim(), companyId },
                ],
                isActive: true,
              },
            });
            if (!acc) break;

            const fiscalYear = Number(row.fiscalyear);
            const cycleName = String(row.forecastcyclename).trim();
            let cycle = await tx.forecastCycle.findFirst({
              where: { name: cycleName, fiscalYear, companyId },
            });
            if (!cycle) {
              cycle = await tx.forecastCycle.create({
                data: {
                  companyId,
                  name: cycleName,
                  fiscalYear,
                  basePeriod: new Date(fiscalYear, 0, 1),
                  status: 'draft',
                  createdBy: userId,
                },
              });
            }

            let siteId: bigint | null = null;
            if (row.sitecode) {
              const s = await tx.site.findFirst({
                where: { name: String(row.sitecode).trim(), companyId },
              });
              siteId = s ? s.id : null;
            }
            let costCenterId: bigint | null = null;
            if (row.costcentercode) {
              const ccVal = String(row.costcentercode).trim();
              const cc = await tx.costCenter.findFirst({
                where: {
                  OR: [
                    { code: ccVal, companyId },
                    { name: ccVal, companyId },
                  ],
                },
              });
              costCenterId = cc ? cc.id : null;
            }
            let productId: bigint | null = null;
            if (row.productsku) {
              const prodVal = String(row.productsku).trim();
              const p = await tx.product.findFirst({
                where: {
                  OR: [
                    { sku: prodVal, companyId, isActive: true },
                    { name: prodVal, companyId, isActive: true },
                  ],
                },
              });
              productId = p ? p.id : null;
            }
            let materialId: bigint | null = null;
            if (row.materialcode) {
              const matVal = String(row.materialcode).trim();
              const m = await tx.material.findFirst({
                where: {
                  OR: [
                    { code: matVal, companyId, isActive: true },
                    { name: matVal, companyId, isActive: true },
                  ],
                },
              });
              materialId = m ? m.id : null;
            }
            let customerId: bigint | null = null;
            if (row.customercode) {
              const custVal = String(row.customercode).trim();
              const c = await tx.customer.findFirst({
                where: {
                  OR: [
                    { code: custVal, companyId, isActive: true },
                    { name: custVal, companyId, isActive: true },
                  ],
                },
              });
              customerId = c ? c.id : null;
            }

            await tx.forecastLine.create({
              data: {
                forecastCycleId: cycle.id,
                accountId: acc.id,
                siteId,
                costCenterId,
                productId,
                materialId,
                customerId,
                periodMonth: Number(row.periodmonth),
                quantity: row.quantity ? Number(row.quantity) : 0,
                unitPrice: row.unitprice ? Number(row.unitprice) : 0,
                amount: Number(row.amount),
                driverType: row.drivertype
                  ? String(row.drivertype).trim()
                  : null,
                notes: row.notes ? String(row.notes).trim() : null,
              },
            });
            break;
          }
          case 'actuallines': {
            const acc = await tx.account.findFirst({
              where: {
                OR: [
                  { code: String(row.accountcode).trim(), companyId },
                  { name: String(row.accountcode).trim(), companyId },
                ],
                isActive: true,
              },
            });
            if (!acc) break;

            const transactionDate = new Date(row.transactiondate);
            const fiscalYear = transactionDate.getFullYear();

            // Find or create ActualImport for GL lines
            let imp = await tx.actualImport.findFirst({
              where: {
                companyId,
                importType: 'gl',
                status: 'posted',
              },
            });
            if (!imp) {
              imp = await tx.actualImport.create({
                data: {
                  companyId,
                  importType: 'gl',
                  periodFrom: new Date(fiscalYear, 0, 1),
                  periodTo: new Date(fiscalYear, 11, 31),
                  status: 'posted',
                  importedBy: userId,
                },
              });
            }

            let siteId: bigint | null = null;
            if (row.sitecode) {
              const s = await tx.site.findFirst({
                where: { name: String(row.sitecode).trim(), companyId },
              });
              siteId = s ? s.id : null;
            }
            let costCenterId: bigint | null = null;
            if (row.costcentercode) {
              const ccVal = String(row.costcentercode).trim();
              const cc = await tx.costCenter.findFirst({
                where: {
                  OR: [
                    { code: ccVal, companyId },
                    { name: ccVal, companyId },
                  ],
                },
              });
              costCenterId = cc ? cc.id : null;
            }
            let productId: bigint | null = null;
            if (row.productsku) {
              const prodVal = String(row.productsku).trim();
              const p = await tx.product.findFirst({
                where: {
                  OR: [
                    { sku: prodVal, companyId, isActive: true },
                    { name: prodVal, companyId, isActive: true },
                  ],
                },
              });
              productId = p ? p.id : null;
            }
            let materialId: bigint | null = null;
            if (row.materialcode) {
              const matVal = String(row.materialcode).trim();
              const m = await tx.material.findFirst({
                where: {
                  OR: [
                    { code: matVal, companyId, isActive: true },
                    { name: matVal, companyId, isActive: true },
                  ],
                },
              });
              materialId = m ? m.id : null;
            }
            let customerId: bigint | null = null;
            if (row.customercode) {
              const custVal = String(row.customercode).trim();
              const c = await tx.customer.findFirst({
                where: {
                  OR: [
                    { code: custVal, companyId, isActive: true },
                    { name: custVal, companyId, isActive: true },
                  ],
                },
              });
              customerId = c ? c.id : null;
            }

            await tx.actualLine.create({
              data: {
                actualImportId: imp.id,
                accountId: acc.id,
                siteId,
                costCenterId,
                productId,
                materialId,
                customerId,
                transactionDate,
                quantity: row.quantity ? Number(row.quantity) : 0,
                unitPrice: row.unitprice ? Number(row.unitprice) : 0,
                amount: Number(row.amount),
                referenceNo: row.referenceno
                  ? String(row.referenceno).trim()
                  : null,
              },
            });
            break;
          }
          case 'materialprices': {
            const material = await tx.material.findFirst({
              where: { code: String(row.materialcode).trim(), companyId },
            });
            if (!material) break;

            const effectiveDate = this.parseDateValue(row.effectivedate) ?? new Date();

            await tx.material.update({
              where: { id: material.id },
              data: { purchasePrice: Number(row.price) },
            });

            await tx.rawMaterialPrice.create({
              data: {
                companyId,
                materialId: material.id,
                price: Number(row.price),
                priceDate: effectiveDate,
              },
            });
            break;
          }
          case 'packagingprices': {
            const material = await tx.material.findFirst({
              where: { code: String(row.materialcode).trim(), companyId },
            });
            if (!material) break;

            const effectiveDate = this.parseDateValue(row.effectivedate) ?? new Date();

            await tx.material.update({
              where: { id: material.id },
              data: { purchasePrice: Number(row.price) },
            });

            await tx.rawMaterialPrice.create({
              data: {
                companyId,
                materialId: material.id,
                price: Number(row.price),
                priceDate: effectiveDate,
              },
            });
            break;
          }
          case 'productionallocations': {
            const site = await tx.site.findFirst({
              where: { name: String(row.sitecode).trim(), companyId },
            });
            if (!site) break;

            await tx.productionCostAllocation.create({
              data: {
                companyId,
                siteId: site.id,
                period: String(row.period).trim(),
                allocatedAmount: Number(row.allocatedamount),
                costCategory: row.costcategory
                  ? String(row.costcategory).trim()
                  : 'overhead',
                allocationMethod: row.allocationbasis
                  ? String(row.allocationbasis).trim()
                  : 'production_volume',
              },
            });
            break;
          }
          case 'yieldwaste': {
            const product = await tx.product.findFirst({
              where: { sku: String(row.productsku).trim(), companyId },
            });
            if (!product) break;

            const recipe = await tx.bomRecipe.findFirst({
              where: { productId: product.id, companyId, isActive: true },
            });
            if (!recipe) break;

            const updateData: Record<string, unknown> = {};
            if (row.yieldpct !== undefined && row.yieldpct !== '') {
              updateData.yieldPct = Number(row.yieldpct);
            }
            if (row.wastagepct !== undefined && row.wastagepct !== '') {
              updateData.wastagePct = Number(row.wastagepct);
            }

            if (Object.keys(updateData).length > 0) {
              await tx.bomRecipe.update({
                where: { id: recipe.id },
                data: updateData,
              });
            }
            break;
          }
          default:
            break;
        }
      }
    });

    // Write audit log
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        entityType: 'Import',
        entityId: null,
        action: 'import',
        newValues: JSON.stringify({
          module,
          successCount: validRows.length,
          failCount,
        }),
      },
    });

    // Clear cache to ensure reports and dashboard are updated
    SimpleCache.clear();

    return {
      successCount: validRows.length,
      failCount,
    };
  }
}
