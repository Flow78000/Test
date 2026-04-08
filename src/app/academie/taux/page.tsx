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
  { id: "s1", label: "01 Obligations & Prix/Taux" },
  { id: "s2", label: "02 Courbe des Rendements" },
  { id: "s3", label: "03 Taux Directeurs" },
  { id: "s4", label: "04 Duration & Convexite" },
  { id: "s5", label: "05 Futures sur Taux" },
  { id: "s6", label: "06 Yield Curve Trading" },
  { id: "s7", label: "07 TradingView" },
  { id: "s8", label: "08 Synthese" },
];

export default function TauxPage() {
  const [active, setActive] = useState("s1");

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-1">
        <Link href="/academie" className="text-[#6B6B75] hover:text-[#FF6B00] text-xs transition-colors">
          Academie
        </Link>
        <span className="text-[#6B6B75] text-xs">/</span>
        <span className="text-xs text-[#FF6B00]">Module 07</span>
      </div>
      <PageHeader
        title="Taux d&apos;Interet"
        subtitle="Obligations . Duration . Courbe . Futures . Yield Curve Trading — 14 pages"
      >
        <Badge color="#FF6B00">Institutionnel</Badge>
      </PageHeader>

      <SectionNav sections={SECTIONS} active={active} onSelect={setActive} />

      {/* ────────────────────────────────────────────────────── */}
      {/* SECTION 01 — Fondamentaux Obligations & Prix/Taux     */}
      {/* ────────────────────────────────────────────────────── */}
      <section id="s1" className="mb-14">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-black text-[#FF6B00]">01</span>
          <h2 className="text-lg font-bold">Fondamentaux — Obligations et Relation Prix/Taux</h2>
        </div>
        <Card className="p-6 space-y-4">
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            Une obligation est un titre de dette emis par un gouvernement ou une entreprise. L&apos;investisseur
            prete du capital et recoit des coupons periodiques plus le remboursement du principal a maturite.
            Le prix d&apos;une obligation est la somme actualisee de tous les flux futurs (coupons + principal).
          </p>
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            La relation fondamentale entre prix et taux est inverse : quand les taux montent, les prix
            baissent et inversement. Cette relation est non-lineaire — c&apos;est la convexite qui capture
            cette asymetrie. Comprendre cette mecanique est essentiel pour trader les futures sur taux
            et construire des strategies de courbe.
          </p>

          <Formula>
            P = sum(C / (1+y)^t) + F / (1+y)^n<br/>
            P = Prix . C = Coupon . y = Yield . F = Face value . n = Maturite
          </Formula>

          <KeyConcept title="Relation Inverse Prix / Taux">
            Quand les taux montent de 1%, une obligation de duration 10 ans perd environ 10% de sa valeur.
            Cette sensibilite est mesuree par la duration — c&apos;est la metrique de risque numero un pour
            tout trader obligataire. Plus la duration est longue, plus le risque de taux est eleve.
          </KeyConcept>

          <Formula>
            dP/P = -D x dy + 0.5 x C x (dy)^2<br/>
            D = Duration modifiee . C = Convexite . dy = Variation du yield
          </Formula>

          <KeyConcept title="Coupon vs Zero-Coupon">
            Les obligations zero-coupon n&apos;ont pas de flux intermediaires — leur duration egale leur maturite.
            Les obligations a coupon ont une duration inferieure a leur maturite car les coupons
            avancent le centre de gravite des flux. Le coupon agit comme un amortisseur de duration.
          </KeyConcept>
        </Card>
      </section>

      {/* ────────────────────────────────────────────────────── */}
      {/* SECTION 02 — Courbe des Rendements                    */}
      {/* ────────────────────────────────────────────────────── */}
      <section id="s2" className="mb-14">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-black text-[#FF6B00]">02</span>
          <h2 className="text-lg font-bold">Courbe des Rendements</h2>
        </div>
        <Card className="p-6 space-y-4">
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            La courbe des rendements (yield curve) represente les taux d&apos;interet en fonction de la maturite.
            C&apos;est l&apos;outil le plus important en fixed income — elle encode les anticipations du marche
            sur la croissance economique, l&apos;inflation et la politique monetaire future.
          </p>
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            La forme de la courbe change constamment et ces deformations sont des signaux puissants.
            Le spread 2s10s (difference entre le 10 ans et le 2 ans) est un indicateur macro suivi
            par tous les desks institutionnels. Son inversion historique precede les recessions.
          </p>

          <div className="overflow-x-auto mt-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1E1E22]">
                  <Th>Forme</Th>
                  <Th>Description</Th>
                  <Th>Signal Macro</Th>
                  <Th>Spread 2s10s</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1A1A1E]">
                <tr className="hover:bg-[#FF6B0006]">
                  <Td className="font-mono text-[#22C55E]">Normale</Td>
                  <Td>Pente positive — taux longs &gt; taux courts</Td>
                  <Td>Croissance attendue</Td>
                  <Td className="text-[#22C55E]">+100 a +250 bps</Td>
                </tr>
                <tr className="hover:bg-[#FF6B0006]">
                  <Td className="font-mono text-[#FFA726]">Plate</Td>
                  <Td>Taux courts = taux longs</Td>
                  <Td>Transition / incertitude</Td>
                  <Td className="text-[#FFA726]">0 a +50 bps</Td>
                </tr>
                <tr className="hover:bg-[#FF6B0006]">
                  <Td className="font-mono text-[#EF4444]">Inversee</Td>
                  <Td>Taux courts &gt; taux longs</Td>
                  <Td>Recession anticipee</Td>
                  <Td className="text-[#EF4444]">-50 a -200 bps</Td>
                </tr>
                <tr className="hover:bg-[#FF6B0006]">
                  <Td className="font-mono text-[#42A5F5]">Pentification</Td>
                  <Td>Ecart qui s&apos;elargit (bull ou bear steepener)</Td>
                  <Td>Changement de politique</Td>
                  <Td className="text-[#42A5F5]">Croissant</Td>
                </tr>
              </tbody>
            </table>
          </div>

          <KeyConcept title="Bear Flattener vs Bull Steepener">
            Le bear flattener se produit quand les taux courts montent plus vite que les longs
            (resserrement monetaire). Le bull steepener intervient quand les taux courts baissent
            plus vite que les longs (anticipation de baisse de taux). Ces mouvements definissent
            des regimes macro distincts avec des implications directes pour le trading.
          </KeyConcept>

          <KeyConcept title="Forward Rates">
            La courbe encode des taux forward implicites. Le taux forward 1y1y (le taux 1 an dans 1 an)
            se calcule a partir des taux spot 1 an et 2 ans. Les deviations entre forwards implicites
            et taux realises sont une source de profit pour les traders de courbe.
          </KeyConcept>
        </Card>
      </section>

      {/* ────────────────────────────────────────────────────── */}
      {/* SECTION 03 — Taux Directeurs et Politique Monetaire   */}
      {/* ────────────────────────────────────────────────────── */}
      <section id="s3" className="mb-14">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-black text-[#FF6B00]">03</span>
          <h2 className="text-lg font-bold">Taux Directeurs et Politique Monetaire</h2>
        </div>
        <Card className="p-6 space-y-4">
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            Les banques centrales (Fed, BCE, BoE, BoJ) fixent les taux directeurs qui ancrent le court
            terme de la courbe. Le Fed Funds Rate est le taux auquel les banques se pretent au jour le jour.
            Les decisions de politique monetaire impactent directement les taux courts et indirectement
            l&apos;ensemble de la courbe via les anticipations.
          </p>
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            Le mecanisme de transmission passe par les Fed Funds Futures et les OIS (Overnight Index Swap)
            qui permettent de lire les anticipations du marche sur les futures decisions. Le CME FedWatch
            Tool fournit des probabilites implicites pour chaque reunion du FOMC. La surprise — l&apos;ecart
            entre ce que le marche attendait et la decision effective — est ce qui cree la volatilite.
          </p>

          <KeyConcept title="Transmission Monetaire">
            Les taux directeurs impactent la courbe par trois canaux : le canal du credit (cout des emprunts),
            le canal du taux de change (flux de capitaux internationaux) et le canal des anticipations
            (forward guidance). La communication de la Fed est devenue aussi importante que l&apos;action elle-meme.
          </KeyConcept>

          <KeyConcept title="Dot Plot et Forward Guidance">
            Le dot plot de la Fed montre les projections individuelles de chaque membre du FOMC pour les
            taux futurs. L&apos;ecart entre les dots et les prix de marche (OIS) revele le niveau de scepticisme
            du marche envers les projections officielles. Ce spread dots-vs-market est un signal de trading.
          </KeyConcept>

          <Formula>
            P(hike) = (FF_futures - FF_current) / 0.25<br/>
            FF_futures = prix implicite du contrat Fed Funds du mois du FOMC
          </Formula>
        </Card>
      </section>

      {/* ────────────────────────────────────────────────────── */}
      {/* SECTION 04 — Duration et Convexite                    */}
      {/* ────────────────────────────────────────────────────── */}
      <section id="s4" className="mb-14">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-black text-[#FF6B00]">04</span>
          <h2 className="text-lg font-bold">Duration et Convexite</h2>
        </div>
        <Card className="p-6 space-y-4">
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            La duration mesure la sensibilite du prix d&apos;une obligation aux variations de taux. C&apos;est
            la derivee premiere du prix par rapport au yield, exprimee en annees. La duration modifiee
            donne le pourcentage de variation du prix pour une variation de 1% du yield.
          </p>
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            La convexite est la derivee seconde — elle capture la non-linearite de la relation
            prix/taux. Une obligation a convexite positive beneficie davantage d&apos;une baisse de taux
            qu&apos;elle ne souffre d&apos;une hausse equivalente. Le DV01 (Dollar Value of 01) est le
            changement de prix en dollars pour un mouvement de 1 basis point.
          </p>

          <Formula>
            Duration Macaulay = sum(t x PV(CF_t)) / P<br/>
            Duration Modifiee = D_mac / (1 + y/n)<br/>
            DV01 = D_mod x P x 0.0001
          </Formula>

          <KeyConcept title="DV01 — La Metrique Universelle">
            Le DV01 est la metrique standard pour mesurer et couvrir le risque de taux. Un portefeuille
            avec un DV01 de 5,000$ gagne ou perd 5,000$ pour chaque basis point de mouvement.
            Les traders utilisent le DV01 pour neutraliser leur exposition et construire des spreads
            DV01-neutres (butterfly, barbell).
          </KeyConcept>

          <Formula>
            Convexite = (1/P) x sum(t(t+1) x PV(CF_t)) / (1+y)^2<br/>
            dP = -D_mod x P x dy + 0.5 x Conv x P x (dy)^2
          </Formula>

          <KeyConcept title="Convexite Positive vs Negative">
            Les obligations vanille ont une convexite positive — elles gagnent plus quand les taux
            baissent qu&apos;elles ne perdent quand les taux montent. Les MBS (Mortgage-Backed Securities)
            ont une convexite negative a cause du prepaiement : les detenteurs sont short la convexite,
            ce qui cree des besoins de hedging massifs dans les mouvements de taux.
          </KeyConcept>
        </Card>
      </section>

      {/* ────────────────────────────────────────────────────── */}
      {/* SECTION 05 — Futures sur Taux                         */}
      {/* ────────────────────────────────────────────────────── */}
      <section id="s5" className="mb-14">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-black text-[#FF6B00]">05</span>
          <h2 className="text-lg font-bold">Futures sur Taux</h2>
        </div>
        <Card className="p-6 space-y-4">
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            Les futures sur taux (Treasury Futures) sont les instruments les plus liquides du marche
            obligataire. Le ZN (10-Year Note), ZB (30-Year Bond), ZF (5-Year Note) et ZT (2-Year Note)
            couvrent l&apos;ensemble de la courbe US. Ils cotent en 32nds et chaque tick a une valeur
            en dollar fixe.
          </p>
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            Chaque contrat a un panier de livrables (deliverable basket) et le marche determine
            le Cheapest-to-Deliver (CTD) — l&apos;obligation la moins chere a livrer selon les facteurs
            de conversion du CBOT. Le CTD change en fonction du niveau des taux, ce qui cree des
            opportunites de basis trading entre le futures et le cash bond.
          </p>

          <div className="overflow-x-auto mt-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1E1E22]">
                  <Th>Contrat</Th>
                  <Th>Maturite</Th>
                  <Th>Tick Size</Th>
                  <Th>Tick Value</Th>
                  <Th>Notionnel</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1A1A1E]">
                <tr className="hover:bg-[#FF6B0006]">
                  <Td className="font-mono text-[#FF6B00]">ZT</Td>
                  <Td>2 ans</Td>
                  <Td>1/128</Td>
                  <Td>$15.625</Td>
                  <Td>$200,000</Td>
                </tr>
                <tr className="hover:bg-[#FF6B0006]">
                  <Td className="font-mono text-[#FF6B00]">ZF</Td>
                  <Td>5 ans</Td>
                  <Td>1/128</Td>
                  <Td>$7.8125</Td>
                  <Td>$100,000</Td>
                </tr>
                <tr className="hover:bg-[#FF6B0006]">
                  <Td className="font-mono text-[#FF6B00]">ZN</Td>
                  <Td>10 ans</Td>
                  <Td>1/64</Td>
                  <Td>$15.625</Td>
                  <Td>$100,000</Td>
                </tr>
                <tr className="hover:bg-[#FF6B0006]">
                  <Td className="font-mono text-[#FF6B00]">ZB</Td>
                  <Td>30 ans</Td>
                  <Td>1/32</Td>
                  <Td>$31.25</Td>
                  <Td>$100,000</Td>
                </tr>
              </tbody>
            </table>
          </div>

          <KeyConcept title="Cheapest-to-Deliver (CTD)">
            Le CTD est l&apos;obligation dont le basis (prix cash - prix futures x facteur de conversion)
            est le plus faible. En regime de taux bas, les obligations a long coupon et longue maturite
            tendent a etre CTD. En regime de taux eleves, ce sont les courtes maturites. Le switch
            de CTD cree des discontinuites dans le DV01 du contrat.
          </KeyConcept>

          <Formula>
            Basis = Cash Price - Futures Price x Conversion Factor<br/>
            Net Basis = Basis - Carry (coupon accrue - repo cost)
          </Formula>
        </Card>
      </section>

      {/* ────────────────────────────────────────────────────── */}
      {/* SECTION 06 — Yield Curve Trading                      */}
      {/* ────────────────────────────────────────────────────── */}
      <section id="s6" className="mb-14">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-black text-[#FF6B00]">06</span>
          <h2 className="text-lg font-bold">Yield Curve Trading</h2>
        </div>
        <Card className="p-6 space-y-4">
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            Le trading de courbe consiste a parier sur les deformations relatives de la yield curve
            plutot que sur le niveau absolu des taux. Les strategies principales sont le flattener
            (pari sur l&apos;aplatissement), le steepener (pari sur la pentification) et le butterfly
            (pari sur la courbure).
          </p>
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            Ces trades sont construits en DV01-neutre pour eliminer l&apos;exposition au niveau global
            des taux et isoler le mouvement relatif. Le ratio de hedge entre les jambes est calcule
            via les DV01 respectifs de chaque contrat futures. C&apos;est le coeur du trading
            institutionnel fixed income.
          </p>

          <KeyConcept title="Bear Flattener">
            Short le ventre ou le court terme, long le long terme. Profite quand les taux courts
            montent plus vite que les longs — typiquement pendant un cycle de resserrement monetaire.
            C&apos;est le trade de reference quand la Fed monte les taux agressivement.
          </KeyConcept>

          <KeyConcept title="Bull Steepener">
            Long le court terme, short le long terme. Profite quand les taux courts baissent plus
            vite que les longs — anticipation de baisse de taux directeurs. Typiquement vu en fin
            de cycle economique quand le marche anticipe un pivot de la Fed.
          </KeyConcept>

          <KeyConcept title="Butterfly (2s5s10s)">
            Le butterfly est un trade a trois jambes : short les ailes (2 ans et 10 ans), long le
            ventre (5 ans) — ou l&apos;inverse. Il isole la courbure de la yield curve. Le ratio DV01
            doit etre neutre sur chaque jambe. Le butterfly est le trade le plus sophistique
            et le plus utilise par les desks institutionnels.
          </KeyConcept>

          <Formula>
            Steepener DV01-neutre :<br/>
            Ratio = DV01(ZN) / DV01(ZT)<br/>
            Si DV01(ZN) = $78, DV01(ZT) = $38 : Ratio = 2.05 ZT pour 1 ZN
          </Formula>
        </Card>
      </section>

      {/* ────────────────────────────────────────────────────── */}
      {/* SECTION 07 — TradingView Implementation               */}
      {/* ────────────────────────────────────────────────────── */}
      <section id="s7" className="mb-14">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-black text-[#FF6B00]">07</span>
          <h2 className="text-lg font-bold">TradingView Implementation</h2>
        </div>
        <Card className="p-6 space-y-4">
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            TradingView offre un acces direct aux donnees de taux via les symboles de Treasury Yields
            et les futures. Les indicateurs cles a configurer incluent le spread 2s10s, le suivi
            des anticipations Fed Funds et les graphiques de courbe overlay pour identifier
            les regimes macro.
          </p>
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            Les symboles essentiels sont US02Y (2-Year Yield), US10Y (10-Year Yield), US30Y (30-Year Yield),
            et les spreads custom via la formule de spread TradingView. Le suivi du DXY (Dollar Index)
            en overlay avec les taux reels (TIPS breakeven) permet d&apos;identifier les regimes cross-asset.
          </p>

          <KeyConcept title="Symboles TradingView Essentiels">
            US02Y, US05Y, US10Y, US30Y pour les yields. ZN1!, ZB1!, ZF1!, ZT1! pour les futures.
            Spread custom : US10Y - US02Y pour le 2s10s. DXY pour le dollar. TIP pour les TIPS.
            Configurez des alertes sur les seuils de spread 2s10s (0 bps = inversion).
          </KeyConcept>

          <KeyConcept title="Overlay Multi-Asset">
            Superposez le VIX avec le spread 2s10s et le DXY pour identifier les regimes macro.
            Un VIX en hausse + 2s10s qui s&apos;inverse + DXY en hausse = risk-off generalise.
            Un 2s10s qui se pentifie + VIX stable = anticipation de croissance.
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
            Le marche des taux est le plus grand marche au monde et comprendre sa mecanique est
            indispensable pour tout trader professionnel. La relation prix/taux via la duration,
            la lecture de la courbe des rendements et le trading de spreads DV01-neutres
            constituent les fondamentaux du fixed income.
          </p>
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            Les futures Treasury (ZN, ZB, ZF, ZT) sont les instruments les plus liquides et les
            plus efficients pour exprimer des vues sur les taux. Le trading de courbe (flattener,
            steepener, butterfly) permet d&apos;isoler les deformations relatives sans prendre
            de risque directionnel sur le niveau des taux.
          </p>

          <Takeaway>
            Maitrisez la duration et le DV01 comme metriques de risque. Surveillez le spread 2s10s
            et les anticipations Fed Funds pour le regime macro. Construisez des trades de courbe
            DV01-neutres pour exploiter les deformations relatives. Le marche des taux drive
            tous les autres marches — c&apos;est le signal macro ultime.
          </Takeaway>
        </Card>
      </section>
    </div>
  );
}
