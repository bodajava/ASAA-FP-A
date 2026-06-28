'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueries } from '@tanstack/react-query';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/feedback-states';
import { Badge } from '@/components/ui/badge';
import { apiGet } from '@/lib/api';
import { useActiveCurrency } from '@/hooks/use-active-currency';
import { getCurrentFiscalYear } from '@/lib/constants';
import { useI18n } from '@/lib/i18n/i18n-context';
import { translateMonth } from '@/lib/i18n/translate-api';
import { queryKeys } from '@/lib/query-keys';
import { ExecutiveKpiGrid } from '@/components/dashboard/executive-kpi-grid';
import { MarketWidget } from '@/components/dashboard/market-widget';
import { AlertCard } from '@/components/dashboard/alert-card';
import { useAuth } from '@/lib/auth-context';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Legend,
} from 'recharts';
import {
  RevenueVsExpenseChart,
  ProfitabilityTrendChart,
  BudgetVsActualChart,
  TopProductsChart,
} from '@/components/dashboard/dashboard-charts';
import {
  TrendingUp,
  TrendingDown,
  Target,
  Package,
  Factory,
  ShoppingCart,
  Users,
  Truck,
  Building2,
  Layers,
  BarChart3,
  FileText,
  Bell,
  ChevronDown,
  ChevronRight,
  LayoutGrid,
  Wallet,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Boxes,
  ClipboardList,
  GitBranch,
  BookOpen,
  UserCheck,
  PieChart,
  Clock,
  Filter,
  Info,
} from 'lucide-react';
import type {
  DashboardKpis,
  MonthlyTrendItem,
  RankedItem,
  ExecutiveSummary,
  Alert,
} from '@/types/api';
import type { TranslationKey } from '@/lib/i18n/translations';

/** Skeleton for a widget */
function WidgetSkeleton({ className = 'h-48' }: { className?: string }) {
  return <div className={`${className} animate-pulse rounded-xl bg-secondary`} />;
}

/** Collapsible section wrapper */
function DashboardSection({
  title,
  icon,
  defaultOpen = true,
  badge,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  badge?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Card>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-secondary/50"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {icon}
          </span>
          <h2 className="text-sm font-semibold text-card-foreground">{title}</h2>
          {badge && (
            <Badge variant="info" className="text-[10px]">
              {badge}
            </Badge>
          )}
        </div>
        {open ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {open && <CardContent className="pt-0">{children}</CardContent>}
    </Card>
  );
}

/** Compact metric card for sub-sections */
function MetricMini({
  label,
  value,
  change,
  trend,
  icon,
}: {
  label: string;
  value: string;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon: React.ReactNode;
}) {
  const trendColor =
    trend === 'up'
      ? 'text-success'
      : trend === 'down'
        ? 'text-destructive'
        : 'text-muted-foreground';

  return (
    <div className="flex items-center gap-3 rounded-lg border-border bg-card/50 p-3 transition-shadow hover:shadow-sm">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium text-muted-foreground truncate">{label}</p>
        <p className="text-sm font-bold text-card-foreground">{value}</p>
      </div>
      {change && (
        <span className={`text-[11px] font-semibold ${trendColor}`}>{change}</span>
      )}
    </div>
  );
}

/** Interactive cost metric card with tooltip and badging */
function CostingMetricCard({
  label,
  value,
  subtext,
  tooltip,
  badge,
  onClick,
  icon,
}: {
  label: string;
  value: string;
  subtext?: string;
  tooltip: string;
  badge?: { text: string; variant: 'success' | 'warning' | 'error' };
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <div
      onClick={onClick}
      className="group relative cursor-pointer rounded-xl border-border bg-card p-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-500 hover:shadow-md"
      title={tooltip}
    >
      <div className="flex justify-between items-start">
        <span className="flex h-7 w-7 items-center justify-center rounded bg-secondary text-muted-foreground">
          {icon}
        </span>
        {badge && (
          <span className={`inline-flex items-center text-[8px] font-bold px-1.5 py-0.5 rounded-full ${
            badge.variant === 'success' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400' :
            badge.variant === 'warning' ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400' :
            'bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400'
          }`}>
            {badge.text}
          </span>
        )}
      </div>
      
      <div className="mt-2.5">
        <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground truncate">{label}</p>
        <p className="text-base font-black text-card-foreground mt-0.5">{value}</p>
        {subtext && <p className="text-[9px] text-muted-foreground truncate mt-1" title={subtext}>{subtext}</p>}
      </div>

      <div className="absolute bottom-1 right-2.5 opacity-0 transition-opacity group-hover:opacity-100 text-[8px] font-bold text-emerald-600 dark:text-emerald-400">
        &rarr;
      </div>
    </div>
  );
}

/** Compact module summary grid */
function ModuleSummaryGrid({
  data,
  t,
}: {
  data: Record<string, number>;
  t: (key: TranslationKey) => string;
}) {
  const modules: { key: string; labelKey: string; icon: React.ReactNode }[] = [
    { key: 'companies', labelKey: 'page.dashboard.moduleCompanies', icon: <Building2 className="h-3.5 w-3.5" /> },
    { key: 'sites', labelKey: 'page.dashboard.moduleSites', icon: <GitBranch className="h-3.5 w-3.5" /> },
    { key: 'users', labelKey: 'page.dashboard.moduleUsers', icon: <UserCheck className="h-3.5 w-3.5" /> },
    { key: 'products', labelKey: 'page.dashboard.moduleProducts', icon: <ShoppingCart className="h-3.5 w-3.5" /> },
    { key: 'materials', labelKey: 'page.dashboard.moduleMaterials', icon: <Boxes className="h-3.5 w-3.5" /> },
    { key: 'suppliers', labelKey: 'page.dashboard.moduleSuppliers', icon: <Truck className="h-3.5 w-3.5" /> },
    { key: 'customers', labelKey: 'page.dashboard.moduleCustomers', icon: <Users className="h-3.5 w-3.5" /> },
    { key: 'bomRecipes', labelKey: 'page.dashboard.moduleBoms', icon: <ClipboardList className="h-3.5 w-3.5" /> },
    { key: 'budgetCycles', labelKey: 'page.dashboard.moduleBudgets', icon: <Target className="h-3.5 w-3.5" /> },
    { key: 'forecastCycles', labelKey: 'page.dashboard.moduleForecasts', icon: <TrendingUp className="h-3.5 w-3.5" /> },
    { key: 'actualImports', labelKey: 'page.dashboard.moduleActuals', icon: <FileText className="h-3.5 w-3.5" /> },
    { key: 'scenarios', labelKey: 'page.dashboard.moduleScenarios', icon: <PieChart className="h-3.5 w-3.5" /> },
    { key: 'auditLogs', labelKey: 'page.dashboard.moduleAuditLogs', icon: <BookOpen className="h-3.5 w-3.5" /> },
    { key: 'notifications', labelKey: 'page.dashboard.moduleNotifications', icon: <Bell className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
      {modules.map((m) => (
        <div
          key={m.key}
          className="flex items-center gap-2 rounded-lg border-border bg-card/60 px-3 py-2"
        >
          <span className="text-muted-foreground">{m.icon}</span>
          <div className="min-w-0">
            <p className="text-[10px] font-medium text-muted-foreground truncate">
              {t(m.labelKey as TranslationKey)}
            </p>
            <p className="text-sm font-bold text-card-foreground">
              {data[m.key] ?? 0}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ===========================================================================
// Page
// ===========================================================================
export default function DashboardPage() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const { activeCompanyId } = useAuth();
  const { format: fmt, currency } = useActiveCurrency();
  const [year, setYear] = useState<number>(getCurrentFiscalYear());
  const [period, setPeriod] = useState<'ytd' | 'q1' | 'q2' | 'q3' | 'q4' | 'last12'>('ytd');
  const [lastUpdated] = useState<Date>(() => new Date());

  const periodParam = period === 'ytd' ? '' : `&period=${period}`;

  // Fetch all dashboard data
  const [kpisQuery, revenueQuery, productsQuery, customersQuery, executiveQuery, moduleQuery, alertsQuery, costingQuery] = useQueries({
    queries: [
      {
        queryKey: queryKeys.dashboard.kpis(activeCompanyId!, year, period),
        queryFn: ({ signal }: { signal: AbortSignal }) =>
          apiGet<DashboardKpis>(`/dashboard/summary?fiscal_year=${year}${periodParam}`, { signal }),
        enabled: Boolean(activeCompanyId),
        staleTime: 5 * 60 * 1000,
        meta: { persist: true },
      },
      {
        queryKey: queryKeys.dashboard.revenue(activeCompanyId!, year, period),
        queryFn: ({ signal }: { signal: AbortSignal }) =>
          apiGet<MonthlyTrendItem[]>(`/dashboard/revenue-trend?fiscal_year=${year}${periodParam}`, { signal }),
        enabled: Boolean(activeCompanyId),
        staleTime: 5 * 60 * 1000,
        meta: { persist: true },
      },
      {
        queryKey: queryKeys.dashboard.topProducts(activeCompanyId!, year, period),
        queryFn: ({ signal }: { signal: AbortSignal }) =>
          apiGet<RankedItem[]>(`/dashboard/top-products?fiscal_year=${year}${periodParam}`, { signal }),
        enabled: Boolean(activeCompanyId),
        staleTime: 5 * 60 * 1000,
        meta: { persist: true },
      },
      {
        queryKey: queryKeys.dashboard.topCustomers(activeCompanyId!, year, period),
        queryFn: ({ signal }: { signal: AbortSignal }) =>
          apiGet<RankedItem[]>(`/dashboard/top-customers?fiscal_year=${year}${periodParam}`, { signal }),
        enabled: Boolean(activeCompanyId),
        staleTime: 5 * 60 * 1000,
        meta: { persist: true },
      },
      {
        queryKey: queryKeys.dashboard.executive(activeCompanyId!, year, period),
        queryFn: ({ signal }: { signal: AbortSignal }) =>
          apiGet<ExecutiveSummary>(`/dashboard/executive-summary?fiscal_year=${year}${periodParam}`, { signal }),
        enabled: Boolean(activeCompanyId),
        staleTime: 5 * 60 * 1000,
        meta: { persist: true },
      },
      {
        queryKey: queryKeys.dashboard.moduleSummary(activeCompanyId!),
        queryFn: ({ signal }: { signal: AbortSignal }) =>
          apiGet<Record<string, number>>(`/dashboard/module-summary`, { signal }),
        enabled: Boolean(activeCompanyId),
        staleTime: 10 * 60 * 1000,
      },
      {
        queryKey: queryKeys.dashboard.alerts(activeCompanyId!),
        queryFn: ({ signal }: { signal: AbortSignal }) =>
          apiGet<{ data: Alert[]; total: number }>(`/notifications/alerts?limit=10&isArchived=false`, { signal }),
        enabled: Boolean(activeCompanyId),
        staleTime: 2 * 60 * 1000,
      },
      {
        queryKey: ['costingDashboardSummary', activeCompanyId, year],
        queryFn: ({ signal }: { signal: AbortSignal }) =>
          apiGet<any>(`/product-costing/dashboard-summary?period=${year}-06`, { signal }),
        enabled: Boolean(activeCompanyId),
        staleTime: 5 * 60 * 1000,
      },
    ],
  });

  if (!activeCompanyId) {
    return (
      <div className="space-y-6">
        <PageHeader title={t('page.dashboard.title')} description={t('page.dashboard.financialOverview', { year })} />
        <EmptyState
          title={t('page.dashboard.noCompanyTitle')}
          description={t('page.dashboard.noCompanyDesc')}
        />
      </div>
    );
  }

  const revenue = revenueQuery.data ?? [];
  const topProducts = productsQuery.data ?? [];
  const topCustomers = customersQuery.data ?? [];
  const executive = executiveQuery.data ?? null;
  const moduleSummary = moduleQuery.data ?? {};
  const alerts = alertsQuery.data?.data ?? [];
  const isInitialLoading = kpisQuery.isLoading;

  if (isInitialLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title={t('page.dashboard.title')} description={t('page.dashboard.financialOverview', { year })} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-secondary" />
          ))}
        </div>
      </div>
    );
  }

  const isRefreshing = kpisQuery.isFetching && !kpisQuery.isLoading;

  // Helper to format growth label
  const growthStr = (pct: number) => (pct >= 0 ? `+${pct.toFixed(1)}%` : `${pct.toFixed(1)}%`);

  return (
    <div className="space-y-5">
      {/* ── Header ───────────────────────────────────────────── */}
      <PageHeader
        title={t('page.dashboard.title')}
        description={t('page.dashboard.financialOverview', { year })}
      />

      {/* ── Dashboard Filters ──────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Fiscal Year */}
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <label htmlFor="dashboard-year" className="text-xs font-semibold text-muted-foreground">
              {t('common.fiscalYear')}:
            </label>
            <select
              id="dashboard-year"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="h-8 rounded-lg border border-input bg-muted px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value={2024}>2024</option>
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
              <option value={2027}>2027</option>
            </select>
          </div>

          {/* Period */}
          <div className="flex items-center gap-2">
            <label htmlFor="dashboard-period" className="text-xs font-semibold text-muted-foreground">
              {t('page.dashboard.filterBar')}:
            </label>
            <select
              id="dashboard-period"
              value={period}
              onChange={(e) => setPeriod(e.target.value as typeof period)}
              className="h-8 rounded-lg border border-input bg-muted px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="ytd">{t('page.dashboard.periodYtd')}</option>
              <option value="q1">{t('page.dashboard.periodQ1')}</option>
              <option value="q2">{t('page.dashboard.periodQ2')}</option>
              <option value="q3">{t('page.dashboard.periodQ3')}</option>
              <option value="q4">{t('page.dashboard.periodQ4')}</option>
              <option value="last12">{t('page.dashboard.periodLast12')}</option>
            </select>
          </div>

          {/* Currency (read-only) */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">Currency:</span>
            <span className="inline-flex items-center rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
              {currency}
            </span>
          </div>

          {/* Right side: last updated + refreshing indicator */}
          <div className="ml-auto flex items-center gap-3">
            {isRefreshing && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary">
                <span className="h-2 w-2 animate-spin rounded-full border border-primary border-t-transparent" />
                {t('page.dashboard.refreshing')}
              </span>
            )}
            <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <Clock className="h-3 w-3" />
              {t('page.dashboard.lastUpdated')}: {lastUpdated.toLocaleTimeString()}
            </span>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          1. EXECUTIVE SUMMARY — 7 primary KPIs
         ═══════════════════════════════════════════════════════ */}
      <section aria-label="Executive summary">
        {executiveQuery.isLoading || !executive ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl bg-secondary" />
            ))}
          </div>
        ) : (
          <ExecutiveKpiGrid data={executive} />
        )}
      </section>

      {/* ═══════════════════════════════════════════════════════
          2. FINANCIAL PERFORMANCE — Charts
         ═══════════════════════════════════════════════════════ */}
      <DashboardSection
        title={t('page.dashboard.financialPerformance')}
        icon={<BarChart3 className="h-4 w-4" />}
        defaultOpen={true}
      >
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {revenueQuery.isLoading ? (
            <>
              <WidgetSkeleton />
              <WidgetSkeleton />
            </>
          ) : revenue.length === 0 ? (
            <Card className="lg:col-span-2">
              <CardContent className="flex items-center justify-center py-16">
                <EmptyState
                  title={t('page.dashboard.trendDataEmptyTitle')}
                  description={t('page.dashboard.trendDataEmptyDesc')}
                />
              </CardContent>
            </Card>
          ) : (
            <>
              <RevenueVsExpenseChart data={revenue} />
              <BudgetVsActualChart data={revenue} />
            </>
          )}
        </div>
        {/* Net Profit Trend — full width below */}
        {revenue.length > 0 && (
          <div className="mt-5">
            <ProfitabilityTrendChart data={revenue} />
          </div>
        )}
      </DashboardSection>

      {/* ═══════════════════════════════════════════════════════
          3. PLANNING & FORECAST
         ═══════════════════════════════════════════════════════ */}
      {executive && (
        <DashboardSection
          title={t('page.dashboard.planningForecast')}
          icon={<Target className="h-4 w-4" />}
          defaultOpen={true}
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricMini
              label={t('page.dashboard.budgetUtilization')}
              value={`${executive.budgetUtilization.current.toFixed(1)}%`}
              change={growthStr(executive.budgetUtilization.growthPct)}
              trend={executive.budgetUtilization.trend}
              icon={<Target className="h-4 w-4" />}
            />
            <MetricMini
              label={t('page.dashboard.forecastAccuracy')}
              value={`${executive.forecastAccuracy.current.toFixed(1)}%`}
              icon={<TrendingUp className="h-4 w-4" />}
            />
            <MetricMini
              label={t('page.dashboard.pendingApprovals')}
              value={String(executive.pendingApprovals.current)}
              icon={<AlertTriangle className="h-4 w-4" />}
            />
            <MetricMini
              label={t('page.dashboard.totalBudget')}
              value={fmt(executive.totalBudget.current)}
              change={growthStr(executive.totalBudget.growthPct)}
              trend={executive.totalBudget.trend}
              icon={<Wallet className="h-4 w-4" />}
            />
          </div>
        </DashboardSection>
      )}

      {/* ═══════════════════════════════════════════════════════
          4. OPERATIONS
         ═══════════════════════════════════════════════════════ */}
      {executive && (
        <DashboardSection
          title={t('page.dashboard.operations')}
          icon={<Factory className="h-4 w-4" />}
          defaultOpen={true}
        >
          <div className="space-y-5">
            {/* Operations metrics row */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <MetricMini
                label={t('page.dashboard.inventoryValue')}
                value={fmt(executive.inventoryValue.current)}
                change={growthStr(executive.inventoryValue.growthPct)}
                trend={executive.inventoryValue.trend}
                icon={<Package className="h-4 w-4" />}
              />
              <MetricMini
                label={t('page.dashboard.inventoryCoverage')}
                value={`${executive.inventoryCoverage.current.toFixed(0)} ${t('page.dashboard.days')}`}
                icon={<Layers className="h-4 w-4" />}
              />
              <MetricMini
                label={t('page.dashboard.productionCost')}
                value={fmt(executive.productionCost.current)}
                change={growthStr(executive.productionCost.growthPct)}
                trend={executive.productionCost.trend}
                icon={<Factory className="h-4 w-4" />}
              />
              <MetricMini
                label={t('page.dashboard.manufacturingCost')}
                value={fmt(executive.manufacturingCost.current)}
                change={growthStr(executive.manufacturingCost.growthPct)}
                trend={executive.manufacturingCost.trend}
                icon={<Boxes className="h-4 w-4" />}
              />
            </div>

            {/* Top Products + Top Branches/Customers */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
              <div className="lg:col-span-2">
                {productsQuery.isLoading ? (
                  <WidgetSkeleton />
                ) : topProducts.length > 0 ? (
                  <TopProductsChart data={topProducts} />
                ) : null}
              </div>
              <Card>
                <CardHeader>
                  <CardTitle>{t('page.dashboard.topCustomers')}</CardTitle>
                </CardHeader>
                <CardContent>
                  {customersQuery.isLoading ? (
                    <WidgetSkeleton />
                  ) : topCustomers.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t('page.dashboard.noDataYet')}</p>
                  ) : (
                    <ul className="space-y-2">
                      {topCustomers.slice(0, 5).map((c, i) => (
                        <li key={c.id} className="flex items-center justify-between gap-2">
                          <span className="flex items-center gap-2 text-sm text-foreground">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-600 dark:bg-blue-900/40 dark:text-blue-400">
                              {i + 1}
                            </span>
                            <span className="truncate max-w-[120px]">{c.name}</span>
                          </span>
                          <Badge variant="info">{fmt(c.value)}</Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </DashboardSection>
      )}

      {/* ═══════════════════════════════════════════════════════
          COSTING & PROFITABILITY SECTION
         ═══════════════════════════════════════════════════════ */}
      {activeCompanyId && (
        <DashboardSection
          title={t('page.dashboard.costingSectionTitle')}
          icon={<Layers className="h-4 w-4" />}
          defaultOpen={true}
        >
          {costingQuery.isLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-28 animate-pulse rounded-xl bg-secondary" />
              ))}
            </div>
          ) : !costingQuery.data ? (
            <div className="text-center py-6 text-muted-foreground">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-xs">{t('page.dashboard.costingUnavailable')}</p>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Costing KPI Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-9 gap-3">
                
                <CostingMetricCard
                  label={t('page.dashboard.costingAvgProductCost')}
                  value={fmt(costingQuery.data.averageProductCost)}
                  tooltip={t('page.dashboard.costingAvgProductCostTip')}
                  onClick={() => router.push('/reports?report=costing-breakdown')}
                  icon={<Layers className="h-4 w-4 text-emerald-600" />}
                />

                <CostingMetricCard
                  label={t('page.dashboard.costingHighestCostProduct')}
                  value={fmt(costingQuery.data.highestCostProduct.cost)}
                  subtext={costingQuery.data.highestCostProduct.name}
                  tooltip={t('page.dashboard.costingHighestCostProductTip')}
                  badge={{ text: t('page.dashboard.costingHighCost'), variant: 'error' }}
                  onClick={() => router.push('/reports?report=costing-breakdown')}
                  icon={<TrendingUp className="h-4 w-4 text-red-500" />}
                />

                <CostingMetricCard
                  label={t('page.dashboard.costingLowestCostProduct')}
                  value={fmt(costingQuery.data.lowestCostProduct.cost)}
                  subtext={costingQuery.data.lowestCostProduct.name}
                  tooltip={t('page.dashboard.costingLowestCostProductTip')}
                  onClick={() => router.push('/reports?report=costing-breakdown')}
                  icon={<TrendingDown className="h-4 w-4 text-emerald-500" />}
                />

                <CostingMetricCard
                  label={t('page.dashboard.costingHighestMarginProduct')}
                  value={`${costingQuery.data.highestMarginProduct.marginPct.toFixed(1)}%`}
                  subtext={costingQuery.data.highestMarginProduct.name}
                  tooltip={t('page.dashboard.costingHighestMarginProductTip')}
                  badge={{ text: t('page.dashboard.costingHighMargin'), variant: 'success' }}
                  onClick={() => router.push('/reports?report=costing-profitability')}
                  icon={<TrendingUp className="h-4 w-4 text-emerald-600" />}
                />

                <CostingMetricCard
                  label={t('page.dashboard.costingLowestMarginProduct')}
                  value={`${costingQuery.data.lowestMarginProduct.marginPct.toFixed(1)}%`}
                  subtext={costingQuery.data.lowestMarginProduct.name}
                  tooltip={t('page.dashboard.costingLowestMarginProductTip')}
                  badge={costingQuery.data.lowestMarginProduct.marginPct < 5 ? { text: t('page.dashboard.costingLowMargin'), variant: 'error' } : undefined}
                  onClick={() => router.push('/reports?report=costing-profitability')}
                  icon={<TrendingDown className="h-4 w-4 text-amber-500" />}
                />

                <CostingMetricCard
                  label={t('page.dashboard.costingMaterialCost')}
                  value={fmt(costingQuery.data.materialCost)}
                  tooltip={t('page.dashboard.costingMaterialCostTip')}
                  onClick={() => router.push('/reports?report=costing-material')}
                  icon={<Boxes className="h-4 w-4 text-emerald-600" />}
                />

                <CostingMetricCard
                  label={t('page.dashboard.costingPackagingCost')}
                  value={fmt(costingQuery.data.packagingCost)}
                  tooltip={t('page.dashboard.costingPackagingCostTip')}
                  onClick={() => router.push('/reports?report=costing-pack')}
                  icon={<Package className="h-4 w-4 text-blue-500" />}
                />

                <CostingMetricCard
                  label={t('page.dashboard.costingManufacturingCost')}
                  value={fmt(costingQuery.data.manufacturingCost)}
                  tooltip={t('page.dashboard.costingManufacturingCostTip')}
                  onClick={() => router.push('/reports?report=costing-mfg')}
                  icon={<Factory className="h-4 w-4 text-yellow-500" />}
                />

                <CostingMetricCard
                  label={t('page.dashboard.costingWastageRate')}
                  value={`${costingQuery.data.wasteCost.toFixed(2)}%`}
                  tooltip={t('page.dashboard.costingWastageRateTip')}
                  badge={costingQuery.data.wasteCost > 5 ? { text: t('page.dashboard.costingHighWaste'), variant: 'warning' } : undefined}
                  onClick={() => router.push('/reports?report=costing-yield')}
                  icon={<AlertTriangle className="h-4 w-4 text-red-500" />}
                />

              </div>

              {/* Chart & Profitable Lists Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                
                {/* Cost Trend Chart */}
                <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5 shadow-sm">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
                    {t('page.dashboard.costingTrendTitle')}
                  </h4>
                  {costingQuery.data.costTrend.length === 0 ? (
                    <div className="h-64 flex items-center justify-center text-muted-foreground text-xs">
                      {t('page.dashboard.costingNoTrendData')}
                    </div>
                  ) : (
                    <div className="w-full h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={costingQuery.data.costTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
<XAxis dataKey="period" stroke="var(--color-muted-foreground, #94a3b8)" fontSize={10} tickLine={false} axisLine={false} />
                           <YAxis stroke="var(--color-muted-foreground, #94a3b8)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                          <RechartsTooltip formatter={(value) => `$${Number(value).toFixed(2)}`} />
                          <Legend />
                          <Line type="monotone" name={t('page.dashboard.costingAvgStandard')} dataKey="averageStandardCost" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
                          <Line type="monotone" name={t('page.dashboard.costingAvgActual')} dataKey="averageActualCost" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                {/* Top 10 Profitable Products */}
                <Card>
                  <CardHeader className="py-3 px-4">
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                      <span>{t('page.dashboard.costingTop10Profitable')}</span>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 lowercase font-medium">gross profit</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 pt-0">
                    {costingQuery.data.top10ProfitableProducts.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">{t('page.dashboard.costingNoSalesData')}</p>
                    ) : (
                      <ul className="space-y-1.5 text-xs">
                        {costingQuery.data.top10ProfitableProducts.map((p: any, i: number) => (
                          <li
                            key={p.id}
                            onClick={() => router.push(`/reports?report=costing-profitability&product_id=${p.id}`)}
                            className="flex items-center justify-between p-1.5 rounded hover:bg-secondary cursor-pointer transition-colors"
                          >
                            <span className="flex items-center gap-2 truncate max-w-[150px]">
                              <span className="font-bold text-emerald-700">{i + 1}</span>
                              <span className="truncate" title={p.name}>{p.name}</span>
                            </span>
                            <div className="flex gap-2 items-center">
                              <Badge variant="success">{fmt(p.profit)}</Badge>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>

              </div>

              {/* Lowest Margin / Top Loss Products Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                
                {/* Top 10 Loss Products */}
                <Card className="lg:col-span-1">
                  <CardHeader className="py-3 px-4">
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                      <span>{t('page.dashboard.costingTop10Loss')}</span>
                      <span className="text-[10px] text-red-500 lowercase font-medium">gross profit</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 pt-0">
                    {costingQuery.data.top10LossProducts.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">{t('page.dashboard.costingNoSalesData')}</p>
                    ) : (
                      <ul className="space-y-1.5 text-xs">
                        {costingQuery.data.top10LossProducts.map((p: any, i: number) => (
                          <li
                            key={p.id}
                            onClick={() => router.push(`/reports?report=costing-profitability&product_id=${p.id}`)}
                            className="flex items-center justify-between p-1.5 rounded hover:bg-secondary cursor-pointer transition-colors"
                          >
                            <span className="flex items-center gap-2 truncate max-w-[150px]">
                              <span className="font-bold text-red-600">{i + 1}</span>
                              <span className="truncate" title={p.name}>{p.name}</span>
                            </span>
                            <Badge variant={p.profit < 0 ? 'danger' : 'warning'}>{fmt(p.profit)}</Badge>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>

                {/* Quick Info message about variance tracking */}
                <div className="lg:col-span-2 rounded-xl border border-blue-50 bg-blue-50/20 p-5 dark:border-blue-950/40 dark:bg-blue-950/10 flex flex-col justify-center">
                  <h4 className="text-xs font-bold text-blue-800 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Info className="h-4 w-4" />
                    {t('page.dashboard.costingVarianceTitle')}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                    {t('page.dashboard.costingVarianceDesc')}
                  </p>
                </div>

              </div>

            </div>
          )}
        </DashboardSection>
      )}

      {/* ═══════════════════════════════════════════════════════
          5. ALERTS & ACTIONS
         ═══════════════════════════════════════════════════════ */}
      <DashboardSection
        title={t('page.dashboard.alertsActions')}
        icon={<Bell className="h-4 w-4" />}
        defaultOpen={true}
        badge={alerts.length > 0 ? String(alerts.length) : undefined}
      >
        {alertsQuery.isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-secondary" />
            ))}
          </div>
        ) : alerts.length === 0 ? (
          <div className="flex items-center gap-3 rounded-lg border border-emerald-100 bg-emerald-50/50 p-4 dark:border-emerald-900/30 dark:bg-emerald-900/10">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            <p className="text-sm text-emerald-700 dark:text-emerald-400">
              {t('page.dashboard.noActiveAlerts')}
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {alerts.slice(0, 8).map((alert) => (
              <AlertCard key={alert.id} alert={alert} />
            ))}
          </div>
        )}
        {/* Quick action summary */}
        {executive && (
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <MetricMini
              label={t('page.dashboard.failedImports')}
              value={String(executive.failedImports.current)}
              icon={<XCircle className="h-4 w-4" />}
            />
            <MetricMini
              label={t('page.dashboard.successfulImports')}
              value={String(executive.successfulImports.current)}
              icon={<CheckCircle2 className="h-4 w-4" />}
            />
            <MetricMini
              label={t('page.dashboard.pendingApprovals')}
              value={String(executive.pendingApprovals.current)}
              icon={<AlertTriangle className="h-4 w-4" />}
            />
          </div>
        )}
      </DashboardSection>

      {/* ═══════════════════════════════════════════════════════
          6. EXCHANGE RATES WIDGET
         ═══════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Revenue trend table */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t('page.dashboard.revenueTrend')}</CardTitle>
          </CardHeader>
          <CardContent>
            {revenueQuery.isLoading ? (
              <WidgetSkeleton />
            ) : revenue.length === 0 ? (
              <EmptyState
                title={t('page.dashboard.trendDataEmptyTitle')}
                description={t('page.dashboard.trendDataEmptyDesc')}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs text-muted-foreground">
                      <th className="pb-2 text-left font-medium">{t('common.month')}</th>
                      <th className="pb-2 text-right font-medium">{t('page.dashboard.actualLabel')}</th>
                      <th className="pb-2 text-right font-medium">{t('page.dashboard.budgetLabel')}</th>
                      <th className="pb-2 text-right font-medium">{t('page.dashboard.forecastLabel')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {revenue.map((row) => (
                      <tr key={row.period_month}>
                        <td className="py-2 text-foreground">
                          {translateMonth(row.period_month, locale)}
                        </td>
                        <td className="py-2 text-right font-medium text-emerald-700 dark:text-emerald-400">
                          {fmt(row.actual)}
                        </td>
                        <td className="py-2 text-right text-muted-foreground">
                          {fmt(row.budget)}
                        </td>
                        <td className="py-2 text-right text-muted-foreground">
                          {fmt(row.forecast)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Market Widget */}
        <MarketWidget />
      </div>

      {/* ═══════════════════════════════════════════════════════
          7. MODULE SUMMARY — Compact counts
         ═══════════════════════════════════════════════════════ */}
      <DashboardSection
        title={t('page.dashboard.moduleSummary')}
        icon={<LayoutGrid className="h-4 w-4" />}
        defaultOpen={false}
      >
        {moduleQuery.isLoading ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
            {[...Array(14)].map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-lg bg-secondary" />
            ))}
          </div>
        ) : (
          <ModuleSummaryGrid data={moduleSummary} t={t} />
        )}
      </DashboardSection>
    </div>
  );
}
