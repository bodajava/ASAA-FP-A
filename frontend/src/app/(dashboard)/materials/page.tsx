'use client';

import React, { useState } from 'react';
import { CrudPage } from '@/components/crud-page';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { boolBadge } from '@/components/ui/badge';
import { useI18n } from '@/lib/i18n/i18n-context';
import type { Column } from '@/components/ui/table-wrapper';
import type { Material } from '@/types/api';

const columns: Column<Material>[] = [
  { key: 'code', header: 'Code', className: 'font-mono text-xs' },
  { key: 'name', header: 'Name' },
  { key: 'purchasePrice', header: 'Purchase Price', render: (v) => v !== undefined && v !== null ? Number(v).toFixed(2) : '—' },
  { key: 'safetyStockQty', header: 'Safety Stock', render: (v) => v !== undefined && v !== null ? Number(v).toFixed(2) : '—' },
  { key: 'isActive', header: 'Status', render: (v) => boolBadge(Boolean(v)) },
];

interface FormProps { item: Material | null; onClose: () => void; onSubmit: (p: Record<string, unknown>) => Promise<void>; isLoading: boolean; }

function MaterialForm({ item, onClose, onSubmit, isLoading }: FormProps) {
  const [code, setCode] = useState(item?.code ?? '');
  const [name, setName] = useState(item?.name ?? '');
  const [purchasePrice, setPurchasePrice] = useState(item?.purchasePrice?.toString() ?? '');
  const [safetyStockQty, setSafetyStockQty] = useState(item?.safetyStockQty?.toString() ?? '');
  const [supplierId, setSupplierId] = useState(item?.supplierId ?? '');
  const [unitId, setUnitId] = useState(item?.unitId ?? '');
  const [isActive, setIsActive] = useState(item?.isActive ?? true);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSubmit({
      code,
      name,
      purchasePrice: purchasePrice ? Number(purchasePrice) : undefined,
      safetyStockQty: safetyStockQty ? Number(safetyStockQty) : undefined,
      supplierId: supplierId || undefined,
      unitId: unitId || undefined,
      isActive,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <Input id="mat-code" label="Material Code" required value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. MAT-RAW-001" />
        <Input id="mat-name" label="Material Name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Raw Tuna Fish" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input id="mat-price" type="number" label="Purchase Price" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} placeholder="0.00" />
        <Input id="mat-safety" type="number" label="Safety Stock Qty" value={safetyStockQty} onChange={(e) => setSafetyStockQty(e.target.value)} placeholder="0" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input id="mat-supplier" label="Supplier ID" value={supplierId} onChange={(e) => setSupplierId(e.target.value)} placeholder="optional" />
        <Input id="mat-unit" label="Unit ID" value={unitId} onChange={(e) => setUnitId(e.target.value)} placeholder="optional" />
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="rounded border-slate-300 accent-emerald-600" />
        Active
      </label>
      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
        <Button variant="outline" size="sm" type="button" onClick={onClose}>Cancel</Button>
        <Button size="sm" type="submit" isLoading={isLoading}>{item ? 'Save Changes' : 'Create Material'}</Button>
      </div>
    </form>
  );
}

export default function MaterialsPage() {
  const { t } = useI18n();
  return (
    <CrudPage<Material>
      title={t('page.materials.title')}
      importModule="materials"
      description={t('page.materials.description')}
      endpoint="/materials"
      columns={columns}
      emptyTitle={t('page.materials.emptyTitle')}
      emptyDescription={t('page.materials.emptyDescription')}
      renderForm={({ item, onClose, onSubmit, isLoading }) => (
        <MaterialForm item={item} onClose={onClose} onSubmit={onSubmit} isLoading={isLoading} />
      )}
    />
  );
}
