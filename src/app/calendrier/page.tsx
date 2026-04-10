"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { PageHeader, LiveBadge, Card, Badge } from "@/components/ui/card";
import { RefreshTimer } from "@/components/ui/refresh-timer";

const API = "http://localhost:3850";
const JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"];

const CRITIQUE_KW = ["CPI", "NFP", "FOMC", "Nonfarm", "Consumer Price", "Fed Rate", "PCE"];
const HIGH_KW = ["ISM", "JOLTS", "Retail Sales", "PPI", "Initial Claims", "GDP", "Durable Goods", "ADP", "Jobless"];
const FED_NAMES = ["Powell", "Waller", "Williams", "Barkin", "Bostic", "Daly", "Kashkari", "Bowman", "Jefferson", "Cook", "Kugler", "Goolsbee", "Mester", "Logan", "Harker"];

function impactOf(name: string, raw?: string): { label: string; color: string; level: number } {
  const n = (name || "").toUpperCase();
  if (CRITIQUE_KW.some(k => n.includes(k.toUpperCase()))) return { label: "CRITIQUE", color: "#EF4444", level: 3 };
  if (raw && ["critique"].includes((raw || "").toLowerCase())) return { label: "CRITIQUE", color: "#EF4444", level: 3 };
  if (HIGH_KW.some(k => n.includes(k.toUpperCase()))) return { label: "HAUT", color: "#FFB300", level: 2 };
  if (raw && ["high", "haut"].includes((raw || "").toLowerCase())) return { label: "HAUT", color: "#FFB300", level: 2 };
  return { label: "MOYEN", color: "#42A5F5", level: 1 };
}

function isFedSpeaker(name: string): boolean {
  return FED_NAMES.some(k => name.includes(k)) || /\bFOMC\b/.test(name) || /\bFed\b/.test(name);
}

function isCriticalFull(name: string): "cpi-nfp" | "fomc" | null {
  const n = (name || "").toUpperCase();
  if (n.includes("CPI") || n.includes("NFP") || n.includes("NONFARM")) return "cpi-nfp";
  if (n.includes("FOMC")) return "fomc";
  return null;
}

function weekStart(offset: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay() + 1 + offset * 7);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isoDate(d: Date): string { return d.toISOString().slice(0, 10); }

function todayIso(): string { return isoDate(new Date()); }

function fmtTime(iso: string, tz: string): string {
  try {
    return new Date(iso).toLocaleTimeString("fr-FR", {
      hour: "2-digit", minute: "2-digit",
      timeZone: tz === "CET" ? "Europe/Paris" : "America/New_York",
    });
  } catch { return "--"; }
}

function fmtDayHeader(iso: string): string {
  try {
    return new Date(iso + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  } catch { return iso.slice(5); }
}

export default function CalendrierPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [weekOffset, setWeekOffset] = useState(0);
  const [tz, setTz] = useState("ET");

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await fetch(`${API}/api/uw/economic-calendar`).then(r => r.json());
      setEvents(Array.isArray(res) ? res : res?.data ?? []);
    } catch (e: any) { setError(e.message || "Serveur indisponible"); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const ws = weekStart(weekOffset);
  const weekDates = useMemo(() => Array.from({ length: 5 }, (_, i) => {
    const d = new Date(ws); d.setDate(d.getDate() + i); return isoDate(d);
  }), [ws.getTime()]);

  const today = todayIso();

  const byDay = useMemo(() => {
    return weekDates.map(date =>
      events
        .filter((ev: any) => (ev.time || ev.date || ev.datetime || "").slice(0, 10) === date)
        .sort((a: any, b: any) => {
          const ta = new Date(a.time || a.date || a.datetime || 0).getTime();
          const tb = new Date(b.time || b.date || b.datetime || 0).getTime();
          return ta - tb;
        })
    );
  }, [events, weekDates]);

  const weekLabel = `${weekDates[0]} au ${weekDates[4]}`;

  return (
    <div className="p-6 space-y-4">
      <PageHeader timer={<RefreshTimer intervalSeconds={10} />} title="Calendrier Economique" subtitle="Evenements macro, FOMC, NFP, CPI et publications cles">
        {/* Week nav */}
        <div className="flex bg-[#111114] border border-[#1E1E22] rounded-lg overflow-hidden">
          <button onClick={() => setWeekOffset(w => w - 1)} className="px-3 py-1.5 text-xs text-[#6B6B75] hover:text-white transition-colors">
            ← Sem. Prec.
          </button>
          <button onClick={() => setWeekOffset(0)} className="px-3 py-1.5 text-xs font-semibold text-[#FF6B00] border-x border-[#1E1E22]">
            Cette Semaine
          </button>
          <button onClick={() => setWeekOffset(w => w + 1)} className="px-3 py-1.5 text-xs text-[#6B6B75] hover:text-white transition-colors">
            Sem. Suiv. →
          </button>
        </div>
        {/* Timezone toggle */}
        <div className="flex bg-[#111114] border border-[#1E1E22] rounded-lg overflow-hidden">
          {["ET", "CET"].map(t => (
            <button key={t} onClick={() => setTz(t)}
              className={`px-3 py-1.5 text-xs font-semibold transition-colors ${tz === t ? "bg-[#FF6B00] text-black" : "text-[#6B6B75] hover:text-white"}`}>
              {t}
            </button>
          ))}
        </div>
        <button onClick={load} className="px-3 py-1.5 bg-[#111114] border border-[#1E1E22] rounded-lg text-xs hover:border-[#FF6B00] transition-colors">
          Rafraichir
        </button>
        <LiveBadge />
      </PageHeader>

      {loading && !events.length ? (
        <div className="text-center py-20 text-[#6B6B75]">Chargement...</div>
      ) : error && !events.length ? (
        <Card className="p-8 text-center text-red-400">{error}</Card>
      ) : (
        <>
      <div className="text-xs text-[#6B6B75] -mt-2">{weekLabel}</div>

      {/* ── 5-column grid ── */}
      <div className="grid grid-cols-5 gap-3">
        {weekDates.map((date, di) => {
          const isCurrentDay = date === today;
          return (
            <div key={date} className={`rounded-xl ${isCurrentDay ? "ring-1 ring-[#FF6B00]/50" : ""}`}>
              {/* Day header */}
              <div className={`text-center py-2 rounded-t-xl ${isCurrentDay ? "bg-[#FF6B00]/10" : "bg-[#111114]"} border border-b-0 ${isCurrentDay ? "border-[#FF6B00]/30" : "border-[#1E1E22]"}`}>
                <div className={`text-xs font-bold uppercase tracking-wider ${isCurrentDay ? "text-[#FF6B00]" : "text-[#6B6B75]"}`}>
                  {JOURS[di]}
                </div>
                <div className={`text-[10px] mt-0.5 ${isCurrentDay ? "text-[#FF6B00]/70" : "text-[#6B6B75]/70"}`}>
                  {fmtDayHeader(date)}
                </div>
              </div>

              {/* Events column */}
              <div className={`border border-t-0 rounded-b-xl p-2 space-y-2 min-h-[120px] ${isCurrentDay ? "border-[#FF6B00]/30 bg-[#0D0D0F]" : "border-[#1E1E22] bg-[#0A0A0A]"}`}>
                {byDay[di].length === 0 ? (
                  <div className="text-center text-[10px] text-[#6B6B75]/50 py-6">Aucun evenement</div>
                ) : byDay[di].map((ev: any, i: number) => {
                  const name = ev.event || ev.name || "";
                  const imp = impactOf(name, ev.impact);
                  const fed = isFedSpeaker(name);
                  const critical = isCriticalFull(name);

                  // Critical full-width events
                  if (critical) {
                    const bg = critical === "fomc" ? "bg-[#7C3AED]/10 border-[#7C3AED]/30" : "bg-[#EF4444]/10 border-[#EF4444]/30";
                    const textCol = critical === "fomc" ? "text-[#7C3AED]" : "text-[#EF4444]";
                    return (
                      <div key={i} className={`rounded-lg border p-2.5 ${bg}`}>
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-[10px] text-[#6B6B75] font-mono">{fmtTime(ev.time || ev.date || ev.datetime || "", tz)}</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase animate-pulse"
                            style={{ background: `${imp.color}22`, color: imp.color }}>
                            {imp.label}
                          </span>
                        </div>
                        <div className={`text-xs font-semibold leading-snug ${textCol}`}>{name}</div>
                        <div className="flex items-center gap-2 mt-1.5 text-[10px]">
                          {(ev.prev || ev.previous) != null && <span className="text-[#6B6B75]">Prev <span className="text-white">{ev.prev || ev.previous}</span></span>}
                          {ev.forecast != null && <span className="text-[#6B6B75]">Est <span className="text-[#FFB300]">{ev.forecast}</span></span>}
                          {ev.actual != null && <span className="text-[#6B6B75]">Reel <span className="text-white font-bold">{ev.actual}</span></span>}
                        </div>
                      </div>
                    );
                  }

                  // Fed speaker
                  if (fed) {
                    return (
                      <div key={i} className="rounded-lg border border-[#AB47BC]/30 bg-[#AB47BC]/5 p-2.5">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-[10px] text-[#6B6B75] font-mono">{fmtTime(ev.time || ev.date || ev.datetime || "", tz)}</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-[#AB47BC]/20 text-[#AB47BC]">FED</span>
                        </div>
                        <div className="text-xs leading-snug text-[#AB47BC]">{name}</div>
                        <div className="flex items-center gap-2 mt-1.5 text-[10px]">
                          {(ev.prev || ev.previous) != null && <span className="text-[#6B6B75]">Prev <span className="text-white">{ev.prev || ev.previous}</span></span>}
                          {ev.forecast != null && <span className="text-[#6B6B75]">Est <span className="text-[#FFB300]">{ev.forecast}</span></span>}
                          {ev.actual != null && <span className="text-[#6B6B75]">Reel <span className="text-white font-bold">{ev.actual}</span></span>}
                        </div>
                      </div>
                    );
                  }

                  // Standard event
                  return (
                    <div key={i} className="rounded-lg border border-[#1E1E22] bg-[#111114] p-2.5 hover:border-[#2A2A30] transition-colors">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[10px] text-[#6B6B75] font-mono">{fmtTime(ev.time || ev.date || ev.datetime || "", tz)}</span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase"
                          style={{ background: `${imp.color}22`, color: imp.color, border: `1px solid ${imp.color}44` }}>
                          {imp.label}
                        </span>
                      </div>
                      <div className="text-xs leading-snug text-[#B0B0B8]">{name}</div>
                      <div className="flex items-center gap-2 mt-1.5 text-[10px]">
                        {(ev.prev || ev.previous) != null && <span className="text-[#6B6B75]">Prev <span className="text-white">{ev.prev || ev.previous}</span></span>}
                        {ev.forecast != null && <span className="text-[#6B6B75]">Est <span className="text-[#FFB300]">{ev.forecast}</span></span>}
                        {ev.actual != null && <span className="text-[#6B6B75]">Reel <span className="text-white font-bold">{ev.actual}</span></span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
        </>
      )}
    </div>
  );
}
