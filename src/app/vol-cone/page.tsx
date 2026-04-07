"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { PageHeader, LiveBadge, Card, KpiCard, Badge } from "@/components/ui/card";
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";

const API = "http://localhost:3850";
const WINDOWS = [5, 10, 21, 63, 126, 252];
const WINDOW_LABELS: Record<number, string> = { 5: "5j", 10: "10j", 21: "21j", 63: "63j", 126: "126j", 252: "252j" };

function pct(n: number): string { return (n * 100).toFixed(1) + "%"; }

function percentile(sorted: number[], p: number): number {
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
    <div className="bg-[#1A1A1E] border border-[#2A2A2E] rounded px-3 py-2 text-xs">
      <div className="text-[#6B6B75] mb-1">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ color: p.color }}>{p.name}: {Number(p.value * 100).toFixed(1)}%</div>
      ))}
    </div>
  );
}

interface ConeRow { window: string; min: number; p25: number; median: number; p75: number; max: number; current: number; iv: number; vrp: number; pctile: number; }

export default function VolConePage() {
  const [raw, setRaw] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/api/uw/volatility/realized?ticker=SPY`).then(r => r.json());
      setRaw(Array.isArray(res) ? res : res?.data ?? []);
    } catch (e: any) { setError(e.message || "Serveur indisponible"); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const { cone, chartData, currentIV, currentRV, vrp } = useMemo(() => {
    if (!raw.length) return { cone: [] as ConeRow[], chartData: [] as any[], currentIV: 0, currentRV: 0, vrp: 0 };
    const closes = raw.map((d: any) => d.close ?? d.price ?? 0).filter(Boolean);
    const returns = closes.slice(1).map((c: number, i: number) => Math.log(c / closes[i]));
    const ivs = raw.map((d: any) => d.implied ?? d.iv ?? 0).filter(Boolean);
    const latestIV = ivs[ivs.length - 1] || 0;

    const cone: ConeRow[] = WINDOWS.map(w => {
      const vols = rollingVol(returns, w).sort((a, b) => a - b);
      if (!vols.length) return { window: WINDOW_LABELS[w], min: 0, p25: 0, median: 0, p75: 0, max: 0, current: 0, iv: latestIV, vrp: 0, pctile: 0 };
      const cur = vols[vols.length - 1];
      const rank = vols.filter(v => v <= cur).length / vols.length;
      return {
        window: WINDOW_LABELS[w], min: vols[0], p25: percentile(vols, 0.25),
        median: percentile(vols, 0.5), p75: percentile(vols, 0.75),
        max: vols[vols.length - 1], current: cur, iv: latestIV,
        vrp: latestIV - cur, pctile: rank,
      };
    });

    const chartData = WINDOWS.map((w, i) => ({
      name: WINDOW_LABELS[w], min: cone[i].min, p25: cone[i].p25,
      median: cone[i].median, p75: cone[i].p75, max: cone[i].max,
      current: cone[i].current, iv: cone[i].iv,
    }));

    const rv21 = cone.find(c => c.window === "21j")?.current ?? 0;
    return { cone, chartData, currentIV: latestIV, currentRV: rv21, vrp: latestIV - rv21 };
  }, [raw]);

  const vrpColor = vrp > 0.03 ? "#4CAF50" : vrp < -0.02 ? "#EF4444" : "#FFB300";
  const vrpLabel = vrp > 0.03 ? "Prime elevee — vente de vol favorable" : vrp < -0.02 ? "Prime negative — achat de vol" : "Neutre";

  if (loading) return (
    <div className="p-6">
      <PageHeader title="Cone de Volatilite" subtitle="Percentiles historiques RV vs IV" />
      <div className="text-center py-20 text-[#6B6B75]">Chargement...</div>
    </div>
  );

  if (error) return (
    <div className="p-6">
      <PageHeader title="Cone de Volatilite" subtitle="Percentiles historiques RV vs IV" />
      <Card className="p-8 text-center text-red-400">{error}</Card>
    </div>
  );

  return (
    <div className="p-6">
      <PageHeader title="Cone de Volatilite" subtitle="Percentiles historiques de volatilite realisee vs implicite">
        <button onClick={load} className="px-3 py-1.5 bg-[#111114] border border-[#1E1E22] rounded-lg text-xs hover:border-[#FF6B00] transition-colors">Rafraichir</button>
        <LiveBadge />
      </PageHeader>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <KpiCard label="IV Courante" value={pct(currentIV)} color="#AB47BC" sublabel="Implicite 30j" />
        <KpiCard label="RV Courante" value={pct(currentRV)} color="#FFD600" sublabel="Realisee 21j" />
        <KpiCard label="VRP" value={pct(vrp)} color={vrpColor} sublabel={vrpLabel} />
      </div>

      {/* Chart */}
      <Card className="p-4 mb-4">
        <div className="text-xs text-[#6B6B75] uppercase tracking-wider mb-3">Cone de Volatilite</div>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E1E22" />
            <XAxis dataKey="name" tick={{ fill: "#6B6B75", fontSize: 11 }} />
            <YAxis tick={{ fill: "#6B6B75", fontSize: 10 }} tickFormatter={(v: number) => (v * 100).toFixed(0) + "%"} />
            <Tooltip content={darkTooltip} />
            <Line dataKey="max" stroke="#EF444466" dot={false} strokeDasharray="4 2" name="Max" />
            <Line dataKey="p75" stroke="#FFB30066" dot={false} strokeDasharray="4 2" name="75e" />
            <Line dataKey="median" stroke="#6B6B75" dot={false} strokeWidth={1} name="Mediane" />
            <Line dataKey="p25" stroke="#FFB30066" dot={false} strokeDasharray="4 2" name="25e" />
            <Line dataKey="min" stroke="#EF444466" dot={false} strokeDasharray="4 2" name="Min" />
            <Line dataKey="current" stroke="#FFD600" dot strokeWidth={2} name="RV Courante" />
            <Line dataKey="iv" stroke="#AB47BC" dot strokeWidth={2} name="IV" />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Table */}
      <Card className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[#1E1E22] text-[#6B6B75]">
              {["Fenetre", "Min", "25%", "Mediane", "75%", "Max", "RV", "IV", "VRP", "Percentile", "Statut"].map(h => (
                <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cone.map(r => (
              <tr key={r.window} className="border-b border-[#1E1E22] hover:bg-[#16161A]">
                <td className="px-3 py-2 font-mono text-[#FF6B00]">{r.window}</td>
                <td className="px-3 py-2 font-mono">{pct(r.min)}</td>
                <td className="px-3 py-2 font-mono">{pct(r.p25)}</td>
                <td className="px-3 py-2 font-mono">{pct(r.median)}</td>
                <td className="px-3 py-2 font-mono">{pct(r.p75)}</td>
                <td className="px-3 py-2 font-mono">{pct(r.max)}</td>
                <td className="px-3 py-2 font-mono text-[#FFD600]">{pct(r.current)}</td>
                <td className="px-3 py-2 font-mono text-[#AB47BC]">{pct(r.iv)}</td>
                <td className="px-3 py-2 font-mono" style={{ color: r.vrp > 0 ? "#4CAF50" : "#EF4444" }}>{pct(r.vrp)}</td>
                <td className="px-3 py-2 font-mono">{(r.pctile * 100).toFixed(0)}%</td>
                <td className="px-3 py-2">
                  <Badge color={r.pctile > 0.75 ? "#EF4444" : r.pctile > 0.5 ? "#FFB300" : "#4CAF50"}>
                    {r.pctile > 0.75 ? "ELEVE" : r.pctile > 0.5 ? "NORMAL" : "BAS"}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
