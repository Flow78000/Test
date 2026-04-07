"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader, LiveBadge, Card, Badge } from "@/components/ui/card";

const API = "http://localhost:3849";

const IMPACT_MAP: Record<string, { label: string; color: string }> = {
  critique: { label: "CRITIQUE", color: "#EF4444" },
  high: { label: "HAUT", color: "#FFB300" },
  haut: { label: "HAUT", color: "#FFB300" },
  medium: { label: "MOYEN", color: "#42A5F5" },
  moyen: { label: "MOYEN", color: "#42A5F5" },
  low: { label: "BAS", color: "#6B6B75" },
  bas: { label: "BAS", color: "#6B6B75" },
};

const CRITIQUE_EVENTS = ["CPI", "NFP", "FOMC", "Fed", "PCE", "GDP"];
const HIGH_EVENTS = ["ISM", "JOLTS", "Retail Sales", "PPI", "Initial Claims"];

function classifyImpact(name: string, impact?: string): { label: string; color: string } {
  if (impact && IMPACT_MAP[impact.toLowerCase()]) return IMPACT_MAP[impact.toLowerCase()];
  if (CRITIQUE_EVENTS.some(e => name.includes(e))) return IMPACT_MAP.critique;
  if (HIGH_EVENTS.some(e => name.includes(e))) return IMPACT_MAP.high;
  return IMPACT_MAP.medium;
}

function fmtTime(iso: string, tz: string): string {
  try {
    return new Date(iso).toLocaleString("fr-FR", {
      timeZone: tz === "CET" ? "Europe/Paris" : "America/New_York",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}

function fmtDate(iso: string, tz: string): string {
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      timeZone: tz === "CET" ? "Europe/Paris" : "America/New_York",
      weekday: "short", month: "short", day: "numeric",
    });
  } catch { return iso; }
}

function sentimentBadge(s?: string) {
  if (!s) return null;
  const sl = s.toLowerCase();
  const color = sl.includes("bull") || sl.includes("positif") ? "#4CAF50" : sl.includes("bear") || sl.includes("negatif") ? "#EF4444" : "#6B6B75";
  return <Badge color={color}>{s}</Badge>;
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

  useEffect(() => {
    load();
    const i = setInterval(load, 60_000);
    return () => clearInterval(i);
  }, [load]);

  const filteredNews = majorsOnly
    ? news.filter((n: any) => {
        const imp = classifyImpact(n.headline || n.title || "", n.impact);
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
    <div className="p-6">
      <PageHeader title="Actualites & Calendrier" subtitle="Flux macro + calendrier economique en temps reel">
        <select value={tz} onChange={e => setTz(e.target.value)} className="bg-[#111114] border border-[#1E1E22] rounded-lg px-3 py-1.5 text-xs text-white">
          <option value="ET">USA (ET)</option>
          <option value="CET">Paris (CET)</option>
        </select>
        <button onClick={load} className="px-3 py-1.5 bg-[#111114] border border-[#1E1E22] rounded-lg text-xs hover:border-[#FF6B00] transition-colors">Rafraichir</button>
        <LiveBadge />
      </PageHeader>

      {/* Economic Calendar */}
      <Card className="p-4 mb-4">
        <div className="text-xs text-[#6B6B75] uppercase tracking-wider mb-3">Calendrier Economique</div>
        {events.length === 0 ? (
          <div className="text-center text-[#6B6B75] py-4 text-sm">Aucun evenement a venir</div>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {events.slice(0, 20).map((ev: any, i: number) => {
              const imp = classifyImpact(ev.name || ev.event || "", ev.impact);
              return (
                <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#16161A] border-b border-[#1E1E22]">
                  <span className="text-[10px] text-[#6B6B75] font-mono w-20 shrink-0">
                    {fmtDate(ev.date || ev.datetime || "", tz)} {fmtTime(ev.date || ev.datetime || "", tz)}
                  </span>
                  <Badge color={imp.color}>{imp.label}</Badge>
                  <span className="text-sm flex-1">{ev.name || ev.event}</span>
                  {ev.previous != null && <span className="text-[10px] text-[#6B6B75]">Prev: {ev.previous}</span>}
                  {ev.forecast != null && <span className="text-[10px] text-[#FFB300]">Est: {ev.forecast}</span>}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* News Feed */}
      <Card className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-xs text-[#6B6B75] uppercase tracking-wider">Fil d'Actualites</span>
          <label className="ml-auto flex items-center gap-2 text-xs text-[#6B6B75] cursor-pointer">
            <input type="checkbox" checked={majorsOnly} onChange={e => setMajorsOnly(e.target.checked)} className="accent-[#FF6B00]" />
            Majeures uniquement
          </label>
        </div>
        {filteredNews.length === 0 ? (
          <div className="text-center text-[#6B6B75] py-4 text-sm">Aucune actualite</div>
        ) : (
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {filteredNews.slice(0, 50).map((n: any, i: number) => (
              <div key={i} className="flex items-start gap-3 px-3 py-2 rounded-lg hover:bg-[#16161A] border-b border-[#1E1E22]">
                <span className="text-[10px] text-[#6B6B75] font-mono w-14 shrink-0 pt-0.5">
                  {fmtTime(n.date || n.published_at || n.time || "", tz)}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm leading-snug">{n.headline || n.title}</div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {n.source && <Badge color="#6B6B75">{n.source}</Badge>}
                    {(n.tickers || []).slice(0, 4).map((t: string) => (
                      <span key={t} className="text-[10px] bg-[#1E1E22] px-1.5 py-0.5 rounded text-[#FF6B00] font-mono">{t}</span>
                    ))}
                    {sentimentBadge(n.sentiment)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
