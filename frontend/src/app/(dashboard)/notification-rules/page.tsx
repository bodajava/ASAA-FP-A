'use client';

import React, { useState, useEffect } from 'react';
import { CrudPage } from '@/components/crud-page';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useI18n } from '@/lib/i18n/i18n-context';
import type { Column } from '@/components/ui/table-wrapper';
import type { NotificationRule, Site, Account } from '@/types/api';
import { apiGet } from '@/lib/api';
import { TRIGGER_TYPES } from '@/lib/constants';

const columns: Column<NotificationRule>[] = [
  { key: 'ruleName', header: 'Rule Name', className: 'font-semibold text-slate-700' },
  { key: 'triggerType', header: 'Trigger Type', render: (v) => String(v).replace('_', ' ').toUpperCase(), className: 'text-xs font-mono text-slate-600' },
  { key: 'thresholdValue', header: 'Threshold', render: (v, row) => row.triggerType.startsWith('variance') ? `${Number(v)}%` : v ? String(v) : '—' },
  { key: 'channel', header: 'Channels', className: 'text-xs text-slate-500' },
  { key: 'isActive', header: 'Active', render: (v) => v ? '✅ Yes' : '❌ No' },
];

interface FormProps {
  item: NotificationRule | null;
  onClose: () => void;
  onSubmit: (p: Record<string, unknown>) => Promise<void>;
  isLoading: boolean;
}

function NotificationRuleForm({ item, onClose, onSubmit, isLoading }: FormProps) {
  const [ruleName, setRuleName] = useState(item?.ruleName ?? '');
  const [triggerType, setTriggerType] = useState(item?.triggerType ?? 'variance_pct');
  const [thresholdValue, setThresholdValue] = useState(item?.thresholdValue ? String(item.thresholdValue) : '');
  const [accountId, setAccountId] = useState(item?.accountId ?? '');
  const [siteId, setSiteId] = useState(item?.siteId ?? '');
  const [channel, setChannel] = useState(item?.channel ?? 'system,email');
  const [isActive, setIsActive] = useState(item?.isActive ?? true);
  
  const [sites, setSites] = useState<Site[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loadingDropdowns, setLoadingDropdowns] = useState(false);

  useEffect(() => {
    async function loadDropdowns() {
      setLoadingDropdowns(true);
      try {
        const [sitesRes, accountsRes] = await Promise.all([
          apiGet<{ data: Site[] }>('/sites?limit=100'),
          apiGet<{ data: Account[] }>('/accounts?limit=200'),
        ]);
        setSites(sitesRes.data ?? []);
        setAccounts(accountsRes.data ?? []);
      } catch (err) {
        console.error('Failed to load dropdowns', err);
      } finally {
        setLoadingDropdowns(false);
      }
    }
    void loadDropdowns();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSubmit({
      ruleName,
      triggerType,
      thresholdValue: thresholdValue ? parseFloat(thresholdValue) : null,
      accountId: accountId || null,
      siteId: siteId || null,
      channel,
      isActive,
      notifyRoles: ['admin', 'manager'], // default roles
    });
  }

  const isThresholdRequired = ['variance_pct', 'variance_amount', 'kpi_breach'].includes(triggerType);

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        id="rule-name"
        label="Rule Name"
        required
        value={ruleName}
        onChange={(e) => setRuleName(e.target.value)}
        placeholder="e.g. Critical Cost Variance Alert"
      />
      
      <div className="flex flex-col gap-1.5">
        <label htmlFor="trigger-type" className="text-xs font-medium text-slate-500">Trigger Event</label>
        <select
          id="trigger-type"
          value={triggerType}
          onChange={(e) => setTriggerType(e.target.value as any)}
          className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          {TRIGGER_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      {isThresholdRequired && (
        <Input
          id="rule-thresh"
          type="number"
          step="0.01"
          label={triggerType === 'variance_pct' ? 'Threshold Percentage (%)' : 'Threshold Amount'}
          required
          value={thresholdValue}
          onChange={(e) => setThresholdValue(e.target.value)}
          placeholder="e.g. 10"
        />
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="rule-account" className="text-xs font-medium text-slate-500">Account Scope (Optional)</label>
          <select
            id="rule-account"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            disabled={loadingDropdowns}
            className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">All Accounts</option>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>[{acc.code}] {acc.name}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="rule-site" className="text-xs font-medium text-slate-500">Site Scope (Optional)</label>
          <select
            id="rule-site"
            value={siteId}
            onChange={(e) => setSiteId(e.target.value)}
            disabled={loadingDropdowns}
            className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">All Sites</option>
            {sites.map((site) => (
              <option key={site.id} value={site.id}>{site.name}</option>
            ))}
          </select>
        </div>
      </div>

      <Input
        id="rule-channel"
        label="Notification Channels"
        required
        value={channel}
        onChange={(e) => setChannel(e.target.value)}
        placeholder="e.g. system,email"
      />

      <div className="flex items-center gap-2 py-2">
        <input
          type="checkbox"
          id="rule-active"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
        />
        <label htmlFor="rule-active" className="text-sm font-medium text-slate-700">Active Rule</label>
      </div>

      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
        <Button variant="outline" size="sm" type="button" onClick={onClose}>Cancel</Button>
        <Button size="sm" type="submit" isLoading={isLoading}>{item ? 'Save Changes' : 'Create Rule'}</Button>
      </div>
    </form>
  );
}

export default function NotificationRulesPage() {
  const { t } = useI18n();
  return (
    <CrudPage<NotificationRule>
      title={t('page.notificationRules.title')}
      description={t('page.notificationRules.description')}
      endpoint="/notifications/rules"
      columns={columns}
      emptyTitle={t('page.notificationRules.emptyTitle')}
      emptyDescription={t('page.notificationRules.emptyDescription')}
      renderForm={({ item, onClose, onSubmit, isLoading }) => (
        <NotificationRuleForm item={item} onClose={onClose} onSubmit={onSubmit} isLoading={isLoading} />
      )}
    />
  );
}
