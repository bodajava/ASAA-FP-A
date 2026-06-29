import { Logger } from '@nestjs/common';

const logger = new Logger('ImportUtils');

/* ─── Column Alias Maps per Module ─────────────────────────────────── */

export const MODULE_COLUMN_ALIASES: Record<string, Record<string, string[]>> = {
  companies: {
    name: ['name', 'companyname', 'legalname', 'companyname', 'tradingas', 'company_name', 'company name'],
    legalName: ['legalname', 'legal_name', 'legal name', 'registeredname', 'officialname'],
    industryType: ['industrytype', 'industry_type', 'industry type', 'industry', 'sector'],
    fiscalYearStartMonth: ['fiscalyearstartmonth', 'fiscal_year_start_month', 'fiscal year start month', 'fystartmonth', 'startmonth'],
    taxNumber: ['taxnumber', 'tax_number', 'tax number', 'vatnumber', 'vatnumber', 'tin', 'crnumber'],
    currencyCode: ['currencycode', 'currency_code', 'currency code', 'currency', 'ccy'],
  },
  sites: {
    name: ['name', 'sitename', 'site_name', 'site name', 'location', 'org'],
    type: ['type', 'sitetype', 'site_type', 'site type'],
    address: ['address', 'location', 'street', 'cityaddress'],
    status: ['status', 'sitestatus', 'site_status'],
    companyId: ['companycode', 'companyname', 'company_code', 'company_name', 'companyid'],
    region: ['region', 'area', 'district'],
    city: ['city', 'town'],
    country: ['country', 'nation'],
    phone: ['phone', 'telephone', 'tel', 'mobile'],
  },
  units: {
    name: ['name', 'unitname', 'unit_name', 'unit name', 'uomname'],
    symbol: ['symbol', 'code', 'uom', 'unit', 'unitsymbol', 'unit_symbol', 'unit symbol', 'uomcode', 'measure'],
    type: ['type', 'unittype', 'unit_type', 'uomtype'],
    companyId: ['companycode', 'companyname', 'company_code', 'company_name', 'companyid'],
  },
  accounts: {
    code: ['code', 'accountcode', 'account_code', 'account code', 'glcode', 'accountnumber', 'gl_number', 'glno'],
    name: ['name', 'accountname', 'account_name', 'account name', 'title'],
    type: ['type', 'accounttype', 'account_type', 'account type', 'classification'],
    isActive: ['isactive', 'is_active', 'active', 'status'],
    companyId: ['companycode', 'companyname', 'company_code', 'company_name', 'companyid'],
    parentCode: ['parentcode', 'parent_code', 'parent code', 'parent'],
  },
  costcenters: {
    code: ['code', 'costcentercode', 'cost_center_code', 'cost center code', 'cccode', 'cc_code'],
    name: ['name', 'costcentername', 'cost_center_name', 'cost center name', 'ccname'],
    type: ['type', 'costcentertype', 'cost_center_type'],
    siteId: ['sitecode', 'sitename', 'site_code', 'site_name', 'site'],
    companyId: ['companycode', 'companyname', 'company_code', 'company_name', 'companyid'],
  },
  productcategories: {
    name: ['name', 'categoryname', 'category_name', 'category name', 'catname'],
    code: ['code', 'categorycode', 'category_code', 'category code', 'catcode'],
    companyId: ['companycode', 'companyname', 'company_code', 'company_name', 'companyid'],
    parentCategoryName: ['parentcategoryname', 'parent_category_name', 'parent category', 'parentname'],
  },
  customers: {
    code: ['code', 'customercode', 'customer_code', 'customer code', 'clientcode', 'customerid', 'customernumber', 'customer_number'],
    name: ['name', 'customername', 'customer_name', 'customer name', 'clientname', 'company'],
    customerType: ['customertype', 'customer_type', 'customer type', 'type', 'segment'],
    phone: ['phone', 'telephone', 'tel', 'mobile', 'phone1'],
    email: ['email', 'e-mail', 'mail'],
    creditLimit: ['creditlimit', 'credit_limit', 'credit limit', 'credit', 'creditlimitusd'],
    paymentTerms: ['paymentterms', 'payment_terms', 'payment terms', 'terms', 'paymentdays'],
    isActive: ['isactive', 'is_active', 'active', 'status'],
    companyId: ['companycode', 'companyname', 'company_code', 'company_name', 'companyid'],
    region: ['region', 'area', 'city'],
    country: ['country', 'nation'],
    city: ['city', 'town'],
  },
  suppliers: {
    code: ['code', 'suppliercode', 'supplier_code', 'supplier code', 'vendorcode', 'supplierid'],
    name: ['name', 'suppliername', 'supplier_name', 'supplier name', 'vendorname', 'company'],
    phone: ['phone', 'telephone', 'tel', 'mobile'],
    email: ['email', 'e-mail', 'mail'],
    companyId: ['companycode', 'companyname', 'company_code', 'company_name', 'companyid'],
    country: ['country', 'nation'],
    city: ['city', 'town'],
    supplierType: ['suppliertype', 'supplier_type', 'type'],
    isActive: ['isactive', 'is_active', 'active', 'status'],
    leadTimeDays: ['leadtimedays', 'lead_time_days', 'lead time'],
  },
  materials: {
    code: ['code', 'materialcode', 'material_code', 'material code', 'rmcode', 'rawmaterialcode', 'itemcode', 'ingno', 'ing no', 'ing_no'],
    name: ['name', 'materialname', 'material_name', 'material name', 'materialdesc', 'ingdesc', 'ing desc', 'ing_desc', 'description', 'itemdesc'],
    materialType: ['materialtype', 'material_type', 'material type', 'type', 'rmtype'],
    unitId: ['unit', 'uom', 'unitsymbol', 'unit_symbol', 'unit symbol', 'inguom', 'ing uom', 'ing_uom'],
    supplierId: ['suppliercode', 'suppliername', 'supplier_code', 'supplier_name', 'supplier name', 'vendor'],
    purchasePrice: ['purchaseprice', 'purchase_price', 'purchase price', 'price', 'latestprice', 'lastprice', 'cost', 'unitcost', 'costperkg'],
    companyId: ['companycode', 'companyname', 'company_code', 'company_name', 'companyid'],
    safetyStockQty: ['safetystockqty', 'safety_stock_qty', 'minstock', 'minimumstock'],
    isActive: ['isactive', 'is_active', 'active', 'status'],
    reorderPoint: ['reorderpoint', 'reorder_point', 'reorder point'],
  },
  products: {
    sku: ['sku', 'productsku', 'product_sku', 'product sku', 'itemcode', 'productcode', 'barcode', 'code', 'prdno', 'prd no', 'prd_no'],
    name: ['name', 'productname', 'product_name', 'product name', 'itemdesc', 'description', 'prddesc', 'prd desc', 'prd_desc'],
    productType: ['producttype', 'product_type', 'product type', 'type', 'fgtype'],
    categoryId: ['categoryname', 'categorycode', 'category_name', 'category', 'catname', 'major', 'maincategory'],
    unitId: ['unit', 'uom', 'unitsymbol', 'unit_symbol', 'unit symbol', 'prduom', 'prd uom', 'prd_uom'],
    standardCost: ['standardcost', 'standard_cost', 'standard cost', 'stdcost'],
    salePrice: ['saleprice', 'sale_price', 'sale price', 'price', 'sellingprice', 'selling_price', 'unitprice'],
    companyId: ['companycode', 'companyname', 'company_code', 'company_name', 'companyid'],
    isActive: ['isactive', 'is_active', 'active', 'status'],
  },
};

/* ─── Whitelist Fields per Prisma Model ────────────────────────────── */

export const MODEL_FIELD_WHITELIST: Record<string, string[]> = {
  company: ['name', 'legalName', 'industryType', 'currencyCode', 'fiscalYearStartMonth', 'taxNumber', 'companyId'],
  site: ['name', 'type', 'region', 'address', 'city', 'country', 'phone', 'status', 'companyId'],
  unit: ['name', 'symbol', 'companyId'],
  account: ['code', 'name', 'type', 'isActive', 'companyId'],
  costCenter: ['code', 'name', 'type', 'siteId', 'companyId'],
  productCategory: ['name', 'companyId'],
  customer: ['code', 'name', 'customerType', 'region', 'phone', 'email', 'creditLimit', 'paymentTerms', 'isActive', 'companyId', 'country', 'city'],
  supplier: ['name', 'phone', 'email', 'companyId', 'country', 'city', 'supplierType', 'isActive', 'leadTimeDays'],
  material: ['code', 'name', 'materialType', 'unitId', 'supplierId', 'purchasePrice', 'companyId', 'safetyStockQty', 'isActive', 'reorderPoint'],
  product: ['sku', 'name', 'productType', 'categoryId', 'unitId', 'standardCost', 'salePrice', 'companyId', 'isActive'],
  actualImport: ['companyId', 'sourceSystem', 'importType', 'periodFrom', 'periodTo', 'status', 'importedBy'],
  actualLine: ['actualImportId', 'accountId', 'siteId', 'costCenterId', 'productId', 'materialId', 'customerId', 'transactionDate', 'quantity', 'unitPrice', 'amount', 'referenceNo'],
  budgetLine: ['budgetCycleId', 'accountId', 'siteId', 'costCenterId', 'productId', 'materialId', 'customerId', 'periodMonth', 'quantity', 'unitPrice', 'amount', 'notes'],
  forecastLine: ['forecastCycleId', 'accountId', 'siteId', 'costCenterId', 'productId', 'materialId', 'customerId', 'periodMonth', 'quantity', 'unitPrice', 'amount', 'driverType', 'notes'],
  bomRecipe: ['companyId', 'productId', 'version', 'outputQty', 'wastagePct', 'laborCost', 'overheadCost', 'isActive'],
  bomLine: ['bomId', 'materialId', 'qtyPerOutput', 'unitCost', 'wastagePct', 'yieldPct', 'costCategory', 'quantity'],
  exchangeRate: ['companyId', 'fromCurrency', 'toCurrency', 'rate', 'rateDate', 'source', 'createdBy'],
  kpiTarget: ['companyId', 'siteId', 'kpiName', 'kpiCategory', 'fiscalYear', 'periodMonth', 'targetValue', 'unit', 'createdBy'],
  productionPlan: ['companyId', 'siteId', 'productId', 'planSource', 'fiscalYear', 'periodMonth', 'plannedQty', 'actualQty', 'estimatedCost', 'actualCost'],
  promotion: ['companyId', 'name', 'description', 'productId', 'customerId', 'discountPct', 'discountAmt', 'startDate', 'endDate', 'budgetAmt', 'actualCost', 'incrementalRevenue', 'roi', 'isActive', 'createdBy'],
  rawMaterialPrice: ['companyId', 'materialId', 'price', 'priceDate', 'source'],
};

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

/* ─── Normalize Column Name to Field Key ───────────────────────────── */

export function normalizeHeaderToField(header: string, module: string): string | null {
  const normalized = header.toLowerCase().replace(/[\s_-]+/g, '').trim();
  const aliases = MODULE_COLUMN_ALIASES[module];
  if (!aliases) return null;
  for (const [field, fieldAliases] of Object.entries(aliases)) {
    if (fieldAliases.some(a => a.toLowerCase().replace(/[\s_-]+/g, '') === normalized)) {
      return field;
    }
  }
  return null;
}

/* ─── Map Row Data Using Aliases ───────────────────────────────────── */

export function mapRowWithAliases(
  row: Record<string, unknown>,
  module: string,
): Record<string, unknown> {
  const mapped: Record<string, unknown> = {};
  const aliases = MODULE_COLUMN_ALIASES[module];
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

export function coerceValue(value: unknown, field: string, model?: string): unknown {
  if (value === null || value === undefined || value === '') return null;

  const strVal = String(value).trim();

  if (/^(isActive|is_active)$/i.test(field)) {
    if (typeof value === 'boolean') return value;
    return /^(true|yes|1|active)$/i.test(strVal);
  }

  if (/^(quantity|qty|amount|price|cost|rate|total|plannedQty|actualQty|outputQty|targetValue|creditLimit|discountPct|discountAmt|budgetAmt|actualCost|incrementalRevenue|roi|salePrice|standardCost|purchasePrice|unitPrice|fiscalYear|fiscalYearStartMonth|periodMonth|paymentTerms|leadTimeDays|weightKg|plannedQty|actualQty|estimatedCost|actualCost|safetyStockQty|reorderPoint)$/i.test(field)) {
    const cleaned = strVal.replace(/[$€£EGP,\s]/g, '');
    const num = Number(cleaned);
    return isNaN(num) ? null : num;
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
  const validTypes = ['sales', 'expenses', 'production', 'inventory', 'gl', 'cashflow', 'payroll'];
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
  const validSystems = ['excel', 'oracle', 'sap', 'erp', 'pms', 'odoo', 'pos', 'woocommerce', 'manual', 'api', 'custom'];
  if (validSystems.includes(v)) return v;
  return 'excel';
}

/* ─── Generate Missing Required Fields ─────────────────────────────── */

export function generateDefaults(
  data: Record<string, unknown>,
  module: string,
): Record<string, unknown> {
  const result = { ...data };

  switch (module) {
    case 'companies':
      if (!result.name) result.name = result.legalName || 'Company';
      break;
    case 'sites':
      if (!result.name) result.name = result.siteName || result.address || 'Site';
      break;
    case 'units':
      if (!result.name) result.name = result.symbol || 'Unit';
      if (!result.symbol && result.name) result.symbol = String(result.name).substring(0, 3).toUpperCase();
      break;
    case 'accounts':
      if (!result.name && result.code) result.name = `Account ${result.code}`;
      if (!result.type && result.code) result.type = inferAccountType(String(result.code));
      if (!result.type) result.type = 'expense';
      break;
    case 'costcenters':
      if (!result.name && result.code) result.name = `Cost Center ${result.code}`;
      break;
    case 'productcategories':
      if (!result.name) result.name = 'Category';
      break;
    case 'customers':
      if (!result.name && result.code) result.name = `Customer ${result.code}`;
      break;
    case 'suppliers':
      if (!result.name) result.name = 'Supplier';
      break;
    case 'materials':
      if (!result.name && result.code) result.name = `Material ${result.code}`;
      break;
    case 'products':
      if (!result.name && result.sku) result.name = `Product ${result.sku}`;
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

  if (msg.includes('Expected ImportType') || msg.includes('Invalid enum') || msg.includes('Expected Enum')) {
    return {
      friendly: 'The value is not allowed for this field',
      category: 'invalid_enum',
    };
  }

  if (msg.includes('Foreign key constraint failed') || msg.includes('parent') || msg.includes('not found')) {
    if (msg.includes('account')) return { friendly: 'The referenced account was not found', category: 'missing_dependency' };
    if (msg.includes('product')) return { friendly: 'The referenced product was not found', category: 'missing_dependency' };
    if (msg.includes('customer')) return { friendly: 'The referenced customer was not found', category: 'missing_dependency' };
    if (msg.includes('material')) return { friendly: 'The referenced material was not found', category: 'missing_dependency' };
    if (msg.includes('site')) return { friendly: 'The referenced site was not found', category: 'missing_dependency' };
    return { friendly: 'A referenced record was not found', category: 'missing_dependency' };
  }

  if (msg.includes('Unique constraint failed') || msg.includes('Duplicate') || msg.includes('already exists')) {
    return { friendly: 'This record already exists', category: 'duplicate' };
  }

  if (msg.includes('PrismaClientKnownRequestError') || msg.includes('Invalid `prisma')) {
    if (msg.includes('is missing')) {
      const fieldMatch = msg.match(/Argument `(\w+)`/);
      const field = fieldMatch?.[1] || 'field';
      return { friendly: `The row is missing required field: ${field}`, category: 'missing_required' };
    }
    return {
      friendly: 'A database error occurred while saving this row',
      category: 'database_insert_error',
    };
  }

  if (msg.includes('bigint') || msg.includes('BigInt') || msg.includes('Big number')) {
    return {
      friendly: 'A number value exceeded the allowed range',
      category: 'validation_error',
    };
  }

  if (msg.includes('Cannot read properties of undefined') || msg.includes('Cannot read properties of null')) {
    return {
      friendly: 'An unexpected error occurred. Please check the file format.',
      category: 'validation_error',
    };
  }

  return { friendly: msg, category: 'validation_error' };
}

/* ─── Module Title for Display ─────────────────────────────────────── */

export function getModuleTitle(module: string): string {
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
    bomlines: 'BOM Line',
    budgetlines: 'Budget Line',
    forecastlines: 'Forecast Line',
    actuallines: 'Actual Line',
    promotions: 'Promotion',
    rawmaterialprices: 'Raw Material Price',
    productionplans: 'Production Plan',
    kpitargets: 'KPI Target',
    exchangerates: 'Exchange Rate',
    priceList: 'Price List',
    weightpercarton: 'Weight per Carton',
    hrvrates: 'HRV Rates',
    smga: 'S&M G&A',
  };
  return titles[module] || module;
}
