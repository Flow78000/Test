"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader, LiveBadge, Card } from "@/components/ui/card";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";

const API = "http://localhost:3850";
const TICKERS = ["SPX", "SPY", "QQQ"];

function darkTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1A1A1E] border border-[#2A2A2E] rounded px-3 py-2 text-xs">
      <div className="text-[#6B6B75] mb-1">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ color: p.color }}>{p.name}: {Number(p.value).toFixed(2)}</div>
      ))}
    </div>
  );
}

export default function GreeksPage() {
  const [ticker, setTicker] = useState("SPX");
  const [greekData, setGreekData] = useState<any[]>([]);
  const [volData, setVolData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [gRes, vRes] = await Promise.all([
        fetch(`${API}/api/uw/greek-exposure/strike?ticker=${ticker}`).then(r => r.json()),
        fetch(`${API}/api/uw/volatility/realized?ticker=${ticker === "SPX" ? "SPY" : ticker}`).then(r => r.json()),
      ]);
      const rows = Array.isArray(gRes) ? gRes : gRes?.data ?? [];
      // filter ATM +/- 5%
      if (rows.length) {
        const strikes = rows.map((r: any) => r.strike).filter(Boolean).sort((a: number, b: number) => a - b);
        const mid = strikes[Math.floor(strikes.length / 2)];
        const lo = mid * 0.95, hi = mid * 1.05;
        const filtered = rows.filter((r: any) => r.strike >= lo && r.strike <= hi);
        setGreekData(filtered);
      } else {
        setGreekData(rows);
      }
      setVolData(Array.isArray(vRes) ? vRes : vRes?.data ?? []);
    } catch (e: any) {
      setError("Erreur de chargement: " + (e.message || "serveur indisponible"));
    }
    setLoading(false);
  }, [ticker]);

  useEffect(() => { load(); }, [load]);

  const vannaNet = greekData.map((d: any) => ({
    strike: d.strike,
    vanna_net: (d.call_vanna ?? 0) + (d.put_vanna ?? 0),
  }));

  const charmNet = greekData.map((d: any) => ({
    strike: d.strike,
    charm_net: (d.call_charm ?? 0) + (d.put_charm ?? 0),
  }));

  const vannaSplit = greekData.map((d: any) => ({
    strike: d.strike,
    call_vanna: d.call_vanna ?? 0,
    put_vanna: d.put_vanna ?? 0,
  }));

  const charmSplit = greekData.map((d: any) => ({
    strike: d.strike,
    call_charm: d.call_charm ?? 0,
    put_charm: d.put_charm ?? 0,
  }));

  if (loading) return (
    <div className="p-6">
      <PageHeader title="GEX / Vanna / Charm par Strike" subtitle="Exposition Greeks live via Unusual Whales" />
      <div className="text-center py-20 text-[#6B6B75]">Chargement...</div>
    </div>
  );

  if (error) return (
    <div className="p-6">
      <PageHeader title="GEX / Vanna / Charm par Strike" subtitle="Exposition Greeks live" />
      <Card className="p-8 text-center text-red-400">{error}</Card>
    </div>
  );

  const charts: { title: string; content: React.ReactNode }[] = [
    {
      title: "GEX par Strike",
      content: (
        <ResponsiveContainer width="100%" height={210}>
          <BarChart data={greekData} layout="horizontal">
            <CartesianGrid strokeDasharray="3 3" stroke="#1E1E22" />
            <XAxis dataKey="strike" tick={{ fill: "#6B6B75", fontSize: 10 }} />
            <YAxis tick={{ fill: "#6B6B75", fontSize: 10 }} />
            <Tooltip content={darkTooltip} />
            <Bar dataKey="call_gex" fill="#FF6B00" name="Call GEX" />
            <Bar dataKey="put_gex" fill="#E040FB" name="Put GEX" />
          </BarChart>
        </ResponsiveContainer>
      ),
    },
    {
      title: "Vanna Nette",
      content: (
        <ResponsiveContainer width="100%" height={210}>
          <LineChart data={vannaNet}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E1E22" />
            <XAxis dataKey="strike" tick={{ fill: "#6B6B75", fontSize: 10 }} />
            <YAxis tick={{ fill: "#6B6B75", fontSize: 10 }} />
            <Tooltip content={darkTooltip} />
            <Line dataKey="vanna_net" stroke="#AB47BC" dot={false} strokeWidth={2} name="Vanna Net" />
          </LineChart>
        </ResponsiveContainer>
      ),
    },
    {
      title: "Charm Net",
      content: (
        <ResponsiveContainer width="100%" height={210}>
          <LineChart data={charmNet}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E1E22" />
            <XAxis dataKey="strike" tick={{ fill: "#6B6B75", fontSize: 10 }} />
            <YAxis tick={{ fill: "#6B6B75", fontSize: 10 }} />
            <Tooltip content={darkTooltip} />
            <Line dataKey="charm_net" stroke="#AB47BC" dot={false} strokeWidth={2} name="Charm Net" />
          </LineChart>
        </ResponsiveContainer>
      ),
    },
    {
      title: "Vol Realisee vs Implicite",
      content: (
        <ResponsiveContainer width="100%" height={210}>
          <LineChart data={volData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E1E22" />
            <XAxis dataKey="date" tick={{ fill: "#6B6B75", fontSize: 10 }} />
            <YAxis tick={{ fill: "#6B6B75", fontSize: 10 }} />
            <Tooltip content={darkTooltip} />
            <Line dataKey="implied" stroke="#AB47BC" dot={false} strokeWidth={2} name="IV" />
            <Line dataKey="realized" stroke="#FFD600" dot={false} strokeWidth={2} name="RV" />
          </LineChart>
        </ResponsiveContainer>
      ),
    },
    {
      title: "Vanna Call / Put",
      content: (
        <ResponsiveContainer width="100%" height={210}>
          <LineChart data={vannaSplit}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E1E22" />
            <XAxis dataKey="strike" tick={{ fill: "#6B6B75", fontSize: 10 }} />
            <YAxis tick={{ fill: "#6B6B75", fontSize: 10 }} />
            <Tooltip content={darkTooltip} />
            <Line dataKey="call_vanna" stroke="#4CAF50" dot={false} strokeWidth={2} name="Call Vanna" />
            <Line dataKey="put_vanna" stroke="#F48FB1" dot={false} strokeWidth={2} name="Put Vanna" />
          </LineChart>
        </ResponsiveContainer>
      ),
    },
    {
      title: "Charm Call / Put",
      content: (
        <ResponsiveContainer width="100%" height={210}>
          <LineChart data={charmSplit}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E1E22" />
            <XAxis dataKey="strike" tick={{ fill: "#6B6B75", fontSize: 10 }} />
            <YAxis tick={{ fill: "#6B6B75", fontSize: 10 }} />
            <Tooltip content={darkTooltip} />
            <Line dataKey="call_charm" stroke="#4CAF50" dot={false} strokeWidth={2} name="Call Charm" />
            <Line dataKey="put_charm" stroke="#F48FB1" dot={false} strokeWidth={2} name="Put Charm" />
          </LineChart>
        </ResponsiveContainer>
      ),
    },
  ];

  return (
    <div className="p-6">
      <PageHeader title="GEX / Vanna / Charm par Strike" subtitle="Exposition Greeks live via Unusual Whales">
        <select
          value={ticker}
          onChange={e => setTicker(e.target.value)}
          className="bg-[#111114] border border-[#1E1E22] rounded-lg px-3 py-1.5 text-xs text-white"
        >
          {TICKERS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <button onClick={load} className="px-3 py-1.5 bg-[#111114] border border-[#1E1E22] rounded-lg text-xs hover:border-[#FF6B00] transition-colors">
          Rafraichir
        </button>
        <LiveBadge />
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {charts.map(c => (
          <Card key={c.title} className="p-4" style={{ minHeight: 250 }}>
            <div className="text-xs text-[#6B6B75] uppercase tracking-wider mb-3">{c.title}</div>
            {c.content}
          </Card>
        ))}
      </div>
    </div>
  );
}
