"use client";

import { useRef, useEffect } from "react";
import { RangeLevelsEntry, RangeLevel } from "@/lib/signals-types";

interface RangeLevelsProps {
  asset: string;
  data: RangeLevelsEntry;
}

const CONTAINER_HEIGHT = 600;
const PADDING_TOP = 32;
const PADDING_BOTTOM = 32;
const DRAWABLE = CONTAINER_HEIGHT - PADDING_TOP - PADDING_BOTTOM;

export function RangeLevels({ asset, data }: RangeLevelsProps) {
  const { open, current_price, rmc, levels } = data;
  const containerRef = useRef<HTMLDivElement>(null);

  // Collect all price points to compute range for proportional positioning
  const allPrices = [open, current_price, ...levels.map((l) => l.price)];
  const minPrice = Math.min(...allPrices);
  const maxPrice = Math.max(...allPrices);
  const priceSpan = maxPrice - minPrice || 1;

  function priceToY(price: number): number {
    // Top = highest price, bottom = lowest price
    return PADDING_TOP + ((maxPrice - price) / priceSpan) * DRAWABLE;
  }

  const openY = priceToY(open);
  const currentY = priceToY(current_price);

  // Auto-center current price
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const scrollTarget = currentY - el.clientHeight / 2;
    el.scrollTop = Math.max(0, scrollTarget);
  }, [currentY]);

  // Separate up/down levels
  const upLevels = levels.filter((l) => l.side === "up").sort((a, b) => b.price - a.price);
  const downLevels = levels.filter((l) => l.side === "down").sort((a, b) => b.price - a.price);

  // Find closest level to current price
  const closestLevel = levels.reduce<RangeLevel | null>((acc, l) => {
    if (!acc) return l;
    return Math.abs(l.price - current_price) < Math.abs(acc.price - current_price) ? l : acc;
  }, null);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#2A2A2E]">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[#F0F0F0]">{asset}</span>
          <span className="text-[10px] text-[#6B6B75]">— Niveaux de range</span>
        </div>
        <div className="text-[10px] text-[#6B6B75]">
          RMC: <span className="text-[#F0F0F0] font-mono">{rmc}</span>
        </div>
      </div>

      {/* Ruler container */}
      <div
        ref={containerRef}
        className="relative overflow-y-auto overflow-x-hidden flex-1"
        style={{ height: CONTAINER_HEIGHT, minHeight: CONTAINER_HEIGHT }}
      >
        {/* Inner SVG canvas */}
        <div className="relative" style={{ height: Math.max(CONTAINER_HEIGHT, DRAWABLE + PADDING_TOP + PADDING_BOTTOM) }}>
          {/* Green gradient above open */}
          <div
            className="absolute left-0 right-0"
            style={{
              top: 0,
              height: openY,
              background: "linear-gradient(to bottom, rgba(16,185,129,0.18) 0%, rgba(16,185,129,0.04) 100%)",
            }}
          />
          {/* Red gradient below open */}
          <div
            className="absolute left-0 right-0"
            style={{
              top: openY,
              bottom: 0,
              background: "linear-gradient(to bottom, rgba(239,68,68,0.04) 0%, rgba(239,68,68,0.18) 100%)",
            }}
          />

          {/* Level rungs */}
          {levels.map((level) => {
            const y = priceToY(level.price);
            const isClosest = closestLevel === level;
            const isUp = level.side === "up";
            const lineColor = isUp ? "rgba(16,185,129,0.35)" : "rgba(239,68,68,0.35)";
            const textColor = isUp ? "#10B981" : "#EF4444";

            return (
              <div
                key={`${level.pct}`}
                className="absolute left-0 right-0 flex items-center"
                style={{
                  top: y - 1,
                  height: 2,
                  background: isClosest ? (isUp ? "#10B981" : "#EF4444") : lineColor,
                  transition: "top 0.4s ease",
                  border: isClosest ? `0.5px solid ${isUp ? "#10B981" : "#EF4444"}` : undefined,
                  zIndex: isClosest ? 2 : 1,
                }}
              >
                {/* Pct label (left) */}
                <span
                  className="absolute left-1 text-[9px] font-mono select-none"
                  style={{
                    color: isClosest ? "#F0F0F0" : textColor,
                    top: -10,
                  }}
                >
                  {level.pct > 0 ? "+" : ""}{level.pct}%
                </span>
                {/* Price label (right) */}
                <span
                  className="absolute right-1 text-[9px] font-mono select-none"
                  style={{
                    color: isClosest ? "#F0F0F0" : "#6B6B75",
                    top: -10,
                  }}
                >
                  {level.price.toFixed(2)}
                </span>
              </div>
            );
          })}

          {/* OPEN line */}
          <div
            className="absolute left-0 right-0 flex items-center"
            style={{ top: openY - 1, height: 2, background: "#F0F0F0", zIndex: 3 }}
          >
            <span
              className="absolute left-1 text-[10px] font-bold text-[#F0F0F0] select-none"
              style={{ top: -12 }}
            >
              OPEN {open.toFixed(2)}
            </span>
          </div>

          {/* Current price line */}
          <div
            className="absolute left-0 right-0"
            style={{
              top: currentY - 1,
              height: 2,
              background: "#FFA726",
              zIndex: 4,
              transition: "top 0.4s ease",
            }}
          >
            {/* Triangle marker */}
            <div
              style={{
                position: "absolute",
                left: -2,
                top: -5,
                width: 0,
                height: 0,
                borderTop: "6px solid transparent",
                borderBottom: "6px solid transparent",
                borderLeft: "10px solid #FFA726",
              }}
            />
            <span
              className="absolute left-3 text-[10px] font-bold text-[#FFA726] font-mono select-none"
              style={{ top: -12 }}
            >
              {current_price.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
