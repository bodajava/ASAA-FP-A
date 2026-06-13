'use client';

import React, { useState } from 'react';
import { CrudPage } from '@/components/crud-page';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { statusBadge } from '@/components/ui/badge';
import type { Column } from '@/components/ui/table-wrapper';
import type { Site, SiteType, SiteStatus } from '@/types/api';

const SITE_TYPES: SiteType[] = ['factory', 'branch', 'warehouse', 'office', 'other'];
const SITE_STATUSES: SiteStatus[] = ['active', 'inactive'];

const columns: Column<Site>[] = [
  { key: 'name', header: 'Name' },
  { key: 'type', header: 'Type', render: (v) => <span className="capitalize">{String(v)}</span> },
  { key: 'region', header: 'Region', render: (v) => String(v ?? '—') },
  { key: 'status', header: 'Status', render: (v) => statusBadge(String(v)) },
];

interface FormProps { item: Site | null; onClose: () => void; onSubmit: (p: Record<string, unknown>) => Promise<void>; isLoading: boolean; }

function SiteForm({ item, onClose, onSubmit, isLoading }: FormProps) {
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
      <Input id="site-name" label="Site Name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Cairo Factory" />
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="site-type" className="text-sm font-medium text-slate-700">Type</label>
          <select id="site-type" value={type} onChange={(e) => setType(e.target.value as SiteType)} className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500">
            {SITE_TYPES.map((t) => <option key={t} value={t} className="capitalize">{t}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="site-status" className="text-sm font-medium text-slate-700">Status</label>
          <select id="site-status" value={status} onChange={(e) => setStatus(e.target.value as SiteStatus)} className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500">
            {SITE_STATUSES.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
          </select>
        </div>
      </div>
      <Input id="site-region" label="Region" value={region} onChange={(e) => setRegion(e.target.value)} placeholder="e.g. Cairo" />
      <Input id="site-address" label="Address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="e.g. 12 Industrial Zone" />
      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
        <Button variant="outline" size="sm" type="button" onClick={onClose}>Cancel</Button>
        <Button size="sm" type="submit" isLoading={isLoading}>{item ? 'Save Changes' : 'Create Site'}</Button>
      </div>
    </form>
  );
}

export default function SitesPage() {
  return (
    <CrudPage<Site>
      title="Sites"
      importModule="sites"
      description="Manage branches, factories, warehouses, and offices"
      endpoint="/sites"
      columns={columns}
      emptyTitle="No sites yet"
      emptyDescription="Add your first site to get started."
      renderForm={({ item, onClose, onSubmit, isLoading }) => (
        <SiteForm item={item} onClose={onClose} onSubmit={onSubmit} isLoading={isLoading} />
      )}
    />
  );
}
