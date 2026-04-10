"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { PageHeader, Card, LiveBadge } from "@/components/ui/card";
import { RefreshTimer } from "@/components/ui/refresh-timer";

const API = "http://localhost:3850";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Cell {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  range_pct: number;
  range_vs_avg: number;
}

interface AssetRow {
  sym: string;
  name: string;
  cls: string;
  baseline_pct: number;
  cells: Cell[];
}

interface DateStat {
  assets: number;
  avg_vs_baseline: number;
  pct_expansion: number;
  pct_compression: number;
  max_vs_baseline: number;
}

interface MatrixResponse {
  ok: boolean;
  generated_at: string;
  days: number;
  baseline_window: number;
  dates: string[];
  class_order: string[];
  assets: AssetRow[];
  per_date_stats: Record<string, DateStat>;
  asset_count: number;
}

// ---------------------------------------------------------------------------
// Heat colors — Bloomberg style
// ---------------------------------------------------------------------------
function heatColor(rangeVsAvg: number): string {
  // 100% = normal. >200 = explosive, <50 = very compressed.
  if (rangeVsAvg >= 500) return "#00FF00";
  if (rangeVsAvg >= 300) return "#00DD00";
  if (rangeVsAvg >= 200) return "#44CC44";
  if (rangeVsAvg >= 150) return "#88DD88";
  if (rangeVsAvg >= 120) return "#AAEEAA";
  if (rangeVsAvg >= 100) return "#CCFFCC";
  if (rangeVsAvg >= 80) return "#FFFFEE";
  if (rangeVsAvg >= 60) return "#FFEECC";
  if (rangeVsAvg >= 40) return "#FFDD99";
  if (rangeVsAvg >= 20) return "#FFCC66";
  return "#FFBB44";
}

function heatText(rangeVsAvg: number): string {
  return rangeVsAvg >= 100 ? "#003300" : "#6B3300";
}

const CLASS_COLORS: Record<string, string> = {
  FX: "#42A5F5",
  TREASURIES: "#9C27B0",
  "INDICES US": "#FF6B00",
  "INDICES ASIE": "#FF8A65",
  METAUX: "#FFD600",
  ENERGIE: "#EF4444",
  GRAINS: "#8BC34A",
  CRYPTO: "#F7931A",
};

function fmtDate(d: string): string {
  const dt = new Date(d + "T00:00:00");
  const day = dt.getDate();
  const months = ["Jan", "Fev", "Mar", "Avr", "Mai", "Jun", "Jul", "Aou", "Sep", "Oct", "Nov", "Dec"];
  return `${day} ${months[dt.getMonth()]}`;
}

export default function RangeDashboardPage() {
  const [data, setData] = useState<MatrixResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);
  const [baseline, setBaseline] = useState(20);

  const load = useCallback(async () => {
    try {
      setError(null);
      const r = await fetch(`${API}/api/sierra/range-matrix?days=${days}&baseline_window=${baseline}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const json: MatrixResponse = await r.json();
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown");
    } finally {
      setLoading(false);
    }
  }, [days, baseline]);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  // Group assets by class, preserving class_order
  const groups = useMemo(() => {
    if (!data) return [] as { cls: string; assets: AssetRow[] }[];
    const byClass: Record<string, AssetRow[]> = {};
    data.assets.forEach((a) => {
      byClass[a.cls] = byClass[a.cls] || [];
      byClass[a.cls]!.push(a);
    });
    return data.class_order
      .filter((c) => byClass[c])
      .map((c) => ({ cls: c, assets: byClass[c]! }));
  }, [data]);

  const dates = data?.dates || [];
  const stats = data?.per_date_stats || {};

  return (
    <div className="p-4">
      <PageHeader
        timer={<RefreshTimer intervalSeconds={30} />}
        title="Range Dashboard"
        subtitle="Matrice % range journalier vs baseline mobile — FX, Treasuries, Indices, Metaux, Energie, Grains, Crypto"
      >
        <select
          value={days}
          onChange={(e) => setDays(parseInt(e.target.value))}
          className="bg-[#111114] border border-[#1E1E22] rounded-lg px-3 py-1.5 text-xs text-white"
        >
          <option value={10}>10 jours</option>
          <option value={20}>20 jours</option>
          <option value={30}>30 jours</option>
          <option value={60}>60 jours</option>
        </select>
        <select
          value={baseline}
          onChange={(e) => setBaseline(parseInt(e.target.value))}
          className="bg-[#111114] border border-[#1E1E22] rounded-lg px-3 py-1.5 text-xs text-white"
          title="Fenetre de baseline"
        >
          <option value={10}>Base 10j</option>
          <option value={20}>Base 20j</option>
          <option value={50}>Base 50j</option>
        </select>
        <button
          onClick={load}
          className="px-3 py-1.5 bg-[#111114] border border-[#1E1E22] rounded-lg text-xs hover:border-[#FF6B00] transition-colors"
        >
          Rafraichir
        </button>
        <LiveBadge />
      </PageHeader>

      {loading && !data ? (
        <Card className="p-12 text-center text-[#6B6B75]">Chargement des ranges Sierra...</Card>
      ) : error ? (
        <Card className="p-12 text-center text-[#6B6B75]">
          <span className="text-[#FF6B00] font-semibold">Reconnexion automatique en cours...</span>
          <div className="text-xs mt-2">{error}</div>
        </Card>
      ) : data ? (
        <>
          {/* Header KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-3">
            <Card className="p-3">
              <div className="text-[9px] text-[#6B6B75] uppercase tracking-wider">Assets</div>
              <div className="text-lg font-extrabold font-mono text-[#F0F0F0]">{data.asset_count}</div>
            </Card>
            <Card className="p-3">
              <div className="text-[9px] text-[#6B6B75] uppercase tracking-wider">Baseline</div>
              <div className="text-lg font-extrabold font-mono text-[#F0F0F0]">{data.baseline_window}j</div>
            </Card>
            <Card className="p-3">
              <div className="text-[9px] text-[#6B6B75] uppercase tracking-wider">Dates couvertes</div>
              <div className="text-lg font-extrabold font-mono text-[#F0F0F0]">{dates.length}</div>
            </Card>
            {dates.length > 0 && stats[dates[dates.length - 1]!] && (
              <>
                <Card className="p-3">
                  <div className="text-[9px] text-[#6B6B75] uppercase tracking-wider">Expansion jour</div>
                  <div className="text-lg font-extrabold font-mono text-[#22C55E]">
                    {stats[dates[dates.length - 1]!]!.pct_expansion}%
                  </div>
                  <div className="text-[9px] text-[#6B6B75]">des assets {">="} 150%</div>
                </Card>
                <Card className="p-3">
                  <div className="text-[9px] text-[#6B6B75] uppercase tracking-wider">Compression jour</div>
                  <div className="text-lg font-extrabold font-mono text-[#FFA726]">
                    {stats[dates[dates.length - 1]!]!.pct_compression}%
                  </div>
                  <div className="text-[9px] text-[#6B6B75]">des assets {"<"} 80%</div>
                </Card>
              </>
            )}
          </div>

          {/* Matrix */}
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="border-collapse" style={{ minWidth: dates.length * 64 + 220 }}>
                <thead>
                  <tr>
                    <th className="sticky left-0 z-30 bg-[#0A0A0E] p-2 text-left text-[10px] text-[#6B6B75] font-bold border-b border-r border-[#1E1E22] min-w-[180px]">
                      Actif
                    </th>
                    {dates.map((d) => (
                      <th
                        key={d}
                        className="p-1 text-center text-[9px] text-[#6B6B75] font-bold border-b border-[#1E1E22] min-w-[60px]"
                      >
                        {fmtDate(d)}
                      </th>
                    ))}
                  </tr>
                </thead>
                {groups.map(({ cls, assets }) => (
                  <tbody key={cls}>
                    {/* Class header */}
                    <tr>
                      <td
                        colSpan={dates.length + 1}
                        className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[2px] border-b border-[#1E1E22]"
                        style={{
                          color: CLASS_COLORS[cls] || "#6B6B75",
                          backgroundColor: `${CLASS_COLORS[cls] || "#6B6B75"}15`,
                        }}
                      >
                        {cls}
                      </td>
                    </tr>
                    {assets.map((a) => {
                      const cellMap: Record<string, Cell> = {};
                      a.cells.forEach((c) => {
                        cellMap[c.date] = c;
                      });
                      return (
                        <tr key={a.sym} className="hover:bg-[#FFFFFF06] transition-colors">
                          <td className="sticky left-0 z-10 bg-[#0D0D10] p-1.5 border-b border-r border-[#1E1E22]">
                            <div className="flex items-baseline justify-between gap-2">
                              <span
                                className="font-mono font-bold text-[11px]"
                                style={{ color: CLASS_COLORS[a.cls] || "#FF6B00" }}
                              >
                                {a.name}
                              </span>
                              <span className="text-[9px] text-[#6B6B75] font-mono">
                                {a.baseline_pct.toFixed(2)}%
                              </span>
                            </div>
                          </td>
                          {dates.map((d) => {
                            const c = cellMap[d];
                            if (!c)
                              return (
                                <td key={d} className="p-0.5 border-b border-[#1E1E22]">
                                  <div className="text-center text-[9px] text-[#333]">—</div>
                                </td>
                              );
                            const val = c.range_vs_avg;
                            return (
                              <td key={d} className="p-0.5 border-b border-[#0E0E12]">
                                <div
                                  className="text-center font-mono text-[10px] font-semibold rounded-sm px-0.5 py-1"
                                  style={{
                                    backgroundColor: heatColor(val),
                                    color: heatText(val),
                                  }}
                                  title={`${a.name} ${d}\nRange: ${c.range_pct.toFixed(2)}% (vs baseline ${a.baseline_pct.toFixed(2)}%)\nRatio: ${val.toFixed(1)}%\nOHLC: ${c.open} / ${c.high} / ${c.low} / ${c.close}`}
                                >
                                  {val.toFixed(0)}%
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                ))}
              </table>
            </div>
          </Card>

          {/* Legend */}
          <div className="flex items-center gap-3 mt-3 text-[10px] text-[#6B6B75] flex-wrap">
            <span className="font-bold">Legende (vs baseline {baseline}j) :</span>
            {[
              { val: 300, label: "300%+" },
              { val: 200, label: "200%" },
              { val: 150, label: "150%" },
              { val: 100, label: "100%" },
              { val: 80, label: "80%" },
              { val: 50, label: "50%" },
              { val: 20, label: "20%" },
            ].map(({ val, label }) => (
              <div key={val} className="flex items-center gap-1">
                <div className="w-5 h-4 rounded-sm" style={{ backgroundColor: heatColor(val) }} />
                <span>{label}</span>
              </div>
            ))}
            <span className="ml-3">
              100% = journee normale. {">"}150% = expansion. {"<"}80% = compression.
            </span>
          </div>
        </>
      ) : null}
    </div>
  );
}
