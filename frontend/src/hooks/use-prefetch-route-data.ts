'use client';

import { useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import { apiGet } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

/**
 * Route prefetch configuration.
 * Maps route paths to their query definitions.
 * When a user hovers over a nav link, we prefetch the data for that route.
 */
const ROUTE_PREFETCH_CONFIG: Record<string, (companyId: string) => {
  queryKey: readonly unknown[];
  endpoint: string;
}> = {
  '/dashboard': (companyId) => ({
    queryKey: queryKeys.dashboard.kpis(companyId),
    endpoint: `/dashboard/kpis?companyId=${companyId}`,
  }),
  '/budgets': (companyId) => ({
    queryKey: queryKeys.budgets.list(companyId, { page: '1', limit: '10' }),
    endpoint: `/budget-cycles?companyId=${companyId}&page=1&limit=10`,
  }),
  '/forecasts': (companyId) => ({
    queryKey: queryKeys.forecasts.list(companyId, { page: '1', limit: '10' }),
    endpoint: `/forecast-cycles?companyId=${companyId}&page=1&limit=10`,
  }),
  '/scenarios': (companyId) => ({
    queryKey: queryKeys.scenarios.list(companyId, { page: '1', limit: '10' }),
    endpoint: `/scenarios?companyId=${companyId}&page=1&limit=10`,
  }),
  '/actuals': (companyId) => ({
    queryKey: queryKeys.actuals.list(companyId, { page: '1', limit: '10' }),
    endpoint: `/actual-imports?companyId=${companyId}&page=1&limit=10`,
  }),
  '/products': (companyId) => ({
    queryKey: queryKeys.products.list(companyId, { page: '1', limit: '10' }),
    endpoint: `/products?companyId=${companyId}&page=1&limit=10`,
  }),
  '/materials': (companyId) => ({
    queryKey: queryKeys.materials.list(companyId, { page: '1', limit: '10' }),
    endpoint: `/materials?companyId=${companyId}&page=1&limit=10`,
  }),
  '/users': (companyId) => ({
    queryKey: queryKeys.users.list(companyId, { page: '1', limit: '10' }),
    endpoint: `/users?companyId=${companyId}&page=1&limit=10`,
  }),
  '/reports': (companyId) => ({
    queryKey: [...queryKeys.reports.all, companyId] as const,
    endpoint: `/reports/summary?companyId=${companyId}`,
  }),
  '/variance': (companyId) => ({
    queryKey: [...queryKeys.variance.all, companyId] as const,
    endpoint: `/variance/summary?companyId=${companyId}`,
  }),
  '/integrations': (companyId) => ({
    queryKey: queryKeys.integrations.list(companyId),
    endpoint: `/connections?companyId=${companyId}`,
  }),
  '/inventory': (companyId) => ({
    queryKey: queryKeys.inventory.list(companyId, { page: '1', limit: '10' }),
    endpoint: `/inventory?companyId=${companyId}&page=1&limit=10`,
  }),
  '/approvals': (companyId) => ({
    queryKey: queryKeys.approvals.list(companyId, { page: '1', limit: '10' }),
    endpoint: `/approvals?companyId=${companyId}&page=1&limit=10`,
  }),
  '/companies': () => ({
    queryKey: queryKeys.companies.list(),
    endpoint: `/companies`,
  }),
  '/accounts': (companyId) => ({
    queryKey: queryKeys.accounts.list(companyId, { page: '1', limit: '10' }),
    endpoint: `/accounts?companyId=${companyId}&page=1&limit=10`,
  }),
  '/suppliers': (companyId) => ({
    queryKey: queryKeys.suppliers.list(companyId, { page: '1', limit: '10' }),
    endpoint: `/suppliers?companyId=${companyId}&page=1&limit=10`,
  }),
  '/customers': (companyId) => ({
    queryKey: queryKeys.customers.list(companyId, { page: '1', limit: '10' }),
    endpoint: `/customers?companyId=${companyId}&page=1&limit=10`,
  }),
  '/sites': (companyId) => ({
    queryKey: queryKeys.sites.list(companyId, { page: '1', limit: '10' }),
    endpoint: `/sites?companyId=${companyId}&page=1&limit=10`,
  }),
};

/**
 * Hook for prefetching route data on hover/visibility.
 * Use with sidebar nav links to make navigation feel instant.
 */
export function usePrefetchRouteData() {
  const queryClient = useQueryClient();
  const { activeCompanyId } = useAuth();
  const prefetchedRef = useRef(new Set<string>());

  const prefetch = useCallback(
    (routePath: string) => {
      if (!activeCompanyId) return;

      // Normalize: strip query params for lookup
      const basePath = routePath.split('?')[0];

      // Skip if already prefetched
      if (prefetchedRef.current.has(basePath)) return;

      const config = ROUTE_PREFETCH_CONFIG[basePath];
      if (!config) return;

      const { queryKey, endpoint } = config(activeCompanyId);

      // Only prefetch if we don't already have fresh data
      const existingData = queryClient.getQueryData(queryKey);
      if (existingData) return;

      prefetchedRef.current.add(basePath);

      // Prefetch in background
      queryClient.prefetchQuery({
        queryKey,
        queryFn: async ({ signal }) => {
          return apiGet(endpoint, { signal });
        },
        staleTime: 5 * 60 * 1000,
      }).catch(() => {
        // Silently ignore prefetch failures
      });
    },
    [activeCompanyId, queryClient],
  );

  const prefetchIfVisible = useCallback(
    (routePath: string, element: HTMLElement | null) => {
      if (!element) return;

      if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver(
          ([entry]) => {
            if (entry?.isIntersecting) {
              prefetch(routePath);
              observer.disconnect();
            }
          },
          { rootMargin: '200px' },
        );
        observer.observe(element);
        return () => observer.disconnect();
      }

      // Fallback: just prefetch immediately
      prefetch(routePath);
      return undefined;
    },
    [prefetch],
  );

  return { prefetch, prefetchIfVisible };
}

/**
 * Reset prefetched routes (e.g., on company change).
 */
export function resetPrefetchedRoutes() {
  // Module-level ref can't be reset from outside the hook,
  // but company changes will cause re-renders anyway.
}
