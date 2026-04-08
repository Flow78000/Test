"use client";

import { useState, useEffect } from "react";
import { PageHeader, Card, Badge } from "@/components/ui/card";

// ---------------------------------------------------------------------------
// Types & Data
// ---------------------------------------------------------------------------

interface CentralBank {
  name: string;
  flag: string;
  code: string;
  rate: string;
  lastDecisionDate: string;
  lastDecision: "hike" | "hold" | "cut";
  nextMeeting: string;
  stance: "hawkish" | "dovish" | "neutral";
}

interface RateDecision {
  date: string;
  bank: string;
  decision: string;
  rate: string;
  surprise: boolean;
}

const BANKS: CentralBank[] = [
  {
    name: "Federal Reserve",
    flag: "\uD83C\uDDFA\uD83C\uDDF8",
    code: "FED",
    rate: "5.25%",
    lastDecisionDate: "2026-03-19",
    lastDecision: "hold",
    nextMeeting: "2026-05-07",
    stance: "hawkish",
  },
  {
    name: "Banque Centrale Europeenne",
    flag: "\uD83C\uDDEA\uD83C\uDDFA",
    code: "BCE",
    rate: "4.00%",
    lastDecisionDate: "2026-03-06",
    lastDecision: "hold",
    nextMeeting: "2026-04-17",
    stance: "neutral",
  },
  {
    name: "Bank of Japan",
    flag: "\uD83C\uDDEF\uD83C\uDDF5",
    code: "BOJ",
    rate: "0.25%",
    lastDecisionDate: "2026-03-14",
    lastDecision: "hold",
    nextMeeting: "2026-04-25",
    stance: "dovish",
  },
  {
    name: "Bank of Canada",
    flag: "\uD83C\uDDE8\uD83C\uDDE6",
    code: "BOC",
    rate: "4.50%",
    lastDecisionDate: "2026-03-12",
    lastDecision: "cut",
    nextMeeting: "2026-04-16",
    stance: "dovish",
  },
  {
    name: "Swiss National Bank",
    flag: "\uD83C\uDDE8\uD83C\uDDED",
    code: "SNB",
    rate: "1.50%",
    lastDecisionDate: "2026-03-20",
    lastDecision: "hold",
    nextMeeting: "2026-06-19",
    stance: "neutral",
  },
];

const RATE_HISTORY: RateDecision[] = [
  { date: "2026-03-20", bank: "SNB", decision: "Hold", rate: "1.50%", surprise: false },
  { date: "2026-03-19", bank: "FED", decision: "Hold", rate: "5.25%", surprise: false },
  { date: "2026-03-14", bank: "BOJ", decision: "Hold", rate: "0.25%", surprise: false },
  { date: "2026-03-12", bank: "BOC", decision: "Cut -25bps", rate: "4.50%", surprise: false },
  { date: "2026-03-06", bank: "BCE", decision: "Hold", rate: "4.00%", surprise: false },
  { date: "2026-01-29", bank: "FED", decision: "Hold", rate: "5.25%", surprise: false },
  { date: "2026-01-23", bank: "BCE", decision: "Cut -25bps", rate: "4.00%", surprise: true },
  { date: "2025-12-18", bank: "FED", decision: "Cut -25bps", rate: "5.25%", surprise: false },
  { date: "2025-12-12", bank: "BCE", decision: "Hold", rate: "4.25%", surprise: false },
  { date: "2025-12-11", bank: "SNB", decision: "Cut -25bps", rate: "1.50%", surprise: true },
];

const DECISION_COLORS: Record<string, string> = {
  hike: "#EF4444",
  hold: "#FFA726",
  cut: "#22C55E",
};

const STANCE_COLORS: Record<string, string> = {
  hawkish: "#EF4444",
  neutral: "#FFA726",
  dovish: "#22C55E",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CentralBanksPage() {
  const [speakers, setSpeakers] = useState<any[]>([]);
  const [loadingSpeakers, setLoadingSpeakers] = useState(true);

  useEffect(() => {
    async function fetchSpeakers() {
      setLoadingSpeakers(true);
      try {
        const resp = await fetch("http://localhost:3850/api/uw/economic-calendar");
        const json = await resp.json();
        const events = json?.data || json || [];
        // Filter for Fed speaker events
        const fedSpeakers = events.filter((e: any) => {
          const title = (e.title || e.event || e.name || "").toLowerCase();
          return (
            title.includes("fed") ||
            title.includes("fomc") ||
            title.includes("powell") ||
            title.includes("waller") ||
            title.includes("williams") ||
            title.includes("bowman") ||
            title.includes("barr") ||
            title.includes("jefferson") ||
            title.includes("cook") ||
            title.includes("kugler") ||
            title.includes("logan") ||
            title.includes("mester") ||
            title.includes("bostic") ||
            title.includes("daly") ||
            title.includes("goolsbee") ||
            title.includes("harker") ||
            title.includes("kashkari") ||
            title.includes("collins")
          );
        });
        setSpeakers(fedSpeakers.slice(0, 15));
      } catch {
        setSpeakers([]);
      }
      setLoadingSpeakers(false);
    }
    fetchSpeakers();
  }, []);

  return (
    <div className="p-6 min-h-screen bg-[#08080A] text-[#E0E0E5]">
      <PageHeader
        title="Banques Centrales — Politique Monetaire"
        subtitle="Fed, BCE, BOJ, BOC, SNB"
      />

      {/* Central Bank Cards */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        {BANKS.map((bank) => (
          <Card key={bank.code} className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">{bank.flag}</span>
              <div>
                <div className="text-sm font-bold text-[#E0E0E5]">{bank.code}</div>
                <div className="text-[10px] text-[#6B6B75]">{bank.name}</div>
              </div>
            </div>

            {/* Current Rate */}
            <div className="text-center mb-3">
              <div className="text-3xl font-extrabold font-mono text-[#FF6B00]">{bank.rate}</div>
              <div className="text-[10px] text-[#6B6B75] uppercase tracking-widest mt-1">Taux directeur</div>
            </div>

            {/* Last Decision */}
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-[#6B6B75]">Derniere decision</span>
              <Badge color={DECISION_COLORS[bank.lastDecision]}>
                {bank.lastDecision.toUpperCase()}
              </Badge>
            </div>
            <div className="text-[10px] text-[#6B6B75] mb-3">{bank.lastDecisionDate}</div>

            {/* Next Meeting */}
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-[#6B6B75]">Prochaine reunion</span>
              <span className="text-[#E0E0E5] font-semibold">{bank.nextMeeting}</span>
            </div>

            {/* Stance */}
            <div className="flex items-center justify-between text-xs mt-3 pt-3 border-t border-[#1E1E22]">
              <span className="text-[#6B6B75]">Dot Plot</span>
              <Badge color={STANCE_COLORS[bank.stance]}>
                {bank.stance.toUpperCase()}
              </Badge>
            </div>
          </Card>
        ))}
      </div>

      {/* Real Rates & TIPS */}
      <Card className="p-5 mb-6">
        <h3 className="text-xs text-[#6B6B75] uppercase tracking-widest mb-4">Taux Reels & TIPS — Impact sur les Actifs</h3>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="bg-[#0A0A0E] rounded-lg p-4 text-center">
            <div className="text-[10px] text-[#6B6B75] uppercase mb-1">Taux Reel US 10Y</div>
            <div className="text-xl font-extrabold font-mono text-[#FFA726]">+2.15%</div>
            <div className="text-[10px] text-[#6B6B75] mt-1">Nominal 4.35% - Breakeven 2.20%</div>
          </div>
          <div className="bg-[#0A0A0E] rounded-lg p-4 text-center">
            <div className="text-[10px] text-[#6B6B75] uppercase mb-1">Breakeven Inflation 10Y</div>
            <div className="text-xl font-extrabold font-mono text-[#42A5F5]">2.20%</div>
            <div className="text-[10px] text-[#6B6B75] mt-1">Anticipation inflation marche</div>
          </div>
          <div className="bg-[#0A0A0E] rounded-lg p-4 text-center">
            <div className="text-[10px] text-[#6B6B75] uppercase mb-1">Impact Gold</div>
            <div className="text-xl font-extrabold font-mono text-[#FFD54F]">Or ∝ −Taux Reels</div>
            <div className="text-[10px] text-[#6B6B75] mt-1">Taux reels hauts = pression sur l'or</div>
          </div>
        </div>
        <div className="bg-[#FF6B0008] border border-[#FF6B0022] rounded-lg p-3 text-xs text-[#6B6B75] leading-relaxed">
          <span className="font-bold text-[#FF6B00]">Lecture :</span> Taux reel = Taux nominal - Inflation anticipee (TIPS). Quand les taux reels montent, le cout d'opportunite de detenir de l'or (sans rendement) augmente → pression baissiere sur XAU. Quand les taux reels baissent → or attractif.
        </div>
      </Card>

      {/* Fed Speakers Table */}
      <Card className="p-5 mb-6">
        <h3 className="text-xs text-[#6B6B75] uppercase tracking-widest mb-4">Fed Speakers — Evenements a venir</h3>
        {loadingSpeakers ? (
          <div className="text-center py-8 text-[#6B6B75] text-sm">Chargement du calendrier...</div>
        ) : speakers.length === 0 ? (
          <div className="text-center py-8 text-[#6B6B75] text-sm">Aucun evenement Fed Speaker trouve</div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[#6B6B75] uppercase tracking-wider text-[10px] border-b border-[#1E1E22]">
                <th className="py-2 text-left px-3">Date</th>
                <th className="py-2 text-left px-3">Speaker / Evenement</th>
                <th className="py-2 text-left px-3">Impact attendu</th>
              </tr>
            </thead>
            <tbody>
              {speakers.map((s: any, i: number) => (
                <tr key={i} className="border-t border-[#1E1E22] hover:bg-[#16161A] transition-colors">
                  <td className="py-2 px-3 text-[#A0A0A8] font-mono">{s.date || s.datetime || "—"}</td>
                  <td className="py-2 px-3 text-[#E0E0E5]">{s.title || s.event || s.name || "—"}</td>
                  <td className="py-2 px-3">
                    <Badge color={
                      (s.impact || "").toLowerCase() === "high" ? "#EF4444" :
                      (s.impact || "").toLowerCase() === "medium" ? "#FFA726" : "#6B6B75"
                    }>
                      {s.impact || "LOW"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* Rate Decision History */}
      <Card className="p-5">
        <h3 className="text-xs text-[#6B6B75] uppercase tracking-widest mb-4">Historique des Decisions de Taux</h3>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-[#6B6B75] uppercase tracking-wider text-[10px] border-b border-[#1E1E22]">
              <th className="py-2 text-left px-3">Date</th>
              <th className="py-2 text-left px-3">Banque</th>
              <th className="py-2 text-left px-3">Decision</th>
              <th className="py-2 text-left px-3">Taux</th>
              <th className="py-2 text-left px-3">Surprise</th>
            </tr>
          </thead>
          <tbody>
            {RATE_HISTORY.map((r, i) => (
              <tr key={i} className="border-t border-[#1E1E22] hover:bg-[#16161A] transition-colors">
                <td className="py-2 px-3 text-[#A0A0A8] font-mono">{r.date}</td>
                <td className="py-2 px-3 text-[#E0E0E5] font-semibold">{r.bank}</td>
                <td className="py-2 px-3">
                  <Badge color={
                    r.decision.toLowerCase().includes("cut") ? "#22C55E" :
                    r.decision.toLowerCase().includes("hike") ? "#EF4444" : "#FFA726"
                  }>
                    {r.decision}
                  </Badge>
                </td>
                <td className="py-2 px-3 text-[#FF6B00] font-mono font-semibold">{r.rate}</td>
                <td className="py-2 px-3">
                  {r.surprise ? (
                    <span className="text-[#EF4444] font-bold">OUI</span>
                  ) : (
                    <span className="text-[#6B6B75]">Non</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
