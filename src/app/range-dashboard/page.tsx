"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader, Card, LiveBadge, Badge, KpiCard } from "@/components/ui/card";
import { DataFreshness } from "@/components/ui/data-freshness";
import { fmtNum } from "@/lib/format";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine, LineChart, Line } from "recharts";

const API = "http://localhost:3850";

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

const CLASS_COLORS: Record<string, string> = {
  "Indices US": "#FF6B00",
  "EUREX": "#42A5F5",
  "Volatilite": "#EF4444",
  "Inverse": "#AB47BC",
  "Breadth": "#FFD600",
  "GEX": "#22C55E",
};

export default function RangeDashboardPage() {
  const [assets, setAssets] = useState<Record<string, AssetRange>>({});
  const [loading, setLoading] = useState(true);
  const [freshness, setFreshness] = useState<any>(null);
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const [historyDays, setHistoryDays] = useState(10);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/sierra/daily-ranges?days=${historyDays}`).then(r => r.json());
      if (res?.assets) {
        setAssets(res.assets);
        // Get freshness from any asset's sierra data
        const firstKey = Object.keys(res.assets)[0];
        if (firstKey) {
          const sigRes = await fetch(`${API}/api/sierra/signals?symbol=${firstKey}`).then(r => r.json()).catch(() => null);
          if (sigRes) setFreshness({ file_modified: sigRes.file_modified, data_age_seconds: sigRes.data_age_seconds, is_stale: sigRes.is_stale });
        }
      }
    } catch { }
    setLoading(false);
  }, [historyDays]);

  useEffect(() => {
    load();
    const t = setInterval(load, 30 * 60 * 1000);
    return () => clearInterval(t);
  }, [load]);

  // Group assets by class
  const groups: Record<string, { sym: string; data: AssetRange }[]> = {};
  Object.entries(assets).forEach(([sym, data]) => {
    const cls = data.asset_class || "Autre";
    if (!groups[cls]) groups[cls] = [];
    groups[cls].push({ sym, data });
  });

  // Stats
  const allLatest = Object.entries(assets).map(([sym, a]) => ({ sym, ...a.latest! })).filter(a => a.close);
  const upCount = allLatest.filter(a => (a.change_pct ?? 0) > 0).length;
  const downCount = allLatest.filter(a => (a.change_pct ?? 0) < 0).length;
  const rvs = allLatest.map(a => a.rv_daily).filter((v): v is number => v !== null);
  const avgRV = rvs.length ? rvs.reduce((s, v) => s + v, 0) / rvs.length : 0;
  const maxRange = allLatest.reduce((m, a) => Math.max(m, a.range_pct || 0), 0);

  const selected = selectedAsset ? assets[selectedAsset] : null;

  if (loading) return (
    <div className="p-4">
      <PageHeader title="Range Dashboard" subtitle="Ranges journaliers — donnees Sierra Chart" />
      <div className="text-center py-20 text-[#6B6B75]">Chargement des ranges Sierra...</div>
    </div>
  );

  return (
    <div className="p-4">
      <PageHeader title="Range Dashboard" subtitle="Ranges journaliers, RV daily et performance — Sierra Chart live">
        <select value={historyDays} onChange={e => setHistoryDays(parseInt(e.target.value))}
          className="bg-[#111114] border border-[#1E1E22] rounded-lg px-3 py-1.5 text-xs text-white">
          <option value={5}>5 jours</option>
          <option value={10}>10 jours</option>
          <option value={20}>20 jours</option>
          <option value={30}>30 jours</option>
        </select>
        <button onClick={load} className="px-3 py-1.5 bg-[#111114] border border-[#1E1E22] rounded-lg text-xs hover:border-[#FF6B00] transition-colors">
          Rafraichir
        </button>
        <LiveBadge />
      </PageHeader>

      {/* Freshness */}
      {freshness && <div className="mb-3"><DataFreshness {...freshness} /></div>}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        <KpiCard label="Actifs" value={Object.keys(assets).length} color="#FF6B00" />
        <KpiCard label="Hausse" value={upCount} color="#22C55E" />
        <KpiCard label="Baisse" value={downCount} color="#EF4444" />
        <KpiCard label="RV Daily Moy." value={`${avgRV.toFixed(3)}%`} color="#AB47BC" sublabel="Realized Vol 1D" />
        <KpiCard label="Max Range" value={`${maxRange.toFixed(2)}%`} color="#FFA726" sublabel="Plus large range 1D" />
      </div>

      {/* Main Table */}
      <Card className="overflow-hidden mb-4">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-[#0A0A0E]">
                <th className="sticky left-0 z-20 bg-[#0A0A0E] p-2.5 text-left text-[10px] text-[#6B6B75] border-b border-r border-[#1E1E22] min-w-[120px]">Actif</th>
                <th className="p-2 text-right text-[10px] text-[#6B6B75] border-b border-[#1E1E22]">Close</th>
                <th className="p-2 text-right text-[10px] text-[#6B6B75] border-b border-[#1E1E22]">Var%</th>
                <th className="p-2 text-right text-[10px] text-[#AB47BC] font-bold border-b border-[#1E1E22]">% RV 1D</th>
                <th className="p-2 text-right text-[10px] text-[#6B6B75] border-b border-[#1E1E22]">High</th>
                <th className="p-2 text-right text-[10px] text-[#6B6B75] border-b border-[#1E1E22]">Low</th>
                <th className="p-2 text-right text-[10px] text-[#FFA726] border-b border-[#1E1E22]">Range%</th>
                <th className="p-2 text-right text-[10px] text-[#6B6B75] border-b border-[#1E1E22]">Range pts</th>
                <th className="p-2 text-center text-[10px] text-[#6B6B75] border-b border-[#1E1E22] min-w-[90px]">Pos. / Range</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(groups).map(([cls, items]) => (
                <>
                  <tr key={`hdr-${cls}`}>
                    <td colSpan={9} className="px-2.5 py-2 text-[10px] font-bold uppercase tracking-[2px] border-b border-[#1E1E22]"
                      style={{ color: CLASS_COLORS[cls] || "#6B6B75", backgroundColor: `${CLASS_COLORS[cls] || "#6B6B75"}15` }}>
                      {cls} ({items.length})
                    </td>
                  </tr>
                  {items.map(({ sym, data: a }) => {
                    const d = a.latest;
                    if (!d) return null;
                    const posInRange = d.high !== d.low ? ((d.close - d.low) / (d.high - d.low) * 100) : 50;
                    return (
                      <tr key={sym}
                        className={`cursor-pointer transition-colors ${selectedAsset === sym ? "bg-[#FF6B0010]" : "hover:bg-[#FFFFFF04]"}`}
                        onClick={() => setSelectedAsset(selectedAsset === sym ? null : sym)}
                      >
                        <td className="sticky left-0 z-10 bg-[#111114] p-2 border-b border-r border-[#1E1E22]">
                          <span className="font-mono font-bold text-[12px]" style={{ color: CLASS_COLORS[a.asset_class] || "#FF6B00" }}>
                            {sym.replace(".CME", "").replace(".CBOT", "").replace("-NQTV", "").replace("_NASDAQ_NYSEMKT", "")}
                          </span>
                          <span className="text-[9px] text-[#6B6B75] ml-1.5 truncate">{a.name}</span>
                        </td>
                        <td className="p-2 text-right border-b border-[#1E1E22] font-mono text-white">{d.close.toFixed(2)}</td>
                        <td className="p-2 text-right border-b border-[#1E1E22]">
                          <span className="font-mono font-bold" style={{ color: (d.change_pct ?? 0) >= 0 ? "#22C55E" : "#EF4444" }}>
                            {d.change_pct != null ? `${d.change_pct >= 0 ? "+" : ""}${d.change_pct.toFixed(2)}%` : "--"}
                          </span>
                        </td>
                        <td className="p-2 text-right border-b border-[#1E1E22]">
                          <span className="font-mono font-bold text-[#AB47BC]">
                            {d.rv_daily != null ? `${d.rv_daily.toFixed(3)}%` : "--"}
                          </span>
                        </td>
                        <td className="p-2 text-right border-b border-[#1E1E22] font-mono text-[#6B6B75]">{d.high.toFixed(2)}</td>
                        <td className="p-2 text-right border-b border-[#1E1E22] font-mono text-[#6B6B75]">{d.low.toFixed(2)}</td>
                        <td className="p-2 text-right border-b border-[#1E1E22]">
                          <span className="font-mono font-bold text-[#FFA726]">{d.range_pct.toFixed(2)}%</span>
                        </td>
                        <td className="p-2 text-right border-b border-[#1E1E22] font-mono text-[#6B6B75]">{d.range_pts.toFixed(2)}</td>
                        <td className="p-2 border-b border-[#1E1E22]">
                          <div className="flex items-center gap-1.5">
                            <div className="flex-1 h-2 bg-[#1E1E22] rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{
                                width: `${Math.min(100, Math.max(0, posInRange))}%`,
                                background: posInRange > 70 ? "#22C55E" : posInRange < 30 ? "#EF4444" : "#FFA726",
                              }} />
                            </div>
                            <span className="text-[9px] font-mono text-[#6B6B75] w-8 text-right">{posInRange.toFixed(0)}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Detail panel */}
      {selected && selectedAsset && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          {/* Range history chart */}
          <Card className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-sm font-bold text-[#FF6B00]">{selectedAsset.replace(".CME", "").replace(".CBOT", "")}</span>
              <span className="text-xs text-[#6B6B75]">{selected.name} — Range% {historyDays}j</span>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={selected.days}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E1E22" />
                <XAxis dataKey="date" tick={{ fill: "#6B6B75", fontSize: 9 }} tickFormatter={(v: string) => v.toString().slice(5)} />
                <YAxis tick={{ fill: "#6B6B75", fontSize: 9 }} tickFormatter={(v: number) => `${v.toFixed(1)}%`} />
                <Tooltip contentStyle={{ background: "#111114", border: "1px solid #1E1E22", borderRadius: 8, fontSize: 11 }}
                  formatter={(v: any) => [`${Number(v).toFixed(3)}%`]} />
                <Bar dataKey="range_pct" fill="#FFA726" name="Range%" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* RV Daily + Change% history */}
          <Card className="p-4">
            <div className="text-xs text-[#6B6B75] mb-3">RV Daily & Var% — {historyDays} jours</div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={selected.days.filter(d => d.rv_daily !== null)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E1E22" />
                <XAxis dataKey="date" tick={{ fill: "#6B6B75", fontSize: 9 }} tickFormatter={(v: string) => v.toString().slice(5)} />
                <YAxis tick={{ fill: "#6B6B75", fontSize: 9 }} />
                <Tooltip contentStyle={{ background: "#111114", border: "1px solid #1E1E22", borderRadius: 8, fontSize: 11 }}
                  formatter={(v: any) => [`${Number(v).toFixed(3)}%`]} />
                <ReferenceLine y={0} stroke="#6B6B75" strokeDasharray="3 3" />
                <Line dataKey="rv_daily" stroke="#AB47BC" strokeWidth={2} dot={{ r: 3 }} name="% RV 1D" />
                <Line dataKey="change_pct" stroke="#42A5F5" strokeWidth={1} dot={{ r: 2 }} name="Var%" />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* Stats */}
          <Card className="p-4 lg:col-span-2">
            <div className="text-xs font-bold text-[#FF6B00] uppercase tracking-widest mb-3">
              Statistiques {selectedAsset.replace(".CME", "").replace(".CBOT", "")} — {selected.days.length} jours
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {(() => {
                const days = selected.days.filter(d => d.rv_daily != null);
                const rvs = days.map(d => d.rv_daily!);
                const ranges = selected.days.map(d => d.range_pct);
                const avgRV = rvs.length ? rvs.reduce((s, v) => s + v, 0) / rvs.length : 0;
                const maxRV = rvs.length ? Math.max(...rvs) : 0;
                const avgRange = ranges.length ? ranges.reduce((s, v) => s + v, 0) / ranges.length : 0;
                const maxRange = ranges.length ? Math.max(...ranges) : 0;
                const upDays = days.filter(d => (d.change_pct ?? 0) > 0).length;
                return (
                  <>
                    <KpiCard label="RV Moy." value={`${avgRV.toFixed(3)}%`} color="#AB47BC" />
                    <KpiCard label="RV Max" value={`${maxRV.toFixed(3)}%`} color="#EF4444" />
                    <KpiCard label="Range Moy." value={`${avgRange.toFixed(2)}%`} color="#FFA726" />
                    <KpiCard label="Range Max" value={`${maxRange.toFixed(2)}%`} color="#FF6B00" />
                    <KpiCard label="Jours Hausse" value={`${upDays}/${days.length}`} color="#22C55E" sublabel={`${days.length ? (upDays / days.length * 100).toFixed(0) : 0}%`} />
                  </>
                );
              })()}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
