'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { CrudPage } from '@/components/crud-page';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { apiGet } from '@/lib/api';
import { useI18n } from '@/lib/i18n/i18n-context';
import type { Column } from '@/components/ui/table-wrapper';
import type { User, Role } from '@/types/api';

interface FormProps {
  item: User | null;
  onClose: () => void;
  onSubmit: (p: Record<string, unknown>) => Promise<void>;
  isLoading: boolean;
}

function UserForm({ item, onClose, onSubmit, isLoading }: FormProps) {
  const { t } = useI18n();
  const [roles, setRoles] = useState<Role[]>([]);
  const [name, setName] = useState(item?.name ?? '');
  const [email, setEmail] = useState(item?.email ?? '');
  const [password, setPassword] = useState('');
  const [roleId, setRoleId] = useState(item?.roleId ?? '');
  const [status, setStatus] = useState(item?.status ?? 'active');

  useEffect(() => {
    apiGet<Role[]>('/roles')
      .then(setRoles)
      .catch(() => setRoles([]));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload: Record<string, unknown> = {
      name,
      email,
      roleId: roleId || undefined,
      status,
    };
    if (!item) payload.password = password;
    await onSubmit(payload);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        id="user-name"
        label={t('common.name')}
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t('page.users.namePlaceholder')}
      />
      <Input
        id="user-email"
        type="email"
        label={t('common.email')}
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={t('common.emailPlaceholder')}
      />
      {!item && (
        <Input
          id="user-password"
          type="password"
          label={t('common.password')}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t('page.users.passwordPlaceholder')}
        />
      )}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="user-role" className="text-xs font-medium text-slate-500 dark:text-slate-400">
          {t('common.role')}
        </label>
        <select
          id="user-role"
          value={roleId}
          onChange={(e) => setRoleId(e.target.value)}
          className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
        >
          <option value="">{t('common.selectRole')}</option>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="user-status" className="text-xs font-medium text-slate-500 dark:text-slate-400">
          {t('common.status')}
        </label>
        <select
          id="user-status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
        >
          <option value="active">{t('common.active')}</option>
          <option value="inactive">{t('common.inactive')}</option>
        </select>
      </div>
      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-700">
        <Button variant="outline" size="sm" type="button" onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button size="sm" type="submit" isLoading={isLoading}>
          {item ? t('common.saveChanges') : t('page.users.createUser')}
        </Button>
      </div>
    </form>
  );
}

export default function UsersPage() {
  const { t, locale } = useI18n();
  const columns: Column<User>[] = useMemo(() => [
    { key: 'name', header: t('common.name'), className: 'font-semibold text-slate-700 dark:text-slate-200' },
    { key: 'email', header: t('common.email') },
    {
      key: 'roleName',
      header: t('common.role'),
      render: (v) => String(v ?? '—'),
    },
    {
      key: 'status',
      header: t('common.status'),
      render: (v) => (
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
            v === 'active'
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
          }`}
        >
          {v === 'active' ? t('common.active') : v === 'inactive' ? t('common.inactive') : String(v ?? '—')}
        </span>
      ),
    },
    {
      key: 'lastLoginAt',
      header: t('page.users.lastLogin'),
      render: (v) => (v ? new Date(v as string).toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US') : '—'),
    },
  ], [t, locale]);

  return (
    <CrudPage<User>
      title={t('page.users.title')}
      description={t('page.users.description')}
      endpoint="/users"
      columns={columns}
      emptyTitle={t('page.users.emptyTitle')}
      emptyDescription={t('page.users.emptyDescription')}
      renderForm={({ item, onClose, onSubmit, isLoading }) => (
        <UserForm item={item} onClose={onClose} onSubmit={onSubmit} isLoading={isLoading} />
      )}
    />
  );
}
