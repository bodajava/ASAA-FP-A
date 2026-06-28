'use client';

import React from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Wallet,
  Target,
  AlertTriangle,
} from 'lucide-react';
import { KpiCard } from '@/components/ui/kpi-card';
import { useActiveCurrency } from '@/hooks/use-active-currency';
import { useI18n } from '@/lib/i18n/i18n-context';
import type { ExecutiveSummary, ExecutiveKpi } from '@/types/api';
import type { TranslationKey } from '@/lib/i18n/translations';

function pct(n: number | null | undefined, locale?: string) {
  if (n === null || n === undefined) return '—';
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-US', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(n) + '%';
}

interface KpiItem {
  key: keyof ExecutiveSummary;
  titleKey: string;
  icon: React.ReactNode;
  isCurrency: boolean;
  href: string;
}

const PRIMARY_KPIS: KpiItem[] = [
  { key: 'revenue', titleKey: 'page.dashboard.revenue', icon: <DollarSign className="h-5 w-5" />, isCurrency: true, href: '/reports?tab=revenue' },
  { key: 'totalExpenses', titleKey: 'page.dashboard.expenses', icon: <TrendingDown className="h-5 w-5" />, isCurrency: true, href: '/reports?tab=expenses' },
  { key: 'grossProfit', titleKey: 'page.dashboard.grossProfit', icon: <TrendingUp className="h-5 w-5" />, isCurrency: true, href: '/reports?tab=profitability' },
  { key: 'netProfit', titleKey: 'page.dashboard.netProfit', icon: <BarChart3 className="h-5 w-5" />, isCurrency: true, href: '/reports?tab=profitability' },
  { key: 'budgetUtilization', titleKey: 'page.dashboard.budgetUtilization', icon: <Target className="h-5 w-5" />, isCurrency: false, href: '/budgets' },
  { key: 'cashBalance', titleKey: 'page.dashboard.cashBalance', icon: <Wallet className="h-5 w-5" />, isCurrency: true, href: '/reports?tab=cashflow' },
  { key: 'pendingApprovals', titleKey: 'page.dashboard.pendingApprovals', icon: <AlertTriangle className="h-5 w-5" />, isCurrency: false, href: '/approvals' },
];

function ExecutiveKpiCard({
  item,
  data,
  format,
  locale,
  t,
}: {
  item: KpiItem;
  data: ExecutiveKpi;
  format: (v: number | string | bigint | null | undefined) => string;
  locale: string;
  t: (key: TranslationKey) => string;
}) {
  const value = item.isCurrency ? format(data.current) : pct(data.current, locale);
  const prevMonthVal = item.isCurrency ? format(data.previousMonth) : pct(data.previousMonth, locale);

  const growthLabel = data.growthPct >= 0 ? `+${data.growthPct.toFixed(1)}%` : `${data.growthPct.toFixed(1)}%`;

  return (
    <KpiCard
      title={t(item.titleKey as TranslationKey)}
      value={value}
      icon={item.icon}
      trendDirection={data.trend}
      change={growthLabel}
      description={`${t('page.dashboard.vsPreviousMonth')}: ${prevMonthVal}`}
      href={item.href}
    />
  );
}

export function ExecutiveKpiGrid({ data }: { data: ExecutiveSummary }) {
  const { format: fmt } = useActiveCurrency();
  const { t, locale } = useI18n();

  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        {t('page.dashboard.kpiSectionLabel')}
      </p>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {PRIMARY_KPIS.map((item) => {
          const kpiData = data[item.key];
          if (!kpiData) return null;
          return (
            <ExecutiveKpiCard
              key={item.key}
              item={item}
              data={kpiData}
              format={fmt}
              locale={locale}
              t={t}
            />
          );
        })}
      </div>
    </div>
  );
}
