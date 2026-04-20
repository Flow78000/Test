"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { PageHeader, LiveBadge, Card, Badge, KpiCard } from "@/components/ui/card";
import { RefreshTimer } from "@/components/ui/refresh-timer";
import { useVisiblePolling } from "@/hooks/use-visible-polling";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FlowAlert {
  time: string;
  ticker: string;
  strike: number;
  expiration: string;
  type: "CALL" | "PUT" | "call" | "put";
  premium: number;
  volume: number;
  open_interest: number;
  iv: number;
  is_sweep: boolean;
  sentiment?: string;
}

interface MarketTide {
  net_call_premium: number;
  net_put_premium: number;
  net_premium: number;
  sentiment: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const API = "http://localhost:3850";

function fmtPremium(n: number): string {
  if (n == null || isNaN(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (abs >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return "$" + n.toLocaleString();
}

function relativeTime(isoStr: string): string {
  try {
    const ts = new Date(isoStr).getTime();
    const now = Date.now();
    const diffSec = Math.floor((now - ts) / 1000);
    if (diffSec < 60) return "il y a " + diffSec + "s";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return "il y a " + diffMin + " min";
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return "il y a " + diffH + "h";
    return "il y a " + Math.floor(diffH / 24) + "j";
  } catch {
    return isoStr;
  }
}

function formatTime(isoStr: string): string {
  try {
    const d = new Date(isoStr);
    return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch {
    return isoStr;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type TypeFilter = "all" | "calls" | "puts";

export default function FlowPage() {
  const [alerts, setAlerts] = useState<FlowAlert[]>([]);
  const [tide, setTide] = useState<MarketTide | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Filters
  const [tickerFilter, setTickerFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [minPremium, setMinPremium] = useState(0);

  const fetchData = useCallback(async () => {
    setError(false);
    try {
      const [alertResp, tideResp] = await Promise.all([
        fetch(`${API}/api/uw/flow-alerts`, { signal: AbortSignal.timeout(10000) }),
        fetch(`${API}/api/uw/market-tide`, { signal: AbortSignal.timeout(10000) }),
      ]);

      if (!alertResp.ok) throw new Error("flow");
      const alertJson = await alertResp.json();
      const rawAlerts: FlowAlert[] = (alertJson?.data || alertJson || []).map((a: any) => ({
        time: a.time || a.timestamp || a.created_at || new Date().toISOString(),
        ticker: a.ticker || a.symbol || "",
        strike: a.strike ?? 0,
        expiration: a.expiration || a.expiry || "",
        type: (a.type || a.option_type || "CALL").toUpperCase(),
        premium: a.premium ?? a.total_premium ?? 0,
        volume: a.volume ?? 0,
        open_interest: a.open_interest ?? a.oi ?? 0,
        iv: a.iv ?? a.implied_volatility ?? 0,
        is_sweep: a.is_sweep ?? a.sweep ?? false,
        sentiment: a.sentiment,
      }));
      setAlerts(rawAlerts);

      if (tideResp.ok) {
        const tideJson = await tideResp.json();
        const td = tideJson?.data || tideJson;
        setTide({
          net_call_premium: td?.net_call_premium ?? td?.call_premium ?? 0,
          net_put_premium: td?.net_put_premium ?? td?.put_premium ?? 0,
          net_premium: td?.net_premium ?? 0,
          sentiment: td?.sentiment ?? (td?.net_premium >= 0 ? "BULL" : "BEAR"),
        });
      }
    } catch {
      setError(true);
      setAlerts([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useVisiblePolling(fetchData, 10_000);

  // Filtered + sorted
  const filtered = useMemo(() => {
    let list = [...alerts];
    if (tickerFilter.trim()) {
      const tf = tickerFilter.trim().toUpperCase();
      list = list.filter((a) => a.ticker.toUpperCase().includes(tf));
    }
    if (typeFilter === "calls") list = list.filter((a) => a.type === "CALL");
    if (typeFilter === "puts") list = list.filter((a) => a.type === "PUT");
    if (minPremium > 0) list = list.filter((a) => a.premium >= minPremium);
    // Sort most recent first
    list.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    return list;
  }, [alerts, tickerFilter, typeFilter, minPremium]);

  const totalPremium = useMemo(() => filtered.reduce((s, a) => s + a.premium, 0), [filtered]);
  const sweepCount = useMemo(() => filtered.filter((a) => a.is_sweep).length, [filtered]);

  const selCls =
    "bg-[#111114] border border-[#1E1E22] rounded-lg px-3 py-1.5 text-xs text-[#E0E0E5] focus:border-[#FF6B00] focus:outline-none transition-colors";

  return (
    <div className="p-6 min-h-screen bg-[#08080A] text-[#E0E0E5]">
      <PageHeader timer={<RefreshTimer intervalSeconds={10} />} title="Flow d'Options" subtitle="Flux institutionnels — sweeps, blocs et activite inhabituelle">
        <LiveBadge />
      </PageHeader>

      {/* Loading / Error */}
      {loading && !alerts.length ? (
        <Card className="p-12 text-center text-[#6B6B75]">Chargement...</Card>
      ) : error && !alerts.length ? (
        <Card className="p-12 text-center text-[#6B6B75]">
          <span className="text-[#FF6B00] font-semibold">Reconnexion automatique en cours...</span>
          <div className="text-xs mt-2 text-[#6B6B75]">Le serveur se reconnecte tout seul — aucune action requise.</div>
        </Card>
      ) : (
        <>
          {/* Market Tide */}
          {tide && (
            <Card className="p-4 mb-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-[#6B6B75] uppercase tracking-widest">Market Tide</span>
                  <Badge color={tide.sentiment === "BULL" ? "#22C55E" : "#EF4444"}>
                    {tide.sentiment}
                  </Badge>
                </div>
                <div className="flex items-center gap-6 text-xs">
                  <div>
                    <span className="text-[#6B6B75] mr-2">Calls Net:</span>
                    <span className="font-mono text-[#22C55E] font-bold">${fmtPremium(tide.net_call_premium)}</span>
                  </div>
                  <div>
                    <span className="text-[#6B6B75] mr-2">Puts Net:</span>
                    <span className="font-mono text-[#EF4444] font-bold">${fmtPremium(tide.net_put_premium)}</span>
                  </div>
                  <div>
                    <span className="text-[#6B6B75] mr-2">Net Premium:</span>
                    <span className={`font-mono font-bold ${tide.net_premium >= 0 ? "text-[#22C55E]" : "text-[#EF4444]"}`}>
                      ${fmtPremium(tide.net_premium)}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Filter Bar */}
          <Card className="p-3 mb-4">
            <div className="flex items-center gap-4 flex-wrap">
              <input
                type="text"
                placeholder="Filtrer par ticker..."
                value={tickerFilter}
                onChange={(e) => setTickerFilter(e.target.value)}
                className={`${selCls} w-40`}
              />
              <div className="flex items-center gap-1 bg-[#111114] border border-[#1E1E22] rounded-lg overflow-hidden">
                {(["all", "calls", "puts"] as TypeFilter[]).map((v) => (
                  <button
                    key={v}
                    onClick={() => setTypeFilter(v)}
                    className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                      typeFilter === v
                        ? "bg-[#FF6B00] text-white"
                        : "text-[#6B6B75] hover:text-[#E0E0E5]"
                    }`}
                  >
                    {v === "all" ? "Tous" : v === "calls" ? "Calls" : "Puts"}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <label className="text-[10px] text-[#6B6B75] uppercase">Min Premium</label>
                <input
                  type="number"
                  value={minPremium || ""}
                  onChange={(e) => setMinPremium(Number(e.target.value) || 0)}
                  placeholder="0"
                  className={`${selCls} w-24`}
                />
              </div>
              <div className="ml-auto flex items-center gap-4 text-xs text-[#6B6B75]">
                <span>
                  <span className="font-mono text-[#FF6B00] font-bold">{filtered.length}</span> alertes
                </span>
                <span>
                  <span className="font-mono text-[#FFA726] font-bold">{sweepCount}</span> sweeps
                </span>
                <span>
                  Total: <span className="font-mono text-[#E0E0E5] font-bold">${fmtPremium(totalPremium)}</span>
                </span>
              </div>
            </div>
          </Card>

          {/* Flow Table */}
          <Card className="overflow-x-auto">
            <table className="w-full text-xs font-mono border-collapse">
              <thead>
                <tr className="text-[#6B6B75] uppercase tracking-wider text-[10px] border-b border-[#1E1E22]">
                  <th className="px-3 py-2.5 text-left">Heure</th>
                  <th className="px-3 py-2.5 text-left">Ticker</th>
                  <th className="px-3 py-2.5 text-right">Strike</th>
                  <th className="px-3 py-2.5 text-center">Expiry</th>
                  <th className="px-3 py-2.5 text-center">Type</th>
                  <th className="px-3 py-2.5 text-right">Premium</th>
                  <th className="px-3 py-2.5 text-right">Volume</th>
                  <th className="px-3 py-2.5 text-right">OI</th>
                  <th className="px-3 py-2.5 text-right">IV</th>
                  <th className="px-3 py-2.5 text-center">Sweep</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((alert, i) => {
                  const isCall = alert.type === "CALL";
                  const isSweep = alert.is_sweep;

                  return (
                    <tr
                      key={`${alert.time}-${alert.ticker}-${i}`}
                      className={`border-t border-[#1E1E22] hover:bg-[#16161A] transition-colors ${
                        isSweep ? "bg-[#FF6B00]/5 border-l-2 border-l-[#FF6B00]" : ""
                      }`}
                    >
                      <td className="px-3 py-2 text-[#6B6B75]">
                        <div>{formatTime(alert.time)}</div>
                        <div className="text-[9px] text-[#4A4A52]">{relativeTime(alert.time)}</div>
                      </td>
                      <td className="px-3 py-2 font-bold text-[#E0E0E5]">{alert.ticker}</td>
                      <td className="px-3 py-2 text-right text-[#A0A0A8]">{alert.strike.toLocaleString()}</td>
                      <td className="px-3 py-2 text-center text-[#6B6B75]">{alert.expiration}</td>
                      <td className="px-3 py-2 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isCall
                              ? "bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30"
                              : "bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30"
                          }`}
                        >
                          {alert.type}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-[#E0E0E5]">${fmtPremium(alert.premium)}</td>
                      <td className="px-3 py-2 text-right text-[#A0A0A8]">{alert.volume.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right text-[#6B6B75]">{alert.open_interest.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right text-[#A0A0A8]">{(alert.iv * 100).toFixed(1)}%</td>
                      <td className="px-3 py-2 text-center">
                        {isSweep ? (
                          <Badge color="#FF6B00">SWEEP</Badge>
                        ) : (
                          <span className="text-[#4A4A52]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={10} className="text-center py-8 text-[#6B6B75]">
                      Aucune alerte correspondante
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Card>

          <div className="flex items-center justify-between mt-3 text-[10px] text-[#6B6B75]">
            <span>{alerts.length} alertes totales</span>
            <span>Actualisation auto 30s</span>
          </div>
        </>
      )}
    </div>
  );
}
