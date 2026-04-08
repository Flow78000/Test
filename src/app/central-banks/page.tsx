"use client";

import { useState, useEffect, useMemo } from "react";
import { PageHeader, Card, Badge, KpiCard } from "@/components/ui/card";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine,
} from "recharts";

const API = "http://localhost:3850";

// ---------------------------------------------------------------------------
// Types & Data
// ---------------------------------------------------------------------------

interface CentralBank {
  name: string;
  flag: string;
  code: string;
  rate: number;
  rateStr: string;
  lastDecisionDate: string;
  lastDecision: "hike" | "hold" | "cut";
  nextMeeting: string;
  stance: "hawkish" | "dovish" | "neutral";
  currency: string;
}

interface RateDecision {
  date: string;
  bank: string;
  decision: string;
  rate: number;
  rateStr: string;
  surprise: boolean;
}

const BANKS: CentralBank[] = [
  {
    name: "Federal Reserve", flag: "\uD83C\uDDFA\uD83C\uDDF8", code: "FED",
    rate: 5.25, rateStr: "5.25%",
    lastDecisionDate: "2026-03-19", lastDecision: "hold",
    nextMeeting: "2026-05-07", stance: "hawkish", currency: "USD",
  },
  {
    name: "Banque Centrale Europeenne", flag: "\uD83C\uDDEA\uD83C\uDDFA", code: "BCE",
    rate: 4.00, rateStr: "4.00%",
    lastDecisionDate: "2026-03-06", lastDecision: "hold",
    nextMeeting: "2026-04-17", stance: "neutral", currency: "EUR",
  },
  {
    name: "Bank of Japan", flag: "\uD83C\uDDEF\uD83C\uDDF5", code: "BOJ",
    rate: 0.25, rateStr: "0.25%",
    lastDecisionDate: "2026-03-14", lastDecision: "hold",
    nextMeeting: "2026-04-25", stance: "dovish", currency: "JPY",
  },
  {
    name: "Bank of Canada", flag: "\uD83C\uDDE8\uD83C\uDDE6", code: "BOC",
    rate: 4.50, rateStr: "4.50%",
    lastDecisionDate: "2026-03-12", lastDecision: "cut",
    nextMeeting: "2026-04-16", stance: "dovish", currency: "CAD",
  },
  {
    name: "Swiss National Bank", flag: "\uD83C\uDDE8\uD83C\uDDED", code: "SNB",
    rate: 1.50, rateStr: "1.50%",
    lastDecisionDate: "2026-03-20", lastDecision: "hold",
    nextMeeting: "2026-06-19", stance: "neutral", currency: "CHF",
  },
  {
    name: "Bank of England", flag: "\uD83C\uDDEC\uD83C\uDDE7", code: "BOE",
    rate: 4.50, rateStr: "4.50%",
    lastDecisionDate: "2026-03-20", lastDecision: "hold",
    nextMeeting: "2026-05-08", stance: "neutral", currency: "GBP",
  },
  {
    name: "Reserve Bank of Australia", flag: "\uD83C\uDDE6\uD83C\uDDFA", code: "RBA",
    rate: 4.10, rateStr: "4.10%",
    lastDecisionDate: "2026-02-18", lastDecision: "cut",
    nextMeeting: "2026-04-01", stance: "neutral", currency: "AUD",
  },
  {
    name: "People's Bank of China", flag: "\uD83C\uDDE8\uD83C\uDDF3", code: "PBOC",
    rate: 3.10, rateStr: "3.10%",
    lastDecisionDate: "2026-03-20", lastDecision: "hold",
    nextMeeting: "2026-04-21", stance: "dovish", currency: "CNY",
  },
];

// Extended rate history — 3+ decisions per bank for dot plot
const RATE_HISTORY: RateDecision[] = [
  // FED
  { date: "2026-03-19", bank: "FED", decision: "Hold", rate: 5.25, rateStr: "5.25%", surprise: false },
  { date: "2026-01-29", bank: "FED", decision: "Hold", rate: 5.25, rateStr: "5.25%", surprise: false },
  { date: "2025-12-18", bank: "FED", decision: "Cut -25bps", rate: 5.50, rateStr: "5.50%", surprise: false },
  { date: "2025-11-07", bank: "FED", decision: "Cut -25bps", rate: 5.75, rateStr: "5.75%", surprise: false },
  { date: "2025-09-18", bank: "FED", decision: "Cut -50bps", rate: 6.00, rateStr: "6.00%", surprise: true },
  // BCE
  { date: "2026-03-06", bank: "BCE", decision: "Hold", rate: 4.00, rateStr: "4.00%", surprise: false },
  { date: "2026-01-23", bank: "BCE", decision: "Cut -25bps", rate: 4.25, rateStr: "4.25%", surprise: true },
  { date: "2025-12-12", bank: "BCE", decision: "Hold", rate: 4.25, rateStr: "4.25%", surprise: false },
  { date: "2025-10-17", bank: "BCE", decision: "Cut -25bps", rate: 4.50, rateStr: "4.50%", surprise: false },
  { date: "2025-09-12", bank: "BCE", decision: "Cut -25bps", rate: 4.75, rateStr: "4.75%", surprise: false },
  // BOJ
  { date: "2026-03-14", bank: "BOJ", decision: "Hold", rate: 0.25, rateStr: "0.25%", surprise: false },
  { date: "2026-01-24", bank: "BOJ", decision: "Hike +25bps", rate: 0.25, rateStr: "0.25%", surprise: true },
  { date: "2025-12-19", bank: "BOJ", decision: "Hold", rate: 0.00, rateStr: "0.00%", surprise: false },
  { date: "2025-10-31", bank: "BOJ", decision: "Hold", rate: 0.00, rateStr: "0.00%", surprise: false },
  // BOC
  { date: "2026-03-12", bank: "BOC", decision: "Cut -25bps", rate: 4.50, rateStr: "4.50%", surprise: false },
  { date: "2026-01-22", bank: "BOC", decision: "Cut -25bps", rate: 4.75, rateStr: "4.75%", surprise: false },
  { date: "2025-12-11", bank: "BOC", decision: "Cut -50bps", rate: 5.00, rateStr: "5.00%", surprise: true },
  // SNB
  { date: "2026-03-20", bank: "SNB", decision: "Hold", rate: 1.50, rateStr: "1.50%", surprise: false },
  { date: "2025-12-11", bank: "SNB", decision: "Cut -25bps", rate: 1.50, rateStr: "1.50%", surprise: true },
  { date: "2025-09-26", bank: "SNB", decision: "Cut -25bps", rate: 1.75, rateStr: "1.75%", surprise: false },
  // BOE
  { date: "2026-03-20", bank: "BOE", decision: "Hold", rate: 4.50, rateStr: "4.50%", surprise: false },
  { date: "2026-02-06", bank: "BOE", decision: "Cut -25bps", rate: 4.75, rateStr: "4.75%", surprise: false },
  { date: "2025-12-19", bank: "BOE", decision: "Hold", rate: 4.75, rateStr: "4.75%", surprise: false },
  // RBA
  { date: "2026-02-18", bank: "RBA", decision: "Cut -25bps", rate: 4.10, rateStr: "4.10%", surprise: false },
  { date: "2025-12-10", bank: "RBA", decision: "Hold", rate: 4.35, rateStr: "4.35%", surprise: false },
  { date: "2025-11-05", bank: "RBA", decision: "Hold", rate: 4.35, rateStr: "4.35%", surprise: false },
  // PBOC
  { date: "2026-03-20", bank: "PBOC", decision: "Hold", rate: 3.10, rateStr: "3.10%", surprise: false },
  { date: "2026-02-20", bank: "PBOC", decision: "Cut -10bps", rate: 3.10, rateStr: "3.10%", surprise: false },
  { date: "2025-10-21", bank: "PBOC", decision: "Cut -25bps", rate: 3.20, rateStr: "3.20%", surprise: true },
  { date: "2025-07-22", bank: "PBOC", decision: "Cut -10bps", rate: 3.45, rateStr: "3.45%", surprise: false },
];

const DECISION_COLORS: Record<string, string> = { hike: "#EF4444", hold: "#FFA726", cut: "#22C55E" };
const STANCE_COLORS: Record<string, string> = { hawkish: "#EF4444", neutral: "#FFA726", dovish: "#22C55E" };

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr + "T00:00:00");
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function countdownColor(days: number): string {
  if (days <= 3) return "#EF4444";
  if (days <= 7) return "#FFA726";
  if (days <= 14) return "#FFD600";
  return "#6B6B75";
}

/* ── Mini Rate History Chart (dot plot) ── */
function RateHistoryChart({ bankCode }: { bankCode: string }) {
  const history = RATE_HISTORY
    .filter(r => r.bank === bankCode)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (history.length < 2) return null;

  const data = history.map(h => ({
    date: h.date.slice(5), // MM-DD
    rate: h.rate,
    decision: h.decision,
  }));

  const rates = data.map(d => d.rate);
  const minRate = Math.min(...rates);
  const maxRate = Math.max(...rates);
  const padding = Math.max(0.1, (maxRate - minRate) * 0.2);

  return (
    <div className="mt-3 pt-3 border-t border-[#1E1E22]">
      <div className="text-[9px] text-[#6B6B75] uppercase tracking-widest mb-1">Evolution taux — {history.length} decisions</div>
      <ResponsiveContainer width="100%" height={80}>
        <LineChart data={data} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1E" />
          <XAxis dataKey="date" tick={{ fill: "#555", fontSize: 8 }} />
          <YAxis domain={[minRate - padding, maxRate + padding]} tick={{ fill: "#555", fontSize: 8 }} tickFormatter={(v: number) => `${v.toFixed(2)}%`} />
          <Tooltip
            contentStyle={{ backgroundColor: "#1A1A1E", border: "1px solid #2A2A2E", borderRadius: 6, fontSize: 10 }}
            formatter={(v: any) => [`${Number(v).toFixed(2)}%`, "Taux"]}
          />
          <Line dataKey="rate" stroke="#FF6B00" strokeWidth={2} dot={{ r: 4, fill: "#FF6B00", stroke: "#08080A", strokeWidth: 2 }} />
        </LineChart>
      </ResponsiveContainer>
      {/* Decision labels */}
      <div className="flex justify-between mt-1 px-1">
        {data.map((d, i) => {
          const color = d.decision.toLowerCase().includes("cut") ? "#22C55E"
            : d.decision.toLowerCase().includes("hike") ? "#EF4444" : "#FFA726";
          return (
            <span key={i} className="text-[7px] font-bold" style={{ color }}>
              {d.decision.replace("Hold", "H").replace("Cut ", "").replace("Hike ", "+")}
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function CentralBanksPage() {
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [loadingCal, setLoadingCal] = useState(true);

  useEffect(() => {
    async function fetchCalendar() {
      setLoadingCal(true);
      try {
        const resp = await fetch(`${API}/api/uw/economic-calendar`);
        const json = await resp.json();
        const events = json?.data || json || [];
        // Filter for central bank / fed / fomc / boe / boj / ecb events
        const cbEvents = events.filter((e: any) => {
          const title = (e.title || e.event || e.name || "").toLowerCase();
          return (
            title.includes("fed") || title.includes("fomc") || title.includes("powell") ||
            title.includes("waller") || title.includes("williams") || title.includes("bowman") ||
            title.includes("barr") || title.includes("jefferson") || title.includes("cook") ||
            title.includes("kugler") || title.includes("logan") || title.includes("bostic") ||
            title.includes("daly") || title.includes("goolsbee") || title.includes("harker") ||
            title.includes("kashkari") || title.includes("collins") ||
            title.includes("ecb") || title.includes("lagarde") || title.includes("bce") ||
            title.includes("boj") || title.includes("ueda") || title.includes("kuroda") ||
            title.includes("boe") || title.includes("bailey") ||
            title.includes("rba") || title.includes("bullock") ||
            title.includes("boc") || title.includes("macklem") ||
            title.includes("snb") || title.includes("jordan") ||
            title.includes("central bank") || title.includes("rate decision") ||
            title.includes("monetary policy") || title.includes("minutes")
          );
        });
        setCalendarEvents(cbEvents.slice(0, 20));
      } catch {
        setCalendarEvents([]);
      }
      setLoadingCal(false);
    }
    fetchCalendar();
  }, []);

  // Next meeting countdown — find the closest
  const nextMeetings = BANKS.map(b => ({ ...b, daysLeft: daysUntil(b.nextMeeting) })).sort((a, b) => a.daysLeft - b.daysLeft);
  const closestMeeting = nextMeetings[0];

  return (
    <div className="p-6 min-h-screen bg-[#08080A] text-[#E0E0E5]">
      <PageHeader
        title="Banques Centrales — Politique Monetaire"
        subtitle="Fed, BCE, BOJ, BOC, SNB, BOE, RBA — Taux, dot plot et calendrier"
      />

      {/* Top KPIs — Next meetings countdown */}
      <div className="grid grid-cols-4 md:grid-cols-8 gap-3 mb-4">
        {BANKS.map(b => {
          const days = daysUntil(b.nextMeeting);
          const isPast = days < 0;
          return (
            <KpiCard key={b.code} label={`${b.flag} ${b.code}`}
              value={isPast ? "Passe" : days === 0 ? "AUJOURD'HUI" : `${days}j`}
              color={isPast ? "#6B6B75" : countdownColor(days)}
              sublabel={b.nextMeeting.slice(5)}
            />
          );
        })}
      </div>

      {/* Central Bank Cards — with dot plot */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
        {BANKS.map((bank) => {
          const days = daysUntil(bank.nextMeeting);
          const isPast = days < 0;
          return (
            <Card key={bank.code} className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">{bank.flag}</span>
                <div>
                  <div className="text-sm font-bold text-[#E0E0E5]">{bank.code}</div>
                  <div className="text-[10px] text-[#6B6B75]">{bank.name}</div>
                </div>
                <div className="ml-auto text-right">
                  <div className="text-[10px] text-[#6B6B75]">Prochaine</div>
                  <div className="text-xs font-bold font-mono" style={{ color: isPast ? "#6B6B75" : countdownColor(days) }}>
                    {isPast ? "Passee" : days === 0 ? "AUJOURD'HUI" : `J-${days}`}
                  </div>
                  <div className="text-[9px] text-[#555]">{bank.nextMeeting}</div>
                </div>
              </div>

              {/* Current Rate */}
              <div className="text-center mb-3">
                <div className="text-3xl font-extrabold font-mono text-[#FF6B00]">{bank.rateStr}</div>
                <div className="text-[10px] text-[#6B6B75] uppercase tracking-widest mt-1">Taux directeur</div>
              </div>

              {/* Last Decision + Stance */}
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-[#6B6B75]">Derniere decision</span>
                <Badge color={DECISION_COLORS[bank.lastDecision]}>{bank.lastDecision.toUpperCase()}</Badge>
              </div>
              <div className="text-[10px] text-[#6B6B75] mb-2">{bank.lastDecisionDate}</div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-[#6B6B75]">Orientation</span>
                <Badge color={STANCE_COLORS[bank.stance]}>{bank.stance.toUpperCase()}</Badge>
              </div>

              {/* Dot Plot — Rate History Mini Chart */}
              <RateHistoryChart bankCode={bank.code} />
            </Card>
          );
        })}
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
            <div className="text-lg font-extrabold font-mono text-[#FFD54F]">XAU = -Taux Reels</div>
            <div className="text-[10px] text-[#6B6B75] mt-1">Taux reels hauts = pression sur l'or</div>
          </div>
        </div>
        <div className="bg-[#FF6B0008] border border-[#FF6B0022] rounded-lg p-3 text-xs text-[#6B6B75] leading-relaxed">
          <span className="font-bold text-[#FF6B00]">Lecture :</span> Taux reel = Taux nominal - Inflation anticipee (TIPS). Quand les taux reels montent, le cout d'opportunite de detenir de l'or (sans rendement) augmente. Quand les taux reels baissent, l'or devient attractif.
        </div>
      </Card>

      {/* Calendar — Central Bank Events */}
      <Card className="p-5 mb-6">
        <h3 className="text-xs text-[#6B6B75] uppercase tracking-widest mb-4">Evenements Banques Centrales a Venir</h3>

        {/* Fixed upcoming meetings from BANKS data */}
        <div className="mb-4">
          <div className="text-[10px] text-[#FF6B00] font-bold uppercase mb-2">Reunions programmees</div>
          <div className="space-y-1">
            {nextMeetings.filter(b => b.daysLeft >= 0).map(b => (
              <div key={b.code} className="flex items-center gap-3 py-1.5 px-2 rounded hover:bg-[#16161A] transition-colors">
                <span className="text-lg">{b.flag}</span>
                <span className="font-mono text-xs font-bold text-[#FF6B00] w-20">{b.nextMeeting}</span>
                <span className="text-xs text-[#E0E0E5] font-semibold">{b.code} — {b.name}</span>
                <span className="ml-auto text-xs font-bold font-mono" style={{ color: countdownColor(b.daysLeft) }}>
                  J-{b.daysLeft}
                </span>
                <Badge color={STANCE_COLORS[b.stance]}>{b.stance}</Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Economic calendar events */}
        <div className="text-[10px] text-[#6B6B75] font-bold uppercase mb-2">Calendrier economique (Fed Speakers, Minutes, etc.)</div>
        {loadingCal ? (
          <div className="text-center py-8 text-[#6B6B75] text-sm">Chargement du calendrier...</div>
        ) : calendarEvents.length === 0 ? (
          <div className="text-center py-6 text-[#6B6B75] text-sm">Aucun evenement banque centrale trouve dans le calendrier</div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[#6B6B75] uppercase tracking-wider text-[10px] border-b border-[#1E1E22]">
                <th className="py-2 text-left px-3 w-28">Date</th>
                <th className="py-2 text-left px-3 w-16">Heure</th>
                <th className="py-2 text-left px-3">Evenement</th>
                <th className="py-2 text-left px-3 w-20">Impact</th>
              </tr>
            </thead>
            <tbody>
              {calendarEvents.map((s: any, i: number) => {
                const dateStr = s.date || s.datetime || s.release_date || "";
                const timeStr = s.time || (s.datetime ? s.datetime.slice(11, 16) : "") || "";
                const title = s.title || s.event || s.name || "";
                const impact = (s.impact || s.importance || "low").toLowerCase();
                return (
                  <tr key={i} className="border-t border-[#1E1E22] hover:bg-[#16161A] transition-colors">
                    <td className="py-2 px-3 font-mono text-[#A0A0A8]">
                      {dateStr ? dateStr.slice(0, 10) : <span className="text-[#555]">—</span>}
                    </td>
                    <td className="py-2 px-3 font-mono text-[#6B6B75]">
                      {timeStr || "—"}
                    </td>
                    <td className="py-2 px-3 text-[#E0E0E5]">{title || "—"}</td>
                    <td className="py-2 px-3">
                      <Badge color={impact === "high" ? "#EF4444" : impact === "medium" ? "#FFA726" : "#6B6B75"}>
                        {impact.toUpperCase()}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      {/* Rate Decision History — Full Table */}
      <Card className="p-5">
        <h3 className="text-xs text-[#6B6B75] uppercase tracking-widest mb-4">Historique Complet des Decisions de Taux</h3>
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
            {RATE_HISTORY.sort((a, b) => b.date.localeCompare(a.date)).map((r, i) => (
              <tr key={i} className="border-t border-[#1E1E22] hover:bg-[#16161A] transition-colors">
                <td className="py-2 px-3 text-[#A0A0A8] font-mono">{r.date}</td>
                <td className="py-2 px-3 text-[#E0E0E5] font-semibold">
                  {BANKS.find(b => b.code === r.bank)?.flag} {r.bank}
                </td>
                <td className="py-2 px-3">
                  <Badge color={
                    r.decision.toLowerCase().includes("cut") ? "#22C55E" :
                    r.decision.toLowerCase().includes("hike") ? "#EF4444" : "#FFA726"
                  }>
                    {r.decision}
                  </Badge>
                </td>
                <td className="py-2 px-3 text-[#FF6B00] font-mono font-semibold">{r.rateStr}</td>
                <td className="py-2 px-3">
                  {r.surprise ? <span className="text-[#EF4444] font-bold">OUI</span> : <span className="text-[#6B6B75]">Non</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
