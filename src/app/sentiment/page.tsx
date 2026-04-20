"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { PageHeader, Card, LiveBadge } from "@/components/ui/card";
import { RefreshTimer } from "@/components/ui/refresh-timer";
import { useVisiblePolling } from "@/hooks/use-visible-polling";

const API = "http://localhost:3850";

interface Headline {
  headline: string;
  source: string;
  created_at: string;
  score: number;
  raw: number;
  pos: string[];
  neg: string[];
  crisis: string[];
  tickers: string[];
}

interface TickerSummary {
  ticker: string;
  count: number;
  avg_score: number;
  positive: number;
  negative: number;
  neutral: number;
  crisis: number;
  latest_headlines: Headline[];
}

interface Anomaly {
  type: "VOLUME_SPIKE" | "SENTIMENT_SHIFT" | "CRISIS_VOCAB";
  ticker: string;
  severity: number;
  current?: number;
  baseline?: number;
  count?: number;
}

interface SentimentResponse {
  ok: boolean;
  generated_at: string;
  total_headlines: number;
  tickers: Record<string, TickerSummary>;
  anomalies: Anomaly[];
  summary: {
    avg_score: number;
    positive: number;
    negative: number;
    neutral: number;
    crisis_events: number;
  };
  top_positive: TickerSummary[];
  top_negative: TickerSummary[];
  crisis_events: Headline[];
}

function scoreColor(s: number): string {
  if (s >= 0.5) return "#10B981";
  if (s >= 0.2) return "#22C55E";
  if (s >= 0.05) return "#AAFFAA";
  if (s > -0.05) return "#6B6B75";
  if (s > -0.2) return "#FFA726";
  if (s > -0.5) return "#FF6B00";
  return "#EF4444";
}

function anomalyColor(type: string): string {
  if (type === "CRISIS_VOCAB") return "#EF4444";
  if (type === "SENTIMENT_SHIFT") return "#FF6B00";
  if (type === "VOLUME_SPIKE") return "#FFA726";
  return "#6B6B75";
}

function anomalyLabel(a: Anomaly): string {
  if (a.type === "VOLUME_SPIKE") {
    return `Pic de news: ${a.current} aujourd'hui vs ${a.baseline} en moyenne`;
  }
  if (a.type === "SENTIMENT_SHIFT") {
    const curr = a.current !== undefined ? a.current.toFixed(2) : "?";
    const base = a.baseline !== undefined ? a.baseline.toFixed(2) : "?";
    return `Shift de sentiment: ${curr} vs baseline ${base}`;
  }
  if (a.type === "CRISIS_VOCAB") {
    return `${a.count} mot(s) de crise detecte(s)`;
  }
  return "";
}

export default function SentimentPage() {
  const [data, setData] = useState<SentimentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pos" | "neg" | "alert">("all");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    try {
      setError(null);
      const r = await fetch(`${API}/api/uw/sentiment`, { signal: AbortSignal.timeout(10000) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const json = await r.json();
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useVisiblePolling(load, 120000);

  const filteredTickers = useMemo(() => {
    if (!data) return [];
    const all = Object.values(data.tickers);
    let list = all;
    if (filter === "pos") list = list.filter((t) => t.avg_score > 0.05);
    if (filter === "neg") list = list.filter((t) => t.avg_score < -0.05);
    if (filter === "alert") {
      const alertTickers = new Set(data.anomalies.map((a) => a.ticker));
      list = list.filter((t) => alertTickers.has(t.ticker));
    }
    if (search) {
      const q = search.toUpperCase();
      list = list.filter((t) => t.ticker.includes(q));
    }
    return list.sort((a, b) => b.count - a.count);
  }, [data, filter, search]);

  return (
    <div className="p-6">
      <PageHeader
        timer={<RefreshTimer intervalSeconds={120} />}
        title="Sentiment Engine"
        subtitle="Score de sentiment par ticker + detection d'anomalies semantiques sur headlines temps reel"
      >
        <button
          onClick={load}
          className="px-3 py-1.5 bg-[#111114] border border-[#1E1E22] rounded-lg text-xs hover:border-[#FF6B00] transition-colors"
        >
          Rafraichir
        </button>
        <LiveBadge />
      </PageHeader>

      {loading && !data ? (
        <Card className="p-12 text-center text-[#6B6B75]">
          Analyse des headlines temps reel...
        </Card>
      ) : error ? (
        <Card className="p-12 text-center text-[#6B6B75]">
          <span className="text-[#FF6B00] font-semibold">Reconnexion automatique en cours...</span>
          <div className="text-xs mt-2">{error}</div>
        </Card>
      ) : data ? (
        <div className="space-y-4">
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
            <Card className="p-3">
              <div className="text-[9px] uppercase text-[#6B6B75]">Headlines</div>
              <div className="text-2xl font-extrabold font-mono text-[#F0F0F0]">
                {data.total_headlines}
              </div>
            </Card>
            <Card className="p-3">
              <div className="text-[9px] uppercase text-[#6B6B75]">Score global</div>
              <div
                className="text-2xl font-extrabold font-mono"
                style={{ color: scoreColor(data.summary.avg_score) }}
              >
                {data.summary.avg_score >= 0 ? "+" : ""}
                {data.summary.avg_score.toFixed(3)}
              </div>
            </Card>
            <Card className="p-3">
              <div className="text-[9px] uppercase text-[#6B6B75]">Positives</div>
              <div className="text-2xl font-extrabold font-mono text-[#22C55E]">
                {data.summary.positive}
              </div>
            </Card>
            <Card className="p-3">
              <div className="text-[9px] uppercase text-[#6B6B75]">Negatives</div>
              <div className="text-2xl font-extrabold font-mono text-[#EF4444]">
                {data.summary.negative}
              </div>
            </Card>
            <Card className="p-3">
              <div className="text-[9px] uppercase text-[#6B6B75]">Tickers</div>
              <div className="text-2xl font-extrabold font-mono text-[#F0F0F0]">
                {Object.keys(data.tickers).length}
              </div>
            </Card>
            <Card className="p-3">
              <div className="text-[9px] uppercase text-[#6B6B75]">Alertes</div>
              <div className="text-2xl font-extrabold font-mono text-[#FF6B00]">
                {data.anomalies.length}
              </div>
            </Card>
          </div>

          {/* Anomalies banner */}
          {data.anomalies.length > 0 && (
            <Card className="p-4">
              <h3 className="text-xs font-bold text-[#F0F0F0] mb-3 uppercase tracking-wider">
                Anomalies semantiques detectees
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {data.anomalies.slice(0, 9).map((a, i) => {
                  const color = anomalyColor(a.type);
                  return (
                    <div
                      key={i}
                      className="p-3 rounded-lg"
                      style={{
                        backgroundColor: `${color}15`,
                        border: `1px solid ${color}44`,
                      }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono font-bold text-sm" style={{ color }}>
                          {a.ticker}
                        </span>
                        <span
                          className="text-[9px] font-bold px-2 py-0.5 rounded"
                          style={{ backgroundColor: `${color}33`, color }}
                        >
                          {a.type.replace("_", " ")}
                        </span>
                      </div>
                      <div className="text-[10px] text-[#6B6B75] mb-2">{anomalyLabel(a)}</div>
                      <div className="h-1 bg-[#1A1A1E] rounded-full">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${a.severity}%`, backgroundColor: color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Top positive / negative */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Card className="p-4">
              <h3 className="text-xs font-bold text-[#22C55E] mb-3 uppercase tracking-wider">
                Top sentiment positif
              </h3>
              {data.top_positive.length === 0 ? (
                <div className="text-[11px] text-[#6B6B75]">Aucun ticker avec couverture suffisante</div>
              ) : (
                <div className="space-y-1">
                  {data.top_positive.map((t) => (
                    <div
                      key={t.ticker}
                      className="flex items-center justify-between py-1.5 border-b border-[#1E1E22] last:border-0"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-[#FF6B00] w-12">
                          {t.ticker}
                        </span>
                        <span className="text-[10px] text-[#6B6B75]">
                          {t.count} news
                        </span>
                      </div>
                      <span
                        className="font-mono font-bold text-sm"
                        style={{ color: scoreColor(t.avg_score) }}
                      >
                        {t.avg_score >= 0 ? "+" : ""}
                        {t.avg_score.toFixed(3)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="p-4">
              <h3 className="text-xs font-bold text-[#EF4444] mb-3 uppercase tracking-wider">
                Top sentiment negatif
              </h3>
              {data.top_negative.length === 0 ? (
                <div className="text-[11px] text-[#6B6B75]">Aucun ticker avec couverture suffisante</div>
              ) : (
                <div className="space-y-1">
                  {data.top_negative.map((t) => (
                    <div
                      key={t.ticker}
                      className="flex items-center justify-between py-1.5 border-b border-[#1E1E22] last:border-0"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-[#FF6B00] w-12">
                          {t.ticker}
                        </span>
                        <span className="text-[10px] text-[#6B6B75]">{t.count} news</span>
                      </div>
                      <span
                        className="font-mono font-bold text-sm"
                        style={{ color: scoreColor(t.avg_score) }}
                      >
                        {t.avg_score >= 0 ? "+" : ""}
                        {t.avg_score.toFixed(3)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Full ticker table */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <h3 className="text-xs font-bold text-[#F0F0F0] uppercase tracking-wider">
                Tous les tickers ({filteredTickers.length})
              </h3>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="bg-[#0D0D10] border border-[#1E1E22] rounded-md px-2 py-1 text-xs text-[#F0F0F0] w-32"
                />
                {(["all", "pos", "neg", "alert"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all ${
                      filter === f
                        ? "bg-[#FF6B00] text-black"
                        : "bg-[#1A1A1E] text-[#6B6B75] hover:text-[#F0F0F0]"
                    }`}
                  >
                    {f === "all" ? "TOUS" : f === "pos" ? "POS" : f === "neg" ? "NEG" : "ALERTES"}
                  </button>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-[#1E1E22]">
                    <th className="text-left text-[9px] text-[#6B6B75] uppercase p-2">Ticker</th>
                    <th className="text-right text-[9px] text-[#6B6B75] uppercase p-2">Score</th>
                    <th className="text-right text-[9px] text-[#6B6B75] uppercase p-2">News</th>
                    <th className="text-right text-[9px] text-[#6B6B75] uppercase p-2">+</th>
                    <th className="text-right text-[9px] text-[#6B6B75] uppercase p-2">-</th>
                    <th className="text-right text-[9px] text-[#6B6B75] uppercase p-2">Crisis</th>
                    <th className="text-left text-[9px] text-[#6B6B75] uppercase p-2">Derniere headline</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTickers.slice(0, 50).map((t) => {
                    const last = t.latest_headlines[t.latest_headlines.length - 1];
                    return (
                      <tr
                        key={t.ticker}
                        className="border-b border-[#0E0E12] hover:bg-[#FFFFFF06]"
                      >
                        <td className="p-2 font-mono font-bold text-xs text-[#FF6B00]">
                          {t.ticker}
                        </td>
                        <td
                          className="p-2 text-right font-mono font-bold text-xs"
                          style={{ color: scoreColor(t.avg_score) }}
                        >
                          {t.avg_score >= 0 ? "+" : ""}
                          {t.avg_score.toFixed(3)}
                        </td>
                        <td className="p-2 text-right font-mono text-xs text-[#F0F0F0]">
                          {t.count}
                        </td>
                        <td className="p-2 text-right font-mono text-xs text-[#22C55E]">
                          {t.positive}
                        </td>
                        <td className="p-2 text-right font-mono text-xs text-[#EF4444]">
                          {t.negative}
                        </td>
                        <td className="p-2 text-right font-mono text-xs text-[#FF6B00]">
                          {t.crisis || ""}
                        </td>
                        <td className="p-2 text-[11px] text-[#6B6B75] truncate max-w-xs">
                          {last?.headline || ""}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredTickers.length === 0 && (
                <div className="text-center py-8 text-[#6B6B75] text-xs">Aucun ticker</div>
              )}
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
