"use client";

import { useState } from "react";
import {
  RangeHeatmapData,
  AssetFamily,
  FAMILY_LABEL,
  FAMILY_ORDER,
  heatmapColor,
  heatmapColorSoft,
} from "@/lib/signals-types";

interface RangeHeatmapProps {
  data: RangeHeatmapData;
  onAssetClick?: (symbol: string) => void;
}

const LEGEND_BUCKETS: Array<{ label: string; color: string; soft: string }> = [
  { label: "< 75% RMC", color: "#C0392B", soft: "rgba(192,57,43,0.28)" },
  { label: "75–100%", color: "#F39C12", soft: "rgba(243,156,18,0.28)" },
  { label: "100–150%", color: "#27AE60", soft: "rgba(39,174,96,0.28)" },
  { label: "> 150%", color: "#8E44AD", soft: "rgba(142,68,173,0.32)" },
];

export function RangeHeatmap({ data, onAssetClick }: RangeHeatmapProps) {
  const [activeFamily, setActiveFamily] = useState<AssetFamily | "all">("all");

  // Filter
  const filtered =
    activeFamily === "all"
      ? data.assets
      : data.assets.filter((a) => a.family === activeFamily);

  // Sort: by family order first, then by pct desc within family
  const sorted = [...filtered].sort((a, b) => {
    const fa = FAMILY_ORDER.indexOf(a.family);
    const fb = FAMILY_ORDER.indexOf(b.family);
    if (fa !== fb) return fa - fb;
    return b.pct_vs_rmc - a.pct_vs_rmc;
  });

  const families = FAMILY_ORDER.filter((f) =>
    data.assets.some((a) => a.family === f)
  );

  return (
    <div className="flex flex-col gap-3">
      {/* Filter buttons */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setActiveFamily("all")}
          className="px-3 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wide transition-all"
          style={{
            background: activeFamily === "all" ? "#FF6B0022" : "#1A1A1E",
            color: activeFamily === "all" ? "#FF6B00" : "#6B6B75",
            border: `1px solid ${activeFamily === "all" ? "#FF6B0044" : "#2A2A2E"}`,
          }}
        >
          Tous
        </button>
        {families.map((f) => (
          <button
            key={f}
            onClick={() => setActiveFamily(f)}
            className="px-3 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wide transition-all"
            style={{
              background: activeFamily === f ? "#FF6B0022" : "#1A1A1E",
              color: activeFamily === f ? "#FF6B00" : "#6B6B75",
              border: `1px solid ${activeFamily === f ? "#FF6B0044" : "#2A2A2E"}`,
            }}
          >
            {FAMILY_LABEL[f]}
          </button>
        ))}
      </div>

      {/* Grid */}
      {sorted.length === 0 ? (
        <div className="text-[11px] text-[#6B6B75] py-6 text-center">Aucun actif</div>
      ) : (
        <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-6 gap-1.5">
          {sorted.map((asset) => {
            const bg = heatmapColorSoft(asset.pct_vs_rmc);
            const border = heatmapColor(asset.pct_vs_rmc);
            return (
              <button
                key={asset.symbol}
                onClick={() => onAssetClick?.(asset.symbol)}
                className="rounded-lg p-2 flex flex-col items-center gap-0.5 transition-all hover:scale-105"
                style={{
                  background: bg,
                  border: `1px solid ${border}55`,
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.border = `1px solid ${border}CC`;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.border = `1px solid ${border}55`;
                }}
              >
                <span className="text-[10px] font-bold text-[#F0F0F0] tracking-wider">
                  {asset.symbol}
                </span>
                <span
                  className="text-[11px] font-mono font-semibold"
                  style={{ color: border }}
                >
                  {asset.pct_vs_rmc.toFixed(0)}%
                </span>
                <span className="text-[9px] text-[#6B6B75] font-mono">
                  {asset.range_pts > 0 ? "+" : ""}{asset.range_pts.toFixed(0)}pts
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-2 pt-1">
        {LEGEND_BUCKETS.map((b) => (
          <div key={b.label} className="flex items-center gap-1.5">
            <div
              className="w-3 h-3 rounded-sm"
              style={{ background: b.soft, border: `1px solid ${b.color}88` }}
            />
            <span className="text-[9px] text-[#6B6B75]">{b.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
