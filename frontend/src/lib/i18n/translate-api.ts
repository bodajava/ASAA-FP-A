'use client';

import { useI18n } from './i18n-context';
import { MONTH_NAMES } from '@/lib/constants';

/* ──────────────────────────────────────────────────────────────────────────
 * API / enum value translators
 *
 * These functions map database values (statuses, types, etc.) to their
 * translated display strings.  Use them anywhere API data is rendered.
 * ────────────────────────────────────────────────────────────────────────── */

/* ── Statuses ──────────────────────────────────────────────────────────── */
const STATUS_MAP: Record<string, string> = {
  active:     'status.active',
  inactive:   'status.inactive',
  pending:    'status.pending',
  approved:   'status.approved',
  rejected:   'status.rejected',
  draft:      'status.draft',
  submitted:  'status.submitted',
  validated:  'status.validated',
  posted:     'status.posted',
  locked:     'status.locked',
  failed:     'status.failed',
  completed:  'status.completed',
  processing: 'status.processing',
};

export function translateStatus(status: string): string {
  return STATUS_MAP[status.toLowerCase()] ?? status;
}

/* ── Account types ─────────────────────────────────────────────────────── */
const ACCOUNT_TYPE_MAP: Record<string, string> = {
  revenue:  'accountType.revenue',
  expense:  'accountType.expense',
  asset:    'accountType.asset',
  liability:'accountType.liability',
  equity:   'accountType.equity',
};

export function translateAccountType(type: string): string {
  return ACCOUNT_TYPE_MAP[type.toLowerCase()] ?? type;
}

/* ── Forecast methods ──────────────────────────────────────────────────── */
const FORECAST_METHOD_MAP: Record<string, string> = {
  manual:            'forecastMethod.manual',
  rolling:           'forecastMethod.rolling',
  driver_based:      'forecastMethod.driverBased',
  ai_assisted:       'forecastMethod.aiAssisted',
  seasonal_adjusted: 'forecastMethod.seasonalAdjusted',
  hybrid:            'forecastMethod.hybrid',
};

export function translateForecastMethod(method: string): string {
  return FORECAST_METHOD_MAP[method] ?? method;
}

/* ── Scenario subtypes ─────────────────────────────────────────────────── */
const SCENARIO_SUBTYPE_MAP: Record<string, string> = {
  increase_material_prices: 'scenarioSubtype.increaseMaterialPrices',
  currency_rate_change:     'scenarioSubtype.currencyRateChange',
  demand_decrease:          'scenarioSubtype.demandDecrease',
  branch_expansion:         'scenarioSubtype.branchExpansion',
};

export function translateScenarioSubtype(subtype: string): string {
  return SCENARIO_SUBTYPE_MAP[subtype] ?? subtype;
}

/* ── Scenario default names ────────────────────────────────────────────── */
const SCENARIO_DEFAULT_NAME_MAP: Record<string, string> = {
  increase_material_prices: 'scenarioDefaultName.increaseMaterialPrices',
  currency_rate_change:     'scenarioDefaultName.currencyRateChange',
  demand_decrease:          'scenarioDefaultName.demandDecrease',
  branch_expansion:         'scenarioDefaultName.branchExpansion',
};

export function translateScenarioDefaultName(subtype: string): string {
  return SCENARIO_DEFAULT_NAME_MAP[subtype] ?? `${subtype} Scenario`;
}

/* ── Period types ──────────────────────────────────────────────────────── */
const PERIOD_TYPE_MAP: Record<string, string> = {
  annual:    'periodType.annual',
  quarterly: 'periodType.quarterly',
  monthly:   'periodType.monthly',
};

export function translatePeriodType(type: string): string {
  return PERIOD_TYPE_MAP[type.toLowerCase()] ?? type;
}

/* ── Connection types ──────────────────────────────────────────────────── */
const CONNECTION_TYPE_MAP: Record<string, string> = {
  oracle:      'connectionType.oracle',
  sap:         'connectionType.sap',
  erp:         'connectionType.erp',
  pms:         'connectionType.pms',
  odoo:        'connectionType.odoo',
  pos:         'connectionType.pos',
  woocommerce: 'connectionType.woocommerce',
  rest_api:    'connectionType.restApi',
  sftp:        'connectionType.sftp',
  custom:      'connectionType.custom',
};

export function translateConnectionType(type: string): string {
  return CONNECTION_TYPE_MAP[type.toLowerCase()] ?? type;
}

/* ── Import types ──────────────────────────────────────────────────────── */
const IMPORT_TYPE_MAP: Record<string, string> = {
  sales:       'importType.sales',
  expenses:    'importType.expenses',
  production:  'importType.production',
  inventory:   'importType.inventory',
  gl:          'importType.gl',
  cashflow:    'importType.cashflow',
  payroll:     'importType.payroll',
};

export function translateImportType(type: string): string {
  return IMPORT_TYPE_MAP[type.toLowerCase()] ?? type;
}

/* ── Sync schedules ────────────────────────────────────────────────────── */
const SYNC_SCHEDULE_MAP: Record<string, string> = {
  manual:  'syncSchedule.manual',
  hourly:  'syncSchedule.hourly',
  daily:   'syncSchedule.daily',
  weekly:  'syncSchedule.weekly',
  monthly: 'syncSchedule.monthly',
};

export function translateSyncSchedule(schedule: string): string {
  return SYNC_SCHEDULE_MAP[schedule.toLowerCase()] ?? schedule;
}

/* ── Source systems ────────────────────────────────────────────────────── */
const SOURCE_SYSTEM_MAP: Record<string, string> = {
  excel:       'sourceSystem.excel',
  oracle:      'sourceSystem.oracle',
  sap:         'sourceSystem.sap',
  erp:         'sourceSystem.erp',
  pms:         'sourceSystem.pms',
  odoo:        'sourceSystem.odoo',
  pos:         'sourceSystem.pos',
  woocommerce: 'sourceSystem.woocommerce',
  manual:      'sourceSystem.manual',
  api:         'sourceSystem.api',
  custom:      'sourceSystem.custom',
};

export function translateSourceSystem(system: string): string {
  return SOURCE_SYSTEM_MAP[system.toLowerCase()] ?? system;
}

/* ── Trigger types ─────────────────────────────────────────────────────── */
const TRIGGER_TYPE_MAP: Record<string, string> = {
  variance_pct:        'triggerType.variancePct',
  variance_amount:     'triggerType.varianceAmount',
  kpi_breach:          'triggerType.kpiBreach',
  budget_approval:     'triggerType.budgetApproval',
  forecast_approval:   'triggerType.forecastApproval',
  import_failed:       'triggerType.importFailed',
};

export function translateTriggerType(type: string): string {
  return TRIGGER_TYPE_MAP[type.toLowerCase()] ?? type;
}

/* ── Driver types ──────────────────────────────────────────────────────── */
const DRIVER_TYPE_MAP: Record<string, string> = {
  headcount:   'driverType.headcount',
  units_sold:  'driverType.unitsSold',
  sq_ft:       'driverType.sqFt',
  customers:   'driverType.customers',
  transactions:'driverType.transactions',
};

export function translateDriverType(type: string): string {
  return DRIVER_TYPE_MAP[type.toLowerCase()] ?? type;
}

/* ── Report Type labels ────────────────────────────────────────────────── */
const REPORT_TYPE_MAP: Record<string, string> = {
  pl:                      'reportType.pl',
  cashflow:                'reportType.cashflow',
  'gross-margin':          'reportType.grossMargin',
  'net-profit':            'reportType.netProfit',
  'budget-vs-actual':      'reportType.budgetVsActual',
  'forecast-accuracy':     'reportType.forecastAccuracy',
  'product-profitability': 'reportType.productProfitability',
  'branch-profitability':  'reportType.branchProfitability',
  'factory-costing':       'reportType.factoryCosting',
  'inventory-coverage':    'reportType.inventoryCoverage',
  'slow-moving-items':     'reportType.slowMovingItems',
  'wastage-analysis':      'reportType.wastageAnalysis',
  'customer-profitability':'reportType.customerProfitability',
  'product-cost-variance': 'reportType.productCostVariance',
  'production-capacity':   'reportType.productionCapacity',
  'cash-flow-forecast':    'reportType.cashFlowForecast',
};

export function translateReportType(type: string): string {
  return REPORT_TYPE_MAP[type] ?? type;
}

/* ── Report category ───────────────────────────────────────────────────── */
const REPORT_CATEGORY_MAP: Record<string, string> = {
  financial:    'reportCategory.financial',
  performance:  'reportCategory.performance',
  operations:   'reportCategory.operations',
};

export function translateReportCategory(cat: string): string {
  return REPORT_CATEGORY_MAP[cat.toLowerCase()] ?? cat;
}

/* ── Month names ───────────────────────────────────────────────────────── */
export function translateMonth(monthIdx: number, locale: string): string {
  const monthNamesAr = [
    '', 'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
  ];
  return locale === 'ar' ? (monthNamesAr[monthIdx] ?? '') : (MONTH_NAMES[monthIdx] ?? '');
}

/* ── Entity types ──────────────────────────────────────────────────────── */
const ENTITY_TYPE_MAP: Record<string, string> = {
  budgetcycle:   'entityType.budgetCycle',
  forecastcycle: 'entityType.forecastCycle',
  scenario:      'entityType.scenario',
  actualimport:  'entityType.actualImport',
  account:       'entityType.account',
  site:          'entityType.site',
};

export function translateEntityType(type: string): string {
  return ENTITY_TYPE_MAP[type.toLowerCase().replace(/\s/g, '')] ?? type;
}

/* ── Actions ────────────────────────────────────────────────────────────── */
const ACTION_MAP: Record<string, string> = {
  create:        'action.create',
  update:        'action.update',
  delete:        'action.delete',
  status_change: 'action.statusChange',
};

export function translateAction(action: string): string {
  return ACTION_MAP[action.toLowerCase()] ?? action;
}

/* ── Boolean → status badge ────────────────────────────────────────────── */
export function boolLabel(value: boolean): string {
  return value ? 'common.active' : 'common.inactive';
}

/* ── React hook version – use in functional components ─────────────────── */
export function useTranslateApi() {
  const { t, locale } = useI18n();

  return {
    tStatus:      (s: string) => { const key = translateStatus(s); return key.startsWith('status.') ? t(key as any) : key; },
    tAccountType: (s: string) => { const key = translateAccountType(s); return key.startsWith('accountType.') ? t(key as any) : key; },
    tForecastMethod: (s: string) => { const key = translateForecastMethod(s); return key.startsWith('forecastMethod.') ? t(key as any) : key; },
    tScenarioSubtype: (s: string) => { const key = translateScenarioSubtype(s); return key.startsWith('scenarioSubtype.') ? t(key as any) : key; },
    tPeriodType:  (s: string) => { const key = translatePeriodType(s); return key.startsWith('periodType.') ? t(key as any) : key; },
    tConnectionType: (s: string) => { const key = translateConnectionType(s); return key.startsWith('connectionType.') ? t(key as any) : key; },
    tImportType:  (s: string) => { const key = translateImportType(s); return key.startsWith('importType.') ? t(key as any) : key; },
    tSyncSchedule: (s: string) => { const key = translateSyncSchedule(s); return key.startsWith('syncSchedule.') ? t(key as any) : key; },
    tSourceSystem: (s: string) => { const key = translateSourceSystem(s); return key.startsWith('sourceSystem.') ? t(key as any) : key; },
    tTriggerType: (s: string) => { const key = translateTriggerType(s); return key.startsWith('triggerType.') ? t(key as any) : key; },
    tDriverType:  (s: string) => { const key = translateDriverType(s); return key.startsWith('driverType.') ? t(key as any) : key; },
    tReportType:  (s: string) => { const key = translateReportType(s); return key.startsWith('reportType.') ? t(key as any) : key; },
    tReportCategory: (s: string) => { const key = translateReportCategory(s); return key.startsWith('reportCategory.') ? t(key as any) : key; },
    tEntityType:  (s: string) => { const key = translateEntityType(s); return key.startsWith('entityType.') ? t(key as any) : key; },
    tAction:      (s: string) => { const key = translateAction(s); return key.startsWith('action.') ? t(key as any) : key; },
    tMonth:       (idx: number) => translateMonth(idx, locale),
    boolLabel:    (v: boolean) => t(v ? 'common.active' : 'common.inactive'),
  };
}
