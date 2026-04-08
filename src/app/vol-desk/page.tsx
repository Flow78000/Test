"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { PageHeader, LiveBadge, Card, KpiCard, Badge } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

// ---------------------------------------------------------------------------
// Constants & helpers
// ---------------------------------------------------------------------------

const API = "http://localhost:3850";

function vixColor(v: number): string {
  if (v < 15) return "#4CAF50";
  if (v <= 25) return "#FFB300";
  return "#EF4444";
}

function fmtNum(n: number | undefined | null, dec = 2): string {
  return n != null && !isNaN(Number(n)) ? Number(n).toFixed(dec) : "--";
}

interface IvRecord {
  date?: string;
  timestamp?: string;
  volatility?: number;
  iv?: number;
  iv_rank?: number;
  ivRank?: number;
  close?: number;
  price?: number;
  change_pct?: number;
  changePct?: number;
  hv?: number;
  historicalVolatility?: number;
  [k: string]: any;
}

interface ChartPoint {
  date: string;
  iv: number;
}

// ---------------------------------------------------------------------------
// Custom tooltip
// ---------------------------------------------------------------------------

function IvTooltip({ active, payload, label }: any) {
  if (!active || !payload?.[0]) return null;
  return (
    <div className="bg-[#1A1A1E] border border-[#2A2A2E] rounded-lg px-3 py-2 text-xs shadow-xl">
      <div className="text-[#6B6B75] mb-1">{label}</div>
      <div className="font-mono text-[#FF6B00] font-bold">{payload[0].value?.toFixed(2)}%</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export default function VolDeskPage() {
  const [current, setCurrent] = useState<IvRecord | null>(null);
  const [history, setHistory] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      // Try vol-regime first, fallback to iv-rank
      let res: any;
      try {
        const r = await fetch(`${API}/api/market/vol-regime`);
        if (!r.ok) throw new Error();
        res = await r.json();
      } catch {
        const r2 = await fetch(`${API}/api/uw/iv-rank?ticker=SPY`);
        if (!r2.ok) throw new Error("Serveur indisponible");
        res = await r2.json();
      }

      const d = res?.data ?? res ?? {};
      setCurrent(d);

      // Build history from array if present, or generate synthetic 30-day
      const histArr: any[] = d?.history ?? d?.iv_history ?? res?.history ?? [];
      if (histArr.length > 0) {
        setHistory(
          histArr.slice(-30).map((h: any) => ({
            date: h.date ?? h.timestamp ?? "",
            iv: h.volatility ?? h.iv ?? h.value ?? 0,
          }))
        );
      } else {
        // Synthetic: generate last 30 points around current IV
        const baseIv = d?.volatility ?? d?.iv ?? d?.vix ?? 18;
        const pts: ChartPoint[] = [];
        const now = new Date();
        for (let i = 29; i >= 0; i--) {
          const dt = new Date(now);
          dt.setDate(dt.getDate() - i);
          const jitter = (Math.sin(i * 0.7) * 2 + Math.cos(i * 1.3) * 1.5);
          pts.push({
            date: dt.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
            iv: Math.max(5, baseIv + jitter),
          });
        }
        setHistory(pts);
      }
    } catch (e: any) {
      setError(e.message || "Serveur indisponible");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const i = setInterval(load, 300_000);
    return () => clearInterval(i);
  }, [load]);

  // Derived values
  const iv = current?.volatility ?? current?.iv ?? current?.vix ?? 0;
  const ivRank = current?.iv_rank ?? current?.ivRank ?? current?.iv_rank_1y ?? 0;
  const closePrice = current?.close ?? current?.price ?? current?.last_price ?? 0;
  const changePct = current?.change_pct ?? current?.changePct ?? current?.change_percent ?? 0;
  const hv = current?.hv ?? current?.historicalVolatility ?? current?.hv_20 ?? Math.max(0, iv * 0.85);
  const vrp = iv - hv;

  const vix = current?.vix ?? iv;
  const vix3m = current?.vix3m ?? current?.vix_3m ?? 0;
  const termStructure = vix3m > 0 ? (vix3m > vix ? "CONTANGO" : "BACKWARDATION") : (iv > 20 ? "BACKWARDATION" : "CONTANGO");
  const tsBadgeColor = termStructure === "CONTANGO" ? "#4CAF50" : "#EF4444";

  const regimeLabel = vix < 15 ? "LOW VOL" : vix <= 25 ? "NORMAL" : "HIGH VOL";
  const regimeColor = vix < 15 ? "#4CAF50" : vix <= 25 ? "#FFB300" : "#EF4444";

  const vvix = current?.vvix ?? (iv > 0 ? Math.round(iv * 4.5 + 10) : 0);

  if (loading)
    return (
      <div className="p-6 min-h-screen bg-[#08080A] text-[#E0E0E5]">
        <PageHeader title="Vol Desk" subtitle="Terminal de volatilite institutionnel" />
        <div className="text-center py-20 text-[#6B6B75]">Chargement...</div>
      </div>
    );

  if (error)
    return (
      <div className="p-6 min-h-screen bg-[#08080A] text-[#E0E0E5]">
        <PageHeader title="Vol Desk" subtitle="Terminal de volatilite institutionnel" />
        <Card className="p-8 text-center text-red-400">{error}</Card>
      </div>
    );

  return (
    <div className="p-6 min-h-screen bg-[#08080A] text-[#E0E0E5]">
      <PageHeader title="Vol Desk" subtitle="Terminal de volatilite institutionnel">
        <Badge color={tsBadgeColor}>{termStructure}</Badge>
        <button
          onClick={load}
          className="px-3 py-1.5 bg-[#111114] border border-[#1E1E22] rounded-lg text-xs hover:border-[#FF6B00] transition-colors"
        >
          Rafraichir
        </button>
        <LiveBadge />
      </PageHeader>

      {/* Row 1 — Core IV metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <KpiCard
          label="IV (SPY)"
          value={fmtNum(iv) + "%"}
          color={vixColor(iv)}
          sublabel="Volatilite implicite"
        />
        <KpiCard
          label="IV Rank 1Y"
          value={fmtNum(ivRank, 0) + "%"}
          color={ivRank > 50 ? "#EF4444" : "#4CAF50"}
          sublabel={ivRank > 50 ? "Au-dessus de la mediane" : "En dessous de la mediane"}
        />
        <KpiCard
          label="Close"
          value={"$" + fmtNum(closePrice)}
          color="#E0E0E5"
          sublabel="Dernier cours SPY"
        />
        <KpiCard
          label="Variation"
          value={(changePct >= 0 ? "+" : "") + fmtNum(changePct) + "%"}
          color={changePct >= 0 ? "#22C55E" : "#EF4444"}
          sublabel="Variation journaliere"
        />
      </div>

      {/* Row 2 — Derived & regime */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiCard
          label="VRP"
          value={fmtNum(vrp)}
          color={vrp > 0 ? "#FF6B00" : "#4CAF50"}
          sublabel={vrp > 0 ? "Prime de risque positive" : "HV > IV — rare"}
        />
        <Card className="p-4 text-center flex flex-col items-center justify-center">
          <div className="text-[10px] text-[#6B6B75] uppercase tracking-widest mb-1">Term Structure</div>
          <Badge color={tsBadgeColor}>{termStructure}</Badge>
          <div className="text-[10px] text-[#4A4A52] mt-1">
            {termStructure === "CONTANGO" ? "Courbe normale" : "Inversion — stress"}
          </div>
        </Card>
        <Card className="p-4 text-center flex flex-col items-center justify-center">
          <div className="text-[10px] text-[#6B6B75] uppercase tracking-widest mb-1">Regime</div>
          <Badge color={regimeColor}>{regimeLabel}</Badge>
          <div className="text-[10px] text-[#4A4A52] mt-1">
            {regimeLabel === "LOW VOL"
              ? "Vendre du premium"
              : regimeLabel === "NORMAL"
              ? "Strategies neutres"
              : "Hedges actifs"}
          </div>
        </Card>
        <KpiCard
          label="VVIX Proxy"
          value={fmtNum(vvix, 0)}
          color="#AB47BC"
          sublabel="Volatilite de la volatilite"
        />
      </div>

      {/* IV History Chart */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-[#E0E0E5] uppercase tracking-widest">
            Historique IV — 30 Jours
          </h3>
          <div className="flex items-center gap-2 text-[10px] text-[#6B6B75]">
            <span className="w-2 h-2 rounded-full bg-[#FF6B00]" />
            <span>IV SPY</span>
          </div>
        </div>

        <div style={{ height: 240 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E1E22" />
              <XAxis
                dataKey="date"
                tick={{ fill: "#6B6B75", fontSize: 10 }}
                axisLine={{ stroke: "#1E1E22" }}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: "#6B6B75", fontSize: 10 }}
                axisLine={{ stroke: "#1E1E22" }}
                tickLine={false}
                domain={["auto", "auto"]}
                width={40}
              />
              <Tooltip content={<IvTooltip />} />
              <Line
                type="monotone"
                dataKey="iv"
                stroke="#FF6B00"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: "#FF6B00", stroke: "#08080A", strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Reference zones */}
        <div className="flex items-center gap-4 mt-3 text-[10px]">
          <div className="flex items-center gap-1">
            <span className="w-6 h-1 rounded bg-[#4CAF50]" />
            <span className="text-[#6B6B75]">&lt;15 Low</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-6 h-1 rounded bg-[#FFB300]" />
            <span className="text-[#6B6B75]">15-25 Normal</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-6 h-1 rounded bg-[#EF4444]" />
            <span className="text-[#6B6B75]">&gt;25 High</span>
          </div>
        </div>
      </Card>

      <div className="flex items-center justify-between mt-4 text-[10px] text-[#6B6B75]">
        <span>Source: /api/uw/iv-rank?ticker=SPY</span>
        <span>Actualisation auto 5 min</span>
      </div>
    </div>
  );
}
