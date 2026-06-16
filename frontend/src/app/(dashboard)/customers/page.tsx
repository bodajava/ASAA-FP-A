'use client';

import React, { useState } from 'react';
import { CrudPage } from '@/components/crud-page';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useI18n } from '@/lib/i18n/i18n-context';
import type { Column } from '@/components/ui/table-wrapper';
import type { Customer } from '@/types/api';

const columns: Column<Customer>[] = [
  { key: 'code', header: 'Code', className: 'font-mono text-xs' },
  { key: 'name', header: 'Name' },
  { key: 'contactEmail', header: 'Email', render: (v) => String(v ?? '—') },
  { key: 'contactPhone', header: 'Phone', render: (v) => String(v ?? '—') },
];

interface FormProps { item: Customer | null; onClose: () => void; onSubmit: (p: Record<string, unknown>) => Promise<void>; isLoading: boolean; }

function CustomerForm({ item, onClose, onSubmit, isLoading }: FormProps) {
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
      <Input id="cust-code" label="Customer Code" required value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. CUST-001" />
      <Input id="cust-name" label="Customer Name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Metro Supermarkets" />
      <Input id="cust-email" type="email" label="Contact Email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="buyer@customer.com" />
      <Input id="cust-phone" label="Contact Phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+20 10 xxxx xxxx" />
      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
        <Button variant="outline" size="sm" type="button" onClick={onClose}>Cancel</Button>
        <Button size="sm" type="submit" isLoading={isLoading}>{item ? 'Save Changes' : 'Create Customer'}</Button>
      </div>
    </form>
  );
}

export default function CustomersPage() {
  const { t } = useI18n();
  return (
    <CrudPage<Customer>
      title={t('page.customers.title')}
      importModule="customers"
      description={t('page.customers.description')}
      endpoint="/customers"
      columns={columns}
      emptyTitle={t('page.customers.emptyTitle')}
      emptyDescription={t('page.customers.emptyDescription')}
      renderForm={({ item, onClose, onSubmit, isLoading }) => (
        <CustomerForm item={item} onClose={onClose} onSubmit={onSubmit} isLoading={isLoading} />
      )}
    />
  );
}
