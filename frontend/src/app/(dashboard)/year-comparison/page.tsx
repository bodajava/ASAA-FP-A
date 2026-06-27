'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  DollarSign,
  AlertTriangle,
  ArrowLeftRight,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { LoadingState, EmptyState } from '@/components/ui/feedback-states';
import { Badge } from '@/components/ui/badge';
import { apiGet } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useI18n } from '@/lib/i18n/i18n-context';
import { useActiveCurrency } from '@/hooks/use-active-currency';
import { useToast } from '@/components/ui/toast';
import { MONTH_NAMES } from '@/lib/constants';
import type { TranslationKey } from '@/lib/i18n/translations';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Legend,
} from 'recharts';

interface YearComparisonItem {
  metric: string;
  currentYearValue: number;
  previousYearValue: number;
  varianceAmount: number;
  variancePct: number;
  trend: 'up' | 'down' | 'neutral';
  status: 'good' | 'warning' | 'bad';
}

interface MonthlyComparison {
  period_month: number;
  currentYear: { revenue: number; cogs: number; expenses: number; grossProfit: number; netProfit: number };
  previousYear: { revenue: number; cogs: number; expenses: number; grossProfit: number; netProfit: number };
  variance: { revenue: number; cogs: number; expenses: number; grossProfit: number; netProfit: number };
}

interface ProductComparisonItem {
  productId: string;
  productName: string;
  sku: string;
  currentYearCost: number;
  previousYearCost: number;
  varianceAmount: number;
  variancePct: number;
  currentYearMargin: number;
  previousYearMargin: number;
  marginImpact: number;
}

interface YearComparisonResponse {
  currentYear: number;
  previousYear: number;
  metrics: YearComparisonItem[];
  monthlyComparison: MonthlyComparison[];
  productComparison: ProductComparisonItem[];
}

const METRIC_LABELS: Record<string, string> = {
  revenue: 'page.yearComparison.revenue',
  cogs: 'page.yearComparison.cogs',
  grossProfit: 'page.yearComparison.grossProfit',
  expenses: 'page.yearComparison.expenses',
  netProfit: 'page.yearComparison.netProfit',
  grossMarginPct: 'page.yearComparison.grossMargin',
  netMarginPct: 'page.yearComparison.netMargin',
};

const METRIC_IS_PERCENTAGE = new Set(['grossMarginPct', 'netMarginPct']);
const METRIC_IS_INVERSE = new Set(['cogs', 'expenses']);

export default function YearComparisonPage() {
  const { activeCompanyId } = useAuth();
  const { t, locale } = useI18n();
  const { format: fmt } = useActiveCurrency();
  const { error: toastError } = useToast();

  const currentYearDefault = new Date().getFullYear();
  const [currentYear, setCurrentYear] = useState(currentYearDefault);
  const [previousYear, setPreviousYear] = useState(currentYearDefault - 1);
  const [data, setData] = useState<YearComparisonResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    if (!activeCompanyId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ currentYear: String(currentYear), previousYear: String(previousYear) });
      const result = await apiGet<YearComparisonResponse>(`/reports/year-comparison?${params.toString()}`);
      setData(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toastError(msg);
    } finally {
      setLoading(false);
    }
  }, [activeCompanyId, currentYear, previousYear, toastError]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  if (!activeCompanyId) {
    return (
      <EmptyState
        title={t('page.yearComparison.noCompanyTitle')}
        description={t('page.yearComparison.noCompanyDesc')}
      />
    );
  }

  const monthName = (m: number) => {
    const names = locale === 'ar'
      ? ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
      : MONTH_NAMES;
    return names[m - 1] ?? `M${m}`;
  };

  const chartData = data?.monthlyComparison.map((m) => ({
    name: monthName(m.period_month),
    [`${t('page.yearComparison.revenueLabel')} ${data.currentYear}`]: m.currentYear.revenue,
    [`${t('page.yearComparison.revenueLabel')} ${data.previousYear}`]: m.previousYear.revenue,
    [`${t('page.yearComparison.netProfitLabel')} ${data.currentYear}`]: m.currentYear.netProfit,
    [`${t('page.yearComparison.netProfitLabel')} ${data.previousYear}`]: m.previousYear.netProfit,
  })) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('page.yearComparison.title')}
        description={t('page.yearComparison.description')}
      />

      {/* Year Selectors */}
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-500">{t('page.yearComparison.currentYear')}:</label>
          <select
            value={currentYear}
            onChange={(e) => {
              const y = Number(e.target.value);
              setCurrentYear(y);
              if (y <= previousYear) setPreviousYear(y - 1);
            }}
            className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
          >
            {Array.from({ length: 10 }, (_, i) => currentYearDefault - i).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <ArrowLeftRight className="h-4 w-4 text-slate-300" />

        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-500">{t('page.yearComparison.previousYear')}:</label>
          <select
            value={previousYear}
            onChange={(e) => setPreviousYear(Number(e.target.value))}
            className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
          >
            {Array.from({ length: 10 }, (_, i) => currentYearDefault - i).filter((y) => y < currentYear).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <LoadingState rows={6} message={t('common.loading')} />
      ) : !data ? (
        <EmptyState
          title={t('page.yearComparison.emptyTitle')}
          description={t('page.yearComparison.emptyDesc')}
        />
      ) : (
        <>
          {/* Overall Summary Cards */}
          <section aria-label={t('page.yearComparison.overallSummary')}>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">{t('page.yearComparison.overallSummary')}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {data.metrics.map((m) => {
                const label = t((METRIC_LABELS[m.metric] ?? m.metric) as TranslationKey);
                const isPct = METRIC_IS_PERCENTAGE.has(m.metric);
                const isInverse = METRIC_IS_INVERSE.has(m.metric);
                const statusColor =
                  m.status === 'good'
                    ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-900/20'
                    : m.status === 'bad'
                      ? 'border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-900/20'
                      : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950';
                const trendIcon = m.trend === 'up'
                  ? <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                  : m.trend === 'down'
                    ? <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                    : <Minus className="h-3.5 w-3.5 text-slate-400" />;

                return (
                  <div key={m.metric} className={`rounded-xl border p-4 shadow-sm ${statusColor}`}>
                    <div className="flex items-center gap-2 mb-2">
                      {trendIcon}
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
                    </div>
                    <div className="flex items-baseline gap-3">
                      <div>
                        <p className="text-[10px] text-slate-400">{data.currentYear}</p>
                        <p className="text-lg font-extrabold text-slate-800 dark:text-slate-100">
                          {isPct ? `${m.currentYearValue.toFixed(1)}%` : fmt(m.currentYearValue)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-slate-400">{data.previousYear}</p>
                        <p className="text-sm font-bold text-slate-500">
                          {isPct ? `${m.previousYearValue.toFixed(1)}%` : fmt(m.previousYearValue)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <span className={`text-xs font-bold ${
                        m.status === 'good' ? 'text-emerald-700' : m.status === 'bad' ? 'text-red-600' : 'text-slate-500'
                      }`}>
                        {m.variancePct > 0 ? '+' : ''}{m.variancePct.toFixed(1)}%
                      </span>
                      <span className="text-[10px] text-slate-400">
                        ({m.varianceAmount > 0 ? '+' : ''}{isPct ? `${m.varianceAmount.toFixed(1)}pp` : fmt(m.varianceAmount)})
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Monthly Revenue & Net Profit Chart */}
          {chartData.length > 0 && (
            <section aria-label={t('page.yearComparison.monthlyComparison')}>
              <Card>
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    {t('page.yearComparison.monthlyComparison')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 pt-0">
                  <div className="w-full h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <XAxis dataKey="name" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                        <RechartsTooltip formatter={(value) => fmt(Number(value))} />
                        <Legend />
                        <Bar name={`${t('page.yearComparison.revenueLabel')} ${data!.currentYear}`} dataKey={`${t('page.yearComparison.revenueLabel')} ${data!.currentYear}`} fill="#10b981" radius={[3, 3, 0, 0]} />
                        <Bar name={`${t('page.yearComparison.revenueLabel')} ${data!.previousYear}`} dataKey={`${t('page.yearComparison.revenueLabel')} ${data!.previousYear}`} fill="#6ee7b7" radius={[3, 3, 0, 0]} />
                        <Bar name={`${t('page.yearComparison.netProfitLabel')} ${data!.currentYear}`} dataKey={`${t('page.yearComparison.netProfitLabel')} ${data!.currentYear}`} fill="#3b82f6" radius={[3, 3, 0, 0]} />
                        <Bar name={`${t('page.yearComparison.netProfitLabel')} ${data!.previousYear}`} dataKey={`${t('page.yearComparison.netProfitLabel')} ${data!.previousYear}`} fill="#93c5fd" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </section>
          )}

          {/* Monthly Comparison Table */}
          {data.monthlyComparison.length > 0 && (
            <section aria-label={t('page.yearComparison.monthlyComparison')}>
              <Card>
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    {t('page.yearComparison.monthlyComparison')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 pt-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-800">
                          <th className="px-3 py-2 text-left font-semibold text-slate-500">{t('page.yearComparison.month')}</th>
                          <th className="px-3 py-2 text-right font-semibold text-slate-500">{t('page.yearComparison.revenue')}</th>
                          <th className="px-3 py-2 text-right font-semibold text-slate-500">{t('page.yearComparison.grossProfit')}</th>
                          <th className="px-3 py-2 text-right font-semibold text-slate-500">{t('page.yearComparison.netProfit')}</th>
                          <th className="px-3 py-2 text-right font-semibold text-slate-500">{t('page.yearComparison.varianceAmount')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.monthlyComparison.map((row) => (
                          <tr key={row.period_month} className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                            <td className="px-3 py-2 font-medium text-slate-700 dark:text-slate-200">
                              {monthName(row.period_month)}
                            </td>
                            <td className="px-3 py-2 text-right text-slate-600 dark:text-slate-300">
                              {fmt(row.currentYear.revenue)}
                            </td>
                            <td className="px-3 py-2 text-right text-slate-600 dark:text-slate-300">
                              {fmt(row.currentYear.grossProfit)}
                            </td>
                            <td className="px-3 py-2 text-right">
                              <span className={`font-semibold ${row.currentYear.netProfit > 0 ? 'text-emerald-700' : row.currentYear.netProfit < 0 ? 'text-red-600' : 'text-slate-500'}`}>
                                {fmt(row.currentYear.netProfit)}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right">
                              <span className={`font-bold ${
                                row.variance.netProfit > 0 ? 'text-emerald-700' : row.variance.netProfit < 0 ? 'text-red-600' : 'text-slate-500'
                              }`}>
                                {row.variance.netProfit > 0 ? '+' : ''}{fmt(row.variance.netProfit)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </section>
          )}

          {/* Product Comparison */}
          {data.productComparison.length > 0 && (
            <section aria-label={t('page.yearComparison.productComparison')}>
              <Card>
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    {t('page.yearComparison.productComparison')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 pt-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-800">
                          <th className="px-3 py-2 text-left font-semibold text-slate-500">{t('page.scenarios.productName')}</th>
                          <th className="px-3 py-2 text-right font-semibold text-slate-500">{data.previousYear} {t('page.yearComparison.costLabel')}</th>
                          <th className="px-3 py-2 text-right font-semibold text-slate-500">{data.currentYear} {t('page.yearComparison.costLabel')}</th>
                          <th className="px-3 py-2 text-right font-semibold text-slate-500">{t('page.yearComparison.variancePercent')}</th>
                          <th className="px-3 py-2 text-right font-semibold text-slate-500">{data.previousYear} {t('page.yearComparison.marginLabel')}</th>
                          <th className="px-3 py-2 text-right font-semibold text-slate-500">{data.currentYear} {t('page.yearComparison.marginLabel')}</th>
                          <th className="px-3 py-2 text-right font-semibold text-slate-500">{t('page.yearComparison.trend')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.productComparison.map((p) => (
                          <tr key={p.productId} className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                            <td className="px-3 py-2.5">
                              <div>
                                <p className="font-medium text-slate-700 dark:text-slate-200">{p.productName}</p>
                                <p className="text-[10px] text-slate-400">{p.sku}</p>
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-right text-slate-600 dark:text-slate-300">
                              {fmt(p.previousYearCost)}
                            </td>
                            <td className="px-3 py-2.5 text-right text-slate-800 dark:text-slate-100 font-semibold">
                              {fmt(p.currentYearCost)}
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                p.variancePct > 0
                                  ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                  : p.variancePct < 0
                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                    : 'bg-slate-50 text-slate-500'
                              }`}>
                                {p.variancePct > 0 ? <TrendingUp className="h-2.5 w-2.5" /> : p.variancePct < 0 ? <TrendingDown className="h-2.5 w-2.5" /> : <Minus className="h-2.5 w-2.5" />}
                                {p.variancePct > 0 ? '+' : ''}{p.variancePct.toFixed(1)}%
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-right text-slate-600 dark:text-slate-300">
                              {p.previousYearMargin.toFixed(1)}%
                            </td>
                            <td className="px-3 py-2.5 text-right font-semibold text-slate-800 dark:text-slate-100">
                              {p.currentYearMargin.toFixed(1)}%
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              <span className={`font-bold ${p.marginImpact > 0 ? 'text-emerald-700' : p.marginImpact < 0 ? 'text-red-600' : 'text-slate-500'}`}>
                                {p.marginImpact > 0 ? '+' : ''}{p.marginImpact.toFixed(1)}pp
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </section>
          )}
        </>
      )}
    </div>
  );
}
