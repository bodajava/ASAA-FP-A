'use client';

import React, { useRef } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { getQueryClient } from '@/lib/query-client';

const PERSISTENCE_KEY = 'asaa-query-cache';

function makePersister() {
  if (typeof window === 'undefined') return null;
  return createSyncStoragePersister({
    storage: localStorage,
    key: PERSISTENCE_KEY,
  });
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useRef(getQueryClient());
  const persisterRef = useRef(makePersister());

  // SSR: plain provider without persist
  if (typeof window === 'undefined') {
    return (
      <QueryClientProvider client={queryClient.current}>
        {children}
      </QueryClientProvider>
    );
  }

  if (persisterRef.current) {
    return (
      <PersistQueryClientProvider
        client={queryClient.current}
        persistOptions={{
          persister: persisterRef.current,
          maxAge: 30 * 60 * 1000, // 30 minutes max persistence
          buster: '1', // increment to invalidate old cache
        }}
      >
        {children}
      </PersistQueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient.current}>
      {children}
    </QueryClientProvider>
  );
}
