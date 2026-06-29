import { Logger } from '@nestjs/common';

const logger = new Logger('ImportUtils');

/* ─── Column Alias Maps per Module ─────────────────────────────────── */

export const MODULE_COLUMN_ALIASES: Record<string, Record<string, string[]>> = {
  companies: {
    name: [
      'name',
      'companyname',
      'legalname',
      'tradingas',
      'company_name',
      'company name',
      'company',
      'entity',
      'entityname',
      'entity_name',
      'organisationname',
      'organisation_name',
      'organizationname',
      'organization_name',
    ],
    legalName: [
      'legalname',
      'legal_name',
      'legal name',
      'registeredname',
      'registered_name',
      'officialname',
      'official_name',
    ],
    industryType: [
      'industrytype',
      'industry_type',
      'industry type',
      'industry',
      'sector',
    ],
    fiscalYearStartMonth: [
      'fiscalyearstartmonth',
      'fiscal_year_start_month',
      'fiscal year start month',
      'fystartmonth',
      'startmonth',
      'fystart',
    ],
    taxNumber: [
      'taxnumber',
      'tax_number',
      'tax number',
      'vatnumber',
      'vat_number',
      'tin',
      'crnumber',
      'cr_number',
      'commercialregister',
      'commercial_registration',
    ],
    currencyCode: [
      'currencycode',
      'currency_code',
      'currency code',
      'currency',
      'ccy',
    ],
  },
  sites: {
    name: ['name', 'sitename', 'site_name', 'site name', 'site', 'location', 'org', 'organization', 'organisation'],
    type: ['type', 'sitetype', 'site_type', 'site type'],
    address: ['address', 'location', 'street', 'cityaddress', 'address1'],
    status: ['status', 'sitestatus', 'site_status'],
    companyId: [
      'companycode',
      'companyname',
      'company_code',
      'company_name',
      'companyid',
      'company',
    ],
    region: ['region', 'area', 'district', 'zone'],
    city: ['city', 'town', 'municipality'],
    country: ['country', 'nation'],
    phone: ['phone', 'telephone', 'tel', 'mobile', 'phone1'],
  },
  units: {
    name: ['name', 'unitname', 'unit_name', 'unit name', 'unit', 'uomname', 'uom name', 'uom_name'],
    symbol: [
      'symbol',
      'code',
      'uom',
      'unitsymbol',
      'unit_symbol',
      'unit symbol',
      'uomcode',
      'uom_code',
      'measure',
      'abbreviation',
      'abbr',
    ],
    type: ['type', 'unittype', 'unit_type', 'uomtype'],
    companyId: [
      'companycode',
      'companyname',
      'company_code',
      'company_name',
      'companyid',
      'company',
    ],
  },
  accounts: {
    code: [
      'code',
      'accountcode',
      'account_code',
      'account code',
      'glcode',
      'gl_code',
      'accountnumber',
      'account_number',
      'gl_number',
      'glno',
    ],
    name: ['name', 'accountname', 'account_name', 'account name', 'title', 'account'],
    type: [
      'type',
      'accounttype',
      'account_type',
      'account type',
      'classification',
      'accountcategory',
    ],
    isActive: ['isactive', 'is_active', 'active', 'status'],
    companyId: [
      'companycode',
      'companyname',
      'company_code',
      'company_name',
      'companyid',
      'company',
    ],
    parentCode: ['parentcode', 'parent_code', 'parent code', 'parent', 'parentaccount'],
  },
  costcenters: {
    code: [
      'code',
      'costcentercode',
      'cost_center_code',
      'cost center code',
      'cccode',
      'cc_code',
    ],
    name: [
      'name',
      'costcentername',
      'cost_center_name',
      'cost center name',
      'ccname',
      'costcenter',
      'costcenter',
      'department',
      'departmentname',
      'department_name',
    ],
    type: ['type', 'costcentertype', 'cost_center_type'],
    siteId: ['sitecode', 'sitename', 'site_code', 'site_name', 'site'],
    companyId: [
      'companycode',
      'companyname',
      'company_code',
      'company_name',
      'companyid',
      'company',
    ],
  },
  productcategories: {
    name: ['name', 'categoryname', 'category_name', 'category name', 'category', 'catname', 'productcategory', 'product_category'],
    code: ['code', 'categorycode', 'category_code', 'category code', 'catcode'],
    companyId: [
      'companycode',
      'companyname',
      'company_code',
      'company_name',
      'companyid',
      'company',
    ],
    parentCategoryName: [
      'parentcategoryname',
      'parent_category_name',
      'parent category',
      'parentname',
      'parent',
    ],
  },
  customers: {
    code: [
      'code',
      'customercode',
      'customer_code',
      'customer code',
      'clientcode',
      'client_code',
      'customerid',
      'customernumber',
      'customer_number',
      'customer no',
      'customer_no',
      'accountnumber',
    ],
    name: [
      'name',
      'customername',
      'customer_name',
      'customer name',
      'clientname',
      'client_name',
      'company',
    ],
    customerType: [
      'customertype',
      'customer_type',
      'customer type',
      'type',
      'segment',
    ],
    phone: ['phone', 'telephone', 'tel', 'mobile', 'phone1', 'phone2'],
    email: ['email', 'e-mail', 'mail', 'emailaddress'],
    creditLimit: [
      'creditlimit',
      'credit_limit',
      'credit limit',
      'credit',
      'creditlimitusd',
    ],
    paymentTerms: [
      'paymentterms',
      'payment_terms',
      'payment terms',
      'terms',
      'paymentdays',
      'paymentdays',
    ],
    isActive: ['isactive', 'is_active', 'active', 'status'],
    companyId: [
      'companycode',
      'companyname',
      'company_code',
      'company_name',
      'companyid',
      'company',
    ],
    region: ['region', 'area', 'city'],
    country: ['country', 'nation'],
    city: ['city', 'town'],
  },
  suppliers: {
    code: [
      'code',
      'suppliercode',
      'supplier_code',
      'supplier code',
      'vendorcode',
      'vendor_code',
      'supplierid',
    ],
    name: [
      'name',
      'suppliername',
      'supplier_name',
      'supplier name',
      'vendorname',
      'vendor_name',
      'vendor',
      'company',
    ],
    phone: ['phone', 'telephone', 'tel', 'mobile'],
    email: ['email', 'e-mail', 'mail'],
    companyId: [
      'companycode',
      'companyname',
      'company_code',
      'company_name',
      'companyid',
      'company',
    ],
    country: ['country', 'nation'],
    city: ['city', 'town'],
    supplierType: ['suppliertype', 'supplier_type', 'type', 'vendortype'],
    isActive: ['isactive', 'is_active', 'active', 'status'],
    leadTimeDays: ['leadtimedays', 'lead_time_days', 'lead time'],
  },
  materials: {
    code: [
      'code',
      'materialcode',
      'material_code',
      'material code',
      'rmcode',
      'rm_code',
      'rawmaterialcode',
      'raw_material_code',
      'itemcode',
      'item_code',
      'ingno',
      'ing no',
      'ing_no',
    ],
    name: [
      'name',
      'materialname',
      'material_name',
      'material name',
      'materialdesc',
      'material_desc',
      'ingdesc',
      'ing desc',
      'ing_desc',
      'description',
      'itemdesc',
      'item_desc',
    ],
    materialType: [
      'materialtype',
      'material_type',
      'material type',
      'type',
      'rmtype',
    ],
    unitId: [
      'unit',
      'uom',
      'unitsymbol',
      'unit_symbol',
      'unit symbol',
      'inguom',
      'ing uom',
      'ing_uom',
    ],
    supplierId: [
      'suppliercode',
      'suppliername',
      'supplier_code',
      'supplier_name',
      'supplier name',
      'vendor',
    ],
    purchasePrice: [
      'purchaseprice',
      'purchase_price',
      'purchase price',
      'price',
      'latestprice',
      'lastprice',
      'cost',
      'unitcost',
      'costperkg',
      'cost_per_kg',
    ],
    companyId: [
      'companycode',
      'companyname',
      'company_code',
      'company_name',
      'companyid',
      'company',
    ],
    safetyStockQty: [
      'safetystockqty',
      'safety_stock_qty',
      'minstock',
      'minimumstock',
      'minstockqty',
    ],
    isActive: ['isactive', 'is_active', 'active', 'status'],
    reorderPoint: ['reorderpoint', 'reorder_point', 'reorder point'],
  },
  products: {
    sku: [
      'sku',
      'productsku',
      'product_sku',
      'product sku',
      'itemcode',
      'item_code',
      'productcode',
      'product_code',
      'barcode',
      'code',
      'prdno',
      'prd no',
      'prd_no',
      'fgcode',
      'fg_code',
    ],
    name: [
      'name',
      'productname',
      'product_name',
      'product name',
      'itemdesc',
      'item_desc',
      'description',
      'prddesc',
      'prd desc',
      'prd_desc',
      'product',
    ],
    productType: [
      'producttype',
      'product_type',
      'product type',
      'type',
      'fgtype',
    ],
    categoryId: [
      'categoryname',
      'categorycode',
      'category_code',
      'category_name',
      'category',
      'catname',
      'major',
      'maincategory',
      'main_category',
    ],
    unitId: [
      'unit',
      'uom',
      'unitsymbol',
      'unit_symbol',
      'unit symbol',
      'prduom',
      'prd uom',
      'prd_uom',
    ],
    standardCost: ['standardcost', 'standard_cost', 'standard cost', 'stdcost', 'std_cost'],
    salePrice: [
      'saleprice',
      'sale_price',
      'sale price',
      'price',
      'sellingprice',
      'selling_price',
      'unitprice',
      'unit_price',
    ],
    companyId: [
      'companycode',
      'companyname',
      'company_code',
      'company_name',
      'companyid',
      'company',
    ],
    isActive: ['isactive', 'is_active', 'active', 'status'],
  },
  bomrecipes: {
    productSku: ['productsku', 'product_sku', 'product sku', 'sku', 'code', 'product', 'prdno', 'prd no', 'prd_no'],
    version: ['version', 'bomversion', 'bom_version', 'ver'],
    outputQty: ['outputqty', 'output_qty', 'output qty', 'outputquantity'],
    wastagePct: ['wastagepct', 'wastage_pct', 'wastage %', 'wastage', 'wastage_percentage'],
    laborCost: ['laborcost', 'labor_cost', 'labor cost', 'labor'],
    overheadCost: ['overheadcost', 'overhead_cost', 'overhead cost', 'overhead'],
    isActive: ['isactive', 'is_active', 'active', 'status'],
    materialCode: ['materialcode', 'material_code', 'material code', 'material', 'code', 'ingno', 'ing no', 'ing_no'],
    qtyPerOutput: ['qtyperoutput', 'qty_per_output', 'qty per output', 'quantity', 'qty', 'planqty', 'plan qty'],
  },
  bomlines: {
    materialCode: ['materialcode', 'material_code', 'material code', 'material', 'code', 'ingno', 'ing no', 'ing_no'],
    qtyPerOutput: ['qtyperoutput', 'qty_per_output', 'qty per output', 'quantity', 'qty', 'planqty', 'plan qty'],
    unitCost: ['unitcost', 'unit_cost', 'unit cost', 'cost', 'price'],
    wastagePct: ['wastagepct', 'wastage_pct', 'wastage %', 'wastage'],
    yieldPct: ['yieldpct', 'yield_pct', 'yield %', 'yield'],
    costCategory: ['costcategory', 'cost_category', 'category'],
    quantity: ['quantity', 'qty'],
  },
  budgetlines: {
    budgetCycleName: ['budgetcyclename', 'budget_cycle_name', 'budget cycle name', 'budgetcycle', 'budget cycle', 'cycle'],
    fiscalYear: ['fiscalyear', 'fiscal_year', 'fiscal year', 'year'],
    accountCode: ['accountcode', 'account_code', 'account code', 'account', 'glcode', 'gl_code', 'code'],
    siteCode: ['sitecode', 'site_code', 'site code', 'sitename', 'site_name', 'site name', 'site', 'location', 'org', 'organization'],
    costCenterCode: ['costcentercode', 'cost_center_code', 'cost center code', 'costcenter', 'cc', 'cccode'],
    productSku: ['productsku', 'product_sku', 'product sku', 'sku', 'itemcode', 'item_code', 'productcode', 'code', 'product'],
    materialCode: ['materialcode', 'material_code', 'material code', 'material', 'code'],
    customerCode: ['customercode', 'customer_code', 'customer code', 'customer', 'code'],
    periodMonth: ['periodmonth', 'period_month', 'period month', 'month'],
    quantity: ['quantity', 'qty', 'plannedqty', 'planned_qty'],
    unitPrice: ['unitprice', 'unit_price', 'unit price', 'price'],
    amount: ['amount', 'value', 'budgetamt', 'budget_amt'],
    notes: ['notes', 'note', 'description', 'remarks'],
  },
  forecastlines: {
    forecastCycleName: ['forecastcyclename', 'forecast_cycle_name', 'forecast cycle name', 'forecastcycle', 'forecast cycle', 'cycle'],
    fiscalYear: ['fiscalyear', 'fiscal_year', 'fiscal year', 'year'],
    accountCode: ['accountcode', 'account_code', 'account code', 'account', 'glcode', 'gl_code', 'code'],
    siteCode: ['sitecode', 'site_code', 'site code', 'sitename', 'site_name', 'site name', 'site', 'location', 'org', 'organization'],
    costCenterCode: ['costcentercode', 'cost_center_code', 'cost center code', 'costcenter', 'cc', 'cccode'],
    productSku: ['productsku', 'product_sku', 'product sku', 'sku', 'itemcode', 'item_code', 'productcode', 'code', 'product'],
    materialCode: ['materialcode', 'material_code', 'material code', 'material', 'code'],
    customerCode: ['customercode', 'customer_code', 'customer code', 'customer', 'code'],
    periodMonth: ['periodmonth', 'period_month', 'period month', 'month'],
    quantity: ['quantity', 'qty', 'plannedqty', 'planned_qty'],
    unitPrice: ['unitprice', 'unit_price', 'unit price', 'price'],
    amount: ['amount', 'value', 'forecastamt', 'forecast_amt'],
    driverType: ['drivertype', 'driver_type', 'driver type', 'driver'],
    notes: ['notes', 'note', 'description', 'remarks'],
  },
  actuallines: {
    accountCode: ['accountcode', 'account_code', 'account code', 'account', 'glcode', 'gl_code', 'code'],
    siteCode: ['sitecode', 'site_code', 'site code', 'sitename', 'site_name', 'site name', 'site', 'location', 'org', 'organization'],
    costCenterCode: ['costcentercode', 'cost_center_code', 'cost center code', 'costcenter', 'cc', 'cccode'],
    productSku: ['productsku', 'product_sku', 'product sku', 'sku', 'itemcode', 'item_code', 'productcode', 'code', 'product'],
    materialCode: ['materialcode', 'material_code', 'material code', 'material', 'code'],
    customerCode: ['customercode', 'customer_code', 'customer code', 'customer', 'code'],
    transactionDate: ['transactiondate', 'transaction_date', 'transaction date', 'date'],
    quantity: ['quantity', 'qty', 'plannedqty', 'planned_qty'],
    unitPrice: ['unitprice', 'unit_price', 'unit price', 'price'],
    amount: ['amount', 'value', 'actualamt', 'actual_amt'],
    referenceNo: ['referenceno', 'reference_no', 'reference number', 'reference no', 'refno', 'ref no'],
  },
  rawmaterialprices: {
    materialCode: ['materialcode', 'material_code', 'material code', 'material', 'code', 'itemcode', 'item code'],
    price: ['price', 'rate', 'cost', 'latestprice'],
    priceDate: ['pricedate', 'price_date', 'price date', 'effectivedate', 'effective_date', 'effective date', 'date'],
    source: ['source', 'source_system', 'remarks'],
  },
  productionplans: {
    productSku: ['productsku', 'product_sku', 'product sku', 'sku', 'code', 'product'],
    siteCode: ['sitecode', 'site_code', 'site code', 'sitename', 'site_name', 'site name', 'site', 'location', 'org', 'organization'],
    fiscalYear: ['fiscalyear', 'fiscal_year', 'fiscal year', 'year'],
    periodMonth: ['periodmonth', 'period_month', 'period month', 'month'],
    plannedQty: ['plannedqty', 'planned_qty', 'planned qty', 'planqty', 'plan qty'],
    actualQty: ['actualqty', 'actual_qty', 'actual qty', 'actualquantity'],
    status: ['status', 'planstatus', 'plan_status'],
  },
  exchangerates: {
    fromCurrency: ['fromcurrency', 'from_currency', 'from currency', 'from', 'sourcecurrency'],
    toCurrency: ['tocurrency', 'to_currency', 'to currency', 'to', 'targetcurrency'],
    rate: ['rate', 'exchangerate', 'exchange_rate', 'value'],
    rateDate: ['ratedate', 'rate_date', 'rate date', 'date', 'effectivedate'],
    source: ['source', 'ratesource', 'remarks'],
  },
  kpitargets: {
    kpiName: ['kpiname', 'kpi_name', 'kpi name', 'kpi'],
    kpiCategory: ['kpicategory', 'kpi_category', 'kpi category', 'category'],
    fiscalYear: ['fiscalyear', 'fiscal_year', 'fiscal year', 'year'],
    periodMonth: ['periodmonth', 'period_month', 'period month', 'month'],
    targetValue: ['targetvalue', 'target_value', 'target value', 'target'],
    unit: ['unit', 'kpiunit', 'kpi_unit', 'uom'],
    siteCode: ['sitecode', 'site_code', 'site code', 'sitename', 'site_name', 'site name', 'site', 'location', 'org', 'organization'],
  },
  promotions: {
    name: ['name', 'promotionname', 'promotion_name', 'promotion name', 'title'],
    description: ['description', 'desc', 'promo_desc'],
    productSku: ['productsku', 'product_sku', 'product sku', 'sku', 'product'],
    customerCode: ['customercode', 'customer_code', 'customer code', 'customer'],
    discountPct: ['discountpct', 'discount_pct', 'discount %', 'discountpercentage'],
    discountAmt: ['discountamt', 'discount_amt', 'discountamount', 'discount_amount'],
    startDate: ['startdate', 'start_date', 'start date', 'from'],
    endDate: ['enddate', 'end_date', 'end date', 'to'],
    budgetAmt: ['budgetamt', 'budget_amt', 'budgetamount', 'budget'],
    actualCost: ['actualcost', 'actual_cost', 'actualcostamt'],
    incrementalRevenue: ['incrementalrevenue', 'incremental_revenue', 'incremental revenue'],
    roi: ['roi', 'returnoninvestment'],
    isActive: ['isactive', 'is_active', 'active', 'status'],
  },
};

/* ─── Whitelist Fields per Prisma Model ────────────────────────────── */

export const MODEL_FIELD_WHITELIST: Record<string, string[]> = {
  company: [
    'name',
    'legalName',
    'industryType',
    'currencyCode',
    'fiscalYearStartMonth',
    'taxNumber',
  ],
  site: [
    'name',
    'type',
    'region',
    'address',
    'city',
    'country',
    'phone',
    'status',
    'companyId',
  ],
  unit: ['name', 'symbol', 'companyId'],
  account: ['code', 'name', 'type', 'isActive', 'companyId'],
  costCenter: ['code', 'name', 'type', 'siteId', 'companyId'],
  productCategory: ['name', 'companyId'],
  customer: [
    'code',
    'name',
    'customerType',
    'region',
    'phone',
    'email',
    'creditLimit',
    'paymentTerms',
    'isActive',
    'companyId',
    'country',
    'city',
  ],
  supplier: [
    'name',
    'phone',
    'email',
    'companyId',
  ],
  material: [
    'code',
    'name',
    'materialType',
    'unitId',
    'supplierId',
    'purchasePrice',
    'companyId',
    'safetyStockQty',
    'isActive',
  ],
  product: [
    'sku',
    'name',
    'productType',
    'categoryId',
    'unitId',
    'standardCost',
    'salePrice',
    'companyId',
    'isActive',
  ],
  actualImport: [
    'companyId',
    'sourceSystem',
    'importType',
    'periodFrom',
    'periodTo',
    'status',
    'importedBy',
  ],
  actualLine: [
    'actualImportId',
    'accountId',
    'siteId',
    'costCenterId',
    'productId',
    'materialId',
    'customerId',
    'transactionDate',
    'quantity',
    'unitPrice',
    'amount',
    'referenceNo',
  ],
  budgetLine: [
    'budgetCycleId',
    'accountId',
    'siteId',
    'costCenterId',
    'productId',
    'materialId',
    'customerId',
    'periodMonth',
    'quantity',
    'unitPrice',
    'amount',
    'notes',
  ],
  forecastLine: [
    'forecastCycleId',
    'accountId',
    'siteId',
    'costCenterId',
    'productId',
    'materialId',
    'customerId',
    'periodMonth',
    'quantity',
    'unitPrice',
    'amount',
    'driverType',
    'notes',
  ],
  bomRecipe: [
    'companyId',
    'productId',
    'version',
    'outputQty',
    'wastagePct',
    'laborCost',
    'overheadCost',
    'isActive',
  ],
  bomLine: [
    'bomId',
    'materialId',
    'qtyPerOutput',
    'unitCost',
    'wastagePct',
    'yieldPct',
    'costCategory',
    'quantity',
  ],
  exchangeRate: [
    'companyId',
    'fromCurrency',
    'toCurrency',
    'rate',
    'rateDate',
    'source',
    'createdBy',
  ],
  kpiTarget: [
    'companyId',
    'siteId',
    'kpiName',
    'kpiCategory',
    'fiscalYear',
    'periodMonth',
    'targetValue',
    'unit',
    'createdBy',
  ],
  productionPlan: [
    'companyId',
    'siteId',
    'productId',
    'planSource',
    'fiscalYear',
    'periodMonth',
    'plannedQty',
    'actualQty',
    'estimatedCost',
    'actualCost',
  ],
  promotion: [
    'companyId',
    'name',
    'description',
    'productId',
    'customerId',
    'discountPct',
    'discountAmt',
    'startDate',
    'endDate',
    'budgetAmt',
    'actualCost',
    'incrementalRevenue',
    'roi',
    'isActive',
    'createdBy',
  ],
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

export function normalizeHeaderToField(
  header: string,
  module: string,
): string | null {
  const normalized = header
    .toLowerCase()
    .replace(/[\s_-]+/g, '')
    .trim();
  const aliases = MODULE_COLUMN_ALIASES[module];
  if (!aliases) return null;

  // First pass: exact alias match
  for (const [field, fieldAliases] of Object.entries(aliases)) {
    if (
      fieldAliases.some(
        (a) => a.toLowerCase().replace(/[\s_-]+/g, '') === normalized,
      )
    ) {
      return field;
    }
  }

  // Second pass: if header contains "name" or "code" as a word, try fuzzy matching
  const headerLower = header.toLowerCase().trim();
  if (/\bname\b/.test(headerLower)) {
    if (aliases['name']) return 'name';
  }
  if (/\bcode\b/.test(headerLower)) {
    if (aliases['code']) return 'code';
  }
  if (/\bdescription\b/.test(headerLower) || /\bdesc\b/.test(headerLower)) {
    if (aliases['name']) return 'name';
  }
  if (/\bsku\b/.test(headerLower)) {
    if (aliases['sku']) return 'sku';
  }
  if (/\btype\b/.test(headerLower)) {
    if (aliases['type']) return 'type';
  }
  if (/\bphone\b/.test(headerLower) || /\btel\b/.test(headerLower)) {
    if (aliases['phone']) return 'phone';
  }
  if (/\bemail\b/.test(headerLower) || /\bmail\b/.test(headerLower)) {
    if (aliases['email']) return 'email';
  }
  if (/\bdate\b/.test(headerLower)) {
    if (aliases['date']) return 'date';
  }
  if (/\baddress\b/.test(headerLower)) {
    if (aliases['address']) return 'address';
  }
  if (/\bstatus\b/.test(headerLower) || /\bactive\b/.test(headerLower)) {
    if (aliases['isActive']) return 'isActive';
  }
  if (/\bprice\b/.test(headerLower) || /\bcost\b/.test(headerLower)) {
    if (aliases['purchasePrice']) return 'purchasePrice';
    if (aliases['salePrice']) return 'salePrice';
    if (aliases['standardCost']) return 'standardCost';
    if (aliases['price']) return 'price';
  }
  if (/\bcurrency\b/.test(headerLower)) {
    if (aliases['currencyCode']) return 'currencyCode';
  }
  if (/\bcountry\b/.test(headerLower)) {
    if (aliases['country']) return 'country';
  }
  if (/\bcity\b/.test(headerLower) || /\btown\b/.test(headerLower)) {
    if (aliases['city']) return 'city';
  }
  if (/\bregion\b/.test(headerLower) || /\bdistrict\b/.test(headerLower)) {
    if (aliases['region']) return 'region';
  }
  if (/\buom\b/.test(headerLower) || /\bunit\b/.test(headerLower)) {
    if (aliases['symbol']) return 'symbol';
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
  // Case-insensitive search as last resort
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

export function coerceValue(
  value: unknown,
  field: string,
  model?: string,
): unknown {
  if (value === null || value === undefined || value === '') return null;

  const strVal = String(value).trim();

  if (/^(isActive|is_active)$/i.test(field)) {
    if (typeof value === 'boolean') return value;
    return /^(true|yes|1|active)$/i.test(strVal);
  }

  if (
    /^(quantity|qty|amount|price|cost|rate|total|plannedQty|actualQty|outputQty|targetValue|creditLimit|discountPct|discountAmt|budgetAmt|actualCost|incrementalRevenue|roi|salePrice|standardCost|purchasePrice|unitPrice|fiscalYear|fiscalYearStartMonth|periodMonth|paymentTerms|leadTimeDays|weightKg|plannedQty|actualQty|estimatedCost|actualCost|safetyStockQty|reorderPoint)$/i.test(
      field,
    )
  ) {
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

  if (field === 'customerType' || field === 'customer_type') {
    const v = strVal.toLowerCase().replace(/[\s-]+/g, '_');
    const valid = ['retail', 'wholesale', 'distributor', 'internal', 'other'];
    return valid.includes(v) ? v : 'retail';
  }

  if (field === 'productType' || field === 'product_type') {
    const v = strVal.toLowerCase().replace(/[\s-]+/g, '_');
    const valid = ['raw_material', 'finished_good', 'semi_finished', 'service', 'other'];
    return valid.includes(v) ? v : 'finished_good';
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

  switch (module) {
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
    case 'costcenters':
      if (!result.name) result.name = result.code ? `Cost Center ${result.code}` : `Cost Center${numSuffix || ' Row'}`;
      break;
    case 'productcategories':
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
