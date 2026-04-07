"use client";

import { useState, useEffect } from "react";
import { PageHeader, Card, LiveBadge } from "@/components/ui/card";

// Asset definitions matching Sierra Range Dashboard
const ASSETS = [
  { id: "EURUSD", name: "EUR/USD", class: "FX" },
  { id: "GBPUSD", name: "GBP/USD", class: "FX" },
  { id: "USDJPY", name: "USD/JPY", class: "FX" },
  { id: "NZDUSD", name: "NZD/USD", class: "FX" },
  { id: "AUDUSD", name: "AUD/USD", class: "FX" },
  { id: "USDCAD", name: "USD/CAD", class: "FX" },
  { id: "USDCHF", name: "USD/CHF", class: "FX" },
  { id: "10YIELD", name: "10Y Yield", class: "Taux" },
  { id: "2YZT", name: "2Y (ZT)", class: "Taux" },
  { id: "5YZF", name: "5Y (ZF)", class: "Taux" },
  { id: "10YZN", name: "10Y (ZN)", class: "Taux" },
  { id: "U10YTN", name: "Ultra 10Y", class: "Taux" },
  { id: "U30YUB", name: "Ultra 30Y", class: "Taux" },
  { id: "30YZB", name: "30Y (ZB)", class: "Taux" },
  { id: "GOLDGC", name: "Gold (GC)", class: "Metaux" },
  { id: "SILVERSI", name: "Silver (SI)", class: "Metaux" },
  { id: "COPPERHG", name: "Copper (HG)", class: "Metaux" },
  { id: "CRUDECL", name: "Crude (CL)", class: "Energie" },
  { id: "NATGASNG", name: "NatGas (NG)", class: "Energie" },
  { id: "SP500ES", name: "S&P 500 (ES)", class: "Indices" },
  { id: "NASDAQNQ", name: "Nasdaq (NQ)", class: "Indices" },
  { id: "RUSSELLRTY", name: "Russell (RTY)", class: "Indices" },
  { id: "DOWJONESYM", name: "Dow (YM)", class: "Indices" },
  { id: "NIKKEINKNQ", name: "Nikkei (NKD)", class: "Indices" },
  { id: "SP400EMD", name: "S&P 400 (EMD)", class: "Indices" },
  { id: "CORNZC", name: "Corn (ZC)", class: "Agri" },
  { id: "SOYZL", name: "Soy Oil (ZL)", class: "Agri" },
  { id: "SOYMEALZM", name: "Soy Meal (ZM)", class: "Agri" },
  { id: "SOYBEANZS", name: "Soybean (ZS)", class: "Agri" },
  { id: "WHEATZW", name: "Wheat (ZW)", class: "Agri" },
];

const STRATEGIES = [
  "INDICE_US", "SP500GEX", "Grain", "UST_ICS", "Curves", "vix",
  "Equities", "Metals", "FX", "EUREX", "Energy", "Vol-Rank",
  "Range_Dash", "BIG_BROTHER", "Stocks_US",
  "XLK_Tech", "XLP_Consumer", "XLV_Health", "XL_Energy",
  "XL_Materials", "XLU_Utilities", "XLF_Financial",
];

function getCellColor(val: number): string {
  if (val > 200) return "bg-[#00C853] text-black";
  if (val > 150) return "bg-[#4CAF50] text-black";
  if (val > 120) return "bg-[#66BB6A] text-black";
  if (val > 100) return "bg-[#81C784] text-black";
  if (val > 80) return "bg-[#A5D6A7] text-black";
  if (val > 60) return "bg-[#C8E6C9] text-black";
  if (val > 40) return "bg-[#FFEE58] text-black";
  if (val > 20) return "bg-[#FFF176] text-black";
  if (val > 0) return "bg-[#FFF9C4] text-black";
  return "bg-[#EF5350] text-white";
}

function getClassColor(cls: string): string {
  switch (cls) {
    case "FX": return "#42A5F5";
    case "Taux": return "#B388FF";
    case "Metaux": return "#FFD54F";
    case "Energie": return "#FF7043";
    case "Indices": return "#FF6B00";
    case "Agri": return "#66BB6A";
    default: return "#6B6B75";
  }
}

export default function RangeDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    setLoading(true);
    try {
      // Try to fetch from Sierra range dashboard file
      const resp = await fetch("http://localhost:3850/api/sierra/dashboard");
      const json = await resp.json();
      setData(json);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  // Generate demo data matching the Sierra screenshot structure
  const demoData = ASSETS.map(asset => ({
    ...asset,
    values: STRATEGIES.map(() => {
      const base = Math.random() * 300 - 50;
      return Math.round(base * 100) / 100;
    }),
  }));

  return (
    <div className="p-4">
      <PageHeader
        title="Range Dashboard"
        subtitle="Performance des ranges par actif — toutes strategies"
      >
        <button onClick={loadData} className="px-3 py-1.5 bg-[#111114] border border-[#1E1E22] rounded-lg text-xs hover:border-[#FF6B00] transition-colors">
          Rafraichir
        </button>
        <LiveBadge />
      </PageHeader>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[10px] border-collapse">
            <thead>
              <tr className="bg-[#0A0A0E]">
                <th className="sticky left-0 z-20 bg-[#0A0A0E] p-2 text-left text-[#6B6B75] font-semibold border-b border-r border-[#1E1E22] min-w-[120px]">
                  Actif
                </th>
                {STRATEGIES.map(s => (
                  <th key={s} className="p-1.5 text-[#6B6B75] font-semibold border-b border-[#1E1E22] whitespace-nowrap min-w-[70px] text-center" style={{ writingMode: "vertical-lr", transform: "rotate(180deg)", height: "100px" }}>
                    {s.replace(/_/g, " ")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {demoData.map((asset, ri) => {
                const prevClass = ri > 0 ? demoData[ri - 1].class : "";
                const showSep = asset.class !== prevClass;
                return (
                  <>
                    {showSep && (
                      <tr key={`sep-${asset.class}`}>
                        <td
                          colSpan={STRATEGIES.length + 1}
                          className="p-1 text-[9px] font-bold uppercase tracking-widest border-b border-[#1E1E22]"
                          style={{ color: getClassColor(asset.class) }}
                        >
                          {asset.class}
                        </td>
                      </tr>
                    )}
                    <tr key={asset.id} className="hover:brightness-110">
                      <td className="sticky left-0 z-10 bg-[#111114] p-1.5 border-b border-r border-[#1E1E22] font-mono font-bold text-[#FF6B00] whitespace-nowrap">
                        {asset.name}
                      </td>
                      {asset.values.map((val, ci) => (
                        <td
                          key={ci}
                          className={`p-1 text-center font-mono font-semibold border-b border-[#1E1E22] ${getCellColor(val)}`}
                          title={`${asset.name} × ${STRATEGIES[ci]}: ${val.toFixed(2)}%`}
                        >
                          {val.toFixed(1)}%
                        </td>
                      ))}
                    </tr>
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mt-4 text-xs text-[#6B6B75] text-center">
        Donnees demo — Ajoutez la study &quot;Write Bar Data&quot; sur le chart Range Dashboard dans Sierra pour les donnees live
      </div>
    </div>
  );
}
