'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle, XCircle, Shield, AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TableWrapper, type Column } from '@/components/ui/table-wrapper';
import { Pagination } from '@/components/ui/pagination';
import { Modal } from '@/components/ui/modal';
import { LoadingState, EmptyState, ErrorState } from '@/components/ui/feedback-states';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/toast';
import { apiGet, apiPatch } from '@/lib/api';
import type { PaginatedResponse, Approval } from '@/types/api';

type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

const STATUS_TABS: { label: string; value: ApprovalStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
];

function approvalBadge(status: string) {
  const s = status.toLowerCase();
  const variant: 'warning' | 'success' | 'danger' | 'muted' =
    s === 'pending' ? 'warning'
    : s === 'approved' ? 'success'
    : s === 'rejected' ? 'danger'
    : 'muted';
  return <Badge variant={variant} className="capitalize">{status}</Badge>;
}

export default function ApprovalsPage() {
  const { activeCompanyId } = useAuth();
  const { error: toastError } = useToast();

  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<ApprovalStatus | 'all'>('all');

  // Approve/Reject modals
  const [actionModal, setActionModal] = useState<{
    approval: Approval;
    action: 'approve' | 'reject';
  } | null>(null);
  const [actionComment, setActionComment] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchApprovals = useCallback(async () => {
    if (!activeCompanyId) return;
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '10');
      if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      }
      const res = await apiGet<PaginatedResponse<Approval>>(`/approvals?${params.toString()}`, {
        bypassCache: true,
      });
      setApprovals(res.data ?? []);
      setTotal(res.total ?? 0);
      setTotalPages(res.totalPages ?? 1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load approvals.';
      setError(msg);
      toastError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [activeCompanyId, page, statusFilter, toastError]);

  useEffect(() => {
    void Promise.resolve().then(() => void fetchApprovals());
  }, [fetchApprovals]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  async function handleAction() {
    if (!actionModal) return;
    setActionLoading(true);
    try {
      await apiPatch<Approval>(`/approvals/${actionModal.approval.id}/status`, {
        action: actionModal.action,
        comments: actionComment || undefined,
      });
      setActionModal(null);
      setActionComment('');
      void fetchApprovals();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Action failed.';
      toastError(msg);
    } finally {
      setActionLoading(false);
    }
  }

  const columns: Column<Approval>[] = [
    {
      key: 'entityType',
      header: 'Entity Type',
      className: 'font-semibold',
      render: (v) => {
        const type = String(v);
        const icon = type.toLowerCase().includes('budget') ? '💰' : '📊';
        return <span>{icon} {type}</span>;
      },
    },
    { key: 'entityId', header: 'Entity ID', className: 'font-mono text-slate-500' },
    {
      key: 'status',
      header: 'Status',
      render: (v) => approvalBadge(String(v)),
    },
    {
      key: 'requestedBy',
      header: 'Requested By',
      render: (v) => String(v || '—'),
    },
    {
      key: 'createdAt',
      header: 'Created At',
      render: (v) => new Date(String(v)).toLocaleDateString(),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-32',
      render: (_, row) => {
        if (row.status !== 'pending') return null;
        return (
          <div className="flex items-center gap-1">
            <button
              onClick={() => { setActionModal({ approval: row, action: 'approve' }); setActionComment(''); }}
              className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50"
              title="Approve"
            >
              <CheckCircle className="h-4 w-4" />
            </button>
            <button
              onClick={() => { setActionModal({ approval: row, action: 'reject' }); setActionComment(''); }}
              className="rounded-lg p-1.5 text-red-600 hover:bg-red-50"
              title="Reject"
            >
              <XCircle className="h-4 w-4" />
            </button>
          </div>
        );
      },
    },
  ];

  if (!activeCompanyId) {
    return (
      <div className="space-y-6">
        <PageHeader title="Approvals" description="Review and manage approval requests" />
        <ErrorState
          title="No active company"
          message="Please select a company from the sidebar."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Approvals"
        description="Review budget cycle, forecast cycle, and other pending approval requests"
      >
        <Button size="sm" variant="outline" onClick={fetchApprovals} className="flex items-center gap-1">
          <AlertTriangle className="h-3.5 w-3.5" /> Refresh
        </Button>
      </PageHeader>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 pb-1">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              statusFilter === tab.value
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <LoadingState rows={6} message="Loading approvals..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchApprovals} />
      ) : approvals.length === 0 ? (
        <EmptyState
          icon={<Shield className="h-6 w-6 text-slate-300" />}
          title="No approvals found"
          description={
            statusFilter === 'all'
              ? 'No approval requests have been created yet.'
              : `No ${statusFilter} approval requests.`
          }
        />
      ) : (
        <div className="space-y-4">
          <TableWrapper
            data={approvals}
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

      {/* Approve / Reject Modal */}
      {actionModal && (
        <Modal
          open
          onClose={() => { setActionModal(null); setActionComment(''); }}
          title={actionModal.action === 'approve' ? 'Confirm Approval' : 'Reject Request'}
          description={
            actionModal.action === 'approve'
              ? `Approve the ${actionModal.approval.entityType} request (ID: ${actionModal.approval.entityId})?`
              : `Provide a reason for rejecting the ${actionModal.approval.entityType} request (ID: ${actionModal.approval.entityId}).`
          }
          footer={
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => { setActionModal(null); setActionComment(''); }}>
                Cancel
              </Button>
              <Button
                variant={actionModal.action === 'approve' ? 'primary' : 'danger'}
                size="sm"
                isLoading={actionLoading}
                onClick={handleAction}
                disabled={actionModal.action === 'reject' && !actionComment.trim()}
              >
                {actionModal.action === 'approve' ? 'Approve' : 'Reject'}
              </Button>
            </div>
          }
        >
          {actionModal.action === 'reject' && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="reject-comment" className="text-xs font-semibold text-slate-500">
                Reason (required)
              </label>
              <textarea
                id="reject-comment"
                value={actionComment}
                onChange={(e) => setActionComment(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-red-500 resize-none"
                placeholder="Explain why this request is being rejected..."
              />
            </div>
          )}
          {actionModal.action === 'approve' && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="approve-comment" className="text-xs font-semibold text-slate-500">
                Comment (optional)
              </label>
              <textarea
                id="approve-comment"
                value={actionComment}
                onChange={(e) => setActionComment(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
                placeholder="Add a note..."
              />
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
