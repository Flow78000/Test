"use client";

import { useState, useMemo } from "react";
import { Card, PageHeader, Badge } from "@/components/ui/card";
import tickerData from "@/data/cboe-tickers.json";

/* ── Category color map ── */
const CAT_COLORS: Record<string, string> = {
  Volatility: "#F87171",
  Index: "#42A5F5",
  Rates: "#F472B6",
  "BuyWrite/PutWrite": "#FF6B00",
  "Buffer/Protection": "#A3E635",
  Options: "#FBBF24",
  Crypto: "#B388FF",
  "ETF/INAV": "#34D399",
  Europe: "#818CF8",
  Sector: "#C084FC",
  Morningstar: "#6B6B75",
  Other: "#555",
};

const ALL_CATS = ["All", ...Object.keys(CAT_COLORS)] as const;

interface Ticker {
  sym: string;
  desc: string;
  cats: string[];
}

const TICKERS: Ticker[] = tickerData as Ticker[];

const PAGE_SIZE = 100;

export default function CboeTickersPage() {
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState<string>("All");
  const [page, setPage] = useState(0);

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

  // Reset page when filter changes
  useMemo(() => setPage(0), [search, activeCat]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const catCounts = useMemo(() => {
    const m: Record<string, number> = { All: TICKERS.length };
    for (const t of TICKERS) for (const c of t.cats) m[c] = (m[c] || 0) + 1;
    return m;
  }, []);

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <PageHeader
        title="Reference Tickers CBOE"
        subtitle={`${TICKERS.length} indices CBOE Global — recherche et categorisation`}
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
        {totalPages > 1 && (
          <span>
            Page <span className="text-[#F0F0F0] font-semibold">{page + 1}</span> / {totalPages}
          </span>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="px-3 py-1.5 rounded-lg text-xs border border-[#1E1E22] bg-[#111114] text-[#6B6B75] hover:border-[#FF6B00] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Precedent
          </button>
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              onClick={() => setPage(i)}
              className={`px-2.5 py-1.5 rounded-lg text-xs border transition-colors ${
                page === i
                  ? "bg-[#FF6B00] text-black border-[#FF6B00]"
                  : "bg-[#111114] text-[#6B6B75] border-[#1E1E22] hover:border-[#555]"
              }`}
            >
              {i + 1}
            </button>
          ))}
          <button
            onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
            disabled={page >= totalPages - 1}
            className="px-3 py-1.5 rounded-lg text-xs border border-[#1E1E22] bg-[#111114] text-[#6B6B75] hover:border-[#FF6B00] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Suivant
          </button>
        </div>
      )}

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
                <th className="text-left p-3 text-[#6B6B75] text-[10px] uppercase tracking-widest font-medium w-56">
                  Categorie
                </th>
              </tr>
            </thead>
            <tbody>
              {paged.map((t) => (
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
