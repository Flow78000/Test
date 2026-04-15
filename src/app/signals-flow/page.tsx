"use client";

import { useState } from "react";
import { useSignals } from "@/hooks/use-signals";
import { PageHeader, Card, Badge, LiveBadge } from "@/components/ui/card";
import { SVICard } from "@/components/signals/SVICard";
import { RangeLevels } from "@/components/signals/RangeLevels";
import { RangeHeatmap } from "@/components/signals/RangeHeatmap";
import { timeAgo } from "@/lib/format";

export default function SignalsFlowPage() {
  const { signals, isConnected, lastUpdate, source, error, reconnect, toggleMock, bridgeUrl } =
    useSignals();

  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);

  // Derive the active asset for RangeLevels
  const rangeLevelKeys = signals?.range_levels ? Object.keys(signals.range_levels) : [];
  const activeAsset =
    selectedAsset && rangeLevelKeys.includes(selectedAsset)
      ? selectedAsset
      : rangeLevelKeys[0] ?? null;

  // When heatmap cell is clicked, select if it has range levels
  function handleHeatmapClick(symbol: string) {
    if (rangeLevelKeys.includes(symbol)) {
      setSelectedAsset(symbol);
    }
  }

  // Source badge colors
  const sourceColor =
    source === "sierra" ? "#10B981" : source === "mock" ? "#F59E0B" : "#6B6B75";
  const sourceLabel =
    source === "sierra" ? "Sierra Chart" : source === "mock" ? "Mock" : "Aucune source";

  return (
    <div className="p-6 space-y-6 min-h-screen" style={{ background: "#0A0A0A", color: "#F0F0F0" }}>
      {/* Header */}
      <PageHeader title="FLOW Signals" subtitle="Sierra Chart en temps reel">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Connection status */}
          {isConnected ? (
            <LiveBadge />
          ) : (
            <span className="flex items-center gap-1.5 text-[10px] text-[#EF4444] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444]" />
              DECONNECTE
            </span>
          )}

          {/* Source badge */}
          <Badge color={sourceColor}>Source: {sourceLabel}</Badge>

          {/* Last update */}
          {lastUpdate && (
            <span className="text-[10px] text-[#6B6B75]">
              MAJ: {timeAgo(lastUpdate)}
            </span>
          )}

          {/* Bridge URL */}
          <span className="text-[10px] text-[#6B6B75] font-mono hidden md:inline">
            Bridge: {bridgeUrl}
          </span>

          {/* Actions */}
          <button
            onClick={reconnect}
            className="px-3 py-1 rounded-md text-[10px] font-semibold text-[#F0F0F0] transition-all hover:bg-[#2A2A2E]"
            style={{ background: "#1A1A1E", border: "1px solid #2A2A2E" }}
          >
            Reconnecter
          </button>
          <button
            onClick={toggleMock}
            className="px-3 py-1 rounded-md text-[10px] font-semibold transition-all hover:bg-[#2A2A2E]"
            style={{
              background: source === "mock" ? "#F59E0B22" : "#1A1A1E",
              border: `1px solid ${source === "mock" ? "#F59E0B44" : "#2A2A2E"}`,
              color: source === "mock" ? "#F59E0B" : "#F0F0F0",
            }}
          >
            {source === "mock" ? "Desactiver Mock" : "Activer Mock"}
          </button>
        </div>
      </PageHeader>

      {/* Error banner */}
      {error && (
        <div
          className="rounded-lg px-4 py-3 text-sm font-medium"
          style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", color: "#EF4444" }}
        >
          Erreur: {error}
        </div>
      )}

      {/* Empty state */}
      {!signals && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="text-5xl">📡</div>
          <div className="text-lg font-semibold text-[#6B6B75]">
            En attente des signaux du bridge...
          </div>
          <Card className="p-4 max-w-md text-center">
            <p className="text-[11px] text-[#6B6B75] mb-2">
              Verifie que le bridge tourne:
            </p>
            <code className="text-[11px] text-[#F59E0B] font-mono bg-[#1A1A1E] px-3 py-1.5 rounded-md block">
              py -3.11 flow_bridge\bridge.py
            </code>
            <p className="text-[10px] text-[#6B6B75] mt-3">
              Bridge attendu sur: <span className="text-[#F0F0F0] font-mono">{bridgeUrl}</span>
            </p>
          </Card>
        </div>
      )}

      {/* Main content */}
      {signals && (
        <div className="space-y-6">
          {/* Row 1: SVI Cards */}
          {Object.keys(signals.svi).length > 0 && (
            <div>
              <div className="text-[10px] text-[#6B6B75] uppercase tracking-widest mb-3 font-semibold">
                Volatilite Intraday (SVI)
              </div>
              <div className="flex flex-wrap gap-3">
                {Object.entries(signals.svi).map(([asset, sviData]) => (
                  <SVICard
                    key={asset}
                    asset={asset}
                    data={sviData}
                    highlighted={asset === activeAsset}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Row 2: RangeLevels + Heatmap */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left: RangeLevels */}
            <Card className="overflow-hidden">
              {activeAsset && signals.range_levels[activeAsset] ? (
                <div className="flex flex-col h-full">
                  {/* Asset selector */}
                  {rangeLevelKeys.length > 1 && (
                    <div className="flex items-center gap-2 px-3 py-2 border-b border-[#2A2A2E]">
                      <span className="text-[10px] text-[#6B6B75]">Actif:</span>
                      <select
                        value={activeAsset}
                        onChange={(e) => setSelectedAsset(e.target.value)}
                        className="text-[11px] font-semibold bg-[#1A1A1E] border border-[#2A2A2E] rounded px-2 py-0.5 text-[#F0F0F0] outline-none cursor-pointer"
                      >
                        {rangeLevelKeys.map((k) => (
                          <option key={k} value={k}>
                            {k}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <RangeLevels asset={activeAsset} data={signals.range_levels[activeAsset]} />
                </div>
              ) : (
                <div className="flex items-center justify-center h-40 text-[11px] text-[#6B6B75]">
                  Aucun niveau de range disponible
                </div>
              )}
            </Card>

            {/* Right: Heatmap */}
            <Card className="p-4">
              <div className="text-[10px] text-[#6B6B75] uppercase tracking-widest mb-3 font-semibold">
                Heatmap — % vs RMC
              </div>
              {signals.range_heatmap && signals.range_heatmap.assets.length > 0 ? (
                <RangeHeatmap data={signals.range_heatmap} onAssetClick={handleHeatmapClick} />
              ) : (
                <div className="text-[11px] text-[#6B6B75] py-8 text-center">
                  Aucune donnee heatmap
                </div>
              )}
            </Card>
          </div>

          {/* Bottom legend/help card */}
          <Card className="p-4">
            <div className="text-[10px] text-[#6B6B75] uppercase tracking-widest mb-3 font-semibold">
              Guide — RMC et niveaux de range
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[11px] text-[#6B6B75]">
              <div>
                <p className="text-[#F0F0F0] font-semibold mb-1">RMC (Range Moyen de Cloture)</p>
                <p>
                  Le RMC est la volatilite de reference: il represente l amplitude moyenne journaliere
                  observee sur les 20 dernieres sessions. Un range actuel superieur a 100% du RMC
                  indique une journee exceptionnellement volatile.
                </p>
              </div>
              <div>
                <p className="text-[#F0F0F0] font-semibold mb-1">Les 16 niveaux</p>
                <p>
                  Les niveaux sont distribues proportionnellement autour de l ouverture (OPEN = 0%).
                  Les niveaux positifs (+25%, +50%...) sont au-dessus de l ouverture; les negatifs
                  en-dessous. La ligne orange indique le prix actuel en temps reel.
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
