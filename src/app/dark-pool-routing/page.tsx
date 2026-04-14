"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";
import { PageHeader, Card, KpiCard, Badge, LiveBadge } from "@/components/ui/card";
import { RefreshTimer } from "@/components/ui/refresh-timer";
import { useVisiblePolling } from "@/hooks/use-visible-polling";
import { fmtPremium, fmtK } from "@/lib/format";

const API = "http://localhost:3850";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BlockEntry {
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
  mega_blocks: BlockEntry[];
  large_blocks: BlockEntry[];
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dpssColor(dpss: number): string {
  if (dpss > 0.55) return "#22C55E";
  if (dpss < 0.45) return "#EF4444";
  return "#6B6B75";
}

function dpssLabel(dpss: number): string {
  if (dpss > 0.55) return "BULL";
  if (dpss < 0.45) return "BEAR";
  return "NEUTRE";
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
  if (sec < 60) return `${sec}s`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}min`;
  return `${Math.round(min / 60)}h`;
}

function fmtTime(ts: string): string {
  try {
    return new Date(ts).toLocaleTimeString("fr-FR", {
      timeZone: "America/New_York",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return "--";
  }
}

// ─── Custom Donut Tooltip ─────────────────────────────────────────────────────

function DonutTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: TickerSummary & { value: number } }> }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const dpss = d.dpss ?? 0;
  return (
    <div className="bg-[#111114] border border-[#2A2A2E] rounded-lg p-3 text-xs shadow-xl">
      <div className="font-extrabold font-mono text-[#FF6B00] text-base mb-1">{d.ticker}</div>
      <div className="space-y-1 text-[#F0F0F0]">
        <div className="flex justify-between gap-4">
          <span className="text-[#6B6B75]">Notional</span>
          <span className="font-mono font-semibold">{fmtPremium(d.total_notional)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-[#6B6B75]">DPSS</span>
          <span className="font-mono font-semibold" style={{ color: dpssColor(dpss) }}>
            {(dpss * 100).toFixed(1)}% {dpssLabel(dpss)}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-[#6B6B75]">Prints</span>
          <span className="font-mono">{d.prints}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-[#22C55E]">Bull vol</span>
          <span className="font-mono">{fmtK(d.bull_volume)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-[#EF4444]">Bear vol</span>
          <span className="font-mono">{fmtK(d.bear_volume)}</span>
        </div>
        {d.mega_blocks?.length > 0 && (
          <div className="flex justify-between gap-4">
            <span className="text-[#B388FF]">Mega blocks</span>
            <span className="font-mono">{d.mega_blocks.length}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Direction Badge ──────────────────────────────────────────────────────────

function DirectionBadge({ dir }: { dir: string }) {
  const map: Record<string, string> = {
    BULL: "#22C55E",
    BEAR: "#EF4444",
    NEUTRE: "#6B6B75",
  };
  const color = map[dir] ?? "#6B6B75";
  return (
    <span
      className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide"
      style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}
    >
      {dir}
    </span>
  );
}

// ─── Alert Type Badge ─────────────────────────────────────────────────────────

function AlertTypeBadge({ type }: { type: string }) {
  const color = alertColor(type);
  return (
    <span
      className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide whitespace-nowrap"
      style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}
    >
      {type.replace(/_/g, " ")}
    </span>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DarkPoolRoutingPage() {
  const [data, setData] = useState<ScanResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());

  const load = useCallback(async () => {
    try {
      setError(null);
      const r = await fetch(`${API}/api/uw/darkpool-alerts`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const json = await r.json();
      setData(json);
      setLastUpdate(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useVisiblePolling(load, 30_000);

  // ── Derived data ────────────────────────────────────────────────────────────

  // Top 10 tickers by notional — for the donut chart
  const top10 = useMemo(() => {
    if (!data) return [];
    return data.ranked.filter((t) => t.total_notional > 0).slice(0, 10);
  }, [data]);

  // Donut chart data — one slice per ticker, colored by DPSS
  const donutData = useMemo(
    () =>
      top10.map((t) => ({
        ...t,
        value: t.total_notional,
        name: t.ticker,
        fill: dpssColor(t.dpss),
      })),
    [top10]
  );

  // Flow bar chart data (bull/bear/neutral by ticker, sorted by total notional)
  const barData = useMemo(
    () =>
      top10.map((t) => ({
        ticker: t.ticker,
        bull: t.bull_volume,
        bear: t.bear_volume,
        neutre: t.neutral_volume,
        dpss: t.dpss,
      })),
    [top10]
  );

  // All mega + large blocks across all tickers, sorted by premium desc
  const allBlocks = useMemo(() => {
    if (!data) return [];
    const out: (BlockEntry & { level: "MEGA" | "LARGE" })[] = [];
    for (const t of data.ranked) {
      for (const b of t.mega_blocks) out.push({ ...b, level: "MEGA" });
      for (const b of t.large_blocks) out.push({ ...b, level: "LARGE" });
    }
    out.sort((a, b) => b.premium - a.premium);
    return out;
  }, [data]);

  // KPIs
  const kpiDpss = data ? data.global.weighted_dpss : null;
  const kpiDpssColor = kpiDpss !== null ? dpssColor(kpiDpss) : "#6B6B75";
  const activeTickers = useMemo(
    () => data?.ranked.filter((t) => t.prints > 0).length ?? 0,
    [data]
  );

  // Total notional formatted for donut center
  const totalNotionalStr = data ? fmtPremium(data.global.total_notional) : "--";

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="p-6">
      <PageHeader
        timer={<RefreshTimer intervalSeconds={30} lastUpdate={lastUpdate} />}
        title="Dark Pool Routing"
        subtitle="Visualisation du flux institutionnel — routage, direction et blocs par ticker"
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
        <Card className="p-12 text-center">
          <div className="text-[#6B6B75] text-sm animate-pulse">
            Scan dark pool en cours — 23 tickers en parallele...
          </div>
        </Card>
      ) : error ? (
        <Card className="p-12 text-center">
          <div className="text-[#FF6B00] font-semibold text-sm">
            Reconnexion automatique en cours...
          </div>
          <div className="text-[#6B6B75] text-xs mt-2">{error}</div>
        </Card>
      ) : data ? (
        <div className="space-y-4">

          {/* ── KPI Row ─────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard
              label="Notional Total"
              value={fmtPremium(data.global.total_notional)}
              sublabel={`${data.global.mega_count} mega · ${data.global.big_count} big blocks`}
              color="#FF6B00"
            />
            <KpiCard
              label="Prints Total"
              value={data.global.total_prints.toLocaleString("fr-FR")}
              sublabel={`${data.watchlist.length} tickers scannes`}
              color="#F0F0F0"
            />
            <KpiCard
              label="DPSS Pondere"
              value={kpiDpss !== null ? `${(kpiDpss * 100).toFixed(1)}%` : "--"}
              sublabel={kpiDpss !== null ? dpssLabel(kpiDpss) : ""}
              color={kpiDpssColor}
            />
            <KpiCard
              label="Tickers Actifs"
              value={activeTickers}
              sublabel={`${data.global.accum_count} accum · ${data.global.distrib_count} distrib`}
              color="#42A5F5"
            />
          </div>

          {/* ── Charts Row ──────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Radial Donut Chart */}
            <Card className="p-4">
              <h3 className="text-xs font-bold text-[#F0F0F0] uppercase tracking-wider mb-4">
                Routage par Notional — Top 10 Tickers
              </h3>
              {top10.length === 0 ? (
                <div className="text-center py-12 text-[#6B6B75] text-xs">
                  Aucune donnee disponible
                </div>
              ) : (
                <div className="relative">
                  <ResponsiveContainer width="100%" height={320}>
                    <PieChart>
                      {/* Outer ring: DPSS color */}
                      <Pie
                        data={donutData}
                        cx="50%"
                        cy="50%"
                        outerRadius={130}
                        innerRadius={88}
                        paddingAngle={2}
                        dataKey="value"
                        stroke="none"
                        labelLine={false}
                      >
                        {donutData.map((entry, i) => (
                          <Cell key={`cell-${i}`} fill={entry.fill} opacity={0.85} />
                        ))}
                      </Pie>

                      {/* Inner ring: bull/bear split */}
                      <Pie
                        data={donutData.map((t) => {
                          const total = t.bull_volume + t.bear_volume + t.neutral_volume;
                          return {
                            name: t.ticker,
                            bullPct: total > 0 ? (t.bull_volume / total) * t.value : 0,
                            bearPct: total > 0 ? (t.bear_volume / total) * t.value : 0,
                            neutralPct: total > 0 ? (t.neutral_volume / total) * t.value : 0,
                          };
                        }).flatMap((d) => [
                          { name: `${d.name} Bull`, value: d.bullPct, fill: "#22C55E" },
                          { name: `${d.name} Bear`, value: d.bearPct, fill: "#EF4444" },
                          { name: `${d.name} Neutre`, value: d.neutralPct, fill: "#2A2A2E" },
                        ])}
                        cx="50%"
                        cy="50%"
                        outerRadius={82}
                        innerRadius={52}
                        paddingAngle={1}
                        dataKey="value"
                        stroke="none"
                      >
                        {donutData.flatMap((d, i) => [
                          <Cell key={`bull-${i}`} fill="#22C55E" opacity={0.7} />,
                          <Cell key={`bear-${i}`} fill="#EF4444" opacity={0.7} />,
                          <Cell key={`neu-${i}`} fill="#2A2A2E" opacity={0.5} />,
                        ])}
                      </Pie>

                      <Tooltip content={<DonutTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Center label */}
                  <div
                    className="absolute pointer-events-none flex flex-col items-center justify-center"
                    style={{
                      top: "50%",
                      left: "50%",
                      transform: "translate(-50%, -50%)",
                    }}
                  >
                    <div className="text-[9px] text-[#6B6B75] uppercase tracking-widest mb-0.5">
                      Total
                    </div>
                    <div className="text-lg font-extrabold font-mono text-[#FF6B00]">
                      {totalNotionalStr}
                    </div>
                    <div
                      className="text-[10px] font-bold font-mono mt-0.5"
                      style={{ color: kpiDpssColor }}
                    >
                      DPSS {kpiDpss !== null ? `${(kpiDpss * 100).toFixed(1)}%` : "--"}
                    </div>
                  </div>
                </div>
              )}

              {/* Legend */}
              <div className="flex items-center gap-4 justify-center mt-2">
                <span className="flex items-center gap-1.5 text-[10px] text-[#6B6B75]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#22C55E]" />
                  Bull DPSS &gt;55%
                </span>
                <span className="flex items-center gap-1.5 text-[10px] text-[#6B6B75]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#6B6B75]" />
                  Neutre 45-55%
                </span>
                <span className="flex items-center gap-1.5 text-[10px] text-[#6B6B75]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" />
                  Bear DPSS &lt;45%
                </span>
              </div>
            </Card>

            {/* Flow Direction Bar Chart */}
            <Card className="p-4">
              <h3 className="text-xs font-bold text-[#F0F0F0] uppercase tracking-wider mb-4">
                Direction des Flux — Volume Bull / Bear / Neutre
              </h3>
              {barData.length === 0 ? (
                <div className="text-center py-12 text-[#6B6B75] text-xs">
                  Aucune donnee disponible
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart
                    data={barData}
                    layout="vertical"
                    margin={{ top: 0, right: 16, bottom: 0, left: 8 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#1E1E22"
                      horizontal={false}
                    />
                    <XAxis
                      type="number"
                      tickFormatter={(v) => fmtK(v)}
                      tick={{ fill: "#6B6B75", fontSize: 9 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="ticker"
                      tick={{ fill: "#FF6B00", fontSize: 10, fontWeight: 700, fontFamily: "monospace" }}
                      axisLine={false}
                      tickLine={false}
                      width={44}
                    />
                    <Tooltip
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      formatter={(value: any) => [fmtK(Number(value))]}
                      contentStyle={{
                        background: "#111114",
                        border: "1px solid #2A2A2E",
                        borderRadius: 8,
                        fontSize: 11,
                        color: "#F0F0F0",
                      }}
                    />
                    <Bar dataKey="bull" stackId="a" fill="#22C55E" opacity={0.85} radius={0} />
                    <Bar dataKey="bear" stackId="a" fill="#EF4444" opacity={0.85} radius={0} />
                    <Bar
                      dataKey="neutre"
                      stackId="a"
                      fill="#2A2A2E"
                      opacity={0.7}
                      radius={[0, 4, 4, 0]}
                    />
                    <Legend
                      iconType="square"
                      iconSize={8}
                      formatter={(v) =>
                        v === "bull" ? "Bull" : v === "bear" ? "Bear" : "Neutre"
                      }
                      wrapperStyle={{ fontSize: 10, color: "#6B6B75" }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>
          </div>

          {/* ── Bottom Row: Blocks + Alerts ──────────────────────────────────── */}
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">

            {/* Block Distribution Table — 3/5 */}
            <Card className="p-4 xl:col-span-3">
              <h3 className="text-xs font-bold text-[#F0F0F0] uppercase tracking-wider mb-3">
                Blocs Institutionnels —{" "}
                <span className="text-[#B388FF]">Mega &gt;$10M</span>
                {" "}·{" "}
                <span className="text-[#42A5F5]">Large &gt;$2M</span>
                {" "}
                <span className="text-[#6B6B75] font-normal normal-case">
                  ({allBlocks.length} total, tri par premium)
                </span>
              </h3>
              {allBlocks.length === 0 ? (
                <div className="text-center py-8 text-[#6B6B75] text-xs">
                  Aucun bloc significatif detecte
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#1E1E22]">
                        <th className="text-left p-2 text-[9px] text-[#6B6B75] uppercase tracking-wider">
                          Ticker
                        </th>
                        <th className="text-right p-2 text-[9px] text-[#6B6B75] uppercase tracking-wider">
                          Prix
                        </th>
                        <th className="text-right p-2 text-[9px] text-[#6B6B75] uppercase tracking-wider">
                          Taille
                        </th>
                        <th className="text-right p-2 text-[9px] text-[#6B6B75] uppercase tracking-wider">
                          Premium
                        </th>
                        <th className="text-center p-2 text-[9px] text-[#6B6B75] uppercase tracking-wider">
                          Direction
                        </th>
                        <th className="text-right p-2 text-[9px] text-[#6B6B75] uppercase tracking-wider">
                          Heure (ET)
                        </th>
                        <th className="text-center p-2 text-[9px] text-[#6B6B75] uppercase tracking-wider">
                          Niveau
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {allBlocks.slice(0, 60).map((b, i) => (
                        <tr
                          key={`${b.ticker}-${b.ts}-${i}`}
                          className="border-b border-[#0E0E12] hover:bg-[#FFFFFF05] transition-colors"
                        >
                          <td className="p-2 font-mono font-bold text-[#FF6B00]">{b.ticker}</td>
                          <td className="p-2 text-right font-mono text-[#F0F0F0]">
                            ${b.price.toFixed(2)}
                          </td>
                          <td className="p-2 text-right font-mono text-[#F0F0F0]">
                            {b.size.toLocaleString("fr-FR")}
                          </td>
                          <td className="p-2 text-right font-mono font-bold text-[#F0F0F0]">
                            {fmtPremium(b.premium)}
                          </td>
                          <td className="p-2 text-center">
                            <DirectionBadge dir={b.direction} />
                          </td>
                          <td className="p-2 text-right font-mono text-[#6B6B75] text-[10px]">
                            {b.ts ? fmtTime(b.ts) : "--"}
                          </td>
                          <td className="p-2 text-center">
                            {b.level === "MEGA" ? (
                              <span className="px-2 py-0.5 rounded text-[9px] font-bold text-[#B388FF] bg-[#B388FF22] border border-[#B388FF44]">
                                MEGA
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[9px] font-bold text-[#42A5F5] bg-[#42A5F522] border border-[#42A5F544]">
                                LARGE
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            {/* Alert Feed — 2/5 */}
            <Card className="p-4 xl:col-span-2">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-[#F0F0F0] uppercase tracking-wider">
                  Flux d&apos;Alertes
                  {data.new_alerts.length > 0 && (
                    <span className="ml-2 px-2 py-0.5 text-[9px] rounded bg-[#FF6B00] text-black font-bold">
                      +{data.new_alerts.length} NEW
                    </span>
                  )}
                </h3>
                <span className="text-[#6B6B75] text-[10px]">
                  {data.alerts.length} alertes
                </span>
              </div>

              {data.alerts.length === 0 ? (
                <div className="text-center py-8 text-[#6B6B75] text-xs">
                  Aucune alerte recente
                </div>
              ) : (
                <div className="space-y-1.5 max-h-[520px] overflow-y-auto pr-1">
                  {data.alerts.slice(0, 80).map((a) => {
                    const color = alertColor(a.type);
                    return (
                      <div
                        key={a.id}
                        className="rounded-lg p-2.5 transition-colors hover:opacity-90"
                        style={{
                          background: `${color}09`,
                          borderLeft: `3px solid ${color}`,
                        }}
                      >
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <AlertTypeBadge type={a.type} />
                          <span className="font-mono font-extrabold text-xs text-[#FF6B00]">
                            {a.ticker}
                          </span>
                          <span className="ml-auto text-[9px] font-mono text-[#6B6B75]">
                            {timeAgo(a.ts)}
                          </span>
                        </div>
                        <div className="text-[10px] text-[#C0C0C8] leading-tight">{a.message}</div>
                        <div className="flex items-center gap-2 mt-1.5">
                          <div className="flex-1 h-1 bg-[#1A1A1E] rounded-full overflow-hidden">
                            <div
                              className="h-full"
                              style={{ width: `${a.severity}%`, background: color }}
                            />
                          </div>
                          <span className="text-[9px] font-mono" style={{ color }}>
                            {a.severity}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        </div>
      ) : null}
    </div>
  );
}
