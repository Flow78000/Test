"use client";

import { useState, useEffect } from "react";
import { PageHeader, LiveBadge, Card, Badge } from "@/components/ui/card";

export default function SignalsPage() {
  const [data, setData] = useState<any>(null);
  const [perfData, setPerfData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  async function loadSignals() {
    setLoading(true);
    try {
      const [dash, perf] = await Promise.all([
        fetch("http://localhost:3850/api/sierra/dashboard").then(r => r.json()),
        fetch("http://localhost:3850/api/sierra/performance-all").then(r => r.json()),
      ]);
      setData(dash);
      setPerfData(perf);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  useEffect(() => { loadSignals(); const i = setInterval(loadSignals, 30000); return () => clearInterval(i); }, []);

  return (
    <div className="p-6">
      <PageHeader title="Signaux Sierra Chart" subtitle="Mean Reversion + Vol Synthetique — 12 actifs">
        <button onClick={loadSignals} className="px-3 py-1.5 bg-[#111114] border border-[#1E1E22] rounded-lg text-xs hover:border-[#FF6B00] transition-colors">
          Rafraichir
        </button>
        <LiveBadge />
      </PageHeader>

      {loading ? (
        <div className="text-center py-20 text-[#6B6B75]">Chargement des signaux...</div>
      ) : !data ? (
        <Card className="p-8 text-center text-[#6B6B75]">
          Serveur non disponible. Lancez: <code className="bg-[#08080A] px-2 py-1 rounded text-[#FF6B00]">cd D:\flo-w\server && python main.py</code>
        </Card>
      ) : (
        <>
          {/* Asset classes */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {Object.entries(data.asset_classes || {}).map(([cls, classData]: [string, any]) => (
              <Card key={cls} className="overflow-hidden">
                <div className="px-5 py-3 border-b border-[#1E1E22] flex items-center gap-3">
                  <span className="text-sm font-bold uppercase tracking-wider text-[#FF6B00]">{cls}</span>
                  <span className="text-xs text-[#6B6B75] ml-auto">{Object.keys(classData.assets || {}).length} actifs</span>
                </div>
                <div className="divide-y divide-[#1A1A1E]">
                  {Object.entries(classData.assets || {}).map(([sym, asset]: [string, any]) => {
                    const shortName = (asset.name || sym).replace("TICK Composite NYSE+NASDAQ", "TICK").replace("SPDR S&P 500 Bear 3x", "SPXS");
                    const shortSym = sym.replace(".CME","").replace(".CBOT","").replace("-NQTV","").replace("_NASDAQ_NYSEMKT","");
                    return (
                    <div key={sym} className="px-5 py-3 flex items-center gap-4 hover:bg-[#FF6B0006] transition-colors">
                      <div className="w-28 flex-shrink-0">
                        <div className="font-mono font-bold text-[#FF6B00] text-sm">{shortSym}</div>
                        <div className="text-[9px] text-[#6B6B75] truncate">{shortName}</div>
                      </div>
                      <span className="font-mono text-sm">{asset.price?.toFixed(1) || "--"}</span>
                      <div className="flex gap-1 flex-1">
                        {asset.zones?.["100%"] && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-[#EF444415] text-[#EF4444]">+100%: {asset.zones["100%"].toFixed(0)}</span>
                        )}
                        {asset.zones?.["-100%"] && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-[#22C55E15] text-[#22C55E]">-100%: {asset.zones["-100%"].toFixed(0)}</span>
                        )}
                      </div>
                      {asset.vol_signal && <Badge color="#FF6B00">sigma ACTIF</Badge>}
                    </div>
                    );
                  })}
                </div>
              </Card>
            ))}
          </div>

          {/* Signal Feed */}
          <Card className="overflow-hidden mb-6">
            <div className="px-5 py-3 border-b border-[#1E1E22] flex items-center gap-3">
              <span className="text-sm font-bold">Fil de Signaux Mean Reversion</span>
              <span className="text-xs text-[#6B6B75] ml-auto">{(data.recent_signals || []).length} signaux</span>
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-[#1A1A1E]">
              {(data.recent_signals || []).slice(0, 30).map((s: any, i: number) => {
                // Calculate signal age
                const signalTime = s.date && s.time ? new Date(`${s.date.replace(/-/g,'/')} ${s.time.split('.')[0]}`) : null;
                const now = new Date();
                const ageMin = signalTime ? Math.round((now.getTime() - signalTime.getTime()) / 60000) : null;
                const isRecent = ageMin !== null && ageMin < 30;
                const isActive = ageMin !== null && ageMin < 10;
                const ageLabel = ageMin !== null ? (ageMin < 1 ? 'MAINTENANT' : ageMin < 60 ? `il y a ${ageMin}min` : ageMin < 1440 ? `il y a ${Math.round(ageMin/60)}h` : `il y a ${Math.round(ageMin/1440)}j`) : '';

                // Hide TICK (secret breadth indicator) — show as "BRI" (Breadth Indicator)
                const displaySym = (s.symbol || "").replace(".CME","").replace(".CBOT","").replace("TICK-NYSE_NASDAQ_NYSEMKT","BRI").replace("-NQTV","");

                return (
                <div key={i} className={`px-5 py-2 flex items-center gap-4 text-xs hover:bg-[#FF6B0006] ${isActive ? 'animate-pulse bg-[#FF6B0008] border-l-2 border-[#FF6B00]' : isRecent ? 'bg-[#FF6B0004]' : ''}`}>
                  <span className="font-mono w-28 flex flex-col">
                    <span className="text-[#FF6B00] text-[10px]">{s.date || "--"} {s.time ? s.time.split(".")[0] : ""}</span>
                    {ageLabel && <span className={`text-[9px] ${isActive ? 'text-[#FF6B00] font-bold' : isRecent ? 'text-[#FFA726]' : 'text-[#6B6B75]'}`}>{ageLabel}</span>}
                  </span>
                  <span className="font-mono font-bold text-[#FF6B00] w-16">{displaySym}</span>
                  <Badge color={s.direction === "LONG" ? "#22C55E" : "#EF4444"}>{s.direction}</Badge>
                  <span className="flex-1 text-[#6B6B75]">{s.description}</span>
                  <span className="text-[#FF6B00] font-mono">{s.level}</span>
                  {/* Strength dots */}
                  <div className="flex gap-0.5">
                    {[0,1,2,3].map(j => (
                      <span key={j} className={`w-2 h-2 rounded-full ${j < (s.strength || 0) ? (s.strength >= 3 ? 'bg-[#EF4444]' : s.strength >= 2 ? 'bg-[#FF6B00]' : 'bg-[#FFA726]') : 'bg-[#2A2A30]'}`} />
                    ))}
                  </div>
                </div>
                );
              })}
            </div>
          </Card>

          {/* Performance Table */}
          {perfData?.assets && (
            <Card className="overflow-hidden">
              <div className="px-5 py-3 border-b border-[#1E1E22]">
                <span className="text-sm font-bold">Performance Historique — Top Signaux</span>
              </div>
              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-[#111114]">
                    <tr className="text-[#6B6B75] uppercase text-[10px] tracking-wider">
                      <th className="text-left p-3">Actif</th>
                      <th className="text-left p-3">Signal</th>
                      <th className="p-3">N</th>
                      <th className="p-3">Win%</th>
                      <th className="p-3">Avg DD%</th>
                      <th className="p-3">Avg Prof%</th>
                      <th className="p-3">P/DD</th>
                      <th className="p-3">Rating</th>
                      <th className="p-3">Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1A1A1E]">
                    {Object.entries(perfData.assets).flatMap(([sym, assetPerf]: [string, any]) => {
                      const hz = assetPerf?.horizons?.moyen || assetPerf?.horizons?.court || {};
                      return (hz.signals || []).filter((s: any) => s.rating === "A" || s.rating === "B").map((s: any, i: number) => (
                        <tr key={`${sym}-${i}`} className="hover:bg-[#FF6B0006]">
                          <td className="p-3 font-mono font-bold text-[#FF6B00]">{sym.replace(".CME","").replace(".CBOT","")}</td>
                          <td className="p-3">{s.signal}</td>
                          <td className="p-3 text-center font-mono">{s.occurrences}</td>
                          <td className="p-3 text-center font-mono font-bold" style={{ color: s.win_rate >= 65 ? "#22C55E" : s.win_rate >= 55 ? "#FFA726" : "#EF4444" }}>
                            {s.win_rate}%
                          </td>
                          <td className="p-3 text-center font-mono">{s.avg_drawdown_pct}%</td>
                          <td className="p-3 text-center font-mono text-[#22C55E]">{s.avg_profit_pct}%</td>
                          <td className="p-3 text-center font-mono">{s.profit_dd_ratio}</td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${s.rating === "A" ? "bg-[#22C55E22] text-[#22C55E]" : "bg-[#FFA72622] text-[#FFA726]"}`}>
                              {s.rating}
                            </span>
                          </td>
                          <td className="p-3 text-center font-mono text-[#FF6B00] font-bold">{s.score}</td>
                        </tr>
                      ));
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
