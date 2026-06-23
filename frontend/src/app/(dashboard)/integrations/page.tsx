'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Trash2,
  Pencil,
  Play,
  Database,
  Layers,
  Activity,
  CheckCircle2,
  XCircle,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TableWrapper, type Column } from '@/components/ui/table-wrapper';
import { Pagination } from '@/components/ui/pagination';
import { LoadingState, EmptyState, ErrorState, LockedState } from '@/components/ui/feedback-states';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Modal } from '@/components/ui/modal';
import { useAuth } from '@/lib/auth-context';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';
import { useToast } from '@/components/ui/toast';
import { useI18n } from '@/lib/i18n/i18n-context';
import { translateErrorCode } from '@/lib/i18n/error-code-map';
import type { TranslationKey } from '@/lib/i18n/translations';
import { CONNECTION_TYPES, SYNC_SCHEDULES, SOURCE_SYSTEMS, IMPORT_TYPES } from '@/lib/constants';
import type {
  IntegrationConnection,
  ImportMapping,
  ConnectionType,
  SyncSchedule,
  ImportSourceSystem,
  ImportType,
  PaginatedResponse,
} from '@/types/api';
import axios from 'axios';

export default function IntegrationsPage() {
  const { activeCompanyId, tenant } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<'connections' | 'mappings' | 'sync'>('connections');

  function getApiErrorMessage(err: unknown, fallbackKey: TranslationKey): string {
    if (axios.isAxiosError(err)) {
      const data = err.response?.data as { code?: string; message?: string | string[] } | undefined;
      if (data?.code) return translateErrorCode(data.code, t);
      if (typeof data?.message === 'string') return data.message;
      if (Array.isArray(data?.message) && data.message.length > 0) return String(data.message[0]);
    }
    return t(fallbackKey);
  }

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab === 'mappings' || tab === 'sync' || tab === 'connections') {
        setTimeout(() => {
          setActiveTab(tab as 'connections' | 'mappings' | 'sync');
        }, 0);
      }
    }
  }, []);

  // Connection states
  const [connections, setConnections] = useState<IntegrationConnection[]>([]);
  const [totalConn, setTotalConn] = useState(0);
  const [pageConn, setPageConn] = useState(1);
  const [totalPagesConn, setTotalPagesConn] = useState(1);
  const [isLoadingConn, setIsLoadingConn] = useState(false);
  const [errorConn, setErrorConn] = useState<string | null>(null);

  // Mappings states
  const [mappings, setMappings] = useState<ImportMapping[]>([]);
  const [totalMap, setTotalMap] = useState(0);
  const [pageMap, setPageMap] = useState(1);
  const [totalPagesMap, setTotalPagesMap] = useState(1);
  const [isLoadingMap, setIsLoadingMap] = useState(false);
  const [errorMap, setErrorMap] = useState<string | null>(null);

  // Form states - Connection
  const [connModalOpen, setConnModalOpen] = useState(false);
  const [editConn, setEditConn] = useState<IntegrationConnection | null>(null);
  const [connFormLoading, setConnFormLoading] = useState(false);
  const [connFormError, setConnFormError] = useState<string | null>(null);
  const [deleteConnConfirm, setDeleteConnConfirm] = useState<IntegrationConnection | null>(null);
  const [deleteConnLoading, setDeleteConnLoading] = useState(false);

  // Form states - Mapping
  const [mapModalOpen, setMapModalOpen] = useState(false);
  const [editMap, setEditMap] = useState<ImportMapping | null>(null);
  const [mapFormLoading, setMapFormLoading] = useState(false);
  const [mapFormError, setMapFormError] = useState<string | null>(null);
  const [deleteMapConfirm, setDeleteMapConfirm] = useState<ImportMapping | null>(null);
  const [deleteMapLoading, setDeleteMapLoading] = useState(false);

  // Manual Sync states
  const [syncConnId, setSyncConnId] = useState('');
  const [syncMapId, setSyncMapId] = useState('');
  const [syncStartDate, setSyncStartDate] = useState('2026-06-01');
  const [syncEndDate, setSyncEndDate] = useState('2026-06-30');
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncResult, setSyncResult] = useState<{ recordsSynced: number; message: string } | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Dynamic preview states
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isPreviewValidated, setIsPreviewValidated] = useState(false);

  // Connection testing states
  const [testingConnId, setTestingConnId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Fetch Connections
  const fetchConnections = useCallback(async () => {
    if (!activeCompanyId) return;
    setIsLoadingConn(true);
    setErrorConn(null);
    try {
      const res = await apiGet<PaginatedResponse<IntegrationConnection>>(`/integrations/connections?page=${pageConn}&limit=10`);
      setConnections(res.data ?? []);
      setTotalConn(res.total ?? 0);
      setTotalPagesConn(res.totalPages ?? 1);
    } catch (err: unknown) {
      setErrorConn(err instanceof Error ? err.message : t('page.integrations.fetchConnectionsFailed'));
    } finally {
      setIsLoadingConn(false);
    }
  }, [activeCompanyId, pageConn]);

  // Fetch Mappings
  const fetchMappings = useCallback(async () => {
    if (!activeCompanyId) return;
    setIsLoadingMap(true);
    setErrorMap(null);
    try {
      const res = await apiGet<PaginatedResponse<ImportMapping>>(`/integrations/mappings?page=${pageMap}&limit=10`);
      setMappings(res.data ?? []);
      setTotalMap(res.total ?? 0);
      setTotalPagesMap(res.totalPages ?? 1);
    } catch (err: unknown) {
      setErrorMap(err instanceof Error ? err.message : t('page.integrations.fetchMappingsFailed'));
    } finally {
      setIsLoadingMap(false);
    }
  }, [activeCompanyId, pageMap]);

  useEffect(() => {
    if (activeTab === 'connections') {
      void Promise.resolve().then(() => void fetchConnections());
    } else if (activeTab === 'mappings') {
      void Promise.resolve().then(() => void fetchMappings());
    } else if (activeTab === 'sync') {
      void Promise.resolve().then(() => {
        void fetchConnections();
        void fetchMappings();
      });
    }
  }, [activeTab, fetchConnections, fetchMappings]);

  // Handle Oracle OAuth SSO redirect callback
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const oauthStatus = params.get('oracle_oauth');
      const code = params.get('code');
      if (oauthStatus === 'success' && code) {
        // Remove code and oracle_oauth from URL to avoid re-triggering
        const newParams = new URLSearchParams(params);
        newParams.delete('oracle_oauth');
        newParams.delete('code');
        const queryStr = newParams.toString();
        const newUrl = window.location.pathname + (queryStr ? `?${queryStr}` : '');
        window.history.replaceState({}, document.title, newUrl);

        // Pre-fill the Connection Form Modal for Oracle Cloud integration
        const initialConnection: unknown = {
          id: '',
          companyId: activeCompanyId ? activeCompanyId.toString() : '',
          name: 'Oracle Cloud Integration',
          connectionType: 'oracle',
          host: 'identity.oraclecloud.com',
          port: 443,
          databaseName: 'ORDS_CLOUD',
          username: 'oauth_user',
          password: '',
          apiBaseUrl: 'https://ords.oraclecloud.com/ords',
          apiKey: '',
          syncSchedule: 'manual',
          isActive: true,
          extraConfig: {
            oracleMethod: 'cloud',
            oauthCode: code,
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        setTimeout(() => {
          setEditConn(initialConnection as IntegrationConnection);
          setConnModalOpen(true);
        }, 0);
        toastSuccess(t('page.integrations.oauthSuccess'));
      }
    }
  }, [activeCompanyId, toastSuccess]);

  // Actions - Connection
  async function handleTestConnection(conn: IntegrationConnection) {
    setTestingConnId(conn.id);
    setTestResult(null);
    try {
      const payload = {
        connectionId: conn.id,
        connectionType: conn.connectionType,
        host: conn.host ?? undefined,
        port: conn.port ?? undefined,
        databaseName: conn.databaseName ?? undefined,
        username: conn.username ?? undefined,
        password: conn.password ?? undefined,
        apiBaseUrl: conn.apiBaseUrl ?? undefined,
        apiKey: conn.apiKey ?? undefined,
        extraConfig: conn.extraConfig ?? undefined,
      };
      const res = await apiPost<{ success: boolean; message: string }>('/integrations/connections/test', payload);
      setTestResult(res);
      if (res.success) {
        toastSuccess(t('page.integrations.testSucceeded', { message: res.message }));
      } else {
        toastError(t('page.integrations.testFailed', { message: res.message }));
      }
    } catch (err: unknown) {
      const msg = getApiErrorMessage(err, 'page.integrations.testRequestFailed');
      setTestResult({ success: false, message: msg });
      toastError(msg);
    } finally {
      setTestingConnId(null);
    }
  }

  async function handleDeleteConnection() {
    if (!deleteConnConfirm) return;
    setDeleteConnLoading(true);
    try {
      await apiDelete<IntegrationConnection>(`/integrations/connections/${deleteConnConfirm.id}`);
      toastSuccess(t('page.integrations.connectionDeleted'));
      setDeleteConnConfirm(null);
      void fetchConnections();
    } catch (err: unknown) {
      const msg = getApiErrorMessage(err, 'page.integrations.deleteConnectionFailed');
      toastError(msg);
    } finally {
      setDeleteConnLoading(false);
    }
  }

  // Actions - Mapping
  async function handleDeleteMapping() {
    if (!deleteMapConfirm) return;
    setDeleteMapLoading(true);
    try {
      await apiDelete<ImportMapping>(`/integrations/mappings/${deleteMapConfirm.id}`);
      toastSuccess(t('page.integrations.mappingDeleted'));
      setDeleteMapConfirm(null);
      void fetchMappings();
    } catch (err: unknown) {
      const msg = getApiErrorMessage(err, 'page.integrations.deleteMappingFailed');
      toastError(msg);
    } finally {
      setDeleteMapLoading(false);
    }
  }

  // Actions - Manual Sync
  async function handleManualSync(e: React.FormEvent) {
    e.preventDefault();
    if (!syncConnId || !syncMapId) return;
    setSyncLoading(true);
    setSyncError(null);
    setSyncResult(null);
    try {
      const payload = {
        connectionId: syncConnId,
        mappingId: syncMapId,
        startDate: new Date(syncStartDate).toISOString(),
        endDate: new Date(syncEndDate).toISOString(),
      };
      const res = await apiPost<{ importId: string; status: string; recordsSynced: number; message: string }>(
        '/integrations/sync',
        payload
      );
      setSyncResult({ recordsSynced: res.recordsSynced, message: res.message });
      toastSuccess(t('page.integrations.syncComplete', { count: res.recordsSynced }));
    } catch (err: unknown) {
      const msg = getApiErrorMessage(err, 'page.integrations.syncFailedManual');
      setSyncError(msg);
      toastError(msg);
    } finally {
      setSyncLoading(false);
    }
  }

  // Clear preview and validation states when sync parameters change
  useEffect(() => {
    setPreviewRows([]);
    setPreviewError(null);
    setIsPreviewValidated(false);
  }, [syncConnId, syncMapId]);

  async function handlePreviewData() {
    if (!syncConnId || !syncMapId) return;
    setIsPreviewLoading(true);
    setPreviewError(null);
    setPreviewRows([]);
    setIsPreviewValidated(false);

    try {
      const selectedMap = mappings.find((m) => m.id === syncMapId);
      if (!selectedMap) {
        throw new Error(t('page.integrations.mappingNotFound'));
      }

      let sourceTable = 'FP_GL_ACTUALS';
      let mappingConfigPayload: Record<string, any> = selectedMap.mappingConfig;

      if (selectedMap.mappingConfig?.targetModule) {
        sourceTable = (selectedMap.mappingConfig.sourceTable as string) || '';
        mappingConfigPayload = (selectedMap.mappingConfig.columnMapping as unknown as Record<string, string | null>) || {};
      }

      const payload = {
        sourceTable,
        mappingConfig: mappingConfigPayload,
        limit: 10,
      };

      const rows = await apiPost<any[]>(`/integrations/connections/${syncConnId}/preview-rows`, payload);
      setPreviewRows(rows || []);
      setIsPreviewValidated(true);
      toastSuccess(t('page.integrations.previewSuccess'));
    } catch (err: unknown) {
      const msg = getApiErrorMessage(err, 'page.integrations.previewFailed');
      setPreviewError(msg);
      toastError(msg);
    } finally {
      setIsPreviewLoading(false);
    }
  }

  // Table Columns Mappings
  const mappingColumns: Column<ImportMapping>[] = [
    { key: 'name', header: t('page.integrations.mappingName'), className: 'font-semibold' },
    { key: 'sourceSystem', header: t('page.integrations.sourceSystem'), className: 'capitalize font-medium text-slate-700' },
    { key: 'importType', header: t('page.integrations.dataType'), className: 'capitalize text-slate-500 font-mono' },
    {
      key: 'isDefault',
      header: t('page.integrations.isDefault'),
      render: (v) => (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${v ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-50 text-slate-500'}`}>
          {v ? 'Yes' : 'No'}
        </span>
      ),
    },
    {
      key: 'isActive',
      header: t('page.integrations.status'),
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
              setEditMap(row);
              setMapModalOpen(true);
            }}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Edit"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => setDeleteMapConfirm(row)}
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
        <PageHeader title={t('page.integrations.title')} description={t('page.integrations.description')} />
        <ErrorState
          title="No active company"
          message="Please select a company from the sidebar before managing integrations."
        />
      </div>
    );
  }

  const planName = tenant?.plan?.name?.toLowerCase() || 'starter';
  if (planName === 'starter') {
    return (
      <div className="space-y-6">
        <PageHeader title={t('page.integrations.title')} description={t('page.integrations.description')} />
        <LockedState
          title={t('page.integrations.lockedTitle')}
          description={t('page.integrations.lockedDescription')}
          requiredPlan="Business"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tabs Header */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => {
            setActiveTab('connections');
            setTestResult(null);
          }}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors duration-150 ${
            activeTab === 'connections'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          {t('page.connections.title')}
        </button>
        <button
          onClick={() => {
            setActiveTab('mappings');
            setTestResult(null);
          }}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors duration-150 ${
            activeTab === 'mappings'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          {t('page.importMappings.title')}
        </button>
        <button
          onClick={() => {
            setActiveTab('sync');
            setTestResult(null);
          }}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors duration-150 ${
            activeTab === 'sync'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          {t('page.integrations.manualDataSync')}
        </button>
      </div>

      {testResult && (
        <div role="alert" className={`rounded-xl border p-4 text-xs flex gap-2.5 items-start max-w-xl ${testResult.success ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-800'}`}>
          {testResult.success ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-red-600" />}
          <div>
            <p className="font-bold">{testResult.success ? t('page.integrations.connectionSuccessful') : t('page.integrations.connectionFailed')}</p>
            <p className="mt-0.5 font-medium">{testResult.message}</p>
          </div>
        </div>
      )}

      {activeTab === 'connections' && (
        <div className="space-y-5">
          <PageHeader title={t('page.integrations.connectionsHeader')} description={t('page.integrations.connectionsDescription')}>
            <Button size="sm" onClick={() => {
              setEditConn(null);
              setConnModalOpen(true);
            }}>
              <Plus className="h-4 w-4" /> {t('page.integrations.addConnection')}
            </Button>
          </PageHeader>

          {isLoadingConn ? (
            <LoadingState rows={5} message={t('page.integrations.loadingConnections')} />
          ) : errorConn ? (
            <ErrorState message={errorConn} onRetry={fetchConnections} />
          ) : connections.length === 0 ? (
            <EmptyState
              icon={<Database className="h-6 w-6" />}
              title={t('page.integrations.noConnectionsTitle')}
              description={t('page.integrations.noConnectionsDescription')}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {connections.map((c) => (
                <div key={c.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <Database className="h-5 w-5 text-emerald-600 shrink-0" />
                        <div>
                          <h4 className="font-bold text-slate-800 text-sm">{c.name}</h4>
                          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono capitalize">{c.connectionType}</span>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${c.isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-100 text-slate-500'}`}>
                        {c.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <div className="text-xs text-slate-500 space-y-1.5 pt-1.5 border-t border-slate-50">
                      {c.host && <p><span className="font-medium text-slate-400">Endpoint:</span> {c.host}:{c.port ?? 80}</p>}
                      {c.apiBaseUrl && <p className="truncate"><span className="font-medium text-slate-400">Base URL:</span> {c.apiBaseUrl}</p>}
                      <p><span className="font-medium text-slate-400">Schedule:</span> <span className="capitalize">{c.syncSchedule}</span></p>
                      {c.lastSyncAt && <p><span className="font-medium text-slate-400">Last Sync:</span> {new Date(c.lastSyncAt).toLocaleString()}</p>}
                      {c.lastSyncStatus && (
                        <p className="flex items-center gap-1.5">
                          <span className="font-medium text-slate-400">Sync status:</span>
                          <span className={`px-1.5 py-0.2 rounded font-bold capitalize text-[10px] ${c.lastSyncStatus === 'success' ? 'bg-emerald-50 text-emerald-700' : c.lastSyncStatus === 'failed' ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-500'}`}>
                            {c.lastSyncStatus}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-50 mt-4 pt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-[10px] h-7 px-2 font-bold"
                      onClick={() => handleTestConnection(c)}
                      isLoading={testingConnId === c.id}
                    >
                      <Play className="h-3 w-3 fill-current mr-1 text-emerald-600" /> {t('page.integrations.testConnection')}
                    </Button>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditConn(c);
                          setConnModalOpen(true);
                        }}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        aria-label="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteConnConfirm(c)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        aria-label="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {totalPagesConn > 1 && (
            <Pagination
              page={pageConn}
              totalPages={totalPagesConn}
              total={totalConn}
              limit={10}
              onPageChange={setPageConn}
            />
          )}
        </div>
      )}

      {activeTab === 'mappings' && (
        <div className="space-y-5">
          <PageHeader title={t('page.integrations.mappingsHeader')} description={t('page.integrations.mappingsDescription')}>
            <Button size="sm" onClick={() => {
              setEditMap(null);
              setMapModalOpen(true);
            }}>
              <Plus className="h-4 w-4" /> {t('page.integrations.addMapping')}
            </Button>
          </PageHeader>

          {isLoadingMap ? (
            <LoadingState rows={5} message={t('page.integrations.loadingMappings')} />
          ) : errorMap ? (
            <ErrorState message={errorMap} onRetry={fetchMappings} />
          ) : mappings.length === 0 ? (
            <EmptyState
              icon={<Layers className="h-6 w-6" />}
              title={t('page.integrations.noMappingsTitle')}
              description={t('page.integrations.noMappingsDescription')}
            />
          ) : (
            <div className="space-y-4">
              <TableWrapper
                data={mappings}
                columns={mappingColumns}
                keyExtractor={(row) => row.id}
                onRowClick={(row) => {
                  setEditMap(row);
                  setMapModalOpen(true);
                }}
              />
              {totalPagesMap > 1 && (
                <Pagination
                  page={pageMap}
                  totalPages={totalPagesMap}
                  total={totalMap}
                  limit={10}
                  onPageChange={setPageMap}
                />
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'sync' && (
        <div className="max-w-2xl bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Activity className="h-4 w-4 text-emerald-600" /> {t('page.integrations.triggerManualSync')}
            </h3>
            <p className="text-xs text-slate-500 mt-1">{t('page.integrations.syncDescription')}</p>
          </div>

          <form onSubmit={handleManualSync} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="sync-conn" className="text-xs font-semibold text-slate-500">{t('page.integrations.connectionAdapter')}</label>
                <select
                  id="sync-conn"
                  value={syncConnId}
                  onChange={(e) => setSyncConnId(e.target.value)}
                  className="h-9 rounded border border-slate-200 bg-white px-3 text-xs text-slate-700"
                  required
                >
                  <option value="">{t('page.integrations.selectConnection')}</option>
                  {connections.filter((c) => c.isActive).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.connectionType})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="sync-map" className="text-xs font-semibold text-slate-500">{t('page.integrations.importMappingTemplate')}</label>
                <select
                  id="sync-map"
                  value={syncMapId}
                  onChange={(e) => setSyncMapId(e.target.value)}
                  className="h-9 rounded border border-slate-200 bg-white px-3 text-xs text-slate-700"
                  required
                >
                  <option value="">{t('page.integrations.selectMapping')}</option>
                  {mappings.filter((m) => m.isActive).map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.importType})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                id="sync-start"
                label={t('page.integrations.syncPeriodFrom')}
                type="date"
                required
                value={syncStartDate}
                onChange={(e) => setSyncStartDate(e.target.value)}
              />
              <Input
                id="sync-end"
                label={t('page.integrations.syncPeriodTo')}
                type="date"
                required
                value={syncEndDate}
                onChange={(e) => setSyncEndDate(e.target.value)}
              />
            </div>

            <div className="border-t border-slate-100 pt-4 flex gap-3 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={handlePreviewData}
                isLoading={isPreviewLoading}
                disabled={!syncConnId || !syncMapId}
              >
                Preview Data
              </Button>
              <Button type="submit" isLoading={syncLoading} disabled={!isPreviewValidated || !syncConnId || !syncMapId}>
                <RefreshCw className={`h-4 w-4 mr-1.5 ${syncLoading ? 'animate-spin' : ''}`} /> {t('page.integrations.triggerSynchronization')}
              </Button>
            </div>
          </form>

          {previewError && (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-800 flex gap-2.5 items-start">
              <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Preview / Validation Failed</p>
                <p className="mt-0.5">{previewError}</p>
              </div>
            </div>
          )}

          {isPreviewValidated && previewRows.length === 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 flex gap-2.5 items-start">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">No Data Found</p>
                <p className="mt-0.5">The preview returned zero rows from the source table. The table may be empty.</p>
              </div>
            </div>
          )}

          {previewRows.length > 0 && (
            <div className="space-y-2 border border-slate-150 rounded-xl p-4 bg-slate-50/50">
              <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Data Preview (First {previewRows.length} rows) - Validated
              </h4>
              <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white max-h-60">
                <table className="min-w-full divide-y divide-slate-200 text-left text-[11px] font-medium text-slate-600">
                  <thead className="bg-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      {Object.keys(previewRows[0]).map((col) => (
                        <th key={col} className="px-3 py-2 border-b border-slate-200">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {previewRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        {Object.keys(previewRows[0]).map((col) => (
                          <td key={col} className="px-3 py-1.5 truncate max-w-[180px]">
                            {row[col] !== null && row[col] !== undefined
                              ? typeof row[col] === 'object'
                                ? JSON.stringify(row[col])
                                : String(row[col])
                              : <span className="text-slate-400 font-sans italic">null</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {syncError && (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-800 flex gap-2.5 items-start">
              <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
              <div>
                <p className="font-bold">{t('page.integrations.syncFailed')}</p>
                <p className="mt-0.5">{syncError}</p>
              </div>
            </div>
          )}

          {syncResult && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800 flex gap-2.5 items-start animate-fade-in">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <div>
                <p className="font-bold">{t('page.integrations.syncCompleted')}</p>
                <p className="mt-0.5 font-medium">{syncResult.message}</p>
                <p className="mt-1 font-bold">{t('page.integrations.recordsSynced')}: {syncResult.recordsSynced}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CONNECTION FORM MODAL */}
      {connModalOpen && (
        <ConnectionFormModal
          item={editConn}
          onClose={() => setConnModalOpen(false)}
          onSave={async (payload) => {
            setConnFormLoading(true);
            setConnFormError(null);
            try {
              if (editConn) {
                await apiPatch<IntegrationConnection>(`/integrations/connections/${editConn.id}`, payload);
                toastSuccess(t('page.integrations.connectionUpdated'));
              } else {
                await apiPost<IntegrationConnection>('/integrations/connections', payload);
                toastSuccess(t('page.integrations.connectionCreated'));
              }
              setConnModalOpen(false);
              void fetchConnections();
            } catch (err: unknown) {
              const msg = getApiErrorMessage(err, 'page.integrations.saveConnectionFailed');
              setConnFormError(msg);
              toastError(msg);
            } finally {
              setConnFormLoading(false);
            }
          }}
          isLoading={connFormLoading}
          error={connFormError}
        />
      )}

      {/* MAPPING FORM MODAL */}
      {mapModalOpen && (
        <MappingFormModal
          item={editMap}
          connections={connections}
          onClose={() => setMapModalOpen(false)}
          onSave={async (payload) => {
            setMapFormLoading(true);
            setMapFormError(null);
            try {
              if (editMap) {
                await apiPatch<ImportMapping>(`/integrations/mappings/${editMap.id}`, payload);
                toastSuccess(t('page.integrations.mappingUpdated'));
              } else {
                await apiPost<ImportMapping>('/integrations/mappings', payload);
                toastSuccess(t('page.integrations.mappingCreated'));
              }
              setMapModalOpen(false);
              void fetchMappings();
            } catch (err: unknown) {
              const msg = getApiErrorMessage(err, 'page.integrations.saveMappingFailed');
              setMapFormError(msg);
              toastError(msg);
            } finally {
              setMapFormLoading(false);
            }
          }}
          isLoading={mapFormLoading}
          error={mapFormError}
        />
      )}

      {/* DELETE CONFIRM CONNECTIONS */}
      <ConfirmDialog
        open={deleteConnConfirm !== null}
        message={`Are you sure you want to delete connection "${deleteConnConfirm?.name}"?`}
        isLoading={deleteConnLoading}
        onConfirm={handleDeleteConnection}
        onCancel={() => setDeleteConnConfirm(null)}
      />

      {/* DELETE CONFIRM MAPPINGS */}
      <ConfirmDialog
        open={deleteMapConfirm !== null}
        message={`Are you sure you want to delete mapping template "${deleteMapConfirm?.name}"?`}
        isLoading={deleteMapLoading}
        onConfirm={handleDeleteMapping}
        onCancel={() => setDeleteMapConfirm(null)}
      />
    </div>
  );
}

// ===========================================================================
// SUB-COMPONENT: CONNECTION FORM
// ===========================================================================
interface ConnectionFormModalProps {
  item: IntegrationConnection | null;
  onClose: () => void;
  onSave: (payload: Record<string, unknown>) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

function ConnectionFormModal({ item, onClose, onSave, isLoading, error }: ConnectionFormModalProps) {
  const [name, setName] = useState(item?.name ?? '');
  const [connectionType, setConnectionType] = useState<ConnectionType>(item?.connectionType ?? 'oracle');
  const [host, setHost] = useState(item?.host ?? '');
  const [port, setPort] = useState(item?.port?.toString() ?? '1521');
  const [databaseName, setDatabaseName] = useState(item?.databaseName ?? '');
  const [username, setUsername] = useState(item?.username ?? '');
  const [password, setPassword] = useState('');
  const [apiBaseUrl, setApiBaseUrl] = useState(item?.apiBaseUrl ?? '');
  const [apiKey, setApiKey] = useState('');
  const [syncSchedule, setSyncSchedule] = useState<SyncSchedule>(item?.syncSchedule ?? 'manual');
  const [isActive, setIsActive] = useState(item ? item.isActive : true);

  const [oracleMethod, setOracleMethod] = useState<'cloud' | 'direct'>(
    (item?.extraConfig as Record<string, unknown> | null | undefined)?.oracleMethod === 'cloud' ? 'cloud' : 'direct'
  );

  const isOAuthConfigured = !!(
    process.env.NEXT_PUBLIC_ORACLE_CLIENT_ID ||
    process.env.NEXT_PUBLIC_ORACLE_CLIENT_SECRET
  );

  function handleOracleSignIn() {
    if (isOAuthConfigured) {
      const clientId = process.env.NEXT_PUBLIC_ORACLE_CLIENT_ID;
      const idcsUrl = process.env.NEXT_PUBLIC_ORACLE_IDCS_URL || 'https://identity.oraclecloud.com';
      const redirectUri = `${window.location.origin}/integrations?tab=connections&oracle_oauth=success`;
      window.location.href = `${idcsUrl}/oauth2/v1/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=urn:opc:resource:consumer::all`;
    } else if (process.env.NODE_ENV === 'development') {
      // Simulate successful OAuth sign-in and redirect back with a mock code
      const redirectUri = `${window.location.origin}/integrations?tab=connections&oracle_oauth=success&code=mock_code_ords_${Math.random().toString(36).substring(7)}`;
      window.location.href = redirectUri;
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    const requiresDb = ['oracle', 'sap', 'erp', 'odoo', 'pos', 'sftp'].includes(connectionType);
    const requiresApi = ['rest_api', 'woocommerce', 'custom'].includes(connectionType);

    const payload: Record<string, unknown> = {
      name: name.trim(),
      connectionType,
      syncSchedule,
      isActive,
    };

    if (requiresDb && (connectionType !== 'oracle' || oracleMethod === 'direct')) {
      payload.host = host.trim() || undefined;
      payload.port = port ? Number(port) : undefined;
      payload.databaseName = databaseName.trim() || undefined;
      payload.username = username.trim() || undefined;
      if (password) payload.password = password;
    } else if (connectionType === 'oracle' && oracleMethod === 'cloud') {
      payload.host = host.trim() || 'identity.oraclecloud.com';
      payload.port = port ? Number(port) : 443;
      payload.databaseName = databaseName.trim() || 'ORDS_CLOUD';
      payload.username = username.trim() || 'oauth_user';
      payload.apiBaseUrl = apiBaseUrl.trim() || 'https://ords.oraclecloud.com/ords';
    }

    if (requiresApi && connectionType !== 'oracle') {
      payload.apiBaseUrl = apiBaseUrl.trim() || undefined;
      if (apiKey) payload.apiKey = apiKey;
    }

    payload.extraConfig = {
      ...(item?.extraConfig || {}),
      oracleMethod: connectionType === 'oracle' ? oracleMethod : undefined,
    };

    await onSave(payload);
  }

  const isDb = ['oracle', 'sap', 'erp', 'odoo', 'pos', 'sftp'].includes(connectionType);
  const showDbParams = isDb && (connectionType !== 'oracle' || oracleMethod === 'direct');
  const isApi = ['rest_api', 'woocommerce', 'custom'].includes(connectionType);

  return (
    <Modal open onClose={onClose} title={item ? 'Edit Connection' : 'Add Connection'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Input id="conn-name" label="Connection Name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Production Oracle DB" />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="conn-type" className="text-xs font-semibold text-slate-500">Connection Type</label>
            <select
              id="conn-type"
              value={connectionType}
              onChange={(e) => setConnectionType(e.target.value as ConnectionType)}
              className="h-9 rounded border border-slate-200 bg-white px-3 text-xs text-slate-700 font-semibold"
            >
              {CONNECTION_TYPES.map((t) => (
                <option key={t} value={t} className="capitalize">{t}</option>
              ))}
            </select>
          </div>
        </div>

        {connectionType === 'oracle' && (
          <div className="space-y-3 border-t border-slate-100 pt-3">
            <label className="text-xs font-semibold text-slate-500">Oracle Integration Method</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setOracleMethod('cloud')}
                className={`flex flex-col items-start p-4 rounded-xl border text-left transition-all ${
                  oracleMethod === 'cloud'
                    ? 'border-emerald-600 bg-emerald-50/10 ring-1 ring-emerald-600'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <span className="flex items-center gap-1.5 font-bold text-xs text-slate-800">
                  <Database className="h-4 w-4 text-emerald-600" />
                  Oracle Cloud Sign-In (Recommended)
                </span>
                <span className="text-[10px] text-slate-400 font-medium mt-1">
                  Connect using OAuth SSO & Cloud APIs (ORDS)
                </span>
              </button>

              <button
                type="button"
                onClick={() => setOracleMethod('direct')}
                className={`flex flex-col items-start p-4 rounded-xl border text-left transition-all ${
                  oracleMethod === 'direct'
                    ? 'border-emerald-600 bg-emerald-50/10 ring-1 ring-emerald-600'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <span className="flex items-center gap-1.5 font-bold text-xs text-slate-800">
                  <Layers className="h-4 w-4 text-slate-500" />
                  Direct Oracle Database Connection
                </span>
                <span className="text-[10px] text-slate-400 font-medium mt-1">
                  Connect directly to your local/on-premise Oracle DB
                </span>
              </button>
            </div>
          </div>
        )}

        {connectionType === 'oracle' && oracleMethod === 'cloud' && (
          <div className="space-y-4 pt-2 border-t border-slate-100">
            {!isOAuthConfigured && (
              <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 flex gap-2.5 items-start">
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-amber-950">Configuration Required</p>
                  <p className="mt-1 font-medium text-slate-600">
                    Oracle Cloud OAuth/SSO credentials are not yet configured in the application environment variables.
                  </p>
                  <p className="mt-2 text-slate-500 text-[10px]">
                    To enable production authentication, please add <code className="bg-amber-100 px-1 rounded">NEXT_PUBLIC_ORACLE_CLIENT_ID</code> and <code className="bg-amber-100 px-1 rounded">NEXT_PUBLIC_ORACLE_CLIENT_SECRET</code> to your frontend environment configuration files.
                  </p>
                </div>
              </div>
            )}

            <div className="flex flex-col items-center justify-center p-6 border border-slate-100 rounded-2xl bg-slate-50 text-center gap-3">
              <Database className="h-8 w-8 text-slate-400" />
              <div className="space-y-1">
                <h5 className="font-bold text-xs text-slate-800">Authenticate with Oracle Cloud IDCS</h5>
                <p className="text-[10px] text-slate-400 max-w-sm">
                  Sign in using your Oracle Cloud Account to securely authorize the application to import data via Cloud APIs and ORDS.
                </p>
              </div>

              <button
                type="button"
                onClick={handleOracleSignIn}
                className="bg-[#F80000] hover:bg-[#D80000] text-white flex items-center gap-2 text-xs font-semibold px-5 py-2.5 rounded-lg shadow-sm transition-colors mt-2"
              >
                <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
                </svg>
                Sign in with Oracle
              </button>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-3">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">REST API / ORDS Parameters</h4>
              <Input id="api-url" label="API Base URL" value={apiBaseUrl} onChange={(e) => setApiBaseUrl(e.target.value)} placeholder="https://ords.oraclecloud.com/ords" />
            </div>
          </div>
        )}

        {showDbParams && (
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-3">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Database Connection Parameters</h4>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Input id="db-host" label="Database Host" value={host} onChange={(e) => setHost(e.target.value)} placeholder="localhost or ip" />
              </div>
              <Input id="db-port" label="Port" type="number" value={port} onChange={(e) => setPort(e.target.value)} placeholder="1521" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Input id="db-name" label="DB Name / SID" value={databaseName} onChange={(e) => setDatabaseName(e.target.value)} placeholder="XE" />
              <Input id="db-user" label="Username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="system" />
              <Input id="db-pwd" label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
          </div>
        )}

        {isApi && connectionType !== 'oracle' && (
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-3">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">REST API Integration Parameters</h4>
            <Input id="api-url" label="API Base URL" value={apiBaseUrl} onChange={(e) => setApiBaseUrl(e.target.value)} placeholder="https://api.example.com/v1" />
            <Input id="api-key" label="API Key / Token" type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="API key or token header" />
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="conn-schedule" className="text-xs font-semibold text-slate-500">Synchronization Schedule</label>
            <select
              id="conn-schedule"
              value={syncSchedule}
              onChange={(e) => setSyncSchedule(e.target.value as SyncSchedule)}
              className="h-9 rounded border border-slate-200 bg-white px-3 text-xs text-slate-700 font-semibold"
            >
              {SYNC_SCHEDULES.map((s) => (
                <option key={s} value={s} className="capitalize">{s}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 pt-6">
            <input
              id="conn-active"
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <label htmlFor="conn-active" className="text-xs font-semibold text-slate-700">Connection adapter is active</label>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Button variant="outline" size="sm" type="button" onClick={onClose}>Cancel</Button>
          <Button size="sm" type="submit" isLoading={isLoading}>{item ? 'Save Changes' : 'Add Connection'}</Button>
        </div>
      </form>
    </Modal>
  );
}

// ===========================================================================
// MODULE MAPPING METADATA
// ===========================================================================
const MODULE_FIELDS: Record<string, { key: string; label: string; required?: boolean }[]> = {
  companies: [
    { key: 'code', label: 'Company Code / ID', required: true },
    { key: 'name', label: 'Company Name' },
    { key: 'industryType', label: 'Industry Type (food_manufacturing, food_retail, mixed, other)' },
    { key: 'currencyCode', label: 'Currency Code (e.g. EGP)' },
  ],
  sites: [
    { key: 'name', label: 'Site Name', required: true },
    { key: 'type', label: 'Site Type (factory, branch, warehouse, office, distribution_center)' },
    { key: 'region', label: 'Region' },
  ],
  accounts: [
    { key: 'code', label: 'Account Code', required: true },
    { key: 'name', label: 'Account Name' },
    { key: 'type', label: 'Account Type (revenue, cogs, expense, asset, liability, equity, cashflow)' },
  ],
  costcenters: [
    { key: 'code', label: 'Cost Center Code', required: true },
    { key: 'name', label: 'Cost Center Name' },
    { key: 'type', label: 'Cost Center Type (sales, production, admin, marketing, logistics, maintenance, other)' },
  ],
  productcategories: [
    { key: 'name', label: 'Category Name', required: true },
  ],
  suppliers: [
    { key: 'name', label: 'Supplier Name', required: true },
    { key: 'phone', label: 'Phone' },
    { key: 'email', label: 'Email' },
  ],
  customers: [
    { key: 'code', label: 'Customer Code', required: true },
    { key: 'name', label: 'Customer Name' },
    { key: 'type', label: 'Customer Type (retail, wholesale, distributor, internal, other)' },
    { key: 'region', label: 'Region' },
  ],
  products: [
    { key: 'sku', label: 'Product SKU / Code', required: true },
    { key: 'name', label: 'Product Name' },
    { key: 'category', label: 'Category Name' },
    { key: 'unit', label: 'Unit Symbol' },
    { key: 'salePrice', label: 'Sale Price' },
    { key: 'standardCost', label: 'Standard Cost' },
  ],
  materials: [
    { key: 'code', label: 'Material Code', required: true },
    { key: 'name', label: 'Material Name' },
    { key: 'unit', label: 'Unit Symbol' },
    { key: 'purchasePrice', label: 'Purchase Price' },
    { key: 'supplier', label: 'Supplier Name / Code' },
  ],
  units: [
    { key: 'symbol', label: 'Unit Symbol', required: true },
    { key: 'name', label: 'Unit Name' },
  ],
  bomrecipes: [
    { key: 'productSku', label: 'Product SKU', required: true },
    { key: 'version', label: 'Version (e.g. v1)' },
    { key: 'outputQty', label: 'Output Quantity' },
    { key: 'laborCost', label: 'Labor Cost' },
    { key: 'overheadCost', label: 'Overhead Cost' },
  ],
  bomlines: [
    { key: 'productSku', label: 'Product SKU', required: true },
    { key: 'version', label: 'Version (e.g. v1)' },
    { key: 'materialCode', label: 'Material Code', required: true },
    { key: 'qtyPerOutput', label: 'Quantity Per Output' },
    { key: 'unitCost', label: 'Unit Cost' },
  ],
  inventorysnapshots: [
    { key: 'siteName', label: 'Site Name / Code', required: true },
    { key: 'productSku', label: 'Product SKU' },
    { key: 'materialCode', label: 'Material Code' },
    { key: 'snapshotDate', label: 'Snapshot Date' },
    { key: 'qtyOnHand', label: 'Quantity On Hand' },
    { key: 'inventoryValue', label: 'Inventory Value' },
  ],
  budgetcycles: [
    { key: 'fiscalYear', label: 'Fiscal Year' },
    { key: 'name', label: 'Budget Name' },
    { key: 'status', label: 'Status (draft, under_review, approved, rejected)' },
    { key: 'startDate', label: 'Start Date' },
    { key: 'endDate', label: 'End Date' },
  ],
  budgetlines: [
    { key: 'fiscalYear', label: 'Fiscal Year' },
    { key: 'accountCode', label: 'Account Code', required: true },
    { key: 'siteName', label: 'Site Name / Code' },
    { key: 'costCenterCode', label: 'Cost Center Code' },
    { key: 'productSku', label: 'Product SKU' },
    { key: 'materialCode', label: 'Material Code' },
    { key: 'customerCode', label: 'Customer Code' },
    { key: 'periodMonth', label: 'Period Month (1-12)' },
    { key: 'quantity', label: 'Quantity' },
    { key: 'unitPrice', label: 'Unit Price' },
    { key: 'amount', label: 'Amount' },
    { key: 'notes', label: 'Notes' },
  ],
  forecastcycles: [
    { key: 'fiscalYear', label: 'Fiscal Year' },
    { key: 'name', label: 'Forecast Name' },
    { key: 'basePeriod', label: 'Base Period' },
    { key: 'status', label: 'Status (draft, under_review, approved, rejected)' },
  ],
  forecastlines: [
    { key: 'fiscalYear', label: 'Fiscal Year' },
    { key: 'accountCode', label: 'Account Code', required: true },
    { key: 'siteName', label: 'Site Name / Code' },
    { key: 'costCenterCode', label: 'Cost Center Code' },
    { key: 'productSku', label: 'Product SKU' },
    { key: 'materialCode', label: 'Material Code' },
    { key: 'customerCode', label: 'Customer Code' },
    { key: 'periodMonth', label: 'Period Month (1-12)' },
    { key: 'quantity', label: 'Quantity' },
    { key: 'unitPrice', label: 'Unit Price' },
    { key: 'amount', label: 'Amount' },
    { key: 'driverType', label: 'Driver Type' },
    { key: 'notes', label: 'Notes' },
  ],
  productionplans: [
    { key: 'siteName', label: 'Site Name / Code', required: true },
    { key: 'productSku', label: 'Product SKU', required: true },
    { key: 'planSource', label: 'Plan Source (manual, auto)' },
    { key: 'fiscalYear', label: 'Fiscal Year' },
    { key: 'periodMonth', label: 'Period Month (1-12)' },
    { key: 'plannedQty', label: 'Planned Quantity' },
    { key: 'actualQty', label: 'Actual Quantity' },
    { key: 'estimatedCost', label: 'Estimated Cost' },
    { key: 'actualCost', label: 'Actual Cost' },
  ],
  headcountplans: [
    { key: 'fiscalYear', label: 'Fiscal Year' },
    { key: 'siteName', label: 'Site Name / Code' },
    { key: 'costCenterCode', label: 'Cost Center Code' },
    { key: 'jobTitle', label: 'Job Title' },
    { key: 'department', label: 'Department' },
    { key: 'employmentType', label: 'Employment Type (full_time, part_time, contract, seasonal)' },
    { key: 'headcount', label: 'Headcount' },
    { key: 'periodMonth', label: 'Period Month (1-12)' },
    { key: 'basicSalary', label: 'Basic Salary' },
    { key: 'allowances', label: 'Allowances' },
    { key: 'socialInsurance', label: 'Social Insurance' },
    { key: 'totalCost', label: 'Total Cost' },
    { key: 'notes', label: 'Notes' },
  ],
  promotions: [
    { key: 'name', label: 'Promotion Name', required: true },
    { key: 'description', label: 'Description' },
    { key: 'productSku', label: 'Product SKU' },
    { key: 'customerCode', label: 'Customer Code' },
    { key: 'discountPct', label: 'Discount Percentage' },
    { key: 'discountAmount', label: 'Discount Amount' },
    { key: 'startDate', label: 'Start Date' },
    { key: 'endDate', label: 'End Date' },
    { key: 'budgetAmount', label: 'Budget Amount' },
    { key: 'actualCost', label: 'Actual Cost' },
    { key: 'incrementalRevenue', label: 'Incremental Revenue' },
    { key: 'roi', label: 'ROI' },
    { key: 'isActive', label: 'Is Active (Y/N/true/false)' },
  ],
  rawmaterialprices: [
    { key: 'materialCode', label: 'Material Code', required: true },
    { key: 'price', label: 'Price' },
    { key: 'priceDate', label: 'Price Date' },
    { key: 'source', label: 'Source' },
  ],
};

// ===========================================================================
// SUB-COMPONENT: MAPPING FORM
// ===========================================================================
interface MappingFormModalProps {
  item: ImportMapping | null;
  connections: IntegrationConnection[];
  onClose: () => void;
  onSave: (payload: Record<string, any>) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

function MappingFormModal({ item, connections, onClose, onSave, isLoading, error }: MappingFormModalProps) {
  const { error: toastError } = useToast();
  const { t } = useI18n();
  const [name, setName] = useState(item?.name ?? '');
  const [connectionId, setConnectionId] = useState(item?.connectionId ?? '');
  const [sourceSystem, setSourceSystem] = useState<ImportSourceSystem>(item?.sourceSystem ?? 'excel');
  const [importType, setImportType] = useState<ImportType>(item?.importType ?? 'gl');
  const [skipErrors, setSkipErrors] = useState(item?.skipErrors ?? false);
  const [isDefault, setIsDefault] = useState(item?.isDefault ?? false);
  const [isActive, setIsActive] = useState(item ? (item.isActive ?? true) : true);

  // Field Mapping states for standard GL mapping
  const [mapAccountCode, setMapAccountCode] = useState(
    item?.mappingConfig && !item.mappingConfig.targetModule
      ? (item.mappingConfig.accountCode as string) ?? 'Account Code'
      : 'Account Code'
  );
  const [mapAmount, setMapAmount] = useState(
    item?.mappingConfig && !item.mappingConfig.targetModule
      ? (item.mappingConfig.amount as string) ?? 'Amount'
      : 'Amount'
  );
  const [mapDate, setMapDate] = useState(
    item?.mappingConfig && !item.mappingConfig.targetModule
      ? (item.mappingConfig.transactionDate as string) ?? 'Date'
      : 'Date'
  );
  const [mapQty, setMapQty] = useState(
    item?.mappingConfig && !item.mappingConfig.targetModule
      ? (item.mappingConfig.quantity as string) ?? 'Quantity'
      : 'Quantity'
  );
  const [mapPrice, setMapPrice] = useState(
    item?.mappingConfig && !item.mappingConfig.targetModule
      ? (item.mappingConfig.unitPrice as string) ?? 'Unit Price'
      : 'Unit Price'
  );
  const [mapRef, setMapRef] = useState(
    item?.mappingConfig && !item.mappingConfig.targetModule
      ? (item.mappingConfig.referenceNo as string) ?? 'Reference'
      : 'Reference'
  );

  // Custom mapping states
  const initialIsCustom = !!item?.mappingConfig?.targetModule;
  const [isCustom, setIsCustom] = useState(initialIsCustom);
  const [targetModule, setTargetModule] = useState(
    (item?.mappingConfig?.targetModule as string) ?? 'companies'
  );
  const [sourceTable, setSourceTable] = useState(
    (item?.mappingConfig?.sourceTable as string) ?? ''
  );
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>(() => {
    if (initialIsCustom && item?.mappingConfig?.columnMapping) {
      return item.mappingConfig.columnMapping as unknown as Record<string, string>;
    }
    return {};
  });

  // Schema Discovery states
  const [oracleTables, setOracleTables] = useState<{ OWNER: string; TABLE_NAME: string; TABLE_TYPE: string }[]>([]);
  const [oracleColumns, setOracleColumns] = useState<{ COLUMN_NAME: string; DATA_TYPE: string }[]>([]);
  const [loadingTables, setLoadingTables] = useState(false);
  const [loadingColumns, setLoadingColumns] = useState(false);
  const [tableMode, setTableMode] = useState<'select' | 'manual'>('manual');
  const [columnMode, setColumnMode] = useState<'select' | 'manual'>('manual');

  const selectedConn = connections.find(c => c.id === connectionId);
  const isOracle = selectedConn?.connectionType === 'oracle';

  // Discover Oracle Tables/Views
  useEffect(() => {
    if (connectionId && isOracle) {
      setLoadingTables(true);
      apiGet<{ OWNER: string; TABLE_NAME: string; TABLE_TYPE: string }[] | any>(
        `/integrations/connections/${connectionId}/oracle-schema/tables`
      )
        .then((res) => {
          const list = Array.isArray(res) ? res : (res?.data || []);
          setOracleTables(list);
          if (list.length > 0) {
            setTableMode('select');
          } else {
            setTableMode('manual');
          }
        })
        .catch((err) => {
          console.error('Failed to discover Oracle tables:', err);
          setTableMode('manual');
        })
        .finally(() => {
          setLoadingTables(false);
        });
    } else {
      setOracleTables([]);
      setTableMode('manual');
    }
  }, [connectionId, isOracle]);

  // Discover Oracle Table Columns
  useEffect(() => {
    if (connectionId && sourceTable && isOracle && tableMode === 'select') {
      setLoadingColumns(true);
      apiGet<{ COLUMN_NAME: string; DATA_TYPE: string }[] | any>(
        `/integrations/connections/${connectionId}/oracle-schema/tables/${sourceTable}/columns`
      )
        .then((res) => {
          const list = Array.isArray(res) ? res : (res?.data || []);
          setOracleColumns(list);
          if (list.length > 0) {
            setColumnMode('select');
          } else {
            setColumnMode('manual');
          }
        })
        .catch((err) => {
          console.error('Failed to discover columns:', err);
          setColumnMode('manual');
        })
        .finally(() => {
          setLoadingColumns(false);
        });
    } else {
      setOracleColumns([]);
      setColumnMode('manual');
    }
  }, [connectionId, sourceTable, isOracle, tableMode]);

  // Handle module changing: pre-populate empty keys
  useEffect(() => {
    const fields = MODULE_FIELDS[targetModule] || [];
    setColumnMapping((prev) => {
      const next = { ...prev };
      fields.forEach((f) => {
        if (next[f.key] === undefined) {
          next[f.key] = '';
        }
      });
      return next;
    });
  }, [targetModule]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    let payload: Record<string, any>;

    if (isCustom) {
      // Validate that required fields are present in columnMapping
      const fields = MODULE_FIELDS[targetModule] || [];
      for (const f of fields) {
        if (f.required && (!columnMapping[f.key] || !columnMapping[f.key].trim())) {
          toastError(t('page.integrations.fieldRequired', { label: f.label }));
          return;
        }
      }

      const cleanColMapping: Record<string, string | null> = {};
      Object.keys(columnMapping).forEach((k) => {
        const val = columnMapping[k];
        cleanColMapping[k] = val && val.trim() ? val.trim() : null;
      });

      payload = {
        name: name.trim(),
        connectionId: connectionId || null,
        sourceSystem,
        importType,
        mappingConfig: {
          targetModule,
          sourceTable: sourceTable.trim() || undefined,
          columnMapping: cleanColMapping,
        },
        skipErrors,
        isDefault,
        isActive,
      };
    } else {
      const mappingConfig: Record<string, string | null> = {
        accountCode: mapAccountCode.trim() || null,
        amount: mapAmount.trim() || null,
        transactionDate: mapDate.trim() || null,
        quantity: mapQty.trim() || null,
        unitPrice: mapPrice.trim() || null,
        referenceNo: mapRef.trim() || null,
      };

      payload = {
        name: name.trim(),
        connectionId: connectionId || null,
        sourceSystem,
        importType,
        mappingConfig,
        skipErrors,
        isDefault,
        isActive,
      };
    }

    await onSave(payload);
  }

  return (
    <Modal open onClose={onClose} title={item ? 'Edit Mapping Template' : 'Add Mapping Template'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
        {error && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Input id="map-name" label="Template Name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. SAP Ledger Stream" />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="map-conn" className="text-xs font-semibold text-slate-500">Associated Connection (Optional)</label>
            <select
              id="map-conn"
              value={connectionId}
              onChange={(e) => setConnectionId(e.target.value)}
              className="h-9 rounded border border-slate-200 bg-white px-3 text-xs text-slate-700 font-semibold"
            >
              <option value="">None / CSV Paste upload</option>
              {connections.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.connectionType})</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="map-source" className="text-xs font-semibold text-slate-500">Source System</label>
            <select
              id="map-source"
              value={sourceSystem}
              onChange={(e) => setSourceSystem(e.target.value as ImportSourceSystem)}
              className="h-9 rounded border border-slate-200 bg-white px-3 text-xs text-slate-700 font-semibold"
            >
              {SOURCE_SYSTEMS.map((s) => (
                <option key={s} value={s} className="capitalize">{s}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="map-type" className="text-xs font-semibold text-slate-500">Data Import Type</label>
            <select
              id="map-type"
              value={importType}
              onChange={(e) => setImportType(e.target.value as ImportType)}
              className="h-9 rounded border border-slate-200 bg-white px-3 text-xs text-slate-700 font-semibold"
            >
              {IMPORT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="map-mode" className="text-xs font-semibold text-slate-500">Mapping Mode</label>
            <select
              id="map-mode"
              value={isCustom ? 'custom' : 'standard'}
              onChange={(e) => {
                const val = e.target.value === 'custom';
                setIsCustom(val);
              }}
              className="h-9 rounded border border-slate-200 bg-white px-3 text-xs text-slate-700 font-semibold"
            >
              <option value="standard">Standard General Ledger (GL) Sync</option>
              <option value="custom">Custom Module Table Mapping</option>
            </select>
          </div>
        </div>

        {/* MAPPING CONFIG DETAILS */}
        {isCustom ? (
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="target-module" className="text-xs font-semibold text-slate-500">Target Module</label>
                <select
                  id="target-module"
                  value={targetModule}
                  onChange={(e) => setTargetModule(e.target.value)}
                  className="h-9 rounded border border-slate-200 bg-white px-3 text-xs text-slate-700 font-semibold capitalize"
                >
                  {Object.keys(MODULE_FIELDS).map((mod) => (
                    <option key={mod} value={mod}>
                      {mod.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <label htmlFor="source-table" className="text-xs font-semibold text-slate-500">Oracle Source Table / View</label>
                  {isOracle && oracleTables.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setTableMode(tableMode === 'select' ? 'manual' : 'select')}
                      className="text-[10px] text-emerald-600 font-bold hover:underline"
                    >
                      {tableMode === 'select' ? 'Type manually' : 'Select from discovered list'}
                    </button>
                  )}
                </div>
                {tableMode === 'select' && isOracle && oracleTables.length > 0 ? (
                  <select
                    id="source-table"
                    value={sourceTable}
                    onChange={(e) => setSourceTable(e.target.value)}
                    className="h-9 rounded border border-slate-200 bg-white px-3 text-xs text-slate-700 font-semibold"
                    disabled={loadingTables}
                  >
                    <option value="">-- Select Oracle Table/View --</option>
                    {oracleTables.map((t) => (
                      <option key={`${t.OWNER}.${t.TABLE_NAME}`} value={t.TABLE_NAME}>
                        {t.TABLE_NAME} ({t.TABLE_TYPE})
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    id="source-table"
                    value={sourceTable}
                    onChange={(e) => setSourceTable(e.target.value)}
                    placeholder="e.g. CUSTOM_ORACLE_TABLE"
                  />
                )}
                {loadingTables && <span className="text-[10px] text-slate-400">Loading tables/views from Oracle...</span>}
              </div>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Map Custom Table Columns</h4>
                {isOracle && oracleColumns.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setColumnMode(columnMode === 'select' ? 'manual' : 'select')}
                    className="text-[10px] text-emerald-600 font-bold hover:underline"
                  >
                    {columnMode === 'select' ? 'Type columns manually' : 'Select columns from schema'}
                  </button>
                )}
              </div>

              {loadingColumns && <div className="text-xs text-slate-400">Loading table columns...</div>}

              <div className="grid grid-cols-2 gap-4">
                {(MODULE_FIELDS[targetModule] || []).map((f) => (
                  <div key={f.key} className="flex flex-col gap-1.5">
                    <label htmlFor={`field-${f.key}`} className="text-xs font-semibold text-slate-600">
                      {f.label} {f.required && <span className="text-red-500">*</span>}
                    </label>
                    {columnMode === 'select' && isOracle && oracleColumns.length > 0 ? (
                      <select
                        id={`field-${f.key}`}
                        value={columnMapping[f.key] || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setColumnMapping((prev) => ({ ...prev, [f.key]: val }));
                        }}
                        className="h-9 rounded border border-slate-200 bg-white px-3 text-xs text-slate-700 font-semibold"
                        required={f.required}
                      >
                        <option value="">-- Mapped Column --</option>
                        {oracleColumns.map((col) => (
                          <option key={col.COLUMN_NAME} value={col.COLUMN_NAME}>
                            {col.COLUMN_NAME} ({col.DATA_TYPE})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Input
                        id={`field-${f.key}`}
                        value={columnMapping[f.key] || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setColumnMapping((prev) => ({ ...prev, [f.key]: val }));
                        }}
                        placeholder="e.g. COLUMN_NAME"
                        required={f.required}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-3">
            <div className="flex justify-between items-center border-b border-slate-200 pb-2">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Map Columns to Logical Fields</h4>
              <span className="text-[9px] text-slate-400 font-medium">Specify the column headers as they appear in source data</span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Input id="val-acc" label="GL Account Code" required value={mapAccountCode} onChange={(e) => setMapAccountCode(e.target.value)} />
              <Input id="val-amt" label="Amount" required value={mapAmount} onChange={(e) => setMapAmount(e.target.value)} />
              <Input id="val-date" label="Transaction Date" required value={mapDate} onChange={(e) => setMapDate(e.target.value)} />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Input id="val-qty" label="Quantity" value={mapQty} onChange={(e) => setMapQty(e.target.value)} />
              <Input id="val-price" label="Unit Price" value={mapPrice} onChange={(e) => setMapPrice(e.target.value)} />
              <Input id="val-ref" label="Reference No" value={mapRef} onChange={(e) => setMapRef(e.target.value)} />
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-3">
          <div className="flex items-center gap-2">
            <input
              id="map-skip"
              type="checkbox"
              checked={skipErrors}
              onChange={(e) => setSkipErrors(e.target.checked)}
              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <label htmlFor="map-skip" className="text-xs font-semibold text-slate-700">Skip error rows</label>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="map-default"
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <label htmlFor="map-default" className="text-xs font-semibold text-slate-700">Set as default</label>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="map-active"
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <label htmlFor="map-active" className="text-xs font-semibold text-slate-700">Active template</label>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Button variant="outline" size="sm" type="button" onClick={onClose}>Cancel</Button>
          <Button size="sm" type="submit" isLoading={isLoading}>{item ? 'Save Changes' : 'Create Template'}</Button>
        </div>
      </form>
    </Modal>
  );
}
