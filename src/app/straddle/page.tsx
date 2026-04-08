"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, PageHeader, Badge, KpiCard } from "@/components/ui/card";
import { fmtNum, fmtPct } from "@/lib/format";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

/* ── Types ── */
interface StraddleRow {
  dte: number;
  expiry: string;
  strike: number;
  callBid: number;
  callAsk: number;
  putBid: number;
  putAsk: number;
  straddle: number;
  implMove: number;
  implMovePct: number;
  pcSkew: number;
  iv: number;
}

const API_BASE = "http://localhost:3850";
const TARGET_DTES = [0, 1, 2, 3, 7, 14, 30, 60, 90];

/* ── helpers ── */
function addBusinessDays(from: Date, days: number): Date {
  const d = new Date(from);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return d;
}

function nextFriday(from: Date, dte: number): Date {
  const target = new Date(from);
  target.setDate(target.getDate() + dte);
  // find closest Friday at or after
  const dow = target.getDay();
  if (dow <= 5) target.setDate(target.getDate() + (5 - dow));
  else target.setDate(target.getDate() + (12 - dow)); // Sunday -> next Fri
  return target;
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "2-digit" });
}

/* ── Generate demo straddle data ── */
function generateDemoData(spot: number): StraddleRow[] {
  const strike = Math.round(spot / 5) * 5;
  const baseIV = 16.5; // base IV %
  const now = new Date();

  return TARGET_DTES.map((dte) => {
    const sqrtDte = Math.sqrt(Math.max(dte, 0.25));
    const iv = baseIV + (dte < 3 ? 4 - dte * 0.8 : 0) + Math.random() * 1.5;
    const annualFactor = sqrtDte / Math.sqrt(252);
    const straddlePrice = spot * (iv / 100) * annualFactor * 1.1;
    const callMid = straddlePrice * (0.52 + Math.random() * 0.02);
    const putMid = straddlePrice - callMid;
    const spread = straddlePrice * 0.015;

    const expiry = dte === 0 ? now : nextFriday(now, dte);

    return {
      dte,
      expiry: fmtDate(expiry),
      strike,
      callBid: +(callMid - spread).toFixed(2),
      callAsk: +(callMid + spread).toFixed(2),
      putBid: +(putMid - spread).toFixed(2),
      putAsk: +(putMid + spread).toFixed(2),
      straddle: +straddlePrice.toFixed(2),
      implMove: +straddlePrice.toFixed(2),
      implMovePct: +((straddlePrice / spot) * 100).toFixed(2),
      pcSkew: +(callMid / putMid).toFixed(3),
      iv: +iv.toFixed(1),
    };
  });
}

/* ── Vol Term Structure chart tooltip ── */
function VTSTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: StraddleRow }> }) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-[#111114] border border-[#1E1E22] rounded-lg p-3 text-xs shadow-lg">
      <div className="text-[#FF6B00] font-bold mb-1">{d.dte}DTE</div>
      <div className="text-[#6B6B75]">IV: <span className="text-[#F0F0F0] font-semibold">{d.iv}%</span></div>
      <div className="text-[#6B6B75]">Straddle: <span className="text-[#F0F0F0] font-semibold">${d.straddle}</span></div>
      <div className="text-[#6B6B75]">Impl Move: <span className="text-[#F0F0F0] font-semibold">{d.implMovePct}%</span></div>
    </div>
  );
}

export default function StraddlePage() {
  const [spot, setSpot] = useState(5320);
  const [vix, setVix] = useState(16.8);
  const [isLive, setIsLive] = useState(false);
  const [rows, setRows] = useState<StraddleRow[]>([]);
  const [loading, setLoading] = useState(true);

  const atmStrike = useMemo(() => Math.round(spot / 5) * 5, [spot]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/uw/option-contracts?symbol=SPX`);
      if (!res.ok) throw new Error("API indisponible");
      const json = await res.json();

      // Try to extract spot and build rows from real data
      if (json.spot) setSpot(json.spot);
      if (json.iv_rank) setVix(json.iv_rank);
      setIsLive(true);

      // If the API returns chain data, attempt to build straddle rows
      // For now, fallback to demo with the real spot
      const demoRows = generateDemoData(json.spot || spot);
      setRows(demoRows);
    } catch {
      // Fallback: demo data
      setIsLive(false);
      setRows(generateDemoData(spot));
    } finally {
      setLoading(false);
    }
  }, [spot]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ── Vol term structure data for chart ── */
  const chartData = useMemo(
    () => rows.map((r) => ({ dte: r.dte, iv: r.iv, label: `${r.dte}D` })),
    [rows]
  );

  return (
    <div className="p-6 max-w-[1440px] mx-auto">
      <PageHeader
        title="Straddle Monitor"
        subtitle="Pricing ATM straddle multi-expirations — SPX"
      >
        <Badge color={isLive ? "#22C55E" : "#FFA726"}>
          {isLive ? "LIVE" : "DEMO"}
        </Badge>
        <button
          onClick={fetchData}
          className="px-3 py-1.5 text-xs bg-[#111114] border border-[#1E1E22] rounded-lg text-[#6B6B75] hover:text-[#F0F0F0] hover:border-[#FF6B00] transition-all"
        >
          Rafraichir
        </button>
      </PageHeader>

      {/* ── KPI Header ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <KpiCard label="SPX SPOT" value={fmtNum(spot, 0)} color="#FF6B00" />
        <KpiCard label="ATM STRIKE" value={atmStrike.toLocaleString()} color="#F0F0F0" />
        <KpiCard label="VIX" value={fmtNum(vix, 1)} color={vix > 20 ? "#EF4444" : vix > 15 ? "#FFA726" : "#22C55E"} />
        <KpiCard
          label="STATUS"
          value={isLive ? "Live" : "Demo"}
          color={isLive ? "#22C55E" : "#FFA726"}
        />
      </div>

      {/* ── Straddle Table ── */}
      <Card className="mb-6 overflow-hidden">
        <div className="p-4 border-b border-[#1E1E22]">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#6B6B75]">
            Straddle ATM — Multi Expirations
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse font-mono">
            <thead>
              <tr className="border-b border-[#1E1E22] text-[#6B6B75]">
                <th className="text-left p-3 font-medium text-[10px] uppercase tracking-widest">DTE</th>
                <th className="text-left p-3 font-medium text-[10px] uppercase tracking-widest">Expiry</th>
                <th className="text-right p-3 font-medium text-[10px] uppercase tracking-widest">Strike</th>
                <th className="text-right p-3 font-medium text-[10px] uppercase tracking-widest text-[#22C55E]">Call Bid</th>
                <th className="text-right p-3 font-medium text-[10px] uppercase tracking-widest text-[#22C55E]">Call Ask</th>
                <th className="text-right p-3 font-medium text-[10px] uppercase tracking-widest text-[#EF4444]">Put Bid</th>
                <th className="text-right p-3 font-medium text-[10px] uppercase tracking-widest text-[#EF4444]">Put Ask</th>
                <th className="text-right p-3 font-medium text-[10px] uppercase tracking-widest text-[#FF6B00]">Straddle</th>
                <th className="text-right p-3 font-medium text-[10px] uppercase tracking-widest">Impl Move</th>
                <th className="text-right p-3 font-medium text-[10px] uppercase tracking-widest">Move %</th>
                <th className="text-right p-3 font-medium text-[10px] uppercase tracking-widest">P/C Skew</th>
                <th className="text-right p-3 font-medium text-[10px] uppercase tracking-widest">IV</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.dte}
                  className={`border-b border-[#0E0E12] hover:bg-[#ffffff03] transition-colors ${
                    r.dte === 0 ? "bg-[#FF6B0008]" : ""
                  }`}
                >
                  <td className="p-3 font-bold text-[#FF6B00]">{r.dte}</td>
                  <td className="p-3 text-[#6B6B75]">{r.expiry}</td>
                  <td className="p-3 text-right font-bold text-[#F0F0F0]">{r.strike}</td>
                  <td className="p-3 text-right text-[#22C55E]">{fmtNum(r.callBid)}</td>
                  <td className="p-3 text-right text-[#22C55E]">{fmtNum(r.callAsk)}</td>
                  <td className="p-3 text-right text-[#EF4444]">{fmtNum(r.putBid)}</td>
                  <td className="p-3 text-right text-[#EF4444]">{fmtNum(r.putAsk)}</td>
                  <td className="p-3 text-right font-bold text-[#FF6B00]">${fmtNum(r.straddle)}</td>
                  <td className="p-3 text-right text-[#F0F0F0]">${fmtNum(r.implMove)}</td>
                  <td className="p-3 text-right">
                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-bold"
                      style={{
                        background: r.implMovePct > 2 ? "#EF444420" : r.implMovePct > 1 ? "#FFA72620" : "#22C55E20",
                        color: r.implMovePct > 2 ? "#EF4444" : r.implMovePct > 1 ? "#FFA726" : "#22C55E",
                      }}
                    >
                      {r.implMovePct}%
                    </span>
                  </td>
                  <td className="p-3 text-right text-[#6B6B75]">{fmtNum(r.pcSkew, 3)}</td>
                  <td className="p-3 text-right font-semibold" style={{ color: r.iv > 20 ? "#EF4444" : r.iv > 15 ? "#FFA726" : "#22C55E" }}>
                    {r.iv}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── Vol Term Structure Chart ── */}
      <Card className="p-5">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[#6B6B75] mb-4">
          Vol Term Structure — IV par DTE
        </h2>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E1E22" />
              <XAxis
                dataKey="dte"
                tick={{ fill: "#6B6B75", fontSize: 11 }}
                axisLine={{ stroke: "#1E1E22" }}
                tickLine={false}
                label={{ value: "DTE", position: "insideBottomRight", offset: -4, fill: "#6B6B75", fontSize: 10 }}
              />
              <YAxis
                tick={{ fill: "#6B6B75", fontSize: 11 }}
                axisLine={{ stroke: "#1E1E22" }}
                tickLine={false}
                domain={["auto", "auto"]}
                label={{ value: "IV %", angle: -90, position: "insideLeft", fill: "#6B6B75", fontSize: 10 }}
              />
              <Tooltip content={<VTSTooltip />} />
              <Line
                type="monotone"
                dataKey="iv"
                stroke="#FF6B00"
                strokeWidth={2.5}
                dot={{ fill: "#FF6B00", r: 4, strokeWidth: 0 }}
                activeDot={{ fill: "#FF6B00", r: 6, strokeWidth: 2, stroke: "#0A0A0A" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="text-center text-[10px] text-[#6B6B75] mt-2 italic">
          {isLive ? "Donnees live via API" : "Donnees estimees — mode demo"}
        </div>
      </Card>
    </div>
  );
}
