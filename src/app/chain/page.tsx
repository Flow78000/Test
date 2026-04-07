"use client";

import { useState, useEffect } from "react";
import { PageHeader, LiveBadge, Card } from "@/components/ui/card";

export default function ChainPage() {
  const [ticker, setTicker] = useState("SPX");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const tickers = ["SPX", "SPY", "QQQ", "IWM", "AAPL", "NVDA", "TSLA"];

  async function loadChain() {
    setLoading(true);
    try {
      const resp = await fetch(`http://localhost:3849/api/uw/option-contracts?ticker=${ticker}`);
      const json = await resp.json();
      setData(json);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  useEffect(() => { loadChain(); }, [ticker]);

  return (
    <div className="p-6">
      <PageHeader title="Vol Desk Chain" subtitle="Options chain institutionnelle — GEX, Vanna, Greeks par strike">
        <select value={ticker} onChange={e => setTicker(e.target.value)} className="text-sm">
          {tickers.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <button onClick={loadChain} className="px-3 py-1.5 bg-[#111114] border border-[#1E1E22] rounded-lg text-xs hover:border-[#FF6B00] transition-colors">
          Rafraichir
        </button>
        <LiveBadge />
      </PageHeader>

      <Card className="p-4">
        {loading ? (
          <div className="text-center py-12 text-[#6B6B75]">Chargement...</div>
        ) : !data?.data ? (
          <div className="text-center py-12 text-[#6B6B75]">
            Lancez le serveur: <code className="bg-[#08080A] px-2 py-1 rounded text-[#FF6B00]">cd D:\flo-w\server && python main.py</code>
          </div>
        ) : (
          <div className="text-sm text-[#6B6B75]">
            {data.data.length} contrats charges pour {ticker}
            <p className="mt-2 text-xs">Chain table en cours de migration...</p>
          </div>
        )}
      </Card>
    </div>
  );
}
