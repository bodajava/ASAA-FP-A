'use client';

import React, { useState } from 'react';
import { CrudPage } from '@/components/crud-page';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { boolBadge } from '@/components/ui/badge';
import { useI18n } from '@/lib/i18n/i18n-context';
import type { Column } from '@/components/ui/table-wrapper';
import type { Product, ProductType } from '@/types/api';

const PRODUCT_TYPES: ProductType[] = ['finished_good', 'semi_finished', 'raw_material', 'service', 'other'];

const columns: Column<Product>[] = [
  { key: 'sku', header: 'SKU', className: 'font-mono text-xs' },
  { key: 'name', header: 'Name' },
  { key: 'productType', header: 'Type', render: (v) => <span className="capitalize">{String(v ?? '—').replace('_', ' ')}</span> },
  { key: 'salePrice', header: 'Sale Price', render: (v) => v !== undefined && v !== null ? Number(v).toFixed(2) : '—' },
  { key: 'standardCost', header: 'Std. Cost', render: (v) => v !== undefined && v !== null ? Number(v).toFixed(2) : '—' },
  { key: 'isActive', header: 'Status', render: (v) => boolBadge(Boolean(v)) },
];

interface FormProps { item: Product | null; onClose: () => void; onSubmit: (p: Record<string, unknown>) => Promise<void>; isLoading: boolean; }

function ProductForm({ item, onClose, onSubmit, isLoading }: FormProps) {
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
        <Input id="prod-sku" label="SKU" required value={sku} onChange={(e) => setSku(e.target.value)} placeholder="e.g. PROD-FG-001" />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="prod-type" className="text-sm font-medium text-slate-700">Product Type</label>
          <select id="prod-type" value={productType} onChange={(e) => setProductType(e.target.value as ProductType)} className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500">
            {PRODUCT_TYPES.map((t) => <option key={t} value={t} className="capitalize">{t.replace('_', ' ')}</option>)}
          </select>
        </div>
      </div>
      <Input id="prod-name" label="Product Name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Premium Canned Tuna" />
      <div className="grid grid-cols-2 gap-3">
        <Input id="prod-sale-price" type="number" label="Sale Price" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} placeholder="0.00" />
        <Input id="prod-std-cost" type="number" label="Standard Cost" value={standardCost} onChange={(e) => setStandardCost(e.target.value)} placeholder="0.00" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input id="prod-cat" label="Category ID" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} placeholder="optional" />
        <Input id="prod-unit" label="Unit ID" value={unitId} onChange={(e) => setUnitId(e.target.value)} placeholder="optional" />
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="rounded border-slate-300 accent-emerald-600" />
        Active
      </label>
      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
        <Button variant="outline" size="sm" type="button" onClick={onClose}>Cancel</Button>
        <Button size="sm" type="submit" isLoading={isLoading}>{item ? 'Save Changes' : 'Create Product'}</Button>
      </div>
    </form>
  );
}

export default function ProductsPage() {
  const { t } = useI18n();
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
