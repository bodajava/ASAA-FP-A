'use client';

import React, { useState, useEffect } from 'react';
import { CrudPage } from '@/components/crud-page';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { apiGet } from '@/lib/api';
import { useI18n } from '@/lib/i18n/i18n-context';
import type { Column } from '@/components/ui/table-wrapper';
import type { RawMaterialPrice, Material } from '@/types/api';

interface FormProps {
  item: RawMaterialPrice | null;
  onClose: () => void;
  onSubmit: (p: Record<string, unknown>) => Promise<void>;
  isLoading: boolean;
}

function RawMaterialPriceForm({ item, onClose, onSubmit, isLoading }: FormProps) {
  const { t } = useI18n();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [materialId, setMaterialId] = useState(item?.materialId ?? '');
  const [price, setPrice] = useState(item?.price ? String(item.price) : '');
  const [priceDate, setPriceDate] = useState(
    item?.priceDate
      ? new Date(item.priceDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
  );
  const [source, setSource] = useState(item?.source ?? '');

  useEffect(() => {
    apiGet<{ data: Material[] }>('/materials')
      .then((res) => setMaterials(res.data))
      .catch(() => setMaterials([]));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSubmit({ materialId, price: parseFloat(price), priceDate, source });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="mat-select" className="text-xs font-medium text-slate-500">
          {t('page.rawMaterialPrices.material')}
        </label>
        <select
          id="mat-select"
          value={materialId}
          onChange={(e) => setMaterialId(e.target.value)}
          required
          className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">{t('page.rawMaterialPrices.selectMaterial')}</option>
          {materials.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} ({m.code})
            </option>
          ))}
        </select>
      </div>
      <Input
        id="rmp-price"
        type="number"
        step="0.01"
        label={t('page.rawMaterialPrices.price')}
        required
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        placeholder="e.g. 1500.00"
      />
      <Input
        id="rmp-date"
        type="date"
        label={t('page.rawMaterialPrices.priceDate')}
        required
        value={priceDate}
        onChange={(e) => setPriceDate(e.target.value)}
      />
      <Input
        id="rmp-source"
        label={t('page.rawMaterialPrices.source')}
        value={source}
        onChange={(e) => setSource(e.target.value)}
        placeholder="e.g. supplier, market index"
      />
      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
        <Button variant="outline" size="sm" type="button" onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button size="sm" type="submit" isLoading={isLoading}>
          {item ? t('page.rawMaterialPrices.saveChanges') : t('page.rawMaterialPrices.addPrice')}
        </Button>
      </div>
    </form>
  );
}

export default function RawMaterialPricesPage() {
  const { t } = useI18n();

  const columns: Column<RawMaterialPrice>[] = [
    {
      key: 'material',
      header: t('page.rawMaterialPrices.materialName'),
      className: 'font-semibold text-slate-700',
      render: (v) => (v as { name: string } | null)?.name ?? '-',
    },
    { key: 'price', header: t('page.rawMaterialPrices.price'), render: (v) => Number(v).toFixed(2) },
    {
      key: 'priceDate',
      header: t('page.rawMaterialPrices.priceDate'),
      render: (v) => new Date(v as string).toLocaleDateString(),
    },
    { key: 'source', header: t('page.rawMaterialPrices.source'), className: 'capitalize text-xs text-slate-500' },
  ];

  return (
    <CrudPage<RawMaterialPrice>
      title={t('page.rawMaterialPrices.title')}
      description={t('page.rawMaterialPrices.description')}
      endpoint="/raw-material-prices"
      columns={columns}
      emptyTitle={t('page.rawMaterialPrices.emptyTitle')}
      emptyDescription={t('page.rawMaterialPrices.emptyDesc')}
      renderForm={({ item, onClose, onSubmit, isLoading }) => (
        <RawMaterialPriceForm
          item={item}
          onClose={onClose}
          onSubmit={onSubmit}
          isLoading={isLoading}
        />
      )}
    />
  );
}
