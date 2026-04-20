"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader, Card, KpiCard, Badge, LiveBadge } from "@/components/ui/card";
import { RefreshTimer } from "@/components/ui/refresh-timer";
import { useVisiblePolling } from "@/hooks/use-visible-polling";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

const API = "http://localhost:3850";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Indicator {
  id: string;
  label: string;
  description: string;
  score: number;
  value: number | null;
  unit: string;
  threshold: string;
  status: "NORMAL" | "ALERTE" | "CRITIQUE";
  available: boolean;
}

interface StrangeDaysData {
  ok: boolean;
  generated_at: string;
  session: string;
  overall_score: number;
  overall_color: string;
  overall_status: string;
  active_anomalies: number;
  critique_count: number;
  most_severe: string;
  most_severe_score: number;
  indicators: Indicator[];
  available_count: number;
  total_count: number;
}

// ---------------------------------------------------------------------------
// Color helpers
// ---------------------------------------------------------------------------

function scoreColor(score: number): string {
  if (score >= 80) return "#EF4444";
  if (score >= 60) return "#FF6B00";
  if (score >= 30) return "#FFA726";
  return "#22C55E";
}

function statusColor(status: string): string {
  if (status === "CRITIQUE") return "#EF4444";
  if (status === "ALERTE") return "#FFA726";
  return "#22C55E";
}

function statusBg(status: string): string {
  if (status === "CRITIQUE") return "#EF444420";
  if (status === "ALERTE") return "#FFA72620";
  return "#22C55E20";
}

function overallBorderColor(score: number): string {
  if (score >= 80) return "#EF4444";
  if (score >= 60) return "#FF6B00";
  if (score >= 30) return "#FFA726";
  return "#22C55E";
}

function sessionColor(session: string): string {
  if (session === "CASH") return "#22C55E";
  if (session === "PRE-MKT" || session === "AFTER-H") return "#FFA726";
  return "#6B6B75";
}

// ---------------------------------------------------------------------------
// Radar chart tooltip
// ---------------------------------------------------------------------------

function RadarTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: { subject: string; score: number; fullMark: number } }> }) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-[#111114] border border-[#2A2A2E] rounded-lg px-3 py-2 text-xs">
      <div className="font-semibold text-[#F0F0F0] mb-1">{d.subject}</div>
      <div className="font-mono" style={{ color: scoreColor(d.score) }}>
        Score: {d.score.toFixed(0)} / 100
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Score bar
// ---------------------------------------------------------------------------

function ScoreBar({ score, color }: { score: number; color: string }) {
  return (
    <div className="h-1.5 w-full bg-[#1A1A1E] rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${score}%`, background: color }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Indicator Card
// ---------------------------------------------------------------------------

function IndicatorCard({ ind }: { ind: Indicator }) {
  const color = scoreColor(ind.score);
  const sColor = statusColor(ind.status);
  const sBg = statusBg(ind.status);

  return (
    <Card
      className="p-4 flex flex-col gap-3"
      style={{
        borderColor: ind.score >= 30 ? `${color}55` : "#1E1E22",
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[11px] font-bold text-[#F0F0F0] leading-tight">
            {ind.label}
          </div>
          {!ind.available && (
            <div className="text-[9px] text-[#6B6B75] mt-0.5 uppercase tracking-wide">
              Donnees indisponibles
            </div>
          )}
        </div>
        <span
          className="shrink-0 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest"
          style={{ background: sBg, color: sColor, border: `1px solid ${sColor}44` }}
        >
          {ind.status}
        </span>
      </div>

      {/* Score */}
      <div className="flex items-end gap-2">
        <span className="text-3xl font-extrabold font-mono leading-none" style={{ color }}>
          {ind.available ? ind.score.toFixed(0) : "--"}
        </span>
        <span className="text-[10px] text-[#6B6B75] mb-1">/ 100</span>
        {ind.available && ind.value !== null && (
          <span className="ml-auto text-[10px] font-mono text-[#6B6B75]">
            {ind.value} {ind.unit}
          </span>
        )}
      </div>

      {/* Bar */}
      <ScoreBar score={ind.available ? ind.score : 0} color={color} />

      {/* Description */}
      <p className="text-[10px] text-[#6B6B75] leading-relaxed">
        {ind.description}
      </p>

      {/* Threshold */}
      <div className="text-[9px] text-[#3A3A3E] uppercase tracking-wider border-t border-[#1A1A1E] pt-2">
        Seuil: {ind.threshold}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function StrangeDaysPage() {
  const [data, setData] = useState<StrangeDaysData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number | undefined>(undefined);

  const load = useCallback(async () => {
    try {
      setError(null);
      const r = await fetch(`${API}/api/strange-days/`, { signal: AbortSignal.timeout(10000) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const json = await r.json();
      setData(json);
      setLastUpdate(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useVisiblePolling(load, 60000);

  // Prepare radar data
  const radarData = data?.indicators.map((ind) => ({
    subject: ind.label.length > 16 ? ind.label.slice(0, 14) + "…" : ind.label,
    fullLabel: ind.label,
    score: ind.available ? ind.score : 0,
    fullMark: 100,
  })) ?? [];

  const overallScore = data?.overall_score ?? 0;
  const borderColor = overallBorderColor(overallScore);

  // Radar fill color based on overall score
  const radarFill = overallScore >= 70 ? "#EF4444" : overallScore >= 30 ? "#FFA726" : "#22C55E";

  return (
    <div className="p-6">
      <PageHeader
        timer={<RefreshTimer intervalSeconds={60} lastUpdate={lastUpdate} />}
        title="Strange Days — Nanex #3"
        subtitle="Radar d'anomalies de marche — Detection statistique de comportements anormaux"
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
          Calcul des anomalies de marche...
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
            {/* Overall Strangeness */}
            <Card
              className="p-4 text-center col-span-2 md:col-span-1"
              style={{ borderColor: `${borderColor}66` }}
            >
              <div className="text-[10px] text-[#6B6B75] uppercase tracking-widest mb-1">
                Strangeness Score
              </div>
              <div
                className="text-5xl font-extrabold font-mono"
                style={{ color: borderColor }}
              >
                {overallScore.toFixed(0)}
              </div>
              <div className="text-[10px] text-[#6B6B75] mt-0.5">/ 100</div>
              <div className="mt-2">
                <span
                  className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest"
                  style={{
                    background: `${borderColor}22`,
                    color: borderColor,
                    border: `1px solid ${borderColor}44`,
                  }}
                >
                  {data.overall_status}
                </span>
              </div>
            </Card>

            <KpiCard
              label="Anomalies Actives"
              value={data.active_anomalies}
              sublabel={`${data.critique_count} critique${data.critique_count !== 1 ? "s" : ""}`}
              color={data.active_anomalies > 3 ? "#EF4444" : data.active_anomalies > 1 ? "#FFA726" : "#22C55E"}
            />

            <Card className="p-4 text-center">
              <div className="text-[10px] text-[#6B6B75] uppercase tracking-widest mb-1">
                Signal Principal
              </div>
              <div className="text-sm font-bold text-[#F0F0F0] leading-tight mt-1">
                {data.most_severe}
              </div>
              {data.most_severe_score > 0 && (
                <div
                  className="text-xs font-mono mt-1"
                  style={{ color: scoreColor(data.most_severe_score) }}
                >
                  {data.most_severe_score.toFixed(0)} pts
                </div>
              )}
            </Card>

            <Card className="p-4 text-center">
              <div className="text-[10px] text-[#6B6B75] uppercase tracking-widest mb-1">
                Session
              </div>
              <div
                className="text-xl font-extrabold font-mono mt-1"
                style={{ color: sessionColor(data.session) }}
              >
                {data.session}
              </div>
              <div className="text-[9px] text-[#6B6B75] mt-1">
                {data.available_count}/{data.total_count} sources actives
              </div>
            </Card>
          </div>

          {/* Main: Radar + top indicators */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

            {/* Radar Chart */}
            <Card className="lg:col-span-2 p-4">
              <div className="text-[10px] uppercase tracking-[2px] text-[#6B6B75] mb-4">
                Radar d'Anomalies
              </div>
              {radarData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={radarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                    <PolarGrid stroke="#2A2A2E" />
                    <PolarAngleAxis
                      dataKey="subject"
                      tick={{ fill: "#6B6B75", fontSize: 9, fontFamily: "Outfit, sans-serif" }}
                    />
                    <Radar
                      name="Anomalie"
                      dataKey="score"
                      stroke={radarFill}
                      fill={radarFill}
                      fillOpacity={0.25}
                      strokeWidth={1.5}
                    />
                    <Tooltip content={<RadarTooltip />} />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-[#6B6B75] text-sm">
                  Donnees insuffisantes
                </div>
              )}

              {/* Legend */}
              <div className="flex items-center gap-4 mt-2 justify-center">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-1.5 rounded-full bg-[#22C55E]" />
                  <span className="text-[9px] text-[#6B6B75]">Normal (&lt;30)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-1.5 rounded-full bg-[#FFA726]" />
                  <span className="text-[9px] text-[#6B6B75]">Alerte (30-70)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-1.5 rounded-full bg-[#EF4444]" />
                  <span className="text-[9px] text-[#6B6B75]">Critique (&gt;70)</span>
                </div>
              </div>
            </Card>

            {/* Compact indicator list */}
            <Card className="lg:col-span-3 p-4">
              <div className="text-[10px] uppercase tracking-[2px] text-[#6B6B75] mb-4">
                Scores par Indicateur
              </div>
              <div className="space-y-3">
                {data.indicators
                  .slice()
                  .sort((a, b) => b.score - a.score)
                  .map((ind) => {
                    const color = scoreColor(ind.score);
                    return (
                      <div key={ind.id} className="flex items-center gap-3">
                        {/* Status dot */}
                        <div
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ background: color }}
                        />

                        {/* Label */}
                        <div className="w-36 shrink-0 text-[11px] text-[#D0D0D0] truncate">
                          {ind.label}
                        </div>

                        {/* Bar */}
                        <div className="flex-1">
                          <div className="h-1.5 w-full bg-[#1A1A1E] rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{ width: `${ind.available ? ind.score : 0}%`, background: color }}
                            />
                          </div>
                        </div>

                        {/* Score */}
                        <div
                          className="w-10 text-right text-[11px] font-mono font-bold shrink-0"
                          style={{ color }}
                        >
                          {ind.available ? ind.score.toFixed(0) : "--"}
                        </div>

                        {/* Badge */}
                        <div className="w-16 shrink-0 text-right">
                          <span
                            className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase"
                            style={{
                              background: `${statusColor(ind.status)}20`,
                              color: statusColor(ind.status),
                            }}
                          >
                            {ind.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </Card>
          </div>

          {/* Anomaly Cards Grid */}
          <div>
            <div className="text-[10px] uppercase tracking-[2px] text-[#6B6B75] mb-3">
              Detail des Indicateurs
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {data.indicators.map((ind) => (
                <IndicatorCard key={ind.id} ind={ind} />
              ))}
            </div>
          </div>

          {/* Footer info */}
          <Card className="p-3 flex items-center gap-4 flex-wrap">
            <div className="text-[9px] text-[#3A3A3E] uppercase tracking-widest">
              Nanex #3 — Strange Days
            </div>
            <div className="text-[9px] text-[#3A3A3E]">
              Mise a jour: {new Date(data.generated_at).toLocaleString("fr-FR")}
            </div>
            <div className="ml-auto text-[9px] text-[#3A3A3E]">
              Cache 2 min · Sources: Regime Engine, UW Market Tide, Dark Pool Scanner
            </div>
          </Card>

        </div>
      ) : null}
    </div>
  );
}
