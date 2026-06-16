'use client';

import React, { useState } from 'react';
import { CrudPage } from '@/components/crud-page';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useI18n } from '@/lib/i18n/i18n-context';
import type { Column } from '@/components/ui/table-wrapper';
import type { CostCenter } from '@/types/api';

interface FormProps { item: CostCenter | null; onClose: () => void; onSubmit: (p: Record<string, unknown>) => Promise<void>; isLoading: boolean; }

function CostCenterForm({ item, onClose, onSubmit, isLoading }: FormProps) {
  const { t } = useI18n();
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
      <Input id="cc-code" label={t('common.code')} required value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. CC-001" />
      <Input id="cc-name" label={t('common.name')} required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Production Department" />
      <Input id="cc-site" label={t('page.costCenters.siteIdOptional')} value={siteId} onChange={(e) => setSiteId(e.target.value)} placeholder={t('common.optional')} />
      <Input id="cc-parent" label={t('page.costCenters.parentId')} value={parentId} onChange={(e) => setParentId(e.target.value)} placeholder={t('common.optional')} />
      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
        <Button variant="outline" size="sm" type="button" onClick={onClose}>{t('common.cancel')}</Button>
        <Button size="sm" type="submit" isLoading={isLoading}>{item ? t('page.costCenters.saveChanges') : t('page.costCenters.create')}</Button>
      </div>
    </form>
  );
}

export default function CostCentersPage() {
  const { t } = useI18n();

  const columns: Column<CostCenter>[] = [
    { key: 'code', header: t('common.code'), className: 'font-mono text-xs' },
    { key: 'name', header: t('common.name') },
    { key: 'siteId', header: t('page.costCenters.siteId'), render: (v) => String(v ?? '—') },
  ];

  return (
    <CrudPage<CostCenter>
      title={t('page.costCenters.title')}
      importModule="cost-centers"
      description={t('page.costCenters.description')}
      endpoint="/cost-centers"
      columns={columns}
      emptyTitle={t('page.costCenters.emptyTitle')}
      emptyDescription={t('page.costCenters.emptyDesc')}
      renderForm={({ item, onClose, onSubmit, isLoading }) => (
        <CostCenterForm item={item} onClose={onClose} onSubmit={onSubmit} isLoading={isLoading} />
      )}
    />
  );
}
