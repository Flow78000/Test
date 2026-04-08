"use client";

import { useState, useEffect } from "react";

const API = "http://localhost:3850";

export default function Dashboard() {
  const [vix, setVix] = useState<any>(null);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        // Try backend first
        const healthResp = await fetch(`${API}/api/health`, { signal: AbortSignal.timeout(3000) });
        if (healthResp.ok) {
          setConnected(true);
          // Fetch IV data
          const ivResp = await fetch(`${API}/api/uw/iv-rank?ticker=SPY`);
          if (ivResp.ok) {
            const ivJson = await ivResp.json();
            const data = ivJson?.data || ivJson;
            if (Array.isArray(data) && data.length > 0) {
              const latest = data[data.length - 1];
              setVix({
                iv: (parseFloat(latest.volatility || 0) * 100).toFixed(1),
                ivRank: parseFloat(latest.iv_rank_1y || 0).toFixed(1),
                price: parseFloat(latest.close || 0).toFixed(2),
              });
            }
          }
        }
      } catch {
        setConnected(false);
      }
      setLoading(false);
    }
    load();
    const i = setInterval(load, 60000);
    return () => clearInterval(i);
  }, []);

  const ivVal = vix ? parseFloat(vix.iv) : 0;
  const regime = ivVal > 35 ? "CRISE" : ivVal > 25 ? "STRESS" : ivVal > 18 ? "TRANSITION" : ivVal > 0 ? "CALME" : null;
  const regimeColor = regime === "CRISE" ? "#FF1744" : regime === "STRESS" ? "#EF4444" : regime === "TRANSITION" ? "#FFA726" : regime === "CALME" ? "#22C55E" : "#6B6B75";

  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-6">
        <h1 className="text-2xl font-extrabold">
          FLO<span className="text-[#FF6B00] text-3xl font-black">.</span><span className="text-[#FF6B00]">W</span>
          <span className="text-[#6B6B75] text-lg font-normal ml-3">Dashboard</span>
        </h1>
        <div className="ml-auto flex items-center gap-3">
          <span className={`flex items-center gap-2 text-xs ${connected ? "text-[#22C55E]" : "text-[#EF4444]"}`}>
            <span className={`w-2 h-2 rounded-full ${connected ? "bg-[#22C55E] animate-pulse" : "bg-[#EF4444]"}`} />
            {connected ? "Backend Connecte" : "Backend Hors Ligne"}
          </span>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <KpiCard label="IV SPY" value={vix?.iv || "--"} sublabel="Volatilite Implicite" color={ivVal > 25 ? "#EF4444" : ivVal > 18 ? "#FFA726" : "#22C55E"} />
        <KpiCard label="IV Rank 1Y" value={vix?.ivRank ? vix.ivRank + "%" : "--"} sublabel="Percentile Annuel" color="#FF6B00" />
        <KpiCard label="SPY Close" value={vix?.price ? "$" + vix.price : "--"} sublabel="Dernier Prix" color="#F0F0F0" />
        <KpiCard label="Regime" value={regime || "--"} sublabel={regime ? `IV = ${vix?.iv}%` : "En attente"} color={regimeColor} />
      </div>

      {/* Regime Badge */}
      {regime ? (
        <div className="rounded-xl p-8 text-center mb-6" style={{ background: `${regimeColor}08`, border: `1px solid ${regimeColor}33` }}>
          <div className="text-5xl font-black tracking-wider mb-2" style={{ color: regimeColor }}>{regime}</div>
          <div className="text-lg font-semibold" style={{ color: regimeColor }}>
            {regime === "CALME" && "Conditions stables — Vente de vol, positions directionnelles"}
            {regime === "TRANSITION" && "Prudence — Reduire taille, elargir stops"}
            {regime === "STRESS" && "Credit spreads OTM — Ne pas acheter en directionnel"}
            {regime === "CRISE" && "Protection maximale — Cash, BTAL, puts deep OTM"}
          </div>
        </div>
      ) : (
        <div className="bg-[#111114] border border-[#1E1E22] rounded-xl p-8 text-center mb-6">
          {loading ? (
            <div className="text-xl text-[#6B6B75]">Connexion au serveur...</div>
          ) : (
            <>
              <div className="text-3xl font-black tracking-wider text-[#6B6B75] mb-2">BACKEND REQUIS</div>
              <div className="text-sm text-[#6B6B75] mb-4">Lancez le serveur FastAPI pour activer les donnees live</div>
              <div className="text-sm text-[#6B6B75] font-mono bg-[#08080A] rounded-lg p-4 inline-block">
                cd D:\flo-w\server && python main.py
              </div>
            </>
          )}
        </div>
      )}

      {/* Quick Links */}
      <div className="grid grid-cols-3 gap-4">
        <QuickLink href="/chain" title="Vol Chain" desc="Options chain institutionnelle — GEX, Vanna, Greeks par strike" />
        <QuickLink href="/regime" title="Regime Engine" desc="DPSS + GEX + Flow Score — 4 regimes de marche" />
        <QuickLink href="/signals" title="Signaux Sierra" desc="Mean reversion, vol synthetique — 12 actifs" />
        <QuickLink href="/greeks" title="GEX / Vanna / Charm" desc="Exposition Greeks par strike — SPX, SPY, QQQ" />
        <QuickLink href="/heatmap" title="Heatmap Secteurs" desc="Rotation sectorielle — 11 SPDR sectors avec flow" />
        <QuickLink href="/academie" title="Academie" desc="10 modules — Volatilite, RV Spreads, Taux, Commodities" />
      </div>
    </div>
  );
}

function KpiCard({ label, value, sublabel, color = "#FF6B00" }: { label: string; value: string; sublabel: string; color?: string }) {
  return (
    <div className="bg-[#111114] border border-[#1E1E22] rounded-xl p-4 text-center">
      <div className="text-[10px] text-[#6B6B75] uppercase tracking-widest mb-1">{label}</div>
      <div className="text-2xl font-extrabold font-mono" style={{ color }}>{value}</div>
      <div className="text-[10px] text-[#6B6B75] mt-1">{sublabel}</div>
    </div>
  );
}

function QuickLink({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <a href={href} className="bg-[#111114] border border-[#1E1E22] rounded-xl p-5 hover:border-[#FF6B00] hover:bg-[#16161A] transition-all group">
      <div className="text-base font-bold group-hover:text-[#FF6B00] transition-colors">{title}</div>
      <div className="text-xs text-[#6B6B75] mt-2 leading-relaxed">{desc}</div>
    </a>
  );
}
