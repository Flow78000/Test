"use client";

import { useState, useCallback, useEffect } from "react";
import { PageHeader, Card, KpiCard } from "@/components/ui/card";
import { RefreshTimer } from "@/components/ui/refresh-timer";
import { useVisiblePolling } from "@/hooks/use-visible-polling";
import { fmtPremium, timeAgo } from "@/lib/format";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

const API = "http://localhost:3850";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SuspiciousTrade {
  type: string;
  premium: number;
  time: string;
  strike: number | null;
  expiry: string | null;
  gap_minutes: number;
  source: string;
}

interface Signal {
  id: string;
  ticker: string;
  news_headline: string;
  news_time: string;
  news_direction: string | null;
  suspicious_trades: SuspiciousTrade[];
  score: number;
  time_gap_minutes: number;
  time_gap_label: string;
  direction_match: boolean;
  max_premium: number;
  summary: string;
}

interface Stats {
  news_scanned: number;
  matches_found: number;
  avg_score: number;
  flow_alerts_checked: number;
  dark_pool_checked: number;
}

interface NewsTrading {
  ok: boolean;
  generated_at: string;
  signals: Signal[];
  stats: Stats;
}

// ---------------------------------------------------------------------------
// Color helpers
// ---------------------------------------------------------------------------

function scoreColor(score: number): string {
  if (score >= 70) return "#EF4444";
  if (score >= 40) return "#FFA726";
  return "#F0C419";
}

function scoreBg(score: number): string {
  if (score >= 70) return "#EF444418";
  if (score >= 40) return "#FFA72618";
  return "#F0C41918";
}

function tradeTypeColor(type: string): string {
  const t = type.toUpperCase();
  if (t.includes("CALL")) return "#22C55E";
  if (t.includes("PUT")) return "#EF4444";
  return "#42A5F5";
}

// ---------------------------------------------------------------------------
// Mini Timeline
// ---------------------------------------------------------------------------

interface TimelinePoint {
  gap: number;
  premium: number;
  type: string;
}

function TimelineDot({ active, payload }: { active?: boolean; payload?: Array<{ payload: TimelinePoint }> }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-[#111114] border border-[#2A2A2E] rounded px-2 py-1.5 text-[10px]">
      <div className="font-semibold" style={{ color: tradeTypeColor(d.type) }}>{d.type}</div>
      <div className="text-[#F0F0F0] font-mono">{fmtPremium(d.premium)}</div>
      <div className="text-[#6B6B75]">{Math.round(d.gap)}min avant news</div>
    </div>
  );
}

function MiniTimeline({ trades }: { trades: SuspiciousTrade[] }) {
  if (!trades.length) return null;

  const maxGap = Math.max(...trades.map((t) => t.gap_minutes), 60);
  const points: TimelinePoint[] = trades.map((t) => ({
    gap: t.gap_minutes,
    premium: t.premium,
    type: t.type,
  }));

  // Scale dot size by premium (log scale)
  const minPrem = Math.min(...trades.map((t) => t.premium));
  const maxPrem = Math.max(...trades.map((t) => t.premium));
  const premRange = maxPrem - minPrem || 1;

  return (
    <div className="mt-3">
      <div className="text-[9px] uppercase tracking-widest text-[#3A3A3E] mb-1">
        Timeline pre-news
      </div>
      <ResponsiveContainer width="100%" height={60}>
        <ScatterChart margin={{ top: 5, right: 10, bottom: 5, left: 5 }}>
          <XAxis
            dataKey="gap"
            type="number"
            domain={[0, maxGap + 10]}
            reversed
            tick={{ fill: "#3A3A3E", fontSize: 8 }}
            tickLine={false}
            axisLine={{ stroke: "#2A2A2E" }}
            tickFormatter={(v) => `${Math.round(v)}m`}
          />
          <YAxis dataKey="premium" type="number" hide />
          <ReferenceLine
            x={0}
            stroke="#EF4444"
            strokeWidth={2}
            strokeDasharray="none"
            label={{ value: "NEWS", position: "right", fill: "#EF4444", fontSize: 8 }}
          />
          <Tooltip content={<TimelineDot />} />
          <Scatter
            data={points}
            fill="#FFA726"
            shape={(props: { cx?: number; cy?: number; payload?: TimelinePoint }) => {
              const { cx = 0, cy = 0, payload } = props;
              if (!payload) return <circle cx={cx} cy={cy} r={4} fill="#FFA726" />;
              const normalizedSize = 4 + ((payload.premium - minPrem) / premRange) * 6;
              const color = tradeTypeColor(payload.type);
              return (
                <circle
                  cx={cx}
                  cy={cy}
                  r={normalizedSize}
                  fill={color}
                  fillOpacity={0.7}
                  stroke={color}
                  strokeWidth={1}
                />
              );
            }}
          />
        </ScatterChart>
      </ResponsiveContainer>
      <div className="flex justify-between text-[8px] text-[#3A3A3E] mt-0.5">
        <span>{Math.round(maxGap)}min avant</span>
        <span>◆ NEWS</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Score Badge
// ---------------------------------------------------------------------------

function ScoreBadge({ score }: { score: number }) {
  const color = scoreColor(score);
  const bg = scoreBg(score);
  return (
    <div
      className="flex flex-col items-center justify-center w-16 h-16 rounded-xl shrink-0 border"
      style={{ background: bg, borderColor: `${color}44` }}
    >
      <div className="text-2xl font-extrabold font-mono leading-none" style={{ color }}>
        {score}
      </div>
      <div className="text-[8px] text-[#6B6B75] mt-0.5 uppercase tracking-wider">score</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Signal Card
// ---------------------------------------------------------------------------

function SignalCard({ signal }: { signal: Signal }) {
  const [expanded, setExpanded] = useState(false);
  const newsDate = new Date(signal.news_time);
  const newsDateStr = newsDate.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      className="bg-[#1A1A1E] border border-[#2A2A2E] rounded-lg p-4 cursor-pointer transition-all hover:border-[#3A3A3E]"
      style={{ borderColor: `${scoreColor(signal.score)}22` }}
      onClick={() => setExpanded((v) => !v)}
    >
      <div className="flex gap-4">
        {/* Left: Score badge */}
        <ScoreBadge score={signal.score} />

        {/* Center: main info */}
        <div className="flex-1 min-w-0">
          {/* Ticker + gap */}
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-sm font-extrabold text-[#F0F0F0] font-mono">
              {signal.ticker}
            </span>
            <span
              className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider"
              style={{
                background: "#FFA72618",
                color: "#FFA726",
                border: "1px solid #FFA72633",
              }}
            >
              {signal.time_gap_label}
            </span>
            {/* Direction match */}
            {signal.direction_match ? (
              <span className="flex items-center gap-1 text-[9px] font-semibold text-[#22C55E]">
                <span>✓</span> Direction confirmée
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[9px] font-semibold text-[#6B6B75]">
                <span>✗</span> Direction non confirmée
              </span>
            )}
            {signal.news_direction && (
              <span
                className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase"
                style={{
                  background: signal.news_direction === "BULLISH" ? "#22C55E18" : "#EF444418",
                  color: signal.news_direction === "BULLISH" ? "#22C55E" : "#EF4444",
                }}
              >
                News {signal.news_direction === "BULLISH" ? "haussière" : "baissière"}
              </span>
            )}
          </div>

          {/* Headline */}
          <div className="text-[11px] text-[#D0D0D0] leading-snug line-clamp-2 mb-1.5">
            {signal.news_headline}
          </div>

          {/* News time */}
          <div className="text-[9px] text-[#6B6B75]">
            News publiée le {newsDateStr} · {timeAgo(signal.news_time)}
          </div>
        </div>

        {/* Right: summary + trade types */}
        <div className="shrink-0 w-44 hidden md:flex flex-col gap-2 text-right">
          <div className="text-[9px] text-[#6B6B75] leading-relaxed">{signal.summary}</div>
          <div className="flex flex-wrap gap-1 justify-end">
            {Array.from(new Set(signal.suspicious_trades.map((t) => t.type))).map((type) => (
              <span
                key={type}
                className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase"
                style={{
                  background: `${tradeTypeColor(type)}18`,
                  color: tradeTypeColor(type),
                }}
              >
                {type}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Expanded: trades detail + timeline */}
      {expanded && (
        <div className="mt-4 border-t border-[#1A1A1E] pt-4 space-y-3">
          {/* Mobile summary */}
          <div className="md:hidden text-[9px] text-[#6B6B75]">{signal.summary}</div>

          {/* Trades table */}
          <div>
            <div className="text-[9px] uppercase tracking-widest text-[#3A3A3E] mb-2">
              Trades suspects ({signal.suspicious_trades.length})
            </div>
            <div className="space-y-1.5">
              {signal.suspicious_trades.map((trade, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 text-[10px] rounded px-2 py-1.5"
                  style={{ background: "#0F0F12" }}
                >
                  {/* Type badge */}
                  <span
                    className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase w-20 text-center shrink-0"
                    style={{
                      background: `${tradeTypeColor(trade.type)}22`,
                      color: tradeTypeColor(trade.type),
                    }}
                  >
                    {trade.type}
                  </span>

                  {/* Premium */}
                  <span className="font-mono font-bold text-[#F0F0F0] w-16 shrink-0">
                    {fmtPremium(trade.premium)}
                  </span>

                  {/* Strike / expiry */}
                  {trade.strike && (
                    <span className="font-mono text-[#6B6B75] shrink-0">
                      Strike {trade.strike}
                      {trade.expiry ? ` · ${trade.expiry}` : ""}
                    </span>
                  )}

                  {/* Gap */}
                  <span className="ml-auto text-[#FFA726] font-semibold shrink-0">
                    {Math.round(trade.gap_minutes)}min avant
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Mini timeline */}
          <MiniTimeline trades={signal.suspicious_trades} />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState() {
  return (
    <Card className="p-12 text-center">
      <div className="text-3xl mb-3">🔍</div>
      <div className="text-sm font-semibold text-[#F0F0F0] mb-2">
        Aucun signal détecté
      </div>
      <div className="text-[11px] text-[#6B6B75] max-w-sm mx-auto leading-relaxed">
        Le scanner analyse les corrélations entre flux options et actualités.
        Les signaux apparaissent quand des trades suspects sont détectés dans
        les 4 heures précédant une news à fort impact.
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function NewsTradingPage() {
  const [data, setData] = useState<NewsTrading | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number | undefined>(undefined);

  const load = useCallback(async () => {
    try {
      setError(null);
      const r = await fetch(`${API}/api/news-trading/`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const json: NewsTrading = await r.json();
      setData(json);
      setLastUpdate(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useVisiblePolling(load, 120_000);

  const signals = data?.signals ?? [];
  const stats = data?.stats;

  return (
    <div className="p-6">
      <PageHeader
        timer={<RefreshTimer intervalSeconds={120} lastUpdate={lastUpdate} />}
        title="NANEX #1 — Trading Ahead of News"
        subtitle="Détection de trading pré-news suspect — Corrélation flux options / actualités"
      >
        <button
          onClick={load}
          className="px-3 py-1.5 bg-[#111114] border border-[#1E1E22] rounded-lg text-xs hover:border-[#FF6B00] transition-colors"
        >
          Rafraîchir
        </button>
      </PageHeader>

      {loading && !data ? (
        <Card className="p-12 text-center text-[#6B6B75]">
          Analyse des corrélations news / flux options en cours...
        </Card>
      ) : error && !data ? (
        <Card className="p-12 text-center">
          <span className="text-[#FF6B00] font-semibold">Reconnexion automatique en cours...</span>
          <div className="text-xs text-[#6B6B75] mt-2">{error}</div>
        </Card>
      ) : data ? (
        <div className="space-y-5">

          {/* KPI Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard
              label="Signaux Détectés"
              value={stats?.matches_found ?? 0}
              sublabel="trades pré-news suspects"
              color={
                (stats?.matches_found ?? 0) >= 5
                  ? "#EF4444"
                  : (stats?.matches_found ?? 0) >= 2
                  ? "#FFA726"
                  : "#22C55E"
              }
            />
            <KpiCard
              label="Score Moyen de Suspicion"
              value={stats?.avg_score ?? 0}
              sublabel="sur 100"
              color={scoreColor(stats?.avg_score ?? 0)}
            />
            <KpiCard
              label="News Scannées"
              value={stats?.news_scanned ?? 0}
              sublabel={`${stats?.flow_alerts_checked ?? 0} alertes flow`}
              color="#42A5F5"
            />
            <Card className="p-4 text-center">
              <div className="text-[10px] text-[#6B6B75] uppercase tracking-widest mb-1">
                Dernier Scan
              </div>
              <div className="text-sm font-bold text-[#F0F0F0] mt-1 font-mono">
                {data.generated_at ? timeAgo(data.generated_at) : "--"}
              </div>
              <div className="text-[9px] text-[#6B6B75] mt-1">
                Cache 5 min
              </div>
            </Card>
          </div>

          {/* Score legend */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="text-[9px] text-[#6B6B75] uppercase tracking-widest">
              Score suspicion:
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-[#EF4444]" />
              <span className="text-[9px] text-[#6B6B75]">Élevé (&gt;70)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-[#FFA726]" />
              <span className="text-[9px] text-[#6B6B75]">Modéré (40-70)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-[#F0C419]" />
              <span className="text-[9px] text-[#6B6B75]">Faible (&lt;40)</span>
            </div>
            <div className="ml-auto text-[9px] text-[#3A3A3E]">
              Cliquer sur un signal pour voir le détail et la timeline
            </div>
          </div>

          {/* Signals */}
          {signals.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-3">
              <div className="text-[10px] uppercase tracking-[2px] text-[#6B6B75]">
                Signaux actifs — {signals.length} détecté{signals.length > 1 ? "s" : ""}
              </div>
              {signals.map((sig) => (
                <SignalCard key={sig.id} signal={sig} />
              ))}
            </div>
          )}

          {/* Footer */}
          <Card className="p-3 flex items-center gap-4 flex-wrap">
            <div className="text-[9px] text-[#3A3A3E] uppercase tracking-widest">
              Nanex #1 — Trading Ahead of News
            </div>
            <div className="text-[9px] text-[#3A3A3E]">
              Fenêtre d&apos;analyse: 4h avant chaque news · Seuil premium: $500K
            </div>
            <div className="ml-auto text-[9px] text-[#3A3A3E]">
              Sources: News Archive · UW Flow Alerts · Dark Pool
            </div>
          </Card>

        </div>
      ) : null}
    </div>
  );
}
