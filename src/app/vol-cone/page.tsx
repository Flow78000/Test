"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { PageHeader, LiveBadge, Card, KpiCard, Badge } from "@/components/ui/card";
import { SkeletonGrid, SkeletonChart, ErrorCard } from "@/components/ui/skeleton";
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine,
  ComposedChart,
} from "recharts";

const API = "http://localhost:3850";
const WINDOWS = [5, 10, 21, 42, 63, 126, 252];
const W_LABELS: Record<number, string> = { 5:"1W", 10:"2W", 21:"1M", 42:"2M", 63:"3M", 126:"6M", 252:"1Y" };

function pct(n: number): string { return (n * 100).toFixed(1) + "%"; }
function pctFmt(n: number): string { return (n * 100).toFixed(1); }

function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const i = (sorted.length - 1) * p;
  const lo = Math.floor(i), hi = Math.ceil(i);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
}

function rollingVol(returns: number[], w: number): number[] {
  const out: number[] = [];
  for (let i = w - 1; i < returns.length; i++) {
    const sl = returns.slice(i - w + 1, i + 1);
    const mean = sl.reduce((a, b) => a + b, 0) / sl.length;
    const variance = sl.reduce((a, x) => a + (x - mean) ** 2, 0) / sl.length;
    out.push(Math.sqrt(variance * 252));
  }
  return out;
}

function darkTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#111114] border border-[#2A2A2E] rounded-lg px-4 py-3 text-xs shadow-xl">
      <div className="text-[#FF6B00] font-bold mb-2">{label}</div>
      {payload.filter((p: any) => p.value != null).map((p: any, i: number) => (
        <div key={`${p.dataKey}-${i}`} className="flex justify-between gap-4" style={{ color: p.color || p.stroke }}>
          <span>{p.name}</span>
          <span className="font-mono font-bold">{(Number(p.value) * 100).toFixed(1)}%</span>
        </div>
      ))}
    </div>
  );
}

interface ConeRow {
  window: string; wDays: number;
  min: number; p10: number; p25: number; median: number; p75: number; p90: number; max: number;
  current: number; iv: number; vrp: number; pctile: number;
}

export default function VolConePage() {
  const [raw, setRaw] = useState<any[]>([]);
  const [ticker, setTicker] = useState("SPY");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch(`${API}/api/uw/volatility/realized?ticker=${ticker}`).then(r => r.json());
      setRaw(Array.isArray(res) ? res : res?.data ?? []);
    } catch (e: any) { setError(e.message || "Serveur indisponible"); }
    setLoading(false);
  }, [ticker]);

  useEffect(() => { load(); }, [load]);

  const { cone, chartData, currentIV, currentRV, vrp, rvHistory } = useMemo(() => {
    if (!raw.length) return { cone: [] as ConeRow[], chartData: [], currentIV: 0, currentRV: 0, vrp: 0, rvHistory: [] };

    const prices = raw.map((d: any) => parseFloat(d.price || d.close || 0)).filter(Boolean);
    const ivArr = raw.map((d: any) => parseFloat(d.implied_volatility || d.iv || 0)).filter(Boolean);
    const rvArr = raw.map((d: any) => parseFloat(d.realized_volatility || d.rv || 0)).filter(Boolean);
    const dates = raw.map((d: any) => d.date || "").filter(Boolean);

    const latestIV = ivArr[ivArr.length - 1] || 0;
    const latestRV = rvArr[rvArr.length - 1] || 0;

    // Use provided RV data if available, else compute from prices
    let returns: number[] = [];
    if (prices.length > 10) {
      returns = prices.slice(1).map((c, i) => Math.log(c / prices[i]));
    }

    const cone: ConeRow[] = WINDOWS.map(w => {
      let vols: number[];
      if (rvArr.length > w) {
        // Use rolling window of provided RV values
        vols = [];
        for (let i = w; i < rvArr.length; i++) {
          const slice = rvArr.slice(i - w, i);
          vols.push(slice.reduce((a, b) => a + b, 0) / slice.length);
        }
      } else if (returns.length > w) {
        vols = rollingVol(returns, w);
      } else {
        return { window: W_LABELS[w], wDays: w, min: 0, p10: 0, p25: 0, median: 0, p75: 0, p90: 0, max: 0, current: 0, iv: latestIV, vrp: 0, pctile: 0 };
      }

      vols.sort((a, b) => a - b);
      const cur = vols[vols.length - 1];
      const rank = vols.filter(v => v <= cur).length / vols.length;

      return {
        window: W_LABELS[w], wDays: w,
        min: vols[0], p10: percentile(vols, 0.10), p25: percentile(vols, 0.25),
        median: percentile(vols, 0.50), p75: percentile(vols, 0.75),
        p90: percentile(vols, 0.90), max: vols[vols.length - 1],
        current: cur, iv: latestIV, vrp: latestIV - cur, pctile: rank,
      };
    });

    // Bloomberg-style cone chart data: each window is a point on X axis
    const chartData = cone.map(c => ({
      name: c.window,
      min: c.min, p10: c.p10, p25: c.p25, median: c.median,
      p75: c.p75, p90: c.p90, max: c.max,
      current: c.current, iv: c.iv,
      // For area fill between bands
      band_outer: [c.min, c.max],
      band_mid: [c.p25, c.p75],
      band_inner: [c.p10, c.p90],
    }));

    // RV vs IV history chart
    const rvHistory = dates.slice(-90).map((d, i) => ({
      date: d.slice(5),
      iv: ivArr[ivArr.length - 90 + i] || 0,
      rv: rvArr[rvArr.length - 90 + i] || 0,
    }));

    const rv21 = cone.find(c => c.window === "1M")?.current ?? latestRV;
    return { cone, chartData, currentIV: latestIV, currentRV: rv21, vrp: latestIV - rv21, rvHistory };
  }, [raw]);

  const vrpColor = vrp > 0.03 ? "#22C55E" : vrp > 0 ? "#FFA726" : "#EF4444";
  const vrpEdge = vrp > 0.05 ? "EDGE FORT — Vente de vol optimale" : vrp > 0.02 ? "EDGE MODERE — Vente de vol possible" : vrp > 0 ? "EDGE FAIBLE — Prudence" : "PAS D'EDGE — Ne pas vendre de vol";

  if (loading) return (
    <div className="p-6">
      <PageHeader title="Cone de Volatilite" subtitle="Bloomberg-style — Percentiles historiques" />
      <SkeletonGrid cols={4} />
      <SkeletonChart height={350} />
    </div>
  );

  if (error) return (
    <div className="p-6">
      <PageHeader title="Cone de Volatilite" subtitle="Bloomberg-style — Percentiles historiques" />
      <ErrorCard message={error} onRetry={load} />
    </div>
  );

  return (
    <div className="p-6">
      <PageHeader title="Cone de Volatilite" subtitle="Bloomberg-style — Distribution historique de la volatilite realisee">
        <select value={ticker} onChange={e => setTicker(e.target.value)} className="text-xs">
          <option value="SPY">SPY</option>
          <option value="QQQ">QQQ</option>
          <option value="IWM">IWM</option>
        </select>
        <button onClick={load} className="px-3 py-1.5 bg-[#111114] border border-[#1E1E22] rounded-lg text-xs hover:border-[#FF6B00] transition-colors">Rafraichir</button>
        <LiveBadge />
      </PageHeader>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <KpiCard label="IV Courante" value={pct(currentIV)} color="#B388FF" sublabel="Implicite SPY" />
        <KpiCard label="RV 21j" value={pct(currentRV)} color="#FFD54F" sublabel="Realisee 1 mois" />
        <Card className="p-4 text-center" style={{ borderColor: vrpColor + "44" }}>
          <div className="text-[10px] text-[#6B6B75] uppercase tracking-widest mb-1">VRP</div>
          <div className="text-2xl font-extrabold font-mono" style={{ color: vrpColor }}>{pct(vrp)}</div>
          <div className="text-[10px] mt-1" style={{ color: vrpColor }}>{vrpEdge}</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-[10px] text-[#6B6B75] uppercase tracking-widest mb-1">Regime Vol</div>
          <div className="text-xl font-extrabold" style={{ color: currentRV > 0.25 ? "#EF4444" : currentRV > 0.15 ? "#FFA726" : "#22C55E" }}>
            {currentRV > 0.25 ? "EXPANSION" : currentRV > 0.15 ? "NORMAL" : "COMPRESSION"}
          </div>
          <div className="text-[10px] text-[#6B6B75] mt-1">
            {currentRV > 0.25 ? "Vol elevee — stops larges" : currentRV > 0.15 ? "Regime stable" : "Vol basse — attention breakout"}
          </div>
        </Card>
      </div>

      {/* MAIN CONE CHART — Bloomberg Style with filled bands */}
      <Card className="p-5 mb-4">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-sm font-bold">Cone de Volatilite — {ticker}</span>
          <span className="text-[10px] text-[#6B6B75]">Bandes : Min/Max (rouge) | 10e-90e (orange) | 25e-75e (vert) | Mediane (blanc)</span>
        </div>
        <ResponsiveContainer width="100%" height={380}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1E" />
            <XAxis dataKey="name" tick={{ fill: "#6B6B75", fontSize: 12, fontWeight: 600 }} axisLine={{ stroke: "#1E1E22" }} />
            <YAxis tick={{ fill: "#6B6B75", fontSize: 10 }} tickFormatter={(v: number) => (v * 100).toFixed(0) + "%"} axisLine={{ stroke: "#1E1E22" }} />
            <Tooltip content={darkTooltip} />

            {/* Band: Min to Max (outer — faint red) */}
            <Area dataKey="max" stroke="none" fill="#EF444410" name="Max" />
            <Area dataKey="min" stroke="none" fill="#08080A" name="Min" />

            {/* Band lines: p90 and p10 */}
            <Line dataKey="p90" stroke="#EF4444" strokeWidth={1} strokeDasharray="6 3" dot={false} name="90e percentile" />
            <Line dataKey="p10" stroke="#EF4444" strokeWidth={1} strokeDasharray="6 3" dot={false} name="10e percentile" />

            {/* Band: p75 to p25 (inner — green) */}
            <Area dataKey="p75" stroke="none" fill="#22C55E12" name="75e" />
            <Area dataKey="p25" stroke="none" fill="#08080A" name="25e" />

            {/* Band lines */}
            <Line dataKey="p75" stroke="#22C55E" strokeWidth={1} strokeDasharray="4 2" dot={false} name="75e percentile" />
            <Line dataKey="p25" stroke="#22C55E" strokeWidth={1} strokeDasharray="4 2" dot={false} name="25e percentile" />

            {/* Median — solid white */}
            <Line dataKey="median" stroke="#6B6B75" strokeWidth={1.5} dot={false} name="Mediane" />

            {/* Current RV — bold yellow with dots */}
            <Line dataKey="current" stroke="#FFD54F" strokeWidth={3} dot={{ r: 5, fill: "#FFD54F", stroke: "#08080A", strokeWidth: 2 }} name="RV Courante" />

            {/* Current IV — bold purple with dots */}
            <Line dataKey="iv" stroke="#B388FF" strokeWidth={3} dot={{ r: 5, fill: "#B388FF", stroke: "#08080A", strokeWidth: 2 }} name="IV Courante" />
          </ComposedChart>
        </ResponsiveContainer>

        {/* Legend */}
        <div className="flex items-center gap-5 mt-3 justify-center text-[10px]">
          <span className="flex items-center gap-1.5"><span className="w-8 h-0.5 bg-[#FFD54F] inline-block rounded" /> <span className="text-[#FFD54F]">RV Courante</span></span>
          <span className="flex items-center gap-1.5"><span className="w-8 h-0.5 bg-[#B388FF] inline-block rounded" /> <span className="text-[#B388FF]">IV Courante</span></span>
          <span className="flex items-center gap-1.5"><span className="w-8 h-px bg-[#6B6B75] inline-block" /> <span className="text-[#6B6B75]">Mediane</span></span>
          <span className="flex items-center gap-1.5"><span className="w-8 h-px bg-[#22C55E] inline-block border-dashed" style={{ borderTop: "1px dashed #22C55E" }} /> <span className="text-[#22C55E]">25e-75e</span></span>
          <span className="flex items-center gap-1.5"><span className="w-8 h-px inline-block" style={{ borderTop: "1px dashed #EF4444" }} /> <span className="text-[#EF4444]">10e-90e</span></span>
        </div>
      </Card>

      {/* RV vs IV History — 90 days */}
      {rvHistory.length > 5 && (
        <Card className="p-5 mb-4">
          <div className="text-sm font-bold mb-3">Historique IV vs RV — 90 jours</div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={rvHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1E" />
              <XAxis dataKey="date" tick={{ fill: "#6B6B75", fontSize: 9 }} />
              <YAxis tick={{ fill: "#6B6B75", fontSize: 9 }} tickFormatter={(v: number) => (v * 100).toFixed(0) + "%"} />
              <Tooltip content={darkTooltip} />
              <ReferenceLine y={0} stroke="#1E1E22" />
              <Area dataKey="iv" stroke="#B388FF" fill="#B388FF15" strokeWidth={2} name="IV" dot={false} />
              <Area dataKey="rv" stroke="#FFD54F" fill="#FFD54F15" strokeWidth={2} name="RV" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-5 mt-2 justify-center text-[10px]">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-[#B388FF] rounded-sm inline-block opacity-40" /> <span className="text-[#B388FF]">Vol Implicite</span></span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-[#FFD54F] rounded-sm inline-block opacity-40" /> <span className="text-[#FFD54F]">Vol Realisee</span></span>
            <span className="text-[#6B6B75]">Zone entre les deux = VRP (prime de risque de variance)</span>
          </div>
        </Card>
      )}

      {/* Data Table */}
      <Card className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[#1E1E22] text-[#6B6B75] text-[10px] uppercase tracking-wider">
              {["Fenetre", "Min", "10e", "25e", "Mediane", "75e", "90e", "Max", "RV Act.", "IV", "VRP", "%ile", "Statut"].map(h => (
                <th key={h} className="px-3 py-2.5 text-left font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cone.map(r => {
              const statusColor = r.pctile > 0.90 ? "#EF4444" : r.pctile > 0.75 ? "#FF6B00" : r.pctile > 0.25 ? "#22C55E" : "#42A5F5";
              const statusLabel = r.pctile > 0.90 ? "EXTREME" : r.pctile > 0.75 ? "ELEVE" : r.pctile > 0.25 ? "NORMAL" : "BAS";
              return (
                <tr key={r.window} className="border-b border-[#1A1A1E] hover:bg-[#FF6B0006]">
                  <td className="px-3 py-2 font-mono font-bold text-[#FF6B00]">{r.window}</td>
                  <td className="px-3 py-2 font-mono text-[#EF4444]">{pctFmt(r.min)}</td>
                  <td className="px-3 py-2 font-mono text-[#EF444488]">{pctFmt(r.p10)}</td>
                  <td className="px-3 py-2 font-mono text-[#22C55E88]">{pctFmt(r.p25)}</td>
                  <td className="px-3 py-2 font-mono text-[#6B6B75]">{pctFmt(r.median)}</td>
                  <td className="px-3 py-2 font-mono text-[#22C55E88]">{pctFmt(r.p75)}</td>
                  <td className="px-3 py-2 font-mono text-[#EF444488]">{pctFmt(r.p90)}</td>
                  <td className="px-3 py-2 font-mono text-[#EF4444]">{pctFmt(r.max)}</td>
                  <td className="px-3 py-2 font-mono font-bold text-[#FFD54F]">{pctFmt(r.current)}</td>
                  <td className="px-3 py-2 font-mono font-bold text-[#B388FF]">{pctFmt(r.iv)}</td>
                  <td className="px-3 py-2 font-mono font-bold" style={{ color: r.vrp > 0 ? "#22C55E" : "#EF4444" }}>
                    {r.vrp > 0 ? "+" : ""}{pctFmt(r.vrp)}
                  </td>
                  <td className="px-3 py-2 font-mono">{(r.pctile * 100).toFixed(0)}%</td>
                  <td className="px-3 py-2"><Badge color={statusColor}>{statusLabel}</Badge></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {/* Interpretation */}
      <div className="grid grid-cols-3 gap-3 mt-4">
        <Card className="p-4" style={{ borderTopColor: "#22C55E", borderTopWidth: 3 }}>
          <div className="text-xs font-bold text-[#22C55E] mb-2">RV sous la mediane</div>
          <p className="text-[11px] text-[#6B6B75] leading-relaxed">
            La vol realisee est sous sa mediane historique. Marche en compression. Attention aux faux breakouts.
            Strategies : vente de vol (iron condors, straddles courts). Reduire la taille des positions directionnelles.
          </p>
        </Card>
        <Card className="p-4" style={{ borderTopColor: "#FFA726", borderTopWidth: 3 }}>
          <div className="text-xs font-bold text-[#FFA726] mb-2">RV pres de la mediane</div>
          <p className="text-[11px] text-[#6B6B75] leading-relaxed">
            Regime normal. La vol est a son niveau moyen. Les primes d'options sont correctement pricees.
            Strategies : mix directionnel + vente de vol. Sizing standard.
          </p>
        </Card>
        <Card className="p-4" style={{ borderTopColor: "#EF4444", borderTopWidth: 3 }}>
          <div className="text-xs font-bold text-[#EF4444] mb-2">RV au-dessus du 75e</div>
          <p className="text-[11px] text-[#6B6B75] leading-relaxed">
            Expansion de vol. Le marche bouge beaucoup. Les primes sont elevees = opportunite de vente SI le VRP est positif.
            Strategies : credit spreads OTM. Stops tres larges ou absents sur les ventes de vol.
          </p>
        </Card>
      </div>
    </div>
  );
}
