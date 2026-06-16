'use client';

import React, { useRef, useState } from 'react';
import {
  Upload,
  Download,
  X,
  CheckCircle,
  AlertCircle,
  FileText,
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
  const [fileContent, setFileContent] = useState<string | null>(null);

  const [previewRows, setPreviewRows] = useState<RowPreviewResult[] | null>(
    null,
  );
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

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
      const url = URL.createObjectURL(new Blob([res.data as BlobPart]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${module}_template.csv`;
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
    setPreviewRows(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const base64 = (evt.target?.result as string).split(',')[1];
      setFileContent(base64);
    };
    reader.readAsDataURL(file);
  }

  // -------------------------------------------------------------------------
  // Preview
  // -------------------------------------------------------------------------
  async function handlePreview() {
    if (!fileContent || !fileName || !token || !activeCompanyId) return;
    setIsPreviewing(true);
    try {
      const res = await api.post<RowPreviewResult[]>(
        `/imports/preview`,
        { module, fileContent, fileName },
      );
      setPreviewRows(res.data);
    } catch (err: unknown) {
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
    try {
      const res = await api.post<{ successCount: number; failCount: number }>(
        `/imports/commit`,
        { module, rows: validRows },
      );
      const { successCount, failCount } = res.data;
      if (successCount > 0) {
        let msg = t('component.importModal.importSuccess', { count: successCount });
        if (failCount > 0) {
          msg += ` ${t('component.importModal.rowFail', { n: failCount })}`;
        }
        toastSuccess(msg);
        onSuccess();
        onClose();
      } else {
        toastError(t('component.importModal.noCommit'));
      }
    } catch (err: unknown) {
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
  // Computed
  // -------------------------------------------------------------------------
  const validCount = previewRows?.filter((r) => r.isValid).length ?? 0;
  const invalidCount = previewRows?.filter((r) => !r.isValid).length ?? 0;

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
      <div className="relative z-10 flex w-full max-w-2xl flex-col rounded-2xl border border-slate-200 bg-white shadow-xl max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 flex-shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-emerald-600" />
            <h2 className="text-base font-semibold text-slate-900">
              {t('component.importModal.title', { module: moduleLabel })}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            aria-label={t('component.importModal.close')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Step 1: Instructions + Download */}
          <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-4 space-y-2">
            <p className="text-sm font-medium text-slate-700">
              {t('component.importModal.howItWorks')}
            </p>
            <ol className="list-decimal list-inside text-sm text-slate-500 space-y-1">
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

          {/* Step 2: Upload */}
          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">
              {t('component.importModal.uploadFile')}
            </p>
            <div
              className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-white px-6 py-8 cursor-pointer hover:border-emerald-400 transition-colors"
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files[0];
                if (file && fileRef.current) {
                  // Simulate a file input change
                  const dt = new DataTransfer();
                  dt.items.add(file);
                  fileRef.current.files = dt.files;
                  fileRef.current.dispatchEvent(
                    new Event('change', { bubbles: true }),
                  );
                }
              }}
            >
              <Upload className="h-8 w-8 text-slate-300" />
              {fileName ? (
                <p className="text-sm font-medium text-emerald-600">
                  {fileName}
                </p>
              ) : (
                <p className="text-sm text-slate-400">
                  {t('component.importModal.dragDrop')}
                </p>
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

          {/* Step 3: Preview table */}
          {previewRows && (
            <div>
              {/* Summary */}
              <div className="mb-3 flex items-center gap-4">
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
                  className="ml-auto text-xs text-slate-400 underline hover:text-slate-600"
                  onClick={() => {
                    setPreviewRows(null);
                    setFileName(null);
                    setFileContent(null);
                    if (fileRef.current) fileRef.current.value = '';
                  }}
                >
                  {t('component.importModal.clearReUpload')}
                </button>
              </div>

              {/* Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-100">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="px-3 py-2 text-left font-medium text-slate-500 w-10">
                        #
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-slate-500">
                        {t('component.importModal.status')}
                      </th>
                      {Object.keys(previewRows[0]?.data ?? {}).map((col) => (
                        <th
                          key={col}
                          className="px-3 py-2 text-left font-medium text-slate-500 whitespace-nowrap"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewRows.map((row) => (
                      <React.Fragment key={row.index}>
                        <tr
                          className={
                            row.isValid
                              ? 'bg-white'
                              : 'bg-red-50'
                          }
                        >
                          <td className="px-3 py-2 text-slate-400">
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
                              className="px-3 py-2 text-slate-700 whitespace-nowrap"
                            >
                              {val != null ? String(val) : '—'}
                            </td>
                          ))}
                        </tr>
                        {!row.isValid && (
                          <tr className="bg-red-50">
                            <td />
                            <td
                              colSpan={
                                Object.keys(row.data).length + 1
                              }
                              className="px-3 pb-2 text-xs text-red-600"
                            >
                              {row.errors.join(' • ')}
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
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4 flex-shrink-0">
          <Button variant="outline" size="sm" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          {previewRows && validCount > 0 && (
            <Button
              size="sm"
              isLoading={isCommitting}
              onClick={handleCommit}
              id={`${module}-commit-btn`}
            >
              {t('component.importModal.importRows', { n: validCount, s: validCount !== 1 ? 's' : '' })}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
