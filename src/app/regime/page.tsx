"use client";

import { useState, useEffect, useMemo } from "react";
import { PageHeader, LiveBadge, Card, Badge } from "@/components/ui/card";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
  ResponsiveContainer, Area, AreaChart
} from "recharts";

const REGIME_COLORS: Record<string, string> = {
  RISK_ON: "#22C55E",
  PRUDENT: "#42A5F5",
  DEFENSIF: "#FFA726",
  HEDGE: "#EF4444",
};

const REGIME_INSTRUMENTS: Record<string, string> = {
  RISK_ON: "TQQQ x3",
  PRUDENT: "QLD x2",
  DEFENSIF: "QQQ x1",
  HEDGE: "BTAL",
};

export default function RegimePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  async function loadRegime() {
    setLoading(true);
    try {
      const resp = await fetch("http://localhost:3850/api/regime/full");
      const json = await resp.json();
      setData(json);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  useEffect(() => { loadRegime(); const i = setInterval(loadRegime, 60000); return () => clearInterval(i); }, []);

  const regime = data?.regime || {};
  const layers = data?.layers || {};
  const dp = layers.dark_pool || {};
  const gex = layers.gex || {};
  const flow = layers.flow || {};
  const color = REGIME_COLORS[regime.regime] || "#6B6B75";
  const history: any[] = data?.history || [];
  const last30 = history.slice(-30);

  // Signals summary stats
  const signalsSummary = useMemo(() => {
    if (!last30.length) return null;
    const counts: Record<string, number> = {};
    let longestStreak = 0;
    let currentStreak = 1;
    let longestRegime = last30[0]?.regime || "";
    let currentRegime = last30[0]?.regime || "";

    for (let i = 0; i < last30.length; i++) {
      const r = last30[i]?.regime || "UNKNOWN";
      counts[r] = (counts[r] || 0) + 1;
      if (i > 0) {
        if (r === last30[i - 1]?.regime) {
          currentStreak++;
        } else {
          if (currentStreak > longestStreak) {
            longestStreak = currentStreak;
            longestRegime = last30[i - 1]?.regime || "";
          }
          currentStreak = 1;
        }
      }
    }
    // Check last streak
    if (currentStreak > longestStreak) {
      longestStreak = currentStreak;
      longestRegime = last30[last30.length - 1]?.regime || "";
    }
    currentRegime = last30[last30.length - 1]?.regime || "";

    // Current streak (from end)
    let curStreak = 1;
    for (let i = last30.length - 2; i >= 0; i--) {
      if (last30[i]?.regime === currentRegime) curStreak++;
      else break;
    }

    return { counts, longestStreak, longestRegime, currentStreak: curStreak, currentRegime };
  }, [last30]);

  return (
    <div className="p-6">
      <PageHeader title="Regime Engine" subtitle="VIX Regime Switching — Dark Pool + GEX + Flow">
        <button onClick={loadRegime} className="px-3 py-1.5 bg-[#111114] border border-[#1E1E22] rounded-lg text-xs hover:border-[#FF6B00] transition-colors">
          Rafraichir
        </button>
        <LiveBadge />
      </PageHeader>

      {loading ? (
        <div className="text-center py-20 text-[#6B6B75]">Calcul du regime en cours...</div>
      ) : (
        <>
          {/* Giant Badge */}
          <Card className={`p-10 text-center mb-6 ${data?.in_transition ? 'animate-pulse' : ''}`}>
            <div className="text-6xl font-black tracking-wider mb-2" style={{ color }}>
              {regime.label || "--"}
            </div>
            <div className="text-2xl font-semibold mb-2" style={{ color }}>
              {regime.instrument || "--"}
            </div>
            <div className="text-sm text-[#6B6B75]">
              Confiance: {regime.confidence || 0}%
            </div>
            <div className="w-48 h-1.5 bg-[#1E1E22] rounded-full mx-auto mt-2 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${regime.confidence || 0}%`, background: color }} />
            </div>
            {data?.in_transition && (
              <div className="mt-3 text-sm text-[#FFA726]">EN TRANSITION — confirmation en cours</div>
            )}
            {/* Layer chips */}
            <div className="flex gap-3 justify-center mt-4">
              <Badge color={dp.signal === "ACCUMULATION" ? "#22C55E" : dp.signal === "DISTRIBUTION" ? "#EF4444" : "#FFA726"}>
                DP: {dp.signal || "--"}
              </Badge>
              <Badge color={gex.signal === "LONG_GAMMA" ? "#22C55E" : "#EF4444"}>
                GEX: {gex.signal || "--"}
              </Badge>
              <Badge color={flow.signal === "GREED" || flow.signal === "BULLISH" ? "#22C55E" : flow.signal === "FEAR" || flow.signal === "BEARISH" ? "#EF4444" : "#FFA726"}>
                Flow: {flow.signal || "--"}
              </Badge>
            </div>
          </Card>

          {/* 3 Layer KPIs */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <Card className="p-5 text-center">
              <h3 className="text-xs text-[#6B6B75] uppercase tracking-widest mb-3">Dark Pool (DPSS)</h3>
              <div className="text-3xl font-extrabold font-mono" style={{ color: (dp.dpss || 0) > 0.6 ? "#22C55E" : (dp.dpss || 0) < 0.4 ? "#EF4444" : "#FFA726" }}>
                {dp.dpss?.toFixed(4) || "--"}
              </div>
              <Badge color={(dp.dpss || 0) > 0.6 ? "#22C55E" : (dp.dpss || 0) < 0.4 ? "#EF4444" : "#FFA726"} className="mt-2">
                {dp.signal || "--"}
              </Badge>
              <div className="text-xs text-[#6B6B75] mt-3">
                {dp.big_prints_count || 0} prints institutionnels
              </div>
            </Card>

            <Card className="p-5 text-center">
              <h3 className="text-xs text-[#6B6B75] uppercase tracking-widest mb-3">GEX — Gamma Exposure</h3>
              <div className="text-3xl font-extrabold font-mono" style={{ color: gex.signal === "LONG_GAMMA" ? "#22C55E" : "#EF4444" }}>
                {gex.net_gex?.toLocaleString() || "--"}
              </div>
              <Badge color={gex.signal === "LONG_GAMMA" ? "#22C55E" : "#EF4444"} className="mt-2">
                {gex.signal === "LONG_GAMMA" ? "LONG GAMMA" : "SHORT GAMMA"}
              </Badge>
              <div className="text-xs text-[#6B6B75] mt-3">
                Gamma Flip: <span className="text-[#FF6B00] font-semibold">{gex.gamma_flip_point?.toFixed(1) || "--"}</span>
              </div>
            </Card>

            <Card className="p-5 text-center">
              <h3 className="text-xs text-[#6B6B75] uppercase tracking-widest mb-3">Flow Score (Options)</h3>
              <div className="text-3xl font-extrabold font-mono" style={{ color: (flow.flow_score || 0) > 0.3 ? "#22C55E" : (flow.flow_score || 0) < -0.3 ? "#EF4444" : "#FFA726" }}>
                {flow.flow_score?.toFixed(4) || "--"}
              </div>
              <Badge color={(flow.flow_score || 0) > 0.3 ? "#22C55E" : (flow.flow_score || 0) < -0.3 ? "#EF4444" : "#FFA726"} className="mt-2">
                {flow.signal || "--"}
              </Badge>
              <div className="text-xs text-[#6B6B75] mt-3">
                Whales: <span className="text-[#22C55E]">{flow.whale_calls || 0}C</span> / <span className="text-[#EF4444]">{flow.whale_puts || 0}P</span>
              </div>
            </Card>
          </div>

          {/* Decision Matrix */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <Card className="p-5">
              <h3 className="text-xs text-[#6B6B75] uppercase tracking-widest mb-4">Matrice de Decision</h3>
              <div className="grid grid-cols-[auto_1fr_1fr] gap-0 text-sm">
                <div />
                <div className="text-center p-2 text-[#EF4444] font-semibold text-xs">DISTRIBUTION</div>
                <div className="text-center p-2 text-[#22C55E] font-semibold text-xs">ACCUMULATION</div>
                <div className="p-2 text-[#22C55E] font-semibold text-xs [writing-mode:vertical-lr] rotate-180">GEX+</div>
                <MatrixCell regime="DEFENSIF" active={regime.regime_base === "DEFENSIF"} />
                <MatrixCell regime="RISK_ON" active={regime.regime_base === "RISK_ON"} />
                <div className="p-2 text-[#EF4444] font-semibold text-xs [writing-mode:vertical-lr] rotate-180">GEX-</div>
                <MatrixCell regime="HEDGE" active={regime.regime_base === "HEDGE"} />
                <MatrixCell regime="PRUDENT" active={regime.regime_base === "PRUDENT"} />
              </div>
            </Card>

            <Card className="p-5">
              <h3 className="text-xs text-[#6B6B75] uppercase tracking-widest mb-4">Historique (30 jours)</h3>
              <div className="flex h-6 rounded-md overflow-hidden">
                {last30.map((d: any, i: number) => (
                  <div
                    key={i}
                    className="flex-1 hover:opacity-80 transition-opacity"
                    style={{ background: REGIME_COLORS[d.regime] || "#6B6B75" }}
                    title={`${d.date} — ${d.regime} (${d.confidence}%)`}
                  />
                ))}
              </div>
              {history.length > 0 && (
                <div className="flex justify-between mt-2 text-[10px] text-[#6B6B75]">
                  <span>{history[Math.max(0, history.length - 30)]?.date}</span>
                  <span>{history[history.length - 1]?.date}</span>
                </div>
              )}
            </Card>
          </div>

          {/* ============================================================ */}
          {/* HISTORY CHARTS SECTION                                       */}
          {/* ============================================================ */}

          {last30.length > 0 && (
            <>
              {/* Signals Summary Card */}
              {signalsSummary && (
                <Card className="p-4 mb-6">
                  <h3 className="text-xs text-[#6B6B75] uppercase tracking-widest mb-3">Resume des Signaux (30 jours)</h3>
                  <div className="grid grid-cols-5 gap-3">
                    {Object.entries(signalsSummary.counts).map(([r, count]) => (
                      <div key={r} className="text-center">
                        <div className="text-lg font-extrabold font-mono" style={{ color: REGIME_COLORS[r] || "#6B6B75" }}>
                          {count}j
                        </div>
                        <div className="text-[10px] text-[#6B6B75] uppercase">{r.replace("_", " ")}</div>
                      </div>
                    ))}
                    <div className="text-center">
                      <div className="text-lg font-extrabold font-mono text-[#FF6B00]">
                        {signalsSummary.longestStreak}j
                      </div>
                      <div className="text-[10px] text-[#6B6B75] uppercase">Plus longue serie</div>
                      <div className="text-[9px]" style={{ color: REGIME_COLORS[signalsSummary.longestRegime] || "#6B6B75" }}>
                        {signalsSummary.longestRegime.replace("_", " ")}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-extrabold font-mono" style={{ color: REGIME_COLORS[signalsSummary.currentRegime] || "#6B6B75" }}>
                        {signalsSummary.currentStreak}j
                      </div>
                      <div className="text-[10px] text-[#6B6B75] uppercase">Serie en cours</div>
                      <div className="text-[9px]" style={{ color: REGIME_COLORS[signalsSummary.currentRegime] || "#6B6B75" }}>
                        {signalsSummary.currentRegime.replace("_", " ")}
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {/* DPSS History Chart */}
              <Card className="p-5 mb-6">
                <h3 className="text-xs text-[#6B6B75] uppercase tracking-widest mb-4">DPSS — Historique 30 jours</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={last30} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <defs>
                      <linearGradient id="dpssGreen" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22C55E" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E1E22" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#6B6B75" }} tickLine={false} axisLine={{ stroke: "#1E1E22" }} />
                    <YAxis domain={[0, 1]} tick={{ fontSize: 10, fill: "#6B6B75" }} tickLine={false} axisLine={{ stroke: "#1E1E22" }} />
                    <Tooltip
                      contentStyle={{ background: "#1A1A1E", border: "1px solid #2A2A30", borderRadius: 8, fontSize: 11 }}
                      labelStyle={{ color: "#6B6B75" }}
                    />
                    <ReferenceLine y={0.60} stroke="#22C55E" strokeDasharray="4 4" label={{ value: "0.60", position: "right", fill: "#22C55E", fontSize: 10 }} />
                    <ReferenceLine y={0.40} stroke="#EF4444" strokeDasharray="4 4" label={{ value: "0.40", position: "right", fill: "#EF4444", fontSize: 10 }} />
                    <Area type="monotone" dataKey="dpss" stroke="#FF6B00" strokeWidth={2} fill="url(#dpssGreen)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </Card>

              {/* GEX Net History Chart */}
              <Card className="p-5 mb-6">
                <h3 className="text-xs text-[#6B6B75] uppercase tracking-widest mb-4">GEX Net — Historique 30 jours</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={last30} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <defs>
                      <linearGradient id="gexPos" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22C55E" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gexNeg" x1="0" y1="1" x2="0" y2="0">
                        <stop offset="5%" stopColor="#EF4444" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E1E22" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#6B6B75" }} tickLine={false} axisLine={{ stroke: "#1E1E22" }} />
                    <YAxis tick={{ fontSize: 10, fill: "#6B6B75" }} tickLine={false} axisLine={{ stroke: "#1E1E22" }} />
                    <Tooltip
                      contentStyle={{ background: "#1A1A1E", border: "1px solid #2A2A30", borderRadius: 8, fontSize: 11 }}
                      labelStyle={{ color: "#6B6B75" }}
                    />
                    <ReferenceLine y={0} stroke="#6B6B75" strokeDasharray="2 2" />
                    <Area
                      type="monotone"
                      dataKey="gex_net"
                      stroke="#22C55E"
                      strokeWidth={2}
                      fill="url(#gexPos)"
                      dot={false}
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Card>

              {/* Flow Score History Chart */}
              <Card className="p-5 mb-6">
                <h3 className="text-xs text-[#6B6B75] uppercase tracking-widest mb-4">Flow Score — Historique 30 jours</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={last30} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <defs>
                      <linearGradient id="flowPos" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22C55E" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E1E22" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#6B6B75" }} tickLine={false} axisLine={{ stroke: "#1E1E22" }} />
                    <YAxis domain={[-1, 1]} tick={{ fontSize: 10, fill: "#6B6B75" }} tickLine={false} axisLine={{ stroke: "#1E1E22" }} />
                    <Tooltip
                      contentStyle={{ background: "#1A1A1E", border: "1px solid #2A2A30", borderRadius: 8, fontSize: 11 }}
                      labelStyle={{ color: "#6B6B75" }}
                    />
                    <ReferenceLine y={0.3} stroke="#22C55E" strokeDasharray="4 4" label={{ value: "0.30", position: "right", fill: "#22C55E", fontSize: 10 }} />
                    <ReferenceLine y={-0.3} stroke="#EF4444" strokeDasharray="4 4" label={{ value: "-0.30", position: "right", fill: "#EF4444", fontSize: 10 }} />
                    <ReferenceLine y={0} stroke="#6B6B75" strokeDasharray="2 2" />
                    <Area type="monotone" dataKey="flow_score" stroke="#FF6B00" strokeWidth={2} fill="url(#flowPos)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}

function MatrixCell({ regime, active }: { regime: string; active: boolean }) {
  const color = REGIME_COLORS[regime];
  return (
    <div
      className={`p-4 rounded-lg text-center transition-all ${active ? 'ring-2 ring-[#FF6B00] shadow-lg shadow-[#FF6B0033]' : ''}`}
      style={{ background: `${color}15` }}
    >
      <div className="font-bold text-sm" style={{ color }}>{regime.replace("_", " ")}</div>
      <div className="text-xs text-[#6B6B75] mt-1">{REGIME_INSTRUMENTS[regime]}</div>
    </div>
  );
}
