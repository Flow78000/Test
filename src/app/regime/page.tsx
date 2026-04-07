"use client";

import { useState, useEffect } from "react";
import { PageHeader, LiveBadge, Card, Badge } from "@/components/ui/card";

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
      const resp = await fetch("http://localhost:3849/api/regime/full");
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
                {(data?.history || []).slice(-30).map((d: any, i: number) => (
                  <div
                    key={i}
                    className="flex-1 hover:opacity-80 transition-opacity"
                    style={{ background: REGIME_COLORS[d.regime] || "#6B6B75" }}
                    title={`${d.date} — ${d.regime} (${d.confidence}%)`}
                  />
                ))}
              </div>
              {data?.history?.length > 0 && (
                <div className="flex justify-between mt-2 text-[10px] text-[#6B6B75]">
                  <span>{data.history[Math.max(0, data.history.length - 30)]?.date}</span>
                  <span>{data.history[data.history.length - 1]?.date}</span>
                </div>
              )}
            </Card>
          </div>
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
