"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { PageHeader, LiveBadge, Card, Badge, KpiCard } from "@/components/ui/card";

const API = "http://localhost:3850";
const DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven"];

function fmtCap(n: number): string {
  if (!n) return "--";
  if (n >= 1e12) return (n / 1e12).toFixed(1) + "T";
  if (n >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(0) + "M";
  return n.toLocaleString();
}

function weekStart(offset: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay() + 1 + offset * 7);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

interface Earning {
  ticker: string;
  name?: string;
  sector?: string;
  expected_move?: number;
  eps_estimate?: number;
  market_cap?: number;
  time?: string;
  is_sp500?: boolean;
  date?: string;
}

export default function EarningsPage() {
  const [pre, setPre] = useState<Earning[]>([]);
  const [post, setPost] = useState<Earning[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [weekOffset, setWeekOffset] = useState(0);
  const [sp500Only, setSp500Only] = useState(false);
  const [sortBy, setSortBy] = useState<"cap" | "move" | "time">("cap");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [pRes, aRes] = await Promise.all([
        fetch(`${API}/api/uw/earnings/premarket`).then(r => r.json()),
        fetch(`${API}/api/uw/earnings/afterhours`).then(r => r.json()),
      ]);
      const mapEarning = (e: any): Earning => ({
        ticker: e.symbol || e.ticker || "",
        name: e.full_name || e.name || "",
        sector: e.sector || "",
        expected_move: e.expected_move_perc ? parseFloat(e.expected_move_perc) * 100 : (e.expected_move ? parseFloat(e.expected_move) : undefined),
        eps_estimate: e.street_mean_est ? parseFloat(e.street_mean_est) : undefined,
        market_cap: e.marketcap ? parseFloat(e.marketcap) : undefined,
        time: e.report_time || "",
        is_sp500: e.is_s_p_500 || e.is_sp500 || false,
        date: e.report_date || e.date || "",
      });
      const pData = Array.isArray(pRes) ? pRes : pRes?.data ?? [];
      const aData = Array.isArray(aRes) ? aRes : aRes?.data ?? [];
      setPre(pData.map(mapEarning));
      setPost(aData.map(mapEarning));
    } catch (e: any) { setError(e.message || "Serveur indisponible"); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const all = useMemo(() => {
    const merged = [
      ...pre.map(e => ({ ...e, session: "PRE" })),
      ...post.map(e => ({ ...e, session: "POST" })),
    ];
    let filtered = sp500Only ? merged.filter(e => e.is_sp500) : merged;
    filtered.sort((a, b) => {
      if (sortBy === "cap") return (b.market_cap || 0) - (a.market_cap || 0);
      if (sortBy === "move") return (b.expected_move || 0) - (a.expected_move || 0);
      return (a.session === "PRE" ? 0 : 1) - (b.session === "PRE" ? 0 : 1);
    });
    return filtered;
  }, [pre, post, sp500Only, sortBy]);

  const ws = weekStart(weekOffset);
  const weekDates = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(ws);
    d.setDate(d.getDate() + i);
    return isoDate(d);
  });

  const byDay = weekDates.map(date => all.filter(e => e.date === date));
  const totalCount = all.length;
  const sp500Count = all.filter(e => e.is_sp500).length;
  const totalCap = all.reduce((s, e) => s + (e.market_cap || 0), 0);
  const maxMove = all.reduce((m, e) => Math.max(m, e.expected_move || 0), 0);

  if (loading) return (
    <div className="p-6">
      <PageHeader title="Resultats Financiers" subtitle="Calendrier des earnings" />
      <div className="text-center py-20 text-[#6B6B75]">Chargement...</div>
    </div>
  );

  if (error) return (
    <div className="p-6">
      <PageHeader title="Resultats Financiers" subtitle="Calendrier des earnings" />
      <Card className="p-8 text-center text-red-400">{error}</Card>
    </div>
  );

  return (
    <div className="p-6">
      <PageHeader title="Resultats Financiers" subtitle="Calendrier des earnings et surprises de resultats">
        <label className="flex items-center gap-2 text-xs text-[#6B6B75] cursor-pointer">
          <input type="checkbox" checked={sp500Only} onChange={e => setSp500Only(e.target.checked)} className="accent-[#FF6B00]" />
          S&P 500
        </label>
        <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} className="bg-[#111114] border border-[#1E1E22] rounded-lg px-3 py-1.5 text-xs text-white">
          <option value="cap">Market Cap</option>
          <option value="move">Expected Move</option>
          <option value="time">Session</option>
        </select>
        <LiveBadge />
      </PageHeader>

      {/* Weekly summary */}
      <div className="grid grid-cols-4 gap-4 mb-4">
        <KpiCard label="Total" value={totalCount} color="#FF6B00" />
        <KpiCard label="S&P 500" value={sp500Count} color="#AB47BC" />
        <KpiCard label="Market Cap" value={fmtCap(totalCap)} color="#FFD600" />
        <KpiCard label="Max Move" value={maxMove ? maxMove.toFixed(1) + "%" : "--"} color="#EF4444" />
      </div>

      {/* Week nav */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => setWeekOffset(w => w - 1)} className="px-3 py-1.5 bg-[#111114] border border-[#1E1E22] rounded-lg text-xs hover:border-[#FF6B00] transition-colors">Sem. prec.</button>
        <button onClick={() => setWeekOffset(0)} className="px-3 py-1.5 bg-[#111114] border border-[#1E1E22] rounded-lg text-xs hover:border-[#FF6B00] transition-colors">Cette sem.</button>
        <button onClick={() => setWeekOffset(w => w + 1)} className="px-3 py-1.5 bg-[#111114] border border-[#1E1E22] rounded-lg text-xs hover:border-[#FF6B00] transition-colors">Sem. suiv.</button>
        <span className="text-xs text-[#6B6B75] ml-2">{weekDates[0]} au {weekDates[4]}</span>
      </div>

      {/* 5-column grid */}
      <div className="grid grid-cols-5 gap-3">
        {weekDates.map((date, di) => (
          <div key={date}>
            <div className="text-xs text-[#6B6B75] uppercase tracking-wider mb-2 text-center">{DAYS[di]} {date.slice(5)}</div>
            <div className="space-y-2">
              {byDay[di].length === 0 ? (
                <Card className="p-3 text-center text-[10px] text-[#6B6B75]">Aucun</Card>
              ) : byDay[di].map((e: any, i: number) => (
                <Card key={i} className={"p-3" + (e.is_sp500 ? " border-[#FF6B00]/30" : "")} hover>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-sm font-bold text-[#FF6B00]">{e.ticker}</span>
                    <Badge color={e.session === "PRE" ? "#42A5F5" : "#AB47BC"}>{e.session}</Badge>
                  </div>
                  {e.name && <div className="text-[10px] text-[#6B6B75] truncate">{e.name}</div>}
                  {e.sector && <Badge color="#6B6B75" className="mt-1">{e.sector}</Badge>}
                  <div className="flex items-center gap-2 mt-1.5 text-[10px]">
                    {e.expected_move != null && <span className="text-[#FFB300]">{e.expected_move.toFixed(1)}%</span>}
                    {e.eps_estimate != null && <span className="text-[#6B6B75]">EPS: {e.eps_estimate}</span>}
                  </div>
                  {e.market_cap != null && <div className="text-[10px] text-[#6B6B75] mt-0.5">{fmtCap(e.market_cap)}</div>}
                  {e.is_sp500 && <span className="text-[8px] text-[#FF6B00] font-semibold">S&P 500</span>}
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
