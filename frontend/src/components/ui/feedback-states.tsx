'use client';

import * as React from 'react';
import { AlertTriangle, FileSearch, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
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
  message = 'Loading...',
  className,
  rows,
}: LoadingStateProps) {
  if (rows) {
    return (
      <div className={cn('space-y-3', className)} role="status" aria-label={message}>
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="h-10 w-full animate-pulse rounded-lg bg-slate-100"
          />
        ))}
        <span className="sr-only">{message}</span>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-label={message}
      className={cn(
        'flex flex-col items-center justify-center gap-3 py-16 text-slate-400',
        className,
      )}
    >
      <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      <p className="text-sm">{message}</p>
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
  title = 'No results found',
  description = 'There is nothing to display here yet.',
  icon,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-16 text-center',
        className,
      )}
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        {icon ?? <FileSearch className="h-6 w-6" />}
      </span>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-slate-700">{title}</p>
        <p className="text-xs text-slate-500">{description}</p>
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
  title = 'Something went wrong',
  message = 'An error occurred while loading this data.',
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center gap-4 rounded-xl border border-red-100 bg-red-50 px-6 py-16 text-center',
        className,
      )}
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-400">
        <AlertTriangle className="h-6 w-6" />
      </span>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-red-700">{title}</p>
        <p className="text-xs text-red-500">{message}</p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
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
  title = 'Feature Locked',
  description = 'This feature requires a premium plan.',
  requiredPlan = 'Business',
  className,
}: LockedStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4 rounded-xl border border-amber-100 bg-amber-50/30 px-6 py-20 text-center shadow-sm',
        className,
      )}
    >
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-600">
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
          className="lucide lucide-lock"
        >
          <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </span>
      <div className="space-y-2 max-w-md">
        <p className="text-lg font-bold text-slate-800">{title}</p>
        <p className="text-sm text-slate-500">{description}</p>
        <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
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
        Upgrade Plan
      </Button>
    </div>
  );
}

export { LoadingState, EmptyState, ErrorState, LockedState };
