"use client";

import { useEffect, useState } from "react";

const API = "http://localhost:3850";
const POLL_MS = 30_000;

type SourceStatus = {
  ok: boolean;
  detail: string;
  label: string;
};

type HealthResponse = {
  status: "ok" | "degraded";
  sources?: Record<string, SourceStatus>;
  critical_down?: string[];
  optional_down?: string[];
};

/**
 * Thin banner at the top of the dashboard that lists data sources which
 * are currently disconnected. Critical sources (UW, Sierra) trigger a red
 * warning; optional sources (TWS, schedulers) trigger a discreet amber notice.
 * Polls /api/health every 30s.
 */
export function ConnectivityBanner() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [reachable, setReachable] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const r = await fetch(`${API}/api/health`, {
          signal: AbortSignal.timeout(4000),
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j: HealthResponse = await r.json();
        if (!cancelled) {
          setHealth(j);
          setReachable(true);
        }
      } catch {
        if (!cancelled) setReachable(false);
      }
    };
    load();
    const id = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  // Backend unreachable
  if (!reachable) {
    return (
      <div className="mb-4 rounded-lg border border-[#EF4444] bg-[#EF444415] px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-[#EF4444] animate-pulse" />
          <div className="flex-1">
            <div className="text-sm font-bold text-[#EF4444] uppercase tracking-wider">
              Backend FLO.W injoignable
            </div>
            <div className="text-xs text-[#B0B0B8] mt-0.5">
              Aucune donnee disponible — reconnexion automatique en cours...
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!health || !health.sources) return null;

  const critical = (health.critical_down || [])
    .map((k) => ({ key: k, ...health.sources![k] }))
    .filter((s) => s.label);
  const optional = (health.optional_down || [])
    .map((k) => ({ key: k, ...health.sources![k] }))
    .filter((s) => s.label);

  if (critical.length === 0 && optional.length === 0) {
    return null;
  }

  return (
    <div className="mb-4 space-y-2">
      {critical.length > 0 && (
        <div className="rounded-lg border border-[#EF4444] bg-[#EF444412] px-4 py-3">
          <div className="flex items-start gap-3">
            <div className="mt-1 h-2 w-2 rounded-full bg-[#EF4444] animate-pulse flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-bold text-[#EF4444] uppercase tracking-wider">
                Outils critiques deconnectes — donnees partielles
              </div>
              <ul className="mt-1.5 space-y-0.5">
                {critical.map((s) => (
                  <li
                    key={s.key}
                    className="text-xs text-[#F0F0F0] flex items-center gap-2"
                  >
                    <span className="font-mono text-[#EF4444]">●</span>
                    <span className="font-semibold">{s.label}</span>
                    <span className="text-[#6B6B75]">— {s.detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {optional.length > 0 && (
        <div className="rounded-lg border border-[#FFA726]/40 bg-[#FFA72610] px-4 py-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold text-[#FFA726] uppercase tracking-wider">
              Outils optionnels offline :
            </span>
            {optional.map((s) => (
              <span
                key={s.key}
                className="text-[10px] text-[#B0B0B8] flex items-center gap-1"
                title={s.detail}
              >
                <span className="font-mono text-[#FFA726]">○</span>
                {s.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
