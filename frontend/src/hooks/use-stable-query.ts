'use client';

import {
  useQuery,
  keepPreviousData,
  type UseQueryResult,
} from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import { apiGet } from '@/lib/api';

interface UseStableQueryOptions<TData> {
  /** API endpoint to fetch */
  endpoint: string;
  /** Query key (use queryKeys module) */
  queryKey: readonly unknown[];
  /** Whether the query is enabled (default: true if companyId exists) */
  enabled?: boolean;
  /** Query params to append to URL */
  params?: Record<string, string>;
  /** Stale time override (default: 5 min from global config) */
  staleTime?: number;
  /** Whether to keep previous data during refetch (default: true) */
  keepPrevious?: boolean;
  /** Whether to persist this query to localStorage (default: false) */
  persist?: boolean;
}

/**
 * Stable query hook with built-in:
 * - keepPreviousData (no UI flashing)
 * - AbortController support
 * - Auth-aware (depends on activeCompanyId)
 * - Optional persistence
 *
 * Shows cached data immediately, refreshes in background.
 */
export function useStableQuery<TData>({
  endpoint,
  queryKey,
  enabled,
  params,
  staleTime,
  keepPrevious = true,
  persist = false,
}: UseStableQueryOptions<TData>): UseQueryResult<TData> {
  const { activeCompanyId } = useAuth();

  const is_enabled = enabled !== undefined ? enabled : Boolean(activeCompanyId);

  // Build URL with params
  const url = params
    ? `${endpoint}?${new URLSearchParams(params).toString()}`
    : endpoint;

  return useQuery({
    queryKey,
    queryFn: async ({ signal }) => {
      const response = await apiGet<TData>(url, { signal });
      return response;
    },
    enabled: is_enabled,
    staleTime,
    placeholderData: keepPrevious ? keepPreviousData : undefined,
    meta: {
      persist,
    },
  });
}
