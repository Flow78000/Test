"use client";

import { useState, useMemo } from "react";
import { PageHeader, Card, KpiCard } from "@/components/ui/card";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";

interface Leg {
  id: number;
  type: "Call" | "Put";
  side: "Buy" | "Sell";
  strike: number;
  premium: number;
  qty: number;
}

const PRESETS: Record<string, Leg[]> = {
  "Bull Call Spread": [
    { id: 1, type: "Call", side: "Buy", strike: 5500, premium: 12, qty: 1 },
    { id: 2, type: "Call", side: "Sell", strike: 5550, premium: 6, qty: 1 },
  ],
  "Bear Put Spread": [
    { id: 1, type: "Put", side: "Buy", strike: 5500, premium: 14, qty: 1 },
    { id: 2, type: "Put", side: "Sell", strike: 5450, premium: 7, qty: 1 },
  ],
  "Iron Condor": [
    { id: 1, type: "Put", side: "Buy", strike: 5350, premium: 3, qty: 1 },
    { id: 2, type: "Put", side: "Sell", strike: 5400, premium: 6, qty: 1 },
    { id: 3, type: "Call", side: "Sell", strike: 5600, premium: 6, qty: 1 },
    { id: 4, type: "Call", side: "Buy", strike: 5650, premium: 3, qty: 1 },
  ],
  "Iron Butterfly": [
    { id: 1, type: "Put", side: "Buy", strike: 5400, premium: 2, qty: 1 },
    { id: 2, type: "Put", side: "Sell", strike: 5500, premium: 12, qty: 1 },
    { id: 3, type: "Call", side: "Sell", strike: 5500, premium: 12, qty: 1 },
    { id: 4, type: "Call", side: "Buy", strike: 5600, premium: 2, qty: 1 },
  ],
  "Long Straddle": [
    { id: 1, type: "Call", side: "Buy", strike: 5500, premium: 15, qty: 1 },
    { id: 2, type: "Put", side: "Buy", strike: 5500, premium: 15, qty: 1 },
  ],
  "Short Strangle": [
    { id: 1, type: "Call", side: "Sell", strike: 5600, premium: 8, qty: 1 },
    { id: 2, type: "Put", side: "Sell", strike: 5400, premium: 8, qty: 1 },
  ],
};

let nextId = 100;

function calcLegPnl(leg: Leg, price: number): number {
  const multiplier = 100;
  const dir = leg.side === "Buy" ? 1 : -1;
  let intrinsic = 0;
  if (leg.type === "Call") {
    intrinsic = Math.max(0, price - leg.strike);
  } else {
    intrinsic = Math.max(0, leg.strike - price);
  }
  return (intrinsic * dir - leg.premium * dir) * leg.qty * multiplier;
}

export default function PnlSimPage() {
  const [legs, setLegs] = useState<Leg[]>(PRESETS["Bull Call Spread"]);
  const [spot, setSpot] = useState(5500);
  const [activePreset, setActivePreset] = useState("Bull Call Spread");

  const loadPreset = (name: string) => {
    setLegs(PRESETS[name].map((l) => ({ ...l })));
    setActivePreset(name);
  };

  const updateLeg = (id: number, field: keyof Leg, value: string | number) => {
    setLegs((prev) =>
      prev.map((l) => (l.id === id ? { ...l, [field]: value } : l))
    );
  };

  const addLeg = () => {
    if (legs.length >= 4) return;
    setLegs((prev) => [
      ...prev,
      {
        id: ++nextId,
        type: "Call",
        side: "Buy",
        strike: spot,
        premium: 5,
        qty: 1,
      },
    ]);
    setActivePreset("");
  };

  const removeLeg = (id: number) => {
    setLegs((prev) => prev.filter((l) => l.id !== id));
    setActivePreset("");
  };

  const chartData = useMemo(() => {
    const low = spot * 0.85;
    const high = spot * 1.15;
    const step = (high - low) / 300;
    const points: { price: number; pnl: number }[] = [];

    for (let p = low; p <= high; p += step) {
      let total = 0;
      for (const leg of legs) {
        total += calcLegPnl(leg, p);
      }
      points.push({
        price: Math.round(p * 100) / 100,
        pnl: Math.round(total),
      });
    }
    return points;
  }, [legs, spot]);

  const stats = useMemo(() => {
    if (chartData.length === 0)
      return { maxProfit: 0, maxLoss: 0, breakevens: [] as number[] };

    const pnls = chartData.map((d) => d.pnl);
    const maxProfit = Math.max(...pnls);
    const maxLoss = Math.min(...pnls);

    const breakevens: number[] = [];
    for (let i = 1; i < chartData.length; i++) {
      const prev = chartData[i - 1];
      const curr = chartData[i];
      if (
        (prev.pnl <= 0 && curr.pnl > 0) ||
        (prev.pnl >= 0 && curr.pnl < 0)
      ) {
        // linear interpolation
        const ratio =
          Math.abs(prev.pnl) / (Math.abs(prev.pnl) + Math.abs(curr.pnl));
        const be = prev.price + (curr.price - prev.price) * ratio;
        breakevens.push(Math.round(be * 100) / 100);
      }
    }

    return { maxProfit, maxLoss, breakevens };
  }, [chartData]);

  const fmt = (n: number) =>
    n.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    });

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Simulateur P&L"
        subtitle="Projection de gains et pertes selon les scenarios de marche"
      />

      {/* Strategy Presets */}
      <Card className="p-4">
        <h2 className="text-[10px] text-[#6B6B75] uppercase tracking-widest mb-3">
          Strategies Predefinies
        </h2>
        <div className="flex flex-wrap gap-2">
          {Object.keys(PRESETS).map((name) => (
            <button
              key={name}
              onClick={() => loadPreset(name)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                activePreset === name
                  ? "bg-[#FF6B00] text-black border-[#FF6B00]"
                  : "bg-[#0A0A0C] text-[#6B6B75] border-[#1E1E22] hover:border-[#FF6B00] hover:text-[#F0F0F0]"
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      </Card>

      {/* Legs Builder + Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-5 lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-bold text-[#FF6B00] uppercase tracking-widest">
              Legs ({legs.length}/4)
            </h2>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[#6B6B75] uppercase">
                  Spot
                </span>
                <input
                  type="number"
                  value={spot}
                  onChange={(e) => setSpot(parseFloat(e.target.value) || 0)}
                  className="w-24 bg-[#0A0A0C] border border-[#1E1E22] rounded-lg px-2 py-1 text-sm font-mono text-[#F0F0F0] focus:border-[#FF6B00] focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Table header */}
          <div className="grid grid-cols-[80px_80px_1fr_1fr_80px_40px] gap-2 text-[9px] text-[#6B6B75] uppercase tracking-widest px-1">
            <span>Type</span>
            <span>Side</span>
            <span>Strike</span>
            <span>Prime</span>
            <span>Qty</span>
            <span />
          </div>

          {legs.map((leg) => (
            <div
              key={leg.id}
              className="grid grid-cols-[80px_80px_1fr_1fr_80px_40px] gap-2 items-center"
            >
              <select
                value={leg.type}
                onChange={(e) =>
                  updateLeg(leg.id, "type", e.target.value)
                }
                className="bg-[#0A0A0C] border border-[#1E1E22] rounded-lg px-2 py-1.5 text-xs text-[#F0F0F0] focus:border-[#FF6B00] focus:outline-none"
              >
                <option value="Call">Call</option>
                <option value="Put">Put</option>
              </select>

              <select
                value={leg.side}
                onChange={(e) =>
                  updateLeg(leg.id, "side", e.target.value)
                }
                className={`border rounded-lg px-2 py-1.5 text-xs font-semibold focus:outline-none ${
                  leg.side === "Buy"
                    ? "bg-[#22C55E11] border-[#22C55E44] text-[#22C55E]"
                    : "bg-[#EF444411] border-[#EF444444] text-[#EF4444]"
                }`}
              >
                <option value="Buy">Buy</option>
                <option value="Sell">Sell</option>
              </select>

              <input
                type="number"
                value={leg.strike}
                onChange={(e) =>
                  updateLeg(leg.id, "strike", parseFloat(e.target.value) || 0)
                }
                className="bg-[#0A0A0C] border border-[#1E1E22] rounded-lg px-2 py-1.5 text-xs font-mono text-[#F0F0F0] focus:border-[#FF6B00] focus:outline-none"
              />

              <input
                type="number"
                value={leg.premium}
                onChange={(e) =>
                  updateLeg(
                    leg.id,
                    "premium",
                    parseFloat(e.target.value) || 0
                  )
                }
                step={0.5}
                className="bg-[#0A0A0C] border border-[#1E1E22] rounded-lg px-2 py-1.5 text-xs font-mono text-[#F0F0F0] focus:border-[#FF6B00] focus:outline-none"
              />

              <input
                type="number"
                value={leg.qty}
                onChange={(e) =>
                  updateLeg(leg.id, "qty", parseInt(e.target.value) || 1)
                }
                min={1}
                max={100}
                className="bg-[#0A0A0C] border border-[#1E1E22] rounded-lg px-2 py-1.5 text-xs font-mono text-[#F0F0F0] focus:border-[#FF6B00] focus:outline-none"
              />

              <button
                onClick={() => removeLeg(leg.id)}
                className="text-[#EF4444] hover:bg-[#EF444422] rounded-lg p-1.5 transition-colors text-xs"
                title="Supprimer"
              >
                x
              </button>
            </div>
          ))}

          <button
            onClick={addLeg}
            disabled={legs.length >= 4}
            className="w-full py-2 rounded-lg border border-dashed border-[#1E1E22] text-xs text-[#6B6B75] hover:border-[#FF6B00] hover:text-[#FF6B00] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            + Ajouter Leg
          </button>
        </Card>

        {/* Stats */}
        <Card className="p-5 space-y-4">
          <h2 className="text-xs font-bold text-[#FF6B00] uppercase tracking-widest mb-2">
            Statistiques
          </h2>

          <KpiCard
            label="Profit Max"
            value={fmt(stats.maxProfit)}
            color="#22C55E"
          />
          <KpiCard
            label="Perte Max"
            value={fmt(stats.maxLoss)}
            color="#EF4444"
          />

          <Card className="p-4">
            <div className="text-[10px] text-[#6B6B75] uppercase tracking-widest mb-2">
              Breakevens
            </div>
            {stats.breakevens.length > 0 ? (
              stats.breakevens.map((be, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-1 border-b border-[#1E1E22] last:border-0"
                >
                  <span className="text-xs text-[#6B6B75]">BE {i + 1}</span>
                  <span className="text-sm font-bold font-mono text-[#FFA726]">
                    ${be.toFixed(2)}
                  </span>
                </div>
              ))
            ) : (
              <span className="text-xs text-[#6B6B75]">Aucun</span>
            )}
          </Card>

          <Card className="p-4">
            <div className="text-[10px] text-[#6B6B75] uppercase tracking-widest mb-2">
              Net Debit/Credit
            </div>
            {(() => {
              const net = legs.reduce((acc, l) => {
                return acc + (l.side === "Sell" ? l.premium : -l.premium) * l.qty * 100;
              }, 0);
              return (
                <span
                  className="text-lg font-bold font-mono"
                  style={{ color: net >= 0 ? "#22C55E" : "#EF4444" }}
                >
                  {net >= 0 ? "+" : ""}
                  {fmt(net)}
                </span>
              );
            })()}
          </Card>
        </Card>
      </div>

      {/* P&L Chart */}
      <Card className="p-5">
        <h2 className="text-xs font-bold text-[#6B6B75] uppercase tracking-widest mb-4">
          Diagramme P&L a Expiration
        </h2>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="pnlGradPos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22C55E" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#22C55E" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#1E1E22"
                vertical={false}
              />
              <XAxis
                dataKey="price"
                tick={{ fill: "#6B6B75", fontSize: 10 }}
                tickFormatter={(v: number) => v.toFixed(0)}
                stroke="#1E1E22"
              />
              <YAxis
                tick={{ fill: "#6B6B75", fontSize: 10 }}
                tickFormatter={(v: number) =>
                  `$${(v / 1000).toFixed(1)}k`
                }
                stroke="#1E1E22"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#111114",
                  border: "1px solid #1E1E22",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelFormatter={(v) => `Spot: $${Number(v).toFixed(2)}`}
                formatter={(v) => [`$${Number(v).toLocaleString()}`, "P&L"]}
              />
              <ReferenceLine y={0} stroke="#6B6B75" strokeDasharray="4 2" />
              <ReferenceLine
                x={spot}
                stroke="#FF6B00"
                strokeDasharray="2 2"
                label={{
                  value: "Spot",
                  fill: "#FF6B00",
                  fontSize: 10,
                  position: "insideTopRight",
                }}
              />
              {stats.breakevens.map((be, i) => (
                <ReferenceLine
                  key={i}
                  x={be}
                  stroke="#FFA726"
                  strokeDasharray="4 2"
                  label={{
                    value: `BE: $${be.toFixed(0)}`,
                    fill: "#FFA726",
                    fontSize: 10,
                    position: "top",
                  }}
                />
              ))}
              <Area
                type="monotone"
                dataKey="pnl"
                stroke="#22C55E"
                fill="url(#pnlGradPos)"
                strokeWidth={2}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
