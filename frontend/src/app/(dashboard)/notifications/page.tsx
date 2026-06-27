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
  ShieldCheck,
  ChevronDown,
  ChevronRight,
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
import { useI18n } from '@/lib/i18n/i18n-context';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';
import { TRIGGER_TYPES } from '@/lib/constants';
import { translateTriggerType } from '@/lib/i18n/translate-api';
import { AlertCard } from '@/components/dashboard/alert-card';
import type {
  Alert,
  Notification,
  NotificationRule,
  TriggerType,
  Account,
  Site,
  PaginatedResponse,
} from '@/types/api';

type Tab = 'alerts' | 'inbox' | 'rules';

type AlertFilter = 'all' | 'unread' | 'read';

export default function NotificationsPage() {
  const { t, locale } = useI18n();
  const { activeCompanyId } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('alerts');

  // ── Alerts state ──────────────────────────────────────────────────────
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [totalAlerts, setTotalAlerts] = useState(0);
  const [pageAlerts, setPageAlerts] = useState(1);
  const [totalPagesAlerts, setTotalPagesAlerts] = useState(1);
  const [alertFilter, setAlertFilter] = useState<AlertFilter>('all');
  const [alertCategoryFilter, setAlertCategoryFilter] = useState<string>('');
  const [alertPriorityFilter, setAlertPriorityFilter] = useState<string>('');
  const [isLoadingAlerts, setIsLoadingAlerts] = useState(false);
  const [errorAlerts, setErrorAlerts] = useState<string | null>(null);

  // ── Inbox state ───────────────────────────────────────────────────────
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [totalNotif, setTotalNotif] = useState(0);
  const [pageNotif, setPageNotif] = useState(1);
  const [totalPagesNotif, setTotalPagesNotif] = useState(1);
  const [statusFilter, setStatusFilter] = useState<'unread' | 'all'>('unread');
  const [isLoadingNotif, setIsLoadingNotif] = useState(false);
  const [errorNotif, setErrorNotif] = useState<string | null>(null);

  // ── Rules state ───────────────────────────────────────────────────────
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

  // Unread counts
  const [unreadAlertCount, setUnreadAlertCount] = useState(0);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  // ── Bulk selection state ────────────────────────────────────────────────
  const [selectedAlertIds, setSelectedAlertIds] = useState<Set<string>>(new Set());
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // ── Notification grouping state ────────────────────────────────────────
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  // ── Fetch Master Data ─────────────────────────────────────────────────
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

  // ── Fetch Alerts ──────────────────────────────────────────────────────
  const fetchAlerts = useCallback(async () => {
    if (!activeCompanyId) return;
    setIsLoadingAlerts(true);
    setErrorAlerts(null);
    try {
      const params = new URLSearchParams({
        page: String(pageAlerts),
        limit: '10',
      });
      if (alertFilter === 'unread') params.set('isRead', 'false');
      if (alertFilter === 'read') params.set('isRead', 'true');
      if (alertCategoryFilter) params.set('category', alertCategoryFilter);
      if (alertPriorityFilter) params.set('priority', alertPriorityFilter);

      const res = await apiGet<PaginatedResponse<Alert>>(
        `/alerts?${params.toString()}`,
      );
      setAlerts(res.data ?? []);
      setTotalAlerts(res.total ?? 0);
      setTotalPagesAlerts(res.totalPages ?? 1);
      setUnreadAlertCount(
        (res.data ?? []).filter((a) => !a.isRead).length,
      );
    } catch {
      setErrorAlerts(t('error.notificationsFetchFailed'));
    } finally {
      setIsLoadingAlerts(false);
    }
  }, [activeCompanyId, pageAlerts, alertFilter, alertCategoryFilter, alertPriorityFilter, t]);

  // ── Fetch Inbox Notifications ─────────────────────────────────────────
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
      setUnreadNotifCount(
        allNotifs.filter((n) => n.status !== 'read').length,
      );
    } catch {
      setErrorNotif(t('error.notificationsFetchFailed'));
    } finally {
      setIsLoadingNotif(false);
    }
  }, [activeCompanyId, pageNotif, statusFilter, t]);

  // ── Fetch Rules ───────────────────────────────────────────────────────
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
    } catch {
      setErrorRules(t('error.rulesFetchFailed'));
    } finally {
      setIsLoadingRules(false);
    }
  }, [activeCompanyId, pageRules, t]);

  // ── Tab-based fetching ────────────────────────────────────────────────
  useEffect(() => {
    if (activeTab === 'alerts') {
      void Promise.resolve().then(() => void fetchAlerts());
    } else if (activeTab === 'inbox') {
      void Promise.resolve().then(() => void fetchNotifications());
    } else {
      void Promise.resolve().then(() => void fetchRules());
    }
  }, [activeTab, fetchAlerts, fetchNotifications, fetchRules]);

  // ── Alert Actions ─────────────────────────────────────────────────────
  async function handleAlertMarkRead(id: string) {
    try {
      await apiPatch<Alert>(`/alerts/${id}/read`);
      void fetchAlerts();
    } catch {
      alert(t('error.markReadFailed'));
    }
  }

  async function handleAlertArchive(id: string) {
    try {
      await apiPatch<Alert>(`/alerts/${id}/archive`);
      void fetchAlerts();
    } catch {
      alert(t('error.markReadFailed'));
    }
  }

  async function handleAlertMarkAllRead() {
    try {
      await apiPost<void>('/alerts/mark-all-read', {});
      void fetchAlerts();
    } catch {
      alert(t('error.markReadFailed'));
    }
  }

  // ── Bulk Alert Actions ────────────────────────────────────────────────
  function handleToggleSelectAll() {
    if (selectedAlertIds.size === alerts.length) {
      setSelectedAlertIds(new Set());
    } else {
      setSelectedAlertIds(new Set(alerts.map((a) => a.id)));
    }
  }

  function handleToggleSelect(id: string) {
    setSelectedAlertIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function handleBulkMarkRead() {
    if (selectedAlertIds.size === 0) return;
    setBulkActionLoading(true);
    try {
      await apiPatch<{ count: number }>('/alerts/bulk-read', {
        ids: Array.from(selectedAlertIds),
      });
      setSelectedAlertIds(new Set());
      void fetchAlerts();
    } catch {
      alert(t('error.markReadFailed'));
    } finally {
      setBulkActionLoading(false);
    }
  }

  async function handleBulkArchive() {
    if (selectedAlertIds.size === 0) return;
    setBulkActionLoading(true);
    try {
      await apiPatch<{ count: number }>('/alerts/bulk-archive', {
        ids: Array.from(selectedAlertIds),
      });
      setSelectedAlertIds(new Set());
      void fetchAlerts();
    } catch {
      alert(t('error.markReadFailed'));
    } finally {
      setBulkActionLoading(false);
    }
  }

  async function handleBulkDelete() {
    if (selectedAlertIds.size === 0) return;
    setBulkActionLoading(true);
    try {
      await apiDelete<{ count: number }>('/alerts/bulk-delete', {
        data: { ids: Array.from(selectedAlertIds) },
      });
      setSelectedAlertIds(new Set());
      setBulkDeleteConfirmOpen(false);
      void fetchAlerts();
    } catch {
      alert(t('error.deleteFailed'));
    } finally {
      setBulkActionLoading(false);
    }
  }

  // ── Notification Grouping ─────────────────────────────────────────────
  function getNotificationGroup(dateStr: string): string {
    const now = new Date();
    const date = new Date(dateStr);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    if (date >= today) return 'today';
    if (date >= yesterday) return 'yesterday';
    if (date >= weekAgo) return 'thisWeek';
    return 'earlier';
  }

  function toggleGroup(group: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) {
        next.delete(group);
      } else {
        next.add(group);
      }
      return next;
    });
  }

  function getGroupedNotifications() {
    const groups: Record<string, Notification[]> = {
      today: [],
      yesterday: [],
      thisWeek: [],
      earlier: [],
    };
    for (const n of notifications) {
      const group = getNotificationGroup(n.createdAt);
      groups[group].push(n);
    }
    return groups;
  }

  const GROUP_LABELS: Record<string, string> = {
    today: 'page.notifications.groupToday',
    yesterday: 'page.notifications.groupYesterday',
    thisWeek: 'page.notifications.groupThisWeek',
    earlier: 'page.notifications.groupEarlier',
  };

  // ── Inbox Actions ─────────────────────────────────────────────────────
  async function handleMarkAsRead(id: string) {
    try {
      await apiPatch<Notification>(`/notifications/${id}/read`);
      void fetchNotifications();
    } catch {
      alert(t('error.markReadFailed'));
    }
  }

  async function handleInboxMarkAllRead() {
    try {
      await apiPost<void>('/notifications/mark-all-read', {});
      void fetchNotifications();
    } catch {
      alert(t('error.markReadFailed'));
    }
  }

  // ── Rules Actions ─────────────────────────────────────────────────────
  async function handleDeleteRule() {
    if (!deleteRuleConfirm) return;
    setDeleteRuleLoading(true);
    try {
      await apiDelete<NotificationRule>(`/notifications/rules/${deleteRuleConfirm.id}`);
      setDeleteRuleConfirm(null);
      void fetchRules();
    } catch {
      alert(t('error.ruleDeleteFailed'));
    } finally {
      setDeleteRuleLoading(false);
    }
  }

  // ── Rules Table Columns ───────────────────────────────────────────────
  const ruleColumns: Column<NotificationRule>[] = [
    { key: 'ruleName', header: t('page.notificationRules.ruleName'), className: 'font-semibold' },
    {
      key: 'triggerType',
      header: t('page.notificationRules.triggerType'),
      render: (v) => t(translateTriggerType(String(v)) as never),
    },
    {
      key: 'thresholdValue',
      header: t('page.notificationRules.threshold'),
      className: 'text-right font-mono',
      render: (v) => (v !== null && v !== undefined ? Number(v).toLocaleString() : '—'),
    },
    {
      key: 'accountId',
      header: t('page.notificationRules.targetAccount'),
      render: (v) => {
        if (!v) return t('common.allAccounts');
        const acc = accounts.find((a) => a.id === v);
        return acc ? `[${acc.code}] ${acc.name}` : String(v);
      },
    },
    {
      key: 'siteId',
      header: t('page.notificationRules.site'),
      render: (v) => {
        if (!v) return t('common.allSites');
        const site = sites.find((s) => s.id === v);
        return site ? site.name : String(v);
      },
    },
    {
      key: 'channel',
      header: t('page.notificationRules.channel'),
      className: 'capitalize text-slate-500 font-medium',
    },
    {
      key: 'isActive',
      header: t('page.notificationRules.status'),
      render: (v) => (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${v ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
          {v ? t('common.active') : t('common.inactive')}
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
            aria-label={t('common.edit')}
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => setDeleteRuleConfirm(row)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
            aria-label={t('common.delete')}
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
        <PageHeader title={t('page.notifications.title')} description={t('page.notifications.description')} />
        <ErrorState
          title={t('common.noCompany')}
          message={t('common.selectCompany')}
        />
      </div>
    );
  }

  // ── Tab definitions ───────────────────────────────────────────────────
  const tabs: { key: Tab; label: string; badge?: number }[] = [
    { key: 'alerts', label: t('page.notifications.alerts'), badge: unreadAlertCount || undefined },
    { key: 'inbox', label: t('page.notifications.inboxTab'), badge: unreadNotifCount || undefined },
    { key: 'rules', label: t('page.notifications.rulesTab') },
  ];

  return (
    <div className="space-y-6">
      {/* Tabs Header */}
      <div className="flex border-b border-slate-200 dark:border-slate-700">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`relative px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors duration-150 ${
              activeTab === tab.key
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <span className="flex items-center gap-2">
              {tab.key === 'alerts' && <ShieldCheck className="h-4 w-4" />}
              {tab.key === 'inbox' && <Bell className="h-4 w-4" />}
              {tab.key === 'rules' && <Sliders className="h-4 w-4" />}
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="ml-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-emerald-600 px-1.5 text-[10px] font-bold text-white">
                  {tab.badge > 99 ? '99+' : tab.badge}
                </span>
              )}
            </span>
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* TAB: ALERTS                                                      */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'alerts' && (
        <div className="space-y-5">
          <PageHeader
            title={t('page.notifications.alerts')}
            description={t('page.notifications.description')}
          >
            <Button size="sm" variant="outline" onClick={() => void handleAlertMarkAllRead()}>
              <Check className="h-4 w-4" /> {t('page.notifications.markAllRead')}
            </Button>
          </PageHeader>

          {/* Filter bar */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Status filter */}
            <div className="flex items-center gap-1">
              {(['all', 'unread', 'read'] as const).map((f) => {
                const labelKey =
                  f === 'all'
                    ? 'page.notifications.filterAll'
                    : f === 'unread'
                      ? 'page.notifications.filterUnread'
                      : 'page.notifications.filterRead';
                return (
                  <button
                    key={f}
                    onClick={() => {
                      setAlertFilter(f);
                      setPageAlerts(1);
                      setSelectedAlertIds(new Set());
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      alertFilter === f
                        ? 'bg-slate-900 text-white dark:bg-slate-700'
                        : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                    }`}
                  >
                    {t(labelKey)}
                  </button>
                );
              })}
            </div>

            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />

            {/* Category filter */}
            <select
              value={alertCategoryFilter}
              onChange={(e) => {
                setAlertCategoryFilter(e.target.value);
                setPageAlerts(1);
              }}
              className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="">{t('page.notifications.filterAll')}</option>
              <option value="budget">{t('page.notifications.categoryBudget')}</option>
              <option value="forecast">{t('page.notifications.categoryForecast')}</option>
              <option value="inventory">{t('page.notifications.categoryInventory')}</option>
              <option value="exchange_rate">{t('page.notifications.categoryExchange')}</option>
              <option value="production">{t('page.notifications.categoryProduction')}</option>
              <option value="import">{t('page.notifications.categoryImport')}</option>
              <option value="approval">{t('page.notifications.categoryApproval')}</option>
              <option value="system">{t('page.notifications.categorySystem')}</option>
            </select>

            {/* Priority filter */}
            <select
              value={alertPriorityFilter}
              onChange={(e) => {
                setAlertPriorityFilter(e.target.value);
                setPageAlerts(1);
              }}
              className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="">{t('page.notifications.filterAll')}</option>
              <option value="low">{t('page.notifications.alertLow')}</option>
              <option value="medium">{t('page.notifications.alertMedium')}</option>
              <option value="high">{t('page.notifications.alertHigh')}</option>
              <option value="critical">{t('page.notifications.alertCritical')}</option>
            </select>
          </div>

          {/* Select All bar */}
          {alerts.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleToggleSelectAll}
                className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
              >
                <div className={`h-4 w-4 rounded border-2 flex items-center justify-center transition-colors ${
                  selectedAlertIds.size === alerts.length
                    ? 'bg-emerald-600 border-emerald-600'
                    : selectedAlertIds.size > 0
                      ? 'bg-emerald-600/20 border-emerald-600'
                      : 'border-slate-300 dark:border-slate-600'
                }`}>
                  {selectedAlertIds.size === alerts.length && (
                    <Check className="h-3 w-3 text-white" />
                  )}
                  {selectedAlertIds.size > 0 && selectedAlertIds.size < alerts.length && (
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                  )}
                </div>
                {selectedAlertIds.size === alerts.length
                  ? t('page.notifications.deselectAll')
                  : t('page.notifications.selectAll')}
              </button>
            </div>
          )}

          {/* Alert list */}
          {isLoadingAlerts ? (
            <LoadingState rows={5} message={t('common.loading')} />
          ) : errorAlerts ? (
            <ErrorState message={errorAlerts} onRetry={fetchAlerts} />
          ) : alerts.length === 0 ? (
            <EmptyState
              icon={<ShieldCheck className="h-6 w-6 text-slate-300" />}
              title={t('page.notifications.noAlerts')}
              description={t('page.notifications.noAlertsDesc')}
            />
          ) : (
            <div className="space-y-2">
              {alerts.map((alert) => (
                <div key={alert.id} className="flex items-start gap-2">
                  <button
                    onClick={() => handleToggleSelect(alert.id)}
                    className="mt-3 shrink-0"
                    aria-label={t('common.select')}
                  >
                    <div className={`h-4 w-4 rounded border-2 flex items-center justify-center transition-colors ${
                      selectedAlertIds.has(alert.id)
                        ? 'bg-emerald-600 border-emerald-600'
                        : 'border-slate-300 dark:border-slate-600'
                    }`}>
                      {selectedAlertIds.has(alert.id) && (
                        <Check className="h-3 w-3 text-white" />
                      )}
                    </div>
                  </button>
                  <div className="flex-1">
                    <AlertCard
                      alert={alert}
                      onMarkRead={handleAlertMarkRead}
                      onArchive={handleAlertArchive}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {totalPagesAlerts > 1 && (
            <Pagination
              page={pageAlerts}
              totalPages={totalPagesAlerts}
              total={totalAlerts}
              limit={10}
              onPageChange={(p) => {
                setPageAlerts(p);
                setSelectedAlertIds(new Set());
              }}
            />
          )}

          {/* Floating Action Bar */}
          {selectedAlertIds.size > 0 && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-3 shadow-2xl dark:border-slate-700 dark:bg-slate-800">
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                  {t('page.notifications.selectedCount').replace('{count}', String(selectedAlertIds.size))}
                </span>
                <div className="h-5 w-px bg-slate-200 dark:bg-slate-600" />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void handleBulkMarkRead()}
                  isLoading={bulkActionLoading}
                  className="text-xs"
                >
                  <Check className="h-3.5 w-3.5 mr-1" />
                  {t('page.notifications.markSelectedRead')}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void handleBulkArchive()}
                  isLoading={bulkActionLoading}
                  className="text-xs"
                >
                  {t('page.notifications.archiveSelected')}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setBulkDeleteConfirmOpen(true)}
                  className="text-xs text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/30"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  {t('page.notifications.deleteSelected')}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* TAB: INBOX (existing notifications — enhanced)                   */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'inbox' && (
        <div className="space-y-5">
          <PageHeader title={t('page.notifications.inboxTab')} description={t('page.notifications.description')}>
            <Button size="sm" variant="outline" onClick={() => void handleInboxMarkAllRead()}>
              <Check className="h-4 w-4" /> {t('page.notifications.markAllRead')}
            </Button>
          </PageHeader>

          {/* Filtering bar */}
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2 dark:border-slate-800">
            <button
              onClick={() => {
                setStatusFilter('unread');
                setPageNotif(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${statusFilter === 'unread' ? 'bg-slate-900 text-white dark:bg-slate-700' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'}`}
            >
              {t('common.unread')}
            </button>
            <button
              onClick={() => {
                setStatusFilter('all');
                setPageNotif(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${statusFilter === 'all' ? 'bg-slate-900 text-white dark:bg-slate-700' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'}`}
            >
              {t('common.all')}
            </button>
          </div>

          {isLoadingNotif ? (
            <LoadingState rows={5} message={t('common.loading')} />
          ) : errorNotif ? (
            <ErrorState message={errorNotif} onRetry={fetchNotifications} />
          ) : notifications.length === 0 ? (
            <EmptyState
              icon={<Bell className="h-6 w-6 text-slate-300" />}
              title={t('page.notifications.emptyTitle')}
              description={t('page.notifications.emptyDescription')}
            />
          ) : (
            <div className="space-y-4">
              {Object.entries(getGroupedNotifications()).map(([group, items]) => {
                if (items.length === 0) return null;
                const isCollapsed = collapsedGroups.has(group);
                return (
                  <div key={group}>
                    <button
                      onClick={() => toggleGroup(group)}
                      className="flex items-center gap-2 mb-2 text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 uppercase tracking-wider"
                    >
                      {isCollapsed ? (
                        <ChevronRight className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                      {t(GROUP_LABELS[group] as never)}
                      <span className="ml-1 px-1.5 py-0.5 rounded-full bg-slate-100 text-[10px] font-semibold dark:bg-slate-700">
                        {items.length}
                      </span>
                    </button>
                    {!isCollapsed && (
                      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden divide-y divide-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:divide-slate-700">
                        {items.map((n) => (
                          <div key={n.id} className={`p-4 flex justify-between items-start gap-4 transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-700/50 ${n.status !== 'read' ? 'bg-emerald-50/10 dark:bg-emerald-900/10' : ''}`}>
                            <div className="flex gap-3 items-start">
                              <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${n.status !== 'read' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}>
                                {n.channel === 'email' ? <Mail className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                              </div>
                              <div>
                                <h4 className="font-bold text-slate-800 text-sm dark:text-slate-200">{n.title}</h4>
                                <p className="text-xs text-slate-500 mt-0.5 dark:text-slate-400">{n.body}</p>
                                <span className="text-[10px] text-slate-400 mt-2 block font-medium dark:text-slate-500">
                                  {new Date(n.createdAt).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US')}
                                </span>
                              </div>
                            </div>

                            {n.status !== 'read' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-[10px] font-bold shrink-0 border-slate-200 dark:border-slate-600"
                                onClick={() => handleMarkAsRead(n.id)}
                              >
                                <Check className="h-3.5 w-3.5 mr-1" /> {t('common.markAsRead')}
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
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

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* TAB: RULES (existing — kept as-is)                              */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'rules' && (
        <div className="space-y-5">
          <PageHeader title={t('page.notificationRules.title')} description={t('page.notificationRules.description')}>
            <Button size="sm" onClick={() => {
              setEditRule(null);
              setRuleModalOpen(true);
            }}>
              <Plus className="h-4 w-4" /> {t('page.notificationRules.createRule')}
            </Button>
          </PageHeader>

          {isLoadingRules ? (
            <LoadingState rows={5} message={t('common.loading')} />
          ) : errorRules ? (
            <ErrorState message={errorRules} onRetry={fetchRules} />
          ) : rules.length === 0 ? (
            <EmptyState
              icon={<Sliders className="h-6 w-6" />}
              title={t('page.notificationRules.emptyTitle')}
              description={t('page.notificationRules.emptyDescription')}
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

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* RULE EDIT FORM MODAL                                            */}
      {/* ══════════════════════════════════════════════════════════════════ */}
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
            } catch {
              setRuleFormError(t('error.ruleSaveFailed'));
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
        message={t('common.confirmDeleteMessage')}
        isLoading={deleteRuleLoading}
        onConfirm={handleDeleteRule}
        onCancel={() => setDeleteRuleConfirm(null)}
      />

      {/* BULK DELETE CONFIRM */}
      <ConfirmDialog
        open={bulkDeleteConfirmOpen}
        message={t('page.notifications.bulkDeleteConfirm').replace('{count}', String(selectedAlertIds.size))}
        isLoading={bulkActionLoading}
        onConfirm={() => void handleBulkDelete()}
        onCancel={() => setBulkDeleteConfirmOpen(false)}
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
  const { t } = useI18n();
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
    <Modal open onClose={onClose} title={item ? t('page.notificationRules.editTitle') : t('page.notificationRules.createTitle')} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Input id="rule-name" label={t('page.notificationRules.ruleName')} required value={ruleName} onChange={(e) => setRuleName(e.target.value)} placeholder={t('page.notificationRules.ruleNamePlaceholder')} />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="rule-trigger" className="text-xs font-semibold text-slate-500">{t('page.notificationRules.triggerType')}</label>
            <select
              id="rule-trigger"
              value={triggerType}
              onChange={(e) => setTriggerType(e.target.value as TriggerType)}
              className="h-9 rounded border border-slate-200 bg-white px-3 text-xs text-slate-700 font-semibold"
            >
              {TRIGGER_TYPES.map((tt) => (
                <option key={tt.value} value={tt.value}>{t(tt.labelKey as never)}</option>
              ))}
            </select>
          </div>
        </div>

        {needsThreshold && (
          <Input
            id="rule-threshold"
            label={t('page.notificationRules.thresholdValue')}
            type="number"
            required
            value={thresholdValue}
            onChange={(e) => setThresholdValue(e.target.value)}
            placeholder={t('page.notificationRules.thresholdPlaceholder')}
          />
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="rule-account" className="text-xs font-semibold text-slate-500 flex items-center gap-1">
              <Layers className="h-3 w-3 text-slate-400" /> {t('page.notificationRules.targetGlAccount')}
            </label>
            <select
              id="rule-account"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="h-9 rounded border border-slate-200 bg-white px-2 text-xs text-slate-700"
            >
              <option value="">{t('common.allAccounts')}</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>[{a.code}] {a.name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="rule-site" className="text-xs font-semibold text-slate-500 flex items-center gap-1">
              <Building className="h-3 w-3 text-slate-400" /> {t('page.notificationRules.targetSite')}
            </label>
            <select
              id="rule-site"
              value={siteId}
              onChange={(e) => setSiteId(e.target.value)}
              className="h-9 rounded border border-slate-200 bg-white px-2 text-xs text-slate-700"
            >
              <option value="">{t('common.allSites')}</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input id="rule-roles" label={t('page.notificationRules.notifyRoles')} required value={notifyRolesInput} onChange={(e) => setNotifyRolesInput(e.target.value)} placeholder={t('page.notificationRules.notifyRolesPlaceholder')} />
          <Input id="rule-channel" label={t('page.notificationRules.notificationChannels')} required value={channel} onChange={(e) => setChannel(e.target.value)} placeholder={t('page.notificationRules.channelsPlaceholder')} />
        </div>

        <div className="flex items-center gap-2 border-t border-slate-100 pt-3">
          <input
            id="rule-active"
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
          />
          <label htmlFor="rule-active" className="text-xs font-semibold text-slate-700">{t('page.notificationRules.ruleActive')}</label>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Button variant="outline" size="sm" type="button" onClick={onClose}>{t('common.cancel')}</Button>
          <Button size="sm" type="submit" isLoading={isLoading}>{item ? t('common.saveChanges') : t('page.notificationRules.createRule')}</Button>
        </div>
      </form>
    </Modal>
  );
}
