'use client';

import React, { useState, useMemo } from 'react';
import { CrudPage } from '@/components/crud-page';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useI18n } from '@/lib/i18n/i18n-context';
import type { Column } from '@/components/ui/table-wrapper';
import type { ProductCategory } from '@/types/api';

interface FormProps { item: ProductCategory | null; onClose: () => void; onSubmit: (p: Record<string, unknown>) => Promise<void>; isLoading: boolean; }

function ProductCategoryForm({ item, onClose, onSubmit, isLoading }: FormProps) {
  const { t } = useI18n();
  const [name, setName] = useState(item?.name ?? '');
  const [parentId, setParentId] = useState(item?.parentId ?? '');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSubmit({ name, parentId: parentId || undefined });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input id="cat-name" label={t('page.productCategories.categoryName')} required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Canned Goods" />
      <Input id="cat-parent" label={t('page.productCategories.parentIdOptional')} value={parentId} onChange={(e) => setParentId(e.target.value)} placeholder={t('page.productCategories.parentIdPlaceholder')} />
      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-700">
        <Button variant="outline" size="sm" type="button" onClick={onClose}>{t('common.cancel')}</Button>
        <Button size="sm" type="submit" isLoading={isLoading}>{item ? t('common.saveChanges') : t('page.productCategories.createCategory')}</Button>
      </div>
    </form>
  );
}

export default function ProductCategoriesPage() {
  const { t } = useI18n();
  const columns: Column<ProductCategory>[] = useMemo(() => [
    { key: 'name', header: t('common.name') },
    { key: 'parentId', header: t('page.productCategories.parentId'), render: (v) => String(v ?? '—') },
  ], [t]);

  return (
    <CrudPage<ProductCategory>
      title={t('page.productCategories.title')}
      importModule="product-categories"
      description={t('page.productCategories.description')}
      endpoint="/product-categories"
      columns={columns}
      emptyTitle={t('page.productCategories.emptyTitle')}
      emptyDescription={t('page.productCategories.emptyDescription')}
      renderForm={({ item, onClose, onSubmit, isLoading }) => (
        <ProductCategoryForm item={item} onClose={onClose} onSubmit={onSubmit} isLoading={isLoading} />
      )}
    />
  );
}
