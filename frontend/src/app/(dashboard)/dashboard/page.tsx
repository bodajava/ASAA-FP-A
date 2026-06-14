'use client';

import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  DollarSign,
  Target,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { KpiCard } from '@/components/ui/kpi-card';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { EmptyState, ErrorState } from '@/components/ui/feedback-states';
import { Badge } from '@/components/ui/badge';
import { apiGet } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { MONTH_NAMES, getCurrentFiscalYear } from '@/lib/constants';
import type {
  DashboardKpis,
  MonthlyTrendItem,
  RankedItem,
  UtilizationData,
} from '@/types/api';

function fmt(n: number | null | undefined) {
  if (n === null || n === undefined) return '—';
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(2);
}

function pct(n: number | null | undefined) {
  if (n === null || n === undefined) return '—';
  return `${n.toFixed(1)}%`;
}

export default function DashboardPage() {
  const { activeCompanyId } = useAuth();
  const [kpis, setKpis] = useState<DashboardKpis | null>(null);
  const [revenue, setRevenue] = useState<MonthlyTrendItem[]>([]);
  const [topProducts, setTopProducts] = useState<RankedItem[]>([]);
  const [topCustomers, setTopCustomers] = useState<RankedItem[]>([]);
  const [utilization, setUtilization] = useState<UtilizationData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [year, setYear] = useState<number>(getCurrentFiscalYear());

  useEffect(() => {
    if (!activeCompanyId) return;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const q = `fiscal_year=${year}`;
        const [k, rev, prods, custs, util] = await Promise.all([
          apiGet<DashboardKpis>(`/dashboard/summary?${q}`),
          apiGet<MonthlyTrendItem[]>(`/dashboard/revenue-trend?${q}`),
          apiGet<RankedItem[]>(`/dashboard/top-products?${q}`),
          apiGet<RankedItem[]>(`/dashboard/top-customers?${q}`),
          apiGet<UtilizationData>(`/dashboard/budget-utilization?${q}`),
        ]);
        setKpis(k);
        setRevenue(Array.isArray(rev) ? rev : []);
        setTopProducts(Array.isArray(prods) ? prods : []);
        setTopCustomers(Array.isArray(custs) ? custs : []);
        setUtilization(util);
      } catch {
        setError('Failed to load dashboard data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }

    void load();
  }, [activeCompanyId, year]);

  if (!activeCompanyId) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" description={`FY ${year} financial overview`} />
        <EmptyState
          title="No active company"
          description="Select a company from the sidebar to view your dashboard."
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" description={`FY ${year} financial overview`} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" />
        <ErrorState message={error} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={`FY ${year} financial overview`}
      >
        <div className="flex items-center gap-2">
          <label htmlFor="dashboard-year" className="text-xs font-semibold text-slate-500">
            Fiscal Year:
          </label>
          <select
            id="dashboard-year"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value={2024}>2024</option>
            <option value={2025}>2025</option>
            <option value={2026}>2026</option>
            <option value={2027}>2027</option>
          </select>
        </div>
      </PageHeader>

      {/* KPI Cards */}
      <section aria-label="KPI summary">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            title="Total Revenue"
            value={kpis ? fmt(kpis.revenue) : '—'}
            icon={<DollarSign className="h-5 w-5" />}
            description="Actual YTD"
          />
          <KpiCard
            title="Gross Profit"
            value={kpis ? fmt(kpis.gross_profit) : '—'}
            icon={<TrendingUp className="h-5 w-5" />}
            description="Actual YTD"
          />
          <KpiCard
            title="Net Profit"
            value={kpis ? fmt(kpis.net_profit) : '—'}
            icon={<BarChart3 className="h-5 w-5" />}
            trendDirection={
              kpis && kpis.net_profit > 0 ? 'up' : kpis && kpis.net_profit < 0 ? 'down' : 'neutral'
            }
            description="Actual YTD"
          />
          <KpiCard
            title="Cash Balance"
            value={kpis ? fmt(kpis.cash_balance) : '—'}
            icon={<Wallet className="h-5 w-5" />}
            description="Latest"
          />
        </div>
      </section>

      {/* Second KPI row */}
      <section aria-label="Budget and forecast metrics">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <KpiCard
            title="Total Expenses"
            value={kpis ? fmt(kpis.expenses) : '—'}
            icon={<TrendingDown className="h-5 w-5" />}
            description="Actual YTD"
          />
          <KpiCard
            title="Budget Utilization"
            value={kpis ? pct(kpis.budget_utilization) : '—'}
            icon={<Target className="h-5 w-5" />}
            trendDirection={
              kpis && kpis.budget_utilization > 100 ? 'down'
                : kpis && kpis.budget_utilization >= 80 ? 'up'
                  : 'neutral'
            }
            description={`Revenue: ${pct(utilization?.revenue_utilization)} / Expense: ${pct(utilization?.expense_utilization)}`}
          />
          <KpiCard
            title="Forecast Accuracy"
            value={kpis ? pct(kpis.forecast_accuracy) : '—'}
            trendDirection={kpis && kpis.forecast_accuracy >= 90 ? 'up' : 'neutral'}
            description="vs. actuals"
          />
        </div>
      </section>

      {/* Revenue trend + Top tables */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Revenue trend */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {revenue.length === 0 ? (
              <EmptyState
                title="No trend data"
                description="Actual, budget and forecast data will appear here."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs text-slate-500">
                      <th className="pb-2 text-left font-medium">Month</th>
                      <th className="pb-2 text-right font-medium">Actual</th>
                      <th className="pb-2 text-right font-medium">Budget</th>
                      <th className="pb-2 text-right font-medium">Forecast</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {revenue.map((row) => (
                      <tr key={row.period_month}>
                        <td className="py-2 text-slate-700">
                          {MONTH_NAMES[row.period_month]}
                        </td>
                        <td className="py-2 text-right font-medium text-emerald-700">
                          {fmt(row.actual)}
                        </td>
                        <td className="py-2 text-right text-slate-500">
                          {fmt(row.budget)}
                        </td>
                        <td className="py-2 text-right text-slate-500">
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

        {/* Top Products + Customers */}
        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader>
              <CardTitle>Top Products</CardTitle>
            </CardHeader>
            <CardContent>
              {topProducts.length === 0 ? (
                <p className="text-sm text-slate-400">No data yet.</p>
              ) : (
                <ul className="space-y-2">
                  {topProducts.slice(0, 5).map((p, i) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="flex items-center gap-2 text-sm text-slate-700">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-xs font-bold text-emerald-600">
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
              <CardTitle>Top Customers</CardTitle>
            </CardHeader>
            <CardContent>
              {topCustomers.length === 0 ? (
                <p className="text-sm text-slate-400">No data yet.</p>
              ) : (
                <ul className="space-y-2">
                  {topCustomers.slice(0, 5).map((c, i) => (
                    <li
                      key={c.id}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="flex items-center gap-2 text-sm text-slate-700">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-600">
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
