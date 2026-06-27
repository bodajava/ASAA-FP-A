'use client';

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Layers,
  DollarSign,
  BarChart3,
} from 'lucide-react';
import { apiGet } from '@/lib/api';
import { useI18n } from '@/lib/i18n/i18n-context';
import { useActiveCurrency } from '@/hooks/use-active-currency';
import { EmptyState } from '@/components/ui/feedback-states';

interface AffectedProduct {
  productId: string;
  productName: string;
  sku: string;
  previousStandardCost: number;
  newSimulatedStandardCost: number;
  costIncreaseAmount: number;
  costIncreasePct: number;
  previousGrossMarginPct: number;
  newGrossMarginPct: number;
  profitImpact: number;
  marginImpact: number;
}

interface CostDriver {
  name: string;
  impactPct: number;
  description: string;
}

interface ScenarioCostingImpact {
  scenarioId: string;
  scenarioName: string;
  affectedProducts: AffectedProduct[];
  topCostDrivers: CostDriver[];
  summary: {
    totalProducts: number;
    affectedCount: number;
    averageCostIncreasePct: number;
    totalProfitImpact: number;
  };
}

interface ScenarioCostingImpactProps {
  scenarioId: string;
}

export function ScenarioCostingImpact({ scenarioId }: ScenarioCostingImpactProps) {
  const { t } = useI18n();
  const { format: fmt } = useActiveCurrency();
  const [data, setData] = useState<ScenarioCostingImpact | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!scenarioId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    apiGet<ScenarioCostingImpact>(`/scenarios/costing-impact/${scenarioId}`)
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
  }, [scenarioId]);

  if (!scenarioId) return null;

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
          <p className="font-semibold">{t('page.scenarios.noCostingData')}</p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-amber-700">{error}</p>
        </div>
      </div>
    );
  }

  if (!data || data.affectedProducts.length === 0) {
    return (
      <EmptyState
        title={t('page.scenarios.noCostingData')}
        description={t('page.scenarios.noCostingDataDesc')}
      />
    );
  }

  const summary = data.summary;

  return (
    <div className="space-y-5">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center gap-2 mb-1">
            <Layers className="h-3.5 w-3.5 text-slate-400" />
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {t('page.scenarios.affectedProducts')}
            </p>
          </div>
          <p className="text-lg font-extrabold text-slate-800 dark:text-slate-100">
            {summary.affectedCount} / {summary.totalProducts}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="h-3.5 w-3.5 text-slate-400" />
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {t('page.scenarios.marginChange')}
            </p>
          </div>
          <p className={`text-lg font-extrabold ${summary.averageCostIncreasePct > 0 ? 'text-red-700' : summary.averageCostIncreasePct < 0 ? 'text-emerald-700' : 'text-slate-600'}`}>
            {summary.averageCostIncreasePct > 0 ? '+' : ''}{summary.averageCostIncreasePct.toFixed(2)}%
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="h-3.5 w-3.5 text-slate-400" />
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {t('page.scenarios.profitImpact')}
            </p>
          </div>
          <p className={`text-lg font-extrabold ${summary.totalProfitImpact > 0 ? 'text-emerald-700' : summary.totalProfitImpact < 0 ? 'text-red-700' : 'text-slate-600'}`}>
            {summary.totalProfitImpact > 0 ? '+' : ''}{fmt(summary.totalProfitImpact)}
          </p>
        </div>

        {data.topCostDrivers.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-3.5 w-3.5 text-slate-400" />
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {t('page.scenarios.primaryDriver')}
              </p>
            </div>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-100 capitalize">
              {data.topCostDrivers[0].name.replace(/_/g, ' ')}
            </p>
            <p className="text-[11px] text-slate-500">
              {data.topCostDrivers[0].impactPct}%
            </p>
          </div>
        )}
      </div>

      {/* Affected Products Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            {t('page.scenarios.affectedProducts')}
          </h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                <th className="px-4 py-2 text-left font-semibold text-slate-500">{t('page.scenarios.productName')}</th>
                <th className="px-4 py-2 text-right font-semibold text-slate-500">{t('page.scenarios.before')}</th>
                <th className="px-4 py-2 text-right font-semibold text-slate-500">{t('page.scenarios.after')}</th>
                <th className="px-4 py-2 text-right font-semibold text-slate-500">{t('page.scenarios.marginDelta')}</th>
                <th className="px-4 py-2 text-right font-semibold text-slate-500">{t('page.scenarios.currentMargin')}</th>
                <th className="px-4 py-2 text-right font-semibold text-slate-500">{t('page.scenarios.projectedMargin')}</th>
                <th className="px-4 py-2 text-right font-semibold text-slate-500">{t('page.scenarios.profitImpact')}</th>
              </tr>
            </thead>
            <tbody>
              {data.affectedProducts.map((product) => (
                <tr key={product.productId} className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                  <td className="px-4 py-2.5">
                    <div>
                      <p className="font-medium text-slate-700 dark:text-slate-200">{product.productName}</p>
                      <p className="text-[10px] text-slate-400">{product.sku}</p>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-right text-slate-600 dark:text-slate-300">
                    {fmt(product.previousStandardCost)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold text-slate-800 dark:text-slate-100">
                    {fmt(product.newSimulatedStandardCost)}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      product.costIncreasePct > 0
                        ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        : product.costIncreasePct < 0
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : 'bg-slate-50 text-slate-500'
                    }`}>
                      {product.costIncreasePct > 0 ? <TrendingUp className="h-2.5 w-2.5" /> : product.costIncreasePct < 0 ? <TrendingDown className="h-2.5 w-2.5" /> : null}
                      {product.costIncreasePct > 0 ? '+' : ''}{product.costIncreasePct.toFixed(2)}%
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right text-slate-600 dark:text-slate-300">
                    {product.previousGrossMarginPct.toFixed(1)}%
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold text-slate-800 dark:text-slate-100">
                    {product.newGrossMarginPct.toFixed(1)}%
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <span className={`font-bold ${product.profitImpact > 0 ? 'text-emerald-700' : product.profitImpact < 0 ? 'text-red-700' : 'text-slate-500'}`}>
                      {product.profitImpact > 0 ? '+' : ''}{fmt(product.profitImpact)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
