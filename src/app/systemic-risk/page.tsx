"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader, Card, LiveBadge } from "@/components/ui/card";
import { RefreshTimer } from "@/components/ui/refresh-timer";
import { useVisiblePolling } from "@/hooks/use-visible-polling";

const API = "http://localhost:3850";

interface Component {
  id: string;
  label: string;
  max: number;
  score: number;
  state: string;
  value: number | null;
  detail: string;
}

interface AssetRow {
  symbol: string;
  last: number;
  change_5d: number | null;
  change_20d: number | null;
  vol_20d: number | null;
  vol_60d: number | null;
}

interface SystemicRiskResponse {
  ok: boolean;
  generated_at: string;
  stress_score: number;
  stress_score_max: number;
  regime: string;
  regime_color: string;
  components: Component[];
  correlations_es: Record<string, number>;
  assets: AssetRow[];
}

function stateColor(state: string): string {
  const s = state.toUpperCase();
  if (s.includes("CRISE") || s.includes("PANIQUE") || s.includes("FUITE") || s.includes("SYSTEMIQUE")) return "#EF4444";
  if (s.includes("STRESS") || s.includes("FLIGHT")) return "#FF6B00";
  if (s.includes("SURVEILL") || s.includes("ELEVE") || s.includes("AGITE") || s.includes("BID")) return "#FFA726";
  if (s.includes("NORMAL") || s.includes("NEUTRE")) return "#42A5F5";
  if (s.includes("CALME") || s.includes("RISK-ON") || s.includes("DECOUPLE")) return "#22C55E";
  return "#6B6B75";
}

function corrColor(corr: number): string {
  const abs = Math.abs(corr);
  if (abs >= 0.6) return "#EF4444";
  if (abs >= 0.4) return "#FFA726";
  if (abs >= 0.2) return "#42A5F5";
  return "#22C55E";
}

function pctColor(pct: number | null): string {
  if (pct === null) return "#6B6B75";
  if (pct >= 2) return "#22C55E";
  if (pct > 0) return "#AAFFAA";
  if (pct > -2) return "#FFA726";
  return "#EF4444";
}

export default function SystemicRiskPage() {
  const [data, setData] = useState<SystemicRiskResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const r = await fetch(`${API}/api/market/systemic-risk`, { signal: AbortSignal.timeout(10000) });
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
  useVisiblePolling(load, 60000);

  return (
    <div className="p-6">
      <PageHeader
        timer={<RefreshTimer intervalSeconds={60} />}
        title="Systemic Risk Monitor"
        subtitle="Indice composite de stress financier — contagion, correlations cross-market, flight-to-quality"
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
        <Card className="p-12 text-center text-[#6B6B75]">Calcul du Financial Stress Index...</Card>
      ) : error ? (
        <Card className="p-12 text-center text-[#6B6B75]">
          <span className="text-[#FF6B00] font-semibold">Reconnexion automatique en cours...</span>
          <div className="text-xs mt-2">{error}</div>
        </Card>
      ) : data ? (
        <div className="space-y-4">
          {/* Score principal */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-[10px] uppercase tracking-[3px] text-[#6B6B75] mb-1">
                  Financial Stress Index
                </div>
                <div className="flex items-baseline gap-3">
                  <span
                    className="text-6xl font-extrabold font-mono"
                    style={{ color: data.regime_color }}
                  >
                    {data.stress_score.toFixed(0)}
                  </span>
                  <span className="text-xl text-[#6B6B75] font-mono">
                    / {data.stress_score_max}
                  </span>
                  <span
                    className="ml-4 px-4 py-1.5 rounded-md text-sm font-bold tracking-wider"
                    style={{
                      backgroundColor: `${data.regime_color}22`,
                      color: data.regime_color,
                      border: `1px solid ${data.regime_color}66`,
                    }}
                  >
                    {data.regime}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[9px] text-[#6B6B75] uppercase">Mis a jour</div>
                <div className="text-xs font-mono text-[#F0F0F0]">
                  {new Date(data.generated_at).toLocaleString("fr-FR")}
                </div>
              </div>
            </div>

            {/* Horizontal stress bar */}
            <div className="relative h-3 bg-[#1A1A1E] rounded-full overflow-hidden">
              <div
                className="absolute top-0 left-0 h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(100, data.stress_score)}%`,
                  background: `linear-gradient(to right, #22C55E 0%, #42A5F5 15%, #FFA726 30%, #FF6B00 50%, #EF4444 70%)`,
                }}
              />
              {[15, 30, 50, 70].map((t) => (
                <div
                  key={t}
                  className="absolute top-0 h-full w-px bg-[#0A0A0E]"
                  style={{ left: `${t}%` }}
                />
              ))}
            </div>
            <div className="flex justify-between text-[9px] text-[#6B6B75] mt-1">
              <span>CALME</span>
              <span>NORMAL</span>
              <span>SURVEILLANCE</span>
              <span>STRESS</span>
              <span>CRISE</span>
            </div>
          </Card>

          {/* Components grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.components.map((c) => {
              const pct = (c.score / c.max) * 100;
              const color = stateColor(c.state);
              return (
                <Card key={c.id} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-bold text-[#F0F0F0]">{c.label}</h3>
                    <span
                      className="px-2 py-0.5 text-[9px] font-bold rounded"
                      style={{ backgroundColor: `${color}22`, color }}
                    >
                      {c.state}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-2xl font-extrabold font-mono" style={{ color }}>
                      {c.score}
                    </span>
                    <span className="text-xs text-[#6B6B75] font-mono">/ {c.max}</span>
                  </div>
                  <div className="h-1.5 bg-[#1A1A1E] rounded-full overflow-hidden mb-2">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: color }}
                    />
                  </div>
                  <div className="text-[10px] text-[#6B6B75] font-mono">{c.detail}</div>
                </Card>
              );
            })}
          </div>

          {/* Correlation matrix */}
          <Card className="p-4">
            <h3 className="text-xs font-bold text-[#F0F0F0] mb-3 uppercase tracking-wider">
              Correlation 30j ES vs majors
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
              {Object.entries(data.correlations_es).map(([sym, corr]) => (
                <div
                  key={sym}
                  className="p-3 rounded-lg text-center"
                  style={{
                    backgroundColor: `${corrColor(corr)}15`,
                    border: `1px solid ${corrColor(corr)}44`,
                  }}
                >
                  <div className="text-[10px] text-[#6B6B75] font-mono uppercase mb-1">{sym}</div>
                  <div
                    className="text-xl font-extrabold font-mono"
                    style={{ color: corrColor(corr) }}
                  >
                    {corr >= 0 ? "+" : ""}
                    {corr.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Asset dashboard */}
          <Card className="p-4">
            <h3 className="text-xs font-bold text-[#F0F0F0] mb-3 uppercase tracking-wider">
              Cross-asset snapshot
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-[#1E1E22]">
                    <th className="text-left text-[9px] text-[#6B6B75] uppercase p-2">Asset</th>
                    <th className="text-right text-[9px] text-[#6B6B75] uppercase p-2">Last</th>
                    <th className="text-right text-[9px] text-[#6B6B75] uppercase p-2">5j %</th>
                    <th className="text-right text-[9px] text-[#6B6B75] uppercase p-2">20j %</th>
                    <th className="text-right text-[9px] text-[#6B6B75] uppercase p-2">Vol 20j</th>
                    <th className="text-right text-[9px] text-[#6B6B75] uppercase p-2">Vol 60j</th>
                  </tr>
                </thead>
                <tbody>
                  {data.assets.map((a) => (
                    <tr key={a.symbol} className="border-b border-[#0E0E12] hover:bg-[#FFFFFF06]">
                      <td className="p-2 text-xs font-mono font-bold text-[#FF6B00]">{a.symbol}</td>
                      <td className="p-2 text-right text-xs font-mono text-[#F0F0F0]">
                        {a.last.toLocaleString("en-US", { maximumFractionDigits: 4 })}
                      </td>
                      <td
                        className="p-2 text-right text-xs font-mono font-bold"
                        style={{ color: pctColor(a.change_5d) }}
                      >
                        {a.change_5d !== null ? (a.change_5d >= 0 ? "+" : "") + a.change_5d.toFixed(2) + "%" : "—"}
                      </td>
                      <td
                        className="p-2 text-right text-xs font-mono font-bold"
                        style={{ color: pctColor(a.change_20d) }}
                      >
                        {a.change_20d !== null ? (a.change_20d >= 0 ? "+" : "") + a.change_20d.toFixed(2) + "%" : "—"}
                      </td>
                      <td className="p-2 text-right text-xs font-mono text-[#FFA726]">
                        {a.vol_20d !== null ? a.vol_20d.toFixed(1) + "%" : "—"}
                      </td>
                      <td className="p-2 text-right text-xs font-mono text-[#6B6B75]">
                        {a.vol_60d !== null ? a.vol_60d.toFixed(1) + "%" : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
