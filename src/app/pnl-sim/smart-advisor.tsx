"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, KpiCard, Badge } from "@/components/ui/card";
import { fmtNum, fmtPct } from "@/lib/format";
import { scoreStrategies, type MarketConditions, type Recommendation } from "@/lib/smart-advisor";
import { LEVEL_COLORS, SENTIMENT_ICONS, SENTIMENT_COLORS, type StrategyTemplate } from "@/data/option-strategies";

const API = "http://localhost:3850";

interface Props {
  onLoadStrategy: (strategy: StrategyTemplate) => void;
}

export function SmartAdvisor({ onLoadStrategy }: Props) {
  const [ticker, setTicker] = useState("SPY");
  const [conditions, setConditions] = useState<MarketConditions | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ivRes, volRes, regimeRes, fullRes] = await Promise.allSettled([
        fetch(`${API}/api/uw/iv-rank?ticker=${ticker}`).then(r => r.json()),
        fetch(`${API}/api/uw/realized-vol?ticker=${ticker === "SPX" ? "SPY" : ticker}`).then(r => r.json()),
        fetch(`${API}/api/market/vol-regime`).then(r => r.json()),
        fetch(`${API}/api/regime/full`).then(r => r.json()),
      ]);

      const ivData = ivRes.status === "fulfilled" ? ivRes.value : null;
      const volData = volRes.status === "fulfilled" ? volRes.value : null;
      const regData = regimeRes.status === "fulfilled" ? regimeRes.value : null;
      const fullData = fullRes.status === "fulfilled" ? fullRes.value : null;

      const ivArr = Array.isArray(ivData?.data) ? ivData.data : Array.isArray(ivData) ? ivData : [];
      const latest = ivArr[ivArr.length - 1];

      const iv = latest ? parseFloat(latest.volatility || 0) * 100 : 20;
      const ivRank = latest ? parseFloat(latest.iv_rank_1y || 0) : 50;

      const volArr = Array.isArray(volData?.data) ? volData.data : Array.isArray(volData) ? volData : [];
      const latestVol = volArr[volArr.length - 1];
      const hv = latestVol ? parseFloat(latestVol.realized || latestVol.hv || 0) * 100 : 18;

      const vix = regData?.VIX?.price || 21;
      const skew = regData?.SKEW?.price || 140;
      const regime = regData?._ratios?.regime || "CALME";
      const termStructure = regData?._ratios?.term_structure || "CONTANGO";
      const fullRegime = fullData?.regime?.regime || "RISK_ON";

      const cond: MarketConditions = {
        iv, ivRank, hv, vrp: iv - hv, vix, regime, fullRegime, skew, termStructure,
      };

      setConditions(cond);
      setRecommendations(scoreStrategies(cond, 8));
    } catch (e) {
      console.error("Smart Advisor load error:", e);
    }
    setLoading(false);
  }, [ticker]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="text-center py-20 text-[#6B6B75]">Analyse des conditions de marche...</div>;

  const riskColors = { low: "#22C55E", medium: "#FFA726", high: "#EF4444" };
  const riskLabels = { low: "Faible", medium: "Moyen", high: "Eleve" };

  return (
    <div className="space-y-4">
      {/* Ticker + Refresh */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-[#6B6B75]">Sous-jacent :</span>
        <select value={ticker} onChange={e => setTicker(e.target.value)}
          className="bg-[#111114] border border-[#1E1E22] rounded-lg px-3 py-1.5 text-xs text-white focus:border-[#FF6B00] focus:outline-none">
          {["SPY", "SPX", "QQQ", "IWM", "GLD"].map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <button onClick={load} className="px-3 py-1.5 bg-[#111114] border border-[#1E1E22] rounded-lg text-xs hover:border-[#FF6B00] transition-colors">
          Actualiser
        </button>
      </div>

      {/* Market Conditions KPIs */}
      {conditions && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiCard label="IV" value={`${fmtNum(conditions.iv, 1)}%`}
            color={conditions.iv > 25 ? "#EF4444" : conditions.iv > 18 ? "#FFA726" : "#22C55E"} />
          <KpiCard label="IV Rank" value={`${fmtNum(conditions.ivRank, 0)}%`}
            color={conditions.ivRank > 60 ? "#EF4444" : conditions.ivRank > 30 ? "#FFA726" : "#22C55E"}
            sublabel={conditions.ivRank > 60 ? "Cher" : conditions.ivRank < 30 ? "Bon marche" : "Neutre"} />
          <KpiCard label="HV 20j" value={`${fmtNum(conditions.hv, 1)}%`} color="#42A5F5" />
          <KpiCard label="VRP" value={fmtNum(conditions.vrp, 1)}
            color={conditions.vrp > 2 ? "#22C55E" : conditions.vrp < -2 ? "#EF4444" : "#6B6B75"}
            sublabel={conditions.vrp > 2 ? "Prime vendeur" : conditions.vrp < -2 ? "HV > IV" : "Equilibre"} />
          <KpiCard label="Regime" value={conditions.regime} color={
            conditions.regime === "CALME" ? "#22C55E" : conditions.regime === "TRANSITION" ? "#FFA726"
            : conditions.regime === "STRESS" ? "#EF4444" : "#FF1744"
          } sublabel={conditions.fullRegime} />
          <KpiCard label="SKEW" value={fmtNum(conditions.skew, 0)} color={conditions.skew > 150 ? "#EF4444" : "#6B6B75"}
            sublabel={conditions.skew > 150 ? "Tail risk" : "Normal"} />
        </div>
      )}

      {/* Term Structure */}
      {conditions && (
        <div className="flex items-center gap-3 text-xs">
          <span className="text-[#6B6B75]">Term Structure :</span>
          <Badge color={conditions.termStructure === "CONTANGO" ? "#22C55E" : "#EF4444"}>
            {conditions.termStructure}
          </Badge>
          <span className="text-[#6B6B75]">VIX : {fmtNum(conditions.vix, 1)}</span>
        </div>
      )}

      {/* Recommendations */}
      <div>
        <h3 className="text-xs font-bold text-[#FF6B00] uppercase tracking-widest mb-3">
          Top Strategies Recommandees
        </h3>
        <div className="space-y-3">
          {recommendations.map((rec, i) => (
            <Card key={rec.strategy.id} className="p-4">
              <div className="flex items-start gap-4">
                {/* Rank */}
                <div className="w-10 h-10 rounded-lg bg-[#FF6B0015] flex items-center justify-center text-[#FF6B00] font-extrabold text-lg flex-shrink-0">
                  {i + 1}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-bold text-white">{rec.strategy.name}</span>
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold"
                      style={{ backgroundColor: LEVEL_COLORS[rec.strategy.level] + "22", color: LEVEL_COLORS[rec.strategy.level] }}>
                      {rec.strategy.level}
                    </span>
                    <span className="text-[10px]" style={{ color: SENTIMENT_COLORS[rec.strategy.sentiment] }}>
                      {SENTIMENT_ICONS[rec.strategy.sentiment]} {rec.strategy.sentiment}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ color: riskColors[rec.riskLevel], backgroundColor: riskColors[rec.riskLevel] + "15" }}>
                      Risque {riskLabels[rec.riskLevel]}
                    </span>
                  </div>

                  {/* Score bar */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex-1 h-2 bg-[#1E1E22] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${rec.score}%`, background: `linear-gradient(90deg, #FF6B00, ${rec.score > 70 ? "#22C55E" : "#FFA726"})` }} />
                    </div>
                    <span className="text-xs font-bold font-mono text-[#FF6B00] w-10 text-right">{rec.score}</span>
                  </div>

                  {/* Reasons */}
                  <div className="space-y-1">
                    {rec.reasons.map((r, j) => (
                      <div key={j} className="text-[11px] text-[#6B6B75] flex items-start gap-1.5">
                        <span className="text-[#FF6B00] mt-0.5 flex-shrink-0">-</span>
                        <span>{r}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Load button */}
                <button onClick={() => onLoadStrategy(rec.strategy)}
                  className="px-3 py-2 bg-[#FF6B0015] border border-[#FF6B0033] rounded-lg text-xs text-[#FF6B00] font-semibold hover:bg-[#FF6B0025] transition-colors flex-shrink-0">
                  Charger
                </button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
