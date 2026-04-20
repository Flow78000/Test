"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { PageHeader, LiveBadge, Card, Badge } from "@/components/ui/card";
import { RefreshTimer } from "@/components/ui/refresh-timer";
import { useVisiblePolling } from "@/hooks/use-visible-polling";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  AreaChart, Area, LineChart, Line, BarChart, Bar, ComposedChart,
  XAxis, YAxis, CartesianGrid, ReferenceLine, Legend,
} from "recharts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SectorETF {
  ticker: string;
  name: string;
  price: number;
  call_premium: number;
  put_premium: number;
  volume: number;
  call_volume: number;
  put_volume: number;
  pc_ratio: number;
  change_pct: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const API = "http://localhost:3850";

const DEFENSIVE_TICKERS = ["XLP", "XLU", "XLV"];
const CYCLICAL_TICKERS = ["XLK", "XLY", "XLF", "XLE"];

const SECTOR_COLORS: Record<string, string> = {
  SPY: "#FF6B00",
  XLK: "#00AAFF",
  XLY: "#E040FB",
  XLF: "#FFD600",
  XLE: "#FF5722",
  XLV: "#4CAF50",
  XLP: "#26A69A",
  XLU: "#78909C",
  XLB: "#8D6E63",
  XLI: "#5C6BC0",
  XLRE: "#EC407A",
  XLC: "#AB47BC",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtPremium(n: number): string {
  if (n == null || isNaN(n)) return "$0";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return "$" + (n / 1_000_000).toFixed(1) + "M";
  if (abs >= 1_000) return "$" + (n / 1_000).toFixed(1) + "K";
  return "$" + n.toLocaleString();
}

function intensityClass(netFlow: number): string {
  const abs = Math.abs(netFlow);
  if (abs >= 10_000_000) return "ring-2";
  if (abs >= 1_000_000) return "ring-1";
  return "";
}

function bgGradient(netFlow: number): string {
  const abs = Math.abs(netFlow);
  if (netFlow > 0) {
    if (abs >= 10_000_000) return "bg-gradient-to-br from-[#22C55E]/20 to-[#111114]";
    if (abs >= 1_000_000) return "bg-gradient-to-br from-[#22C55E]/12 to-[#111114]";
    return "bg-gradient-to-br from-[#22C55E]/6 to-[#111114]";
  }
  if (netFlow < 0) {
    if (abs >= 10_000_000) return "bg-gradient-to-br from-[#EF4444]/20 to-[#111114]";
    if (abs >= 1_000_000) return "bg-gradient-to-br from-[#EF4444]/12 to-[#111114]";
    return "bg-gradient-to-br from-[#EF4444]/6 to-[#111114]";
  }
  return "bg-[#111114]";
}

function netFlow(etf: SectorETF): number {
  return (etf.call_premium ?? 0) - (etf.put_premium ?? 0);
}

// ---------------------------------------------------------------------------
// Sector Card Component
// ---------------------------------------------------------------------------

function SectorCard({ etf, isHero = false }: { etf: SectorETF; isHero?: boolean }) {
  const nf = netFlow(etf);
  const isBull = nf >= 0;
  const sentimentColor = isBull ? "#22C55E" : "#EF4444";
  const ringColor = isBull ? "ring-[#22C55E]/30" : "ring-[#EF4444]/30";

  return (
    <div
      className={`rounded-xl border border-[#1E1E22] p-4 transition-all hover:border-[#FF6B00] cursor-pointer ${bgGradient(nf)} ${intensityClass(nf)} ${ringColor} ${
        isHero ? "col-span-full" : ""
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className={`text-${isHero ? "xl" : "lg"} font-extrabold text-[#E0E0E5]`}>{etf.ticker}</span>
            <Badge color={sentimentColor}>{isBull ? "BULL" : "BEAR"}</Badge>
          </div>
          <p className="text-[10px] text-[#6B6B75] mt-0.5 max-w-[200px] truncate">{etf.name}</p>
        </div>
        <div className="text-right">
          <div className="font-mono font-bold text-[#E0E0E5]">${etf.price?.toFixed(2) ?? "—"}</div>
          {etf.change_pct != null && (
            <div className={`text-[10px] font-mono ${etf.change_pct >= 0 ? "text-[#22C55E]" : "text-[#EF4444]"}`}>
              {etf.change_pct >= 0 ? "+" : ""}{etf.change_pct.toFixed(2)}%
            </div>
          )}
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <div className="flex justify-between">
          <span className="text-[#6B6B75]">Net Flow</span>
          <span className="font-mono font-bold" style={{ color: sentimentColor }}>
            {fmtPremium(nf)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#6B6B75]">Volume</span>
          <span className="font-mono text-[#A0A0A8]">{(etf.volume ?? 0).toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#6B6B75]">Call Prem</span>
          <span className="font-mono text-[#22C55E]">{fmtPremium(etf.call_premium ?? 0)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#6B6B75]">Put Prem</span>
          <span className="font-mono text-[#EF4444]">{fmtPremium(etf.put_premium ?? 0)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#6B6B75]">P/C Ratio</span>
          <span className={`font-mono ${(etf.pc_ratio ?? 0) > 1 ? "text-[#EF4444]" : "text-[#22C55E]"}`}>
            {(etf.pc_ratio ?? 0).toFixed(2)}
          </span>
        </div>
      </div>

      {/* Flow bar */}
      <div className="mt-3 h-2 rounded-full bg-[#1E1E22] overflow-hidden flex">
        <div
          className="h-full bg-[#22C55E] transition-all"
          style={{
            width: `${
              (etf.call_premium ?? 0) + (etf.put_premium ?? 0) > 0
                ? ((etf.call_premium ?? 0) / ((etf.call_premium ?? 0) + (etf.put_premium ?? 0))) * 100
                : 50
            }%`,
          }}
        />
        <div className="h-full bg-[#EF4444] flex-1" />
      </div>
      <div className="flex justify-between text-[9px] text-[#6B6B75] mt-0.5">
        <span>Calls</span>
        <span>Puts</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Donut tooltip
// ---------------------------------------------------------------------------

function DonutTooltip({ active, payload }: any) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-[#1A1A1E] border border-[#2A2A2E] rounded-lg px-3 py-2 text-xs shadow-xl">
      <div className="font-bold text-[#E0E0E5]">{d.ticker}</div>
      <div className="text-[#6B6B75]">Flow: <span className="font-mono text-[#FF6B00]">{fmtPremium(d.rawFlow)}</span></div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Rotation helpers
// ---------------------------------------------------------------------------

interface RotationResult {
  defensiveFlow: number;
  cyclicalFlow: number;
  regime: "RISK ON" | "RISK OFF";
  interpretation: string;
  detail: string;
}

function analyzeRotation(sectors: SectorETF[]): RotationResult {
  let defensiveFlow = 0;
  let cyclicalFlow = 0;
  for (const s of sectors) {
    const nf = netFlow(s);
    if (DEFENSIVE_TICKERS.includes(s.ticker)) defensiveFlow += nf;
    if (CYCLICAL_TICKERS.includes(s.ticker)) cyclicalFlow += nf;
  }
  const isRiskOn = cyclicalFlow > defensiveFlow;
  return {
    defensiveFlow,
    cyclicalFlow,
    regime: isRiskOn ? "RISK ON" : "RISK OFF",
    interpretation: isRiskOn
      ? "Les flux cycliques dominent — appetit pour le risque"
      : "Les flux defensifs dominent — aversion au risque",
    detail: isRiskOn
      ? "XLK, XLY, XLF, XLE captent plus de flux haussiers que XLP, XLU, XLV"
      : "XLP, XLU, XLV captent plus de flux haussiers que XLK, XLY, XLF, XLE",
  };
}

interface MarketRegime {
  label: string;
  description: string;
  action: string;
  color: string;
}

function interpretRegime(sectors: SectorETF[]): MarketRegime {
  const flowMap: Record<string, number> = {};
  for (const s of sectors) {
    flowMap[s.ticker] = netFlow(s);
  }

  const xlu = flowMap["XLU"] ?? 0;
  const xlp = flowMap["XLP"] ?? 0;
  const xlk = flowMap["XLK"] ?? 0;
  const xly = flowMap["XLY"] ?? 0;
  const xle = flowMap["XLE"] ?? 0;
  const xlb = flowMap["XLB"] ?? 0;
  const xlf = flowMap["XLF"] ?? 0;

  // Determine which pair dominates
  const defensive = xlu + xlp;
  const growth = xlk + xly;
  const commodities = xle + xlb;
  const finance = xlf;

  const max = Math.max(defensive, growth, commodities, finance);

  if (max === defensive && defensive > 0) {
    return {
      label: "Late Cycle / Defensive",
      description: "XLU + XLP leaders — rotation vers les valeurs refuges",
      action: "Preparer les hedges, reduire l'exposition directionnelle",
      color: "#EF4444",
    };
  }
  if (max === growth && growth > 0) {
    return {
      label: "Growth / Risk-On",
      description: "XLK + XLY leaders — appetit pour la croissance",
      action: "Positions directionnelles, momentum plays",
      color: "#22C55E",
    };
  }
  if (max === commodities && commodities > 0) {
    return {
      label: "Inflation / Commodities",
      description: "XLE + XLB leaders — rotation vers les actifs reels",
      action: "Rotation reelle, couverture inflationniste",
      color: "#FF6B00",
    };
  }
  if (max === finance && finance > 0) {
    return {
      label: "Steepening / Taux",
      description: "XLF leader — banques en mode expansion",
      action: "Surveiller la courbe des taux, financials longs",
      color: "#FFD600",
    };
  }
  return {
    label: "Neutre / Indetermine",
    description: "Aucun secteur ne domine clairement",
    action: "Attendre la confirmation d'un signal directionnel",
    color: "#6B6B75",
  };
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function HeatmapPage() {
  const [sectors, setSectors] = useState<SectorETF[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchData = useCallback(async () => {
    setError(false);
    try {
      const resp = await fetch(`${API}/api/uw/sector-etfs`, { signal: AbortSignal.timeout(10000) });
      if (!resp.ok) throw new Error("sectors");
      const json = await resp.json();
      const raw: SectorETF[] = (json?.data || json || []).map((s: any) => ({
        ticker: s.ticker || s.symbol || "",
        name: s.name || s.sector || s.description || "",
        price: s.price ?? s.last_price ?? 0,
        call_premium: s.call_premium ?? s.call_flow ?? 0,
        put_premium: s.put_premium ?? s.put_flow ?? 0,
        volume: s.volume ?? s.total_volume ?? 0,
        call_volume: s.call_volume ?? 0,
        put_volume: s.put_volume ?? 0,
        pc_ratio: s.pc_ratio ?? (s.call_volume ? (s.put_volume ?? 0) / s.call_volume : 0),
        change_pct: s.change_pct ?? s.change_percent ?? 0,
      }));
      setSectors(raw);
    } catch {
      setError(true);
      setSectors([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useVisiblePolling(fetchData, 10_000);

  // Separate SPY from the rest
  const spy = useMemo(() => sectors.find((s) => s.ticker === "SPY"), [sectors]);
  const sectorList = useMemo(() => sectors.filter((s) => s.ticker !== "SPY"), [sectors]);

  // Summary
  const summary = useMemo(() => {
    let bullFlow = 0;
    let bearFlow = 0;
    let bullCount = 0;
    let bearCount = 0;
    for (const s of sectors) {
      const net = netFlow(s);
      if (net >= 0) {
        bullFlow += net;
        bullCount++;
      } else {
        bearFlow += Math.abs(net);
        bearCount++;
      }
    }
    return { bullFlow, bearFlow, bullCount, bearCount, net: bullFlow - bearFlow };
  }, [sectors]);

  // Rotation analysis
  const rotation = useMemo(() => analyzeRotation(sectors), [sectors]);
  const regime = useMemo(() => interpretRegime(sectors), [sectors]);

  // Donut data
  const donutData = useMemo(() => {
    return sectorList
      .map((s) => ({
        ticker: s.ticker,
        value: Math.abs(netFlow(s)),
        rawFlow: netFlow(s),
        fill: SECTOR_COLORS[s.ticker] ?? "#6B6B75",
      }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [sectorList]);

  const dominantSentiment = summary.net >= 0 ? "BULL" : "BEAR";

  // Real rotation data from UW
  const [rotationData, setRotationData] = useState<any>(null);
  const [rotDays, setRotDays] = useState(60);
  const [loadingRot, setLoadingRot] = useState(true);

  useEffect(() => {
    async function fetchRotation() {
      setLoadingRot(true);
      try {
        const res = await fetch(`${API}/api/uw/sector-rotation?days=${rotDays}`, { signal: AbortSignal.timeout(10000) }).then(r => r.json());
        if (res && !res.error) setRotationData(res);
      } catch { }
      setLoadingRot(false);
    }
    fetchRotation();
  }, [rotDays]);

  return (
    <div className="p-6 min-h-screen bg-[#08080A] text-[#E0E0E5]">
      <PageHeader timer={<RefreshTimer intervalSeconds={10} />} title="Heatmap Sectorielle" subtitle="Carte thermique des flux d'options par secteur ETF">
        <LiveBadge />
      </PageHeader>

      {loading && !sectors.length ? (
        <Card className="p-12 text-center text-[#6B6B75]">Chargement...</Card>
      ) : error && !sectors.length ? (
        <Card className="p-12 text-center text-[#6B6B75]">
          <span className="text-[#FF6B00] font-semibold">Reconnexion automatique en cours...</span>
          <div className="text-xs mt-2 text-[#6B6B75]">Le serveur se reconnecte tout seul — aucune action requise.</div>
        </Card>
      ) : (
        <>
          {/* Summary Bar */}
          <Card className="p-4 mb-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <span className="text-sm font-bold text-[#6B6B75] uppercase tracking-widest">Sentiment Global</span>
                <Badge color={summary.net >= 0 ? "#22C55E" : "#EF4444"}>
                  {summary.net >= 0 ? "BULL" : "BEAR"}
                </Badge>
              </div>
              <div className="flex items-center gap-6 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#22C55E]" />
                  <span className="text-[#6B6B75]">BULL:</span>
                  <span className="font-mono text-[#22C55E] font-bold">
                    {fmtPremium(summary.bullFlow)}
                  </span>
                  <span className="text-[#4A4A52]">({summary.bullCount} secteurs)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#EF4444]" />
                  <span className="text-[#6B6B75]">BEAR:</span>
                  <span className="font-mono text-[#EF4444] font-bold">
                    {fmtPremium(summary.bearFlow)}
                  </span>
                  <span className="text-[#4A4A52]">({summary.bearCount} secteurs)</span>
                </div>
                <div>
                  <span className="text-[#6B6B75]">NET:</span>{" "}
                  <span className={`font-mono font-bold ${summary.net >= 0 ? "text-[#22C55E]" : "text-[#EF4444]"}`}>
                    {fmtPremium(summary.net)}
                  </span>
                </div>
              </div>
            </div>

            {/* Global bar */}
            <div className="mt-3 h-3 rounded-full bg-[#1E1E22] overflow-hidden flex">
              <div
                className="h-full bg-[#22C55E] transition-all"
                style={{
                  width: `${summary.bullFlow + summary.bearFlow > 0 ? (summary.bullFlow / (summary.bullFlow + summary.bearFlow)) * 100 : 50}%`,
                }}
              />
              <div className="h-full bg-[#EF4444] flex-1" />
            </div>
            <div className="flex justify-between text-[9px] text-[#6B6B75] mt-0.5">
              <span>BULL Flow</span>
              <span>BEAR Flow</span>
            </div>
          </Card>

          {/* SPY Hero Card */}
          {spy && (
            <div className="mb-4">
              <SectorCard etf={spy} isHero />
            </div>
          )}

          {/* Sector Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {sectorList.map((etf) => (
              <SectorCard key={etf.ticker} etf={etf} />
            ))}
          </div>

          {sectorList.length === 0 && !spy && (
            <Card className="p-8 text-center text-[#6B6B75] mt-4">
              Aucune donnee sectorielle disponible
            </Card>
          )}

          <div className="flex items-center justify-between mt-4 text-[10px] text-[#6B6B75]">
            <span>{sectors.length} secteurs affiches</span>
            <span>Actualisation auto 5 min</span>
          </div>

          {/* ================================================================ */}
          {/* SECTOR ROTATION + DONUT + MARKET REGIME                         */}
          {/* ================================================================ */}

          <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Rotation Sectorielle */}
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-[#E0E0E5] uppercase tracking-widest">Rotation Sectorielle</h3>
                <Badge color={rotation.regime === "RISK ON" ? "#22C55E" : "#EF4444"}>
                  {rotation.regime}
                </Badge>
              </div>

              <p className="text-xs text-[#A0A0A8] mb-4">{rotation.interpretation}</p>

              <div className="grid grid-cols-2 gap-3 mb-4">
                {/* Defensive */}
                <div className="rounded-lg border border-[#1E1E22] bg-[#111114] p-3">
                  <div className="text-[10px] text-[#6B6B75] uppercase tracking-widest mb-1">Defensifs</div>
                  <div className="text-[10px] text-[#6B6B75] mb-2">XLP, XLU, XLV</div>
                  <div className={`text-lg font-mono font-bold ${rotation.defensiveFlow >= 0 ? "text-[#22C55E]" : "text-[#EF4444]"}`}>
                    {fmtPremium(rotation.defensiveFlow)}
                  </div>
                </div>
                {/* Cyclical */}
                <div className="rounded-lg border border-[#1E1E22] bg-[#111114] p-3">
                  <div className="text-[10px] text-[#6B6B75] uppercase tracking-widest mb-1">Cycliques</div>
                  <div className="text-[10px] text-[#6B6B75] mb-2">XLK, XLY, XLF, XLE</div>
                  <div className={`text-lg font-mono font-bold ${rotation.cyclicalFlow >= 0 ? "text-[#22C55E]" : "text-[#EF4444]"}`}>
                    {fmtPremium(rotation.cyclicalFlow)}
                  </div>
                </div>
              </div>

              {/* Ratio bar */}
              <div className="h-2 rounded-full bg-[#1E1E22] overflow-hidden flex">
                {(() => {
                  const totalAbs = Math.abs(rotation.defensiveFlow) + Math.abs(rotation.cyclicalFlow);
                  const pct = totalAbs > 0 ? (Math.abs(rotation.cyclicalFlow) / totalAbs) * 100 : 50;
                  return (
                    <>
                      <div className="h-full bg-[#22C55E] transition-all" style={{ width: `${pct}%` }} />
                      <div className="h-full bg-[#EF4444] flex-1" />
                    </>
                  );
                })()}
              </div>
              <div className="flex justify-between text-[9px] text-[#6B6B75] mt-0.5">
                <span>Cycliques</span>
                <span>Defensifs</span>
              </div>

              <p className="text-[10px] text-[#4A4A52] mt-3">{rotation.detail}</p>
            </Card>

            {/* Donut Chart — Sector Flow Distribution */}
            <Card className="p-5">
              <h3 className="text-sm font-bold text-[#E0E0E5] uppercase tracking-widest mb-4">Distribution des Flux</h3>

              {donutData.length > 0 ? (
                <div className="relative" style={{ height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={donutData}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={110}
                        paddingAngle={2}
                        dataKey="value"
                        stroke="#08080A"
                        strokeWidth={2}
                      >
                        {donutData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip content={<DonutTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center label */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                      <div
                        className="text-xl font-extrabold"
                        style={{ color: dominantSentiment === "BULL" ? "#22C55E" : "#EF4444" }}
                      >
                        {dominantSentiment}
                      </div>
                      <div className="text-[10px] text-[#6B6B75]">Sentiment dominant</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-[260px] flex items-center justify-center text-[#6B6B75] text-xs">
                  Aucun flux disponible
                </div>
              )}

              {/* Legend */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
                {donutData.slice(0, 8).map((d) => (
                  <div key={d.ticker} className="flex items-center gap-1 text-[10px]">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.fill }} />
                    <span className="text-[#A0A0A8]">{d.ticker}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* GEX Regime Coupling */}
          <Card className="p-5 mt-4 mb-4">
            <h3 className="text-xs text-[#6B6B75] uppercase tracking-widest mb-3">Couplage GEX / Regime Sectoriel</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#0A0A0E] rounded-lg p-4">
                <div className="text-sm font-bold text-[#22C55E] mb-2">GEX Positif (Long Gamma)</div>
                <p className="text-xs text-[#6B6B75] leading-relaxed">
                  Market makers stabilisent &rarr; secteurs defensifs (XLP, XLU) sous-performent car pas besoin de couverture.
                  Favoriser : XLK, XLY (growth/cycliques). Strategies : directionnelles longues, covered calls.
                </p>
              </div>
              <div className="bg-[#0A0A0E] rounded-lg p-4">
                <div className="text-sm font-bold text-[#EF4444] mb-2">GEX Negatif (Short Gamma)</div>
                <p className="text-xs text-[#6B6B75] leading-relaxed">
                  Market makers amplifient &rarr; secteurs defensifs (XLP, XLU, XLV) surperforment comme refuge.
                  Eviter : XLK, XLY. Strategies : credit spreads OTM, hedges via puts sectoriels.
                </p>
              </div>
            </div>
          </Card>

          {/* ================================================================ */}
          {/* ROTATION SECTORIELLE — DONNEES REELLES UW 250 JOURS           */}
          {/* ================================================================ */}

          {/* Period selector */}
          <div className="flex items-center gap-2 mt-8 mb-3">
            <span className="text-xs text-[#6B6B75] uppercase tracking-widest font-bold">Rotation Sectorielle</span>
            <div className="flex gap-1 ml-3">
              {[30, 60, 120, 250].map(d => (
                <button key={d} onClick={() => setRotDays(d)}
                  className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all ${rotDays === d ? "bg-[#FF6B00] text-black" : "bg-[#111114] text-[#6B6B75] hover:text-white border border-[#1E1E22]"}`}>
                  {d}J
                </button>
              ))}
            </div>
            {loadingRot && <span className="text-[10px] text-[#6B6B75] ml-2 animate-pulse">Chargement UW...</span>}
          </div>

          {rotationData && (
            <>
              {/* 1. Spread net cycliques - defensifs (zone chart) */}
              <Card className="p-4 mb-4">
                <div className="text-[10px] text-[#6B6B75] uppercase tracking-widest mb-2">
                  Spread Cycliques - Defensifs (base 100) — Au-dessus de 0 = Risk-On
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <ComposedChart data={rotationData.spread}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E1E22" />
                    <XAxis dataKey="date" tick={{ fill: "#6B6B75", fontSize: 8 }} interval="preserveStartEnd" tickFormatter={(v: string) => v.slice(5)} />
                    <YAxis tick={{ fill: "#6B6B75", fontSize: 9 }} />
                    <Tooltip contentStyle={{ backgroundColor: "#1A1A1E", border: "1px solid #2A2A2E", borderRadius: 8, fontSize: 11 }}
                      formatter={(v: any, name: any) => [`${Number(v).toFixed(2)}`, name === "spread" ? "Spread C-D" : name]} />
                    <ReferenceLine y={0} stroke="#FF6B00" strokeWidth={1.5} />
                    <Area dataKey="spread" stroke="#FF6B00" fill="#FF6B0015" strokeWidth={2} name="Spread C-D" dot={false}
                      type="monotone" />
                  </ComposedChart>
                </ResponsiveContainer>
                <div className="flex items-center gap-4 mt-1 text-[9px] text-[#6B6B75]">
                  <span><span className="text-[#22C55E] font-bold">Au-dessus</span> = cycliques surperforment (risk-on)</span>
                  <span><span className="text-[#EF4444] font-bold">En-dessous</span> = defensifs surperforment (risk-off)</span>
                </div>
              </Card>

              {/* 2. 10 secteurs en lignes individuelles (base 100) */}
              <Card className="p-4 mb-4">
                <div className="text-[10px] text-[#6B6B75] uppercase tracking-widest mb-2">
                  Performance relative base 100 — {rotDays} jours — Chaque secteur
                </div>
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E1E22" />
                    <XAxis dataKey="date" tick={{ fill: "#6B6B75", fontSize: 8 }} interval="preserveStartEnd"
                      tickFormatter={(v: string) => v.slice(5)} allowDuplicatedCategory={false} />
                    <YAxis tick={{ fill: "#6B6B75", fontSize: 9 }} domain={["auto", "auto"]} />
                    <Tooltip contentStyle={{ backgroundColor: "#1A1A1E", border: "1px solid #2A2A2E", borderRadius: 8, fontSize: 10 }}
                      formatter={(v: any) => [`${Number(v).toFixed(1)}`, ""]} />
                    <ReferenceLine y={100} stroke="#6B6B75" strokeDasharray="4 4" />
                    {Object.entries(rotationData.sectors || {}).map(([ticker, series]: [string, any]) => {
                      if (!series || !series.length) return null;
                      const color = SECTOR_COLORS[ticker] || "#6B6B75";
                      return (
                        <Line key={ticker} data={series} dataKey="base100" stroke={color}
                          strokeWidth={1.2} dot={false} name={ticker} type="monotone" />
                      );
                    })}
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                  </LineChart>
                </ResponsiveContainer>
              </Card>

              {/* 3. Heatmap sectorielle jour par jour */}
              <Card className="p-4 mb-4">
                <div className="text-[10px] text-[#6B6B75] uppercase tracking-widest mb-2">
                  Heatmap — Performance relative quotidienne (% vs base 100)
                </div>
                <div className="overflow-x-auto">
                  <table className="border-collapse" style={{ minWidth: Math.min(rotDays, 60) * 28 + 80 }}>
                    <thead>
                      <tr>
                        <th className="sticky left-0 z-10 bg-[#0A0A0E] p-1 text-left text-[9px] text-[#6B6B75] border-b border-r border-[#1E1E22] w-16">ETF</th>
                        {(rotationData.spread || []).slice(-Math.min(rotDays, 60)).map((s: any) => (
                          <th key={s.date} className="p-0.5 text-center text-[7px] text-[#555] border-b border-[#1E1E22] min-w-[24px]">
                            {s.date.slice(8)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(rotationData.sectors || {}).map(([ticker, series]: [string, any]) => {
                        if (!series || !series.length) return null;
                        const recent = series.slice(-Math.min(rotDays, 60));
                        return (
                          <tr key={ticker}>
                            <td className="sticky left-0 z-10 bg-[#0D0D10] p-1 border-b border-r border-[#1E1E22] text-[9px] font-bold"
                              style={{ color: SECTOR_COLORS[ticker] || "#6B6B75" }}>
                              {ticker}
                            </td>
                            {recent.map((d: any, i: number) => {
                              const prev = i > 0 ? recent[i - 1].base100 : d.base100;
                              const dailyChg = d.base100 - prev;
                              const bg = dailyChg > 1.5 ? "#00CC0040" : dailyChg > 0.5 ? "#00CC0025" : dailyChg > 0 ? "#00CC0012"
                                : dailyChg > -0.5 ? "#FF000012" : dailyChg > -1.5 ? "#FF000025" : "#FF000040";
                              return (
                                <td key={d.date} className="p-0 border-b border-[#0E0E12] text-center"
                                  title={`${ticker} ${d.date}\nBase100: ${d.base100}\nVar: ${dailyChg >= 0 ? "+" : ""}${dailyChg.toFixed(1)}`}>
                                  <div className="text-[7px] font-mono py-0.5" style={{ backgroundColor: bg, color: dailyChg >= 0 ? "#22C55E" : "#EF4444" }}>
                                    {dailyChg >= 0 ? "+" : ""}{dailyChg.toFixed(1)}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}

          {/* Market Regime Interpretation */}
          <Card className="p-5 mt-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-[#E0E0E5] uppercase tracking-widest">Interpretation du Regime de Marche</h3>
              <Badge color={regime.color}>{regime.label}</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-lg border border-[#1E1E22] bg-[#111114] p-4">
                <div className="text-[10px] text-[#6B6B75] uppercase tracking-widest mb-2">Signal Sectoriel</div>
                <p className="text-xs text-[#E0E0E5]">{regime.description}</p>
              </div>
              <div className="rounded-lg border border-[#1E1E22] bg-[#111114] p-4">
                <div className="text-[10px] text-[#6B6B75] uppercase tracking-widest mb-2">Action Suggeree</div>
                <p className="text-xs text-[#FF6B00]">{regime.action}</p>
              </div>
              <div className="rounded-lg border border-[#1E1E22] bg-[#111114] p-4">
                <div className="text-[10px] text-[#6B6B75] uppercase tracking-widest mb-2">Evenements Macro</div>
                <div className="space-y-1 text-xs text-[#A0A0A8]">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B00]" />
                    <span>FOMC — Surveiller XLF & XLU</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FFD600]" />
                    <span>Earnings Season — Focus XLK & XLY</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444]" />
                    <span>CPI / PPI — Impact XLE & XLB</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
