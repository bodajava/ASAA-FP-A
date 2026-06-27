'use client';

import React, { useMemo } from 'react';
import { CrudPage } from '@/components/crud-page';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { useI18n } from '@/lib/i18n/i18n-context';
import { ErrorState } from '@/components/ui/feedback-states';
import type { Column } from '@/components/ui/table-wrapper';
import type { Tenant } from '@/types/api';

interface FormProps {
  item: Tenant | null;
  onClose: () => void;
  onSubmit: (p: Record<string, unknown>) => Promise<void>;
  isLoading: boolean;
}

function TenantForm({ item, onClose, onSubmit, isLoading }: FormProps) {
  const { t } = useI18n();
  const [name, setName] = React.useState(item?.name ?? '');
  const [slug, setSlug] = React.useState(item?.slug ?? '');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSubmit({ name, slug });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        id="tenant-name"
        label={t('page.tenants.tenantName')}
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Acme Corp"
      />
      <Input
        id="tenant-slug"
        label={t('page.tenants.slug')}
        required
        value={slug}
        onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
        placeholder={t('page.tenants.slugPlaceholder')}
      />
      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-700">
        <Button variant="outline" size="sm" type="button" onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button size="sm" type="submit" isLoading={isLoading}>
          {item ? t('common.saveChanges') : t('page.tenants.createTenant')}
        </Button>
      </div>
    </form>
  );
}

export default function TenantsPage() {
  const { user } = useAuth();
  const { t, locale } = useI18n();

  if (user?.role !== 'Super Admin') {
    return (
      <div className="space-y-6">
        <ErrorState title={t('page.tenants.accessDenied')} message={t('page.tenants.accessDeniedDesc')} />
      </div>
    );
  }

  const columns: Column<Tenant>[] = useMemo(() => [
    { key: 'name', header: t('common.name'), className: 'font-semibold text-slate-700 dark:text-slate-200' },
    { key: 'slug', header: t('page.tenants.slug'), className: 'font-mono text-xs' },
    {
      key: 'createdAt',
      header: t('common.date'),
      render: (v) => v ? new Date(v as string).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US') : '—',
    },
  ], [t, locale]);

  return (
    <CrudPage<Tenant>
      title={t('page.tenants.title')}
      description={t('page.tenants.description')}
      endpoint="/tenants"
      columns={columns}
      requiresCompany={false}
      emptyTitle={t('page.tenants.emptyTitle')}
      emptyDescription={t('page.tenants.emptyDescription')}
      renderForm={({ item, onClose, onSubmit, isLoading }) => (
        <TenantForm item={item} onClose={onClose} onSubmit={onSubmit} isLoading={isLoading} />
      )}
    />
  );
}
