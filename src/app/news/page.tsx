"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader, LiveBadge, Card, Badge } from "@/components/ui/card";

const API = "http://localhost:3850";

const CRITIQUE_KW = ["CPI", "NFP", "FOMC", "PCE", "Powell", "GDP"];
const HIGH_KW = ["ISM", "ADP", "JOLTS", "Retail Sales", "Jobless", "PPI", "Initial Claims"];

const SOURCE_COLORS: Record<string, string> = {
  tradex: "#42A5F5", "pr newswire": "#6B6B75", reuters: "#FF8C00",
  benzinga: "#22C55E", bloomberg: "#7C3AED", default: "#6B6B75",
};

function impactOf(name: string, raw?: string): { label: string; color: string; pulse: boolean } {
  const n = (name || "").toUpperCase();
  if (CRITIQUE_KW.some(k => n.includes(k.toUpperCase()))) return { label: "CRITIQUE", color: "#EF4444", pulse: true };
  if (raw && ["critique"].includes(raw.toLowerCase())) return { label: "CRITIQUE", color: "#EF4444", pulse: true };
  if (HIGH_KW.some(k => n.includes(k.toUpperCase()))) return { label: "HAUT", color: "#FFB300", pulse: false };
  if (raw && ["high", "haut"].includes(raw.toLowerCase())) return { label: "HAUT", color: "#FFB300", pulse: false };
  return { label: "MOYEN", color: "#42A5F5", pulse: false };
}

function fmtTime(iso: string, tz: string): string {
  try {
    return new Date(iso).toLocaleString("fr-FR", {
      timeZone: tz === "CET" ? "Europe/Paris" : "America/New_York",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return "--"; }
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "a l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `il y a ${hrs}h`;
  return `il y a ${Math.floor(hrs / 24)}j`;
}

function isBreaking(iso: string): boolean {
  return Date.now() - new Date(iso).getTime() < 5 * 60000;
}

function isToday(iso: string, tz: string): boolean {
  try {
    const evDay = new Date(iso).toLocaleDateString("fr-FR", {
      timeZone: tz === "CET" ? "Europe/Paris" : "America/New_York",
    });
    const today = new Date().toLocaleDateString("fr-FR", {
      timeZone: tz === "CET" ? "Europe/Paris" : "America/New_York",
    });
    return evDay === today;
  } catch { return false; }
}

function sourceColor(src?: string): string {
  if (!src) return SOURCE_COLORS.default;
  const key = src.toLowerCase();
  for (const [k, v] of Object.entries(SOURCE_COLORS)) {
    if (key.includes(k)) return v;
  }
  return SOURCE_COLORS.default;
}

function sentimentDot(s?: string) {
  if (!s) return null;
  const sl = s.toLowerCase();
  const isBull = sl.includes("bull") || sl.includes("positif") || sl.includes("positive");
  const isBear = sl.includes("bear") || sl.includes("negatif") || sl.includes("negative");
  const color = isBull ? "#10B981" : isBear ? "#EF4444" : "#6B6B75";
  const text = isBull ? "Haussier" : isBear ? "Baissier" : "Neutre";
  return (
    <span className="flex items-center gap-1 text-[10px]" style={{ color }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      {text}
    </span>
  );
}

export default function NewsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [news, setNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tz, setTz] = useState("ET");
  const [majorsOnly, setMajorsOnly] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [eRes, nRes] = await Promise.all([
        fetch(`${API}/api/uw/economic-calendar`).then(r => r.json()),
        fetch(`${API}/api/uw/news`).then(r => r.json()),
      ]);
      setEvents(Array.isArray(eRes) ? eRes : eRes?.data ?? []);
      setNews(Array.isArray(nRes) ? nRes : nRes?.data ?? []);
    } catch (e: any) { setError(e.message || "Serveur indisponible"); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); const i = setInterval(load, 60_000); return () => clearInterval(i); }, [load]);

  const todayEvents = events.filter((ev: any) => isToday(ev.date || ev.datetime || "", tz));

  const filteredNews = majorsOnly
    ? news.filter((n: any) => {
        const imp = impactOf(n.headline || n.title || "", n.impact);
        return imp.label === "CRITIQUE" || imp.label === "HAUT";
      })
    : news;

  if (loading) return (
    <div className="p-6">
      <PageHeader title="Actualites & Calendrier" subtitle="Flux macro + calendrier economique" />
      <div className="text-center py-20 text-[#6B6B75]">Chargement...</div>
    </div>
  );

  if (error) return (
    <div className="p-6">
      <PageHeader title="Actualites & Calendrier" subtitle="Flux macro + calendrier economique" />
      <Card className="p-8 text-center text-red-400">{error}</Card>
    </div>
  );

  return (
    <div className="p-6 space-y-5">
      <PageHeader title="Actualites & Calendrier" subtitle="Flux macro + calendrier economique en temps reel">
        {/* Timezone toggle */}
        <div className="flex bg-[#111114] border border-[#1E1E22] rounded-lg overflow-hidden">
          {["ET", "CET"].map(t => (
            <button key={t} onClick={() => setTz(t)}
              className={`px-3 py-1.5 text-xs font-semibold transition-colors ${tz === t ? "bg-[#FF6B00] text-black" : "text-[#6B6B75] hover:text-white"}`}>
              {t === "ET" ? "USA (ET)" : "Paris (CET)"}
            </button>
          ))}
        </div>
        <button onClick={load} className="px-3 py-1.5 bg-[#111114] border border-[#1E1E22] rounded-lg text-xs hover:border-[#FF6B00] transition-colors">
          Rafraichir
        </button>
        <LiveBadge />
      </PageHeader>

      {/* ── Economic Calendar Timeline ── */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs text-[#6B6B75] uppercase tracking-wider font-semibold">Calendrier du jour</span>
          <span className="text-[10px] text-[#6B6B75]">({todayEvents.length} evenements)</span>
        </div>
        {todayEvents.length === 0 ? (
          <div className="text-center text-[#6B6B75] py-4 text-sm">Aucun evenement aujourd'hui</div>
        ) : (
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
            {todayEvents.map((ev: any, i: number) => {
              const imp = impactOf(ev.name || ev.event || "", ev.impact);
              return (
                <div key={i} className="flex-shrink-0 bg-[#0A0A0A] border border-[#1E1E22] rounded-lg px-3 py-2 min-w-[180px] max-w-[240px] hover:border-[#2A2A30] transition-colors">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] text-[#6B6B75] font-mono">{fmtTime(ev.date || ev.datetime || "", tz)}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide ${imp.pulse ? "animate-pulse" : ""}`}
                      style={{ background: `${imp.color}22`, color: imp.color, border: `1px solid ${imp.color}44` }}>
                      {imp.label}
                    </span>
                  </div>
                  <div className="text-xs leading-snug text-white truncate">{ev.name || ev.event}</div>
                  <div className="flex items-center gap-3 mt-1.5 text-[10px]">
                    {ev.previous != null && <span className="text-[#6B6B75]">Prev <span className="text-white">{ev.previous}</span></span>}
                    {ev.forecast != null && <span className="text-[#6B6B75]">Est <span className="text-[#FFB300]">{ev.forecast}</span></span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* ── News Feed ── */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <span className="text-xs text-[#6B6B75] uppercase tracking-wider font-semibold">Fil d'actualites</span>
          {/* Pill toggle */}
          <button onClick={() => setMajorsOnly(!majorsOnly)}
            className={`ml-auto flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
              majorsOnly
                ? "bg-[#FF6B00] text-black border-[#FF6B00]"
                : "bg-[#111114] text-[#6B6B75] border-[#1E1E22] hover:border-[#FF6B00]"
            }`}>
            <span className={`w-2 h-2 rounded-full transition-colors ${majorsOnly ? "bg-black" : "bg-[#6B6B75]"}`} />
            Majeures uniquement
          </button>
        </div>

        {filteredNews.length === 0 ? (
          <Card className="p-8 text-center text-[#6B6B75] text-sm">Aucune actualite</Card>
        ) : (
          <div className="grid gap-3 max-h-[600px] overflow-y-auto pr-1">
            {filteredNews.slice(0, 50).map((n: any, i: number) => {
              const ts = n.date || n.published_at || n.time || "";
              const imp = impactOf(n.headline || n.title || "", n.impact);
              const breaking = isBreaking(ts);
              const isMajor = imp.label === "CRITIQUE" || imp.label === "HAUT";
              return (
                <Card key={i} className="p-0 overflow-hidden" hover>
                  <div className={`flex ${isMajor ? "border-l-2 border-l-[#FF6B00] bg-[#131316]" : ""}`}>
                    <div className="flex-1 p-3">
                      {/* Top row: source + breaking + time */}
                      <div className="flex items-center gap-2 mb-1.5">
                        {n.source && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase"
                            style={{ background: `${sourceColor(n.source)}22`, color: sourceColor(n.source) }}>
                            {n.source}
                          </span>
                        )}
                        {breaking && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-[#EF4444]/20 text-[#EF4444] animate-pulse">
                            BREAKING
                          </span>
                        )}
                        <span className="ml-auto text-[10px] text-[#6B6B75]">{relativeTime(ts)}</span>
                      </div>
                      {/* Headline */}
                      <div className="text-sm font-medium leading-snug text-white mb-2">
                        {n.headline || n.title}
                      </div>
                      {/* Bottom row: tickers + sentiment */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {(n.tickers || []).slice(0, 5).map((t: string) => (
                          <span key={t} className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#FF6B00]/10 text-[#FF6B00] border border-[#FF6B00]/20">
                            {t}
                          </span>
                        ))}
                        {sentimentDot(n.sentiment)}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
