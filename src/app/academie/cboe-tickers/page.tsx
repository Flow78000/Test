"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { Card, PageHeader } from "@/components/ui/card";
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

const API = "http://localhost:3850";

/* ── Types ── */
interface Ticker {
  sym: string;
  desc: string;
  cats: string[];
  subcat: string;
  explanation: string;
}

/* ── Ticker Chart Component ── */
function TickerVisual({ symbol, cats }: { symbol: string; cats: string[] }) {
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Determine the best ticker to query (strip _CGI, map indices)
  const queryTicker = useMemo(() => {
    const s = symbol.replace(/_CGI$/, "");
    // VIX family — query directly
    if (["VIX", "VIX9D", "VIX3M", "VIX6M", "VVIX", "SKEW", "RVX", "VXN", "VXD", "OVX", "GVZ"].includes(s)) return s;
    // Major indices/ETFs
    if (["SPX", "NDX", "RUT", "DJX", "OEX"].includes(s)) return s;
    if (["SPY", "QQQ", "IWM", "TLT", "HYG", "GLD", "USO", "EEM", "UVXY", "SVXY", "VXX"].includes(s)) return s;
    // Sector ETFs
    if (s.startsWith("XL") && s.length === 3) return s;
    // Individual stocks
    if (cats.includes("Crypto")) return null; // No UW data for crypto indices
    if (cats.includes("Europe")) return null;
    if (cats.includes("Morningstar")) return null;
    // Try it anyway for stocks/ETFs
    if (s.length <= 5 && !s.includes(".") && !s.includes("-")) return s;
    return null;
  }, [symbol, cats]);

  useEffect(() => {
    if (!queryTicker) { setLoading(false); setError("no_data"); return; }
    setLoading(true);
    setError("");

    fetch(`${API}/api/uw/iv-rank?ticker=${queryTicker}`, { signal: AbortSignal.timeout(10000) })
      .then(r => r.json())
      .then(res => {
        const arr = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        if (!arr.length) { setError("no_data"); setLoading(false); return; }
        // Take last 90 days
        const recent = arr.slice(-90).map((d: any) => ({
          date: d.date?.slice(5) || "",
          close: d.close ? parseFloat(d.close) : null,
          iv: d.volatility ? parseFloat(d.volatility) * 100 : null,
          ivRank: d.iv_rank_1y ? parseFloat(d.iv_rank_1y) : null,
        })).filter((d: any) => d.close !== null || d.iv !== null);
        setChartData(recent);
        setLoading(false);
      })
      .catch(() => { setError("fetch_error"); setLoading(false); });
  }, [queryTicker]);

  // For VIX-like tickers, show the price as the main chart (it IS the volatility)
  const isVolIndex = cats.includes("Volatility") || ["VIX", "VIX9D", "VIX3M", "VIX6M", "VVIX", "SKEW", "RVX", "VXN", "VXD", "OVX", "GVZ"].includes(symbol);

  if (loading) return (
    <div className="bg-[#0D0D10] rounded-xl border border-[#1E1E22] p-4 h-[200px] flex items-center justify-center">
      <span className="text-xs text-[#6B6B75] animate-pulse">Chargement du graphique...</span>
    </div>
  );

  if (error || !chartData.length) return (
    <div className="bg-[#0D0D10] rounded-xl border border-[#1E1E22] p-4">
      <div className="text-center py-8">
        <div className="text-3xl mb-2 opacity-30">{isVolIndex ? "📊" : cats.includes("Crypto") ? "₿" : cats.includes("Europe") ? "🇪🇺" : "📈"}</div>
        <div className="text-xs text-[#6B6B75]">
          {cats.includes("Volatility") ? "Indice de volatilite — mesure l'incertitude du marche" :
           cats.includes("Crypto") ? "Indice crypto — prix de reference pour actifs numeriques" :
           cats.includes("Europe") ? "Indice europeen — performance des marches UE" :
           cats.includes("Rates") ? "Taux d'interet — reference pour le marche obligataire" :
           cats.includes("Buffer/Protection") ? "Strategie structuree — buffer de protection + gain plafonne" :
           cats.includes("BuyWrite/PutWrite") ? "Strategie d'options — revenu premium via vente d'options" :
           cats.includes("ETF/INAV") ? "Valeur indicative intraday d'un ETF" :
           cats.includes("Sector") ? "Indice sectoriel — performance d'un secteur economique" :
           "Donnees historiques non disponibles pour cet indice"}
        </div>
      </div>
    </div>
  );

  const hasIV = chartData.some((d: any) => d.iv != null);
  const hasClose = chartData.some((d: any) => d.close != null);
  const lastClose = chartData[chartData.length - 1]?.close;
  const firstClose = chartData[0]?.close;
  const changePct = firstClose && lastClose ? ((lastClose - firstClose) / firstClose * 100) : null;
  const lastIV = chartData[chartData.length - 1]?.iv;

  return (
    <div className="bg-[#0D0D10] rounded-xl border border-[#1E1E22] p-4">
      {/* Mini stats */}
      <div className="flex items-center gap-4 mb-3">
        {hasClose && lastClose && (
          <div>
            <span className="text-[10px] text-[#6B6B75] uppercase">{isVolIndex ? "Niveau" : "Prix"}</span>
            <div className="text-sm font-bold font-mono text-white">{lastClose.toFixed(2)}</div>
          </div>
        )}
        {changePct !== null && (
          <div>
            <span className="text-[10px] text-[#6B6B75] uppercase">90j</span>
            <div className="text-sm font-bold font-mono" style={{ color: changePct >= 0 ? "#22C55E" : "#EF4444" }}>
              {changePct >= 0 ? "+" : ""}{changePct.toFixed(1)}%
            </div>
          </div>
        )}
        {hasIV && lastIV && (
          <div>
            <span className="text-[10px] text-[#6B6B75] uppercase">IV</span>
            <div className="text-sm font-bold font-mono text-[#AB47BC]">{lastIV.toFixed(1)}%</div>
          </div>
        )}
        <div className="ml-auto text-[9px] text-[#555]">90 jours</div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={160}>
        {hasIV && !isVolIndex ? (
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1E" />
            <XAxis dataKey="date" tick={{ fill: "#555", fontSize: 8 }} interval="preserveStartEnd" />
            <YAxis yAxisId="price" tick={{ fill: "#555", fontSize: 8 }} domain={["auto", "auto"]} />
            <YAxis yAxisId="iv" orientation="right" tick={{ fill: "#555", fontSize: 8 }} />
            <Tooltip
              contentStyle={{ backgroundColor: "#1A1A1E", border: "1px solid #2A2A2E", borderRadius: 8, fontSize: 11 }}
              labelStyle={{ color: "#6B6B75" }}
            />
            <Line yAxisId="price" dataKey="close" stroke="#42A5F5" strokeWidth={1.5} dot={false} name="Prix" />
            <Line yAxisId="iv" dataKey="iv" stroke="#AB47BC" strokeWidth={1} dot={false} name="IV %" strokeDasharray="3 3" />
          </LineChart>
        ) : (
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="tickerGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={isVolIndex ? "#EF4444" : "#FF6B00"} stopOpacity={0.3} />
                <stop offset="100%" stopColor={isVolIndex ? "#EF4444" : "#FF6B00"} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1E" />
            <XAxis dataKey="date" tick={{ fill: "#555", fontSize: 8 }} interval="preserveStartEnd" />
            <YAxis tick={{ fill: "#555", fontSize: 8 }} domain={["auto", "auto"]} />
            <Tooltip
              contentStyle={{ backgroundColor: "#1A1A1E", border: "1px solid #2A2A2E", borderRadius: 8, fontSize: 11 }}
              labelStyle={{ color: "#6B6B75" }}
            />
            <Area dataKey="close" stroke={isVolIndex ? "#EF4444" : "#FF6B00"} fill="url(#tickerGrad)" strokeWidth={1.5} dot={false} name={isVolIndex ? "Niveau" : "Prix"} />
          </AreaChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

/* ── Category colors ── */
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
const PAGE_SIZE = 60;

export default function CboeTickersPage() {
  const [tickers, setTickers] = useState<Ticker[]>([]);
  const [loadingTickers, setLoadingTickers] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState<string>("All");
  const [activeSubcat, setActiveSubcat] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [page, setPage] = useState(0);
  const [selectedTicker, setSelectedTicker] = useState<Ticker | null>(null);

  useEffect(() => {
    fetch("/api/cboe-tickers", { signal: AbortSignal.timeout(10000) })
      .then(r => r.json())
      .then((data: Ticker[]) => { setTickers(data); setLoadingTickers(false); })
      .catch(() => setLoadingTickers(false));
  }, []);

  // Filter
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return tickers.filter((t) => {
      const matchesCat = activeCat === "All" || t.cats.includes(activeCat);
      const matchesSubcat = !activeSubcat || t.subcat === activeSubcat;
      const matchesSearch = !q || t.sym.toLowerCase().includes(q) || t.desc.toLowerCase().includes(q);
      return matchesCat && matchesSubcat && matchesSearch;
    });
  }, [search, activeCat, activeSubcat, tickers]);

  // Reset page on filter change
  useMemo(() => setPage(0), [search, activeCat, activeSubcat]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Category counts
  const catCounts = useMemo(() => {
    const m: Record<string, number> = { All: tickers.length };
    for (const t of tickers) for (const c of t.cats) m[c] = (m[c] || 0) + 1;
    return m;
  }, [tickers]);

  // Subcategory counts (for active category)
  const subcatCounts = useMemo(() => {
    const items = activeCat === "All" ? tickers : tickers.filter(t => t.cats.includes(activeCat));
    const q = search.toLowerCase().trim();
    const filtered2 = q ? items.filter(t => t.sym.toLowerCase().includes(q) || t.desc.toLowerCase().includes(q)) : items;
    const m: Record<string, number> = {};
    for (const t of filtered2) {
      m[t.subcat] = (m[t.subcat] || 0) + 1;
    }
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [activeCat, search, tickers]);

  // Related tickers for detail panel
  const relatedTickers = useMemo(() => {
    if (!selectedTicker) return [];
    return tickers.filter(t => t.subcat === selectedTicker.subcat && t.sym !== selectedTicker.sym).slice(0, 12);
  }, [selectedTicker, tickers]);

  if (loadingTickers) return (
    <div className="p-6 max-w-[1600px] mx-auto text-center py-20 text-[#6B6B75]">
      Chargement des tickers CBOE...
    </div>
  );

  function makeTag(cat: string) {
    const color = CAT_COLORS[cat] || "#6B6B75";
    return (
      <span key={cat} className="px-2 py-0.5 rounded-md text-[10px] font-semibold"
        style={{ background: `${color}18`, color, border: `1px solid ${color}33` }}>
        {cat}
      </span>
    );
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <PageHeader
        title="Reference Tickers CBOE"
        subtitle={`${tickers.length} indices CBOE Global — recherche, categorisation et explications`}
      />

      {/* Search + View Toggle */}
      <div className="flex items-center gap-3 mb-4">
        <input
          type="text"
          placeholder="Rechercher par ticker ou description..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 max-w-xl bg-[#111114] border border-[#1E1E22] rounded-lg px-4 py-2.5 text-sm text-[#F0F0F0] placeholder-[#6B6B75] outline-none focus:border-[#FF6B00] transition-colors"
        />
        <div className="flex gap-1 bg-[#0D0D10] rounded-lg p-0.5">
          <button onClick={() => setViewMode("grid")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${viewMode === "grid" ? "bg-[#FF6B00] text-black" : "text-[#6B6B75]"}`}>
            Grille
          </button>
          <button onClick={() => setViewMode("list")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${viewMode === "list" ? "bg-[#FF6B00] text-black" : "text-[#6B6B75]"}`}>
            Liste
          </button>
        </div>
      </div>

      {/* Category filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        {ALL_CATS.map((cat) => (
          <button key={cat}
            onClick={() => { setActiveCat(cat); setActiveSubcat(null); }}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
              activeCat === cat ? "bg-[#FF6B00] text-black border-[#FF6B00]"
                : "bg-[#111114] text-[#6B6B75] border-[#1E1E22] hover:border-[#555] hover:text-[#F0F0F0]"
            }`}>
            {cat} <span className="ml-1 opacity-60">{catCounts[cat] || 0}</span>
          </button>
        ))}
      </div>

      <div className="flex gap-4">
        {/* Sidebar — Subcategories */}
        <div className="w-56 flex-shrink-0 hidden lg:block">
          <Card className="p-2 max-h-[70vh] overflow-y-auto">
            <button onClick={() => setActiveSubcat(null)}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs flex justify-between items-center transition-colors ${
                !activeSubcat ? "bg-[#FF6B0020] text-[#FF6B00]" : "text-[#6B6B75] hover:bg-[#16161A]"
              }`}>
              <span>Tous</span>
              <span className="text-[10px] opacity-60">{filtered.length + (activeSubcat ? tickers.filter(t => activeCat === "All" || t.cats.includes(activeCat)).length - filtered.length : 0)}</span>
            </button>
            {subcatCounts.map(([name, count]) => (
              <button key={name} onClick={() => setActiveSubcat(name)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs flex justify-between items-center transition-colors ${
                  activeSubcat === name ? "bg-[#FF6B0020] text-[#FF6B00]" : "text-[#6B6B75] hover:bg-[#16161A]"
                }`}>
                <span className="truncate mr-2">{name}</span>
                <span className="text-[10px] opacity-60 flex-shrink-0">{count}</span>
              </button>
            ))}
          </Card>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Stats */}
          <div className="flex items-center gap-4 mb-3 text-xs text-[#6B6B75]">
            <span><span className="text-[#FF6B00] font-bold">{filtered.length}</span> tickers</span>
            <span><span className="text-white font-semibold">{subcatCounts.length}</span> sous-categories</span>
            {activeSubcat && <span className="text-[#FF6B00]">{activeSubcat}</span>}
            {totalPages > 1 && <span>Page {page + 1}/{totalPages}</span>}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex gap-1 mb-3 flex-wrap">
              <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}
                className="px-2.5 py-1 rounded text-xs border border-[#1E1E22] bg-[#111114] text-[#6B6B75] disabled:opacity-30">Prec.</button>
              {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => (
                <button key={i} onClick={() => setPage(i)}
                  className={`px-2 py-1 rounded text-xs border transition-colors ${page === i ? "bg-[#FF6B00] text-black border-[#FF6B00]" : "bg-[#111114] text-[#6B6B75] border-[#1E1E22]"}`}>
                  {i + 1}
                </button>
              ))}
              {totalPages > 10 && <span className="text-[#6B6B75] text-xs px-1">...</span>}
              <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1}
                className="px-2.5 py-1 rounded text-xs border border-[#1E1E22] bg-[#111114] text-[#6B6B75] disabled:opacity-30">Suiv.</button>
            </div>
          )}

          {/* Grid View */}
          {viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {paged.map((t) => (
                <div key={t.sym} onClick={() => setSelectedTicker(t)}
                  className="bg-[#111114] border border-[#1E1E22] rounded-xl p-4 cursor-pointer hover:border-[#FF6B00] hover:bg-[#16161A] transition-all">
                  <div className="font-mono font-bold text-[#FF6B00] text-sm mb-1">{t.sym}</div>
                  <div className="text-[11px] text-[#6B6B75] leading-relaxed mb-2 line-clamp-2">{t.desc}</div>
                  <div className="flex flex-wrap gap-1">{t.cats.map(makeTag)}</div>
                </div>
              ))}
            </div>
          ) : (
            /* List View */
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-[#1E1E22]">
                      <th className="text-left p-3 text-[#6B6B75] text-[10px] uppercase tracking-widest w-32">Ticker</th>
                      <th className="text-left p-3 text-[#6B6B75] text-[10px] uppercase tracking-widest">Description</th>
                      <th className="text-left p-3 text-[#6B6B75] text-[10px] uppercase tracking-widest w-40">Sous-cat.</th>
                      <th className="text-left p-3 text-[#6B6B75] text-[10px] uppercase tracking-widest w-48">Categories</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map((t) => (
                      <tr key={t.sym} onClick={() => setSelectedTicker(t)}
                        className="border-b border-[#0E0E12] hover:bg-[#FF6B0006] cursor-pointer transition-colors">
                        <td className="p-3"><span className="font-mono font-bold text-[#FF6B00] text-xs">{t.sym}</span></td>
                        <td className="p-3 text-[#6B6B75] text-xs">{t.desc}</td>
                        <td className="p-3 text-[#6B6B75] text-[10px]">{t.subcat}</td>
                        <td className="p-3"><div className="flex flex-wrap gap-1">{t.cats.map(makeTag)}</div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {filtered.length === 0 && (
            <div className="text-center py-16 text-[#6B6B75]">
              <div className="text-4xl mb-3">🔍</div>
              <p>Aucun ticker ne correspond a votre recherche.</p>
            </div>
          )}
        </div>
      </div>

      {/* Detail Panel Overlay */}
      {selectedTicker && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" onClick={() => setSelectedTicker(null)} />
          <div className="fixed top-0 right-0 w-full max-w-lg h-full bg-[#111114] border-l border-[#1E1E22] z-50 overflow-y-auto shadow-2xl">
            <div className="p-6">
              {/* Close */}
              <button onClick={() => setSelectedTicker(null)}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg bg-[#0D0D10] text-[#6B6B75] hover:text-white hover:bg-[#1E1E22] transition-colors text-lg">
                x
              </button>

              {/* Ticker */}
              <div className="font-mono font-extrabold text-[#FF6B00] text-2xl mb-2">{selectedTicker.sym}</div>
              <div className="text-sm text-[#F0F0F0] mb-3">{selectedTicker.desc}</div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {selectedTicker.cats.map(makeTag)}
                <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#1E1E22] text-[#6B6B75] border border-[#2A2A2E]">
                  {selectedTicker.subcat}
                </span>
              </div>

              {/* Explanation */}
              <div className="mb-6">
                <div className="text-[10px] text-[#6B6B75] uppercase tracking-widest mb-2">Explication</div>
                <div className="bg-[#0D0D10] rounded-xl p-4 text-sm text-[#C0C0C5] leading-relaxed border border-[#1E1E22]">
                  {selectedTicker.explanation}
                </div>
              </div>

              {/* Visual / Chart */}
              <div className="mb-6">
                <div className="text-[10px] text-[#6B6B75] uppercase tracking-widest mb-2">Apercu visuel</div>
                <TickerVisual symbol={selectedTicker.sym} cats={selectedTicker.cats} />
              </div>

              {/* Related */}
              <div>
                <div className="text-[10px] text-[#6B6B75] uppercase tracking-widest mb-2">
                  Tickers similaires ({selectedTicker.subcat})
                </div>
                {relatedTickers.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {relatedTickers.map(r => (
                      <button key={r.sym} onClick={() => setSelectedTicker(r)}
                        className="px-3 py-1.5 bg-[#0D0D10] border border-[#1E1E22] rounded-lg text-xs font-mono text-[#FF6B00] hover:border-[#FF6B00] transition-colors">
                        {r.sym}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-[#6B6B75]">Aucun ticker similaire trouve.</div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
