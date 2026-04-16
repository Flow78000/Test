"use client";

/**
 * Browser-side fetch interceptor with TTL cache + in-flight dedup.
 *
 * Patches window.fetch so that every page in the app benefits from
 * caching without having to be migrated to React Query individually.
 *
 * Strategy (Stale-While-Revalidate):
 *   - First call to a URL → real fetch, store in cache, return result
 *   - Subsequent calls within `staleAfter` ms → instant cache hit
 *   - Calls between `staleAfter` and `dropAfter` → return cached data
 *     immediately AND fire a background refresh
 *   - Calls past `dropAfter` → real fetch, ignore cache
 *
 * Concurrency: when N components fire the same URL at the same instant
 * (page mount, multiple polling timers), only one network request goes out
 * and all callers receive the same response.
 *
 * Cache key: full URL string. Only GET requests are cached.
 *
 * Bypass: pass `cache: 'no-store'` or `headers: { 'x-no-cache': '1' }` to
 * skip the interceptor for one call.
 */

type CacheEntry = {
  ts: number;
  body: any;
  status: number;
  headers: Record<string, string>;
};

type Pending = Promise<Response>;

const CACHE = new Map<string, CacheEntry>();
const INFLIGHT = new Map<string, Pending>();

/** How long until a cached entry is considered fresh (instant hit, no refresh). */
const STALE_AFTER_DEFAULT = 8_000;
/** How long until a cached entry is dropped entirely (real fetch). */
const DROP_AFTER_DEFAULT = 60_000;

/** Per-endpoint TTL overrides — pattern → { stale, drop } in ms. First match wins. */
const TTL_RULES: Array<{ match: (u: string) => boolean; stale: number; drop: number }> = [
  // News & live alerts → very short cache
  { match: u => u.includes("/api/news/"), stale: 5_000, drop: 30_000 },
  { match: u => u.includes("/api/uw/option-trades/flow-alerts"), stale: 5_000, drop: 30_000 },
  { match: u => u.includes("/api/sierra/signals"), stale: 3_000, drop: 20_000 },

  // Dark pool intraday → modest
  { match: u => u.includes("/api/uw/darkpool/"), stale: 10_000, drop: 60_000 },
  { match: u => u.includes("/api/regime/"), stale: 10_000, drop: 60_000 },

  // GEX, greeks → 30s is fine
  { match: u => u.includes("/api/uw/greek-exposure"), stale: 30_000, drop: 120_000 },
  { match: u => u.includes("/api/sierra/gex-analysis"), stale: 30_000, drop: 180_000 },

  // Surface, contracts, term structure → very stable, longer cache
  { match: u => u.includes("/api/uw/vol-surface"), stale: 60_000, drop: 300_000 },
  { match: u => u.includes("/api/uw/option-contracts"), stale: 90_000, drop: 600_000 },

  // Static-ish history endpoints
  { match: u => u.includes("/history") || u.includes("/calendar") || u.includes("/earnings"), stale: 60_000, drop: 600_000 },
];

function ttlFor(url: string): { stale: number; drop: number } {
  for (const rule of TTL_RULES) {
    if (rule.match(url)) return { stale: rule.stale, drop: rule.drop };
  }
  return { stale: STALE_AFTER_DEFAULT, drop: DROP_AFTER_DEFAULT };
}

function buildResponseFrom(entry: CacheEntry): Response {
  return new Response(JSON.stringify(entry.body), {
    status: entry.status,
    headers: entry.headers,
  });
}

/** Stats exposed for debugging. Read via window.__FETCH_CACHE_STATS__ */
const STATS = { hits: 0, swr: 0, misses: 0, dedup: 0, bypass: 0 };

let installed = false;

export function installFetchCache() {
  if (installed) return;
  if (typeof window === "undefined") return;

  installed = true;
  const realFetch = window.fetch.bind(window);

  (window as any).__FETCH_CACHE_STATS__ = () => ({ ...STATS, size: CACHE.size, inflight: INFLIGHT.size });
  (window as any).__FETCH_CACHE_INVALIDATE__ = (prefix?: string) => {
    if (!prefix) {
      const n = CACHE.size;
      CACHE.clear();
      return n;
    }
    let n = 0;
    for (const k of Array.from(CACHE.keys())) {
      if (k.startsWith(prefix)) {
        CACHE.delete(k);
        n++;
      }
    }
    return n;
  };

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const method = (init?.method || "GET").toUpperCase();
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : (input as Request).url;

    // Only cache GET to our local backend
    const isCacheable = method === "GET" && (url.includes("localhost:3850") || url.startsWith("/api/"));
    const noCacheHeader = init?.headers && (init.headers as any)["x-no-cache"] === "1";
    const noStore = init?.cache === "no-store";

    if (!isCacheable || noCacheHeader || noStore) {
      STATS.bypass++;
      return realFetch(input as any, init);
    }

    const now = Date.now();
    const { stale, drop } = ttlFor(url);
    const cached = CACHE.get(url);

    // Fresh hit: serve immediately, no background work
    if (cached && now - cached.ts < stale) {
      STATS.hits++;
      return buildResponseFrom(cached);
    }

    // Stale hit (within drop window): serve cached, fire background refresh
    if (cached && now - cached.ts < drop) {
      STATS.swr++;
      // Kick off background refresh if no in-flight already
      if (!INFLIGHT.has(url)) {
        const refresh = realFetch(input as any, init).then(async resp => {
          if (resp.ok) {
            try {
              const body = await resp.clone().json();
              CACHE.set(url, {
                ts: Date.now(),
                body,
                status: resp.status,
                headers: { "content-type": "application/json", "x-cache": "swr-refresh" },
              });
            } catch { /* not JSON, ignore */ }
          }
          INFLIGHT.delete(url);
          return resp;
        }).catch(e => {
          INFLIGHT.delete(url);
          throw e;
        });
        INFLIGHT.set(url, refresh);
      }
      return buildResponseFrom(cached);
    }

    // Cold miss or expired: dedup concurrent callers behind the same in-flight
    const existing = INFLIGHT.get(url);
    if (existing) {
      STATS.dedup++;
      // Wait for in-flight then return its result (clone so multiple callers can read body)
      const resp = await existing;
      return resp.clone();
    }

    STATS.misses++;
    const promise = realFetch(input as any, init).then(async resp => {
      if (resp.ok && resp.headers.get("content-type")?.includes("application/json")) {
        try {
          const body = await resp.clone().json();
          CACHE.set(url, {
            ts: Date.now(),
            body,
            status: resp.status,
            headers: { "content-type": "application/json", "x-cache": "miss-store" },
          });
        } catch { /* not JSON, ignore */ }
      }
      INFLIGHT.delete(url);
      return resp;
    }).catch(e => {
      INFLIGHT.delete(url);
      throw e;
    });
    INFLIGHT.set(url, promise);
    const resp = await promise;
    return resp.clone();
  };
}
