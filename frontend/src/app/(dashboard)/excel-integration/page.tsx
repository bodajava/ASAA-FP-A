'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Upload,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowLeft,
  ChevronRight,
  X,
  Loader2,
  Download,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth-context';
import { useI18n } from '@/lib/i18n/i18n-context';
import { useToast } from '@/components/ui/toast';
import axios from 'axios';

/* ─── Types ──────────────────────────────────────────────────────────── */

interface AnalysisResult {
  analysis: {
    fileName: string;
    analyzedAt: string;
    sheets: Array<{
      sheetName: string;
      detectedModule: string;
      erpModule: string;
      rowCount: number;
      requiredColumns: string[];
      optionalColumns: string[];
      isReady: boolean;
      warnings: Array<{ type: string; message: string; suggestion: string }>;
    }>;
    importOrder: string[];
    warnings: Array<{ type: string; message: string; suggestion: string }>;
    isReady: boolean;
    totalRows: number;
  };
  mappings: Array<{
    sheetName: string;
    module: string;
    description: string;
    confidence: number;
    columnMappings: Array<{
      excelColumn: string;
      erpField: string;
      type: string;
      confidence: number;
    }>;
    requiresParent?: string;
    targetTable: string;
  }>;
  warnings: Array<{ type: string; message: string; suggestion: string }>;
}

interface ValidationResult {
  isValid: boolean;
  totalRows: number;
  validRows: number;
  totalErrors: number;
  totalWarnings: number;
  totalDuplicates: number;
  sheets: Array<{
    name: string;
    valid: boolean;
    errors: number;
    warnings: number;
    duplicates: number;
  }>;
}

interface ImportResult {
  status: string;
  totalRows: number;
  insertedRows: number;
  failedRows: number;
  skippedRows: number;
  durationMs: number;
  rowsPerSecond: number;
  sheets: Array<{
    sheetName: string;
    erpModule: string;
    status: string;
    insertedRows: number;
    failedRows: number;
  }>;
}

type ViewMode = 'upload' | 'analyzing' | 'results' | 'importing' | 'complete';

/* ─── Page ───────────────────────────────────────────────────────────── */

export default function ExcelIntegrationPage() {
  const { activeCompanyId } = useAuth();
  const { t } = useI18n();
  const { success: toastSuccess, error: toastError } = useToast();

  const [view, setView] = useState<ViewMode>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dryRun, setDryRun] = useState(false);
  const [skipErrors, setSkipErrors] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [moduleList, setModuleList] = useState<Array<{ key: string; sheetName: string; description: string; columnCount: number }>>([]);

  /* ─── Load module list ──────────────────────────────────────────────── */
  useEffect(() => {
    async function loadModules() {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
        const res = await fetch(`${baseUrl}/api/v1/excel-integration/templates`);
        if (res.ok) {
          const data = await res.json() as Array<{ key: string; sheetName: string; description: string; columnCount: number }>;
          setModuleList(data);
        }
      } catch {
        // Silent fail - module list is optional
      }
    }
    void loadModules();
  }, []);

  /* ─── Analyze ──────────────────────────────────────────────────────── */

  const analyzeFile = useCallback(async (selectedFile: File) => {
    setFile(selectedFile);
    setView('analyzing');
    setErrorMessage(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
      const res = await axios.post(`${baseUrl}/api/v1/excel-integration/map`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setAnalysis(res.data);

      // Also validate
      const valRes = await axios.post(`${baseUrl}/api/v1/excel-integration/validate`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setValidation(valRes.data.summary);

      setView('results');
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err)
        ? (err.response?.data as { message?: string })?.message || err.message
        : 'Analysis failed';
      setErrorMessage(msg);
      setView('upload');
      toastError(msg);
    }
  }, [toastError]);

  /* ─── Import ───────────────────────────────────────────────────────── */

  const handleImport = useCallback(async () => {
    if (!file || !activeCompanyId) return;
    setView('importing');
    setErrorMessage(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('dryRun', String(dryRun));
    formData.append('skipErrors', String(skipErrors));

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
      const res = await axios.post(`${baseUrl}/api/v1/excel-integration/import`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'x-company-id': String(activeCompanyId),
        },
      });
      setImportResult(res.data.importResult);
      setView('complete');
      toastSuccess(t('page.excelIntegration.importComplete'));
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err)
        ? (err.response?.data as { message?: string })?.message || err.message
        : 'Import failed';
      setErrorMessage(msg);
      setView('results');
      toastError(msg);
    }
  }, [file, activeCompanyId, dryRun, skipErrors, t, toastError, toastSuccess]);

  /* ─── Drag & Drop ──────────────────────────────────────────────────── */

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.match(/\.(xlsx|xls|csv)$/i)) {
      void analyzeFile(droppedFile);
    }
  }, [analyzeFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      void analyzeFile(selectedFile);
    }
  }, [analyzeFile]);

  const resetUpload = useCallback(() => {
    setView('upload');
    setFile(null);
    setAnalysis(null);
    setValidation(null);
    setImportResult(null);
    setErrorMessage(null);
    setDryRun(false);
    setSkipErrors(false);
  }, []);

  /* ─── Module status color ──────────────────────────────────────────── */

  const statusColor = (status: string): 'success' | 'warning' | 'danger' | 'muted' => {
    switch (status) {
      case 'completed': return 'success';
      case 'partial': return 'warning';
      case 'failed': return 'danger';
      case 'skipped': return 'muted';
      default: return 'muted';
    }
  };

  /* ─── Render ───────────────────────────────────────────────────────── */

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('page.excelIntegration.title')}
        description={t('page.excelIntegration.description')}
      />

      {/* ─── UPLOAD VIEW ──────────────────────────────────────────────── */}
      {view === 'upload' && (
        <div className="space-y-5">
          {/* Template Downloads Section */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-800">{t('page.excelIntegration.templateDownloads')}</h3>
            </div>
            <p className="text-xs text-slate-500">{t('page.excelIntegration.templateWarning')}</p>
            <div className="flex flex-wrap gap-3">
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
                  const a = document.createElement('a');
                  a.href = `${baseUrl}/api/v1/excel-integration/templates/client-workbook`;
                  a.download = 'ASAA_FP_A_Workbook_Template.xlsx';
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                }}
              >
                <FileSpreadsheet className="h-4 w-4" />
                {t('page.excelIntegration.downloadClientWorkbook')}
              </Button>
              <div className="relative group">
                <Button size="sm" variant="outline">
                  <FileSpreadsheet className="h-4 w-4" />
                  {t('page.excelIntegration.downloadModuleTemplate')}
                </Button>
                <div className="absolute left-0 top-full z-10 mt-1 hidden w-64 rounded-lg border border-slate-200 bg-white shadow-lg group-hover:block">
                  <div className="max-h-80 overflow-y-auto py-1">
                    {moduleList.map((mod) => (
                      <button
                        key={mod.key}
                        onClick={() => {
                          const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
                          const a = document.createElement('a');
                          a.href = `${baseUrl}/api/v1/excel-integration/templates/${mod.key}`;
                          a.download = `${mod.sheetName}_template.xlsx`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-slate-50"
                      >
                        <span className="font-medium text-slate-700">{mod.sheetName}</span>
                        <span className="text-slate-400">({mod.columnCount} cols)</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Drag & Drop Zone */}
          <div
            className={`relative rounded-2xl border-2 border-dashed p-12 text-center transition-colors ${
              isDragging
                ? 'border-emerald-500 bg-emerald-50/50'
                : 'border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/20'
            }`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileSelect}
              className="hidden"
            />
            <div className="flex flex-col items-center gap-4">
              <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                <FileSpreadsheet className="h-8 w-8" />
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-700">{t('page.excelIntegration.dragDrop')}</p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-1 text-sm font-bold text-emerald-600 hover:text-emerald-700 underline underline-offset-2"
                >
                  {t('page.excelIntegration.browse')}
                </button>
              </div>
              <p className="text-[11px] text-slate-400">.xlsx, .xls, .csv</p>
            </div>
          </div>
        </div>
      )}

      {/* ─── ANALYZING VIEW ───────────────────────────────────────────── */}
      {view === 'analyzing' && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-16">
          <Loader2 className="h-10 w-10 animate-spin text-emerald-500 mb-4" />
          <p className="text-sm font-semibold text-slate-600">{t('page.excelIntegration.analyzing')}</p>
          {file && <p className="text-xs text-slate-400 mt-1">{file.name}</p>}
        </div>
      )}

      {/* ─── RESULTS VIEW ─────────────────────────────────────────────── */}
      {view === 'results' && analysis && (
        <div className="space-y-5">
          {/* File info bar */}
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
              <div>
                <p className="text-sm font-bold text-slate-800">{analysis.analysis.fileName}</p>
                <p className="text-[11px] text-slate-400">
                  {analysis.analysis.sheets.length} {t('page.excelIntegration.sheetsDetected')} · {analysis.analysis.totalRows.toLocaleString()} rows
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={resetUpload}>
                <ArrowLeft className="h-3.5 w-3.5" />
                {t('page.excelIntegration.backToUpload')}
              </Button>
            </div>
          </div>

          {/* Warnings */}
          {analysis.warnings.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <p className="text-xs font-bold text-amber-800">{t('page.excelIntegration.warnings')} ({analysis.warnings.length})</p>
              </div>
              <ul className="space-y-1">
                {analysis.warnings.map((w, i) => (
                  <li key={i} className="text-[11px] text-amber-700">
                    {w.message}
                    {w.suggestion && <span className="text-amber-500 ml-1">— {w.suggestion}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Sheets table */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2.5 text-left font-semibold text-slate-600">{t('page.excelIntegration.sheetName')}</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-slate-600">{t('page.excelIntegration.module')}</th>
                  <th className="px-4 py-2.5 text-right font-semibold text-slate-600">{t('page.excelIntegration.rows')}</th>
                  <th className="px-4 py-2.5 text-center font-semibold text-slate-600">{t('page.excelIntegration.status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {analysis.analysis.sheets.map((sheet) => {
                  const sheetValidation = validation?.sheets.find(s => s.name === sheet.sheetName);
                  return (
                    <tr key={sheet.sheetName} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2.5">
                        <p className="font-semibold text-slate-800">{sheet.sheetName}</p>
                        {sheet.warnings.length > 0 && (
                          <p className="text-[10px] text-amber-500 mt-0.5">
                            {sheet.warnings.length} {t('page.excelIntegration.warnings').toLowerCase()}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                          sheet.erpModule === 'unknown' ? 'text-amber-600' : 'text-slate-600'
                        }`}>
                          {sheet.erpModule === 'unknown' ? (
                            <>
                              <AlertTriangle className="h-3 w-3" />
                              {t('page.excelIntegration.unmappedModule')}
                            </>
                          ) : (
                            sheet.erpModule
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-slate-600">
                        {sheet.rowCount.toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {sheetValidation && (
                            <>
                              {sheetValidation.errors > 0 && (
                                <Badge variant="danger" className="text-[10px]">
                                  {sheetValidation.errors} {t('page.excelIntegration.errors').toLowerCase()}
                                </Badge>
                              )}
                              {sheetValidation.warnings > 0 && (
                                <Badge variant="warning" className="text-[10px]">
                                  {sheetValidation.warnings} {t('page.excelIntegration.warnings').toLowerCase()}
                                </Badge>
                              )}
                              {sheetValidation.duplicates > 0 && (
                                <Badge variant="muted" className="text-[10px]">
                                  {sheetValidation.duplicates} {t('page.excelIntegration.duplicate').toLowerCase()}
                                </Badge>
                              )}
                              {sheetValidation.errors === 0 && sheetValidation.warnings === 0 && (
                                <Badge variant="success" className="text-[10px]">{t('page.excelIntegration.valid')}</Badge>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Validation summary */}
          {validation && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
                <p className="text-2xl font-bold text-slate-800">{validation.totalRows.toLocaleString()}</p>
                <p className="text-[10px] font-semibold text-slate-400 uppercase">Total Rows</p>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-center">
                <p className="text-2xl font-bold text-emerald-700">{validation.validRows.toLocaleString()}</p>
                <p className="text-[10px] font-semibold text-emerald-600 uppercase">{t('page.excelIntegration.valid')}</p>
              </div>
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-center">
                <p className="text-2xl font-bold text-red-700">{validation.totalErrors.toLocaleString()}</p>
                <p className="text-[10px] font-semibold text-red-600 uppercase">{t('page.excelIntegration.errors')}</p>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-center">
                <p className="text-2xl font-bold text-amber-700">{validation.totalDuplicates.toLocaleString()}</p>
                <p className="text-[10px] font-semibold text-amber-600 uppercase">{t('page.excelIntegration.duplicate')}</p>
              </div>
            </div>
          )}

          {/* Import options */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={dryRun}
                  onChange={(e) => setDryRun(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                {t('page.excelIntegration.dryRun')}
              </label>
              <label className="flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={skipErrors}
                  onChange={(e) => setSkipErrors(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                {t('page.excelIntegration.skipErrors')}
              </label>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={handleImport}
              >
                <Upload className="h-4 w-4" />
                {dryRun ? t('page.excelIntegration.dryRun') : t('page.excelIntegration.importNow')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── IMPORTING VIEW ───────────────────────────────────────────── */}
      {view === 'importing' && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-16">
          <Loader2 className="h-10 w-10 animate-spin text-emerald-500 mb-4" />
          <p className="text-sm font-semibold text-slate-600">Importing data...</p>
          {file && <p className="text-xs text-slate-400 mt-1">{file.name}</p>}
        </div>
      )}

      {/* ─── COMPLETE VIEW ────────────────────────────────────────────── */}
      {view === 'complete' && importResult && (
        <div className="space-y-5">
          {/* Status banner */}
          <div className={`rounded-xl border p-4 ${
            importResult.status === 'completed'
              ? 'border-emerald-200 bg-emerald-50'
              : importResult.status === 'partial'
              ? 'border-amber-200 bg-amber-50'
              : 'border-red-200 bg-red-50'
          }`}>
            <div className="flex items-center gap-3">
              {importResult.status === 'completed' ? (
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              ) : importResult.status === 'partial' ? (
                <AlertTriangle className="h-6 w-6 text-amber-600" />
              ) : (
                <X className="h-6 w-6 text-red-600" />
              )}
              <div>
                <p className="text-sm font-bold text-slate-800">{t('page.excelIntegration.importComplete')}</p>
                <p className="text-xs text-slate-500 capitalize">Status: {importResult.status}</p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
              <p className="text-2xl font-bold text-emerald-700">{importResult.insertedRows.toLocaleString()}</p>
              <p className="text-[10px] font-semibold text-slate-400 uppercase">{t('page.excelIntegration.rowsInserted')}</p>
            </div>
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-center">
              <p className="text-2xl font-bold text-red-700">{importResult.failedRows.toLocaleString()}</p>
              <p className="text-[10px] font-semibold text-red-600 uppercase">{t('page.excelIntegration.rowsFailed')}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
              <p className="text-2xl font-bold text-slate-700">{(importResult.durationMs / 1000).toFixed(1)}s</p>
              <p className="text-[10px] font-semibold text-slate-400 uppercase">{t('page.excelIntegration.duration')}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
              <p className="text-2xl font-bold text-slate-700">{importResult.rowsPerSecond.toLocaleString()}</p>
              <p className="text-[10px] font-semibold text-slate-400 uppercase">rows/sec</p>
            </div>
          </div>

          {/* Per-sheet results */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2.5 text-left font-semibold text-slate-600">{t('page.excelIntegration.sheetName')}</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-slate-600">{t('page.excelIntegration.module')}</th>
                  <th className="px-4 py-2.5 text-right font-semibold text-slate-600">Inserted</th>
                  <th className="px-4 py-2.5 text-right font-semibold text-slate-600">Failed</th>
                  <th className="px-4 py-2.5 text-center font-semibold text-slate-600">{t('page.excelIntegration.status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {importResult.sheets.map((sheet) => (
                  <tr key={sheet.sheetName} className="hover:bg-slate-50/50">
                    <td className="px-4 py-2.5 font-semibold text-slate-800">{sheet.sheetName}</td>
                    <td className="px-4 py-2.5 text-slate-600">{sheet.erpModule}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-emerald-700">{sheet.insertedRows.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-red-700">{sheet.failedRows.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-center">
                      <Badge variant={statusColor(sheet.status)} className="capitalize text-[10px]">{sheet.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={resetUpload}>
              <ArrowLeft className="h-3.5 w-3.5" />
              {t('page.excelIntegration.backToUpload')}
            </Button>
          </div>
        </div>
      )}

      {/* ─── ERROR STATE ──────────────────────────────────────────────── */}
      {errorMessage && view !== 'analyzing' && view !== 'importing' && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <p>{errorMessage}</p>
        </div>
      )}
    </div>
  );
}
