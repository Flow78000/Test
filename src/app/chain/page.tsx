"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { PageHeader, LiveBadge, Card, KpiCard, Badge } from "@/components/ui/card";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OptionContract {
  symbol: string;
  strike: number;
  type: "call" | "put";
  bid: number;
  ask: number;
  volume: number;
  open_interest: number;
  iv: number;
  delta: number;
  gamma: number;
  expiration: string;
}

interface GreekRow {
  strike: number;
  call_gex: number;
  put_gex: number;
  net_gex: number;
}

interface SpotExposure {
  call_wall: number;
  put_wall: number;
  gamma_flip: number;
  net_gex: number;
}

interface StrikeRow {
  strike: number;
  call?: OptionContract;
  put?: OptionContract;
  callGex: number;
  putGex: number;
  netGex: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const API = "http://localhost:3850";

function MarketStatus() {
  const now = new Date();
  const etHour = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" })).getHours();
  const etDay = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" })).getDay();
  const isWeekend = etDay === 0 || etDay === 6;
  const isOpen = !isWeekend && etHour >= 9 && etHour < 16;
  const isPremarket = !isWeekend && etHour >= 4 && etHour < 9;
  const isAfterHours = !isWeekend && etHour >= 16 && etHour < 20;

  const status = isOpen ? "MARCHE OUVERT" : isPremarket ? "PRE-MARKET" : isAfterHours ? "AFTER-HOURS" : isWeekend ? "WEEK-END — MARCHE FERME" : "MARCHE FERME";
  const color = isOpen ? "#22C55E" : isPremarket || isAfterHours ? "#FFA726" : "#EF4444";

  return (
    <span className="flex items-center gap-2 px-3 py-1 rounded-md text-[11px] font-semibold" style={{ background: `${color}15`, color, border: `1px solid ${color}33` }}>
      <span className={`w-2 h-2 rounded-full ${isOpen ? 'animate-pulse' : ''}`} style={{ background: color }} />
      {status}
      <span className="text-[9px] font-normal opacity-70">
        ({now.toLocaleTimeString("fr-FR", { timeZone: "America/New_York", hour: "2-digit", minute: "2-digit" })} ET)
      </span>
    </span>
  );
}

function parseOptionSymbol(sym: string): { strike: number; type: "call" | "put" } | null {
  // UW format: "SPX250409C05200000" => type C/P, strike = 05200.000
  if (!sym || sym.length < 15) return null;
  const typeChar = sym.match(/[CP]/)?.[0];
  if (!typeChar) return null;
  const idx = sym.indexOf(typeChar, 6);
  const rawStrike = sym.slice(idx + 1);
  const strike = parseInt(rawStrike, 10) / 1000;
  return { strike, type: typeChar === "C" ? "call" : "put" };
}

function generateUpcomingFridays(count = 8): string[] {
  const fridays: string[] = [];
  const d = new Date();
  // Move to next Friday
  d.setDate(d.getDate() + ((5 - d.getDay() + 7) % 7 || 7));
  // Actually include this week's Friday if today <= Friday
  const today = new Date();
  if (today.getDay() <= 5 && today.getDay() !== 0) {
    const thisFri = new Date(today);
    thisFri.setDate(today.getDate() + (5 - today.getDay()));
    if (thisFri >= today) {
      fridays.push(formatDate(thisFri));
    }
  }
  for (let i = 0; i < count; i++) {
    const fd = formatDate(d);
    if (!fridays.includes(fd)) fridays.push(fd);
    d.setDate(d.getDate() + 7);
  }
  return fridays.slice(0, count);
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function fmt(n: number | undefined, dec = 2): string {
  if (n == null || isNaN(n)) return "—";
  return n.toFixed(dec);
}

function fmtK(n: number | undefined): string {
  if (n == null || isNaN(n)) return "—";
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

function ivColor(iv: number, avg: number): string {
  if (!avg || !iv) return "#A0A0A8";
  const ratio = iv / avg;
  if (ratio > 1.25) return "#EF4444";
  if (ratio > 1.1) return "#FFA726";
  if (ratio < 0.75) return "#3B82F6";
  if (ratio < 0.9) return "#60A5FA";
  return "#A0A0A8";
}

/** Return delta marker label + color based on distance from ATM */
function getDeltaMarker(strikeIndex: number, atmIndex: number): { label: string; color: string } | null {
  const dist = Math.abs(strikeIndex - atmIndex);
  if (dist === 0) return { label: "\u039450", color: "#FF6B00" };
  if (dist >= 3 && dist <= 5) return { label: "\u039425", color: "#FFA726" };
  if (dist >= 8 && dist <= 12) return { label: "\u039410", color: "#6B6B75" };
  return null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const TICKERS = ["SPX", "SPY", "QQQ", "IWM", "AAPL", "NVDA", "TSLA"];
const STRIKE_COUNTS = [30, 50, 100, 200];
const VIEW_OPTIONS = ["Calls+Puts", "Calls Only", "Puts Only"] as const;
type ViewFilter = (typeof VIEW_OPTIONS)[number];

export default function ChainPage() {
  const [ticker, setTicker] = useState("SPX");
  const [expiry, setExpiry] = useState("");
  const [strikeCount, setStrikeCount] = useState(50);
  const [viewFilter, setViewFilter] = useState<ViewFilter>("Calls+Puts");
  const [contracts, setContracts] = useState<OptionContract[]>([]);
  const [greeks, setGreeks] = useState<GreekRow[]>([]);
  const [spot, setSpot] = useState<SpotExposure | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fridays = useMemo(() => generateUpcomingFridays(), []);

  useEffect(() => {
    if (!expiry && fridays.length) setExpiry(fridays[0]);
  }, [fridays, expiry]);

  const fetchData = useCallback(async () => {
    if (!expiry) return;
    setLoading(true);
    setError(false);
    try {
      const spotTicker = ticker === "SPX" ? "SPY" : ticker;
      const [chainResp, greekResp, spotResp] = await Promise.all([
        fetch(`${API}/api/uw/option-contracts?ticker=${ticker}&expiration=${expiry}`),
        fetch(`${API}/api/uw/greek-exposure/strike?ticker=${ticker}`),
        fetch(`${API}/api/uw/spot-exposures/strike?ticker=${spotTicker}`),
      ]);
      if (!chainResp.ok) throw new Error("chain");
      const chainJson = await chainResp.json();
      const greekJson = greekResp.ok ? await greekResp.json() : [];
      const spotJson = spotResp.ok ? await spotResp.json() : null;

      const raw: OptionContract[] = (chainJson?.data || chainJson || []).map((c: any) => {
        const parsed = parseOptionSymbol(c.symbol || c.option_symbol || "");
        return {
          symbol: c.symbol || c.option_symbol || "",
          strike: parsed?.strike ?? c.strike ?? 0,
          type: parsed?.type ?? (c.type?.toLowerCase() === "put" ? "put" : "call"),
          bid: c.bid ?? 0,
          ask: c.ask ?? 0,
          volume: c.volume ?? 0,
          open_interest: c.open_interest ?? c.oi ?? 0,
          iv: c.iv ?? c.implied_volatility ?? 0,
          delta: c.delta ?? 0,
          gamma: c.gamma ?? 0,
          expiration: c.expiration ?? expiry,
        };
      });

      setContracts(raw);
      setGreeks(Array.isArray(greekJson?.data || greekJson) ? (greekJson?.data || greekJson) : []);

      // Extract spot exposure levels — correct field names from UW API
      const spotData = spotJson?.data || spotJson;
      if (Array.isArray(spotData) && spotData.length) {
        let maxCallGex = { strike: 0, gex: -Infinity };
        let maxPutGex = { strike: 0, gex: Infinity };
        let totalNet = 0;
        let prevNet = 0;
        let flipStrike = 0;

        const sorted = [...spotData].sort((a: any, b: any) => parseFloat(a.strike) - parseFloat(b.strike));

        for (const row of sorted) {
          const strike = parseFloat(row.strike || 0);
          const callG = parseFloat(row.call_gamma_oi || 0);
          const putG = parseFloat(row.put_gamma_oi || 0);
          const net = callG + putG;
          totalNet += net;

          // Call Wall = strike with highest call gamma (most call OI)
          if (callG > maxCallGex.gex) maxCallGex = { strike, gex: callG };
          // Put Wall = strike with most negative put gamma (most put OI)
          if (putG < maxPutGex.gex) maxPutGex = { strike, gex: putG };
          // Gamma Flip = where net gamma changes sign
          if (prevNet * net < 0 && !flipStrike) flipStrike = strike;
          prevNet = net;
        }

        setSpot({
          call_wall: maxCallGex.strike,
          put_wall: maxPutGex.strike,
          gamma_flip: flipStrike || 0,
          net_gex: totalNet,
        });
      } else {
        setSpot(null);
      }
    } catch {
      setError(true);
      setContracts([]);
      setGreeks([]);
      setSpot(null);
    }
    setLoading(false);
  }, [ticker, expiry]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Build strike rows
  const rows: StrikeRow[] = useMemo(() => {
    const strikeMap = new Map<number, StrikeRow>();

    for (const c of contracts) {
      if (!c.strike) continue;
      if (!strikeMap.has(c.strike)) {
        strikeMap.set(c.strike, { strike: c.strike, callGex: 0, putGex: 0, netGex: 0 });
      }
      const row = strikeMap.get(c.strike)!;
      if (c.type === "call") row.call = c;
      else row.put = c;
    }

    // Merge greek data
    for (const g of greeks) {
      const row = strikeMap.get(g.strike);
      if (row) {
        row.callGex = g.call_gex ?? 0;
        row.putGex = g.put_gex ?? 0;
        row.netGex = g.net_gex ?? 0;
      }
    }

    const sorted = Array.from(strikeMap.values()).sort((a, b) => b.strike - a.strike);

    // Center around ATM and limit strike count
    if (sorted.length > strikeCount) {
      const mid = Math.floor(sorted.length / 2);
      const half = Math.floor(strikeCount / 2);
      return sorted.slice(Math.max(0, mid - half), mid + half);
    }
    return sorted;
  }, [contracts, greeks, strikeCount]);

  // Stats
  const stats = useMemo(() => {
    const calls = contracts.filter((c) => c.type === "call");
    const puts = contracts.filter((c) => c.type === "put");
    const avgIvC = calls.length ? calls.reduce((s, c) => s + c.iv, 0) / calls.length : 0;
    const avgIvP = puts.length ? puts.reduce((s, c) => s + c.iv, 0) / puts.length : 0;
    const totalCallVol = calls.reduce((s, c) => s + c.volume, 0);
    const totalPutVol = puts.reduce((s, c) => s + c.volume, 0);
    const pcRatio = totalCallVol ? totalPutVol / totalCallVol : 0;

    // ATM = strike closest to median
    const allStrikes = rows.map((r) => r.strike).sort((a, b) => a - b);
    const atm = allStrikes.length ? allStrikes[Math.floor(allStrikes.length / 2)] : 0;

    // VRP Estimate: (avgIvC + avgIvP) / 2 - 15% baseline HV
    const vrp = ((avgIvC + avgIvP) / 2) * 100 - 15;

    // Delta 25 Call: find the call strike closest to 0.25 delta
    let delta25Call = 0;
    let minDist25C = Infinity;
    for (const c of calls) {
      const dist = Math.abs(c.delta - 0.25);
      if (dist < minDist25C) { minDist25C = dist; delta25Call = c.strike; }
    }

    // Delta 25 Put: find the put strike closest to -0.25 delta
    let delta25Put = 0;
    let minDist25P = Infinity;
    for (const p of puts) {
      const dist = Math.abs(p.delta - (-0.25));
      if (dist < minDist25P) { minDist25P = dist; delta25Put = p.strike; }
    }

    // Max Pain: strike with the highest total OI (calls + puts)
    let maxPain = 0;
    let maxPainOI = 0;
    const oiByStrike = new Map<number, number>();
    for (const c of contracts) {
      const cur = oiByStrike.get(c.strike) || 0;
      oiByStrike.set(c.strike, cur + c.open_interest);
    }
    for (const [strike, oi] of oiByStrike) {
      if (oi > maxPainOI) { maxPainOI = oi; maxPain = strike; }
    }

    return { avgIvC, avgIvP, skew: avgIvP - avgIvC, pcRatio, atm, totalCallVol, totalPutVol, vrp, delta25Call, delta25Put, maxPain };
  }, [contracts, rows]);

  // ATM index for delta markers
  const atmIndex = useMemo(() => {
    const idx = rows.findIndex((r) => r.strike === stats.atm);
    return idx >= 0 ? idx : Math.floor(rows.length / 2);
  }, [rows, stats.atm]);

  // Max GEX for bar scaling
  const maxAbsGex = useMemo(() => {
    let m = 1;
    for (const r of rows) {
      m = Math.max(m, Math.abs(r.callGex), Math.abs(r.putGex));
    }
    return m;
  }, [rows]);

  const showCalls = viewFilter !== "Puts Only";
  const showPuts = viewFilter !== "Calls Only";

  // Selectors style
  const selCls =
    "bg-[#111114] border border-[#1E1E22] rounded-lg px-3 py-1.5 text-xs text-[#E0E0E5] focus:border-[#FF6B00] focus:outline-none transition-colors";

  return (
    <div className="p-6 min-h-screen bg-[#08080A] text-[#E0E0E5]">
      {/* Header */}
      <PageHeader title="Vol Desk Chain" subtitle="Options chain institutionnelle — GEX, Greeks par strike">
        <select value={ticker} onChange={(e) => setTicker(e.target.value)} className={selCls}>
          {TICKERS.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select value={expiry} onChange={(e) => setExpiry(e.target.value)} className={selCls}>
          {fridays.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
        <select value={strikeCount} onChange={(e) => setStrikeCount(+e.target.value)} className={selCls}>
          {STRIKE_COUNTS.map((n) => (
            <option key={n} value={n}>{n} strikes</option>
          ))}
        </select>
        <select value={viewFilter} onChange={(e) => setViewFilter(e.target.value as ViewFilter)} className={selCls}>
          {VIEW_OPTIONS.map((v) => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
        <button
          onClick={fetchData}
          className="px-3 py-1.5 bg-[#111114] border border-[#1E1E22] rounded-lg text-xs hover:border-[#FF6B00] transition-colors"
        >
          Rafraichir
        </button>
        <LiveBadge />
        <MarketStatus />
      </PageHeader>

      {/* Loading / Error */}
      {loading && !contracts.length ? (
        <Card className="p-12 text-center text-[#6B6B75]">Chargement...</Card>
      ) : error ? (
        <Card className="p-12 text-center text-[#6B6B75]">
          Lancez le serveur :{" "}
          <code className="bg-[#08080A] px-2 py-1 rounded text-[#FF6B00]">
            cd D:\flo-w\server && python main.py
          </code>
        </Card>
      ) : (
        <>
          {/* KPI Row 1 */}
          <div className="grid grid-cols-4 gap-3 mb-3">
            <KpiCard label="IV Moy Calls" value={fmt(stats.avgIvC * 100, 1) + "%"} color="#22C55E" />
            <KpiCard label="IV Moy Puts" value={fmt(stats.avgIvP * 100, 1) + "%"} color="#EF4444" />
            <KpiCard label="Skew P-C" value={fmt(stats.skew * 100, 2)} color="#FFA726" />
            <KpiCard label="P/C Ratio" value={fmt(stats.pcRatio, 2)} color={stats.pcRatio > 1 ? "#EF4444" : "#22C55E"} />
          </div>

          {/* KPI Row 2 */}
          <div className="grid grid-cols-4 gap-3 mb-4">
            <KpiCard label="VRP Estimate" value={fmt(stats.vrp, 1) + "%"} color={stats.vrp > 0 ? "#22C55E" : "#EF4444"} />
            <KpiCard label="Delta 25 Call" value={stats.delta25Call ? stats.delta25Call.toLocaleString() : "—"} color="#22C55E" />
            <KpiCard label="Delta 25 Put" value={stats.delta25Put ? stats.delta25Put.toLocaleString() : "—"} color="#EF4444" />
            <KpiCard label="Max Pain" value={stats.maxPain ? stats.maxPain.toLocaleString() : "—"} color="#FF6B00" />
          </div>

          {/* GEX Level Cards */}
          {spot && (
            <div className="grid grid-cols-4 gap-3 mb-4">
              <Card className="p-3 text-center">
                <div className="text-[10px] text-[#6B6B75] uppercase tracking-widest mb-1">Call Wall</div>
                <div className="text-lg font-extrabold font-mono text-[#22C55E]">{spot.call_wall.toLocaleString()}</div>
              </Card>
              <Card className="p-3 text-center">
                <div className="text-[10px] text-[#6B6B75] uppercase tracking-widest mb-1">Put Wall</div>
                <div className="text-lg font-extrabold font-mono text-[#EF4444]">{spot.put_wall.toLocaleString()}</div>
              </Card>
              <Card className="p-3 text-center">
                <div className="text-[10px] text-[#6B6B75] uppercase tracking-widest mb-1">Gamma Flip</div>
                <div className="text-lg font-extrabold font-mono text-[#FFA726]">{spot.gamma_flip.toLocaleString()}</div>
              </Card>
              <Card className="p-3 text-center">
                <div className="text-[10px] text-[#6B6B75] uppercase tracking-widest mb-1">Net GEX</div>
                <div className={`text-lg font-extrabold font-mono ${spot.net_gex >= 0 ? "text-[#22C55E]" : "text-[#EF4444]"}`}>
                  {fmtK(spot.net_gex)}
                </div>
                <Badge color={spot.net_gex >= 0 ? "#22C55E" : "#EF4444"}>
                  {spot.net_gex >= 0 ? "Positive Gamma" : "Negative Gamma"}
                </Badge>
              </Card>
            </div>
          )}

          {/* Chain Table */}
          <Card className="overflow-x-auto">
            <table className="w-full text-[11px] font-mono border-collapse">
              <thead>
                <tr className="text-[#6B6B75] uppercase tracking-wider text-[10px]">
                  {showCalls && (
                    <>
                      <th className="px-1 py-2 text-right">GEX</th>
                      <th className="px-1 py-2 text-right">IV%</th>
                      <th className="px-1 py-2 text-right">Delta</th>
                      <th className="px-1 py-2 text-right">Gamma</th>
                      <th className="px-1 py-2 text-right">Bid</th>
                      <th className="px-1 py-2 text-right">Ask</th>
                      <th className="px-1 py-2 text-right">Vol</th>
                      <th className="px-1 py-2 text-right">OI</th>
                    </>
                  )}
                  <th className="px-2 py-2 text-center bg-[#1A1A1E] font-bold text-[#FF6B00]">Strike</th>
                  {showPuts && (
                    <>
                      <th className="px-1 py-2 text-right">OI</th>
                      <th className="px-1 py-2 text-right">Vol</th>
                      <th className="px-1 py-2 text-right">Bid</th>
                      <th className="px-1 py-2 text-right">Ask</th>
                      <th className="px-1 py-2 text-right">Gamma</th>
                      <th className="px-1 py-2 text-right">Delta</th>
                      <th className="px-1 py-2 text-right">IV%</th>
                      <th className="px-1 py-2 text-right">GEX</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIdx) => {
                  const isAtm = row.strike === stats.atm;
                  const c = row.call;
                  const p = row.put;
                  const callVolSpike = c && c.open_interest > 0 && c.volume > 2 * c.open_interest;
                  const putVolSpike = p && p.open_interest > 0 && p.volume > 2 * p.open_interest;
                  const deltaMarker = getDeltaMarker(rowIdx, atmIndex);

                  return (
                    <tr
                      key={row.strike}
                      className={`border-t border-[#1E1E22] hover:bg-[#16161A] transition-colors ${
                        isAtm ? "bg-[#FF6B00]/10 border-l-2 border-l-[#FF6B00]" : ""
                      }`}
                    >
                      {/* CALLS side */}
                      {showCalls && (
                        <>
                          {/* GEX Bar */}
                          <td className="px-1 py-1 w-20">
                            <div className="flex items-center justify-end gap-1">
                              <div className="w-14 h-3 bg-[#1A1A1E] rounded overflow-hidden relative">
                                <div
                                  className="absolute top-0 right-0 h-full rounded"
                                  style={{
                                    width: `${Math.min(100, (Math.abs(row.callGex) / maxAbsGex) * 100)}%`,
                                    backgroundColor: row.callGex >= 0 ? "#22C55E" : "#EF4444",
                                    opacity: 0.7,
                                  }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-1 py-1 text-right" style={{ color: ivColor(c?.iv ?? 0, stats.avgIvC) }}>
                            {c ? fmt(c.iv * 100, 1) : "—"}
                          </td>
                          <td className="px-1 py-1 text-right text-[#A0A0A8]">{c ? fmt(c.delta, 3) : "—"}</td>
                          <td className="px-1 py-1 text-right text-[#A0A0A8]">{c ? fmt(c.gamma, 4) : "—"}</td>
                          <td className="px-1 py-1 text-right text-[#22C55E]">{c ? fmt(c.bid) : "—"}</td>
                          <td className="px-1 py-1 text-right text-[#EF4444]">{c ? fmt(c.ask) : "—"}</td>
                          <td className={`px-1 py-1 text-right ${callVolSpike ? "text-[#FF6B00] font-bold" : "text-[#A0A0A8]"}`}>
                            {c ? fmtK(c.volume) : "—"}
                          </td>
                          <td className="px-1 py-1 text-right text-[#6B6B75]">{c ? fmtK(c.open_interest) : "—"}</td>
                        </>
                      )}

                      {/* STRIKE + Delta Marker */}
                      <td
                        className={`px-2 py-1 text-center font-bold bg-[#1A1A1E] ${
                          isAtm ? "text-[#FF6B00] text-sm" : "text-[#E0E0E5]"
                        }`}
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          {deltaMarker && (
                            <span
                              className="text-[8px] font-semibold px-1 py-0.5 rounded"
                              style={{ color: deltaMarker.color, backgroundColor: `${deltaMarker.color}15` }}
                            >
                              {deltaMarker.label}
                            </span>
                          )}
                          <span>{row.strike.toLocaleString()}</span>
                        </div>
                      </td>

                      {/* PUTS side */}
                      {showPuts && (
                        <>
                          <td className="px-1 py-1 text-right text-[#6B6B75]">{p ? fmtK(p.open_interest) : "—"}</td>
                          <td className={`px-1 py-1 text-right ${putVolSpike ? "text-[#FF6B00] font-bold" : "text-[#A0A0A8]"}`}>
                            {p ? fmtK(p.volume) : "—"}
                          </td>
                          <td className="px-1 py-1 text-right text-[#22C55E]">{p ? fmt(p.bid) : "—"}</td>
                          <td className="px-1 py-1 text-right text-[#EF4444]">{p ? fmt(p.ask) : "—"}</td>
                          <td className="px-1 py-1 text-right text-[#A0A0A8]">{p ? fmt(p.gamma, 4) : "—"}</td>
                          <td className="px-1 py-1 text-right text-[#A0A0A8]">{p ? fmt(p.delta, 3) : "—"}</td>
                          <td className="px-1 py-1 text-right" style={{ color: ivColor(p?.iv ?? 0, stats.avgIvP) }}>
                            {p ? fmt(p.iv * 100, 1) : "—"}
                          </td>
                          {/* GEX Bar */}
                          <td className="px-1 py-1 w-20">
                            <div className="flex items-center gap-1">
                              <div className="w-14 h-3 bg-[#1A1A1E] rounded overflow-hidden relative">
                                <div
                                  className="absolute top-0 left-0 h-full rounded"
                                  style={{
                                    width: `${Math.min(100, (Math.abs(row.putGex) / maxAbsGex) * 100)}%`,
                                    backgroundColor: row.putGex >= 0 ? "#22C55E" : "#EF4444",
                                    opacity: 0.7,
                                  }}
                                />
                              </div>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={showCalls && showPuts ? 17 : 9} className="text-center py-8 text-[#6B6B75]">
                      Aucune donnee pour {ticker} — {expiry}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  );
}
