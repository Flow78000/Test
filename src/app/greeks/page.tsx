"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader, LiveBadge, Card, KpiCard, Badge } from "@/components/ui/card";
import { RefreshTimer } from "@/components/ui/refresh-timer";
import { DataFreshness } from "@/components/ui/data-freshness";
import { fmtNum, fmtPct } from "@/lib/format";
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area, ComposedChart,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  ReferenceLine, Legend,
} from "recharts";

const API = "http://localhost:3850";
const TICKERS = ["SPX", "SPY", "QQQ"];

// Couleurs par jour de semaine (lundi=1 ... vendredi=5)
const DAY_COLORS: Record<number, string> = {
  0: "#6B6B75",  // Dimanche (rare)
  1: "#42A5F5",  // Lundi — bleu
  2: "#AB47BC",  // Mardi — violet
  3: "#FF6B00",  // Mercredi — orange
  4: "#22C55E",  // Jeudi — vert
  5: "#EF4444",  // Vendredi — rouge
  6: "#FFA726",  // Samedi (rare)
};
const DAY_NAMES = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

// Parse date string "2026-4-9" to day of week
function getDayOfWeek(dateStr: string): number {
  if (!dateStr) return -1;
  const parts = dateStr.split("-");
  if (parts.length < 3) return -1;
  const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  return d.getDay();
}

// Add day color + detect day boundaries in time_series
function enrichTimeSeries(data: any[]) {
  if (!data?.length) return { enriched: [], dayBoundaries: [] };
  const enriched = data.map((d: any) => {
    const day = getDayOfWeek(d.date);
    return { ...d, _day: day, _dayColor: DAY_COLORS[day] || "#6B6B75" };
  });
  // Find indices where day changes
  const dayBoundaries: { index: number; time: string; dayName: string }[] = [];
  for (let i = 1; i < enriched.length; i++) {
    if (enriched[i]._day !== enriched[i - 1]._day && enriched[i]._day >= 0) {
      dayBoundaries.push({
        index: i,
        time: enriched[i].time,
        dayName: DAY_NAMES[enriched[i]._day] || "?",
      });
    }
  }
  return { enriched, dayBoundaries };
}

function darkTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1A1A1E] border border-[#2A2A2E] rounded px-3 py-2 text-xs shadow-xl z-50">
      <div className="text-[#6B6B75] mb-1">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {typeof p.value === "number" ? p.value.toFixed(2) : p.value}
        </div>
      ))}
    </div>
  );
}

// --- Tab: Total GEX Live ---
function TotalGexTab() {
  const [gexData, setGexData] = useState<any>(null);
  const [sierraLive, setSierraLive] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [analysis, live] = await Promise.all([
        fetch(`${API}/api/sierra/gex-analysis?bars=8000`).then(r => r.json()),
        fetch(`${API}/api/sierra/signals?symbol=SP500GEX`).then(r => r.json()),
      ]);
      setGexData(analysis);
      setSierraLive(live);
    } catch { }
    setLoading(false);
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 10000); return () => clearInterval(t); }, [load]);

  if (loading && !gexData) return <div className="text-center py-20 text-[#6B6B75]">Chargement Total GEX...</div>;
  if (!gexData || gexData.error) return <Card className="p-8 text-center text-red-400">{gexData?.error || "Erreur"}</Card>;

  const { current, distribution, level_stats, time_series } = gexData;
  const gex = current?.total_gex;
  const delta = current?.total_delta;
  const gts = current?.gts;

  // Color code GEX
  const gexColor = gex > 20 ? "#22C55E" : gex > 0 ? "#4CAF50" : gex > -20 ? "#FFA726" : "#EF4444";
  const gexLabel = gex > 30 ? "TRES POSITIF" : gex > 10 ? "POSITIF" : gex > -10 ? "NEUTRE" : gex > -30 ? "NEGATIF" : "TRES NEGATIF";

  // Sierra live GEX levels
  const liveGex = sierraLive?.gex || {};

  // Level crossing stats sorted
  const levelOrder = ["-40", "-30", "-20", "-10", "0", "10", "20", "30", "40"];
  const crossingRows = levelOrder.map(lvl => ({
    level: lvl,
    ...(level_stats?.[lvl] || {}),
  }));

  return (
    <div className="space-y-4">
      {/* Data Freshness */}
      <DataFreshness
        fileModified={gexData.file_modified || sierraLive?.file_modified}
        dataAgeSeconds={gexData.data_age_seconds ?? sierraLive?.data_age_seconds}
        isStale={gexData.is_stale || sierraLive?.is_stale}
      />

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <KpiCard label="Total GEX" value={fmtNum(gex, 2)} color={gexColor} sublabel={gexLabel} />
        <KpiCard label="Total Delta" value={fmtNum(delta, 2)} color="#AB47BC" />
        <KpiCard label="Call GEX" value={fmtNum(current?.call_gex, 2)} color="#22C55E" />
        <KpiCard label="Put GEX" value={fmtNum(current?.put_gex, 2)} color="#EF4444" />
        <KpiCard label="GTS" value={fmtNum(gts, 2)} color="#42A5F5" sublabel="Gamma Trend" />
        <KpiCard label="% Positif" value={`${distribution?.pct_positive ?? "--"}%`} color="#6B6B75" sublabel={`sur ${gexData.bars_analyzed} bars`} />
        <KpiCard label="Range" value={`${fmtNum(distribution?.min, 1)} / ${fmtNum(distribution?.max, 1)}`} color="#6B6B75" sublabel={`Moy: ${fmtNum(distribution?.mean, 1)}`} />
      </div>

      {/* FLO.Q Levels Live */}
      {Object.keys(liveGex).length > 0 && (
        <Card className="p-4">
          <div className="text-xs text-[#6B6B75] uppercase tracking-wider mb-3">Niveaux FLO.Q Live</div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {[
              { key: "Call Resistance", label: "Call Resist.", color: "#EF4444" },
              { key: "Put Support", label: "Put Support", color: "#22C55E" },
              { key: "HVL", label: "HVL", color: "#FFA726" },
              { key: "Gamma Wall 0DTE", label: "Gamma Wall 0DTE", color: "#AB47BC" },
              { key: "GEX 1", label: "GEX 1", color: "#42A5F5" },
              { key: "GEX 2", label: "GEX 2", color: "#42A5F5" },
              { key: "1D Min", label: "1D Min", color: "#6B6B75" },
              { key: "1D Max", label: "1D Max", color: "#6B6B75" },
              { key: "Call Delta", label: "Call Delta", color: "#22C55E" },
              { key: "Put Delta", label: "Put Delta", color: "#EF4444" },
              { key: "Volatility Trend", label: "Vol Trend", color: "#FFA726" },
              { key: "Call Resistance 0DTE & Gamma Wall 0DTE", label: "CR 0DTE", color: "#EF4444" },
            ].map(({ key, label, color }) => {
              const val = liveGex[key];
              if (val == null) return null;
              return (
                <div key={key} className="bg-[#0D0D10] rounded-lg p-2 text-center">
                  <div className="text-[10px] text-[#6B6B75] uppercase">{label}</div>
                  <div className="text-sm font-bold font-mono" style={{ color }}>{fmtNum(val, 1)}</div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Total GEX Time Series — colored by day */}
      {(() => {
        // Filter out rows where all GEX values are null/0
        const validSeries = (time_series || []).filter((d: any) =>
          d.total_gex != null || d.total_delta != null || d.gts != null
        );
        const { enriched, dayBoundaries } = enrichTimeSeries(validSeries);
        const days = Array.from(new Set(enriched.map((d: any) => d._day).filter((d: number) => d >= 0)));

        // Chart with colored bars per day + vertical day separators
        const DayColorChart = ({ dataKey, title, height = 280 }: { dataKey: string; title: string; height?: number }) => (
          <Card className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="text-xs text-[#6B6B75] uppercase tracking-wider">{title}</div>
              <div className="flex gap-2 ml-auto">
                {days.map(d => (
                  <div key={d} className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: DAY_COLORS[d] }} />
                    <span className="text-[10px] text-[#6B6B75]">{DAY_NAMES[d]}</span>
                  </div>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={height}>
              <ComposedChart data={enriched}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E1E22" />
                <XAxis dataKey="time" tick={{ fill: "#6B6B75", fontSize: 9 }} interval="preserveStartEnd" />
                <YAxis tick={{ fill: "#6B6B75", fontSize: 10 }} />
                <Tooltip content={darkTooltip} />
                <ReferenceLine y={0} stroke="#6B6B75" strokeDasharray="4 4" />
                {dataKey === "total_gex" && (
                  <>
                    <ReferenceLine y={20} stroke="#22C55E33" strokeDasharray="2 2" />
                    <ReferenceLine y={-20} stroke="#EF444433" strokeDasharray="2 2" />
                    <ReferenceLine y={40} stroke="#22C55E55" strokeDasharray="2 2" />
                    <ReferenceLine y={-40} stroke="#EF444455" strokeDasharray="2 2" />
                  </>
                )}
                {/* Vertical lines for day boundaries */}
                {dayBoundaries.map((b, i) => (
                  <ReferenceLine key={`day-${i}`} x={b.time} stroke="#3A3A3E" strokeWidth={1} strokeDasharray="2 4" label={{ value: b.dayName, position: "top", fill: "#6B6B75", fontSize: 9 }} />
                ))}
                {/* One line per day with its color */}
                {days.map(d => (
                  <Line
                    key={d}
                    dataKey={(row: any) => row._day === d ? row[dataKey] : null}
                    stroke={DAY_COLORS[d]}
                    strokeWidth={1.5}
                    dot={false}
                    connectNulls={false}
                    name={DAY_NAMES[d]}
                    isAnimationActive={false}
                  />
                ))}
              </ComposedChart>
            </ResponsiveContainer>
          </Card>
        );

        return (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <DayColorChart dataKey="total_gex" title="Total GEX — Evolution" />
              <DayColorChart dataKey="total_delta" title="Total Delta — Evolution" />
            </div>
            <DayColorChart dataKey="gts" title="GTS (Gamma Trend Score) — Evolution" height={250} />
          </>
        );
      })()}

      {/* Crossing Analysis Table */}
      <Card className="p-4">
        <div className="text-xs text-[#6B6B75] uppercase tracking-wider mb-3">
          Analyse des Crossings — Impact Prix ({gexData.bars_analyzed} barres, horizon 20 barres)
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[#6B6B75] border-b border-[#1E1E22]">
                <th className="text-left py-2 px-2">Niveau</th>
                <th className="text-center py-2 px-2">Cross Up</th>
                <th className="text-center py-2 px-2">Cross Down</th>
                <th className="text-center py-2 px-2">Total</th>
                <th className="text-center py-2 px-2 text-green-400">Up: Avg Move</th>
                <th className="text-center py-2 px-2 text-green-400">Up: Max Up</th>
                <th className="text-center py-2 px-2 text-green-400">Up: Max Down</th>
                <th className="text-center py-2 px-2 text-red-400">Down: Avg Move</th>
                <th className="text-center py-2 px-2 text-red-400">Down: Max Up</th>
                <th className="text-center py-2 px-2 text-red-400">Down: Max Down</th>
              </tr>
            </thead>
            <tbody>
              {crossingRows.map(row => {
                const lvl = parseInt(row.level);
                const bg = lvl === 0 ? "bg-[#FF6B0010]" : "";
                return (
                  <tr key={row.level} className={`border-b border-[#1E1E22] hover:bg-[#16161A] ${bg}`}>
                    <td className="py-2 px-2 font-mono font-bold" style={{ color: lvl >= 0 ? "#22C55E" : "#EF4444" }}>
                      {lvl > 0 ? "+" : ""}{row.level}
                    </td>
                    <td className="text-center py-2 px-2 text-green-400">{row.crossings_up ?? 0}</td>
                    <td className="text-center py-2 px-2 text-red-400">{row.crossings_down ?? 0}</td>
                    <td className="text-center py-2 px-2 font-bold">{row.total_crossings ?? 0}</td>
                    <td className="text-center py-2 px-2" style={{ color: (row.up_avg_price_change ?? 0) >= 0 ? "#22C55E" : "#EF4444" }}>
                      {fmtPct(row.up_avg_price_change, 3)}
                    </td>
                    <td className="text-center py-2 px-2 text-green-400">{fmtPct(row.up_avg_max_up, 3)}</td>
                    <td className="text-center py-2 px-2 text-red-400">{fmtPct(row.up_avg_max_down, 3)}</td>
                    <td className="text-center py-2 px-2" style={{ color: (row.down_avg_price_change ?? 0) >= 0 ? "#22C55E" : "#EF4444" }}>
                      {fmtPct(row.down_avg_price_change, 3)}
                    </td>
                    <td className="text-center py-2 px-2 text-green-400">{fmtPct(row.down_avg_max_up, 3)}</td>
                    <td className="text-center py-2 px-2 text-red-400">{fmtPct(row.down_avg_max_down, 3)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-3 text-[10px] text-[#6B6B75]">
          Cross Up = GEX passe au-dessus du niveau | Cross Down = GEX passe en-dessous | Avg Move = variation prix moyenne apres crossing
        </div>
      </Card>

      {/* Call/Put GEX Decomposition */}
      <Card className="p-4">
        <div className="text-xs text-[#6B6B75] uppercase tracking-wider mb-3">Decomposition Call GEX vs Put GEX</div>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={time_series.filter((_: any, i: number) => i % 3 === 0)}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E1E22" />
            <XAxis dataKey="time" tick={{ fill: "#6B6B75", fontSize: 9 }} interval="preserveStartEnd" />
            <YAxis tick={{ fill: "#6B6B75", fontSize: 10 }} />
            <Tooltip content={darkTooltip} />
            <ReferenceLine y={0} stroke="#6B6B75" strokeDasharray="4 4" />
            <Bar dataKey="call_gex" fill="#22C55E80" name="Call GEX" />
            <Bar dataKey="put_gex" fill="#EF444480" name="Put GEX" />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}

// --- Tab: Greeks by Strike (existing UW data) ---
function GreeksByStrikeTab() {
  const [ticker, setTicker] = useState("SPX");
  const [greekData, setGreekData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const gRes = await fetch(`${API}/api/uw/greek-exposure/strike?ticker=${ticker}`).then(r => r.json());
      const rows = Array.isArray(gRes) ? gRes : gRes?.data ?? [];
      if (rows.length) {
        const strikes = rows.map((r: any) => r.strike).filter(Boolean).sort((a: number, b: number) => a - b);
        const mid = strikes[Math.floor(strikes.length / 2)];
        const lo = mid * 0.95, hi = mid * 1.05;
        setGreekData(rows.filter((r: any) => r.strike >= lo && r.strike <= hi));
      } else {
        setGreekData(rows);
      }
    } catch (e: any) {
      setError("Erreur: " + (e.message || "serveur indisponible"));
    }
    setLoading(false);
  }, [ticker]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="text-center py-20 text-[#6B6B75]">Chargement Greeks...</div>;
  if (error) return <Card className="p-8 text-center text-red-400">{error}</Card>;

  const vannaNet = greekData.map((d: any) => ({ strike: d.strike, vanna_net: (d.call_vanna ?? 0) + (d.put_vanna ?? 0) }));
  const charmNet = greekData.map((d: any) => ({ strike: d.strike, charm_net: (d.call_charm ?? 0) + (d.put_charm ?? 0) }));

  const charts: { title: string; content: React.ReactNode }[] = [
    {
      title: "GEX par Strike",
      content: (
        <ResponsiveContainer width="100%" height={210}>
          <BarChart data={greekData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E1E22" />
            <XAxis dataKey="strike" tick={{ fill: "#6B6B75", fontSize: 10 }} />
            <YAxis tick={{ fill: "#6B6B75", fontSize: 10 }} />
            <Tooltip content={darkTooltip} />
            <Bar dataKey="call_gex" fill="#FF6B00" name="Call GEX" />
            <Bar dataKey="put_gex" fill="#E040FB" name="Put GEX" />
          </BarChart>
        </ResponsiveContainer>
      ),
    },
    {
      title: "Vanna Nette",
      content: (
        <ResponsiveContainer width="100%" height={210}>
          <LineChart data={vannaNet}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E1E22" />
            <XAxis dataKey="strike" tick={{ fill: "#6B6B75", fontSize: 10 }} />
            <YAxis tick={{ fill: "#6B6B75", fontSize: 10 }} />
            <Tooltip content={darkTooltip} />
            <Line dataKey="vanna_net" stroke="#AB47BC" dot={false} strokeWidth={2} name="Vanna Net" />
          </LineChart>
        </ResponsiveContainer>
      ),
    },
    {
      title: "Charm Net",
      content: (
        <ResponsiveContainer width="100%" height={210}>
          <LineChart data={charmNet}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E1E22" />
            <XAxis dataKey="strike" tick={{ fill: "#6B6B75", fontSize: 10 }} />
            <YAxis tick={{ fill: "#6B6B75", fontSize: 10 }} />
            <Tooltip content={darkTooltip} />
            <Line dataKey="charm_net" stroke="#AB47BC" dot={false} strokeWidth={2} name="Charm Net" />
          </LineChart>
        </ResponsiveContainer>
      ),
    },
    {
      title: "Vanna Call / Put",
      content: (
        <ResponsiveContainer width="100%" height={210}>
          <LineChart data={greekData.map((d: any) => ({ strike: d.strike, call_vanna: d.call_vanna ?? 0, put_vanna: d.put_vanna ?? 0 }))}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E1E22" />
            <XAxis dataKey="strike" tick={{ fill: "#6B6B75", fontSize: 10 }} />
            <YAxis tick={{ fill: "#6B6B75", fontSize: 10 }} />
            <Tooltip content={darkTooltip} />
            <Line dataKey="call_vanna" stroke="#4CAF50" dot={false} strokeWidth={2} name="Call Vanna" />
            <Line dataKey="put_vanna" stroke="#F48FB1" dot={false} strokeWidth={2} name="Put Vanna" />
          </LineChart>
        </ResponsiveContainer>
      ),
    },
    {
      title: "Charm Call / Put",
      content: (
        <ResponsiveContainer width="100%" height={210}>
          <LineChart data={greekData.map((d: any) => ({ strike: d.strike, call_charm: d.call_charm ?? 0, put_charm: d.put_charm ?? 0 }))}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E1E22" />
            <XAxis dataKey="strike" tick={{ fill: "#6B6B75", fontSize: 10 }} />
            <YAxis tick={{ fill: "#6B6B75", fontSize: 10 }} />
            <Tooltip content={darkTooltip} />
            <Line dataKey="call_charm" stroke="#4CAF50" dot={false} strokeWidth={2} name="Call Charm" />
            <Line dataKey="put_charm" stroke="#F48FB1" dot={false} strokeWidth={2} name="Put Charm" />
          </LineChart>
        </ResponsiveContainer>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <select
          value={ticker}
          onChange={e => setTicker(e.target.value)}
          className="bg-[#111114] border border-[#1E1E22] rounded-lg px-3 py-1.5 text-xs text-white"
        >
          {TICKERS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <button onClick={load} className="px-3 py-1.5 bg-[#111114] border border-[#1E1E22] rounded-lg text-xs hover:border-[#FF6B00] transition-colors">
          Rafraichir
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {charts.map(c => (
          <Card key={c.title} className="p-4" style={{ minHeight: 250 }}>
            <div className="text-xs text-[#6B6B75] uppercase tracking-wider mb-3">{c.title}</div>
            {c.content}
          </Card>
        ))}
      </div>
    </div>
  );
}

// --- Main Page ---
export default function GreeksPage() {
  const [tab, setTab] = useState<"total-gex" | "by-strike">("total-gex");

  const tabs = [
    { id: "total-gex" as const, label: "Total GEX Live", icon: "G" },
    { id: "by-strike" as const, label: "Greeks par Strike", icon: "S" },
  ];

  return (
    <div className="p-6">
      <PageHeader timer={<RefreshTimer intervalSeconds={10} />} title="GEX Intelligence" subtitle="Gamma Exposure — Analyse temps reel et crossings historiques">
        <LiveBadge />
      </PageHeader>

      {/* Tab Selector */}
      <div className="flex gap-1 mb-6 bg-[#0D0D10] rounded-lg p-1 w-fit">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-md text-xs font-semibold transition-all ${
              tab === t.id
                ? "bg-[#FF6B00] text-black"
                : "text-[#6B6B75] hover:text-white hover:bg-[#16161A]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "total-gex" ? <TotalGexTab /> : <GreeksByStrikeTab />}
    </div>
  );
}
