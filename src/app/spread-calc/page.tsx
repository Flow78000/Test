"use client";

import { useState, useMemo } from "react";
import { PageHeader, Card, KpiCard } from "@/components/ui/card";
import { RefreshTimer } from "@/components/ui/refresh-timer";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";

type StrategyType =
  | "Vertical Spread"
  | "Iron Condor"
  | "Iron Butterfly"
  | "Straddle"
  | "Strangle";

type Direction =
  | "Call Credit"
  | "Put Credit"
  | "Call Debit"
  | "Put Debit";

function InputField({
  label,
  value,
  onChange,
  step,
  min,
  max,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  suffix?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] text-[#6B6B75] uppercase tracking-widest">
        {label}
      </label>
      <div className="relative">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          step={step ?? 1}
          min={min}
          max={max}
          className="w-full bg-[#0A0A0C] border border-[#1E1E22] rounded-lg px-3 py-2 text-sm font-mono text-[#F0F0F0] focus:border-[#FF6B00] focus:outline-none transition-colors"
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[#6B6B75]">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: T[];
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] text-[#6B6B75] uppercase tracking-widest">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="w-full bg-[#0A0A0C] border border-[#1E1E22] rounded-lg px-3 py-2 text-sm text-[#F0F0F0] focus:border-[#FF6B00] focus:outline-none transition-colors appearance-none cursor-pointer"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

function ResultRow({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-[#1E1E22] last:border-0">
      <span className="text-xs text-[#6B6B75]">{label}</span>
      <span
        className="text-sm font-bold font-mono"
        style={{ color: color ?? "#F0F0F0" }}
      >
        {value}
      </span>
    </div>
  );
}

export default function SpreadCalcPage() {
  const [accountSize, setAccountSize] = useState(100000);
  const [maxRiskPct, setMaxRiskPct] = useState(2);
  const [spotPrice, setSpotPrice] = useState(5500);
  const [strategy, setStrategy] = useState<StrategyType>("Vertical Spread");
  const [direction, setDirection] = useState<Direction>("Call Credit");
  const [shortStrike, setShortStrike] = useState(5550);
  const [longStrike, setLongStrike] = useState(5600);
  const [premium, setPremium] = useState(8.5);

  const results = useMemo(() => {
    const width = Math.abs(longStrike - shortStrike);
    const isCredit =
      direction === "Call Credit" || direction === "Put Credit";
    const multiplier = 100; // options multiplier

    let maxRisk: number;
    let maxProfit: number;
    let breakeven: number;

    if (
      strategy === "Vertical Spread" ||
      strategy === "Iron Condor" ||
      strategy === "Iron Butterfly"
    ) {
      if (isCredit) {
        maxProfit = premium * multiplier;
        maxRisk = (width - premium) * multiplier;
        breakeven =
          direction === "Call Credit"
            ? shortStrike + premium
            : shortStrike - premium;
      } else {
        maxRisk = premium * multiplier;
        maxProfit = (width - premium) * multiplier;
        breakeven =
          direction === "Call Debit"
            ? shortStrike + premium
            : shortStrike - premium;
      }
    } else if (strategy === "Straddle") {
      maxRisk = premium * multiplier * 2;
      maxProfit = Infinity;
      breakeven = shortStrike;
    } else {
      // Strangle
      maxRisk = premium * multiplier * 2;
      maxProfit = Infinity;
      breakeven = shortStrike;
    }

    const riskBudget = accountSize * (maxRiskPct / 100);
    const suggestedContracts =
      maxRisk > 0 ? Math.floor(riskBudget / maxRisk) : 0;
    const rrRatio = maxRisk > 0 ? maxProfit / maxRisk : 0;
    const distFromSpot =
      spotPrice > 0
        ? ((shortStrike - spotPrice) / spotPrice) * 100
        : 0;
    const rom = maxRisk > 0 ? (maxProfit / maxRisk) * 100 : 0;

    return {
      maxRisk,
      maxProfit,
      breakeven,
      rrRatio,
      suggestedContracts,
      width,
      distFromSpot,
      rom,
      isCredit,
    };
  }, [
    accountSize,
    maxRiskPct,
    spotPrice,
    strategy,
    direction,
    shortStrike,
    longStrike,
    premium,
  ]);

  const chartData = useMemo(() => {
    const low = spotPrice * 0.9;
    const high = spotPrice * 1.1;
    const step = (high - low) / 200;
    const multiplier = 100;
    const isCredit =
      direction === "Call Credit" || direction === "Put Credit";
    const isCall =
      direction === "Call Credit" || direction === "Call Debit";

    const points: { price: number; pnl: number }[] = [];

    for (let p = low; p <= high; p += step) {
      let pnl = 0;

      if (strategy === "Vertical Spread") {
        if (isCall) {
          const shortPayoff = -Math.max(0, p - shortStrike);
          const longPayoff = Math.max(0, p - longStrike);
          pnl = isCredit
            ? (premium + shortPayoff + longPayoff) * multiplier
            : (-premium - shortPayoff - longPayoff) * multiplier;
        } else {
          const shortPayoff = -Math.max(0, shortStrike - p);
          const longPayoff = Math.max(0, longStrike - p);
          pnl = isCredit
            ? (premium + shortPayoff + longPayoff) * multiplier
            : (-premium - shortPayoff - longPayoff) * multiplier;
        }
      } else if (strategy === "Straddle") {
        const callPayoff = Math.max(0, p - shortStrike);
        const putPayoff = Math.max(0, shortStrike - p);
        pnl = (callPayoff + putPayoff - premium * 2) * multiplier;
      } else if (strategy === "Strangle") {
        const callPayoff = Math.max(0, p - longStrike);
        const putPayoff = Math.max(0, shortStrike - p);
        pnl = (callPayoff + putPayoff - premium * 2) * multiplier;
      } else if (strategy === "Iron Condor") {
        // simplified: sell short strikes, buy long strikes
        const callShort = -Math.max(0, p - shortStrike);
        const callLong = Math.max(0, p - (shortStrike + 50));
        const putShort = -Math.max(0, shortStrike - 50 - p);
        const putLong = Math.max(0, shortStrike - 100 - p);
        pnl =
          (premium + callShort + callLong + putShort + putLong) *
          multiplier;
      } else {
        // Iron Butterfly
        const callShort = -Math.max(0, p - shortStrike);
        const callLong = Math.max(0, p - longStrike);
        const putShort = -Math.max(0, shortStrike - p);
        const putLong = Math.max(
          0,
          shortStrike - (longStrike - shortStrike) - p
        );
        pnl =
          (premium + callShort + callLong + putShort + putLong) *
          multiplier;
      }

      points.push({ price: Math.round(p * 100) / 100, pnl: Math.round(pnl) });
    }

    return points;
  }, [spotPrice, strategy, direction, shortStrike, longStrike, premium]);

  const fmt = (n: number) =>
    n === Infinity
      ? "Illimite"
      : n.toLocaleString("en-US", {
          style: "currency",
          currency: "USD",
          maximumFractionDigits: 0,
        });

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        timer={<RefreshTimer intervalSeconds={10} />}
        title="Calculateur de Spreads"
        subtitle="Construction et analyse de strategies options multi-jambes"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Inputs */}
        <Card className="p-5 space-y-4 lg:col-span-1">
          <h2 className="text-xs font-bold text-[#FF6B00] uppercase tracking-widest mb-2">
            Parametres
          </h2>

          <InputField
            label="Taille du Compte"
            value={accountSize}
            onChange={setAccountSize}
            step={1000}
            suffix="$"
          />

          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-[#6B6B75] uppercase tracking-widest">
              Risque Max (%)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0.5}
                max={10}
                step={0.5}
                value={maxRiskPct}
                onChange={(e) => setMaxRiskPct(parseFloat(e.target.value))}
                className="flex-1 accent-[#FF6B00]"
              />
              <span className="text-sm font-mono text-[#FF6B00] w-12 text-right">
                {maxRiskPct}%
              </span>
            </div>
          </div>

          <InputField
            label="Prix Sous-Jacent (Spot)"
            value={spotPrice}
            onChange={setSpotPrice}
            step={0.5}
          />

          <SelectField
            label="Type de Strategie"
            value={strategy}
            onChange={setStrategy}
            options={[
              "Vertical Spread",
              "Iron Condor",
              "Iron Butterfly",
              "Straddle",
              "Strangle",
            ]}
          />

          {strategy === "Vertical Spread" && (
            <SelectField
              label="Direction"
              value={direction}
              onChange={setDirection}
              options={[
                "Call Credit",
                "Put Credit",
                "Call Debit",
                "Put Debit",
              ]}
            />
          )}

          <InputField
            label="Strike Court (Short)"
            value={shortStrike}
            onChange={setShortStrike}
            step={1}
          />
          <InputField
            label="Strike Long"
            value={longStrike}
            onChange={setLongStrike}
            step={1}
          />
          <InputField
            label="Prime (Credit/Debit)"
            value={premium}
            onChange={setPremium}
            step={0.05}
            suffix="$"
          />
        </Card>

        {/* Results */}
        <Card className="p-5 lg:col-span-2 space-y-4">
          <h2 className="text-xs font-bold text-[#FF6B00] uppercase tracking-widest mb-2">
            Resultats
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <KpiCard
              label="Risque Max"
              value={fmt(results.maxRisk)}
              color="#EF4444"
            />
            <KpiCard
              label="Profit Max"
              value={fmt(results.maxProfit)}
              color="#22C55E"
            />
            <KpiCard
              label="Contrats"
              value={results.suggestedContracts}
              color="#FF6B00"
            />
            <KpiCard
              label="ROM %"
              value={`${results.rom.toFixed(1)}%`}
              color="#A78BFA"
            />
          </div>

          <Card className="p-4">
            <ResultRow
              label="Risk/Reward Ratio"
              value={
                results.rrRatio === Infinity
                  ? "Illimite"
                  : `1:${results.rrRatio.toFixed(2)}`
              }
            />
            <ResultRow
              label="Breakeven"
              value={`$${results.breakeven.toFixed(2)}`}
              color="#FFA726"
            />
            <ResultRow
              label="Largeur du Spread"
              value={`${results.width} pts`}
            />
            <ResultRow
              label="Distance du Spot"
              value={`${results.distFromSpot >= 0 ? "+" : ""}${results.distFromSpot.toFixed(2)}%`}
              color={
                Math.abs(results.distFromSpot) < 2 ? "#EF4444" : "#22C55E"
              }
            />
            <ResultRow
              label="Budget Risque"
              value={fmt(accountSize * (maxRiskPct / 100))}
              color="#6B6B75"
            />
          </Card>
        </Card>
      </div>

      {/* P&L Chart */}
      <Card className="p-5">
        <h2 className="text-xs font-bold text-[#6B6B75] uppercase tracking-widest mb-4">
          Diagramme P&L a Expiration
        </h2>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
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
                formatter={(v) => [
                  `$${Number(v).toLocaleString()}`,
                  "P&L",
                ]}
              />
              <ReferenceLine y={0} stroke="#6B6B75" strokeDasharray="4 2" />
              <ReferenceLine
                x={results.breakeven}
                stroke="#FFA726"
                strokeDasharray="4 2"
                label={{
                  value: `BE: $${results.breakeven.toFixed(0)}`,
                  fill: "#FFA726",
                  fontSize: 10,
                  position: "top",
                }}
              />
              <ReferenceLine
                x={spotPrice}
                stroke="#FF6B00"
                strokeDasharray="2 2"
                label={{
                  value: "Spot",
                  fill: "#FF6B00",
                  fontSize: 10,
                  position: "insideTopRight",
                }}
              />
              <Area
                type="monotone"
                dataKey="pnl"
                stroke="#22C55E"
                fill="url(#profitGrad)"
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
