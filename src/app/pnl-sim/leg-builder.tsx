"use client";

import type { Leg } from "@/data/option-strategies";

interface Props {
  legs: Leg[];
  spot: number;
  shares: number;
  onLegsChange: (legs: Leg[]) => void;
  onSpotChange: (spot: number) => void;
  onSharesChange: (shares: number) => void;
}

let nextId = 5000;

export function LegBuilder({ legs, spot, shares, onLegsChange, onSpotChange, onSharesChange }: Props) {
  const updateLeg = (id: number, field: keyof Leg, value: string | number) => {
    onLegsChange(legs.map(l => l.id === id ? { ...l, [field]: value } : l));
  };

  const addLeg = () => {
    if (legs.length >= 6) return;
    onLegsChange([...legs, { id: ++nextId, type: "Call", side: "Buy", strike: spot, premium: 5, qty: 1 }]);
  };

  const removeLeg = (id: number) => {
    onLegsChange(legs.filter(l => l.id !== id));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold text-[#FF6B00] uppercase tracking-widest">Legs ({legs.length}/6)</h2>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[#6B6B75] uppercase">Spot</span>
            <input type="number" value={spot} onChange={e => onSpotChange(parseFloat(e.target.value) || 0)}
              className="w-24 bg-[#0A0A0C] border border-[#1E1E22] rounded-lg px-2 py-1 text-sm font-mono text-[#F0F0F0] focus:border-[#FF6B00] focus:outline-none" />
          </div>
        </div>
      </div>

      {/* Shares row */}
      {shares !== 0 && (
        <div className="flex items-center gap-3 px-2 py-2 bg-[#FF6B0008] border border-[#FF6B0022] rounded-lg">
          <span className="text-xs text-[#FF6B00] font-semibold">{shares > 0 ? "LONG" : "SHORT"} {Math.abs(shares)} actions</span>
          <span className="text-[10px] text-[#6B6B75]">@ {spot.toFixed(0)}</span>
          <button onClick={() => onSharesChange(0)} className="ml-auto text-[#EF4444] text-xs hover:bg-[#EF444422] rounded px-2 py-0.5">x</button>
        </div>
      )}

      {/* Header */}
      <div className="grid grid-cols-[80px_80px_1fr_1fr_80px_40px] gap-2 text-[9px] text-[#6B6B75] uppercase tracking-widest px-1">
        <span>Type</span><span>Side</span><span>Strike</span><span>Prime</span><span>Qty</span><span />
      </div>

      {legs.map(leg => (
        <div key={leg.id} className="grid grid-cols-[80px_80px_1fr_1fr_80px_40px] gap-2 items-center">
          <select value={leg.type} onChange={e => updateLeg(leg.id, "type", e.target.value)}
            className="bg-[#0A0A0C] border border-[#1E1E22] rounded-lg px-2 py-1.5 text-xs text-[#F0F0F0] focus:border-[#FF6B00] focus:outline-none">
            <option value="Call">Call</option>
            <option value="Put">Put</option>
          </select>
          <select value={leg.side} onChange={e => updateLeg(leg.id, "side", e.target.value)}
            className={`border rounded-lg px-2 py-1.5 text-xs font-semibold focus:outline-none ${
              leg.side === "Buy" ? "bg-[#22C55E11] border-[#22C55E44] text-[#22C55E]" : "bg-[#EF444411] border-[#EF444444] text-[#EF4444]"
            }`}>
            <option value="Buy">Buy</option>
            <option value="Sell">Sell</option>
          </select>
          <input type="number" value={leg.strike} onChange={e => updateLeg(leg.id, "strike", parseFloat(e.target.value) || 0)}
            className="bg-[#0A0A0C] border border-[#1E1E22] rounded-lg px-2 py-1.5 text-xs font-mono text-[#F0F0F0] focus:border-[#FF6B00] focus:outline-none" />
          <input type="number" value={leg.premium} step={0.5} onChange={e => updateLeg(leg.id, "premium", parseFloat(e.target.value) || 0)}
            className="bg-[#0A0A0C] border border-[#1E1E22] rounded-lg px-2 py-1.5 text-xs font-mono text-[#F0F0F0] focus:border-[#FF6B00] focus:outline-none" />
          <input type="number" value={leg.qty} min={1} max={100} onChange={e => updateLeg(leg.id, "qty", parseInt(e.target.value) || 1)}
            className="bg-[#0A0A0C] border border-[#1E1E22] rounded-lg px-2 py-1.5 text-xs font-mono text-[#F0F0F0] focus:border-[#FF6B00] focus:outline-none" />
          <button onClick={() => removeLeg(leg.id)} className="text-[#EF4444] hover:bg-[#EF444422] rounded-lg p-1.5 text-xs" title="Supprimer">x</button>
        </div>
      ))}

      <button onClick={addLeg} disabled={legs.length >= 6}
        className="w-full py-2 rounded-lg border border-dashed border-[#1E1E22] text-xs text-[#6B6B75] hover:border-[#FF6B00] hover:text-[#FF6B00] transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
        + Ajouter Leg
      </button>
    </div>
  );
}
