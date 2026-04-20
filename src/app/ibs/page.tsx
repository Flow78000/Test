"use client";

import { useState, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, PageHeader, KpiCard, LiveBadge } from "@/components/ui/card";
import { RefreshTimer } from "@/components/ui/refresh-timer";
import { useVisiblePolling } from "@/hooks/use-visible-polling";

const API = "http://localhost:3850";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// ─── Color helpers ────────────────────────────────────────────────────────────

/** Interpolate between two hex colors by t ∈ [0, 1] */
function lerpHex(a: string, b: string, t: number): string {
  const ah = parseInt(a.slice(1), 16);
  const bh = parseInt(b.slice(1), 16);
  const ar = (ah >> 16) & 0xff, ag = (ah >> 8) & 0xff, ab = ah & 0xff;
  const br = (bh >> 16) & 0xff, bg = (bh >> 8) & 0xff, bb = bh & 0xff;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bv = Math.round(ab + (bb - ab) * t);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${bv.toString(16).padStart(2, "0")}`;
}

/** IBS cell color: red (0) → neutral (0.5) → green (1) */
function ibsCellColor(ibs: number): string {
  if (ibs <= 0.5) {
    const t = ibs / 0.5;
    return lerpHex("#7F1D1D", "#3A2A1A", t); // dark red → dark neutral
  } else {
    const t = (ibs - 0.5) / 0.5;
    return lerpHex("#1A3A2A", "#14532D", t); // dark neutral → dark green
  }
}

/** Returns IBS cell color as saturated red/green for display */
function ibsCellColorSaturated(ibs: number): string {
  if (ibs <= 0.5) {
    const t = ibs / 0.5; // 0=very red, 1=neutral
    return lerpHex("#7F1D1D", "#2A2A2A", t);
  } else {
    const t = (ibs - 0.5) / 0.5; // 0=neutral, 1=very green
    return lerpHex("#2A2A2A", "#14532D", t);
  }
}

/** Monthly return cell color */
function retCellColor(ret: number): string {
  if (ret === 0) return "#2A2A2A";
  if (ret < 0) {
    const t = Math.min(1, Math.abs(ret) / 10); // saturate at -10%
    return lerpHex("#2A2A2A", "#7F1D1D", t);
  } else {
    const t = Math.min(1, ret / 10); // saturate at +10%
    return lerpHex("#2A2A2A", "#14532D", t);
  }
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface QuintileStat {
  label: string;
  q_lo: number;
  q_hi: number;
  count: number;
  avg_ibs: number | null;
  avg_next_day_return: number | null;
  win_rate: number | null;
  sample_size: number;
}

interface HistogramBucket {
  range_lo: number;
  range_hi: number;
  label: string;
  count: number;
}

interface CurrentIbs {
  date: string;
  ibs: number;
  quintile: string;
  open: number;
  high: number;
  low: number;
  close: number;
  historical_avg_next_day_return: number | null;
  historical_win_rate: number | null;
}

interface IbsData {
  ok: boolean;
  generated_at: string;
  total_bars: number;
  date_range: { from: string; to: string };
  years: number[];
  ibs_heatmap: Record<string, Record<string, number | null>>;
  returns_heatmap: Record<string, Record<string, number | null>>;
  quintile_stats: QuintileStat[];
  histogram: HistogramBucket[];
  current_ibs: CurrentIbs | null;
}

// ─── Tooltip for heatmap cells ───────────────────────────────────────────────

interface HeatmapTooltip {
  visible: boolean;
  x: number;
  y: number;
  content: string;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function IbsPage() {
  const [data, setData] = useState<IbsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());
  const [tooltip, setTooltip] = useState<HeatmapTooltip>({ visible: false, x: 0, y: 0, content: "" });

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`${API}/sierra/ibs`, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: IbsData = await res.json();
      setData(json);
      setLastUpdate(Date.now());
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur de connexion");
    }
  }, []);

  useVisiblePolling(fetchData, 300_000); // refresh every 5 min (data is daily)

  const showTooltip = (e: React.MouseEvent, content: string) => {
    setTooltip({ visible: true, x: e.clientX, y: e.clientY, content });
  };
  const hideTooltip = () => setTooltip((t) => ({ ...t, visible: false }));
  const moveTooltip = (e: React.MouseEvent) => {
    if (tooltip.visible) setTooltip((t) => ({ ...t, x: e.clientX, y: e.clientY }));
  };

  // ── Current IBS signal interpretation ──
  const ibsSignal = (ibs: number): { label: string; color: string; desc: string } => {
    if (ibs <= 0.2) return { label: "Très bas", color: "#EF4444", desc: "Clôture proche du low — signal mean-reversion haussier" };
    if (ibs <= 0.4) return { label: "Bas", color: "#F97316", desc: "Clôture sous le mid-range — léger biais haussier" };
    if (ibs <= 0.6) return { label: "Neutre", color: "#6B6B75", desc: "Clôture au milieu du range — signal faible" };
    if (ibs <= 0.8) return { label: "Élevé", color: "#84CC16", desc: "Clôture au-dessus du mid-range — léger biais baissier" };
    return { label: "Très élevé", color: "#10B981", desc: "Clôture proche du high — signal mean-reversion baissier" };
  };

  return (
    <div
      className="min-h-screen text-white p-6"
      style={{ background: "#0A0A0A", fontFamily: "'Outfit', sans-serif" }}
      onMouseMove={moveTooltip}
    >
      {/* Floating tooltip */}
      {tooltip.visible && (
        <div
          className="fixed z-50 pointer-events-none px-3 py-2 rounded-lg text-xs font-mono border"
          style={{
            left: tooltip.x + 14,
            top: tooltip.y - 10,
            background: "#1A1A1A",
            border: "1px solid #2A2A2A",
            color: "#E5E5E7",
            boxShadow: "0 4px 16px rgba(0,0,0,0.6)",
          }}
        >
          {tooltip.content}
        </div>
      )}

      <PageHeader
        title="IBS — Internal Bar Strength"
        subtitle="(Close − Low) / (High − Low) · Signal de mean-reversion journalier sur SPY"
        timer={<RefreshTimer intervalSeconds={300} lastUpdate={lastUpdate} />}
      >
        <LiveBadge />
      </PageHeader>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg border text-sm" style={{ background: "#1A0A0A", border: "1px solid #EF444433", color: "#EF4444" }}>
          Erreur : {error}
        </div>
      )}

      {!data && !error && (
        <div className="flex items-center justify-center h-64 text-[#6B6B75] text-sm">
          Chargement des données SPY…
        </div>
      )}

      {data && (
        <div className="space-y-6">
          {/* ── Row 1: KPIs ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {data.current_ibs && (() => {
              const sig = ibsSignal(data.current_ibs!.ibs);
              return (
                <>
                  <KpiCard
                    label="IBS du jour"
                    value={data.current_ibs!.ibs.toFixed(3)}
                    sublabel={data.current_ibs!.date}
                    color={sig.color}
                  />
                  <KpiCard
                    label="Quintile"
                    value={data.current_ibs!.quintile}
                    sublabel={sig.label}
                    color={sig.color}
                  />
                  <KpiCard
                    label="Rendement J+1 historique"
                    value={
                      data.current_ibs!.historical_avg_next_day_return !== null
                        ? `${data.current_ibs!.historical_avg_next_day_return! > 0 ? "+" : ""}${data.current_ibs!.historical_avg_next_day_return!.toFixed(2)}%`
                        : "—"
                    }
                    sublabel="Moyenne historique du quintile"
                    color={
                      data.current_ibs!.historical_avg_next_day_return !== null
                        ? data.current_ibs!.historical_avg_next_day_return! >= 0
                          ? "#10B981"
                          : "#EF4444"
                        : "#6B6B75"
                    }
                  />
                  <KpiCard
                    label="Win Rate J+1"
                    value={
                      data.current_ibs!.historical_win_rate !== null
                        ? `${data.current_ibs!.historical_win_rate!.toFixed(1)}%`
                        : "—"
                    }
                    sublabel="% de jours suivants positifs"
                    color={
                      data.current_ibs!.historical_win_rate !== null
                        ? data.current_ibs!.historical_win_rate! >= 50
                          ? "#10B981"
                          : "#EF4444"
                        : "#6B6B75"
                    }
                  />
                </>
              );
            })()}
          </div>

          {/* Current IBS signal description */}
          {data.current_ibs && (() => {
            const sig = ibsSignal(data.current_ibs!.ibs);
            return (
              <div
                className="px-4 py-3 rounded-lg border text-sm"
                style={{ background: `${sig.color}12`, border: `1px solid ${sig.color}33`, color: sig.color }}
              >
                <span className="font-semibold">Signal :</span>{" "}
                <span style={{ color: "#B0B0B8" }}>{sig.desc}</span>
              </div>
            );
          })()}

          {/* ── Row 2: Monthly IBS Heatmap ── */}
          <Card className="p-5">
            <h2 className="text-sm font-bold uppercase tracking-widest mb-4" style={{ color: "#B0B0B8" }}>
              IBS Moyen Mensuel — SPY (1999–présent)
            </h2>
            <div className="overflow-x-auto">
              <table className="text-[11px] border-collapse w-full" style={{ minWidth: 640 }}>
                <thead>
                  <tr>
                    <th className="text-left pr-3 pb-2 font-semibold" style={{ color: "#6B6B75", width: 48 }}>Année</th>
                    {MONTHS.map((m) => (
                      <th key={m} className="text-center pb-2 font-semibold" style={{ color: "#6B6B75", width: 52 }}>{m}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.years.slice().reverse().map((year) => (
                    <tr key={year}>
                      <td className="pr-3 py-0.5 font-mono font-bold" style={{ color: "#6B6B75" }}>{year}</td>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
                        const val = data.ibs_heatmap[String(year)]?.[String(month)] ?? null;
                        const bg = val !== null ? ibsCellColorSaturated(val) : "#111114";
                        const textColor = val !== null ? "#E5E5E7" : "#2A2A2A";
                        return (
                          <td key={month} className="py-0.5 px-0.5">
                            <div
                              className="text-center rounded cursor-default select-none font-mono"
                              style={{
                                background: bg,
                                color: textColor,
                                padding: "4px 0",
                                fontSize: 10,
                                borderRadius: 4,
                              }}
                              onMouseEnter={(e) =>
                                val !== null &&
                                showTooltip(
                                  e,
                                  `${MONTHS[month - 1]} ${year} · IBS moyen: ${val.toFixed(3)}`
                                )
                              }
                              onMouseLeave={hideTooltip}
                            >
                              {val !== null ? val.toFixed(2) : "·"}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Legend */}
            <div className="mt-3 flex items-center gap-2 text-[10px]" style={{ color: "#6B6B75" }}>
              <span>Bas (mean-rev ↑)</span>
              {[0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0].map((v) => (
                <div
                  key={v}
                  style={{ width: 18, height: 12, background: ibsCellColorSaturated(v), borderRadius: 2 }}
                />
              ))}
              <span>Élevé (mean-rev ↓)</span>
            </div>
          </Card>

          {/* ── Row 3: Monthly Returns Heatmap ── */}
          <Card className="p-5">
            <h2 className="text-sm font-bold uppercase tracking-widest mb-4" style={{ color: "#B0B0B8" }}>
              Rendements Mensuels SPY — Close-to-Close (%)
            </h2>
            <div className="overflow-x-auto">
              <table className="text-[11px] border-collapse w-full" style={{ minWidth: 640 }}>
                <thead>
                  <tr>
                    <th className="text-left pr-3 pb-2 font-semibold" style={{ color: "#6B6B75", width: 48 }}>Année</th>
                    {MONTHS.map((m) => (
                      <th key={m} className="text-center pb-2 font-semibold" style={{ color: "#6B6B75", width: 52 }}>{m}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.years.slice().reverse().map((year) => (
                    <tr key={year}>
                      <td className="pr-3 py-0.5 font-mono font-bold" style={{ color: "#6B6B75" }}>{year}</td>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
                        const val = data.returns_heatmap[String(year)]?.[String(month)] ?? null;
                        const bg = val !== null ? retCellColor(val) : "#111114";
                        const textColor = val !== null ? "#E5E5E7" : "#2A2A2A";
                        const isPos = val !== null && val > 0;
                        return (
                          <td key={month} className="py-0.5 px-0.5">
                            <div
                              className="text-center rounded cursor-default select-none font-mono"
                              style={{
                                background: bg,
                                color: textColor,
                                padding: "4px 0",
                                fontSize: 10,
                                borderRadius: 4,
                              }}
                              onMouseEnter={(e) =>
                                val !== null &&
                                showTooltip(
                                  e,
                                  `${MONTHS[month - 1]} ${year} · Return: ${val > 0 ? "+" : ""}${val.toFixed(2)}%`
                                )
                              }
                              onMouseLeave={hideTooltip}
                            >
                              {val !== null
                                ? `${isPos ? "+" : ""}${val.toFixed(1)}`
                                : "·"}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Legend */}
            <div className="mt-3 flex items-center gap-2 text-[10px]" style={{ color: "#6B6B75" }}>
              <span>−10%+</span>
              {[-1, -0.8, -0.6, -0.4, -0.2, 0, 0.2, 0.4, 0.6, 0.8, 1].map((v) => (
                <div
                  key={v}
                  style={{ width: 18, height: 12, background: retCellColor(v * 10), borderRadius: 2 }}
                />
              ))}
              <span>+10%+</span>
            </div>
          </Card>

          {/* ── Row 4: Quintile Table + Histogram ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Quintile Stats */}
            <Card className="p-5">
              <h2 className="text-sm font-bold uppercase tracking-widest mb-4" style={{ color: "#B0B0B8" }}>
                Performance par Quintile IBS (J+1)
              </h2>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr style={{ borderBottom: "1px solid #1E1E22" }}>
                    <th className="text-left pb-2 font-semibold" style={{ color: "#6B6B75" }}>Quintile</th>
                    <th className="text-right pb-2 font-semibold" style={{ color: "#6B6B75" }}>Jours</th>
                    <th className="text-right pb-2 font-semibold" style={{ color: "#6B6B75" }}>IBS Moy.</th>
                    <th className="text-right pb-2 font-semibold" style={{ color: "#6B6B75" }}>Ret. J+1</th>
                    <th className="text-right pb-2 font-semibold" style={{ color: "#6B6B75" }}>Win Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {data.quintile_stats.map((q) => {
                    const retColor =
                      q.avg_next_day_return === null
                        ? "#6B6B75"
                        : q.avg_next_day_return >= 0
                        ? "#10B981"
                        : "#EF4444";
                    const winColor =
                      q.win_rate === null
                        ? "#6B6B75"
                        : q.win_rate >= 50
                        ? "#10B981"
                        : "#EF4444";
                    return (
                      <tr key={q.label} style={{ borderBottom: "1px solid #1A1A1E" }}>
                        <td className="py-2.5 font-mono font-bold" style={{ color: "#E5E5E7" }}>
                          {q.label}
                        </td>
                        <td className="py-2.5 text-right font-mono" style={{ color: "#B0B0B8" }}>
                          {q.count.toLocaleString()}
                        </td>
                        <td className="py-2.5 text-right font-mono" style={{ color: "#B0B0B8" }}>
                          {q.avg_ibs !== null ? q.avg_ibs.toFixed(3) : "—"}
                        </td>
                        <td className="py-2.5 text-right font-mono font-semibold" style={{ color: retColor }}>
                          {q.avg_next_day_return !== null
                            ? `${q.avg_next_day_return >= 0 ? "+" : ""}${q.avg_next_day_return.toFixed(3)}%`
                            : "—"}
                        </td>
                        <td className="py-2.5 text-right font-mono font-semibold" style={{ color: winColor }}>
                          {q.win_rate !== null ? `${q.win_rate.toFixed(1)}%` : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="mt-3 text-[10px]" style={{ color: "#6B6B75" }}>
                Basé sur {data.total_bars.toLocaleString()} jours de trading SPY ({data.date_range.from} → {data.date_range.to})
              </p>
            </Card>

            {/* Histogram */}
            <Card className="p-5">
              <h2 className="text-sm font-bold uppercase tracking-widest mb-4" style={{ color: "#B0B0B8" }}>
                Distribution des valeurs IBS
              </h2>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={data.histogram}
                  margin={{ top: 4, right: 8, left: -16, bottom: 4 }}
                  barCategoryGap="4%"
                >
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "#6B6B75", fontSize: 9, fontFamily: "monospace" }}
                    tickLine={false}
                    axisLine={{ stroke: "#1E1E22" }}
                    interval={3}
                  />
                  <YAxis
                    tick={{ fill: "#6B6B75", fontSize: 9, fontFamily: "monospace" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: "#1A1A1E" }}
                    contentStyle={{
                      background: "#1A1A1A",
                      border: "1px solid #1E1E22",
                      borderRadius: 8,
                      color: "#E5E5E7",
                      fontSize: 11,
                      fontFamily: "monospace",
                    }}
                    formatter={(value: any) => [String(value ?? "").toLocaleString(), "Jours"]}
                    labelFormatter={(label) => `IBS ≈ ${label}`}
                  />
                  <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                    {data.histogram.map((entry) => {
                      const mid = (entry.range_lo + entry.range_hi) / 2;
                      const color = ibsCellColorSaturated(mid);
                      // Brighten slightly for visibility
                      return <Cell key={entry.label} fill={mid < 0.5 ? "#EF4444" : "#10B981"} opacity={0.6 + mid * 0.4} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <p className="mt-1 text-[10px] text-center" style={{ color: "#6B6B75" }}>
                Valeur IBS (buckets de 0.05) · Distribution idéale : uniforme
              </p>
            </Card>
          </div>

          {/* ── Footer info ── */}
          <div className="text-[10px] text-center pb-4" style={{ color: "#6B6B75" }}>
            Source : Sierra Chart · SPY-NQTV.dly · Généré le {new Date(data.generated_at).toLocaleString("fr-FR")}
          </div>
        </div>
      )}
    </div>
  );
}
