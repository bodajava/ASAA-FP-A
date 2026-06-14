import type {
  AccountType,
  ConnectionType,
  SyncSchedule,
  ImportSourceSystem,
  ImportType,
  TriggerType,
} from '@/types/api';

export const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function getStatusVariant(status: string) {
  switch (status) {
    case 'approved':
    case 'posted':
      return 'success';
    case 'submitted':
    case 'validated':
      return 'info';
    case 'rejected':
    case 'failed':
      return 'danger';
    case 'locked':
      return 'default';
    default:
      return 'warning';
  }
}

export function getCurrentFiscalYear(): number {
  return new Date().getFullYear();
}

export type ReportType =
  | 'pl'
  | 'cashflow'
  | 'gross-margin'
  | 'net-profit'
  | 'budget-vs-actual'
  | 'forecast-accuracy'
  | 'product-profitability'
  | 'branch-profitability'
  | 'factory-costing'
  | 'inventory-coverage'
  | 'slow-moving-items'
  | 'wastage-analysis'
  | 'customer-profitability'
  | 'product-cost-variance'
  | 'production-capacity'
  | 'cash-flow-forecast';

export interface ReportMeta {
  value: ReportType;
  label: string;
  description: string;
  category: 'financial' | 'performance' | 'operations';
  paginated: boolean;
}

export const REPORT_METAS: ReportMeta[] = [
  { value: 'pl', label: 'Profit & Loss (P&L)', description: 'Summary of revenues, costs, and expenses over months', category: 'financial', paginated: false },
  { value: 'cashflow', label: 'Cash Flow Statement', description: 'Analysis of cash inflows and outflows by month', category: 'financial', paginated: false },
  { value: 'gross-margin', label: 'Gross Margin Analysis', description: 'Revenues, cost of goods sold, and gross margins', category: 'financial', paginated: false },
  { value: 'net-profit', label: 'Net Profit Margin', description: 'Bottom-line net profit performance and margins', category: 'financial', paginated: false },

  { value: 'budget-vs-actual', label: 'Budget vs Actuals', description: 'Itemized variances comparing budgets against actual data', category: 'performance', paginated: true },
  { value: 'forecast-accuracy', label: 'Forecast Accuracy', description: 'Assessment of forecast variances and absolute errors', category: 'performance', paginated: false },
  { value: 'product-profitability', label: 'Product Profitability', description: 'Margins, COGS, and sales performance by SKU', category: 'performance', paginated: true },
  { value: 'branch-profitability', label: 'Branch / Site Profitability', description: 'Revenue and expense performance broken down by site', category: 'performance', paginated: true },
  { value: 'customer-profitability', label: 'Customer Profitability', description: 'Top client margins and net profitability contribution', category: 'performance', paginated: true },

  { value: 'factory-costing', label: 'Factory Cost Analysis', description: 'Direct materials, direct labor, and manufacturing overhead costs', category: 'operations', paginated: false },
  { value: 'inventory-coverage', label: 'Inventory Coverage', description: 'Daily burn rate, stock quantities, and inventory value', category: 'operations', paginated: true },
  { value: 'slow-moving-items', label: 'Slow Moving Stock', description: 'Items with slow movement speeds over the last 90 days', category: 'operations', paginated: true },
  { value: 'wastage-analysis', label: 'Standard vs Actual Wastage', description: 'Raw material yield variances and product wastage', category: 'operations', paginated: false },
  { value: 'product-cost-variance', label: 'Product Cost Variance', description: 'Planned vs actual cost comparison by product (material, labor, overhead)', category: 'operations', paginated: true },
  { value: 'production-capacity', label: 'Production Capacity', description: 'Capacity utilization analysis by factory and product line', category: 'operations', paginated: true },
  { value: 'cash-flow-forecast', label: 'Cash Flow Forecast', description: 'AR/AP-based cash flow forecasting with working capital analysis', category: 'financial', paginated: false },
];

export const ACCOUNT_TYPES: AccountType[] = ['revenue', 'expense', 'asset', 'liability', 'equity'];

export const CONNECTION_TYPES: ConnectionType[] = [
  'oracle',
  'sap',
  'erp',
  'pms',
  'odoo',
  'pos',
  'woocommerce',
  'rest_api',
  'sftp',
  'custom',
];

export const SYNC_SCHEDULES: SyncSchedule[] = ['manual', 'hourly', 'daily', 'weekly', 'monthly'];

export const SOURCE_SYSTEMS: ImportSourceSystem[] = [
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

export const IMPORT_TYPES: { value: ImportType; label: string }[] = [
  { value: 'sales', label: 'Sales Transactions' },
  { value: 'expenses', label: 'Expenses / Ledger Transactions' },
  { value: 'production', label: 'Production Records' },
  { value: 'inventory', label: 'Inventory Snapshots' },
  { value: 'gl', label: 'General Ledger' },
  { value: 'cashflow', label: 'Cash Flow Transactions' },
  { value: 'payroll', label: 'Payroll Summaries' },
];

export const TRIGGER_TYPES: { value: TriggerType; label: string }[] = [
  { value: 'variance_pct', label: 'Variance Percentage Threshold' },
  { value: 'variance_amount', label: 'Variance Absolute Amount Threshold' },
  { value: 'kpi_breach', label: 'KPI Target Breach' },
  { value: 'budget_approval', label: 'Budget Approval Required' },
  { value: 'forecast_approval', label: 'Forecast Approval Required' },
  { value: 'import_failed', label: 'Data Import Failed' },
];
