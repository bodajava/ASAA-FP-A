'use client';

import React, { useState } from 'react';
import { CrudPage } from '@/components/crud-page';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Column } from '@/components/ui/table-wrapper';
import type { Account, AccountType } from '@/types/api';
import { ACCOUNT_TYPES } from '@/lib/constants';

const columns: Column<Account>[] = [
  { key: 'code', header: 'Code', className: 'font-mono text-xs' },
  { key: 'name', header: 'Name' },
  { key: 'accountType', header: 'Type', render: (v) => <span className="capitalize">{String(v).replace('_', ' ')}</span> },
];

interface FormProps { item: Account | null; onClose: () => void; onSubmit: (p: Record<string, unknown>) => Promise<void>; isLoading: boolean; }

function AccountForm({ item, onClose, onSubmit, isLoading }: FormProps) {
  const [code, setCode] = useState(item?.code ?? '');
  const [name, setName] = useState(item?.name ?? '');
  const [accountType, setAccountType] = useState<AccountType>(item?.accountType ?? 'revenue');
  const [parentId, setParentId] = useState(item?.parentId ?? '');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSubmit({ code, name, accountType, parentId: parentId || undefined });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input id="account-code" label="Account Code" required value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. 4000" />
      <Input id="account-name" label="Account Name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sales Revenue" />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="account-type" className="text-sm font-medium text-slate-700">Account Type</label>
        <select id="account-type" value={accountType} onChange={(e) => setAccountType(e.target.value as AccountType)} className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500">
          {ACCOUNT_TYPES.map((t) => <option key={t} value={t} className="capitalize">{t}</option>)}
        </select>
      </div>
      <Input id="account-parent" label="Parent Account ID (optional)" value={parentId} onChange={(e) => setParentId(e.target.value)} placeholder="Leave blank for root" />
      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
        <Button variant="outline" size="sm" type="button" onClick={onClose}>Cancel</Button>
        <Button size="sm" type="submit" isLoading={isLoading}>{item ? 'Save Changes' : 'Create Account'}</Button>
      </div>
    </form>
  );
}

export default function AccountsPage() {
  return (
    <CrudPage<Account>
      title="Accounts"
      importModule="accounts"
      description="Chart of accounts for financial planning"
      endpoint="/accounts"
      columns={columns}
      emptyTitle="No accounts yet"
      emptyDescription="Set up your chart of accounts to start budgeting."
      renderForm={({ item, onClose, onSubmit, isLoading }) => (
        <AccountForm item={item} onClose={onClose} onSubmit={onSubmit} isLoading={isLoading} />
      )}
    />
  );
}
