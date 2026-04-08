"use client";
import { useState } from "react";
import { Card, PageHeader, Badge } from "@/components/ui/card";
import Link from "next/link";

function SectionNav({ sections, active, onSelect }: { sections: { id: string; label: string }[]; active: string; onSelect: (id: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2 mb-8 sticky top-0 z-20 bg-[#08080A] py-3 border-b border-[#1E1E22]">
      {sections.map((s) => (
        <button
          key={s.id}
          onClick={() => { onSelect(s.id); document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth", block: "start" }); }}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${active === s.id ? "bg-[#B388FF] text-white" : "bg-[#1A1A1E] text-[#6B6B75] hover:text-[#F0F0F0] hover:bg-[#222228]"}`}
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
  { id: "s1", label: "01 DV01 Definition" },
  { id: "s2", label: "02 Duration" },
  { id: "s3", label: "03 DV01-Neutral" },
  { id: "s4", label: "04 Convexite" },
  { id: "s5", label: "05 Variance Swap" },
  { id: "s6", label: "06 Synthese" },
];

export default function DV01Page() {
  const [active, setActive] = useState("s1");
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-1">
        <Link href="/academie" className="text-[#6B6B75] hover:text-[#B388FF] text-xs transition-colors">Academie</Link>
        <span className="text-[#6B6B75] text-xs">/</span>
        <span className="text-xs text-[#B388FF]">Module 03</span>
      </div>
      <PageHeader title="DV01 . Variance . Valeur Neutre" subtitle="Duration . Hedging . Variance Swaps — 14 pages">
        <Badge color="#B388FF">Institutionnel</Badge>
      </PageHeader>
      <SectionNav sections={SECTIONS} active={active} onSelect={setActive} />

      {/* ── 01 DV01 Definition ── */}
      <section id="s1" className="mb-14">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-black text-[#B388FF]">01</span>
          <h2 className="text-lg font-bold">DV01 — Dollar Value of One Basis Point</h2>
        </div>
        <Card className="p-6 space-y-4">
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            Le DV01 mesure la variation en dollars du prix d&apos;une obligation pour un mouvement
            de 1 basis point (0.01%) des taux. C&apos;est la metrique fondamentale de risque taux
            utilisee par tous les desks fixed income.
          </p>
          <Formula>
            DV01 = -(dP/dy) x 0.0001<br/>
            DV01 ~ (Modified Duration x Prix x Nominal) / 10 000
          </Formula>
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-[#1E1E22]"><Th>Instrument</Th><Th>Maturite</Th><Th>DV01 / 1M nominal</Th><Th>Interpretation</Th></tr></thead>
              <tbody className="divide-y divide-[#1A1A1E]">
                <tr><Td className="font-mono text-[#B388FF]">T-Bill 3M</Td><Td>3 mois</Td><Td>~$25</Td><Td>Tres faible sensibilite</Td></tr>
                <tr><Td className="font-mono text-[#B388FF]">UST 2Y</Td><Td>2 ans</Td><Td>~$190</Td><Td>Sensible au front-end</Td></tr>
                <tr><Td className="font-mono text-[#42A5F5]">UST 10Y</Td><Td>10 ans</Td><Td>~$870</Td><Td>Benchmark long duration</Td></tr>
                <tr><Td className="font-mono text-[#FFA726]">UST 30Y</Td><Td>30 ans</Td><Td>~$1 800</Td><Td>Maximum sensibilite</Td></tr>
              </tbody>
            </table>
          </div>
          <KeyConcept title="DV01 vs PV01">
            DV01 et PV01 sont souvent utilises de maniere interchangeable. Strictement, PV01 mesure
            l&apos;impact d&apos;un shift de la courbe swap, tandis que DV01 concerne le yield de l&apos;obligation.
            En pratique sur les desks, les deux termes designent la meme chose.
          </KeyConcept>
          <Takeaway>
            Le DV01 est votre boussole en fixed income. Avant toute position, calculez le DV01 total
            du portefeuille. Un DV01 de $1 000 signifie $1 000 de P&L par basis point.
          </Takeaway>
        </Card>
      </section>

      {/* ── 02 Duration Modifiee et Macaulay ── */}
      <section id="s2" className="mb-14">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-black text-[#B388FF]">02</span>
          <h2 className="text-lg font-bold">Duration Modifiee & Macaulay</h2>
        </div>
        <Card className="p-6 space-y-4">
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            La duration Macaulay est la duree moyenne ponderee des flux (coupons + principal),
            exprimee en annees. La duration modifiee ajuste Macaulay pour le yield actuel
            et donne directement la sensibilite prix/taux en pourcentage.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="bg-[#0D0D10] rounded-lg p-5 border border-[#1E1E22]">
              <div className="text-sm font-bold text-[#B388FF] mb-2">Duration Macaulay</div>
              <Formula>D_mac = Sum[ t x PV(CF_t) ] / Prix</Formula>
              <p className="text-xs text-[#6B6B75] leading-relaxed mt-2">
                Centre de gravite des flux actualises. Une obligation zero-coupon a une duration
                Macaulay exactement egale a sa maturite.
              </p>
            </div>
            <div className="bg-[#0D0D10] rounded-lg p-5 border border-[#1E1E22]">
              <div className="text-sm font-bold text-[#42A5F5] mb-2">Duration Modifiee</div>
              <Formula>D_mod = D_mac / (1 + y/n)</Formula>
              <p className="text-xs text-[#6B6B75] leading-relaxed mt-2">
                Sensibilite directe : si D_mod = 7, alors +100bp de taux = -7% de prix.
                C&apos;est l&apos;approximation lineaire (premier ordre) de la relation prix/taux.
              </p>
            </div>
          </div>
          <KeyConcept title="Limites de la Duration">
            La duration est une approximation lineaire. Pour des mouvements de taux importants
            (&gt; 50bp), l&apos;erreur de convexite devient significative. Un portefeuille de $100M
            avec D_mod = 8 perd $8M pour +100bp — mais la convexite peut ajouter ou retrancher $500k+.
          </KeyConcept>
          <Takeaway>
            Duration Macaulay = horizon d&apos;immunisation. Duration Modifiee = sensibilite prix.
            Maitrisez les deux pour comprendre comment le portefeuille reagit aux chocs de taux.
          </Takeaway>
        </Card>
      </section>

      {/* ── 03 Construction DV01-Neutral ── */}
      <section id="s3" className="mb-14">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-black text-[#B388FF]">03</span>
          <h2 className="text-lg font-bold">Construction DV01-Neutral</h2>
        </div>
        <Card className="p-6 space-y-4">
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            Un portefeuille DV01-neutral a un DV01 net de zero : les gains sur les positions longues
            compensent exactement les pertes sur les shorts pour un mouvement parallele des taux.
            C&apos;est la base de tout trade de courbure ou de spread.
          </p>
          <Formula>
            Hedge Ratio = DV01(position) / DV01(hedge instrument)<br/>
            Butterfly: w1 x DV01_2Y = -(w2 x DV01_5Y + w3 x DV01_10Y)
          </Formula>
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-[#1E1E22]"><Th>Trade</Th><Th>Long</Th><Th>Short</Th><Th>Neutralite</Th></tr></thead>
              <tbody className="divide-y divide-[#1A1A1E]">
                <tr><Td className="font-mono text-[#B388FF]">Flattener 2s10s</Td><Td>2Y (DV01 = $190/M)</Td><Td>10Y (DV01 = $870/M)</Td><Td>Ratio ~4.6:1 en nominal</Td></tr>
                <tr><Td className="font-mono text-[#42A5F5]">Steepener 5s30s</Td><Td>30Y (DV01 = $1800/M)</Td><Td>5Y (DV01 = $450/M)</Td><Td>Ratio ~4:1 en nominal</Td></tr>
                <tr><Td className="font-mono text-[#FFA726]">Butterfly 2s5s10s</Td><Td>2Y + 10Y ailes</Td><Td>5Y corps</Td><Td>Net DV01 = 0 sur les 3 pattes</Td></tr>
              </tbody>
            </table>
          </div>
          <KeyConcept title="Risque Residuel">
            Un portefeuille DV01-neutral n&apos;est protege que contre les shifts paralleles.
            Les mouvements de steepening, flattening ou twist de la courbe generent du P&L.
            Pour une neutralite complete, il faut aussi controler les key rate durations.
          </KeyConcept>
          <Takeaway>
            La construction DV01-neutral est la premiere etape de tout trade taux sophistique.
            Sans elle, vous etes expose au risque de niveau — le plus dangereux en fixed income.
          </Takeaway>
        </Card>
      </section>

      {/* ── 04 Convexite ── */}
      <section id="s4" className="mb-14">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-black text-[#B388FF]">04</span>
          <h2 className="text-lg font-bold">Convexite — Second Ordre</h2>
        </div>
        <Card className="p-6 space-y-4">
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            La convexite mesure la courbure de la relation prix-taux. C&apos;est l&apos;equivalent du gamma
            en options : elle capture l&apos;acceleration de la sensibilite quand les taux bougent
            significativement.
          </p>
          <Formula>
            dP/P ~ -D_mod x dy + 0.5 x Convexite x (dy)^2<br/>
            Convexite = (1/P) x d^2P/dy^2
          </Formula>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="bg-[#0D0D10] rounded-lg p-5 border border-[#1E1E22]">
              <div className="text-sm font-bold text-[#22C55E] mb-2">Convexite Positive</div>
              <p className="text-xs text-[#6B6B75] leading-relaxed">
                Obligations classiques, zero-coupons. Le prix monte plus que la duration ne le predit
                quand les taux baissent, et baisse moins quand les taux montent. Toujours desirable.
              </p>
            </div>
            <div className="bg-[#0D0D10] rounded-lg p-5 border border-[#1E1E22]">
              <div className="text-sm font-bold text-[#EF4444] mb-2">Convexite Negative</div>
              <p className="text-xs text-[#6B6B75] leading-relaxed">
                MBS, obligations callable. Le prix monte moins que prevu quand les taux baissent
                (prepayment risk). Penalise dans les deux sens. Les MBS traders hedgent la convexite
                negative avec des swaptions.
              </p>
            </div>
          </div>
          <KeyConcept title="Gamma des Taux">
            La convexite est le gamma du monde fixed income. Un portefeuille long convexite
            beneficie des gros mouvements dans les deux sens. Les traders de vol taux
            achetent de la convexite via des swaptions ou des obligations long-duration.
          </KeyConcept>
          <Takeaway>
            La convexite est gratuite sur les obligations classiques — plus la maturite est longue,
            plus la convexite est elevee. Utilisez-la a votre avantage en construisant des positions
            longues sur la partie longue de la courbe.
          </Takeaway>
        </Card>
      </section>

      {/* ── 05 Variance Swap ── */}
      <section id="s5" className="mb-14">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-black text-[#B388FF]">05</span>
          <h2 className="text-lg font-bold">Variance Swap</h2>
        </div>
        <Card className="p-6 space-y-4">
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            Un variance swap est un contrat OTC ou l&apos;acheteur recoit la variance realisee et paie
            la variance implicite (strike). Le payoff est lineaire en variance, ce qui le rend
            convexe en volatilite — un avantage pour l&apos;acheteur en cas de spike.
          </p>
          <Formula>
            Payoff = Vega Notionnel x (Variance Realisee - Strike^2) / (2 x Strike)<br/>
            Variance Realisee = (252/N) x Sum[ln(S_i/S_i-1)]^2
          </Formula>
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-[#1E1E22]"><Th>Concept</Th><Th>Definition</Th><Th>Implication Trading</Th></tr></thead>
              <tbody className="divide-y divide-[#1A1A1E]">
                <tr><Td className="font-mono text-[#B388FF]">Strike</Td><Td>Vol implicite au moment du trade</Td><Td>Break-even du trade</Td></tr>
                <tr><Td className="font-mono text-[#42A5F5]">VRP</Td><Td>Strike - Vol realisee future</Td><Td>Positif = vendeur gagne en moyenne</Td></tr>
                <tr><Td className="font-mono text-[#FFA726]">Convexity Bias</Td><Td>Var swap &gt; vol swap strike</Td><Td>~1-2 vols de prime pour la convexite</Td></tr>
                <tr><Td className="font-mono text-[#22C55E]">Replication</Td><Td>Strip d&apos;options OTM pondere en 1/K^2</Td><Td>Identique au calcul VIX</Td></tr>
              </tbody>
            </table>
          </div>
          <KeyConcept title="Variance Risk Premium (VRP)">
            Le VRP est historiquement positif de 2-4 vols : la vol implicite surestime la vol realisee.
            Les vendeurs de variance swap capturent ce premium systematiquement, mais subissent
            des drawdowns severes lors des crises (convexite du payoff contre eux).
          </KeyConcept>
          <Takeaway>
            Le variance swap est l&apos;instrument le plus pur pour trader la volatilite. Long variance =
            long gamma/vega avec convexite integree. C&apos;est la forme institutionnelle du straddle.
          </Takeaway>
        </Card>
      </section>

      {/* ── 06 Synthese ── */}
      <section id="s6" className="mb-14">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-black text-[#B388FF]">06</span>
          <h2 className="text-lg font-bold">Synthese</h2>
        </div>
        <Card className="p-6 space-y-4">
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            DV01, duration, convexite et variance swaps forment l&apos;arsenal fondamental du desk fixed income
            et vol. Chaque concept s&apos;emboite : DV01 pour le risque lineaire, convexite pour le second
            ordre, variance swap pour monetiser la vol pure.
          </p>
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-[#1E1E22]"><Th>Concept</Th><Th>Ordre</Th><Th>Analogue Options</Th><Th>Usage Desk</Th></tr></thead>
              <tbody className="divide-y divide-[#1A1A1E]">
                <tr><Td>DV01 / Duration</Td><Td className="text-[#B388FF]">1er ordre</Td><Td>Delta</Td><Td>Hedging directionnel taux</Td></tr>
                <tr><Td>Convexite</Td><Td className="text-[#42A5F5]">2e ordre</Td><Td>Gamma</Td><Td>Risque non-lineaire, MBS</Td></tr>
                <tr><Td>Variance Swap</Td><Td className="text-[#FFA726]">Vol pure</Td><Td>Straddle synthetique</Td><Td>Trading VRP, hedging vol</Td></tr>
                <tr><Td>DV01-Neutral</Td><Td className="text-[#22C55E]">Construction</Td><Td>Delta-neutral</Td><Td>Base de tout trade RV taux</Td></tr>
              </tbody>
            </table>
          </div>
          <Takeaway>
            Maitrisez DV01 et duration avant tout le reste. C&apos;est le fondement sur lequel
            repose toute la gestion de portefeuille fixed income, du treasury desk au macro fund.
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
