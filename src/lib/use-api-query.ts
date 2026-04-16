"use client";

import { useQuery, type UseQueryOptions } from "@tanstack/react-query";

const API = "http://localhost:3850";

/**
 * Lightweight wrapper around React Query for FLO.W backend endpoints.
 *
 * Why this and not raw `useEffect + fetch`:
 * - The cached payload survives page navigation (gcTime in QueryProvider)
 *   so going back to a page renders instantly with the previous data
 *   while a fresh fetch happens in the background.
 * - Multiple components asking for the same key share one network call.
 * - Polling (refetchInterval) deduplicates with the cache, so a 10s poll
 *   on a 20s-stale window only hits the network half the time.
 *
 * Usage:
 *   const { data, isLoading, isFetching, error } = useApiQuery<MyShape>(
 *     ["dark-pool", ticker],
 *     `/api/uw/darkpool/${ticker}`,
 *     { refetchInterval: 10_000 }
 *   );
 */
export function useApiQuery<T = unknown>(
  key: ReadonlyArray<unknown>,
  endpoint: string,
  options?: Omit<UseQueryOptions<T, Error, T, ReadonlyArray<unknown>>, "queryKey" | "queryFn">,
) {
  return useQuery<T, Error, T, ReadonlyArray<unknown>>({
    queryKey: key,
    queryFn: async () => {
      const url = endpoint.startsWith("http") ? endpoint : API + endpoint;
      const r = await fetch(url);
      if (!r.ok) throw new Error(`HTTP ${r.status} on ${endpoint}`);
      return (await r.json()) as T;
    },
    ...options,
  });
}

/**
 * Same as useApiQuery but for endpoints that return {ok: false, error: ...}
 * — surfaces the API-level error instead of treating the HTTP 200 as success.
 */
export function useApiQueryStrict<T extends { ok?: boolean; error?: string }>(
  key: ReadonlyArray<unknown>,
  endpoint: string,
  options?: Omit<UseQueryOptions<T, Error, T, ReadonlyArray<unknown>>, "queryKey" | "queryFn">,
) {
  return useQuery<T, Error, T, ReadonlyArray<unknown>>({
    queryKey: key,
    queryFn: async () => {
      const url = endpoint.startsWith("http") ? endpoint : API + endpoint;
      const r = await fetch(url);
      if (!r.ok) throw new Error(`HTTP ${r.status} on ${endpoint}`);
      const json = (await r.json()) as T;
      if (json.ok === false) throw new Error(json.error || "API error");
      return json;
    },
    ...options,
  });
}
