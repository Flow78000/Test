"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader, Card, LiveBadge } from "@/components/ui/card";
import { loadStrategy, type Leg, type StrategyTemplate, LEVEL_COLORS } from "@/data/option-strategies";
import { StrategyPicker } from "./strategy-picker";
import { LegBuilder } from "./leg-builder";
import { PnlChart, usePnlStats } from "./pnl-chart";
import { SmartAdvisor } from "./smart-advisor";
import { PositionSizer } from "./position-sizer";

const API = "http://localhost:3850";
const UNDERLYINGS = [
  { sym: "SPX", label: "S&P 500", defaultSpot: 5500 },
  { sym: "SPY", label: "SPDR S&P 500", defaultSpot: 550 },
  { sym: "QQQ", label: "Nasdaq 100 ETF", defaultSpot: 470 },
  { sym: "IWM", label: "Russell 2000", defaultSpot: 210 },
  { sym: "GLD", label: "Gold ETF", defaultSpot: 230 },
];

type Tab = "strategies" | "simulator" | "advisor" | "calculator";

export default function OptionLabPage() {
  const [tab, setTab] = useState<Tab>("strategies");
  const [legs, setLegs] = useState<Leg[]>([]);
  const [spot, setSpot] = useState(5500);
  const [shares, setShares] = useState(0);
  const [activeStrategy, setActiveStrategy] = useState<StrategyTemplate | null>(null);
  const [underlying, setUnderlying] = useState("SPX");

  // Fetch live spot price
  const fetchSpot = useCallback(async (sym: string) => {
    try {
      const res = await fetch(`${API}/api/market/vol-regime`).then(r => r.json());
      const ticker = sym === "SPX" ? "SPX" : sym;
      if (res?.[ticker]?.price) {
        setSpot(res[ticker].price);
        return;
      }
      // Try UW iv-rank for close price
      const ivRes = await fetch(`${API}/api/uw/iv-rank?ticker=${sym}`).then(r => r.json());
      const arr = Array.isArray(ivRes?.data) ? ivRes.data : Array.isArray(ivRes) ? ivRes : [];
      const last = arr[arr.length - 1];
      if (last?.close) setSpot(parseFloat(last.close));
    } catch {
      // Use default
      const u = UNDERLYINGS.find(u => u.sym === sym);
      if (u) setSpot(u.defaultSpot);
    }
  }, []);

  useEffect(() => { fetchSpot(underlying); }, [underlying, fetchSpot]);

  const handleSelectStrategy = (strategy: StrategyTemplate) => {
    setActiveStrategy(strategy);
    setLegs(loadStrategy(strategy, spot));
    setShares(strategy.shares);
    setTab("simulator");
  };

  const stats = usePnlStats(legs, spot, shares);

  const tabs: { id: Tab; label: string }[] = [
    { id: "strategies", label: "Strategies" },
    { id: "simulator", label: "Simulateur" },
    { id: "advisor", label: "Smart Advisor" },
    { id: "calculator", label: "Calculateur" },
  ];

  return (
    <div className="p-6 space-y-4">
      <PageHeader title="Option Lab" subtitle="58 strategies, simulation P&L, conseil intelligent et sizing">
        {/* Underlying selector */}
        <select value={underlying} onChange={e => { setUnderlying(e.target.value); }}
          className="bg-[#111114] border border-[#1E1E22] rounded-lg px-3 py-1.5 text-xs text-white focus:border-[#FF6B00] focus:outline-none">
          {UNDERLYINGS.map(u => <option key={u.sym} value={u.sym}>{u.sym} — {u.label}</option>)}
        </select>
        <LiveBadge />
      </PageHeader>

      {/* Tab bar */}
      <div className="flex gap-1 bg-[#0D0D10] rounded-lg p-1 w-fit">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-md text-xs font-semibold transition-all ${
              tab === t.id ? "bg-[#FF6B00] text-black" : "text-[#6B6B75] hover:text-white hover:bg-[#16161A]"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Active strategy badge */}
      {activeStrategy && tab !== "strategies" && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[#6B6B75] uppercase">Strategie :</span>
          <span className="px-2 py-1 rounded-lg text-xs font-bold" style={{
            backgroundColor: LEVEL_COLORS[activeStrategy.level] + "22",
            color: LEVEL_COLORS[activeStrategy.level],
          }}>
            {activeStrategy.name}
          </span>
          {activeStrategy.calendarNote && (
            <span className="text-[10px] text-[#FFA726]">{activeStrategy.calendarNote}</span>
          )}
        </div>
      )}

      {/* Tab Content */}
      {tab === "strategies" && (
        <StrategyPicker onSelect={handleSelectStrategy} />
      )}

      {tab === "simulator" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Leg Builder */}
            <Card className="p-5 lg:col-span-2">
              <LegBuilder legs={legs} spot={spot} shares={shares}
                onLegsChange={setLegs} onSpotChange={setSpot} onSharesChange={setShares} />
            </Card>

            {/* Stats Panel */}
            <Card className="p-5 space-y-3">
              <h2 className="text-xs font-bold text-[#FF6B00] uppercase tracking-widest mb-2">Statistiques</h2>
              <div className="bg-[#0D0D10] rounded-lg p-3 text-center">
                <div className="text-[10px] text-[#6B6B75] uppercase">Profit Max</div>
                <div className="text-xl font-extrabold font-mono text-[#22C55E]">
                  ${stats.maxProfit.toLocaleString()}
                </div>
              </div>
              <div className="bg-[#0D0D10] rounded-lg p-3 text-center">
                <div className="text-[10px] text-[#6B6B75] uppercase">Perte Max</div>
                <div className="text-xl font-extrabold font-mono text-[#EF4444]">
                  ${stats.maxLoss.toLocaleString()}
                </div>
              </div>
              <div className="bg-[#0D0D10] rounded-lg p-3">
                <div className="text-[10px] text-[#6B6B75] uppercase mb-2">Breakevens</div>
                {stats.breakevens.length > 0 ? stats.breakevens.map((be, i) => (
                  <div key={i} className="flex justify-between py-1 border-b border-[#1E1E22] last:border-0">
                    <span className="text-xs text-[#6B6B75]">BE {i + 1}</span>
                    <span className="text-sm font-bold font-mono text-[#FFA726]">${be.toFixed(2)}</span>
                  </div>
                )) : <span className="text-xs text-[#6B6B75]">Aucun</span>}
              </div>
              <div className="bg-[#0D0D10] rounded-lg p-3 text-center">
                <div className="text-[10px] text-[#6B6B75] uppercase">Net Debit/Credit</div>
                <div className="text-lg font-bold font-mono" style={{ color: stats.netDebit >= 0 ? "#22C55E" : "#EF4444" }}>
                  {stats.netDebit >= 0 ? "+" : ""}${stats.netDebit.toLocaleString()}
                </div>
              </div>
            </Card>
          </div>

          {/* P&L Chart */}
          <Card className="p-5">
            <h2 className="text-xs font-bold text-[#6B6B75] uppercase tracking-widest mb-4">Diagramme P&L a Expiration</h2>
            <PnlChart legs={legs} spot={spot} shares={shares} />
          </Card>
        </div>
      )}

      {tab === "advisor" && (
        <SmartAdvisor onLoadStrategy={handleSelectStrategy} />
      )}

      {tab === "calculator" && (
        <PositionSizer legs={legs} spot={spot} shares={shares}
          maxProfit={stats.maxProfit} maxLoss={stats.maxLoss}
          breakevens={stats.breakevens} netDebit={stats.netDebit} />
      )}
    </div>
  );
}
