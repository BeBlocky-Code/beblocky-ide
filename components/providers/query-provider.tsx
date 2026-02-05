"use client";

import { useEffect, useState, useRef } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import {
  persistQueryClient,
  PersistedClient,
  Persister,
} from "@tanstack/react-query-persist-client";
import { makeQueryClient } from "@/lib/query-client";

const CACHE_KEY = "beblocky-query-cache";
const MAX_AGE = 30 * 60 * 1000; // 30 minutes
const DEBOUNCE_DELAY = 2000; // 2 seconds debounce for writes

/**
 * Creates a debounced persister that batches writes to localStorage.
 * This prevents excessive disk I/O from frequent cache updates.
 */
function createDebouncedPersister(key: string, delay: number): Persister {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return {
    persistClient: async (client: PersistedClient) => {
      // Clear any pending write
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      // Debounce the write operation
      timeoutId = setTimeout(() => {
        try {
          localStorage.setItem(key, JSON.stringify(client));
        } catch {
          // Silently fail if localStorage is full or unavailable
        }
        timeoutId = null;
      }, delay);
    },
    restoreClient: async () => {
      try {
        const data = localStorage.getItem(key);
        return data ? (JSON.parse(data) as PersistedClient) : undefined;
      } catch {
        return undefined;
      }
    },
    removeClient: async () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      try {
        localStorage.removeItem(key);
      } catch {
        // Silently fail
      }
    },
  };
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => makeQueryClient());
  const [isPersistenceEnabled, setIsPersistenceEnabled] = useState(false);
  const persisterRef = useRef<Persister | null>(null);

  useEffect(() => {
    // Enable persistence only after mount to avoid SSR/client hydration mismatch.
    setIsPersistenceEnabled(true);
  }, []);

  useEffect(() => {
    if (!isPersistenceEnabled) return;

    // Create debounced persister to reduce disk I/O
    const persister = createDebouncedPersister(CACHE_KEY, DEBOUNCE_DELAY);
    persisterRef.current = persister;

    const [unsubscribe] = persistQueryClient({
      queryClient,
      persister,
      maxAge: MAX_AGE,
      buster: "beblocky-cache-v1",
    });

    return () => {
      unsubscribe();
      // Clean up any pending writes
      if (persisterRef.current) {
        persisterRef.current.removeClient();
      }
    };
  }, [isPersistenceEnabled, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
