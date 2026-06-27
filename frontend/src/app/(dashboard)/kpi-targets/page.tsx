'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { CrudPage } from '@/components/crud-page';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useI18n } from '@/lib/i18n/i18n-context';
import type { Column } from '@/components/ui/table-wrapper';
import type { KpiTarget, Site } from '@/types/api';
import { apiGet } from '@/lib/api';

interface FormProps {
  item: KpiTarget | null;
  onClose: () => void;
  onSubmit: (p: Record<string, unknown>) => Promise<void>;
  isLoading: boolean;
}

function KpiTargetForm({ item, onClose, onSubmit, isLoading }: FormProps) {
  const { t } = useI18n();
  const [kpiName, setKpiName] = useState(item?.kpiName ?? '');
  const [kpiCategory, setKpiCategory] = useState(item?.kpiCategory ?? 'financial');
  const [fiscalYear, setFiscalYear] = useState(item?.fiscalYear ? String(item.fiscalYear) : String(new Date().getFullYear()));
  const [periodMonth, setPeriodMonth] = useState(item?.periodMonth ? String(item.periodMonth) : '');
  const [targetValue, setTargetValue] = useState(item?.targetValue ? String(item.targetValue) : '0');
  const [unit, setUnit] = useState(item?.unit ?? '');
  const [siteId, setSiteId] = useState((item as any)?.site?.id ?? '');

  const [sites, setSites] = useState<Site[]>([]);
  const [loadingSites, setLoadingSites] = useState(false);

  useEffect(() => {
    async function loadSites() {
      setLoadingSites(true);
      try {
        const res = await apiGet<{ data: Site[] }>('/sites?limit=100');
        setSites(res.data ?? []);
      } catch (err) {
        console.error('Failed to load sites', err);
      } finally {
        setLoadingSites(false);
      }
    }
    void loadSites();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSubmit({
      kpiName,
      kpiCategory,
      fiscalYear: parseInt(fiscalYear),
      periodMonth: periodMonth ? parseInt(periodMonth) : null,
      targetValue: parseFloat(targetValue),
      unit: unit || null,
      siteId: siteId || null,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        id="kpi-name"
        label={t('page.kpiTargets.kpiName')}
        required
        value={kpiName}
        onChange={(e) => setKpiName(e.target.value)}
        placeholder="e.g. Monthly Production Yield"
      />

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="kpi-cat" className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('page.kpiTargets.category')}</label>
          <select
            id="kpi-cat"
            value={kpiCategory}
            onChange={(e) => setKpiCategory(e.target.value as any)}
            className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="financial">{t('kpiCategory.financial')}</option>
            <option value="operational">{t('kpiCategory.operational')}</option>
            <option value="sales">{t('kpiCategory.sales')}</option>
            <option value="production">{t('kpiCategory.production')}</option>
            <option value="hr">{t('kpiCategory.hr')}</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="kpi-site" className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('page.kpiTargets.siteScope')}</label>
          <select
            id="kpi-site"
            value={siteId}
            onChange={(e) => setSiteId(e.target.value)}
            disabled={loadingSites}
            className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="">{t('common.allSites')}</option>
            {sites.map((site) => (
              <option key={site.id} value={site.id}>{site.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          id="kpi-year"
          type="number"
          label={t('page.kpiTargets.fiscalYear')}
          required
          value={fiscalYear}
          onChange={(e) => setFiscalYear(e.target.value)}
        />
        <Input
          id="kpi-month"
          type="number"
          label={t('page.kpiTargets.monthOptional')}
          value={periodMonth}
          onChange={(e) => setPeriodMonth(e.target.value)}
          placeholder={t('page.kpiTargets.annual')}
          min={1}
          max={12}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          id="kpi-val"
          type="number"
          step="0.0001"
          label={t('page.kpiTargets.targetValue')}
          required
          value={targetValue}
          onChange={(e) => setTargetValue(e.target.value)}
        />
        <Input
          id="kpi-unit"
          label={t('page.kpiTargets.unit')}
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          placeholder="e.g. %, EGP, Liters"
        />
      </div>

      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-700">
        <Button variant="outline" size="sm" type="button" onClick={onClose}>{t('common.cancel')}</Button>
        <Button size="sm" type="submit" isLoading={isLoading}>{item ? t('common.saveChanges') : t('page.kpiTargets.createTarget')}</Button>
      </div>
    </form>
  );
}

export default function KpiTargetsPage() {
  const { t } = useI18n();
  const columns: Column<KpiTarget>[] = useMemo(() => [
    { key: 'kpiName', header: t('page.kpiTargets.kpiName'), className: 'font-semibold text-slate-700 dark:text-slate-200' },
    { key: 'kpiCategory', header: t('page.kpiTargets.category'), className: 'capitalize text-xs text-slate-500 dark:text-slate-400' },
    { key: 'fiscalYear', header: t('page.kpiTargets.fiscalYear') },
    { key: 'periodMonth', header: t('common.month'), render: (v) => v ? String(v) : t('page.kpiTargets.annual') },
    { key: 'targetValue', header: t('page.kpiTargets.targetValue'), render: (v, row) => `${Number(v).toLocaleString()} ${row.unit ?? ''}` },
    { key: 'site', header: t('page.kpiTargets.siteScope'), render: (v) => (v as any)?.name ?? t('common.allSites') },
  ], [t]);

  return (
    <CrudPage<KpiTarget>
      title={t('page.kpiTargets.title')}
      importModule="kpi-targets"
      description={t('page.kpiTargets.description')}
      endpoint="/kpi-targets"
      columns={columns}
      emptyTitle={t('page.kpiTargets.emptyTitle')}
      emptyDescription={t('page.kpiTargets.emptyDescription')}
      renderForm={({ item, onClose, onSubmit, isLoading }) => (
        <KpiTargetForm item={item} onClose={onClose} onSubmit={onSubmit} isLoading={isLoading} />
      )}
    />
  );
}
