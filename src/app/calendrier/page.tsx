"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { PageHeader, LiveBadge, Card, Badge } from "@/components/ui/card";

const API = "http://localhost:3850";
const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"];

const CRITIQUE_EVENTS = ["CPI", "NFP", "FOMC", "Nonfarm", "Consumer Price", "Federal Reserve", "Fed Rate", "PCE"];
const HIGH_EVENTS = ["ISM", "JOLTS", "Retail Sales", "PPI", "Initial Claims", "GDP", "Durable Goods"];
const FED_KEYWORDS = ["Fed", "FOMC", "Powell", "Waller", "Williams", "Barkin", "Bostic", "Daly", "Kashkari"];

function classifyEvent(name: string, impact?: string): { label: string; color: string } {
  const n = name || "";
  if (CRITIQUE_EVENTS.some(e => n.includes(e))) return { label: "CRITIQUE", color: "#EF4444" };
  if (HIGH_EVENTS.some(e => n.includes(e))) return { label: "HAUT", color: "#FFB300" };
  if (impact === "high" || impact === "haut") return { label: "HAUT", color: "#FFB300" };
  return { label: "MOYEN", color: "#42A5F5" };
}

function isFedSpeaker(name: string): boolean {
  return FED_KEYWORDS.some(k => name.includes(k));
}

function weekStart(offset: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay() + 1 + offset * 7);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "America/New_York" });
  } catch { return "--"; }
}

export default function CalendrierPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [weekOffset, setWeekOffset] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/api/uw/economic-calendar`).then(r => r.json());
      setEvents(Array.isArray(res) ? res : res?.data ?? []);
    } catch (e: any) { setError(e.message || "Serveur indisponible"); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const ws = weekStart(weekOffset);
  const weekDates = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(ws);
    d.setDate(d.getDate() + i);
    return isoDate(d);
  });

  const byDay = useMemo(() => {
    return weekDates.map(date =>
      events.filter((ev: any) => {
        const evDate = (ev.date || ev.datetime || "").slice(0, 10);
        return evDate === date;
      })
    );
  }, [events, weekDates]);

  if (loading) return (
    <div className="p-6">
      <PageHeader title="Calendrier Economique" subtitle="Evenements macro, FOMC, NFP, CPI" />
      <div className="text-center py-20 text-[#6B6B75]">Chargement...</div>
    </div>
  );

  if (error) return (
    <div className="p-6">
      <PageHeader title="Calendrier Economique" subtitle="Evenements macro" />
      <Card className="p-8 text-center text-red-400">{error}</Card>
    </div>
  );

  return (
    <div className="p-6">
      <PageHeader title="Calendrier Economique" subtitle="Evenements macro, FOMC, NFP, CPI et publications cles">
        <button onClick={() => setWeekOffset(w => w - 1)} className="px-3 py-1.5 bg-[#111114] border border-[#1E1E22] rounded-lg text-xs hover:border-[#FF6B00] transition-colors">Prec.</button>
        <button onClick={() => setWeekOffset(0)} className="px-3 py-1.5 bg-[#111114] border border-[#1E1E22] rounded-lg text-xs hover:border-[#FF6B00] transition-colors">Cette sem.</button>
        <button onClick={() => setWeekOffset(w => w + 1)} className="px-3 py-1.5 bg-[#111114] border border-[#1E1E22] rounded-lg text-xs hover:border-[#FF6B00] transition-colors">Suiv.</button>
        <button onClick={load} className="px-3 py-1.5 bg-[#111114] border border-[#1E1E22] rounded-lg text-xs hover:border-[#FF6B00] transition-colors">Rafraichir</button>
        <LiveBadge />
      </PageHeader>

      <div className="text-xs text-[#6B6B75] mb-4">{weekDates[0]} au {weekDates[4]}</div>

      <div className="grid grid-cols-5 gap-3">
        {weekDates.map((date, di) => (
          <div key={date}>
            <div className="text-xs text-[#6B6B75] uppercase tracking-wider mb-2 text-center font-semibold">{DAYS[di]}<br /><span className="text-[10px]">{date.slice(5)}</span></div>
            <div className="space-y-2">
              {byDay[di].length === 0 ? (
                <Card className="p-3 text-center text-[10px] text-[#6B6B75]">Aucun evenement</Card>
              ) : byDay[di].map((ev: any, i: number) => {
                const imp = classifyEvent(ev.name || ev.event || "", ev.impact);
                const fedSpeaker = isFedSpeaker(ev.name || ev.event || "");
                return (
                  <Card key={i} className={"p-3" + (fedSpeaker ? " border-[#AB47BC]/40" : "")} hover>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[10px] text-[#6B6B75] font-mono">{fmtTime(ev.date || ev.datetime || "")}</span>
                      <Badge color={imp.color}>{imp.label}</Badge>
                    </div>
                    <div className={"text-xs leading-snug" + (fedSpeaker ? " text-[#AB47BC]" : "")}>{ev.name || ev.event}</div>
                    <div className="flex items-center gap-2 mt-1.5 text-[10px]">
                      {ev.previous != null && <span className="text-[#6B6B75]">Prev: {ev.previous}</span>}
                      {ev.forecast != null && <span className="text-[#FFB300]">Est: {ev.forecast}</span>}
                      {ev.actual != null && <span className="text-white font-semibold">Reel: {ev.actual}</span>}
                    </div>
                    {fedSpeaker && <Badge color="#AB47BC" className="mt-1.5">FED</Badge>}
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
