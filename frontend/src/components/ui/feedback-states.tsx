'use client';

import * as React from 'react';
import { AlertTriangle, FileSearch, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useI18n } from '@/lib/i18n/i18n-context';
import { Button } from './button';

// ---------------------------------------------------------------------------
// Loading State
// ---------------------------------------------------------------------------
export interface LoadingStateProps {
  message?: string;
  className?: string;
  /** number of skeleton rows to show */
  rows?: number;
}

function LoadingState({
  message,
  className,
  rows,
}: LoadingStateProps) {
  const { t } = useI18n();
  const msg = message ?? t('common.loading');
  if (rows) {
    return (
      <div className={cn('space-y-3', className)} role="status" aria-label={msg}>
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="h-10 w-full animate-pulse rounded-lg bg-secondary"
          />
        ))}
        <span className="sr-only">{msg}</span>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-label={msg}
      className={cn(
        'flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground',
        className,
      )}
    >
      <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      <p className="text-sm">{msg}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty State
// ---------------------------------------------------------------------------
export interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: EmptyStateProps) {
  const { t } = useI18n();
  const titleText = title ?? t('common.noResults');
  const descText = description ?? t('common.noData');
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border bg-muted px-6 py-16 text-center',
        className,
      )}
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-muted-foreground">
        {icon ?? <FileSearch className="h-6 w-6" />}
      </span>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-card-foreground">{titleText}</p>
        <p className="text-xs text-muted-foreground">{descText}</p>
      </div>
      {action}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Error State
// ---------------------------------------------------------------------------
export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

function ErrorState({
  title,
  message,
  onRetry,
  className,
}: ErrorStateProps) {
  const { t } = useI18n();
  const titleText = title ?? t('common.error');
  const msgText = message ?? t('common.error');
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center gap-4 rounded-xl border border-red-100 bg-red-50 px-6 py-16 text-center dark:border-red-900 dark:bg-red-900/20',
        className,
      )}
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-400 dark:bg-red-900/30">
        <AlertTriangle className="h-6 w-6" />
      </span>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-red-700 dark:text-red-400">{titleText}</p>
        <p className="text-xs text-red-500 dark:text-red-400/80">{msgText}</p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          {t('common.retry')}
        </Button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Locked State
// ---------------------------------------------------------------------------
export interface LockedStateProps {
  title?: string;
  description?: string;
  requiredPlan?: string;
  className?: string;
}

function LockedState({
  title,
  description,
  requiredPlan = 'Business',
  className,
}: LockedStateProps) {
  const { t } = useI18n();
  const titleText = title ?? t('common.error');
  const descText = description ?? '';
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4 rounded-xl border border-amber-100 bg-amber-50/30 px-6 py-20 text-center shadow-sm dark:border-amber-800 dark:bg-amber-900/10',
        className,
      )}
    >
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </span>
      <div className="space-y-2 max-w-md">
        <p className="text-lg font-bold text-card-foreground">{titleText}</p>
        <p className="text-sm text-muted-foreground">{descText}</p>
        <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
          Requires {requiredPlan} Plan
        </div>
      </div>
      <Button
        className="mt-4 font-bold"
        onClick={() => {
          if (typeof window !== 'undefined') {
            window.location.href = '/settings';
          }
        }}
      >
        {t('nav.settings')}
      </Button>
    </div>
  );
}

export { LoadingState, EmptyState, ErrorState, LockedState };
