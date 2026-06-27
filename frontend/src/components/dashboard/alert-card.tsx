'use client';

import React from 'react';
import {
  Info,
  AlertTriangle,
  XCircle,
  CheckCircle,
  Archive,
  ExternalLink,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useI18n } from '@/lib/i18n/i18n-context';
import { Badge } from '@/components/ui/badge';
import type { Alert } from '@/types/api';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function timeAgo(dateStr: string, t: ReturnType<typeof useI18n>['t']): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const seconds = Math.floor((now - then) / 1000);

  if (seconds < 60) return t('common.timeAgo.justNow');
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return t('common.timeAgo.minutesAgo').replace('{n}', String(minutes));
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('common.timeAgo.hoursAgo').replace('{n}', String(hours));
  const days = Math.floor(hours / 24);
  if (days < 30) return t('common.timeAgo.daysAgo').replace('{n}', String(days));
  const months = Math.floor(days / 30);
  return t('common.timeAgo.monthsAgo').replace('{n}', String(months));
}

// ---------------------------------------------------------------------------
// Priority / Severity / Category config
// ---------------------------------------------------------------------------
const PRIORITY_CONFIG: Record<
  Alert['priority'],
  { labelKey: string; className: string }
> = {
  low: {
    labelKey: 'page.notifications.alertLow',
    className: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  },
  medium: {
    labelKey: 'page.notifications.alertMedium',
    className: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  },
  high: {
    labelKey: 'page.notifications.alertHigh',
    className: 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  },
  critical: {
    labelKey: 'page.notifications.alertCritical',
    className: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  },
};

const SEVERITY_ICONS: Record<Alert['severity'], React.ReactNode> = {
  info: <Info className="h-4 w-4 text-blue-500" />,
  warning: <AlertTriangle className="h-4 w-4 text-amber-500" />,
  error: <XCircle className="h-4 w-4 text-red-500" />,
  success: <CheckCircle className="h-4 w-4 text-emerald-500" />,
};

const CATEGORY_KEY_MAP: Record<Alert['category'], string> = {
  budget: 'page.notifications.categoryBudget',
  forecast: 'page.notifications.categoryForecast',
  inventory: 'page.notifications.categoryInventory',
  exchange_rate: 'page.notifications.categoryExchange',
  production: 'page.notifications.categoryProduction',
  import: 'page.notifications.categoryImport',
  approval: 'page.notifications.categoryApproval',
  system: 'page.notifications.categorySystem',
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
export interface AlertCardProps {
  alert: Alert;
  onMarkRead?: (id: string) => void;
  onArchive?: (id: string) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function AlertCard({ alert, onMarkRead, onArchive }: AlertCardProps) {
  const { t, locale } = useI18n();
  const isRtl = locale === 'ar';

  const priorityCfg = PRIORITY_CONFIG[alert.priority];
  const categoryKey = CATEGORY_KEY_MAP[alert.category];

  return (
    <div
      className={cn(
        'group flex items-start gap-3 rounded-xl border px-4 py-3 transition-colors',
        alert.isRead
          ? 'border-slate-100 bg-white/60 dark:border-slate-800 dark:bg-slate-900/40'
          : 'border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800',
        !alert.isRead && 'border-l-4',
        !alert.isRead && alert.priority === 'critical' && 'border-l-red-500',
        !alert.isRead && alert.priority === 'high' && 'border-l-orange-500',
        !alert.isRead && alert.priority === 'medium' && 'border-l-blue-500',
        !alert.isRead && alert.priority === 'low' && 'border-l-slate-400',
      )}
    >
      {/* Severity icon */}
      <div className="mt-0.5 shrink-0">{SEVERITY_ICONS[alert.severity]}</div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {/* Priority badge */}
          <span
            className={cn(
              'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold',
              priorityCfg.className,
            )}
          >
            {t(priorityCfg.labelKey as never)}
          </span>

          {/* Category badge */}
          <Badge variant="default" className="text-[10px]">
            {t(categoryKey as never)}
          </Badge>

          {/* Unread dot */}
          {!alert.isRead && (
            <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
          )}
        </div>

        {/* Title */}
        <h4
          className={cn(
            'mt-1 text-sm font-semibold leading-snug',
            alert.isRead
              ? 'text-slate-600 dark:text-slate-400'
              : 'text-slate-900 dark:text-slate-100',
          )}
        >
          {alert.title}
        </h4>

        {/* Description */}
        {alert.description && (
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
            {alert.description}
          </p>
        )}

        {/* Time ago */}
        <div className="mt-1.5 flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500">
          <Clock className="h-3 w-3" />
          <span>{timeAgo(alert.createdAt, t)}</span>
        </div>
      </div>

      {/* Actions */}
      <div
        className={cn(
          'flex shrink-0 items-center gap-1',
          isRtl ? 'flex-row-reverse' : '',
        )}
      >
        {/* Action link */}
        {alert.actionUrl && (
          <a
            href={alert.actionUrl}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-emerald-600 dark:hover:bg-slate-700 dark:hover:text-emerald-400"
            aria-label={t('common.view')}
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        )}

        {/* Mark as read */}
        {!alert.isRead && onMarkRead && (
          <button
            onClick={() => onMarkRead(alert.id)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-400"
            aria-label={t('page.notifications.markRead')}
            title={t('page.notifications.markRead')}
          >
            <CheckCircle className="h-4 w-4" />
          </button>
        )}

        {/* Archive */}
        {!alert.isArchived && onArchive && (
          <button
            onClick={() => onArchive(alert.id)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
            aria-label={t('page.notifications.archive')}
            title={t('page.notifications.archive')}
          >
            <Archive className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
