// ---------------------------------------------------------------------------
// Shared paginated list response shape (backend returns this structure)
// ---------------------------------------------------------------------------
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ---------------------------------------------------------------------------
// Companies
// ---------------------------------------------------------------------------
export interface Company {
  id: string;
  name: string;
  code: string;
  currency?: string;
  fiscalYearStart?: number;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCompanyPayload {
  name: string;
  code: string;
  currency?: string;
  fiscalYearStart?: number;
}

export type UpdateCompanyPayload = Partial<CreateCompanyPayload>;

// ---------------------------------------------------------------------------
// Sites
// ---------------------------------------------------------------------------
export type SiteType = 'factory' | 'branch' | 'warehouse' | 'office' | 'other';
export type SiteStatus = 'active' | 'inactive';

export interface Site {
  id: string;
  name: string;
  type: SiteType;
  region?: string;
  address?: string;
  status: SiteStatus;
  companyId: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSitePayload {
  name: string;
  type: SiteType;
  region?: string;
  address?: string;
  status?: SiteStatus;
  managerUserId?: string;
}

export type UpdateSitePayload = Partial<CreateSitePayload>;

// ---------------------------------------------------------------------------
// Units
// ---------------------------------------------------------------------------
export interface Unit {
  id: string;
  name: string;
  symbol: string;
  companyId: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUnitPayload {
  name: string;
  symbol: string;
}

export type UpdateUnitPayload = Partial<CreateUnitPayload>;

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------
export type AccountType =
  | 'revenue'
  | 'expense'
  | 'asset'
  | 'liability'
  | 'equity';

export interface Account {
  id: string;
  code: string;
  name: string;
  accountType: AccountType;
  parentId?: string;
  companyId: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAccountPayload {
  code: string;
  name: string;
  accountType: AccountType;
  parentId?: string;
}

export type UpdateAccountPayload = Partial<CreateAccountPayload>;

// ---------------------------------------------------------------------------
// Cost Centers
// ---------------------------------------------------------------------------
export interface CostCenter {
  id: string;
  code: string;
  name: string;
  parentId?: string;
  siteId?: string;
  companyId: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCostCenterPayload {
  code: string;
  name: string;
  parentId?: string;
  siteId?: string;
}

export type UpdateCostCenterPayload = Partial<CreateCostCenterPayload>;

// ---------------------------------------------------------------------------
// Product Categories
// ---------------------------------------------------------------------------
export interface ProductCategory {
  id: string;
  name: string;
  parentId?: string;
  companyId: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductCategoryPayload {
  name: string;
  parentId?: string;
}

export type UpdateProductCategoryPayload = Partial<CreateProductCategoryPayload>;

// ---------------------------------------------------------------------------
// Suppliers
// ---------------------------------------------------------------------------
export interface Supplier {
  id: string;
  code: string;
  name: string;
  contactEmail?: string;
  contactPhone?: string;
  companyId: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSupplierPayload {
  code: string;
  name: string;
  contactEmail?: string;
  contactPhone?: string;
}

export type UpdateSupplierPayload = Partial<CreateSupplierPayload>;

// ---------------------------------------------------------------------------
// Customers
// ---------------------------------------------------------------------------
export interface Customer {
  id: string;
  code: string;
  name: string;
  contactEmail?: string;
  contactPhone?: string;
  companyId: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomerPayload {
  code: string;
  name: string;
  contactEmail?: string;
  contactPhone?: string;
}

export type UpdateCustomerPayload = Partial<CreateCustomerPayload>;

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------
export type ProductType =
  | 'finished_good'
  | 'semi_finished'
  | 'raw_material'
  | 'service'
  | 'other';

export interface Product {
  id: string;
  sku: string;
  name: string;
  productType?: ProductType;
  salePrice?: number;
  standardCost?: number;
  isActive: boolean;
  categoryId?: string;
  unitId?: string;
  companyId: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductPayload {
  sku: string;
  name: string;
  productType?: ProductType;
  salePrice?: number;
  standardCost?: number;
  isActive?: boolean;
  categoryId?: string;
  unitId?: string;
}

export type UpdateProductPayload = Partial<CreateProductPayload>;

// ---------------------------------------------------------------------------
// Materials
// ---------------------------------------------------------------------------
export interface Material {
  id: string;
  code: string;
  name: string;
  purchasePrice?: number;
  safetyStockQty?: number;
  isActive: boolean;
  supplierId?: string;
  unitId?: string;
  companyId: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMaterialPayload {
  code: string;
  name: string;
  purchasePrice?: number;
  safetyStockQty?: number;
  isActive?: boolean;
  supplierId?: string;
  unitId?: string;
}

export type UpdateMaterialPayload = Partial<CreateMaterialPayload>;

// ---------------------------------------------------------------------------
// BOM Recipes
// ---------------------------------------------------------------------------
export interface BomLine {
  id: string;
  materialId: string;
  qty: number;
  unitCost?: number;
  wastagePct?: number;
}

export interface BomRecipe {
  id: string;
  productId: string;
  version: string;
  outputQty: number;
  wastagePct: number;
  laborCost: number;
  overheadCost: number;
  isActive: boolean;
  companyId: string;
  tenantId: string;
  bomLines: BomLine[];
  createdAt: string;
  updatedAt: string;
  product?: Product;
}

export interface CreateBomLinePayload {
  materialId: string;
  qty: number;
  unitCost?: number;
  wastagePct?: number;
}

export interface CreateBomRecipePayload {
  productId: string;
  version?: string;
  outputQty?: number;
  wastagePct?: number;
  laborCost?: number;
  overheadCost?: number;
  isActive?: boolean;
  bomLines?: CreateBomLinePayload[];
}

export type UpdateBomRecipePayload = Partial<CreateBomRecipePayload>;

// ---------------------------------------------------------------------------
// AI Scenario Planner
// ---------------------------------------------------------------------------
export interface AiAssumption {
  key: string;
  value: number;
  unit: 'percent' | 'amount' | 'count' | 'text';
  description: string;
}

export interface AiExpectedImpact {
  revenueImpactPercent: number;
  costImpactPercent: number;
  grossMarginImpactPercent: number;
  netProfitImpactPercent: number;
  cashFlowImpactPercent: number;
}

export interface AiSimulationInputs {
  rawMaterialPriceChangePercent: number;
  currencyChangePercent: number;
  demandChangePercent: number;
  branchExpansionCount: number;
}

export interface AiScenarioSuggestion {
  title: string;
  type: 'raw_material_price_increase' | 'currency_change' | 'demand_decrease' | 'branch_expansion' | 'mixed';
  confidence: number;
  summary: string;
  assumptions: AiAssumption[];
  expectedImpact: AiExpectedImpact;
  recommendedActions: string[];
  simulationInputs: AiSimulationInputs;
}

export interface AiScenarioResponse {
  scenarios: AiScenarioSuggestion[];
}

export interface AiUnavailableResponse {
  message: string;
  available: boolean;
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
export interface DashboardKpis {
  revenue: number;
  expenses: number;
  gross_profit: number;
  net_profit: number;
  cash_balance: number;
  budget_utilization: number;
  forecast_accuracy: number;
}

export interface ExecutiveKpi {
  current: number;
  previousMonth: number;
  previousYear: number;
  growthPct: number;
  trend: 'up' | 'down' | 'neutral';
}

export interface ExecutiveSummary {
  revenue: ExecutiveKpi;
  grossProfit: ExecutiveKpi;
  netProfit: ExecutiveKpi;
  ebitda: ExecutiveKpi;
  operatingProfit: ExecutiveKpi;
  cashFlow: ExecutiveKpi;
  cashBalance: ExecutiveKpi;
  workingCapital: ExecutiveKpi;
  accountsReceivable: ExecutiveKpi;
  accountsPayable: ExecutiveKpi;
  inventoryValue: ExecutiveKpi;
  inventoryCoverage: ExecutiveKpi;
  productionCost: ExecutiveKpi;
  manufacturingCost: ExecutiveKpi;
  totalBudget: ExecutiveKpi;
  actualCost: ExecutiveKpi;
  remainingBudget: ExecutiveKpi;
  budgetUtilization: ExecutiveKpi;
  forecastAccuracy: ExecutiveKpi;
  totalExpenses: ExecutiveKpi;
  totalIncome: ExecutiveKpi;
  totalCustomers: ExecutiveKpi;
  totalSuppliers: ExecutiveKpi;
  totalProducts: ExecutiveKpi;
  totalMaterials: ExecutiveKpi;
  totalUsers: ExecutiveKpi;
  pendingApprovals: ExecutiveKpi;
  notificationCount: ExecutiveKpi;
  failedImports: ExecutiveKpi;
  successfulImports: ExecutiveKpi;
}

export interface MarketRate {
  currency: string;
  rate: number;
  previousRate: number;
  change: number;
  changePct: number;
  trend: 'up' | 'down' | 'neutral';
  lastUpdate: string;
  source: string;
  provider?: string;
  stale?: boolean;
  staleReason?: string;
}

export interface MarketWidget {
  rates: MarketRate[];
  lastSyncAt: string | null;
  baseCurrency: string;
  provider?: string;
}

export interface MonthlyTrendItem {
  period_month: number;
  actual: number;
  budget: number;
  forecast: number;
}

export interface UtilizationData {
  revenue_utilization: number;
  expense_utilization: number;
}

export interface AccuracyData {
  overall_accuracy: number;
  monthly_accuracy: MonthlyTrendItem[];
}

export interface RankedItem {
  id: string;
  name: string;
  value: number;
}

// ---------------------------------------------------------------------------
// Budgets & Cycles
// ---------------------------------------------------------------------------
export type CycleStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'locked';
export type PeriodType = 'annual' | 'quarterly' | 'monthly';

export interface BudgetLine {
  id: string;
  budgetCycleId: string;
  accountId: string;
  siteId: string | null;
  costCenterId: string | null;
  productId: string | null;
  materialId: string | null;
  customerId: string | null;
  periodMonth: number;
  quantity: number;
  unitPrice: number;
  amount: number;
  notes: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface BudgetCycle {
  id: string;
  companyId: string;
  name: string;
  fiscalYear: number;
  periodType: PeriodType;
  version: number;
  status: CycleStatus;
  createdBy: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  budgetLines?: BudgetLine[];
}

export interface CreateBudgetLinePayload {
  accountId: string;
  siteId?: string;
  costCenterId?: string;
  productId?: string;
  materialId?: string;
  customerId?: string;
  periodMonth: number;
  quantity?: number;
  unitPrice?: number;
  amount: number;
  notes?: string;
}

export interface CreateBudgetCyclePayload {
  name: string;
  fiscalYear: number;
  periodType: PeriodType;
  version?: number;
  budgetLines?: CreateBudgetLinePayload[];
}

export interface UpdateBudgetCyclePayload {
  name?: string;
  fiscalYear?: number;
  periodType?: PeriodType;
  version?: number;
  budgetLines?: CreateBudgetLinePayload[];
}

// ---------------------------------------------------------------------------
// Forecasts & Cycles
// ---------------------------------------------------------------------------
export type ForecastMethod = 'manual' | 'rolling' | 'driver_based' | 'ai_assisted' | 'seasonal_adjusted' | 'hybrid';

export interface ForecastLine {
  id: string;
  forecastCycleId: string;
  accountId: string;
  siteId: string | null;
  costCenterId: string | null;
  productId: string | null;
  materialId: string | null;
  customerId: string | null;
  periodMonth: number;
  quantity: number;
  unitPrice: number;
  amount: number;
  driverType: string | null;
  notes: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface ForecastCycle {
  id: string;
  companyId: string;
  scenarioId: string | null;
  name: string;
  fiscalYear: number;
  basePeriod: string; // ISO date string
  method: ForecastMethod;
  status: CycleStatus;
  createdBy: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  forecastLines?: ForecastLine[];
}

export interface CreateForecastLinePayload {
  accountId: string;
  siteId?: string;
  costCenterId?: string;
  productId?: string;
  materialId?: string;
  customerId?: string;
  periodMonth: number;
  quantity?: number;
  unitPrice?: number;
  amount: number;
  driverType?: string;
  notes?: string;
}

export interface CreateForecastCyclePayload {
  name: string;
  fiscalYear: number;
  basePeriod: string;
  method?: ForecastMethod;
  scenarioId?: string;
  forecastLines?: CreateForecastLinePayload[];
}

export interface UpdateForecastCyclePayload {
  name?: string;
  fiscalYear?: number;
  basePeriod?: string;
  method?: ForecastMethod;
  scenarioId?: string;
  forecastLines?: CreateForecastLinePayload[];
}

// ---------------------------------------------------------------------------
// Scenario Planning
// ---------------------------------------------------------------------------
export type ScenarioType = 'base' | 'optimistic' | 'pessimistic' | 'custom';
export type ScenarioSubtype =
  | 'increase_material_prices'
  | 'currency_rate_change'
  | 'demand_decrease'
  | 'branch_expansion';

export interface ScenarioAssumptions {
  subtype: ScenarioSubtype;
  percentage?: number;
  materialIds?: string[];
  fromCurrency?: string;
  toCurrency?: string;
  newRate?: number;
  targetSupplierIds?: string[];
  targetCustomerIds?: string[];
  targetAccountIds?: string[];
  productIds?: string[];
  siteName?: string;
  revenueAmount?: number;
  expenseAmount?: number;
  revenueAccountId?: string;
  expenseAccountId?: string;
}

export interface Scenario {
  id: string;
  companyId: string;
  name: string;
  scenarioType: ScenarioType;
  assumptions: ScenarioAssumptions;
  createdAt: string;
  updatedAt: string;
}

export interface CreateScenarioPayload {
  name: string;
  scenarioType: ScenarioType;
  assumptions: ScenarioAssumptions;
}

export interface UpdateScenarioPayload {
  name?: string;
  scenarioType?: ScenarioType;
  assumptions?: ScenarioAssumptions;
}

export interface PreviewSimulationPayload {
  baseType: 'budget' | 'forecast';
  baseId: string;
  scenarioId?: string;
  overrideAssumptions?: ScenarioAssumptions;
}

export interface SimulatedLine {
  accountId: string;
  siteId: string | null;
  costCenterId: string | null;
  productId: string | null;
  materialId: string | null;
  customerId: string | null;
  periodMonth: number;
  originalAmount: number;
  simulatedAmount: number;
  variance: number;
}

export interface SimulationResult {
  originalTotal: number;
  simulatedTotal: number;
  varianceAmount: number;
  variancePercentage: number;
  lines: SimulatedLine[];
}

// ---------------------------------------------------------------------------
// Actual Data Imports
// ---------------------------------------------------------------------------
export type ImportSourceSystem =
  | 'excel'
  | 'oracle'
  | 'sap'
  | 'erp'
  | 'pms'
  | 'odoo'
  | 'pos'
  | 'woocommerce'
  | 'manual'
  | 'api'
  | 'custom';

export type ImportType =
  | 'sales'
  | 'expenses'
  | 'production'
  | 'inventory'
  | 'gl'
  | 'cashflow'
  | 'payroll';

export type ImportStatus = 'uploaded' | 'validated' | 'posted' | 'failed';

export interface ActualLine {
  id: string;
  actualImportId: string;
  accountId: string;
  siteId: string | null;
  costCenterId: string | null;
  productId: string | null;
  materialId: string | null;
  customerId: string | null;
  transactionDate: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  referenceNo: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface ImportMapping {
  id: string;
  companyId: string;
  connectionId?: string | null;
  name: string;
  sourceSystem: ImportSourceSystem;
  importType: ImportType;
  mappingConfig: Record<string, string | undefined>;
  skipErrors?: boolean;
  isDefault?: boolean;
  isActive?: boolean;
  lastUsedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ActualImport {
  id: string;
  companyId: string;
  sourceSystem: ImportSourceSystem;
  mappingId: string | null;
  importType: ImportType;
  periodFrom: string;
  periodTo: string;
  filePath: string | null;
  status: ImportStatus;
  errorLog: string | null;
  importedBy: string | null;
  createdAt: string;
  updatedAt: string;
  actualLines?: ActualLine[];
}

export interface CreateActualLinePayload {
  accountId: string;
  siteId?: string;
  costCenterId?: string;
  productId?: string;
  materialId?: string;
  customerId?: string;
  transactionDate: string;
  quantity?: number;
  unitPrice?: number;
  amount: number;
  referenceNo?: string;
}

export interface CreateActualImportPayload {
  sourceSystem: ImportSourceSystem;
  mappingId?: string;
  importType: ImportType;
  periodFrom: string;
  periodTo: string;
  filePath?: string;
  actualLines?: CreateActualLinePayload[];
  rawRows?: Record<string, string | number | boolean | null>[];
}

export interface PreviewActualImportPayload {
  mappingId: string;
  rawRows: Record<string, string | number | boolean | null>[];
}

export interface MappedRowResult {
  rowIdx: number;
  success: boolean;
  errors: string[];
  line?: {
    accountId: string;
    siteId?: string | null;
    costCenterId?: string | null;
    productId?: string | null;
    materialId?: string | null;
    customerId?: string | null;
    transactionDate: string;
    quantity?: number;
    unitPrice?: number;
    amount: number;
    referenceNo?: string | null;
  };
}

// ---------------------------------------------------------------------------
// Variance Analysis
// ---------------------------------------------------------------------------
export interface VarianceRecord {
  company_id: string;
  fiscal_year: number;
  period_month: number;
  account_id: string;
  site_id?: string | null;
  product_id?: string | null;
  customer_id?: string | null;
  budget_amount: number;
  actual_amount: number;
  forecast_amount: number;
  variance_amount: number;
  variance_pct: number | null;
  actual_vs_budget_amount?: number;
  actual_vs_budget_pct?: number | null;
  forecast_vs_budget_amount?: number;
  forecast_vs_budget_pct?: number | null;
  forecast_vs_actual_amount?: number;
  forecast_vs_actual_pct?: number | null;
}

// ---------------------------------------------------------------------------
// Integrations
// ---------------------------------------------------------------------------
export type ConnectionType =
  | 'oracle'
  | 'sap'
  | 'erp'
  | 'pms'
  | 'odoo'
  | 'pos'
  | 'woocommerce'
  | 'rest_api'
  | 'sftp'
  | 'custom';

export type SyncSchedule = 'manual' | 'hourly' | 'daily' | 'weekly' | 'monthly';
export type SyncStatus = 'success' | 'failed' | 'partial' | 'never';

export interface IntegrationConnection {
  id: string;
  companyId: string;
  name: string;
  connectionType: ConnectionType;
  host?: string | null;
  port?: number | null;
  databaseName?: string | null;
  username?: string | null;
  password?: string;
  apiBaseUrl?: string | null;
  apiKey?: string;
  extraConfig?: Record<string, string | number | boolean | null> | null;
  syncSchedule: SyncSchedule;
  lastSyncAt?: string | null;
  lastSyncStatus?: SyncStatus | null;
  lastSyncLog?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateConnectionPayload {
  name: string;
  connectionType: ConnectionType;
  host?: string;
  port?: number;
  databaseName?: string;
  username?: string;
  password?: string;
  apiBaseUrl?: string;
  apiKey?: string;
  extraConfig?: Record<string, string | number | boolean | null>;
  syncSchedule?: SyncSchedule;
  isActive?: boolean;
}

export type UpdateConnectionPayload = Partial<CreateConnectionPayload>;

export interface CreateMappingPayload {
  connectionId?: string;
  name: string;
  sourceSystem: ImportSourceSystem;
  importType: ImportType;
  mappingConfig: Record<string, string | null>;
  skipErrors?: boolean;
  isDefault?: boolean;
  isActive?: boolean;
}

export type UpdateMappingPayload = Partial<CreateMappingPayload>;

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------
export type TriggerType =
  | 'variance_pct'
  | 'variance_amount'
  | 'kpi_breach'
  | 'budget_approval'
  | 'forecast_approval'
  | 'import_failed';

export interface NotificationRule {
  id: string;
  companyId: string;
  ruleName: string;
  triggerType: TriggerType;
  thresholdValue?: number | null;
  accountId?: string | null;
  siteId?: string | null;
  notifyRoles?: string[] | null;
  notifyUsers?: string[] | null;
  channel?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNotificationRulePayload {
  ruleName: string;
  triggerType: TriggerType;
  thresholdValue?: number;
  accountId?: string;
  siteId?: string;
  notifyRoles?: string[];
  notifyUsers?: string[];
  channel?: string;
  isActive?: boolean;
}

export type UpdateNotificationRulePayload = Partial<CreateNotificationRulePayload>;

export interface Notification {
  id: string;
  companyId: string;
  ruleId?: string | null;
  userId?: string | null;
  title: string;
  body?: string | null;
  channel?: 'system' | 'email' | 'sms' | 'push' | null;
  entityType?: string | null;
  entityId?: string | null;
  triggerData?: Record<string, string | number | boolean | null | object> | null;
  status: 'pending' | 'sent' | 'failed' | 'read';
  sentAt?: string | null;
  readAt?: string | null;
  errorMessage?: string | null;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Audit Logs
// ---------------------------------------------------------------------------
export interface AuditLogRecord {
  id: string;
  tenantId: string;
  userId?: string | null;
  entityType: string;
  entityId?: string | null;
  action: string;
  oldValues?: Record<string, string | number | boolean | null | object> | null;
  newValues?: Record<string, string | number | boolean | null | object> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt?: string | null;
}

// ---------------------------------------------------------------------------
// Exchange Rates
// ---------------------------------------------------------------------------
export interface ExchangeRate {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  rateDate: string;
  source: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Headcount Plans
// ---------------------------------------------------------------------------
export type EmploymentType = 'full_time' | 'part_time' | 'contract' | 'seasonal';

export interface HeadcountPlan {
  id: string;
  budgetCycleId: string;
  siteId?: string | null;
  costCenterId?: string | null;
  jobTitle: string;
  department?: string | null;
  employmentType: EmploymentType;
  headcount: number;
  periodMonth: number;
  basicSalary: number;
  allowances: number;
  socialInsurance: number;
  totalCost: number;
  notes?: string | null;
  createdAt: string;
  site?: { id: string; name: string } | null;
  costCenter?: { id: string; name: string } | null;
}

// ---------------------------------------------------------------------------
// KPI Targets
// ---------------------------------------------------------------------------
export type KpiCategory = 'financial' | 'operational' | 'sales' | 'production' | 'hr';

export interface KpiTarget {
  id: string;
  kpiName: string;
  kpiCategory: KpiCategory;
  fiscalYear: number;
  periodMonth?: number | null;
  targetValue: number;
  unit?: string | null;
  site?: { id: string; name: string } | null;
}

// ---------------------------------------------------------------------------
// Production Plans
// ---------------------------------------------------------------------------
export type PlanSource = 'budget' | 'forecast' | 'manual';

export interface ProductionPlan {
  id: string;
  companyId: string;
  siteId: string;
  productId: string;
  planSource: PlanSource;
  fiscalYear: number;
  periodMonth: number;
  plannedQty: number;
  actualQty?: number;
  estimatedCost?: number;
  actualCost?: number;
  site?: { id: string; name: string } | null;
  product?: { id: string; name: string; sku: string } | null;
}

// ---------------------------------------------------------------------------
// Inventory Snapshots
// ---------------------------------------------------------------------------
export interface InventorySnapshot {
  id: string;
  siteId: string;
  productId?: string | null;
  materialId?: string | null;
  snapshotDate: string;
  qtyOnHand: number;
  inventoryValue: number;
  site?: { id: string; name: string } | null;
  product?: { id: string; name: string; sku: string } | null;
  material?: { id: string; name: string; code: string } | null;
}

// ---------------------------------------------------------------------------
// Promotions / Retail Discounts
// ---------------------------------------------------------------------------
export interface Promotion {
  id: string;
  name: string;
  description?: string | null;
  productId?: string | null;
  customerId?: string | null;
  discountPct?: string | null;
  discountAmt?: string | null;
  startDate: string;
  endDate?: string | null;
  budgetAmt?: string | null;
  actualCost?: string | null;
  incrementalRevenue?: string | null;
  roi?: string | null;
  isActive: boolean;
  product?: { id: string; name: string } | null;
  customer?: { id: string; name: string } | null;
}

// ---------------------------------------------------------------------------
// Raw Material Prices
// ---------------------------------------------------------------------------
export interface RawMaterialPrice {
  id: string;
  materialId: string;
  price: number;
  priceDate: string;
  source?: string;
  material?: { id: string; name: string; code: string } | null;
}

// ---------------------------------------------------------------------------
// Report Metas (served from backend API)
// ---------------------------------------------------------------------------
export interface ReportMeta {
  value: string;
  label: string;
  description: string;
  category: 'financial' | 'performance' | 'operations';
  paginated: boolean;
}

// ---------------------------------------------------------------------------
// Approvals
// ---------------------------------------------------------------------------
export interface Approval {
  id: string;
  tenantId: string;
  entityType: string;
  entityId: string;
  stepOrder: number | null;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  requestedBy: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  comments: string | null;
  createdAt: string;
  updatedAt: string | null;
}

// ---------------------------------------------------------------------------
// Plans / Subscriptions
// ---------------------------------------------------------------------------
export interface Plan {
  id: string;
  name: string;
  code: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  maxCompanies: number;
  maxUsers: number;
  maxBranches: number;
  dashboardLevel: string;
  features: string[];
  restrictions: string[];
  suitableFor: string[];
  isActive: boolean;
}

// ---------------------------------------------------------------------------
// Users & Roles
// ---------------------------------------------------------------------------
export interface Tenant {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

export interface Role {
  id: string;
  name: string;
  permissions?: Record<string, unknown>;
  _count?: { users: number };
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  roleId?: string;
  roleName?: string;
  status: string;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Alerts (Enterprise Alert Center)
// ---------------------------------------------------------------------------
export interface Alert {
  id: string;
  companyId: string;
  userId: string | null;
  title: string;
  description: string | null;
  priority: 'low' | 'medium' | 'high' | 'critical';
  severity: 'info' | 'warning' | 'error' | 'success';
  category: 'budget' | 'forecast' | 'inventory' | 'exchange_rate' | 'production' | 'import' | 'approval' | 'system';
  entityType: string | null;
  entityId: string | null;
  actionUrl: string | null;
  isRead: boolean;
  isArchived: boolean;
  expiresAt: string | null;
  createdAt: string;
}


