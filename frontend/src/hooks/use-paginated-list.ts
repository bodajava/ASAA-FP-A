'use client';

import { useCallback, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useI18n } from '@/lib/i18n/i18n-context';
import { getApiErrorMessage } from '@/lib/api-error-handler';
import type { PaginatedResponse } from '@/types/api';

export interface UsePaginatedListOptions {
  endpoint: string;
  limit?: number;
  enabled?: boolean;
  /** Query key prefix for cache management */
  queryKeyPrefix?: string;
}

export interface UsePaginatedListReturn<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
  isLoading: boolean;
  isFetching: boolean;
  error: string | null;
  search: string;
  setSearch: (s: string) => void;
  setPage: (p: number) => void;
  refresh: () => void;
  create: (payload: Record<string, unknown>) => Promise<T>;
  update: (id: string, payload: Record<string, unknown>) => Promise<T>;
  remove: (id: string) => Promise<void>;
}

export function usePaginatedList<T>({
  endpoint,
  limit = 20,
  enabled = true,
  queryKeyPrefix,
}: UsePaginatedListOptions): UsePaginatedListReturn<T> {
  const { activeCompanyId } = useAuth();
  const { t } = useI18n();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearchState] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search
  const setSearch = useCallback((s: string) => {
    setSearchState(s);
    setPage(1);
    // Debounce the actual search value
    setTimeout(() => {
      setDebouncedSearch(s);
    }, 400);
  }, []);

  // Build query key
  const queryKey = [
    queryKeyPrefix ?? endpoint,
    'list',
    activeCompanyId,
    page,
    limit,
    debouncedSearch,
  ];

  // Build URL with params
  const buildUrl = useCallback(() => {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
    return `${endpoint}?${params.toString()}`;
  }, [endpoint, page, limit, debouncedSearch]);

  // Query for list data
  const { data: result, isLoading, isFetching, error: queryError } = useQuery({
    queryKey,
    queryFn: async ({ signal }) => {
      return apiGet<PaginatedResponse<T> | T[]>(buildUrl(), { signal });
    },
    enabled: enabled && Boolean(activeCompanyId),
    placeholderData: (prev) => prev, // keepPreviousData
    staleTime: 2 * 60 * 1000, // 2 minutes for lists
  });

  // Parse result
  let data: T[] = [];
  let total = 0;
  let totalPages = 1;

  if (result) {
    if (Array.isArray(result)) {
      data = result;
      total = result.length;
      totalPages = 1;
    } else {
      data = result.data;
      total = result.total;
      totalPages = result.totalPages ?? 1;
    }
  }

  const error = queryError ? getApiErrorMessage(queryError, t) : null;

  // Invalidate list cache
  const invalidateList = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: [queryKeyPrefix ?? endpoint, 'list', activeCompanyId],
    });
  }, [queryClient, endpoint, queryKeyPrefix, activeCompanyId]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiPost<T>(endpoint, payload),
    onSuccess: () => {
      invalidateList();
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) =>
      apiPatch<T>(`${endpoint}/${id}`, payload),
    onSuccess: () => {
      invalidateList();
    },
  });

  // Delete mutation
  const removeMutation = useMutation({
    mutationFn: (id: string) => apiDelete<T>(`${endpoint}/${id}`),
    onSuccess: () => {
      invalidateList();
    },
  });

  const refresh = useCallback(() => {
    invalidateList();
  }, [invalidateList]);

  const create = useCallback(
    async (payload: Record<string, unknown>): Promise<T> => {
      return createMutation.mutateAsync(payload);
    },
    [createMutation],
  );

  const update = useCallback(
    async (id: string, payload: Record<string, unknown>): Promise<T> => {
      return updateMutation.mutateAsync({ id, payload });
    },
    [updateMutation],
  );

  const remove = useCallback(
    async (id: string): Promise<void> => {
      await removeMutation.mutateAsync(id);
    },
    [removeMutation],
  );

  return {
    data,
    total,
    page,
    totalPages,
    isLoading,
    isFetching,
    error,
    search,
    setSearch,
    setPage,
    refresh,
    create,
    update,
    remove,
  };
}
