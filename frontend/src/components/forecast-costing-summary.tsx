'use client';

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Target,
  DollarSign,
  BarChart3,
} from 'lucide-react';
import { apiGet } from '@/lib/api';
import { useI18n } from '@/lib/i18n/i18n-context';
import { useActiveCurrency } from '@/hooks/use-active-currency';
import { EmptyState } from '@/components/ui/feedback-states';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Legend,
} from 'recharts';

interface ProductCostSummary {
  productId: string;
  productName: string;
  sku: string;
  forecastedRevenue: number;
  forecastedCogs: number;
  forecastedGrossProfit: number;
  forecastedGrossMarginPct: number;
  standardCostPerUnit: number;
  forecastedQuantity: number;
}

interface ForecastCostingSummaryData {
  forecastCycleId: string;
  forecastName: string;
  fiscalYear: number;
  productCostSummaries: ProductCostSummary[];
  totals: {
    totalForecastedRevenue: number;
    totalForecastedCogs: number;
    totalForecastedGrossProfit: number;
    overallGrossMarginPct: number;
  };
}

interface ForecastCostingSummaryProps {
  forecastCycleId: string;
}

export function ForecastCostingSummary({ forecastCycleId }: ForecastCostingSummaryProps) {
  const { t } = useI18n();
  const { format: fmt } = useActiveCurrency();
  const [data, setData] = useState<ForecastCostingSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!forecastCycleId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    apiGet<ForecastCostingSummaryData>(`/forecasts/costing-summary/${forecastCycleId}`)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : String(err);
          setError(msg);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [forecastCycleId]);

  if (!forecastCycleId) return null;

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="h-3 w-3 animate-spin rounded-full border border-emerald-600 border-t-transparent" />
          {t('common.loading')}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-700" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-800 flex gap-2.5 items-start">
        <AlertTriangle className="h-4.5 w-4.5 shrink-0 text-amber-600 mt-0.5" />
        <div>
          <p className="font-semibold">{t('page.forecasts.noCostingData')}</p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-amber-700">{error}</p>
        </div>
      </div>
    );
  }

  if (!data || data.productCostSummaries.length === 0) {
    return (
      <EmptyState
        title={t('page.forecasts.noCostingData')}
        description={t('page.forecasts.noCostingDataDesc')}
      />
    );
  }

  const totals = data.totals;
  const chartData = data.productCostSummaries.slice(0, 10).map((p) => ({
    name: p.productName.length > 15 ? p.productName.substring(0, 15) + '...' : p.productName,
    revenue: p.forecastedRevenue,
    cogs: p.forecastedCogs,
    margin: p.forecastedGrossMarginPct,
  }));

  const negativeMarginProducts = data.productCostSummaries.filter((p) => p.forecastedGrossMarginPct < 0);
  const lowMarginProducts = data.productCostSummaries.filter((p) => p.forecastedGrossMarginPct >= 0 && p.forecastedGrossMarginPct < 10);

  return (
    <div className="space-y-5">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="h-3.5 w-3.5 text-slate-400" />
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {t('page.forecasts.totalRevenue')}
            </p>
          </div>
          <p className="text-lg font-extrabold text-slate-800 dark:text-slate-100">
            {fmt(totals.totalForecastedRevenue)}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="h-3.5 w-3.5 text-slate-400" />
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {t('page.forecasts.totalCOGS')}
            </p>
          </div>
          <p className="text-lg font-extrabold text-slate-800 dark:text-slate-100">
            {fmt(totals.totalForecastedCogs)}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-3.5 w-3.5 text-slate-400" />
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {t('page.forecasts.grossMargin')}
            </p>
          </div>
          <p className={`text-lg font-extrabold ${totals.overallGrossMarginPct >= 20 ? 'text-emerald-700' : totals.overallGrossMarginPct >= 10 ? 'text-amber-600' : 'text-red-600'}`}>
            {totals.overallGrossMarginPct.toFixed(1)}%
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center gap-2 mb-1">
            <Target className="h-3.5 w-3.5 text-slate-400" />
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {t('page.forecasts.marginStatus')}
            </p>
          </div>
          <p className={`text-sm font-bold ${
            totals.overallGrossMarginPct >= 20
              ? 'text-emerald-700'
              : totals.overallGrossMarginPct >= 10
                ? 'text-amber-600'
                : 'text-red-600'
          }`}>
            {totals.overallGrossMarginPct >= 20
              ? t('page.forecasts.aboveTarget')
              : totals.overallGrossMarginPct >= 10
                ? t('page.forecasts.onTarget')
                : t('page.forecasts.belowTarget')}
          </p>
        </div>
      </div>

      {/* Revenue vs COGS Chart */}
      {chartData.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
            {t('page.forecasts.productMarginBreakdown')}
          </h4>
          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                <RechartsTooltip formatter={(value) => fmt(Number(value))} />
                <Legend />
                <Bar name={t('page.forecasts.totalRevenue')} dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar name={t('page.forecasts.totalCOGS')} dataKey="cogs" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Product Details Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            {t('page.forecasts.productMarginBreakdown')}
          </h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                <th className="px-4 py-2 text-left font-semibold text-slate-500">{t('page.scenarios.productName')}</th>
                <th className="px-4 py-2 text-right font-semibold text-slate-500">{t('page.forecasts.totalRevenue')}</th>
                <th className="px-4 py-2 text-right font-semibold text-slate-500">{t('page.forecasts.totalCOGS')}</th>
                <th className="px-4 py-2 text-right font-semibold text-slate-500">{t('page.forecasts.grossMargin')}</th>
                <th className="px-4 py-2 text-right font-semibold text-slate-500">{t('page.forecasts.costPerUnit')}</th>
                <th className="px-4 py-2 text-right font-semibold text-slate-500">{t('page.forecasts.quantity')}</th>
              </tr>
            </thead>
            <tbody>
              {data.productCostSummaries.map((product) => (
                <tr key={product.productId} className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                  <td className="px-4 py-2.5">
                    <div>
                      <p className="font-medium text-slate-700 dark:text-slate-200">{product.productName}</p>
                      <p className="text-[10px] text-slate-400">{product.sku}</p>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-right text-slate-600 dark:text-slate-300">
                    {fmt(product.forecastedRevenue)}
                  </td>
                  <td className="px-4 py-2.5 text-right text-slate-600 dark:text-slate-300">
                    {fmt(product.forecastedCogs)}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      product.forecastedGrossMarginPct >= 20
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                        : product.forecastedGrossMarginPct >= 10
                          ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                          : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {product.forecastedGrossMarginPct >= 20 ? <TrendingUp className="h-2.5 w-2.5" /> : product.forecastedGrossMarginPct < 0 ? <TrendingDown className="h-2.5 w-2.5" /> : null}
                      {product.forecastedGrossMarginPct.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right text-slate-600 dark:text-slate-300">
                    {fmt(product.standardCostPerUnit)}
                  </td>
                  <td className="px-4 py-2.5 text-right text-slate-600 dark:text-slate-300">
                    {product.forecastedQuantity.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Alerts: Negative & Low Margin Products */}
      {(negativeMarginProducts.length > 0 || lowMarginProducts.length > 0) && (
        <div className="space-y-3">
          {negativeMarginProducts.length > 0 && (
            <div className="rounded-xl border border-red-200 bg-red-50/70 p-3.5 text-xs text-red-800 flex gap-2.5 items-start">
              <AlertTriangle className="h-4.5 w-4.5 shrink-0 text-red-500 mt-0.5" />
              <div>
                <p className="font-semibold">{t('page.forecasts.negativeMarginProducts')} ({negativeMarginProducts.length})</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-red-700">
                  {negativeMarginProducts.map((p) => p.productName).join(', ')}
                </p>
              </div>
            </div>
          )}
          {lowMarginProducts.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-800 flex gap-2.5 items-start">
              <AlertTriangle className="h-4.5 w-4.5 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <p className="font-semibold">{t('page.forecasts.lowMarginProducts')} ({lowMarginProducts.length})</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-amber-700">
                  {lowMarginProducts.map((p) => `${p.productName} (${p.forecastedGrossMarginPct.toFixed(1)}%)`).join(', ')}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
