"use client";

import { Card, PageHeader, Badge } from "@/components/ui/card";
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";

function darkTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1A1A1E] border border-[#2A2A2E] rounded px-3 py-2 text-xs">
      <div className="text-[#6B6B75] mb-1">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ color: p.color }}>{p.name}: {Number(p.value).toFixed(1)}%</div>
      ))}
    </div>
  );
}

const smileData = [
  { strike: "80%", iv: 32 }, { strike: "85%", iv: 27 }, { strike: "90%", iv: 23 },
  { strike: "95%", iv: 20 }, { strike: "ATM", iv: 18 }, { strike: "105%", iv: 19 },
  { strike: "110%", iv: 21 }, { strike: "115%", iv: 24 }, { strike: "120%", iv: 28 },
];

const termData = [
  { tenor: "1M", contango: 16, backwardation: 28 },
  { tenor: "2M", contango: 17, backwardation: 25 },
  { tenor: "3M", contango: 18.5, backwardation: 22 },
  { tenor: "6M", contango: 20, backwardation: 20 },
  { tenor: "9M", contango: 21, backwardation: 19 },
  { tenor: "12M", contango: 22, backwardation: 18.5 },
];

const concepts = [
  {
    title: "Smile de Volatilite",
    description: "La courbe en forme de U montre que les options loin de la monnaie (OTM) sont plus cheres en vol implicite que les options a la monnaie (ATM). Les puts OTM coutent plus cher car les investisseurs paient une prime de protection contre les crashes. Ce phenomene est plus prononce sur les indices que sur les actions individuelles.",
    insight: "Un smile prononce indique une forte demande de protection. Observer l'asymetrie (skew) entre puts et calls donne une mesure du sentiment de peur du marche.",
  },
  {
    title: "Skew de Volatilite",
    description: "Le skew mesure la difference de vol implicite entre les puts OTM et les calls OTM. Un skew negatif (puts plus chers) est la norme sur les indices actions, refletant la tendance historique des marches a corriger plus violemment qu'ils ne montent. Le skew s'intensifie en periode de stress.",
    insight: "SKEW > 130 : marche nerveux, forte demande de protection. SKEW < 120 : complaisance relative. Le ratio Put/Call en volume amplifie le signal.",
  },
  {
    title: "Contango vs Backwardation",
    description: "En Contango (regime normal), la vol implicite a long terme est superieure au court terme — le marche anticipe un retour a la moyenne. En Backwardation (stress), le court terme depasse le long terme — les operateurs paient une prime immediate pour se couvrir contre un risque imminent.",
    insight: "Backwardation persistante = signal de regime de risque. Le spread VIX3M-VIX est un indicateur cle : negatif = backwardation = alerte.",
  },
];

const guide = [
  { condition: "VRP positif + Contango + Skew modere", action: "Vente de vol (short straddle/strangle, iron condor)", color: "#4CAF50" },
  { condition: "VRP negatif + Backwardation + Skew eleve", action: "Achat de vol (long puts, long straddle, VIX calls)", color: "#EF4444" },
  { condition: "Transition contango -> backwardation", action: "Reduire exposition, hedger, passer en mode defensif", color: "#FFB300" },
  { condition: "Smile aplati + vol basse historiquement", action: "Achat de vol long terme (calendar spreads, LEAPS)", color: "#42A5F5" },
];

export default function VolMapPage() {
  return (
    <div className="p-6">
      <PageHeader title="Carte de Volatilite" subtitle="Guide pedagogique — Smile, Skew et Structure de Terme" />

      {/* 3 concept cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {concepts.map(c => (
          <Card key={c.title} className="p-5">
            <div className="text-sm font-bold text-[#FF6B00] mb-2">{c.title}</div>
            <p className="text-xs text-[#A0A0A8] leading-relaxed mb-3">{c.description}</p>
            <div className="bg-[#0A0A0C] rounded-lg p-3">
              <div className="text-[10px] text-[#6B6B75] uppercase tracking-wider mb-1">Point cle</div>
              <p className="text-xs text-white leading-relaxed">{c.insight}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card className="p-4">
          <div className="text-xs text-[#6B6B75] uppercase tracking-wider mb-3">Smile de Volatilite (illustration)</div>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={smileData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E1E22" />
              <XAxis dataKey="strike" tick={{ fill: "#6B6B75", fontSize: 11 }} />
              <YAxis tick={{ fill: "#6B6B75", fontSize: 10 }} unit="%" />
              <Tooltip content={darkTooltip} />
              <Line dataKey="iv" stroke="#FF6B00" strokeWidth={2.5} dot={{ r: 4, fill: "#FF6B00" }} name="IV" />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-4">
          <div className="text-xs text-[#6B6B75] uppercase tracking-wider mb-3">Contango vs Backwardation (illustration)</div>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={termData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E1E22" />
              <XAxis dataKey="tenor" tick={{ fill: "#6B6B75", fontSize: 11 }} />
              <YAxis tick={{ fill: "#6B6B75", fontSize: 10 }} unit="%" />
              <Tooltip content={darkTooltip} />
              <Line dataKey="contango" stroke="#4CAF50" strokeWidth={2} dot={{ r: 3, fill: "#4CAF50" }} name="Contango" />
              <Line dataKey="backwardation" stroke="#EF4444" strokeWidth={2} dot={{ r: 3, fill: "#EF4444" }} name="Backwardation" />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Practical guide */}
      <Card className="p-5">
        <div className="text-sm font-bold text-[#FF6B00] mb-4">Guide Pratique : Quand Vendre vs Acheter de la Volatilite</div>
        <div className="space-y-3">
          {guide.map((g, i) => (
            <div key={i} className="flex items-start gap-4 p-3 rounded-lg bg-[#0A0A0C]">
              <Badge color={g.color}>{g.color === "#4CAF50" ? "VENTE" : g.color === "#EF4444" ? "ACHAT" : g.color === "#FFB300" ? "DEFENSE" : "LONG TERME"}</Badge>
              <div className="flex-1">
                <div className="text-xs text-[#A0A0A8] mb-1">{g.condition}</div>
                <div className="text-sm text-white">{g.action}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
