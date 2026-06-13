'use client';

import React, { useState } from 'react';
import { CrudPage } from '@/components/crud-page';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Column } from '@/components/ui/table-wrapper';
import type { CostCenter } from '@/types/api';

const columns: Column<CostCenter>[] = [
  { key: 'code', header: 'Code', className: 'font-mono text-xs' },
  { key: 'name', header: 'Name' },
  { key: 'siteId', header: 'Site ID', render: (v) => String(v ?? '—') },
];

interface FormProps { item: CostCenter | null; onClose: () => void; onSubmit: (p: Record<string, unknown>) => Promise<void>; isLoading: boolean; }

function CostCenterForm({ item, onClose, onSubmit, isLoading }: FormProps) {
  const [code, setCode] = useState(item?.code ?? '');
  const [name, setName] = useState(item?.name ?? '');
  const [parentId, setParentId] = useState(item?.parentId ?? '');
  const [siteId, setSiteId] = useState(item?.siteId ?? '');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSubmit({ code, name, parentId: parentId || undefined, siteId: siteId || undefined });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input id="cc-code" label="Code" required value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. CC-001" />
      <Input id="cc-name" label="Name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Production Department" />
      <Input id="cc-site" label="Site ID (optional)" value={siteId} onChange={(e) => setSiteId(e.target.value)} placeholder="Leave blank if not site-specific" />
      <Input id="cc-parent" label="Parent Cost Center ID (optional)" value={parentId} onChange={(e) => setParentId(e.target.value)} placeholder="Leave blank for root" />
      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
        <Button variant="outline" size="sm" type="button" onClick={onClose}>Cancel</Button>
        <Button size="sm" type="submit" isLoading={isLoading}>{item ? 'Save Changes' : 'Create Cost Center'}</Button>
      </div>
    </form>
  );
}

export default function CostCentersPage() {
  return (
    <CrudPage<CostCenter>
      title="Cost Centers"
      importModule="cost-centers"
      description="Organizational cost centers for financial allocation"
      endpoint="/cost-centers"
      columns={columns}
      emptyTitle="No cost centers yet"
      emptyDescription="Add cost centers to allocate budgets and expenses."
      renderForm={({ item, onClose, onSubmit, isLoading }) => (
        <CostCenterForm item={item} onClose={onClose} onSubmit={onSubmit} isLoading={isLoading} />
      )}
    />
  );
}
