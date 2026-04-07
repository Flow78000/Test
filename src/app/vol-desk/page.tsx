"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader, LiveBadge, Card, KpiCard, Badge } from "@/components/ui/card";

const API = "http://localhost:3849";

function vixColor(v: number): string {
  if (v < 15) return "#4CAF50";
  if (v <= 25) return "#FFB300";
  return "#EF4444";
}

function fmtNum(n: number | undefined, dec = 2): string {
  return n != null ? Number(n).toFixed(dec) : "--";
}

interface VolRegime {
  vix?: number;
  vix9d?: number;
  vix3m?: number;
  vix6m?: number;
  vvix?: number;
  skew?: number;
  regime?: string;
  [k: string]: any;
}

export default function VolDeskPage() {
  const [data, setData] = useState<VolRegime | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      let res: any;
      try {
        res = await fetch(`${API}/api/market/vol-regime`).then(r => r.json());
      } catch {
        res = await fetch(`${API}/api/uw/iv-rank?ticker=SPY`).then(r => r.json());
      }
      setData(res?.data ?? res ?? {});
    } catch (e: any) {
      setError(e.message || "Serveur indisponible");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const i = setInterval(load, 300_000);
    return () => clearInterval(i);
  }, [load]);

  const vix = data?.vix ?? 0;
  const vix9d = data?.vix9d ?? 0;
  const vix3m = data?.vix3m ?? 0;
  const vix6m = data?.vix6m ?? 0;
  const ratio9dVix = vix ? vix9d / vix : 0;
  const termStructure = vix3m > vix ? "CONTANGO" : "BACKWARDATION";
  const tsBadgeColor = termStructure === "CONTANGO" ? "#4CAF50" : "#EF4444";

  const regime = data?.regime ?? (vix < 15 ? "LOW VOL" : vix <= 25 ? "NORMAL" : "HIGH VOL");
  const regimeColor = vix < 15 ? "#4CAF50" : vix <= 25 ? "#FFB300" : "#EF4444";

  if (loading) return (
    <div className="p-6">
      <PageHeader title="Vol Desk" subtitle="Terminal de volatilite institutionnel" />
      <div className="text-center py-20 text-[#6B6B75]">Chargement...</div>
    </div>
  );

  if (error) return (
    <div className="p-6">
      <PageHeader title="Vol Desk" subtitle="Terminal de volatilite institutionnel" />
      <Card className="p-8 text-center text-red-400">{error}</Card>
    </div>
  );

  return (
    <div className="p-6">
      <PageHeader title="Vol Desk" subtitle="Terminal de volatilite institutionnel">
        <Badge color={tsBadgeColor}>{termStructure}</Badge>
        <button onClick={load} className="px-3 py-1.5 bg-[#111114] border border-[#1E1E22] rounded-lg text-xs hover:border-[#FF6B00] transition-colors">
          Rafraichir
        </button>
        <LiveBadge />
      </PageHeader>

      {/* Row 1 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <KpiCard label="VIX" value={fmtNum(data?.vix)} color={vixColor(vix)} sublabel="Volatilite 30j" />
        <KpiCard label="VIX9D" value={fmtNum(data?.vix9d)} color={vixColor(vix9d)} sublabel="Volatilite 9j" />
        <KpiCard label="VIX3M" value={fmtNum(data?.vix3m)} color={vixColor(vix3m)} sublabel="Volatilite 3 mois" />
        <KpiCard label="VIX6M" value={fmtNum(data?.vix6m)} color={vixColor(vix6m)} sublabel="Volatilite 6 mois" />
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="VVIX" value={fmtNum(data?.vvix)} color="#AB47BC" sublabel="Vol de la vol" />
        <KpiCard label="SKEW" value={fmtNum(data?.skew)} color="#FF6B00" sublabel="Indice d'asymetrie" />
        <KpiCard label="VIX9D / VIX" value={fmtNum(ratio9dVix)} color={ratio9dVix > 1 ? "#EF4444" : "#4CAF50"} sublabel={ratio9dVix > 1 ? "Court terme eleve" : "Stable"} />
        <Card className="p-4 text-center flex flex-col items-center justify-center">
          <div className="text-[10px] text-[#6B6B75] uppercase tracking-widest mb-1">Regime</div>
          <Badge color={regimeColor}>{regime}</Badge>
        </Card>
      </div>
    </div>
  );
}
