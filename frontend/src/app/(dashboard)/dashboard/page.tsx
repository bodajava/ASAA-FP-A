'use client';

import React, { useState } from 'react';
import {
  BarChart3,
  DollarSign,
  Target,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { useQueries } from '@tanstack/react-query';
import { PageHeader } from '@/components/ui/page-header';
import { KpiCard } from '@/components/ui/kpi-card';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/feedback-states';
import { Badge } from '@/components/ui/badge';
import { apiGet } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useActiveCurrency } from '@/hooks/use-active-currency';
import { formatPercent } from '@/lib/currency';
import { getCurrentFiscalYear } from '@/lib/constants';
import { useI18n } from '@/lib/i18n/i18n-context';
import { translateMonth } from '@/lib/i18n/translate-api';
import { queryKeys } from '@/lib/query-keys';
import type {
  DashboardKpis,
  MonthlyTrendItem,
  RankedItem,
  UtilizationData,
} from '@/types/api';

function pct(n: number | null | undefined, locale?: string) {
  if (n === null || n === undefined) return '—';
  return formatPercent(n, 1, locale);
}

/** Skeleton for a widget that hasn't loaded yet */
function WidgetSkeleton() {
  return <div className="h-48 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-700" />;
}

export default function DashboardPage() {
  const { t, locale } = useI18n();
  const { activeCompanyId } = useAuth();
  const { format: fmt } = useActiveCurrency();
  const [year, setYear] = useState<number>(getCurrentFiscalYear());

  // Independent queries for each dashboard widget
  const [kpisQuery, revenueQuery, productsQuery, customersQuery, utilizationQuery] = useQueries({
    queries: [
      {
        queryKey: queryKeys.dashboard.kpis(activeCompanyId!),
        queryFn: ({ signal }: { signal: AbortSignal }) =>
          apiGet<DashboardKpis>(`/dashboard/summary?fiscal_year=${year}`, { signal }),
        enabled: Boolean(activeCompanyId),
        staleTime: 5 * 60 * 1000,
        meta: { persist: true },
      },
      {
        queryKey: queryKeys.dashboard.revenue(activeCompanyId!, year),
        queryFn: ({ signal }: { signal: AbortSignal }) =>
          apiGet<MonthlyTrendItem[]>(`/dashboard/revenue-trend?fiscal_year=${year}`, { signal }),
        enabled: Boolean(activeCompanyId),
        staleTime: 5 * 60 * 1000,
        meta: { persist: true },
      },
      {
        queryKey: queryKeys.dashboard.topProducts(activeCompanyId!, year),
        queryFn: ({ signal }: { signal: AbortSignal }) =>
          apiGet<RankedItem[]>(`/dashboard/top-products?fiscal_year=${year}`, { signal }),
        enabled: Boolean(activeCompanyId),
        staleTime: 5 * 60 * 1000,
        meta: { persist: true },
      },
      {
        queryKey: queryKeys.dashboard.topCustomers(activeCompanyId!, year),
        queryFn: ({ signal }: { signal: AbortSignal }) =>
          apiGet<RankedItem[]>(`/dashboard/top-customers?fiscal_year=${year}`, { signal }),
        enabled: Boolean(activeCompanyId),
        staleTime: 5 * 60 * 1000,
        meta: { persist: true },
      },
      {
        queryKey: queryKeys.dashboard.utilization(activeCompanyId!, year),
        queryFn: ({ signal }: { signal: AbortSignal }) =>
          apiGet<UtilizationData>(`/dashboard/budget-utilization?fiscal_year=${year}`, { signal }),
        enabled: Boolean(activeCompanyId),
        staleTime: 5 * 60 * 1000,
        meta: { persist: true },
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

  const kpis = kpisQuery.data ?? null;
  const revenue = revenueQuery.data ?? [];
  const topProducts = productsQuery.data ?? [];
  const topCustomers = customersQuery.data ?? [];
  const utilization = utilizationQuery.data ?? null;

  // Show loading only on initial load (no cached data yet)
  const isInitialLoading = kpisQuery.isLoading;

  if (isInitialLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title={t('page.dashboard.title')} description={t('page.dashboard.financialOverview', { year })} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-700" />
          ))}
        </div>
      </div>
    );
  }

  // Background refresh indicator
  const isRefreshing = kpisQuery.isFetching && !kpisQuery.isLoading;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('page.dashboard.title')}
        description={t('page.dashboard.financialOverview', { year })}
      >
        <div className="flex items-center gap-3">
          {isRefreshing && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
              <span className="h-2 w-2 animate-spin rounded-full border border-emerald-600 border-t-transparent dark:border-emerald-400 dark:border-t-transparent" />
              Refreshing…
            </span>
          )}
          <label htmlFor="dashboard-year" className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {t('common.fiscalYear')}:
          </label>
          <select
            id="dashboard-year"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value={2024}>2024</option>
            <option value={2025}>2025</option>
            <option value={2026}>2026</option>
            <option value={2027}>2027</option>
          </select>
        </div>
      </PageHeader>

      {/* KPI Cards — each widget loads independently */}
      <section aria-label="KPI summary">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {kpisQuery.isLoading || !kpis ? (
            <>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-28 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-700" />
              ))}
            </>
          ) : (
            <>
              <KpiCard
                title={t('page.dashboard.revenue')}
                value={fmt(kpis.revenue)}
                icon={<DollarSign className="h-5 w-5" />}
                description={t('page.dashboard.ytdLabel')}
              />
              <KpiCard
                title={t('page.dashboard.grossProfit')}
                value={fmt(kpis.gross_profit)}
                icon={<TrendingUp className="h-5 w-5" />}
                description={t('page.dashboard.ytdLabel')}
              />
              <KpiCard
                title={t('page.dashboard.netProfit')}
                value={fmt(kpis.net_profit)}
                icon={<BarChart3 className="h-5 w-5" />}
                trendDirection={
                  kpis.net_profit > 0 ? 'up' : kpis.net_profit < 0 ? 'down' : 'neutral'
                }
                description={t('page.dashboard.ytdLabel')}
              />
              <KpiCard
                title={t('page.dashboard.cashBalance')}
                value={fmt(kpis.cash_balance)}
                icon={<Wallet className="h-5 w-5" />}
                description={t('page.dashboard.latestLabel')}
              />
            </>
          )}
        </div>
      </section>

      {/* Second KPI row */}
      <section aria-label="Budget and forecast metrics">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {kpisQuery.isLoading || !kpis ? (
            <>
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-28 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-700" />
              ))}
            </>
          ) : (
            <>
              <KpiCard
                title={t('page.dashboard.expenses')}
                value={fmt(kpis.expenses)}
                icon={<TrendingDown className="h-5 w-5" />}
                description={t('page.dashboard.ytdLabel')}
              />
              <KpiCard
                title={t('page.dashboard.budgetUtilization')}
                value={pct(kpis.budget_utilization, locale)}
                icon={<Target className="h-5 w-5" />}
                trendDirection={
                  kpis.budget_utilization > 100 ? 'down'
                    : kpis.budget_utilization >= 80 ? 'up'
                      : 'neutral'
                }
                description={t('page.dashboard.budgetUtilDesc', { rev: pct(utilization?.revenue_utilization, locale), exp: pct(utilization?.expense_utilization, locale) })}
              />
              <KpiCard
                title={t('page.dashboard.forecastAccuracy')}
                value={pct(kpis.forecast_accuracy, locale)}
                trendDirection={kpis.forecast_accuracy >= 90 ? 'up' : 'neutral'}
                description={t('page.dashboard.forecastAccDesc')}
              />
            </>
          )}
        </div>
      </section>

      {/* Revenue trend + Top tables */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Revenue trend — independent widget */}
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
                    <tr className="border-b border-slate-100 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
                      <th className="pb-2 text-left font-medium">{t('common.month')}</th>
                      <th className="pb-2 text-right font-medium">{t('page.dashboard.actualLabel')}</th>
                      <th className="pb-2 text-right font-medium">{t('page.dashboard.budgetLabel')}</th>
                      <th className="pb-2 text-right font-medium">{t('page.dashboard.forecastLabel')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                    {revenue.map((row) => (
                      <tr key={row.period_month}>
                        <td className="py-2 text-slate-700 dark:text-slate-300">
                          {translateMonth(row.period_month, locale)}
                        </td>
                        <td className="py-2 text-right font-medium text-emerald-700 dark:text-emerald-400">
                          {fmt(row.actual)}
                        </td>
                        <td className="py-2 text-right text-slate-500">
                          {fmt(row.budget)}
                        </td>
                        <td className="py-2 text-right text-slate-500 dark:text-slate-400">
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

        {/* Top Products + Customers — independent widgets */}
        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader>
              <CardTitle>{t('page.dashboard.topProducts')}</CardTitle>
            </CardHeader>
            <CardContent>
              {productsQuery.isLoading ? (
                <WidgetSkeleton />
              ) : topProducts.length === 0 ? (
                <p className="text-sm text-slate-400 dark:text-slate-500">{t('page.dashboard.noDataYet')}</p>
              ) : (
                <ul className="space-y-2">
                  {topProducts.slice(0, 5).map((p, i) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-xs font-bold text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400">
                          {i + 1}
                        </span>
                        <span className="truncate max-w-[120px]">{p.name}</span>
                      </span>
                      <Badge variant="success">{fmt(p.value)}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('page.dashboard.topCustomers')}</CardTitle>
            </CardHeader>
            <CardContent>
              {customersQuery.isLoading ? (
                <WidgetSkeleton />
              ) : topCustomers.length === 0 ? (
                <p className="text-sm text-slate-400 dark:text-slate-500">{t('page.dashboard.noDataYet')}</p>
              ) : (
                <ul className="space-y-2">
                  {topCustomers.slice(0, 5).map((c, i) => (
                    <li
                      key={c.id}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
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
    </div>
  );
}
