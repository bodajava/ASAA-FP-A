/**
 * Client Workbook Schema
 *
 * Defines the exact structure of the client's Excel workbook.
 * Every sheet name, column name, column order, required/optional flags,
 * and module mapping is derived from this single source of truth.
 *
 * Generated from: Prisma schema, manufacturing test dataset headers,
 * budget/forecast sample templates, and ERP module mapper patterns.
 */

export interface ColumnDef {
  /** Header displayed in the Excel file */
  display: string;
  /** Internal field name used by the import engine */
  field: string;
  /** Whether this column is required for import */
  required: boolean;
  /** Data type for validation */
  type: 'string' | 'number' | 'date' | 'boolean';
  /** Human-readable description shown as comment or tooltip */
  description: string;
  /** For string fields: comma-separated allowed values (enum) */
  allowedValues?: string[];
}

export type SheetRole = 'data' | 'reference' | 'instruction' | 'ignored';

export interface SheetDef {
  /** Exact sheet name in the workbook */
  sheetName: string;
  /** ERP module key (matches MODULE_REGISTRY in erp-module-mapper) */
  module: string;
  /** Human-readable description */
  description: string;
  /** Ordered column definitions */
  columns: ColumnDef[];
  /** Module key that must be imported first */
  requiresParent?: string;
  /** Role of the sheet: data (importable), reference (reference data lookup), instruction (how-to guide), ignored (skipped entirely) */
  role: SheetRole;
}

/* ─── Client Workbook Schema ─────────────────────────────────────────── */

/* ─── Non-data sheet names (reference/instruction) ──────────────────── */

export const NON_DATA_SHEET_NAMES = new Set([
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
]);

export const REFERENCE_SHEET_NAMES = new Set([
  'reference lists',
  'accounts reference',
  'sites reference',
  'cost centers reference',
  'products reference',
  'materials reference',
  'customers reference',
  'budget cycles reference',
]);

export function classifySheetRole(sheetName: string): {
  role: SheetRole;
  mappedModule: string;
} {
  const sn = sheetName.toLowerCase().trim();
  if (sn === 'start here' || sn === 'instructions') {
    return { role: 'instruction', mappedModule: '' };
  }
  if (REFERENCE_SHEET_NAMES.has(sn)) {
    return { role: 'reference', mappedModule: '' };
  }
  if (sn.startsWith('_') || sn.startsWith('hidden') || sn === 'sheet1') {
    return { role: 'ignored', mappedModule: '' };
  }
  return { role: 'data', mappedModule: '' };
}

export const CLIENT_WORKBOOK_SHEETS: SheetDef[] = [
  {
    sheetName: 'Companies',
    module: 'companies',
    description: 'Company master data',
    role: 'data',
    columns: [
      {
        display: 'Company Name',
        field: 'name',
        required: true,
        type: 'string',
        description: 'Trading name of the company',
      },
      {
        display: 'Legal Name',
        field: 'legalName',
        required: false,
        type: 'string',
        description: 'Official registered legal name',
      },
      {
        display: 'Industry Type',
        field: 'industryType',
        required: false,
        type: 'string',
        description: 'Business sector',
        allowedValues: [
          'food_processing',
          'beverage',
          'dairy',
          'bakery',
          'pharmaceutical',
          'chemical',
          'textile',
          'automotive',
          'electronics',
          'retail',
          'services',
          'mixed',
        ],
      },
      {
        display: 'Currency Code',
        field: 'currencyCode',
        required: false,
        type: 'string',
        description: 'ISO 4217 currency (e.g. EGP, USD)',
      },
      {
        display: 'Tax Number',
        field: 'taxNumber',
        required: false,
        type: 'string',
        description: 'Tax registration number',
      },
      {
        display: 'Fiscal Year Start Month',
        field: 'fiscalYearStartMonth',
        required: false,
        type: 'number',
        description: 'Month number 1-12 (default: 1 = January)',
      },
    ],
  },
  {
    sheetName: 'Sites',
    module: 'sites',
    description: 'Factories, warehouses, branches, and offices',
    role: 'data',
    columns: [
      {
        display: 'Site Name',
        field: 'name',
        required: true,
        type: 'string',
        description: 'Name of the site',
      },
      {
        display: 'Type',
        field: 'type',
        required: true,
        type: 'string',
        description: 'Site type',
        allowedValues: [
          'factory',
          'warehouse',
          'branch',
          'office',
          'distribution_center',
        ],
      },
      {
        display: 'Region',
        field: 'region',
        required: false,
        type: 'string',
        description: 'Geographic region',
      },
      {
        display: 'Address',
        field: 'address',
        required: false,
        type: 'string',
        description: 'Full address',
      },
      {
        display: 'City',
        field: 'city',
        required: false,
        type: 'string',
        description: 'City name',
      },
      {
        display: 'Country',
        field: 'country',
        required: false,
        type: 'string',
        description: 'Country name',
      },
      {
        display: 'Phone',
        field: 'phone',
        required: false,
        type: 'string',
        description: 'Contact phone number',
      },
      {
        display: 'Status',
        field: 'status',
        required: false,
        type: 'string',
        description: 'Active or inactive',
        allowedValues: ['active', 'inactive'],
      },
    ],
  },
  {
    sheetName: 'Units',
    module: 'units',
    description: 'Units of measurement',
    role: 'data',
    requiresParent: undefined,
    columns: [
      {
        display: 'Unit Name',
        field: 'name',
        required: true,
        type: 'string',
        description: 'Full name (e.g. Kilogram)',
      },
      {
        display: 'Symbol',
        field: 'symbol',
        required: true,
        type: 'string',
        description: 'Short symbol (e.g. kg)',
      },
      {
        display: 'Type',
        field: 'type',
        required: false,
        type: 'string',
        description: 'Unit type',
        allowedValues: [
          'weight',
          'volume',
          'piece',
          'length',
          'area',
          'time',
          'other',
        ],
      },
    ],
  },
  {
    sheetName: 'Accounts',
    module: 'accounts',
    description: 'Chart of accounts',
    role: 'data',
    columns: [
      {
        display: 'Account Code',
        field: 'code',
        required: true,
        type: 'string',
        description: 'Unique GL account code',
      },
      {
        display: 'Account Name',
        field: 'name',
        required: true,
        type: 'string',
        description: 'Account display name',
      },
      {
        display: 'Type',
        field: 'type',
        required: true,
        type: 'string',
        description: 'Account type',
        allowedValues: [
          'revenue',
          'cogs',
          'expense',
          'asset',
          'liability',
          'equity',
          'cashflow',
        ],
      },
      {
        display: 'Parent Code',
        field: 'parentCode',
        required: false,
        type: 'string',
        description: 'Parent account code for hierarchy',
      },
      {
        display: 'Is Active',
        field: 'isActive',
        required: false,
        type: 'boolean',
        description: 'true or false (default: true)',
      },
    ],
  },
  {
    sheetName: 'Cost Centers',
    module: 'costcenters',
    description: 'Cost centers and departments',
    role: 'data',
    columns: [
      {
        display: 'Cost Center Code',
        field: 'code',
        required: true,
        type: 'string',
        description: 'Unique cost center code',
      },
      {
        display: 'Cost Center Name',
        field: 'name',
        required: true,
        type: 'string',
        description: 'Department or cost center name',
      },
      {
        display: 'Type',
        field: 'type',
        required: false,
        type: 'string',
        description: 'Functional type',
        allowedValues: [
          'sales',
          'production',
          'admin',
          'marketing',
          'logistics',
          'maintenance',
          'other',
        ],
      },
      {
        display: 'Site Name',
        field: 'siteName',
        required: false,
        type: 'string',
        description: 'Associated site name (must exist in Sites sheet)',
      },
    ],
  },
  {
    sheetName: 'Product Categories',
    module: 'productcategories',
    description: 'Product category hierarchy',
    role: 'data',
    columns: [
      {
        display: 'Category Name',
        field: 'name',
        required: true,
        type: 'string',
        description: 'Category name',
      },
      {
        display: 'Parent Category',
        field: 'parentCategoryName',
        required: false,
        type: 'string',
        description: 'Parent category name for hierarchy',
      },
    ],
  },
  {
    sheetName: 'Customers',
    module: 'customers',
    description: 'Customer master data',
    role: 'data',
    columns: [
      {
        display: 'Customer Code',
        field: 'code',
        required: true,
        type: 'string',
        description: 'Unique customer code',
      },
      {
        display: 'Customer Name',
        field: 'name',
        required: true,
        type: 'string',
        description: 'Customer business name',
      },
      {
        display: 'Customer Type',
        field: 'customerType',
        required: false,
        type: 'string',
        description: 'Segment type',
        allowedValues: [
          'retail',
          'wholesale',
          'distributor',
          'internal',
          'other',
        ],
      },
      {
        display: 'Region',
        field: 'region',
        required: false,
        type: 'string',
        description: 'Geographic region',
      },
      {
        display: 'Country',
        field: 'country',
        required: false,
        type: 'string',
        description: 'Country name',
      },
      {
        display: 'City',
        field: 'city',
        required: false,
        type: 'string',
        description: 'City name',
      },
      {
        display: 'Phone',
        field: 'phone',
        required: false,
        type: 'string',
        description: 'Contact phone',
      },
      {
        display: 'Email',
        field: 'email',
        required: false,
        type: 'string',
        description: 'Contact email',
      },
      {
        display: 'Credit Limit',
        field: 'creditLimit',
        required: false,
        type: 'number',
        description: 'Credit limit amount',
      },
      {
        display: 'Payment Terms',
        field: 'paymentTerms',
        required: false,
        type: 'number',
        description: 'Payment terms in days',
      },
      {
        display: 'Is Active',
        field: 'isActive',
        required: false,
        type: 'boolean',
        description: 'true or false (default: true)',
      },
    ],
  },
  {
    sheetName: 'Suppliers',
    module: 'suppliers',
    description: 'Supplier and vendor master data',
    role: 'data',
    columns: [
      {
        display: 'Supplier Code',
        field: 'code',
        required: false,
        type: 'string',
        description: 'Unique supplier code',
      },
      {
        display: 'Supplier Name',
        field: 'name',
        required: true,
        type: 'string',
        description: 'Supplier business name',
      },
      {
        display: 'Supplier Type',
        field: 'supplierType',
        required: false,
        type: 'string',
        description: 'Supplier classification',
        allowedValues: [
          'raw_material',
          'packaging',
          'services',
          'equipment',
          'other',
        ],
      },
      {
        display: 'Country',
        field: 'country',
        required: false,
        type: 'string',
        description: 'Country name',
      },
      {
        display: 'City',
        field: 'city',
        required: false,
        type: 'string',
        description: 'City name',
      },
      {
        display: 'Phone',
        field: 'phone',
        required: false,
        type: 'string',
        description: 'Contact phone',
      },
      {
        display: 'Email',
        field: 'email',
        required: false,
        type: 'string',
        description: 'Contact email',
      },
      {
        display: 'Lead Time Days',
        field: 'leadTimeDays',
        required: false,
        type: 'number',
        description: 'Standard lead time in days',
      },
      {
        display: 'Is Active',
        field: 'isActive',
        required: false,
        type: 'boolean',
        description: 'true or false (default: true)',
      },
    ],
  },
  {
    sheetName: 'Materials',
    module: 'materials',
    description: 'Raw materials and packaging',
    role: 'data',
    columns: [
      {
        display: 'Material Code',
        field: 'code',
        required: true,
        type: 'string',
        description: 'Unique material code',
      },
      {
        display: 'Material Name',
        field: 'name',
        required: true,
        type: 'string',
        description: 'Material description',
      },
      {
        display: 'Material Type',
        field: 'materialType',
        required: false,
        type: 'string',
        description: 'Classification',
        allowedValues: [
          'raw_material',
          'packaging',
          'component',
          'consumable',
          'other',
        ],
      },
      {
        display: 'Unit Symbol',
        field: 'unitSymbol',
        required: true,
        type: 'string',
        description: 'Unit of measurement symbol (must exist in Units)',
      },
      {
        display: 'Purchase Price',
        field: 'purchasePrice',
        required: false,
        type: 'number',
        description: 'Current purchase price per unit',
      },
      {
        display: 'Supplier Name',
        field: 'supplierName',
        required: false,
        type: 'string',
        description: 'Primary supplier name (must exist in Suppliers)',
      },
      {
        display: 'Safety Stock Qty',
        field: 'safetyStockQty',
        required: false,
        type: 'number',
        description: 'Minimum safety stock level',
      },
      {
        display: 'Reorder Point',
        field: 'reorderPoint',
        required: false,
        type: 'number',
        description: 'Stock level triggering reorder',
      },
      {
        display: 'Is Active',
        field: 'isActive',
        required: false,
        type: 'boolean',
        description: 'true or false (default: true)',
      },
    ],
  },
  {
    sheetName: 'Products',
    module: 'products',
    description: 'Finished goods and sellable products',
    role: 'data',
    requiresParent: 'productcategories',
    columns: [
      {
        display: 'SKU',
        field: 'sku',
        required: true,
        type: 'string',
        description: 'Stock keeping unit code',
      },
      {
        display: 'Product Name',
        field: 'name',
        required: true,
        type: 'string',
        description: 'Product display name',
      },
      {
        display: 'Product Type',
        field: 'productType',
        required: false,
        type: 'string',
        description: 'Product classification',
        allowedValues: ['finished_good', 'semi_finished', 'service'],
      },
      {
        display: 'Category Name',
        field: 'categoryName',
        required: false,
        type: 'string',
        description: 'Product category name (must exist in Product Categories)',
      },
      {
        display: 'Unit Symbol',
        field: 'unitSymbol',
        required: true,
        type: 'string',
        description: 'Unit of measurement symbol (must exist in Units)',
      },
      {
        display: 'Standard Cost',
        field: 'standardCost',
        required: false,
        type: 'number',
        description: 'Standard cost per unit',
      },
      {
        display: 'Selling Price',
        field: 'salePrice',
        required: false,
        type: 'number',
        description: 'Selling price per unit',
      },
      {
        display: 'Weight (kg)',
        field: 'weight',
        required: false,
        type: 'number',
        description: 'Net weight in kilograms',
      },
      {
        display: 'Is Active',
        field: 'isActive',
        required: false,
        type: 'boolean',
        description: 'true or false (default: true)',
      },
    ],
  },
  {
    sheetName: 'BOM Recipes',
    module: 'bomrecipes',
    description: 'Bill of materials recipes',
    role: 'data',
    requiresParent: 'products',
    columns: [
      {
        display: 'Product SKU',
        field: 'productSku',
        required: true,
        type: 'string',
        description: 'Product SKU this BOM belongs to',
      },
      {
        display: 'Version',
        field: 'version',
        required: false,
        type: 'string',
        description: 'BOM version (default: v1)',
      },
      {
        display: 'Output Qty',
        field: 'outputQty',
        required: false,
        type: 'number',
        description: 'Output quantity per batch',
      },
      {
        display: 'Wastage %',
        field: 'wastagePct',
        required: false,
        type: 'number',
        description: 'Expected wastage percentage',
      },
      {
        display: 'Labor Cost',
        field: 'laborCost',
        required: false,
        type: 'number',
        description: 'Labor cost per unit',
      },
      {
        display: 'Overhead Cost',
        field: 'overheadCost',
        required: false,
        type: 'number',
        description: 'Overhead cost per unit',
      },
      {
        display: 'Material Code',
        field: 'materialCode',
        required: true,
        type: 'string',
        description: 'Material code (must exist in Materials)',
      },
      {
        display: 'Qty Per Output',
        field: 'qtyPerOutput',
        required: true,
        type: 'number',
        description: 'Quantity of material per output unit',
      },
      {
        display: 'BOM Line Wastage %',
        field: 'bomLineWastagePct',
        required: false,
        type: 'number',
        description: 'Material-level wastage percentage',
      },
    ],
  },
  {
    sheetName: 'Budget',
    module: 'budgetlines',
    description: 'Annual budget data by account, site, cost center',
    role: 'data',
    columns: [
      {
        display: 'Budget Cycle',
        field: 'budgetCycleName',
        required: true,
        type: 'string',
        description: 'Budget cycle name (e.g. FY25 Annual Budget)',
      },
      {
        display: 'Fiscal Year',
        field: 'fiscalYear',
        required: true,
        type: 'number',
        description: 'Fiscal year (e.g. 2025)',
      },
      {
        display: 'Account',
        field: 'accountCode',
        required: true,
        type: 'string',
        description: 'Account code or name from Accounts master data',
      },
      {
        display: 'Site',
        field: 'siteCode',
        required: false,
        type: 'string',
        description:
          'Site name from Sites master data (no code field in Sites)',
      },
      {
        display: 'Cost Center',
        field: 'costCenterCode',
        required: false,
        type: 'string',
        description:
          'Cost center code or name (code is optional in Cost Centers)',
      },
      {
        display: 'Product',
        field: 'productSku',
        required: false,
        type: 'string',
        description: 'Product SKU or name from Products master data',
      },
      {
        display: 'Material',
        field: 'materialCode',
        required: false,
        type: 'string',
        description: 'Material code or name (optional)',
      },
      {
        display: 'Customer',
        field: 'customerCode',
        required: false,
        type: 'string',
        description: 'Customer code or name (optional)',
      },
      {
        display: 'Month',
        field: 'periodMonth',
        required: true,
        type: 'number',
        description:
          'Month number (1-12), month name (e.g. January), or Arabic month name',
      },
      {
        display: 'Quantity',
        field: 'quantity',
        required: false,
        type: 'number',
        description: 'Planned quantity',
      },
      {
        display: 'Unit Price',
        field: 'unitPrice',
        required: false,
        type: 'number',
        description: 'Planned unit price',
      },
      {
        display: 'Amount',
        field: 'amount',
        required: true,
        type: 'number',
        description: 'Budget amount',
      },
      {
        display: 'Notes',
        field: 'notes',
        required: false,
        type: 'string',
        description: 'Budget notes or description',
      },
    ],
  },
  {
    sheetName: 'Forecast',
    module: 'forecastlines',
    description: 'Monthly forecast data',
    role: 'data',
    columns: [
      {
        display: 'Forecast Cycle',
        field: 'forecastCycleName',
        required: true,
        type: 'string',
        description: 'Forecast cycle name (e.g. FY25 Rolling Q1)',
      },
      {
        display: 'Fiscal Year',
        field: 'fiscalYear',
        required: true,
        type: 'number',
        description: 'Fiscal year (e.g. 2025)',
      },
      {
        display: 'Account',
        field: 'accountCode',
        required: true,
        type: 'string',
        description: 'Account code or name from Accounts master data',
      },
      {
        display: 'Site',
        field: 'siteCode',
        required: false,
        type: 'string',
        description: 'Site name from Sites master data',
      },
      {
        display: 'Cost Center',
        field: 'costCenterCode',
        required: false,
        type: 'string',
        description: 'Cost center code or name from Cost Centers master data',
      },
      {
        display: 'Product',
        field: 'productSku',
        required: false,
        type: 'string',
        description: 'Product SKU or name from Products master data',
      },
      {
        display: 'Material',
        field: 'materialCode',
        required: false,
        type: 'string',
        description: 'Material code or name from Materials master data',
      },
      {
        display: 'Customer',
        field: 'customerCode',
        required: false,
        type: 'string',
        description: 'Customer code or name from Customers master data',
      },
      {
        display: 'Month',
        field: 'periodMonth',
        required: true,
        type: 'number',
        description: 'Month number (1-12)',
      },
      {
        display: 'Quantity',
        field: 'quantity',
        required: false,
        type: 'number',
        description: 'Forecast quantity',
      },
      {
        display: 'Unit Price',
        field: 'unitPrice',
        required: false,
        type: 'number',
        description: 'Forecast unit price',
      },
      {
        display: 'Amount',
        field: 'amount',
        required: true,
        type: 'number',
        description: 'Forecast amount',
      },
      {
        display: 'Driver Type',
        field: 'driverType',
        required: false,
        type: 'string',
        description: 'Forecast driver type',
        allowedValues: [
          'driver_based',
          'statistical',
          'manual',
          'trend',
          'seasonal',
        ],
      },
      {
        display: 'Notes',
        field: 'notes',
        required: false,
        type: 'string',
        description: 'Forecast notes',
      },
    ],
  },
  {
    sheetName: 'Actuals',
    module: 'actuallines',
    description: 'Actual transactions and GL entries',
    role: 'data',
    columns: [
      {
        display: 'Account',
        field: 'accountCode',
        required: true,
        type: 'string',
        description: 'Account code or name from Accounts master data',
      },
      {
        display: 'Site',
        field: 'siteCode',
        required: false,
        type: 'string',
        description: 'Site name from Sites master data',
      },
      {
        display: 'Cost Center',
        field: 'costCenterCode',
        required: false,
        type: 'string',
        description: 'Cost center code or name from Cost Centers master data',
      },
      {
        display: 'Product',
        field: 'productSku',
        required: false,
        type: 'string',
        description: 'Product SKU or name from Products master data',
      },
      {
        display: 'Material',
        field: 'materialCode',
        required: false,
        type: 'string',
        description: 'Material code or name from Materials master data',
      },
      {
        display: 'Customer',
        field: 'customerCode',
        required: false,
        type: 'string',
        description: 'Customer code or name from Customers master data',
      },
      {
        display: 'Transaction Date',
        field: 'transactionDate',
        required: true,
        type: 'date',
        description: 'Date (YYYY-MM-DD)',
      },
      {
        display: 'Quantity',
        field: 'quantity',
        required: false,
        type: 'number',
        description: 'Transaction quantity',
      },
      {
        display: 'Unit Price',
        field: 'unitPrice',
        required: false,
        type: 'number',
        description: 'Unit price',
      },
      {
        display: 'Amount',
        field: 'amount',
        required: true,
        type: 'number',
        description: 'Transaction amount',
      },
      {
        display: 'Reference No',
        field: 'referenceNo',
        required: false,
        type: 'string',
        description: 'Invoice or reference number',
      },
    ],
  },
  {
    sheetName: 'Material Prices',
    module: 'rawmaterialprices',
    description: 'Raw material price history',
    role: 'data',
    requiresParent: 'materials',
    columns: [
      {
        display: 'Material Code',
        field: 'materialCode',
        required: true,
        type: 'string',
        description: 'Material code',
      },
      {
        display: 'Price',
        field: 'price',
        required: true,
        type: 'number',
        description: 'Price per unit',
      },
      {
        display: 'Effective Date',
        field: 'effectiveDate',
        required: true,
        type: 'date',
        description: 'Price effective date (YYYY-MM-DD)',
      },
      {
        display: 'Notes',
        field: 'notes',
        required: false,
        type: 'string',
        description: 'Notes about the price change',
      },
    ],
  },
  {
    sheetName: 'Production Planning',
    module: 'productionplans',
    description: 'Production planning by product and period',
    role: 'data',
    requiresParent: 'products',
    columns: [
      {
        display: 'Product SKU',
        field: 'productSku',
        required: true,
        type: 'string',
        description: 'Product SKU',
      },
      {
        display: 'Site Name',
        field: 'siteName',
        required: false,
        type: 'string',
        description: 'Production site name',
      },
      {
        display: 'Fiscal Year',
        field: 'fiscalYear',
        required: true,
        type: 'number',
        description: 'Fiscal year (e.g. 2025)',
      },
      {
        display: 'Period Month',
        field: 'periodMonth',
        required: true,
        type: 'number',
        description: 'Month number (1-12)',
      },
      {
        display: 'Planned Qty',
        field: 'plannedQty',
        required: true,
        type: 'number',
        description: 'Planned production quantity',
      },
      {
        display: 'Actual Qty',
        field: 'actualQty',
        required: false,
        type: 'number',
        description: 'Actual production quantity',
      },
      {
        display: 'Status',
        field: 'status',
        required: false,
        type: 'string',
        description: 'Plan status',
        allowedValues: ['draft', 'planned', 'in_progress', 'completed'],
      },
    ],
  },
  {
    sheetName: 'Exchange Rates',
    module: 'exchangerates',
    description: 'Currency exchange rates',
    role: 'data',
    columns: [
      {
        display: 'From Currency',
        field: 'fromCurrency',
        required: true,
        type: 'string',
        description: 'Source currency ISO code (e.g. USD)',
      },
      {
        display: 'To Currency',
        field: 'toCurrency',
        required: true,
        type: 'string',
        description: 'Target currency ISO code (e.g. EGP)',
      },
      {
        display: 'Rate',
        field: 'rate',
        required: true,
        type: 'number',
        description: 'Exchange rate value',
      },
      {
        display: 'Rate Date',
        field: 'rateDate',
        required: true,
        type: 'date',
        description: 'Effective date (YYYY-MM-DD)',
      },
    ],
  },
  {
    sheetName: 'KPI Targets',
    module: 'kpitargets',
    description: 'KPI target values by period',
    role: 'data',
    columns: [
      {
        display: 'KPI Name',
        field: 'kpiName',
        required: true,
        type: 'string',
        description: 'Name of the KPI',
      },
      {
        display: 'KPI Category',
        field: 'kpiCategory',
        required: false,
        type: 'string',
        description: 'KPI category',
        allowedValues: [
          'financial',
          'operational',
          'sales',
          'production',
          'hr',
        ],
      },
      {
        display: 'Fiscal Year',
        field: 'fiscalYear',
        required: true,
        type: 'number',
        description: 'Fiscal year',
      },
      {
        display: 'Period Month',
        field: 'periodMonth',
        required: false,
        type: 'number',
        description: 'Month number (1-12), blank for annual',
      },
      {
        display: 'Target Value',
        field: 'targetValue',
        required: true,
        type: 'number',
        description: 'Target value',
      },
      {
        display: 'Unit',
        field: 'unit',
        required: false,
        type: 'string',
        description: 'Unit of measurement (e.g. %, EGP, kg)',
      },
      {
        display: 'Site Name',
        field: 'siteName',
        required: false,
        type: 'string',
        description: 'Site-specific target',
      },
    ],
  },
];

/* ─── Helper functions ───────────────────────────────────────────────── */

export function getSheetByModule(moduleKey: string): SheetDef | undefined {
  return CLIENT_WORKBOOK_SHEETS.find((s) => s.module === moduleKey);
}

export function getSheetByName(sheetName: string): SheetDef | undefined {
  return CLIENT_WORKBOOK_SHEETS.find((s) => s.sheetName === sheetName);
}

export function getAllModuleKeys(): string[] {
  return CLIENT_WORKBOOK_SHEETS.map((s) => s.module);
}

export function getModuleDescription(moduleKey: string): string {
  const sheet = getSheetByModule(moduleKey);
  return sheet?.description ?? moduleKey;
}
