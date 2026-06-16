'use client';

import React, { useState } from 'react';
import { CrudPage } from '@/components/crud-page';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useI18n } from '@/lib/i18n/i18n-context';
import type { Column } from '@/components/ui/table-wrapper';
import type { Unit } from '@/types/api';

interface FormProps { item: Unit | null; onClose: () => void; onSubmit: (p: Record<string, unknown>) => Promise<void>; isLoading: boolean; }

function UnitForm({ item, onClose, onSubmit, isLoading }: FormProps) {
  const { t } = useI18n();
  const [name, setName] = useState(item?.name ?? '');
  const [symbol, setSymbol] = useState(item?.symbol ?? '');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSubmit({ name, symbol });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input id="unit-name" label={t('page.units.unitName')} required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Kilogram" />
      <Input id="unit-symbol" label={t('page.units.symbol')} required value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder="e.g. kg" />
      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
        <Button variant="outline" size="sm" type="button" onClick={onClose}>{t('common.cancel')}</Button>
        <Button size="sm" type="submit" isLoading={isLoading}>{item ? t('page.units.saveChanges') : t('page.units.create')}</Button>
      </div>
    </form>
  );
}

export default function UnitsPage() {
  const { t } = useI18n();

  const columns: Column<Unit>[] = [
    { key: 'name', header: t('common.name') },
    { key: 'symbol', header: t('page.units.symbol'), className: 'font-mono text-xs' },
  ];

  return (
    <CrudPage<Unit>
      title={t('page.units.title')}
      importModule="units"
      description={t('page.units.description')}
      endpoint="/units"
      columns={columns}
      emptyTitle={t('page.units.emptyTitle')}
      emptyDescription={t('page.units.emptyDesc')}
      renderForm={({ item, onClose, onSubmit, isLoading }) => (
        <UnitForm item={item} onClose={onClose} onSubmit={onSubmit} isLoading={isLoading} />
      )}
    />
  );
}
