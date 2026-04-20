"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, PageHeader, Badge, LiveBadge } from "@/components/ui/card";
import { RefreshTimer } from "@/components/ui/refresh-timer";
import { VolSurface3D } from "@/components/ui/vol-surface-3d";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
  BarChart,
  Bar,
  Cell,
} from "recharts";

const API = "http://localhost:3850";
const WATCHLIST = ["SPX", "SPY", "QQQ", "IWM", "AAPL", "NVDA", "TSLA", "GLD", "TLT", "DIA"];

/* ── Types ── */
interface AtmRow { dte: string; iv: number | null; samples: number }
interface SkewRow { dte: string; put_iv: number | null; call_iv: number | null; skew: number | null }
interface Stats { min_iv: number; max_iv: number; avg_iv: number; total_contracts: number; total_raw_contracts: number }
interface SurfaceResponse {
  ok: boolean; ticker: string; spot: number; vix: number; atm: number;
  moneyness: string[]; dtes: string[];
  surface: (number | null)[][]; sample_size: number[][];
  atm_term: AtmRow[]; skew_25d: SkewRow[];
  stats: Stats; generated_at: string; error?: string;
}
interface InterpolatedRow { date: string; days: number; volatility: string; percentile: string; implied_move_perc: string }
interface TermRow { date: string; ticker: string; expiry: string; volatility: string; dte: number; implied_move: string; implied_move_perc: string }
interface VolStatsData { date: string; ticker: string; iv: string; iv_low: string; iv_high: string; iv_rank: string; rv: string; rv_low: string; rv_high: string }
interface SkewHistRow { date: string; ticker: string; delta: number; risk_reversal: string }

/* ── Color scale (deep blue -> light blue, UW style) ── */
function ivColor(v: number | null, min: number, max: number): string {
  if (v === null) return "#1A1A1E";
  if (max <= min) return "#1E88E5";
  const t = Math.max(0, Math.min(1, (v - min) / (max - min)));
  // Higher IV = darker blue (like UW)
  if (t < 0.2) return "#BBDEFB";
  if (t < 0.4) return "#64B5F6";
  if (t < 0.6) return "#42A5F5";
  if (t < 0.8) return "#1E88E5";
  return "#0D47A1";
}

function IvCell({ v, n, min, max }: { v: number | null; n: number; min: number; max: number }) {
  const color = ivColor(v, min, max);
  return (
    <td
      className="p-1.5 text-center text-[11px] font-mono border border-[#1E1E22]"
      style={{
        color: v === null ? "#6B6B75" : "#F0F0F0",
        backgroundColor: v === null ? "#0D0D10" : `${color}30`,
        borderLeft: `2px solid ${color}`,
      }}
      title={`IV ${v?.toFixed(2) ?? "--"}% (${n} contrats)`}
    >
      {v === null ? "--" : v.toFixed(1)}
    </td>
  );
}

/* ── Tooltip dark ── */
const darkTooltipStyle = {
  backgroundColor: "#111114",
  border: "1px solid #1E1E22",
  borderRadius: 8,
  fontSize: 11,
};

/* ── KPI mini card ── */
function Kpi({ label, value, sub, color = "#F0F0F0" }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <Card className="p-3">
      <div className="text-[9px] uppercase text-[#6B6B75] tracking-wide">{label}</div>
      <div className="text-lg font-extrabold font-mono" style={{ color }}>{value}</div>
      {sub && <div className="text-[9px] text-[#6B6B75]">{sub}</div>}
    </Card>
  );
}

/* ── IV Rank gauge ── */
function IvRankGauge({ rank }: { rank: number }) {
  const pct = Math.max(0, Math.min(100, rank));
  const color = pct > 70 ? "#EF4444" : pct > 40 ? "#FFA726" : "#22C55E";
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="text-[9px] uppercase text-[#6B6B75] tracking-wide">IV Rank</div>
      <div className="relative w-full h-3 bg-[#1A1A1E] rounded-full overflow-hidden">
        <div className="absolute inset-0 flex">
          <div className="flex-1 border-r border-[#2A2A2E]" />
          <div className="flex-1 border-r border-[#2A2A2E]" />
          <div className="flex-1" />
        </div>
        <div
          className="absolute h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <div className="text-xl font-extrabold font-mono" style={{ color }}>{pct.toFixed(1)}</div>
      <div className="text-[9px] text-[#6B6B75]">
        {pct > 70 ? "Vol elevee" : pct > 40 ? "Vol moyenne" : "Vol basse"}
      </div>
    </div>
  );
}

export default function SurfacePage() {
  const [ticker, setTicker] = useState("SPX");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SurfaceResponse | null>(null);
  const [interp, setInterp] = useState<InterpolatedRow[]>([]);
  const [termStruct, setTermStruct] = useState<TermRow[]>([]);
  const [volStats, setVolStats] = useState<VolStatsData | null>(null);
  const [skewHist, setSkewHist] = useState<SkewHistRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      // Fetch all data in parallel
      const [surfR, interpR, termR, statsR, skewR] = await Promise.allSettled([
        fetch(`${API}/api/uw/vol-surface?ticker=${ticker}`, { cache: "no-store" }),
        fetch(`${API}/api/uw/interpolated-iv?ticker=${ticker}`, { cache: "no-store" }),
        fetch(`${API}/api/uw/vol-term-structure?ticker=${ticker}`, { cache: "no-store" }),
        fetch(`${API}/api/uw/vol-stats?ticker=${ticker}`, { cache: "no-store" }),
        fetch(`${API}/api/uw/risk-reversal-skew?ticker=${ticker}`, { cache: "no-store" }),
      ]);

      // Surface (main)
      if (surfR.status === "fulfilled" && surfR.value.ok) {
        const j = await surfR.value.json();
        if (j?.ok) {
          setData(j);
          setError(null);
        } else {
          setError(j?.error || "Surface error");
        }
      }
      // Interpolated IV
      if (interpR.status === "fulfilled" && interpR.value.ok) {
        const j = await interpR.value.json();
        setInterp(j?.data || []);
      }
      // Term structure
      if (termR.status === "fulfilled" && termR.value.ok) {
        const j = await termR.value.json();
        setTermStruct(j?.data || []);
      }
      // Vol stats
      if (statsR.status === "fulfilled" && statsR.value.ok) {
        const j = await statsR.value.json();
        setVolStats(j?.data || null);
      }
      // Historical skew
      if (skewR.status === "fulfilled" && skewR.value.ok) {
        const j = await skewR.value.json();
        setSkewHist(j?.data || []);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [ticker]);

  useEffect(() => { setLoading(true); load(); }, [load]);
  useEffect(() => {
    const id = setInterval(load, 90_000);
    return () => clearInterval(id);
  }, [load]);

  // Derived chart data
  const interpChart = useMemo(() =>
    interp.map(r => ({
      days: r.days,
      iv: +(+r.volatility * 100).toFixed(2),
      percentile: +(+r.percentile * 100).toFixed(1),
      impliedMove: +(+r.implied_move_perc * 100).toFixed(2),
    }))
  , [interp]);

  const termChart = useMemo(() =>
    termStruct
      .filter(r => r.dte > 0 && r.dte <= 365)
      .map(r => ({
        dte: r.dte,
        iv: +(+r.volatility * 100).toFixed(2),
        impliedMove: +(+r.implied_move_perc * 100).toFixed(2),
        expiry: r.expiry,
      }))
      .sort((a, b) => a.dte - b.dte)
  , [termStruct]);

  const skewHistChart = useMemo(() =>
    skewHist.map(r => ({
      date: r.date,
      skew: +(+r.risk_reversal * 100).toFixed(2),
    }))
  , [skewHist]);

  const atmChartData = data?.atm_term
    .filter(a => a.iv !== null)
    .map(a => ({ dte: Number(a.dte), iv: a.iv, samples: a.samples })) || [];

  const skewChartData = data?.skew_25d
    .filter(s => s.skew !== null)
    .map(s => ({ dte: Number(s.dte), skew: s.skew, put: s.put_iv, call: s.call_iv })) || [];

  // Vol stats derived
  const iv = volStats ? +(+volStats.iv * 100).toFixed(2) : null;
  const ivRank = volStats ? +volStats.iv_rank : null;
  const rv = volStats ? +(+volStats.rv * 100).toFixed(2) : null;
  const ivHigh = volStats ? +(+volStats.iv_high * 100).toFixed(1) : null;
  const ivLow = volStats ? +(+volStats.iv_low * 100).toFixed(1) : null;
  const rvHigh = volStats ? +(+volStats.rv_high * 100).toFixed(1) : null;
  const rvLow = volStats ? +(+volStats.rv_low * 100).toFixed(1) : null;
  const vrp = iv !== null && rv !== null ? +(iv - rv).toFixed(2) : null;

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <PageHeader
        timer={<RefreshTimer intervalSeconds={90} />}
        title="Volatility Surface"
        subtitle="Surface IV temps reel — strikes x expirations x implied volatility"
      >
        <select
          value={ticker}
          onChange={e => setTicker(e.target.value)}
          className="bg-[#111114] border border-[#1E1E22] rounded-lg px-3 py-1.5 text-xs text-white"
        >
          {WATCHLIST.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <LiveBadge />
      </PageHeader>

      {/* Refresh indicator */}
      {refreshing && data && (
        <div className="fixed top-2 right-4 z-50 flex items-center gap-1.5 text-[10px] text-[#42A5F5] bg-[#42A5F510] border border-[#42A5F533] px-2 py-0.5 rounded">
          <span className="w-1.5 h-1.5 rounded-full bg-[#42A5F5] animate-pulse" />
          REFRESH
        </div>
      )}

      {loading && !data ? (
        <Card className="p-12 text-center text-[#6B6B75]">
          <div className="animate-pulse">Construction de la surface IV pour {ticker}...</div>
        </Card>
      ) : error && !data ? (
        <Card className="p-12 text-center text-[#6B6B75]">
          <span className="text-[#EF4444] font-semibold">Erreur</span>
          <div className="text-xs mt-2">{error}</div>
        </Card>
      ) : data ? (
        <>
          {/* ═══ ROW 1: KPIs + Vol Stats ═══ */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2 mb-4">
            <Kpi label="Ticker" value={data.ticker} color="#FF6B00" />
            <Kpi label="Spot" value={`$${data.spot.toFixed(2)}`} />
            <Kpi label="VIX" value={data.vix.toFixed(2)} color="#FFA726" />
            <Kpi label="IV 30j" value={iv !== null ? `${iv}%` : "--"} color="#42A5F5" />
            <Kpi label="HV (RV)" value={rv !== null ? `${rv}%` : "--"} color="#B388FF" />
            <Kpi
              label="VRP"
              value={vrp !== null ? `${vrp > 0 ? "+" : ""}${vrp}%` : "--"}
              color={vrp !== null ? (vrp > 0 ? "#22C55E" : "#EF4444") : "#6B6B75"}
              sub={vrp !== null ? (vrp > 0 ? "IV > RV (prime)" : "RV > IV (stress)") : undefined}
            />
            <Kpi
              label="IV Range"
              value={ivLow !== null && ivHigh !== null ? `${ivLow}-${ivHigh}%` : "--"}
              color="#64B5F6"
              sub="52w range"
            />
            <Card className="p-3">
              {ivRank !== null ? <IvRankGauge rank={ivRank} /> : (
                <div className="text-[#6B6B75] text-xs text-center py-2">--</div>
              )}
            </Card>
          </div>

          {/* ═══ ROW 2: 3D Surface ═══ */}
          <Card className="p-4 mb-4">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-sm font-bold text-[#42A5F5] uppercase tracking-wider">
                Volatility Surface 3D
              </h2>
              <Badge className="text-[10px]">{data.ticker}</Badge>
              <span className="text-[10px] text-[#6B6B75] ml-auto">
                {data.stats.total_contracts} contrats — spot ${data.spot.toFixed(2)}
              </span>
            </div>
            <p className="text-[10px] text-[#6B6B75] mb-3">
              X = DTE (jours), Y = Moneyness (strike/spot, 100% = ATM), Z = IV.
              Zones sombres = IV elevee. Cliquez-glissez pour tourner, molette pour zoomer.
            </p>
            <VolSurface3D
              ticker={data.ticker}
              spot={data.spot}
              moneyness={data.moneyness}
              dtes={data.dtes}
              surface={data.surface}
              height={560}
            />
          </Card>

          {/* ═══ ROW 3: Interpolated IV Term Structure + IV Percentile ═══ */}
          {interpChart.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <Card className="p-4">
                <h3 className="text-xs font-bold text-[#42A5F5] uppercase tracking-wider mb-1">
                  Interpolated IV Term Structure
                </h3>
                <p className="text-[10px] text-[#6B6B75] mb-3">
                  IV interpolee par UW sur les echeances standard. Pente haussiere = contango normal.
                </p>
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={interpChart}>
                    <defs>
                      <linearGradient id="ivGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1E88E5" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#1E88E5" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E1E22" />
                    <XAxis
                      dataKey="days"
                      tick={{ fill: "#6B6B75", fontSize: 10 }}
                      label={{ value: "DTE", fill: "#6B6B75", fontSize: 10, position: "insideBottom", offset: -4 }}
                    />
                    <YAxis
                      tick={{ fill: "#6B6B75", fontSize: 10 }}
                      domain={["dataMin - 1", "dataMax + 1"]}
                      tickFormatter={(v: number) => `${v}%`}
                    />
                    <Tooltip contentStyle={darkTooltipStyle} formatter={(v: any) => [`${v}%`, "IV"]} />
                    {data.vix > 0 && (
                      <ReferenceLine
                        y={data.vix}
                        stroke="#FFA726"
                        strokeDasharray="3 3"
                        label={{ value: `VIX ${data.vix.toFixed(1)}`, fill: "#FFA726", fontSize: 9 }}
                      />
                    )}
                    <Area
                      dataKey="iv"
                      stroke="#1E88E5"
                      strokeWidth={2.5}
                      fill="url(#ivGrad)"
                      dot={{ r: 4, fill: "#1E88E5", stroke: "#0D47A1", strokeWidth: 1 }}
                      name="IV"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Card>

              <Card className="p-4">
                <h3 className="text-xs font-bold text-[#B388FF] uppercase tracking-wider mb-1">
                  IV Percentile par echeance
                </h3>
                <p className="text-[10px] text-[#6B6B75] mb-3">
                  Rang de l'IV actuelle vs historique. &gt;70% = cher, &lt;30% = pas cher.
                </p>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={interpChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E1E22" />
                    <XAxis dataKey="days" tick={{ fill: "#6B6B75", fontSize: 10 }} />
                    <YAxis
                      tick={{ fill: "#6B6B75", fontSize: 10 }}
                      domain={[0, 100]}
                      tickFormatter={(v: number) => `${v}%`}
                    />
                    <Tooltip contentStyle={darkTooltipStyle} formatter={(v: any) => [`${v}%`, "Percentile"]} />
                    <ReferenceLine y={50} stroke="#6B6B75" strokeDasharray="4 4" />
                    <Bar dataKey="percentile" name="Percentile" radius={[3, 3, 0, 0]}>
                      {interpChart.map((entry, i) => (
                        <Cell
                          key={i}
                          fill={
                            entry.percentile > 70
                              ? "#EF4444"
                              : entry.percentile > 40
                              ? "#FFA726"
                              : "#22C55E"
                          }
                          fillOpacity={0.7}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </div>
          )}

          {/* ═══ ROW 4: Full Term Structure (all expiries) + Implied Move ═══ */}
          {termChart.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <Card className="p-4">
                <h3 className="text-xs font-bold text-[#64B5F6] uppercase tracking-wider mb-1">
                  Term Structure complete ({termChart.length} expiries)
                </h3>
                <p className="text-[10px] text-[#6B6B75] mb-3">
                  IV par expiration reelle — chaque point = une echeance cotee. Plus precis que les buckets.
                </p>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={termChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E1E22" />
                    <XAxis
                      dataKey="dte"
                      tick={{ fill: "#6B6B75", fontSize: 10 }}
                      label={{ value: "DTE", fill: "#6B6B75", fontSize: 10, position: "insideBottom", offset: -4 }}
                    />
                    <YAxis
                      tick={{ fill: "#6B6B75", fontSize: 10 }}
                      domain={["dataMin - 0.5", "dataMax + 0.5"]}
                      tickFormatter={(v: number) => `${v}%`}
                    />
                    <Tooltip
                      contentStyle={darkTooltipStyle}
                      formatter={(v: any, name: any) => [`${v}%`, name === "iv" ? "IV" : String(name)]}
                      labelFormatter={(v: any) => `DTE ${v}j`}
                    />
                    <Line
                      dataKey="iv"
                      stroke="#64B5F6"
                      strokeWidth={1.5}
                      dot={{ r: 2, fill: "#64B5F6" }}
                      name="IV"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Card>

              <Card className="p-4">
                <h3 className="text-xs font-bold text-[#FF6B00] uppercase tracking-wider mb-1">
                  Implied Move par expiration
                </h3>
                <p className="text-[10px] text-[#6B6B75] mb-3">
                  Mouvement attendu (en %) par le marche pour chaque echeance — extrait du prix des options.
                </p>
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={termChart}>
                    <defs>
                      <linearGradient id="moveGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#FF6B00" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#FF6B00" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E1E22" />
                    <XAxis dataKey="dte" tick={{ fill: "#6B6B75", fontSize: 10 }} />
                    <YAxis
                      tick={{ fill: "#6B6B75", fontSize: 10 }}
                      tickFormatter={(v: number) => `${v}%`}
                    />
                    <Tooltip
                      contentStyle={darkTooltipStyle}
                      formatter={(v: any) => [`${v}%`, "Implied Move"]}
                      labelFormatter={(v: any) => `DTE ${v}j`}
                    />
                    <Area
                      dataKey="impliedMove"
                      stroke="#FF6B00"
                      strokeWidth={2}
                      fill="url(#moveGrad)"
                      dot={{ r: 3, fill: "#FF6B00" }}
                      name="Implied Move"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Card>
            </div>
          )}

          {/* ═══ ROW 5: 2D Heatmap ═══ */}
          <Card className="p-4 mb-4">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-sm font-bold text-[#42A5F5] uppercase tracking-wider">
                Surface 2D — IV Heatmap
              </h2>
              <span className="text-[10px] text-[#6B6B75]">
                Moneyness x DTE — {data.stats.total_contracts} contrats
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-[#1E1E22]">
                    <th className="text-left p-2 text-[#6B6B75] text-[10px] uppercase tracking-wide">
                      Moneyness
                    </th>
                    {data.dtes.map(d => (
                      <th key={d} className="text-center p-2 text-[#6B6B75] text-[10px] uppercase tracking-wide">
                        {d}d
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.moneyness.map((m, i) => (
                    <tr key={m} className={m === "100%" ? "bg-[#42A5F508]" : ""}>
                      <td className={`p-2 text-[11px] font-mono font-bold ${
                        m === "100%" ? "text-[#FF6B00]" : "text-[#6B6B75]"
                      }`}>
                        {m}
                      </td>
                      {data.surface[i].map((v, j) => (
                        <IvCell
                          key={j}
                          v={v}
                          n={data.sample_size[i][j]}
                          min={data.stats.min_iv}
                          max={data.stats.max_iv}
                        />
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center gap-3 mt-3 text-[10px] text-[#6B6B75]">
              <span>Echelle IV:</span>
              {["#BBDEFB", "#64B5F6", "#42A5F5", "#1E88E5", "#0D47A1"].map((c, i) => (
                <span key={i} className="flex items-center gap-1">
                  <span className="w-3 h-2 rounded-sm" style={{ backgroundColor: c }} />
                  {["bas", "", "moy", "", "haut"][i]}
                </span>
              ))}
              <span className="ml-auto">
                {new Date(data.generated_at).toLocaleTimeString("fr-FR")}
              </span>
            </div>
          </Card>

          {/* ═══ ROW 6: Skew (bucket + historique) ═══ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Current skew per DTE */}
            <Card className="p-4">
              <h3 className="text-xs font-bold text-[#B388FF] uppercase tracking-wider mb-1">
                Skew 25-Delta actuel
              </h3>
              <p className="text-[10px] text-[#6B6B75] mb-3">
                Put IV - Call IV ~5% OTM par echeance. Positif = puts plus chers (protection).
              </p>
              {skewChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={skewChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E1E22" />
                    <XAxis dataKey="dte" tick={{ fill: "#6B6B75", fontSize: 10 }} />
                    <YAxis tick={{ fill: "#6B6B75", fontSize: 10 }} />
                    <Tooltip contentStyle={darkTooltipStyle} />
                    <ReferenceLine y={0} stroke="#6B6B75" />
                    <Line dataKey="put" stroke="#EF4444" strokeWidth={1.5} dot={{ r: 3, fill: "#EF4444" }} name="Put IV" />
                    <Line dataKey="call" stroke="#22C55E" strokeWidth={1.5} dot={{ r: 3, fill: "#22C55E" }} name="Call IV" />
                    <Line dataKey="skew" stroke="#B388FF" strokeWidth={2} dot={{ r: 4, fill: "#B388FF" }} name="Skew" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-8 text-[#6B6B75] text-xs">Pas assez de samples OTM</div>
              )}
            </Card>

            {/* Historical skew time series */}
            <Card className="p-4">
              <h3 className="text-xs font-bold text-[#90CAF9] uppercase tracking-wider mb-1">
                Risk Reversal historique
              </h3>
              <p className="text-[10px] text-[#6B6B75] mb-3">
                Skew 25-delta sur les derniers mois. Hausse = puts deviennent chers. Baisse = calls dominent.
              </p>
              {skewHistChart.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={skewHistChart}>
                    <defs>
                      <linearGradient id="skewGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#90CAF9" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#90CAF9" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E1E22" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "#6B6B75", fontSize: 9 }}
                      tickFormatter={(d: string) => d.slice(5)}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fill: "#6B6B75", fontSize: 10 }}
                      tickFormatter={(v: number) => `${v}%`}
                    />
                    <Tooltip
                      contentStyle={darkTooltipStyle}
                      formatter={(v: any) => [`${v}%`, "Skew 25d"]}
                    />
                    <ReferenceLine y={0} stroke="#6B6B75" strokeDasharray="3 3" />
                    <Area
                      dataKey="skew"
                      stroke="#90CAF9"
                      strokeWidth={2}
                      fill="url(#skewGrad)"
                      dot={false}
                      name="Risk Reversal"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-8 text-[#6B6B75] text-xs">Pas de donnees skew historique</div>
              )}
            </Card>
          </div>

          {/* ═══ ROW 7: IV vs RV comparison bars ═══ */}
          {volStats && (
            <Card className="p-4 mb-4">
              <h3 className="text-xs font-bold text-[#22C55E] uppercase tracking-wider mb-3">
                IV vs RV — Volatility Risk Premium
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* IV range bar */}
                <div>
                  <div className="flex justify-between text-[10px] text-[#6B6B75] mb-1">
                    <span>Implied Volatility (IV)</span>
                    <span>{ivLow}% — {ivHigh}% (52w)</span>
                  </div>
                  <div className="relative h-6 bg-[#1A1A1E] rounded-full overflow-hidden">
                    {ivLow !== null && ivHigh !== null && iv !== null && (
                      <>
                        <div
                          className="absolute h-full bg-[#42A5F520] rounded-full"
                          style={{
                            left: `0%`,
                            width: `100%`,
                          }}
                        />
                        <div
                          className="absolute h-full w-1 bg-[#42A5F5] rounded-full"
                          style={{
                            left: `${Math.max(0, Math.min(100, ((iv - ivLow) / (ivHigh - ivLow)) * 100))}%`,
                          }}
                          title={`IV actuelle: ${iv}%`}
                        />
                        <div
                          className="absolute text-[10px] font-mono font-bold text-[#42A5F5]"
                          style={{
                            left: `${Math.max(5, Math.min(85, ((iv - ivLow) / (ivHigh - ivLow)) * 100))}%`,
                            top: "2px",
                          }}
                        >
                          {iv}%
                        </div>
                      </>
                    )}
                  </div>
                </div>
                {/* RV range bar */}
                <div>
                  <div className="flex justify-between text-[10px] text-[#6B6B75] mb-1">
                    <span>Realized Volatility (RV)</span>
                    <span>{rvLow}% — {rvHigh}% (52w)</span>
                  </div>
                  <div className="relative h-6 bg-[#1A1A1E] rounded-full overflow-hidden">
                    {rvLow !== null && rvHigh !== null && rv !== null && (
                      <>
                        <div className="absolute h-full bg-[#B388FF20] rounded-full" style={{ width: "100%" }} />
                        <div
                          className="absolute h-full w-1 bg-[#B388FF] rounded-full"
                          style={{
                            left: `${Math.max(0, Math.min(100, ((rv - rvLow) / (rvHigh - rvLow)) * 100))}%`,
                          }}
                          title={`RV actuelle: ${rv}%`}
                        />
                        <div
                          className="absolute text-[10px] font-mono font-bold text-[#B388FF]"
                          style={{
                            left: `${Math.max(5, Math.min(85, ((rv - rvLow) / (rvHigh - rvLow)) * 100))}%`,
                            top: "2px",
                          }}
                        >
                          {rv}%
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-4 flex gap-4 text-[10px] text-[#6B6B75]">
                <span>
                  VRP (IV - RV) ={" "}
                  <span className={`font-bold ${vrp && vrp > 0 ? "text-[#22C55E]" : "text-[#EF4444]"}`}>
                    {vrp !== null ? `${vrp > 0 ? "+" : ""}${vrp}%` : "--"}
                  </span>
                </span>
                <span>
                  {vrp !== null && vrp > 0
                    ? "Les options sont plus cheres que la vol realisee — opportunite de vente de vol"
                    : "La vol realisee depasse l'IV — marche en stress ou sous-pricing des options"}
                </span>
              </div>
            </Card>
          )}

          {/* ═══ ROW 8: Educational panel ═══ */}
          <Card className="p-5 mb-4">
            <h2 className="text-sm font-bold text-[#22C55E] uppercase tracking-wider mb-3">
              Lecture de la surface
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs text-[#6B6B75] leading-relaxed">
              <div>
                <div className="font-bold text-[#F0F0F0] mb-1">Le smile</div>
                Les OTM puts et calls ont toujours un IV superieur a l'ATM. Ce smile traduit le skew :
                les marches anticipent les moves extremes plus souvent qu'une distribution log-normale.
              </div>
              <div>
                <div className="font-bold text-[#F0F0F0] mb-1">Term structure</div>
                En temps normal, les longues echeances cotent plus d'IV (contango).
                En stress, la courbe s'inverse (backwardation) : l'IV court terme depasse le long terme.
              </div>
              <div>
                <div className="font-bold text-[#F0F0F0] mb-1">Skew 25d</div>
                Skew = IV put 25d - IV call 25d. Plus c'est positif, plus les puts coutent cher
                relativement aux calls — les acheteurs de protection dominent.
              </div>
              <div>
                <div className="font-bold text-[#F0F0F0] mb-1">VRP</div>
                Volatility Risk Premium = IV - RV. Si positif, les options sont "cheres" par rapport
                a la vol realisee. Signal classique pour la vente de vol (short premium).
              </div>
            </div>
          </Card>
        </>
      ) : null}
    </div>
  );
}
