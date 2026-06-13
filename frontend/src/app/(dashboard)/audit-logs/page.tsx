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

export default function AuditLogsPage() {
  const { activeCompanyId } = useAuth();

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
      setError(err instanceof Error ? err.message : 'Failed to retrieve audit log records.');
      setLogs([]);
    } finally {
      setIsLoading(false);
    }
  }, [activeCompanyId, page, searchTerm, entityTypeFilter, actionFilter]);

  useEffect(() => {
    void Promise.resolve().then(() => void fetchLogs());
  }, [fetchLogs]);

  // Table columns definition
  const columns: Column<AuditLogRecord>[] = [
    {
      key: 'createdAt',
      header: 'Timestamp',
      className: 'font-mono text-slate-500',
      render: (v) => (v ? new Date(String(v)).toLocaleString() : '—'),
    },
    {
      key: 'userId',
      header: 'Operator',
      render: (v) => (v ? `User #${v}` : 'System'),
    },
    {
      key: 'action',
      header: 'Action',
      className: 'capitalize font-bold text-slate-700',
    },
    {
      key: 'entityType',
      header: 'Entity Type',
      className: 'font-mono text-slate-500 font-semibold',
    },
    {
      key: 'entityId',
      header: 'Entity ID',
      className: 'font-mono text-slate-400',
      render: (v) => (v ? `#${v}` : '—'),
    },
    {
      key: 'ipAddress',
      header: 'IP Address',
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
            <Eye className="h-3.5 w-3.5 mr-1" /> View Diff
          </Button>
        </div>
      ),
    },
  ];

  if (!activeCompanyId) {
    return (
      <div className="space-y-6">
        <PageHeader title="Audit Logs" description="Read-only compliance audit history of database manipulations" />
        <ErrorState
          title="No active company"
          message="Please select a company from the sidebar before viewing audit logs."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Logs"
        description="Read-only compliance logging of all model calculations, scenario saves, and manual ledger adjustments"
      />

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-5">
        {/* Filters Panel */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label htmlFor="log-search" className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Search className="h-2.5 w-2.5" /> Search Description / User ID
            </label>
            <input
              id="log-search"
              type="search"
              placeholder="Search by keywords..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 rounded border border-slate-200 bg-white px-2.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="log-entity" className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Entity Type</label>
            <select
              id="log-entity"
              value={entityTypeFilter}
              onChange={(e) => setEntityTypeFilter(e.target.value)}
              className="h-8 rounded border border-slate-200 bg-white px-2 text-xs text-slate-700 focus:outline-none font-semibold"
            >
              <option value="">All Entities</option>
              <option value="BudgetCycle">Budget Cycle</option>
              <option value="ForecastCycle">Forecast Cycle</option>
              <option value="Scenario">Scenario Model</option>
              <option value="ActualImport">Actual Data Import</option>
              <option value="Account">Chart Account</option>
              <option value="Site">Company Site</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="log-action" className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Action</label>
            <select
              id="log-action"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="h-8 rounded border border-slate-200 bg-white px-2 text-xs text-slate-700 focus:outline-none font-semibold"
            >
              <option value="">All Actions</option>
              <option value="create">Create</option>
              <option value="update">Update</option>
              <option value="delete">Delete</option>
              <option value="status_change">Status Change</option>
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
            <History className="h-4 w-4 text-emerald-600" /> {total} Records Tracked
          </span>
          <Button size="sm" variant="outline" onClick={fetchLogs} className="flex items-center gap-1">
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Refresh logs
          </Button>
        </div>

        {/* Data Table */}
        {isLoading ? (
          <LoadingState rows={8} message="Fetching audit logs history..." />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchLogs} />
        ) : logs.length === 0 ? (
          <EmptyState
            icon={<History className="h-6 w-6 text-slate-300" />}
            title="No logs retrieved"
            description="Adjust your search keywords or entity filters."
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
          title="Audit Log Detail View"
          size="lg"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs">
              <div>
                <span className="font-bold text-slate-400 block uppercase text-[9px] tracking-wider">Log Record ID</span>
                <span className="font-semibold text-slate-700 font-mono">#{selectedLog.id}</span>
              </div>
              <div>
                <span className="font-bold text-slate-400 block uppercase text-[9px] tracking-wider">Operator</span>
                <span className="font-semibold text-slate-700">{selectedLog.userId ? `User #${selectedLog.userId}` : 'System'}</span>
              </div>
              <div>
                <span className="font-bold text-slate-400 block uppercase text-[9px] tracking-wider">IP Address</span>
                <span className="font-semibold text-slate-700 font-mono">{selectedLog.ipAddress || '—'}</span>
              </div>
              <div>
                <span className="font-bold text-slate-400 block uppercase text-[9px] tracking-wider">Timestamp</span>
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
                  <FileText className="h-3.5 w-3.5" /> Before Change (Old Values)
                </h4>
                <div className="border border-slate-200 rounded-xl bg-slate-900 p-4 h-[250px] overflow-y-auto font-mono text-[10px] text-emerald-400">
                  {selectedLog.oldValues ? (
                    <pre className="whitespace-pre-wrap">{JSON.stringify(selectedLog.oldValues, null, 2)}</pre>
                  ) : (
                    <span className="text-slate-500 italic">No attributes recorded (Create operation)</span>
                  )}
                </div>
              </div>

              {/* New Values */}
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-slate-500 flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5" /> After Change (New Values)
                </h4>
                <div className="border border-slate-200 rounded-xl bg-slate-900 p-4 h-[250px] overflow-y-auto font-mono text-[10px] text-emerald-400">
                  {selectedLog.newValues ? (
                    <pre className="whitespace-pre-wrap">{JSON.stringify(selectedLog.newValues, null, 2)}</pre>
                  ) : (
                    <span className="text-slate-500 italic">No attributes recorded (Delete operation)</span>
                  )}
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4 flex justify-end">
              <Button size="sm" onClick={() => setSelectedLog(null)}>
                Close Detail
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
