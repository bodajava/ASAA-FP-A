'use client';

import React, { useState } from 'react';
import { CrudPage } from '@/components/crud-page';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useI18n } from '@/lib/i18n/i18n-context';
import { statusBadge } from '@/components/ui/badge';
import type { Column } from '@/components/ui/table-wrapper';
import type { Site, SiteType, SiteStatus } from '@/types/api';

const SITE_TYPES: SiteType[] = ['factory', 'branch', 'warehouse', 'office', 'other'];
const SITE_STATUSES: SiteStatus[] = ['active', 'inactive'];

interface FormProps { item: Site | null; onClose: () => void; onSubmit: (p: Record<string, unknown>) => Promise<void>; isLoading: boolean; }

function SiteForm({ item, onClose, onSubmit, isLoading }: FormProps) {
  const { t } = useI18n();
  const [name, setName] = useState(item?.name ?? '');
  const [type, setType] = useState<SiteType>(item?.type ?? 'factory');
  const [region, setRegion] = useState(item?.region ?? '');
  const [address, setAddress] = useState(item?.address ?? '');
  const [status, setStatus] = useState<SiteStatus>(item?.status ?? 'active');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSubmit({ name, type, region: region || undefined, address: address || undefined, status });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input id="site-name" label={t('page.sites.siteName')} required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Cairo Factory" />
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="site-type" className="text-sm font-medium text-slate-700">{t('page.sites.type')}</label>
          <select id="site-type" value={type} onChange={(e) => setType(e.target.value as SiteType)} className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500">
            {SITE_TYPES.map((siteType) => <option key={siteType} value={siteType} className="capitalize">{t(`siteType.${siteType}` as any)}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="site-status" className="text-sm font-medium text-slate-700">{t('page.sites.status')}</label>
          <select id="site-status" value={status} onChange={(e) => setStatus(e.target.value as SiteStatus)} className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500">
            {SITE_STATUSES.map((s) => <option key={s} value={s} className="capitalize">{t(`status.${s}`)}</option>)}
          </select>
        </div>
      </div>
      <Input id="site-region" label={t('page.sites.region')} value={region} onChange={(e) => setRegion(e.target.value)} placeholder="e.g. Cairo" />
      <Input id="site-address" label={t('page.sites.address')} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="e.g. 12 Industrial Zone" />
      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
        <Button variant="outline" size="sm" type="button" onClick={onClose}>{t('common.cancel')}</Button>
        <Button size="sm" type="submit" isLoading={isLoading}>{item ? t('page.sites.saveChanges') : t('page.sites.create')}</Button>
      </div>
    </form>
  );
}

export default function SitesPage() {
  const { t } = useI18n();

  const columns: Column<Site>[] = [
    { key: 'name', header: t('common.name') },
    { key: 'type', header: t('page.sites.type'), render: (v) => <span>{t(`siteType.${v}` as any)}</span> },
    { key: 'region', header: t('page.sites.region'), render: (v) => String(v ?? '—') },
    { key: 'status', header: t('page.sites.status'), render: (v) => statusBadge(String(v), (s) => t(`status.${s}` as any)) },
  ];

  return (
    <CrudPage<Site>
      title={t('page.sites.title')}
      importModule="sites"
      description={t('page.sites.description')}
      endpoint="/sites"
      columns={columns}
      emptyTitle={t('page.sites.emptyTitle')}
      emptyDescription={t('page.sites.emptyDesc')}
      renderForm={({ item, onClose, onSubmit, isLoading }) => (
        <SiteForm item={item} onClose={onClose} onSubmit={onSubmit} isLoading={isLoading} />
      )}
    />
  );
}
