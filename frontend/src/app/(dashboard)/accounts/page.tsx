'use client';

import React, { useState } from 'react';
import { CrudPage } from '@/components/crud-page';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useI18n } from '@/lib/i18n/i18n-context';
import type { Column } from '@/components/ui/table-wrapper';
import type { Account, AccountType } from '@/types/api';
import { ACCOUNT_TYPES } from '@/lib/constants';

interface FormProps { item: Account | null; onClose: () => void; onSubmit: (p: Record<string, unknown>) => Promise<void>; isLoading: boolean; }

function AccountForm({ item, onClose, onSubmit, isLoading }: FormProps) {
  const { t } = useI18n();
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
      <Input id="account-code" label={t('page.accounts.accountCode')} required value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. 4000" />
      <Input id="account-name" label={t('page.accounts.accountName')} required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sales Revenue" />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="account-type" className="text-sm font-medium text-slate-700">{t('page.accounts.accountType')}</label>
        <select id="account-type" value={accountType} onChange={(e) => setAccountType(e.target.value as AccountType)} className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500">
          {ACCOUNT_TYPES.map((at) => <option key={at} value={at} className="capitalize">{t(`accountType.${at}` as any)}</option>)}
        </select>
      </div>
      <Input id="account-parent" label={t('page.accounts.parentId')} value={parentId} onChange={(e) => setParentId(e.target.value)} placeholder={t('common.optional')} />
      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
        <Button variant="outline" size="sm" type="button" onClick={onClose}>{t('common.cancel')}</Button>
        <Button size="sm" type="submit" isLoading={isLoading}>{item ? t('page.accounts.saveChanges') : t('page.accounts.create')}</Button>
      </div>
    </form>
  );
}

export default function AccountsPage() {
  const { t } = useI18n();

  const columns: Column<Account>[] = [
    { key: 'code', header: t('common.code'), className: 'font-mono text-xs' },
    { key: 'name', header: t('common.name') },
    { key: 'accountType', header: t('common.type'), render: (v) => <span className="capitalize">{t(`accountType.${((v as string) || '').replace('_', '')}` as any)}</span> },
  ];

  return (
    <CrudPage<Account>
      title={t('page.accounts.title')}
      importModule="accounts"
      description={t('page.accounts.description')}
      endpoint="/accounts"
      columns={columns}
      emptyTitle={t('page.accounts.emptyTitle')}
      emptyDescription={t('page.accounts.emptyDesc')}
      renderForm={({ item, onClose, onSubmit, isLoading }) => (
        <AccountForm item={item} onClose={onClose} onSubmit={onSubmit} isLoading={isLoading} />
      )}
    />
  );
}
