import { Injectable, Logger } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { PrismaService } from '../prisma.service';
import {
  ClientWorkbookImportService,
  WorkbookImportResult,
} from './client-workbook-import.service';
import {
  mapRowWithAliases,
  whitelistFields,
  coerceValue,
  generateDefaults,
  normalizeImportError,
  normalizeHeaderToField,
  getModuleTitle,
  inferAccountType,
  MODULE_COLUMN_ALIASES,
  MODEL_FIELD_WHITELIST,
} from './import-utils';

const SKIP_SHEET_NAMES = new Set([
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
  'forecast cycles reference',
]);

const INFORMATIONAL_SHEET_PREFIXES = [
  'informational_weight',
  'informational_hrv',
  'informational_bawadi',
  'informational_smga',
  'informational_skipped',
];

@Injectable()
export class DebugImportService {
  private readonly logger = new Logger(DebugImportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly clientWorkbookImport: ClientWorkbookImportService,
  ) {}

  async debugImport(
    buffer: Buffer,
    fileName: string,
    companyId: bigint,
    userId: bigint,
  ): Promise<WorkbookImportResult> {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const workbookType = this.clientWorkbookImport.detectWorkbookType(workbook);

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

    this.logger.log(`\n${'='.repeat(80)}`);
    this.logger.log(`DEBUG MODE IMPORT: ${fileName}`);
    this.logger.log(`Workbook Type: ${workbookType}`);
    this.logger.log(`Company ID: ${companyId}`);
    this.logger.log(`${'='.repeat(80)}\n`);

    for (const sheetName of workbook.SheetNames) {
      const sn = sheetName.toLowerCase().trim();

      // Skip non-data sheets
      if (SKIP_SHEET_NAMES.has(sn)) {
        result.sheetsReference++;
        result.sheetResults.push({
          sheetName,
          sheetRole: 'reference',
          status: 'reference',
          rowsImported: 0,
          message: 'Reference/instruction sheet — skipped',
        });
        continue;
      }

      const ws = workbook.Sheets[sheetName];
      const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
        defval: null,
      });
      const headers = rawRows.length > 0 ? Object.keys(rawRows[0]) : [];

      const moduleKey = this.clientWorkbookImport.mapSheetToModuleV3(
        sheetName,
        headers,
      );

      this.logger.log(`\n${'-'.repeat(80)}`);
      this.logger.log(`SHEET: "${sheetName}"`);
      this.logger.log(`Headers: ${JSON.stringify(headers)}`);
      this.logger.log(`Mapped Module: ${moduleKey}`);
      this.logger.log(`Rows: ${rawRows.length}`);
      this.logger.log(`${'-'.repeat(80)}`);

      if (!moduleKey || moduleKey === 'unknown') {
        this.logger.log(`→ SKIPPED: No mapping for sheet "${sheetName}"`);
        result.sheetsSkipped++;
        result.sheetResults.push({
          sheetName,
          sheetRole: 'data',
          status: 'skipped',
          rowsImported: 0,
          message: `No module mapping for "${sheetName}"`,
        });
        continue;
      }

      // Check if informational
      if (INFORMATIONAL_SHEET_PREFIXES.some((p) => moduleKey.startsWith(p))) {
        this.logger.log(`→ INFORMATIONAL: Skipping sheet — ${moduleKey}`);
        result.sheetsSkipped++;
        result.sheetResults.push({
          sheetName,
          sheetRole: 'data',
          status: 'skipped',
          rowsImported: 0,
          message: `Informational sheet skipped: ${moduleKey}`,
        });
        result.warnings.push(
          `Sheet "${sheetName}" is informational and was skipped`,
        );
        continue;
      }

      result.sheetsProcessed++;

      // Special handling for known special modules (priceList, promotions, etc.)
      if (moduleKey === 'priceList') {
        this.logger.log(`→ PRICE LIST: Running debug handler`);
        await this.debugPriceList(ws, sheetName, companyId, result);
        continue;
      }
      if (moduleKey === 'promotions') {
        this.logger.log(`→ PROMOTIONS: Running debug handler`);
        await this.debugPromotions(ws, sheetName, companyId, result);
        continue;
      }
      if (moduleKey === 'forecastlines') {
        this.logger.log(`→ FORECAST: Running debug handler`);
        await this.debugForecast(workbook, companyId, result);
        continue;
      }
      if (moduleKey === 'bomrecipes') {
        this.logger.log(`→ BOM: Running debug handler`);
        await this.debugBom(workbook, companyId, result);
        continue;
      }
      if (moduleKey === 'actuallines') {
        this.logger.log(`→ ACTUALS: Running debug handler`);
        await this.debugActuals(ws, sheetName, companyId, userId, result);
        continue;
      }
      if (moduleKey === 'budgetlines') {
        this.logger.log(`→ BUDGET: Running debug handler`);
        await this.debugBudget(ws, sheetName, companyId, result);
        continue;
      }
      if (moduleKey === 'rawmaterialprices') {
        this.logger.log(`→ MATERIAL PRICES: Running debug handler`);
        await this.debugMaterialPrices(ws, sheetName, companyId, result);
        continue;
      }

      // Generic master data import with debug
      await this.debugGenericMaster(
        ws,
        sheetName,
        moduleKey,
        companyId,
        result,
      );
    }

    this.logger.log(`\n${'='.repeat(80)}`);
    this.logger.log(`DEBUG IMPORT COMPLETE`);
    this.logger.log(
      `Inserted: ${Object.entries(result.totals)
        .filter(([, v]) => v > 0)
        .map(([k, v]) => `${k}=${v}`)
        .join(', ')}`,
    );
    this.logger.log(`Errors: ${result.errors.length}`);
    this.logger.log(`${'='.repeat(80)}\n`);

    return result;
  }

  // ─── Generic Master Data (Companies, Sites, Units, Accounts, etc.) ─────

  private async debugGenericMaster(
    ws: XLSX.WorkSheet,
    sheetName: string,
    moduleKey: string,
    companyId: bigint,
    result: WorkbookImportResult,
  ): Promise<void> {
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
      defval: null,
    });
    if (rawRows.length === 0) {
      this.logger.log(`→ No data rows`);
      return;
    }

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
    };

    const modelName = modelMap[moduleKey];
    if (!modelName) {
      this.logger.log(`→ No model for module "${moduleKey}"`);
      result.sheetsSkipped++;
      return;
    }
    const prismaModel = this.getPrismaModel(moduleKey);
    if (!prismaModel) {
      this.logger.log(`→ No Prisma model for "${moduleKey}"`);
      result.sheetsSkipped++;
      return;
    }

    let imported = 0;
    let failed = 0;
    const sheetErrors: string[] = [];

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      const rowNum = i + 2;

      const mapped = mapRowWithAliases(row, moduleKey);
      mapped.companyId = companyId;
      const withDefaults = generateDefaults(mapped, moduleKey);

      const coerced: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(withDefaults)) {
        coerced[key] = coerceValue(val, key, modelName);
      }

      const clean = whitelistFields(coerced, modelName);

      if (Object.keys(clean).filter((k) => k !== 'companyId').length === 0) {
        this.logger.log(`  Row ${rowNum}: SKIP — no data (all fields empty)`);
        continue;
      }

      // Special handling for modules with required code field
      if (moduleKey === 'accounts' && !clean.code) {
        this.logger.log(`  ⚠ Row ${rowNum}: SKIP — no account code. Raw: ${JSON.stringify(row)}`);
        failed++;
        continue;
      }
      if (moduleKey === 'accounts' && !clean.type) {
        clean.type = clean.code
          ? inferAccountType(String(clean.code))
          : 'expense';
      }

      // For customers — generate code from name if missing
      if (moduleKey === 'customers' && !clean.code) {
        clean.code = `CUST-${rowNum}`;
      }

      this.logger.log(`\n  Row ${rowNum}:`);
      this.logger.log(`  Original:     ${JSON.stringify(this.truncateKeys(row))}`);
      this.logger.log(`  Aliased:      ${JSON.stringify(mapped)}`);
      this.logger.log(`  Clean Payload: ${JSON.stringify(clean)}`);

      try {
        if (moduleKey === 'companies') {
          await prismaModel.update({ where: { id: companyId }, data: clean });
          this.logger.log(`  ✅ INSERTED (updated company)`);
        } else {
          await prismaModel.create({ data: clean });
          this.logger.log(`  ✅ INSERTED`);
        }
        imported++;
        result.totals[moduleKey] = (result.totals[moduleKey] || 0) + 1;
      } catch (err: any) {
        const { friendly } = normalizeImportError(err, {
          module: moduleKey,
          row: rowNum,
          sheet: sheetName,
        });
        this.logger.log(
          `  ❌ FAILED: ${friendly}\n     ${err.message?.split('\n')[0] || err}`,
        );
        sheetErrors.push(`Row ${rowNum}: ${friendly}`);
        failed++;
      }
    }

    const status = imported > 0 ? 'imported' : 'skipped';
    result.sheetResults.push({
      sheetName,
      sheetRole: 'data',
      status,
      rowsImported: imported,
      message: `${getModuleTitle(moduleKey)}: ${imported} imported, ${failed} failed`,
    });
    if (imported > 0) result.sheetsImported++;
    else result.sheetsSkipped++;
    if (sheetErrors.length > 0) result.errors.push(...sheetErrors);

    this.logger.log(
      `  → ${moduleKey}: ${imported} OK, ${failed} FAILED`,
    );
  }

  // ─── Price List ────────────────────────────────────────────────────────

  private async debugPriceList(
    ws: XLSX.WorkSheet,
    sheetName: string,
    companyId: bigint,
    result: WorkbookImportResult,
  ): Promise<void> {
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
      header: 1,
      defval: null,
    }) as unknown as unknown[][];

    this.logger.log(`  Raw rows: ${rows.length}`);

    let headerIdx = -1;
    for (let i = 0; i < Math.min(rows.length, 10); i++) {
      const row = rows[i];
      if (!row) continue;
      const rowStr = row.map((v) => String(v || '').toLowerCase());
      if (
        rowStr.some(
          (v) => v.includes('item code') || v === 'code-' || v === 'code',
        )
      ) {
        headerIdx = i;
        this.logger.log(`  Header found at row ${i}: ${JSON.stringify(row)}`);
        break;
      }
    }

    if (headerIdx < 0) {
      this.logger.log(`  ❌ No header row found`);
      result.sheetsSkipped++;
      result.sheetResults.push({
        sheetName,
        sheetRole: 'data',
        status: 'skipped',
        rowsImported: 0,
        message: 'No header row found in Price List',
      });
      return;
    }

    let imported = 0;
    for (let i = headerIdx + 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 2) continue;
      const sku = row[0] ? String(row[0]).trim() : '';
      if (!sku) continue;

      // Try month columns
      for (let j = 1; j < row.length; j++) {
        const val = row[j];
        if (!val || Number(val) <= 0) continue;

        try {
          const result2 = await this.prisma.product.updateMany({
            where: { sku, companyId },
            data: { salePrice: Number(val) },
          });
          if (result2.count > 0) {
            imported++;
            this.logger.log(`  Row ${i + 1}: ✅ Updated ${sku} salePrice=${val}`);
          } else {
            this.logger.log(`  Row ${i + 1}: ⚠ SKU "${sku}" not found`);
          }
        } catch (err: any) {
          this.logger.log(
            `  Row ${i + 1}: ❌ ${err.message?.split('\n')[0] || err}`,
          );
        }
      }
    }

    result.sheetResults.push({
      sheetName,
      sheetRole: 'data',
      status: imported > 0 ? 'imported' : 'skipped',
      rowsImported: imported,
      message: `Updated ${imported} product prices`,
    });
    if (imported > 0) result.sheetsImported++;
    else result.sheetsSkipped++;
  }

  // ─── Promotions ────────────────────────────────────────────────────────

  private async debugPromotions(
    ws: XLSX.WorkSheet,
    sheetName: string,
    companyId: bigint,
    result: WorkbookImportResult,
  ): Promise<void> {
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
      header: 1,
      defval: null,
    }) as unknown as unknown[][];

    let headerIdx = -1;
    for (let i = 0; i < Math.min(rows.length, 10); i++) {
      const row = rows[i];
      if (!row) continue;
      const rowStr = row.map((v) => String(v || '').toLowerCase());
      if (
        rowStr.some((v) => v.includes('code-') || v === 'code')
      ) {
        headerIdx = i;
        this.logger.log(`  Header at row ${i}: ${JSON.stringify(row)}`);
        break;
      }
    }

    if (headerIdx < 0) {
      this.logger.log(`  No header row — trying raw`);
      headerIdx = 0;
    }

    const h = rows[headerIdx]?.map((v: unknown) =>
      v ? String(v).trim().toLowerCase() : '',
    ) || [];
    this.logger.log(`  Columns: ${JSON.stringify(h)}`);

    let imported = 0;
    for (let i = headerIdx + 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 2) continue;
      const sku = row[0] ? String(row[0]).trim() : '';
      if (!sku) continue;

      const desc =
        h.length > 1 && h[1]
          ? String(row[1] || '').trim()
          : '';

      for (let j = 2; j < Math.min(h.length, row.length); j++) {
        const val = typeof row[j] === 'number' ? (row[j] as number) : 0;
        if (val === 0) continue;
        if (h[j]?.includes('discount')) {
          const promoName = `${sku} discount - ${desc || 'Customer'}`;
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
            this.logger.log(`  Row ${i + 1}: ✅ Created promotion ${promoName}`);
          } catch (err: any) {
            this.logger.log(
              `  Row ${i + 1}: ❌ ${err.message?.split('\n')[0] || err}`,
            );
          }
        }
      }
    }

    result.sheetResults.push({
      sheetName,
      sheetRole: 'data',
      status: imported > 0 ? 'imported' : 'skipped',
      rowsImported: imported,
      message: `Created ${imported} promotions`,
    });
    if (imported > 0) result.sheetsImported++;
    else result.sheetsSkipped++;
  }

  // ─── Forecast ──────────────────────────────────────────────────────────

  private async debugForecast(
    workbook: XLSX.WorkBook,
    companyId: bigint,
    result: WorkbookImportResult,
  ): Promise<void> {
    const sheetName = workbook.SheetNames.find((s) => {
      const sl = s.toLowerCase().replace(/[_\s-]/g, '');
      return sl.includes('forcasteqty') || sl.includes('forecasteqty');
    });
    if (!sheetName) {
      this.logger.log(`  ❌ Forecast sheet not found`);
      return;
    }

    const ws = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
      header: 1,
      defval: null,
    }) as unknown as unknown[][];

    this.logger.log(`  Rows: ${rows.length}`);

    if (rows.length < 3) {
      this.logger.log(`  ❌ Insufficient data`);
      return;
    }

    const headerRow = rows[1];
    this.logger.log(`  Header row: ${JSON.stringify(headerRow)}`);

    let imported = 0;
    let failed = 0;

    // Parse month columns from row index 1 (header)
    for (let i = 2; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 4) {
        failed++;
        this.logger.log(`  Row ${i + 1}: ⚠ Insufficient columns`);
        continue;
      }

      // Try to match by month columns (col 4+)
      for (let j = 4; j < Math.min(headerRow.length, row.length); j++) {
        const qty = row[j];
        if (!qty || Number(qty) === 0) continue;

        const monthVal = headerRow[j];
        if (!monthVal) continue;

        // Attempt to create forecast line directly
        try {
          // Find or create forecast cycle
          const cycleName = `DebugForecast-${Date.now()}`;
          const cycle = await this.prisma.forecastCycle.create({
            data: {
              companyId,
              name: cycleName,
              fiscalYear: new Date().getFullYear(),
              basePeriod: new Date(),
              status: 'draft',
            },
          });

          // Create the line
          await this.prisma.forecastLine.create({
            data: {
              forecastCycleId: cycle.id,
              accountId: BigInt(1), // placeholder
              periodMonth: 1,
              quantity: Number(qty),
              amount: 0,
            },
          });
          imported++;
          this.logger.log(`  Row ${i + 1} Col ${j}: ✅ Inserted`);
        } catch (err: any) {
          this.logger.log(
            `  Row ${i + 1} Col ${j}: ❌ ${err.message?.split('\n')[0] || err}`,
          );
          failed++;
        }
      }
    }

    result.sheetResults.push({
      sheetName,
      sheetRole: 'data',
      status: imported > 0 ? 'imported' : 'skipped',
      rowsImported: imported,
      message: `Forecast: ${imported} imported, ${failed} failed`,
    });
    if (imported > 0) result.sheetsImported++;
    else result.sheetsSkipped++;
  }

  // ─── BOM ───────────────────────────────────────────────────────────────

  private async debugBom(
    workbook: XLSX.WorkBook,
    companyId: bigint,
    result: WorkbookImportResult,
  ): Promise<void> {
    const ws = workbook.Sheets['Drill Down'];
    if (!ws) {
      this.logger.log(`  Drill Down sheet not found`);
      return;
    }

    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
      header: 1,
      defval: null,
    }) as unknown as unknown[][];

    this.logger.log(`  Rows: ${rows.length}`);

    if (rows.length < 4) {
      this.logger.log(`  ❌ Insufficient data`);
      return;
    }

    const headerRow = rows[2];
    this.logger.log(`  Header (row 3): ${JSON.stringify(headerRow)}`);

    let imported = 0;
    let failed = 0;

    for (let i = 3; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1;
      if (!row || row.length < 8) {
        failed++;
        this.logger.log(`  Row ${rowNum}: ⚠ Insufficient columns`);
        continue;
      }

      const prdNo = row[2] ? Number(row[2]) : 0;
      const ingNo = row[5] ? Number(row[5]) : 0;

      if (!prdNo || !ingNo) {
        failed++;
        this.logger.log(`  Row ${rowNum}: ⚠ Missing product or ingredient number`);
        continue;
      }

      this.logger.log(`  Row ${rowNum}: prdNo=${prdNo}, ingNo=${ingNo}`);

      // Try to find product and material
      try {
        const product = await this.prisma.product.findFirst({
          where: { sku: String(prdNo), companyId },
        });
        const material = await this.prisma.material.findFirst({
          where: { code: String(ingNo), companyId },
        });

        this.logger.log(
          `    Product: ${product ? `id=${product.id}` : 'NOT FOUND'}`,
        );
        this.logger.log(
          `    Material: ${material ? `id=${material.id}` : 'NOT FOUND'}`,
        );
        imported++;
      } catch (err: any) {
        this.logger.log(
          `  Row ${rowNum}: ❌ ${err.message?.split('\n')[0] || err}`,
        );
        failed++;
      }
    }

    result.sheetResults.push({
      sheetName: 'Drill Down',
      sheetRole: 'data',
      status: imported > 0 ? 'imported' : 'skipped',
      rowsImported: imported,
      message: `BOM: ${imported} rows checked, ${failed} failed`,
    });
    if (imported > 0) result.sheetsImported++;
    else result.sheetsSkipped++;
  }

  // ─── Actuals ────────────────────────────────────────────────────────────

  private async debugActuals(
    ws: XLSX.WorkSheet,
    sheetName: string,
    companyId: bigint,
    userId: bigint,
    result: WorkbookImportResult,
  ): Promise<void> {
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
      defval: null,
    });

    this.logger.log(`  Raw rows: ${rows.length}`);
    if (rows.length === 0) return;

    const headers = Object.keys(rows[0]);
    this.logger.log(`  Headers: ${JSON.stringify(headers)}`);

    let imported = 0;
    let failed = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      this.logger.log(`\n  Row ${rowNum}:`);
      this.logger.log(`  Original: ${JSON.stringify(this.truncateKeys(row))}`);

      try {
        // Map using account aliases
        const mapped: Record<string, unknown> = {};
        for (const [h, val] of Object.entries(row)) {
          if (val === null || val === undefined || val === '') continue;
          const field =
            normalizeHeaderToField(h, 'actuallines') ||
            normalizeHeaderToField(h, 'accounts') ||
            normalizeHeaderToField(h, 'customers') ||
            normalizeHeaderToField(h, 'materials') ||
            normalizeHeaderToField(h, 'products');
          if (field) {
            if (
              field === 'code' ||
              field === 'accountCode'
            ) {
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

        this.logger.log(`  Mapped: ${JSON.stringify(mapped)}`);

        // Try to find account
        const account = await this.prisma.account.findFirst({
          where: { companyId, code: '4000' },
        });
        if (!account) {
          this.logger.log(`  ❌ No default account found`);
          failed++;
          continue;
        }

        // Find actual import
        const actualImport = await this.prisma.actualImport.findFirst({
          where: { companyId, importType: 'sales', status: 'posted' },
        });
        if (!actualImport) {
          this.logger.log(`  ❌ No actual import batch found`);
          failed++;
          continue;
        }

        await this.prisma.actualLine.create({
          data: {
            actualImportId: actualImport.id,
            accountId: account.id,
            transactionDate: new Date(),
            amount: Number(mapped['amount'] || 0),
            quantity: Number(mapped['quantity'] || 0),
          },
        });
        this.logger.log(`  ✅ INSERTED`);
        imported++;
        result.totals.actualLines = (result.totals.actualLines || 0) + 1;
      } catch (err: any) {
        const { friendly } = normalizeImportError(err, {
          module: 'actuallines',
          row: rowNum,
          sheet: sheetName,
        });
        this.logger.log(`  ❌ ${friendly}`);
        this.logger.log(`     ${err.message?.split('\n')[0] || err}`);
        failed++;
      }
    }

    result.sheetResults.push({
      sheetName,
      sheetRole: 'data',
      status: imported > 0 ? 'imported' : 'skipped',
      rowsImported: imported,
      message: `Actuals: ${imported} inserted, ${failed} failed`,
    });
    if (imported > 0) result.sheetsImported++;
    else result.sheetsSkipped++;
  }

  // ─── Budget ────────────────────────────────────────────────────────────

  private async debugBudget(
    ws: XLSX.WorkSheet,
    sheetName: string,
    companyId: bigint,
    result: WorkbookImportResult,
  ): Promise<void> {
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
      defval: null,
    });

    this.logger.log(`  Raw rows: ${rows.length}`);
    if (rows.length === 0) return;

    const headers = Object.keys(rows[0]);
    this.logger.log(`  Headers: ${JSON.stringify(headers)}`);

    let imported = 0;
    let failed = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      try {
        const amount = Number(row['amount'] || row['Amount'] || 0);
        if (amount === 0) continue;

        this.logger.log(`  Row ${rowNum}: amount=${amount}`);

        await this.prisma.budgetLine.create({
          data: {
            budgetCycleId: BigInt(1),
            accountId: BigInt(1),
            periodMonth: 1,
            amount,
          },
        });
        imported++;
      } catch (err: any) {
        this.logger.log(
          `  Row ${rowNum}: ❌ ${err.message?.split('\n')[0] || err}`,
        );
        failed++;
      }
    }

    result.sheetResults.push({
      sheetName,
      sheetRole: 'data',
      status: imported > 0 ? 'imported' : 'skipped',
      rowsImported: imported,
      message: `Budget: ${imported} inserted, ${failed} failed`,
    });
    if (imported > 0) result.sheetsImported++;
    else result.sheetsSkipped++;
  }

  // ─── Material Prices ───────────────────────────────────────────────────

  private async debugMaterialPrices(
    ws: XLSX.WorkSheet,
    sheetName: string,
    companyId: bigint,
    result: WorkbookImportResult,
  ): Promise<void> {
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
      header: 1,
      defval: null,
    }) as unknown as unknown[][];

    this.logger.log(`  Rows: ${rows.length}`);

    if (rows.length < 3) {
      this.logger.log(`  ❌ Insufficient data`);
      return;
    }

    const headerRow = rows[1];
    this.logger.log(`  Header: ${JSON.stringify(headerRow)}`);

    let imported = 0;
    let failed = 0;

    for (let i = 2; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 2) {
        failed++;
        continue;
      }

      const code = row[0] ? String(row[0]).trim() : '';
      if (!code) {
        failed++;
        this.logger.log(`  Row ${i + 1}: ⚠ No material code`);
        continue;
      }

      const name = row[1] ? String(row[1]).trim() : '';
      this.logger.log(`  Row ${i + 1}: code="${code}", name="${name}"`);

      try {
        const material = await this.prisma.material.findFirst({
          where: { OR: [{ code }, { name }], companyId },
        });

        if (!material) {
          this.logger.log(`  ⚠ Material "${code}" not found`);
          failed++;
          continue;
        }

        // Find month columns starting at index 4
        for (let j = 4; j < Math.min(headerRow.length, row.length); j++) {
          const priceVal = row[j];
          const monthHeader = headerRow[j];
          if (!priceVal || !monthHeader) continue;
          const price = Number(priceVal);
          if (price <= 0) continue;

          await this.prisma.rawMaterialPrice.create({
            data: {
              companyId,
              materialId: material.id,
              price,
              priceDate: new Date(),
            },
          });
          imported++;
          this.logger.log(`  ✅ materialPrice: materialId=${material.id}, price=${price}`);
        }
      } catch (err: any) {
        this.logger.log(
          `  ❌ ${err.message?.split('\n')[0] || err}`,
        );
        failed++;
      }
    }

    result.sheetResults.push({
      sheetName,
      sheetRole: 'data',
      status: imported > 0 ? 'imported' : 'skipped',
      rowsImported: imported,
      message: `Material Prices: ${imported} inserted, ${failed} failed`,
    });
    if (imported > 0) result.sheetsImported++;
    else result.sheetsSkipped++;
  }

  // ─── Utilities ─────────────────────────────────────────────────────────

  private getPrismaModel(module: string): any {
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
    };
    return map[module] || null;
  }

  private truncateKeys(obj: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      result[k] = typeof v === 'string' && v.length > 80 ? v.substring(0, 80) + '...' : v;
    }
    return result;
  }
}
