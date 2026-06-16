'use client';

import React, { useState } from 'react';
import { CrudPage } from '@/components/crud-page';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useI18n } from '@/lib/i18n/i18n-context';
import type { Column } from '@/components/ui/table-wrapper';
import type { Supplier } from '@/types/api';

const columns: Column<Supplier>[] = [
  { key: 'code', header: 'Code', className: 'font-mono text-xs' },
  { key: 'name', header: 'Name' },
  { key: 'contactEmail', header: 'Email', render: (v) => String(v ?? '—') },
  { key: 'contactPhone', header: 'Phone', render: (v) => String(v ?? '—') },
];

interface FormProps { item: Supplier | null; onClose: () => void; onSubmit: (p: Record<string, unknown>) => Promise<void>; isLoading: boolean; }

function SupplierForm({ item, onClose, onSubmit, isLoading }: FormProps) {
  const [code, setCode] = useState(item?.code ?? '');
  const [name, setName] = useState(item?.name ?? '');
  const [email, setEmail] = useState(item?.contactEmail ?? '');
  const [phone, setPhone] = useState(item?.contactPhone ?? '');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSubmit({ code, name, contactEmail: email || undefined, contactPhone: phone || undefined });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input id="sup-code" label="Supplier Code" required value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. SUP-001" />
      <Input id="sup-name" label="Supplier Name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Nile Trading Co." />
      <Input id="sup-email" type="email" label="Contact Email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contact@supplier.com" />
      <Input id="sup-phone" label="Contact Phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+20 10 xxxx xxxx" />
      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
        <Button variant="outline" size="sm" type="button" onClick={onClose}>Cancel</Button>
        <Button size="sm" type="submit" isLoading={isLoading}>{item ? 'Save Changes' : 'Create Supplier'}</Button>
      </div>
    </form>
  );
}

export default function SuppliersPage() {
  const { t } = useI18n();
  return (
    <CrudPage<Supplier>
      title={t('page.suppliers.title')}
      importModule="suppliers"
      description={t('page.suppliers.description')}
      endpoint="/suppliers"
      columns={columns}
      emptyTitle={t('page.suppliers.emptyTitle')}
      emptyDescription={t('page.suppliers.emptyDescription')}
      renderForm={({ item, onClose, onSubmit, isLoading }) => (
        <SupplierForm item={item} onClose={onClose} onSubmit={onSubmit} isLoading={isLoading} />
      )}
    />
  );
}
