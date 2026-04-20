"use client";

import { useCallback, useState } from "react";
import { Card, PageHeader } from "@/components/ui/card";

const API = "http://localhost:3850";

type Tab = "vanilla" | "digital" | "barrier" | "swap" | "fx" | "autocall";

const TABS: { id: Tab; label: string; color: string }[] = [
  { id: "vanilla", label: "Vanilla + Greeks", color: "#42A5F5" },
  { id: "digital", label: "Digital", color: "#FFA726" },
  { id: "barrier", label: "Barrier", color: "#B388FF" },
  { id: "swap", label: "IR Swap", color: "#22C55E" },
  { id: "fx", label: "FX Forward", color: "#FF6B00" },
  { id: "autocall", label: "Autocall MC", color: "#EF4444" },
];

function NumField({
  label, value, onChange, step = "0.01", help,
}: { label: string; value: number; onChange: (v: number) => void; step?: string; help?: string }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[9px] uppercase text-[#6B6B75] tracking-wide">{label}</span>
      <input
        type="number"
        value={value}
        step={step}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="bg-[#0D0D10] border border-[#1E1E22] rounded-md px-2 py-1.5 text-xs text-white font-mono"
      />
      {help && <span className="text-[9px] text-[#6B6B75]">{help}</span>}
    </label>
  );
}

function Select<T extends string>({
  label, value, onChange, options,
}: { label: string; value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[9px] uppercase text-[#6B6B75] tracking-wide">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="bg-[#0D0D10] border border-[#1E1E22] rounded-md px-2 py-1.5 text-xs text-white"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Metric({ label, value, color = "#F0F0F0", help }: { label: string; value: string; color?: string; help?: string }) {
  return (
    <div className="bg-[#0D0D10] border border-[#1E1E22] rounded-md p-2">
      <div className="text-[9px] uppercase text-[#6B6B75]">{label}</div>
      <div className="text-sm font-mono font-bold" style={{ color }}>
        {value}
      </div>
      {help && <div className="text-[9px] text-[#6B6B75] mt-0.5">{help}</div>}
    </div>
  );
}

function fmt(v: number | null | undefined, digits = 4): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  return v.toLocaleString("en-US", { maximumFractionDigits: digits, minimumFractionDigits: Math.min(2, digits) });
}

// --------------------------------------------------------------------------
// Vanilla tab
// --------------------------------------------------------------------------
function VanillaTab() {
  const [spot, setSpot] = useState(680);
  const [strike, setStrike] = useState(680);
  const [t, setT] = useState(0.25);
  const [r, setR] = useState(0.045);
  const [q, setQ] = useState(0.015);
  const [sigma, setSigma] = useState(0.20);
  const [optionType, setOptionType] = useState<"call" | "put">("call");
  const [result, setResult] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(false);
  const price = useCallback(async () => {
    setLoading(true);
    try {
      const r2 = await fetch(`${API}/api/pricing/vanilla`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spot, strike, t, r, q, sigma, option_type: optionType }),
        signal: AbortSignal.timeout(10000),
      });
      setResult(await r2.json());
    } finally {
      setLoading(false);
    }
  }, [spot, strike, t, r, q, sigma, optionType]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-4">
      <Card className="p-4">
        <div className="grid grid-cols-2 gap-3">
          <NumField label="Spot" value={spot} onChange={setSpot} step="0.1" />
          <NumField label="Strike" value={strike} onChange={setStrike} step="0.1" />
          <NumField label="T (annees)" value={t} onChange={setT} step="0.01" help="0.25 = 3 mois" />
          <NumField label="Sigma" value={sigma} onChange={setSigma} step="0.01" help="Vol annualisee" />
          <NumField label="r (taux)" value={r} onChange={setR} step="0.001" />
          <NumField label="q (div yield)" value={q} onChange={setQ} step="0.001" />
          <Select label="Type" value={optionType} onChange={setOptionType} options={[{ value: "call", label: "Call" }, { value: "put", label: "Put" }]} />
          <button
            onClick={price}
            disabled={loading}
            className="col-span-2 mt-2 bg-[#42A5F5] text-black text-[11px] font-bold rounded-md py-2 disabled:opacity-50"
          >
            {loading ? "..." : "Pricer"}
          </button>
        </div>
      </Card>
      <Card className="p-4">
        <h3 className="text-xs font-bold text-[#42A5F5] uppercase tracking-wider mb-3">Prix & Greeks</h3>
        {result ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            <Metric label="Prix" value={fmt(result.price, 4)} color="#42A5F5" />
            <Metric label="Delta" value={fmt(result.delta, 4)} />
            <Metric label="Gamma" value={fmt(result.gamma, 6)} />
            <Metric label="Vega" value={fmt(result.vega, 4)} help="par 1 vol pt" />
            <Metric label="Theta" value={fmt(result.theta, 4)} help="par jour" />
            <Metric label="Rho" value={fmt(result.rho, 4)} help="par 1% taux" />
          </div>
        ) : (
          <div className="text-xs text-[#6B6B75]">Cliquez sur Pricer pour calculer.</div>
        )}
      </Card>
    </div>
  );
}

// --------------------------------------------------------------------------
// Digital tab
// --------------------------------------------------------------------------
function DigitalTab() {
  const [spot, setSpot] = useState(680);
  const [strike, setStrike] = useState(700);
  const [t, setT] = useState(0.25);
  const [r, setR] = useState(0.045);
  const [q, setQ] = useState(0.015);
  const [sigma, setSigma] = useState(0.20);
  const [cash, setCash] = useState(1);
  const [optionType, setOptionType] = useState<"call" | "put">("call");
  const [result, setResult] = useState<Record<string, number> | null>(null);
  const price = async () => {
    const r2 = await fetch(`${API}/api/pricing/digital`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ spot, strike, t, r, q, sigma, cash, option_type: optionType }),
      signal: AbortSignal.timeout(10000),
    });
    setResult(await r2.json());
  };
  return (
    <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-4">
      <Card className="p-4">
        <div className="grid grid-cols-2 gap-3">
          <NumField label="Spot" value={spot} onChange={setSpot} />
          <NumField label="Strike" value={strike} onChange={setStrike} />
          <NumField label="T" value={t} onChange={setT} step="0.01" />
          <NumField label="Sigma" value={sigma} onChange={setSigma} step="0.01" />
          <NumField label="r" value={r} onChange={setR} step="0.001" />
          <NumField label="q" value={q} onChange={setQ} step="0.001" />
          <NumField label="Cash" value={cash} onChange={setCash} help="Payout si ITM" />
          <Select label="Type" value={optionType} onChange={setOptionType} options={[{ value: "call", label: "Call" }, { value: "put", label: "Put" }]} />
          <button onClick={price} className="col-span-2 bg-[#FFA726] text-black text-[11px] font-bold rounded-md py-2">Pricer</button>
        </div>
      </Card>
      <Card className="p-4">
        <h3 className="text-xs font-bold text-[#FFA726] uppercase tracking-wider mb-3">Binary (cash-or-nothing)</h3>
        {result ? (
          <div className="grid grid-cols-2 gap-2">
            <Metric label="Prix" value={fmt(result.price, 6)} color="#FFA726" />
            <Metric label="Delta" value={fmt(result.delta, 6)} />
            <Metric label="Vega" value={fmt(result.vega, 6)} />
          </div>
        ) : <div className="text-xs text-[#6B6B75]">Cliquez sur Pricer.</div>}
      </Card>
    </div>
  );
}

// --------------------------------------------------------------------------
// Barrier tab
// --------------------------------------------------------------------------
function BarrierTab() {
  const [spot, setSpot] = useState(680);
  const [strike, setStrike] = useState(680);
  const [barrier, setBarrier] = useState(750);
  const [t, setT] = useState(0.5);
  const [r, setR] = useState(0.045);
  const [q, setQ] = useState(0.015);
  const [sigma, setSigma] = useState(0.22);
  const [optionType, setOptionType] = useState<"call" | "put">("call");
  const [barrierType, setBarrierType] = useState<string>("up-and-out");
  const [rebate, setRebate] = useState(0);
  const [result, setResult] = useState<Record<string, number> | null>(null);
  const price = async () => {
    const r2 = await fetch(`${API}/api/pricing/barrier`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ spot, strike, barrier, t, r, q, sigma, option_type: optionType, barrier_type: barrierType, rebate }),
      signal: AbortSignal.timeout(10000),
    });
    setResult(await r2.json());
  };
  return (
    <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-4">
      <Card className="p-4">
        <div className="grid grid-cols-2 gap-3">
          <NumField label="Spot" value={spot} onChange={setSpot} />
          <NumField label="Strike" value={strike} onChange={setStrike} />
          <NumField label="Barrier" value={barrier} onChange={setBarrier} />
          <NumField label="T" value={t} onChange={setT} step="0.01" />
          <NumField label="Sigma" value={sigma} onChange={setSigma} step="0.01" />
          <NumField label="r" value={r} onChange={setR} step="0.001" />
          <NumField label="q" value={q} onChange={setQ} step="0.001" />
          <NumField label="Rebate" value={rebate} onChange={setRebate} />
          <Select label="Type" value={optionType} onChange={setOptionType} options={[{ value: "call", label: "Call" }, { value: "put", label: "Put" }]} />
          <Select
            label="Barrier"
            value={barrierType}
            onChange={setBarrierType}
            options={[
              { value: "up-and-out", label: "Up & Out" },
              { value: "up-and-in", label: "Up & In" },
              { value: "down-and-out", label: "Down & Out" },
              { value: "down-and-in", label: "Down & In" },
            ]}
          />
          <button onClick={price} className="col-span-2 bg-[#B388FF] text-black text-[11px] font-bold rounded-md py-2">Pricer</button>
        </div>
      </Card>
      <Card className="p-4">
        <h3 className="text-xs font-bold text-[#B388FF] uppercase tracking-wider mb-3">Barrier (Reiner-Rubinstein)</h3>
        {result ? (
          <Metric label="Prix" value={fmt(result.price, 4)} color="#B388FF" />
        ) : <div className="text-xs text-[#6B6B75]">Cliquez sur Pricer.</div>}
      </Card>
    </div>
  );
}

// --------------------------------------------------------------------------
// Swap tab
// --------------------------------------------------------------------------
interface SwapCashflow { period: number; t: number; df: number; fixed: number; float: number; pv_fixed: number; pv_float: number; }
interface SwapResult { pv: number; pv_fixed_leg: number; pv_float_leg: number; annuity: number; par_rate: number; pv01: number; cashflows: SwapCashflow[]; }

function SwapTab() {
  const [notional, setNotional] = useState(10_000_000);
  const [fixedRate, setFixedRate] = useState(0.042);
  const [floatRate, setFloatRate] = useState(0.045);
  const [tenorYears, setTenorYears] = useState(5);
  const [freq, setFreq] = useState(2);
  const [payFixed, setPayFixed] = useState(true);
  const [result, setResult] = useState<SwapResult | null>(null);
  const price = async () => {
    const r2 = await fetch(`${API}/api/pricing/swap`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notional, fixed_rate: fixedRate, float_rate: floatRate, tenor_years: tenorYears, freq, pay_fixed: payFixed }),
      signal: AbortSignal.timeout(10000),
    });
    setResult(await r2.json());
  };
  return (
    <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-4">
      <Card className="p-4">
        <div className="grid grid-cols-2 gap-3">
          <NumField label="Notional" value={notional} onChange={setNotional} step="100000" />
          <NumField label="Freq" value={freq} onChange={(v) => setFreq(Math.max(1, Math.round(v)))} step="1" />
          <NumField label="Fixed rate" value={fixedRate} onChange={setFixedRate} step="0.001" />
          <NumField label="Float rate" value={floatRate} onChange={setFloatRate} step="0.001" />
          <NumField label="Tenor (y)" value={tenorYears} onChange={setTenorYears} step="0.5" />
          <Select
            label="Direction"
            value={payFixed ? "pay" : "rec"}
            onChange={(v) => setPayFixed(v === "pay")}
            options={[{ value: "pay", label: "Pay Fixed" }, { value: "rec", label: "Receive Fixed" }]}
          />
          <button onClick={price} className="col-span-2 bg-[#22C55E] text-black text-[11px] font-bold rounded-md py-2">Pricer</button>
        </div>
      </Card>
      <Card className="p-4">
        <h3 className="text-xs font-bold text-[#22C55E] uppercase tracking-wider mb-3">Swap PV</h3>
        {result ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
              <Metric label="PV" value={"$" + fmt(result.pv, 0)} color="#22C55E" />
              <Metric label="PV fixed" value={"$" + fmt(result.pv_fixed_leg, 0)} />
              <Metric label="PV float" value={"$" + fmt(result.pv_float_leg, 0)} />
              <Metric label="PV01" value={"$" + fmt(result.pv01, 2)} color="#FFA726" />
            </div>
            <div className="overflow-x-auto max-h-80">
              <table className="w-full text-[10px] font-mono">
                <thead>
                  <tr className="text-[#6B6B75] border-b border-[#1E1E22]">
                    <th className="p-1 text-left">#</th>
                    <th className="p-1 text-right">T</th>
                    <th className="p-1 text-right">DF</th>
                    <th className="p-1 text-right">Fixed</th>
                    <th className="p-1 text-right">Float</th>
                    <th className="p-1 text-right">PV net</th>
                  </tr>
                </thead>
                <tbody>
                  {result.cashflows.map((cf) => (
                    <tr key={cf.period} className="border-b border-[#1E1E22]/50">
                      <td className="p-1 text-[#6B6B75]">{cf.period}</td>
                      <td className="p-1 text-right text-[#F0F0F0]">{cf.t.toFixed(2)}</td>
                      <td className="p-1 text-right text-[#6B6B75]">{cf.df.toFixed(4)}</td>
                      <td className="p-1 text-right text-[#42A5F5]">{fmt(cf.fixed, 0)}</td>
                      <td className="p-1 text-right text-[#B388FF]">{fmt(cf.float, 0)}</td>
                      <td className="p-1 text-right text-[#22C55E]">{fmt(cf.pv_float - cf.pv_fixed, 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : <div className="text-xs text-[#6B6B75]">Cliquez sur Pricer.</div>}
      </Card>
    </div>
  );
}

// --------------------------------------------------------------------------
// FX Forward tab
// --------------------------------------------------------------------------
function FxTab() {
  const [spot, setSpot] = useState(1.0850);
  const [rateBase, setRateBase] = useState(0.045);
  const [rateQuote, setRateQuote] = useState(0.025);
  const [tenorDays, setTenorDays] = useState(90);
  const [notional, setNotional] = useState(1_000_000);
  const [result, setResult] = useState<Record<string, number> | null>(null);
  const price = async () => {
    const r2 = await fetch(`${API}/api/pricing/fx-forward`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ spot, rate_base: rateBase, rate_quote: rateQuote, tenor_days: tenorDays, notional }),
      signal: AbortSignal.timeout(10000),
    });
    setResult(await r2.json());
  };
  return (
    <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-4">
      <Card className="p-4">
        <div className="grid grid-cols-2 gap-3">
          <NumField label="Spot" value={spot} onChange={setSpot} step="0.0001" />
          <NumField label="Tenor (j)" value={tenorDays} onChange={(v) => setTenorDays(Math.round(v))} step="1" />
          <NumField label="Rate base" value={rateBase} onChange={setRateBase} step="0.001" help="Devise base (gauche)" />
          <NumField label="Rate quote" value={rateQuote} onChange={setRateQuote} step="0.001" help="Devise quote (droite)" />
          <NumField label="Notional" value={notional} onChange={setNotional} step="100000" />
          <button onClick={price} className="col-span-2 bg-[#FF6B00] text-black text-[11px] font-bold rounded-md py-2">Pricer</button>
        </div>
      </Card>
      <Card className="p-4">
        <h3 className="text-xs font-bold text-[#FF6B00] uppercase tracking-wider mb-3">FX Forward (Covered IR Parity)</h3>
        {result ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            <Metric label="Spot" value={fmt(result.spot, 4)} />
            <Metric label="Forward" value={fmt(result.forward, 6)} color="#FF6B00" />
            <Metric label="Swap points" value={fmt(result.swap_points, 1)} />
            <Metric label="T (ans)" value={fmt(result.t_years, 4)} />
            <Metric label="Notional base" value={fmt(result.notional_base, 0)} />
            <Metric label="Notional quote" value={fmt(result.notional_quote, 0)} />
          </div>
        ) : <div className="text-xs text-[#6B6B75]">Cliquez sur Pricer.</div>}
      </Card>
    </div>
  );
}

// --------------------------------------------------------------------------
// Autocall tab
// --------------------------------------------------------------------------
function AutocallTab() {
  const [spot, setSpot] = useState(100);
  const [coupon, setCoupon] = useState(0.025);
  const [barrierProtection, setBarrierProtection] = useState(0.7);
  const [autocallTrigger, setAutocallTrigger] = useState(1.0);
  const [observations, setObservations] = useState(4);
  const [notional, setNotional] = useState(1_000_000);
  const [r, setR] = useState(0.045);
  const [q, setQ] = useState(0.015);
  const [sigma, setSigma] = useState(0.22);
  const [tenorYears, setTenorYears] = useState(1);
  const [nPaths, setNPaths] = useState(20000);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, number | null> | null>(null);
  const price = async () => {
    setLoading(true);
    try {
      const r2 = await fetch(`${API}/api/pricing/autocall`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(10000),
        body: JSON.stringify({
          spot, coupon, barrier_protection: barrierProtection, autocall_trigger: autocallTrigger,
          observations, notional, r, q, sigma, tenor_years: tenorYears, n_paths: nPaths,
        }),
      });
      setResult(await r2.json());
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-4">
      <Card className="p-4">
        <div className="grid grid-cols-2 gap-3">
          <NumField label="Spot" value={spot} onChange={setSpot} />
          <NumField label="Notional" value={notional} onChange={setNotional} step="100000" />
          <NumField label="Coupon" value={coupon} onChange={setCoupon} step="0.001" help="Par obs" />
          <NumField label="Observations" value={observations} onChange={(v) => setObservations(Math.max(1, Math.round(v)))} step="1" />
          <NumField label="Barrier prot." value={barrierProtection} onChange={setBarrierProtection} step="0.01" help="x spot (KI)" />
          <NumField label="Trigger" value={autocallTrigger} onChange={setAutocallTrigger} step="0.01" help="x spot" />
          <NumField label="Sigma" value={sigma} onChange={setSigma} step="0.01" />
          <NumField label="Tenor (y)" value={tenorYears} onChange={setTenorYears} step="0.25" />
          <NumField label="r" value={r} onChange={setR} step="0.001" />
          <NumField label="q" value={q} onChange={setQ} step="0.001" />
          <NumField label="Paths" value={nPaths} onChange={(v) => setNPaths(Math.round(v))} step="5000" />
          <button onClick={price} disabled={loading} className="col-span-2 bg-[#EF4444] text-white text-[11px] font-bold rounded-md py-2 disabled:opacity-50">
            {loading ? "Simulation..." : "Monte Carlo"}
          </button>
        </div>
      </Card>
      <Card className="p-4">
        <h3 className="text-xs font-bold text-[#EF4444] uppercase tracking-wider mb-3">Autocallable (Monte Carlo)</h3>
        {result ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            <Metric label="Prix" value={"$" + fmt(result.price, 0)} color="#EF4444" />
            <Metric label="% Notionnel" value={fmt(result.price_pct, 2) + "%"} />
            <Metric label="Stderr" value={"$" + fmt(result.stderr, 0)} />
            <Metric label="Prob call" value={fmt((result.call_prob ?? 0) * 100, 1) + "%"} color="#22C55E" />
            <Metric label="Prob protege" value={fmt((result.protection_prob ?? 0) * 100, 1) + "%"} color="#42A5F5" />
            <Metric label="Prob perte" value={fmt((result.loss_prob ?? 0) * 100, 1) + "%"} color="#EF4444" />
            <Metric label="Obs call moy" value={fmt(result.avg_call_obs, 2)} />
            <Metric label="Paths" value={fmt(result.n_paths, 0)} />
            <Metric label="Obs" value={fmt(result.observations, 0)} />
          </div>
        ) : <div className="text-xs text-[#6B6B75]">Cliquez sur Monte Carlo.</div>}
      </Card>
    </div>
  );
}

// --------------------------------------------------------------------------
// Main
// --------------------------------------------------------------------------
export default function PricingLabPage() {
  const [tab, setTab] = useState<Tab>("vanilla");
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Pricing Lab"
        subtitle="Multi-asset : vanilla, digital, barrier, swap, FX forward, autocall Monte Carlo"
      />
      <div className="flex items-center gap-1 mb-4 flex-wrap">
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all ${
                active ? "text-black" : "text-[#6B6B75] hover:text-[#F0F0F0] bg-[#111114]"
              }`}
              style={{ background: active ? t.color : undefined }}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      {tab === "vanilla" && <VanillaTab />}
      {tab === "digital" && <DigitalTab />}
      {tab === "barrier" && <BarrierTab />}
      {tab === "swap" && <SwapTab />}
      {tab === "fx" && <FxTab />}
      {tab === "autocall" && <AutocallTab />}
    </div>
  );
}
