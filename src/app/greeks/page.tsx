"use client";

import { useState } from "react";
import { PageHeader, LiveBadge, Card } from "@/components/ui/card";

export default function GreeksPage() {
  const [ticker, setTicker] = useState("SPX");

  return (
    <div className="p-6">
      <PageHeader title="GEX / Vanna / Charm par Strike" subtitle="Exposition Greeks live via Unusual Whales">
        <select value={ticker} onChange={e => setTicker(e.target.value)} className="text-sm">
          {["SPX", "SPY", "QQQ"].map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <LiveBadge />
      </PageHeader>

      <Card className="p-6 text-center text-[#6B6B75]">
        <p className="text-lg font-semibold mb-2">Greeks par Strike — {ticker}</p>
        <p className="text-sm">6 charts: GEX, Vanna Nette, Charm Net, Vol Realisee, Vanna Call/Put, Charm Call/Put</p>
        <p className="text-xs mt-4">Migration des charts en cours — les donnees sont disponibles via l'API</p>
      </Card>
    </div>
  );
}
