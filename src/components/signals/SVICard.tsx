"use client";

import { SVIEntry, sviColor, sviLabel } from "@/lib/signals-types";

interface SVICardProps {
  asset: string;
  data: SVIEntry;
  highlighted?: boolean;
}

export function SVICard({ asset, data, highlighted }: SVICardProps) {
  const { pct_of_rmc, rmc, current_range } = data;
  const color = sviColor(pct_of_rmc);
  const label = sviLabel(pct_of_rmc);

  // Semicircle gauge: 0% = left end, 100% = top, 200% = right end
  // SVG semicircle from 180deg to 0deg (left to right, arcing upward)
  const CX = 70;
  const CY = 80;
  const R = 54;

  // Map pct_of_rmc (0–200) to angle (180deg → 0deg)
  const clampedPct = Math.max(0, Math.min(200, pct_of_rmc));
  const angleDeg = 180 - (clampedPct / 200) * 180;
  const angleRad = (angleDeg * Math.PI) / 180;

  // Arc path for background (full semicircle)
  const bgStart = { x: CX - R, y: CY };
  const bgEnd = { x: CX + R, y: CY };
  const bgPath = `M ${bgStart.x} ${bgStart.y} A ${R} ${R} 0 0 1 ${bgEnd.x} ${bgEnd.y}`;

  // Arc path for filled portion
  const fillEndX = CX + R * Math.cos(angleRad);
  const fillEndY = CY - R * Math.sin(angleRad);
  const largeArc = clampedPct > 100 ? 1 : 0;
  const fillPath = `M ${bgStart.x} ${bgStart.y} A ${R} ${R} 0 ${largeArc} 1 ${fillEndX} ${fillEndY}`;

  return (
    <div
      className="rounded-xl p-4 flex flex-col items-center gap-2"
      style={{
        background: "#111114",
        border: `1px solid ${highlighted ? color : "#2A2A2E"}`,
        boxShadow: highlighted ? `0 0 0 1px ${color}33` : undefined,
        transition: "border-color 0.3s, box-shadow 0.3s",
        minWidth: 160,
      }}
    >
      {/* Asset name */}
      <div className="text-[11px] font-bold tracking-widest text-[#6B6B75] uppercase">
        {asset}
      </div>

      {/* Gauge */}
      <svg width={140} height={90} viewBox="0 0 140 90" style={{ overflow: "visible" }}>
        {/* Background arc */}
        <path
          d={bgPath}
          fill="none"
          stroke="#2A2A2E"
          strokeWidth={10}
          strokeLinecap="round"
        />
        {/* Filled arc */}
        <path
          d={fillPath}
          fill="none"
          stroke={color}
          strokeWidth={10}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.6s ease, stroke 0.4s ease" }}
        />
        {/* Needle dot */}
        <circle
          cx={fillEndX}
          cy={fillEndY}
          r={5}
          fill={color}
          style={{ transition: "cx 0.6s ease, cy 0.6s ease" }}
        />
        {/* 0% label */}
        <text x={CX - R - 2} y={CY + 16} fontSize={9} fill="#6B6B75" textAnchor="middle">
          0%
        </text>
        {/* 200% label */}
        <text x={CX + R + 2} y={CY + 16} fontSize={9} fill="#6B6B75" textAnchor="middle">
          200%
        </text>
        {/* 100% tick */}
        <line x1={CX} y1={CY - R - 4} x2={CX} y2={CY - R + 4} stroke="#3A3A3E" strokeWidth={1.5} />
        {/* Center value */}
        <text
          x={CX}
          y={CY - 12}
          fontSize={22}
          fontWeight="800"
          fill={color}
          textAnchor="middle"
          fontFamily="monospace"
          style={{ transition: "fill 0.4s ease" }}
        >
          {pct_of_rmc.toFixed(1)}%
        </text>
        {/* Label */}
        <text x={CX} y={CY + 4} fontSize={9} fill="#6B6B75" textAnchor="middle">
          {label}
        </text>
      </svg>

      {/* Stats */}
      <div className="flex flex-col gap-1 w-full text-[10px] text-[#6B6B75]">
        <div className="flex justify-between">
          <span>RMC</span>
          <span className="text-[#F0F0F0] font-mono">{rmc}</span>
        </div>
        <div className="flex justify-between">
          <span>Range actuel</span>
          <span className="text-[#F0F0F0] font-mono">{current_range}</span>
        </div>
      </div>
    </div>
  );
}
