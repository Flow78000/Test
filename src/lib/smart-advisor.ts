/**
 * FLO.W Smart Advisor — Strategy Scoring Engine
 * Scores all 58 strategies based on live market conditions (IV, HV, VRP, regime, SKEW).
 * Returns top-N recommendations with French explanations.
 */
import { ALL_STRATEGIES, type StrategyTemplate, type Sentiment, type VolBias } from "@/data/option-strategies";

export interface MarketConditions {
  iv: number;          // Implied Volatility %
  ivRank: number;      // 0-100 percentile
  hv: number;          // Historical Volatility %
  vrp: number;         // IV - HV (Volatility Risk Premium)
  vix: number;         // VIX level
  regime: string;      // CALME | TRANSITION | STRESS | CRISE
  fullRegime: string;  // RISK_ON | PRUDENT | DEFENSIF | HEDGE
  skew: number;        // SKEW index level
  termStructure: string; // CONTANGO | BACKWARDATION
}

export interface Recommendation {
  strategy: StrategyTemplate;
  score: number;        // 0-100
  reasons: string[];    // French explanations
  riskLevel: "low" | "medium" | "high";
}

// ─── Scoring weights ───
const W_IV_RANK = 0.30;
const W_VRP = 0.20;
const W_REGIME = 0.25;
const W_SKEW = 0.10;
const W_TERM = 0.15;

function scoreIVRank(ivRank: number, volBias: VolBias): { score: number; reason: string } {
  if (ivRank > 60) {
    const s = volBias === "short_vol" ? 100 : volBias === "neutral" ? 60 : 20;
    return { score: s, reason: `IV Rank a ${ivRank.toFixed(0)}% — la vol implicite est chere, vendre de la vol est optimal` };
  }
  if (ivRank < 30) {
    const s = volBias === "long_vol" ? 100 : volBias === "neutral" ? 60 : 20;
    return { score: s, reason: `IV Rank a ${ivRank.toFixed(0)}% — la vol implicite est bon marche, acheter de la vol est avantageux` };
  }
  const s = volBias === "neutral" ? 80 : 50;
  return { score: s, reason: `IV Rank a ${ivRank.toFixed(0)}% — zone neutre, strategies equilibrees preferees` };
}

function scoreVRP(vrp: number, volBias: VolBias): { score: number; reason: string } {
  if (vrp > 5) {
    const s = volBias === "short_vol" ? 100 : volBias === "neutral" ? 50 : 10;
    return { score: s, reason: `VRP a +${vrp.toFixed(1)} — prime de risque elevee, les vendeurs de vol ont l'avantage` };
  }
  if (vrp > 2) {
    const s = volBias === "short_vol" ? 70 : volBias === "neutral" ? 50 : 30;
    return { score: s, reason: `VRP a +${vrp.toFixed(1)} — prime de risque positive, leger avantage vendeur` };
  }
  if (vrp < -2) {
    const s = volBias === "long_vol" ? 100 : volBias === "neutral" ? 50 : 10;
    return { score: s, reason: `VRP a ${vrp.toFixed(1)} — HV depasse IV, achat de vol potentiellement sous-evalue` };
  }
  return { score: 50, reason: `VRP a ${vrp.toFixed(1)} — prime de risque equilibree` };
}

function scoreRegime(regime: string, fullRegime: string, sentiment: Sentiment, volBias: VolBias): { score: number; reason: string } {
  const r = regime.toUpperCase();
  const fr = fullRegime.toUpperCase();

  if (r === "CALME" || fr === "RISK_ON") {
    let s = 50;
    if (sentiment === "bullish" && volBias === "short_vol") s = 100;
    else if (sentiment === "bullish") s = 80;
    else if (volBias === "short_vol") s = 80;
    else if (sentiment === "bearish") s = 20;
    return { score: s, reason: `Regime ${r} / ${fr} — marche calme, favorise les strategies de credit et haussieres` };
  }

  if (r === "TRANSITION" || fr === "PRUDENT") {
    let s = 50;
    if (sentiment === "neutral") s = 100;
    else if (volBias === "neutral") s = 80;
    return { score: s, reason: `Regime ${r} / ${fr} — incertitude, strategies neutres et couvertes recommandees` };
  }

  if (r === "STRESS" || fr === "DEFENSIF") {
    let s = 50;
    if (sentiment === "bearish") s = 80;
    else if (sentiment === "neutral") s = 60;
    else if (sentiment === "bullish") s = 20;
    return { score: s, reason: `Regime ${r} / ${fr} — stress eleve, favorise la protection et les biais baissiers` };
  }

  // CRISE / HEDGE
  let s = 50;
  if (sentiment === "bearish" && volBias === "long_vol") s = 100;
  else if (volBias === "long_vol") s = 80;
  else if (sentiment === "bullish") s = 10;
  return { score: s, reason: `Regime ${r} / ${fr} — crise, achat de vol et protection maximale` };
}

function scoreSkew(skew: number, sentiment: Sentiment): { score: number; reason: string } {
  if (skew > 150) {
    const s = sentiment === "bearish" ? 100 : sentiment === "neutral" ? 60 : 30;
    return { score: s, reason: `SKEW a ${skew.toFixed(0)} — tail risk eleve, les strategies avec puts sont pertinentes` };
  }
  if (skew > 135) {
    return { score: 70, reason: `SKEW a ${skew.toFixed(0)} — zone normale, pas de biais fort` };
  }
  const s = sentiment === "bullish" ? 100 : 60;
  return { score: s, reason: `SKEW a ${skew.toFixed(0)} — tail risk faible, favorise les strategies haussieres et symetriques` };
}

function scoreTerm(ts: string, strategy: StrategyTemplate): { score: number; reason: string } {
  const hasCalendar = !!strategy.calendarNote;
  if (ts === "CONTANGO") {
    const s = hasCalendar ? 100 : 50;
    return { score: s, reason: `Term structure en CONTANGO — ${hasCalendar ? "calendars et diagonals optimaux" : "structure normale, toutes strategies viables"}` };
  }
  // BACKWARDATION
  const s = hasCalendar ? 20 : 80;
  return { score: s, reason: `Term structure en BACKWARDATION — ${hasCalendar ? "eviter les calendars (inversion defavorable)" : "positions directionnelles favorisees"}` };
}

function getRiskLevel(strategy: StrategyTemplate): "low" | "medium" | "high" {
  if (strategy.level === "Novice") return "low";
  if (strategy.level === "Expert" || strategy.category === "NAKED") return "high";
  if (strategy.shares !== 0) return "medium";
  if (strategy.legs.some(l => l.side === "Sell" && l.qty > 1)) return "high";
  return "medium";
}

export function scoreStrategies(conditions: MarketConditions, topN = 5): Recommendation[] {
  const results: Recommendation[] = [];

  for (const strategy of ALL_STRATEGIES) {
    const ivr = scoreIVRank(conditions.ivRank, strategy.volBias);
    const vrp = scoreVRP(conditions.vrp, strategy.volBias);
    const reg = scoreRegime(conditions.regime, conditions.fullRegime, strategy.sentiment, strategy.volBias);
    const skw = scoreSkew(conditions.skew, strategy.sentiment);
    const trm = scoreTerm(conditions.termStructure, strategy);

    const composite = Math.round(
      ivr.score * W_IV_RANK +
      vrp.score * W_VRP +
      reg.score * W_REGIME +
      skw.score * W_SKEW +
      trm.score * W_TERM
    );

    // Pick top 3 reasons (highest scoring dimensions)
    const dims = [
      { w: W_IV_RANK, s: ivr.score, r: ivr.reason },
      { w: W_VRP, s: vrp.score, r: vrp.reason },
      { w: W_REGIME, s: reg.score, r: reg.reason },
      { w: W_SKEW, s: skw.score, r: skw.reason },
      { w: W_TERM, s: trm.score, r: trm.reason },
    ].sort((a, b) => (b.s * b.w) - (a.s * a.w));

    results.push({
      strategy,
      score: composite,
      reasons: dims.slice(0, 3).map(d => d.r),
      riskLevel: getRiskLevel(strategy),
    });
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, topN);
}
