"use client";

import { useEffect, useState } from "react";

const API = "http://localhost:3850";

interface UWUsage {
  count: number;
  limit: number;
  pct: number;
  remaining: number;
  exhausted: boolean;
  updated_at: string | null;
  last_error: string | null;
  reset_at_utc: string;
  seconds_until_reset: number;
}

function formatCompact(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 1 : 2)}k`;
  return String(n);
}

function formatCountdown(seconds: number): string {
  if (seconds <= 0) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h${String(m).padStart(2, "0")}`;
  return `${m}min`;
}

export function UWUsageBar() {
  const [usage, setUsage] = useState<UWUsage | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const r = await fetch(`${API}/api/uw/usage`);
        if (!r.ok) return;
        const j = (await r.json()) as UWUsage;
        if (!cancelled) setUsage(j);
      } catch {
        /* silent — bar just disappears if backend is down */
      }
    };
    load();
    const id = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  if (!usage) return null;

  const pct = Math.min(100, Math.max(0, usage.pct));
  const color = usage.exhausted
    ? "#EF4444"
    : pct >= 90
    ? "#FF3B30"
    : pct >= 70
    ? "#FFA726"
    : pct >= 40
    ? "#FFD54F"
    : "#22C55E";

  // Live countdown using the locally ticking `now`
  const resetMs = usage.reset_at_utc ? Date.parse(usage.reset_at_utc) : 0;
  const remainingSec = resetMs ? Math.max(0, Math.round((resetMs - now) / 1000)) : usage.seconds_until_reset;

  const tooltip = usage.exhausted
    ? `UW quota epuise — ${usage.count}/${usage.limit} — reset dans ${formatCountdown(remainingSec)}`
    : `UW ${usage.count}/${usage.limit} (${pct.toFixed(1)}%) — reset dans ${formatCountdown(remainingSec)}`;

  return (
    <div
      className="flex items-center gap-1.5 px-2 py-1 rounded-md border"
      style={{
        background: `${color}10`,
        borderColor: `${color}40`,
      }}
      title={tooltip}
    >
      <span
        className="text-[9px] font-bold uppercase tracking-wider"
        style={{ color }}
      >
        UW
      </span>
      <div className="relative w-20 h-1.5 rounded-sm overflow-hidden bg-[#1A1A1E]">
        <div
          className={`absolute inset-y-0 left-0 transition-all duration-500 ${
            usage.exhausted ? "animate-pulse" : ""
          }`}
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${color}80, ${color})`,
            boxShadow: `0 0 4px ${color}80`,
          }}
        />
      </div>
      <span
        className="text-[9px] font-mono tabular-nums"
        style={{ color }}
      >
        {formatCompact(usage.count)}/{formatCompact(usage.limit)}
      </span>
      {usage.exhausted && (
        <span className="text-[8px] font-bold uppercase text-[#EF4444]">
          · {formatCountdown(remainingSec)}
        </span>
      )}
    </div>
  );
}
