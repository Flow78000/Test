"use client";

import { useState, useEffect } from "react";
import { PageHeader, Card, LiveBadge, Badge } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar, ReferenceLine } from "recharts";

const ASSETS = [
  { id: "EURUSD", name: "EUR/USD", cls: "FX" },
  { id: "GBPUSD", name: "GBP/USD", cls: "FX" },
  { id: "USDJPY", name: "USD/JPY", cls: "FX" },
  { id: "AUDUSD", name: "AUD/USD", cls: "FX" },
  { id: "USDCAD", name: "USD/CAD", cls: "FX" },
  { id: "USDCHF", name: "USD/CHF", cls: "FX" },
  { id: "10YIELD", name: "10Y Yield", cls: "Taux" },
  { id: "2YZT", name: "2Y (ZT)", cls: "Taux" },
  { id: "5YZF", name: "5Y (ZF)", cls: "Taux" },
  { id: "10YZN", name: "10Y (ZN)", cls: "Taux" },
  { id: "30YZB", name: "30Y (ZB)", cls: "Taux" },
  { id: "GOLDGC", name: "Gold (GC)", cls: "Metaux" },
  { id: "SILVERSI", name: "Silver (SI)", cls: "Metaux" },
  { id: "COPPERHG", name: "Copper (HG)", cls: "Metaux" },
  { id: "CRUDECL", name: "Crude (CL)", cls: "Energie" },
  { id: "NATGASNG", name: "NatGas (NG)", cls: "Energie" },
  { id: "SP500ES", name: "ES", cls: "Indices" },
  { id: "NASDAQNQ", name: "NQ", cls: "Indices" },
  { id: "RUSSELLRTY", name: "RTY", cls: "Indices" },
  { id: "DOWJONESYM", name: "YM", cls: "Indices" },
  { id: "CORNZC", name: "Corn (ZC)", cls: "Agri" },
  { id: "SOYBEANZS", name: "Soy (ZS)", cls: "Agri" },
  { id: "WHEATZW", name: "Wheat (ZW)", cls: "Agri" },
];

const TIMEFRAMES = ["1J", "3J", "1S", "2S", "1M", "3M", "6M", "1A"];

// Bloomberg-style heatmap colors
function bloombergColor(val: number): string {
  if (val > 200) return "#00AA00";
  if (val > 150) return "#00CC44";
  if (val > 120) return "#33DD66";
  if (val > 100) return "#66EE88";
  if (val > 80) return "#99FFAA";
  if (val > 50) return "#CCFFCC";
  if (val > 20) return "#E6FFE6";
  if (val > 0) return "#F0FFF0";
  if (val > -20) return "#FFF0F0";
  if (val > -50) return "#FFCCCC";
  if (val > -100) return "#FF9999";
  return "#FF4444";
}

function bloombergText(val: number): string {
  if (val > 50) return "#000000";
  if (val > 0) return "#003300";
  if (val > -50) return "#330000";
  return "#FFFFFF";
}

// Generate realistic demo data with history
function generateData() {
  const now = new Date();
  return ASSETS.map(asset => {
    // Current values per timeframe
    const values = TIMEFRAMES.map(() => {
      const base = (Math.random() - 0.3) * 300;
      return Math.round(base * 100) / 100;
    });

    // 30-day history
    const history = Array.from({ length: 30 }, (_, i) => {
      const date = new Date(now);
      date.setDate(date.getDate() - (29 - i));
      return {
        date: date.toISOString().slice(5, 10),
        value: (Math.random() - 0.35) * 200,
      };
    });

    // Open/Close analysis
    const todayOpen = (Math.random() - 0.3) * 150;
    const todayClose = todayOpen + (Math.random() - 0.5) * 80;
    const yesterdayClose = todayOpen - (Math.random() - 0.5) * 60;

    return {
      ...asset,
      values,
      history,
      todayOpen: Math.round(todayOpen * 100) / 100,
      todayClose: Math.round(todayClose * 100) / 100,
      yesterdayClose: Math.round(yesterdayClose * 100) / 100,
      trend: todayClose > todayOpen ? "UP" : "DOWN",
      momentum: Math.round((todayClose - yesterdayClose) * 100) / 100,
    };
  });
}

const CLASS_COLORS: Record<string, string> = {
  FX: "#42A5F5", Taux: "#B388FF", Metaux: "#FFD54F",
  Energie: "#FF7043", Indices: "#FF6B00", Agri: "#66BB6A",
};

export default function RangeDashboardPage() {
  const [data, setData] = useState<ReturnType<typeof generateData>>([]);
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(true);

  useEffect(() => {
    setData(generateData());
    // Refresh at open (15:30 CET) and close (22:00 CET) — check every 5 min
    const interval = setInterval(() => {
      const now = new Date();
      const h = now.getUTCHours();
      const m = now.getUTCMinutes();
      // Open: 13:30 UTC, Close: 20:00 UTC
      if ((h === 13 && m >= 28 && m <= 35) || (h === 20 && m >= 0 && m <= 5)) {
        setData(generateData());
      }
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const selected = data.find(d => d.id === selectedAsset);

  return (
    <div className="p-4">
      <PageHeader title="Range Dashboard" subtitle="Performance des ranges — Analyse Open/Close avec historique 30 jours">
        <button onClick={() => setData(generateData())} className="px-3 py-1.5 bg-[#111114] border border-[#1E1E22] rounded-lg text-xs hover:border-[#FF6B00] transition-colors">
          Rafraichir
        </button>
        <LiveBadge />
      </PageHeader>

      {/* Open/Close Analysis Bar */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <Card className="p-3 text-center">
          <div className="text-[9px] text-[#6B6B75] uppercase tracking-widest mb-1">Actifs en Hausse</div>
          <div className="text-2xl font-black font-mono text-[#22C55E]">
            {data.filter(d => d.trend === "UP").length}
          </div>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-[9px] text-[#6B6B75] uppercase tracking-widest mb-1">Actifs en Baisse</div>
          <div className="text-2xl font-black font-mono text-[#EF4444]">
            {data.filter(d => d.trend === "DOWN").length}
          </div>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-[9px] text-[#6B6B75] uppercase tracking-widest mb-1">Momentum Moyen</div>
          <div className="text-2xl font-black font-mono" style={{ color: data.reduce((s, d) => s + d.momentum, 0) / data.length > 0 ? "#22C55E" : "#EF4444" }}>
            {(data.reduce((s, d) => s + d.momentum, 0) / data.length).toFixed(1)}%
          </div>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-[9px] text-[#6B6B75] uppercase tracking-widest mb-1">MAJ</div>
          <div className="text-sm font-mono text-[#FF6B00]">{new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</div>
          <div className="text-[9px] text-[#6B6B75]">Open 15:30 | Close 22:00</div>
        </Card>
      </div>

      {/* Heatmap Matrix */}
      <Card className="overflow-hidden mb-4">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#0A0A0E]">
                <th className="sticky left-0 z-20 bg-[#0A0A0E] p-2.5 text-left text-[10px] text-[#6B6B75] font-semibold border-b border-r border-[#1E1E22] min-w-[100px]">Actif</th>
                <th className="p-2 text-center text-[10px] text-[#6B6B75] border-b border-[#1E1E22] min-w-[50px]">Trend</th>
                <th className="p-2 text-center text-[10px] text-[#6B6B75] border-b border-[#1E1E22] min-w-[55px]">Mom.</th>
                {TIMEFRAMES.map(tf => (
                  <th key={tf} className="p-2 text-center text-[10px] text-[#6B6B75] font-semibold border-b border-[#1E1E22] min-w-[65px]">{tf}</th>
                ))}
                <th className="p-2 text-center text-[10px] text-[#6B6B75] border-b border-[#1E1E22] min-w-[60px]">Open</th>
                <th className="p-2 text-center text-[10px] text-[#6B6B75] border-b border-[#1E1E22] min-w-[60px]">Close</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                let lastCls = "";
                return data.map((asset) => {
                  const showSep = asset.cls !== lastCls;
                  lastCls = asset.cls;
                  return (
                    <>
                      {showSep && (
                        <tr key={`sep-${asset.cls}`}>
                          <td colSpan={TIMEFRAMES.length + 5} className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[2px] border-b border-[#1E1E22]" style={{ color: CLASS_COLORS[asset.cls] }}>
                            {asset.cls}
                          </td>
                        </tr>
                      )}
                      <tr
                        key={asset.id}
                        className={`cursor-pointer transition-colors ${selectedAsset === asset.id ? 'bg-[#FF6B0010]' : 'hover:bg-[#FFFFFF04]'}`}
                        onClick={() => setSelectedAsset(selectedAsset === asset.id ? null : asset.id)}
                      >
                        <td className="sticky left-0 z-10 bg-[#111114] p-2 border-b border-r border-[#1E1E22]">
                          <span className="font-mono font-bold text-[12px]" style={{ color: CLASS_COLORS[asset.cls] }}>{asset.name}</span>
                        </td>
                        <td className="p-1.5 text-center border-b border-[#1E1E22]">
                          <span className={`text-[11px] font-bold ${asset.trend === "UP" ? "text-[#22C55E]" : "text-[#EF4444]"}`}>
                            {asset.trend === "UP" ? "▲" : "▼"}
                          </span>
                        </td>
                        <td className="p-1.5 text-center border-b border-[#1E1E22]">
                          <span className={`font-mono text-[11px] font-semibold ${asset.momentum > 0 ? "text-[#22C55E]" : "text-[#EF4444]"}`}>
                            {asset.momentum > 0 ? "+" : ""}{asset.momentum.toFixed(1)}
                          </span>
                        </td>
                        {asset.values.map((val, ci) => (
                          <td key={ci} className="p-1 text-center border-b border-[#1E1E22]">
                            <span
                              className="inline-block w-full px-1 py-1 rounded font-mono text-[11px] font-semibold"
                              style={{ background: bloombergColor(val), color: bloombergText(val) }}
                            >
                              {val.toFixed(1)}%
                            </span>
                          </td>
                        ))}
                        <td className="p-1.5 text-center border-b border-[#1E1E22]">
                          <span className={`font-mono text-[11px] ${asset.todayOpen > 0 ? "text-[#22C55E]" : "text-[#EF4444]"}`}>
                            {asset.todayOpen > 0 ? "+" : ""}{asset.todayOpen.toFixed(1)}
                          </span>
                        </td>
                        <td className="p-1.5 text-center border-b border-[#1E1E22]">
                          <span className={`font-mono text-[11px] font-bold ${asset.todayClose > 0 ? "text-[#22C55E]" : "text-[#EF4444]"}`}>
                            {asset.todayClose > 0 ? "+" : ""}{asset.todayClose.toFixed(1)}
                          </span>
                        </td>
                      </tr>
                    </>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Detail panel — shows when asset clicked */}
      {selected && (
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* 30-day history chart */}
          <Card className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-sm font-bold" style={{ color: CLASS_COLORS[selected.cls] }}>{selected.name}</span>
              <span className="text-xs text-[#6B6B75]">Historique 30 jours</span>
              <Badge color={selected.trend === "UP" ? "#22C55E" : "#EF4444"}>{selected.trend}</Badge>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={selected.history}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E1E22" />
                <XAxis dataKey="date" tick={{ fill: "#6B6B75", fontSize: 9 }} />
                <YAxis tick={{ fill: "#6B6B75", fontSize: 9 }} />
                <Tooltip
                  contentStyle={{ background: "#111114", border: "1px solid #1E1E22", borderRadius: 8, fontSize: 11 }}
                  labelStyle={{ color: "#6B6B75" }}
                />
                <ReferenceLine y={0} stroke="#6B6B75" strokeDasharray="3 3" />
                <Bar dataKey="value" fill="#FF6B00" radius={[2, 2, 0, 0]}
                  // @ts-ignore
                  shape={(props: any) => {
                    const { x, y, width, height, value } = props;
                    return <rect x={x} y={y} width={width} height={Math.abs(height)} rx={2} fill={value >= 0 ? "#22C55E" : "#EF4444"} opacity={0.8} />;
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Analysis */}
          <Card className="p-4">
            <div className="text-sm font-bold mb-3">Analyse Open / Close</div>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-2.5 rounded-lg bg-[#0A0A0E]">
                <span className="text-xs text-[#6B6B75]">Open du jour</span>
                <span className={`font-mono font-bold ${selected.todayOpen > 0 ? "text-[#22C55E]" : "text-[#EF4444]"}`}>
                  {selected.todayOpen > 0 ? "+" : ""}{selected.todayOpen.toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between items-center p-2.5 rounded-lg bg-[#0A0A0E]">
                <span className="text-xs text-[#6B6B75]">Close du jour</span>
                <span className={`font-mono font-bold ${selected.todayClose > 0 ? "text-[#22C55E]" : "text-[#EF4444]"}`}>
                  {selected.todayClose > 0 ? "+" : ""}{selected.todayClose.toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between items-center p-2.5 rounded-lg bg-[#0A0A0E]">
                <span className="text-xs text-[#6B6B75]">Close veille</span>
                <span className={`font-mono font-bold ${selected.yesterdayClose > 0 ? "text-[#22C55E]" : "text-[#EF4444]"}`}>
                  {selected.yesterdayClose > 0 ? "+" : ""}{selected.yesterdayClose.toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg" style={{ background: selected.momentum > 0 ? "#22C55E10" : "#EF444410", border: `1px solid ${selected.momentum > 0 ? "#22C55E33" : "#EF444433"}` }}>
                <span className="text-xs font-semibold">Momentum</span>
                <span className={`font-mono text-lg font-black ${selected.momentum > 0 ? "text-[#22C55E]" : "text-[#EF4444]"}`}>
                  {selected.momentum > 0 ? "+" : ""}{selected.momentum.toFixed(2)}%
                </span>
              </div>
              <div className="p-3 rounded-lg bg-[#FF6B0008] border border-[#FF6B0022]">
                <div className="text-[10px] font-bold text-[#FF6B00] uppercase tracking-wider mb-1">Interpretation</div>
                <p className="text-[11px] text-[#6B6B75] leading-relaxed">
                  {selected.momentum > 50 ? "Momentum fortement haussier — acceleration en cours. Surveiller les niveaux de resistance." :
                   selected.momentum > 10 ? "Momentum positif modere — tendance constructive. Maintenir les positions longues." :
                   selected.momentum > -10 ? "Range neutre — pas de signal directionnel clair. Attendre un catalyseur." :
                   selected.momentum > -50 ? "Pression baissiere — reduire l'exposition. Surveiller les supports." :
                   "Momentum fortement baissier — risk-off en cours. Proteger le capital."}
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      <div className="text-[10px] text-[#6B6B75] text-center">
        Donnees demo — Ajoutez la study &quot;Write Bar Data&quot; sur Range Dashboard dans Sierra pour les donnees live
        <br />Mise a jour automatique : Open US (15:30 CET) et Close (22:00 CET)
      </div>
    </div>
  );
}
