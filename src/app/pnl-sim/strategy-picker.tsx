"use client";

import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import {
  ALL_STRATEGIES, LEVEL_COLORS, SENTIMENT_ICONS, SENTIMENT_COLORS,
  type StrategyTemplate, type Level, type Sentiment, type VolBias,
} from "@/data/option-strategies";

interface Props {
  onSelect: (strategy: StrategyTemplate) => void;
}

const LEVELS: Level[] = ["Novice", "Intermediate", "Advanced", "Expert"];
const SENTIMENTS: { value: Sentiment | "all"; label: string }[] = [
  { value: "all", label: "Tous" },
  { value: "bullish", label: "Haussier" },
  { value: "bearish", label: "Baissier" },
  { value: "neutral", label: "Neutre" },
  { value: "volatile", label: "Volatile" },
];
const VOL_BIASES: { value: VolBias | "all"; label: string }[] = [
  { value: "all", label: "Tous" },
  { value: "long_vol", label: "Long Vol" },
  { value: "short_vol", label: "Short Vol" },
  { value: "neutral", label: "Neutre" },
];

export function StrategyPicker({ onSelect }: Props) {
  const [level, setLevel] = useState<Level | "all">("all");
  const [sentiment, setSentiment] = useState<Sentiment | "all">("all");
  const [volBias, setVolBias] = useState<VolBias | "all">("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return ALL_STRATEGIES.filter(s => {
      if (level !== "all" && s.level !== level) return false;
      if (sentiment !== "all" && s.sentiment !== sentiment) return false;
      if (volBias !== "all" && s.volBias !== volBias) return false;
      if (q && !s.name.toLowerCase().includes(q) && !s.description.toLowerCase().includes(q) && !s.category.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [level, sentiment, volBias, search]);

  const levelCounts = useMemo(() => {
    const m: Record<string, number> = {};
    ALL_STRATEGIES.forEach(s => { m[s.level] = (m[s.level] || 0) + 1; });
    return m;
  }, []);

  return (
    <div className="space-y-4">
      {/* Level filter */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setLevel("all")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
            level === "all" ? "bg-[#FF6B00] text-black border-[#FF6B00]" : "bg-[#0A0A0C] text-[#6B6B75] border-[#1E1E22] hover:border-[#FF6B00]"
          }`}>
          Toutes <span className="opacity-60 ml-1">{ALL_STRATEGIES.length}</span>
        </button>
        {LEVELS.map(l => (
          <button key={l} onClick={() => setLevel(l)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              level === l ? "text-black border-transparent" : "text-[#6B6B75] border-[#1E1E22] hover:border-[#FF6B00]"
            }`}
            style={level === l ? { backgroundColor: LEVEL_COLORS[l] } : { backgroundColor: "#0A0A0C" }}>
            {l} <span className="opacity-60 ml-1">{levelCounts[l]}</span>
          </button>
        ))}
      </div>

      {/* Search + Filters */}
      <div className="flex gap-3 flex-wrap">
        <input type="text" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] bg-[#0A0A0C] border border-[#1E1E22] rounded-lg px-3 py-1.5 text-xs text-[#F0F0F0] placeholder-[#6B6B75] focus:border-[#FF6B00] focus:outline-none" />
        <select value={sentiment} onChange={e => setSentiment(e.target.value as any)}
          className="bg-[#0A0A0C] border border-[#1E1E22] rounded-lg px-3 py-1.5 text-xs text-[#F0F0F0] focus:border-[#FF6B00] focus:outline-none">
          {SENTIMENTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select value={volBias} onChange={e => setVolBias(e.target.value as any)}
          className="bg-[#0A0A0C] border border-[#1E1E22] rounded-lg px-3 py-1.5 text-xs text-[#F0F0F0] focus:border-[#FF6B00] focus:outline-none">
          {VOL_BIASES.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
        </select>
      </div>

      <div className="text-xs text-[#6B6B75]">{filtered.length} strategies</div>

      {/* Strategy Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {filtered.map(s => (
          <div key={s.id} onClick={() => onSelect(s)}
            className="bg-[#111114] border border-[#1E1E22] rounded-xl p-4 cursor-pointer hover:border-[#FF6B00] hover:bg-[#16161A] transition-all">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-bold text-sm text-white">{s.name}</span>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 rounded text-[9px] font-bold" style={{ backgroundColor: LEVEL_COLORS[s.level] + "22", color: LEVEL_COLORS[s.level] }}>
                {s.level}
              </span>
              <span className="text-[10px] font-semibold" style={{ color: SENTIMENT_COLORS[s.sentiment] }}>
                {SENTIMENT_ICONS[s.sentiment]} {s.sentiment}
              </span>
              <span className="text-[10px] text-[#6B6B75]">
                {s.volBias === "long_vol" ? "Long Vol" : s.volBias === "short_vol" ? "Short Vol" : "Neutral"}
              </span>
            </div>
            <div className="text-[10px] text-[#6B6B75] leading-relaxed line-clamp-2">{s.description}</div>
            <div className="mt-2 text-[9px] text-[#555]">{s.legs.length} legs{s.shares !== 0 ? ` + ${Math.abs(s.shares)} actions` : ""}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
