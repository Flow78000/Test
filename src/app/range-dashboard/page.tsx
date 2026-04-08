"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { PageHeader, Card, LiveBadge } from "@/components/ui/card";
import { DataFreshness } from "@/components/ui/data-freshness";

const API = "http://localhost:3850";

// Bloomberg-style heatmap colors based on range %
function heatColor(val: number): string {
  if (val >= 300) return "#00CC00";
  if (val >= 200) return "#33DD33";
  if (val >= 150) return "#66EE66";
  if (val >= 120) return "#88FF88";
  if (val >= 100) return "#AAFFAA";
  if (val >= 80) return "#CCFFCC";
  if (val >= 60) return "#EEFFEE";
  if (val >= 40) return "#FFFFCC";
  if (val >= 20) return "#FFFF99";
  if (val >= 0) return "#FFFF66";
  return "#FFCCCC";
}

function heatText(val: number): string {
  return val >= 100 ? "#003300" : val >= 40 ? "#333300" : "#330000";
}

// Range % color for the RV daily column
function rvColor(rv: number): string {
  if (rv >= 2) return "#FF4444";
  if (rv >= 1) return "#FFA726";
  if (rv >= 0.5) return "#FFD600";
  return "#22C55E";
}

const CLASS_COLORS: Record<string, string> = {
  "Indices US": "#FF6B00",
  "EUREX": "#42A5F5",
  "Volatilite": "#EF4444",
  "Inverse": "#AB47BC",
  "Breadth": "#FFD600",
  "GEX": "#22C55E",
};

interface DailyRange {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  range_pts: number;
  range_pct: number;
  rv_daily: number | null;
  change_pct: number | null;
}

interface AssetRange {
  name: string;
  asset_class: string;
  days: DailyRange[];
  latest: DailyRange | null;
}

export default function RangeDashboardPage() {
  const [assets, setAssets] = useState<Record<string, AssetRange>>({});
  const [loading, setLoading] = useState(true);
  const [freshness, setFreshness] = useState<any>(null);
  const [days, setDays] = useState(20);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/sierra/daily-ranges?days=${days}`).then(r => r.json());
      if (res?.assets) {
        setAssets(res.assets);
        const firstKey = Object.keys(res.assets)[0];
        if (firstKey) {
          const sigRes = await fetch(`${API}/api/sierra/signals?symbol=${firstKey}`).then(r => r.json()).catch(() => null);
          if (sigRes) setFreshness({ file_modified: sigRes.file_modified, data_age_seconds: sigRes.data_age_seconds, is_stale: sigRes.is_stale });
        }
      }
    } catch { }
    setLoading(false);
  }, [days]);

  useEffect(() => {
    load();
    const t = setInterval(load, 30 * 60 * 1000);
    return () => clearInterval(t);
  }, [load]);

  // Collect all unique dates across all assets
  const allDates = useMemo(() => {
    const dateSet = new Set<string>();
    Object.values(assets).forEach(a => a.days.forEach(d => dateSet.add(d.date)));
    return Array.from(dateSet).sort();
  }, [assets]);

  // Build asset rows grouped by class
  const groups = useMemo(() => {
    const g: Record<string, { sym: string; data: AssetRange }[]> = {};
    Object.entries(assets).forEach(([sym, data]) => {
      const cls = data.asset_class || "Autre";
      if (!g[cls]) g[cls] = [];
      g[cls]!.push({ sym, data });
    });
    return g;
  }, [assets]);

  // Format date for column header: "27 Mar" style
  function fmtDateCol(dateStr: string): string {
    try {
      const d = new Date(dateStr + "T00:00:00");
      const day = d.getDate();
      const months = ["Jan", "Fev", "Mar", "Avr", "Mai", "Jun", "Jul", "Aou", "Sep", "Oct", "Nov", "Dec"];
      return `${day} ${months[d.getMonth()]}`;
    } catch {
      return dateStr.slice(5);
    }
  }

  // Short symbol name
  function shortSym(sym: string): string {
    return sym.replace(".CME", "").replace(".CBOT", "").replace("-NQTV", "").replace("_NASDAQ_NYSEMKT", "").replace("SP500GEX-", "GEX:");
  }

  if (loading) return (
    <div className="p-4">
      <PageHeader title="Range Dashboard" subtitle="Heatmap des ranges journaliers" />
      <div className="text-center py-20 text-[#6B6B75]">Chargement des ranges Sierra...</div>
    </div>
  );

  return (
    <div className="p-4">
      <PageHeader title="Range Dashboard" subtitle="Heatmap Bloomberg — % range realise par jour et par actif">
        <select value={days} onChange={e => setDays(parseInt(e.target.value))}
          className="bg-[#111114] border border-[#1E1E22] rounded-lg px-3 py-1.5 text-xs text-white">
          <option value={10}>10 jours</option>
          <option value={20}>20 jours</option>
          <option value={30}>30 jours</option>
          <option value={60}>60 jours</option>
        </select>
        <button onClick={load} className="px-3 py-1.5 bg-[#111114] border border-[#1E1E22] rounded-lg text-xs hover:border-[#FF6B00] transition-colors">
          Rafraichir
        </button>
        <LiveBadge />
      </PageHeader>

      {freshness && <div className="mb-3"><DataFreshness {...freshness} /></div>}

      {/* Heatmap Matrix */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="border-collapse" style={{ minWidth: allDates.length * 70 + 200 }}>
            <thead>
              <tr>
                <th className="sticky left-0 z-30 bg-[#0A0A0E] p-2 text-left text-[10px] text-[#6B6B75] font-semibold border-b border-r border-[#1E1E22] min-w-[140px]">
                  Actif
                </th>
                {allDates.map(date => (
                  <th key={date} className="p-1 text-center text-[9px] text-[#6B6B75] font-semibold border-b border-[#1E1E22] min-w-[65px]">
                    {fmtDateCol(date)}
                  </th>
                ))}
              </tr>
            </thead>
              {Object.entries(groups).map(([cls, items]) => (
                <tbody key={cls}>
                  {/* Class header */}
                  <tr>
                    <td colSpan={allDates.length + 1}
                      className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[2px] border-b border-[#1E1E22]"
                      style={{ color: CLASS_COLORS[cls] || "#6B6B75", backgroundColor: `${CLASS_COLORS[cls] || "#6B6B75"}15` }}>
                      {cls}
                    </td>
                  </tr>
                  {/* Asset rows */}
                  {items.map(({ sym, data: a }) => {
                    // Build a date -> range map for this asset
                    const dateMap: Record<string, DailyRange> = {};
                    a.days.forEach(d => { dateMap[d.date] = d; });

                    return (
                      <tr key={sym} className="hover:bg-[#FFFFFF06] transition-colors">
                        <td className="sticky left-0 z-10 bg-[#0D0D10] p-1.5 border-b border-r border-[#1E1E22]">
                          <span className="font-mono font-bold text-[11px]" style={{ color: CLASS_COLORS[a.asset_class] || "#FF6B00" }}>
                            {shortSym(sym)}
                          </span>
                        </td>
                        {allDates.map(date => {
                          const d = dateMap[date];
                          if (!d) return (
                            <td key={date} className="p-0.5 border-b border-[#1E1E22]">
                              <div className="text-center text-[9px] text-[#333]">—</div>
                            </td>
                          );
                          // Use range_pct as the heatmap value (multiply by a factor for visual contrast)
                          const val = d.range_pct;
                          const scaledVal = val * 100; // Scale for color mapping (0.5% → 50, 1% → 100, 2% → 200)
                          return (
                            <td key={date} className="p-0.5 border-b border-[#0E0E12]">
                              <div
                                className="text-center font-mono text-[10px] font-semibold rounded-sm px-0.5 py-1"
                                style={{ backgroundColor: heatColor(scaledVal), color: heatText(scaledVal) }}
                                title={`${sym} ${date}\nRange: ${val.toFixed(2)}% (${d.range_pts.toFixed(2)} pts)\nO:${d.open.toFixed(2)} H:${d.high.toFixed(2)} L:${d.low.toFixed(2)} C:${d.close.toFixed(2)}${d.rv_daily != null ? `\nRV 1D: ${d.rv_daily.toFixed(3)}%` : ""}${d.change_pct != null ? `\nVar: ${d.change_pct >= 0 ? "+" : ""}${d.change_pct.toFixed(2)}%` : ""}`}
                              >
                                {val.toFixed(2)}%
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              ))}
            {/* Date footer */}
            <tfoot>
              <tr>
                <td className="sticky left-0 z-10 bg-[#0A0A0E] p-1.5 border-t border-r border-[#1E1E22] text-[9px] text-[#6B6B75]" />
                {allDates.map(date => (
                  <td key={date} className="p-1 text-center text-[8px] text-[#555] border-t border-[#1E1E22]">
                    {date.slice(8)}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      {/* Legend */}
      <div className="flex items-center gap-3 mt-3 text-[10px] text-[#6B6B75]">
        <span>Legende :</span>
        <div className="flex gap-1 items-center">
          {[
            { val: 200, label: ">2%" },
            { val: 150, label: "1.5%" },
            { val: 100, label: "1%" },
            { val: 60, label: "0.6%" },
            { val: 30, label: "0.3%" },
          ].map(({ val, label }) => (
            <div key={val} className="flex items-center gap-1">
              <div className="w-4 h-3 rounded-sm" style={{ backgroundColor: heatColor(val) }} />
              <span>{label}</span>
            </div>
          ))}
        </div>
        <span className="ml-3">Survol = details OHLC + RV</span>
      </div>
    </div>
  );
}
