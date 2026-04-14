"use client";

import { useCallback, useEffect, useState } from "react";
import { useVisiblePolling } from "@/hooks/use-visible-polling";

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

type TwsState = "idle" | "connecting" | "success" | "error";

/**
 * Thin banner at the top of the dashboard that lists data sources which
 * are currently disconnected. Critical sources (UW, Sierra) trigger a red
 * warning; optional sources (TWS, schedulers) trigger a discreet amber notice.
 * Includes a TWS reconnect button with connection animation.
 * Polls /api/health every 30s.
 */
export function ConnectivityBanner() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [reachable, setReachable] = useState<boolean>(true);
  const [twsState, setTwsState] = useState<TwsState>("idle");
  const [twsDetail, setTwsDetail] = useState<string>("");

  const load = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/health`, {
        signal: AbortSignal.timeout(4000),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j: HealthResponse = await r.json();
      setHealth(j);
      setReachable(true);
    } catch {
      setReachable(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);
  useVisiblePolling(load, POLL_MS);

  const reconnectTws = useCallback(async () => {
    setTwsState("connecting");
    setTwsDetail("");
    try {
      const r = await fetch(`${API}/api/market/tws/reconnect`, {
        method: "POST",
        signal: AbortSignal.timeout(20000),
      });
      const j = await r.json();
      if (j.reconnected && j.connected) {
        setTwsState("success");
        setTwsDetail(`${j.qualified_count ?? 0} contrats qualifies`);
        // Refresh health after 2s to update banner
        setTimeout(() => {
          load();
          setTwsState("idle");
        }, 3000);
      } else {
        setTwsState("error");
        setTwsDetail("TWS non joignable — verifiez que TWS/Gateway est lance");
        setTimeout(() => setTwsState("idle"), 5000);
      }
    } catch (e) {
      setTwsState("error");
      setTwsDetail(e instanceof Error ? e.message : "Erreur reseau");
      setTimeout(() => setTwsState("idle"), 5000);
    }
  }, [load]);

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

  // Check if TWS is in the down list
  const twsDown = [...critical, ...optional].some(
    (s) => s.key === "tws" || s.label?.toLowerCase().includes("tws") || s.label?.toLowerCase().includes("interactive"),
  );

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

            {/* TWS Reconnect Button */}
            {twsDown && (
              <TwsReconnectButton
                state={twsState}
                detail={twsDetail}
                onReconnect={reconnectTws}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// TWS Reconnect Button with animation
// ---------------------------------------------------------------------------
function TwsReconnectButton({
  state,
  detail,
  onReconnect,
}: {
  state: TwsState;
  detail: string;
  onReconnect: () => void;
}) {
  if (state === "connecting") {
    return (
      <span className="ml-auto flex items-center gap-2 px-3 py-1 rounded-md bg-[#42A5F515] border border-[#42A5F540]">
        <TwsSpinner />
        <span className="text-[10px] text-[#42A5F5] font-bold uppercase tracking-wider animate-pulse">
          Connexion TWS...
        </span>
      </span>
    );
  }

  if (state === "success") {
    return (
      <span className="ml-auto flex items-center gap-2 px-3 py-1 rounded-md bg-[#22C55E15] border border-[#22C55E40]">
        <svg className="w-3.5 h-3.5 text-[#22C55E]" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
        <span className="text-[10px] text-[#22C55E] font-bold uppercase tracking-wider">
          Connecte
        </span>
        {detail && (
          <span className="text-[9px] text-[#6B6B75]">— {detail}</span>
        )}
      </span>
    );
  }

  if (state === "error") {
    return (
      <span className="ml-auto flex items-center gap-2 px-3 py-1 rounded-md bg-[#EF444415] border border-[#EF444440]">
        <span className="text-[10px] text-[#EF4444] font-bold uppercase tracking-wider">
          Echec
        </span>
        {detail && (
          <span className="text-[9px] text-[#B0B0B8]">{detail}</span>
        )}
      </span>
    );
  }

  // idle
  return (
    <button
      onClick={onReconnect}
      className="ml-auto flex items-center gap-1.5 px-3 py-1 rounded-md border transition-all
        bg-[#42A5F510] border-[#42A5F530] hover:bg-[#42A5F520] hover:border-[#42A5F5]
        active:scale-95"
    >
      <svg className="w-3 h-3 text-[#42A5F5]" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
      </svg>
      <span className="text-[10px] text-[#42A5F5] font-bold uppercase tracking-wider">
        Reconnecter TWS
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Animated spinner
// ---------------------------------------------------------------------------
function TwsSpinner() {
  return (
    <svg
      className="w-3.5 h-3.5 animate-spin text-[#42A5F5]"
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="31.42 31.42"
        strokeDashoffset="10"
        opacity="0.3"
      />
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="20 43"
        strokeDashoffset="0"
      />
    </svg>
  );
}
