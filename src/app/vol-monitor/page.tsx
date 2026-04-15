"use client";

import { useState, useEffect, useCallback } from "react";
import { useVisiblePolling } from "@/hooks/use-visible-polling";
import { PageHeader, LiveBadge, Card, KpiCard, Badge } from "@/components/ui/card";
import { RefreshTimer } from "@/components/ui/refresh-timer";
import { DataFreshness } from "@/components/ui/data-freshness";
import { fmtNum, fmtPct } from "@/lib/format";
import {
  LineChart, Line, BarChart, Bar, ComposedChart, Area,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  ReferenceLine, Legend,
} from "recharts";

const API = "http://localhost:3850";

function darkTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1A1A1E] border border-[#2A2A2E] rounded px-3 py-2 text-xs shadow-xl z-50">
      <div className="text-[#6B6B75] mb-1">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {typeof p.value === "number" ? p.value.toFixed(2) : p.value}
        </div>
      ))}
    </div>
  );
}

const SECTOR_COLORS: Record<string, string> = {
  XLK: "#42A5F5", XLV: "#66BB6A", XLP: "#AB47BC", XLU: "#FFA726",
  XLF: "#26C6DA", XLE: "#EF5350", XLB: "#78909C", XLY: "#FF7043",
};

// ---- TAB: Vol Desk Live ----
function VolDeskLiveTab() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [collecting, setCollecting] = useState(false);
  const [collectMsg, setCollectMsg] = useState("");
  const [twsStatus, setTwsStatus] = useState<{connected: boolean; qualified_count: number} | null>(null);
  const [reconnecting, setReconnecting] = useState(false);

  const loadTwsStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/market/tws/status`).then(r => r.json());
      setTwsStatus(res);
    } catch { setTwsStatus({ connected: false, qualified_count: 0 }); }
  }, []);

  const reconnectTws = async () => {
    setReconnecting(true);
    setCollectMsg("Reconnexion TWS en cours...");
    try {
      const res = await fetch(`${API}/api/market/tws/reconnect`, { method: "POST" }).then(r => r.json());
      if (res.connected) {
        setCollectMsg(`TWS reconnecte — ${res.qualified_count} contrats qualifies`);
        await loadTwsStatus();
        // Auto-collecte apres reconnexion reussie
        try {
          const c = await fetch(`${API}/api/market/vol-desk/collect`).then(r => r.json());
          if (!c.error) {
            const fresh = await fetch(`${API}/api/market/vol-desk/latest`).then(r => r.json());
            if (fresh && !fresh.error) setData(fresh);
          }
        } catch { }
      } else {
        setCollectMsg("Reconnexion echouee — verifiez que TWS tourne sur 127.0.0.1:7496");
      }
    } catch {
      setCollectMsg("Erreur lors de la reconnexion");
    }
    setReconnecting(false);
    setTimeout(() => setCollectMsg(""), 6000);
  };

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/market/vol-desk/latest`).then(r => r.json());
      if (res && !res.error) {
        setData(res);
      } else {
        // No cached data — try auto-collect
        setCollectMsg("Premiere collecte automatique...");
        try {
          const collectRes = await fetch(`${API}/api/market/vol-desk/collect`).then(r => r.json());
          if (collectRes && !collectRes.error) {
            const fresh = await fetch(`${API}/api/market/vol-desk/latest`).then(r => r.json());
            if (fresh && !fresh.error) setData(fresh);
            setCollectMsg(`Collecte reussie: ${collectRes.tickers_collected} tickers`);
          } else {
            setCollectMsg(collectRes?.error || "TWS non connecte — les donnees seront disponibles au prochain demarrage avec TWS");
          }
        } catch {
          setCollectMsg("TWS non connecte — les donnees seront disponibles au prochain demarrage avec TWS");
        }
      }
    } catch { }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    loadTwsStatus();
  }, [load, loadTwsStatus]);
  const autoRefresh = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/market/vol-desk/collect`).then(r => r.json());
      if (res && !res.error) {
        const fresh = await fetch(`${API}/api/market/vol-desk/latest`).then(r => r.json());
        if (fresh && !fresh.error) setData(fresh);
      }
    } catch { }
    loadTwsStatus();
  }, [loadTwsStatus]);
  useVisiblePolling(autoRefresh, 10000);

  const collect = async () => {
    setCollecting(true);
    setCollectMsg("");
    try {
      const res = await fetch(`${API}/api/market/vol-desk/collect`).then(r => r.json());
      if (!res.error) {
        await load();
        setCollectMsg(`Collecte reussie: ${res.tickers_collected} tickers`);
      } else {
        setCollectMsg(res.error);
      }
    } catch {
      setCollectMsg("TWS non disponible");
    }
    setCollecting(false);
    setTimeout(() => setCollectMsg(""), 5000);
  };

  if (loading && !data) return <div className="text-center py-20 text-[#6B6B75]">Chargement Vol Desk...</div>;

  // Group tickers by type
  const tickers = data?.tickers || {};
  const groups: Record<string, any[]> = {};
  Object.values(tickers).forEach((t: any) => {
    const g = t.group || t.sector || (t.type === "sector" ? "SECTEURS" : "AUTRE");
    if (!groups[g]) groups[g] = [];
    groups[g].push(t);
  });

  // Sector ETFs first
  const sectorSyms = ["XLK", "XLV", "XLP", "XLU", "XLF", "XLE", "XLB", "XLY"];
  const sectorData = sectorSyms.map(s => tickers[s]).filter(Boolean);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        {/* TWS Status + Reconnect button */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border"
             style={{
               background: twsStatus?.connected ? "#22C55E10" : "#EF444410",
               borderColor: twsStatus?.connected ? "#22C55E40" : "#EF444440",
             }}>
          <span className="w-2 h-2 rounded-full animate-pulse"
                style={{ background: twsStatus?.connected ? "#22C55E" : "#EF4444" }} />
          <span className="text-[11px] font-bold uppercase tracking-wider"
                style={{ color: twsStatus?.connected ? "#22C55E" : "#EF4444" }}>
            {twsStatus?.connected ? `TWS LIVE (${twsStatus.qualified_count} ctr)` : "TWS OFFLINE"}
          </span>
        </div>
        <button
          onClick={reconnectTws}
          disabled={reconnecting}
          className="px-4 py-2 bg-[#42A5F5] text-black rounded-lg text-xs font-bold hover:bg-[#64B5F6] disabled:opacity-50 transition-colors"
        >
          {reconnecting ? "Reconnexion..." : "Reconnecter TWS"}
        </button>
        <button
          onClick={collect}
          disabled={collecting}
          className="px-4 py-2 bg-[#FF6B00] text-black rounded-lg text-xs font-bold hover:bg-[#FF8C00] disabled:opacity-50 transition-colors"
        >
          {collecting ? "Collecte en cours..." : "Collecter Snapshot TWS"}
        </button>
        {collectMsg && (
          <span className={`text-xs px-3 py-1 rounded-lg ${collectMsg.includes("reussie") ? "bg-[#22C55E15] text-[#22C55E]" : "bg-[#FFA72615] text-[#FFA726]"}`}>
            {collectMsg}
          </span>
        )}
        {data?.date && (
          <span className="text-xs text-[#6B6B75]">
            Dernier snapshot: <span className="text-white font-mono">{data.date} {data.time?.slice(0, 5)}</span>
            {" — "}{data.count} tickers
          </span>
        )}
        {!data?.tickers && (
          <span className="text-xs text-[#FFA726]">Aucun snapshot. Connectez TWS et cliquez Collecter.</span>
        )}
      </div>

      {/* Sector ETFs Table */}
      {sectorData.length > 0 && (
        <Card className="p-4">
          <div className="text-xs text-[#6B6B75] uppercase tracking-wider mb-3">Secteurs — Vol Implicite & Historique</div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[#6B6B75] border-b border-[#1E1E22]">
                  <th className="text-left py-2 px-2">Secteur</th>
                  <th className="text-right py-2 px-2">Dernier</th>
                  <th className="text-right py-2 px-2">Var%</th>
                  <th className="text-right py-2 px-2">IV%</th>
                  <th className="text-right py-2 px-2">HV%</th>
                  <th className="text-right py-2 px-2">IV/HV</th>
                  <th className="text-right py-2 px-2">P/C Ratio</th>
                  <th className="text-right py-2 px-2">Call Vol</th>
                  <th className="text-right py-2 px-2">Put Vol</th>
                </tr>
              </thead>
              <tbody>
                {sectorData.map((t: any) => {
                  const ivHvColor = (t.iv_hv_ratio ?? 0) > 1.2 ? "#EF4444" : (t.iv_hv_ratio ?? 0) > 1 ? "#FFA726" : "#22C55E";
                  return (
                    <tr key={t.symbol} className="border-b border-[#1E1E22] hover:bg-[#16161A]">
                      <td className="py-2 px-2">
                        <span className="font-mono font-bold" style={{ color: SECTOR_COLORS[t.symbol] || "#FF6B00" }}>
                          {t.symbol}
                        </span>
                        <span className="text-[#6B6B75] ml-2">{t.name}</span>
                      </td>
                      <td className="text-right py-2 px-2 font-mono">{fmtNum(t.last, 2)}</td>
                      <td className="text-right py-2 px-2 font-mono" style={{ color: (t.change_pct ?? 0) >= 0 ? "#22C55E" : "#EF4444" }}>
                        {fmtPct(t.change_pct)}
                      </td>
                      <td className="text-right py-2 px-2 font-mono font-bold text-[#AB47BC]">{fmtNum(t.iv, 1)}%</td>
                      <td className="text-right py-2 px-2 font-mono text-[#42A5F5]">{fmtNum(t.hv, 1)}%</td>
                      <td className="text-right py-2 px-2 font-mono font-bold" style={{ color: ivHvColor }}>
                        {fmtNum(t.iv_hv_ratio, 2)}
                      </td>
                      <td className="text-right py-2 px-2 font-mono">{fmtNum(t.put_call_ratio, 2)}</td>
                      <td className="text-right py-2 px-2 font-mono text-[#22C55E]">{t.call_volume?.toLocaleString() ?? "--"}</td>
                      <td className="text-right py-2 px-2 font-mono text-[#EF4444]">{t.put_volume?.toLocaleString() ?? "--"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Cross-Asset Groups */}
      {Object.entries(groups).filter(([g]) => !sectorSyms.includes(g) && g !== "SECTEURS").map(([group, items]) => (
        <Card key={group} className="p-4">
          <div className="text-xs text-[#6B6B75] uppercase tracking-wider mb-3">{group}</div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[#6B6B75] border-b border-[#1E1E22]">
                  <th className="text-left py-2 px-2">Ticker</th>
                  <th className="text-right py-2 px-2">Dernier</th>
                  <th className="text-right py-2 px-2">Var%</th>
                  <th className="text-right py-2 px-2">IV%</th>
                  <th className="text-right py-2 px-2">HV%</th>
                  <th className="text-right py-2 px-2">IV/HV</th>
                  <th className="text-right py-2 px-2">P/C Ratio</th>
                </tr>
              </thead>
              <tbody>
                {items.map((t: any) => (
                  <tr key={t.symbol} className="border-b border-[#1E1E22] hover:bg-[#16161A]">
                    <td className="py-2 px-2">
                      <span className="font-mono font-bold text-[#FF6B00]">{t.symbol}</span>
                      <span className="text-[#6B6B75] ml-2">{t.name}</span>
                    </td>
                    <td className="text-right py-2 px-2 font-mono">{fmtNum(t.last, 2)}</td>
                    <td className="text-right py-2 px-2 font-mono" style={{ color: (t.change_pct ?? 0) >= 0 ? "#22C55E" : "#EF4444" }}>
                      {fmtPct(t.change_pct)}
                    </td>
                    <td className="text-right py-2 px-2 font-mono text-[#AB47BC]">{t.iv ? `${fmtNum(t.iv, 1)}%` : "--"}</td>
                    <td className="text-right py-2 px-2 font-mono text-[#42A5F5]">{t.hv ? `${fmtNum(t.hv, 1)}%` : "--"}</td>
                    <td className="text-right py-2 px-2 font-mono">{fmtNum(t.iv_hv_ratio, 2)}</td>
                    <td className="text-right py-2 px-2 font-mono">{fmtNum(t.put_call_ratio, 2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ))}

      {/* Sector holdings */}
      {sectorSyms.map(sector => {
        const holdings = Object.values(tickers).filter((t: any) => t.sector === sector);
        if (!holdings.length) return null;
        const meta = tickers[sector];
        return (
          <Card key={sector} className="p-4">
            <div className="text-xs uppercase tracking-wider mb-3" style={{ color: SECTOR_COLORS[sector] }}>
              {sector} — {meta?.name || sector} — Composants
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[#6B6B75] border-b border-[#1E1E22]">
                    <th className="text-left py-1.5 px-2">Ticker</th>
                    <th className="text-right py-1.5 px-2">Dernier</th>
                    <th className="text-right py-1.5 px-2">Var%</th>
                    <th className="text-right py-1.5 px-2">IV%</th>
                    <th className="text-right py-1.5 px-2">HV%</th>
                    <th className="text-right py-1.5 px-2">IV/HV</th>
                    <th className="text-right py-1.5 px-2">P/C</th>
                  </tr>
                </thead>
                <tbody>
                  {holdings.map((t: any) => (
                    <tr key={t.symbol} className="border-b border-[#0E0E12] hover:bg-[#16161A]">
                      <td className="py-1.5 px-2">
                        <span className="font-mono font-bold text-white">{t.symbol}</span>
                        <span className="text-[#6B6B75] ml-2 text-[10px]">{t.name}</span>
                      </td>
                      <td className="text-right py-1.5 px-2 font-mono">{fmtNum(t.last, 2)}</td>
                      <td className="text-right py-1.5 px-2 font-mono" style={{ color: (t.change_pct ?? 0) >= 0 ? "#22C55E" : "#EF4444" }}>
                        {fmtPct(t.change_pct)}
                      </td>
                      <td className="text-right py-1.5 px-2 font-mono text-[#AB47BC]">{t.iv ? `${fmtNum(t.iv, 1)}%` : "--"}</td>
                      <td className="text-right py-1.5 px-2 font-mono text-[#42A5F5]">{t.hv ? `${fmtNum(t.hv, 1)}%` : "--"}</td>
                      <td className="text-right py-1.5 px-2 font-mono">{fmtNum(t.iv_hv_ratio, 2)}</td>
                      <td className="text-right py-1.5 px-2 font-mono">{fmtNum(t.put_call_ratio, 2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// ---- TAB: Evolution Historique ----
function HistoryTab() {
  const [sectors, setSectors] = useState<any>(null);
  const [tickerHistory, setTickerHistory] = useState<any>(null);
  const [selectedTicker, setSelectedTicker] = useState("XLK");
  const [loading, setLoading] = useState(true);

  const loadSectors = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/market/vol-desk/sectors?days=90`).then(r => r.json());
      setSectors(res);
    } catch { }
    setLoading(false);
  }, []);

  const loadTicker = useCallback(async (sym: string) => {
    try {
      const res = await fetch(`${API}/api/market/vol-desk/ticker?symbol=${sym}&days=90`).then(r => r.json());
      setTickerHistory(res);
    } catch { }
  }, []);

  useEffect(() => { loadSectors(); }, [loadSectors]);
  useEffect(() => { loadTicker(selectedTicker); }, [selectedTicker, loadTicker]);

  if (loading) return <div className="text-center py-20 text-[#6B6B75]">Chargement historique...</div>;

  const sectorNames = ["XLK", "XLV", "XLP", "XLU", "XLF", "XLE", "XLB", "XLY"];
  const allTickers = [
    ...sectorNames,
    "VIX", "VVIX", "VXN", "RVX", "OVX", "GVZ", "VIX9D", "VIX3M", "VIX6M",
    "VXX", "SVXY", "UVXY", "SKEW",
    "BTAL", "IWM", "EEM", "FXY", "TLT", "HYG", "TAIL",
    "TSLY", "NVDY", "APLY", "MSFO", "QYLD", "XYLD", "JEPI", "JEPQ",
    "SPY", "GLD", "USO",
  ];

  const series = tickerHistory?.series || [];
  const noData = !series.length;

  return (
    <div className="space-y-4">
      {noData && (
        <Card className="p-6 text-center text-[#FFA726] text-sm">
          Pas encore de donnees historiques. Collectez des snapshots quotidiens via le bouton dans l'onglet Live,
          ou lancez <code className="bg-[#08080A] px-2 py-1 rounded text-[#FF6B00]">python scripts/collect_vol_desk.py --loop</code>
        </Card>
      )}

      {/* Ticker Selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs text-[#6B6B75]">Ticker:</span>
        <select
          value={selectedTicker}
          onChange={e => setSelectedTicker(e.target.value)}
          className="bg-[#111114] border border-[#1E1E22] rounded-lg px-3 py-1.5 text-xs text-white"
        >
          <optgroup label="Secteurs">
            {sectorNames.map(s => <option key={s} value={s}>{s}</option>)}
          </optgroup>
          <optgroup label="Volatilite">
            {["VIX", "VVIX", "VXN", "RVX", "OVX", "GVZ"].map(s => <option key={s} value={s}>{s}</option>)}
          </optgroup>
          <optgroup label="Term Structure">
            {["VIX9D", "VIX3M", "VIX6M"].map(s => <option key={s} value={s}>{s}</option>)}
          </optgroup>
          <optgroup label="ETF Vol">
            {["VXX", "SVXY", "UVXY"].map(s => <option key={s} value={s}>{s}</option>)}
          </optgroup>
          <optgroup label="Stress/Rotation">
            {["BTAL", "IWM", "EEM", "FXY", "TLT", "HYG", "TAIL", "SKEW"].map(s => <option key={s} value={s}>{s}</option>)}
          </optgroup>
          <optgroup label="Covered Call">
            {["TSLY", "NVDY", "APLY", "MSFO", "QYLD", "XYLD", "JEPI", "JEPQ"].map(s => <option key={s} value={s}>{s}</option>)}
          </optgroup>
          <optgroup label="Assets">
            {["SPY", "GLD", "USO"].map(s => <option key={s} value={s}>{s}</option>)}
          </optgroup>
        </select>
        <span className="text-xs text-[#6B6B75]">{series.length} jours de donnees</span>
      </div>

      {series.length > 0 && (
        <>
          {/* IV / HV Evolution */}
          <Card className="p-4">
            <div className="text-xs text-[#6B6B75] uppercase tracking-wider mb-3">
              {selectedTicker} — IV vs HV (evolution quotidienne)
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={series}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E1E22" />
                <XAxis dataKey="date" tick={{ fill: "#6B6B75", fontSize: 9 }} interval="preserveStartEnd" />
                <YAxis tick={{ fill: "#6B6B75", fontSize: 10 }} />
                <Tooltip content={darkTooltip} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line dataKey="iv" stroke="#AB47BC" strokeWidth={2} dot={false} name="IV %" />
                <Line dataKey="hv" stroke="#42A5F5" strokeWidth={2} dot={false} name="HV %" />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>

          {/* IV/HV Ratio */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-4">
              <div className="text-xs text-[#6B6B75] uppercase tracking-wider mb-3">{selectedTicker} — Ratio IV/HV</div>
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={series}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E1E22" />
                  <XAxis dataKey="date" tick={{ fill: "#6B6B75", fontSize: 9 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fill: "#6B6B75", fontSize: 10 }} />
                  <Tooltip content={darkTooltip} />
                  <ReferenceLine y={1} stroke="#6B6B75" strokeDasharray="4 4" label={{ value: "1.0", fill: "#6B6B75", fontSize: 9 }} />
                  <Area dataKey="iv_hv_ratio" fill="#FF6B0015" stroke="#FF6B00" strokeWidth={2} name="IV/HV" dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </Card>

            <Card className="p-4">
              <div className="text-xs text-[#6B6B75] uppercase tracking-wider mb-3">{selectedTicker} — Put/Call Ratio</div>
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={series}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E1E22" />
                  <XAxis dataKey="date" tick={{ fill: "#6B6B75", fontSize: 9 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fill: "#6B6B75", fontSize: 10 }} />
                  <Tooltip content={darkTooltip} />
                  <ReferenceLine y={1} stroke="#6B6B75" strokeDasharray="4 4" />
                  <Area dataKey="put_call_ratio" fill="#AB47BC15" stroke="#AB47BC" strokeWidth={2} name="P/C Ratio" dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Price + Change */}
          <Card className="p-4">
            <div className="text-xs text-[#6B6B75] uppercase tracking-wider mb-3">{selectedTicker} — Prix & Variation</div>
            <ResponsiveContainer width="100%" height={250}>
              <ComposedChart data={series}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E1E22" />
                <XAxis dataKey="date" tick={{ fill: "#6B6B75", fontSize: 9 }} interval="preserveStartEnd" />
                <YAxis yAxisId="price" tick={{ fill: "#42A5F5", fontSize: 10 }} />
                <YAxis yAxisId="chg" orientation="right" tick={{ fill: "#FF6B00", fontSize: 10 }} />
                <Tooltip content={darkTooltip} />
                <Line yAxisId="price" dataKey="last" stroke="#42A5F5" strokeWidth={2} dot={false} name="Prix" />
                <Bar yAxisId="chg" dataKey="change_pct" name="Var%" fill="#FF6B0060" />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>
        </>
      )}

      {/* Sector Comparison */}
      {sectors && Object.keys(sectors).length > 0 && (
        <Card className="p-4">
          <div className="text-xs text-[#6B6B75] uppercase tracking-wider mb-3">Comparaison IV Secteurs</div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E1E22" />
              <XAxis
                dataKey="date"
                tick={{ fill: "#6B6B75", fontSize: 9 }}
                interval="preserveStartEnd"
                allowDuplicatedCategory={false}
              />
              <YAxis tick={{ fill: "#6B6B75", fontSize: 10 }} />
              <Tooltip content={darkTooltip} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              {sectorNames.map(s => {
                const sData = sectors[s]?.series || [];
                if (!sData.length) return null;
                return (
                  <Line
                    key={s}
                    data={sData}
                    dataKey="iv"
                    stroke={SECTOR_COLORS[s]}
                    strokeWidth={1.5}
                    dot={false}
                    name={s}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  );
}

// ---- MAIN PAGE ----
export default function VolMonitorPage() {
  const [tab, setTab] = useState<"live" | "history">("live");

  return (
    <div className="p-6">
      <PageHeader timer={<RefreshTimer intervalSeconds={10} />} title="Vol Monitor" subtitle="Suivi IV/HV/Put-Call — Secteurs, Cross-Asset, Stress, CC ETFs">
        <LiveBadge />
      </PageHeader>

      <div className="flex gap-1 mb-6 bg-[#0D0D10] rounded-lg p-1 w-fit">
        {[
          { id: "live" as const, label: "Vol Desk Live" },
          { id: "history" as const, label: "Evolution Historique" },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-md text-xs font-semibold transition-all ${
              tab === t.id ? "bg-[#FF6B00] text-black" : "text-[#6B6B75] hover:text-white hover:bg-[#16161A]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "live" ? <VolDeskLiveTab /> : <HistoryTab />}
    </div>
  );
}
