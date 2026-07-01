import { Logger } from '@nestjs/common';
import {
  getAllDefinitions,
  getDefinition,
  resolveModuleKey,
} from '../imports/import-definitions';

const logger = new Logger('ImportUtils');

/* ─── Column Alias Maps (built from import-definitions.ts) ─────────── */

export const MODULE_COLUMN_ALIASES: Record<string, Record<string, string[]>> =
  buildAliasMap();

function buildAliasMap(): Record<string, Record<string, string[]>> {
  const map: Record<string, Record<string, string[]>> = {};
  for (const def of getAllDefinitions()) {
    const colMap: Record<string, string[]> = {};
    for (const col of def.columns) {
      colMap[col.field] = [...col.aliases, col.field, col.display];
    }
    map[def.moduleKey] = colMap;
  }
  return map;
}

/* ─── Whitelist Fields per Prisma Model (built from definitions) ──── */

export const MODEL_FIELD_WHITELIST: Record<string, string[]> =
  buildWhitelist();

function buildWhitelist(): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  for (const def of getAllDefinitions()) {
    map[def.prismaModel] = def.columns.map((c) => c.prismaField ?? c.field);
  }
  return map;
}

/* ─── Account Type Inference from Code ─────────────────────────────── */

export function inferAccountType(code: string): string {
  if (!code) return 'expense';
  const num = parseInt(code, 10);
  if (isNaN(num)) return 'expense';
  if (num >= 4000 && num < 5000) return 'revenue';
  if (num >= 5000 && num < 6000) return 'cogs';
  if (num >= 6000 && num < 7000) return 'expense';
  if (num >= 1000 && num < 2000) return 'asset';
  if (num >= 2000 && num < 3000) return 'liability';
  if (num >= 3000 && num < 4000) return 'equity';
  return 'expense';
}

/* ─── Resolve keys with backward compatibility ─────────────────────── */

function resolve(mod: string): string | undefined {
  return resolveModuleKey(mod) ?? (getDefinition(mod) ? mod : undefined);
}

/* ─── Normalize Column Name to Field Key ───────────────────────────── */

export function normalizeHeaderToField(
  header: string,
  module: string,
): string | null {
  const normalized = header
    .toLowerCase()
    .replace(/[\s_-]+/g, '')
    .trim();
  const resolved = resolve(module);
  if (!resolved) return null;
  const def = getDefinition(resolved);
  if (!def) return null;

  const aliases = MODULE_COLUMN_ALIASES[resolved];
  if (!aliases) return null;

  for (const [field, fieldAliases] of Object.entries(aliases)) {
    if (
      fieldAliases.some(
        (a) => a.toLowerCase().replace(/[\s_-]+/g, '') === normalized,
      )
    ) {
      return field;
    }
  }

  const headerLower = header.toLowerCase().trim();
  if (/\bname\b/.test(headerLower) && aliases['name']) return 'name';
  if (/\bcode\b/.test(headerLower) && aliases['code']) return 'code';
  if (
    (/\bdescription\b/.test(headerLower) || /\bdesc\b/.test(headerLower)) &&
    aliases['name']
  )
    return 'name';
  if (/\bsku\b/.test(headerLower) && aliases['sku']) return 'sku';
  if (/\btype\b/.test(headerLower) && aliases['type']) return 'type';
  if (
    (/\bphone\b/.test(headerLower) || /\btel\b/.test(headerLower)) &&
    aliases['phone']
  )
    return 'phone';
  if (
    (/\bemail\b/.test(headerLower) || /\bmail\b/.test(headerLower)) &&
    aliases['email']
  )
    return 'email';
  if (
    (/\bdate\b/.test(headerLower)) &&
    aliases['date']
  )
    return 'date';
  if (
    (/\baddress\b/.test(headerLower)) &&
    aliases['address']
  )
    return 'address';
  if (
    (/\bstatus\b/.test(headerLower) || /\bactive\b/.test(headerLower)) &&
    aliases['isActive']
  )
    return 'isActive';
  if (
    (/\bprice\b/.test(headerLower) || /\bcost\b/.test(headerLower))
  ) {
    if (aliases['purchasePrice']) return 'purchasePrice';
    if (aliases['salePrice']) return 'salePrice';
    if (aliases['standardCost']) return 'standardCost';
    if (aliases['price']) return 'price';
  }
  if (/\bcurrency\b/.test(headerLower) && aliases['currencyCode']) return 'currencyCode';
  if (/\bcountry\b/.test(headerLower) && aliases['country']) return 'country';
  if (
    (/\bcity\b/.test(headerLower) || /\btown\b/.test(headerLower)) &&
    aliases['city']
  )
    return 'city';
  if (
    (/\bregion\b/.test(headerLower) || /\bdistrict\b/.test(headerLower)) &&
    aliases['region']
  )
    return 'region';
  if (
    (/\buom\b/.test(headerLower) || /\bunit\b/.test(headerLower))
  ) {
    if (aliases['symbol']) return 'symbol';
    if (aliases['unitSymbol']) return 'unitSymbol';
    if (aliases['unitId']) return 'unitId';
  }

  return null;
}

export function findOriginalRowValue(
  row: Record<string, unknown>,
  ...possibleKeys: string[]
): unknown {
  for (const key of possibleKeys) {
    if (row[key] !== null && row[key] !== undefined && row[key] !== '') {
      return row[key];
    }
  }
  const lowerMap = new Map<string, unknown>();
  for (const k of Object.keys(row)) {
    lowerMap.set(k.toLowerCase().replace(/[\s_-]+/g, ''), row[k]);
  }
  for (const key of possibleKeys) {
    const normalized = key.toLowerCase().replace(/[\s_-]+/g, '');
    if (lowerMap.has(normalized)) {
      return lowerMap.get(normalized);
    }
  }
  return undefined;
}

/* ─── Map Row Data Using Aliases ───────────────────────────────────── */

export function mapRowWithAliases(
  row: Record<string, unknown>,
  module: string,
): Record<string, unknown> {
  const mapped: Record<string, unknown> = {};
  const resolved = resolve(module);
  const aliases = resolved ? MODULE_COLUMN_ALIASES[resolved] : undefined;
  if (!aliases) return { ...row };

  const processedFields = new Set<string>();

  for (const [excelCol, value] of Object.entries(row)) {
    if (value === null || value === undefined || value === '') continue;
    const fieldKey = normalizeHeaderToField(excelCol, module);
    if (fieldKey) {
      mapped[fieldKey] = value;
      processedFields.add(fieldKey);
    }
  }

  return mapped;
}

/* ─── Whitelist Fields ─────────────────────────────────────────────── */

export function whitelistFields(
  data: Record<string, unknown>,
  modelName: string,
): Record<string, unknown> {
  const allowed = MODEL_FIELD_WHITELIST[modelName];
  if (!allowed) return { ...data };
  const cleaned: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in data) {
      cleaned[key] = data[key];
    }
  }
  return cleaned;
}

/* ─── Coerce Values to Proper Types ────────────────────────────────── */

/* NOTE: coerceValue uses the column definition from import-definitions.ts
 * when a module is specified. Without a module, it falls back to heuristics. */
export function coerceValue(
  value: unknown,
  field: string,
  model?: string,
  module?: string,
): unknown {
  if (value === null || value === undefined || value === '') return null;

  const strVal = String(value).trim();

  if (/^(isActive|is_active)$/i.test(field)) {
    if (typeof value === 'boolean') return value;
    return /^(true|yes|1|active)$/i.test(strVal);
  }

  if (
    /^(quantity|qty|amount|price|cost|rate|total|plannedQty|actualQty|outputQty|targetValue|creditLimit|discountPct|discountAmt|budgetAmt|actualCost|incrementalRevenue|roi|salePrice|standardCost|purchasePrice|unitPrice|fiscalYear|fiscalYearStartMonth|periodMonth|leadTimeDays|weightKg|estimatedCost|actualCost|safetyStockQty|reorderPoint)$/i.test(
      field,
    )
  ) {
    const cleaned = strVal.replace(/[$€£EGP,\s]/g, '');
    const num = Number(cleaned);
    return isNaN(num) ? null : num;
  }

  if (field === 'paymentTerms' || field === 'payment_terms') {
    const cleaned = strVal.replace(/[$€£EGP,\s]/g, '').replace(/days/gi, '').trim();
    const num = Number(cleaned);
    return isNaN(num) ? 30 : num;
  }

  if (/date|period|createdAt|updatedAt/i.test(field)) {
    if (value instanceof Date) return value;
    if (typeof value === 'number') {
      const excelEpoch = new Date(1899, 11, 30);
      return new Date(excelEpoch.getTime() + value * 86400000);
    }
    const d = new Date(strVal);
    if (!isNaN(d.getTime())) return d;
    return strVal;
  }

  if (field === 'customerType' || field === 'customer_type') {
    const v = strVal.toLowerCase().replace(/[\s-]+/g, '_');
    if (v === 'retailer' || v === 'retail' || v === 'b2c') return 'retail';
    if (v === 'distributor' || v === 'distributer' || v === 'wholesale' || v === 'wholesaler' || v === 'b2b') return 'distributor';
    const valid = ['retail', 'wholesale', 'distributor', 'internal', 'other'];
    return valid.includes(v) ? v : 'retail';
  }

  if (field === 'productType' || field === 'product_type') {
    const v = strVal.toLowerCase().replace(/[\s-]+/g, '_');
    const valid = ['raw_material', 'finished_good', 'semi_finished', 'service', 'other'];
    return valid.includes(v) ? v : 'finished_good';
  }

  if (field === 'industryType' || field === 'industry_type') {
    const v = strVal.toLowerCase().replace(/[\s-]+/g, '_');
    const valid = ['food_manufacturing', 'food_retail', 'mixed', 'other'];
    return valid.includes(v) ? v : 'other';
  }

  if (field === 'materialType' || field === 'material_type') {
    const v = strVal.toLowerCase().replace(/[\s-]+/g, '_');
    const valid = ['raw_material', 'packaging', 'operating_supply', 'spare_part', 'other'];
    return valid.includes(v) ? v : 'raw_material';
  }

  if (field === 'costCenterType' || (field === 'type' && model === 'costCenter')) {
    const v = strVal.toLowerCase().replace(/[\s-]+/g, '_');
    const valid = ['production', 'service', 'support', 'admin', 'sales', 'other'];
    return valid.includes(v) ? v : 'production';
  }

  if (field === 'siteType' || (field === 'type' && model === 'site')) {
    const v = strVal.toLowerCase().replace(/[\s-]+/g, '_');
    const valid = ['factory', 'warehouse', 'office', 'store', 'branch', 'other'];
    return valid.includes(v) ? v : 'factory';
  }

  if (field === 'driverType' || field === 'driver_type') {
    const v = strVal.toLowerCase().replace(/[\s-]+/g, '_');
    const valid = ['sales_volume', 'production_volume', 'headcount', 'square_meters', 'machine_hours', 'direct_labor_hours', 'manual', 'other'];
    return valid.includes(v) ? v : 'manual';
  }

  if (field === 'rateSource' || field === 'source') {
    const v = strVal.toLowerCase().replace(/[\s-]+/g, '_');
    const valid = ['manual', 'api', 'import'];
    return valid.includes(v) ? v : 'import';
  }

  if (field === 'importType') {
    return normalizeImportType(strVal);
  }

  if (field === 'sourceSystem') {
    return normalizeSourceSystem(strVal);
  }

  return strVal;
}

/* ─── Normalize ImportType Enum ────────────────────────────────────── */

export function normalizeImportType(raw: string): string {
  const v = String(raw).toLowerCase().trim();
  const validTypes = [
    'sales',
    'expenses',
    'production',
    'inventory',
    'gl',
    'cashflow',
    'payroll',
  ];
  if (validTypes.includes(v)) return v;
  if (/sale|revenue|actual|real/i.test(v)) return 'sales';
  if (/expense|cost|purchase|sm|g&a|sg&a|overhead/i.test(v)) return 'expenses';
  if (/prod(uction)?|manufactur/i.test(v)) return 'production';
  if (/inventor|stock/i.test(v)) return 'inventory';
  if (/gl|general.?ledger/i.test(v)) return 'gl';
  if (/cash|flow/i.test(v)) return 'cashflow';
  if (/payroll|salary|wage/i.test(v)) return 'payroll';
  return 'sales';
}

/* ─── Normalize SourceSystem Enum ──────────────────────────────────── */

export function normalizeSourceSystem(raw: string): string {
  const v = String(raw).toLowerCase().trim();
  const validSystems = [
    'excel',
    'oracle',
    'sap',
    'erp',
    'pms',
    'odoo',
    'pos',
    'woocommerce',
    'manual',
    'api',
    'custom',
  ];
  if (validSystems.includes(v)) return v;
  return 'excel';
}

/* ─── Generate Missing Required Fields ─────────────────────────────── */

export function generateDefaults(
  data: Record<string, unknown>,
  module: string,
  rowNumber?: number,
): Record<string, unknown> {
  const result = { ...data };
  const numSuffix = rowNumber !== undefined ? ` Row ${rowNumber}` : '';
  const resolved = resolve(module) ?? module;

  switch (resolved) {
    case 'companies':
      if (!result.name) result.name = result.legalName || 'Imported Company';
      break;
    case 'sites':
      if (!result.name)
        result.name = result.siteName || result.address || `Site${numSuffix || ' Row'}`;
      break;
    case 'units':
      if (!result.name) result.name = result.symbol || `Unit${numSuffix || ' Row'}`;
      if (!result.symbol && result.name)
        result.symbol = String(result.name).substring(0, 3).toUpperCase();
      break;
    case 'accounts':
      if (!result.name) result.name = result.code ? `Account ${result.code}` : `Account${numSuffix || ' Row'}`;
      if (!result.type && result.code)
        result.type = inferAccountType(String(result.code));
      if (!result.type) result.type = 'expense';
      break;
    case 'cost-centers':
      if (!result.name) result.name = result.code ? `Cost Center ${result.code}` : `Cost Center${numSuffix || ' Row'}`;
      break;
    case 'product-categories':
      if (!result.name) result.name = `Category${numSuffix || ' Row'}`;
      break;
    case 'customers':
      if (!result.name) result.name = result.code ? `Customer ${result.code}` : `Customer${numSuffix || ' Row'}`;
      break;
    case 'suppliers':
      if (!result.name) result.name = `Supplier${numSuffix || ' Row'}`;
      break;
    case 'materials':
      if (!result.name) result.name = result.code ? `Material ${result.code}` : `Material${numSuffix || ' Row'}`;
      break;
    case 'products':
      if (!result.name) result.name = result.sku ? `Product ${result.sku}` : `Product${numSuffix || ' Row'}`;
      break;
    case 'promotions': {
      if (!result.name) {
        const sku = result.productSku || result.productName || 'Product';
        const cust = result.customerCode || result.customerName || 'Customer';
        result.name = `${sku} discount - ${cust}`;
      }
      break;
    }
  }

  return result;
}

/* ─── Normalize Import Error ───────────────────────────────────────── */

export function normalizeImportError(
  error: unknown,
  context?: { module?: string; row?: number; sheet?: string },
): { friendly: string; category: string } {
  const msg = error instanceof Error ? error.message : String(error);

  if (msg.includes('Argument') && msg.includes('missing')) {
    const fieldMatch = msg.match(/Argument `(\w+)`/);
    const field = fieldMatch?.[1] || 'field';
    return {
      friendly: `The row is missing required field: ${field}`,
      category: 'missing_required',
    };
  }

  if (
    msg.includes('Expected ImportType') ||
    msg.includes('Invalid enum') ||
    msg.includes('Expected Enum')
  ) {
    return {
      friendly: 'The value is not allowed for this field',
      category: 'invalid_enum',
    };
  }

  if (
    msg.includes('Foreign key constraint failed') ||
    msg.includes('parent') ||
    msg.includes('not found')
  ) {
    if (msg.includes('account'))
      return {
        friendly: 'The referenced account was not found',
        category: 'missing_dependency',
      };
    if (msg.includes('product'))
      return {
        friendly: 'The referenced product was not found',
        category: 'missing_dependency',
      };
    if (msg.includes('customer'))
      return {
        friendly: 'The referenced customer was not found',
        category: 'missing_dependency',
      };
    if (msg.includes('material'))
      return {
        friendly: 'The referenced material was not found',
        category: 'missing_dependency',
      };
    if (msg.includes('site'))
      return {
        friendly: 'The referenced site was not found',
        category: 'missing_dependency',
      };
    return {
      friendly: 'A referenced record was not found',
      category: 'missing_dependency',
    };
  }

  if (
    msg.includes('Unique constraint failed') ||
    msg.includes('Duplicate') ||
    msg.includes('already exists')
  ) {
    return { friendly: 'This record already exists', category: 'duplicate' };
  }

  if (
    msg.includes('PrismaClientKnownRequestError') ||
    msg.includes('PrismaClientValidationError') ||
    msg.includes('Invalid `prisma')
  ) {
    if (msg.includes('is missing')) {
      const fieldMatch = msg.match(/Argument `(\w+)`/);
      const field = fieldMatch?.[1] || 'field';
      return {
        friendly: `The row is missing required field: ${field}`,
        category: 'missing_required',
      };
    }
    if (msg.includes('Invalid enum value') || msg.includes('Expected ')) {
      return {
        friendly: 'The value is not allowed for this field',
        category: 'invalid_enum',
      };
    }
    if (msg.includes('Expected Int') || msg.includes('Expected Float') || msg.includes('Expected Boolean')) {
      return {
        friendly: 'A numeric value was entered as text. Please check the cell format.',
        category: 'validation_error',
      };
    }
    return {
      friendly: 'A database error occurred while saving this row',
      category: 'database_insert_error',
    };
  }

  if (
    msg.includes('bigint') ||
    msg.includes('BigInt') ||
    msg.includes('Big number')
  ) {
    return {
      friendly: 'A number value exceeded the allowed range',
      category: 'validation_error',
    };
  }

  if (
    msg.includes('Cannot read properties of undefined') ||
    msg.includes('Cannot read properties of null')
  ) {
    return {
      friendly: 'An unexpected error occurred. Please check the file format.',
      category: 'validation_error',
    };
  }

  return { friendly: msg, category: 'validation_error' };
}

/* ─── Module Title for Display ─────────────────────────────────────── */

export function getModuleTitle(module: string): string {
  const resolved = resolve(module);
  if (resolved) {
    const def = getDefinition(resolved);
    if (def) return def.displayName;
  }
  const titles: Record<string, string> = {
    companies: 'Company',
    sites: 'Site',
    units: 'Unit',
    accounts: 'Account',
    costcenters: 'Cost Center',
    productcategories: 'Product Category',
    customers: 'Customer',
    suppliers: 'Supplier',
    materials: 'Material',
    products: 'Product',
    bomrecipes: 'BOM Recipe',
    budgetlines: 'Budget Line',
    forecastlines: 'Forecast Line',
    actuallines: 'Actual Line',
    promotions: 'Promotion',
    rawmaterialprices: 'Raw Material Price',
    productionplans: 'Production Plan',
    kpitargets: 'KPI Target',
    exchangerates: 'Exchange Rate',
  };
  return titles[module] || module;
}
