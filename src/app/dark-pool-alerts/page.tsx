"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { PageHeader, Card, LiveBadge } from "@/components/ui/card";
import { RefreshTimer } from "@/components/ui/refresh-timer";

const API = "http://localhost:3850";

interface MegaBlock {
  ticker: string;
  ts: string;
  price: number;
  size: number;
  premium: number;
  direction: string;
}

interface TickerSummary {
  ticker: string;
  prints: number;
  dpss: number;
  bull_volume: number;
  bear_volume: number;
  neutral_volume: number;
  total_notional: number;
  big_count: number;
  mega_blocks: MegaBlock[];
  large_blocks: MegaBlock[];
  latest_ts: string | null;
}

interface Alert {
  id: string;
  ts: string;
  type: string;
  ticker: string;
  severity: number;
  message: string;
  premium?: number;
  direction?: string;
  dpss?: number;
  prints?: number;
  delta?: number;
  ratio?: number;
  tickers?: string[];
}

interface GlobalStats {
  total_notional: number;
  total_prints: number;
  weighted_dpss: number;
  mega_count: number;
  big_count: number;
  accum_count: number;
  distrib_count: number;
}

interface ScanResponse {
  ok: boolean;
  generated_at: string;
  watchlist: string[];
  tickers: Record<string, TickerSummary>;
  ranked: TickerSummary[];
  alerts: Alert[];
  new_alerts: Alert[];
  global: GlobalStats;
}

function fmtUsd(v: number): string {
  const a = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  if (a >= 1e9) return `${sign}$${(a / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `${sign}$${(a / 1e6).toFixed(1)}M`;
  if (a >= 1e3) return `${sign}$${(a / 1e3).toFixed(0)}K`;
  return `${sign}$${a.toFixed(0)}`;
}

function dpssColor(dpss: number): string {
  if (dpss >= 0.65) return "#22C55E";
  if (dpss >= 0.55) return "#AAFFAA";
  if (dpss >= 0.45) return "#6B6B75";
  if (dpss >= 0.35) return "#FFA726";
  return "#EF4444";
}

function alertColor(type: string): string {
  if (type === "MEGA_BLOCK") return "#B388FF";
  if (type === "LARGE_BLOCK") return "#42A5F5";
  if (type === "ACCUMULATION" || type === "CROSS_ACCUM") return "#22C55E";
  if (type === "DISTRIBUTION" || type === "CROSS_DISTRIB") return "#EF4444";
  if (type === "VOLUME_SPIKE") return "#FF6B00";
  if (type === "DPSS_SHIFT") return "#FFA726";
  return "#6B6B75";
}

function timeAgo(ts: string): string {
  const d = new Date(ts);
  const now = new Date();
  const sec = Math.max(0, Math.round((now.getTime() - d.getTime()) / 1000));
  if (sec < 10) return "MAINTENANT";
  if (sec < 60) return `il y a ${sec}s`;
  const min = Math.round(sec / 60);
  if (min < 60) return `il y a ${min}min`;
  const h = Math.round(min / 60);
  if (h < 24) return `il y a ${h}h`;
  return `il y a ${Math.round(h / 24)}j`;
}

export default function DarkPoolAlertsPage() {
  const [data, setData] = useState<ScanResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "mega" | "accum" | "shift">("all");
  const [tickerFilter, setTickerFilter] = useState("");

  const load = useCallback(async () => {
    try {
      setError(null);
      const r = await fetch(`${API}/api/uw/darkpool-alerts`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const json = await r.json();
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  const filteredAlerts = useMemo(() => {
    if (!data) return [];
    let list = data.alerts;
    if (filter === "mega") list = list.filter((a) => a.type === "MEGA_BLOCK" || a.type === "LARGE_BLOCK");
    if (filter === "accum")
      list = list.filter(
        (a) => a.type === "ACCUMULATION" || a.type === "DISTRIBUTION" || a.type === "CROSS_ACCUM" || a.type === "CROSS_DISTRIB"
      );
    if (filter === "shift") list = list.filter((a) => a.type === "DPSS_SHIFT" || a.type === "VOLUME_SPIKE");
    if (tickerFilter) {
      const q = tickerFilter.toUpperCase();
      list = list.filter((a) => a.ticker.includes(q));
    }
    return list;
  }, [data, filter, tickerFilter]);

  return (
    <div className="p-6">
      <PageHeader
        timer={<RefreshTimer intervalSeconds={30} />}
        title="Dark Pool Alerts"
        subtitle="Scan temps reel — prints institutionnels, accumulation, distribution, shifts DPSS"
      >
        <button
          onClick={load}
          className="px-3 py-1.5 bg-[#111114] border border-[#1E1E22] rounded-lg text-xs hover:border-[#FF6B00] transition-colors"
        >
          Rafraichir
        </button>
        <LiveBadge />
      </PageHeader>

      {loading && !data ? (
        <Card className="p-12 text-center text-[#6B6B75]">Scan dark pool en cours — 23 tickers...</Card>
      ) : error ? (
        <Card className="p-12 text-center text-[#6B6B75]">
          <span className="text-[#FF6B00] font-semibold">Reconnexion automatique en cours...</span>
          <div className="text-xs mt-2">{error}</div>
        </Card>
      ) : data ? (
        <div className="space-y-4">
          {/* Global KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-7 gap-2">
            <Card className="p-3">
              <div className="text-[9px] uppercase text-[#6B6B75]">Notional total</div>
              <div className="text-xl font-extrabold font-mono text-[#F0F0F0]">
                {fmtUsd(data.global.total_notional)}
              </div>
            </Card>
            <Card className="p-3">
              <div className="text-[9px] uppercase text-[#6B6B75]">Prints total</div>
              <div className="text-xl font-extrabold font-mono text-[#F0F0F0]">
                {data.global.total_prints.toLocaleString("fr-FR")}
              </div>
            </Card>
            <Card className="p-3">
              <div className="text-[9px] uppercase text-[#6B6B75]">DPSS pondere</div>
              <div
                className="text-xl font-extrabold font-mono"
                style={{ color: dpssColor(data.global.weighted_dpss) }}
              >
                {(data.global.weighted_dpss * 100).toFixed(1)}%
              </div>
            </Card>
            <Card className="p-3">
              <div className="text-[9px] uppercase text-[#6B6B75]">Mega blocks</div>
              <div className="text-xl font-extrabold font-mono text-[#B388FF]">
                {data.global.mega_count}
              </div>
            </Card>
            <Card className="p-3">
              <div className="text-[9px] uppercase text-[#6B6B75]">Big blocks</div>
              <div className="text-xl font-extrabold font-mono text-[#42A5F5]">
                {data.global.big_count}
              </div>
            </Card>
            <Card className="p-3">
              <div className="text-[9px] uppercase text-[#6B6B75]">Accumulation</div>
              <div className="text-xl font-extrabold font-mono text-[#22C55E]">
                {data.global.accum_count}
              </div>
            </Card>
            <Card className="p-3">
              <div className="text-[9px] uppercase text-[#6B6B75]">Distribution</div>
              <div className="text-xl font-extrabold font-mono text-[#EF4444]">
                {data.global.distrib_count}
              </div>
            </Card>
          </div>

          {/* Alerts feed */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <h3 className="text-xs font-bold text-[#F0F0F0] uppercase tracking-wider">
                Flux d'alertes ({filteredAlerts.length})
                {data.new_alerts.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 text-[9px] rounded bg-[#FF6B00] text-black font-bold">
                    +{data.new_alerts.length} NEW
                  </span>
                )}
              </h3>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Ticker..."
                  value={tickerFilter}
                  onChange={(e) => setTickerFilter(e.target.value)}
                  className="bg-[#0D0D10] border border-[#1E1E22] rounded-md px-2 py-1 text-xs text-[#F0F0F0] w-24"
                />
                {(["all", "mega", "accum", "shift"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all ${
                      filter === f
                        ? "bg-[#FF6B00] text-black"
                        : "bg-[#1A1A1E] text-[#6B6B75] hover:text-[#F0F0F0]"
                    }`}
                  >
                    {f === "all"
                      ? "TOUS"
                      : f === "mega"
                      ? "BLOCKS"
                      : f === "accum"
                      ? "ACCUM/DISTRIB"
                      : "SHIFTS"}
                  </button>
                ))}
              </div>
            </div>

            {filteredAlerts.length === 0 ? (
              <div className="text-center py-8 text-[#6B6B75] text-xs">
                Aucune alerte pour ce filtre
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[500px] overflow-y-auto">
                {filteredAlerts.slice(0, 100).map((a) => {
                  const color = alertColor(a.type);
                  return (
                    <div
                      key={a.id}
                      className="flex items-center gap-3 p-2 rounded-md hover:bg-[#FFFFFF06]"
                      style={{
                        backgroundColor: `${color}08`,
                        borderLeft: `3px solid ${color}`,
                      }}
                    >
                      <div className="w-16 text-[9px] text-[#6B6B75] font-mono">
                        {timeAgo(a.ts)}
                      </div>
                      <div
                        className="w-24 text-[9px] font-bold px-2 py-0.5 rounded text-center"
                        style={{ backgroundColor: `${color}22`, color }}
                      >
                        {a.type.replace("_", " ")}
                      </div>
                      <div className="w-16 font-mono font-bold text-sm text-[#FF6B00]">
                        {a.ticker}
                      </div>
                      <div className="flex-1 text-[11px] text-[#F0F0F0]">{a.message}</div>
                      <div className="w-14 h-1.5 bg-[#1A1A1E] rounded-full overflow-hidden">
                        <div
                          className="h-full"
                          style={{ width: `${a.severity}%`, backgroundColor: color }}
                        />
                      </div>
                      <div
                        className="w-8 text-[10px] font-mono font-bold text-right"
                        style={{ color }}
                      >
                        {a.severity}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Watchlist summary table */}
          <Card className="p-4">
            <h3 className="text-xs font-bold text-[#F0F0F0] mb-3 uppercase tracking-wider">
              Watchlist ({data.watchlist.length} tickers) — tri par notional
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-[#1E1E22]">
                    <th className="text-left text-[9px] text-[#6B6B75] uppercase p-2">Ticker</th>
                    <th className="text-right text-[9px] text-[#6B6B75] uppercase p-2">Notional</th>
                    <th className="text-right text-[9px] text-[#6B6B75] uppercase p-2">Prints</th>
                    <th className="text-right text-[9px] text-[#6B6B75] uppercase p-2">DPSS</th>
                    <th className="text-right text-[9px] text-[#6B6B75] uppercase p-2">Bull vol</th>
                    <th className="text-right text-[9px] text-[#6B6B75] uppercase p-2">Bear vol</th>
                    <th className="text-right text-[9px] text-[#6B6B75] uppercase p-2">Mega</th>
                    <th className="text-right text-[9px] text-[#6B6B75] uppercase p-2">Big</th>
                  </tr>
                </thead>
                <tbody>
                  {data.ranked.map((t) => (
                    <tr key={t.ticker} className="border-b border-[#0E0E12] hover:bg-[#FFFFFF06]">
                      <td className="p-2 font-mono font-bold text-xs text-[#FF6B00]">
                        {t.ticker}
                      </td>
                      <td className="p-2 text-right font-mono text-xs text-[#F0F0F0]">
                        {fmtUsd(t.total_notional)}
                      </td>
                      <td className="p-2 text-right font-mono text-xs text-[#F0F0F0]">
                        {t.prints}
                      </td>
                      <td
                        className="p-2 text-right font-mono font-bold text-xs"
                        style={{ color: dpssColor(t.dpss) }}
                      >
                        {(t.dpss * 100).toFixed(1)}%
                      </td>
                      <td className="p-2 text-right font-mono text-xs text-[#22C55E]">
                        {t.bull_volume.toLocaleString("fr-FR")}
                      </td>
                      <td className="p-2 text-right font-mono text-xs text-[#EF4444]">
                        {t.bear_volume.toLocaleString("fr-FR")}
                      </td>
                      <td className="p-2 text-right font-mono text-xs text-[#B388FF]">
                        {t.mega_blocks.length || ""}
                      </td>
                      <td className="p-2 text-right font-mono text-xs text-[#42A5F5]">
                        {t.big_count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
