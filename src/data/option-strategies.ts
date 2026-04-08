/**
 * FLO.W Option Lab — Complete Strategy Catalog (58 strategies)
 * Each strategy has leg templates with strike offsets from ATM.
 * loadStrategy() converts templates to concrete legs given a spot price.
 */

export type Level = "Novice" | "Intermediate" | "Advanced" | "Expert";
export type Sentiment = "bullish" | "bearish" | "neutral" | "volatile";
export type VolBias = "long_vol" | "short_vol" | "neutral";

export interface LegTemplate {
  type: "Call" | "Put";
  side: "Buy" | "Sell";
  strikeOffset: number;
  premiumEstimate: number;
  qty: number;
}

export interface StrategyTemplate {
  id: string;
  name: string;
  level: Level;
  category: string;
  sentiment: Sentiment;
  volBias: VolBias;
  description: string;
  legs: LegTemplate[];
  shares: number; // 0, 100, -100
  maxLegs: number;
  calendarNote?: string;
}

export interface Leg {
  id: number;
  type: "Call" | "Put";
  side: "Buy" | "Sell";
  strike: number;
  premium: number;
  qty: number;
}

let _nextId = 1000;

export function loadStrategy(t: StrategyTemplate, spot: number): Leg[] {
  return t.legs.map(l => ({
    id: ++_nextId,
    type: l.type,
    side: l.side,
    strike: Math.round(spot + l.strikeOffset),
    premium: l.premiumEstimate,
    qty: l.qty,
  }));
}

// ═══════════════════════════════════════════════════════════════
// LEVEL COLORS
// ═══════════════════════════════════════════════════════════════
export const LEVEL_COLORS: Record<Level, string> = {
  Novice: "#22C55E",
  Intermediate: "#42A5F5",
  Advanced: "#FFA726",
  Expert: "#EF4444",
};

export const SENTIMENT_ICONS: Record<Sentiment, string> = {
  bullish: "▲",
  bearish: "▼",
  neutral: "◆",
  volatile: "⚡",
};

export const SENTIMENT_COLORS: Record<Sentiment, string> = {
  bullish: "#22C55E",
  bearish: "#EF4444",
  neutral: "#6B6B75",
  volatile: "#AB47BC",
};

// ═══════════════════════════════════════════════════════════════
// NOVICE (5)
// ═══════════════════════════════════════════════════════════════
const NOVICE: StrategyTemplate[] = [
  {
    id: "long-call", name: "Long Call", level: "Novice", category: "BASIC",
    sentiment: "bullish", volBias: "long_vol", shares: 0, maxLegs: 1,
    description: "Achat d'un call ATM — profit illimite a la hausse, perte limitee a la prime",
    legs: [{ type: "Call", side: "Buy", strikeOffset: 0, premiumEstimate: 15, qty: 1 }],
  },
  {
    id: "long-put", name: "Long Put", level: "Novice", category: "BASIC",
    sentiment: "bearish", volBias: "long_vol", shares: 0, maxLegs: 1,
    description: "Achat d'un put ATM — profit a la baisse, perte limitee a la prime",
    legs: [{ type: "Put", side: "Buy", strikeOffset: 0, premiumEstimate: 15, qty: 1 }],
  },
  {
    id: "covered-call", name: "Covered Call", level: "Novice", category: "INCOME",
    sentiment: "bullish", volBias: "short_vol", shares: 100, maxLegs: 1,
    description: "Detention de 100 actions + vente d'un call OTM — revenu via prime, gain plafonne",
    legs: [{ type: "Call", side: "Sell", strikeOffset: 50, premiumEstimate: 8, qty: 1 }],
  },
  {
    id: "cash-secured-put", name: "Cash-Secured Put", level: "Novice", category: "INCOME",
    sentiment: "bullish", volBias: "short_vol", shares: 0, maxLegs: 1,
    description: "Vente d'un put OTM avec cash en reserve — encaisser la prime, pret a acheter",
    legs: [{ type: "Put", side: "Sell", strikeOffset: -50, premiumEstimate: 8, qty: 1 }],
  },
  {
    id: "protective-put", name: "Protective Put", level: "Novice", category: "OTHER",
    sentiment: "bullish", volBias: "long_vol", shares: 100, maxLegs: 1,
    description: "Detention de 100 actions + achat put OTM — assurance contre la baisse",
    legs: [{ type: "Put", side: "Buy", strikeOffset: -50, premiumEstimate: 8, qty: 1 }],
  },
];

// ═══════════════════════════════════════════════════════════════
// INTERMEDIATE (19)
// ═══════════════════════════════════════════════════════════════
const INTERMEDIATE: StrategyTemplate[] = [
  // CREDIT SPREADS
  {
    id: "bull-put-spread", name: "Bull Put Spread", level: "Intermediate", category: "CREDIT SPREADS",
    sentiment: "bullish", volBias: "short_vol", shares: 0, maxLegs: 2,
    description: "Vente put + achat put plus bas — credit recu, profit si le marche reste au-dessus",
    legs: [
      { type: "Put", side: "Sell", strikeOffset: -25, premiumEstimate: 6, qty: 1 },
      { type: "Put", side: "Buy", strikeOffset: -75, premiumEstimate: 3, qty: 1 },
    ],
  },
  {
    id: "bear-call-spread", name: "Bear Call Spread", level: "Intermediate", category: "CREDIT SPREADS",
    sentiment: "bearish", volBias: "short_vol", shares: 0, maxLegs: 2,
    description: "Vente call + achat call plus haut — credit recu, profit si le marche reste en dessous",
    legs: [
      { type: "Call", side: "Sell", strikeOffset: 25, premiumEstimate: 6, qty: 1 },
      { type: "Call", side: "Buy", strikeOffset: 75, premiumEstimate: 3, qty: 1 },
    ],
  },
  // DEBIT SPREADS
  {
    id: "bull-call-spread", name: "Bull Call Spread", level: "Intermediate", category: "DEBIT SPREADS",
    sentiment: "bullish", volBias: "neutral", shares: 0, maxLegs: 2,
    description: "Achat call + vente call plus haut — cout reduit, gain plafonne",
    legs: [
      { type: "Call", side: "Buy", strikeOffset: 0, premiumEstimate: 12, qty: 1 },
      { type: "Call", side: "Sell", strikeOffset: 50, premiumEstimate: 6, qty: 1 },
    ],
  },
  {
    id: "bear-put-spread", name: "Bear Put Spread", level: "Intermediate", category: "DEBIT SPREADS",
    sentiment: "bearish", volBias: "neutral", shares: 0, maxLegs: 2,
    description: "Achat put + vente put plus bas — pari baissier a cout reduit",
    legs: [
      { type: "Put", side: "Buy", strikeOffset: 0, premiumEstimate: 12, qty: 1 },
      { type: "Put", side: "Sell", strikeOffset: -50, premiumEstimate: 6, qty: 1 },
    ],
  },
  // NEUTRAL
  {
    id: "iron-condor", name: "Iron Condor", level: "Intermediate", category: "NEUTRAL",
    sentiment: "neutral", volBias: "short_vol", shares: 0, maxLegs: 4,
    description: "Bull put spread + bear call spread — profit si le marche reste dans un range",
    legs: [
      { type: "Put", side: "Buy", strikeOffset: -100, premiumEstimate: 3, qty: 1 },
      { type: "Put", side: "Sell", strikeOffset: -50, premiumEstimate: 6, qty: 1 },
      { type: "Call", side: "Sell", strikeOffset: 50, premiumEstimate: 6, qty: 1 },
      { type: "Call", side: "Buy", strikeOffset: 100, premiumEstimate: 3, qty: 1 },
    ],
  },
  {
    id: "iron-butterfly", name: "Iron Butterfly", level: "Intermediate", category: "NEUTRAL",
    sentiment: "neutral", volBias: "short_vol", shares: 0, maxLegs: 4,
    description: "Vente straddle ATM + achat ailes OTM — profit max si le spot ne bouge pas",
    legs: [
      { type: "Put", side: "Buy", strikeOffset: -50, premiumEstimate: 2, qty: 1 },
      { type: "Put", side: "Sell", strikeOffset: 0, premiumEstimate: 12, qty: 1 },
      { type: "Call", side: "Sell", strikeOffset: 0, premiumEstimate: 12, qty: 1 },
      { type: "Call", side: "Buy", strikeOffset: 50, premiumEstimate: 2, qty: 1 },
    ],
  },
  {
    id: "long-call-butterfly", name: "Long Call Butterfly", level: "Intermediate", category: "NEUTRAL",
    sentiment: "neutral", volBias: "short_vol", shares: 0, maxLegs: 3,
    description: "Achat 1 call bas, vente 2 calls ATM, achat 1 call haut — profit max au centre",
    legs: [
      { type: "Call", side: "Buy", strikeOffset: -25, premiumEstimate: 8, qty: 1 },
      { type: "Call", side: "Sell", strikeOffset: 0, premiumEstimate: 5, qty: 2 },
      { type: "Call", side: "Buy", strikeOffset: 25, premiumEstimate: 3, qty: 1 },
    ],
  },
  {
    id: "long-put-butterfly", name: "Long Put Butterfly", level: "Intermediate", category: "NEUTRAL",
    sentiment: "neutral", volBias: "short_vol", shares: 0, maxLegs: 3,
    description: "Achat 1 put haut, vente 2 puts ATM, achat 1 put bas — profit max au centre",
    legs: [
      { type: "Put", side: "Buy", strikeOffset: 25, premiumEstimate: 8, qty: 1 },
      { type: "Put", side: "Sell", strikeOffset: 0, premiumEstimate: 5, qty: 2 },
      { type: "Put", side: "Buy", strikeOffset: -25, premiumEstimate: 3, qty: 1 },
    ],
  },
  // CALENDAR SPREADS
  {
    id: "calendar-call-spread", name: "Calendar Call Spread", level: "Intermediate", category: "CALENDAR SPREADS",
    sentiment: "neutral", volBias: "long_vol", shares: 0, maxLegs: 2,
    calendarNote: "P&L affiche uniquement le leg court a expiration. Le leg long conserve de la valeur temps non modelisee.",
    description: "Vente call court terme + achat call long terme meme strike — profite du decay accelere du front",
    legs: [
      { type: "Call", side: "Sell", strikeOffset: 0, premiumEstimate: 5, qty: 1 },
      { type: "Call", side: "Buy", strikeOffset: 0, premiumEstimate: 10, qty: 1 },
    ],
  },
  {
    id: "calendar-put-spread", name: "Calendar Put Spread", level: "Intermediate", category: "CALENDAR SPREADS",
    sentiment: "neutral", volBias: "long_vol", shares: 0, maxLegs: 2,
    calendarNote: "P&L affiche uniquement le leg court a expiration. Le leg long conserve de la valeur temps non modelisee.",
    description: "Vente put court terme + achat put long terme meme strike",
    legs: [
      { type: "Put", side: "Sell", strikeOffset: 0, premiumEstimate: 5, qty: 1 },
      { type: "Put", side: "Buy", strikeOffset: 0, premiumEstimate: 10, qty: 1 },
    ],
  },
  {
    id: "diagonal-call-spread", name: "Diagonal Call Spread", level: "Intermediate", category: "CALENDAR SPREADS",
    sentiment: "bullish", volBias: "long_vol", shares: 0, maxLegs: 2,
    calendarNote: "P&L affiche uniquement le leg court a expiration. Le leg long conserve de la valeur temps non modelisee.",
    description: "Vente call OTM court terme + achat call ATM long terme — calendar directionnel",
    legs: [
      { type: "Call", side: "Sell", strikeOffset: 25, premiumEstimate: 4, qty: 1 },
      { type: "Call", side: "Buy", strikeOffset: 0, premiumEstimate: 10, qty: 1 },
    ],
  },
  {
    id: "diagonal-put-spread", name: "Diagonal Put Spread", level: "Intermediate", category: "CALENDAR SPREADS",
    sentiment: "bearish", volBias: "long_vol", shares: 0, maxLegs: 2,
    calendarNote: "P&L affiche uniquement le leg court a expiration. Le leg long conserve de la valeur temps non modelisee.",
    description: "Vente put OTM court terme + achat put ATM long terme — calendar baissier",
    legs: [
      { type: "Put", side: "Sell", strikeOffset: -25, premiumEstimate: 4, qty: 1 },
      { type: "Put", side: "Buy", strikeOffset: 0, premiumEstimate: 10, qty: 1 },
    ],
  },
  // DIRECTIONAL
  {
    id: "inverse-iron-butterfly", name: "Inverse Iron Butterfly", level: "Intermediate", category: "DIRECTIONAL",
    sentiment: "volatile", volBias: "long_vol", shares: 0, maxLegs: 4,
    description: "Achat straddle ATM + vente ailes OTM — profit si fort mouvement dans un sens",
    legs: [
      { type: "Call", side: "Buy", strikeOffset: 0, premiumEstimate: 12, qty: 1 },
      { type: "Put", side: "Buy", strikeOffset: 0, premiumEstimate: 12, qty: 1 },
      { type: "Call", side: "Sell", strikeOffset: 50, premiumEstimate: 5, qty: 1 },
      { type: "Put", side: "Sell", strikeOffset: -50, premiumEstimate: 5, qty: 1 },
    ],
  },
  {
    id: "inverse-iron-condor", name: "Inverse Iron Condor", level: "Intermediate", category: "DIRECTIONAL",
    sentiment: "volatile", volBias: "long_vol", shares: 0, maxLegs: 4,
    description: "Achat strangle + vente ailes plus eloignees — profit si fort mouvement",
    legs: [
      { type: "Put", side: "Sell", strikeOffset: -100, premiumEstimate: 2, qty: 1 },
      { type: "Put", side: "Buy", strikeOffset: -50, premiumEstimate: 6, qty: 1 },
      { type: "Call", side: "Buy", strikeOffset: 50, premiumEstimate: 6, qty: 1 },
      { type: "Call", side: "Sell", strikeOffset: 100, premiumEstimate: 2, qty: 1 },
    ],
  },
  {
    id: "short-put-butterfly", name: "Short Put Butterfly", level: "Intermediate", category: "DIRECTIONAL",
    sentiment: "volatile", volBias: "long_vol", shares: 0, maxLegs: 3,
    description: "Inverse du long put butterfly — profit si le sous-jacent bouge fortement",
    legs: [
      { type: "Put", side: "Sell", strikeOffset: 25, premiumEstimate: 8, qty: 1 },
      { type: "Put", side: "Buy", strikeOffset: 0, premiumEstimate: 5, qty: 2 },
      { type: "Put", side: "Sell", strikeOffset: -25, premiumEstimate: 3, qty: 1 },
    ],
  },
  {
    id: "short-call-butterfly", name: "Short Call Butterfly", level: "Intermediate", category: "DIRECTIONAL",
    sentiment: "volatile", volBias: "long_vol", shares: 0, maxLegs: 3,
    description: "Inverse du long call butterfly — profit si le sous-jacent bouge fortement",
    legs: [
      { type: "Call", side: "Sell", strikeOffset: -25, premiumEstimate: 8, qty: 1 },
      { type: "Call", side: "Buy", strikeOffset: 0, premiumEstimate: 5, qty: 2 },
      { type: "Call", side: "Sell", strikeOffset: 25, premiumEstimate: 3, qty: 1 },
    ],
  },
  // OTHER
  {
    id: "long-straddle", name: "Straddle", level: "Intermediate", category: "DIRECTIONAL",
    sentiment: "volatile", volBias: "long_vol", shares: 0, maxLegs: 2,
    description: "Achat call + put ATM — profit si fort mouvement dans n'importe quel sens",
    legs: [
      { type: "Call", side: "Buy", strikeOffset: 0, premiumEstimate: 15, qty: 1 },
      { type: "Put", side: "Buy", strikeOffset: 0, premiumEstimate: 15, qty: 1 },
    ],
  },
  {
    id: "long-strangle", name: "Strangle", level: "Intermediate", category: "DIRECTIONAL",
    sentiment: "volatile", volBias: "long_vol", shares: 0, maxLegs: 2,
    description: "Achat call OTM + put OTM — comme le straddle mais moins cher, besoin de plus de mouvement",
    legs: [
      { type: "Call", side: "Buy", strikeOffset: 50, premiumEstimate: 8, qty: 1 },
      { type: "Put", side: "Buy", strikeOffset: -50, premiumEstimate: 8, qty: 1 },
    ],
  },
  {
    id: "collar", name: "Collar", level: "Intermediate", category: "OTHER",
    sentiment: "bullish", volBias: "neutral", shares: 100, maxLegs: 2,
    description: "100 actions + achat put OTM + vente call OTM — couverture zero-cost",
    legs: [
      { type: "Put", side: "Buy", strikeOffset: -50, premiumEstimate: 6, qty: 1 },
      { type: "Call", side: "Sell", strikeOffset: 50, premiumEstimate: 6, qty: 1 },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════
// ADVANCED (12)
// ═══════════════════════════════════════════════════════════════
const ADVANCED: StrategyTemplate[] = [
  // NAKED
  {
    id: "short-put", name: "Short Put", level: "Advanced", category: "NAKED",
    sentiment: "bullish", volBias: "short_vol", shares: 0, maxLegs: 1,
    description: "Vente de put nue — risque eleve si le marche baisse fortement",
    legs: [{ type: "Put", side: "Sell", strikeOffset: -25, premiumEstimate: 10, qty: 1 }],
  },
  {
    id: "short-call", name: "Short Call", level: "Advanced", category: "NAKED",
    sentiment: "bearish", volBias: "short_vol", shares: 0, maxLegs: 1,
    description: "Vente de call nue — risque illimite a la hausse",
    legs: [{ type: "Call", side: "Sell", strikeOffset: 25, premiumEstimate: 10, qty: 1 }],
  },
  // NEUTRAL
  {
    id: "short-straddle", name: "Short Straddle", level: "Advanced", category: "NEUTRAL",
    sentiment: "neutral", volBias: "short_vol", shares: 0, maxLegs: 2,
    description: "Vente call + put ATM — profit max si le spot ne bouge pas, risque illimite",
    legs: [
      { type: "Call", side: "Sell", strikeOffset: 0, premiumEstimate: 15, qty: 1 },
      { type: "Put", side: "Sell", strikeOffset: 0, premiumEstimate: 15, qty: 1 },
    ],
  },
  {
    id: "short-strangle", name: "Short Strangle", level: "Advanced", category: "NEUTRAL",
    sentiment: "neutral", volBias: "short_vol", shares: 0, maxLegs: 2,
    description: "Vente call OTM + put OTM — profit si le marche reste dans le range",
    legs: [
      { type: "Call", side: "Sell", strikeOffset: 50, premiumEstimate: 8, qty: 1 },
      { type: "Put", side: "Sell", strikeOffset: -50, premiumEstimate: 8, qty: 1 },
    ],
  },
  {
    id: "long-call-condor", name: "Long Call Condor", level: "Advanced", category: "NEUTRAL",
    sentiment: "neutral", volBias: "short_vol", shares: 0, maxLegs: 4,
    description: "4 calls a strikes differents — profit dans un range plus large que le butterfly",
    legs: [
      { type: "Call", side: "Buy", strikeOffset: -50, premiumEstimate: 10, qty: 1 },
      { type: "Call", side: "Sell", strikeOffset: -25, premiumEstimate: 7, qty: 1 },
      { type: "Call", side: "Sell", strikeOffset: 25, premiumEstimate: 4, qty: 1 },
      { type: "Call", side: "Buy", strikeOffset: 50, premiumEstimate: 2, qty: 1 },
    ],
  },
  {
    id: "long-put-condor", name: "Long Put Condor", level: "Advanced", category: "NEUTRAL",
    sentiment: "neutral", volBias: "short_vol", shares: 0, maxLegs: 4,
    description: "4 puts a strikes differents — profit dans un range autour du spot",
    legs: [
      { type: "Put", side: "Buy", strikeOffset: 50, premiumEstimate: 10, qty: 1 },
      { type: "Put", side: "Sell", strikeOffset: 25, premiumEstimate: 7, qty: 1 },
      { type: "Put", side: "Sell", strikeOffset: -25, premiumEstimate: 4, qty: 1 },
      { type: "Put", side: "Buy", strikeOffset: -50, premiumEstimate: 2, qty: 1 },
    ],
  },
  // RATIO SPREADS
  {
    id: "call-ratio-backspread", name: "Call Ratio Backspread", level: "Advanced", category: "RATIO SPREADS",
    sentiment: "bullish", volBias: "long_vol", shares: 0, maxLegs: 2,
    description: "Vente 1 call ATM + achat 2 calls OTM — profit illimite a la hausse si explosion",
    legs: [
      { type: "Call", side: "Sell", strikeOffset: 0, premiumEstimate: 12, qty: 1 },
      { type: "Call", side: "Buy", strikeOffset: 50, premiumEstimate: 6, qty: 2 },
    ],
  },
  {
    id: "put-ratio-backspread", name: "Put Ratio Backspread", level: "Advanced", category: "RATIO SPREADS",
    sentiment: "bearish", volBias: "long_vol", shares: 0, maxLegs: 2,
    description: "Vente 1 put ATM + achat 2 puts OTM — profit si crash baissier",
    legs: [
      { type: "Put", side: "Sell", strikeOffset: 0, premiumEstimate: 12, qty: 1 },
      { type: "Put", side: "Buy", strikeOffset: -50, premiumEstimate: 6, qty: 2 },
    ],
  },
  // BROKEN WING
  {
    id: "put-broken-wing", name: "Put Broken Wing Butterfly", level: "Advanced", category: "RATIO SPREADS",
    sentiment: "neutral", volBias: "short_vol", shares: 0, maxLegs: 3,
    description: "Butterfly asymetrique en puts — credit ou zero-cost avec risque directionnel",
    legs: [
      { type: "Put", side: "Buy", strikeOffset: 50, premiumEstimate: 10, qty: 1 },
      { type: "Put", side: "Sell", strikeOffset: 0, premiumEstimate: 6, qty: 2 },
      { type: "Put", side: "Buy", strikeOffset: -75, premiumEstimate: 2, qty: 1 },
    ],
  },
  {
    id: "call-broken-wing", name: "Call Broken Wing Butterfly", level: "Advanced", category: "RATIO SPREADS",
    sentiment: "neutral", volBias: "short_vol", shares: 0, maxLegs: 3,
    description: "Butterfly asymetrique en calls — credit ou zero-cost",
    legs: [
      { type: "Call", side: "Buy", strikeOffset: -50, premiumEstimate: 10, qty: 1 },
      { type: "Call", side: "Sell", strikeOffset: 0, premiumEstimate: 6, qty: 2 },
      { type: "Call", side: "Buy", strikeOffset: 75, premiumEstimate: 2, qty: 1 },
    ],
  },
  {
    id: "inverse-call-broken-wing", name: "Inverse Call Broken Wing", level: "Advanced", category: "RATIO SPREADS",
    sentiment: "volatile", volBias: "long_vol", shares: 0, maxLegs: 3,
    description: "Inverse du call broken wing — profit si mouvement fort",
    legs: [
      { type: "Call", side: "Sell", strikeOffset: -50, premiumEstimate: 10, qty: 1 },
      { type: "Call", side: "Buy", strikeOffset: 0, premiumEstimate: 6, qty: 2 },
      { type: "Call", side: "Sell", strikeOffset: 75, premiumEstimate: 2, qty: 1 },
    ],
  },
  {
    id: "inverse-put-broken-wing", name: "Inverse Put Broken Wing", level: "Advanced", category: "RATIO SPREADS",
    sentiment: "volatile", volBias: "long_vol", shares: 0, maxLegs: 3,
    description: "Inverse du put broken wing — profit si mouvement fort a la baisse",
    legs: [
      { type: "Put", side: "Sell", strikeOffset: 50, premiumEstimate: 10, qty: 1 },
      { type: "Put", side: "Buy", strikeOffset: 0, premiumEstimate: 6, qty: 2 },
      { type: "Put", side: "Sell", strikeOffset: -75, premiumEstimate: 2, qty: 1 },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════
// EXPERT (22)
// ═══════════════════════════════════════════════════════════════
const EXPERT: StrategyTemplate[] = [
  // INCOME
  {
    id: "covered-short-straddle", name: "Covered Short Straddle", level: "Expert", category: "INCOME",
    sentiment: "bullish", volBias: "short_vol", shares: 100, maxLegs: 2,
    description: "100 actions + vente straddle ATM — revenu double premium, risque eleve a la baisse",
    legs: [
      { type: "Call", side: "Sell", strikeOffset: 0, premiumEstimate: 15, qty: 1 },
      { type: "Put", side: "Sell", strikeOffset: 0, premiumEstimate: 15, qty: 1 },
    ],
  },
  {
    id: "covered-short-strangle", name: "Covered Short Strangle", level: "Expert", category: "INCOME",
    sentiment: "bullish", volBias: "short_vol", shares: 100, maxLegs: 2,
    description: "100 actions + vente strangle OTM — plus de marge que le straddle couvert",
    legs: [
      { type: "Call", side: "Sell", strikeOffset: 50, premiumEstimate: 8, qty: 1 },
      { type: "Put", side: "Sell", strikeOffset: -50, premiumEstimate: 8, qty: 1 },
    ],
  },
  // DIRECTIONAL
  {
    id: "short-call-condor", name: "Short Call Condor", level: "Expert", category: "DIRECTIONAL",
    sentiment: "volatile", volBias: "long_vol", shares: 0, maxLegs: 4,
    description: "Inverse du long call condor — profit si fort mouvement hors du range",
    legs: [
      { type: "Call", side: "Sell", strikeOffset: -50, premiumEstimate: 10, qty: 1 },
      { type: "Call", side: "Buy", strikeOffset: -25, premiumEstimate: 7, qty: 1 },
      { type: "Call", side: "Buy", strikeOffset: 25, premiumEstimate: 4, qty: 1 },
      { type: "Call", side: "Sell", strikeOffset: 50, premiumEstimate: 2, qty: 1 },
    ],
  },
  {
    id: "short-put-condor", name: "Short Put Condor", level: "Expert", category: "DIRECTIONAL",
    sentiment: "volatile", volBias: "long_vol", shares: 0, maxLegs: 4,
    description: "Inverse du long put condor — profit si fort mouvement",
    legs: [
      { type: "Put", side: "Sell", strikeOffset: 50, premiumEstimate: 10, qty: 1 },
      { type: "Put", side: "Buy", strikeOffset: 25, premiumEstimate: 7, qty: 1 },
      { type: "Put", side: "Buy", strikeOffset: -25, premiumEstimate: 4, qty: 1 },
      { type: "Put", side: "Sell", strikeOffset: -50, premiumEstimate: 2, qty: 1 },
    ],
  },
  // LADDERS
  {
    id: "bull-call-ladder", name: "Bull Call Ladder", level: "Expert", category: "LADDERS",
    sentiment: "bullish", volBias: "short_vol", shares: 0, maxLegs: 3,
    description: "Achat 1 call ATM + vente 1 call OTM + vente 1 call OTM plus haut — profit modere",
    legs: [
      { type: "Call", side: "Buy", strikeOffset: 0, premiumEstimate: 12, qty: 1 },
      { type: "Call", side: "Sell", strikeOffset: 25, premiumEstimate: 7, qty: 1 },
      { type: "Call", side: "Sell", strikeOffset: 50, premiumEstimate: 4, qty: 1 },
    ],
  },
  {
    id: "bear-call-ladder", name: "Bear Call Ladder", level: "Expert", category: "LADDERS",
    sentiment: "bearish", volBias: "short_vol", shares: 0, maxLegs: 3,
    description: "Vente 1 call + achat 1 call + vente 1 call — echelle baissiere",
    legs: [
      { type: "Call", side: "Sell", strikeOffset: 0, premiumEstimate: 12, qty: 1 },
      { type: "Call", side: "Buy", strikeOffset: 25, premiumEstimate: 7, qty: 1 },
      { type: "Call", side: "Sell", strikeOffset: 50, premiumEstimate: 4, qty: 1 },
    ],
  },
  {
    id: "bull-put-ladder", name: "Bull Put Ladder", level: "Expert", category: "LADDERS",
    sentiment: "bullish", volBias: "short_vol", shares: 0, maxLegs: 3,
    description: "Vente 1 put + achat 1 put + vente 1 put — echelle haussiere en puts",
    legs: [
      { type: "Put", side: "Sell", strikeOffset: 0, premiumEstimate: 12, qty: 1 },
      { type: "Put", side: "Buy", strikeOffset: -25, premiumEstimate: 7, qty: 1 },
      { type: "Put", side: "Sell", strikeOffset: -50, premiumEstimate: 4, qty: 1 },
    ],
  },
  {
    id: "bear-put-ladder", name: "Bear Put Ladder", level: "Expert", category: "LADDERS",
    sentiment: "bearish", volBias: "short_vol", shares: 0, maxLegs: 3,
    description: "Achat 1 put ATM + vente 1 put + vente 1 put plus bas — echelle baissiere",
    legs: [
      { type: "Put", side: "Buy", strikeOffset: 0, premiumEstimate: 12, qty: 1 },
      { type: "Put", side: "Sell", strikeOffset: -25, premiumEstimate: 7, qty: 1 },
      { type: "Put", side: "Sell", strikeOffset: -50, premiumEstimate: 4, qty: 1 },
    ],
  },
  // OTHER
  {
    id: "jade-lizard", name: "Jade Lizard", level: "Expert", category: "OTHER",
    sentiment: "bullish", volBias: "short_vol", shares: 0, maxLegs: 3,
    description: "Vente put OTM + vente call OTM + achat call plus haut — pas de risque a la hausse",
    legs: [
      { type: "Put", side: "Sell", strikeOffset: -50, premiumEstimate: 6, qty: 1 },
      { type: "Call", side: "Sell", strikeOffset: 25, premiumEstimate: 5, qty: 1 },
      { type: "Call", side: "Buy", strikeOffset: 50, premiumEstimate: 2, qty: 1 },
    ],
  },
  {
    id: "reverse-jade-lizard", name: "Reverse Jade Lizard", level: "Expert", category: "OTHER",
    sentiment: "bearish", volBias: "short_vol", shares: 0, maxLegs: 3,
    description: "Vente call OTM + vente put OTM + achat put plus bas — pas de risque a la baisse",
    legs: [
      { type: "Call", side: "Sell", strikeOffset: 50, premiumEstimate: 6, qty: 1 },
      { type: "Put", side: "Sell", strikeOffset: -25, premiumEstimate: 5, qty: 1 },
      { type: "Put", side: "Buy", strikeOffset: -50, premiumEstimate: 2, qty: 1 },
    ],
  },
  // RATIO SPREADS
  {
    id: "call-ratio-spread", name: "Call Ratio Spread", level: "Expert", category: "RATIO SPREADS",
    sentiment: "neutral", volBias: "short_vol", shares: 0, maxLegs: 2,
    description: "Achat 1 call ATM + vente 2 calls OTM — profit dans un range, risque illimite a la hausse",
    legs: [
      { type: "Call", side: "Buy", strikeOffset: 0, premiumEstimate: 12, qty: 1 },
      { type: "Call", side: "Sell", strikeOffset: 50, premiumEstimate: 6, qty: 2 },
    ],
  },
  {
    id: "put-ratio-spread", name: "Put Ratio Spread", level: "Expert", category: "RATIO SPREADS",
    sentiment: "neutral", volBias: "short_vol", shares: 0, maxLegs: 2,
    description: "Achat 1 put ATM + vente 2 puts OTM — profit dans un range, risque a la baisse",
    legs: [
      { type: "Put", side: "Buy", strikeOffset: 0, premiumEstimate: 12, qty: 1 },
      { type: "Put", side: "Sell", strikeOffset: -50, premiumEstimate: 6, qty: 2 },
    ],
  },
  // SYNTHETIC
  {
    id: "long-synthetic", name: "Long Synthetic Future", level: "Expert", category: "SYNTHETIC",
    sentiment: "bullish", volBias: "neutral", shares: 0, maxLegs: 2,
    description: "Achat call + vente put meme strike — replique un long future synthetique",
    legs: [
      { type: "Call", side: "Buy", strikeOffset: 0, premiumEstimate: 15, qty: 1 },
      { type: "Put", side: "Sell", strikeOffset: 0, premiumEstimate: 15, qty: 1 },
    ],
  },
  {
    id: "short-synthetic", name: "Short Synthetic Future", level: "Expert", category: "SYNTHETIC",
    sentiment: "bearish", volBias: "neutral", shares: 0, maxLegs: 2,
    description: "Vente call + achat put meme strike — replique un short future synthetique",
    legs: [
      { type: "Call", side: "Sell", strikeOffset: 0, premiumEstimate: 15, qty: 1 },
      { type: "Put", side: "Buy", strikeOffset: 0, premiumEstimate: 15, qty: 1 },
    ],
  },
  {
    id: "synthetic-put", name: "Synthetic Put", level: "Expert", category: "SYNTHETIC",
    sentiment: "bearish", volBias: "long_vol", shares: -100, maxLegs: 1,
    description: "Short 100 actions + achat call ATM — replique un long put synthetique",
    legs: [{ type: "Call", side: "Buy", strikeOffset: 0, premiumEstimate: 15, qty: 1 }],
  },
  // ARBITRAGE
  {
    id: "long-combo", name: "Long Combo", level: "Expert", category: "ARBITRAGE",
    sentiment: "bullish", volBias: "neutral", shares: 0, maxLegs: 2,
    description: "Achat call OTM + vente put OTM — exposition longue synthetique a cout reduit",
    legs: [
      { type: "Call", side: "Buy", strikeOffset: 50, premiumEstimate: 6, qty: 1 },
      { type: "Put", side: "Sell", strikeOffset: -50, premiumEstimate: 6, qty: 1 },
    ],
  },
  {
    id: "short-combo", name: "Short Combo", level: "Expert", category: "ARBITRAGE",
    sentiment: "bearish", volBias: "neutral", shares: 0, maxLegs: 2,
    description: "Vente call OTM + achat put OTM — exposition courte synthetique",
    legs: [
      { type: "Call", side: "Sell", strikeOffset: 50, premiumEstimate: 6, qty: 1 },
      { type: "Put", side: "Buy", strikeOffset: -50, premiumEstimate: 6, qty: 1 },
    ],
  },
  // OTHER EXPERT
  {
    id: "strip", name: "Strip", level: "Expert", category: "OTHER",
    sentiment: "bearish", volBias: "long_vol", shares: 0, maxLegs: 2,
    description: "Achat 1 call + 2 puts ATM — comme un straddle mais biais baissier",
    legs: [
      { type: "Call", side: "Buy", strikeOffset: 0, premiumEstimate: 15, qty: 1 },
      { type: "Put", side: "Buy", strikeOffset: 0, premiumEstimate: 15, qty: 2 },
    ],
  },
  {
    id: "strap", name: "Strap", level: "Expert", category: "OTHER",
    sentiment: "bullish", volBias: "long_vol", shares: 0, maxLegs: 2,
    description: "Achat 2 calls + 1 put ATM — comme un straddle mais biais haussier",
    legs: [
      { type: "Call", side: "Buy", strikeOffset: 0, premiumEstimate: 15, qty: 2 },
      { type: "Put", side: "Buy", strikeOffset: 0, premiumEstimate: 15, qty: 1 },
    ],
  },
  {
    id: "long-guts", name: "Long Guts", level: "Expert", category: "OTHER",
    sentiment: "volatile", volBias: "long_vol", shares: 0, maxLegs: 2,
    description: "Achat call ITM + put ITM — plus cher que le strangle mais profit plus rapide",
    legs: [
      { type: "Call", side: "Buy", strikeOffset: -50, premiumEstimate: 55, qty: 1 },
      { type: "Put", side: "Buy", strikeOffset: 50, premiumEstimate: 55, qty: 1 },
    ],
  },
  {
    id: "short-guts", name: "Short Guts", level: "Expert", category: "OTHER",
    sentiment: "neutral", volBias: "short_vol", shares: 0, maxLegs: 2,
    description: "Vente call ITM + put ITM — plus de prime que le short strangle, risque illimite",
    legs: [
      { type: "Call", side: "Sell", strikeOffset: -50, premiumEstimate: 55, qty: 1 },
      { type: "Put", side: "Sell", strikeOffset: 50, premiumEstimate: 55, qty: 1 },
    ],
  },
  {
    id: "double-diagonal", name: "Double Diagonal", level: "Expert", category: "OTHER",
    sentiment: "neutral", volBias: "long_vol", shares: 0, maxLegs: 4,
    calendarNote: "P&L affiche uniquement les legs courts a expiration. Les legs longs conservent de la valeur temps.",
    description: "Diagonal call + diagonal put — profite du decay et de la vol sur deux expirations",
    legs: [
      { type: "Call", side: "Sell", strikeOffset: 25, premiumEstimate: 5, qty: 1 },
      { type: "Call", side: "Buy", strikeOffset: 50, premiumEstimate: 8, qty: 1 },
      { type: "Put", side: "Sell", strikeOffset: -25, premiumEstimate: 5, qty: 1 },
      { type: "Put", side: "Buy", strikeOffset: -50, premiumEstimate: 8, qty: 1 },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════
// ALL STRATEGIES
// ═══════════════════════════════════════════════════════════════
export const ALL_STRATEGIES: StrategyTemplate[] = [
  ...NOVICE,
  ...INTERMEDIATE,
  ...ADVANCED,
  ...EXPERT,
];

export const STRATEGIES_BY_LEVEL: Record<Level, StrategyTemplate[]> = {
  Novice: NOVICE,
  Intermediate: INTERMEDIATE,
  Advanced: ADVANCED,
  Expert: EXPERT,
};
