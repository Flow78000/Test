"use client";

import { useState, useEffect } from "react";

interface DataFreshnessProps {
  fileModified?: string;
  dataAgeSeconds?: number;
  isStale?: boolean;
  className?: string;
}

/**
 * Displays data freshness indicator with last update time.
 * Shows green dot for live, orange for >2min, red + warning for >5min (stale).
 * Auto-increments the displayed age every 10 seconds.
 */
export function DataFreshness({ fileModified, dataAgeSeconds, isStale, className = "" }: DataFreshnessProps) {
  const [elapsed, setElapsed] = useState(dataAgeSeconds ?? 0);

  // Reset elapsed when new data arrives
  useEffect(() => {
    setElapsed(dataAgeSeconds ?? 0);
  }, [dataAgeSeconds]);

  // Auto-increment every 10s
  useEffect(() => {
    const t = setInterval(() => setElapsed(prev => prev + 10), 10000);
    return () => clearInterval(t);
  }, []);

  if (dataAgeSeconds == null && !fileModified) return null;

  const stale = isStale || elapsed > 300;
  const warn = elapsed > 120 && !stale;

  // Format age
  function fmtAge(s: number): string {
    if (s < 60) return `${s}s`;
    if (s < 3600) return `${Math.floor(s / 60)}min ${s % 60}s`;
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return `${h}h${m > 0 ? m + "min" : ""}`;
  }

  // Format date
  function fmtDate(iso: string): string {
    try {
      const d = new Date(iso);
      return d.toLocaleString("fr-FR", {
        day: "2-digit", month: "2-digit",
        hour: "2-digit", minute: "2-digit", second: "2-digit",
      });
    } catch {
      return iso;
    }
  }

  const dotColor = stale ? "#EF4444" : warn ? "#FFA726" : "#22C55E";
  const label = stale ? "DONNEES OBSOLETES" : warn ? "RETARD" : "LIVE";

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Dot */}
      <span
        className={`w-2 h-2 rounded-full ${stale ? "" : "animate-pulse"}`}
        style={{ backgroundColor: dotColor }}
      />

      {/* Label + time */}
      <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: dotColor }}>
        {label}
      </span>

      <span className="text-[10px] text-[#6B6B75]">
        {fileModified && `${fmtDate(fileModified)}`}
        {` (il y a ${fmtAge(elapsed)})`}
      </span>

      {/* Warning banner for stale */}
      {stale && (
        <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-bold bg-[#EF444420] text-[#EF4444] border border-[#EF444440]">
          Sierra Chart hors ligne ou ferme
        </span>
      )}
    </div>
  );
}
