"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { PageHeader, LiveBadge, Card, Badge, KpiCard } from "@/components/ui/card";
import { RefreshTimer } from "@/components/ui/refresh-timer";
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";

const API = "http://localhost:3850";
const TENORS = ["VIX9D", "VIX", "VIX3M", "VIX6M"];

function darkTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1A1A1E] border border-[#2A2A2E] rounded px-3 py-2 text-xs">
      <div className="text-[#6B6B75] mb-1">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ color: p.color }}>{p.name}: {Number(p.value).toFixed(2)}</div>
      ))}
    </div>
  );
}

export default function TermStructurePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await fetch(`${API}/api/uw/iv-rank?ticker=SPY`, { signal: AbortSignal.timeout(10000) }).then(r => r.json());
      setData(res?.data ?? res ?? {});
    } catch (e: any) { setError(e.message || "Serveur indisponible"); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const chartData = useMemo(() => {
    if (!data) return [];
    return TENORS.map(t => ({
      tenor: t,
      current: data[t.toLowerCase()] ?? data[t] ?? 0,
      historical: (data[t.toLowerCase() + "_hist"] ?? data[t + "_hist"]) ?? null,
    }));
  }, [data]);

  const vix = chartData.find(c => c.tenor === "VIX")?.current ?? 0;
  const vix3m = chartData.find(c => c.tenor === "VIX3M")?.current ?? 0;
  const structure = vix3m > vix ? "CONTANGO" : "BACKWARDATION";
  const structColor = structure === "CONTANGO" ? "#4CAF50" : "#EF4444";
  const spread = vix3m - vix;

  return (
    <div className="p-6">
      <PageHeader timer={<RefreshTimer intervalSeconds={10} />} title="Structure de Terme VIX" subtitle="Courbe de volatilite par echeance — VIX futures et options">
        {data && <Badge color={structColor}>{structure}</Badge>}
        <button onClick={load} className="px-3 py-1.5 bg-[#111114] border border-[#1E1E22] rounded-lg text-xs hover:border-[#FF6B00] transition-colors">Rafraichir</button>
        <LiveBadge />
      </PageHeader>

      {loading && !data ? (
        <div className="text-center py-20 text-[#6B6B75]">Chargement...</div>
      ) : error && !data ? (
        <Card className="p-8 text-center text-red-400">{error}</Card>
      ) : (
        <>
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-4">
        {chartData.map(c => (
          <KpiCard key={c.tenor} label={c.tenor} value={c.current ? c.current.toFixed(2) : "--"} color="#FF6B00" />
        ))}
      </div>

      {/* Spread */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <KpiCard label="Spread VIX3M - VIX" value={spread.toFixed(2)} color={structColor} sublabel={structure} />
        <KpiCard label="Ratio VIX3M/VIX" value={vix ? (vix3m / vix).toFixed(3) : "--"} color={structColor} sublabel={vix3m / vix > 1 ? "Terme normal" : "Inversion"} />
      </div>

      {/* Chart */}
      <Card className="p-4">
        <div className="text-xs text-[#6B6B75] uppercase tracking-wider mb-3">Courbe de Terme</div>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E1E22" />
            <XAxis dataKey="tenor" tick={{ fill: "#6B6B75", fontSize: 12 }} />
            <YAxis tick={{ fill: "#6B6B75", fontSize: 10 }} domain={["auto", "auto"]} />
            <Tooltip content={darkTooltip} />
            <Line dataKey="current" stroke="#FF6B00" strokeWidth={2.5} dot={{ r: 5, fill: "#FF6B00" }} name="Courbe actuelle" />
            <Line dataKey="historical" stroke="#6B6B75" strokeWidth={1.5} strokeDasharray="6 3" dot={{ r: 3, fill: "#6B6B75" }} name="Historique" />
          </LineChart>
        </ResponsiveContainer>
      </Card>
        </>
      )}
    </div>
  );
}
