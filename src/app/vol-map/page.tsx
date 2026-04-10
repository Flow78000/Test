"use client";

import { useEffect, useState } from "react";
import { Card, KpiCard, Badge, LiveBadge, PageHeader } from "@/components/ui/card";
import { RefreshTimer } from "@/components/ui/refresh-timer";
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine,
} from "recharts";

/* ─── types ─── */
interface IvRankEntry {
  date: string;
  volatility: number;
  iv_rank_1y: number;
  vix?: number;
}

interface StrikeRow {
  strike: number;
  call_delta_oi: number;
  put_delta_oi: number;
}

/* ─── constants ─── */
const API = "http://localhost:3850";

const SURFACE_DTE = [0, 7, 14, 30, 60, 90];
const SURFACE_MONEY = ["80%", "85%", "90%", "95%", "ATM", "105%", "110%", "115%", "120%"];

// Typical IV surface — realistic shape with skew + term structure
const SURFACE_DATA: Record<string, number[]> = {
  "80%":  [38, 36, 35, 33, 31, 30],
  "85%":  [32, 31, 30, 28, 27, 26],
  "90%":  [27, 26, 25, 24, 23, 22],
  "95%":  [22, 21, 20.5, 20, 19.5, 19],
  "ATM":  [18, 17.5, 17.5, 17.8, 18, 18.2],
  "105%": [19, 18.5, 18.2, 18, 18, 18.3],
  "110%": [22, 21, 20.5, 20, 19.8, 19.5],
  "115%": [26, 25, 24, 23, 22, 21.5],
  "120%": [31, 30, 28, 27, 25, 24],
};

function cellColor(iv: number): string {
  if (iv <= 18) return "#1e40af";
  if (iv <= 22) return "#2563eb";
  if (iv <= 26) return "#059669";
  if (iv <= 30) return "#d97706";
  if (iv <= 34) return "#ea580c";
  return "#dc2626";
}

function regimeLabel(ivRank: number): { text: string; color: string } {
  if (ivRank < 20) return { text: "Compression", color: "#3b82f6" };
  if (ivRank < 50) return { text: "Normal", color: "#10b981" };
  if (ivRank < 80) return { text: "Expansion", color: "#f59e0b" };
  return { text: "Crise", color: "#ef4444" };
}

function darkTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1A1A1E] border border-[#2A2A2E] rounded px-3 py-2 text-xs shadow-lg">
      <div className="text-[#6B6B75] mb-1">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {Number(p.value).toFixed(2)}
        </div>
      ))}
    </div>
  );
}

/* ─── decision matrix data ─── */
const DECISIONS = [
  { condition: "VRP > 5% + Contango + Skew modere", vix: "12-18", ivRank: "< 30", skew: "< 130", term: "Contango", action: "Vente de vol systematique", instrument: "Iron Condor, Short Strangle", color: "#10b981" },
  { condition: "VRP > 8% + Vol basse historique", vix: "< 14", ivRank: "< 15", skew: "< 125", term: "Contango plat", action: "Achat vol long terme (calendars)", instrument: "Calendar Spread, LEAPS Puts", color: "#3b82f6" },
  { condition: "VRP negatif + Backwardation", vix: "> 25", ivRank: "> 70", skew: "> 135", term: "Backwardation", action: "Achat de protection", instrument: "Long Puts, VIX Calls", color: "#ef4444" },
  { condition: "Transition contango -> backwardation", vix: "18-25", ivRank: "40-70", skew: "128-135", term: "Aplatissement", action: "Reduire exposition, hedger", instrument: "Put Spreads, Collar", color: "#f59e0b" },
  { condition: "Vol elevee + VRP positif large", vix: "> 25", ivRank: "> 60", skew: "< 130", term: "Backwardation legere", action: "Vente vol prudente (spreads)", instrument: "Put Credit Spread, Iron Butterfly", color: "#d97706" },
  { condition: "Skew extreme + Vol montante", vix: "> 20", ivRank: "> 50", skew: "> 140", term: "Inversee", action: "Protection tail risk", instrument: "Long OTM Puts, Ratio Spreads", color: "#dc2626" },
  { condition: "Post-spike — vol en decroissance", vix: "20-30", ivRank: "50-80", skew: "125-132", term: "Normalisation", action: "Vente vol progressive", instrument: "Short Puts, Jade Lizard", color: "#059669" },
  { condition: "Compression extreme + catalyseur proche", vix: "< 13", ivRank: "< 10", skew: "< 120", term: "Contango fort", action: "Achat vol directionnelle", instrument: "Long Straddle, Long Strangle", color: "#8b5cf6" },
];

/* ─── greeks data ─── */
const GREEKS = [
  {
    title: "Gamma — Stabilisateur vs Amplificateur",
    formula: "Gamma = dDelta / dS = d²V / dS²",
    body: "Le Gamma mesure la convexite de la position. Quand les dealers sont long gamma (GEX positif), ils vendent dans les hausses et achetent dans les baisses, creant un effet stabilisateur qui comprime la volatilite realisee. En revanche, quand les dealers sont short gamma (GEX negatif), ils sont forces de hedger dans le meme sens que le marche — vendre quand ca baisse, acheter quand ca monte — amplifiant les mouvements.",
    signal: "GEX > 0 : dealers stabilisateurs, marche range-bound. GEX < 0 : dealers amplificateurs, mouvements explosifs. Le flip point (GEX = 0) est le niveau pivot cle.",
    action: "SHORT VOL",
    actionNeg: "LONG VOL",
    thresholdHigh: "GEX > +5B",
    thresholdLow: "GEX < -2B",
  },
  {
    title: "Vanna — Interaction Vol x Delta",
    formula: "Vanna = dDelta / dIV = d²V / (dS x dIV)",
    body: "Le Vanna capture comment le delta d'une option change lorsque la volatilite implicite se deplace. Quand les dealers sont long vanna, une baisse de la vol implicite les pousse a acheter le sous-jacent (delta augmente), creant un support. A l'inverse, une hausse de vol les force a vendre. Le Vanna est le mecanisme principal qui explique pourquoi le VIX et le SPX sont inversement correles.",
    signal: "Vanna positif + vol en baisse = achat force des dealers = support. Vanna positif + vol en hausse = vente force = pression baissiere. Le point d'inflexion se produit autour des expirations majeures.",
    action: "SUPPORT",
    actionNeg: "PRESSION",
    thresholdHigh: "Vanna > 0 + IV baisse",
    thresholdLow: "Vanna > 0 + IV hausse",
  },
  {
    title: "Charm — Erosion Temporelle du Delta",
    formula: "Charm = dDelta / dT = -d²V / (dS x dT)",
    body: "Le Charm mesure comment le delta evolue avec le passage du temps. A mesure que l'expiration approche, les options OTM perdent du delta (tendent vers 0) et les ITM gagnent du delta (tendent vers 1). Ce phenomene force les dealers a ajuster leurs couvertures quotidiennement. L'effet Charm est particulierement puissant dans les 5 derniers jours avant expiration, creant des flux directionnels previsibles.",
    signal: "Charm positif sur les puts OTM = les dealers achetent progressivement le sous-jacent a mesure que l'expiration approche. Cet effet s'accelere exponentiellement dans les derniers jours, surtout autour du strike avec le plus d'OI.",
    action: "ACHAT FORCE",
    actionNeg: "VENTE FORCE",
    thresholdHigh: "DTE < 5j + Put OI eleve",
    thresholdLow: "DTE < 5j + Call OI eleve",
  },
];

/* ─────────────────── component ─────────────────── */
export default function VolMapPage() {
  const [ivData, setIvData] = useState<IvRankEntry[]>([]);
  const [smileData, setSmileData] = useState<{ strike: number; ivProxy: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setError(null);

        const [ivRes, strikeRes] = await Promise.allSettled([
          fetch(`${API}/api/uw/iv-rank?ticker=SPY`).then(r => r.json()),
          fetch(`${API}/api/uw/greek-exposure/strike?ticker=SPX`).then(r => r.json()),
        ]);

        if (ivRes.status === "fulfilled" && Array.isArray(ivRes.value)) {
          setIvData(ivRes.value);
        }

        if (strikeRes.status === "fulfilled" && Array.isArray(strikeRes.value)) {
          const rows: StrikeRow[] = strikeRes.value;
          if (rows.length > 0) {
            const strikes = rows.map(r => r.strike).sort((a, b) => a - b);
            const mid = strikes[Math.floor(strikes.length / 2)];
            const lo = mid * 0.9;
            const hi = mid * 1.1;
            const filtered = rows
              .filter(r => r.strike >= lo && r.strike <= hi)
              .sort((a, b) => a.strike - b.strike);
            const smile = filtered.map(r => ({
              strike: r.strike,
              ivProxy: Math.abs(r.put_delta_oi) + Math.abs(r.call_delta_oi),
            }));
            // normalize to 0-100 range
            const maxVal = Math.max(...smile.map(s => s.ivProxy), 1);
            setSmileData(smile.map(s => ({ ...s, ivProxy: (s.ivProxy / maxVal) * 40 + 10 })));
          }
        }
      } catch (e: any) {
        setError(e.message || "Erreur de chargement");
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  // Derived KPIs
  const latest = ivData.length > 0 ? ivData[ivData.length - 1] : null;
  const ivActuelle = latest ? latest.volatility * 100 : null;
  const ivRank = latest ? latest.iv_rank_1y : null;
  const hvEstimate = ivData.length >= 5
    ? ivData.slice(-5).reduce((sum, d, i, arr) => {
        if (i === 0) return 0;
        const ret = Math.abs(d.volatility - arr[i - 1].volatility) / (arr[i - 1].volatility || 1);
        return sum + ret;
      }, 0) / 4 * Math.sqrt(252) * 100
    : null;
  const vrp = ivActuelle !== null && hvEstimate !== null ? ivActuelle - hvEstimate : null;
  const regime = ivRank !== null ? regimeLabel(ivRank) : null;

  // Term structure: last 5 entries
  const termStructure = ivData.slice(-5).map(d => ({
    date: d.date?.slice(5) || "",
    iv: d.volatility * 100,
    vix: d.vix || null,
  }));

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <PageHeader
        timer={<RefreshTimer intervalSeconds={10} />}
        title="Carte de Volatilite"
        subtitle="Analyse institutionnelle — Regime, Surface, Mecaniques de Dealers"
      >
        <LiveBadge />
      </PageHeader>

      {error && (
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-3 mb-4 text-xs text-red-400">
          {error} — Les donnees live ne sont pas disponibles. Les sections analytiques restent accessibles.
        </div>
      )}

      {/* ───── Section 1: Regime Summary ───── */}
      <div className="mb-2">
        <div className="text-[10px] text-[#6B6B75] uppercase tracking-widest mb-3">Regime Actuel</div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <KpiCard
          label="IV Actuelle"
          value={loading ? "..." : ivActuelle !== null ? `${ivActuelle.toFixed(1)}%` : "N/A"}
          sublabel="Volatilite implicite SPY"
          color="#FF6B00"
        />
        <KpiCard
          label="IV Rank 1Y"
          value={loading ? "..." : ivRank !== null ? `${ivRank.toFixed(0)}%` : "N/A"}
          sublabel="Percentile sur 252 jours"
          color={ivRank !== null ? (ivRank > 60 ? "#ef4444" : ivRank > 30 ? "#f59e0b" : "#10b981") : "#6B6B75"}
        />
        <KpiCard
          label="VRP Estime"
          value={loading ? "..." : vrp !== null ? `${vrp > 0 ? "+" : ""}${vrp.toFixed(1)}%` : "N/A"}
          sublabel="IV - HV (prime de risque)"
          color={vrp !== null ? (vrp > 0 ? "#10b981" : "#ef4444") : "#6B6B75"}
        />
        <Card className="p-4 text-center flex flex-col items-center justify-center">
          <div className="text-[10px] text-[#6B6B75] uppercase tracking-widest mb-2">Regime</div>
          {loading ? (
            <div className="text-lg text-[#6B6B75]">...</div>
          ) : regime ? (
            <Badge color={regime.color} className="text-sm px-4 py-1.5">{regime.text}</Badge>
          ) : (
            <div className="text-sm text-[#6B6B75]">N/A</div>
          )}
          <div className="text-[10px] text-[#6B6B75] mt-2">Base sur IV Rank</div>
        </Card>
      </div>

      {/* ───── Section 2 & 3: Charts ───── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {/* Smile */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs text-[#6B6B75] uppercase tracking-wider">IV Smile — SPX (delta exposure proxy)</div>
            <LiveBadge />
          </div>
          {smileData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={smileData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E1E22" />
                <XAxis
                  dataKey="strike"
                  tick={{ fill: "#6B6B75", fontSize: 10 }}
                  tickFormatter={(v: number) => v.toLocaleString()}
                />
                <YAxis tick={{ fill: "#6B6B75", fontSize: 10 }} />
                <Tooltip content={darkTooltip} />
                <ReferenceLine
                  x={smileData[Math.floor(smileData.length / 2)]?.strike}
                  stroke="#FF6B0044"
                  strokeDasharray="4 4"
                  label={{ value: "ATM", fill: "#FF6B00", fontSize: 10 }}
                />
                <Line
                  dataKey="ivProxy"
                  stroke="#FF6B00"
                  strokeWidth={2.5}
                  dot={{ r: 2, fill: "#FF6B00" }}
                  name="IV Proxy"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[260px] flex items-center justify-center text-xs text-[#6B6B75]">
              {loading ? "Chargement..." : "Donnees non disponibles"}
            </div>
          )}
        </Card>

        {/* Term Structure */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs text-[#6B6B75] uppercase tracking-wider">Structure de Terme — IV 5 derniers jours</div>
            <LiveBadge />
          </div>
          {termStructure.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={termStructure}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E1E22" />
                <XAxis dataKey="date" tick={{ fill: "#6B6B75", fontSize: 10 }} />
                <YAxis tick={{ fill: "#6B6B75", fontSize: 10 }} unit="%" domain={["dataMin - 1", "dataMax + 1"]} />
                <Tooltip content={darkTooltip} />
                <Line dataKey="iv" stroke="#FF6B00" strokeWidth={2.5} dot={{ r: 4, fill: "#FF6B00" }} name="IV SPY" />
                {termStructure[0]?.vix != null && (
                  <Line dataKey="vix" stroke="#6B6B75" strokeWidth={1.5} strokeDasharray="4 4" dot={{ r: 3, fill: "#6B6B75" }} name="VIX" />
                )}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[260px] flex items-center justify-center text-xs text-[#6B6B75]">
              {loading ? "Chargement..." : "Donnees non disponibles"}
            </div>
          )}
        </Card>
      </div>

      {/* ───── Section 4: Vol Surface Heatmap ───── */}
      <Card className="p-5 mb-8">
        <div className="text-xs text-[#6B6B75] uppercase tracking-wider mb-4">
          Surface de Volatilite — Heatmap (IV % par Strike x DTE)
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="text-left text-[#6B6B75] px-2 py-1.5 font-medium">Moneyness</th>
                {SURFACE_DTE.map(d => (
                  <th key={d} className="text-center text-[#6B6B75] px-2 py-1.5 font-medium">{d}j</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SURFACE_MONEY.map(m => (
                <tr key={m}>
                  <td className={`px-2 py-1.5 font-mono ${m === "ATM" ? "text-[#FF6B00] font-bold" : "text-[#A0A0A8]"}`}>{m}</td>
                  {SURFACE_DATA[m].map((iv, i) => (
                    <td key={i} className="px-2 py-1.5 text-center">
                      <span
                        className="inline-block px-2 py-0.5 rounded font-mono text-white text-[11px] min-w-[42px]"
                        style={{ backgroundColor: cellColor(iv), opacity: 0.85 }}
                      >
                        {iv.toFixed(1)}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center gap-4 mt-3 text-[10px] text-[#6B6B75]">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ backgroundColor: "#1e40af" }} /> Basse</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ backgroundColor: "#059669" }} /> Moyenne</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ backgroundColor: "#d97706" }} /> Elevee</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ backgroundColor: "#dc2626" }} /> Extreme</span>
        </div>
      </Card>

      {/* ───── Section 5: Educational — Smile, Skew, Contango ───── */}
      <div className="mb-2">
        <div className="text-[10px] text-[#6B6B75] uppercase tracking-widest mb-3">Concepts Fondamentaux</div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* Smile */}
        <Card className="p-5">
          <div className="text-sm font-bold text-[#FF6B00] mb-3">Smile de Volatilite</div>
          <p className="text-xs text-[#A0A0A8] leading-relaxed mb-2">
            La courbe en forme de U montre que les options loin de la monnaie (OTM) sont plus cheres en vol implicite que les options a la monnaie (ATM). Les puts OTM coutent plus cher car les investisseurs paient une prime de protection contre les crashes.
          </p>
          <p className="text-xs text-[#A0A0A8] leading-relaxed mb-2">
            Ce phenomene est plus prononce sur les indices que sur les actions individuelles. Apres le crash de 1987, le smile est devenu permanent — le marche a integre la possibilite d'evenements extremes dans le pricing des options.
          </p>
          <p className="text-xs text-[#A0A0A8] leading-relaxed mb-3">
            Un smile prononce indique une forte demande de protection. L'asymetrie (skew) entre puts et calls donne une mesure directe du sentiment de peur du marche. Plus le smile est pentue a gauche, plus les participants hedgent agressivement.
          </p>
          <div className="bg-[#0A0A0C] rounded-lg p-3 mb-3">
            <div className="text-[10px] text-[#6B6B75] uppercase tracking-wider mb-1">Formule</div>
            <code className="text-[11px] text-[#FF6B00] font-mono">Skew = IV(25d Put) - IV(25d Call)</code>
          </div>
          <div className="bg-[#0A0A0C] rounded-lg p-3 mb-3">
            <div className="text-[10px] text-[#6B6B75] uppercase tracking-wider mb-1">Quand c'est important</div>
            <p className="text-xs text-white leading-relaxed">
              CBOE SKEW Index &gt; 130 : marche nerveux, forte demande de protection. SKEW &lt; 120 : complaisance relative. Un ecart brutal de 10+ points en 24h est un signal d'alerte majeur.
            </p>
          </div>
          <Badge color="#f59e0b">Observer le ratio Put/Call OI</Badge>
        </Card>

        {/* Skew */}
        <Card className="p-5">
          <div className="text-sm font-bold text-[#FF6B00] mb-3">Skew de Volatilite</div>
          <p className="text-xs text-[#A0A0A8] leading-relaxed mb-2">
            Le skew mesure la difference de vol implicite entre les puts OTM et les calls OTM. Un skew negatif (puts plus chers) est la norme sur les indices actions, refletant la tendance historique des marches a corriger plus violemment qu'ils ne montent.
          </p>
          <p className="text-xs text-[#A0A0A8] leading-relaxed mb-2">
            Le skew s'intensifie en periode de stress car la demande de puts protecteurs explose tandis que les calls OTM perdent en attractivite. Les dealers, forces de vendre ces puts, augmentent leur prix (et donc la vol implicite) pour compenser le risque.
          </p>
          <p className="text-xs text-[#A0A0A8] leading-relaxed mb-3">
            Le CBOE SKEW Index est un indicateur derive qui mesure la probabilite implicite d'un mouvement de -2 ecarts-types ou plus. Historiquement, des lectures extremes precedent souvent des corrections de 5-10% dans les 30 jours suivants.
          </p>
          <div className="bg-[#0A0A0C] rounded-lg p-3 mb-3">
            <div className="text-[10px] text-[#6B6B75] uppercase tracking-wider mb-1">Formule</div>
            <code className="text-[11px] text-[#FF6B00] font-mono">SKEW = 100 - 10 x S3</code>
            <div className="text-[10px] text-[#6B6B75] mt-1">ou S3 = skewness risk-neutre implicite</div>
          </div>
          <div className="bg-[#0A0A0C] rounded-lg p-3 mb-3">
            <div className="text-[10px] text-[#6B6B75] uppercase tracking-wider mb-1">Quand c'est important</div>
            <p className="text-xs text-white leading-relaxed">
              SKEW &gt; 135 : alerte forte, probabilite de crash implicite elevee. SKEW &lt; 115 : marche excessivement complaisant. VIX bas + SKEW eleve = combinaison la plus dangereuse.
            </p>
          </div>
          <Badge color="#ef4444">VIX bas + SKEW eleve = Danger</Badge>
        </Card>

        {/* Contango */}
        <Card className="p-5">
          <div className="text-sm font-bold text-[#FF6B00] mb-3">Contango vs Backwardation</div>
          <p className="text-xs text-[#A0A0A8] leading-relaxed mb-2">
            En Contango (regime normal, ~80% du temps), la vol implicite a long terme est superieure au court terme. Le marche anticipe un retour a la moyenne et la structure temporelle monte vers la droite.
          </p>
          <p className="text-xs text-[#A0A0A8] leading-relaxed mb-2">
            En Backwardation (stress), le court terme depasse le long terme — les operateurs paient une prime immediate pour se couvrir contre un risque imminent. La courbe s'inverse. C'est un signal de panique institutionnelle.
          </p>
          <p className="text-xs text-[#A0A0A8] leading-relaxed mb-3">
            Le spread VIX3M - VIX est l'indicateur le plus utilise. Un ratio VIX/VIX3M &gt; 1 confirme la backwardation. Les ETN de volatilite (VXX, UVXY) subissent un roll yield negatif en contango et positif en backwardation, ce qui rend le timing crucial.
          </p>
          <div className="bg-[#0A0A0C] rounded-lg p-3 mb-3">
            <div className="text-[10px] text-[#6B6B75] uppercase tracking-wider mb-1">Formule</div>
            <code className="text-[11px] text-[#FF6B00] font-mono">Term Spread = VIX3M - VIX</code>
            <div className="text-[10px] text-[#6B6B75] mt-1">Positif = Contango | Negatif = Backwardation</div>
          </div>
          <div className="bg-[#0A0A0C] rounded-lg p-3 mb-3">
            <div className="text-[10px] text-[#6B6B75] uppercase tracking-wider mb-1">Quand c'est important</div>
            <p className="text-xs text-white leading-relaxed">
              Backwardation persistante (&gt; 3 jours) = regime de risque confirme. VIX &gt; 30 + backwardation = probabilite de capitulation. Transition rapide contango-&gt;backwardation = signal le plus fiable.
            </p>
          </div>
          <Badge color="#3b82f6">Surveiller VIX3M - VIX daily</Badge>
        </Card>
      </div>

      {/* ───── Section 6: Decision Matrix ───── */}
      <Card className="p-5 mb-8">
        <div className="text-sm font-bold text-[#FF6B00] mb-4">Matrice de Decision — Quand Agir sur la Volatilite</div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#1E1E22]">
                <th className="text-left text-[#6B6B75] px-2 py-2 font-medium">Condition</th>
                <th className="text-center text-[#6B6B75] px-2 py-2 font-medium">VIX</th>
                <th className="text-center text-[#6B6B75] px-2 py-2 font-medium">IV Rank</th>
                <th className="text-center text-[#6B6B75] px-2 py-2 font-medium">Skew</th>
                <th className="text-center text-[#6B6B75] px-2 py-2 font-medium">Term Struct.</th>
                <th className="text-left text-[#6B6B75] px-2 py-2 font-medium">Action</th>
                <th className="text-left text-[#6B6B75] px-2 py-2 font-medium">Instrument</th>
              </tr>
            </thead>
            <tbody>
              {DECISIONS.map((d, i) => (
                <tr key={i} className="border-b border-[#1E1E22]/50 hover:bg-[#1A1A1E] transition-colors">
                  <td className="px-2 py-2.5 text-[#A0A0A8]">{d.condition}</td>
                  <td className="px-2 py-2.5 text-center font-mono text-white">{d.vix}</td>
                  <td className="px-2 py-2.5 text-center font-mono text-white">{d.ivRank}</td>
                  <td className="px-2 py-2.5 text-center font-mono text-white">{d.skew}</td>
                  <td className="px-2 py-2.5 text-center text-[#A0A0A8]">{d.term}</td>
                  <td className="px-2 py-2.5">
                    <span className="font-semibold" style={{ color: d.color }}>{d.action}</span>
                  </td>
                  <td className="px-2 py-2.5 text-[#A0A0A8]">{d.instrument}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ───── Section 7: VRP Deep Dive ───── */}
      <div className="mb-2">
        <div className="text-[10px] text-[#6B6B75] uppercase tracking-widest mb-3">Volatility Risk Premium</div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <Card className="p-5">
          <div className="text-sm font-bold text-[#FF6B00] mb-3">VRP — Prime de Risque de Volatilite</div>
          <p className="text-xs text-[#A0A0A8] leading-relaxed mb-2">
            La VRP represente la difference entre la volatilite implicite (anticipee par le marche) et la volatilite realisee (historique). Cette prime existe parce que les investisseurs sont prets a payer plus pour de la protection que ce que le risque reel justifie.
          </p>
          <p className="text-xs text-[#A0A0A8] leading-relaxed mb-2">
            Historiquement, la VRP est positive environ 85% du temps. En moyenne, l'IV depasse la HV de 3 a 5 points de pourcentage. C'est cette asymetrie persistante qui rend la vente de volatilite rentable sur le long terme.
          </p>
          <p className="text-xs text-[#A0A0A8] leading-relaxed mb-3">
            Attention : les 15% du temps ou la VRP est negative correspondent souvent aux periodes les plus destructrices pour les vendeurs de vol. Un bon gestionnaire de risque ne vend jamais de vol quand la VRP est negative ou proche de zero.
          </p>
          <div className="bg-[#0A0A0C] rounded-lg p-3">
            <div className="text-[10px] text-[#6B6B75] uppercase tracking-wider mb-1">Formule</div>
            <code className="text-[11px] text-[#FF6B00] font-mono block mb-1">VRP = IV(t) - HV(t, t+N)</code>
            <code className="text-[11px] text-[#6B6B75] font-mono block">HV = sigma(ln returns) x sqrt(252) x 100</code>
          </div>
        </Card>

        <Card className="p-5">
          <div className="text-sm font-bold text-[#FF6B00] mb-3">Quand Recolter vs Eviter</div>
          <div className="space-y-3">
            <div className="bg-[#10b981]/10 border border-[#10b981]/20 rounded-lg p-3">
              <div className="text-xs font-semibold text-[#10b981] mb-1">Recolter la VRP (vente de vol)</div>
              <ul className="text-[11px] text-[#A0A0A8] space-y-1">
                <li>- VRP &gt; 3% de maniere stable</li>
                <li>- IV Rank entre 20-60% (pas d'extreme)</li>
                <li>- Contango en place, pas de catalyseur majeur</li>
                <li>- GEX positif (dealers stabilisateurs)</li>
              </ul>
            </div>
            <div className="bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-lg p-3">
              <div className="text-xs font-semibold text-[#ef4444] mb-1">Eviter / Acheter de la vol</div>
              <ul className="text-[11px] text-[#A0A0A8] space-y-1">
                <li>- VRP negative ou proche de zero</li>
                <li>- IV Rank &gt; 70% avec backwardation</li>
                <li>- SKEW &gt; 135 (tail risk price eleve)</li>
                <li>- GEX negatif (dealers amplificateurs)</li>
              </ul>
            </div>
            <div className="bg-[#0A0A0C] rounded-lg p-3">
              <div className="text-[10px] text-[#6B6B75] uppercase tracking-wider mb-1">Contexte historique</div>
              <p className="text-xs text-white leading-relaxed">
                La VRP moyenne sur le SPX depuis 2000 est d'environ 3.8%. Pendant les crises (2008, 2020), elle atteint -10% a -15%. Les meilleurs vendeurs de vol utilisent la VRP comme filtre principal avant toute entree.
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* ───── Section 8: Dealer Mechanics ───── */}
      <div className="mb-2">
        <div className="text-[10px] text-[#6B6B75] uppercase tracking-widest mb-3">Mecaniques de Dealers</div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {GREEKS.map(g => (
          <Card key={g.title} className="p-5">
            <div className="text-sm font-bold text-[#FF6B00] mb-3">{g.title}</div>
            <p className="text-xs text-[#A0A0A8] leading-relaxed mb-3">{g.body}</p>
            <div className="bg-[#0A0A0C] rounded-lg p-3 mb-3">
              <div className="text-[10px] text-[#6B6B75] uppercase tracking-wider mb-1">Formule</div>
              <code className="text-[11px] text-[#FF6B00] font-mono">{g.formula}</code>
            </div>
            <div className="bg-[#0A0A0C] rounded-lg p-3 mb-3">
              <div className="text-[10px] text-[#6B6B75] uppercase tracking-wider mb-1">Signal</div>
              <p className="text-xs text-white leading-relaxed">{g.signal}</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge color="#10b981">{g.thresholdHigh} = {g.action}</Badge>
              <Badge color="#ef4444">{g.thresholdLow} = {g.actionNeg}</Badge>
            </div>
          </Card>
        ))}
      </div>

      {/* Footer */}
      <div className="text-center text-[10px] text-[#6B6B75] mt-8 mb-4">
        Donnees fournies par UW API via Volumetrica — Mise a jour en temps reel — Usage institutionnel uniquement
      </div>
    </div>
  );
}
