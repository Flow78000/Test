"use client";

import { useEffect, useState } from "react";
import { PageHeader, Card, KpiCard, Badge, LiveBadge } from "@/components/ui/card";
import { RefreshTimer } from "@/components/ui/refresh-timer";
import { useVisiblePolling } from "@/hooks/use-visible-polling";
import { timeAgo } from "@/lib/format";

const API = "http://localhost:3850";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Trade {
  direction: string;
  premium: number;
  strike: number | null;
  expiry: string | null;
  price?: number;
  time: string | null;
  alert_rule?: string;
}

interface NewsItem {
  headline: string;
  time: string;
  direction: "BULLISH" | "BEARISH" | null;
  source: string;
  url: string;
  match?: boolean | null;
}

interface Signal {
  id: string;
  ticker: string;
  score: number;
  total_premium: number;
  call_premium: number;
  put_premium: number;
  call_ratio: number;
  flow_direction: "BULLISH" | "BEARISH" | "MIXED";
  trade_count: number;
  max_premium: number;
  largest_trade: Trade | null;
  latest_time: string | null;
  trades: Trade[];
  news_count: number;
  news: NewsItem[];
  best_news_match: NewsItem | null;
  has_news: boolean;
  summary: string;
}

interface Stats {
  tickers_flagged: number;
  flow_alerts_scanned: number;
  flow_alerts_kept: number;
  news_items_scanned: number;
  tickers_with_news: number;
  total_premium: number;
  bullish_tickers: number;
  bearish_tickers: number;
  avg_score: number;
}

interface Response {
  ok: boolean;
  generated_at: string;
  signals: Signal[];
  stats: Stats;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function fmtMoney(v: number): string {
  const a = Math.abs(v);
  if (!v) return "--";
  if (a >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (a >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

function scoreColor(s: number): string {
  if (s >= 75) return "#EF4444";
  if (s >= 50) return "#FF6B00";
  if (s >= 30) return "#F59E0B";
  return "#6B6B75";
}

function dirColor(d: string): string {
  if (d === "BULLISH") return "#10B981";
  if (d === "BEARISH") return "#EF4444";
  return "#6B6B75";
}

function dirLabel(d: string): string {
  if (d === "BULLISH") return "Haussier";
  if (d === "BEARISH") return "Baissier";
  return "Mixte";
}

// ---------------------------------------------------------------------------
// Score Badge
// ---------------------------------------------------------------------------
function ScoreBadge({ score }: { score: number }) {
  const color = scoreColor(score);
  return (
    <div
      className="flex flex-col items-center justify-center rounded-lg px-3 py-2 border min-w-[76px]"
      style={{
        backgroundColor: `${color}15`,
        borderColor: `${color}50`,
      }}
    >
      <div className="text-3xl font-bold font-mono" style={{ color }}>
        {score}
      </div>
      <div className="text-[10px] uppercase tracking-wider text-[#6B6B75]">
        Score
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Signal card
// ---------------------------------------------------------------------------
function SignalCard({ signal }: { signal: Signal }) {
  const [expanded, setExpanded] = useState(false);
  const dir = signal.flow_direction;
  const dColor = dirColor(dir);
  const callPct = Math.round(signal.call_ratio * 100);
  const putPct = 100 - callPct;
  const scoreC = scoreColor(signal.score);

  const news = signal.best_news_match;
  const matchBadge = news
    ? news.match === true
      ? { label: "Confirmé par news", color: "#10B981" }
      : news.match === false
      ? { label: "Contre-pied news", color: "#F59E0B" }
      : { label: "News active", color: "#42A5F5" }
    : null;

  return (
    <div
      className="bg-[#1A1A1E] border rounded-lg p-4 cursor-pointer transition-all hover:bg-[#1F1F24]"
      style={{ borderColor: `${scoreC}40` }}
      onClick={() => setExpanded((v) => !v)}
    >
      <div className="flex gap-4 items-start">
        {/* Score */}
        <ScoreBadge score={signal.score} />

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <div
              className="font-mono font-bold text-xl"
              style={{ color: "#F0F0F0" }}
            >
              {signal.ticker}
            </div>
            <Badge color={dColor}>{dirLabel(dir)}</Badge>
            {matchBadge && (
              <Badge color={matchBadge.color}>{matchBadge.label}</Badge>
            )}
            {signal.latest_time && (
              <span className="text-xs text-[#6B6B75]">
                {timeAgo(signal.latest_time)}
              </span>
            )}
          </div>

          {/* Flow bar */}
          <div className="flex items-center gap-3 mt-2">
            <div className="flex-1 h-6 bg-[#0A0A0A] rounded overflow-hidden flex">
              <div
                className="h-full flex items-center justify-center text-[10px] font-mono"
                style={{
                  width: `${callPct}%`,
                  backgroundColor: "#10B98140",
                  color: "#10B981",
                  minWidth: callPct > 0 ? "32px" : "0",
                }}
              >
                {callPct > 10 && `${callPct}%`}
              </div>
              <div
                className="h-full flex items-center justify-center text-[10px] font-mono"
                style={{
                  width: `${putPct}%`,
                  backgroundColor: "#EF444440",
                  color: "#EF4444",
                  minWidth: putPct > 0 ? "32px" : "0",
                }}
              >
                {putPct > 10 && `${putPct}%`}
              </div>
            </div>
            <div className="font-mono text-sm" style={{ color: dColor }}>
              {fmtMoney(signal.total_premium)}
            </div>
            <div className="text-xs text-[#6B6B75]">
              {signal.trade_count} trades
            </div>
          </div>

          {/* News line */}
          {news && (
            <div className="mt-2 text-xs text-[#A1A1A8] line-clamp-1">
              📰 <span className="text-[#6B6B75]">{news.source}</span>:{" "}
              {news.headline}
            </div>
          )}
        </div>

        <div className="text-[#6B6B75] text-xs">
          {expanded ? "▾" : "▸"}
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-[#2A2A2E]">
          <div className="text-xs text-[#6B6B75] mb-2 italic">
            {signal.summary}
          </div>

          {/* Largest trade */}
          {signal.largest_trade && (
            <div className="mb-3">
              <div className="text-[11px] uppercase tracking-wider text-[#6B6B75] mb-1">
                Trade principal
              </div>
              <div className="flex gap-3 text-xs font-mono">
                <span style={{ color: dirColor(signal.largest_trade.direction) }}>
                  {signal.largest_trade.direction}
                </span>
                <span>{fmtMoney(signal.largest_trade.premium)}</span>
                {signal.largest_trade.strike ? (
                  <span className="text-[#6B6B75]">
                    Strike {signal.largest_trade.strike}
                  </span>
                ) : null}
                {signal.largest_trade.expiry && (
                  <span className="text-[#6B6B75]">
                    Exp {signal.largest_trade.expiry}
                  </span>
                )}
                {signal.largest_trade.alert_rule && (
                  <span className="text-[#6B6B75] italic">
                    {signal.largest_trade.alert_rule}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* All trades */}
          <div className="mb-3">
            <div className="text-[11px] uppercase tracking-wider text-[#6B6B75] mb-1">
              Échantillon ({signal.trades.length})
            </div>
            <div className="max-h-48 overflow-y-auto">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="text-[#6B6B75]">
                    <th className="text-left py-1">Dir</th>
                    <th className="text-right">Premium</th>
                    <th className="text-right">Strike</th>
                    <th className="text-right">Expiry</th>
                    <th className="text-right">Heure</th>
                  </tr>
                </thead>
                <tbody>
                  {signal.trades.map((t, i) => (
                    <tr key={i} className="border-t border-[#2A2A2E]">
                      <td
                        className="py-1"
                        style={{ color: dirColor(t.direction) }}
                      >
                        {t.direction}
                      </td>
                      <td className="text-right">{fmtMoney(t.premium)}</td>
                      <td className="text-right text-[#A1A1A8]">
                        {t.strike || "--"}
                      </td>
                      <td className="text-right text-[#6B6B75]">
                        {t.expiry || "--"}
                      </td>
                      <td className="text-right text-[#6B6B75]">
                        {t.time ? timeAgo(t.time) : "--"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* News list */}
          {signal.news.length > 0 && (
            <div>
              <div className="text-[11px] uppercase tracking-wider text-[#6B6B75] mb-1">
                News associées ({signal.news_count})
              </div>
              <div className="space-y-1">
                {signal.news.map((n, i) => (
                  <div
                    key={i}
                    className="text-xs p-2 rounded bg-[#0A0A0A] border border-[#2A2A2E]"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[#6B6B75] text-[10px]">
                        {n.source} · {timeAgo(n.time)}
                      </span>
                      {n.direction && (
                        <Badge color={dirColor(n.direction)}>
                          {dirLabel(n.direction)}
                        </Badge>
                      )}
                    </div>
                    <div className="text-[#F0F0F0]">{n.headline}</div>
                    {n.url && (
                      <a
                        href={n.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#42A5F5] text-[10px] hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Ouvrir →
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function SmartMoneyPage() {
  const [data, setData] = useState<Response | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "bullish" | "bearish" | "news">(
    "all",
  );

  async function load() {
    try {
      const r = await fetch(`${API}/api/smart-money/`, { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      setData(j);
      setError(null);
    } catch (e: any) {
      setError(e.message || "Erreur chargement");
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);
  useVisiblePolling(load, 60000);

  const signals = data?.signals ?? [];
  const stats = data?.stats;

  const filtered = signals.filter((s) => {
    if (filter === "bullish") return s.flow_direction === "BULLISH";
    if (filter === "bearish") return s.flow_direction === "BEARISH";
    if (filter === "news") return s.has_news;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F0F0F0] p-6">
      <PageHeader
        title="Smart Money"
        subtitle="Flux options inhabituels + news actives — détecte où l'argent se positionne"
        timer={
          <div className="flex items-center gap-3">
            <LiveBadge />
            <RefreshTimer intervalSeconds={60} />
          </div>
        }
      />

      {/* Error banner */}
      {error && (
        <div className="mb-4 bg-[#EF4444]/10 border border-[#EF4444]/40 text-[#EF4444] px-4 py-2 rounded-lg text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KpiCard
          label="Tickers détectés"
          value={stats?.tickers_flagged ?? 0}
          sublabel={`${stats?.flow_alerts_kept ?? 0} flow alerts`}
        />
        <KpiCard
          label="Premium total"
          value={fmtMoney(stats?.total_premium ?? 0)}
          sublabel={`${stats?.flow_alerts_scanned ?? 0} scanned`}
        />
        <KpiCard
          label="Bullish / Bearish"
          value={`${stats?.bullish_tickers ?? 0} / ${stats?.bearish_tickers ?? 0}`}
          sublabel="Par direction flow"
        />
        <KpiCard
          label="Avec news"
          value={`${stats?.tickers_with_news ?? 0}/${stats?.tickers_flagged ?? 0}`}
          sublabel={`Score moyen ${stats?.avg_score ?? 0}`}
        />
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        {(
          [
            { id: "all", label: "Tous", count: signals.length },
            {
              id: "bullish",
              label: "Bullish",
              count: signals.filter((s) => s.flow_direction === "BULLISH")
                .length,
            },
            {
              id: "bearish",
              label: "Bearish",
              count: signals.filter((s) => s.flow_direction === "BEARISH")
                .length,
            },
            {
              id: "news",
              label: "Avec news",
              count: signals.filter((s) => s.has_news).length,
            },
          ] as const
        ).map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              filter === f.id
                ? "bg-[#FF6B00] text-black"
                : "bg-[#1A1A1E] text-[#A1A1A8] border border-[#2A2A2E] hover:bg-[#2A2A2E]"
            }`}
          >
            {f.label} <span className="opacity-60">({f.count})</span>
          </button>
        ))}
      </div>

      {/* Signals list */}
      {loading && !data ? (
        <div className="text-center py-12 text-[#6B6B75]">
          Chargement du scan...
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <div className="text-center py-10">
            <div className="text-4xl mb-3 opacity-30">📡</div>
            <div className="text-[#F0F0F0] mb-2">Aucun signal détecté</div>
            <div className="text-[#6B6B75] text-sm max-w-md mx-auto">
              Le scanner analyse le flux options et le croise avec l'actualité.
              Si aucun ticker n'affiche de flux inhabituel supérieur au seuil,
              cette liste reste vide. Rafraîchit automatiquement toutes les 60s.
            </div>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((sig) => (
            <SignalCard key={sig.id} signal={sig} />
          ))}
        </div>
      )}

      {/* Help */}
      <div className="mt-8 text-xs text-[#6B6B75] max-w-3xl">
        <div className="font-semibold text-[#A1A1A8] mb-1">
          Comment lire ce module
        </div>
        <p>
          Chaque ligne représente un ticker avec du flux options inhabituel
          agrégé. Le <span className="text-[#F0F0F0]">Score</span> (0-100)
          combine : taille totale du premium, concentration directionnelle
          (ratio calls/puts), et présence d'une news sur le ticker dans les 48h.
          Un flux fortement biaisé + une news qui confirme la direction = score
          élevé.
        </p>
      </div>
    </div>
  );
}
