"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, PageHeader, KpiCard, LiveBadge } from "@/components/ui/card";
import { RefreshTimer } from "@/components/ui/refresh-timer";
import { useVisiblePolling } from "@/hooks/use-visible-polling";

const API = "http://localhost:3850";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type Side = "bull" | "bear" | "pivot";
type Zone = "SAFE" | "APPROACH" | "TRIGGER_INNER" | "TRIGGER" | "INSIDE" | "UNKNOWN";

interface LevelLive {
  id: string;
  label: string;
  price: number;
  side: Side;
  source?: string;
  weight?: number;
  note?: string | null;
  gap: number;
  gap_abs: number;
  zone: Zone;
  severity: number;
  direction: "above" | "below";
}

interface VixTier {
  vix_max: number;
  approach: number;
  trigger_hi: number;
  trigger_lo: number;
  inside: number;
}

interface AutoMeta {
  source?: string;
  from_cache?: boolean;
  age_seconds?: number | null;
  strikes_analyzed?: number;
  error?: string | null;
}

interface LiveResponse {
  ticker: string;
  spot: number;
  vix: number;
  tier: VixTier;
  counts: Record<string, number>;
  rows: LevelLive[];
  auto: AutoMeta;
  generated_at: string;
}

// ---------------------------------------------------------------------------
// Zone + side styles
// ---------------------------------------------------------------------------
const ZONE_STYLE: Record<Zone, { color: string; bg: string; label: string }> = {
  SAFE: { color: "#6B6B75", bg: "#6B6B7520", label: "SAFE" },
  APPROACH: { color: "#FFA726", bg: "#FFA72620", label: "APPROACH" },
  TRIGGER_INNER: { color: "#FF6B00", bg: "#FF6B0025", label: "TRIGGER-" },
  TRIGGER: { color: "#FF3B30", bg: "#FF3B3020", label: "TRIGGER" },
  INSIDE: { color: "#EF4444", bg: "#EF444430", label: "INSIDE" },
  UNKNOWN: { color: "#6B6B75", bg: "#6B6B7510", label: "—" },
};

const SIDE_STYLE: Record<Side, { color: string; label: string }> = {
  bull: { color: "#22C55E", label: "BULL" },
  bear: { color: "#EF4444", label: "BEAR" },
  pivot: { color: "#42A5F5", label: "PIVOT" },
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function SpreadGapTrackerPage() {
  const [live, setLive] = useState<LiveResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (force = false) => {
    try {
      setError(null);
      const url = `${API}/api/spread-gap/live${force ? "?force=true" : ""}`;
      const r = await fetch(url);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j: LiveResponse = await r.json();
      setLive(j);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown");
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useVisiblePolling(load, 10000);

  const forceRefresh = async () => {
    setRefreshing(true);
    try {
      await fetch(`${API}/api/spread-gap/auto-levels/refresh`, { method: "POST" });
      await load(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Refresh failed");
    } finally {
      setRefreshing(false);
    }
  };

  const kpis = useMemo(() => {
    if (!live) return null;
    const rows = live.rows;
    const closest = rows[0];
    const triggers = rows.filter(
      (r) => r.zone === "TRIGGER" || r.zone === "TRIGGER_INNER" || r.zone === "INSIDE",
    );
    return {
      count: rows.length,
      spot: live.spot,
      vix: live.vix,
      closestLabel: closest?.label || "—",
      closestGap: closest?.gap_abs ?? 0,
      triggers: triggers.length,
    };
  }, [live]);

  const autoAge = live?.auto?.age_seconds;
  const autoLabel = live?.auto?.from_cache
    ? `cache ${autoAge ?? 0}s`
    : "fresh UW";

  return (
    <div className="p-4">
      <PageHeader
        timer={<RefreshTimer intervalSeconds={10} />}
        title="Spread Gap Tracker"
        subtitle="Niveaux auto-extraits depuis UW (Call/Put Wall, Gamma Flip, top GEX, prev close) — gap live SPX, auto-scale VIX"
      >
        <button
          onClick={forceRefresh}
          disabled={refreshing}
          className="px-3 py-1.5 bg-[#111114] border border-[#1E1E22] rounded-lg text-xs hover:border-[#FF6B00] transition-colors disabled:opacity-50"
        >
          {refreshing ? "Refetch UW..." : "Refetch UW"}
        </button>
        <LiveBadge />
      </PageHeader>

      {error && (
        <div className="mb-3 rounded-lg border border-[#EF4444] bg-[#EF444412] px-4 py-2 text-xs text-[#EF4444]">
          {error}
        </div>
      )}
      {live?.auto?.error && (
        <div className="mb-3 rounded-lg border border-[#FFA726] bg-[#FFA72612] px-4 py-2 text-xs text-[#FFA726]">
          UW : {live.auto.error}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-3">
        <KpiCard label="Spot SPX" value={kpis?.spot ? kpis.spot.toFixed(2) : "—"} />
        <KpiCard label="VIX" value={kpis?.vix ? kpis.vix.toFixed(2) : "—"} color="#FFA726" />
        <KpiCard
          label="Niveaux auto"
          value={kpis?.count ?? 0}
          sublabel={autoLabel}
          color="#42A5F5"
        />
        <KpiCard
          label="Plus proche"
          value={kpis ? `${kpis.closestGap.toFixed(1)} pts` : "—"}
          sublabel={kpis?.closestLabel}
          color="#FF6B00"
        />
        <KpiCard
          label="En trigger"
          value={kpis?.triggers ?? 0}
          color={kpis && kpis.triggers > 0 ? "#EF4444" : "#6B6B75"}
        />
      </div>

      {/* Tier info */}
      {live && (
        <Card className="p-3 mb-3">
          <div className="flex items-center gap-4 text-[10px] flex-wrap">
            <span className="font-bold text-[#6B6B75] uppercase tracking-wider">
              Tier VIX actif
            </span>
            <span className="text-[#FFA726]">
              VIX {live.vix.toFixed(1)} {"<="} {live.tier.vix_max}
            </span>
            <span className="text-[#6B6B75]">
              APPROACH &lt;={" "}
              <span className="text-[#FFA726] font-mono">{live.tier.approach} pts</span>
            </span>
            <span className="text-[#6B6B75]">
              TRIGGER{" "}
              <span className="text-[#FF3B30] font-mono">
                {live.tier.trigger_lo}-{live.tier.trigger_hi} pts
              </span>
            </span>
            <span className="text-[#6B6B75]">
              INSIDE{" "}
              <span className="text-[#EF4444] font-mono">
                &lt;= {live.tier.inside} pts
              </span>
            </span>
            <span className="ml-auto text-[9px] text-[#6B6B75]">
              {live.auto?.strikes_analyzed ?? 0} strikes analyses
            </span>
          </div>
        </Card>
      )}

      {/* Live panel — plein ecran */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-xs font-bold text-[#F0F0F0] uppercase tracking-wider">
              Niveaux auto — gap live
            </div>
            <div className="text-[9px] text-[#6B6B75]">
              Source : UW GEX strike (Call/Put Wall, Gamma Flip, top GEX) + close J-1
            </div>
          </div>
          <div className="text-[9px] text-[#6B6B75]">
            {live?.generated_at &&
              `MAJ ${new Date(live.generated_at).toLocaleTimeString("fr-FR")}`}
          </div>
        </div>

        {live && live.rows.length === 0 ? (
          <div className="py-12 text-center text-[#6B6B75] text-xs">
            Aucun niveau disponible — UW GEX vide ou quota atteint. Refetch plus tard.
          </div>
        ) : live ? (
          <div className="space-y-1.5">
            {live.rows.map((r) => {
              const zs = ZONE_STYLE[r.zone];
              const ss = SIDE_STYLE[r.side];
              const pct = Math.min(100, (r.gap_abs / live.tier.approach) * 100);
              return (
                <div
                  key={r.id}
                  className="relative rounded-md border px-3 py-2"
                  style={{
                    borderColor: `${zs.color}50`,
                    backgroundColor: zs.bg,
                  }}
                >
                  {/* Progress bar background */}
                  <div
                    className="absolute inset-y-0 left-0 rounded-md opacity-20"
                    style={{
                      width: `${100 - pct}%`,
                      backgroundColor: zs.color,
                    }}
                  />
                  <div className="relative flex items-center gap-3">
                    <span
                      className="font-mono text-[9px] font-bold uppercase px-1.5 py-0.5 rounded"
                      style={{ color: ss.color, backgroundColor: `${ss.color}20` }}
                    >
                      {ss.label}
                    </span>
                    <span className="text-[11px] font-bold text-[#F0F0F0] w-28 truncate">
                      {r.label}
                    </span>
                    {r.source && (
                      <span className="text-[8px] font-mono uppercase text-[#6B6B75] px-1.5 py-0.5 rounded border border-[#1E1E22]">
                        {r.source}
                      </span>
                    )}
                    <span className="text-[11px] font-mono text-[#B0B0B8] ml-auto">
                      @ {r.price.toFixed(2)}
                    </span>
                    <span
                      className="text-[11px] font-mono font-bold w-20 text-right"
                      style={{ color: zs.color }}
                    >
                      {r.gap >= 0 ? "+" : ""}
                      {r.gap.toFixed(1)} pts
                    </span>
                    <span
                      className="text-[9px] font-bold uppercase px-2 py-0.5 rounded min-w-[68px] text-center"
                      style={{ color: zs.color, backgroundColor: `${zs.color}25` }}
                    >
                      {zs.label}
                    </span>
                  </div>
                  {r.note && (
                    <div className="relative mt-1 text-[9px] text-[#6B6B75] pl-12">
                      {r.note}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-12 text-center text-[#6B6B75] text-xs">Chargement...</div>
        )}
      </Card>

      {/* Legende */}
      <Card className="p-3 mt-3">
        <div className="flex items-center gap-4 text-[9px] flex-wrap">
          <span className="font-bold text-[#6B6B75] uppercase tracking-wider">Zones :</span>
          {(Object.keys(ZONE_STYLE) as Zone[])
            .filter((z) => z !== "UNKNOWN")
            .map((z) => {
              const s = ZONE_STYLE[z];
              return (
                <span
                  key={z}
                  className="px-2 py-0.5 rounded font-mono"
                  style={{ color: s.color, backgroundColor: s.bg }}
                >
                  {s.label}
                </span>
              );
            })}
          <span className="ml-auto text-[#6B6B75]">
            Niveaux recalcules toutes les 5 minutes via UW GEX (cache auto). Seuils
            scaled automatiquement selon VIX.
          </span>
        </div>
      </Card>
    </div>
  );
}
