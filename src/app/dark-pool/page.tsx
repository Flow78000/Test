"use client";

import { useState, useEffect } from "react";
import { PageHeader, Card, KpiCard, LiveBadge } from "@/components/ui/card";

const API = "http://localhost:3850";

export default function DarkPoolPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const resp = await fetch(`${API}/api/regime/full`);
        const json = await resp.json();
        setData(json);
      } catch { /* silently fail */ }
      setLoading(false);
    }
    load();
    const i = setInterval(load, 60000);
    return () => clearInterval(i);
  }, []);

  const dp = data?.layers?.dark_pool || {};

  return (
    <div className="p-6">
      <PageHeader title="Dark Pool Intelligence" subtitle="Proxy DIX — Sentiment institutionnel via dark pool prints">
        <LiveBadge />
      </PageHeader>

      {/* KPI Row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <KpiCard label="DPSS" value={dp.dpss?.toFixed(4) || "--"} sublabel="Dark Pool Sentiment" color={dp.dpss > 0.6 ? "#22C55E" : dp.dpss < 0.4 ? "#EF4444" : "#FFA726"} />
        <KpiCard label="Signal" value={dp.signal || "--"} sublabel={dp.signal === "ACCUMULATION" ? "Institutionnels achetent" : dp.signal === "DISTRIBUTION" ? "Institutionnels vendent" : "Neutre"} color={dp.signal === "ACCUMULATION" ? "#22C55E" : dp.signal === "DISTRIBUTION" ? "#EF4444" : "#FFA726"} />
        <KpiCard label="Prints Instit." value={dp.big_prints_count?.toString() || "--"} sublabel="> $1M premium" color="#FF6B00" />
        <KpiCard label="Premium Total" value={dp.total_premium ? (dp.total_premium > 1e9 ? (dp.total_premium / 1e9).toFixed(1) + "B" : (dp.total_premium / 1e6).toFixed(0) + "M") : "--"} sublabel="Volume dollar" color="#42A5F5" />
      </div>

      {/* Volume Breakdown */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card className="p-5">
          <h3 className="text-xs text-[#6B6B75] uppercase tracking-widest mb-3">Repartition du Volume</h3>
          <div className="space-y-3">
            {[
              { label: "Bullish (prix >= ask)", value: dp.bullish_volume, color: "#22C55E" },
              { label: "Bearish (prix <= bid)", value: dp.bearish_volume, color: "#EF4444" },
              { label: "Neutre (mid)", value: dp.neutral_volume, color: "#6B6B75" },
            ].map((v) => {
              const total = (dp.bullish_volume || 0) + (dp.bearish_volume || 0) + (dp.neutral_volume || 0);
              const pct = total > 0 ? ((v.value || 0) / total) * 100 : 0;
              return (
                <div key={v.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span style={{ color: v.color }}>{v.label}</span>
                    <span className="font-mono">{(v.value || 0).toLocaleString()} ({pct.toFixed(1)}%)</span>
                  </div>
                  <div className="h-2 bg-[#1E1E22] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: pct + "%", background: v.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-xs text-[#6B6B75] uppercase tracking-widest mb-3">Interpretation</h3>
          <div className="space-y-3 text-xs text-[#6B6B75] leading-relaxed">
            <div className="bg-[#22C55E08] border border-[#22C55E22] rounded-lg p-3">
              <span className="font-bold text-[#22C55E]">DPSS &gt; 0.60 = ACCUMULATION</span><br />
              Les institutionnels achetent agressivement en dark pool. Signal haussier pour les indices.
            </div>
            <div className="bg-[#EF444408] border border-[#EF444422] rounded-lg p-3">
              <span className="font-bold text-[#EF4444]">DPSS &lt; 0.40 = DISTRIBUTION</span><br />
              Les institutionnels vendent. Signal baissier — reduire l&apos;exposition directionnelle.
            </div>
            <div className="bg-[#FFA72608] border border-[#FFA72622] rounded-lg p-3">
              <span className="font-bold text-[#FFA726]">DPSS 0.40-0.60 = NEUTRE</span><br />
              Pas de signal clair. Attendre la confluence avec GEX et Flow Score.
            </div>
          </div>
        </Card>
      </div>

      {!data && !loading && (
        <Card className="p-8 text-center text-[#6B6B75]">
          Backend requis : <code className="bg-[#08080A] px-2 py-1 rounded text-[#FF6B00] text-xs">cd D:\flo-w\server &amp;&amp; python main.py</code>
        </Card>
      )}
    </div>
  );
}
