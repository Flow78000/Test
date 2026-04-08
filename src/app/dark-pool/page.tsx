"use client";

import { useState, useEffect, useMemo } from "react";
import { PageHeader, Card, KpiCard, Badge, LiveBadge } from "@/components/ui/card";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine,
} from "recharts";

const API = "http://localhost:3850";

function darkTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1A1A1E] border border-[#2A2A2E] rounded px-3 py-2 text-xs">
      <div className="text-[#6B6B75] mb-1">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ color: p.color }}>{p.name}: {typeof p.value === "number" ? p.value.toLocaleString() : p.value}</div>
      ))}
    </div>
  );
}

function fmtPrem(v: number) {
  if (!v) return "--";
  const a = Math.abs(v);
  return (v < 0 ? "-" : "") + (a >= 1e9 ? (a/1e9).toFixed(1)+"B" : a >= 1e6 ? (a/1e6).toFixed(1)+"M" : a >= 1e3 ? (a/1e3).toFixed(0)+"K" : a.toFixed(0));
}

function timeAgo(ts: string) {
  const d = new Date(ts);
  const now = new Date();
  const min = Math.round((now.getTime() - d.getTime()) / 60000);
  if (min < 1) return "MAINTENANT";
  if (min < 60) return `il y a ${min}min`;
  if (min < 1440) return `il y a ${Math.round(min/60)}h`;
  return `il y a ${Math.round(min/1440)}j`;
}

export default function DarkPoolPage() {
  const [regime, setRegime] = useState<any>(null);
  const [prints, setPrints] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [ticker, setTicker] = useState("SPY");

  async function load() {
    setLoading(true);
    try {
      const [regimeResp, printsResp, histResp] = await Promise.allSettled([
        fetch(`${API}/api/regime/full`).then(r => r.json()),
        fetch(`${API}/api/uw/darkpool/${ticker}`).then(r => r.json()),
        fetch(`${API}/api/regime/history`).then(r => r.json()),
      ]);

      if (regimeResp.status === "fulfilled") setRegime(regimeResp.value);
      if (printsResp.status === "fulfilled") {
        const d = printsResp.value?.data || printsResp.value || [];
        setPrints(Array.isArray(d) ? d : []);
      }
      if (histResp.status === "fulfilled") {
        setHistory(histResp.value?.daily || []);
      }
    } catch { }
    setLoading(false);
  }

  useEffect(() => { load(); const i = setInterval(load, 60000); return () => clearInterval(i); }, [ticker]);

  const dp = regime?.layers?.dark_pool || {};

  // Compute print analysis
  const printAnalysis = useMemo(() => {
    if (!prints.length) return null;
    let bullish = 0, bearish = 0, neutral = 0;
    let bigPrints: any[] = [];
    let totalPrem = 0;
    let hourlyBuckets: Record<string, { bull: number; bear: number; total: number }> = {};

    prints.forEach(p => {
      const price = parseFloat(p.price || 0);
      const size = parseInt(p.size || 0);
      const prem = parseFloat(p.premium || 0);
      const bid = parseFloat(p.nbbo_bid || 0);
      const ask = parseFloat(p.nbbo_ask || 0);
      const ts = p.executed_at || "";

      totalPrem += prem;
      const dir = price >= ask ? "BULL" : price <= bid ? "BEAR" : "NEUTRE";
      if (dir === "BULL") bullish += size;
      else if (dir === "BEAR") bearish += size;
      else neutral += size;

      // Big prints (>$500K)
      if (prem > 500000) {
        bigPrints.push({ ...p, direction: dir, prem });
      }

      // Hourly buckets
      if (ts) {
        const hour = ts.slice(11, 13) + ":00";
        if (!hourlyBuckets[hour]) hourlyBuckets[hour] = { bull: 0, bear: 0, total: 0 };
        if (dir === "BULL") hourlyBuckets[hour].bull += size;
        else if (dir === "BEAR") hourlyBuckets[hour].bear += size;
        hourlyBuckets[hour].total += size;
      }
    });

    const total = bullish + bearish + neutral;
    const dpss = total > 0 ? bullish / total : 0.5;

    // Sort big prints by premium desc
    bigPrints.sort((a, b) => b.prem - a.prem);

    // Build hourly chart data
    const hourlyChart = Object.entries(hourlyBuckets)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([hour, data]) => ({
        hour,
        bullish: data.bull,
        bearish: -data.bear,
        net: data.bull - data.bear,
      }));

    return { bullish, bearish, neutral, total, dpss, bigPrints: bigPrints.slice(0, 20), totalPrem, hourlyChart };
  }, [prints]);

  // DPSS history from regime history
  const dpssHistory = useMemo(() => {
    return history.filter(h => h.dpss != null).map(h => ({
      date: h.date?.slice(5) || "",
      dpss: h.dpss,
      regime: h.regime,
    }));
  }, [history]);

  // Compute signals from print analysis
  const signals = useMemo(() => {
    if (!printAnalysis) return [];
    const sigs: any[] = [];
    const { dpss, bigPrints, totalPrem } = printAnalysis;

    if (dpss > 0.65) sigs.push({ type: "ACCUMULATION FORTE", color: "#22C55E", desc: `DPSS ${(dpss*100).toFixed(1)}% — achat institutionnel massif`, priority: 1 });
    else if (dpss > 0.55) sigs.push({ type: "ACCUMULATION", color: "#22C55E", desc: `DPSS ${(dpss*100).toFixed(1)}% — biais acheteur`, priority: 2 });
    else if (dpss < 0.35) sigs.push({ type: "DISTRIBUTION FORTE", color: "#EF4444", desc: `DPSS ${(dpss*100).toFixed(1)}% — vente institutionnelle massive`, priority: 1 });
    else if (dpss < 0.45) sigs.push({ type: "DISTRIBUTION", color: "#EF4444", desc: `DPSS ${(dpss*100).toFixed(1)}% — biais vendeur`, priority: 2 });
    else sigs.push({ type: "NEUTRE", color: "#FFA726", desc: `DPSS ${(dpss*100).toFixed(1)}% — pas de biais clair`, priority: 3 });

    // Big block detection
    const megaBlocks = bigPrints.filter((p: any) => p.prem > 5000000);
    if (megaBlocks.length > 3) sigs.push({ type: "MEGA BLOCKS", color: "#B388FF", desc: `${megaBlocks.length} prints > $5M detectes — activite institutionnelle extreme`, priority: 1 });
    else if (bigPrints.length > 10) sigs.push({ type: "BLOCKS ACTIFS", color: "#42A5F5", desc: `${bigPrints.length} prints > $500K — flux institutionnel soutenu`, priority: 2 });

    // Divergence: DPSS vs price trend (would need price data, placeholder)
    if (dpss > 0.6 && totalPrem > 1e9) sigs.push({ type: "ACCUMULATION CACHEE", color: "#22C55E", desc: "Fort DPSS + premium eleve = achat institutionnel silencieux", priority: 1 });

    return sigs.sort((a, b) => a.priority - b.priority);
  }, [printAnalysis]);

  return (
    <div className="p-6">
      <PageHeader title="Dark Pool Intelligence" subtitle={`Proxy DIX — Prints institutionnels ${ticker}`}>
        <select value={ticker} onChange={e => setTicker(e.target.value)} className="text-xs">
          <option value="SPY">SPY</option>
          <option value="QQQ">QQQ</option>
          <option value="IWM">IWM</option>
        </select>
        <button onClick={load} className="px-3 py-1.5 bg-[#111114] border border-[#1E1E22] rounded-lg text-xs hover:border-[#FF6B00] transition-colors">Rafraichir</button>
        <LiveBadge />
      </PageHeader>

      {loading && !printAnalysis ? (
        <div className="text-center py-20 text-[#6B6B75]">Chargement des prints dark pool...</div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-5 gap-3 mb-4">
            <KpiCard label="DPSS Live" value={printAnalysis ? (printAnalysis.dpss * 100).toFixed(1) + "%" : dp.dpss?.toFixed(4) || "--"} sublabel="Sentiment Score" color={((printAnalysis?.dpss || dp.dpss || 0.5)) > 0.55 ? "#22C55E" : ((printAnalysis?.dpss || dp.dpss || 0.5)) < 0.45 ? "#EF4444" : "#FFA726"} />
            <KpiCard label="Prints" value={prints.length.toLocaleString()} sublabel={`${ticker} dark pool`} color="#FF6B00" />
            <KpiCard label="Gros Prints" value={printAnalysis?.bigPrints.length.toString() || "--"} sublabel="> $500K" color="#B388FF" />
            <KpiCard label="Premium Total" value={fmtPrem(printAnalysis?.totalPrem || 0)} sublabel="Volume dollar" color="#42A5F5" />
            <KpiCard label="Bull/Bear" value={printAnalysis ? `${((printAnalysis.bullish / printAnalysis.total) * 100).toFixed(0)}/${((printAnalysis.bearish / printAnalysis.total) * 100).toFixed(0)}` : "--"} sublabel="Ratio %" color="#FFA726" />
          </div>

          {/* Signals */}
          {signals.length > 0 && (
            <div className="mb-4 space-y-2">
              {signals.map((s, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: s.color + "08", border: `1px solid ${s.color}33` }}>
                  <span className={`w-2.5 h-2.5 rounded-full ${s.priority === 1 ? "animate-pulse" : ""}`} style={{ background: s.color }} />
                  <Badge color={s.color}>{s.type}</Badge>
                  <span className="text-xs text-[#A0A0A8]">{s.desc}</span>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* Volume Bars */}
            <Card className="p-4">
              <h3 className="text-xs text-[#6B6B75] uppercase tracking-widest mb-3">Repartition du Volume</h3>
              {printAnalysis && (
                <div className="space-y-3">
                  {[
                    { label: "Bullish (prix >= ask)", value: printAnalysis.bullish, color: "#22C55E" },
                    { label: "Bearish (prix <= bid)", value: printAnalysis.bearish, color: "#EF4444" },
                    { label: "Neutre (mid)", value: printAnalysis.neutral, color: "#6B6B75" },
                  ].map(v => {
                    const pct = printAnalysis.total > 0 ? (v.value / printAnalysis.total) * 100 : 0;
                    return (
                      <div key={v.label}>
                        <div className="flex justify-between text-xs mb-1">
                          <span style={{ color: v.color }}>{v.label}</span>
                          <span className="font-mono">{v.value.toLocaleString()} ({pct.toFixed(1)}%)</span>
                        </div>
                        <div className="h-3 bg-[#1E1E22] rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: pct + "%", background: v.color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* Hourly Flow Chart */}
            <Card className="p-4">
              <h3 className="text-xs text-[#6B6B75] uppercase tracking-widest mb-3">Flux Horaire (Bull vs Bear)</h3>
              {printAnalysis?.hourlyChart.length ? (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={printAnalysis.hourlyChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E1E22" />
                    <XAxis dataKey="hour" tick={{ fill: "#6B6B75", fontSize: 9 }} />
                    <YAxis tick={{ fill: "#6B6B75", fontSize: 9 }} />
                    <Tooltip content={darkTooltip} />
                    <ReferenceLine y={0} stroke="#6B6B75" />
                    <Bar dataKey="bullish" fill="#22C55E" name="Bullish" radius={[2,2,0,0]} />
                    <Bar dataKey="bearish" fill="#EF4444" name="Bearish" radius={[0,0,2,2]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-10 text-[#6B6B75] text-xs">Pas de donnees horaires</div>
              )}
            </Card>
          </div>

          {/* DPSS History */}
          {dpssHistory.length > 0 && (
            <Card className="p-4 mb-4">
              <h3 className="text-xs text-[#6B6B75] uppercase tracking-widest mb-3">Historique DPSS (30 jours)</h3>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={dpssHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E1E22" />
                  <XAxis dataKey="date" tick={{ fill: "#6B6B75", fontSize: 9 }} />
                  <YAxis domain={[0.3, 0.7]} tick={{ fill: "#6B6B75", fontSize: 9 }} />
                  <Tooltip content={darkTooltip} />
                  <ReferenceLine y={0.6} stroke="#22C55E" strokeDasharray="5 5" label={{ value: "Accum.", fill: "#22C55E", fontSize: 9 }} />
                  <ReferenceLine y={0.4} stroke="#EF4444" strokeDasharray="5 5" label={{ value: "Distrib.", fill: "#EF4444", fontSize: 9 }} />
                  <Area dataKey="dpss" stroke="#FF6B00" fill="#FF6B0015" strokeWidth={2} name="DPSS" dot={{ r: 2, fill: "#FF6B00" }} />
                </AreaChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* Big Prints Table */}
          <Card className="overflow-hidden mb-4">
            <div className="px-4 py-3 border-b border-[#1E1E22] flex items-center gap-3">
              <span className="text-sm font-bold">Gros Prints Dark Pool</span>
              <Badge color="#FF6B00">{ticker}</Badge>
              <span className="text-xs text-[#6B6B75]">&gt; $500K — {printAnalysis?.bigPrints.length || 0} prints</span>
            </div>
            <div className="overflow-x-auto max-h-80 overflow-y-auto">
              <table className="w-full text-[11px]">
                <thead className="sticky top-0 bg-[#111114]">
                  <tr className="text-[#6B6B75] uppercase text-[9px] tracking-wider border-b border-[#1E1E22]">
                    <th className="p-2 text-left">Heure</th>
                    <th className="p-2 text-left">Age</th>
                    <th className="p-2 text-center">Actif</th>
                    <th className="p-2 text-right">Prix</th>
                    <th className="p-2 text-right">Taille</th>
                    <th className="p-2 text-right">Premium</th>
                    <th className="p-2 text-center">Direction</th>
                    <th className="p-2 text-right">Bid</th>
                    <th className="p-2 text-right">Ask</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1A1A1E]">
                  {(printAnalysis?.bigPrints || []).map((p: any, i: number) => {
                    const ts = p.executed_at || "";
                    const time = ts ? new Date(ts).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "--";
                    const isMega = p.prem > 5000000;
                    return (
                      <tr key={i} className={`hover:bg-[#FF6B0006] ${isMega ? "bg-[#B388FF06]" : ""}`}>
                        <td className="p-2 font-mono text-[#6B6B75]">{time}</td>
                        <td className="p-2 text-[10px]" style={{ color: p.direction === "BULL" ? "#22C55E" : p.direction === "BEAR" ? "#EF4444" : "#6B6B75" }}>
                          {ts ? timeAgo(ts) : "--"}
                        </td>
                        <td className="p-2 text-center font-mono font-bold text-[#FF6B00]">{ticker}</td>
                        <td className="p-2 text-right font-mono">${parseFloat(p.price || 0).toFixed(2)}</td>
                        <td className="p-2 text-right font-mono font-bold text-[#F0F0F0]">{parseInt(p.size || 0).toLocaleString()}</td>
                        <td className="p-2 text-right font-mono font-bold" style={{ color: isMega ? "#B388FF" : "#FF6B00" }}>
                          ${fmtPrem(p.prem)}
                          {isMega && <span className="ml-1 text-[8px] text-[#B388FF]">MEGA</span>}
                        </td>
                        <td className="p-2 text-center">
                          <Badge color={p.direction === "BULL" ? "#22C55E" : p.direction === "BEAR" ? "#EF4444" : "#6B6B75"}>
                            {p.direction}
                          </Badge>
                        </td>
                        <td className="p-2 text-right font-mono text-[#6B6B75]">{parseFloat(p.nbbo_bid || 0).toFixed(2)}</td>
                        <td className="p-2 text-right font-mono text-[#6B6B75]">{parseFloat(p.nbbo_ask || 0).toFixed(2)}</td>
                      </tr>
                    );
                  })}
                  {(!printAnalysis?.bigPrints.length) && (
                    <tr><td colSpan={9} className="p-8 text-center text-[#6B6B75]">Aucun gros print detecte — lancez le backend</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Signal Rules */}
          <Card className="p-4">
            <h3 className="text-xs text-[#6B6B75] uppercase tracking-widest mb-3">Regles de Trading Dark Pool</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#22C55E08] border border-[#22C55E22] rounded-lg p-3 text-xs text-[#6B6B75]">
                <div className="font-bold text-[#22C55E] mb-1">ACCUMULATION (DPSS &gt; 60%)</div>
                <p>Institutions achetent en silence. Prix execute au ask = agressivite acheteuse. Confirmer avec GEX positif pour LONG ES/NQ.</p>
              </div>
              <div className="bg-[#EF444408] border border-[#EF444422] rounded-lg p-3 text-xs text-[#6B6B75]">
                <div className="font-bold text-[#EF4444] mb-1">DISTRIBUTION (DPSS &lt; 40%)</div>
                <p>Institutions vendent. Prix execute au bid = agressivite vendeuse. Confirmer avec GEX negatif pour SHORT ou hedger.</p>
              </div>
              <div className="bg-[#B388FF08] border border-[#B388FF22] rounded-lg p-3 text-xs text-[#6B6B75]">
                <div className="font-bold text-[#B388FF] mb-1">MEGA BLOCKS (&gt; $5M)</div>
                <p>Prints &gt; $5M = activite institutionnelle majeure (hedge funds, desks prop). Sens de la position = signal fort.</p>
              </div>
              <div className="bg-[#FF6B0008] border border-[#FF6B0022] rounded-lg p-3 text-xs text-[#6B6B75]">
                <div className="font-bold text-[#FF6B00] mb-1">DIVERGENCE DPSS / PRIX</div>
                <p>DPSS monte mais prix baisse = accumulation cachee (smart money achete le dip). Signal avance de reversal haussier.</p>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
