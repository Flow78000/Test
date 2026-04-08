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
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${active === s.id ? "bg-[#FFA726] text-white" : "bg-[#1A1A1E] text-[#6B6B75] hover:text-[#F0F0F0] hover:bg-[#222228]"}`}
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
  { id: "s1", label: "01 Structure Marches" },
  { id: "s2", label: "02 Contango & Backwardation" },
  { id: "s3", label: "03 Spreads Inter-Commo" },
  { id: "s4", label: "04 Metaux" },
  { id: "s5", label: "05 Energie" },
  { id: "s6", label: "06 Synthese" },
];

export default function CommoditiesPage() {
  const [active, setActive] = useState("s1");
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-1">
        <Link href="/academie" className="text-[#6B6B75] hover:text-[#FFA726] text-xs transition-colors">Academie</Link>
        <span className="text-[#6B6B75] text-xs">/</span>
        <span className="text-xs text-[#FFA726]">Module 04</span>
      </div>
      <PageHeader title="Commodities Basics" subtitle="Physique . Futures . Contango . Spreads — 10 pages">
        <Badge color="#FFA726">Institutionnel</Badge>
      </PageHeader>
      <SectionNav sections={SECTIONS} active={active} onSelect={setActive} />

      {/* ── 01 Structure des Marches ── */}
      <section id="s1" className="mb-14">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-black text-[#FFA726]">01</span>
          <h2 className="text-lg font-bold">Structure des Marches</h2>
        </div>
        <Card className="p-6 space-y-4">
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            Les marches de matieres premieres ont une particularite unique : l&apos;actif sous-jacent est
            physique. Le stockage, le transport et la livraison creent des dynamiques de prix absentes
            des marches financiers purs. Cette realite physique se repercute sur la courbe futures.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="bg-[#0D0D10] rounded-lg p-5 border border-[#1E1E22]">
              <div className="text-sm font-bold text-[#FFA726] mb-2">Marche Physique (Spot)</div>
              <p className="text-xs text-[#6B6B75] leading-relaxed">
                Livraison immediate, prix determine par offre/demande physique locale.
                Les acteurs : producteurs, raffineurs, industriels, negociants (Glencore, Trafigura, Vitol).
              </p>
            </div>
            <div className="bg-[#0D0D10] rounded-lg p-5 border border-[#1E1E22]">
              <div className="text-sm font-bold text-[#42A5F5] mb-2">Marche Futures (Papier)</div>
              <p className="text-xs text-[#6B6B75] leading-relaxed">
                Contrats standardises sur CME/ICE. Livraison future. Les speculateurs fournissent
                la liquidite, les hedgers transferent le risque. 95%+ des contrats sont clos avant echeance.
              </p>
            </div>
          </div>
          <KeyConcept title="Convenience Yield">
            Le rendement implicite de detenir le physique plutot que le futures. Quand les stocks
            sont bas, le convenience yield explose — les industriels paient une prime pour la certitude
            d&apos;approvisionnement. C&apos;est le driver principal du backwardation.
          </KeyConcept>
          <Takeaway>
            Comprendre la dualite physique/papier est fondamental. Le prix futures n&apos;est pas
            une prevision du spot futur — c&apos;est le spot ajuste du cout de portage net.
          </Takeaway>
        </Card>
      </section>

      {/* ── 02 Contango & Backwardation ── */}
      <section id="s2" className="mb-14">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-black text-[#FFA726]">02</span>
          <h2 className="text-lg font-bold">Contango & Backwardation</h2>
        </div>
        <Card className="p-6 space-y-4">
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            La forme de la courbe futures revele l&apos;etat fondamental du marche. Contango (courbe
            ascendante) est la norme quand le stockage est disponible. Backwardation (courbe
            descendante) signale un stress d&apos;approvisionnement immediat.
          </p>
          <Formula>
            F(T) = S x e^((r + c - y) x T)<br/>
            r = taux sans risque, c = cout stockage, y = convenience yield
          </Formula>
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-[#1E1E22]"><Th>Regime</Th><Th>Courbe</Th><Th>Cause</Th><Th>Roll Impact</Th></tr></thead>
              <tbody className="divide-y divide-[#1A1A1E]">
                <tr><Td className="font-mono text-[#EF4444]">Contango</Td><Td>F &gt; Spot</Td><Td>Stocks eleves, surplus, cout stockage &gt; yield</Td><Td>Negatif (roll bleed)</Td></tr>
                <tr><Td className="font-mono text-[#22C55E]">Backwardation</Td><Td>F &lt; Spot</Td><Td>Penurie, convenience yield eleve</Td><Td>Positif (roll yield)</Td></tr>
                <tr><Td className="font-mono text-[#FFA726]">Super-Contango</Td><Td>F &gt;&gt; Spot</Td><Td>Stockage sature (ex: WTI avril 2020)</Td><Td>Tres negatif, devastateur</Td></tr>
              </tbody>
            </table>
          </div>
          <KeyConcept title="Roll Yield — Le Cout Cache">
            Un ETF long futures (USO, UNG) doit roller ses positions chaque mois. En contango,
            il vend le front-month moins cher et achete le mois suivant plus cher = perte systematique.
            USO a perdu ~90% de valeur entre 2008 et 2020 uniquement a cause du contango bleed.
          </KeyConcept>
          <Takeaway>
            Ne confondez jamais direction du spot et P&L sur futures. En contango fort,
            vous pouvez avoir raison sur la direction et perdre de l&apos;argent a cause du roll.
          </Takeaway>
        </Card>
      </section>

      {/* ── 03 Spreads Inter-Commodites ── */}
      <section id="s3" className="mb-14">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-black text-[#FFA726]">03</span>
          <h2 className="text-lg font-bold">Spreads Inter-Commodites</h2>
        </div>
        <Card className="p-6 space-y-4">
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            Les spreads inter-commodites exploitent les relations de transformation industrielle.
            Le prix du produit fini est lie au prix de la matiere premiere par un processus physique
            (raffinage, broyage, combustion), ce qui cree des spreads mean-reverting.
          </p>
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-[#1E1E22]"><Th>Spread</Th><Th>Formule</Th><Th>Industrie</Th><Th>Signal</Th></tr></thead>
              <tbody className="divide-y divide-[#1A1A1E]">
                <tr><Td className="font-mono text-[#FFA726]">Crack Spread</Td><Td>3:2:1 (3 CL = 2 RBOB + 1 HO)</Td><Td>Raffinage petrole</Td><Td>Marge raffineur</Td></tr>
                <tr><Td className="font-mono text-[#22C55E]">Crush Spread</Td><Td>Soybean - (Meal + Oil)</Td><Td>Broyage soja</Td><Td>Marge transformateur</Td></tr>
                <tr><Td className="font-mono text-[#42A5F5]">Spark Spread</Td><Td>Electricite - (Gas x Heat Rate)</Td><Td>Centrales gaz</Td><Td>Marge producteur elec</Td></tr>
                <tr><Td className="font-mono text-[#B388FF]">Frac Spread</Td><Td>NGL (ethane, propane) - Gas</Td><Td>Fractionnement gaz</Td><Td>Marge NGL processor</Td></tr>
              </tbody>
            </table>
          </div>
          <KeyConcept title="Logique de Marge Industrielle">
            Ces spreads representent la marge economique d&apos;un processus de transformation.
            Quand le crack spread s&apos;effondre, les raffineurs reduisent la production — ce qui finit
            par faire remonter le spread. C&apos;est un mecanisme d&apos;auto-correction ancre dans le physique.
          </KeyConcept>
          <Takeaway>
            Les spreads inter-commodity sont parmi les trades les plus robustes car ils sont ancres
            dans une realite industrielle. La mean-reversion est structurelle, pas statistique.
          </Takeaway>
        </Card>
      </section>

      {/* ── 04 Metaux ── */}
      <section id="s4" className="mb-14">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-black text-[#FFA726]">04</span>
          <h2 className="text-lg font-bold">Metaux — Gold, Silver, Ratios</h2>
        </div>
        <Card className="p-6 space-y-4">
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            Les metaux precieux occupent une place unique : a la fois commodite et actif monetaire.
            L&apos;or sert de reserve de valeur et de couverture inflation/risque systemique.
            L&apos;argent a un profil hybride — monetaire et industriel (electronique, solaire).
          </p>
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-[#1E1E22]"><Th>Metal</Th><Th>Driver Principal</Th><Th>Correlation</Th><Th>Volatilite (annualisee)</Th></tr></thead>
              <tbody className="divide-y divide-[#1A1A1E]">
                <tr><Td className="font-mono text-[#FFD54F]">Gold (XAU)</Td><Td>Taux reels US, DXY</Td><Td>-0.85 vs taux reels</Td><Td>~15%</Td></tr>
                <tr><Td className="font-mono text-[#6B6B75]">Silver (XAG)</Td><Td>Cycle industriel + or</Td><Td>+0.80 vs Gold, beta 1.5x</Td><Td>~25%</Td></tr>
                <tr><Td className="font-mono text-[#FFA726]">Copper (HG)</Td><Td>Chine, construction, PMI</Td><Td>+0.60 vs equities</Td><Td>~22%</Td></tr>
                <tr><Td className="font-mono text-[#B388FF]">Platinum (PL)</Td><Td>Auto (catalyseurs), hydrogene</Td><Td>Decouple de l&apos;or depuis 2015</Td><Td>~20%</Td></tr>
              </tbody>
            </table>
          </div>
          <Formula>Gold/Silver Ratio = XAU / XAG (moyenne historique ~65, range 30-120)</Formula>
          <KeyConcept title="Gold/Silver Ratio">
            Le ratio Gold/Silver est un indicateur RV classique. Au-dessus de 80, l&apos;argent est
            historiquement sous-evalue vs l&apos;or. En dessous de 50, l&apos;or est relativement bon marche.
            Ce ratio est mean-reverting sur des cycles de 2-5 ans.
          </KeyConcept>
          <Takeaway>
            L&apos;or est un actif macro (taux reels, dollar, risque systemique). L&apos;argent et le cuivre
            sont des actifs cycliques. Utilisez le Gold/Silver ratio comme indicateur de regime risk-on/risk-off.
          </Takeaway>
        </Card>
      </section>

      {/* ── 05 Energie ── */}
      <section id="s5" className="mb-14">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-black text-[#FFA726]">05</span>
          <h2 className="text-lg font-bold">Energie — Crude & NatGas</h2>
        </div>
        <Card className="p-6 space-y-4">
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            L&apos;energie est le secteur le plus liquide des commodites. Le WTI (CL) et le Brent (BZ)
            dominent le complexe petrole, tandis que le Natural Gas (NG) a ses propres dynamiques
            saisonnieres et de stockage.
          </p>
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-[#1E1E22]"><Th>Contrat</Th><Th>Exchange</Th><Th>Driver Cle</Th><Th>Saisonnalite</Th></tr></thead>
              <tbody className="divide-y divide-[#1A1A1E]">
                <tr><Td className="font-mono text-[#FFA726]">WTI (CL)</Td><Td>NYMEX</Td><Td>Inventories US (EIA), OPEC+, USD</Td><Td>Faible saisonnalite prix</Td></tr>
                <tr><Td className="font-mono text-[#42A5F5]">Brent (BZ)</Td><Td>ICE</Td><Td>Geopolitique, waterborne flows</Td><Td>Premium ete (driving season)</Td></tr>
                <tr><Td className="font-mono text-[#22C55E]">NatGas (NG)</Td><Td>NYMEX</Td><Td>Weather, storage (EIA weekly)</Td><Td>Forte : hiver chauffage, ete cooling</Td></tr>
                <tr><Td className="font-mono text-[#B388FF]">RBOB (RB)</Td><Td>NYMEX</Td><Td>Crack spread, driving season</Td><Td>Premium mars-juin (pre-ete)</Td></tr>
              </tbody>
            </table>
          </div>
          <KeyConcept title="Saisonnalite du Natural Gas">
            Le NG a la saisonnalite la plus marquee de toutes les commodites. L&apos;injection (avril-octobre)
            et le retrait (novembre-mars) des stocks creent un cycle previsible. Le rapport EIA Storage
            chaque jeudi est l&apos;event majeur. Les ecarts vs consensus generent des moves de 3-5%.
          </KeyConcept>
          <Formula>WTI-Brent Spread = CL - BZ (historiquement -2$ a +5$, logistique US)</Formula>
          <Takeaway>
            L&apos;energie est le marche le plus politique des commodites (OPEC, sanctions, SPR).
            Les donnees d&apos;inventaires (EIA mercredi pour le petrole, jeudi pour le gaz) sont
            les catalyseurs intraday les plus fiables du complexe.
          </Takeaway>
        </Card>
      </section>

      {/* ── 06 Synthese ── */}
      <section id="s6" className="mb-14">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-black text-[#FFA726]">06</span>
          <h2 className="text-lg font-bold">Synthese</h2>
        </div>
        <Card className="p-6 space-y-4">
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            Les commodites sont le seul marche ou la realite physique domine le prix. Contango,
            backwardation, convenience yield, saisonnalite — tout decoule du fait que ces actifs
            occupent de l&apos;espace, coutent a stocker et se transforment.
          </p>
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-[#1E1E22]"><Th>Secteur</Th><Th>Driver #1</Th><Th>Spread Cle</Th><Th>Risque Specifique</Th></tr></thead>
              <tbody className="divide-y divide-[#1A1A1E]">
                <tr><Td>Energie</Td><Td className="text-[#FFA726]">Inventaires + OPEC</Td><Td>Crack, WTI-Brent</Td><Td>Geopolitique, contango bleed</Td></tr>
                <tr><Td>Metaux Precieux</Td><Td className="text-[#FFD54F]">Taux reels, USD</Td><Td>Gold/Silver ratio</Td><Td>Central bank flows</Td></tr>
                <tr><Td>Metaux Industriels</Td><Td className="text-[#42A5F5]">Chine, PMI</Td><Td>Copper/Gold ratio</Td><Td>Cycle economique</Td></tr>
                <tr><Td>Agricoles</Td><Td className="text-[#22C55E]">Meteo, WASDE</Td><Td>Crush spread</Td><Td>Weather, crop reports</Td></tr>
              </tbody>
            </table>
          </div>
          <Takeaway>
            Maitrisez contango/backwardation et les spreads de transformation avant de trader
            les commodites. Le roll yield et la saisonnalite sont les deux edges les plus fiables
            du secteur — pas la direction du spot.
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
