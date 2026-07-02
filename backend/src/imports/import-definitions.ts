/**
 * ───────────────────────────────────────────────────────────────────────────────
 * SINGLE SOURCE OF TRUTH: Import Definitions
 *
 * Every aspect of every module's import behavior is defined ONCE here.
 *
 * From these definitions, the system generates:
 *   • Simple Templates (XLSX / CSV)
 *   • Validation rules
 *   • DTO mapping (friendly headers → internal fields)
 *   • FK lookups & resolution
 *   • Prisma CREATE payloads
 *   • Error messages
 *   • Column alias maps
 *   • Import order & dependency graph
 *   • Sample data
 *   • Count queries for verification
 *
 * If Prisma changes → edit ONE definition. Everything auto-updates.
 * ───────────────────────────────────────────────────────────────────────────────
 */
import type { Prisma } from '@prisma/client';

/* ==============================================================================
   Types
   ============================================================================== */

export type ColumnDataType = 'string' | 'number' | 'date' | 'boolean' | 'enum';

export type CommitStrategy =
  | 'insert'        // Simple Prisma create
  | 'insert-child'  // Create parent (find-or-create) + child rows
  | 'update'        // Update existing records only
  | 'upsert';       // Create or update by unique constraint

export interface FkLookupDef {
  /** Prisma model name used for findFirst (e.g. 'account') */
  model: string;
  /** Fields on the target model used for searching (e.g. ['code','name']) */
  lookupFields: string[];
  /** Prisma field on the created record to assign the resolved ID to (e.g. 'accountId') */
  assignField: string;
  /** Display label for error messages */
  label: string;
}

export interface ImportColumnDef {
  /** Internal field key used in normalized row data */
  field: string;
  /** Header displayed in the Excel/CSV template */
  display: string;
  /** Data type */
  type: ColumnDataType;
  /** Whether the column must be present and non-empty */
  required: boolean;
  /** Description shown in tooltips / error messages */
  description: string;

  /** Alternative header names accepted during import (for header matching) */
  aliases: string[];

  /** Allowed values for enum-type columns (must match Prisma enum values exactly) */
  allowedValues?: string[];

  /** Foreign key lookup configuration */
  fkLookup?: FkLookupDef;

  /** Default value applied when the field is empty */
  defaultValue?: unknown;

  /** Prisma create field name when it differs from `field` */
  prismaField?: string;
}

export interface ImportDefinition {
  /** Canonical module key (kebab-case for frontend URLs, camelCase for internal) */
  moduleKey: string;
  /** Human-readable display name */
  displayName: string;
  /** Short description of the module */
  description: string;
  /** Entity label used in import UI titles */
  entityLabel: string;

  /* ── Database mapping ──────────────────────────────────────────────────── */
  /** Prisma model name (lowercase, matches Prisma client) */
  prismaModel: string;
  /** Database table name */ 
  dbTable: string;
  /** Whether companyId FK is required on this model */
  hasCompanyId: boolean;

  /* ── API / UI ──────────────────────────────────────────────────────────── */
  /** REST API endpoint (without base path) */
  endpoint: string;
  /** Frontend page route segment */
  page?: string;

  /* ── Columns ──────────────────────────────────────────────────────────── */
  columns: ImportColumnDef[];

  /* ── Import order & dependencies ──────────────────────────────────────── */
  /** Order priority (lower = imported first) */
  importOrder: number;
  /** Module keys that must be imported before this one */
  dependencies: string[];

  /* ── Commit behavior ──────────────────────────────────────────────────── */
  strategy: CommitStrategy;
  /** If true, records are updated in-place rather than inserted (see yieldwaste) */
  updateOnly: boolean;

  /* ── Template sample data ──────────────────────────────────────────────── */
  /** Example rows in the same order as columns. Each outer array = one row */
  sampleRows: string[][];

  /* ── Count query (for import verification) ────────────────────────────── */
  /** Returns a count of records for the given company */
  countQuery: string;
}

/* ==============================================================================
   Registry Helper
   ============================================================================== */

const REGISTRY = new Map<string, ImportDefinition>();

export function register(def: ImportDefinition): ImportDefinition {
  if (REGISTRY.has(def.moduleKey)) {
    throw new Error(`Duplicate module registration: ${def.moduleKey}`);
  }
  REGISTRY.set(def.moduleKey, def);
  return def;
}

export function getDefinition(moduleKey: string): ImportDefinition | undefined {
  return REGISTRY.get(moduleKey);
}

export function getAllDefinitions(): ImportDefinition[] {
  return Array.from(REGISTRY.values()).sort((a, b) => a.importOrder - b.importOrder);
}

export function getDependencyOrdered(): ImportDefinition[] {
  const defs = getAllDefinitions();
  // Simple topological sort by importOrder (definitions are already ordered)
  return defs;
}

/* ==============================================================================
   Master Data – Level 1 (no dependencies)
   ============================================================================== */

export const companies = register({
  moduleKey: 'companies',
  displayName: 'Companies',
  description: 'Company master data',
  entityLabel: 'Company',
  prismaModel: 'company',
  dbTable: 'companies',
  hasCompanyId: false,
  endpoint: '/companies',
  importOrder: 1,
  dependencies: [],
  strategy: 'insert',
  updateOnly: false,
  columns: [
    {
      field: 'name',
      display: 'Company Name',
      type: 'string',
      required: true,
      description: 'Company trading name',
      aliases: ['name', 'companyname', 'companyName', 'company_name', 'company name', 'company', 'entity', 'entityname', 'entity_name', 'organisationname', 'organisation_name', 'organizationname', 'organization_name'],
    },
    {
      field: 'legalName',
      display: 'Legal Name',
      type: 'string',
      required: false,
      description: 'Official registered legal name',
      aliases: ['legalname', 'legalName', 'legal_name', 'legal name', 'registeredname', 'registered_name', 'officialname', 'official_name'],
    },
    {
      field: 'industryType',
      display: 'Industry Type',
      type: 'enum',
      required: false,
      description: 'Business sector (matches Prisma IndustryType enum)',
      defaultValue: 'mixed',
      allowedValues: ['food_manufacturing', 'food_retail', 'mixed', 'other'],
      aliases: ['industrytype', 'industryType', 'industry_type', 'industry type', 'industry', 'sector'],
    },
    {
      field: 'currencyCode',
      display: 'Currency Code',
      type: 'string',
      required: false,
      description: 'ISO 4217 currency code (e.g. EGP, USD)',
      defaultValue: 'EGP',
      aliases: ['currencycode', 'currencyCode', 'currency_code', 'currency code', 'currency', 'ccy'],
    },
    {
      field: 'taxNumber',
      display: 'Tax Number',
      type: 'string',
      required: false,
      description: 'Tax registration number',
      aliases: ['taxnumber', 'taxNumber', 'tax_number', 'tax number', 'vatnumber', 'vat_number', 'tin', 'crnumber', 'cr_number', 'commercialregister', 'commercial_registration'],
    },
    {
      field: 'fiscalYearStartMonth',
      display: 'Fiscal Year Start Month',
      type: 'number',
      required: false,
      description: 'Month number 1–12 (default 1 = January)',
      defaultValue: 1,
      aliases: ['fiscalyearstartmonth', 'fiscalYearStartMonth', 'fiscal_year_start_month', 'fiscal year start month', 'fystartmonth', 'startmonth', 'fystart'],
    },
  ],
  sampleRows: [],
  countQuery: 'company.count({ where: { tenantId } })',
});

export const sites = register({
  moduleKey: 'sites',
  displayName: 'Sites',
  description: 'Factories, warehouses, branches, and offices',
  entityLabel: 'Site',
  prismaModel: 'site',
  dbTable: 'sites',
  hasCompanyId: true,
  endpoint: '/sites',
  page: 'sites',
  importOrder: 2,
  dependencies: ['companies'],
  strategy: 'insert',
  updateOnly: false,
  columns: [
    {
      field: 'name',
      display: 'Site Name',
      type: 'string',
      required: true,
      description: 'Name of the site',
      aliases: ['name', 'sitename', 'site_name', 'site name', 'site', 'location', 'org', 'organization', 'organisation'],
    },
    {
      field: 'type',
      display: 'Type',
      type: 'enum',
      required: true,
      description: 'Site type (matches Prisma SiteType enum)',
      allowedValues: ['factory', 'branch', 'warehouse', 'office', 'distribution_center'],
      aliases: ['type', 'sitetype', 'site_type', 'site type'],
    },
    {
      field: 'region',
      display: 'Region',
      type: 'string',
      required: false,
      description: 'Geographic region',
      aliases: ['region', 'area', 'district', 'zone'],
    },
    {
      field: 'address',
      display: 'Address',
      type: 'string',
      required: false,
      description: 'Full address',
      aliases: ['address', 'location', 'street', 'cityaddress', 'address1'],
    },
    {
      field: 'status',
      display: 'Status',
      type: 'enum',
      required: false,
      description: 'Site status (active/inactive)',
      defaultValue: 'active',
      allowedValues: ['active', 'inactive'],
      aliases: ['status', 'sitestatus', 'site_status'],
    },
  ],
  sampleRows: [],
  countQuery: 'site.count({ where: { companyId } })',
});

export const units = register({
  moduleKey: 'units',
  displayName: 'Units',
  description: 'Units of measurement',
  entityLabel: 'Unit',
  prismaModel: 'unit',
  dbTable: 'units',
  hasCompanyId: true,
  endpoint: '/units',
  page: 'units',
  importOrder: 3,
  dependencies: ['companies'],
  strategy: 'insert',
  updateOnly: false,
  columns: [
    {
      field: 'name',
      display: 'Unit Name',
      type: 'string',
      required: true,
      description: 'Full name (e.g. Kilogram)',
      aliases: ['name', 'unitname', 'unit_name', 'unit name', 'unit', 'uomname', 'uom name', 'uom_name'],
    },
    {
      field: 'symbol',
      display: 'Symbol',
      type: 'string',
      required: true,
      description: 'Short symbol (e.g. kg)',
      aliases: ['symbol', 'code', 'uom', 'unitsymbol', 'unit_symbol', 'unit symbol', 'uomcode', 'uom_code', 'measure', 'abbreviation', 'abbr'],
    },
  ],
  sampleRows: [],
  countQuery: 'unit.count({ where: { companyId } })',
});

/* ==============================================================================
   Master Data – Level 2 (depend on companies)
   ============================================================================== */

export const accounts = register({
  moduleKey: 'accounts',
  displayName: 'Accounts',
  description: 'Chart of accounts',
  entityLabel: 'Account',
  prismaModel: 'account',
  dbTable: 'accounts',
  hasCompanyId: true,
  endpoint: '/accounts',
  page: 'accounts',
  importOrder: 4,
  dependencies: ['companies'],
  strategy: 'insert',
  updateOnly: false,
  columns: [
    {
      field: 'code',
      display: 'Account Code',
      type: 'string',
      required: true,
      description: 'Unique GL account code',
      aliases: ['code', 'accountcode', 'account_code', 'account code', 'glcode', 'gl_code', 'accountnumber', 'account_number', 'gl_number', 'glno'],
    },
    {
      field: 'name',
      display: 'Account Name',
      type: 'string',
      required: true,
      description: 'Account display name',
      aliases: ['name', 'accountname', 'account_name', 'account name', 'title', 'account'],
    },
    {
      field: 'type',
      display: 'Type',
      type: 'enum',
      required: true,
      description: 'Account type (matches Prisma AccountType enum)',
      allowedValues: ['revenue', 'cogs', 'expense', 'asset', 'liability', 'equity', 'cashflow'],
      aliases: ['type', 'accounttype', 'account_type', 'account type', 'classification', 'accountcategory'],
    },
    {
      field: 'parentCode',
      display: 'Parent Code',
      type: 'string',
      required: false,
      description: 'Parent account code for hierarchy',
      aliases: ['parentcode', 'parent_code', 'parent code', 'parent', 'parentaccount'],
      fkLookup: {
        model: 'account',
        lookupFields: ['code'],
        assignField: 'parentId',
        label: 'Parent Account',
      },
    },
    {
      field: 'isActive',
      display: 'Is Active',
      type: 'boolean',
      required: false,
      description: 'true or false (default: true)',
      defaultValue: true,
      aliases: ['isactive', 'is_active', 'active', 'status'],
    },
  ],
  sampleRows: [],
  countQuery: 'account.count({ where: { companyId } })',
});

export const costCenters = register({
  moduleKey: 'cost-centers',
  displayName: 'Cost Centers',
  description: 'Cost centers and departments',
  entityLabel: 'Cost Center',
  prismaModel: 'costCenter',
  dbTable: 'cost_centers',
  hasCompanyId: true,
  endpoint: '/cost-centers',
  page: 'cost-centers',
  importOrder: 5,
  dependencies: ['companies', 'sites'],
  strategy: 'insert',
  updateOnly: false,
  columns: [
    {
      field: 'code',
      display: 'Cost Center Code',
      type: 'string',
      required: true,
      description: 'Unique cost center code',
      aliases: ['code', 'costcentercode', 'cost_center_code', 'cost center code', 'cccode', 'cc_code'],
    },
    {
      field: 'name',
      display: 'Cost Center Name',
      type: 'string',
      required: true,
      description: 'Department or cost center name',
      aliases: ['name', 'costcentername', 'cost_center_name', 'cost center name', 'ccname', 'costcenter', 'department', 'departmentname', 'department_name'],
    },
    {
      field: 'type',
      display: 'Type',
      type: 'enum',
      required: false,
      description: 'Functional type (matches Prisma CostCenterType enum)',
      defaultValue: 'other',
      allowedValues: ['sales', 'production', 'admin', 'marketing', 'logistics', 'maintenance', 'other'],
      aliases: ['type', 'costcentertype', 'cost_center_type'],
    },
    {
      field: 'siteName',
      display: 'Site Name',
      type: 'string',
      required: false,
      description: 'Associated site name (must exist in sites)',
      aliases: ['sitecode', 'sitename', 'site_code', 'site_name', 'site'],
      fkLookup: {
        model: 'site',
        lookupFields: ['name'],
        assignField: 'siteId',
        label: 'Site',
      },
    },
    {
      field: 'parentCode',
      display: 'Parent Code',
      type: 'string',
      required: false,
      description: 'Parent cost center code for hierarchy',
      aliases: ['parentcode', 'parent_code', 'parent code', 'parent', 'parentcostcenter'],
      fkLookup: {
        model: 'costCenter',
        lookupFields: ['code'],
        assignField: 'parentId',
        label: 'Parent Cost Center',
      },
    },
  ],
  sampleRows: [],
  countQuery: 'costCenter.count({ where: { companyId } })',
});

export const productCategories = register({
  moduleKey: 'product-categories',
  displayName: 'Product Categories',
  description: 'Product category hierarchy',
  entityLabel: 'Product Category',
  prismaModel: 'productCategory',
  dbTable: 'product_categories',
  hasCompanyId: true,
  endpoint: '/product-categories',
  page: 'product-categories',
  importOrder: 6,
  dependencies: ['companies'],
  strategy: 'insert',
  updateOnly: false,
  columns: [
    {
      field: 'name',
      display: 'Category Name',
      type: 'string',
      required: true,
      description: 'Category name',
      aliases: ['name', 'categoryname', 'category_name', 'category name', 'category', 'catname', 'productcategory', 'product_category'],
    },
    {
      field: 'parentCategoryName',
      display: 'Parent Category',
      type: 'string',
      required: false,
      description: 'Parent category name for hierarchy',
      aliases: ['parentcategoryname', 'parent_category_name', 'parent category', 'parentname', 'parent'],
      fkLookup: {
        model: 'productCategory',
        lookupFields: ['name'],
        assignField: 'parentId',
        label: 'Parent Category',
      },
    },
  ],
  sampleRows: [],
  countQuery: 'productCategory.count({ where: { companyId } })',
});

export const customers = register({
  moduleKey: 'customers',
  displayName: 'Customers',
  description: 'Customer master data',
  entityLabel: 'Customer',
  prismaModel: 'customer',
  dbTable: 'customers',
  hasCompanyId: true,
  endpoint: '/customers',
  page: 'customers',
  importOrder: 7,
  dependencies: ['companies'],
  strategy: 'insert',
  updateOnly: false,
  columns: [
    {
      field: 'code',
      display: 'Customer Code',
      type: 'string',
      required: true,
      description: 'Unique customer code',
      aliases: ['code', 'customercode', 'customer_code', 'customer code', 'clientcode', 'client_code', 'customerid', 'customernumber', 'customer_number', 'customer no', 'customer_no', 'accountnumber'],
    },
    {
      field: 'name',
      display: 'Customer Name',
      type: 'string',
      required: true,
      description: 'Customer business name',
      aliases: ['name', 'customername', 'customer_name', 'customer name', 'clientname', 'client_name', 'company'],
    },
    {
      field: 'customerType',
      display: 'Customer Type',
      type: 'enum',
      required: false,
      description: 'Segment type (matches Prisma CustomerType enum)',
      defaultValue: 'retail',
      allowedValues: ['retail', 'wholesale', 'distributor', 'internal', 'other'],
      aliases: ['customertype', 'customer_type', 'customer type', 'type', 'segment'],
    },
    {
      field: 'region',
      display: 'Region',
      type: 'string',
      required: false,
      description: 'Geographic region',
      aliases: ['region', 'area', 'city'],
    },
    {
      field: 'phone',
      display: 'Phone',
      type: 'string',
      required: false,
      description: 'Contact phone',
      aliases: ['phone', 'telephone', 'tel', 'mobile', 'phone1', 'phone2'],
    },
    {
      field: 'email',
      display: 'Email',
      type: 'string',
      required: false,
      description: 'Contact email',
      aliases: ['email', 'e-mail', 'mail', 'emailaddress'],
    },
    {
      field: 'creditLimit',
      display: 'Credit Limit',
      type: 'number',
      required: false,
      description: 'Credit limit amount',
      defaultValue: 0,
      aliases: ['creditlimit', 'credit_limit', 'credit limit', 'credit', 'creditlimitusd'],
    },
    {
      field: 'paymentTerms',
      display: 'Payment Terms',
      type: 'number',
      required: false,
      description: 'Payment terms in days',
      defaultValue: 30,
      aliases: ['paymentterms', 'payment_terms', 'payment terms', 'terms', 'paymentdays'],
    },
    {
      field: 'isActive',
      display: 'Is Active',
      type: 'boolean',
      required: false,
      description: 'true or false (default: true)',
      defaultValue: true,
      aliases: ['isactive', 'is_active', 'active', 'status'],
    },
  ],
  sampleRows: [],
  countQuery: 'customer.count({ where: { companyId } })',
});

export const suppliers = register({
  moduleKey: 'suppliers',
  displayName: 'Suppliers',
  description: 'Supplier and vendor master data',
  entityLabel: 'Supplier',
  prismaModel: 'supplier',
  dbTable: 'suppliers',
  hasCompanyId: true,
  endpoint: '/suppliers',
  page: 'suppliers',
  importOrder: 8,
  dependencies: ['companies'],
  strategy: 'insert',
  updateOnly: false,
  columns: [
    {
      field: 'name',
      display: 'Supplier Name',
      type: 'string',
      required: true,
      description: 'Supplier business name',
      aliases: ['name', 'suppliername', 'supplier_name', 'supplier name', 'vendorname', 'vendor_name', 'vendor', 'company'],
    },
    {
      field: 'phone',
      display: 'Phone',
      type: 'string',
      required: false,
      description: 'Contact phone',
      aliases: ['phone', 'telephone', 'tel', 'mobile'],
    },
    {
      field: 'email',
      display: 'Email',
      type: 'string',
      required: false,
      description: 'Contact email',
      aliases: ['email', 'e-mail', 'mail'],
    },
  ],
  sampleRows: [],
  countQuery: 'supplier.count({ where: { companyId } })',
});

/* ==============================================================================
   Master Data – Level 3 (depend on level 2)
   ============================================================================== */

export const materials = register({
  moduleKey: 'materials',
  displayName: 'Materials',
  description: 'Raw materials and packaging',
  entityLabel: 'Material',
  prismaModel: 'material',
  dbTable: 'materials',
  hasCompanyId: true,
  endpoint: '/materials',
  page: 'materials',
  importOrder: 9,
  dependencies: ['companies', 'units', 'suppliers'],
  strategy: 'insert',
  updateOnly: false,
  columns: [
    {
      field: 'code',
      display: 'Material Code',
      type: 'string',
      required: true,
      description: 'Unique material code',
      aliases: ['code', 'materialcode', 'material_code', 'material code', 'rmcode', 'rm_code', 'rawmaterialcode', 'raw_material_code', 'itemcode', 'item_code', 'ingno', 'ing no', 'ing_no'],
    },
    {
      field: 'name',
      display: 'Material Name',
      type: 'string',
      required: true,
      description: 'Material description',
      aliases: ['name', 'materialname', 'material_name', 'material name', 'materialdesc', 'material_desc', 'ingdesc', 'ing desc', 'ing_desc', 'description', 'itemdesc', 'item_desc'],
    },
    {
      field: 'materialType',
      display: 'Material Type',
      type: 'string',
      required: false,
      description: 'Classification (free text, suggested: raw_material, packaging, operating_supply, spare_part, other)',
      defaultValue: 'raw_material',
      aliases: ['materialtype', 'material_type', 'material type', 'type', 'rmtype'],
    },
    {
      field: 'unitSymbol',
      display: 'Unit Symbol',
      type: 'string',
      required: true,
      description: 'Unit symbol (must exist in Units)',
      aliases: ['unit', 'uom', 'unitsymbol', 'unit_symbol', 'unit symbol'],
      fkLookup: {
        model: 'unit',
        lookupFields: ['symbol'],
        assignField: 'unitId',
        label: 'Unit',
      },
    },
    {
      field: 'purchasePrice',
      display: 'Purchase Price',
      type: 'number',
      required: false,
      description: 'Current purchase price per unit',
      defaultValue: 0,
      aliases: ['purchaseprice', 'purchase_price', 'purchase price', 'price', 'latestprice', 'lastprice', 'cost', 'unitcost', 'costperkg', 'cost_per_kg'],
    },
    {
      field: 'supplierName',
      display: 'Supplier Name',
      type: 'string',
      required: false,
      description: 'Primary supplier name (must exist in Suppliers)',
      aliases: ['suppliercode', 'suppliername', 'supplier_code', 'supplier_name', 'supplier name', 'vendor'],
      fkLookup: {
        model: 'supplier',
        lookupFields: ['name'],
        assignField: 'supplierId',
        label: 'Supplier',
      },
    },
    {
      field: 'safetyStockQty',
      display: 'Safety Stock Qty',
      type: 'number',
      required: false,
      description: 'Minimum safety stock level',
      defaultValue: 0,
      aliases: ['safetystockqty', 'safety_stock_qty', 'minstock', 'minimumstock', 'minstockqty'],
    },
    {
      field: 'isActive',
      display: 'Is Active',
      type: 'boolean',
      required: false,
      description: 'true or false (default: true)',
      defaultValue: true,
      aliases: ['isactive', 'is_active', 'active', 'status'],
    },
  ],
  sampleRows: [],
  countQuery: 'material.count({ where: { companyId } })',
});

export const products = register({
  moduleKey: 'products',
  displayName: 'Products',
  description: 'Finished goods and sellable products',
  entityLabel: 'Product',
  prismaModel: 'product',
  dbTable: 'products',
  hasCompanyId: true,
  endpoint: '/products',
  page: 'products',
  importOrder: 10,
  dependencies: ['companies', 'product-categories', 'units'],
  strategy: 'insert',
  updateOnly: false,
  columns: [
    {
      field: 'sku',
      display: 'SKU',
      type: 'string',
      required: true,
      description: 'Stock keeping unit code',
      aliases: ['sku', 'productsku', 'product_sku', 'product sku', 'itemcode', 'item_code', 'productcode', 'product_code', 'barcode', 'code', 'prdno', 'prd no', 'prd_no', 'fgcode', 'fg_code'],
    },
    {
      field: 'name',
      display: 'Product Name',
      type: 'string',
      required: true,
      description: 'Product display name',
      aliases: ['name', 'productname', 'product_name', 'product name', 'itemdesc', 'item_desc', 'description', 'prddesc', 'prd desc', 'prd_desc', 'product'],
    },
    {
      field: 'productType',
      display: 'Product Type',
      type: 'enum',
      required: false,
      description: 'Product classification (matches Prisma ProductType enum)',
      defaultValue: 'finished_good',
      allowedValues: ['finished_good', 'semi_finished', 'service'],
      aliases: ['producttype', 'product_type', 'product type', 'type', 'fgtype'],
    },
    {
      field: 'categoryName',
      display: 'Category Name',
      type: 'string',
      required: false,
      description: 'Product category name (must exist in Product Categories)',
      aliases: ['categoryname', 'categorycode', 'category_code', 'category_name', 'category', 'catname', 'major', 'maincategory', 'main_category'],
      fkLookup: {
        model: 'productCategory',
        lookupFields: ['name'],
        assignField: 'categoryId',
        label: 'Product Category',
      },
    },
    {
      field: 'unitSymbol',
      display: 'Unit Symbol',
      type: 'string',
      required: true,
      description: 'Unit symbol (must exist in Units)',
      aliases: ['unit', 'uom', 'unitsymbol', 'unit_symbol', 'unit symbol', 'prduom', 'prd uom', 'prd_uom'],
      fkLookup: {
        model: 'unit',
        lookupFields: ['symbol'],
        assignField: 'unitId',
        label: 'Unit',
      },
    },
    {
      field: 'standardCost',
      display: 'Standard Cost',
      type: 'number',
      required: false,
      description: 'Standard cost per unit',
      defaultValue: 0,
      aliases: ['standardcost', 'standard_cost', 'standard cost', 'stdcost', 'std_cost'],
    },
    {
      field: 'salePrice',
      display: 'Selling Price',
      type: 'number',
      required: false,
      description: 'Selling price per unit',
      defaultValue: 0,
      aliases: ['saleprice', 'sale_price', 'sale price', 'price', 'sellingprice', 'selling_price', 'unitprice', 'unit_price'],
    },
    {
      field: 'isActive',
      display: 'Is Active',
      type: 'boolean',
      required: false,
      description: 'true or false (default: true)',
      defaultValue: true,
      aliases: ['isactive', 'is_active', 'active', 'status'],
    },
  ],
  sampleRows: [],
  countQuery: 'product.count({ where: { companyId } })',
});

/* ==============================================================================
   Master Data – Level 4 (depend on level 3)
   ============================================================================== */

export const bomRecipes = register({
  moduleKey: 'bom-recipes',
  displayName: 'BOM Recipes',
  description: 'Bill of materials recipes with material lines',
  entityLabel: 'BOM Recipe',
  prismaModel: 'bomRecipe',
  dbTable: 'bom_recipes',
  hasCompanyId: true,
  endpoint: '/bom-recipes',
  page: 'bom-recipes',
  importOrder: 11,
  dependencies: ['companies', 'products', 'materials'],
  strategy: 'insert-child',
  updateOnly: false,
  columns: [
    {
      field: 'productSku',
      display: 'Product SKU',
      type: 'string',
      required: true,
      description: 'Product SKU this BOM belongs to (must exist in Products)',
      aliases: ['productsku', 'product_sku', 'product sku', 'sku', 'code', 'product', 'prdno', 'prd no', 'prd_no'],
      fkLookup: {
        model: 'product',
        lookupFields: ['sku', 'name'],
        assignField: 'productId',
        label: 'Product',
      },
    },
    {
      field: 'version',
      display: 'Version',
      type: 'string',
      required: false,
      description: 'BOM version (default: v1)',
      defaultValue: 'v1',
      aliases: ['version', 'bomversion', 'bom_version', 'ver'],
    },
    {
      field: 'outputQty',
      display: 'Output Qty',
      type: 'number',
      required: false,
      description: 'Output quantity per batch',
      defaultValue: 1,
      aliases: ['outputqty', 'output_qty', 'output qty', 'outputquantity'],
    },
    {
      field: 'wastagePct',
      display: 'Wastage %',
      type: 'number',
      required: false,
      description: 'Expected wastage percentage',
      defaultValue: 0,
      aliases: ['wastagepct', 'wastage_pct', 'wastage %', 'wastage', 'wastage_percentage'],
    },
    {
      field: 'laborCost',
      display: 'Labor Cost',
      type: 'number',
      required: false,
      description: 'Labor cost per unit',
      defaultValue: 0,
      aliases: ['laborcost', 'labor_cost', 'labor cost', 'labor'],
    },
    {
      field: 'overheadCost',
      display: 'Overhead Cost',
      type: 'number',
      required: false,
      description: 'Overhead cost per unit',
      defaultValue: 0,
      aliases: ['overheadcost', 'overhead_cost', 'overhead cost', 'overhead'],
    },
    {
      field: 'materialCode',
      display: 'Material Code',
      type: 'string',
      required: true,
      description: 'Material code (must exist in Materials)',
      aliases: ['materialcode', 'material_code', 'material code', 'material', 'code', 'ingno', 'ing no', 'ing_no'],
      fkLookup: {
        model: 'material',
        lookupFields: ['code', 'name'],
        assignField: 'materialId',
        label: 'Material',
      },
    },
    {
      field: 'qtyPerOutput',
      display: 'Qty Per Output',
      type: 'number',
      required: true,
      description: 'Quantity of material per output unit',
      aliases: ['qtyperoutput', 'qty_per_output', 'qty per output', 'quantity', 'qty', 'planqty', 'plan qty'],
    },
    {
      field: 'bomLineWastagePct',
      display: 'BOM Line Wastage %',
      type: 'number',
      required: false,
      description: 'Material-level wastage percentage',
      defaultValue: 0,
      aliases: ['bomlinewastagepct', 'bom_line_wastage_pct', 'bom line wastage %', 'linewastage'],
      prismaField: 'wastagePct',
    },
  ],
  sampleRows: [],
  countQuery: 'bomLine.count({ where: { bomRecipe: { companyId } } })',
});

/* ==============================================================================
   Exchange Rates – Level 3 (depends on companies)
   ============================================================================== */

export const exchangeRates = register({
  moduleKey: 'exchange-rates',
  displayName: 'Exchange Rates',
  description: 'Currency exchange rates',
  entityLabel: 'Exchange Rate',
  prismaModel: 'exchangeRate',
  dbTable: 'exchange_rates',
  hasCompanyId: true,
  endpoint: '/exchange-rates',
  page: 'exchange-rates',
  importOrder: 12,
  dependencies: ['companies'],
  strategy: 'insert',
  updateOnly: false,
  columns: [
    {
      field: 'fromCurrency',
      display: 'From Currency',
      type: 'string',
      required: true,
      description: 'Source currency ISO code (e.g. USD)',
      aliases: ['fromcurrency', 'from_currency', 'from currency', 'from', 'sourcecurrency'],
    },
    {
      field: 'toCurrency',
      display: 'To Currency',
      type: 'string',
      required: true,
      description: 'Target currency ISO code (e.g. EGP)',
      aliases: ['tocurrency', 'to_currency', 'to currency', 'to', 'targetcurrency'],
    },
    {
      field: 'rate',
      display: 'Rate',
      type: 'number',
      required: true,
      description: 'Exchange rate value',
      aliases: ['rate', 'exchangerate', 'exchange_rate', 'value'],
    },
    {
      field: 'rateDate',
      display: 'Rate Date',
      type: 'date',
      required: true,
      description: 'Effective date (YYYY-MM-DD)',
      aliases: ['ratedate', 'rate_date', 'rate date', 'date', 'effectivedate'],
    },
    {
      field: 'source',
      display: 'Source',
      type: 'enum',
      required: false,
      description: 'Rate source (matches Prisma RateSource enum)',
      defaultValue: 'manual',
      allowedValues: ['manual', 'api', 'import', 'fallback', 'cached'],
      prismaField: 'source',
      aliases: ['source', 'ratesource', 'remarks'],
    },
  ],
  sampleRows: [],
  countQuery: 'exchangeRate.count({ where: { companyId } })',
});

/* ==============================================================================
   KPI Targets – Level 4 (depends on companies, sites)
   ============================================================================== */

export const kpiTargets = register({
  moduleKey: 'kpi-targets',
  displayName: 'KPI Targets',
  description: 'KPI target values by period',
  entityLabel: 'KPI Target',
  prismaModel: 'kpiTarget',
  dbTable: 'kpi_targets',
  hasCompanyId: true,
  endpoint: '/kpi-targets',
  page: 'kpi-targets',
  importOrder: 13,
  dependencies: ['companies', 'sites'],
  strategy: 'insert',
  updateOnly: false,
  columns: [
    {
      field: 'kpiName',
      display: 'KPI Name',
      type: 'string',
      required: true,
      description: 'Name of the KPI',
      aliases: ['kpiname', 'kpi_name', 'kpi name', 'kpi'],
    },
    {
      field: 'kpiCategory',
      display: 'KPI Category',
      type: 'enum',
      required: false,
      description: 'KPI category (matches Prisma KpiCategory enum)',
      defaultValue: 'financial',
      allowedValues: ['financial', 'operational', 'sales', 'production', 'hr'],
      aliases: ['kpicategory', 'kpi_category', 'kpi category', 'category'],
    },
    {
      field: 'fiscalYear',
      display: 'Fiscal Year',
      type: 'number',
      required: true,
      description: 'Fiscal year (e.g. 2026)',
      aliases: ['fiscalyear', 'fiscal_year', 'fiscal year', 'year'],
    },
    {
      field: 'periodMonth',
      display: 'Period Month',
      type: 'number',
      required: false,
      description: 'Month number 1–12 (blank for annual)',
      aliases: ['periodmonth', 'period_month', 'period month', 'month'],
    },
    {
      field: 'targetValue',
      display: 'Target Value',
      type: 'number',
      required: true,
      description: 'Target value',
      aliases: ['targetvalue', 'target_value', 'target value', 'target'],
    },
    {
      field: 'unit',
      display: 'Unit',
      type: 'string',
      required: false,
      description: 'Unit of measurement (e.g. %, EGP, kg)',
      aliases: ['unit', 'kpiunit', 'kpi_unit', 'uom'],
    },
    {
      field: 'siteName',
      display: 'Site Name',
      type: 'string',
      required: false,
      description: 'Site-specific target (must exist in Sites)',
      aliases: ['sitecode', 'site_code', 'site code', 'sitename', 'site_name', 'site name', 'site', 'location', 'org', 'organization'],
      fkLookup: {
        model: 'site',
        lookupFields: ['name'],
        assignField: 'siteId',
        label: 'Site',
      },
    },
  ],
  sampleRows: [],
  countQuery: 'kpiTarget.count({ where: { companyId } })',
});

/* ==============================================================================
   Raw Material Prices – Level 5 (depends on materials)
   ============================================================================== */

export const rawMaterialPrices = register({
  moduleKey: 'raw-material-prices',
  displayName: 'Raw Material Prices',
  description: 'Raw material price history',
  entityLabel: 'Raw Material Price',
  prismaModel: 'rawMaterialPrice',
  dbTable: 'raw_material_prices',
  hasCompanyId: true,
  endpoint: '/raw-material-prices',
  page: 'raw-material-prices',
  importOrder: 14,
  dependencies: ['companies', 'materials'],
  strategy: 'update',
  updateOnly: false,
  columns: [
    {
      field: 'materialCode',
      display: 'Material Code',
      type: 'string',
      required: true,
      description: 'Material code (must exist in Materials)',
      aliases: ['materialcode', 'material_code', 'material code', 'material', 'code', 'itemcode', 'item code'],
      fkLookup: {
        model: 'material',
        lookupFields: ['code'],
        assignField: 'materialId',
        label: 'Material',
      },
    },
    {
      field: 'price',
      display: 'Price',
      type: 'number',
      required: true,
      description: 'Price per unit',
      aliases: ['price', 'rate', 'cost', 'latestprice', 'unitprice', 'unit_price', 'unit price'],
    },
    {
      field: 'effectiveDate',
      display: 'Effective Date',
      type: 'date',
      required: true,
      description: 'Price effective date (YYYY-MM-DD)',
      aliases: ['pricedate', 'price_date', 'price date', 'effectivedate', 'effective_date', 'effective date', 'date'],
      prismaField: 'priceDate',
    },
    {
      field: 'source',
      display: 'Source',
      type: 'string',
      required: false,
      description: 'Price source',
      defaultValue: 'manual',
      aliases: ['source', 'ratesource', 'remarks'],
    },
  ],
  sampleRows: [],
  countQuery: 'rawMaterialPrice.count({ where: { companyId } })',
});

/* ==============================================================================
   Production Plans – Level 5 (depends on products, sites)
   ============================================================================== */

export const productionPlans = register({
  moduleKey: 'production-plans',
  displayName: 'Production Plans',
  description: 'Production planning by product and period',
  entityLabel: 'Production Plan',
  prismaModel: 'productionPlan',
  dbTable: 'production_plans',
  hasCompanyId: true,
  endpoint: '/production-plans',
  page: 'production-planning',
  importOrder: 15,
  dependencies: ['companies', 'products', 'sites'],
  strategy: 'upsert',
  updateOnly: false,
  columns: [
    {
      field: 'productSku',
      display: 'Product SKU',
      type: 'string',
      required: true,
      description: 'Product SKU (must exist in Products)',
      aliases: ['productsku', 'product_sku', 'product sku', 'sku', 'code', 'product'],
      fkLookup: {
        model: 'product',
        lookupFields: ['sku', 'name'],
        assignField: 'productId',
        label: 'Product',
      },
    },
    {
      field: 'siteName',
      display: 'Site Name',
      type: 'string',
      required: true,
      description: 'Production site name (must exist in Sites)',
      aliases: ['sitecode', 'site_code', 'site code', 'sitename', 'site_name', 'site name', 'site', 'location', 'org', 'organization'],
      fkLookup: {
        model: 'site',
        lookupFields: ['name'],
        assignField: 'siteId',
        label: 'Site',
      },
    },
    {
      field: 'fiscalYear',
      display: 'Fiscal Year',
      type: 'number',
      required: true,
      description: 'Fiscal year (e.g. 2026)',
      aliases: ['fiscalyear', 'fiscal_year', 'fiscal year', 'year'],
    },
    {
      field: 'periodMonth',
      display: 'Period Month',
      type: 'number',
      required: true,
      description: 'Month number (1–12)',
      aliases: ['periodmonth', 'period_month', 'period month', 'month'],
    },
    {
      field: 'plannedQty',
      display: 'Planned Qty',
      type: 'number',
      required: true,
      description: 'Planned production quantity',
      defaultValue: 0,
      aliases: ['plannedqty', 'planned_qty', 'planned qty', 'planqty', 'plan qty'],
    },
    {
      field: 'actualQty',
      display: 'Actual Qty',
      type: 'number',
      required: false,
      description: 'Actual production quantity',
      aliases: ['actualqty', 'actual_qty', 'actual qty', 'actualquantity'],
    },
    {
      field: 'estimatedCost',
      display: 'Estimated Cost',
      type: 'number',
      required: false,
      description: 'Estimated production cost',
      defaultValue: 0,
      aliases: ['estimatedcost', 'estimated_cost', 'estimated cost', 'estcost'],
    },
    {
      field: 'actualCost',
      display: 'Actual Cost',
      type: 'number',
      required: false,
      description: 'Actual production cost',
      aliases: ['actualcost', 'actual_cost', 'actual cost'],
    },
    {
      field: 'planSource',
      display: 'Plan Source',
      type: 'enum',
      required: false,
      description: 'Plan source (matches Prisma PlanSource enum)',
      defaultValue: 'manual',
      allowedValues: ['budget', 'forecast', 'manual'],
      aliases: ['plansource', 'plan_source', 'plan source', 'source', 'status'],
    },
  ],
  sampleRows: [],
  countQuery: 'productionPlan.count({ where: { companyId } })',
});

/* ==============================================================================
   Production Cost Allocations – Level 5 (depends on sites)
   ============================================================================== */

export const productionAllocations = register({
  moduleKey: 'production-allocations',
  displayName: 'Production Cost Allocations',
  description: 'Production overhead cost allocation',
  entityLabel: 'Allocation',
  prismaModel: 'productionCostAllocation',
  dbTable: 'production_cost_allocations',
  hasCompanyId: true,
  endpoint: '/production-cost-allocations',
  importOrder: 16,
  dependencies: ['companies', 'sites'],
  strategy: 'insert',
  updateOnly: false,
  columns: [
    {
      field: 'siteName',
      display: 'Site Name',
      type: 'string',
      required: true,
      description: 'Site name (must exist in Sites)',
      aliases: ['sitecode', 'site_code', 'site code', 'sitename', 'site_name', 'site name', 'site', 'location'],
      fkLookup: {
        model: 'site',
        lookupFields: ['name'],
        assignField: 'siteId',
        label: 'Site',
      },
    },
    {
      field: 'period',
      display: 'Period',
      type: 'string',
      required: true,
      description: 'Period identifier (e.g. 2026-01)',
      aliases: ['period', 'month', 'fiscalperiod'],
    },
    {
      field: 'allocatedAmount',
      display: 'Allocated Amount',
      type: 'number',
      required: true,
      description: 'Allocated cost amount',
      aliases: ['allocatedamount', 'allocated_amount', 'allocated amount', 'amount', 'allocation'],
    },
    {
      field: 'costCategory',
      display: 'Cost Category',
      type: 'string',
      required: false,
      description: 'Cost category',
      defaultValue: 'overhead',
      aliases: ['costcategory', 'cost_category', 'cost category', 'category'],
    },
    {
      field: 'allocationMethod',
      display: 'Allocation Method',
      type: 'string',
      required: false,
      description: 'Allocation basis method (free text, suggested: production_volume, machine_hours, direct_labor_hours, floor_area, headcount, manual)',
      defaultValue: 'production_volume',
      aliases: ['allocationmethod', 'allocation_method', 'allocation basis', 'allocationbasis', 'allocation_basis'],
    },
    {
      field: 'productSku',
      display: 'Product SKU',
      type: 'string',
      required: false,
      description: 'Product SKU (must exist in Products, for product-specific allocations)',
      aliases: ['productsku', 'product_sku', 'product sku', 'sku', 'product'],
      fkLookup: {
        model: 'product',
        lookupFields: ['sku', 'name'],
        assignField: 'productId',
        label: 'Product',
      },
    },
    {
      field: 'description',
      display: 'Description',
      type: 'string',
      required: false,
      description: 'Allocation description',
      aliases: ['description', 'desc', 'notes', 'remarks'],
    },
  ],
  sampleRows: [],
  countQuery: 'productionCostAllocation.count({ where: { companyId } })',
});

/* ==============================================================================
   Yield & Waste – Level 5 (depends on products, bom-recipes)
   ============================================================================== */

export const yieldWaste = register({
  moduleKey: 'yield-waste',
  displayName: 'Yield & Waste',
  description: 'Production yield and waste adjustments',
  entityLabel: 'Yield & Waste',
  prismaModel: 'bomRecipe',
  dbTable: 'bom_recipes',
  hasCompanyId: true,
  endpoint: '/yield-waste',
  importOrder: 17,
  dependencies: ['companies', 'products', 'bom-recipes'],
  strategy: 'update',
  updateOnly: true,
  columns: [
    {
      field: 'productSku',
      display: 'Product SKU',
      type: 'string',
      required: true,
      description: 'Product SKU (must exist in Products)',
      aliases: ['productsku', 'product_sku', 'product sku', 'sku', 'code', 'product'],
      fkLookup: {
        model: 'product',
        lookupFields: ['sku'],
        assignField: 'productId',
        label: 'Product',
      },
    },
    {
      field: 'wastagePct',
      display: 'Wastage %',
      type: 'number',
      required: false,
      description: 'Wastage percentage (0–100)',
      aliases: ['wastagepct', 'wastage_pct', 'wastage %', 'wastage', 'wastage_percentage'],
    },
  ],
  sampleRows: [],
  countQuery: '',
});

/* ==============================================================================
   Transaction Data – Budget Lines (Level 6)
   ============================================================================== */

export const budgetLines = register({
  moduleKey: 'budget-lines',
  displayName: 'Budget Lines',
  description: 'Annual budget data by account, site, cost center',
  entityLabel: 'Budget Line',
  prismaModel: 'budgetLine',
  dbTable: 'budget_lines',
  hasCompanyId: false, // via budgetCycle.companyId
  endpoint: '/budgets',
  page: 'budgets',
  importOrder: 18,
  dependencies: ['companies', 'accounts', 'sites', 'cost-centers', 'products', 'materials', 'customers'],
  strategy: 'insert-child',
  updateOnly: false,
  columns: [
    {
      field: 'budgetCycleName',
      display: 'Budget Cycle',
      type: 'string',
      required: true,
      description: 'Budget cycle name (e.g. FY26 Annual Budget)',
      aliases: ['budgetcyclename', 'budget_cycle_name', 'budget cycle name', 'budgetcycle', 'budget cycle', 'cycle'],
    },
    {
      field: 'fiscalYear',
      display: 'Fiscal Year',
      type: 'number',
      required: true,
      description: 'Fiscal year (e.g. 2026)',
      aliases: ['fiscalyear', 'fiscal_year', 'fiscal year', 'year'],
    },
    {
      field: 'accountCode',
      display: 'Account',
      type: 'string',
      required: true,
      description: 'Account code or name (must exist in Accounts)',
      aliases: ['accountcode', 'account_code', 'account code', 'account', 'glcode', 'gl_code', 'code'],
      fkLookup: {
        model: 'account',
        lookupFields: ['code', 'name'],
        assignField: 'accountId',
        label: 'Account',
      },
    },
    {
      field: 'siteCode',
      display: 'Site',
      type: 'string',
      required: false,
      description: 'Site name (must exist in Sites)',
      aliases: ['sitecode', 'site_code', 'site code', 'sitename', 'site_name', 'site name', 'site', 'location', 'org', 'organization'],
      fkLookup: {
        model: 'site',
        lookupFields: ['name'],
        assignField: 'siteId',
        label: 'Site',
      },
    },
    {
      field: 'costCenterCode',
      display: 'Cost Center',
      type: 'string',
      required: false,
      description: 'Cost center code or name (must exist in Cost Centers)',
      aliases: ['costcentercode', 'cost_center_code', 'cost center code', 'costcenter', 'cc', 'cccode'],
      fkLookup: {
        model: 'costCenter',
        lookupFields: ['code', 'name'],
        assignField: 'costCenterId',
        label: 'Cost Center',
      },
    },
    {
      field: 'productSku',
      display: 'Product',
      type: 'string',
      required: false,
      description: 'Product SKU or name (must exist in Products)',
      aliases: ['productsku', 'product_sku', 'product sku', 'sku', 'itemcode', 'item_code', 'productcode', 'code', 'product'],
      fkLookup: {
        model: 'product',
        lookupFields: ['sku', 'name'],
        assignField: 'productId',
        label: 'Product',
      },
    },
    {
      field: 'materialCode',
      display: 'Material',
      type: 'string',
      required: false,
      description: 'Material code or name (must exist in Materials)',
      aliases: ['materialcode', 'material_code', 'material code', 'material', 'code'],
      fkLookup: {
        model: 'material',
        lookupFields: ['code', 'name'],
        assignField: 'materialId',
        label: 'Material',
      },
    },
    {
      field: 'customerCode',
      display: 'Customer',
      type: 'string',
      required: false,
      description: 'Customer code or name (must exist in Customers)',
      aliases: ['customercode', 'customer_code', 'customer code', 'customer', 'code'],
      fkLookup: {
        model: 'customer',
        lookupFields: ['code', 'name'],
        assignField: 'customerId',
        label: 'Customer',
      },
    },
    {
      field: 'periodMonth',
      display: 'Month',
      type: 'number',
      required: true,
      description: 'Month number 1–12 (or month name)',
      aliases: ['periodmonth', 'period_month', 'period month', 'month'],
    },
    {
      field: 'quantity',
      display: 'Quantity',
      type: 'number',
      required: false,
      description: 'Planned quantity',
      defaultValue: 0,
      aliases: ['quantity', 'qty', 'plannedqty', 'planned_qty'],
    },
    {
      field: 'unitPrice',
      display: 'Unit Price',
      type: 'number',
      required: false,
      description: 'Planned unit price',
      defaultValue: 0,
      aliases: ['unitprice', 'unit_price', 'unit price', 'price'],
    },
    {
      field: 'amount',
      display: 'Amount',
      type: 'number',
      required: true,
      description: 'Budget amount',
      aliases: ['amount', 'value', 'budgetamt', 'budget_amt'],
    },
    {
      field: 'notes',
      display: 'Notes',
      type: 'string',
      required: false,
      description: 'Budget notes or description',
      aliases: ['notes', 'note', 'description', 'remarks'],
    },
  ],
  sampleRows: [],
  countQuery: 'budgetLine.count({ where: { budgetCycle: { companyId } } })',
});

export const forecastLines = register({
  moduleKey: 'forecast-lines',
  displayName: 'Forecast Lines',
  description: 'Monthly forecast data',
  entityLabel: 'Forecast Line',
  prismaModel: 'forecastLine',
  dbTable: 'forecast_lines',
  hasCompanyId: false, // via forecastCycle.companyId
  endpoint: '/forecasts',
  page: 'forecasts',
  importOrder: 19,
  dependencies: ['companies', 'accounts', 'sites', 'cost-centers', 'products', 'materials', 'customers'],
  strategy: 'insert-child',
  updateOnly: false,
  columns: [
    {
      field: 'forecastCycleName',
      display: 'Forecast Cycle',
      type: 'string',
      required: true,
      description: 'Forecast cycle name (e.g. FY26 Q1 Forecast)',
      aliases: ['forecastcyclename', 'forecast_cycle_name', 'forecast cycle name', 'forecastcycle', 'forecast cycle', 'cycle'],
    },
    {
      field: 'fiscalYear',
      display: 'Fiscal Year',
      type: 'number',
      required: true,
      description: 'Fiscal year (e.g. 2026)',
      aliases: ['fiscalyear', 'fiscal_year', 'fiscal year', 'year'],
    },
    {
      field: 'accountCode',
      display: 'Account',
      type: 'string',
      required: true,
      description: 'Account code or name (must exist in Accounts)',
      aliases: ['accountcode', 'account_code', 'account code', 'account', 'glcode', 'gl_code', 'code'],
      fkLookup: {
        model: 'account',
        lookupFields: ['code', 'name'],
        assignField: 'accountId',
        label: 'Account',
      },
    },
    {
      field: 'siteCode',
      display: 'Site',
      type: 'string',
      required: false,
      description: 'Site name (must exist in Sites)',
      aliases: ['sitecode', 'site_code', 'site code', 'sitename', 'site_name', 'site name', 'site', 'location', 'org', 'organization'],
      fkLookup: {
        model: 'site',
        lookupFields: ['name'],
        assignField: 'siteId',
        label: 'Site',
      },
    },
    {
      field: 'costCenterCode',
      display: 'Cost Center',
      type: 'string',
      required: false,
      description: 'Cost center code or name (must exist in Cost Centers)',
      aliases: ['costcentercode', 'cost_center_code', 'cost center code', 'costcenter', 'cc', 'cccode'],
      fkLookup: {
        model: 'costCenter',
        lookupFields: ['code', 'name'],
        assignField: 'costCenterId',
        label: 'Cost Center',
      },
    },
    {
      field: 'productSku',
      display: 'Product',
      type: 'string',
      required: false,
      description: 'Product SKU or name (must exist in Products)',
      aliases: ['productsku', 'product_sku', 'product sku', 'sku', 'itemcode', 'item_code', 'productcode', 'code', 'product'],
      fkLookup: {
        model: 'product',
        lookupFields: ['sku', 'name'],
        assignField: 'productId',
        label: 'Product',
      },
    },
    {
      field: 'materialCode',
      display: 'Material',
      type: 'string',
      required: false,
      description: 'Material code or name (must exist in Materials)',
      aliases: ['materialcode', 'material_code', 'material code', 'material', 'code'],
      fkLookup: {
        model: 'material',
        lookupFields: ['code', 'name'],
        assignField: 'materialId',
        label: 'Material',
      },
    },
    {
      field: 'customerCode',
      display: 'Customer',
      type: 'string',
      required: false,
      description: 'Customer code or name (must exist in Customers)',
      aliases: ['customercode', 'customer_code', 'customer code', 'customer', 'code'],
      fkLookup: {
        model: 'customer',
        lookupFields: ['code', 'name'],
        assignField: 'customerId',
        label: 'Customer',
      },
    },
    {
      field: 'periodMonth',
      display: 'Month',
      type: 'number',
      required: true,
      description: 'Month number 1–12',
      aliases: ['periodmonth', 'period_month', 'period month', 'month'],
    },
    {
      field: 'quantity',
      display: 'Quantity',
      type: 'number',
      required: false,
      description: 'Forecast quantity',
      defaultValue: 0,
      aliases: ['quantity', 'qty', 'plannedqty', 'planned_qty'],
    },
    {
      field: 'unitPrice',
      display: 'Unit Price',
      type: 'number',
      required: false,
      description: 'Forecast unit price',
      defaultValue: 0,
      aliases: ['unitprice', 'unit_price', 'unit price', 'price'],
    },
    {
      field: 'amount',
      display: 'Amount',
      type: 'number',
      required: true,
      description: 'Forecast amount',
      aliases: ['amount', 'value', 'forecastamt', 'forecast_amt'],
    },
    {
      field: 'driverType',
      display: 'Driver Type',
      type: 'string',
      required: false,
      description: 'Forecast driver type (free text, suggested: sales_volume, production_volume, headcount, square_meters, machine_hours, direct_labor_hours, manual, other)',
      aliases: ['drivertype', 'driver_type', 'driver type', 'driver'],
    },
    {
      field: 'notes',
      display: 'Notes',
      type: 'string',
      required: false,
      description: 'Forecast notes',
      aliases: ['notes', 'note', 'description', 'remarks'],
    },
  ],
  sampleRows: [],
  countQuery: 'forecastLine.count({ where: { forecastCycle: { companyId } } })',
});

export const actualLines = register({
  moduleKey: 'actual-lines',
  displayName: 'Actual Lines',
  description: 'Actual transactions and GL entries',
  entityLabel: 'Actual Line',
  prismaModel: 'actualLine',
  dbTable: 'actual_lines',
  hasCompanyId: false, // via actualImport.companyId
  endpoint: '/actual-imports',
  page: 'actuals',
  importOrder: 20,
  dependencies: ['companies', 'accounts', 'sites', 'cost-centers', 'products', 'materials', 'customers'],
  strategy: 'insert-child',
  updateOnly: false,
  columns: [
    {
      field: 'accountCode',
      display: 'Account',
      type: 'string',
      required: true,
      description: 'Account code or name (must exist in Accounts)',
      aliases: ['accountcode', 'account_code', 'account code', 'account', 'glcode', 'gl_code', 'code'],
      fkLookup: {
        model: 'account',
        lookupFields: ['code', 'name'],
        assignField: 'accountId',
        label: 'Account',
      },
    },
    {
      field: 'siteCode',
      display: 'Site',
      type: 'string',
      required: false,
      description: 'Site name (must exist in Sites)',
      aliases: ['sitecode', 'site_code', 'site code', 'sitename', 'site_name', 'site name', 'site', 'location', 'org', 'organization'],
      fkLookup: {
        model: 'site',
        lookupFields: ['name'],
        assignField: 'siteId',
        label: 'Site',
      },
    },
    {
      field: 'costCenterCode',
      display: 'Cost Center',
      type: 'string',
      required: false,
      description: 'Cost center code or name (must exist in Cost Centers)',
      aliases: ['costcentercode', 'cost_center_code', 'cost center code', 'costcenter', 'cc', 'cccode'],
      fkLookup: {
        model: 'costCenter',
        lookupFields: ['code', 'name'],
        assignField: 'costCenterId',
        label: 'Cost Center',
      },
    },
    {
      field: 'productSku',
      display: 'Product',
      type: 'string',
      required: false,
      description: 'Product SKU or name (must exist in Products)',
      aliases: ['productsku', 'product_sku', 'product sku', 'sku', 'itemcode', 'item_code', 'productcode', 'code', 'product'],
      fkLookup: {
        model: 'product',
        lookupFields: ['sku', 'name'],
        assignField: 'productId',
        label: 'Product',
      },
    },
    {
      field: 'materialCode',
      display: 'Material',
      type: 'string',
      required: false,
      description: 'Material code or name (must exist in Materials)',
      aliases: ['materialcode', 'material_code', 'material code', 'material', 'code'],
      fkLookup: {
        model: 'material',
        lookupFields: ['code', 'name'],
        assignField: 'materialId',
        label: 'Material',
      },
    },
    {
      field: 'customerCode',
      display: 'Customer',
      type: 'string',
      required: false,
      description: 'Customer code or name (must exist in Customers)',
      aliases: ['customercode', 'customer_code', 'customer code', 'customer', 'code'],
      fkLookup: {
        model: 'customer',
        lookupFields: ['code', 'name'],
        assignField: 'customerId',
        label: 'Customer',
      },
    },
    {
      field: 'transactionDate',
      display: 'Transaction Date',
      type: 'date',
      required: true,
      description: 'Date (YYYY-MM-DD)',
      aliases: ['transactiondate', 'transaction_date', 'transaction date', 'date', 'actualdate', 'actual date', 'invoicedate', 'invoice date', 'postingdate', 'posting date', 'trxdate', 'trx_date', 'tarih', 'تاريخ', 'fecha'],
    },
    {
      field: 'quantity',
      display: 'Quantity',
      type: 'number',
      required: false,
      description: 'Transaction quantity',
      defaultValue: 0,
      aliases: ['quantity', 'qty', 'actualqty', 'actual_qty'],
    },
    {
      field: 'unitPrice',
      display: 'Unit Price',
      type: 'number',
      required: false,
      description: 'Unit price',
      defaultValue: 0,
      aliases: ['unitprice', 'unit_price', 'unit price', 'price'],
    },
    {
      field: 'amount',
      display: 'Amount',
      type: 'number',
      required: true,
      description: 'Transaction amount',
      aliases: ['amount', 'value', 'actualamt', 'actual_amt'],
    },
    {
      field: 'referenceNo',
      display: 'Reference No',
      type: 'string',
      required: false,
      description: 'Invoice or reference number',
      aliases: ['referenceno', 'reference_no', 'reference number', 'reference no', 'refno', 'ref no'],
    },
  ],
  sampleRows: [],
  countQuery: 'actualLine.count({ where: { actualImport: { companyId } } })',
});

/* ==============================================================================
   Additional Modules – Backend-only / Future
   ============================================================================== */

export const promotions = register({
  moduleKey: 'promotions',
  displayName: 'Promotions',
  description: 'Sales promotions and discounts',
  entityLabel: 'Promotion',
  prismaModel: 'promotion',
  dbTable: 'promotions',
  hasCompanyId: true,
  endpoint: '/promotions',
  page: 'promotions',
  importOrder: 21,
  dependencies: ['companies', 'products', 'customers'],
  strategy: 'insert',
  updateOnly: false,
  columns: [
    {
      field: 'name',
      display: 'Promotion Name',
      type: 'string',
      required: true,
      description: 'Promotion title',
      aliases: ['name', 'promotionname', 'promotion_name', 'promotion name', 'title'],
    },
    {
      field: 'description',
      display: 'Description',
      type: 'string',
      required: false,
      description: 'Promotion description',
      aliases: ['description', 'desc', 'promo_desc'],
    },
    {
      field: 'productSku',
      display: 'Product SKU',
      type: 'string',
      required: false,
      description: 'Product SKU (must exist in Products)',
      aliases: ['productsku', 'product_sku', 'product sku', 'sku', 'product'],
      fkLookup: {
        model: 'product',
        lookupFields: ['sku', 'name'],
        assignField: 'productId',
        label: 'Product',
      },
    },
    {
      field: 'customerCode',
      display: 'Customer Code',
      type: 'string',
      required: false,
      description: 'Customer code (must exist in Customers)',
      aliases: ['customercode', 'customer_code', 'customer code', 'customer'],
      fkLookup: {
        model: 'customer',
        lookupFields: ['code', 'name'],
        assignField: 'customerId',
        label: 'Customer',
      },
    },
    {
      field: 'discountPct',
      display: 'Discount %',
      type: 'number',
      required: false,
      description: 'Discount percentage',
      aliases: ['discountpct', 'discount_pct', 'discount %', 'discountpercentage'],
    },
    {
      field: 'discountAmt',
      display: 'Discount Amount',
      type: 'number',
      required: false,
      description: 'Fixed discount amount',
      aliases: ['discountamt', 'discount_amt', 'discountamount', 'discount_amount'],
    },
    {
      field: 'startDate',
      display: 'Start Date',
      type: 'date',
      required: true,
      description: 'Promotion start date (YYYY-MM-DD)',
      aliases: ['startdate', 'start_date', 'start date', 'from'],
    },
    {
      field: 'endDate',
      display: 'End Date',
      type: 'date',
      required: false,
      description: 'Promotion end date (YYYY-MM-DD)',
      aliases: ['enddate', 'end_date', 'end date', 'to'],
    },
    {
      field: 'budgetAmt',
      display: 'Budget Amount',
      type: 'number',
      required: false,
      description: 'Promotion budget amount',
      aliases: ['budgetamt', 'budget_amt', 'budgetamount', 'budget'],
    },
    {
      field: 'actualCost',
      display: 'Actual Cost',
      type: 'number',
      required: false,
      description: 'Actual promotion cost',
      aliases: ['actualcost', 'actual_cost', 'actualcostamt'],
    },
    {
      field: 'incrementalRevenue',
      display: 'Incremental Revenue',
      type: 'number',
      required: false,
      description: 'Incremental revenue generated',
      aliases: ['incrementalrevenue', 'incremental_revenue', 'incremental revenue'],
    },
    {
      field: 'roi',
      display: 'ROI',
      type: 'number',
      required: false,
      description: 'Return on investment',
      aliases: ['roi', 'returnoninvestment'],
    },
    {
      field: 'isActive',
      display: 'Is Active',
      type: 'boolean',
      required: false,
      description: 'true or false (default: true)',
      defaultValue: true,
      aliases: ['isactive', 'is_active', 'active', 'status'],
    },
  ],
  sampleRows: [],
  countQuery: 'promotion.count({ where: { companyId } })',
});

export const headcountPlans = register({
  moduleKey: 'headcount-plans',
  displayName: 'Headcount Plans',
  description: 'Employee headcount and salary planning',
  entityLabel: 'Headcount Plan',
  prismaModel: 'headcountPlan',
  dbTable: 'headcount_plans',
  hasCompanyId: false, // via budgetCycle.companyId
  endpoint: '/headcount-plans',
  page: 'headcount-plans',
  importOrder: 22,
  dependencies: ['companies', 'budget-lines?', 'sites', 'cost-centers'],
  strategy: 'insert',
  updateOnly: false,
  columns: [
    {
      field: 'budgetCycleName',
      display: 'Budget Cycle',
      type: 'string',
      required: true,
      description: 'Budget cycle name (must exist in Budget Cycles)',
      aliases: ['budgetcyclename', 'budget_cycle_name', 'budget cycle name', 'budgetcycle', 'budget cycle', 'cycle'],
      fkLookup: {
        model: 'budgetCycle',
        lookupFields: ['name'],
        assignField: 'budgetCycleId',
        label: 'Budget Cycle',
      },
    },
    {
      field: 'siteName',
      display: 'Site Name',
      type: 'string',
      required: false,
      description: 'Site name (must exist in Sites)',
      aliases: ['sitecode', 'site_code', 'site code', 'sitename', 'site_name', 'site name', 'site', 'location'],
      fkLookup: {
        model: 'site',
        lookupFields: ['name'],
        assignField: 'siteId',
        label: 'Site',
      },
    },
    {
      field: 'costCenterCode',
      display: 'Cost Center',
      type: 'string',
      required: false,
      description: 'Cost center code or name (must exist in Cost Centers)',
      aliases: ['costcentercode', 'cost_center_code', 'cost center code', 'costcenter', 'cc', 'cccode'],
      fkLookup: {
        model: 'costCenter',
        lookupFields: ['code', 'name'],
        assignField: 'costCenterId',
        label: 'Cost Center',
      },
    },
    {
      field: 'jobTitle',
      display: 'Job Title',
      type: 'string',
      required: true,
      description: 'Job title for the headcount',
      aliases: ['jobtitle', 'job_title', 'job title', 'title', 'position'],
    },
    {
      field: 'department',
      display: 'Department',
      type: 'string',
      required: false,
      description: 'Department name',
      aliases: ['department', 'dept', 'division'],
    },
    {
      field: 'employmentType',
      display: 'Employment Type',
      type: 'enum',
      required: false,
      description: 'Type of employment (matches Prisma EmploymentType enum)',
      defaultValue: 'full_time',
      allowedValues: ['full_time', 'part_time', 'contract', 'seasonal'],
      aliases: ['employmenttype', 'employment_type', 'employment type', 'emptype'],
    },
    {
      field: 'periodMonth',
      display: 'Period Month',
      type: 'number',
      required: true,
      description: 'Month number 1–12',
      aliases: ['periodmonth', 'period_month', 'period month', 'month'],
    },
    {
      field: 'headcount',
      display: 'Headcount',
      type: 'number',
      required: false,
      description: 'Number of employees',
      defaultValue: 1,
      aliases: ['headcount', 'count', 'ftes', 'number_of_employees'],
    },
    {
      field: 'basicSalary',
      display: 'Basic Salary',
      type: 'number',
      required: false,
      description: 'Monthly basic salary',
      defaultValue: 0,
      aliases: ['basicsalary', 'basic_salary', 'basic salary', 'salary'],
    },
    {
      field: 'allowances',
      display: 'Allowances',
      type: 'number',
      required: false,
      description: 'Monthly allowances',
      defaultValue: 0,
      aliases: ['allowances', 'benefits', 'housing', 'transport'],
    },
    {
      field: 'socialInsurance',
      display: 'Social Insurance',
      type: 'number',
      required: false,
      description: 'Monthly social insurance cost',
      defaultValue: 0,
      aliases: ['socialinsurance', 'social_insurance', 'social insurance', 'insurance'],
    },
    {
      field: 'totalCost',
      display: 'Total Cost',
      type: 'number',
      required: true,
      description: 'Total monthly cost (salary + allowances + insurance)',
      aliases: ['totalcost', 'total_cost', 'total cost', 'total'],
    },
    {
      field: 'notes',
      display: 'Notes',
      type: 'string',
      required: false,
      description: 'Headcount notes or description',
      aliases: ['notes', 'note', 'description', 'remarks', 'comment'],
    },
  ],
  sampleRows: [],
  countQuery: 'headcountPlan.count({ where: { budgetCycle: { companyId } } })',
});

export const notificationRules = register({
  moduleKey: 'notification-rules',
  displayName: 'Notification Rules',
  description: 'Alert and notification trigger rules',
  entityLabel: 'Notification Rule',
  prismaModel: 'notificationRule',
  dbTable: 'notification_rules',
  hasCompanyId: true,
  endpoint: '/notification-rules',
  page: 'notification-rules',
  importOrder: 23,
  dependencies: ['companies', 'accounts', 'sites'],
  strategy: 'insert',
  updateOnly: false,
  columns: [
    {
      field: 'ruleName',
      display: 'Rule Name',
      type: 'string',
      required: true,
      description: 'Name of the notification rule',
      aliases: ['rulename', 'rule_name', 'rule name', 'name', 'title'],
    },
    {
      field: 'triggerType',
      display: 'Trigger Type',
      type: 'enum',
      required: true,
      description: 'Event that triggers this rule (matches Prisma TriggerType enum)',
      allowedValues: ['variance_pct', 'variance_amount', 'kpi_breach', 'budget_approval', 'forecast_approval', 'import_failed'],
      aliases: ['triggertype', 'trigger_type', 'trigger type', 'trigger', 'event'],
    },
    {
      field: 'thresholdValue',
      display: 'Threshold Value',
      type: 'number',
      required: false,
      description: 'Threshold that triggers the alert',
      aliases: ['thresholdvalue', 'threshold_value', 'threshold value', 'threshold'],
    },
    {
      field: 'accountCode',
      display: 'Account Code',
      type: 'string',
      required: false,
      description: 'Account to monitor (must exist in Accounts)',
      aliases: ['accountcode', 'account_code', 'account code', 'account', 'glcode', 'code'],
      fkLookup: {
        model: 'account',
        lookupFields: ['code', 'name'],
        assignField: 'accountId',
        label: 'Account',
      },
    },
    {
      field: 'siteName',
      display: 'Site Name',
      type: 'string',
      required: false,
      description: 'Site to monitor (must exist in Sites)',
      aliases: ['sitename', 'site_name', 'site name', 'site', 'location'],
      fkLookup: {
        model: 'site',
        lookupFields: ['name'],
        assignField: 'siteId',
        label: 'Site',
      },
    },
    {
      field: 'channel',
      display: 'Notification Channel',
      type: 'string',
      required: false,
      description: 'Comma-separated channels (e.g. system,email)',
      defaultValue: 'system,email',
      aliases: ['channel', 'channels', 'notify_channel'],
    },
    {
      field: 'isActive',
      display: 'Is Active',
      type: 'boolean',
      required: false,
      description: 'true or false (default: true)',
      defaultValue: true,
      aliases: ['isactive', 'is_active', 'active', 'status'],
    },
  ],
  sampleRows: [],
  countQuery: 'notificationRule.count({ where: { companyId } })',
});

/* ==============================================================================
   Legacy / Backend-Only Modules (no frontend page)
   ============================================================================== */

export const salesPlans = register({
  moduleKey: 'sales-plans',
  displayName: 'Sales Plans',
  description: 'Sales planning by product and period',
  entityLabel: 'Sales Plan',
  prismaModel: 'productionPlan',
  dbTable: 'production_plans',
  hasCompanyId: true,
  endpoint: '/sales-plans',
  importOrder: 25,
  dependencies: ['companies', 'products', 'sites'],
  strategy: 'upsert',
  updateOnly: false,
  columns: [
    {
      field: 'productSku',
      display: 'Product SKU',
      type: 'string',
      required: true,
      description: 'Product SKU',
      aliases: ['productsku', 'product_sku', 'product sku', 'sku', 'product'],
      fkLookup: {
        model: 'product',
        lookupFields: ['sku', 'name'],
        assignField: 'productId',
        label: 'Product',
      },
    },
    {
      field: 'siteName',
      display: 'Site Name',
      type: 'string',
      required: true,
      description: 'Site name',
      aliases: ['sitename', 'site_name', 'site name', 'site'],
      fkLookup: {
        model: 'site',
        lookupFields: ['name'],
        assignField: 'siteId',
        label: 'Site',
      },
    },
    {
      field: 'fiscalYear',
      display: 'Fiscal Year',
      type: 'number',
      required: true,
      description: 'Fiscal year',
      aliases: ['fiscalyear', 'fiscal_year', 'fiscal year', 'year'],
    },
    {
      field: 'periodMonth',
      display: 'Period Month',
      type: 'number',
      required: true,
      description: 'Month number',
      aliases: ['periodmonth', 'period_month', 'period month', 'month'],
    },
    {
      field: 'plannedQty',
      display: 'Planned Sales Qty',
      type: 'number',
      required: true,
      description: 'Planned sales quantity',
      defaultValue: 0,
      aliases: ['plannedqty', 'planned_qty', 'planned qty', 'salesqty', 'sales_qty'],
    },
    {
      field: 'actualQty',
      display: 'Actual Sales Qty',
      type: 'number',
      required: false,
      description: 'Actual sales quantity',
      aliases: ['actualqty', 'actual_qty', 'actual qty', 'actualsales'],
    },
  ],
  sampleRows: [],
  countQuery: 'productionPlan.count({ where: { companyId } })',
});

/**
 * Normalize module key: strip hyphens/underscores, lowercase.
 * Preserves backward compatibility with existing module name conventions.
 */
export function normalizeModuleName(moduleName: string): string {
  const mod = moduleName.toLowerCase().replace(/[-_]/g, '');
  if (mod === 'rawmaterialprices') return 'rawmaterialprices';
  return mod;
}

/**
 * Resolve a frontend module key to its canonical definition key.
 * Handles the mapping between kebab-case URLs and definition keys.
 */
export function resolveModuleKey(raw: string): string | undefined {
  const normalized = raw.toLowerCase().replace(/[-_]/g, '');

  // Direct match
  for (const def of REGISTRY.values()) {
    if (def.moduleKey.replace(/[-_]/g, '') === normalized) return def.moduleKey;
  }

  // Special aliases
  const aliasMap: Record<string, string> = {
    materialprices: 'raw-material-prices',
    rawmaterialprices: 'raw-material-prices',
    budgetlines: 'budget-lines',
    forecastlines: 'forecast-lines',
    actuallines: 'actual-lines',
    bomrecipes: 'bom-recipes',
    bomrecipelist: 'bom-recipes',
    costcenters: 'cost-centers',
    productcategories: 'product-categories',
    kpitargets: 'kpi-targets',
    exchangerates: 'exchange-rates',
    productionplans: 'production-plans',
    productionallocations: 'production-allocations',
    yieldwaste: 'yield-waste',
    notificationrules: 'notification-rules',
    headcountplans: 'headcount-plans',
    salesplans: 'sales-plans',
  };

  return aliasMap[normalized];
}
