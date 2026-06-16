'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Eye,
  History,
  Terminal,
  RefreshCw,
  FileText,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { TableWrapper, type Column } from '@/components/ui/table-wrapper';
import { Pagination } from '@/components/ui/pagination';
import { LoadingState, EmptyState, ErrorState } from '@/components/ui/feedback-states';
import { Modal } from '@/components/ui/modal';
import { useAuth } from '@/lib/auth-context';
import { apiGet } from '@/lib/api';
import type {
  AuditLogRecord,
  PaginatedResponse,
} from '@/types/api';
import { useI18n } from '@/lib/i18n/i18n-context';
import { useTranslateApi } from '@/lib/i18n/translate-api';

export default function AuditLogsPage() {
  const { activeCompanyId } = useAuth();
  const { t } = useI18n();
  const { tAction, tEntityType } = useTranslateApi();

  // Audit Logs State
  const [logs, setLogs] = useState<AuditLogRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [entityTypeFilter, setEntityTypeFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  // Detail Modal State
  const [selectedLog, setSelectedLog] = useState<AuditLogRecord | null>(null);

  // Fetch Audit Logs
  const fetchLogs = useCallback(async () => {
    if (!activeCompanyId) return;
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '10',
      });
      if (searchTerm.trim()) params.set('search', searchTerm.trim());
      if (entityTypeFilter) params.set('entityType', entityTypeFilter);
      if (actionFilter) params.set('action', actionFilter);

      const res = await apiGet<PaginatedResponse<AuditLogRecord>>(`/audit-logs?${params.toString()}`);
      setLogs(res.data ?? []);
      setTotal(res.total ?? 0);
      setTotalPages(res.totalPages ?? 1);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('page.auditLogs.fetchFailed'));
      setLogs([]);
    } finally {
      setIsLoading(false);
    }
  }, [activeCompanyId, page, searchTerm, entityTypeFilter, actionFilter, t]);

  useEffect(() => {
    void Promise.resolve().then(() => void fetchLogs());
  }, [fetchLogs]);

  // Table columns definition
  const columns: Column<AuditLogRecord>[] = [
    {
      key: 'createdAt',
      header: t('page.auditLogs.colTimestamp'),
      className: 'font-mono text-slate-500',
      render: (v) => (v ? new Date(String(v)).toLocaleString() : '—'),
    },
    {
      key: 'userId',
      header: t('page.auditLogs.colOperator'),
      render: (v) => (v ? t('page.auditLogs.userLabel', { id: String(v) }) : t('page.auditLogs.system')),
    },
    {
      key: 'action',
      header: t('page.auditLogs.colAction'),
      className: 'capitalize font-bold text-slate-700',
      render: (v) => tAction(String(v)),
    },
    {
      key: 'entityType',
      header: t('page.auditLogs.colEntityType'),
      className: 'font-mono text-slate-500 font-semibold',
      render: (v) => tEntityType(String(v)),
    },
    {
      key: 'entityId',
      header: t('page.auditLogs.colEntityId'),
      className: 'font-mono text-slate-400',
      render: (v) => (v ? `#${v}` : '—'),
    },
    {
      key: 'ipAddress',
      header: t('page.auditLogs.colIpAddress'),
      className: 'font-mono text-slate-400',
      render: (v) => String(v || '—'),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-24',
      render: (_, row) => (
        <div className="flex items-center justify-end">
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-[10px] font-bold"
            onClick={() => setSelectedLog(row)}
          >
            <Eye className="h-3.5 w-3.5 mr-1" /> {t('page.auditLogs.viewDiff')}
          </Button>
        </div>
      ),
    },
  ];

  if (!activeCompanyId) {
    return (
      <div className="space-y-6">
        <PageHeader title={t('page.auditLogs.title')} description={t('page.auditLogs.description')} />
        <ErrorState
          title={t('page.auditLogs.noCompanyTitle')}
          message={t('page.auditLogs.noCompanyDesc')}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('page.auditLogs.title')}
        description={t('page.auditLogs.description')}
      />

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-5">
        {/* Filters Panel */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label htmlFor="log-search" className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Search className="h-2.5 w-2.5" /> {t('page.auditLogs.searchFilter')}
            </label>
            <input
              id="log-search"
              type="search"
              placeholder={t('page.auditLogs.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 rounded border border-slate-200 bg-white px-2.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="log-entity" className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t('page.auditLogs.entityType')}</label>
            <select
              id="log-entity"
              value={entityTypeFilter}
              onChange={(e) => setEntityTypeFilter(e.target.value)}
              className="h-8 rounded border border-slate-200 bg-white px-2 text-xs text-slate-700 focus:outline-none font-semibold"
            >
              <option value="">{t('page.auditLogs.allEntities')}</option>
              <option value="BudgetCycle">{tEntityType('BudgetCycle')}</option>
              <option value="ForecastCycle">{tEntityType('ForecastCycle')}</option>
              <option value="Scenario">{tEntityType('Scenario')}</option>
              <option value="ActualImport">{tEntityType('ActualImport')}</option>
              <option value="Account">{tEntityType('Account')}</option>
              <option value="Site">{tEntityType('Site')}</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="log-action" className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t('page.auditLogs.action')}</label>
            <select
              id="log-action"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="h-8 rounded border border-slate-200 bg-white px-2 text-xs text-slate-700 focus:outline-none font-semibold"
            >
              <option value="">{t('page.auditLogs.allActions')}</option>
              <option value="create">{tAction('create')}</option>
              <option value="update">{tAction('update')}</option>
              <option value="delete">{tAction('delete')}</option>
              <option value="status_change">{tAction('status_change')}</option>
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
            <History className="h-4 w-4 text-emerald-600" /> {t('page.auditLogs.recordsTracked', { n: total })}
          </span>
          <Button size="sm" variant="outline" onClick={fetchLogs} className="flex items-center gap-1">
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} /> {t('page.auditLogs.refreshLogs')}
          </Button>
        </div>

        {/* Data Table */}
        {isLoading ? (
          <LoadingState rows={8} message={t('page.auditLogs.fetching')} />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchLogs} />
        ) : logs.length === 0 ? (
          <EmptyState
            icon={<History className="h-6 w-6 text-slate-300" />}
            title={t('page.auditLogs.emptyTitle')}
            description={t('page.auditLogs.emptyDesc')}
          />
        ) : (
          <div className="space-y-4">
            <TableWrapper
              data={logs}
              columns={columns}
              keyExtractor={(row) => row.id}
            />
            {totalPages > 1 && (
              <Pagination
                page={page}
                totalPages={totalPages}
                total={total}
                limit={10}
                onPageChange={setPage}
              />
            )}
          </div>
        )}
      </div>

      {/* DETAIL DIFF MODAL */}
      {selectedLog && (
        <Modal
          open
          onClose={() => setSelectedLog(null)}
          title={t('page.auditLogs.modalTitle')}
          size="lg"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs">
              <div>
                <span className="font-bold text-slate-400 block uppercase text-[9px] tracking-wider">{t('page.auditLogs.logRecordId')}</span>
                <span className="font-semibold text-slate-700 font-mono">#{selectedLog.id}</span>
              </div>
              <div>
                <span className="font-bold text-slate-400 block uppercase text-[9px] tracking-wider">{t('page.auditLogs.operator')}</span>
                <span className="font-semibold text-slate-700">{selectedLog.userId ? t('page.auditLogs.userLabel', { id: selectedLog.userId }) : t('page.auditLogs.system')}</span>
              </div>
              <div>
                <span className="font-bold text-slate-400 block uppercase text-[9px] tracking-wider">{t('page.auditLogs.ipAddress')}</span>
                <span className="font-semibold text-slate-700 font-mono">{selectedLog.ipAddress || '—'}</span>
              </div>
              <div>
                <span className="font-bold text-slate-400 block uppercase text-[9px] tracking-wider">{t('page.auditLogs.timestamp')}</span>
                <span className="font-semibold text-slate-700 font-mono">{selectedLog.createdAt ? new Date(selectedLog.createdAt).toLocaleString() : '—'}</span>
              </div>
            </div>

            {selectedLog.userAgent && (
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg flex items-start gap-2 text-[10px] text-slate-500 font-mono">
                <Terminal className="h-4 w-4 shrink-0 text-slate-400 mt-0.5" />
                <span className="break-all">{selectedLog.userAgent}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Old Values */}
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-slate-500 flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5" /> {t('page.auditLogs.oldValues')}
                </h4>
                <div className="border border-slate-200 rounded-xl bg-slate-900 p-4 h-[250px] overflow-y-auto font-mono text-[10px] text-emerald-400">
                  {selectedLog.oldValues ? (
                    <pre className="whitespace-pre-wrap">{JSON.stringify(selectedLog.oldValues, null, 2)}</pre>
                  ) : (
                    <span className="text-slate-500 italic">{t('page.auditLogs.noOldValues')}</span>
                  )}
                </div>
              </div>

              {/* New Values */}
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-slate-500 flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5" /> {t('page.auditLogs.newValues')}
                </h4>
                <div className="border border-slate-200 rounded-xl bg-slate-900 p-4 h-[250px] overflow-y-auto font-mono text-[10px] text-emerald-400">
                  {selectedLog.newValues ? (
                    <pre className="whitespace-pre-wrap">{JSON.stringify(selectedLog.newValues, null, 2)}</pre>
                  ) : (
                    <span className="text-slate-500 italic">{t('page.auditLogs.noNewValues')}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4 flex justify-end">
              <Button size="sm" onClick={() => setSelectedLog(null)}>
                {t('page.auditLogs.closeDetail')}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
