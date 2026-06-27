'use client';

import React, { useMemo } from 'react';
import { CrudPage } from '@/components/crud-page';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { useI18n } from '@/lib/i18n/i18n-context';
import { ErrorState } from '@/components/ui/feedback-states';
import type { Column } from '@/components/ui/table-wrapper';
import type { Role } from '@/types/api';

interface FormProps {
  item: Role | null;
  onClose: () => void;
  onSubmit: (p: Record<string, unknown>) => Promise<void>;
  isLoading: boolean;
}

function RoleForm({ item, onClose, onSubmit, isLoading }: FormProps) {
  const { t } = useI18n();
  const [name, setName] = React.useState(item?.name ?? '');
  const [permissions, setPermissions] = React.useState(
    item?.permissions ? JSON.stringify(item.permissions, null, 2) : ''
  );
  const [permError, setPermError] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPermError(null);
    let parsedPermissions: Record<string, unknown> | undefined;
    if (permissions.trim()) {
      try {
        parsedPermissions = JSON.parse(permissions);
      } catch {
        setPermError('Invalid JSON');
        return;
      }
    }
    const payload: Record<string, unknown> = { name };
    if (parsedPermissions) payload.permissions = parsedPermissions;
    await onSubmit(payload);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        id="role-name"
        label={t('page.roles.roleName')}
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Admin"
      />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="role-permissions" className="text-xs font-medium text-slate-500 dark:text-slate-400">
          {t('page.roles.permissions')}
        </label>
        <textarea
          id="role-permissions"
          value={permissions}
          onChange={(e) => setPermissions(e.target.value)}
          placeholder={t('page.roles.permissionsPlaceholder')}
          rows={6}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
        />
        {permError && <p className="text-xs text-red-600">{permError}</p>}
      </div>
      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-700">
        <Button variant="outline" size="sm" type="button" onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button size="sm" type="submit" isLoading={isLoading}>
          {item ? t('common.saveChanges') : t('page.roles.createRole')}
        </Button>
      </div>
    </form>
  );
}

export default function RolesPage() {
  const { user } = useAuth();
  const { t, locale } = useI18n();

  if (user?.role !== 'Super Admin') {
    return (
      <div className="space-y-6">
        <ErrorState title={t('page.roles.accessDenied')} message={t('page.roles.accessDeniedDesc')} />
      </div>
    );
  }

  const columns: Column<Role>[] = useMemo(() => [
    { key: 'name', header: t('page.roles.roleName'), className: 'font-semibold text-slate-700 dark:text-slate-200' },
    {
      key: 'permissions',
      header: t('page.roles.permissions'),
      render: (v) => {
        if (!v || typeof v !== 'object') return '—';
        const keys = Object.keys(v as Record<string, unknown>);
        return keys.length > 0 ? keys.join(', ') : '—';
      },
    },
    {
      key: '_count',
      header: t('page.roles.usersCount'),
      render: (v) => {
        const count = (v as { users?: number })?.users;
        return count !== undefined ? String(count) : '—';
      },
    },
    {
      key: 'createdAt',
      header: t('common.date'),
      render: (v) => v ? new Date(v as string).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US') : '—',
    },
  ], [t, locale]);

  return (
    <CrudPage<Role>
      title={t('page.roles.title')}
      description={t('page.roles.description')}
      endpoint="/roles"
      columns={columns}
      requiresCompany={false}
      emptyTitle={t('page.roles.emptyTitle')}
      emptyDescription={t('page.roles.emptyDescription')}
      renderForm={({ item, onClose, onSubmit, isLoading }) => (
        <RoleForm item={item} onClose={onClose} onSubmit={onSubmit} isLoading={isLoading} />
      )}
    />
  );
}
