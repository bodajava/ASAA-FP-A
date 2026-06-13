'use client';

import React, { useState } from 'react';
import { CrudPage } from '@/components/crud-page';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RefreshCw, Loader2 } from 'lucide-react';
import { apiPost } from '@/lib/api';
import { useToast } from '@/components/ui/toast';
import type { Column } from '@/components/ui/table-wrapper';
import type { ExchangeRate } from '@/types/api';

const columns: Column<ExchangeRate>[] = [
  { key: 'fromCurrency', header: 'From Currency', className: 'font-semibold text-slate-700' },
  { key: 'toCurrency', header: 'To Currency', className: 'font-semibold text-slate-700' },
  { key: 'rate', header: 'Exchange Rate', render: (v) => Number(v).toFixed(4) },
  { key: 'rateDate', header: 'Effective Date', render: (v) => new Date(v as string).toLocaleDateString() },
  { key: 'source', header: 'Source', className: 'capitalize text-xs text-slate-500' },
];

interface FormProps {
  item: ExchangeRate | null;
  onClose: () => void;
  onSubmit: (p: Record<string, unknown>) => Promise<void>;
  isLoading: boolean;
}

function ExchangeRateForm({ item, onClose, onSubmit, isLoading }: FormProps) {
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
          label="From Currency"
          required
          value={fromCurrency}
          onChange={(e) => setFromCurrency(e.target.value.toUpperCase())}
          placeholder="e.g. USD"
          maxLength={3}
        />
        <Input
          id="to-curr"
          label="To Currency"
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
        label="Exchange Rate"
        required
        value={rate}
        onChange={(e) => setRate(e.target.value)}
        placeholder="e.g. 47.5"
      />
      <Input
        id="ex-date"
        type="date"
        label="Effective Date"
        required
        value={rateDate}
        onChange={(e) => setRateDate(e.target.value)}
      />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="ex-source" className="text-xs font-medium text-slate-500">Source</label>
        <select
          id="ex-source"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="manual">Manual Entry</option>
          <option value="api">API Feed</option>
          <option value="import">Imported File</option>
        </select>
      </div>
      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
        <Button variant="outline" size="sm" type="button" onClick={onClose}>Cancel</Button>
        <Button size="sm" type="submit" isLoading={isLoading}>{item ? 'Save Changes' : 'Add Rate'}</Button>
      </div>
    </form>
  );
}

export default function ExchangeRatesPage() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const { success: toastSuccess, error: toastError } = useToast();

  async function handleSyncUSD() {
    setIsSyncing(true);
    try {
      const res = await apiPost<{ rate: number; oldRate: number; scenarioCreated: boolean }>('/exchange-rates/sync-usd', {});
      if (res.scenarioCreated) {
        toastSuccess(
          `USD rate synced successfully at ${res.rate.toFixed(2)} EGP. A simulation scenario has been automatically created!`
        );
      } else {
        toastSuccess(`USD rate synced successfully at ${res.rate.toFixed(2)} EGP.`);
      }
      setRefreshKey((prev) => prev + 1);
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : 'Failed to sync USD rate.');
    } finally {
      setIsSyncing(false);
    }
  }

  return (
    <CrudPage<ExchangeRate>
      key={refreshKey}
      title="Exchange Rates"
      description="Manage exchange rates for currency conversion and reporting"
      endpoint="/exchange-rates"
      columns={columns}
      emptyTitle="No exchange rates set"
      emptyDescription="Add exchange rates to support multi-currency financial forecasts."
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
          Sync USD Rate (API)
        </Button>
      }
      renderForm={({ item, onClose, onSubmit, isLoading }) => (
        <ExchangeRateForm item={item} onClose={onClose} onSubmit={onSubmit} isLoading={isLoading} />
      )}
    />
  );
}
