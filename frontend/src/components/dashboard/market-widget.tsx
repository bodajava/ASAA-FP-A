'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowUp, ArrowDown, Minus, Globe, AlertTriangle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { apiGet } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useI18n } from '@/lib/i18n/i18n-context';
import { queryKeys } from '@/lib/query-keys';
import type { MarketWidget as MarketWidgetType, MarketRate } from '@/types/api';

function RateCard({ rate }: { rate: MarketRate }) {
  const isUp = rate.trend === 'up';
  const isDown = rate.trend === 'down';

  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3 transition-shadow hover:shadow-md">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-sm font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
          {rate.currency}
        </span>
        <div>
          <p className="text-sm font-semibold text-card-foreground">
            {rate.currency} → EGP
          </p>
          <p className="text-xs text-muted-foreground">
            {rate.rate.toFixed(4)} EGP
          </p>
        </div>
      </div>
      <div className="text-right">
        <div className="flex items-center gap-1">
          {isUp && <ArrowUp className="h-3 w-3 text-emerald-500" />}
          {isDown && <ArrowDown className="h-3 w-3 text-red-500" />}
          {!isUp && !isDown && <Minus className="h-3 w-3 text-muted-foreground" />}
          <span className={`text-xs font-semibold ${isUp ? 'text-emerald-600' : isDown ? 'text-red-500' : 'text-muted-foreground'}`}>
            {rate.changePct >= 0 ? '+' : ''}{rate.changePct.toFixed(2)}%
          </span>
        </div>
        <p className="text-[10px] text-muted-foreground">
          {rate.change >= 0 ? '+' : ''}{rate.change.toFixed(4)}
        </p>
      </div>
    </div>
  );
}

function ProviderBadge({ provider }: { provider?: string }) {
  if (!provider || provider === 'cached') return null;

  const label =
    provider === 'exchangerate-api'
      ? 'ExchangeRate-API'
      : provider === 'frankfurter'
        ? 'Frankfurter'
        : provider;

  return (
    <Badge variant="muted" className="text-[10px] font-normal">
      {label}
    </Badge>
  );
}

export function MarketWidget() {
  const { activeCompanyId } = useAuth();
  const { t } = useI18n();

  const { data: widget, isLoading } = useQuery({
    queryKey: queryKeys.dashboard.marketWidget(activeCompanyId!),
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      apiGet<MarketWidgetType>('/exchange-rates/market-widget', { signal }),
    enabled: Boolean(activeCompanyId),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });

  const hasStaleRates = widget?.rates?.some((r) => r.stale);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            {t('page.dashboard.exchangeRates')}
          </CardTitle>
          <div className="flex items-center gap-2">
            {hasStaleRates && (
              <Badge variant="danger" className="flex items-center gap-1 text-[10px]">
                <AlertTriangle className="h-3 w-3" />
                {t('page.dashboard.staleRates')}
              </Badge>
            )}
            <ProviderBadge provider={widget?.provider} />
            {widget?.lastSyncAt && (
              <Badge variant="muted" className="text-[10px]">
                {t('page.dashboard.lastSync')}: {new Date(widget.lastSyncAt).toLocaleTimeString()}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-700" />
            ))}
          </div>
        ) : widget?.rates ? (
          <div className="space-y-2">
            {hasStaleRates && (
              <p className="text-xs text-muted-foreground italic">
                {t('page.dashboard.staleRatesDesc')}
              </p>
            )}
            {widget.rates.map((rate) => (
              <RateCard key={rate.currency} rate={rate} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t('common.noData')}</p>
        )}
      </CardContent>
    </Card>
  );
}
