'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { History, RefreshCw, FileText, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingState, EmptyState } from '@/components/ui/feedback-states';
import { useI18n } from '@/lib/i18n/i18n-context';
import { translateStatus } from '@/lib/i18n/translate-api';
import { apiGet } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ImportHistoryRecord {
  id: string;
  module: string;
  fileName: string;
  status: 'completed' | 'failed' | 'processing';
  rowsInserted: number;
  rowsUpdated: number;
  rowsFailed: number;
  createdAt: string;
}

interface ImportHistoryProps {
  module?: string;
  limit?: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function ImportHistory({ module, limit = 10 }: ImportHistoryProps) {
  const { activeCompanyId } = useAuth();
  const { t } = useI18n();
  const [records, setRecords] = useState<ImportHistoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchHistory = useCallback(async () => {
    if (!activeCompanyId) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(limit) });
      if (module) params.set('module', module);
      const res = await apiGet<{ data: ImportHistoryRecord[] }>(`/imports/history?${params.toString()}`);
      setRecords(res.data ?? []);
    } catch {
      setRecords([]);
    } finally {
      setIsLoading(false);
    }
  }, [activeCompanyId, module, limit]);

  useEffect(() => {
    void Promise.resolve().then(() => void fetchHistory());
  }, [fetchHistory]);

  function getStatusIcon(status: string) {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />;
      case 'failed':
        return <XCircle className="h-3.5 w-3.5 text-red-500" />;
      default:
        return <Clock className="h-3.5 w-3.5 text-amber-500" />;
    }
  }

  function getStatusVariant(status: string): 'success' | 'danger' | 'warning' {
    switch (status) {
      case 'completed':
        return 'success';
      case 'failed':
        return 'danger';
      default:
        return 'warning';
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
          <History className="h-4 w-4 text-emerald-600" /> {t('import.enterprise.history')}
        </h3>
        <Button size="sm" variant="outline" onClick={fetchHistory} className="h-7 px-2">
          <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {isLoading ? (
        <LoadingState rows={3} message={t('common.loading')} />
      ) : records.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-5 w-5 text-slate-300" />}
          title={t('import.enterprise.noHistory')}
        />
      ) : (
        <div className="space-y-2">
          {records.map((record) => (
            <div
              key={record.id}
              className="flex items-center gap-3 rounded-lg border border-slate-100 bg-white p-3 shadow-sm"
            >
              {getStatusIcon(record.status)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-700 truncate">
                    {record.fileName}
                  </span>
                  <Badge variant={getStatusVariant(record.status)} className="text-[10px] px-1.5 py-0">
                    {t(translateStatus(record.status) as never)}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-400">
                  <span>{record.module}</span>
                  <span>{new Date(record.createdAt).toLocaleString()}</span>
                  {record.rowsInserted > 0 && <span className="text-emerald-600">+{record.rowsInserted}</span>}
                  {record.rowsUpdated > 0 && <span className="text-blue-600">~{record.rowsUpdated}</span>}
                  {record.rowsFailed > 0 && <span className="text-red-600">!{record.rowsFailed}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
