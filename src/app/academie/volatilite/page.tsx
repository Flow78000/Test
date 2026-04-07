"use client";
import { useState } from "react";
import { Card, PageHeader, Badge } from "@/components/ui/card";
import Link from "next/link";

/* ── tiny nav pill ── */
function SectionNav({ sections, active, onSelect }: { sections: { id: string; label: string }[]; active: string; onSelect: (id: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2 mb-8 sticky top-0 z-20 bg-[#08080A] py-3 border-b border-[#1E1E22]">
      {sections.map((s) => (
        <button
          key={s.id}
          onClick={() => {
            onSelect(s.id);
            document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            active === s.id
              ? "bg-[#FF6B00] text-white"
              : "bg-[#1A1A1E] text-[#6B6B75] hover:text-[#F0F0F0] hover:bg-[#222228]"
          }`}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}

/* ── reusable blocks ── */
function KeyConcept({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#FF6B0008] border border-[#FF6B0022] rounded-lg p-4 mt-4">
      <div className="text-sm font-bold text-[#FF6B00] mb-1">{title}</div>
      <div className="text-sm text-[#6B6B75] leading-relaxed">{children}</div>
    </div>
  );
}

function Formula({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-[#08080A] rounded-lg p-4 mt-3 font-mono text-sm text-[#FFA726] overflow-x-auto">
      {children}
    </div>
  );
}

function Takeaway({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-[#22C55E08] border border-[#22C55E22] rounded-lg p-4 mt-4">
      <div className="text-xs font-bold text-[#22C55E] uppercase tracking-wider mb-1">Takeaway</div>
      <div className="text-sm text-[#6B6B75] leading-relaxed">{children}</div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-left p-3 text-[#6B6B75] text-xs uppercase tracking-wide">{children}</th>;
}
function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={`p-3 text-sm ${className ?? ""}`}>{children}</td>;
}

const SECTIONS = [
  { id: "s1", label: "01 Vol Realisee vs Implicite" },
  { id: "s2", label: "02 VIX" },
  { id: "s3", label: "03 Term Structure" },
  { id: "s4", label: "04 MOVE" },
  { id: "s5", label: "05 SKEW & VVIX" },
  { id: "s6", label: "06 Dealer Mechanics" },
  { id: "s7", label: "07 Revolution 0DTE" },
  { id: "s8", label: "08 Regimes" },
  { id: "s9", label: "09 VRP" },
  { id: "s10", label: "10 Synthese" },
];

export default function VolatilitePage() {
  const [active, setActive] = useState("s1");

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-1">
        <Link href="/academie" className="text-[#6B6B75] hover:text-[#FF6B00] text-xs transition-colors">
          Academie
        </Link>
        <span className="text-[#6B6B75] text-xs">/</span>
        <span className="text-xs text-[#FF6B00]">Module 01</span>
      </div>
      <PageHeader
        title="Indices de Volatilite"
        subtitle="VIX . MOVE . SKEW . VVIX . Term Structure . VRP — 12 pages"
      >
        <Badge color="#FF6B00">Institutionnel</Badge>
      </PageHeader>

      <SectionNav sections={SECTIONS} active={active} onSelect={setActive} />

      {/* ────────────────────────────────────────────────────── */}
      {/* SECTION 01 — Vol Realisee vs Implicite               */}
      {/* ────────────────────────────────────────────────────── */}
      <section id="s1" className="mb-14">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-black text-[#FF6B00]">01</span>
          <h2 className="text-lg font-bold">Volatilite Realisee vs Implicite</h2>
        </div>
        <Card className="p-6 space-y-4">
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            La volatilite est la mesure centrale du risque en finance. Elle quantifie la dispersion
            des rendements d&apos;un actif autour de sa moyenne. On distingue deux formes fondamentales :
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="bg-[#0D0D10] rounded-lg p-5 border border-[#1E1E22]">
              <div className="text-sm font-bold text-[#FF6B00] mb-2">Volatilite Realisee (HV)</div>
              <p className="text-xs text-[#6B6B75] leading-relaxed mb-3">
                Mesure statistique basee sur les rendements passes. Calculee a posteriori
                sur une fenetre glissante (10, 20, 30 jours). Elle represente ce qui s&apos;est
                effectivement passe.
              </p>
              <Formula>
                HV = sigma(r) x sqrt(252)<br/>
                r = ln(Close_t / Close_t-1)
              </Formula>
            </div>
            <div className="bg-[#0D0D10] rounded-lg p-5 border border-[#1E1E22]">
              <div className="text-sm font-bold text-[#42A5F5] mb-2">Volatilite Implicite (IV)</div>
              <p className="text-xs text-[#6B6B75] leading-relaxed mb-3">
                Extraite des prix d&apos;options via le modele Black-Scholes. Elle represente
                l&apos;anticipation du marche sur la volatilite future. C&apos;est un prix, pas une prevision.
              </p>
              <Formula>
                IV = f(Prix Option, Strike, Spot, Taux, Maturite)<br/>
                Resolue par inversion du modele B-S
              </Formula>
            </div>
          </div>

          <KeyConcept title="Variance Risk Premium (VRP)">
            La difference entre IV et HV future realisee. Historiquement positive : les vendeurs
            d&apos;options sont recompenses car le marche surcote la volatilite future.
            Le VRP est la source de rendement principale des strategies de vente de volatilite.
          </KeyConcept>

          <Formula>VRP = IV(t) - HV realisee(t, t+T)</Formula>

          <div className="overflow-x-auto mt-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1E1E22]">
                  <Th>Metrique</Th>
                  <Th>Base</Th>
                  <Th>Direction</Th>
                  <Th>Usage</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1A1A1E]">
                <tr className="hover:bg-[#FF6B0006]">
                  <Td className="font-mono text-[#FF6B00]">HV 10j</Td>
                  <Td>Rendements passes</Td>
                  <Td>Backward-looking</Td>
                  <Td>Regime court terme</Td>
                </tr>
                <tr className="hover:bg-[#FF6B0006]">
                  <Td className="font-mono text-[#FF6B00]">HV 30j</Td>
                  <Td>Rendements passes</Td>
                  <Td>Backward-looking</Td>
                  <Td>Benchmark standard</Td>
                </tr>
                <tr className="hover:bg-[#FF6B0006]">
                  <Td className="font-mono text-[#42A5F5]">IV 30j (VIX)</Td>
                  <Td>Prix options SPX</Td>
                  <Td>Forward-looking</Td>
                  <Td>Anticipation marche</Td>
                </tr>
                <tr className="hover:bg-[#FF6B0006]">
                  <Td className="font-mono text-[#42A5F5]">IV surface</Td>
                  <Td>Options toutes maturites</Td>
                  <Td>Forward-looking</Td>
                  <Td>Skew, term structure</Td>
                </tr>
              </tbody>
            </table>
          </div>

          <Takeaway>
            IV &gt; HV = le marche anticipe plus de risque que le passe recent ne le montre.
            C&apos;est le signal le plus fiable de stress latent. Surveillez l&apos;ecart IV-HV pour
            detecter les regimes de peur ou de complaisance.
          </Takeaway>
        </Card>
      </section>

      {/* ────────────────────────────────────────────────────── */}
      {/* SECTION 02 — VIX Construction & Interpretation        */}
      {/* ────────────────────────────────────────────────────── */}
      <section id="s2" className="mb-14">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-black text-[#FF6B00]">02</span>
          <h2 className="text-lg font-bold">VIX — Construction & Interpretation</h2>
        </div>
        <Card className="p-6 space-y-4">
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            Le VIX (CBOE Volatility Index) mesure la volatilite implicite a 30 jours du S&P 500,
            calculee a partir de la bande complete de strikes OTM (puts et calls) sur les options SPX.
            Ce n&apos;est pas un simple ATM IV — c&apos;est une mesure de variance swap synthetique.
          </p>

          <KeyConcept title="Methodologie VIX">
            Le VIX est base sur la replication d&apos;un variance swap a 30 jours. Il integre tous
            les strikes OTM avec des poids inversement proportionnels au carre du strike.
            Les puts loin OTM ont donc un impact significatif (tail risk integre).
          </KeyConcept>

          <Formula>
            VIX^2 = (2/T) x Sum[ (dK_i/K_i^2) x e^(rT) x Mid(K_i) ] - (1/T)(F/K0 - 1)^2
          </Formula>

          <div className="overflow-x-auto mt-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1E1E22]">
                  <Th>Niveau VIX</Th>
                  <Th>Regime</Th>
                  <Th>Contexte Marche</Th>
                  <Th>Action Trader</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1A1A1E]">
                <tr className="hover:bg-[#FF6B0006]">
                  <Td className="font-mono text-[#22C55E]">&lt; 12</Td>
                  <Td>Complaisance extreme</Td>
                  <Td>Calme plat, faible volume, marche directionnel haussier</Td>
                  <Td>Attention aux retournements — acheter des protections pas cheres</Td>
                </tr>
                <tr className="hover:bg-[#FF6B0006]">
                  <Td className="font-mono text-[#22C55E]">12–16</Td>
                  <Td>Calme</Td>
                  <Td>Bull market normal, dispersion faible</Td>
                  <Td>Vente de vol, strategies theta</Td>
                </tr>
                <tr className="hover:bg-[#FF6B0006]">
                  <Td className="font-mono text-[#FFA726]">16–20</Td>
                  <Td>Normal</Td>
                  <Td>Moyenne historique long terme</Td>
                  <Td>Trading standard, taille normale</Td>
                </tr>
                <tr className="hover:bg-[#FF6B0006]">
                  <Td className="font-mono text-[#FFA726]">20–25</Td>
                  <Td>Eleve</Td>
                  <Td>Incertitude, rotation sectorielle, events macro</Td>
                  <Td>Reduire la taille, hedging actif</Td>
                </tr>
                <tr className="hover:bg-[#FF6B0006]">
                  <Td className="font-mono text-[#EF4444]">25–30</Td>
                  <Td>Stress</Td>
                  <Td>Correction active, fear spreading</Td>
                  <Td>Mode defensif, stops serres, position sizing -50%</Td>
                </tr>
                <tr className="hover:bg-[#FF6B0006]">
                  <Td className="font-mono text-[#EF4444]">30–40</Td>
                  <Td>Panique</Td>
                  <Td>Sell-off brutal, margin calls, liquidations forcees</Td>
                  <Td>Cash ou couvert uniquement — pas de hero trading</Td>
                </tr>
                <tr className="hover:bg-[#FF6B0006]">
                  <Td className="font-mono text-[#EF4444]">&gt; 40</Td>
                  <Td>Crise</Td>
                  <Td>Black swan, crise systemique (Covid, GFC)</Td>
                  <Td>Opportunites contrarian si capital disponible</Td>
                </tr>
              </tbody>
            </table>
          </div>

          <KeyConcept title="VIX est mean-reverting">
            Le VIX revient toujours vers sa moyenne (environ 19-20 historiquement). Les spikes
            au-dessus de 30 sont temporaires. Cela cree des opportunites systematiques de vente
            de vol apres les pics de panique.
          </KeyConcept>

          <Takeaway>
            Le VIX ne predit pas la direction — il mesure le prix de la peur. Un VIX bas ne signifie
            pas &quot;pas de risque&quot;, il signifie &quot;risque pas price&quot;.
            C&apos;est precisement quand le VIX est bas que les protections sont les moins cheres.
          </Takeaway>
        </Card>
      </section>

      {/* ────────────────────────────────────────────────────── */}
      {/* SECTION 03 — Term Structure                            */}
      {/* ────────────────────────────────────────────────────── */}
      <section id="s3" className="mb-14">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-black text-[#FF6B00]">03</span>
          <h2 className="text-lg font-bold">Term Structure de Volatilite</h2>
        </div>
        <Card className="p-6 space-y-4">
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            La term structure represente la courbe des volatilites implicites a travers les differentes
            maturites. Sa forme donne des informations cruciales sur les anticipations du marche.
          </p>

          <div className="overflow-x-auto mt-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1E1E22]">
                  <Th>Indice</Th>
                  <Th>Horizon</Th>
                  <Th>Calcul</Th>
                  <Th>Signal</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1A1A1E]">
                <tr className="hover:bg-[#FF6B0006]">
                  <Td className="font-mono text-[#FF6B00]">VIX1D</Td>
                  <Td>1 jour</Td>
                  <Td>Options SPX expirant le lendemain</Td>
                  <Td>Microstructure intraday, 0DTE flow</Td>
                </tr>
                <tr className="hover:bg-[#FF6B0006]">
                  <Td className="font-mono text-[#FF6B00]">VIX9D</Td>
                  <Td>9 jours</Td>
                  <Td>Options SPX a 9 jours</Td>
                  <Td>Event risk court terme (FOMC, NFP)</Td>
                </tr>
                <tr className="hover:bg-[#FF6B0006]">
                  <Td className="font-mono text-[#FFA726]">VIX (30j)</Td>
                  <Td>30 jours</Td>
                  <Td>Standard VIX methodology</Td>
                  <Td>Benchmark volatilite standard</Td>
                </tr>
                <tr className="hover:bg-[#FF6B0006]">
                  <Td className="font-mono text-[#42A5F5]">VIX3M</Td>
                  <Td>3 mois</Td>
                  <Td>Options SPX a 93 jours</Td>
                  <Td>Tendance structurelle, regime de fond</Td>
                </tr>
                <tr className="hover:bg-[#FF6B0006]">
                  <Td className="font-mono text-[#B388FF]">VIX6M</Td>
                  <Td>6 mois</Td>
                  <Td>Options SPX a 180 jours</Td>
                  <Td>Cycle macro, risk budgeting long terme</Td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="bg-[#22C55E08] border border-[#22C55E22] rounded-lg p-4">
              <div className="text-sm font-bold text-[#22C55E] mb-2">Contango (Normal)</div>
              <p className="text-xs text-[#6B6B75] leading-relaxed">
                VIX &lt; VIX3M &lt; VIX6M. La courbe monte. Le marche anticipe plus d&apos;incertitude
                a long terme. Etat normal — le temps a un cout (theta).
              </p>
              <p className="text-xs text-[#6B6B75] mt-2">
                Signal : marche calme, strategies de carry de vol rentables,
                roll yield positif pour les shorts vol.
              </p>
            </div>
            <div className="bg-[#EF444408] border border-[#EF444422] rounded-lg p-4">
              <div className="text-sm font-bold text-[#EF4444] mb-2">Backwardation (Stress)</div>
              <p className="text-xs text-[#6B6B75] leading-relaxed">
                VIX &gt; VIX3M. La courbe s&apos;inverse. Le marche price plus de risque a court
                terme qu&apos;a long terme. Signal de panique ou de stress aigu.
              </p>
              <p className="text-xs text-[#6B6B75] mt-2">
                Signal : sell-off en cours, demande massive de puts court terme,
                liquidations potentielles. Reduire l&apos;exposition immediatement.
              </p>
            </div>
          </div>

          <KeyConcept title="Ratio VIX / VIX3M">
            Le ratio VIX/VIX3M est un indicateur puissant de regime.
            Ratio &gt; 1.0 = backwardation = stress. Ratio &lt; 0.85 = contango profond = complaisance.
            La zone 0.85-1.00 est le regime normal. Les transitions entre zones sont les signaux les plus actionnables.
          </KeyConcept>

          <Takeaway>
            Ne regardez jamais le VIX seul. La term structure complete (VIX1D / VIX9D / VIX / VIX3M / VIX6M)
            donne la vraie photo du marche. Un VIX a 18 en contango et un VIX a 18 en backwardation
            sont deux mondes totalement differents.
          </Takeaway>
        </Card>
      </section>

      {/* ────────────────────────────────────────────────────── */}
      {/* SECTION 04 — MOVE Index                                */}
      {/* ────────────────────────────────────────────────────── */}
      <section id="s4" className="mb-14">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-black text-[#FF6B00]">04</span>
          <h2 className="text-lg font-bold">MOVE Index — Volatilite Obligataire</h2>
        </div>
        <Card className="p-6 space-y-4">
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            Le MOVE Index (Merrill Lynch Option Volatility Estimate) est le VIX des treasuries US.
            Il mesure la volatilite implicite ponderee des options sur les bons du Tresor
            (2Y, 5Y, 10Y, 30Y). C&apos;est l&apos;indicateur macro le plus sous-estime des traders retail.
          </p>

          <Formula>
            MOVE = Weighted Avg IV (2Y: 20%, 5Y: 20%, 10Y: 40%, 30Y: 20%)
          </Formula>

          <div className="overflow-x-auto mt-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1E1E22]">
                  <Th>MOVE</Th>
                  <Th>Regime</Th>
                  <Th>Implications</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1A1A1E]">
                <tr className="hover:bg-[#FF6B0006]">
                  <Td className="font-mono text-[#22C55E]">&lt; 80</Td>
                  <Td>Calme obligataire</Td>
                  <Td>Politique monetaire stable, risk-on favorable</Td>
                </tr>
                <tr className="hover:bg-[#FF6B0006]">
                  <Td className="font-mono text-[#FFA726]">80–120</Td>
                  <Td>Tension</Td>
                  <Td>Incertitude Fed, repositionnement credit</Td>
                </tr>
                <tr className="hover:bg-[#FF6B0006]">
                  <Td className="font-mono text-[#EF4444]">&gt; 120</Td>
                  <Td>Crise taux</Td>
                  <Td>Dislocation marche, stress bancaire, flight to quality</Td>
                </tr>
                <tr className="hover:bg-[#FF6B0006]">
                  <Td className="font-mono text-[#EF4444]">&gt; 150</Td>
                  <Td>Panique systemique</Td>
                  <Td>SVB, Gilt crisis UK, repo crisis 2019</Td>
                </tr>
              </tbody>
            </table>
          </div>

          <KeyConcept title="MOVE precede le VIX">
            Historiquement, les crises commencent sur le marche obligataire avant de se propager
            aux actions. Un MOVE en hausse avec un VIX bas est un signal d&apos;alerte majeur :
            le stress est reel mais pas encore price par les equities.
          </KeyConcept>

          <KeyConcept title="Cross-Asset : MOVE vs VIX">
            MOVE haut + VIX bas = divergence dangereuse. Le credit se tend, les taux bougent,
            mais les actions ignorent. Cette configuration precede souvent des corrections
            significatives de 5-10% sur les indices.
          </KeyConcept>

          <Takeaway>
            Integrez le MOVE dans votre routine quotidienne. C&apos;est le premier signal de stress
            systemique. Quand le MOVE depasse 120, passez en mode defensif sur tous les actifs,
            meme si le VIX reste sage.
          </Takeaway>
        </Card>
      </section>

      {/* ────────────────────────────────────────────────────── */}
      {/* SECTION 05 — SKEW & VVIX                               */}
      {/* ────────────────────────────────────────────────────── */}
      <section id="s5" className="mb-14">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-black text-[#FF6B00]">05</span>
          <h2 className="text-lg font-bold">SKEW & VVIX — Tail Risk & Vol of Vol</h2>
        </div>
        <Card className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-bold text-[#B388FF] mb-2">CBOE SKEW Index</h3>
              <p className="text-xs text-[#6B6B75] leading-relaxed mb-3">
                Mesure l&apos;asymetrie (skewness) des rendements anticipee par le marche.
                Un SKEW eleve signifie que le marche price un risque de crash (fat left tail)
                superieur a la normale. C&apos;est un thermometre de &quot;tail risk&quot;.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#1E1E22]">
                      <Th>SKEW</Th>
                      <Th>Signal</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1A1A1E]">
                    <tr><Td className="font-mono text-[#22C55E]">100-110</Td><Td>Normal, pas de tail risk excessif</Td></tr>
                    <tr><Td className="font-mono text-[#FFA726]">120-130</Td><Td>Demande elevee de puts OTM lointains</Td></tr>
                    <tr><Td className="font-mono text-[#EF4444]">&gt; 140</Td><Td>Hedging massif — gros acteurs se protegent</Td></tr>
                    <tr><Td className="font-mono text-[#EF4444]">&gt; 150</Td><Td>Niveaux extremes — crash risk eleve</Td></tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#FFA726] mb-2">VVIX — Volatilite de la Volatilite</h3>
              <p className="text-xs text-[#6B6B75] leading-relaxed mb-3">
                Le VVIX mesure la volatilite implicite des options sur le VIX lui-meme.
                C&apos;est un meta-indicateur : il vous dit a quel point le marche est incertain
                sur le niveau futur de la volatilite.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#1E1E22]">
                      <Th>VVIX</Th>
                      <Th>Signal</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1A1A1E]">
                    <tr><Td className="font-mono text-[#22C55E]">&lt; 80</Td><Td>Marche confiant sur la trajectoire de vol</Td></tr>
                    <tr><Td className="font-mono text-[#FFA726]">80-100</Td><Td>Incertitude croissante</Td></tr>
                    <tr><Td className="font-mono text-[#EF4444]">100-120</Td><Td>Forte incertitude — repositionnement en cours</Td></tr>
                    <tr><Td className="font-mono text-[#EF4444]">&gt; 120</Td><Td>Extreme — les dealers ne savent plus pricer</Td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <KeyConcept title="SKEW haut + VIX bas = piege">
            Quand le SKEW monte au-dessus de 140 alors que le VIX reste sous 15, cela signifie
            que les gros acteurs (institutionnels, fonds de pension) achetent massivement des puts
            OTM lointains en anticipation d&apos;un event. Le marche de surface parait calme,
            mais la structure profonde montre du stress.
          </KeyConcept>

          <Takeaway>
            SKEW et VVIX sont vos &quot;early warning systems&quot;. Ils detectent le stress avant le VIX.
            Integrez-les dans votre dashboard quotidien pour ne jamais etre surpris par un mouvement
            que les institutionnels avaient deja price.
          </Takeaway>
        </Card>
      </section>

      {/* ────────────────────────────────────────────────────── */}
      {/* SECTION 06 — Mecanique Dealer                          */}
      {/* ────────────────────────────────────────────────────── */}
      <section id="s6" className="mb-14">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-black text-[#FF6B00]">06</span>
          <h2 className="text-lg font-bold">Mecanique Dealer — Gamma, Vanna, Charm</h2>
        </div>
        <Card className="p-6 space-y-4">
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            Les dealers d&apos;options (market makers) hedgent en permanence leur exposition aux grecs.
            Leur hedging cree des flux mecaniques sur le sous-jacent qui dominent le price action
            a court terme. Comprendre ces flux = comprendre le marche.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="bg-[#0D0D10] rounded-lg p-5 border border-[#1E1E22]">
              <div className="text-sm font-bold text-[#FF6B00] mb-2">Gamma Exposure (GEX)</div>
              <p className="text-xs text-[#6B6B75] leading-relaxed">
                Mesure la sensibilite de second ordre du delta des dealers.
                GEX positif = dealers short gamma = ils vendent quand ca monte, achetent quand ca baisse
                = effet stabilisant, compression de range.
              </p>
              <p className="text-xs text-[#6B6B75] mt-2">
                GEX negatif = dealers long gamma = ils achetent quand ca monte, vendent quand ca baisse
                = effet destabilisant, volatilite amplifiee.
              </p>
            </div>
            <div className="bg-[#0D0D10] rounded-lg p-5 border border-[#1E1E22]">
              <div className="text-sm font-bold text-[#42A5F5] mb-2">Vanna</div>
              <p className="text-xs text-[#6B6B75] leading-relaxed">
                Sensibilite du delta au niveau de vol implicite. Quand la vol baisse,
                le delta des calls augmente, forcant les dealers a acheter du sous-jacent.
                Vanna flow = le rallye auto-alimente par la compression de vol.
              </p>
              <Formula>Vanna = dDelta / dIV = d^2V / (dS x dsigma)</Formula>
            </div>
            <div className="bg-[#0D0D10] rounded-lg p-5 border border-[#1E1E22]">
              <div className="text-sm font-bold text-[#22C55E] mb-2">Charm</div>
              <p className="text-xs text-[#6B6B75] leading-relaxed">
                Sensibilite du delta au temps (theta du delta). A mesure que les options
                s&apos;approchent de l&apos;expiration, le charm force les dealers a rebalancer.
                Dominant surtout dans les 48h avant expiration.
              </p>
              <Formula>Charm = dDelta / dT = d^2V / (dS x dT)</Formula>
            </div>
          </div>

          <div className="overflow-x-auto mt-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1E1E22]">
                  <Th>Configuration</Th>
                  <Th>GEX</Th>
                  <Th>Comportement Marche</Th>
                  <Th>Strategie</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1A1A1E]">
                <tr className="hover:bg-[#FF6B0006]">
                  <Td>Range compression</Td>
                  <Td className="text-[#22C55E] font-mono">+ Eleve</Td>
                  <Td>Faible amplitude, mean reversion, pinning aux strikes</Td>
                  <Td>Vente de vol, iron condors, theta play</Td>
                </tr>
                <tr className="hover:bg-[#FF6B0006]">
                  <Td>Vol expansion</Td>
                  <Td className="text-[#EF4444] font-mono">- Negatif</Td>
                  <Td>Large moves, breakouts, gaps potentiels</Td>
                  <Td>Momentum, breakout, straddles</Td>
                </tr>
                <tr className="hover:bg-[#FF6B0006]">
                  <Td>Transition</Td>
                  <Td className="text-[#FFA726] font-mono">~ Zero</Td>
                  <Td>Zone neutre, directionless, chop</Td>
                  <Td>Attendre la resolution, position sizing reduit</Td>
                </tr>
              </tbody>
            </table>
          </div>

          <Takeaway>
            Les dealers ne &quot;predisent&quot; rien — ils hedgent mecaniquement. Mais leurs flux
            creent des supports et resistances reels (GEX walls). Identifier si vous etes
            en regime GEX positif ou negatif change fondamentalement votre approche du marche.
          </Takeaway>
        </Card>
      </section>

      {/* ────────────────────────────────────────────────────── */}
      {/* SECTION 07 — Revolution 0DTE                           */}
      {/* ────────────────────────────────────────────────────── */}
      <section id="s7" className="mb-14">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-black text-[#FF6B00]">07</span>
          <h2 className="text-lg font-bold">Revolution 0DTE — Options Ultra-Courtes</h2>
        </div>
        <Card className="p-6 space-y-4">
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            Les options 0DTE (zero days to expiration) representent desormais plus de 50% du volume
            total des options SPX. Cette transformation structurelle a change la microstructure
            du marche de maniere permanente depuis 2022.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <KeyConcept title="Volume & Impact">
              En 2024-2025, les 0DTE SPX representent en moyenne 1.5 a 2 millions de contrats
              par jour. Ce volume cree un gamma intraday colossal qui domine le price action
              entre 9h30 et 16h00 ET. Les niveaux GEX intraday changent toutes les heures.
            </KeyConcept>
            <KeyConcept title="Gamma Pin / Magnet Effect">
              Les strikes a fort open interest agissent comme des aimants intraday.
              Le marche a tendance a &quot;pin&quot; autour du max GEX strike, surtout dans
              la derniere heure. Ce phenomene est exploitable en scalping.
            </KeyConcept>
          </div>

          <div className="overflow-x-auto mt-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1E1E22]">
                  <Th>Horaire (ET)</Th>
                  <Th>Phase</Th>
                  <Th>Dynamique</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1A1A1E]">
                <tr className="hover:bg-[#FF6B0006]">
                  <Td className="font-mono text-[#FF6B00]">9:30–10:00</Td>
                  <Td>Opening setup</Td>
                  <Td>0DTE positioning, gamma builds, high spread volatility</Td>
                </tr>
                <tr className="hover:bg-[#FF6B0006]">
                  <Td className="font-mono text-[#FFA726]">10:00–11:30</Td>
                  <Td>Trend phase</Td>
                  <Td>Directional flows dominent, GEX walls testees</Td>
                </tr>
                <tr className="hover:bg-[#FF6B0006]">
                  <Td className="font-mono text-[#6B6B75]">11:30–14:00</Td>
                  <Td>Lunch drift</Td>
                  <Td>Faible volume, theta decay accelere, chop</Td>
                </tr>
                <tr className="hover:bg-[#FF6B0006]">
                  <Td className="font-mono text-[#42A5F5]">14:00–15:00</Td>
                  <Td>Repositionnement</Td>
                  <Td>Nouveau flux, dealers rehedge, charm dominant</Td>
                </tr>
                <tr className="hover:bg-[#FF6B0006]">
                  <Td className="font-mono text-[#EF4444]">15:00–16:00</Td>
                  <Td>Gamma crunch</Td>
                  <Td>Expiration massive, pinning, derniers rebalancings</Td>
                </tr>
              </tbody>
            </table>
          </div>

          <Takeaway>
            Les 0DTE ont cree un nouveau regime de marche ou la microstructure intraday
            est dominee par les flux gamma. Pour le day trader, comprendre le GEX en temps reel
            est desormais aussi important que lire un carnet d&apos;ordres.
          </Takeaway>
        </Card>
      </section>

      {/* ────────────────────────────────────────────────────── */}
      {/* SECTION 08 — Regimes de Volatilite                     */}
      {/* ────────────────────────────────────────────────────── */}
      <section id="s8" className="mb-14">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-black text-[#FF6B00]">08</span>
          <h2 className="text-lg font-bold">Regimes de Volatilite — Decision Framework</h2>
        </div>
        <Card className="p-6 space-y-4">
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            L&apos;identification du regime de volatilite est la premiere etape de toute decision
            de trading. Chaque regime dicte la taille des positions, le type de strategies,
            et le niveau de risque acceptable.
          </p>

          <div className="overflow-x-auto mt-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1E1E22]">
                  <Th>Regime</Th>
                  <Th>VIX</Th>
                  <Th>Term Str.</Th>
                  <Th>GEX</Th>
                  <Th>Position Size</Th>
                  <Th>Strategies</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1A1A1E]">
                <tr className="hover:bg-[#FF6B0006]">
                  <Td className="font-bold text-[#22C55E]">Low Vol</Td>
                  <Td className="font-mono">&lt; 15</Td>
                  <Td>Contango fort</Td>
                  <Td className="text-[#22C55E]">+ Positif</Td>
                  <Td>100%</Td>
                  <Td>Trend following, theta, carry</Td>
                </tr>
                <tr className="hover:bg-[#FF6B0006]">
                  <Td className="font-bold text-[#FFA726]">Normal</Td>
                  <Td className="font-mono">15–20</Td>
                  <Td>Contango normal</Td>
                  <Td className="text-[#FFA726]">Mixte</Td>
                  <Td>75-100%</Td>
                  <Td>Toutes strategies, standard sizing</Td>
                </tr>
                <tr className="hover:bg-[#FF6B0006]">
                  <Td className="font-bold text-[#FF6B00]">Elevated</Td>
                  <Td className="font-mono">20–25</Td>
                  <Td>Flat / leger BW</Td>
                  <Td className="text-[#6B6B75]">Transition</Td>
                  <Td>50-75%</Td>
                  <Td>Mean reversion, hedged directional</Td>
                </tr>
                <tr className="hover:bg-[#FF6B0006]">
                  <Td className="font-bold text-[#EF4444]">High Vol</Td>
                  <Td className="font-mono">25–35</Td>
                  <Td>Backwardation</Td>
                  <Td className="text-[#EF4444]">- Negatif</Td>
                  <Td>25-50%</Td>
                  <Td>Protection, vol selling si spike</Td>
                </tr>
                <tr className="hover:bg-[#FF6B0006]">
                  <Td className="font-bold text-[#EF4444]">Crisis</Td>
                  <Td className="font-mono">&gt; 35</Td>
                  <Td>BW extreme</Td>
                  <Td className="text-[#EF4444]">-- Tres neg.</Td>
                  <Td>0-25%</Td>
                  <Td>Cash, opportunisme contrarian</Td>
                </tr>
              </tbody>
            </table>
          </div>

          <KeyConcept title="Regime Switching = le signal le plus important">
            Le passage d&apos;un regime a un autre est le moment le plus dangereux ET le plus
            profitable. La transition Low Vol vers Elevated (VIX passe de 14 a 22)
            detruit les positions de carry. La transition High Vol vers Normal
            cree les plus gros rallyes. Identifiez les transitions, pas juste les niveaux.
          </KeyConcept>

          <div className="bg-[#0D0D10] border border-[#1E1E22] rounded-lg p-5 mt-4">
            <div className="text-sm font-bold mb-3">Checklist Decision Quotidienne</div>
            <div className="space-y-2 text-xs text-[#6B6B75]">
              <div className="flex items-start gap-2">
                <span className="text-[#FF6B00] font-mono mt-0.5">1.</span>
                <span>Quel est le VIX spot et son percentile sur 1 an ?</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#FF6B00] font-mono mt-0.5">2.</span>
                <span>La term structure est-elle en contango ou backwardation ?</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#FF6B00] font-mono mt-0.5">3.</span>
                <span>Le GEX net est-il positif ou negatif ? Ou est le max GEX strike ?</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#FF6B00] font-mono mt-0.5">4.</span>
                <span>Le MOVE est-il en convergence ou divergence avec le VIX ?</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#FF6B00] font-mono mt-0.5">5.</span>
                <span>Y a-t-il un event macro dans les 48h (FOMC, NFP, CPI) ?</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#FF6B00] font-mono mt-0.5">6.</span>
                <span>Quelle taille de position est dictee par le regime actuel ?</span>
              </div>
            </div>
          </div>

          <Takeaway>
            Le regime de volatilite doit etre votre premier filtre chaque matin.
            Avant de regarder un seul graphique de prix, identifiez dans quel regime vous etes.
            Cela determine votre taille, vos strategies, et votre risk budget pour la journee.
          </Takeaway>
        </Card>
      </section>

      {/* ────────────────────────────────────────────────────── */}
      {/* SECTION 09 — VRP                                       */}
      {/* ────────────────────────────────────────────────────── */}
      <section id="s9" className="mb-14">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-black text-[#FF6B00]">09</span>
          <h2 className="text-lg font-bold">VRP — Variance Risk Premium</h2>
        </div>
        <Card className="p-6 space-y-4">
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            Le Variance Risk Premium (VRP) est la difference entre la volatilite implicite
            (anticipee) et la volatilite realisee (effective). Il represente la prime que
            les acheteurs d&apos;options paient pour la protection, et la source de rendement
            principale des vendeurs de volatilite.
          </p>

          <Formula>
            VRP = IV(30j) - HV Realisee(30j suivants)<br/>
            VRP ex-ante = VIX - HV(20j) {"   "}// proxy en temps reel
          </Formula>

          <div className="overflow-x-auto mt-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1E1E22]">
                  <Th>VRP</Th>
                  <Th>Interpretation</Th>
                  <Th>Action</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1A1A1E]">
                <tr className="hover:bg-[#FF6B0006]">
                  <Td className="font-mono text-[#22C55E]">&gt; +5 pts</Td>
                  <Td>Forte prime — IV surcote HV significativement</Td>
                  <Td>Vente de vol attractive (strangles, iron condors)</Td>
                </tr>
                <tr className="hover:bg-[#FF6B0006]">
                  <Td className="font-mono text-[#FFA726]">+2 a +5 pts</Td>
                  <Td>Prime normale — regime standard</Td>
                  <Td>Vente de vol opportuniste, taille standard</Td>
                </tr>
                <tr className="hover:bg-[#FF6B0006]">
                  <Td className="font-mono text-[#6B6B75]">0 a +2 pts</Td>
                  <Td>Prime faible — marche efficient</Td>
                  <Td>Neutral, pas de biais directionnel sur la vol</Td>
                </tr>
                <tr className="hover:bg-[#FF6B0006]">
                  <Td className="font-mono text-[#EF4444]">&lt; 0 (negatif)</Td>
                  <Td>HV &gt; IV — le marche sous-estime le risque reel</Td>
                  <Td>Achat de vol, protections sous-evaluees, danger</Td>
                </tr>
              </tbody>
            </table>
          </div>

          <KeyConcept title="VRP historiquement positif">
            Sur les 30 dernieres annees, le VRP moyen du S&P 500 est d&apos;environ +3 a +4 points
            de volatilite. Cela signifie que vendre de la volatilite est une strategie
            structurellement rentable — mais attention aux tail events qui peuvent effacer
            des mois de gains en quelques heures.
          </KeyConcept>

          <KeyConcept title="VRP negatif = alerte rouge">
            Un VRP negatif (HV &gt; IV) signifie que le marche bouge plus que ce que les options
            ne pricent. Configuration rare mais extremement dangereuse. Elle survient souvent
            en debut de crise quand le marche n&apos;a pas encore &quot;rattrape&quot; le stress reel.
          </KeyConcept>

          <Takeaway>
            Le VRP est l&apos;edge fondamental des traders de volatilite. Monitorez le VRP
            ex-ante quotidiennement. Un VRP eleve apres un spike de VIX = opportunite optimale
            de vente de vol. Un VRP negatif = sortez de toutes vos positions short vol immediatement.
          </Takeaway>
        </Card>
      </section>

      {/* ────────────────────────────────────────────────────── */}
      {/* SECTION 10 — Synthese                                  */}
      {/* ────────────────────────────────────────────────────── */}
      <section id="s10" className="mb-14">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-black text-[#FF6B00]">10</span>
          <h2 className="text-lg font-bold">Synthese & Framework Operationnel</h2>
        </div>
        <Card className="p-6 space-y-6">
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            Ce module vous a donne les outils institutionnels pour lire la volatilite comme
            un professionnel. Voici la synthese operationnelle.
          </p>

          {/* Hierarchy */}
          <div className="bg-[#0D0D10] border border-[#1E1E22] rounded-lg p-5">
            <div className="text-sm font-bold mb-4 text-[#FF6B00]">Hierarchie des Indicateurs</div>
            <div className="space-y-3">
              {[
                { rank: "1", name: "VIX + Term Structure", desc: "Regime et direction structurelle", color: "#FF6B00" },
                { rank: "2", name: "GEX (Gamma Exposure)", desc: "Microstructure et comportement intraday", color: "#FF6B00" },
                { rank: "3", name: "MOVE Index", desc: "Stress obligataire et cross-asset", color: "#FFA726" },
                { rank: "4", name: "VRP (Variance Risk Premium)", desc: "Edge pour les strategies de vol", color: "#FFA726" },
                { rank: "5", name: "SKEW + VVIX", desc: "Tail risk et incertitude sur la vol", color: "#42A5F5" },
                { rank: "6", name: "Vanna / Charm", desc: "Flux dealer et timing intraday", color: "#42A5F5" },
              ].map((item) => (
                <div key={item.rank} className="flex items-center gap-4">
                  <span className="text-lg font-black font-mono w-8" style={{ color: item.color }}>
                    {item.rank}
                  </span>
                  <div>
                    <span className="text-sm font-bold">{item.name}</span>
                    <span className="text-xs text-[#6B6B75] ml-3">{item.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Key rules */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#FF6B0008] border border-[#FF6B0022] rounded-lg p-4">
              <div className="text-sm font-bold text-[#FF6B00] mb-2">Regles d&apos;Or</div>
              <ul className="space-y-2 text-xs text-[#6B6B75]">
                <li>Ne jamais trader sans connaitre le regime de vol actuel</li>
                <li>La taille de position est dictee par le VIX, pas par la conviction</li>
                <li>Un VIX bas =/= pas de risque — c&apos;est juste du risque pas cher</li>
                <li>Le MOVE precede le VIX — surveillez les taux en premier</li>
                <li>En backwardation, reduisez la taille de 50% minimum</li>
              </ul>
            </div>
            <div className="bg-[#22C55E08] border border-[#22C55E22] rounded-lg p-4">
              <div className="text-sm font-bold text-[#22C55E] mb-2">Erreurs Fatales</div>
              <ul className="space-y-2 text-xs text-[#6B6B75]">
                <li>Vendre de la vol en VRP negatif</li>
                <li>Ignorer la term structure et regarder uniquement le VIX spot</li>
                <li>Garder la meme taille en Low Vol et High Vol</li>
                <li>Confondre direction du VIX et direction du marche</li>
                <li>Ignorer les flux 0DTE qui dominent le prix intraday</li>
              </ul>
            </div>
          </div>

          <div className="bg-[#FF6B0012] border border-[#FF6B0033] rounded-lg p-6 text-center">
            <div className="text-lg font-extrabold mb-2">Module 01 Complete</div>
            <p className="text-sm text-[#6B6B75]">
              Prochain module : Relative Value & Spreads — Basis, CTD, Butterfly, Credit
            </p>
            <Link
              href="/academie"
              className="inline-block mt-4 px-6 py-2 bg-[#FF6B00] text-white text-sm font-bold rounded-lg hover:bg-[#E65100] transition-colors"
            >
              Retour aux Modules
            </Link>
          </div>
        </Card>
      </section>
    </div>
  );
}
