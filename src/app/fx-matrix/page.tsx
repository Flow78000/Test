"use client";

import { useState, useEffect } from "react";
import { PageHeader, LiveBadge, Card } from "@/components/ui/card";
import { RefreshTimer } from "@/components/ui/refresh-timer";

const API = "http://localhost:3850";
const CURRENCIES = ["EUR", "USD", "JPY", "GBP", "CHF", "AUD", "CAD", "NZD"];

// Demo FX change data (% change today) — rows = base, cols = quote
// Positive = base stronger vs quote
const DEMO_DATA: Record<string, Record<string, number>> = {
  EUR: { EUR: 0, USD: 0.12, JPY: 0.45, GBP: -0.08, CHF: 0.03, AUD: 0.34, CAD: 0.21, NZD: 0.52 },
  USD: { EUR: -0.12, USD: 0, JPY: 0.33, GBP: -0.20, CHF: -0.09, AUD: 0.22, CAD: 0.09, NZD: 0.40 },
  JPY: { EUR: -0.45, USD: -0.33, JPY: 0, GBP: -0.53, CHF: -0.42, AUD: -0.11, CAD: -0.24, NZD: 0.07 },
  GBP: { EUR: 0.08, USD: 0.20, JPY: 0.53, GBP: 0, CHF: 0.11, AUD: 0.42, CAD: 0.29, NZD: 0.60 },
  CHF: { EUR: -0.03, USD: 0.09, JPY: 0.42, GBP: -0.11, CHF: 0, AUD: 0.31, CAD: 0.18, NZD: 0.49 },
  AUD: { EUR: -0.34, USD: -0.22, JPY: 0.11, GBP: -0.42, CHF: -0.31, AUD: 0, CAD: -0.13, NZD: 0.18 },
  CAD: { EUR: -0.21, USD: -0.09, JPY: 0.24, GBP: -0.29, CHF: -0.18, AUD: 0.13, CAD: 0, NZD: 0.31 },
  NZD: { EUR: -0.52, USD: -0.40, JPY: -0.07, GBP: -0.60, CHF: -0.49, AUD: -0.18, CAD: -0.31, NZD: 0 },
};

function cellColor(val: number): string {
  if (val === 0) return "#1A1A1E";
  if (val > 0.4) return "#22C55E33";
  if (val > 0.2) return "#22C55E1A";
  if (val > 0) return "#22C55E0D";
  if (val < -0.4) return "#EF444433";
  if (val < -0.2) return "#EF44441A";
  return "#EF44440D";
}

function textColor(val: number): string {
  if (val === 0) return "#6B6B75";
  return val > 0 ? "#22C55E" : "#EF4444";
}

export default function FxMatrixPage() {
  const [matrixData, setMatrixData] = useState<Record<string, Record<string, number>>>(DEMO_DATA);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    async function fetchLive() {
      try {
        const res = await fetch(`${API}/api/uw/market-tide`).then(r => r.json());
        if (res && typeof res === "object" && Object.keys(res).length > 0) {
          // If API returns FX data, use it; otherwise keep demo
          const fxData = res?.fx_matrix || res?.data?.fx_matrix;
          if (fxData) {
            setMatrixData(fxData);
            setIsLive(true);
          }
        }
      } catch { /* use demo data */ }
    }
    fetchLive();
    const i = setInterval(fetchLive, 10_000);
    return () => clearInterval(i);
  }, []);

  // Calculate currency strength (average performance vs all others)
  const strengths = CURRENCIES.map(ccy => {
    const row = matrixData[ccy] || {};
    const vals = CURRENCIES.filter(c => c !== ccy).map(c => row[c] || 0);
    const avg = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    return { ccy, avg };
  }).sort((a, b) => b.avg - a.avg);

  const strongest = strengths[0];
  const weakest = strengths[strengths.length - 1];

  return (
    <div className="p-6 space-y-5">
      <PageHeader timer={<RefreshTimer intervalSeconds={10} />} title="Matrice FX" subtitle="Forces relatives et correlations des 8 devises majeures">
        {!isLive && (
          <span className="px-2 py-1 rounded text-[10px] font-semibold bg-[#FFB30015] text-[#FFB300] border border-[#FFB30030]">
            DEMO DATA
          </span>
        )}
        {isLive && <LiveBadge />}
      </PageHeader>

      {/* Strongest / Weakest summary */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-[#22C55E15] flex items-center justify-center text-[#22C55E] text-lg font-bold">↑</div>
          <div>
            <div className="text-[10px] text-[#6B6B75] uppercase tracking-wider">Plus forte</div>
            <div className="text-lg font-bold text-[#22C55E]">{strongest.ccy}</div>
            <div className="text-[10px] text-[#6B6B75]">Moy. {strongest.avg > 0 ? "+" : ""}{strongest.avg.toFixed(3)}%</div>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-[#EF444415] flex items-center justify-center text-[#EF4444] text-lg font-bold">↓</div>
          <div>
            <div className="text-[10px] text-[#6B6B75] uppercase tracking-wider">Plus faible</div>
            <div className="text-lg font-bold text-[#EF4444]">{weakest.ccy}</div>
            <div className="text-[10px] text-[#6B6B75]">Moy. {weakest.avg > 0 ? "+" : ""}{weakest.avg.toFixed(3)}%</div>
          </div>
        </Card>
      </div>

      {/* 8x8 Matrix */}
      <Card className="overflow-hidden">
        <div className="px-5 py-3 border-b border-[#1E1E22] flex items-center gap-3">
          <span className="text-sm font-bold">Matrice de Performance Relative (%)</span>
          <span className="text-[10px] text-[#6B6B75] ml-auto">Ligne = base, Colonne = quote</span>
        </div>
        <div className="overflow-x-auto p-4">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="p-2 text-left text-[#6B6B75] text-[10px] uppercase tracking-wider w-16"></th>
                {CURRENCIES.map(ccy => (
                  <th key={ccy} className="p-2 text-center text-[10px] uppercase tracking-wider font-bold text-[#FF6B00] w-16">{ccy}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CURRENCIES.map(base => (
                <tr key={base}>
                  <td className="p-2 text-[10px] uppercase tracking-wider font-bold text-[#FF6B00]">{base}</td>
                  {CURRENCIES.map(quote => {
                    const val = matrixData[base]?.[quote] ?? 0;
                    const isDiag = base === quote;
                    return (
                      <td
                        key={quote}
                        className="p-2 text-center font-mono text-[11px] font-semibold transition-colors"
                        style={{
                          background: isDiag ? "#0A0A0A" : cellColor(val),
                          color: isDiag ? "#2A2A30" : textColor(val),
                        }}
                      >
                        {isDiag ? "---" : (val > 0 ? "+" : "") + val.toFixed(2)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Currency Strength Ranking */}
      <Card className="overflow-hidden">
        <div className="px-5 py-3 border-b border-[#1E1E22]">
          <span className="text-sm font-bold">Classement des devises</span>
        </div>
        <div className="p-4 space-y-2">
          {strengths.map((s, i) => {
            const pct = ((s.avg + 0.6) / 1.2) * 100; // Normalize to 0-100 for bar
            const barColor = s.avg > 0.1 ? "#22C55E" : s.avg < -0.1 ? "#EF4444" : "#FFB300";
            return (
              <div key={s.ccy} className="flex items-center gap-3">
                <span className="text-[10px] text-[#6B6B75] w-4 text-right">{i + 1}.</span>
                <span className="text-xs font-bold text-[#FF6B00] w-10">{s.ccy}</span>
                <div className="flex-1 h-3 bg-[#0A0A0A] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${Math.max(5, Math.min(100, pct))}%`, background: barColor }}
                  />
                </div>
                <span className="text-[10px] font-mono w-16 text-right" style={{ color: textColor(s.avg) }}>
                  {s.avg > 0 ? "+" : ""}{s.avg.toFixed(3)}%
                </span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
