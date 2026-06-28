'use client';

import React, { useCallback, useRef, useState } from 'react';
import {
  Upload,
  Download,
  X,
  CheckCircle,
  AlertCircle,
  FileText,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  AlertTriangle,
  ListOrdered,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/toast';
import api from '@/lib/api';
import axios from 'axios';
import { useI18n } from '@/lib/i18n/i18n-context';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface RowPreviewResult {
  index: number;
  data: Record<string, unknown>;
  isValid: boolean;
  errors: string[];
}

export interface MissingDataItem {
  type: string;
  value: string;
  row: number;
  column: string;
  howToFix: string;
}

export interface ImportErrorResponse {
  success: false;
  errorType: string;
  title: string;
  message: string;
  steps: string[];
  missingData: MissingDataItem[];
  actions: string[];
}

export interface ImportModalProps {
  /** The module key, e.g. "sites", "accounts", "budget-lines" */
  module: string;
  /** Human-readable label shown in the UI */
  moduleLabel: string;
  onClose: () => void;
  onSuccess: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function apiBase(): string {
  return (
    process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api'
  );
}

function authHeaders(token: string, companyId: string) {
  return {
    Authorization: `Bearer ${token}`,
    'x-company-id': companyId,
  };
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function generateClientCsv(
  rows: RowPreviewResult[],
  type: 'errors' | 'skipped',
): string {
  const filtered =
    type === 'errors'
      ? rows.filter((r) => !r.isValid)
      : rows.filter((r) => r.isValid);

  if (filtered.length === 0) return '';

  const allKeys = new Set<string>();
  for (const row of filtered) {
    for (const key of Object.keys(row.data)) {
      allKeys.add(key);
    }
  }
  const columns = Array.from(allKeys);

  const header = ['Row', ...columns, 'Errors'].join(',');
  const lines = filtered.map((row) => {
    const values = columns.map((col) => {
      const val = row.data[col];
      if (val == null) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    });
    return [row.index, ...values, row.errors.join('; ')].join(',');
  });

  return [header, ...lines].join('\n');
}

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function ImportModal({
  module,
  moduleLabel,
  onClose,
  onSuccess,
}: ImportModalProps) {
  const { activeCompanyId, isAuthenticated } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const { t } = useI18n();
  const token = isAuthenticated;

  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const [previewRows, setPreviewRows] = useState<RowPreviewResult[] | null>(
    null,
  );
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Progress bar state
  const [progress, setProgress] = useState(0);
  const [progressStatus, setProgressStatus] = useState<string>('');

  // Import statistics
  const [importStats, setImportStats] = useState<{
    successCount: number;
    failCount: number;
    skippedCount: number;
    timeTaken: number;
  } | null>(null);

  // Expanded error rows
  const [expandedErrors, setExpandedErrors] = useState<Set<number>>(
    new Set(),
  );

  // Structured error response from backend
  const [structuredError, setStructuredError] = useState<ImportErrorResponse | null>(null);

  // -------------------------------------------------------------------------
  // Download sample template
  // -------------------------------------------------------------------------
  async function handleDownloadTemplate() {
    if (!token) return;
    setIsDownloading(true);
    try {
      const res = await api.get(
        `/imports/sample/${module}`,
        {
          responseType: 'blob',
        },
      );
      const contentType = (res.headers as Record<string, string>)['content-type'] || '';
      const isXlsx = contentType.includes('spreadsheetml') || contentType.includes('ms-excel');
      const extension = isXlsx ? 'xlsx' : 'csv';
      const url = URL.createObjectURL(new Blob([res.data as BlobPart]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${module}_template.${extension}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toastError(t('component.importModal.downloadFailed'));
    } finally {
      setIsDownloading(false);
    }
  }

  // -------------------------------------------------------------------------
  // File selection
  // -------------------------------------------------------------------------
  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setFileSize(file.size);
    setPreviewRows(null);
    setImportStats(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const base64 = (evt.target?.result as string).split(',')[1];
      setFileContent(base64);
    };
    reader.readAsDataURL(file);
  }

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file && fileRef.current) {
        const dt = new DataTransfer();
        dt.items.add(file);
        fileRef.current.files = dt.files;
        fileRef.current.dispatchEvent(
          new Event('change', { bubbles: true }),
        );
      }
    },
    [],
  );

  // -------------------------------------------------------------------------
  // Preview
  // -------------------------------------------------------------------------
  async function handlePreview() {
    if (!fileContent || !fileName || !token || !activeCompanyId) return;
    setIsPreviewing(true);
    setProgress(0);
    setProgressStatus(t('component.importModal.progressValidating'));

    // Simulate progress during preview
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 200);

    try {
      const res = await api.post(
        `/imports/preview`,
        { module, fileContent, fileName },
      );
      clearInterval(progressInterval);
      setProgress(100);
      setProgressStatus(t('component.importModal.progressComplete'));

      const data = res.data;

      // Check if backend returned a structured error response
      if (data && typeof data === 'object' && 'errorType' in data && 'missingData' in data) {
        setStructuredError(data as ImportErrorResponse);
        setPreviewRows(null);
      } else if (Array.isArray(data)) {
        setPreviewRows(data as RowPreviewResult[]);
        setStructuredError(null);
      }
    } catch (err: unknown) {
      clearInterval(progressInterval);
      setProgress(0);
      setProgressStatus('');
      const msg =
        axios.isAxiosError(err)
          ? ((err.response?.data as { message?: string })?.message ??
            t('component.importModal.previewFailed'))
          : t('component.importModal.previewFailed');
      toastError(msg);
    } finally {
      setIsPreviewing(false);
    }
  }

  // -------------------------------------------------------------------------
  // Commit
  // -------------------------------------------------------------------------
  async function handleCommit() {
    if (!previewRows || !token || !activeCompanyId) return;
    const validRows = previewRows.filter((r) => r.isValid).map((r) => r.data);
    if (validRows.length === 0) {
      toastError(t('component.importModal.noValidRows'));
      return;
    }
    setIsCommitting(true);
    setProgress(0);
    setProgressStatus(t('component.importModal.progressUploading'));

    const startTime = Date.now();

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 5;
      });
    }, 150);

    try {
      const res = await api.post<{
        successCount: number;
        failCount: number;
      }>(
        `/imports/commit`,
        { module, rows: validRows },
      );
      clearInterval(progressInterval);
      setProgress(100);
      setProgressStatus(t('component.importModal.progressComplete'));

      const { successCount, failCount } = res.data;
      const skippedCount = previewRows.length - validRows.length;
      const timeTaken = Date.now() - startTime;

      setImportStats({
        successCount,
        failCount,
        skippedCount,
        timeTaken,
      });

      if (successCount > 0) {
        toastSuccess(
          t('component.importModal.importSuccess', { count: successCount }),
        );
        onSuccess();
      } else {
        toastError(t('component.importModal.noCommit'));
      }
    } catch (err: unknown) {
      clearInterval(progressInterval);
      setProgress(0);
      setProgressStatus('');
      const msg =
        axios.isAxiosError(err)
          ? ((err.response?.data as { message?: string })?.message ??
            t('component.importModal.importFailed'))
          : t('component.importModal.importFailed');
      toastError(msg);
    } finally {
      setIsCommitting(false);
    }
  }

  // -------------------------------------------------------------------------
  // Error / Skipped file download
  // -------------------------------------------------------------------------
  function handleDownloadErrors() {
    if (!previewRows) return;
    const csv = generateClientCsv(previewRows, 'errors');
    if (csv) downloadCsv(csv, `${module}_error_rows.csv`);
  }

  function handleDownloadSkipped() {
    if (!previewRows) return;
    const csv = generateClientCsv(previewRows, 'skipped');
    if (csv) downloadCsv(csv, `${module}_skipped_rows.csv`);
  }

  function handleCancelImport() {
    setPreviewRows(null);
    setFileName(null);
    setFileSize(null);
    setFileContent(null);
    setImportStats(null);
    setStructuredError(null);
    setProgress(0);
    setProgressStatus('');
    setExpandedErrors(new Set());
    if (fileRef.current) fileRef.current.value = '';
  }

  function toggleErrorRow(index: number) {
    setExpandedErrors((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  // -------------------------------------------------------------------------
  // Computed
  // -------------------------------------------------------------------------
  const validCount = previewRows?.filter((r) => r.isValid).length ?? 0;
  const invalidCount = previewRows?.filter((r) => !r.isValid).length ?? 0;
  const totalCount = previewRows?.length ?? 0;
  const isProcessing = isPreviewing || isCommitting;

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 flex w-full max-w-2xl flex-col rounded-2xl border border-border bg-card shadow-xl max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 flex-shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <h2 className="text-base font-semibold text-card-foreground">
              {t('component.importModal.title', { module: moduleLabel })}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-card-foreground transition-colors cursor-pointer"
            aria-label={t('component.importModal.close')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Import Statistics (shown after commit) */}
          {importStats && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4">
              <h3 className="text-sm font-semibold text-emerald-800 mb-3">
                {t('component.importModal.importComplete')}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                  <span className="text-sm text-emerald-700">
                    {t('component.importModal.statSuccess', {
                      n: importStats.successCount,
                    })}
                  </span>
                </div>
                {importStats.failCount > 0 && (
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <span className="text-sm text-red-600">
                      {t('component.importModal.statFailed', {
                        n: importStats.failCount,
                      })}
                    </span>
                  </div>
                )}
                {importStats.skippedCount > 0 && (
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                    <span className="text-sm text-amber-600">
                      {t('component.importModal.statSkipped', {
                        n: importStats.skippedCount,
                      })}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {t('component.importModal.statTime', {
                      s: (importStats.timeTaken / 1000).toFixed(1),
                    })}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Instructions + Download */}
          {!importStats && (
            <div className="rounded-xl border border-border bg-secondary/50 px-4 py-4 space-y-2">
              <p className="text-sm font-medium text-card-foreground">
                {t('component.importModal.howItWorks')}
              </p>
              <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
                <li>{t('component.importModal.instruction1')}</li>
                <li>{t('component.importModal.instruction2')}</li>
                <li>{t('component.importModal.instruction3')}</li>
                <li>{t('component.importModal.instruction4')}</li>
                <li>{t('component.importModal.instruction5')}</li>
              </ol>
              <Button
                size="sm"
                variant="outline"
                isLoading={isDownloading}
                onClick={handleDownloadTemplate}
                className="mt-2"
                id={`${module}-download-template-btn`}
              >
                <Download className="h-3.5 w-3.5" />
                {t('component.importModal.downloadTemplate')}
              </Button>
            </div>
          )}

          {/* Step 2: Upload - Drag & Drop Zone */}
          {!importStats && (
            <div>
              <p className="text-sm font-medium text-card-foreground mb-2">
                {t('component.importModal.uploadFile')}
              </p>
              <div
                className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 cursor-pointer transition-all ${
                  isDragOver
                    ? 'border-emerald-500 bg-emerald-50'
                    : fileName
                      ? 'border-emerald-300 bg-emerald-50/50'
                      : 'border-slate-200 bg-white hover:border-emerald-400'
                }`}
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
              >
                <Upload
                  className={`h-8 w-8 ${
                    isDragOver
                      ? 'text-emerald-500'
                      : fileName
                        ? 'text-emerald-400'
                        : 'text-slate-300'
                  }`}
                />
                {fileName ? (
                  <div className="text-center">
                    <p className="text-sm font-medium text-emerald-600">
                      {fileName}
                    </p>
                    {fileSize != null && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatFileSize(fileSize)}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">
                      {t('component.importModal.dragDrop')}
                    </p>
                    <p className="text-xs text-muted-foreground/60 mt-1">
                      .csv, .xlsx, .xls
                    </p>
                  </div>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="sr-only"
                  onChange={handleFileSelect}
                />
              </div>
              {fileContent && !previewRows && (
                <div className="mt-3 flex justify-end">
                  <Button
                    size="sm"
                    isLoading={isPreviewing}
                    onClick={handlePreview}
                    id={`${module}-preview-btn`}
                  >
                    {t('component.importModal.validatePreview')}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Progress Bar */}
          {isProcessing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-card-foreground">{progressStatus}</span>
                <span className="text-sm font-medium text-card-foreground">
                  {progress}%
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Structured Error Response */}
          {structuredError && !importStats && (
            <div className="space-y-4">
              {/* Error Summary Card */}
              <div className="rounded-xl border border-red-200 bg-red-50 p-5 dark:border-red-900/30 dark:bg-red-950/20">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-red-800 dark:text-red-400">
                      {structuredError.title}
                    </h3>
                    <p className="text-xs text-red-700 dark:text-red-300">
                      {structuredError.message}
                    </p>
                  </div>
                </div>
              </div>

              {/* Missing Master Data Section */}
              {structuredError.missingData.length > 0 && (
                <div className="rounded-xl border border-border bg-card p-4">
                  <h4 className="text-xs font-semibold text-card-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                    <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                    {t('import.error.missingData')}
                  </h4>
                  <div className="space-y-2">
                    {structuredError.missingData.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2 rounded-lg bg-secondary/50 px-3 py-2 text-xs"
                      >
                        <ArrowRight className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
                        <div>
                          <span className="font-medium text-card-foreground">
                            {item.type}:
                          </span>{' '}
                          <span className="text-muted-foreground">
                            &ldquo;{item.value}&rdquo;
                          </span>
                          <span className="text-muted-foreground ml-1">
                            (Row {item.row}, {item.column})
                          </span>
                          <p className="text-muted-foreground/80 mt-0.5 text-[11px]">
                            {item.howToFix}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Required Steps Section */}
              {structuredError.steps.length > 0 && (
                <div className="rounded-xl border border-border bg-card p-4">
                  <h4 className="text-xs font-semibold text-card-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                    <ListOrdered className="h-3.5 w-3.5 text-primary" />
                    {t('import.error.requiredSteps')}
                  </h4>
                  <ol className="space-y-1.5">
                    {structuredError.steps.map((step, idx) => (
                      <li
                        key={idx}
                        className="flex items-center gap-2 text-xs text-card-foreground"
                      >
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                          {idx + 1}
                        </span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Row-Level Error Details */}
              {structuredError.errorType === 'VALIDATION_ERRORS' && (
                <div className="rounded-xl border border-border bg-card p-4">
                  <h4 className="text-xs font-semibold text-card-foreground uppercase tracking-wider mb-3">
                    {t('import.error.rowDetails')}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {t('import.error.invalidRows', { n: String(structuredError.missingData.length) })}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDownloadTemplate}
                  isLoading={isDownloading}
                >
                  <Download className="h-3.5 w-3.5" />
                  {t('import.error.actions.downloadTemplate')}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCancelImport}
                >
                  {t('import.error.actions.clearReUpload')}
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Preview table */}
          {previewRows && !importStats && !structuredError && (
            <div>
              {/* Summary */}
              <div className="mb-3 flex items-center gap-4 flex-wrap">
                <span className="text-sm text-muted-foreground">
                  {t('component.importModal.rowSummary', {
                    valid: validCount,
                    invalid: invalidCount,
                    total: totalCount,
                  })}
                </span>
                <span className="flex items-center gap-1 text-sm text-emerald-700">
                  <CheckCircle className="h-4 w-4" />
                  {t('component.importModal.validCount', { n: validCount })}
                </span>
                {invalidCount > 0 && (
                  <span className="flex items-center gap-1 text-sm text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    {t('component.importModal.errorCount', { n: invalidCount })}
                  </span>
                )}
                <button
                  className="ml-auto text-xs text-muted-foreground underline hover:text-card-foreground"
                  onClick={handleCancelImport}
                >
                  {t('component.importModal.clearReUpload')}
                </button>
              </div>

              {/* Error actions */}
              {invalidCount > 0 && (
                <div className="mb-3 flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleDownloadErrors}
                  >
                    <Download className="h-3.5 w-3.5" />
                    {t('component.importModal.downloadErrors')}
                  </Button>
                  {validCount > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleDownloadSkipped}
                    >
                      <Download className="h-3.5 w-3.5" />
                      {t('component.importModal.downloadSkipped')}
                    </Button>
                  )}
                </div>
              )}

              {/* Table */}
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-secondary/50">
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground w-10">
                        #
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                        {t('component.importModal.status')}
                      </th>
                      {Object.keys(previewRows[0]?.data ?? {}).map((col) => (
                        <th
                          key={col}
                          className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap"
                        >
                          {col}
                        </th>
                      ))}
                      {!previewRows.every((r) => r.isValid) && (
                        <th className="px-3 py-2 w-8" />
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {previewRows.map((row) => (
                      <React.Fragment key={row.index}>
                        <tr
                          className={
                            row.isValid
                              ? 'bg-white border-l-2 border-l-emerald-400'
                              : 'bg-red-50 border-l-2 border-l-red-400'
                          }
                        >
                          <td className="px-3 py-2 text-muted-foreground">
                            {row.index}
                          </td>
                          <td className="px-3 py-2">
                            {row.isValid ? (
                              <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                            ) : (
                              <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                            )}
                          </td>
                          {Object.values(row.data).map((val, i) => (
                            <td
                              key={i}
                              className="px-3 py-2 text-card-foreground whitespace-nowrap"
                            >
                              {val != null ? String(val) : '—'}
                            </td>
                          ))}
                          {!row.isValid && (
                            <td className="px-3 py-2">
                              <button
                                onClick={() => toggleErrorRow(row.index)}
                                className="text-muted-foreground hover:text-card-foreground"
                              >
                                {expandedErrors.has(row.index) ? (
                                  <ChevronUp className="h-3.5 w-3.5" />
                                ) : (
                                  <ChevronDown className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </td>
                          )}
                        </tr>
                        {!row.isValid && expandedErrors.has(row.index) && (
                          <tr className="bg-red-50">
                            <td />
                            <td
                              colSpan={
                                Object.keys(row.data).length + 2
                              }
                              className="px-3 pb-2 text-xs text-red-600"
                            >
                              <ul className="list-disc list-inside space-y-0.5">
                                {row.errors.map((err, i) => (
                                  <li key={i}>{err}</li>
                                ))}
                              </ul>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4 flex-shrink-0">
          {importStats ? (
            <Button variant="outline" size="sm" onClick={onClose}>
              {t('common.close')}
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={
                  previewRows ? handleCancelImport : onClose
                }
              >
                {previewRows
                  ? t('component.importModal.cancelImport')
                  : t('common.cancel')}
              </Button>
              {previewRows && validCount > 0 && (
                <Button
                  size="sm"
                  isLoading={isCommitting}
                  onClick={handleCommit}
                  id={`${module}-commit-btn`}
                >
                  {t('component.importModal.importRows', {
                    n: validCount,
                    s: validCount !== 1 ? 's' : '',
                  })}
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
