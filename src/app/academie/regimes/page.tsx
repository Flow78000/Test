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
  { id: "s1", label: "01 Deux Regimes" },
  { id: "s2", label: "02 Cyclicite" },
  { id: "s3", label: "03 Detection" },
  { id: "s4", label: "04 Strategies" },
  { id: "s5", label: "05 Position Sizing" },
  { id: "s6", label: "06 Transitions" },
  { id: "s7", label: "07 Risk Management" },
  { id: "s8", label: "08 Synthese" },
];

export default function RegimesPage() {
  const [active, setActive] = useState("s1");

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-1">
        <Link href="/academie" className="text-[#6B6B75] hover:text-[#FF6B00] text-xs transition-colors">
          Academie
        </Link>
        <span className="text-[#6B6B75] text-xs">/</span>
        <span className="text-xs text-[#FF6B00]">Module 11</span>
      </div>
      <PageHeader
        title="Regimes de Volatilite"
        subtitle="Compression . Expansion . Detection . Strategies . Position Sizing — 10 pages"
      >
        <Badge color="#FFA726">Institutionnel</Badge>
      </PageHeader>

      <SectionNav sections={SECTIONS} active={active} onSelect={setActive} />

      {/* ────────────────────────────────────────────────────── */}
      {/* SECTION 01 — Les Deux Regimes                         */}
      {/* ────────────────────────────────────────────────────── */}
      <section id="s1" className="mb-14">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-black text-[#FF6B00]">01</span>
          <h2 className="text-lg font-bold">Les Deux Regimes</h2>
        </div>
        <Card className="p-6 space-y-4">
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            Le marche oscille en permanence entre deux etats fondamentaux : la compression
            de volatilite (low vol regime) et l&apos;expansion de volatilite (high vol regime).
            Ces deux regimes ont des caracteristiques statistiques radicalement differentes
            qui affectent chaque aspect du trading : entries, exits, sizing et risk management.
          </p>
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            En regime de compression, les ranges sont etroits, les mouvements sont mean-revertants,
            les breakouts echouent souvent et les strategies de vente de volatilite prosperent.
            En regime d&apos;expansion, les ranges s&apos;elargissent, les mouvements sont directionnels
            et persistants, les stops sont plus souvent touches et les strategies de trend
            following dominent.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="bg-[#0D0D10] rounded-lg p-5 border border-[#1E1E22]">
              <div className="text-sm font-bold text-[#22C55E] mb-2">Compression (Low Vol)</div>
              <p className="text-xs text-[#6B6B75] leading-relaxed">
                VIX &lt; 15, BBW comprime, ATR en baisse, ranges etroits.
                Mean-reversion domine. Faux breakouts frequents.
                Strategies optimales : range trading, vente d&apos;options, scalping.
              </p>
            </div>
            <div className="bg-[#0D0D10] rounded-lg p-5 border border-[#1E1E22]">
              <div className="text-sm font-bold text-[#EF4444] mb-2">Expansion (High Vol)</div>
              <p className="text-xs text-[#6B6B75] leading-relaxed">
                VIX &gt; 25, BBW en expansion, ATR eleve, ranges larges.
                Momentum domine. Breakouts valides plus souvent.
                Strategies optimales : trend following, long vol, breakout.
              </p>
            </div>
          </div>

          <KeyConcept title="Asymetrie des Regimes">
            Les regimes ne sont pas symetriques. La compression est lente et progressive — elle
            s&apos;installe sur des semaines. L&apos;expansion est rapide et violente — elle se produit en
            heures ou jours. Cette asymetrie est fondamentale : vous avez le temps de preparer
            vos positions en compression mais vous devez reagir immediatement en expansion.
          </KeyConcept>
        </Card>
      </section>

      {/* ────────────────────────────────────────────────────── */}
      {/* SECTION 02 — Cyclicite Vol                            */}
      {/* ────────────────────────────────────────────────────── */}
      <section id="s2" className="mb-14">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-black text-[#FF6B00]">02</span>
          <h2 className="text-lg font-bold">Cyclicite de la Volatilite</h2>
        </div>
        <Card className="p-6 space-y-4">
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            La volatilite suit un cycle previsible : compression, accumulation d&apos;energie,
            expansion, pic, puis retour a la compression. Ce cycle est fractal — il se
            reproduit sur tous les timeframes, de l&apos;intraday (5 minutes) au mensuel.
            Comprendre ou vous etes dans le cycle est la clef du timing.
          </p>
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            La phase de compression est une periode d&apos;accumulation d&apos;energie potentielle.
            Plus la compression dure, plus l&apos;expansion qui suit est violente — c&apos;est le principe
            du ressort. Le VIX a 10-12 pendant plusieurs semaines est le setup classique
            pour un spike majeur. La direction du breakout n&apos;est pas previsible mais
            l&apos;amplitude de l&apos;expansion l&apos;est.
          </p>

          <KeyConcept title="Le Principe du Ressort">
            La volatilite comprimee est de l&apos;energie stockee. Le BBW (Bollinger Band Width)
            au plus bas sur 20 jours est un signal de compression mature. L&apos;expansion qui suit
            est proportionnelle a la duree et l&apos;intensite de la compression. Un BBW au plus bas
            sur 100 jours produit des expansions plus violentes qu&apos;un BBW au plus bas sur 20 jours.
          </KeyConcept>

          <Formula>
            BBW = (BB_upper - BB_lower) / BB_middle x 100<br/>
            Compression : BBW &lt; percentile 20 sur N jours<br/>
            Expansion : BBW &gt; percentile 80 sur N jours
          </Formula>

          <KeyConcept title="Mean-Reversion de la Vol">
            La volatilite est le processus le plus mean-revertant en finance. Le VIX revient
            toujours vers sa moyenne (~18-20). Un VIX a 40 a une esperance de baisse elevee,
            un VIX a 10 a une esperance de hausse elevee. Ce n&apos;est pas une question de si mais
            de quand. Le timing reste le defi principal.
          </KeyConcept>
        </Card>
      </section>

      {/* ────────────────────────────────────────────────────── */}
      {/* SECTION 03 — Detection du Regime                      */}
      {/* ────────────────────────────────────────────────────── */}
      <section id="s3" className="mb-14">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-black text-[#FF6B00]">03</span>
          <h2 className="text-lg font-bold">Detection du Regime</h2>
        </div>
        <Card className="p-6 space-y-4">
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            La detection du regime en temps reel utilise un ensemble d&apos;indicateurs convergents.
            Aucun indicateur seul n&apos;est suffisant — la convergence de plusieurs signaux confirme
            le regime et augmente la fiabilite. Les quatre indicateurs principaux sont le VIX level,
            le BBW, l&apos;ATR et l&apos;IV Rank.
          </p>
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            L&apos;IV Rank compare le niveau actuel de volatilite implicite a sa plage sur 52 semaines.
            Un IV Rank bas (&lt; 20%) signale une compression — la vol est pres de ses plus bas annuels.
            Un IV Rank eleve (&gt; 80%) signale une expansion — la vol est pres de ses plus hauts.
            L&apos;IV Percentile (pourcentage de jours en dessous du niveau actuel) est un complementaire.
          </p>

          <div className="overflow-x-auto mt-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1E1E22]">
                  <Th>Indicateur</Th>
                  <Th>Compression</Th>
                  <Th>Normal</Th>
                  <Th>Expansion</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1A1A1E]">
                <tr className="hover:bg-[#FF6B0006]">
                  <Td className="font-mono text-[#FF6B00]">VIX Level</Td>
                  <Td className="text-[#22C55E]">&lt; 14</Td>
                  <Td className="text-[#FFA726]">14 - 22</Td>
                  <Td className="text-[#EF4444]">&gt; 25</Td>
                </tr>
                <tr className="hover:bg-[#FF6B0006]">
                  <Td className="font-mono text-[#FF6B00]">BBW (20,2)</Td>
                  <Td className="text-[#22C55E]">&lt; 4%</Td>
                  <Td className="text-[#FFA726]">4% - 8%</Td>
                  <Td className="text-[#EF4444]">&gt; 10%</Td>
                </tr>
                <tr className="hover:bg-[#FF6B0006]">
                  <Td className="font-mono text-[#FF6B00]">ATR (14)</Td>
                  <Td className="text-[#22C55E]">Percentile &lt; 25</Td>
                  <Td className="text-[#FFA726]">Percentile 25-75</Td>
                  <Td className="text-[#EF4444]">Percentile &gt; 75</Td>
                </tr>
                <tr className="hover:bg-[#FF6B0006]">
                  <Td className="font-mono text-[#FF6B00]">IV Rank</Td>
                  <Td className="text-[#22C55E]">&lt; 20%</Td>
                  <Td className="text-[#FFA726]">20% - 60%</Td>
                  <Td className="text-[#EF4444]">&gt; 80%</Td>
                </tr>
              </tbody>
            </table>
          </div>

          <KeyConcept title="Convergence Multi-Indicateur">
            Le signal de regime le plus fiable est la convergence : VIX &lt; 14 + BBW au plus bas
            20 jours + ATR en baisse + IV Rank &lt; 20% = compression confirmee. Inversement,
            VIX &gt; 25 + BBW en expansion + ATR au plus haut + IV Rank &gt; 80% = expansion confirmee.
            Les signaux divergents indiquent une transition en cours.
          </KeyConcept>

          <Formula>
            IV Rank = (IV_current - IV_52w_low) / (IV_52w_high - IV_52w_low) x 100<br/>
            IV Percentile = Nb jours IV &lt; IV_current / 252 x 100
          </Formula>
        </Card>
      </section>

      {/* ────────────────────────────────────────────────────── */}
      {/* SECTION 04 — Strategies par Regime                    */}
      {/* ────────────────────────────────────────────────────── */}
      <section id="s4" className="mb-14">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-black text-[#FF6B00]">04</span>
          <h2 className="text-lg font-bold">Strategies par Regime</h2>
        </div>
        <Card className="p-6 space-y-4">
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            Le choix de strategie doit etre adapte au regime de volatilite en cours. Utiliser
            une strategie de range trading en expansion est une recette pour les pertes.
            Inversement, du trend following en compression genere des faux signaux repetes
            et des whipsaws destructeurs.
          </p>
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            En compression, les strategies optimales sont le range trading (acheter les supports,
            vendre les resistances), la vente d&apos;options (iron condors, strangles courts) et
            le scalping dans des ranges etroits. En expansion, les strategies optimales sont
            le trend following, le breakout trading et l&apos;achat d&apos;options (straddles, strangles).
          </p>

          <KeyConcept title="Compression — Strategies Optimales">
            Range trading : identifiez les bornes du range et tradez les reversals. Iron condors :
            vendez des options OTM des deux cotes — le theta decay est votre allie en low vol.
            Scalping : les mouvements sont petits mais previsibles. Reduisez les targets mais
            augmentez le winrate. Evitez les breakout trades — 80% echouent en compression.
          </KeyConcept>

          <KeyConcept title="Expansion — Strategies Optimales">
            Trend following : suivez le momentum, ne tradez pas contre le mouvement. Breakout :
            les cassures de range en expansion ont un taux de succes de 60%+ (vs 20% en compression).
            Long straddles/strangles : le vega et le gamma jouent en votre faveur. Elargissez
            les stops — les ranges sont plus larges, les retracements plus profonds.
          </KeyConcept>
        </Card>
      </section>

      {/* ────────────────────────────────────────────────────── */}
      {/* SECTION 05 — Position Sizing par Regime               */}
      {/* ────────────────────────────────────────────────────── */}
      <section id="s5" className="mb-14">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-black text-[#FF6B00]">05</span>
          <h2 className="text-lg font-bold">Position Sizing par Regime</h2>
        </div>
        <Card className="p-6 space-y-4">
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            Le sizing est l&apos;ajustement le plus important en fonction du regime. En expansion,
            les mouvements sont 2 a 3 fois plus larges qu&apos;en compression — si vous gardez
            le meme sizing, votre risque reel est multiplie. L&apos;adaptation du sizing au regime
            est ce qui separe les traders professionnels des amateurs.
          </p>
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            La methode la plus efficace est le vol-targeting : ajuster la taille de position
            pour maintenir une volatilite de portefeuille constante. Si l&apos;ATR double, divisez
            la taille par deux. Cela normalise le risque reel independamment du regime et
            produit des drawdowns plus reguliers.
          </p>

          <Formula>
            Position Size = Target Vol / (ATR x Point Value)<br/>
            Si ATR NQ = 200 pts en compression → Size = 2 lots<br/>
            Si ATR NQ = 500 pts en expansion → Size = 0.8 lot<br/>
            Target Vol = constante (ex: 2% du capital par jour max)
          </Formula>

          <KeyConcept title="Vol-Targeting">
            Le vol-targeting maintient une exposition au risque constante en ajustant la taille
            inversement a la volatilite. Quand le VIX passe de 12 a 30, vous divisez votre
            taille par 2.5. Cette approche est utilisee par la majorite des fonds systematiques
            (risk parity, CTA, vol targeting funds). Elle ameliore le Sharpe ratio de 15-25%.
          </KeyConcept>

          <KeyConcept title="Regime-Based Allocation">
            Au-dela du sizing individuel, l&apos;allocation entre strategies doit aussi changer.
            En compression : 70% range/mean-reversion, 20% scalping, 10% breakout hedges.
            En expansion : 60% trend following, 20% breakout, 20% cash (protection).
            La transition est le moment le plus dangereux — reduisez la taille globalement.
          </KeyConcept>
        </Card>
      </section>

      {/* ────────────────────────────────────────────────────── */}
      {/* SECTION 06 — Transition Detection                     */}
      {/* ────────────────────────────────────────────────────── */}
      <section id="s6" className="mb-14">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-black text-[#FF6B00]">06</span>
          <h2 className="text-lg font-bold">Transition Detection</h2>
        </div>
        <Card className="p-6 space-y-4">
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            Les transitions entre regimes sont les moments les plus dangereux et les plus
            profitables. Le vol crush (passage de expansion a compression) se produit apres
            un spike quand la vol se normalise — c&apos;est le meilleur moment pour vendre de la
            volatilite. Le vol spike setup (passage de compression a expansion) est le moment
            de passer long vol et de reduire les positions de range.
          </p>
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            Les indicateurs de transition incluent la divergence entre indicateurs de regime
            (VIX en baisse mais BBW encore eleve = transition expansion vers compression),
            le VIX term structure qui flip, et le changement de correlation entre le VIX
            et le SPX (la correlation negative s&apos;affaiblit en transition).
          </p>

          <KeyConcept title="Vol Crush Setup">
            Apres un spike VIX au-dessus de 30, le retour sous 25 avec un term structure
            qui revient en contango est le signal de vol crush. Vendez des strangles ou
            des iron condors a ce moment — le theta et le vega jouent en votre faveur.
            Le VIX met en moyenne 2-3 semaines pour revenir a sa moyenne apres un spike.
          </KeyConcept>

          <KeyConcept title="Vol Spike Setup">
            Un VIX en compression prolongee (&lt; 13 pendant 20+ jours) avec un BBW au plus bas
            annuel est un setup de spike. L&apos;achat de straddles ATM ou de puts OTM a ce moment
            beneficie du vega positif lors de l&apos;expansion. Le timing exact est incertain mais
            le ratio risque/recompense est tres favorable.
          </KeyConcept>

          <Formula>
            Vol Crush Signal : VIX_t &lt; VIX_t-5 + Term Structure flip contango<br/>
            Vol Spike Setup : VIX &lt; 13 + BBW_percentile &lt; 5 + Duration &gt; 20j
          </Formula>
        </Card>
      </section>

      {/* ────────────────────────────────────────────────────── */}
      {/* SECTION 07 — Risk Management                          */}
      {/* ────────────────────────────────────────────────────── */}
      <section id="s7" className="mb-14">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-black text-[#FF6B00]">07</span>
          <h2 className="text-lg font-bold">Risk Management par Regime</h2>
        </div>
        <Card className="p-6 space-y-4">
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            Le risk management doit etre adapte au regime de volatilite. Les stops fixes en
            points ne fonctionnent pas car un stop de 20 points sur le NQ est serre en expansion
            (ATR 500 pts) mais large en compression (ATR 150 pts). Les stops doivent etre
            calibres en fonction de l&apos;ATR ou de la volatilite realisee.
          </p>
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            Le portfolio vol targeting ajuste automatiquement le risque global. Si la volatilite
            du portefeuille depasse la cible, les positions sont reduites mecaniquement.
            Cette approche evite les drawdowns catastrophiques qui surviennent quand un trader
            garde des positions trop grandes pendant une expansion de vol.
          </p>

          <KeyConcept title="Stops Adaptatifs ATR">
            Utilisez des stops en multiple d&apos;ATR plutot qu&apos;en points fixes.
            Un stop a 1.5x ATR(14) s&apos;ajuste automatiquement au regime.
            En compression (ATR = 150 pts NQ) : stop = 225 pts.
            En expansion (ATR = 400 pts NQ) : stop = 600 pts.
            Le risque en dollar est ajuste via le sizing.
          </KeyConcept>

          <Formula>
            Stop Distance = ATR(14) x Multiplicateur<br/>
            Position Size = Risque Max $ / (Stop Distance x Point Value)<br/>
            Portfolio Vol = sqrt(sum(Position_i^2 x Vol_i^2 + 2 x sum(Pos_i x Pos_j x Cov_ij)))
          </Formula>

          <KeyConcept title="Drawdown Limits par Regime">
            En compression, un drawdown de 2% du capital est un signal d&apos;alarme — la volatilite
            est basse, les pertes devraient etre petites. En expansion, un drawdown de 5% est
            normal si le sizing est adapte. Les limites de drawdown doivent etre ajustees
            au regime pour eviter les stops prematures en expansion et les pertes excessives
            en compression.
          </KeyConcept>
        </Card>
      </section>

      {/* ────────────────────────────────────────────────────── */}
      {/* SECTION 08 — Synthese                                 */}
      {/* ────────────────────────────────────────────────────── */}
      <section id="s8" className="mb-14">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-black text-[#FF6B00]">08</span>
          <h2 className="text-lg font-bold">Synthese</h2>
        </div>
        <Card className="p-6 space-y-4">
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            La detection et l&apos;adaptation aux regimes de volatilite est la competence la plus
            importante pour un trader professionnel. Le marche ne fonctionne pas de la meme
            maniere en compression et en expansion — les strategies, le sizing, les stops et
            l&apos;allocation doivent tous etre adaptes.
          </p>
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            Les transitions entre regimes sont les moments les plus critiques. Le vol crush
            et le vol spike setup offrent les meilleurs ratios risque/recompense. Le vol-targeting
            et les stops adaptatifs ATR normalisent le risque reel independamment du regime
            et ameliorent significativement la performance ajustee au risque.
          </p>

          <Takeaway>
            Identifiez le regime (compression vs expansion) avant chaque session. Adaptez votre
            strategie, votre sizing et vos stops au regime en cours. Utilisez le vol-targeting
            pour normaliser votre risque. Surveillez les transitions — le vol crush et le vol spike
            setup sont les meilleurs moments pour se positionner. La volatilite mean-reverte
            toujours — la question est le timing, pas la direction.
          </Takeaway>
        </Card>
      </section>
    </div>
  );
}
