'use client';

import React, { useState } from 'react';
import { CrudPage } from '@/components/crud-page';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RefreshCw, Loader2 } from 'lucide-react';
import { apiPost } from '@/lib/api';
import { useToast } from '@/components/ui/toast';
import { useI18n } from '@/lib/i18n/i18n-context';
import type { Column } from '@/components/ui/table-wrapper';
import type { ExchangeRate } from '@/types/api';

interface FormProps {
  item: ExchangeRate | null;
  onClose: () => void;
  onSubmit: (p: Record<string, unknown>) => Promise<void>;
  isLoading: boolean;
}

function ExchangeRateForm({ item, onClose, onSubmit, isLoading }: FormProps) {
  const { t } = useI18n();
  const [fromCurrency, setFromCurrency] = useState(item?.fromCurrency ?? 'USD');
  const [toCurrency, setToCurrency] = useState(item?.toCurrency ?? 'EGP');
  const [rate, setRate] = useState(item?.rate ? String(item.rate) : '1.0');
  const [rateDate, setRateDate] = useState(
    item?.rateDate ? new Date(item.rateDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
  );
  const [source, setSource] = useState(item?.source ?? 'manual');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSubmit({
      fromCurrency,
      toCurrency,
      rate: parseFloat(rate),
      rateDate,
      source,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <Input
          id="from-curr"
          label={t('page.exchangeRates.fromCurrency')}
          required
          value={fromCurrency}
          onChange={(e) => setFromCurrency(e.target.value.toUpperCase())}
          placeholder="e.g. USD"
          maxLength={3}
        />
        <Input
          id="to-curr"
          label={t('page.exchangeRates.toCurrency')}
          required
          value={toCurrency}
          onChange={(e) => setToCurrency(e.target.value.toUpperCase())}
          placeholder="e.g. EGP"
          maxLength={3}
        />
      </div>
      <Input
        id="ex-rate"
        type="number"
        step="0.000001"
        label={t('page.exchangeRates.exchangeRate')}
        required
        value={rate}
        onChange={(e) => setRate(e.target.value)}
        placeholder="e.g. 47.5"
      />
      <Input
        id="ex-date"
        type="date"
        label={t('page.exchangeRates.effectiveDate')}
        required
        value={rateDate}
        onChange={(e) => setRateDate(e.target.value)}
      />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="ex-source" className="text-xs font-medium text-slate-500">{t('page.exchangeRates.source')}</label>
        <select
          id="ex-source"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="manual">{t('source.manual')}</option>
          <option value="api">{t('source.api')}</option>
          <option value="import">{t('source.import')}</option>
        </select>
      </div>
      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
        <Button variant="outline" size="sm" type="button" onClick={onClose}>{t('common.cancel')}</Button>
        <Button size="sm" type="submit" isLoading={isLoading}>{item ? t('page.exchangeRates.saveChanges') : t('page.exchangeRates.addRate')}</Button>
      </div>
    </form>
  );
}

export default function ExchangeRatesPage() {
  const { t } = useI18n();
  const [isSyncing, setIsSyncing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const { success: toastSuccess, error: toastError } = useToast();

  const columns: Column<ExchangeRate>[] = [
    { key: 'fromCurrency', header: t('page.exchangeRates.fromCurrency'), className: 'font-semibold text-slate-700' },
    { key: 'toCurrency', header: t('page.exchangeRates.toCurrency'), className: 'font-semibold text-slate-700' },
    { key: 'rate', header: t('page.exchangeRates.exchangeRate'), render: (v) => Number(v).toFixed(4) },
    { key: 'rateDate', header: t('page.exchangeRates.effectiveDate'), render: (v) => new Date(v as string).toLocaleDateString() },
    { key: 'source', header: t('page.exchangeRates.source'), className: 'capitalize text-xs text-slate-500' },
  ];

  async function handleSyncUSD() {
    setIsSyncing(true);
    try {
      const res = await apiPost<{ rate: number; oldRate: number; scenarioCreated: boolean }>('/exchange-rates/sync-usd', {});
      if (res.scenarioCreated) {
        toastSuccess(t('page.exchangeRates.syncSuccessScenario', { rate: res.rate.toFixed(2) }));
      } else {
        toastSuccess(t('page.exchangeRates.syncSuccess', { rate: res.rate.toFixed(2) }));
      }
      setRefreshKey((prev) => prev + 1);
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : t('page.exchangeRates.syncFailed'));
    } finally {
      setIsSyncing(false);
    }
  }

  return (
    <CrudPage<ExchangeRate>
      key={refreshKey}
      title={t('page.exchangeRates.title')}
      description={t('page.exchangeRates.description')}
      endpoint="/exchange-rates"
      columns={columns}
      emptyTitle={t('page.exchangeRates.emptyTitle')}
      emptyDescription={t('page.exchangeRates.emptyDesc')}
      extraHeaderActions={
        <Button
          size="sm"
          variant="outline"
          onClick={handleSyncUSD}
          disabled={isSyncing}
          className="border-emerald-200 hover:border-emerald-300 hover:bg-emerald-50/50"
        >
          {isSyncing ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin text-emerald-600" />
          ) : (
            <RefreshCw className="mr-1.5 h-4 w-4 text-emerald-600" />
          )}
          {t('page.exchangeRates.syncUsd')}
        </Button>
      }
      renderForm={({ item, onClose, onSubmit, isLoading }) => (
        <ExchangeRateForm item={item} onClose={onClose} onSubmit={onSubmit} isLoading={isLoading} />
      )}
    />
  );
}
