'use client';

import React from 'react';
import { useBackgroundRefreshStatus } from '@/hooks/use-background-refresh-status';

/**
 * Global refresh indicator.
 * Shows a subtle top-bar animation when any query is refreshing in the background.
 * Only appears when there's cached data being refreshed (not initial loads).
 */
export function GlobalRefreshIndicator() {
  const { isRefreshing } = useBackgroundRefreshStatus();

  if (!isRefreshing) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-0.5 overflow-hidden">
      <div className="h-full bg-emerald-500 animate-progress" />
    </div>
  );
}

/**
 * Inline refreshing indicator for content areas.
 * Shows a small spinner + text when data is being refreshed.
 */
export function RefreshingBadge() {
  const { isRefreshing } = useBackgroundRefreshStatus();

  if (!isRefreshing) return null;

  return (
    <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
      <span className="h-2 w-2 animate-spin rounded-full border border-emerald-600 border-t-transparent dark:border-emerald-400 dark:border-t-transparent" />
      Refreshing…
    </div>
  );
}
