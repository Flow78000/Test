"use client";

import { useState, useMemo } from "react";
import { Card, KpiCard } from "@/components/ui/card";
import { fmtNum } from "@/lib/format";
import type { Leg } from "@/data/option-strategies";

interface Props {
  legs: Leg[];
  spot: number;
  shares: number;
  maxProfit: number;
  maxLoss: number;
  breakevens: number[];
  netDebit: number;
}

export function PositionSizer({ legs, spot, shares, maxProfit, maxLoss, breakevens, netDebit }: Props) {
  const [accountSize, setAccountSize] = useState(100000);
  const [maxRiskPct, setMaxRiskPct] = useState(2);

  const sizing = useMemo(() => {
    const riskBudget = accountSize * (maxRiskPct / 100);
    const riskPerContract = Math.abs(maxLoss);
    const suggestedContracts = riskPerContract > 0 ? Math.floor(riskBudget / riskPerContract) : 0;
    const totalRisk = suggestedContracts * riskPerContract;
    const totalProfit = suggestedContracts * maxProfit;
    const rom = riskPerContract > 0 ? (maxProfit / riskPerContract) * 100 : 0;
    const rr = riskPerContract > 0 ? maxProfit / riskPerContract : 0;

    // Distance from spot
    const distances = breakevens.map(be => ({
      price: be,
      distance: Math.abs(be - spot),
      pct: Math.abs((be - spot) / spot * 100),
    }));

    return {
      riskBudget, riskPerContract, suggestedContracts, totalRisk, totalProfit, rom, rr, distances,
    };
  }, [accountSize, maxRiskPct, maxProfit, maxLoss, breakevens, spot]);

  const fmt = (n: number) => "$" + Math.abs(n).toLocaleString("en-US", { maximumFractionDigits: 0 });

  return (
    <div className="space-y-4">
      {/* Inputs */}
      <Card className="p-5 space-y-4">
        <h3 className="text-xs font-bold text-[#FF6B00] uppercase tracking-widest">Parametres du Compte</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] text-[#6B6B75] uppercase tracking-widest mb-1 block">Taille du compte ($)</label>
            <input type="number" value={accountSize} onChange={e => setAccountSize(parseFloat(e.target.value) || 0)}
              className="w-full bg-[#0A0A0C] border border-[#1E1E22] rounded-lg px-3 py-2 text-sm font-mono text-[#F0F0F0] focus:border-[#FF6B00] focus:outline-none" />
          </div>
          <div>
            <label className="text-[10px] text-[#6B6B75] uppercase tracking-widest mb-1 block">Risque max (%)</label>
            <input type="number" value={maxRiskPct} step={0.5} min={0.5} max={10}
              onChange={e => setMaxRiskPct(parseFloat(e.target.value) || 0)}
              className="w-full bg-[#0A0A0C] border border-[#1E1E22] rounded-lg px-3 py-2 text-sm font-mono text-[#F0F0F0] focus:border-[#FF6B00] focus:outline-none" />
          </div>
        </div>
      </Card>

      {/* Results */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Contrats Suggeres" value={sizing.suggestedContracts.toString()} color="#FF6B00" sublabel={`Budget: ${fmt(sizing.riskBudget)}`} />
        <KpiCard label="Risque par Contrat" value={fmt(sizing.riskPerContract)} color="#EF4444" />
        <KpiCard label="Profit par Contrat" value={fmt(maxProfit)} color="#22C55E" />
        <KpiCard label="R/R Ratio" value={fmtNum(sizing.rr, 2)} color={sizing.rr > 1 ? "#22C55E" : "#EF4444"} sublabel={sizing.rr > 1 ? "Favorable" : "Defavorable"} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <KpiCard label="ROM %" value={`${fmtNum(sizing.rom, 1)}%`} color="#AB47BC" sublabel="Return on Margin" />
        <KpiCard label="Risque Total" value={fmt(sizing.totalRisk)} color="#EF4444" sublabel={`${sizing.suggestedContracts} contrats`} />
        <KpiCard label="Profit Total Max" value={fmt(sizing.totalProfit)} color="#22C55E" sublabel={`${sizing.suggestedContracts} contrats`} />
      </div>

      {/* Details */}
      <Card className="p-5 space-y-3">
        <h3 className="text-xs font-bold text-[#6B6B75] uppercase tracking-widest">Details</h3>

        <div className="space-y-2 text-xs">
          <div className="flex justify-between py-1.5 border-b border-[#1E1E22]">
            <span className="text-[#6B6B75]">Net Debit/Credit</span>
            <span className="font-mono font-bold" style={{ color: netDebit >= 0 ? "#22C55E" : "#EF4444" }}>
              {netDebit >= 0 ? "+" : ""}{fmt(netDebit)}
            </span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-[#1E1E22]">
            <span className="text-[#6B6B75]">Profit Max</span>
            <span className="font-mono font-bold text-[#22C55E]">{fmt(maxProfit)}</span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-[#1E1E22]">
            <span className="text-[#6B6B75]">Perte Max</span>
            <span className="font-mono font-bold text-[#EF4444]">{fmt(Math.abs(maxLoss))}</span>
          </div>
          {shares !== 0 && (
            <div className="flex justify-between py-1.5 border-b border-[#1E1E22]">
              <span className="text-[#6B6B75]">Actions</span>
              <span className="font-mono font-bold text-[#FF6B00]">{shares > 0 ? "LONG" : "SHORT"} {Math.abs(shares)}</span>
            </div>
          )}
        </div>

        {/* Breakevens */}
        <div>
          <div className="text-[10px] text-[#6B6B75] uppercase tracking-widest mb-2">Breakevens</div>
          {sizing.distances.length > 0 ? (
            <div className="space-y-1">
              {sizing.distances.map((d, i) => (
                <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-[#0E0E12]">
                  <span className="text-[#6B6B75]">BE {i + 1}</span>
                  <span className="font-mono font-bold text-[#FFA726]">${d.price.toFixed(2)}</span>
                  <span className="text-[#6B6B75]">{d.pct.toFixed(1)}% du spot</span>
                </div>
              ))}
            </div>
          ) : (
            <span className="text-xs text-[#6B6B75]">Aucun</span>
          )}
        </div>
      </Card>
    </div>
  );
}
