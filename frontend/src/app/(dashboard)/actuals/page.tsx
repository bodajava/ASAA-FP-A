'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Upload,
  Search,
  AlertTriangle,
  Eye,
  Trash2,
  Calendar,
  Layers,
  FileSpreadsheet,
  ArrowLeft,
  Clock
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
import { useAuth } from '@/lib/auth-context';
import { apiGet, apiPost, apiDelete } from '@/lib/api';
import { useToast } from '@/components/ui/toast';
import { getStatusVariant, SOURCE_SYSTEMS, IMPORT_TYPES, getCurrentFiscalYear } from '@/lib/constants';
import type {
  ActualImport,
  ImportSourceSystem,
  ImportType,
  ImportStatus,
  ImportMapping,
  CreateActualImportPayload,
  PreviewActualImportPayload,
  MappedRowResult,
  Account,
  Site,
  CostCenter,
  Product,
  Material,
  Customer,
  PaginatedResponse,
} from '@/types/api';
import axios from 'axios';
import { useI18n } from '@/lib/i18n/i18n-context';
import { useTranslateApi } from '@/lib/i18n/translate-api';

export default function ActualsPage() {
  const { activeCompanyId } = useAuth();
  const { success: toastSuccess, error: toastError, validation: toastValidation } = useToast();
  const { t } = useI18n();
  const { tSourceSystem, tImportType } = useTranslateApi();

  // List view states
  const [imports, setImports] = useState<ActualImport[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Selected Detail View
  const [selectedImportId, setSelectedImportId] = useState<string | null>(null);
  const [selectedImport, setSelectedImport] = useState<ActualImport | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // Master Data
  const [mappings, setMappings] = useState<ImportMapping[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  // Wizard / New Import States
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [sourceSystem, setSourceSystem] = useState<ImportSourceSystem>('excel');
  const [importType, setImportType] = useState<ImportType>('expenses');
  const [mappingId, setMappingId] = useState('');
  const [periodFrom, setPeriodFrom] = useState(`${getCurrentFiscalYear()}-01-01`);
  const [periodTo, setPeriodTo] = useState(new Date().toISOString().split('T')[0]);
  const [rawText, setRawText] = useState('');

  // Preview States
  const [previewRows, setPreviewRows] = useState<MappedRowResult[]>([]);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Post states
  const [wizardLoading, setWizardLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [deleteConfirmImport, setDeleteConfirmImport] = useState<ActualImport | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ---------------------------------------------------------------------------
  // Load Imports List
  // ---------------------------------------------------------------------------
  const fetchImports = useCallback(async () => {
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
      const res = await apiGet<PaginatedResponse<ActualImport>>(`/actual-imports?${params.toString()}`);
      setImports(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('page.actualImports.fetchFailed'));
    } finally {
      setIsLoading(false);
    }
  }, [activeCompanyId, page, search, t]);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (active) {
        void fetchImports();
      }
    });
    return () => {
      active = false;
    };
  }, [fetchImports]);

  // ---------------------------------------------------------------------------
  // Load Master Data & Mappings
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!activeCompanyId) return;
    async function loadData() {
      try {
        const [accs, sts, ccs, prds, mats, custs, maps] = await Promise.all([
          apiGet<PaginatedResponse<Account>>('/accounts?limit=1000').then((r) => r.data),
          apiGet<PaginatedResponse<Site>>('/sites?limit=1000').then((r) => r.data),
          apiGet<PaginatedResponse<CostCenter>>('/cost-centers?limit=1000').then((r) => r.data),
          apiGet<PaginatedResponse<Product>>('/products?limit=1000').then((r) => r.data),
          apiGet<PaginatedResponse<Material>>('/materials?limit=1000').then((r) => r.data),
          apiGet<PaginatedResponse<Customer>>('/customers?limit=1000').then((r) => r.data),
          apiGet<{ data: ImportMapping[] }>('/integrations/mappings?limit=1000').then((r) => r.data),
        ]);
        setAccounts(accs);
        setSites(sts);
        setCostCenters(ccs);
        setProducts(prds);
        setMaterials(mats);
        setCustomers(custs);
        setMappings(maps);

        if (maps.length > 0) {
          setMappingId(maps[0].id);
        }
      } catch {
        // Silent failure
      }
    }
    void loadData();
  }, [activeCompanyId]);

  // ---------------------------------------------------------------------------
  // Load Detail View
  // ---------------------------------------------------------------------------
  const fetchImportDetail = useCallback(async (id: string) => {
    setIsLoadingDetail(true);
    setDetailError(null);
    try {
      const res = await apiGet<ActualImport>(`/actual-imports/${id}`);
      setSelectedImport(res);
    } catch (err: unknown) {
      setDetailError(err instanceof Error ? err.message : t('page.actualImports.fetchFailed'));
    } finally {
      setIsLoadingDetail(false);
    }
  }, [t]);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (active) {
        if (selectedImportId) {
          void fetchImportDetail(selectedImportId);
        } else {
          setSelectedImport(null);
        }
      }
    });
    return () => {
      active = false;
    };
  }, [selectedImportId, fetchImportDetail]);

  // ---------------------------------------------------------------------------
  // Clipboard spreadsheet parser
  // ---------------------------------------------------------------------------
  function parseRawText(text: string): Record<string, string>[] {
    const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '');
    if (lines.length < 2) return [];

    // Parse header row
    const headers = lines[0].split(/\t|,/).map((h) => h.trim().replace(/^["']|["']$/g, ''));
    const rows: Record<string, string>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(/\t|,/).map((p) => p.trim().replace(/^["']|["']$/g, ''));
      const row: Record<string, string> = {};
      headers.forEach((header, idx) => {
        row[header] = parts[idx] ?? '';
      });
      rows.push(row);
    }
    return rows;
  }

  // ---------------------------------------------------------------------------
  // Preview Handler
  // ---------------------------------------------------------------------------
  async function handlePreview() {
    const rows = parseRawText(rawText);
    if (rows.length === 0) {
      setPreviewError(t('page.actualImports.pasteValidationError'));
      return;
    }
    setIsPreviewing(true);
    setPreviewError(null);
    setPreviewRows([]);
    try {
      const payload: PreviewActualImportPayload = {
        mappingId,
        rawRows: rows,
      };
      const res = await apiPost<MappedRowResult[]>('/actual-imports/preview', payload);
      setPreviewRows(res);
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err)
        ? ((err.response?.data as { message?: string })?.message ?? t('page.actualImports.fetchFailed'))
        : t('page.actualImports.fetchFailed');
      setPreviewError(msg);
    } finally {
      setIsPreviewing(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Import Submit Handler
  // ---------------------------------------------------------------------------
  async function handleCreateImport() {
    const rows = parseRawText(rawText);
    if (rows.length === 0) {
      toastValidation(t('page.actualImports.pasteValidationError'));
      return;
    }
    setWizardLoading(true);
    try {
      const payload: CreateActualImportPayload = {
        sourceSystem,
        importType,
        mappingId,
        periodFrom: new Date(periodFrom).toISOString(),
        periodTo: new Date(periodTo).toISOString(),
        rawRows: rows,
      };
      const res = await apiPost<ActualImport>('/actual-imports', payload);
      setWizardOpen(false);
      setRawText('');
      setPreviewRows([]);
      void fetchImports();
      setSelectedImportId(res.id);
      toastSuccess(t('page.actualImports.importCreated'));
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err)
        ? ((err.response?.data as { message?: string })?.message ?? t('page.actualImports.fetchFailed'))
        : t('page.actualImports.fetchFailed');
      toastError(msg);
    } finally {
      setWizardLoading(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Action Handlers (Validate / Post / Delete)
  // ---------------------------------------------------------------------------
  async function handleValidate(id: string) {
    setActionLoading(true);
    try {
      const res = await apiPost<ActualImport>(`/actual-imports/${id}/validate`);
      void fetchImportDetail(id);
      void fetchImports();
      if (res.status === 'failed') {
        toastError(t('page.actualImports.validateFailed'));
      } else {
        toastSuccess(t('page.actualImports.validateSuccess'));
      }
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err)
        ? ((err.response?.data as { message?: string })?.message ?? t('page.actualImports.validateFailed'))
        : t('page.actualImports.validateFailed');
      toastError(msg);
    } finally {
      setActionLoading(false);
    }
  }

  async function handlePost(id: string) {
    setActionLoading(true);
    try {
      await apiPost<ActualImport>(`/actual-imports/${id}/post`);
      void fetchImportDetail(id);
      void fetchImports();
      toastSuccess(t('page.actualImports.postSuccess'));
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err)
        ? ((err.response?.data as { message?: string })?.message ?? t('page.actualImports.fetchFailed'))
        : t('page.actualImports.fetchFailed');
      toastError(msg);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDeleteImport() {
    if (!deleteConfirmImport) return;
    setDeleteLoading(true);
    try {
      await apiDelete(`/actual-imports/${deleteConfirmImport.id}`);
      toastSuccess(t('page.actualImports.deleteSuccess'));
      setDeleteConfirmImport(null);
      void fetchImports();
      if (selectedImportId === deleteConfirmImport.id) {
        setSelectedImportId(null);
      }
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : t('page.actualImports.fetchFailed'));
    } finally {
      setDeleteLoading(false);
    }
  }

  const columns: Column<ActualImport>[] = [
    {
      key: 'importType',
      header: t('page.actualImports.colTypeSource'),
      render: (_, row) => (
        <div>
          <p className="font-semibold text-slate-800 capitalize">{tImportType(row.importType)}</p>
          <p className="font-mono text-[10px] text-slate-400 uppercase">{tSourceSystem(row.sourceSystem)}</p>
        </div>
      ),
    },
    {
      key: 'periodFrom',
      header: t('page.actualImports.colPeriodCover'),
      render: (_, row) => {
        const from = new Date(row.periodFrom).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
        const to = new Date(row.periodTo).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
        return `${from} — ${to}`;
      },
    },
    {
      key: 'createdAt',
      header: t('page.actualImports.colUploadedAt'),
      render: (v) => v ? new Date(String(v)).toLocaleString() : '—',
    },
    {
      key: 'status',
      header: t('common.status'),
      render: (v) => (
        <Badge variant={getStatusVariant(v as ImportStatus)} className="capitalize">
          {String(v)}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-24',
      render: (_, row) => {
        const canDelete = row.status !== 'posted';
        return (
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={() => setSelectedImportId(row.id)}
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              aria-label={t('common.viewDetails')}
              title={t('common.viewDetails')}
            >
              <Eye className="h-4 w-4" />
            </button>
            {canDelete && (
              <button
                onClick={() => setDeleteConfirmImport(row)}
                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                aria-label={t('common.delete')}
                title={t('common.delete')}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        );
      },
    },
  ];

  if (!activeCompanyId) {
    return (
      <div className="space-y-6">
        <PageHeader title={t('page.actualImports.title')} description={t('page.actualImports.description')} />
        <ErrorState
          title={t('common.noActiveCompany')}
          message={t('page.actualImports.noCompanyDesc')}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {selectedImport ? (
        // DETAIL VIEW
        <div className="space-y-6">
          {detailError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {detailError}
            </div>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedImportId(null)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 shadow-sm"
              aria-label={t('page.actualImports.backToList')}
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <h1 className="text-xl font-bold text-slate-900">{t('page.actualImports.detailTitle', { id: selectedImport.id })}</h1>
            <Badge variant={getStatusVariant(selectedImport.status)} className="capitalize ml-2">
              {selectedImport.status}
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <FileSpreadsheet className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{t('page.actualImports.cardImportTypeSource')}</p>
                <p className="text-sm font-bold text-slate-700 capitalize">{tImportType(selectedImport.importType)} ({tSourceSystem(selectedImport.sourceSystem)})</p>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <Calendar className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{t('page.actualImports.cardImportPeriod')}</p>
                <p className="text-sm font-bold text-slate-700">
                  {new Date(selectedImport.periodFrom).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                </p>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <Clock className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{t('page.actualImports.cardUploadedDate')}</p>
                <p className="text-sm font-bold text-slate-700">{new Date(selectedImport.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <Layers className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{t('page.actualImports.cardLinesImported')}</p>
                <p className="text-sm font-bold text-slate-700">{(selectedImport.actualLines ?? []).length} {t('common.items')}</p>
              </div>
            </div>
          </div>

          {/* Action Triggers panel (Validate / Post) */}
          <div className="flex flex-wrap gap-2 items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <span className="text-sm text-slate-500 font-medium">{t('page.actualImports.verifyFinalize')}</span>
            <div className="flex gap-2">
              {(selectedImport.status === 'uploaded' || selectedImport.status === 'failed') && (
                <Button size="sm" variant="outline" onClick={() => handleValidate(selectedImport.id)} isLoading={actionLoading} title={t('page.actualImports.runValidation')}>
                  {t('page.actualImports.runValidation')}
                </Button>
              )}
              {selectedImport.status === 'validated' && (
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handlePost(selectedImport.id)} isLoading={actionLoading} title={t('page.actualImports.postLedgerLines')}>
                  {t('page.actualImports.postLedgerLines')}
                </Button>
              )}
              {selectedImport.status === 'posted' && (
                <span className="text-xs text-slate-400 italic">{t('page.actualImports.linesPosted')}</span>
              )}
            </div>
          </div>

          {/* Error log display */}
          {selectedImport.errorLog && (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold">
                <AlertTriangle className="h-4 w-4 text-red-500" /> {t('page.actualImports.validationErrorLog')}
              </div>
              <ul className="list-disc list-inside space-y-1 mt-1.5 font-mono text-[11px]">
                {(() => {
                  try {
                    const parsed = JSON.parse(selectedImport.errorLog) as string[];
                    return parsed.map((err, i) => <li key={i}>{err}</li>);
                  } catch {
                    return <li>{selectedImport.errorLog}</li>;
                  }
                })()}
              </ul>
            </div>
          )}

          {/* Itemized Lines Viewer */}
          <div className="space-y-3">
            <h3 className="text-base font-bold text-slate-900">{t('page.actualImports.importedLines')}</h3>
            {isLoadingDetail ? (
              <div className="flex items-center justify-center py-8">
                <Clock className="h-5 w-5 animate-spin text-emerald-500" />
              </div>
            ) : (selectedImport.actualLines ?? []).length === 0 ? (
              <EmptyState title={t('page.actualImports.noLines')} description={t('page.actualImports.noLinesDesc')} />
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm max-h-[400px] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left">{t('page.actualImports.lineDate')}</th>
                      <th className="px-4 py-2 text-left">{t('page.actualImports.lineAccount')}</th>
                      <th className="px-4 py-2 text-left">{t('page.actualImports.lineSite')}</th>
                      <th className="px-4 py-2 text-left">{t('page.actualImports.lineCC')}</th>
                      <th className="px-4 py-2 text-left">{t('page.actualImports.lineDimension')}</th>
                      <th className="px-4 py-2 text-left">{t('page.actualImports.lineRefNo')}</th>
                      <th className="px-4 py-2 text-right">{t('page.actualImports.lineQty')}</th>
                      <th className="px-4 py-2 text-right">{t('page.actualImports.linePrice')}</th>
                      <th className="px-4 py-2 text-right">{t('page.actualImports.lineAmount')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedImport.actualLines?.map((line) => {
                      const acc = accounts.find((a) => a.id === line.accountId);
                      const site = sites.find((s) => s.id === line.siteId);
                      const cc = costCenters.find((c) => c.id === line.costCenterId);
                      const prod = products.find((p) => p.id === line.productId)?.name;
                      const cust = customers.find((c) => c.id === line.customerId)?.name;
                      const mat = materials.find((m) => m.id === line.materialId)?.name;
                      const dimStr = [prod, cust, mat].filter(Boolean).join(' / ') || '—';
                      return (
                        <tr key={line.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-2">{new Date(line.transactionDate).toLocaleDateString()}</td>
                          <td className="px-4 py-2">
                            <p className="font-semibold text-slate-800">{acc?.name ?? '—'}</p>
                            <p className="text-[9px] font-mono text-slate-400">{t('page.actualImports.codePrefix', { code: acc?.code ?? '—' })}</p>
                          </td>
                          <td className="px-4 py-2 text-slate-600">{site?.name ?? '—'}</td>
                          <td className="px-4 py-2 text-slate-600">{cc?.code ?? '—'}</td>
                          <td className="px-4 py-2 text-slate-500 max-w-[120px] truncate" title={dimStr}>{dimStr}</td>
                          <td className="px-4 py-2 text-slate-500 font-mono">{line.referenceNo ?? '—'}</td>
                          <td className="px-4 py-2 text-right font-mono">{line.quantity > 0 ? line.quantity.toLocaleString() : '—'}</td>
                          <td className="px-4 py-2 text-right font-mono">{line.unitPrice > 0 ? `$${line.unitPrice.toFixed(2)}` : '—'}</td>
                          <td className="px-4 py-2 text-right font-mono font-semibold text-emerald-700">${line.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        // LIST VIEW
        <div className="space-y-5">
          <PageHeader title={t('page.actualImports.title')} description={t('page.actualImports.description')}>
            <Button size="sm" onClick={() => { setWizardStep(1); setWizardOpen(true); }} id="actuals-import-btn">
              <Upload className="h-4 w-4" /> {t('page.actualImports.importButton')}
            </Button>
          </PageHeader>

          {/* Search bar */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                placeholder={t('page.actualImports.searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-4 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <p className="text-sm text-slate-400">{t('common.recordsFound', { n: total })}</p>
          </div>

          {/* Table list */}
          {isLoading ? (
            <LoadingState rows={6} message={t('page.actualImports.retrieving')} />
          ) : error ? (
            <ErrorState message={error} onRetry={fetchImports} />
          ) : imports.length === 0 ? (
            <EmptyState
              title={t('page.actualImports.emptyTitle')}
              description={t('page.actualImports.emptyDesc')}
              action={
                <Button size="sm" onClick={() => { setWizardStep(1); setWizardOpen(true); }}>
                  <Upload className="h-4 w-4" /> {t('page.actualImports.importButton')}
                </Button>
              }
            />
          ) : (
            <>
              <TableWrapper<ActualImport>
                data={imports}
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

      {/* NEW IMPORT WIZARD MODAL */}
      {wizardOpen && (
        <Modal
          open
          onClose={() => setWizardOpen(false)}
          title={t('page.actualImports.wizardTitle')}
          description={t('page.actualImports.wizardDesc')}
          size="lg"
          className="max-h-[90vh] flex flex-col"
        >
          {/* Stepper progress indicator */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
            {[
              { step: 1, label: t('page.actualImports.step1Label') },
              { step: 2, label: t('page.actualImports.step2Label') },
              { step: 3, label: t('page.actualImports.step3Label') },
            ].map((s) => (
              <div key={s.step} className="flex items-center gap-2">
                <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                  wizardStep === s.step
                    ? 'bg-emerald-600 text-white'
                    : wizardStep > s.step
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-100 text-slate-400'
                }`}>
                  {s.step}
                </span>
                <span className={`text-xs font-semibold ${
                  wizardStep === s.step ? 'text-slate-800' : 'text-slate-400'
                }`}>
                  {s.label}
                </span>
                {s.step < 3 && <div className="h-0.5 w-8 bg-slate-200" />}
              </div>
            ))}
          </div>

          <div className="space-y-4 overflow-y-auto max-h-[60vh] pr-1">
            {/* STEP 1: SETUP SOURCE */}
            {wizardStep === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="w-source" className="text-xs font-semibold text-slate-500">{t('page.actualImports.sourceSystem')}</label>
                    <select
                      id="w-source"
                      value={sourceSystem}
                      onChange={(e) => setSourceSystem(e.target.value as ImportSourceSystem)}
                      className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none"
                    >
                      {SOURCE_SYSTEMS.map((sys) => (
                        <option key={sys} value={sys}>{tSourceSystem(sys)}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="w-type" className="text-xs font-semibold text-slate-500">{t('page.actualImports.importType')}</label>
                    <select
                      id="w-type"
                      value={importType}
                      onChange={(e) => setImportType(e.target.value as ImportType)}
                      className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none"
                    >
                      {IMPORT_TYPES.map((it) => (
                        <option key={it.value} value={it.value}>{tImportType(it.value)}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input id="w-from" label={t('page.actualImports.periodFrom')} type="date" value={periodFrom} onChange={(e) => setPeriodFrom(e.target.value)} />
                  <Input id="w-to" label={t('page.actualImports.periodTo')} type="date" value={periodTo} onChange={(e) => setPeriodTo(e.target.value)} />
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="w-mapping" className="text-xs font-semibold text-slate-500">{t('page.actualImports.mappingTemplate')}</label>
                    <select
                      id="w-mapping"
                      value={mappingId}
                      onChange={(e) => setMappingId(e.target.value)}
                      className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none"
                    >
                      <option value="">{t('page.actualImports.selectTemplate')}</option>
                      {mappings.map((m) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                  <Button variant="outline" size="sm" type="button" onClick={() => setWizardOpen(false)}>
                    {t('common.cancel')}
                  </Button>
                  <Button
                    size="sm"
                    type="button"
                    onClick={() => setWizardStep(2)}
                    disabled={!mappingId}
                  >
                    {t('page.actualImports.nextPasteData')}
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 2: PASTE DATA */}
            {wizardStep === 2 && (
              <div className="space-y-4">
                {/* Sample data should be loaded from files */}

                <div className="flex flex-col gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-4">
                  <p className="text-xs font-semibold text-slate-500">{t('page.actualImports.orUploadCsv')}</p>
                  <div className="flex items-center gap-3">
                    <input
                      type="file"
                      id="actuals-csv-upload"
                      accept=".csv"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = (evt) => {
                          if (evt.target?.result) {
                            setRawText(evt.target.result as string);
                            toastSuccess(t('page.actualImports.fileLoaded', { name: file.name }));
                          }
                        };
                        reader.readAsText(file);
                      }}
                      className="text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="w-data" className="text-xs font-semibold text-slate-500">
                    {t('page.actualImports.pastedGridCells')}
                  </label>
                  <textarea
                    id="w-data"
                    rows={6}
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    placeholder={t('page.actualImports.csvPlaceholder')}
                    className="w-full rounded-lg border border-slate-200 bg-white p-3 font-mono text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                  <Button variant="outline" size="sm" type="button" onClick={() => setWizardStep(1)}>
                    {t('page.actualImports.backSetup')}
                  </Button>
                  <Button
                    size="sm"
                    type="button"
                    onClick={async () => {
                      setWizardStep(3);
                      await handlePreview();
                    }}
                    disabled={rawText.trim() === ''}
                  >
                    {t('page.actualImports.nextPreview')}
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 3: PREVIEW & UPLOAD */}
            {wizardStep === 3 && (
              <div className="space-y-4">
                {isPreviewing ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                    <Clock className="h-8 w-8 animate-spin text-emerald-500 mb-2" />
                    <p className="text-xs font-semibold text-slate-500">{t('page.actualImports.analyzingSchema')}</p>
                  </div>
                ) : (
                  <>
                    {previewError && (
                      <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                        {previewError}
                      </div>
                    )}

                    {previewRows.length > 0 ? (
                      <div className="space-y-2">
                        <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                          {t('page.actualImports.previewResolution', { valid: previewRows.filter(r => r.success).length, total: previewRows.length })}
                        </span>
                        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm max-h-[200px] overflow-y-auto">
                          <table className="w-full text-[10px]">
                            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold sticky top-0">
                              <tr>
                                <th className="px-2 py-1.5 text-left">{t('page.actualImports.previewRow')}</th>
                                <th className="px-2 py-1.5 text-left">{t('page.actualImports.previewAccountId')}</th>
                                <th className="px-2 py-1.5 text-right">{t('page.actualImports.previewAmount')}</th>
                                <th className="px-2 py-1.5 text-left">{t('page.actualImports.previewDate')}</th>
                                <th className="px-2 py-1.5 text-left">{t('page.actualImports.previewStatus')}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-mono">
                              {previewRows.map((p, idx) => (
                                <tr key={idx} className={p.success ? 'hover:bg-slate-50' : 'bg-red-50/30'}>
                                  <td className="px-2 py-1.5 font-bold">{t('page.actualImports.previewRow')} {p.rowIdx + 1}</td>
                                  <td className="px-2 py-1.5">{p.line?.accountId ? accounts.find(a => a.id === p.line?.accountId)?.name ?? p.line.accountId : '—'}</td>
                                  <td className="px-2 py-1.5 text-right">{p.line ? `$${p.line.amount}` : '—'}</td>
                                  <td className="px-2 py-1.5">{p.line ? new Date(p.line.transactionDate).toLocaleDateString() : '—'}</td>
                                  <td className="px-2 py-1.5">
                                    {p.success ? (
                                      <Badge variant="success" className="text-[9px] px-1 py-0 shadow-none">{t('page.actualImports.resolved')}</Badge>
                                    ) : (
                                      <span className="text-red-600 block text-[9px] max-w-[250px] truncate" title={p.errors.join(', ')}>
                                        {p.errors.join(', ')}
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-6 text-slate-400 text-xs">{t('page.actualImports.noPreviewResolved')}</div>
                    )}

                    <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                      <Button variant="outline" size="sm" type="button" onClick={() => setWizardStep(2)}>
                        {t('page.actualImports.backPasteData')}
                      </Button>
                      <Button
                        size="sm"
                        type="button"
                        onClick={handleCreateImport}
                        isLoading={wizardLoading}
                        disabled={previewRows.length === 0 || previewRows.some(r => !r.success)}
                      >
                        {t('page.actualImports.uploadValidate')}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* DELETE CONFIRM DIALOG */}
      <ConfirmDialog
        open={deleteConfirmImport !== null}
        message={t('page.actualImports.deleteConfirm')}
        isLoading={deleteLoading}
        onConfirm={handleDeleteImport}
        onCancel={() => setDeleteConfirmImport(null)}
      />
    </div>
  );
}
