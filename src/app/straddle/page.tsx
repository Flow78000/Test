"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, PageHeader, Badge, KpiCard } from "@/components/ui/card";
import { RefreshTimer } from "@/components/ui/refresh-timer";
import { useVisiblePolling } from "@/hooks/use-visible-polling";
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

/* ── Vol Term Structure chart tooltip ── */
function VTSTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: StraddleRow }> }) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-[#111114] border border-[#1E1E22] rounded-lg p-3 text-xs shadow-lg">
      <div className="text-[#FF6B00] font-bold mb-1">{d.dte}DTE — {d.expiry}</div>
      <div className="text-[#6B6B75]">IV: <span className="text-[#F0F0F0] font-semibold">{d.iv}%</span></div>
      <div className="text-[#6B6B75]">Straddle: <span className="text-[#F0F0F0] font-semibold">${d.straddle}</span></div>
      <div className="text-[#6B6B75]">Impl Move: <span className="text-[#F0F0F0] font-semibold">{d.implMovePct}%</span></div>
    </div>
  );
}

function fmtDate(dateStr: string): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "2-digit" });
  } catch {
    return dateStr;
  }
}

export default function StraddlePage() {
  const [spot, setSpot] = useState(0);
  const [vix, setVix] = useState(0);
  const [ivRank, setIvRank] = useState(0);
  const [isLive, setIsLive] = useState(false);
  const [rows, setRows] = useState<StraddleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [ticker, setTicker] = useState("SPX");
  const [updatedAt, setUpdatedAt] = useState("");

  const atmStrike = useMemo(() => (spot ? Math.round(spot / 5) * 5 : 0), [spot]);

  const fetchData = useCallback(async () => {
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/uw/straddle?ticker=${ticker}`, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const json = await res.json();

      if (json.error) {
        setError(json.error);
        setIsLive(false);
        return;
      }

      setSpot(json.spot || 0);
      setVix(json.vix || 0);
      setIvRank(json.iv_rank || 0);
      setIsLive(json.is_live || false);
      setUpdatedAt(json.updated_at || "");

      const liveRows: StraddleRow[] = (json.rows || []).map((r: any) => ({
        ...r,
        expiry: fmtDate(r.expiry),
      }));
      setRows(liveRows);
    } catch (e: any) {
      setError(e.message || "Erreur serveur");
      setIsLive(false);
    } finally {
      setLoading(false);
    }
  }, [ticker]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useVisiblePolling(fetchData, 10000);

  /* ── Vol term structure data for chart ── */
  const chartData = useMemo(
    () => rows.map((r) => ({ dte: r.dte, iv: r.iv, label: `${r.dte}D` })),
    [rows]
  );

  const TICKERS = ["SPX", "SPY", "QQQ", "IWM"];

  return (
    <div className="p-6 max-w-[1440px] mx-auto">
      <PageHeader
        timer={<RefreshTimer intervalSeconds={10} />}
        title="Straddle Monitor"
        subtitle={`Pricing ATM straddle multi-expirations — ${ticker}`}
      >
        <select
          value={ticker}
          onChange={(e) => setTicker(e.target.value)}
          className="bg-[#111114] border border-[#1E1E22] rounded-lg px-3 py-1.5 text-xs text-white focus:border-[#FF6B00] focus:outline-none"
        >
          {TICKERS.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <Badge color={isLive ? "#22C55E" : "#FFA726"}>
          {isLive ? "LIVE" : "DEMO"}
        </Badge>
        <button
          onClick={fetchData}
          className="px-3 py-1.5 text-xs bg-[#111114] border border-[#1E1E22] rounded-lg text-[#6B6B75] hover:text-[#F0F0F0] hover:border-[#FF6B00] transition-all"
        >
          Rafraichir
        </button>
        {updatedAt && (
          <span className="text-[9px] text-[#6B6B75] font-mono">
            MAJ: {new Date(updatedAt).toLocaleTimeString("fr-FR")}
          </span>
        )}
      </PageHeader>

      {/* Error */}
      {error && (
        <Card className="p-4 mb-4 border-red-500/30">
          <div className="text-red-400 text-sm">{error}</div>
        </Card>
      )}

      {/* ── KPI Header ── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
        <KpiCard label={`${ticker} SPOT`} value={spot ? fmtNum(spot, 2) : "—"} color="#FF6B00" />
        <KpiCard label="ATM STRIKE" value={atmStrike ? atmStrike.toLocaleString() : "—"} color="#F0F0F0" />
        <KpiCard label="VIX" value={vix ? fmtNum(vix, 1) : "—"} color={vix > 25 ? "#EF4444" : vix > 18 ? "#FFA726" : "#22C55E"} />
        <KpiCard label="IV RANK 1Y" value={ivRank ? fmtNum(ivRank, 1) + "%" : "—"} color={ivRank > 50 ? "#EF4444" : ivRank > 30 ? "#FFA726" : "#22C55E"} />
        <KpiCard
          label="STATUS"
          value={isLive ? "Live" : loading ? "..." : "Offline"}
          color={isLive ? "#22C55E" : "#FFA726"}
        />
      </div>

      {/* Loading */}
      {loading && !rows.length && (
        <Card className="p-12 text-center text-[#6B6B75]">Chargement des donnees UW...</Card>
      )}

      {/* ── Straddle Table ── */}
      {rows.length > 0 && (
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
      )}

      {/* ── Vol Term Structure Chart ── */}
      {chartData.length > 0 && (
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
            {isLive ? "Donnees live UW API" : "En attente de donnees..."}
          </div>
        </Card>
      )}
    </div>
  );
}
