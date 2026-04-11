"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, KpiCard, Badge, LiveBadge } from "@/components/ui/card";
import { SkeletonGrid, ErrorCard } from "@/components/ui/skeleton";
import { DataFreshness } from "@/components/ui/data-freshness";
import { ConnectivityBanner } from "@/components/ui/connectivity-banner";
import { fmtPremium, fmtK, timeAgo, regimeFromIV, fmtPrice, fmtPct } from "@/lib/format";

const API = "http://localhost:3850";

interface DashData {
  iv: number; ivRank: number; spyPrice: number;
  regime: { label: string; color: string; advice: string };
  dpss: any; gex: any; flowScore: any;
  darkPools: any[]; flowAlerts: any[]; tide: any;
  signals: any[]; sectors: any[];
  sierraFreshness: { file_modified?: string; data_age_seconds?: number; is_stale?: boolean } | null;
}

async function fetchJson(path: string) {
  const r = await fetch(`${API}${path}`, { signal: AbortSignal.timeout(4000) });
  if (!r.ok) return null;
  return r.json();
}

async function loadAll(): Promise<DashData | null> {
  try {
    const [ivRes, regimeRes, flowRes, tideRes, sectorRes, sierraRes] = await Promise.allSettled([
      fetchJson("/api/uw/iv-rank?ticker=SPY"),
      fetchJson("/api/regime/full"),
      fetchJson("/api/uw/flow-alerts"),
      fetchJson("/api/uw/market-tide"),
      fetchJson("/api/uw/sector-etfs"),
      fetchJson("/api/sierra/dashboard"),
    ]);
    const iv = ivRes.status === "fulfilled" ? ivRes.value : null;
    const reg = regimeRes.status === "fulfilled" ? regimeRes.value : null;
    const flow = flowRes.status === "fulfilled" ? flowRes.value : null;
    const tide = tideRes.status === "fulfilled" ? tideRes.value : null;
    const sect = sectorRes.status === "fulfilled" ? sectorRes.value : null;
    const sierra = sierraRes.status === "fulfilled" ? sierraRes.value : null;

    const ivArr = Array.isArray(iv?.data) ? iv.data : Array.isArray(iv) ? iv : [];
    const latest = ivArr[ivArr.length - 1];
    const ivVal = latest ? parseFloat(latest.volatility || 0) * 100 : 0;
    const ivRank = latest ? parseFloat(latest.iv_rank_1y || 0) : 0;
    const spyPrice = latest ? parseFloat(latest.close || 0) : 0;

    return {
      iv: ivVal, ivRank, spyPrice,
      regime: regimeFromIV(ivVal),
      dpss: reg?.dpss || null,
      gex: reg?.gex || null,
      flowScore: reg?.flow || null,
      darkPools: (flow?.data || flow || []).slice(0, 5),
      flowAlerts: (flow?.data || flow || []).slice(0, 3),
      tide: tide?.data || tide || null,
      signals: (sierra?.signals || sierra?.data || []).slice(0, 5),
      sectors: (sect?.data || sect || []).slice(0, 5),
      sierraFreshness: sierra ? {
        file_modified: sierra.file_modified,
        data_age_seconds: sierra.data_age_seconds,
        is_stale: sierra.is_stale,
      } : null,
    };
  } catch { return null; }
}

export default function Dashboard() {
  const [data, setData] = useState<DashData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const refresh = useCallback(async () => {
    const d = await loadAll();
    if (d) { setData(d); setError(false); } else { setError(true); }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const i = setInterval(refresh, 10000);
    return () => clearInterval(i);
  }, [refresh]);

  if (loading && !data) return (
    <div className="p-4 space-y-4">
      <ConnectivityBanner />
      <SkeletonGrid cols={6} />
      <SkeletonGrid cols={3} />
    </div>
  );
  if (!data) return (
    <div className="p-4 space-y-4">
      <ConnectivityBanner />
      <ErrorCard onRetry={refresh} />
    </div>
  );

  const { regime } = data;
  const bullPct = data.tide?.bull_pct ?? 55;

  return (
    <div className="p-4 space-y-4">
      {/* Connectivity banner — shows when tools are disconnected */}
      <ConnectivityBanner />

      {/* Row 1 — KPI Ticker Bar */}
      <div className="h-8 flex items-center gap-4 px-3 bg-[#111114] border border-[#1E1E22] rounded-lg overflow-x-auto">
        <Chip label="VIX" value={data.iv.toFixed(1)} color={data.iv > 25 ? "#EF4444" : "#22C55E"} />
        <Chip label="IV Rank" value={fmtPct(data.ivRank)} color="#FF6B00" />
        <Chip label="SKEW" value="--" color="#6B6B75" />
        <Chip label="VVIX" value="--" color="#6B6B75" />
        <Chip label="SPY" value={fmtPrice(data.spyPrice)} color="#F0F0F0" />
        <Chip label="QQQ" value="--" color="#F0F0F0" />
        <div className="ml-auto"><LiveBadge /></div>
      </div>

      {/* Sierra Data Freshness */}
      {data.sierraFreshness && (
        <DataFreshness
          fileModified={data.sierraFreshness.file_modified}
          dataAgeSeconds={data.sierraFreshness.data_age_seconds}
          isStale={data.sierraFreshness.is_stale}
        />
      )}

      {/* Row 2 — Main Grid */}
      <div className="grid grid-cols-12 gap-4">
        {/* Left Column */}
        <div className="col-span-4 space-y-3">
          <Card className="p-5 text-center" style={{ background: `${regime.color}08`, borderColor: `${regime.color}44` }}>
            <div className="text-3xl font-black tracking-wider" style={{ color: regime.color }}>{regime.label}</div>
            <div className="text-xs mt-2" style={{ color: regime.color }}>{regime.advice}</div>
          </Card>
          <MiniCard title="DPSS" value={data.dpss?.value ?? "--"} signal={data.dpss?.signal} />
          <MiniCard title="Net GEX" value={data.gex?.net ? fmtK(data.gex.net) : "--"} signal={data.gex?.gamma_mode} />
          <MiniCard title="Flow Score" value={data.flowScore?.value ?? "--"} signal={data.flowScore?.signal} />
          <Card className="p-3 flex items-center justify-center gap-2">
            <span className="text-[10px] text-[#6B6B75] uppercase">Confiance</span>
            {[data.dpss?.signal, data.gex?.gamma_mode, data.flowScore?.signal].map((s, i) => (
              <span key={i} className={`w-2.5 h-2.5 rounded-full ${s ? "bg-[#22C55E]" : "bg-[#2A2A30]"}`} />
            ))}
          </Card>
        </div>

        {/* Center Column */}
        <div className="col-span-5 space-y-3">
          <div className="text-xs text-[#6B6B75] uppercase tracking-widest font-semibold">Market Pulse</div>
          <Card className="overflow-hidden">
            <div className="px-3 py-2 border-b border-[#1E1E22] text-[10px] text-[#6B6B75] uppercase">Dark Pool Prints</div>
            <div className="divide-y divide-[#1E1E22]">
              {data.darkPools.length ? data.darkPools.map((d, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-1.5 text-[11px]">
                  <span className="text-[#6B6B75] w-12">{d.time ? timeAgo(d.time) : "--"}</span>
                  <span className="font-bold w-10">{d.ticker || "--"}</span>
                  <span className="text-[#F0F0F0] flex-1">{d.size ? fmtK(d.size) : "--"}</span>
                  <span>{d.premium ? fmtPremium(d.premium) : "--"}</span>
                  <Badge color={d.side === "BUY" ? "#22C55E" : "#EF4444"}>{d.side || "?"}</Badge>
                </div>
              )) : <div className="p-3 text-[11px] text-[#6B6B75]">Aucun print</div>}
            </div>
          </Card>
          <Card className="overflow-hidden">
            <div className="px-3 py-2 border-b border-[#1E1E22] text-[10px] text-[#6B6B75] uppercase">Flow Alerts</div>
            <div className="divide-y divide-[#1E1E22]">
              {data.flowAlerts.length ? data.flowAlerts.map((a, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-1.5 text-[11px]">
                  <Badge color={a.type === "CALL" ? "#22C55E" : "#EF4444"}>{a.type || "?"}</Badge>
                  <span className="font-bold">{a.ticker || "--"}</span>
                  <span className="text-[#6B6B75] flex-1">{a.premium ? fmtPremium(a.premium) : "--"}</span>
                </div>
              )) : <div className="p-3 text-[11px] text-[#6B6B75]">Aucune alerte</div>}
            </div>
          </Card>
          <Card className="p-3">
            <div className="text-[10px] text-[#6B6B75] uppercase mb-2">Market Tide</div>
            <div className="flex h-3 rounded-full overflow-hidden bg-[#1E1E22]">
              <div className="bg-[#22C55E] transition-all" style={{ width: `${bullPct}%` }} />
              <div className="bg-[#EF4444] flex-1" />
            </div>
            <div className="flex justify-between text-[10px] mt-1">
              <span className="text-[#22C55E]">Calls {bullPct}%</span>
              <span className="text-[#EF4444]">Puts {100 - bullPct}%</span>
            </div>
          </Card>
        </div>

        {/* Right Column */}
        <div className="col-span-3 space-y-3">
          <div className="text-xs text-[#6B6B75] uppercase tracking-widest font-semibold">Signaux Actifs</div>
          <Card className="overflow-hidden">
            <div className="divide-y divide-[#1E1E22]">
              {data.signals.length ? data.signals.map((s, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-1.5 text-[11px]">
                  <span className="text-[#6B6B75] w-10">{s.time ? timeAgo(s.time) : "--"}</span>
                  <span className="font-bold w-8">{s.symbol || "--"}</span>
                  <Badge color={s.direction === "LONG" ? "#22C55E" : "#EF4444"}>{s.direction || "?"}</Badge>
                  <span className="text-[#6B6B75] flex-1 text-right">{s.level ?? "--"}</span>
                  <div className="flex gap-0.5">
                    {[1, 2, 3].map((d) => (
                      <span key={d} className={`w-1.5 h-1.5 rounded-full ${(s.strength || 0) >= d ? "bg-[#FF6B00]" : "bg-[#2A2A30]"}`} />
                    ))}
                  </div>
                </div>
              )) : <div className="p-3 text-[11px] text-[#6B6B75]">Aucun signal</div>}
            </div>
          </Card>
          <Card className="p-3 text-center">
            <div className="text-[10px] text-[#6B6B75] uppercase mb-1">Rotation Sectorielle</div>
            <Badge color={data.iv < 20 ? "#22C55E" : "#EF4444"}>
              {data.iv < 20 ? "RISK ON" : "RISK OFF"}
            </Badge>
          </Card>
          <Card className="p-3 text-center">
            <div className="text-[10px] text-[#6B6B75] uppercase mb-1">Prochain Earnings</div>
            <div className="text-sm font-bold text-[#F0F0F0]">--</div>
            <div className="text-[10px] text-[#6B6B75]">Aucun resultat prevu</div>
          </Card>
        </div>
      </div>

      {/* Row 3 — Quick Links */}
      <div className="grid grid-cols-6 gap-3">
        {[
          { href: "/chain", title: "Chain", desc: "Options chain institutionnelle" },
          { href: "/regime", title: "Regime", desc: "DPSS + GEX + Flow Score" },
          { href: "/greeks", title: "Greeks", desc: "GEX, Vanna, Charm par strike" },
          { href: "/dark-pool", title: "Dark Pool", desc: "Mega prints & whale trades" },
          { href: "/heatmap", title: "Heatmap", desc: "Rotation sectorielle 11 SPDR" },
          { href: "/academie", title: "Academie", desc: "10 modules volatilite & taux" },
        ].map((l) => (
          <Link key={l.href} href={l.href}>
            <Card hover className="p-4">
              <div className="text-sm font-bold">{l.title}</div>
              <div className="text-[10px] text-[#6B6B75] mt-1">{l.desc}</div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

function Chip({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center gap-1.5 whitespace-nowrap">
      <span className="text-[9px] text-[#6B6B75] uppercase">{label}</span>
      <span className="text-[11px] font-bold font-mono" style={{ color }}>{value}</span>
    </div>
  );
}

function MiniCard({ title, value, signal }: { title: string; value: string | number; signal?: string | null }) {
  return (
    <Card className="p-3 flex items-center justify-between">
      <div>
        <div className="text-[9px] text-[#6B6B75] uppercase">{title}</div>
        <div className="text-lg font-extrabold font-mono text-[#F0F0F0]">{value}</div>
      </div>
      {signal && <Badge color="#FF6B00">{signal}</Badge>}
    </Card>
  );
}
