"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader, Card, LiveBadge } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, ReferenceLine,
} from "recharts";

const API = "http://localhost:3850";

interface EarningRow {
  report_date: string;
  report_time: string;
  fiscal_quarter: string;
  actual_eps: number | null;
  estimate_eps: number | null;
  surprise_pct: number | null;
  beat: "BEAT" | "MISS" | "INLINE" | null;
  implied_move: number | null;
  realized_move_1d: number | null;
  iv_rv_ratio: number | null;
  post_1d: number | null;
  post_3d: number | null;
  post_1w: number | null;
  post_2w: number | null;
  pre_1d: number | null;
  pre_3d: number | null;
  pre_1w: number | null;
  pre_2w: number | null;
  short_straddle_1d: number | null;
  long_straddle_1d: number | null;
}

interface Summary {
  total: number;
  completed: number;
  beats: number;
  misses: number;
  beat_rate: number | null;
  avg_implied_move: number | null;
  avg_realized_move: number | null;
  iv_rv_ratio: number | null;
  avg_surprise_pct: number | null;
  avg_post_1d: number | null;
  avg_post_1w: number | null;
  stdev_post_1d: number | null;
  up_reactions: number;
  down_reactions: number;
  max_up: number | null;
  max_down: number | null;
  avg_short_straddle_1d: number | null;
  avg_long_straddle_1d: number | null;
}

interface HistoryResponse {
  ok: boolean;
  ticker: string;
  count: number;
  earnings: EarningRow[];
  summary: Summary;
}

const WATCHLIST = ["AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "META", "TSLA", "AMD", "NFLX", "AVGO", "ORCL", "JPM", "BAC", "XOM", "UNH"];

function moveColor(v: number | null): string {
  if (v === null) return "#6B6B75";
  if (v >= 5) return "#10B981";
  if (v >= 1) return "#22C55E";
  if (v > -1) return "#6B6B75";
  if (v > -5) return "#FFA726";
  return "#EF4444";
}

function ratioColor(r: number | null): string {
  if (r === null) return "#6B6B75";
  if (r >= 1.3) return "#EF4444"; // IV overpriced — short vol profitable
  if (r >= 1.1) return "#FFA726";
  if (r >= 0.9) return "#6B6B75"; // fair
  if (r >= 0.7) return "#22C55E"; // IV underpriced — long vol profitable
  return "#10B981";
}

function beatColor(b: string | null): string {
  if (b === "BEAT") return "#22C55E";
  if (b === "MISS") return "#EF4444";
  if (b === "INLINE") return "#6B6B75";
  return "#6B6B75";
}

export default function EarningsHistoryPage() {
  const [ticker, setTicker] = useState("NVDA");
  const [input, setInput] = useState("NVDA");
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (t: string) => {
    try {
      setLoading(true);
      setError(null);
      const r = await fetch(`${API}/api/uw/earnings/history?ticker=${t}`, { signal: AbortSignal.timeout(10000) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const json = await r.json();
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(ticker);
  }, [ticker, load]);

  const chartData = data?.earnings
    .filter((e) => e.post_1d !== null)
    .slice(0, 20)
    .reverse()
    .map((e) => ({
      date: e.report_date?.slice(2) || "",
      post: e.post_1d,
      implied_up: e.implied_move,
      implied_down: e.implied_move !== null ? -e.implied_move : null,
    })) || [];

  return (
    <div className="p-6">
      <PageHeader
        title="Earnings Historical Impact"
        subtitle="Historique des earnings — EPS surprise, reaction post-pub, IV/RV, performance straddle"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setTicker(input.toUpperCase());
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="bg-[#0D0D10] border border-[#1E1E22] rounded-md px-2 py-1 text-xs text-[#F0F0F0] w-24 uppercase"
            placeholder="Ticker"
          />
          <button
            type="submit"
            className="px-3 py-1.5 bg-[#111114] border border-[#1E1E22] rounded-lg text-xs hover:border-[#FF6B00] transition-colors"
          >
            Charger
          </button>
        </form>
        <LiveBadge />
      </PageHeader>

      {/* Quick watchlist */}
      <div className="flex flex-wrap gap-1 mb-4">
        {WATCHLIST.map((t) => (
          <button
            key={t}
            onClick={() => {
              setTicker(t);
              setInput(t);
            }}
            className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all ${
              ticker === t ? "bg-[#FF6B00] text-black" : "bg-[#1A1A1E] text-[#6B6B75] hover:text-[#F0F0F0]"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <Card className="p-12 text-center text-[#6B6B75]">Chargement historique {ticker}...</Card>
      ) : error ? (
        <Card className="p-12 text-center text-[#6B6B75]">
          <span className="text-[#FF6B00] font-semibold">Erreur</span>
          <div className="text-xs mt-2">{error}</div>
        </Card>
      ) : data && data.count > 0 ? (
        <div className="space-y-4">
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-7 gap-2">
            <Card className="p-3">
              <div className="text-[9px] uppercase text-[#6B6B75]">Historique</div>
              <div className="text-xl font-extrabold font-mono text-[#F0F0F0]">
                {data.summary.completed}
              </div>
              <div className="text-[9px] text-[#6B6B75]">earnings completes</div>
            </Card>
            <Card className="p-3">
              <div className="text-[9px] uppercase text-[#6B6B75]">Taux de beat</div>
              <div
                className="text-xl font-extrabold font-mono"
                style={{
                  color:
                    (data.summary.beat_rate || 0) >= 60
                      ? "#22C55E"
                      : (data.summary.beat_rate || 0) >= 40
                      ? "#FFA726"
                      : "#EF4444",
                }}
              >
                {data.summary.beat_rate !== null ? data.summary.beat_rate.toFixed(0) + "%" : "--"}
              </div>
              <div className="text-[9px] text-[#6B6B75]">
                {data.summary.beats}B / {data.summary.misses}M
              </div>
            </Card>
            <Card className="p-3">
              <div className="text-[9px] uppercase text-[#6B6B75]">Implied moyen</div>
              <div className="text-xl font-extrabold font-mono text-[#FFA726]">
                {data.summary.avg_implied_move !== null
                  ? "±" + data.summary.avg_implied_move.toFixed(2) + "%"
                  : "--"}
              </div>
            </Card>
            <Card className="p-3">
              <div className="text-[9px] uppercase text-[#6B6B75]">Realise moyen</div>
              <div className="text-xl font-extrabold font-mono text-[#42A5F5]">
                {data.summary.avg_realized_move !== null
                  ? "±" + data.summary.avg_realized_move.toFixed(2) + "%"
                  : "--"}
              </div>
            </Card>
            <Card className="p-3">
              <div className="text-[9px] uppercase text-[#6B6B75]">Ratio IV/RV</div>
              <div
                className="text-xl font-extrabold font-mono"
                style={{ color: ratioColor(data.summary.iv_rv_ratio) }}
              >
                {data.summary.iv_rv_ratio !== null ? data.summary.iv_rv_ratio.toFixed(2) : "--"}
              </div>
              <div className="text-[9px] text-[#6B6B75]">
                {data.summary.iv_rv_ratio && data.summary.iv_rv_ratio > 1.1
                  ? "IV overpriced"
                  : data.summary.iv_rv_ratio && data.summary.iv_rv_ratio < 0.9
                  ? "IV underpriced"
                  : "fair"}
              </div>
            </Card>
            <Card className="p-3">
              <div className="text-[9px] uppercase text-[#6B6B75]">Post-1d moyen</div>
              <div
                className="text-xl font-extrabold font-mono"
                style={{ color: moveColor(data.summary.avg_post_1d) }}
              >
                {data.summary.avg_post_1d !== null
                  ? (data.summary.avg_post_1d >= 0 ? "+" : "") + data.summary.avg_post_1d.toFixed(2) + "%"
                  : "--"}
              </div>
              <div className="text-[9px] text-[#6B6B75]">
                {data.summary.up_reactions}↑ / {data.summary.down_reactions}↓
              </div>
            </Card>
            <Card className="p-3">
              <div className="text-[9px] uppercase text-[#6B6B75]">Ecart-type 1d</div>
              <div className="text-xl font-extrabold font-mono text-[#B388FF]">
                {data.summary.stdev_post_1d !== null ? data.summary.stdev_post_1d.toFixed(2) + "%" : "--"}
              </div>
              <div className="text-[9px] text-[#6B6B75]">
                max {data.summary.max_up?.toFixed(1)}% / {data.summary.max_down?.toFixed(1)}%
              </div>
            </Card>
          </div>

          {/* Post-1d reaction chart */}
          {chartData.length > 0 && (
            <Card className="p-4">
              <h3 className="text-xs font-bold text-[#F0F0F0] mb-3 uppercase tracking-wider">
                Reaction post-earnings (1j) vs implied move — 20 derniers {ticker}
              </h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E1E22" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: "#6B6B75", fontSize: 9 }} />
                  <YAxis tick={{ fill: "#6B6B75", fontSize: 10 }} domain={["auto", "auto"]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#111114",
                      border: "1px solid #1E1E22",
                      borderRadius: 8,
                      fontSize: 11,
                    }}
                  />
                  <ReferenceLine y={0} stroke="#6B6B75" />
                  <Bar dataKey="post" radius={[3, 3, 0, 0]}>
                    {chartData.map((d, i) => (
                      <Cell
                        key={i}
                        fill={
                          d.post === null
                            ? "#6B6B75"
                            : d.post >= 0
                            ? "#22C55E"
                            : "#EF4444"
                        }
                      />
                    ))}
                  </Bar>
                  <Bar dataKey="implied_up" fill="#FFA72633" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="implied_down" fill="#FFA72633" radius={[0, 0, 2, 2]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="flex items-center gap-4 text-[10px] text-[#6B6B75] mt-2">
                <span>
                  <span className="inline-block w-2 h-2 bg-[#22C55E] mr-1" />
                  reaction positive
                </span>
                <span>
                  <span className="inline-block w-2 h-2 bg-[#EF4444] mr-1" />
                  reaction negative
                </span>
                <span>
                  <span className="inline-block w-2 h-2 bg-[#FFA72633] mr-1" />
                  implied move (overlay)
                </span>
              </div>
            </Card>
          )}

          {/* Straddle P&L panel */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Card className="p-4">
              <h3 className="text-xs font-bold text-[#F0F0F0] mb-3 uppercase tracking-wider">
                Short straddle 1j — P&L moyen
              </h3>
              <div className="flex items-baseline gap-3">
                <span
                  className="text-4xl font-extrabold font-mono"
                  style={{ color: moveColor(data.summary.avg_short_straddle_1d) }}
                >
                  {data.summary.avg_short_straddle_1d !== null
                    ? (data.summary.avg_short_straddle_1d >= 0 ? "+" : "") +
                      data.summary.avg_short_straddle_1d.toFixed(2) +
                      "%"
                    : "--"}
                </span>
                <span className="text-xs text-[#6B6B75]">vendre la vol la veille</span>
              </div>
              <div className="text-[10px] text-[#6B6B75] mt-2">
                Strategie rentable si IV {">>"} move realise (IV/RV {">"} 1)
              </div>
            </Card>
            <Card className="p-4">
              <h3 className="text-xs font-bold text-[#F0F0F0] mb-3 uppercase tracking-wider">
                Long straddle 1j — P&L moyen
              </h3>
              <div className="flex items-baseline gap-3">
                <span
                  className="text-4xl font-extrabold font-mono"
                  style={{ color: moveColor(data.summary.avg_long_straddle_1d) }}
                >
                  {data.summary.avg_long_straddle_1d !== null
                    ? (data.summary.avg_long_straddle_1d >= 0 ? "+" : "") +
                      data.summary.avg_long_straddle_1d.toFixed(2) +
                      "%"
                    : "--"}
                </span>
                <span className="text-xs text-[#6B6B75]">acheter la vol la veille</span>
              </div>
              <div className="text-[10px] text-[#6B6B75] mt-2">
                Strategie rentable si move {">>"} IV (IV/RV {"<"} 1)
              </div>
            </Card>
          </div>

          {/* Full table */}
          <Card className="p-4">
            <h3 className="text-xs font-bold text-[#F0F0F0] mb-3 uppercase tracking-wider">
              Historique detaille ({data.count} earnings)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-[#1E1E22]">
                    <th className="text-left text-[9px] text-[#6B6B75] uppercase p-2">Date</th>
                    <th className="text-left text-[9px] text-[#6B6B75] uppercase p-2">Session</th>
                    <th className="text-right text-[9px] text-[#6B6B75] uppercase p-2">EPS est.</th>
                    <th className="text-right text-[9px] text-[#6B6B75] uppercase p-2">EPS actual</th>
                    <th className="text-right text-[9px] text-[#6B6B75] uppercase p-2">Surprise</th>
                    <th className="text-center text-[9px] text-[#6B6B75] uppercase p-2">Result</th>
                    <th className="text-right text-[9px] text-[#6B6B75] uppercase p-2">Implied</th>
                    <th className="text-right text-[9px] text-[#6B6B75] uppercase p-2">Post 1j</th>
                    <th className="text-right text-[9px] text-[#6B6B75] uppercase p-2">Post 1sem</th>
                    <th className="text-right text-[9px] text-[#6B6B75] uppercase p-2">IV/RV</th>
                    <th className="text-right text-[9px] text-[#6B6B75] uppercase p-2">Short 1j</th>
                  </tr>
                </thead>
                <tbody>
                  {data.earnings.map((e, i) => (
                    <tr
                      key={`${e.report_date}-${i}`}
                      className="border-b border-[#0E0E12] hover:bg-[#FFFFFF06]"
                    >
                      <td className="p-2 font-mono text-xs text-[#F0F0F0]">{e.report_date}</td>
                      <td className="p-2 text-[10px] text-[#6B6B75]">{e.report_time}</td>
                      <td className="p-2 text-right font-mono text-xs text-[#6B6B75]">
                        {e.estimate_eps !== null ? e.estimate_eps.toFixed(2) : "--"}
                      </td>
                      <td className="p-2 text-right font-mono text-xs text-[#F0F0F0]">
                        {e.actual_eps !== null ? e.actual_eps.toFixed(2) : "--"}
                      </td>
                      <td
                        className="p-2 text-right font-mono font-bold text-xs"
                        style={{ color: moveColor(e.surprise_pct) }}
                      >
                        {e.surprise_pct !== null
                          ? (e.surprise_pct >= 0 ? "+" : "") + e.surprise_pct.toFixed(1) + "%"
                          : "--"}
                      </td>
                      <td className="p-2 text-center">
                        {e.beat ? (
                          <span
                            className="px-2 py-0.5 text-[9px] font-bold rounded"
                            style={{
                              backgroundColor: `${beatColor(e.beat)}22`,
                              color: beatColor(e.beat),
                            }}
                          >
                            {e.beat}
                          </span>
                        ) : (
                          "--"
                        )}
                      </td>
                      <td className="p-2 text-right font-mono text-xs text-[#FFA726]">
                        {e.implied_move !== null ? "±" + e.implied_move.toFixed(2) + "%" : "--"}
                      </td>
                      <td
                        className="p-2 text-right font-mono font-bold text-xs"
                        style={{ color: moveColor(e.post_1d) }}
                      >
                        {e.post_1d !== null
                          ? (e.post_1d >= 0 ? "+" : "") + e.post_1d.toFixed(2) + "%"
                          : "--"}
                      </td>
                      <td
                        className="p-2 text-right font-mono text-xs"
                        style={{ color: moveColor(e.post_1w) }}
                      >
                        {e.post_1w !== null
                          ? (e.post_1w >= 0 ? "+" : "") + e.post_1w.toFixed(2) + "%"
                          : "--"}
                      </td>
                      <td
                        className="p-2 text-right font-mono font-bold text-xs"
                        style={{ color: ratioColor(e.iv_rv_ratio) }}
                      >
                        {e.iv_rv_ratio !== null ? e.iv_rv_ratio.toFixed(2) : "--"}
                      </td>
                      <td
                        className="p-2 text-right font-mono text-xs"
                        style={{ color: moveColor(e.short_straddle_1d) }}
                      >
                        {e.short_straddle_1d !== null
                          ? (e.short_straddle_1d >= 0 ? "+" : "") + e.short_straddle_1d.toFixed(1) + "%"
                          : "--"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      ) : (
        <Card className="p-12 text-center text-[#6B6B75]">
          Aucun historique pour <span className="text-[#FF6B00] font-bold">{ticker}</span>
        </Card>
      )}
    </div>
  );
}
