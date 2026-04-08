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
  { id: "s1", label: "01 Fondamentaux" },
  { id: "s2", label: "02 Outils Statistiques" },
  { id: "s3", label: "03 ES/NQ Spread" },
  { id: "s4", label: "04 Butterfly Spreads" },
  { id: "s5", label: "05 Commodity Spreads" },
  { id: "s6", label: "06 Cross-Asset" },
  { id: "s7", label: "07 Execution" },
  { id: "s8", label: "08 Risk Management" },
  { id: "s9", label: "09 Synthese" },
];

export default function SpreadTradingPage() {
  const [active, setActive] = useState("s1");

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-1">
        <Link href="/academie" className="text-[#6B6B75] hover:text-[#FF6B00] text-xs transition-colors">
          Academie
        </Link>
        <span className="text-[#6B6B75] text-xs">/</span>
        <span className="text-xs text-[#FF6B00]">Module 13</span>
      </div>
      <PageHeader
        title="Spread Trading Institutionnel"
        subtitle="Z-Score . Cointegration . ES/NQ . Butterfly . Commodities . Cross-Asset — 13 pages"
      >
        <Badge color="#EF5350">Institutionnel</Badge>
      </PageHeader>

      <SectionNav sections={SECTIONS} active={active} onSelect={setActive} />

      {/* ────────────────────────────────────────────────────── */}
      {/* SECTION 01 — Fondamentaux du Spread Trading           */}
      {/* ────────────────────────────────────────────────────── */}
      <section id="s1" className="mb-14">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-black text-[#FF6B00]">01</span>
          <h2 className="text-lg font-bold">Fondamentaux du Spread Trading</h2>
        </div>
        <Card className="p-6 space-y-4">
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            Le spread trading consiste a trader la relation entre deux ou plusieurs actifs
            plutot que la direction absolue d&apos;un seul. L&apos;idee fondamentale est que certaines
            paires d&apos;actifs maintiennent une relation d&apos;equilibre a long terme et que les
            deviations par rapport a cet equilibre sont temporaires et reviennent a la moyenne.
          </p>
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            Le z-score est l&apos;outil central du spread trading. Il normalise le spread en unites
            d&apos;ecart-type par rapport a sa moyenne, ce qui permet de definir des seuils d&apos;entree
            et de sortie objectifs. Un z-score de +2 signifie que le spread est a 2 ecarts-types
            au-dessus de sa moyenne — une deviation statistiquement significative.
          </p>

          <Formula>
            Spread = Price_A - Beta x Price_B<br/>
            Z-score = (Spread_t - Mean_N) / Sigma_N<br/>
            Entry : |Z| &gt; 2.0 . Exit : |Z| &lt; 0.5 . Stop : |Z| &gt; 3.5
          </Formula>

          <KeyConcept title="Convergence vs Divergence">
            Le spread trading est un pari sur la convergence — le retour du spread vers sa moyenne.
            L&apos;avantage structurel est que vous eliminez le risque de marche (beta) et isolez
            le mouvement relatif (alpha). Le risque est que la relation se brise — le spread
            diverge au lieu de converger. C&apos;est le tail risk principal du spread trading.
          </KeyConcept>

          <KeyConcept title="Pourquoi le Spread Trading">
            Le spread trading reduit la volatilite du portefeuille de 40-60% par rapport au
            directional trading. Le Sharpe ratio est generalement plus eleve car le bruit
            de marche est filtre. C&apos;est la strategie dominante sur les desks fixed income,
            commodities et relative value des banques d&apos;investissement.
          </KeyConcept>
        </Card>
      </section>

      {/* ────────────────────────────────────────────────────── */}
      {/* SECTION 02 — Outils Statistiques                      */}
      {/* ────────────────────────────────────────────────────── */}
      <section id="s2" className="mb-14">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-black text-[#FF6B00]">02</span>
          <h2 className="text-lg font-bold">Outils Statistiques</h2>
        </div>
        <Card className="p-6 space-y-4">
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            La validation statistique d&apos;un spread repose sur trois tests fondamentaux :
            le test ADF (Augmented Dickey-Fuller) pour la stationnarite, l&apos;exposant de Hurst
            pour le caractere mean-revertant, et le modele Ornstein-Uhlenbeck pour la vitesse
            de mean-reversion. Un spread doit passer ces trois tests pour etre tradable.
          </p>
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            Le test ADF verifie si le spread est stationnaire — c&apos;est-a-dire s&apos;il mean-reverte.
            Une p-value inferieure a 0.05 rejette l&apos;hypothese de non-stationnarite. L&apos;exposant
            de Hurst quantifie le degre de mean-reversion : H &lt; 0.5 indique la mean-reversion,
            H = 0.5 est un random walk, H &gt; 0.5 est un trend. Pour le spread trading, on veut H &lt; 0.4.
          </p>

          <Formula>
            Test ADF : dS_t = alpha + beta x S_t-1 + sum(gamma_i x dS_t-i) + epsilon_t<br/>
            H0 : beta = 0 (non-stationnaire) . Rejet si p-value &lt; 0.05
          </Formula>

          <Formula>
            Hurst Exponent : E[R(n)/S(n)] = C x n^H<br/>
            H &lt; 0.5 : mean-reverting . H = 0.5 : random walk . H &gt; 0.5 : trending
          </Formula>

          <Formula>
            Ornstein-Uhlenbeck : dS = theta x (mu - S) x dt + sigma x dW<br/>
            theta = vitesse de mean-reversion . mu = niveau moyen . sigma = volatilite<br/>
            Half-life = ln(2) / theta
          </Formula>

          <KeyConcept title="Half-Life de Mean-Reversion">
            Le half-life est le temps moyen pour que le spread parcoure la moitie du chemin
            vers sa moyenne. Un half-life de 5 jours signifie que le spread met en moyenne
            5 jours pour revenir a mi-chemin. C&apos;est le parametre le plus important pour
            calibrer la duree de detention et les stops temporels du trade.
          </KeyConcept>

          <KeyConcept title="Criteres de Validation">
            Un spread tradable doit satisfaire : ADF p-value &lt; 0.05, Hurst &lt; 0.45,
            half-life entre 2 et 30 jours. Un half-life trop court (&lt; 2 jours) ne laisse
            pas le temps d&apos;executer. Un half-life trop long (&gt; 30 jours) immobilise le capital.
            Recalculez ces parametres chaque semaine avec une fenetre glissante.
          </KeyConcept>
        </Card>
      </section>

      {/* ────────────────────────────────────────────────────── */}
      {/* SECTION 03 — ES/NQ Spread                             */}
      {/* ────────────────────────────────────────────────────── */}
      <section id="s3" className="mb-14">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-black text-[#FF6B00]">03</span>
          <h2 className="text-lg font-bold">ES/NQ Spread</h2>
        </div>
        <Card className="p-6 space-y-4">
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            Le spread ES/NQ (SPX vs Nasdaq 100) est le spread equity le plus trade au monde.
            Il capture la rotation entre les secteurs value/cycliques (surrepresentes dans le
            SPX) et les mega-cap tech (dominants dans le NQ). Le ratio trading ajuste
            la taille de chaque jambe pour la difference de beta et de notionnel.
          </p>
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            Le beta-adjusted ratio est calcule en regressant les rendements du NQ sur le ES.
            Un beta de 1.3 signifie que le NQ bouge 1.3x plus que le ES en moyenne. Pour un
            spread beta-neutre, vous tradez 1 NQ contre 1.3 ES (ajuste en notionnel).
            Le spread NQ-ES est en trend haussier structurel depuis 2009 (surperformance tech)
            mais mean-reverte sur des periodes de 10-60 jours.
          </p>

          <KeyConcept title="Ratio Trading Beta-Adjusted">
            Le ratio beta-adjusted neutralise l&apos;exposition au marche global. Vous ne pariez pas
            sur la direction du marche mais sur la surperformance relative du NQ vs ES (ou l&apos;inverse).
            Ce spread est moins volatile que les positions directionnelles et offre un Sharpe
            ratio superieur pour les mouvements de rotation sectorielle.
          </KeyConcept>

          <Formula>
            Ratio = Beta(NQ, ES) x (Notionnel_ES / Notionnel_NQ)<br/>
            Beta ~ 1.25 - 1.35 (a recalculer sur 60 jours glissants)<br/>
            Notionnel ES = $50 x ES price . Notionnel NQ = $20 x NQ price
          </Formula>

          <KeyConcept title="Catalyseurs du Spread ES/NQ">
            Le spread NQ-ES s&apos;elargit (NQ surperforme) quand : les taux baissent (duration tech),
            le dollar baisse, les earnings tech surprennent positivement, le risk-on domine.
            Il se comprime (ES surperforme) quand : les taux montent, la rotation value s&apos;accelere,
            les mega-caps decoivent, le risk-off s&apos;installe.
          </KeyConcept>
        </Card>
      </section>

      {/* ────────────────────────────────────────────────────── */}
      {/* SECTION 04 — Butterfly Spreads                        */}
      {/* ────────────────────────────────────────────────────── */}
      <section id="s4" className="mb-14">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-black text-[#FF6B00]">04</span>
          <h2 className="text-lg font-bold">Butterfly Spreads</h2>
        </div>
        <Card className="p-6 space-y-4">
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            Le butterfly spread (2s5s10s en taux) est un trade a trois jambes qui isole la
            courbure de la yield curve. Il consiste a prendre une position sur le ventre
            (5 ans) contre les deux ailes (2 ans et 10 ans). Le trade est DV01-neutre sur
            chaque jambe, eliminant l&apos;exposition au niveau et a la pente de la courbe.
          </p>
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            Le butterfly profite quand la courbure change — le ventre s&apos;enrichit ou s&apos;appauvrit
            par rapport aux ailes. En regime de resserrement monetaire, le ventre tend a sous-
            performer (bear butterfly). En regime de baisse de taux, le ventre tend a surperformer
            (bull butterfly). Le z-score du butterfly est l&apos;outil de timing.
          </p>

          <div className="overflow-x-auto mt-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1E1E22]">
                  <Th>Jambe</Th>
                  <Th>Contrat</Th>
                  <Th>Direction</Th>
                  <Th>DV01 Weight</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1A1A1E]">
                <tr className="hover:bg-[#FF6B0006]">
                  <Td className="font-mono text-[#42A5F5]">Aile courte</Td>
                  <Td>ZT (2 ans)</Td>
                  <Td>Short</Td>
                  <Td>DV01 = $38</Td>
                </tr>
                <tr className="hover:bg-[#FF6B0006]">
                  <Td className="font-mono text-[#FF6B00]">Ventre</Td>
                  <Td>ZF (5 ans)</Td>
                  <Td>Long 2x</Td>
                  <Td>DV01 = $47</Td>
                </tr>
                <tr className="hover:bg-[#FF6B0006]">
                  <Td className="font-mono text-[#42A5F5]">Aile longue</Td>
                  <Td>ZN (10 ans)</Td>
                  <Td>Short</Td>
                  <Td>DV01 = $78</Td>
                </tr>
              </tbody>
            </table>
          </div>

          <KeyConcept title="DV01-Neutral Construction">
            Le ratio DV01-neutre assure que le butterfly ne profite ni ne perd du niveau global
            des taux ni de la pente. Seule la courbure affecte le P&L. Le calcul du ratio
            utilise les DV01 de chaque contrat futures pour equilibrer les jambes. Ce ratio
            change quand les taux bougent et doit etre recalibre regulierement.
          </KeyConcept>

          <Formula>
            Butterfly = 2 x Yield(5Y) - Yield(2Y) - Yield(10Y)<br/>
            Ratio ZT:ZF:ZN = DV01-weighted pour neutralite<br/>
            Poids = DV01(ventre) / (DV01(aile_courte) + DV01(aile_longue))
          </Formula>
        </Card>
      </section>

      {/* ────────────────────────────────────────────────────── */}
      {/* SECTION 05 — Commodity Spreads                        */}
      {/* ────────────────────────────────────────────────────── */}
      <section id="s5" className="mb-14">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-black text-[#FF6B00]">05</span>
          <h2 className="text-lg font-bold">Commodity Spreads</h2>
        </div>
        <Card className="p-6 space-y-4">
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            Les commodity spreads exploitent les relations fondamentales entre produits lies
            par un processus de transformation ou de substitution. Le crack spread (petrole
            brut vs produits raffines), le crush spread (soja vs huile et farine de soja)
            et les inter-delivery spreads sont les trois familles principales.
          </p>
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            Ces spreads sont drives par les fondamentaux physiques : marges de raffinage,
            couts de production, saisonnalite et niveaux de stocks. Ils sont moins correles
            aux mouvements globaux du marche que les positions directionnelles et offrent
            des opportunites de mean-reversion avec un edge fondamental.
          </p>

          <KeyConcept title="Crack Spread">
            Le crack spread mesure la marge de raffinage : le profit de transformer du petrole
            brut en essence et diesel. Le 3:2:1 crack (3 barils brut = 2 barils essence + 1
            baril diesel) est le standard. Un crack spread eleve signale des marges de raffinage
            elevees (demande forte de produits). Un crack bas signale un surplus de capacite.
          </KeyConcept>

          <KeyConcept title="Crush Spread">
            Le crush spread mesure la marge de transformation du soja en huile et farine.
            Il est saisonnier avec des pics pendant la recolte (surplus de soja brut)
            et des creux pendant les periodes de demande d&apos;alimentation animale. Le crush
            spread est un des spreads les plus mean-revertants en commodities.
          </KeyConcept>

          <Formula>
            Crack Spread (3:2:1) = 2 x Gasoline + 1 x Heating Oil - 3 x Crude<br/>
            Crush Spread = 11 x Soybean Oil + Soybean Meal - Soybeans<br/>
            (ajuste en unites : barils, bushels, tonnes courtes)
          </Formula>
        </Card>
      </section>

      {/* ────────────────────────────────────────────────────── */}
      {/* SECTION 06 — Cross-Asset Spreads                      */}
      {/* ────────────────────────────────────────────────────── */}
      <section id="s6" className="mb-14">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-black text-[#FF6B00]">06</span>
          <h2 className="text-lg font-bold">Cross-Asset Spreads</h2>
        </div>
        <Card className="p-6 space-y-4">
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            Les cross-asset spreads exploitent les relations entre differentes classes d&apos;actifs :
            equity vs credit, gold vs taux reels, VIX vs credit spreads, dollar vs commodities.
            Ces relations sont drivees par des facteurs macro communs et tendent a mean-reverter
            quand elles divergent de leur relation historique.
          </p>
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            Le spread equity-credit (SPX vs CDX/HY spread) est un des plus suivis par les desks
            macro. Quand le credit s&apos;ecarte plus vite que l&apos;equity ne baisse, c&apos;est un signal
            que le marche obligataire voit un risque que l&apos;equity n&apos;a pas encore price. Le gold
            vs taux reels (TIPS yield) est un spread fondamental avec une correlation de -0.85.
          </p>

          <KeyConcept title="Gold vs Taux Reels">
            L&apos;or est inversement correle aux taux reels (yield TIPS). Quand les taux reels
            baissent, l&apos;or monte car le cout d&apos;opportunite de detenir un actif sans rendement
            diminue. Le spread Gold - f(Real Rates) mean-reverte avec un half-life de 15-20 jours.
            Les deviations de cette relation sont des signaux de trading puissants.
          </KeyConcept>

          <KeyConcept title="Equity vs Credit Divergence">
            Quand le CDX HY (credit default swap High Yield) s&apos;ecarte sans que le SPX ne baisse
            proportionnellement, le credit signale un stress que l&apos;equity ignore. Historiquement,
            le credit lead l&apos;equity de 1 a 3 semaines. Ce spread est un des meilleurs indicateurs
            avances de risk-off generalise.
          </KeyConcept>

          <Formula>
            Gold Model : XAU = alpha - beta x TIPS_10Y + gamma x DXY + epsilon<br/>
            Spread = XAU_observe - XAU_modele<br/>
            Signal : Z-score(Spread) &gt; 2 → short gold, &lt; -2 → long gold
          </Formula>
        </Card>
      </section>

      {/* ────────────────────────────────────────────────────── */}
      {/* SECTION 07 — Execution et Monitoring                  */}
      {/* ────────────────────────────────────────────────────── */}
      <section id="s7" className="mb-14">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-black text-[#FF6B00]">07</span>
          <h2 className="text-lg font-bold">Execution et Monitoring</h2>
        </div>
        <Card className="p-6 space-y-4">
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            L&apos;execution des spreads necessite une attention particuliere au timing des deux jambes.
            Le leg risk — le risque d&apos;executer une jambe sans l&apos;autre — est le risque operationnel
            principal. Les ordres spread natifs (quand disponibles) eliminent ce risque.
            Sinon, executez la jambe la moins liquide en premier.
          </p>
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            Le monitoring en temps reel du z-score est essentiel. Les seuils d&apos;entree (+/-2.0),
            de sortie (+/-0.5) et de stop (+/-3.5) doivent etre pre-programmes. Un stop temporel
            est egalement necessaire : si le spread n&apos;a pas converge apres 2x le half-life,
            la relation est peut-etre brisee.
          </p>

          <KeyConcept title="Regles d&apos;Entree et Sortie">
            Entree : Z-score depasse +/-2.0 avec ADF valide et Hurst &lt; 0.45.
            Sortie profit : Z-score revient a +/-0.5 (mean-reversion complete a 75%).
            Stop loss : Z-score depasse +/-3.5 ou drawdown depasse 2% du capital.
            Stop temporel : sortie apres 2x half-life sans convergence.
          </KeyConcept>

          <Formula>
            Entry : |Z| &gt; 2.0 AND ADF p &lt; 0.05 AND Hurst &lt; 0.45<br/>
            Take Profit : |Z| &lt; 0.5<br/>
            Stop Loss : |Z| &gt; 3.5 OR Drawdown &gt; 2%<br/>
            Time Stop : Holding Period &gt; 2 x Half-Life
          </Formula>
        </Card>
      </section>

      {/* ────────────────────────────────────────────────────── */}
      {/* SECTION 08 — Risk Management                          */}
      {/* ────────────────────────────────────────────────────── */}
      <section id="s8" className="mb-14">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-black text-[#FF6B00]">08</span>
          <h2 className="text-lg font-bold">Risk Management</h2>
        </div>
        <Card className="p-6 space-y-4">
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            Le risque principal du spread trading est le spread blowup — la divergence
            permanente de la relation. LTCM (1998) est l&apos;exemple historique : les spreads
            de convergence se sont ecartes au lieu de converger, amplifie par le levier.
            Le risk management doit adresser ce tail risk specifique.
          </p>
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            Les limites de drawdown doivent etre strictes et pre-definies. Un drawdown de 2%
            du capital sur un seul spread declenche une reduction de 50% de la position.
            Un drawdown de 3% declenche la liquidation complete. La diversification entre
            spreads non correles est la meilleure protection contre le blowup d&apos;un spread unique.
          </p>

          <KeyConcept title="Spread Blowup — Protection">
            Le spread blowup se produit quand la relation fondamentale change structurellement.
            Les signaux d&apos;alerte : le half-life s&apos;allonge significativement, le test ADF n&apos;est
            plus significatif, le Hurst depasse 0.5. Recalculez ces parametres chaque semaine
            et sortez immediatement si le spread echoue aux tests de stationnarite.
          </KeyConcept>

          <KeyConcept title="Diversification des Spreads">
            Ne concentrez jamais plus de 30% du capital alloue au spread trading sur un seul spread.
            Diversifiez entre classes d&apos;actifs (equity, rates, commodities) et types de spreads
            (intra-asset, cross-asset). La correlation entre spreads doit etre monitored —
            en crise, les correlations convergent vers 1 et la diversification disparait.
          </KeyConcept>

          <Formula>
            Max Allocation par Spread = 30% du capital spread<br/>
            Drawdown Limit = 2% → reduce 50% . 3% → liquidation<br/>
            Correlation Check : weekly recalc, exit if corr(spread_i, spread_j) &gt; 0.7
          </Formula>
        </Card>
      </section>

      {/* ────────────────────────────────────────────────────── */}
      {/* SECTION 09 — Synthese                                 */}
      {/* ────────────────────────────────────────────────────── */}
      <section id="s9" className="mb-14">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-black text-[#FF6B00]">09</span>
          <h2 className="text-lg font-bold">Synthese</h2>
        </div>
        <Card className="p-6 space-y-4">
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            Le spread trading institutionnel est une approche systematique qui exploite les
            relations statistiques entre actifs. Le z-score, le test ADF, le Hurst exponent
            et le modele Ornstein-Uhlenbeck sont les outils fondamentaux de validation
            et de timing.
          </p>
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            Les spreads les plus robustes sont ceux drives par des fondamentaux economiques
            (crack spread, butterfly taux, gold vs real rates) plutot que par de simples
            correlations statistiques. Le risk management est critique — le tail risk de
            divergence permanente est le danger principal. Diversifiez, mettez des stops
            stricts et recalculez les parametres statistiques regulierement.
          </p>

          <Takeaway>
            Validez chaque spread avec les trois tests (ADF, Hurst, half-life) avant de trader.
            Utilisez le z-score pour les entries (+/-2.0) et exits (+/-0.5) avec des stops a +/-3.5.
            Privilegiez les spreads avec un fondamental economique solide. Diversifiez entre
            classes d&apos;actifs et limitez l&apos;allocation par spread a 30%. Le spread trading offre
            le meilleur ratio risque/rendement en trading institutionnel quand il est execute
            avec discipline.
          </Takeaway>
        </Card>
      </section>
    </div>
  );
}
