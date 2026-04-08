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
          onClick={() => { onSelect(s.id); document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth", block: "start" }); }}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${active === s.id ? "bg-[#42A5F5] text-white" : "bg-[#1A1A1E] text-[#6B6B75] hover:text-[#F0F0F0] hover:bg-[#222228]"}`}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}

function KeyConcept({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#FF6B0008] border border-[#FF6B0022] rounded-lg p-4 mt-4">
      <div className="text-sm font-bold text-[#FF6B00] mb-1">{title}</div>
      <div className="text-sm text-[#6B6B75] leading-relaxed">{children}</div>
    </div>
  );
}
function Formula({ children }: { children: React.ReactNode }) {
  return <div className="bg-[#08080A] rounded-lg p-4 mt-3 font-mono text-sm text-[#FFA726] overflow-x-auto">{children}</div>;
}
function Takeaway({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-[#22C55E08] border border-[#22C55E22] rounded-lg p-4 mt-4">
      <div className="text-xs font-bold text-[#22C55E] uppercase tracking-wider mb-1">Takeaway</div>
      <div className="text-sm text-[#6B6B75] leading-relaxed">{children}</div>
    </div>
  );
}
function Th({ children }: { children: React.ReactNode }) { return <th className="text-left p-3 text-[#6B6B75] text-xs uppercase tracking-wide">{children}</th>; }
function Td({ children, className }: { children: React.ReactNode; className?: string }) { return <td className={`p-3 text-sm ${className ?? ""}`}>{children}</td>; }

const SECTIONS = [
  { id: "s1", label: "01 Fondements RV" },
  { id: "s2", label: "02 Basis Trading" },
  { id: "s3", label: "03 CTD" },
  { id: "s4", label: "04 Butterfly Taux" },
  { id: "s5", label: "05 Spreads Credit" },
  { id: "s6", label: "06 Cross-Asset RV" },
  { id: "s7", label: "07 Gestion Risque" },
  { id: "s8", label: "08 Synthese" },
];

export default function RVSpreadsPage() {
  const [active, setActive] = useState("s1");
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-1">
        <Link href="/academie" className="text-[#6B6B75] hover:text-[#42A5F5] text-xs transition-colors">Academie</Link>
        <span className="text-[#6B6B75] text-xs">/</span>
        <span className="text-xs text-[#42A5F5]">Module 02</span>
      </div>
      <PageHeader title="Relative Value & Spreads" subtitle="Basis . CTD . Butterfly . Credit . Cross-Asset — 14 pages">
        <Badge color="#42A5F5">Institutionnel</Badge>
      </PageHeader>
      <SectionNav sections={SECTIONS} active={active} onSelect={setActive} />

      {/* ── 01 Fondements du RV Trading ── */}
      <section id="s1" className="mb-14">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-black text-[#42A5F5]">01</span>
          <h2 className="text-lg font-bold">Fondements du RV Trading</h2>
        </div>
        <Card className="p-6 space-y-4">
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            Le Relative Value (RV) trading consiste a exploiter les ecarts de prix entre deux instruments
            lies par une relation fondamentale, sans prendre de pari directionnel sur le marche. Le trader
            est long un actif sous-evalue et short un actif surevalue, capturant la convergence.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="bg-[#0D0D10] rounded-lg p-5 border border-[#1E1E22]">
              <div className="text-sm font-bold text-[#42A5F5] mb-2">Neutralite Directionnelle</div>
              <p className="text-xs text-[#6B6B75] leading-relaxed">
                Un trade RV bien construit est market-neutral : si le marche monte ou baisse de 2%,
                le P&L net est proche de zero. Le profit vient uniquement de la convergence du spread.
              </p>
            </div>
            <div className="bg-[#0D0D10] rounded-lg p-5 border border-[#1E1E22]">
              <div className="text-sm font-bold text-[#FFA726] mb-2">Z-Score</div>
              <p className="text-xs text-[#6B6B75] leading-relaxed">
                Le Z-score mesure combien le spread actuel devie de sa moyenne historique, en unites
                d&apos;ecart-type. Un Z &gt; 2 ou &lt; -2 signale une opportunite de mean-reversion.
              </p>
            </div>
          </div>
          <Formula>Z = (Spread_t - Mean(Spread)) / StdDev(Spread)</Formula>
          <KeyConcept title="Pourquoi le RV fonctionne">
            Les spreads entre instruments lies sont stationnaires a long terme (cointegration).
            Contrairement aux prix, qui sont non-stationnaires, les ecarts reviennent vers leur moyenne.
            Le RV trader monetise cette propriete statistique.
          </KeyConcept>
          <Takeaway>
            Le RV trading elimine le risque directionnel mais introduit le risque de spread blowup.
            La discipline de sizing et la connaissance des drivers fondamentaux sont non-negociables.
          </Takeaway>
        </Card>
      </section>

      {/* ── 02 Basis Trading ── */}
      <section id="s2" className="mb-14">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-black text-[#42A5F5]">02</span>
          <h2 className="text-lg font-bold">Basis Trading</h2>
        </div>
        <Card className="p-6 space-y-4">
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            Le basis est la difference entre le prix futures et le prix cash (spot) d&apos;un meme actif.
            En theorie, basis = cout de portage (financement + stockage - rendement). En pratique,
            le basis fluctue autour de sa fair value, creant des opportunites d&apos;arbitrage.
          </p>
          <Formula>Basis = Futures - Spot = Spot x (r - d) x (T/360)</Formula>
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-[#1E1E22]"><Th>Trade</Th><Th>Position</Th><Th>Profite si</Th><Th>Risque</Th></tr></thead>
              <tbody className="divide-y divide-[#1A1A1E]">
                <tr><Td className="font-mono text-[#42A5F5]">Long Basis</Td><Td>Long Futures / Short Cash</Td><Td>Basis s&apos;elargit</Td><Td>Compression du basis</Td></tr>
                <tr><Td className="font-mono text-[#FFA726]">Short Basis</Td><Td>Short Futures / Long Cash</Td><Td>Basis se comprime</Td><Td>Elargissement + financement</Td></tr>
                <tr><Td className="font-mono text-[#22C55E]">Cash-and-Carry</Td><Td>Long Cash + Short Futures</Td><Td>Convergence a maturite</Td><Td>Quasi-nul si tenu a terme</Td></tr>
              </tbody>
            </table>
          </div>
          <KeyConcept title="Convergence a Maturite">
            A l&apos;echeance du contrat futures, basis = 0 par definition (le futures devient le spot).
            Le cash-and-carry classique exploite cette convergence garantie pour capturer le rendement implicite.
          </KeyConcept>
          <Takeaway>
            Le basis trading est le fondement de toute strategie RV sur futures. Maitrisez le cost of carry
            avant d&apos;aborder les spreads plus complexes comme le butterfly ou le cross-asset.
          </Takeaway>
        </Card>
      </section>

      {/* ── 03 CTD Cheapest to Deliver ── */}
      <section id="s3" className="mb-14">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-black text-[#42A5F5]">03</span>
          <h2 className="text-lg font-bold">CTD — Cheapest to Deliver</h2>
        </div>
        <Card className="p-6 space-y-4">
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            Sur les contrats futures obligataires (ZN, ZB, Bund), le vendeur a le choix de livrer
            n&apos;importe quelle obligation du panier eligible. Il choisit la moins chere a livrer (CTD),
            celle qui minimise : Prix marche - (Futures x Conversion Factor).
          </p>
          <Formula>
            Invoice Price = Futures x CF + Accrued Interest<br/>
            Net Basis = Prix Marche - Invoice Price<br/>
            CTD = obligation avec le Net Basis le plus bas
          </Formula>
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-[#1E1E22]"><Th>Regime Taux</Th><Th>CTD typique</Th><Th>Explication</Th></tr></thead>
              <tbody className="divide-y divide-[#1A1A1E]">
                <tr><Td className="font-mono text-[#EF4444]">Taux &gt; 6%</Td><Td>Duration longue, coupon bas</Td><Td>Prix bas = moins cher a livrer</Td></tr>
                <tr><Td className="font-mono text-[#22C55E]">Taux &lt; 6%</Td><Td>Duration courte, coupon eleve</Td><Td>Prix moins sensible aux taux bas</Td></tr>
                <tr><Td className="font-mono text-[#FFA726]">Taux ~ 6%</Td><Td>Toutes proches</Td><Td>CTD switch risk = volatilite du basis</Td></tr>
              </tbody>
            </table>
          </div>
          <KeyConcept title="Switch Risk">
            Quand les taux sont proches du coupon notionnel (6% pour le ZN), le CTD peut changer
            brutalement. Ce switch modifie la duration effective du futures et cree des dislocations
            que les desks RV exploitent activement.
          </KeyConcept>
          <Takeaway>
            Le CTD determine le comportement du futures obligataire. Sans comprendre le CTD,
            il est impossible de hedger correctement une position sur ZN, ZB ou Bund futures.
          </Takeaway>
        </Card>
      </section>

      {/* ── 04 Butterfly de Taux ── */}
      <section id="s4" className="mb-14">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-black text-[#42A5F5]">04</span>
          <h2 className="text-lg font-bold">Butterfly de Taux (2s5s10s)</h2>
        </div>
        <Card className="p-6 space-y-4">
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            Le butterfly est un trade de courbure : long les ailes (2Y et 10Y) et short le corps (5Y),
            ou l&apos;inverse. Il capture les changements de forme de la courbe des taux, pas son niveau.
          </p>
          <Formula>
            Butterfly = 2 x Yield(5Y) - Yield(2Y) - Yield(10Y)<br/>
            DV01-neutral: w1 x DV01(2Y) + w2 x DV01(5Y) + w3 x DV01(10Y) = 0
          </Formula>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="bg-[#0D0D10] rounded-lg p-5 border border-[#1E1E22]">
              <div className="text-sm font-bold text-[#42A5F5] mb-2">Long Butterfly</div>
              <p className="text-xs text-[#6B6B75] leading-relaxed">
                Long 2Y + Long 10Y / Short 5Y. Profite si la courbure augmente (belly cheapens).
                Trade typique en anticipation de resserrement monetaire concentre sur le 5Y.
              </p>
            </div>
            <div className="bg-[#0D0D10] rounded-lg p-5 border border-[#1E1E22]">
              <div className="text-sm font-bold text-[#FFA726] mb-2">Short Butterfly</div>
              <p className="text-xs text-[#6B6B75] leading-relaxed">
                Short 2Y + Short 10Y / Long 5Y. Profite si la courbure diminue (belly richens).
                Trade de normalisation apres un stress de courbure.
              </p>
            </div>
          </div>
          <KeyConcept title="DV01-Neutral Construction">
            Pour un butterfly pur, les poids des trois pattes doivent rendre la position insensible
            aux mouvements paralleles de la courbe. Le ratio de hedge depend des DV01 respectifs
            de chaque point de la courbe.
          </KeyConcept>
          <Takeaway>
            Le butterfly est le trade de courbure par excellence des desks fixed income.
            La construction DV01-neutral est obligatoire — sans elle, vous avez un trade directionnel deguise.
          </Takeaway>
        </Card>
      </section>

      {/* ── 05 Spreads de Credit ── */}
      <section id="s5" className="mb-14">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-black text-[#42A5F5]">05</span>
          <h2 className="text-lg font-bold">Spreads de Credit</h2>
        </div>
        <Card className="p-6 space-y-4">
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            Le spread de credit mesure la compensation exigee par les investisseurs pour detenir une obligation
            corporate plutot qu&apos;un titre souverain. Il reflete le risque de defaut, la liquidite et le sentiment.
          </p>
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-[#1E1E22]"><Th>Mesure</Th><Th>Definition</Th><Th>Usage</Th></tr></thead>
              <tbody className="divide-y divide-[#1A1A1E]">
                <tr><Td className="font-mono text-[#42A5F5]">Z-Spread</Td><Td>Spread constant ajoute a la courbe zero-coupon</Td><Td>Pricing obligations corporate</Td></tr>
                <tr><Td className="font-mono text-[#FFA726]">OAS</Td><Td>Z-Spread ajuste des options embedded</Td><Td>Obligations callable/puttable</Td></tr>
                <tr><Td className="font-mono text-[#22C55E]">CDS Spread</Td><Td>Prime annuelle du credit default swap</Td><Td>Couverture pure du risque de defaut</Td></tr>
                <tr><Td className="font-mono text-[#EF4444]">Negative Basis</Td><Td>CDS spread &lt; bond spread</Td><Td>Arbitrage : long bond + long CDS</Td></tr>
              </tbody>
            </table>
          </div>
          <KeyConcept title="CDS-Bond Basis">
            En theorie, CDS spread = bond spread. En pratique, des ecarts persistent (financement,
            liquidite, repo). Le negative basis trade (long bond + acheter protection CDS) capture
            cet ecart quand le bond spread est anormalement large vs le CDS.
          </KeyConcept>
          <Takeaway>
            Les spreads de credit sont le pouls du risque corporate. Un elargissement brutal signale
            du stress — surveillez IG vs HY, et le ratio CDS/bond pour detecter les dislocations.
          </Takeaway>
        </Card>
      </section>

      {/* ── 06 Cross-Asset RV ── */}
      <section id="s6" className="mb-14">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-black text-[#42A5F5]">06</span>
          <h2 className="text-lg font-bold">Cross-Asset RV</h2>
        </div>
        <Card className="p-6 space-y-4">
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            Le cross-asset RV exploite les divergences entre classes d&apos;actifs qui devraient etre liees.
            Exemple classique : Bund vs Treasury 10Y, ou equity implied vol vs credit spreads.
          </p>
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-[#1E1E22]"><Th>Pair</Th><Th>Relation</Th><Th>Signal RV</Th></tr></thead>
              <tbody className="divide-y divide-[#1A1A1E]">
                <tr><Td className="font-mono text-[#42A5F5]">Bund / UST 10Y</Td><Td>Spread G7 souverain</Td><Td>Divergence monetaire BCE vs Fed</Td></tr>
                <tr><Td className="font-mono text-[#FFA726]">VIX / CDX HY</Td><Td>Equity vol vs credit risk</Td><Td>Divergence = signal de retour</Td></tr>
                <tr><Td className="font-mono text-[#22C55E]">Gold / TIPS</Td><Td>Taux reels implicites</Td><Td>Dislocation inflation pricing</Td></tr>
                <tr><Td className="font-mono text-[#B388FF]">EUR/USD / Bund-UST</Td><Td>Taux differentiels vs FX</Td><Td>Carry trade convergence</Td></tr>
              </tbody>
            </table>
          </div>
          <KeyConcept title="Regime Dependence">
            Les correlations cross-asset ne sont pas stables. En regime risk-off, tout converge
            (correlations tend vers 1). Le RV trader doit identifier le regime avant de dimensionner.
          </KeyConcept>
          <Takeaway>
            Le cross-asset RV est la forme la plus sophistiquee du trading RV. Il requiert une
            comprehension macro globale et une surveillance constante des regimes de correlation.
          </Takeaway>
        </Card>
      </section>

      {/* ── 07 Gestion du Risque RV ── */}
      <section id="s7" className="mb-14">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-black text-[#42A5F5]">07</span>
          <h2 className="text-lg font-bold">Gestion du Risque RV</h2>
        </div>
        <Card className="p-6 space-y-4">
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            Le risque principal du RV n&apos;est pas la direction mais le spread blowup : le spread diverge
            au lieu de converger, souvent amplifie par le levier et les appels de marge.
          </p>
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-[#1E1E22]"><Th>Risque</Th><Th>Source</Th><Th>Mitigation</Th></tr></thead>
              <tbody className="divide-y divide-[#1A1A1E]">
                <tr><Td className="font-mono text-[#EF4444]">Spread Blowup</Td><Td>Regime shift, liquidite</Td><Td>Stop-loss en Z-score, sizing conservateur</Td></tr>
                <tr><Td className="font-mono text-[#FFA726]">Financement</Td><Td>Cout du repo, margin</Td><Td>Monitoring quotidien du carry net</Td></tr>
                <tr><Td className="font-mono text-[#FFA726]">Liquidite</Td><Td>Bid-ask elargissement</Td><Td>Eviter les instruments illiquides</Td></tr>
                <tr><Td className="font-mono text-[#42A5F5]">Correlation</Td><Td>Decorrelation en stress</Td><Td>Stress tests historiques (2008, 2020)</Td></tr>
              </tbody>
            </table>
          </div>
          <KeyConcept title="LTCM — La Lecon">
            Long-Term Capital Management (1998) : des trades RV parfaitement fondes ont explose
            car le levier etait x25 et les spreads ont diverge pendant des mois. La convergence
            a fini par arriver — mais LTCM n&apos;avait plus de capital pour la voir.
          </KeyConcept>
          <Takeaway>
            En RV, avoir raison sur le trade mais tort sur le timing peut etre fatal.
            Le sizing et la gestion du financement sont plus importants que l&apos;idee elle-meme.
          </Takeaway>
        </Card>
      </section>

      {/* ── 08 Synthese ── */}
      <section id="s8" className="mb-14">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-black text-[#42A5F5]">08</span>
          <h2 className="text-lg font-bold">Synthese</h2>
        </div>
        <Card className="p-6 space-y-4">
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            Le RV trading est l&apos;art de monetiser les dislocations relatives sans exposition directionnelle.
            Du basis au butterfly, du credit au cross-asset, le principe reste le meme : identifier un ecart,
            construire une position neutre, et attendre la convergence.
          </p>
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-[#1E1E22]"><Th>Strategie</Th><Th>Complexite</Th><Th>Horizon</Th><Th>Levier typique</Th></tr></thead>
              <tbody className="divide-y divide-[#1A1A1E]">
                <tr><Td>Basis / Cash-and-Carry</Td><Td className="text-[#22C55E]">Faible</Td><Td>Jours a semaines</Td><Td>x3-x5</Td></tr>
                <tr><Td>Butterfly Taux</Td><Td className="text-[#FFA726]">Moyenne</Td><Td>Semaines a mois</Td><Td>x5-x10</Td></tr>
                <tr><Td>Credit RV (CDS basis)</Td><Td className="text-[#FFA726]">Moyenne</Td><Td>Mois</Td><Td>x3-x8</Td></tr>
                <tr><Td>Cross-Asset</Td><Td className="text-[#EF4444]">Elevee</Td><Td>Semaines a mois</Td><Td>x2-x5</Td></tr>
              </tbody>
            </table>
          </div>
          <Takeaway>
            Le RV est l&apos;approche dominante des hedge funds fixed income (Citadel, Millennium, Bridgewater).
            Maitrisez le basis et le butterfly avant de passer au cross-asset. Sizing &gt; idee, toujours.
          </Takeaway>
        </Card>
      </section>

      <div className="text-center mt-8">
        <Link href="/academie" className="inline-block px-6 py-2 bg-[#1A1A1E] text-[#6B6B75] text-sm font-semibold rounded-lg hover:bg-[#222228] hover:text-[#F0F0F0] transition-colors">
          Retour aux Modules
        </Link>
      </div>
    </div>
  );
}
