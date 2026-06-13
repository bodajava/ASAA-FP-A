'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';
import type { PaginatedResponse } from '@/types/api';

export interface UsePaginatedListOptions {
  endpoint: string;
  limit?: number;
  /** Set to false to skip initial fetch (e.g., when companyId is not yet available) */
  enabled?: boolean;
}

export interface UsePaginatedListReturn<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
  isLoading: boolean;
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
}: UsePaginatedListOptions): UsePaginatedListReturn<T> {
  const [data, setData] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearchState] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [rev, setRev] = useState(0); // revision counter to force refresh

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  const fetchData = useCallback(async () => {
    if (!enabled) return;
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());

      const result = await apiGet<PaginatedResponse<T> | T[]>(
        `${endpoint}?${params.toString()}`,
      );

      // Some endpoints return plain arrays, others paginated objects
      if (Array.isArray(result)) {
        setData(result);
        setTotal(result.length);
        setTotalPages(1);
      } else {
        setData(result.data);
        setTotal(result.total);
        setTotalPages(result.totalPages ?? 1);
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Failed to load data.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, page, debouncedSearch, limit, enabled, rev]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchData();
  }, [fetchData]);

  const setSearch = useCallback(
    (s: string) => {
      setSearchState(s);
      setPage(1);
    },
    [],
  );

  const refresh = useCallback(() => {
    setRev((r) => r + 1);
  }, []);

  const create = useCallback(
    async (payload: Record<string, unknown>): Promise<T> => {
      const result = await apiPost<T>(endpoint, payload);
      refresh();
      return result;
    },
    [endpoint, refresh],
  );

  const update = useCallback(
    async (id: string, payload: Record<string, unknown>): Promise<T> => {
      const result = await apiPatch<T>(`${endpoint}/${id}`, payload);
      refresh();
      return result;
    },
    [endpoint, refresh],
  );

  const remove = useCallback(
    async (id: string): Promise<void> => {
      await apiDelete<T>(`${endpoint}/${id}`);
      refresh();
    },
    [endpoint, refresh],
  );

  return {
    data,
    total,
    page,
    totalPages,
    isLoading,
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
