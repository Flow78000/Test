"use client";

import { useState, useMemo } from "react";
import { Card, PageHeader, Badge } from "@/components/ui/card";

/* ── Category color map ── */
const CAT_COLORS: Record<string, string> = {
  Volatility: "#F87171",
  Index: "#42A5F5",
  Rates: "#F472B6",
  BuyWrite: "#FF6B00",
  Buffer: "#A3E635",
  Options: "#FBBF24",
  Crypto: "#B388FF",
  "ETF/INAV": "#34D399",
  Europe: "#818CF8",
  Sector: "#C084FC",
  Morningstar: "#6B6B75",
};

const ALL_CATS = ["All", ...Object.keys(CAT_COLORS)] as const;

/* ── Ticker data (~55 representative tickers) ── */
interface Ticker {
  sym: string;
  desc: string;
  cats: string[];
}

const TICKERS: Ticker[] = [
  // Volatility
  { sym: "VIX", desc: "Cboe Volatility Index", cats: ["Volatility"] },
  { sym: "VIX9D", desc: "Cboe S&P 500 9-Day Volatility Index", cats: ["Volatility"] },
  { sym: "VIX3M", desc: "Cboe S&P 500 Three-Month Volatility Index", cats: ["Volatility"] },
  { sym: "VIX6M", desc: "Cboe S&P 500 6-Month Volatility Index", cats: ["Volatility"] },
  { sym: "VVIX", desc: "Cboe VIX of VIX Index", cats: ["Volatility"] },
  { sym: "SKEW", desc: "CBOE SKEW Index", cats: ["Volatility"] },
  { sym: "RVX", desc: "Cboe Russell 2000 VIX Index", cats: ["Volatility"] },
  { sym: "VXN", desc: "Cboe Nasdaq-100 VIX Index", cats: ["Volatility"] },
  { sym: "VXD", desc: "Cboe Dow Jones Industrial Average VIX Index", cats: ["Volatility"] },
  { sym: "OVX", desc: "Cboe Crude Oil ETF USO VIX Index", cats: ["Volatility"] },
  { sym: "GVZ", desc: "Cboe Gold ETF GLD VIX Index", cats: ["Volatility"] },
  // Index
  { sym: "SPX", desc: "S&P 500 Index", cats: ["Index"] },
  { sym: "NDX", desc: "Nasdaq-100 Index", cats: ["Index"] },
  { sym: "RUT", desc: "Russell 2000 Index", cats: ["Index"] },
  { sym: "DJX", desc: "Dow Jones Industrial Average 1/100th", cats: ["Index"] },
  { sym: "OEX", desc: "S&P 100 Index", cats: ["Index"] },
  // Rates
  { sym: "IRX", desc: "3-Month T-Bill Rate", cats: ["Rates"] },
  { sym: "FVX", desc: "5-Year Note Rate", cats: ["Rates"] },
  { sym: "TNX", desc: "10-Year Note Rate", cats: ["Rates"] },
  { sym: "TYX", desc: "30-Year Bond Rate", cats: ["Rates"] },
  // BuyWrite
  { sym: "BXM", desc: "Cboe S&P 500 BuyWrite Index", cats: ["BuyWrite"] },
  { sym: "BXMD", desc: "Cboe S&P 500 30-Delta BuyWrite Index", cats: ["BuyWrite"] },
  { sym: "PUT", desc: "CBOE S&P 500 PutWrite Index", cats: ["BuyWrite"] },
  { sym: "PUTY", desc: "CBOE S&P 500 PutWrite OTM Index", cats: ["BuyWrite"] },
  { sym: "BXR", desc: "Russell 2000 BuyWrite Index", cats: ["BuyWrite"] },
  { sym: "WPUT", desc: "Cboe S&P 500 One-Week PutWrite Index", cats: ["BuyWrite"] },
  { sym: "BXMW", desc: "Cboe S&P 500 Multi-Week BuyWrite Index", cats: ["BuyWrite"] },
  // Buffer
  { sym: "SPRF", desc: "Cboe S&P 500 15% Buffer Protect Index Balanced Series", cats: ["Buffer"] },
  { sym: "SPRO", desc: "Cboe S&P 500 Buffer Protect Index Balanced Series", cats: ["Buffer"] },
  { sym: "SPEN", desc: "Cboe S&P 500 Enhanced Growth Index Series", cats: ["Buffer"] },
  { sym: "RPEN", desc: "Cboe Russell 2000 Enhanced Growth Index Series", cats: ["Buffer"] },
  // Options Strategies
  { sym: "CNDR", desc: "Cboe S&P 500 Iron Condor Index", cats: ["Options"] },
  { sym: "BFLY", desc: "Cboe S&P 500 Iron Butterfly Index", cats: ["Options"] },
  { sym: "CLL", desc: "CBOE Collar 95-110 Index", cats: ["Options"] },
  { sym: "PPUT", desc: "Cboe S&P 500 5% Put Protection Index", cats: ["Options"] },
  { sym: "RXM", desc: "CBOE S&P 500 Risk Reversal Index", cats: ["Options"] },
  { sym: "CLLZ", desc: "Cboe S&P 500 Zero-Cost Put Spread Collar Index", cats: ["Options"] },
  // Crypto
  { sym: "BTC1RP", desc: "Cboe 1 Bitcoin / US Dollar RealPrice Index", cats: ["Crypto"] },
  { sym: "BTC10RP", desc: "Cboe 10 Bitcoin / US Dollar RealPrice Index", cats: ["Crypto"] },
  { sym: "ETH100RP", desc: "Cboe 100 Ethereum / US Dollar RealPrice Index", cats: ["Crypto"] },
  { sym: "SOL100RP", desc: "Cboe 100 Solana / US Dollar RealPrice Index", cats: ["Crypto"] },
  { sym: "AAVE100", desc: "Cboe 100 Aave / US Dollar RealPrice Index", cats: ["Crypto"] },
  { sym: "ADA100K", desc: "Cboe 100K Cardano / US Dollar RealPrice Index", cats: ["Crypto"] },
  { sym: "DOGE100K", desc: "Cboe 100K Dogecoin / US Dollar RealPrice Index", cats: ["Crypto"] },
  { sym: "LINK100", desc: "Cboe 100 Chainlink / US Dollar RealPrice Index", cats: ["Crypto"] },
  { sym: "SOL1KRP", desc: "Cboe 1000 Solana / US Dollar RealPrice Index", cats: ["Crypto"] },
  // ETF / INAV
  { sym: "AGQIV", desc: "ProShares Ultra Silver ETF INAV", cats: ["ETF/INAV"] },
  { sym: "ANEWIV", desc: "ProShares MSCI Transformational Changes ETF INAV", cats: ["ETF/INAV"] },
  { sym: "APRTIV", desc: "AllianzIM U.S. Large Cap Buffer10 Apr ETF INAV", cats: ["ETF/INAV"] },
  // Europe
  { sym: "BEP50N", desc: "Cboe Europe 50 (Net Return)", cats: ["Europe"] },
  { sym: "BEP50P", desc: "Cboe Europe 50 (Price Return)", cats: ["Europe"] },
  { sym: "BUK100N", desc: "Cboe UK 100 (Net Return)", cats: ["Europe"] },
  { sym: "BUK100P", desc: "Cboe UK 100 (Price Return)", cats: ["Europe"] },
  { sym: "BDE40N", desc: "Cboe Germany 40 (Net Return)", cats: ["Europe"] },
  { sym: "BDE40G", desc: "Cboe Germany 40 (Gross Return)", cats: ["Europe"] },
  { sym: "BFR40N", desc: "Cboe France 40 (Net Return)", cats: ["Europe"] },
  { sym: "BFR40P", desc: "Cboe France 40 (Price Return)", cats: ["Europe"] },
  // Morningstar
  { sym: "MSDXUTPU", desc: "Morningstar Developed Markets ex-US Target Market Exposure PR USD", cats: ["Morningstar"] },
];

export default function CboeTickersPage() {
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState<string>("All");

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return TICKERS.filter((t) => {
      const matchesCat = activeCat === "All" || t.cats.includes(activeCat);
      const matchesSearch =
        !q ||
        t.sym.toLowerCase().includes(q) ||
        t.desc.toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    });
  }, [search, activeCat]);

  const catCounts = useMemo(() => {
    const m: Record<string, number> = { All: TICKERS.length };
    for (const t of TICKERS) for (const c of t.cats) m[c] = (m[c] || 0) + 1;
    return m;
  }, []);

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <PageHeader
        title="Reference Tickers CBOE"
        subtitle="1000+ indices CBOE Global — recherche et categorisation"
      />

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Rechercher par ticker ou description..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-xl bg-[#111114] border border-[#1E1E22] rounded-lg px-4 py-2.5 text-sm text-[#F0F0F0] placeholder-[#6B6B75] outline-none focus:border-[#FF6B00] transition-colors"
        />
      </div>

      {/* Category filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {ALL_CATS.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCat(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
              activeCat === cat
                ? "bg-[#FF6B00] text-black border-[#FF6B00]"
                : "bg-[#111114] text-[#6B6B75] border-[#1E1E22] hover:border-[#555] hover:text-[#F0F0F0]"
            }`}
          >
            {cat}
            <span className="ml-1.5 opacity-60">{catCounts[cat] || 0}</span>
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 mb-4 text-xs text-[#6B6B75]">
        <span>
          <span className="text-[#FF6B00] font-bold">{filtered.length}</span> ticker{filtered.length !== 1 ? "s" : ""} affiche{filtered.length !== 1 ? "s" : ""}
        </span>
        <span>
          <span className="font-semibold text-[#F0F0F0]">{Object.keys(CAT_COLORS).length}</span> categories
        </span>
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-[#1E1E22]">
                <th className="text-left p-3 text-[#6B6B75] text-[10px] uppercase tracking-widest font-medium w-36">
                  Ticker
                </th>
                <th className="text-left p-3 text-[#6B6B75] text-[10px] uppercase tracking-widest font-medium">
                  Description
                </th>
                <th className="text-left p-3 text-[#6B6B75] text-[10px] uppercase tracking-widest font-medium w-48">
                  Categorie
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr
                  key={t.sym}
                  className="border-b border-[#0E0E12] hover:bg-[#ffffff03] transition-colors"
                >
                  <td className="p-3">
                    <span className="font-mono font-bold text-[#FF6B00] text-xs">
                      {t.sym}
                    </span>
                  </td>
                  <td className="p-3 text-[#6B6B75] text-xs leading-relaxed">
                    {t.desc}
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {t.cats.map((c) => (
                        <span
                          key={c}
                          className="px-2 py-0.5 rounded-md text-[10px] font-semibold"
                          style={{
                            background: `${CAT_COLORS[c] || "#6B6B75"}18`,
                            color: CAT_COLORS[c] || "#6B6B75",
                            border: `1px solid ${CAT_COLORS[c] || "#6B6B75"}33`,
                          }}
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-[#6B6B75] text-sm">
                    Aucun ticker trouve pour cette recherche.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
