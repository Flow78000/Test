"use client";

import { QueryClient, QueryClientProvider, defaultShouldDehydrateQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { installFetchCache } from "@/lib/fetch-cache";

/**
 * Single QueryClient for the whole app.
 *
 * Tuned for FLO.W's "trading dashboard" usage pattern:
 * - staleTime 20s: data feels live but doesn't refetch on every focus/mount
 * - gcTime 5min: keeps cached data alive across page navigations so going
 *   back to a page is instantaneous
 * - refetchOnWindowFocus disabled: traders alt-tab constantly, we don't want
 *   a refresh storm
 * - retry once: UW failures should surface fast, not hang the UI
 */
function makeClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 20_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: true,
        retry: 1,
        retryDelay: (i) => Math.min(800 * 2 ** i, 4000),
      },
    },
  });
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  // useState ensures the client is created once per browser session
  const [client] = useState(makeClient);

  // Install the global fetch cache once on first mount so every page
  // (whether or not it uses React Query) gets SWR-style caching for free.
  useEffect(() => { installFetchCache(); }, []);

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
