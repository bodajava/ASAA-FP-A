'use client';

import React, { useState } from 'react';
import { CrudPage } from '@/components/crud-page';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Column } from '@/components/ui/table-wrapper';
import type { Unit } from '@/types/api';

const columns: Column<Unit>[] = [
  { key: 'name', header: 'Name' },
  { key: 'symbol', header: 'Symbol', className: 'font-mono text-xs' },
];

interface FormProps { item: Unit | null; onClose: () => void; onSubmit: (p: Record<string, unknown>) => Promise<void>; isLoading: boolean; }

function UnitForm({ item, onClose, onSubmit, isLoading }: FormProps) {
  const [name, setName] = useState(item?.name ?? '');
  const [symbol, setSymbol] = useState(item?.symbol ?? '');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSubmit({ name, symbol });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input id="unit-name" label="Unit Name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Kilogram" />
      <Input id="unit-symbol" label="Symbol" required value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder="e.g. kg" />
      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
        <Button variant="outline" size="sm" type="button" onClick={onClose}>Cancel</Button>
        <Button size="sm" type="submit" isLoading={isLoading}>{item ? 'Save Changes' : 'Create Unit'}</Button>
      </div>
    </form>
  );
}

export default function UnitsPage() {
  return (
    <CrudPage<Unit>
      title="Units"
      importModule="units"
      description="Units of measurement used across products and materials"
      endpoint="/units"
      columns={columns}
      emptyTitle="No units yet"
      emptyDescription="Add measurement units such as kg, litre, or piece."
      renderForm={({ item, onClose, onSubmit, isLoading }) => (
        <UnitForm item={item} onClose={onClose} onSubmit={onSubmit} isLoading={isLoading} />
      )}
    />
  );
}
