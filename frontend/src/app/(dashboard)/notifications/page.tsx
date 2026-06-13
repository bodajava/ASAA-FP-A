'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Trash2,
  Pencil,
  Bell,
  Sliders,
  Check,
  Mail,
  Layers,
  Building,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TableWrapper, type Column } from '@/components/ui/table-wrapper';
import { Pagination } from '@/components/ui/pagination';
import { LoadingState, EmptyState, ErrorState } from '@/components/ui/feedback-states';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Modal } from '@/components/ui/modal';
import { useAuth } from '@/lib/auth-context';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';
import type {
  Notification,
  NotificationRule,
  TriggerType,
  Account,
  Site,
  PaginatedResponse,
} from '@/types/api';
import axios from 'axios';

const TRIGGER_TYPES: { value: TriggerType; label: string }[] = [
  { value: 'variance_pct', label: 'Variance Percentage Threshold' },
  { value: 'variance_amount', label: 'Variance Absolute Amount Threshold' },
  { value: 'kpi_breach', label: 'KPI Target Breach' },
  { value: 'budget_approval', label: 'Budget Approval Required' },
  { value: 'import_failed', label: 'Data Import Failed' },
];

export default function NotificationsPage() {
  const { activeCompanyId } = useAuth();
  const [activeTab, setActiveTab] = useState<'inbox' | 'rules'>('inbox');

  // Inbox list state
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [totalNotif, setTotalNotif] = useState(0);
  const [pageNotif, setPageNotif] = useState(1);
  const [totalPagesNotif, setTotalPagesNotif] = useState(1);
  const [statusFilter, setStatusFilter] = useState<'unread' | 'all'>('unread');
  const [isLoadingNotif, setIsLoadingNotif] = useState(false);
  const [errorNotif, setErrorNotif] = useState<string | null>(null);

  // Rules list state
  const [rules, setRules] = useState<NotificationRule[]>([]);
  const [totalRules, setTotalRules] = useState(0);
  const [pageRules, setPageRules] = useState(1);
  const [totalPagesRules, setTotalPagesRules] = useState(1);
  const [isLoadingRules, setIsLoadingRules] = useState(false);
  const [errorRules, setErrorRules] = useState<string | null>(null);

  // Modal forms
  const [ruleModalOpen, setRuleModalOpen] = useState(false);
  const [editRule, setEditRule] = useState<NotificationRule | null>(null);
  const [ruleFormLoading, setRuleFormLoading] = useState(false);
  const [ruleFormError, setRuleFormError] = useState<string | null>(null);
  const [deleteRuleConfirm, setDeleteRuleConfirm] = useState<NotificationRule | null>(null);
  const [deleteRuleLoading, setDeleteRuleLoading] = useState(false);

  // Master Data
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [sites, setSites] = useState<Site[]>([]);

  // Fetch Master Data
  useEffect(() => {
    if (!activeCompanyId) return;
    async function loadMeta() {
      try {
        const [accs, sList] = await Promise.all([
          apiGet<PaginatedResponse<Account>>('/accounts?limit=1000').then((r) => r.data),
          apiGet<PaginatedResponse<Site>>('/sites?limit=1000').then((r) => r.data),
        ]);
        setAccounts(accs);
        setSites(sList);
      } catch {
        // Silent failure
      }
    }
    void loadMeta();
  }, [activeCompanyId]);

  // Fetch Notifications
  const fetchNotifications = useCallback(async () => {
    if (!activeCompanyId) return;
    setIsLoadingNotif(true);
    setErrorNotif(null);
    try {
      const res = await apiGet<PaginatedResponse<Notification>>(
        `/notifications?page=${pageNotif}&limit=10`
      );
      const allNotifs = res.data ?? [];
      const filteredNotifs = statusFilter === 'unread'
        ? allNotifs.filter((n) => n.status !== 'read')
        : allNotifs;
      setNotifications(filteredNotifs);
      setTotalNotif(res.total ?? 0);
      setTotalPagesNotif(res.totalPages ?? 1);
    } catch (err: unknown) {
      setErrorNotif(err instanceof Error ? err.message : 'Failed to retrieve notifications.');
    } finally {
      setIsLoadingNotif(false);
    }
  }, [activeCompanyId, pageNotif, statusFilter]);

  // Fetch Rules
  const fetchRules = useCallback(async () => {
    if (!activeCompanyId) return;
    setIsLoadingRules(true);
    setErrorRules(null);
    try {
      const res = await apiGet<PaginatedResponse<NotificationRule>>(
        `/notifications/rules?page=${pageRules}&limit=10`
      );
      setRules(res.data ?? []);
      setTotalRules(res.total ?? 0);
      setTotalPagesRules(res.totalPages ?? 1);
    } catch (err: unknown) {
      setErrorRules(err instanceof Error ? err.message : 'Failed to retrieve notification rules.');
    } finally {
      setIsLoadingRules(false);
    }
  }, [activeCompanyId, pageRules]);

  useEffect(() => {
    if (activeTab === 'inbox') {
      void Promise.resolve().then(() => void fetchNotifications());
    } else {
      void Promise.resolve().then(() => void fetchRules());
    }
  }, [activeTab, fetchNotifications, fetchRules]);

  // Actions - Inbox
  async function handleMarkAsRead(id: string) {
    try {
      await apiPatch<Notification>(`/notifications/${id}/read`);
      void fetchNotifications();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to mark notification as read.');
    }
  }

  // Actions - Rules
  async function handleDeleteRule() {
    if (!deleteRuleConfirm) return;
    setDeleteRuleLoading(true);
    try {
      await apiDelete<NotificationRule>(`/notifications/rules/${deleteRuleConfirm.id}`);
      setDeleteRuleConfirm(null);
      void fetchRules();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete notification rule');
    } finally {
      setDeleteRuleLoading(false);
    }
  }

  // Table Columns Rules
  const ruleColumns: Column<NotificationRule>[] = [
    { key: 'ruleName', header: 'Rule Name', className: 'font-semibold' },
    {
      key: 'triggerType',
      header: 'Trigger Type',
      render: (v) => TRIGGER_TYPES.find((t) => t.value === v)?.label ?? String(v),
    },
    {
      key: 'thresholdValue',
      header: 'Threshold',
      className: 'text-right font-mono',
      render: (v) => (v !== null && v !== undefined ? Number(v).toLocaleString() : '—'),
    },
    {
      key: 'accountId',
      header: 'Target Account',
      render: (v) => {
        if (!v) return 'All Accounts';
        const acc = accounts.find((a) => a.id === v);
        return acc ? `[${acc.code}] ${acc.name}` : String(v);
      },
    },
    {
      key: 'siteId',
      header: 'Site',
      render: (v) => {
        if (!v) return 'All Sites';
        const site = sites.find((s) => s.id === v);
        return site ? site.name : String(v);
      },
    },
    {
      key: 'channel',
      header: 'Channels',
      className: 'capitalize text-slate-500 font-medium',
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (v) => (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${v ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
          {v ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-24',
      render: (_, row) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => {
              setEditRule(row);
              setRuleModalOpen(true);
            }}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Edit"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => setDeleteRuleConfirm(row)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
            aria-label="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  if (!activeCompanyId) {
    return (
      <div className="space-y-6">
        <PageHeader title="Alerts & Notifications" description="Configure alerts thresholds and view system notifications" />
        <ErrorState
          title="No active company"
          message="Please select a company from the sidebar before viewing alerts."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tabs Header */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('inbox')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors duration-150 ${
            activeTab === 'inbox'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Notifications Inbox
        </button>
        <button
          onClick={() => setActiveTab('rules')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors duration-150 ${
            activeTab === 'rules'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Alert Rules Configuration
        </button>
      </div>

      {activeTab === 'inbox' && (
        <div className="space-y-5">
          <PageHeader title="Notifications Inbox" description="System notifications and compliance warnings." />

          {/* Filtering bar */}
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <button
              onClick={() => {
                setStatusFilter('unread');
                setPageNotif(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${statusFilter === 'unread' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              Unread
            </button>
            <button
              onClick={() => {
                setStatusFilter('all');
                setPageNotif(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${statusFilter === 'all' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              All Notifications
            </button>
          </div>

          {isLoadingNotif ? (
            <LoadingState rows={5} message="Retrieving inbox..." />
          ) : errorNotif ? (
            <ErrorState message={errorNotif} onRetry={fetchNotifications} />
          ) : notifications.length === 0 ? (
            <EmptyState
              icon={<Bell className="h-6 w-6 text-slate-300" />}
              title="Inbox is clean!"
              description="No new notifications. Everything matches standard tolerances."
            />
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden divide-y divide-slate-100">
              {notifications.map((n) => (
                <div key={n.id} className={`p-4 flex justify-between items-start gap-4 transition-colors hover:bg-slate-50/50 ${n.status !== 'read' ? 'bg-emerald-50/10' : ''}`}>
                  <div className="flex gap-3 items-start">
                    <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${n.status !== 'read' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {n.channel === 'email' ? <Mail className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">{n.title}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">{n.body}</p>
                      <span className="text-[10px] text-slate-400 mt-2 block font-medium">
                        {new Date(n.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {n.status !== 'read' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-[10px] font-bold shrink-0 border-slate-200"
                      onClick={() => handleMarkAsRead(n.id)}
                    >
                      <Check className="h-3.5 w-3.5 mr-1" /> Mark as Read
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}

          {totalPagesNotif > 1 && (
            <Pagination
              page={pageNotif}
              totalPages={totalPagesNotif}
              total={totalNotif}
              limit={10}
              onPageChange={setPageNotif}
            />
          )}
        </div>
      )}

      {activeTab === 'rules' && (
        <div className="space-y-5">
          <PageHeader title="Alert Rules" description="Set custom warning thresholds to trigger alerts automatically.">
            <Button size="sm" onClick={() => {
              setEditRule(null);
              setRuleModalOpen(true);
            }}>
              <Plus className="h-4 w-4" /> Add Rule
            </Button>
          </PageHeader>

          {isLoadingRules ? (
            <LoadingState rows={5} message="Loading alert rules..." />
          ) : errorRules ? (
            <ErrorState message={errorRules} onRetry={fetchRules} />
          ) : rules.length === 0 ? (
            <EmptyState
              icon={<Sliders className="h-6 w-6" />}
              title="No Alert Rules defined"
              description="Create a warning threshold (such as a 10% budget overspend) to alert management automatically."
            />
          ) : (
            <div className="space-y-4">
              <TableWrapper
                data={rules}
                columns={ruleColumns}
                keyExtractor={(row) => row.id}
              />
              {totalPagesRules > 1 && (
                <Pagination
                  page={pageRules}
                  totalPages={totalPagesRules}
                  total={totalRules}
                  limit={10}
                  onPageChange={setPageRules}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* RULE EDIT FORM MODAL */}
      {ruleModalOpen && (
        <RuleFormModal
          item={editRule}
          accounts={accounts}
          sites={sites}
          onClose={() => setRuleModalOpen(false)}
          onSave={async (payload) => {
            setRuleFormLoading(true);
            setRuleFormError(null);
            try {
              if (editRule) {
                await apiPatch<NotificationRule>(`/notifications/rules/${editRule.id}`, payload);
              } else {
                await apiPost<NotificationRule>('/notifications/rules', payload);
              }
              setRuleModalOpen(false);
              void fetchRules();
            } catch (err: unknown) {
              const msg = axios.isAxiosError(err)
                ? ((err.response?.data as { message?: string })?.message ?? 'Failed to save alert rule.')
                : 'Failed to save alert rule.';
              setRuleFormError(msg);
            } finally {
              setRuleFormLoading(false);
            }
          }}
          isLoading={ruleFormLoading}
          error={ruleFormError}
        />
      )}

      {/* DELETE CONFIRM RULE */}
      <ConfirmDialog
        open={deleteRuleConfirm !== null}
        message={`Are you sure you want to delete alert rule "${deleteRuleConfirm?.ruleName}"?`}
        isLoading={deleteRuleLoading}
        onConfirm={handleDeleteRule}
        onCancel={() => setDeleteRuleConfirm(null)}
      />
    </div>
  );
}

// ===========================================================================
// SUB-COMPONENT: RULE FORM
// ===========================================================================
interface RuleFormModalProps {
  item: NotificationRule | null;
  accounts: Account[];
  sites: Site[];
  onClose: () => void;
  onSave: (payload: Record<string, string | number | boolean | null | undefined | string[]>) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

function RuleFormModal({ item, accounts, sites, onClose, onSave, isLoading, error }: RuleFormModalProps) {
  const [ruleName, setRuleName] = useState(item?.ruleName ?? '');
  const [triggerType, setTriggerType] = useState<TriggerType>(item?.triggerType ?? 'variance_pct');
  const [thresholdValue, setThresholdValue] = useState(item?.thresholdValue?.toString() ?? '10');
  const [accountId, setAccountId] = useState(item?.accountId ?? '');
  const [siteId, setSiteId] = useState(item?.siteId ?? '');
  const [notifyRolesInput, setNotifyRolesInput] = useState(
    Array.isArray(item?.notifyRoles) ? item.notifyRoles.join(', ') : 'admin, finance'
  );
  const [channel, setChannel] = useState(item?.channel ?? 'system,email');
  const [isActive, setIsActive] = useState(item ? item.isActive : true);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ruleName.trim()) return;

    const needsThreshold = ['variance_pct', 'variance_amount', 'kpi_breach'].includes(triggerType);
    const roles = notifyRolesInput
      .split(',')
      .map((r) => r.trim())
      .filter(Boolean);

    const payload: Record<string, string | number | boolean | null | undefined | string[]> = {
      ruleName: ruleName.trim(),
      triggerType,
      accountId: accountId || undefined,
      siteId: siteId || undefined,
      notifyRoles: roles,
      channel: channel.trim() || undefined,
      isActive,
    };

    if (needsThreshold) {
      payload.thresholdValue = Number(thresholdValue);
    }

    await onSave(payload);
  }

  const needsThreshold = ['variance_pct', 'variance_amount', 'kpi_breach'].includes(triggerType);

  return (
    <Modal open onClose={onClose} title={item ? 'Edit Alert Rule' : 'Create Alert Rule'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Input id="rule-name" label="Rule Name" required value={ruleName} onChange={(e) => setRuleName(e.target.value)} placeholder="e.g. Variance Alert > 10%" />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="rule-trigger" className="text-xs font-semibold text-slate-500">Trigger Type</label>
            <select
              id="rule-trigger"
              value={triggerType}
              onChange={(e) => setTriggerType(e.target.value as TriggerType)}
              className="h-9 rounded border border-slate-200 bg-white px-3 text-xs text-slate-700 font-semibold"
            >
              {TRIGGER_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>

        {needsThreshold && (
          <Input
            id="rule-threshold"
            label="Threshold Value"
            type="number"
            required
            value={thresholdValue}
            onChange={(e) => setThresholdValue(e.target.value)}
            placeholder="e.g. 10.0 for 10%"
          />
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="rule-account" className="text-xs font-semibold text-slate-500 flex items-center gap-1">
              <Layers className="h-3 w-3 text-slate-400" /> Target GL Account (Optional)
            </label>
            <select
              id="rule-account"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="h-9 rounded border border-slate-200 bg-white px-2 text-xs text-slate-700"
            >
              <option value="">All Accounts</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>[{a.code}] {a.name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="rule-site" className="text-xs font-semibold text-slate-500 flex items-center gap-1">
              <Building className="h-3 w-3 text-slate-400" /> Target Site (Optional)
            </label>
            <select
              id="rule-site"
              value={siteId}
              onChange={(e) => setSiteId(e.target.value)}
              className="h-9 rounded border border-slate-200 bg-white px-2 text-xs text-slate-700"
            >
              <option value="">All Sites</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input id="rule-roles" label="Notify Roles (comma separated)" required value={notifyRolesInput} onChange={(e) => setNotifyRolesInput(e.target.value)} placeholder="admin, finance" />
          <Input id="rule-channel" label="Notification Channels" required value={channel} onChange={(e) => setChannel(e.target.value)} placeholder="system, email" />
        </div>

        <div className="flex items-center gap-2 border-t border-slate-100 pt-3">
          <input
            id="rule-active"
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
          />
          <label htmlFor="rule-active" className="text-xs font-semibold text-slate-700">Rule is active</label>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Button variant="outline" size="sm" type="button" onClick={onClose}>Cancel</Button>
          <Button size="sm" type="submit" isLoading={isLoading}>{item ? 'Save Changes' : 'Create Rule'}</Button>
        </div>
      </form>
    </Modal>
  );
}
