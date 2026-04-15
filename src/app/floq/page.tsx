"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, PageHeader, Badge, LiveBadge } from "@/components/ui/card";
import { RefreshTimer } from "@/components/ui/refresh-timer";
import { useVisiblePolling } from "@/hooks/use-visible-polling";

type CommandResponse = {
  success: boolean;
  slug: string;
  type?: "image" | "levels" | "stats" | "list" | "table" | "empty";
  ticker?: string;
  date?: string;
  image_url?: string;
  levels?: Record<string, number>;
  stats?: Record<string, string | number>;
  error?: string;
  from_cache?: boolean;
  age_seconds?: number;
};

type DashboardResponse = {
  success: boolean;
  category: string;
  date: string;
  ticker?: string;
  slugs_requested: number;
  slugs_succeeded: number;
  commands: Record<string, CommandResponse>;
};

const TICKERS = ["SPX", "SPY", "NDX", "QQQ", "RUT", "IWM", "DIA"];

const CATEGORIES = [
  { id: "cta", label: "CTA Models", icon: "◈", color: "#FFA726" },
  { id: "eod", label: "End Of Day", icon: "■", color: "#42A5F5" },
  { id: "intraday", label: "Intraday", icon: "●", color: "#FF6B00" },
] as const;

const SLUG_LABELS: Record<string, string> = {
  cta_table: "CTAs Main Table",
  cta_index: "CTAs Index Table",
  cta_currency: "CTAs Currency Table",
  cta_commodity: "CTAs Commodity Table",
  cta_spx: "CTAs Chart: SPX",
  cta_nasdaq: "CTAs Chart: Nasdaq",
  qscore_option: "Q-Score Option",
  qscore_momentum: "Q-Score Momentum",
  qscore_volatility: "Q-Score Volatility",
  qscore_seasonality: "Q-Score Seasonality",
  liq_snapshot: "Liquidity Snapshot",
  key_levels: "Key Levels",
  netgex: "Net GEX",
  netgex_multiexpiry: "Net GEX Multi-Exp",
  levels_tv: "TradingView Levels",
  matrix: "Option Matrix",
  voloi: "Volume & Open Interest",
  voloi_0dte: "Volume & OI 0DTE",
  mainchart: "Main Chart",
  swing_5d: "Swing Model 5D",
  swing_20d: "Swing Model 20D",
  swing_levels: "Swing Levels",
  bl_levels: "Blind Spots Levels",
  skew: "Skew 1M",
  skew_0dte: "Skew 0DTE",
  skew_3m: "Skew 3M",
  term: "Term Structure",
  net_dex: "Net DEX",
  ivoi: "IV * Open Interest",
  oi: "Open Interest",
  vol_smile: "Volatility Smile",
  vol_surface_3d: "Vol Surface 3D",
  vol_surface_2d: "Vol Surface 2D",
  vrp: "Vol Risk Premium",
  netgex_0dte: "Net GEX 0DTE",
  netgex_intraday: "Net GEX Intraday",
  vol_0dte_intraday: "Volume 0DTE Intraday",
  liquidity_summary: "Liquidity Summary",
  levels_tv_intraday: "TV Levels Intraday",
  gex_diff_vs_eod: "GEX Diff vs EOD",
  gex_diff_vs_last: "GEX Diff vs Last",
};

function lastBusinessDayISO() {
  const d = new Date();
  // Avant 10h UTC les donnees du jour ne sont pas encore publiees
  if (d.getUTCHours() < 10) d.setUTCDate(d.getUTCDate() - 1);
  // Retombe au vendredi si weekend
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6) {
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return d.toISOString().slice(0, 10);
}

export default function FloQPage() {
  const [category, setCategory] = useState<"cta" | "eod" | "intraday">("cta");
  const [ticker, setTicker] = useState<string>("SPX");
  const [date, setDate] = useState<string>(lastBusinessDayISO());
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (force = false) => {
    try {
      setError(null);
      if (force) setRefreshing(true);
      const url = new URL("http://127.0.0.1:3850/api/floq/dashboard");
      url.searchParams.set("category", category);
      url.searchParams.set("date", date);
      if (ticker) url.searchParams.set("ticker", ticker);
      if (force) url.searchParams.set("force", "true");
      const r = await fetch(url.toString());
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const json = await r.json();
      setData(json);
      setLastUpdate(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [category, ticker, date]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  // Refresh automatique toutes les 15 minutes (FLO.Q genere des donnees toutes les ~15min intraday, 1x/j EOD)
  const pollFloq = useCallback(() => load(false), [load]);
  useVisiblePolling(pollFloq, 15 * 60 * 1000);

  const commands = data?.commands || {};
  const slugs = Object.keys(commands);

  return (
    <div className="p-6">
      <PageHeader
        timer={<RefreshTimer intervalSeconds={900} lastUpdate={lastUpdate ? lastUpdate.getTime() : undefined} />}
        title="FLO.Q Dashboard"
        subtitle="Key levels, GEX, CTA models, skew, term structure — moteur de donnees institutionnel"
      >
        <LiveBadge />
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="px-3 py-1.5 bg-[#FF6B00] hover:bg-[#FF8533] text-black rounded-md text-xs font-bold transition-colors disabled:opacity-50"
        >
          {refreshing ? "REFRESH..." : "FORCE REFRESH"}
        </button>
      </PageHeader>

      {/* Controls */}
      <Card className="p-4 mb-4">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Category tabs */}
          <div className="flex items-center gap-1">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => setCategory(c.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  category === c.id
                    ? "bg-[#FF6B00] text-black"
                    : "bg-[#1A1A1E] text-[#6B6B75] hover:text-[#F0F0F0]"
                }`}
              >
                <span className="mr-1" style={{ color: category === c.id ? "black" : c.color }}>
                  {c.icon}
                </span>
                {c.label}
              </button>
            ))}
          </div>

          <div className="h-6 w-px bg-[#1E1E22]" />

          {/* Ticker selector */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[#6B6B75] uppercase tracking-wider">Ticker</span>
            <div className="flex items-center gap-1">
              {TICKERS.map((t) => (
                <button
                  key={t}
                  onClick={() => setTicker(t)}
                  className={`px-2.5 py-1 rounded text-[11px] font-mono font-semibold transition-all ${
                    ticker === t
                      ? "bg-[#FFA726] text-black"
                      : "bg-[#1A1A1E] text-[#6B6B75] hover:text-[#F0F0F0]"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="h-6 w-px bg-[#1E1E22]" />

          {/* Date */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[#6B6B75] uppercase tracking-wider">Date</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-[#08080A] border border-[#1E1E22] rounded px-2 py-1 text-xs font-mono text-[#F0F0F0]"
            />
          </div>

          <div className="ml-auto flex items-center gap-3 text-[10px] text-[#6B6B75]">
            {data && (
              <>
                <span>
                  {data.slugs_succeeded}/{data.slugs_requested} commands OK
                </span>
                <span className="text-[#FFA726]">●</span>
                <span>Snapshot: {data.date}</span>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* Loading / Error */}
      {loading ? (
        <Card className="p-12 text-center text-[#6B6B75]">
          Chargement des donnees FLO.Q...
        </Card>
      ) : error ? (
        <Card className="p-12 text-center text-[#6B6B75]">
          <span className="text-[#FF6B00] font-semibold">Reconnexion automatique en cours...</span>
          <div className="text-xs mt-2">{error}</div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {slugs.map((slug) => {
            const cmd = commands[slug];
            return <CommandCard key={slug} slug={slug} cmd={cmd} date={date} ticker={ticker} />;
          })}
        </div>
      )}
    </div>
  );
}

function CommandCard({
  slug,
  cmd,
  date,
  ticker,
}: {
  slug: string;
  cmd: CommandResponse;
  date: string;
  ticker: string;
}) {
  const label = SLUG_LABELS[slug] || slug;

  if (!cmd.success) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-[#6B6B75]">{label}</h3>
          <Badge color="#EF4444">ERR</Badge>
        </div>
        <div className="text-xs text-[#6B6B75] font-mono">{cmd.error}</div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-bold text-[#F0F0F0]">{label}</h3>
          <div className="text-[10px] text-[#6B6B75] font-mono uppercase tracking-wider">
            {slug} {cmd.ticker && `• ${cmd.ticker}`} {cmd.date && `• ${cmd.date}`}
          </div>
        </div>
        <Badge color={cmd.type === "image" ? "#42A5F5" : cmd.type === "levels" ? "#FFA726" : cmd.type === "stats" ? "#10B981" : "#6B6B75"}>
          {cmd.type || "?"}
        </Badge>
      </div>

      {/* Image */}
      {cmd.type === "image" && (
        <div className="bg-[#08080A] rounded-lg overflow-hidden border border-[#1E1E22]">
          <img
            src={`http://127.0.0.1:3850/api/floq/image?slug=${encodeURIComponent(slug)}&date=${encodeURIComponent(cmd.date || date)}${cmd.ticker ? `&ticker=${encodeURIComponent(cmd.ticker)}` : ""}`}
            alt={label}
            className="w-full h-auto"
            loading="lazy"
          />
        </div>
      )}

      {/* Levels table */}
      {cmd.type === "levels" && cmd.levels && (
        <div className="space-y-1">
          {Object.entries(cmd.levels).map(([k, v]) => (
            <div key={k} className="flex items-center justify-between text-xs py-1 border-b border-[#1A1A1E] last:border-0">
              <span className="text-[#6B6B75] truncate">{k}</span>
              <span className="font-mono font-bold text-[#FFA726]">{v.toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      {cmd.type === "stats" && cmd.stats && (
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(cmd.stats).map(([k, v]) => (
            <div key={k} className="bg-[#08080A] rounded p-2">
              <div className="text-[9px] text-[#6B6B75] uppercase tracking-wider mb-0.5 truncate">
                {k}
              </div>
              <div className="text-sm font-mono font-bold text-[#F0F0F0] truncate">
                {String(v)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty */}
      {cmd.type === "empty" && (
        <div className="text-xs text-[#6B6B75] italic">Aucune donnee pour cette date/ticker</div>
      )}

      {cmd.from_cache && (
        <div className="mt-2 text-[9px] text-[#6B6B75]">
          ● Cache ({cmd.age_seconds}s)
        </div>
      )}
    </Card>
  );
}
