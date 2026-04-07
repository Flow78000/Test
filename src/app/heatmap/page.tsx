"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { PageHeader, LiveBadge, Card, Badge } from "@/components/ui/card";

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
// Helpers
// ---------------------------------------------------------------------------

const API = "http://localhost:3849";

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

// ---------------------------------------------------------------------------
// Sector Card Component
// ---------------------------------------------------------------------------

function SectorCard({ etf, isHero = false }: { etf: SectorETF; isHero?: boolean }) {
  const netFlow = (etf.call_premium ?? 0) - (etf.put_premium ?? 0);
  const isBull = netFlow >= 0;
  const sentimentColor = isBull ? "#22C55E" : "#EF4444";
  const ringColor = isBull ? "ring-[#22C55E]/30" : "ring-[#EF4444]/30";

  return (
    <div
      className={`rounded-xl border border-[#1E1E22] p-4 transition-all hover:border-[#FF6B00] cursor-pointer ${bgGradient(netFlow)} ${intensityClass(netFlow)} ${ringColor} ${
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
            {fmtPremium(netFlow)}
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
// Main Component
// ---------------------------------------------------------------------------

export default function HeatmapPage() {
  const [sectors, setSectors] = useState<SectorETF[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchData = useCallback(async () => {
    setError(false);
    try {
      const resp = await fetch(`${API}/api/uw/sector-etfs`);
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

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5 * 60_000);
    return () => clearInterval(interval);
  }, [fetchData]);

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
      const net = (s.call_premium ?? 0) - (s.put_premium ?? 0);
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

  return (
    <div className="p-6 min-h-screen bg-[#08080A] text-[#E0E0E5]">
      <PageHeader title="Heatmap Sectorielle" subtitle="Carte thermique des flux d'options par secteur ETF">
        <LiveBadge />
      </PageHeader>

      {loading ? (
        <Card className="p-12 text-center text-[#6B6B75]">Chargement...</Card>
      ) : error ? (
        <Card className="p-12 text-center text-[#6B6B75]">
          Lancez le serveur :{" "}
          <code className="bg-[#08080A] px-2 py-1 rounded text-[#FF6B00]">
            cd D:\flo-w\server && python main.py
          </code>
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
        </>
      )}
    </div>
  );
}
