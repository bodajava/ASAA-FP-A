'use client';

import { useIsFetching } from '@tanstack/react-query';

/**
 * Hook that returns whether any queries are currently refreshing in the background.
 * Useful for showing a subtle "Refreshing..." indicator without blocking the UI.
 *
 * Usage:
 * const { isRefreshing } = useBackgroundRefreshStatus();
 * {isRefreshing && <RefreshingIndicator />}
 */
export function useBackgroundRefreshStatus(filter?: {
  queryKey?: readonly unknown[];
}) {
  const fetchingCount = useIsFetching({
    queryKey: filter?.queryKey,
  });

  return {
    isRefreshing: fetchingCount > 0,
    refreshingCount: fetchingCount,
  };
}

/**
 * Hook for checking if a specific query is background-refreshing.
 * Use per-widget to show individual refresh indicators.
 */
export function useWidgetRefreshStatus(queryKey: readonly unknown[]) {
  const count = useIsFetching({ queryKey });
  return count > 0;
}
