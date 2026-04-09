"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { PageHeader, LiveBadge, Card, Badge, KpiCard } from "@/components/ui/card";
import { fmtNum } from "@/lib/format";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from "recharts";

const API = "http://localhost:3850";
const DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven"];

function fmtCap(n: number): string {
  if (!n) return "--";
  if (n >= 1e12) return (n / 1e12).toFixed(1) + "T";
  if (n >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(0) + "M";
  return n.toLocaleString();
}

/* ── Expected Move Cone — full-width, properly scaled ── */
function ExpectedMoveCone({ move, ticker, price }: { move: number; ticker: string; price?: number }) {
  if (!move || move <= 0) return null;

  const color = move > 8 ? "#EF4444" : move > 5 ? "#FFA726" : "#FFB300";
  const maxPct = Math.min(move, 20);
  const barWidth = (maxPct / 20) * 100; // percentage width of bars

  // Calculate price range if price available
  const upper = price ? (price * (1 + move / 100)).toFixed(1) : null;
  const lower = price ? (price * (1 - move / 100)).toFixed(1) : null;

  return (
    <div className="mt-2 rounded-lg overflow-hidden" style={{ backgroundColor: "#08080A" }}>
      {/* Upper bar (+EM) */}
      <div className="flex items-center h-5 px-2 gap-1">
        <div className="h-2.5 rounded-r-sm" style={{ width: `${barWidth}%`, backgroundColor: `${color}40`, borderRight: `2px solid ${color}` }} />
        <span className="text-[9px] font-mono font-bold flex-shrink-0" style={{ color }}>+{move.toFixed(1)}%</span>
        {upper && <span className="text-[8px] text-[#555] font-mono ml-auto">{upper}</span>}
      </div>
      {/* Center (spot) */}
      <div className="flex items-center h-4 px-2 border-y border-[#1E1E22]">
        <div className="w-2 h-2 rounded-full bg-[#FF6B00] mr-1.5" />
        <span className="text-[8px] font-mono text-[#FF6B00] font-bold">{ticker}</span>
        {price && <span className="text-[8px] text-[#6B6B75] font-mono ml-auto">${price.toFixed(0)}</span>}
      </div>
      {/* Lower bar (-EM) */}
      <div className="flex items-center h-5 px-2 gap-1">
        <div className="h-2.5 rounded-r-sm" style={{ width: `${barWidth}%`, backgroundColor: `${color}40`, borderRight: `2px solid ${color}` }} />
        <span className="text-[9px] font-mono font-bold flex-shrink-0" style={{ color }}>-{move.toFixed(1)}%</span>
        {lower && <span className="text-[8px] text-[#555] font-mono ml-auto">{lower}</span>}
      </div>
    </div>
  );
}

/* ── Dividend Badge ── */
function DividendBadge({ divYield, exDate, hasOptions }: { divYield?: number; exDate?: string; hasOptions?: boolean }) {
  if (!divYield && !exDate) return null;
  return (
    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
      {divYield != null && divYield > 0 && (
        <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/20">
          DIV {divYield.toFixed(2)}%
        </span>
      )}
      {exDate && (
        <span className="text-[8px] text-[#6B6B75]">Ex: {exDate}</span>
      )}
      {hasOptions && divYield != null && divYield > 0 && (
        <span className="px-1.5 py-0.5 rounded text-[8px] bg-[#AB47BC]/10 text-[#AB47BC] border border-[#AB47BC]/20"
          title="Le dividende impacte le prix des options: puts augmentent, calls diminuent a l'approche de l'ex-date">
          OPT IMPACT
        </span>
      )}
    </div>
  );
}

function dailyImpactLabel(sp500Count: number): { label: string; color: string } {
  if (sp500Count >= 5) return { label: "FORT", color: "#EF4444" };
  if (sp500Count >= 2) return { label: "MOYEN", color: "#FFB300" };
  return { label: "FAIBLE", color: "#6B6B75" };
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
  is_ndx?: boolean;
  date?: string;
  has_options?: boolean;
  div_yield?: number;
  div_ex_date?: string;
  price?: number;
}

/* ── Earning Card with Accordion ── */
function EarningCard({ earning: e }: { earning: any }) {
  const [open, setOpen] = useState(false);
  const hasEM = e.expected_move != null && e.expected_move > 0;

  return (
    <Card className={"overflow-hidden" + (e.is_sp500 ? " border-[#FF6B00]/30" : "")} hover>
      {/* Clickable header */}
      <div className="p-3 cursor-pointer" onClick={() => hasEM && setOpen(!open)}>
        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
          <span className="text-sm font-bold text-[#FF6B00]">{e.ticker}</span>
          <Badge color={e.session === "PRE" ? "#42A5F5" : "#AB47BC"}>{e.session}</Badge>
          {e.is_sp500 && (
            <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-[#FF6B00]/15 text-[#FF6B00] border border-[#FF6B00]/30">SPX</span>
          )}
          {e.is_ndx && (
            <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-[#42A5F5]/15 text-[#42A5F5] border border-[#42A5F5]/30">NDX</span>
          )}
          {hasEM && (
            <span className="ml-auto text-[10px] text-[#6B6B75] transition-transform" style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>
              ▼
            </span>
          )}
        </div>
        {e.name && <div className="text-[10px] text-[#6B6B75] truncate">{e.name}</div>}
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {e.sector && <Badge color="#6B6B75">{e.sector}</Badge>}
          {hasEM && (
            <span className="text-[10px] font-mono font-bold text-[#FFB300]">EM: ±{e.expected_move.toFixed(1)}%</span>
          )}
          {e.eps_estimate != null && <span className="text-[10px] text-[#6B6B75]">EPS: {e.eps_estimate}</span>}
          {e.market_cap != null && <span className="text-[10px] text-[#6B6B75]">{fmtCap(e.market_cap)}</span>}
        </div>
        <DividendBadge divYield={e.div_yield} exDate={e.div_ex_date} hasOptions={e.has_options} />
      </div>

      {/* Accordion content — Expected Move details */}
      {open && hasEM && (
        <div className="px-3 pb-3 border-t border-[#1E1E22]">
          <ExpectedMoveCone move={e.expected_move} ticker={e.ticker} price={e.price} />
          {e.price && (
            <div className="mt-2 grid grid-cols-2 gap-1 text-[9px]">
              <div className="bg-[#08080A] rounded p-1.5 text-center">
                <div className="text-[#6B6B75]">Range haut</div>
                <div className="font-mono font-bold text-[#22C55E]">${(e.price * (1 + e.expected_move / 100)).toFixed(1)}</div>
              </div>
              <div className="bg-[#08080A] rounded p-1.5 text-center">
                <div className="text-[#6B6B75]">Range bas</div>
                <div className="font-mono font-bold text-[#EF4444]">${(e.price * (1 - e.expected_move / 100)).toFixed(1)}</div>
              </div>
            </div>
          )}
          {e.div_yield != null && e.div_yield > 0 && e.has_options && (
            <div className="mt-2 bg-[#AB47BC10] rounded p-2 text-[9px] text-[#AB47BC] border border-[#AB47BC20]">
              Impact dividende sur options : les puts augmentent et les calls diminuent a l'approche de l'ex-date.
              Div yield: {e.div_yield.toFixed(2)}%
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

export default function EarningsPage() {
  const [pre, setPre] = useState<Earning[]>([]);
  const [post, setPost] = useState<Earning[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [weekOffset, setWeekOffset] = useState(0);
  const [sp500Only, setSp500Only] = useState(false);
  const [sortBy, setSortBy] = useState<"cap" | "move" | "time">("cap");

  const weekDays = useMemo(() => {
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7) + weekOffset * 7);
    return Array.from({ length: 5 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d.toISOString().slice(0, 10);
    });
  }, [weekOffset]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const mapEarning = (e: any): Earning => {
        const sector = (e.sector || "").toLowerCase();
        const isTech = sector.includes("technolog") || sector.includes("communication");
        return {
          ticker: e.symbol || e.ticker || "",
          name: e.full_name || e.name || "",
          sector: e.sector || "",
          expected_move: e.expected_move_perc ? parseFloat(e.expected_move_perc) * 100 : (e.expected_move ? parseFloat(e.expected_move) : undefined),
          eps_estimate: e.street_mean_est ? parseFloat(e.street_mean_est) : undefined,
          market_cap: e.marketcap ? parseFloat(e.marketcap) : undefined,
          time: e.report_time || "",
          is_sp500: e.is_s_p_500 || e.is_sp500 || false,
          is_ndx: isTech && (e.is_s_p_500 || e.is_sp500 || false), // Approximate NDX membership
          date: e.report_date || e.date || "",
          has_options: e.has_options !== false, // Default true for most listed stocks
          div_yield: e.div_yield ? parseFloat(e.div_yield) : undefined,
          div_ex_date: e.ex_date || e.div_ex_date || undefined,
          price: e.pre_earnings_close ? parseFloat(e.pre_earnings_close) : (e.last_price ? parseFloat(e.last_price) : (e.close ? parseFloat(e.close) : undefined)),
        };
      };

      const allPre: Earning[] = [];
      const allPost: Earning[] = [];

      const fetches = weekDays.flatMap(date => [
        fetch(`${API}/api/uw/earnings/premarket?date=${date}`).then(r => r.json()).then(json => {
          const items = Array.isArray(json) ? json : json?.data ?? [];
          items.forEach((e: any) => allPre.push(mapEarning(e)));
        }).catch(() => {}),
        fetch(`${API}/api/uw/earnings/afterhours?date=${date}`).then(r => r.json()).then(json => {
          const items = Array.isArray(json) ? json : json?.data ?? [];
          items.forEach((e: any) => allPost.push(mapEarning(e)));
        }).catch(() => {}),
      ]);

      await Promise.all(fetches);

      // Fetch dividend data from TWS for all tickers
      const allTickers = [...new Set([...allPre, ...allPost].map(e => e.ticker).filter(Boolean))];
      if (allTickers.length > 0) {
        try {
          const divRes = await fetch(`${API}/api/market/dividends?tickers=${allTickers.join(",")}`).then(r => r.json());
          if (divRes && typeof divRes === "object") {
            const enrichWithDiv = (earning: Earning): Earning => {
              const div = divRes[earning.ticker];
              if (div) {
                return {
                  ...earning,
                  div_yield: div.div_yield ?? earning.div_yield,
                  div_ex_date: div.ex_date ?? earning.div_ex_date,
                  has_options: div.has_options ?? earning.has_options,
                  price: div.price ?? earning.price,
                };
              }
              return earning;
            };
            allPre.forEach((e, i) => { allPre[i] = enrichWithDiv(e); });
            allPost.forEach((e, i) => { allPost[i] = enrichWithDiv(e); });
          }
        } catch { /* TWS may not be connected — continue without div data */ }
      }

      // Also use pre_earnings_close as price if available from UW
      allPre.forEach((e, i) => {
        if (!e.price) allPre[i] = { ...e, price: undefined };
      });

      setPre([...allPre]);
      setPost([...allPost]);
    } catch (e: any) { setError(e.message || "Serveur indisponible"); }
    setLoading(false);
  }, [weekDays]);

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

  const byDay = weekDays.map(date => all.filter(e => e.date === date));
  const totalCount = all.length;
  const sp500Count = all.filter(e => e.is_sp500).length;
  const ndxCount = all.filter(e => e.is_ndx).length;
  const totalCap = all.reduce((s, e) => s + (e.market_cap || 0), 0);
  const maxMove = all.reduce((m, e) => Math.max(m, e.expected_move || 0), 0);
  const divCount = all.filter(e => e.div_yield && e.div_yield > 0).length;

  // Index weight chart data — SPX & NDX weight by day
  const weightChartData = weekDays.map((date, di) => {
    const dayItems = byDay[di];
    const sp500Day = dayItems.filter(e => e.is_sp500);
    const ndxDay = dayItems.filter(e => e.is_ndx);
    const sp500Cap = sp500Day.reduce((s, e) => s + (e.market_cap || 0), 0);
    const ndxCap = ndxDay.reduce((s, e) => s + (e.market_cap || 0), 0);
    return {
      day: `${DAYS[di]} ${date.slice(5)}`,
      sp500: sp500Day.length,
      ndx: ndxDay.length,
      sp500Cap,
      ndxCap,
      total: dayItems.length,
    };
  });

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
      <PageHeader title="Resultats Financiers" subtitle="Calendrier earnings, expected moves et impact dividendes">
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

      {/* Weekly KPIs */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-4">
        <KpiCard label="Total" value={totalCount} color="#FF6B00" />
        <KpiCard label="S&P 500" value={sp500Count} color="#AB47BC" />
        <KpiCard label="NDX / Tech" value={ndxCount} color="#42A5F5" />
        <KpiCard label="Market Cap" value={fmtCap(totalCap)} color="#FFD600" />
        <KpiCard label="Max EM" value={maxMove ? `±${maxMove.toFixed(1)}%` : "--"} color="#EF4444" />
        <KpiCard label="Dividendes" value={divCount} color="#22C55E" sublabel="actions avec div" />
      </div>

      {/* Index Weight Chart — SPX/NDX ponderation par jour */}
      <Card className="p-4 mb-4">
        <div className="text-[10px] text-[#6B6B75] uppercase tracking-widest mb-3">
          Ponderation hebdomadaire — Nombre d'earnings S&P 500 vs NDX/Tech par jour
        </div>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={weightChartData} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E1E22" vertical={false} />
            <XAxis dataKey="day" tick={{ fill: "#6B6B75", fontSize: 10 }} />
            <YAxis tick={{ fill: "#6B6B75", fontSize: 10 }} allowDecimals={false} />
            <Tooltip
              contentStyle={{ backgroundColor: "#111114", border: "1px solid #1E1E22", borderRadius: 8, fontSize: 11 }}
              formatter={(v: any, name: any) => [v, name === "sp500" ? "S&P 500" : name === "ndx" ? "NDX/Tech" : "Total"]}
            />
            <Bar dataKey="sp500" fill="#AB47BC" name="S&P 500" radius={[3, 3, 0, 0]} />
            <Bar dataKey="ndx" fill="#42A5F5" name="NDX/Tech" radius={[3, 3, 0, 0]} />
            <Bar dataKey="total" fill="#FF6B0030" name="Total" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        {/* Market Cap by day */}
        <div className="flex justify-between mt-2 px-2">
          {weightChartData.map((d, i) => (
            <div key={i} className="text-center">
              <div className="text-[9px] text-[#AB47BC] font-mono">{d.sp500Cap > 0 ? fmtCap(d.sp500Cap) : "--"}</div>
              <div className="text-[8px] text-[#6B6B75]">SPX Cap</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Week nav */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => setWeekOffset(w => w - 1)} className="px-3 py-1.5 bg-[#111114] border border-[#1E1E22] rounded-lg text-xs hover:border-[#FF6B00] transition-colors">
          Sem. prec.
        </button>
        <button onClick={() => setWeekOffset(0)} className={`px-3 py-1.5 border rounded-lg text-xs transition-colors ${weekOffset === 0 ? "bg-[#FF6B00] text-black border-[#FF6B00]" : "bg-[#111114] border-[#1E1E22] hover:border-[#FF6B00]"}`}>
          Cette semaine
        </button>
        <button onClick={() => setWeekOffset(w => w + 1)} className="px-3 py-1.5 bg-[#111114] border border-[#1E1E22] rounded-lg text-xs hover:border-[#FF6B00] transition-colors">
          Sem. suiv.
        </button>
        <span className="text-xs text-[#6B6B75] ml-2">{weekDays[0]} au {weekDays[4]}</span>
      </div>

      {/* 5-column grid */}
      <div className="grid grid-cols-5 gap-3">
        {weekDays.map((date, di) => {
          const daySp500 = byDay[di].filter(e => e.is_sp500).length;
          const dayNdx = byDay[di].filter(e => e.is_ndx).length;
          const impact = dailyImpactLabel(daySp500);
          return (
            <div key={date}>
              <div className="text-xs text-[#6B6B75] uppercase tracking-wider mb-1 text-center">{DAYS[di]} {date.slice(5)}</div>
              {(daySp500 > 0 || dayNdx > 0) && (
                <div className="text-center mb-2 space-y-1">
                  {daySp500 > 0 && (
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded inline-block" style={{ background: `${impact.color}22`, color: impact.color, border: `1px solid ${impact.color}44` }}>
                      {impact.label} — {daySp500} SPX
                    </span>
                  )}
                  {dayNdx > 0 && (
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded inline-block ml-1" style={{ background: "#42A5F522", color: "#42A5F5", border: "1px solid #42A5F544" }}>
                      {dayNdx} NDX
                    </span>
                  )}
                </div>
              )}
              <div className="space-y-2">
                {byDay[di].length === 0 ? (
                  <Card className="p-3 text-center text-[10px] text-[#6B6B75]">Aucun</Card>
                ) : byDay[di].map((e: any, i: number) => (
                  <EarningCard key={`${e.ticker}-${i}`} earning={e} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <Card className="p-3 mt-4">
        <div className="flex flex-wrap gap-4 text-[10px] text-[#6B6B75]">
          <span><span className="inline-block w-2 h-2 rounded-full bg-[#AB47BC] mr-1" />S&P 500</span>
          <span><span className="inline-block w-2 h-2 rounded-full bg-[#42A5F5] mr-1" />NDX / Tech</span>
          <span><span className="inline-block w-2 h-2 rounded-full bg-[#FFB300] mr-1" />Expected Move</span>
          <span><span className="inline-block w-2 h-2 rounded-full bg-[#22C55E] mr-1" />Dividende</span>
          <span><span className="inline-block w-2 h-2 rounded-full bg-[#AB47BC] mr-1" />OPT IMPACT = le dividende affecte le pricing des options (puts montent, calls baissent pre-ex-date)</span>
        </div>
      </Card>
    </div>
  );
}
