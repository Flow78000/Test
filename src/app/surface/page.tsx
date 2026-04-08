"use client";
import { Card, PageHeader, Badge } from "@/components/ui/card";

function Th({ children }: { children: React.ReactNode }) { return <th className="text-left p-2 text-[#6B6B75] text-[10px] uppercase tracking-wide">{children}</th>; }

/* ── IV color scale ── */
function ivColor(v: number): string {
  if (v < 14) return "#42A5F5";
  if (v < 18) return "#66BB6A";
  if (v < 22) return "#FFA726";
  if (v < 28) return "#FF7043";
  return "#EF4444";
}
function IvCell({ v }: { v: number }) {
  return (
    <td className="p-1.5 text-center text-[11px] font-mono border border-[#1E1E22]" style={{ color: ivColor(v), backgroundColor: `${ivColor(v)}10` }}>
      {v.toFixed(1)}
    </td>
  );
}

/* ── Greek heatmap color ── */
function gkColor(v: number, max: number): string {
  const ratio = v / max;
  if (ratio > 0.75) return "#EF4444";
  if (ratio > 0.5) return "#FFA726";
  if (ratio > 0.25) return "#66BB6A";
  return "#42A5F5";
}
function GkCell({ v, max }: { v: number; max: number }) {
  return (
    <td className="p-1 text-center text-[10px] font-mono border border-[#1E1E22]" style={{ color: gkColor(v, max), backgroundColor: `${gkColor(v, max)}10` }}>
      {v.toFixed(2)}
    </td>
  );
}

/* ── Vol Surface data (12 moneyness x 8 DTE) ── */
const moneyness = ["80%", "85%", "90%", "92%", "95%", "97%", "100%", "102%", "105%", "108%", "110%", "115%"];
const dtes = ["7", "14", "21", "30", "45", "60", "90", "120"];
const volSurface: number[][] = [
  [38.2, 34.1, 31.8, 29.5, 27.6, 26.2, 24.8, 23.9],
  [33.5, 30.2, 28.4, 26.8, 25.4, 24.3, 23.2, 22.6],
  [28.4, 26.1, 24.8, 23.6, 22.7, 22.0, 21.2, 20.8],
  [26.1, 24.3, 23.2, 22.2, 21.5, 20.9, 20.3, 19.9],
  [22.8, 21.6, 20.8, 20.1, 19.6, 19.2, 18.8, 18.5],
  [20.1, 19.4, 18.9, 18.4, 18.1, 17.8, 17.5, 17.3],
  [18.2, 17.8, 17.5, 17.2, 17.0, 16.8, 16.6, 16.5],
  [19.5, 18.8, 18.3, 17.9, 17.6, 17.3, 17.1, 16.9],
  [22.1, 21.0, 20.3, 19.7, 19.2, 18.9, 18.5, 18.3],
  [25.4, 23.8, 22.8, 22.0, 21.3, 20.8, 20.2, 19.8],
  [27.8, 25.9, 24.7, 23.7, 22.9, 22.3, 21.6, 21.1],
  [33.1, 30.5, 28.8, 27.3, 26.1, 25.2, 24.1, 23.4],
];

/* ── Greeks surfaces (6 moneyness x 4 DTE) ── */
const gkMoney = ["90%", "95%", "100%", "105%", "110%", "115%"];
const gkDte = ["7", "14", "30", "60"];

const gammaSurface = [
  [0.02, 0.04, 0.06, 0.05],
  [0.05, 0.08, 0.10, 0.07],
  [0.18, 0.14, 0.09, 0.06],
  [0.06, 0.09, 0.10, 0.08],
  [0.03, 0.05, 0.07, 0.06],
  [0.01, 0.02, 0.04, 0.04],
];
const vannaSurface = [
  [0.15, 0.12, 0.08, 0.05],
  [0.12, 0.10, 0.07, 0.04],
  [0.02, 0.03, 0.02, 0.01],
  [0.08, 0.07, 0.05, 0.03],
  [0.14, 0.11, 0.08, 0.05],
  [0.18, 0.14, 0.10, 0.07],
];
const charmSurface = [
  [0.03, 0.05, 0.04, 0.02],
  [0.06, 0.08, 0.05, 0.03],
  [0.22, 0.15, 0.08, 0.04],
  [0.07, 0.09, 0.06, 0.03],
  [0.04, 0.06, 0.04, 0.02],
  [0.02, 0.03, 0.02, 0.01],
];

export default function SurfacePage() {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <PageHeader
        title="Surface Analytique — Derivees Secondes"
        subtitle="Gamma, Vanna, Volga — Surface d'exposition par strike et echeance"
      >
        <Badge color="#FFA726">Quant</Badge>
      </PageHeader>

      {/* ═══ Section 1: Vol Surface Heatmap ═══ */}
      <Card className="p-6 mb-8">
        <h2 className="text-sm font-bold text-[#FFA726] uppercase tracking-wider mb-4">Implied Volatility Surface</h2>
        <p className="text-xs text-[#6B6B75] mb-4">
          IV par moneyness (strike/spot) et echeance (DTE). Colonnes = jours avant expiration. Lignes = moneyness.
          Le smile est visible : IV elevee deep OTM put (80%) et OTM call (115%), minimum ATM (100%).
        </p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-[#1E1E22]">
                <Th>Moneyness</Th>
                {dtes.map((d) => <Th key={d}>{d} DTE</Th>)}
              </tr>
            </thead>
            <tbody>
              {moneyness.map((m, i) => (
                <tr key={m} className={m === "100%" ? "bg-[#FFA72608]" : ""}>
                  <td className={`p-2 text-[11px] font-mono font-bold ${m === "100%" ? "text-[#FFA726]" : "text-[#6B6B75]"}`}>{m}</td>
                  {volSurface[i].map((v, j) => <IvCell key={j} v={v} />)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center gap-4 mt-3 text-[10px] text-[#6B6B75]">
          <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm" style={{ backgroundColor: "#42A5F5" }} /> &lt;14</span>
          <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm" style={{ backgroundColor: "#66BB6A" }} /> 14-18</span>
          <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm" style={{ backgroundColor: "#FFA726" }} /> 18-22</span>
          <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm" style={{ backgroundColor: "#FF7043" }} /> 22-28</span>
          <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm" style={{ backgroundColor: "#EF4444" }} /> &gt;28</span>
        </div>
      </Card>

      {/* ═══ Section 2: Greeks Surface ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* Gamma */}
        <Card className="p-4">
          <h3 className="text-xs font-bold text-[#EF4444] uppercase tracking-wider mb-2">Gamma Surface</h3>
          <p className="text-[10px] text-[#6B6B75] mb-3">Maximum ATM short-dated. Dealers short gamma pres de l&apos;expiration.</p>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead><tr className="border-b border-[#1E1E22]"><Th>K</Th>{gkDte.map(d => <Th key={d}>{d}d</Th>)}</tr></thead>
              <tbody>
                {gkMoney.map((m, i) => (
                  <tr key={m}><td className="p-1 text-[10px] font-mono text-[#6B6B75]">{m}</td>
                    {gammaSurface[i].map((v, j) => <GkCell key={j} v={v} max={0.18} />)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Vanna */}
        <Card className="p-4">
          <h3 className="text-xs font-bold text-[#B388FF] uppercase tracking-wider mb-2">Vanna Surface</h3>
          <p className="text-[10px] text-[#6B6B75] mb-3">Maximum OTM wings short-dated. Drive les delta shifts lors des moves de vol.</p>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead><tr className="border-b border-[#1E1E22]"><Th>K</Th>{gkDte.map(d => <Th key={d}>{d}d</Th>)}</tr></thead>
              <tbody>
                {gkMoney.map((m, i) => (
                  <tr key={m}><td className="p-1 text-[10px] font-mono text-[#6B6B75]">{m}</td>
                    {vannaSurface[i].map((v, j) => <GkCell key={j} v={v} max={0.18} />)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Charm */}
        <Card className="p-4">
          <h3 className="text-xs font-bold text-[#42A5F5] uppercase tracking-wider mb-2">Charm Surface</h3>
          <p className="text-[10px] text-[#6B6B75] mb-3">Maximum ATM pres de l&apos;expiration. Decay du delta = OPEX pin effect.</p>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead><tr className="border-b border-[#1E1E22]"><Th>K</Th>{gkDte.map(d => <Th key={d}>{d}d</Th>)}</tr></thead>
              <tbody>
                {gkMoney.map((m, i) => (
                  <tr key={m}><td className="p-1 text-[10px] font-mono text-[#6B6B75]">{m}</td>
                    {charmSurface[i].map((v, j) => <GkCell key={j} v={v} max={0.22} />)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* ═══ Section 3: Second-Order Greeks Explained ═══ */}
      <div className="text-xs text-[#6B6B75] uppercase tracking-[3px] font-semibold mb-4">Derivees Secondes — Reference</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <Card className="p-5">
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-lg font-black text-[#EF4444]">&Gamma;</span>
            <span className="text-sm font-bold">Gamma</span>
            <span className="text-[10px] text-[#6B6B75] font-mono ml-auto">&part;&#178;V / &part;S&#178;</span>
          </div>
          <p className="text-xs text-[#6B6B75] leading-relaxed">
            Convexite du prix de l&apos;option par rapport au sous-jacent. Le gamma est maximal ATM short-dated.
            Les dealers short gamma doivent hedger en achetant quand le marche monte et vendant quand il baisse
            — ce qui amplifie les mouvements intraday. Gamma scalping = le hedge dynamique de cette exposition.
          </p>
        </Card>
        <Card className="p-5">
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-lg font-black text-[#B388FF]">V</span>
            <span className="text-sm font-bold">Vanna</span>
            <span className="text-[10px] text-[#6B6B75] font-mono ml-auto">&part;&#178;V / &part;S&part;&sigma;</span>
          </div>
          <p className="text-xs text-[#6B6B75] leading-relaxed">
            Interaction entre delta et volatilite. Quand la vol augmente (VIX spike), le delta des options
            OTM augmente — les dealers doivent re-hedger, creant des flows directionnels. Le vanna flow
            est le principal mecanisme de transmission vol -&gt; spot sur les marches modernes.
          </p>
        </Card>
        <Card className="p-5">
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-lg font-black text-[#FFA726]">V</span>
            <span className="text-sm font-bold">Volga</span>
            <span className="text-[10px] text-[#6B6B75] font-mono ml-auto">&part;&#178;V / &part;&sigma;&#178;</span>
          </div>
          <p className="text-xs text-[#6B6B75] leading-relaxed">
            Convexite du prix de l&apos;option par rapport a la vol. Le volga est maximal sur les ailes (deep OTM).
            Il drive la pricing du skew : les options OTM avec volga eleve coutent plus car elles profitent
            d&apos;un spike de vol. Les risk reversals et les skew trades sont essentiellement des trades de volga.
          </p>
        </Card>
        <Card className="p-5">
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-lg font-black text-[#42A5F5]">&chi;</span>
            <span className="text-sm font-bold">Charm</span>
            <span className="text-[10px] text-[#6B6B75] font-mono ml-auto">&part;&#178;V / &part;S&part;t</span>
          </div>
          <p className="text-xs text-[#6B6B75] leading-relaxed">
            Decay du delta dans le temps. A l&apos;approche de l&apos;expiration, les delta des options ATM
            convergent vers 0 ou 1 — le charm accelere ce mouvement. C&apos;est le driver principal
            du pin effect a l&apos;OPEX : les dealers hedgent le charm decay en poussant le spot vers le strike max OI.
          </p>
        </Card>
      </div>

      {/* ═══ Section 4: Practical Trading Rules ═══ */}
      <Card className="p-6 mb-8">
        <h2 className="text-sm font-bold text-[#22C55E] uppercase tracking-wider mb-4">Decision Matrix — Quel Greek Domine?</h2>
        <p className="text-xs text-[#6B6B75] mb-4">
          Identifiez la condition de marche, puis concentrez votre analyse sur le greek primaire.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1E1E22]">
                <th className="text-left p-3 text-[#6B6B75] text-xs uppercase tracking-wide">Condition</th>
                <th className="text-left p-3 text-[#6B6B75] text-xs uppercase tracking-wide">Greek Primaire</th>
                <th className="text-left p-3 text-[#6B6B75] text-xs uppercase tracking-wide">Action Trading</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1A1A1E]">
              <tr className="hover:bg-[#FFA72606]">
                <td className="p-3 text-sm">Proche expiration (0-3 DTE)</td>
                <td className="p-3 text-sm font-mono text-[#EF4444]">Charm + Gamma</td>
                <td className="p-3 text-sm text-[#6B6B75]">Pin risk, gamma scalping, attention aux moves violents post-3pm</td>
              </tr>
              <tr className="hover:bg-[#FFA72606]">
                <td className="p-3 text-sm">VIX spike (&gt; +3 pts intraday)</td>
                <td className="p-3 text-sm font-mono text-[#B388FF]">Vanna</td>
                <td className="p-3 text-sm text-[#6B6B75]">Delta shifts massifs, dealers forcees de hedger = amplification du move</td>
              </tr>
              <tr className="hover:bg-[#FFA72606]">
                <td className="p-3 text-sm">Mouvement de skew (25d RR shift)</td>
                <td className="p-3 text-sm font-mono text-[#FFA726]">Volga</td>
                <td className="p-3 text-sm text-[#6B6B75]">Risk reversal trades, put spread vs call spread repricing</td>
              </tr>
              <tr className="hover:bg-[#FFA72606]">
                <td className="p-3 text-sm">Rallye lent + vol basse</td>
                <td className="p-3 text-sm font-mono text-[#42A5F5]">Charm</td>
                <td className="p-3 text-sm text-[#6B6B75]">Decay systematique des puts OTM, dealers couvrent = support du spot</td>
              </tr>
              <tr className="hover:bg-[#FFA72606]">
                <td className="p-3 text-sm">Marche range-bound ATM strike</td>
                <td className="p-3 text-sm font-mono text-[#EF4444]">Gamma</td>
                <td className="p-3 text-sm text-[#6B6B75]">Dealers long gamma = vendent les rallyes, achetent les dips = compression</td>
              </tr>
              <tr className="hover:bg-[#FFA72606]">
                <td className="p-3 text-sm">Gros open interest sur un strike</td>
                <td className="p-3 text-sm font-mono text-[#42A5F5]">Charm + Gamma</td>
                <td className="p-3 text-sm text-[#6B6B75]">Magnet effect vers le strike, pin probable a l&apos;OPEX</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
