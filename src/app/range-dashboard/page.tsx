"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader, Card, LiveBadge, Badge, KpiCard } from "@/components/ui/card";
import { fmtNum, fmtPct } from "@/lib/format";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts";

const API = "http://localhost:3850";

// Assets with TWS symbols for live data
const ASSET_GROUPS = [
  {
    name: "Indices", color: "#FF6B00", assets: [
      { id: "SPY", name: "S&P 500 (SPY)", tws: "SPY" },
      { id: "QQQ", name: "Nasdaq 100 (QQQ)", tws: "QQQ" },
      { id: "IWM", name: "Russell 2000 (IWM)", tws: "IWM" },
    ],
  },
  {
    name: "Volatilite", color: "#EF4444", assets: [
      { id: "VIX", name: "VIX", tws: "VIX" },
      { id: "VVIX", name: "VVIX", tws: "VVIX" },
      { id: "SKEW", name: "SKEW", tws: "SKEW" },
    ],
  },
  {
    name: "FX", color: "#42A5F5", assets: [
      { id: "EURUSD", name: "EUR/USD", tws: "EURUSD" },
      { id: "GBPUSD", name: "GBP/USD", tws: "GBPUSD" },
      { id: "USDJPY", name: "USD/JPY", tws: "USDJPY" },
      { id: "AUDUSD", name: "AUD/USD", tws: "AUDUSD" },
      { id: "USDCAD", name: "USD/CAD", tws: "USDCAD" },
      { id: "USDCHF", name: "USD/CHF", tws: "USDCHF" },
    ],
  },
  {
    name: "Stress", color: "#AB47BC", assets: [
      { id: "TLT", name: "20Y Treas. (TLT)", tws: "TLT" },
      { id: "HYG", name: "High Yield (HYG)", tws: "HYG" },
      { id: "BTAL", name: "Anti-Beta (BTAL)", tws: "BTAL" },
      { id: "EEM", name: "Emerging (EEM)", tws: "EEM" },
      { id: "UVXY", name: "UVXY", tws: "UVXY" },
      { id: "SVXY", name: "SVXY", tws: "SVXY" },
    ],
  },
];

interface AssetData {
  id: string;
  name: string;
  price: number | null;
  change: number | null;
  changePct: number | null;
  high: number | null;
  low: number | null;
  rvDaily: number | null; // Realized Vol 1D = |close - prev_close| / prev_close * 100
  volume: number | null;
}

export default function RangeDashboardPage() {
  const [data, setData] = useState<Record<string, AssetData>>({});
  const [ivData, setIvData] = useState<Record<string, { iv: number; hv: number }>>({});
  const [loading, setLoading] = useState(true);
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const [ivHistory, setIvHistory] = useState<any[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch TWS market data
      const [volRes, fxRes, stressRes] = await Promise.allSettled([
        fetch(`${API}/api/market/vol-regime`).then(r => r.json()),
        fetch(`${API}/api/market/fx-matrix`).then(r => r.json()),
        fetch(`${API}/api/market/stress`).then(r => r.json()),
      ]);

      const vol = volRes.status === "fulfilled" ? volRes.value : {};
      const fx = fxRes.status === "fulfilled" ? fxRes.value : {};
      const stress = stressRes.status === "fulfilled" ? stressRes.value : {};
      const all = { ...vol, ...fx, ...stress };

      const parsed: Record<string, AssetData> = {};
      for (const group of ASSET_GROUPS) {
        for (const asset of group.assets) {
          const twsData = all[asset.tws];
          if (twsData && !twsData.error) {
            const price = twsData.price || twsData.last;
            const close = twsData.close;
            const changePct = twsData.changePct;
            // RV Daily = |daily return| in %
            const rvDaily = price && close && close !== 0 ? Math.abs((price - close) / close * 100) : null;
            parsed[asset.id] = {
              id: asset.id,
              name: asset.name,
              price,
              change: twsData.change,
              changePct,
              high: twsData.high,
              low: twsData.low,
              rvDaily,
              volume: twsData.volume,
            };
          } else {
            parsed[asset.id] = { id: asset.id, name: asset.name, price: null, change: null, changePct: null, high: null, low: null, rvDaily: null, volume: null };
          }
        }
      }
      setData(parsed);

      // Fetch IV/HV for main assets
      const ivFetches = ["SPY", "QQQ", "IWM", "TLT", "HYG", "EEM"].map(async ticker => {
        try {
          const res = await fetch(`${API}/api/uw/iv-rank?ticker=${ticker}`).then(r => r.json());
          const arr = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
          const last = arr[arr.length - 1];
          if (last) {
            return {
              ticker,
              iv: last.volatility ? parseFloat(last.volatility) * 100 : 0,
              hv: 0, // Will be filled from realized-vol
            };
          }
          return null;
        } catch { return null; }
      });

      const ivResults = await Promise.all(ivFetches);
      const ivMap: Record<string, { iv: number; hv: number }> = {};
      ivResults.forEach(r => { if (r) ivMap[r.ticker] = { iv: r.iv, hv: r.hv }; });
      setIvData(ivMap);

    } catch { }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30 * 60 * 1000); // Refresh every 30 min
    return () => clearInterval(t);
  }, [load]);

  // Load IV history for selected asset
  useEffect(() => {
    if (!selectedAsset) return;
    fetch(`${API}/api/uw/iv-rank?ticker=${selectedAsset}`)
      .then(r => r.json())
      .then(res => {
        const arr = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        setIvHistory(arr.slice(-30).map((d: any) => ({
          date: (d.date || "").slice(5),
          close: d.close ? parseFloat(d.close) : null,
          iv: d.volatility ? parseFloat(d.volatility) * 100 : null,
          ivRank: d.iv_rank_1y ? parseFloat(d.iv_rank_1y) : null,
        })));
      })
      .catch(() => setIvHistory([]));
  }, [selectedAsset]);

  const allAssets = ASSET_GROUPS.flatMap(g => g.assets.map(a => ({ ...a, group: g.name, groupColor: g.color })));
  const upCount = Object.values(data).filter(d => (d.changePct ?? 0) > 0).length;
  const downCount = Object.values(data).filter(d => (d.changePct ?? 0) < 0).length;
  const avgRV = (() => {
    const rvs = Object.values(data).map(d => d.rvDaily).filter((v): v is number => v !== null);
    return rvs.length ? rvs.reduce((s, v) => s + v, 0) / rvs.length : 0;
  })();

  if (loading) return (
    <div className="p-4">
      <PageHeader title="Range Dashboard" subtitle="Performance et volatilite realisee live" />
      <div className="text-center py-20 text-[#6B6B75]">Chargement des donnees marche...</div>
    </div>
  );

  const selected = selectedAsset ? data[selectedAsset] : null;

  return (
    <div className="p-4">
      <PageHeader title="Range Dashboard" subtitle="Performance live, RV daily et IV/HV — donnees TWS + UW">
        <button onClick={load} className="px-3 py-1.5 bg-[#111114] border border-[#1E1E22] rounded-lg text-xs hover:border-[#FF6B00] transition-colors">
          Rafraichir
        </button>
        <LiveBadge />
      </PageHeader>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <KpiCard label="Hausse" value={upCount} color="#22C55E" />
        <KpiCard label="Baisse" value={downCount} color="#EF4444" />
        <KpiCard label="RV Daily Moy." value={`${avgRV.toFixed(2)}%`} color="#AB47BC" sublabel="Realized Vol 1D" />
        <KpiCard label="MAJ" value={new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} color="#FF6B00" sublabel="Donnees TWS Live" />
      </div>

      {/* Main Table */}
      <Card className="overflow-hidden mb-4">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-[#0A0A0E]">
                <th className="sticky left-0 z-20 bg-[#0A0A0E] p-2.5 text-left text-[10px] text-[#6B6B75] border-b border-r border-[#1E1E22] min-w-[130px]">Actif</th>
                <th className="p-2 text-right text-[10px] text-[#6B6B75] border-b border-[#1E1E22] min-w-[80px]">Prix</th>
                <th className="p-2 text-right text-[10px] text-[#6B6B75] border-b border-[#1E1E22] min-w-[70px]">Var%</th>
                <th className="p-2 text-right text-[10px] text-[#6B6B75] border-b border-[#1E1E22] min-w-[70px] text-[#AB47BC]">% RV 1D</th>
                <th className="p-2 text-right text-[10px] text-[#6B6B75] border-b border-[#1E1E22] min-w-[80px]">High</th>
                <th className="p-2 text-right text-[10px] text-[#6B6B75] border-b border-[#1E1E22] min-w-[80px]">Low</th>
                <th className="p-2 text-right text-[10px] text-[#6B6B75] border-b border-[#1E1E22] min-w-[80px]">Range 1D</th>
                <th className="p-2 text-right text-[10px] text-[#6B6B75] border-b border-[#1E1E22] min-w-[70px]">IV%</th>
                <th className="p-2 text-center text-[10px] text-[#6B6B75] border-b border-[#1E1E22] min-w-[90px]">Position / Range</th>
              </tr>
            </thead>
            <tbody>
              {ASSET_GROUPS.map(group => (
                <>
                  <tr key={`hdr-${group.name}`}>
                    <td colSpan={9} className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[2px] border-b border-[#1E1E22]" style={{ color: group.color }}>
                      {group.name}
                    </td>
                  </tr>
                  {group.assets.map(asset => {
                    const d = data[asset.id];
                    if (!d) return null;
                    const iv = ivData[asset.id]?.iv;
                    const range1D = d.high && d.low ? d.high - d.low : null;
                    const range1Dpct = d.high && d.low && d.price ? ((d.high - d.low) / d.price * 100) : null;
                    // Position within daily range (0% = at low, 100% = at high)
                    const posInRange = d.high && d.low && d.price && d.high !== d.low
                      ? ((d.price - d.low) / (d.high - d.low) * 100) : null;

                    return (
                      <tr key={asset.id}
                        className={`cursor-pointer transition-colors ${selectedAsset === asset.id ? "bg-[#FF6B0010]" : "hover:bg-[#FFFFFF04]"}`}
                        onClick={() => setSelectedAsset(selectedAsset === asset.id ? null : asset.id)}
                      >
                        <td className="sticky left-0 z-10 bg-[#111114] p-2 border-b border-r border-[#1E1E22]">
                          <span className="font-mono font-bold text-[12px]" style={{ color: group.color }}>{asset.id}</span>
                          <span className="text-[9px] text-[#6B6B75] ml-1.5">{asset.name.replace(asset.id, "").replace("()", "").trim()}</span>
                        </td>
                        <td className="p-2 text-right border-b border-[#1E1E22] font-mono text-white">
                          {d.price ? d.price.toFixed(d.price > 100 ? 2 : 4) : "--"}
                        </td>
                        <td className="p-2 text-right border-b border-[#1E1E22]">
                          <span className="font-mono font-bold" style={{ color: (d.changePct ?? 0) >= 0 ? "#22C55E" : "#EF4444" }}>
                            {d.changePct != null ? `${d.changePct >= 0 ? "+" : ""}${d.changePct.toFixed(2)}%` : "--"}
                          </span>
                        </td>
                        <td className="p-2 text-right border-b border-[#1E1E22]">
                          {d.rvDaily != null ? (
                            <span className="font-mono font-bold text-[#AB47BC]">{d.rvDaily.toFixed(3)}%</span>
                          ) : "--"}
                        </td>
                        <td className="p-2 text-right border-b border-[#1E1E22] font-mono text-[#6B6B75]">
                          {d.high ? d.high.toFixed(d.high > 100 ? 2 : 4) : "--"}
                        </td>
                        <td className="p-2 text-right border-b border-[#1E1E22] font-mono text-[#6B6B75]">
                          {d.low ? d.low.toFixed(d.low > 100 ? 2 : 4) : "--"}
                        </td>
                        <td className="p-2 text-right border-b border-[#1E1E22]">
                          {range1Dpct != null ? (
                            <span className="font-mono text-[#FFA726]">{range1Dpct.toFixed(2)}%</span>
                          ) : "--"}
                        </td>
                        <td className="p-2 text-right border-b border-[#1E1E22]">
                          {iv ? <span className="font-mono text-[#42A5F5]">{iv.toFixed(1)}%</span> : <span className="text-[#555]">--</span>}
                        </td>
                        <td className="p-2 border-b border-[#1E1E22]">
                          {posInRange != null ? (
                            <div className="flex items-center gap-1.5">
                              <div className="flex-1 h-2 bg-[#1E1E22] rounded-full overflow-hidden">
                                <div className="h-full rounded-full" style={{
                                  width: `${Math.min(100, Math.max(0, posInRange))}%`,
                                  background: posInRange > 70 ? "#22C55E" : posInRange < 30 ? "#EF4444" : "#FFA726",
                                }} />
                              </div>
                              <span className="text-[9px] font-mono text-[#6B6B75] w-8 text-right">{posInRange.toFixed(0)}%</span>
                            </div>
                          ) : "--"}
                        </td>
                      </tr>
                    );
                  })}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Detail panel */}
      {selected && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          {/* IV History Chart */}
          <Card className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-sm font-bold text-[#FF6B00]">{selected.id}</span>
              <span className="text-xs text-[#6B6B75]">IV & Prix — 30 jours</span>
            </div>
            {ivHistory.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={ivHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E1E22" />
                  <XAxis dataKey="date" tick={{ fill: "#6B6B75", fontSize: 9 }} />
                  <YAxis tick={{ fill: "#6B6B75", fontSize: 9 }} />
                  <Tooltip contentStyle={{ background: "#111114", border: "1px solid #1E1E22", borderRadius: 8, fontSize: 11 }} />
                  <Bar dataKey="iv" fill="#AB47BC" name="IV %" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-10 text-[#6B6B75] text-xs">Pas de donnees IV disponibles pour {selected.id}</div>
            )}
          </Card>

          {/* Stats */}
          <Card className="p-4">
            <div className="text-sm font-bold mb-3">Analyse {selected.id}</div>
            <div className="space-y-2">
              <div className="flex justify-between items-center p-2.5 rounded-lg bg-[#0A0A0E]">
                <span className="text-xs text-[#6B6B75]">Prix actuel</span>
                <span className="font-mono font-bold text-white">{selected.price?.toFixed(2) ?? "--"}</span>
              </div>
              <div className="flex justify-between items-center p-2.5 rounded-lg bg-[#0A0A0E]">
                <span className="text-xs text-[#6B6B75]">Variation</span>
                <span className="font-mono font-bold" style={{ color: (selected.changePct ?? 0) >= 0 ? "#22C55E" : "#EF4444" }}>
                  {selected.changePct != null ? `${selected.changePct >= 0 ? "+" : ""}${selected.changePct.toFixed(2)}%` : "--"}
                </span>
              </div>
              <div className="flex justify-between items-center p-2.5 rounded-lg bg-[#AB47BC10] border border-[#AB47BC22]">
                <span className="text-xs font-semibold text-[#AB47BC]">% RV Daily (1D)</span>
                <span className="font-mono text-lg font-black text-[#AB47BC]">
                  {selected.rvDaily != null ? `${selected.rvDaily.toFixed(3)}%` : "--"}
                </span>
              </div>
              <div className="flex justify-between items-center p-2.5 rounded-lg bg-[#0A0A0E]">
                <span className="text-xs text-[#6B6B75]">Range 1D (H-L)</span>
                <span className="font-mono font-bold text-[#FFA726]">
                  {selected.high && selected.low ? `${(selected.high - selected.low).toFixed(2)}` : "--"}
                </span>
              </div>
              <div className="flex justify-between items-center p-2.5 rounded-lg bg-[#0A0A0E]">
                <span className="text-xs text-[#6B6B75]">Range 1D %</span>
                <span className="font-mono font-bold text-[#FFA726]">
                  {selected.high && selected.low && selected.price
                    ? `${((selected.high - selected.low) / selected.price * 100).toFixed(2)}%` : "--"}
                </span>
              </div>
              {ivData[selected.id] && (
                <div className="flex justify-between items-center p-2.5 rounded-lg bg-[#0A0A0E]">
                  <span className="text-xs text-[#6B6B75]">IV (implicite)</span>
                  <span className="font-mono font-bold text-[#42A5F5]">{ivData[selected.id].iv.toFixed(1)}%</span>
                </div>
              )}
              <div className="p-3 rounded-lg bg-[#FF6B0008] border border-[#FF6B0022]">
                <div className="text-[10px] font-bold text-[#FF6B00] uppercase tracking-wider mb-1">RV Daily</div>
                <p className="text-[11px] text-[#6B6B75] leading-relaxed">
                  La Realized Volatility 1D mesure le mouvement absolu du prix sur la journee : |close - prev_close| / prev_close.
                  C'est la volatilite effectivement realisee, a comparer avec la volatilite implicite (IV) des options.
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

{/* empty — no footer text */}
    </div>
  );
}
