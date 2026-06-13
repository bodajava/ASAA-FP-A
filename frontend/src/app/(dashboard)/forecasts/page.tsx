'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Search,
  Trash2,
  Pencil,
  ChevronDown,
  ChevronRight,
  Eye,
  Settings,
  Calendar,
  Layers,
  ArrowLeft,
  DollarSign,
  Loader2,
  Upload,
  CheckCircle2
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { TableWrapper, type Column } from '@/components/ui/table-wrapper';
import { Pagination } from '@/components/ui/pagination';
import { LoadingState, EmptyState, ErrorState } from '@/components/ui/feedback-states';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Modal } from '@/components/ui/modal';
import { ImportModal } from '@/components/import-modal';
import { useAuth } from '@/lib/auth-context';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';
import { useToast } from '@/components/ui/toast';
import type {
  ForecastCycle,
  ForecastLine,
  Account,
  Site,
  CostCenter,
  Product,
  Material,
  Customer,
  Scenario,
  CycleStatus,
  ForecastMethod,
  CreateForecastCyclePayload,
  CreateForecastLinePayload,
  PaginatedResponse,
} from '@/types/api';
import axios from 'axios';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
interface AccountNode {
  account: Account;
  children: AccountNode[];
  lines: ForecastLine[];
  directTotal: number;
  rolledUpTotal: number;
}

function buildAccountTree(accounts: Account[], lines: ForecastLine[]): AccountNode[] {
  const accountMap = new Map<string, AccountNode>();
  accounts.forEach((acc) => {
    accountMap.set(acc.id, {
      account: acc,
      children: [],
      lines: lines.filter((l) => l.accountId === acc.id),
      directTotal: lines
        .filter((l) => l.accountId === acc.id)
        .reduce((sum, l) => sum + Number(l.amount), 0),
      rolledUpTotal: 0,
    });
  });

  const roots: AccountNode[] = [];
  accounts.forEach((acc) => {
    const node = accountMap.get(acc.id)!;
    if (acc.parentId && accountMap.has(acc.parentId)) {
      const parentNode = accountMap.get(acc.parentId)!;
      parentNode.children.push(node);
    } else {
      roots.push(node);
    }
  });

  function calculateRollups(node: AccountNode): number {
    let sum = node.directTotal;
    node.children.forEach((child) => {
      sum += calculateRollups(child);
    });
    node.rolledUpTotal = sum;
    return sum;
  }

  roots.forEach((root) => calculateRollups(root));
  return roots;
}

export default function ForecastsPage() {
  const { activeCompanyId } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();

  // List view states
  const [cycles, setCycles] = useState<ForecastCycle[]>([]);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Selected Detail View
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);
  const [selectedCycle, setSelectedCycle] = useState<ForecastCycle | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [_detailError, setDetailError] = useState<string | null>(null);

  // Master Data
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);

  // Modals & Action states
  const [formOpen, setFormOpen] = useState(false);
  const [editCycle, setEditCycle] = useState<ForecastCycle | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteConfirmCycle, setDeleteConfirmCycle] = useState<ForecastCycle | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  // Expanded accounts tree list
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  // ---------------------------------------------------------------------------
  // Load List of Forecast Cycles
  // ---------------------------------------------------------------------------
  const fetchCycles = useCallback(async () => {
    if (!activeCompanyId) return;
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '10',
      });
      if (search.trim()) {
        params.set('search', search.trim());
      }
      const res = await apiGet<PaginatedResponse<ForecastCycle>>(`/forecasts?${params.toString()}`);
      setCycles(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch forecast cycles.');
    } finally {
      setIsLoading(false);
    }
  }, [activeCompanyId, page, search]);

  useEffect(() => {
    void Promise.resolve().then(() => void fetchCycles());
  }, [fetchCycles]);

  // ---------------------------------------------------------------------------
  // Load Master Data
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!activeCompanyId) return;
    async function loadMasterData() {
      try {
        const [accs, sts, ccs, prds, mats, custs, scens] = await Promise.all([
          apiGet<PaginatedResponse<Account>>('/accounts?limit=1000').then((r) => r.data),
          apiGet<PaginatedResponse<Site>>('/sites?limit=1000').then((r) => r.data),
          apiGet<PaginatedResponse<CostCenter>>('/cost-centers?limit=1000').then((r) => r.data),
          apiGet<PaginatedResponse<Product>>('/products?limit=1000').then((r) => r.data),
          apiGet<PaginatedResponse<Material>>('/materials?limit=1000').then((r) => r.data),
          apiGet<PaginatedResponse<Customer>>('/customers?limit=1000').then((r) => r.data),
          apiGet<PaginatedResponse<Scenario>>('/scenarios?limit=1000').then((r) => r.data),
        ]);
        setAccounts(accs);
        setSites(sts);
        setCostCenters(ccs);
        setProducts(prds);
        setMaterials(mats);
        setCustomers(custs);
        setScenarios(scens);
      } catch {
        // Handle master data load failure silently
      }
    }
    void loadMasterData();
  }, [activeCompanyId]);

  // ---------------------------------------------------------------------------
  // Load Single Cycle Details
  // ---------------------------------------------------------------------------
  const fetchCycleDetail = useCallback(async (id: string) => {
    setIsLoadingDetail(true);
    setDetailError(null);
    try {
      const res = await apiGet<ForecastCycle>(`/forecasts/${id}`);
      setSelectedCycle(res);
    } catch (err: unknown) {
      setDetailError(err instanceof Error ? err.message : 'Failed to fetch details.');
    } finally {
      setIsLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (!active) return;
      if (selectedCycleId) {
        void fetchCycleDetail(selectedCycleId);
      } else {
        setSelectedCycle(null);
      }
    });
    return () => {
      active = false;
    };
  }, [selectedCycleId, fetchCycleDetail]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------
  async function handleStatusTransition(id: string, targetStatus: CycleStatus) {
    setIsTransitioning(true);
    try {
      await apiPatch<ForecastCycle>(`/forecasts/${id}/status`, { status: targetStatus });
      toastSuccess(`Forecast status updated to ${targetStatus} successfully.`);
      void fetchCycles();
      if (selectedCycleId === id) {
        void fetchCycleDetail(id);
      }
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err)
        ? ((err.response?.data as { message?: string })?.message ?? 'Failed to update status')
        : 'Failed to update status';
      toastError(msg);
    } finally {
      setIsTransitioning(false);
    }
  }

  async function handleGenerateForecast(id: string) {
    setIsGenerating(true);
    try {
      await apiPost<ForecastCycle>(`/forecasts/${id}/generate`, {});
      toastSuccess('Forecast lines generated successfully.');
      void fetchCycles();
      void fetchCycleDetail(id);
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err)
        ? ((err.response?.data as { message?: string })?.message ?? 'Failed to generate forecast lines')
        : 'Failed to generate forecast lines';
      toastError(msg);
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleDeleteCycle() {
    if (!deleteConfirmCycle) return;
    setDeleteLoading(true);
    try {
      await apiDelete<ForecastCycle>(`/forecasts/${deleteConfirmCycle.id}`);
      toastSuccess('Forecast deleted successfully.');
      setDeleteConfirmCycle(null);
      void fetchCycles();
      if (selectedCycleId === deleteConfirmCycle.id) {
        setSelectedCycleId(null);
      }
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err)
        ? ((err.response?.data as { message?: string })?.message ?? 'Failed to delete forecast')
        : 'Failed to delete forecast';
      toastError(msg);
    } finally {
      setDeleteLoading(false);
    }
  }

  function getStatusVariant(status: CycleStatus) {
    switch (status) {
      case 'approved':
        return 'success';
      case 'submitted':
        return 'info';
      case 'rejected':
        return 'danger';
      case 'locked':
        return 'default';
      default:
        return 'warning';
    }
  }

  // ---------------------------------------------------------------------------
  // Nested Tree Rendering
  // ---------------------------------------------------------------------------
  const toggleNode = (nodeId: string) => {
    setExpandedNodes((prev) => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };

  const renderAccountNode = (node: AccountNode, depth: number = 0) => {
    const isExpanded = expandedNodes[node.account.id] ?? false;
    const hasChildren = node.children.length > 0;
    const hasLines = node.lines.length > 0;

    return (
      <React.Fragment key={node.account.id}>
        <tr className="hover:bg-slate-50 border-b border-slate-100">
          <td className="px-4 py-2.5 font-mono text-xs font-semibold text-slate-500">
            <div className="flex items-center" style={{ paddingLeft: `${depth * 16}px` }}>
              {hasChildren ? (
                <button
                  onClick={() => toggleNode(node.account.id)}
                  className="mr-1.5 p-0.5 hover:bg-slate-100 rounded text-slate-400"
                  aria-label={isExpanded ? 'Collapse' : 'Expand'}
                >
                  {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                </button>
              ) : (
                <span className="w-5" />
              )}
              {node.account.code}
            </div>
          </td>
          <td className="px-4 py-2.5 text-sm font-medium text-slate-700">
            {node.account.name}
          </td>
          <td className="px-4 py-2.5 text-xs text-slate-400 capitalize">
            {node.account.accountType}
          </td>
          <td className="px-4 py-2.5 text-right font-mono text-sm font-semibold text-slate-900">
            {node.rolledUpTotal > 0 ? `$${node.rolledUpTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
          </td>
          <td className="px-4 py-2.5 text-right font-mono text-xs text-slate-500">
            {node.directTotal > 0 ? `$${node.directTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
          </td>
        </tr>

        {isExpanded && hasLines && (
          <tr>
            <td colSpan={5} className="bg-slate-50/50 px-8 py-3">
              <div className="rounded-lg border border-slate-100 bg-white shadow-sm overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase">
                    <tr>
                      <th className="px-3 py-2 text-left">Month</th>
                      <th className="px-3 py-2 text-left">Site</th>
                      <th className="px-3 py-2 text-left">Cost Center</th>
                      <th className="px-3 py-2 text-left">Product / Customer / Material</th>
                      <th className="px-3 py-2 text-left">Driver Type</th>
                      <th className="px-3 py-2 text-right">Quantity</th>
                      <th className="px-3 py-2 text-right">Unit Price</th>
                      <th className="px-3 py-2 text-right">Amount</th>
                      <th className="px-3 py-2 text-left">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {node.lines.map((line) => {
                      const siteName = sites.find((s) => s.id === line.siteId)?.name ?? '—';
                      const ccName = costCenters.find((c) => c.id === line.costCenterId)?.name ?? '—';
                      const pName = products.find((p) => p.id === line.productId)?.name;
                      const cName = customers.find((c) => c.id === line.customerId)?.name;
                      const mName = materials.find((m) => m.id === line.materialId)?.name;
                      const refStr = [pName, cName, mName].filter(Boolean).join(' / ') || '—';

                      return (
                        <tr key={line.id} className="hover:bg-slate-50/50">
                          <td className="px-3 py-2 font-medium">Month {line.periodMonth}</td>
                          <td className="px-3 py-2 text-slate-600">{siteName}</td>
                          <td className="px-3 py-2 text-slate-600">{ccName}</td>
                          <td className="px-3 py-2 text-slate-600 max-w-[180px] truncate" title={refStr}>{refStr}</td>
                          <td className="px-3 py-2 text-slate-500 capitalize">{line.driverType ? line.driverType.replace('_', ' ') : '—'}</td>
                          <td className="px-3 py-2 text-right font-mono">{line.quantity > 0 ? line.quantity.toLocaleString() : '—'}</td>
                          <td className="px-3 py-2 text-right font-mono">{line.unitPrice > 0 ? `$${line.unitPrice.toFixed(2)}` : '—'}</td>
                          <td className="px-3 py-2 text-right font-mono font-semibold text-emerald-700">${line.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td className="px-3 py-2 text-slate-400 max-w-[150px] truncate" title={line.notes ?? ''}>{line.notes ?? '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </td>
          </tr>
        )}

        {isExpanded && node.children.map((child) => renderAccountNode(child, depth + 1))}
      </React.Fragment>
    );
  };

  // ---------------------------------------------------------------------------
  // Columns for List view
  // ---------------------------------------------------------------------------
  const columns: Column<ForecastCycle>[] = [
    { key: 'name', header: 'Name', render: (v, row) => (
      <button onClick={() => setSelectedCycleId(row.id)} className="font-semibold text-slate-800 hover:text-emerald-600 text-left transition-colors">
        {row.name}
      </button>
    )},
    { key: 'fiscalYear', header: 'Fiscal Year', className: 'font-semibold' },
    { key: 'basePeriod', header: 'Base Period', render: (v) => v ? new Date(String(v)).toLocaleDateString(undefined, { year: 'numeric', month: 'short' }) : '—' },
    { key: 'method', header: 'Method', render: (v) => <span className="capitalize">{String(v).replace('_', ' ')}</span> },
    { key: 'status', header: 'Status', render: (v) => (
      <Badge variant={getStatusVariant(v as CycleStatus)} className="capitalize">
        {String(v)}
      </Badge>
    )},
    {
      key: 'actions',
      header: '',
      className: 'w-32',
      render: (_, row) => {
        const canModify = row.status !== 'approved' && row.status !== 'locked';
        return (
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={() => setSelectedCycleId(row.id)}
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              aria-label="View Details"
            >
              <Eye className="h-4 w-4" />
            </button>
            {canModify && (
              <>
                <button
                  onClick={() => {
                    setEditCycle(row);
                    setFormOpen(true);
                  }}
                  className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Edit"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setDeleteConfirmCycle(row)}
                  className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                  aria-label="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        );
      }
    }
  ];

  if (!activeCompanyId) {
    return (
      <div className="space-y-6">
        <PageHeader title="Forecasts" description="Create and manage rolling and driver-based forecasts" />
        <ErrorState
          title="No active company"
          message="Please select a company from the sidebar before viewing forecasts."
        />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Main Rendering
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-6">
      {selectedCycle ? (
        // DETAIL VIEW
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedCycleId(null)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 shadow-sm"
              aria-label="Back to List"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <h1 className="text-xl font-bold text-slate-900">{selectedCycle.name}</h1>
            <Badge variant={getStatusVariant(selectedCycle.status)} className="capitalize ml-2">
              {selectedCycle.status}
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <Calendar className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Fiscal Year / Base Period</p>
                <p className="text-sm font-bold text-slate-700">
                  {selectedCycle.fiscalYear} ({new Date(selectedCycle.basePeriod).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })})
                </p>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <Layers className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Method</p>
                <p className="text-sm font-bold text-slate-700 capitalize">{selectedCycle.method.replace('_', ' ')}</p>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <Settings className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Linked Scenario</p>
                <p className="text-sm font-bold text-slate-700">
                  {scenarios.find((s) => s.id === selectedCycle.scenarioId)?.name ?? 'None'}
                </p>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <DollarSign className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Total forecasted</p>
                <p className="text-sm font-bold text-slate-700">
                  ${(selectedCycle.forecastLines ?? []).reduce((sum, l) => sum + Number(l.amount), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>

          {/* Status actions panel */}
          <div className="flex flex-wrap gap-2 items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-500 font-medium">Transition Status:</span>
              <div className="flex gap-2">
                {selectedCycle.status === 'draft' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleStatusTransition(selectedCycle.id, 'submitted')}
                    disabled={isTransitioning}
                  >
                    {isTransitioning && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                    Submit for Approval
                  </Button>
                )}
                {selectedCycle.status === 'submitted' && (
                  <>
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => handleStatusTransition(selectedCycle.id, 'approved')}
                      disabled={isTransitioning}
                    >
                      {isTransitioning && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                      اعتماد (Approve)
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleStatusTransition(selectedCycle.id, 'rejected')}
                      disabled={isTransitioning}
                    >
                      {isTransitioning && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                      Reject
                    </Button>
                  </>
                )}
                {(selectedCycle.status === 'approved' || selectedCycle.status === 'locked') && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <div>
                      <span className="text-xs font-bold text-emerald-800 block">
                        {selectedCycle.status === 'approved'
                          ? 'تم الاعتماد — النسخة نهائية'
                          : 'مقفول — النسخة نهائية'}
                      </span>
                      <span className="text-[10px] text-emerald-600">
                        {selectedCycle.status === 'approved'
                          ? 'تم اعتماد الفوركاست من المدير المالي. النسخة المعتمدة نهائية ولا يمكن تعديلها.'
                          : 'الفوركاست مقفول ولا يمكن تعديله.'}
                      </span>
                    </div>
                  </div>
                )}
                {selectedCycle.status === 'rejected' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleStatusTransition(selectedCycle.id, 'draft')}
                    disabled={isTransitioning}
                  >
                    {isTransitioning && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                    Revert to Draft
                  </Button>
                )}
              </div>
            </div>
            {selectedCycle.status !== 'approved' && selectedCycle.status !== 'locked' && (
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                onClick={() => handleGenerateForecast(selectedCycle.id)}
                disabled={isGenerating}
              >
                {isGenerating && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                Generate Forecast Lines
              </Button>
            )}
          </div>

          {/* Hierarchical Lines UI */}
          <div className="space-y-3">
            <h3 className="text-base font-bold text-slate-900">Chart of Accounts &amp; Forecast Lines</h3>
            {isLoadingDetail ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
              </div>
            ) : selectedCycle.forecastLines?.length === 0 ? (
              <EmptyState title="No lines defined" description="Edit this cycle to add forecast lines." />
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-xs">
                    <tr>
                      <th className="px-4 py-3 text-left">Account Code</th>
                      <th className="px-4 py-3 text-left">Account Name</th>
                      <th className="px-4 py-3 text-left">Type</th>
                      <th className="px-4 py-3 text-right">Rolled Up Total</th>
                      <th className="px-4 py-3 text-right">Direct Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {buildAccountTree(accounts, selectedCycle.forecastLines ?? []).map((root) =>
                      renderAccountNode(root, 0)
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        // LIST VIEW
        <div className="space-y-5">
          <PageHeader title="Forecasts" description="Create and manage forecast cycles.">
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setImportOpen(true)} id="forecast-lines-import-btn">
                <Upload className="h-4 w-4" /> Import Forecast Lines
              </Button>
              <Button size="sm" onClick={() => {
                setEditCycle(null);
                setFormOpen(true);
              }} id="forecasts-create-btn">
                <Plus className="h-4 w-4" /> Add Forecast
              </Button>
            </div>
          </PageHeader>

          {/* Search bar */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                placeholder="Search forecasts…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-4 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <p className="text-sm text-slate-400">{total} records</p>
          </div>

          {/* List Table */}
          {isLoading ? (
            <LoadingState rows={6} message="Loading forecasts..." />
          ) : error ? (
            <ErrorState message={error} onRetry={fetchCycles} />
          ) : cycles.length === 0 ? (
            <EmptyState
              title="No forecasts yet"
              description="Create a new forecast cycle to start rolling analysis."
              action={
                <Button size="sm" onClick={() => {
                  setEditCycle(null);
                  setFormOpen(true);
                }}>
                  <Plus className="h-4 w-4" /> Add Forecast
                </Button>
              }
            />
          ) : (
            <>
              <TableWrapper<ForecastCycle>
                data={cycles}
                columns={columns}
                keyExtractor={(row) => row.id}
              />
              <Pagination
                page={page}
                totalPages={totalPages}
                total={total}
                limit={10}
                onPageChange={setPage}
              />
            </>
          )}
        </div>
      )}

      {/* CREATE/EDIT CYCLE FORM MODAL */}
      {formOpen && (
        <ForecastFormModal
          item={editCycle}
          accounts={accounts}
          sites={sites}
          costCenters={costCenters}
          products={products}
          materials={materials}
          customers={customers}
          scenarios={scenarios}
          onClose={() => {
            setFormOpen(false);
            setEditCycle(null);
          }}
          onSave={async (payload) => {
            setFormLoading(true);
            setFormError(null);
            try {
              if (editCycle) {
                await apiPatch<ForecastCycle>(`/forecasts/${editCycle.id}`, payload);
                toastSuccess('Forecast updated successfully.');
              } else {
                await apiPost<ForecastCycle>('/forecasts', payload);
                toastSuccess('Forecast created successfully.');
              }
              setFormOpen(false);
              setEditCycle(null);
              void fetchCycles();
              if (selectedCycleId) {
                void fetchCycleDetail(selectedCycleId);
              }
            } catch (err: unknown) {
              const msg = axios.isAxiosError(err)
                ? ((err.response?.data as { message?: string })?.message ?? 'Failed to save forecast cycle')
                : 'Failed to save forecast cycle';
              setFormError(msg);
              toastError(msg);
            } finally {
              setFormLoading(false);
            }
          }}
          isLoading={formLoading}
          error={formError}
        />
      )}

      {/* DELETE CONFIRM DIALOG */}
      <ConfirmDialog
        open={deleteConfirmCycle !== null}
        message={`Are you sure you want to delete the forecast cycle "${deleteConfirmCycle?.name}"? All associated lines will be deleted. This action cannot be undone.`}
        isLoading={deleteLoading}
        onConfirm={handleDeleteCycle}
        onCancel={() => setDeleteConfirmCycle(null)}
      />

      {/* IMPORT FORECAST LINES */}
      {importOpen && (
        <ImportModal
          module="forecast-lines"
          moduleLabel="Forecast Lines"
          onClose={() => setImportOpen(false)}
          onSuccess={() => {
            void fetchCycles();
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SUB-COMPONENT: FORECAST FORM MODAL WITH EDITABLE LINES
// ---------------------------------------------------------------------------
interface ForecastFormModalProps {
  item: ForecastCycle | null;
  accounts: Account[];
  sites: Site[];
  costCenters: CostCenter[];
  products: Product[];
  materials: Material[];
  customers: Customer[];
  scenarios: Scenario[];
  onClose: () => void;
  onSave: (payload: CreateForecastCyclePayload) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

function ForecastFormModal({
  item,
  accounts,
  sites,
  costCenters,
  products,
  materials: _materials,
  customers: _customers,
  scenarios,
  onClose,
  onSave,
  isLoading,
  error,
}: ForecastFormModalProps) {
  const [name, setName] = useState(item?.name ?? '');
  const [fiscalYear, setFiscalYear] = useState(item?.fiscalYear?.toString() ?? '2026');
  const [basePeriod, setBasePeriod] = useState(
    item?.basePeriod ? new Date(item.basePeriod).toISOString().split('T')[0] : '2026-07-01'
  );
  const [method, setMethod] = useState<ForecastMethod>(item?.method ?? 'manual');
  const [scenarioId, setScenarioId] = useState(item?.scenarioId ?? '');

  // Edit cycle lines
  const [lines, setLines] = useState<CreateForecastLinePayload[]>([]);
  const [isLoadingLines, setIsLoadingLines] = useState(false);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (!active) return;
      if (item) {
        setIsLoadingLines(true);
        apiGet<ForecastCycle>(`/forecasts/${item.id}`)
          .then((res) => {
            if (!active) return;
            if (res.forecastLines) {
              setLines(
                res.forecastLines.map((l) => ({
                  accountId: l.accountId,
                  siteId: l.siteId ?? undefined,
                  costCenterId: l.costCenterId ?? undefined,
                  productId: l.productId ?? undefined,
                  materialId: l.materialId ?? undefined,
                  customerId: l.customerId ?? undefined,
                  periodMonth: l.periodMonth,
                  quantity: l.quantity,
                  unitPrice: l.unitPrice,
                  amount: l.amount,
                  driverType: l.driverType ?? undefined,
                  notes: l.notes ?? undefined,
                }))
              );
            }
          })
          .catch(() => {})
          .finally(() => {
            if (active) setIsLoadingLines(false);
          });
      } else {
        setLines([]);
      }
    });
    return () => {
      active = false;
    };
  }, [item]);

  function addLine() {
    setLines((prev) => [
      ...prev,
      {
        accountId: accounts[0]?.id ?? '',
        periodMonth: 1,
        quantity: 0,
        unitPrice: 0,
        amount: 0,
        driverType: '',
        notes: '',
      },
    ]);
  }

  function removeLine(idx: number) {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateLineField<K extends keyof CreateForecastLinePayload>(
    idx: number,
    key: K,
    val: CreateForecastLinePayload[K]
  ) {
    setLines((prev) =>
      prev.map((line, i) => {
        if (i === idx) {
          const updated = { ...line, [key]: val };
          // Auto-calculate amount
          if (key === 'quantity' || key === 'unitPrice') {
            const q = Number(updated.quantity ?? 0);
            const u = Number(updated.unitPrice ?? 0);
            if (q > 0 && u > 0) {
              updated.amount = q * u;
            }
          }
          return updated;
        }
        return line;
      })
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const payload: CreateForecastCyclePayload = {
      name: name.trim(),
      fiscalYear: Number(fiscalYear),
      basePeriod: new Date(basePeriod).toISOString(),
      method,
      scenarioId: scenarioId || undefined,
      forecastLines: lines.map((l) => ({
        accountId: l.accountId,
        siteId: l.siteId || undefined,
        costCenterId: l.costCenterId || undefined,
        productId: l.productId || undefined,
        materialId: l.materialId || undefined,
        customerId: l.customerId || undefined,
        periodMonth: Number(l.periodMonth),
        quantity: l.quantity ? Number(l.quantity) : undefined,
        unitPrice: l.unitPrice ? Number(l.unitPrice) : undefined,
        amount: Number(l.amount),
        driverType: l.driverType || undefined,
        notes: l.notes || undefined,
      })),
    };
    await onSave(payload);
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={item ? 'Edit Forecast Cycle' : 'Create Forecast Cycle'}
      description="Define forecasting parameters and set monthly forecast items."
      size="lg"
      className="max-h-[90vh] flex flex-col"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 overflow-y-auto max-h-[70vh] pr-1">
        {error && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            id="forecast-name"
            label="Forecast Name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Q3 Rolling Forecast 2026"
          />
          <Input
            id="forecast-year"
            label="Fiscal Year"
            type="number"
            required
            value={fiscalYear}
            onChange={(e) => setFiscalYear(e.target.value)}
            placeholder="e.g. 2026"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            id="forecast-base-period"
            label="Base Period Start"
            type="date"
            required
            value={basePeriod}
            onChange={(e) => setBasePeriod(e.target.value)}
          />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="forecast-method" className="text-sm font-medium text-slate-700">Method</label>
            <select
              id="forecast-method"
              value={method}
              onChange={(e) => setMethod(e.target.value as ForecastMethod)}
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="manual">Manual</option>
              <option value="rolling">Rolling (Budget Carry)</option>
              <option value="driver_based">Driver Based (Growth)</option>
              <option value="ai_assisted">AI Statistical Engine</option>
              <option value="seasonal_adjusted">Seasonal Adjusted (Egypt Market)</option>
              <option value="hybrid">Hybrid Ensemble (Most Accurate)</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="forecast-scenario" className="text-sm font-medium text-slate-700">Link Scenario</label>
            <select
              id="forecast-scenario"
              value={scenarioId}
              onChange={(e) => setScenarioId(e.target.value)}
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">None</option>
              {scenarios.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Dynamic lines subform */}
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-700">Forecast Lines</span>
            <Button variant="outline" size="sm" type="button" onClick={addLine}>
              <Plus className="h-3.5 w-3.5" /> Add Line
            </Button>
          </div>

          {isLoadingLines ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
            </div>
          ) : lines.length === 0 ? (
            <p className="text-center text-xs text-slate-400 py-4">No lines added yet. Click &ldquo;Add Line&rdquo;.</p>
          ) : (
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
              {lines.map((line, idx) => (
                <div key={idx} className="relative rounded-lg border border-slate-200 bg-white p-3 shadow-sm space-y-3">
                  <button
                    type="button"
                    onClick={() => removeLine(idx)}
                    className="absolute right-2 top-2 rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                    aria-label="Remove line"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pr-6">
                    <div className="flex flex-col gap-1">
                      <label htmlFor={`f-line-acc-${idx}`} className="text-xs font-semibold text-slate-500">Account *</label>
                      <select
                        id={`f-line-acc-${idx}`}
                        value={line.accountId}
                        onChange={(e) => updateLineField(idx, 'accountId', e.target.value)}
                        className="h-8 rounded border border-slate-200 bg-white px-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        required
                      >
                        {accounts.map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            [{acc.code}] {acc.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label htmlFor={`f-line-month-${idx}`} className="text-xs font-semibold text-slate-500">Month *</label>
                      <select
                        id={`f-line-month-${idx}`}
                        value={line.periodMonth}
                        onChange={(e) => updateLineField(idx, 'periodMonth', Number(e.target.value))}
                        className="h-8 rounded border border-slate-200 bg-white px-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        required
                      >
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                          <option key={m} value={m}>Month {m}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label htmlFor={`f-line-site-${idx}`} className="text-xs font-semibold text-slate-500">Site</label>
                      <select
                        id={`f-line-site-${idx}`}
                        value={line.siteId ?? ''}
                        onChange={(e) => updateLineField(idx, 'siteId', e.target.value || undefined)}
                        className="h-8 rounded border border-slate-200 bg-white px-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      >
                        <option value="">—</option>
                        {sites.map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="flex flex-col gap-1">
                      <label htmlFor={`f-line-qty-${idx}`} className="text-xs font-semibold text-slate-500">Quantity</label>
                      <input
                        id={`f-line-qty-${idx}`}
                        type="number"
                        min="0"
                        value={line.quantity ?? ''}
                        onChange={(e) => updateLineField(idx, 'quantity', e.target.value ? Number(e.target.value) : undefined)}
                        className="h-8 rounded border border-slate-200 bg-white px-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label htmlFor={`f-line-price-${idx}`} className="text-xs font-semibold text-slate-500">Unit Price</label>
                      <input
                        id={`f-line-price-${idx}`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.unitPrice ?? ''}
                        onChange={(e) => updateLineField(idx, 'unitPrice', e.target.value ? Number(e.target.value) : undefined)}
                        className="h-8 rounded border border-slate-200 bg-white px-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label htmlFor={`f-line-amt-${idx}`} className="text-xs font-semibold text-slate-500">Amount *</label>
                      <input
                        id={`f-line-amt-${idx}`}
                        type="number"
                        min="0"
                        required
                        value={line.amount}
                        onChange={(e) => updateLineField(idx, 'amount', Number(e.target.value))}
                        className="h-8 rounded border border-slate-200 bg-white px-2 text-xs text-slate-700 font-semibold text-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label htmlFor={`f-line-cc-${idx}`} className="text-xs font-semibold text-slate-500">Cost Center</label>
                      <select
                        id={`f-line-cc-${idx}`}
                        value={line.costCenterId ?? ''}
                        onChange={(e) => updateLineField(idx, 'costCenterId', e.target.value || undefined)}
                        className="h-8 rounded border border-slate-200 bg-white px-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      >
                        <option value="">—</option>
                        {costCenters.map((cc) => (
                          <option key={cc.id} value={cc.id}>{cc.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="flex flex-col gap-1 col-span-2">
                      <label htmlFor={`f-line-notes-${idx}`} className="text-xs font-semibold text-slate-500">Notes</label>
                      <input
                        id={`f-line-notes-${idx}`}
                        type="text"
                        placeholder="Additional details..."
                        value={line.notes ?? ''}
                        onChange={(e) => updateLineField(idx, 'notes', e.target.value)}
                        className="h-8 rounded border border-slate-200 bg-white px-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label htmlFor={`f-line-driver-${idx}`} className="text-xs font-semibold text-slate-500">Driver Type</label>
                      <input
                        id={`f-line-driver-${idx}`}
                        type="text"
                        placeholder="e.g. headcount, units_sold"
                        value={line.driverType ?? ''}
                        onChange={(e) => updateLineField(idx, 'driverType', e.target.value)}
                        className="h-8 rounded border border-slate-200 bg-white px-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label htmlFor={`f-line-prod-${idx}`} className="text-xs font-semibold text-slate-500">Product</label>
                      <select
                        id={`f-line-prod-${idx}`}
                        value={line.productId ?? ''}
                        onChange={(e) => updateLineField(idx, 'productId', e.target.value || undefined)}
                        className="h-8 rounded border border-slate-200 bg-white px-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      >
                        <option value="">—</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Button variant="outline" size="sm" type="button" onClick={onClose}>Cancel</Button>
          <Button size="sm" type="submit" isLoading={isLoading} disabled={isLoadingLines}>
            {item ? 'Save Changes' : 'Create Forecast'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
