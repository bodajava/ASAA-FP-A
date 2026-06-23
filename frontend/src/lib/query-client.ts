'use client';

import { QueryClient } from '@tanstack/react-query';

/**
 * Global QueryClient configuration.
 * - staleTime: 5 minutes — data considered fresh for 5 min
 * - gcTime: 30 minutes — garbage collect unused cache after 30 min
 * - refetchOnWindowFocus: false — don't refetch when tab gains focus
 * - refetchOnReconnect: false — don't refetch on network reconnect
 * - retry: 1 — retry failed requests once
 * - retryDelay: exponential backoff starting at 1s
 */
export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 30 * 60 * 1000, // 30 minutes
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        retry: 1,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10_000),
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

/**
 * Singleton QueryClient for browser.
 * In SSR we always create a new one; in the browser we reuse.
 */
export function getQueryClient(): QueryClient {
  if (typeof window === 'undefined') {
    return makeQueryClient();
  }
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}
