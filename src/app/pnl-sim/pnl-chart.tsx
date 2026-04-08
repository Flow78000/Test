"use client";

import { useMemo } from "react";
import type { Leg } from "@/data/option-strategies";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer,
} from "recharts";

function calcLegPnl(leg: Leg, price: number): number {
  const dir = leg.side === "Buy" ? 1 : -1;
  const intrinsic = leg.type === "Call" ? Math.max(0, price - leg.strike) : Math.max(0, leg.strike - price);
  return (intrinsic * dir - leg.premium * dir) * leg.qty * 100;
}

export function usePnlStats(legs: Leg[], spot: number, shares: number) {
  return useMemo(() => {
    const low = spot * 0.85, high = spot * 1.15, step = (high - low) / 300;
    const chartData: { price: number; pnl: number }[] = [];
    for (let p = low; p <= high; p += step) {
      let total = 0;
      for (const leg of legs) total += calcLegPnl(leg, p);
      if (shares !== 0) total += shares * (p - spot);
      chartData.push({ price: Math.round(p * 100) / 100, pnl: Math.round(total) });
    }
    const pnls = chartData.map(d => d.pnl);
    const maxProfit = Math.max(...pnls);
    const maxLoss = Math.min(...pnls);
    const breakevens: number[] = [];
    for (let i = 1; i < chartData.length; i++) {
      const prev = chartData[i - 1], curr = chartData[i];
      if ((prev.pnl <= 0 && curr.pnl > 0) || (prev.pnl >= 0 && curr.pnl < 0)) {
        const ratio = Math.abs(prev.pnl) / (Math.abs(prev.pnl) + Math.abs(curr.pnl));
        breakevens.push(Math.round((prev.price + (curr.price - prev.price) * ratio) * 100) / 100);
      }
    }
    const netDebit = legs.reduce((acc, l) => acc + (l.side === "Sell" ? l.premium : -l.premium) * l.qty * 100, 0);
    return { chartData, maxProfit, maxLoss, breakevens, netDebit };
  }, [legs, spot, shares]);
}

interface Props {
  legs: Leg[];
  spot: number;
  shares: number;
}

export function PnlChart({ legs, spot, shares }: Props) {
  const { chartData, breakevens } = usePnlStats(legs, spot, shares);

  return (
    <div className="h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22C55E" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#22C55E" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1E1E22" vertical={false} />
          <XAxis dataKey="price" tick={{ fill: "#6B6B75", fontSize: 10 }} tickFormatter={(v: number) => v.toFixed(0)} stroke="#1E1E22" />
          <YAxis tick={{ fill: "#6B6B75", fontSize: 10 }} tickFormatter={(v: number) => `$${(v / 1000).toFixed(1)}k`} stroke="#1E1E22" />
          <Tooltip
            contentStyle={{ backgroundColor: "#111114", border: "1px solid #1E1E22", borderRadius: 8, fontSize: 12 }}
            labelFormatter={v => `Spot: $${Number(v).toFixed(2)}`}
            formatter={v => [`$${Number(v).toLocaleString()}`, "P&L"]}
          />
          <ReferenceLine y={0} stroke="#6B6B75" strokeDasharray="4 2" />
          <ReferenceLine x={spot} stroke="#FF6B00" strokeDasharray="2 2"
            label={{ value: "Spot", fill: "#FF6B00", fontSize: 10, position: "insideTopRight" }} />
          {breakevens.map((be, i) => (
            <ReferenceLine key={i} x={be} stroke="#FFA726" strokeDasharray="4 2"
              label={{ value: `BE: $${be.toFixed(0)}`, fill: "#FFA726", fontSize: 10, position: "top" }} />
          ))}
          <Area type="monotone" dataKey="pnl" stroke="#22C55E" fill="url(#pnlGrad)" strokeWidth={2} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
