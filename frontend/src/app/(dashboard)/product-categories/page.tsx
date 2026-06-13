'use client';

import React, { useState } from 'react';
import { CrudPage } from '@/components/crud-page';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Column } from '@/components/ui/table-wrapper';
import type { ProductCategory } from '@/types/api';

const columns: Column<ProductCategory>[] = [
  { key: 'name', header: 'Name' },
  { key: 'parentId', header: 'Parent ID', render: (v) => String(v ?? '—') },
];

interface FormProps { item: ProductCategory | null; onClose: () => void; onSubmit: (p: Record<string, unknown>) => Promise<void>; isLoading: boolean; }

function ProductCategoryForm({ item, onClose, onSubmit, isLoading }: FormProps) {
  const [name, setName] = useState(item?.name ?? '');
  const [parentId, setParentId] = useState(item?.parentId ?? '');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSubmit({ name, parentId: parentId || undefined });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input id="cat-name" label="Category Name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Canned Goods" />
      <Input id="cat-parent" label="Parent Category ID (optional)" value={parentId} onChange={(e) => setParentId(e.target.value)} placeholder="Leave blank for root" />
      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
        <Button variant="outline" size="sm" type="button" onClick={onClose}>Cancel</Button>
        <Button size="sm" type="submit" isLoading={isLoading}>{item ? 'Save Changes' : 'Create Category'}</Button>
      </div>
    </form>
  );
}

export default function ProductCategoriesPage() {
  return (
    <CrudPage<ProductCategory>
      title="Product Categories"
      importModule="product-categories"
      description="Hierarchical product categorization"
      endpoint="/product-categories"
      columns={columns}
      emptyTitle="No categories yet"
      emptyDescription="Add categories to organize your products."
      renderForm={({ item, onClose, onSubmit, isLoading }) => (
        <ProductCategoryForm item={item} onClose={onClose} onSubmit={onSubmit} isLoading={isLoading} />
      )}
    />
  );
}
