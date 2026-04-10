"use client";

import { useEffect, useState } from "react";

type Props = {
  /** Intervalle de refresh en secondes (default 10) */
  intervalSeconds?: number;
  /** Timestamp (epoch ms) de la derniere mise a jour reelle. Si fourni, synchronise le compteur. */
  lastUpdate?: number;
  /** Libelle compact ou etendu */
  compact?: boolean;
};

/**
 * Petit indicateur toujours visible en haut a gauche d'une page :
 * - heure de la derniere mise a jour (HH:MM:SS)
 * - compte a rebours vers la prochaine (Xs) avec barre de progression
 *
 * Si `lastUpdate` est passe, le timer reset a chaque changement de ce prop.
 * Sinon il tourne en autonomie (simule un refresh reussi toutes les N secondes).
 */
export function RefreshTimer({ intervalSeconds = 10, lastUpdate, compact = false }: Props) {
  const [now, setNow] = useState<number>(() => Date.now());
  const [lastTick, setLastTick] = useState<number>(() => Date.now());

  // Heartbeat 500 ms pour la progress bar + countdown fluide
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);

  // Si le parent passe lastUpdate, on resynchronise
  useEffect(() => {
    if (lastUpdate) setLastTick(lastUpdate);
  }, [lastUpdate]);

  // Mode autonome : reset du compteur a chaque fin d'intervalle si pas de lastUpdate
  useEffect(() => {
    if (lastUpdate) return;
    const id = setInterval(() => setLastTick(Date.now()), intervalSeconds * 1000);
    return () => clearInterval(id);
  }, [intervalSeconds, lastUpdate]);

  const elapsed = Math.max(0, (now - lastTick) / 1000);
  const remaining = Math.max(0, intervalSeconds - elapsed);
  const pct = Math.min(100, (elapsed / intervalSeconds) * 100);

  const d = new Date(lastTick);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");

  const urgent = remaining < 3;
  const color = urgent ? "#FFA726" : "#FF6B00";

  if (compact) {
    return (
      <span className="inline-flex items-center gap-2 text-[10px] font-mono text-[#6B6B75]">
        <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: color }} />
        {hh}:{mm}:{ss} · {remaining.toFixed(0)}s
      </span>
    );
  }

  return (
    <div className="inline-flex flex-col gap-1 px-3 py-1.5 rounded-lg bg-[#08080A] border border-[#1E1E22] min-w-[168px]">
      <div className="flex items-center gap-2 text-[9px] uppercase tracking-widest text-[#6B6B75]">
        <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: color }} />
        <span>MAJ</span>
        <span className="font-mono text-[#E5E5E7]">{hh}:{mm}:{ss}</span>
        <span className="ml-auto font-mono" style={{ color }}>
          {remaining < 1 ? "SYNC" : `dans ${remaining.toFixed(0)}s`}
        </span>
      </div>
      <div className="h-[2px] rounded-full bg-[#1A1A1E] overflow-hidden">
        <div
          className="h-full transition-[width] duration-500 ease-linear"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}
