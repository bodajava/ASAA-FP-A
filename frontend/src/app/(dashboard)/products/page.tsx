'use client';

import React, { useState, useMemo } from 'react';
import { CrudPage } from '@/components/crud-page';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { boolBadge } from '@/components/ui/badge';
import { useI18n } from '@/lib/i18n/i18n-context';
import type { Column } from '@/components/ui/table-wrapper';
import type { Product, ProductType } from '@/types/api';

const PRODUCT_TYPES: ProductType[] = ['finished_good', 'semi_finished', 'raw_material', 'service', 'other'];

interface FormProps { item: Product | null; onClose: () => void; onSubmit: (p: Record<string, unknown>) => Promise<void>; isLoading: boolean; }

function ProductForm({ item, onClose, onSubmit, isLoading }: FormProps) {
  const { t } = useI18n();
  const [sku, setSku] = useState(item?.sku ?? '');
  const [name, setName] = useState(item?.name ?? '');
  const [productType, setProductType] = useState<ProductType>(item?.productType ?? 'finished_good');
  const [salePrice, setSalePrice] = useState(item?.salePrice?.toString() ?? '');
  const [standardCost, setStandardCost] = useState(item?.standardCost?.toString() ?? '');
  const [categoryId, setCategoryId] = useState(item?.categoryId ?? '');
  const [unitId, setUnitId] = useState(item?.unitId ?? '');
  const [isActive, setIsActive] = useState(item?.isActive ?? true);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSubmit({
      sku,
      name,
      productType,
      salePrice: salePrice ? Number(salePrice) : undefined,
      standardCost: standardCost ? Number(standardCost) : undefined,
      categoryId: categoryId || undefined,
      unitId: unitId || undefined,
      isActive,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <Input id="prod-sku" label={t('page.products.sku')} required value={sku} onChange={(e) => setSku(e.target.value)} placeholder="e.g. PROD-FG-001" />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="prod-type" className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('common.type')}</label>
          <select id="prod-type" value={productType} onChange={(e) => setProductType(e.target.value as ProductType)} className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
            {PRODUCT_TYPES.map((pt) => <option key={pt} value={pt} className="capitalize">{t(`productType.${pt}` as any)}</option>)}
          </select>
        </div>
      </div>
      <Input id="prod-name" label={t('page.products.productName')} required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Premium Canned Tuna" />
      <div className="grid grid-cols-2 gap-3">
        <Input id="prod-sale-price" type="number" label={t('page.products.salePrice')} value={salePrice} onChange={(e) => setSalePrice(e.target.value)} placeholder="0.00" />
        <Input id="prod-std-cost" type="number" label={t('page.products.standardCost')} value={standardCost} onChange={(e) => setStandardCost(e.target.value)} placeholder="0.00" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input id="prod-cat" label={t('page.products.categoryId')} value={categoryId} onChange={(e) => setCategoryId(e.target.value)} placeholder={t('common.optional')} />
        <Input id="prod-unit" label={t('page.products.unitId')} value={unitId} onChange={(e) => setUnitId(e.target.value)} placeholder={t('common.optional')} />
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
        <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="rounded border-slate-300 accent-emerald-600 dark:border-slate-600" />
        {t('common.active')}
      </label>
      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-700">
        <Button variant="outline" size="sm" type="button" onClick={onClose}>{t('common.cancel')}</Button>
        <Button size="sm" type="submit" isLoading={isLoading}>{item ? t('common.saveChanges') : t('page.products.createProduct')}</Button>
      </div>
    </form>
  );
}

export default function ProductsPage() {
  const { t } = useI18n();
  const columns: Column<Product>[] = useMemo(() => [
    { key: 'sku', header: t('page.products.sku'), className: 'font-mono text-xs' },
    { key: 'name', header: t('common.name') },
    { key: 'productType', header: t('common.type'), render: (v) => t(`productType.${String(v ?? 'other').replace('_', '')}` as any) },
    { key: 'salePrice', header: t('page.products.salePrice'), render: (v) => v !== undefined && v !== null ? Number(v).toFixed(2) : '—' },
    { key: 'standardCost', header: t('page.products.standardCost'), render: (v) => v !== undefined && v !== null ? Number(v).toFixed(2) : '—' },
    { key: 'isActive', header: t('common.status'), render: (v) => boolBadge(Boolean(v)) },
  ], [t]);

  return (
    <CrudPage<Product>
      title={t('page.products.title')}
      importModule="products"
      description={t('page.products.description')}
      endpoint="/products"
      columns={columns}
      emptyTitle={t('page.products.emptyTitle')}
      emptyDescription={t('page.products.emptyDescription')}
      renderForm={({ item, onClose, onSubmit, isLoading }) => (
        <ProductForm item={item} onClose={onClose} onSubmit={onSubmit} isLoading={isLoading} />
      )}
    />
  );
}
