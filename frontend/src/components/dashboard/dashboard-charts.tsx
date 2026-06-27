'use client';

import React from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useActiveCurrency } from '@/hooks/use-active-currency';
import { useI18n } from '@/lib/i18n/i18n-context';
import { translateMonth } from '@/lib/i18n/translate-api';
import type { MonthlyTrendItem, RankedItem } from '@/types/api';

// ---------------------------------------------------------------------------
// Chart tooltip
// ---------------------------------------------------------------------------
function ChartTooltip({
  active,
  payload,
  label,
  format,
  locale,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color?: string }>;
  label?: string;
  format: (v: number) => string;
  locale: string;
}) {
  if (!active || !payload?.length) return null;
  const monthLabel = label ? translateMonth(Number(label), locale) : label;
  return (
    <div className="rounded-lg border border-border bg-card p-3 shadow-lg">
      <p className="mb-1 text-xs font-semibold text-card-foreground">{monthLabel}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium text-card-foreground">{format(entry.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Revenue vs Expense (AreaChart)
// ---------------------------------------------------------------------------
export function RevenueVsExpenseChart({ data }: { data: MonthlyTrendItem[] }) {
  const { format: fmt } = useActiveCurrency();
  const { t, locale } = useI18n();

  const chartData = data.map((d) => ({
    month: d.period_month,
    revenue: d.actual,
    budget: d.budget,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('page.dashboard.revenueVsExpense')}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={320} className="mt-2">
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              dataKey="month"
              tickFormatter={(v) => translateMonth(v, locale).slice(0, 3)}
              className="text-xs"
              stroke="currentColor"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
            />
            <YAxis
              className="text-xs"
              stroke="currentColor"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              tickFormatter={(v) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)}
            />
            <Tooltip content={<ChartTooltip format={fmt as (v: number) => string} locale={locale} />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Area
              type="monotone"
              dataKey="revenue"
              name={t('common.revenue')}
              stroke="#10b981"
              fill="#10b981"
              fillOpacity={0.15}
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="budget"
              name={t('page.dashboard.budgetLabel')}
              stroke="#6366f1"
              fill="#6366f1"
              fillOpacity={0.1}
              strokeWidth={2}
              strokeDasharray="5 5"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Profitability Trend (LineChart)
// ---------------------------------------------------------------------------
export function ProfitabilityTrendChart({ data }: { data: MonthlyTrendItem[] }) {
  const { format: fmt } = useActiveCurrency();
  const { t, locale } = useI18n();

  const chartData = data.map((d) => ({
    month: d.period_month,
    grossProfit: d.actual,
    forecast: d.forecast,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('page.dashboard.profitabilityTrend')}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={320} className="mt-2">
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              dataKey="month"
              tickFormatter={(v) => translateMonth(v, locale).slice(0, 3)}
              stroke="currentColor"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
            />
            <YAxis
              stroke="currentColor"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              tickFormatter={(v) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)}
            />
            <Tooltip content={<ChartTooltip format={fmt as (v: number) => string} locale={locale} />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line
              type="monotone"
              dataKey="grossProfit"
              name={t('page.dashboard.grossProfit')}
              stroke="#10b981"
              strokeWidth={2}
              dot={{ r: 3, fill: '#10b981' }}
            />
            <Line
              type="monotone"
              dataKey="forecast"
              name={t('page.dashboard.forecastLabel')}
              stroke="#f59e0b"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ r: 3, fill: '#f59e0b' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Budget vs Actual (BarChart)
// ---------------------------------------------------------------------------
export function BudgetVsActualChart({ data }: { data: MonthlyTrendItem[] }) {
  const { format: fmt } = useActiveCurrency();
  const { t, locale } = useI18n();

  const chartData = data.map((d) => ({
    month: d.period_month,
    budget: d.budget,
    actual: d.actual,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('page.dashboard.budgetVsActual')}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={320} className="mt-2">
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              dataKey="month"
              tickFormatter={(v) => translateMonth(v, locale).slice(0, 3)}
              stroke="currentColor"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
            />
            <YAxis
              stroke="currentColor"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              tickFormatter={(v) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)}
            />
            <Tooltip content={<ChartTooltip format={fmt as (v: number) => string} locale={locale} />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar
              dataKey="budget"
              name={t('page.dashboard.budgetLabel')}
              fill="#6366f1"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="actual"
              name={t('page.dashboard.actualLabel')}
              fill="#10b981"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Top Products (Horizontal BarChart)
// ---------------------------------------------------------------------------
export function TopProductsChart({ data }: { data: RankedItem[] }) {
  const { format: fmt } = useActiveCurrency();
  const { t } = useI18n();

  const chartData = data.slice(0, 8).map((d) => ({
    name: d.name.length > 20 ? d.name.slice(0, 20) + '…' : d.name,
    value: d.value,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('page.dashboard.topProducts')}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={320} className="mt-2">
          <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 10, left: 80, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              type="number"
              stroke="currentColor"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              tickFormatter={(v) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={80}
              stroke="currentColor"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
            />
            <Tooltip
              formatter={(value) => fmt(Number(value))}
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
