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
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${active === s.id ? "bg-[#FFD54F] text-black" : "bg-[#1A1A1E] text-[#6B6B75] hover:text-[#F0F0F0] hover:bg-[#222228]"}`}
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
  { id: "s1", label: "01 Nature Institutionnelle" },
  { id: "s2", label: "02 Drivers Fondamentaux" },
  { id: "s3", label: "03 Correlations" },
  { id: "s4", label: "04 Trading Intraday" },
  { id: "s5", label: "05 Strategies Options" },
  { id: "s6", label: "06 Synthese" },
];

export default function GoldPage() {
  const [active, setActive] = useState("s1");
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-1">
        <Link href="/academie" className="text-[#6B6B75] hover:text-[#FFD54F] text-xs transition-colors">Academie</Link>
        <span className="text-[#6B6B75] text-xs">/</span>
        <span className="text-xs text-[#FFD54F]">Module 05</span>
      </div>
      <PageHeader title="Gold — XAU/USD" subtitle="Taux Reels . Dollar . Strategies Day Trading — 12 pages">
        <Badge color="#FFD54F">Institutionnel</Badge>
      </PageHeader>
      <SectionNav sections={SECTIONS} active={active} onSelect={setActive} />

      {/* ── 01 Nature Institutionnelle ── */}
      <section id="s1" className="mb-14">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-black text-[#FFD54F]">01</span>
          <h2 className="text-lg font-bold">Nature Institutionnelle de l&apos;Or</h2>
        </div>
        <Card className="p-6 space-y-4">
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            L&apos;or est le seul actif qui fonctionne simultanement comme monnaie, matiere premiere
            et reserve de valeur. Cette triple nature lui confere un statut unique dans les portefeuilles
            institutionnels et un comportement de prix distinct de toute autre classe d&apos;actifs.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="bg-[#0D0D10] rounded-lg p-5 border border-[#1E1E22]">
              <div className="text-sm font-bold text-[#FFD54F] mb-2">Actif Monetaire</div>
              <p className="text-xs text-[#6B6B75] leading-relaxed">
                Les banques centrales detiennent 36 000 tonnes d&apos;or. La Fed en possede 8 133t.
                Depuis 2010, les BCs emergentes (Chine, Russie, Inde) sont acheteuses nettes.
              </p>
            </div>
            <div className="bg-[#0D0D10] rounded-lg p-5 border border-[#1E1E22]">
              <div className="text-sm font-bold text-[#42A5F5] mb-2">Safe Haven</div>
              <p className="text-xs text-[#6B6B75] leading-relaxed">
                En regime risk-off, l&apos;or recoit des flux refuges. La correlation avec les equities
                devient negative pendant les crises (-0.3 a -0.5), puis revient a ~0 en regime normal.
              </p>
            </div>
            <div className="bg-[#0D0D10] rounded-lg p-5 border border-[#1E1E22]">
              <div className="text-sm font-bold text-[#FFA726] mb-2">Marche Physique</div>
              <p className="text-xs text-[#6B6B75] leading-relaxed">
                Production miniere : ~3 500t/an. Demande joaillerie : ~50% du total.
                Le LBMA a Londres fixe le prix de reference 2x/jour (AM/PM fix).
              </p>
            </div>
          </div>
          <KeyConcept title="Pourquoi les Banques Centrales Achetent">
            La de-dollarisation pousse les BCs a diversifier leurs reserves hors USD. L&apos;or
            n&apos;a pas de risque de contrepartie et ne peut pas etre gele par des sanctions.
            Depuis 2022, les achats BC depassent 1 000t/an — un record historique.
          </KeyConcept>
          <Takeaway>
            L&apos;or n&apos;est pas un trade — c&apos;est une allocation strategique. Sa place dans un portefeuille
            institutionnel (5-10%) est justifiee par sa decorrelation et son role de couverture systemique.
          </Takeaway>
        </Card>
      </section>

      {/* ── 02 Drivers Fondamentaux ── */}
      <section id="s2" className="mb-14">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-black text-[#FFD54F]">02</span>
          <h2 className="text-lg font-bold">Drivers Fondamentaux</h2>
        </div>
        <Card className="p-6 space-y-4">
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            Le prix de l&apos;or est principalement determine par trois facteurs macro : les taux reels US,
            le dollar (DXY) et les anticipations d&apos;inflation. Les taux reels sont le driver dominant
            avec une correlation inverse quasi-parfaite sur longue periode.
          </p>
          <Formula>
            Gold ~ f(Taux Reels US, DXY, Inflation Expectations)<br/>
            Taux Reel = TIPS Yield 10Y = Nominal 10Y - Breakeven Inflation
          </Formula>
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-[#1E1E22]"><Th>Driver</Th><Th>Correlation</Th><Th>Mecanisme</Th><Th>Indicateur</Th></tr></thead>
              <tbody className="divide-y divide-[#1A1A1E]">
                <tr><Td className="font-mono text-[#FFD54F]">Taux Reels US</Td><Td className="text-[#EF4444]">-0.85</Td><Td>Cout d&apos;opportunite de detenir un actif sans rendement</Td><Td>TIPS 10Y yield</Td></tr>
                <tr><Td className="font-mono text-[#42A5F5]">DXY (Dollar Index)</Td><Td className="text-[#EF4444]">-0.70</Td><Td>Or cote en USD, dollar fort = or cher en devises</Td><Td>DXY Index</Td></tr>
                <tr><Td className="font-mono text-[#FFA726]">Breakeven Inflation</Td><Td className="text-[#22C55E]">+0.50</Td><Td>Hedge inflation, anticipations haussiere = bullish</Td><Td>TIPS spread 5Y/10Y</Td></tr>
                <tr><Td className="font-mono text-[#B388FF]">ETF Flows (GLD)</Td><Td className="text-[#22C55E]">+0.60</Td><Td>Proxy de la demande institutionnelle occidentale</Td><Td>GLD holdings (tonnes)</Td></tr>
              </tbody>
            </table>
          </div>
          <KeyConcept title="Regime Break Post-2022">
            Depuis 2022, la correlation or/taux reels s&apos;est affaiblie. L&apos;or monte malgre des taux reels
            positifs a 2%+. Explication : les achats massifs des banques centrales (Chine, Pologne, Turquie)
            creent une demande structurelle qui domine le signal taux reels.
          </KeyConcept>
          <Takeaway>
            Surveillez le TIPS 10Y comme indicateur principal. Quand les taux reels baissent et
            le DXY faiblit simultanement, c&apos;est le setup le plus bullish pour l&apos;or.
          </Takeaway>
        </Card>
      </section>

      {/* ── 03 Correlations Cross-Asset ── */}
      <section id="s3" className="mb-14">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-black text-[#FFD54F]">03</span>
          <h2 className="text-lg font-bold">Correlations Cross-Asset</h2>
        </div>
        <Card className="p-6 space-y-4">
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            Les correlations de l&apos;or ne sont pas stables — elles dependent du regime de marche.
            En regime normal, l&apos;or est faiblement correle aux equities. En crise, il devient
            negativement correle (safe haven) puis se recorrele en phase de recovery.
          </p>
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-[#1E1E22]"><Th>Actif</Th><Th>Normal</Th><Th>Risk-Off</Th><Th>Inflation</Th></tr></thead>
              <tbody className="divide-y divide-[#1A1A1E]">
                <tr><Td className="font-mono text-[#FFD54F]">SPX</Td><Td>+0.10</Td><Td className="text-[#EF4444]">-0.40</Td><Td>+0.20</Td></tr>
                <tr><Td className="font-mono text-[#42A5F5]">UST 10Y</Td><Td>+0.30</Td><Td className="text-[#22C55E]">+0.60</Td><Td>-0.20</Td></tr>
                <tr><Td className="font-mono text-[#FFA726]">VIX</Td><Td>-0.05</Td><Td className="text-[#22C55E]">+0.50</Td><Td>+0.10</Td></tr>
                <tr><Td className="font-mono text-[#B388FF]">DXY</Td><Td className="text-[#EF4444]">-0.70</Td><Td className="text-[#EF4444]">-0.60</Td><Td className="text-[#EF4444]">-0.50</Td></tr>
                <tr><Td className="font-mono text-[#6B6B75]">Silver</Td><Td className="text-[#22C55E]">+0.80</Td><Td className="text-[#22C55E]">+0.70</Td><Td className="text-[#22C55E]">+0.85</Td></tr>
              </tbody>
            </table>
          </div>
          <KeyConcept title="Gold-Bond Divergence">
            Quand l&apos;or et les bonds montent simultanement (risk-off), c&apos;est un signal de stress
            systemique fort. Quand ils divergent (or monte, bonds baissent), c&apos;est un signal
            d&apos;inflation — le marche vend la duration nominale et achete le hedge reel.
          </KeyConcept>
          <Takeaway>
            Utilisez l&apos;or comme indicateur de regime : si Gold + VIX montent ensemble, le marche
            est en mode panique. Si Gold monte seul avec le DXY faible, c&apos;est un mouvement macro ordonne.
          </Takeaway>
        </Card>
      </section>

      {/* ── 04 Trading Intraday ── */}
      <section id="s4" className="mb-14">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-black text-[#FFD54F]">04</span>
          <h2 className="text-lg font-bold">Trading Intraday — Sessions & Volatilite</h2>
        </div>
        <Card className="p-6 space-y-4">
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            Le XAU/USD trade 23h/jour avec des pics de volatilite bien definis. La session Londres
            (8h-12h GMT) et l&apos;overlap Londres-New York (13h-17h GMT) concentrent 70% du volume
            et de l&apos;amplitude journaliere.
          </p>
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-[#1E1E22]"><Th>Session</Th><Th>Horaires (GMT)</Th><Th>Volatilite</Th><Th>Caracteristique</Th></tr></thead>
              <tbody className="divide-y divide-[#1A1A1E]">
                <tr><Td className="font-mono text-[#42A5F5]">Asie</Td><Td>00:00 - 07:00</Td><Td className="text-[#6B6B75]">Faible</Td><Td>Range-bound, flows Shanghai Gold Exchange</Td></tr>
                <tr><Td className="font-mono text-[#FFD54F]">Londres</Td><Td>08:00 - 12:00</Td><Td className="text-[#FFA726]">Elevee</Td><Td>AM Fix (10:30), direction journaliere etablie</Td></tr>
                <tr><Td className="font-mono text-[#22C55E]">Overlap</Td><Td>13:00 - 17:00</Td><Td className="text-[#EF4444]">Maximale</Td><Td>PM Fix (15:00), data US (NFP, CPI, FOMC)</Td></tr>
                <tr><Td className="font-mono text-[#B388FF]">NY soir</Td><Td>17:00 - 22:00</Td><Td className="text-[#6B6B75]">Faible</Td><Td>Consolidation, thin markets</Td></tr>
              </tbody>
            </table>
          </div>
          <KeyConcept title="ADR et Sizing">
            L&apos;Average Daily Range du XAU/USD est d&apos;environ $25-35 (regime VIX 15-20).
            En regime stress, l&apos;ADR peut doubler a $50-70. Calibrez vos stops et targets
            sur l&apos;ADR du regime actuel, pas sur une valeur fixe.
          </KeyConcept>
          <Formula>
            Position Size = (Capital x Risk%) / (Stop en $ x Valeur du point)<br/>
            Ex: ($100k x 1%) / ($15 x $100/lot) = 0.67 lots
          </Formula>
          <Takeaway>
            Tradez l&apos;or pendant l&apos;overlap Londres-NY pour maximiser la liquidite et la volatilite.
            Evitez la session asiatique sauf si vous tradez le range. Le AM Fix de Londres
            donne souvent la direction de la journee.
          </Takeaway>
        </Card>
      </section>

      {/* ── 05 Strategies Options sur Gold ── */}
      <section id="s5" className="mb-14">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-black text-[#FFD54F]">05</span>
          <h2 className="text-lg font-bold">Strategies Options sur Gold</h2>
        </div>
        <Card className="p-6 space-y-4">
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            Les options sur l&apos;or (GLD options, GC futures options) permettent de structurer des
            trades asymetriques autour des events macro. Le GVZ (CBOE Gold Volatility Index)
            est l&apos;equivalent du VIX pour l&apos;or.
          </p>
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-[#1E1E22]"><Th>Strategie</Th><Th>Setup</Th><Th>Quand</Th><Th>Risk/Reward</Th></tr></thead>
              <tbody className="divide-y divide-[#1A1A1E]">
                <tr><Td className="font-mono text-[#FFD54F]">Straddle pre-FOMC</Td><Td>Long ATM Call + Put</Td><Td>2-3j avant FOMC, NFP</Td><Td>Risque = prime payee, gain illimite</Td></tr>
                <tr><Td className="font-mono text-[#42A5F5]">Put Spread</Td><Td>Long Put + Short Put lower</Td><Td>Hedge portefeuille or long</Td><Td>Cout reduit, protection limitee</Td></tr>
                <tr><Td className="font-mono text-[#FFA726]">Risk Reversal</Td><Td>Long Call OTM + Short Put OTM</Td><Td>Vue directionnelle haussiere</Td><Td>Zero-cost si strikes equilibres</Td></tr>
                <tr><Td className="font-mono text-[#22C55E]">Calendar Spread</Td><Td>Short front-month + Long back</Td><Td>GVZ term structure en contango</Td><Td>Profite du time decay differentiel</Td></tr>
              </tbody>
            </table>
          </div>
          <KeyConcept title="GVZ — Le VIX de l&apos;Or">
            Le GVZ (Gold Volatility Index) mesure la vol implicite 30j sur les options GLD.
            Moyenne historique ~16-18. Au-dessus de 25, la vol est chere — favoriser les ventes.
            En-dessous de 14, la vol est pas chere — acheter des straddles pre-events.
          </KeyConcept>
          <Takeaway>
            Les options sur l&apos;or sont ideales pour les events macro (FOMC, NFP, CPI).
            Le straddle pre-event capture le mouvement sans biais directionnel.
            Surveillez le GVZ pour savoir si la vol est chere ou pas avant de structurer.
          </Takeaway>
        </Card>
      </section>

      {/* ── 06 Synthese ── */}
      <section id="s6" className="mb-14">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-black text-[#FFD54F]">06</span>
          <h2 className="text-lg font-bold">Synthese</h2>
        </div>
        <Card className="p-6 space-y-4">
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            L&apos;or est l&apos;actif macro par excellence. Son prix encode les anticipations du marche
            sur les taux reels, l&apos;inflation, le dollar et le risque systemique. Maitrisez ses drivers
            et vous aurez une lecture du sentiment macro global.
          </p>
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-[#1E1E22]"><Th>Regime</Th><Th>Gold</Th><Th>Driver</Th><Th>Action</Th></tr></thead>
              <tbody className="divide-y divide-[#1A1A1E]">
                <tr><Td>Taux reels en baisse</Td><Td className="text-[#22C55E]">Haussier</Td><Td>Cout opportunite diminue</Td><Td>Long gold, long GDX</Td></tr>
                <tr><Td>Dollar fort + taux reels hauts</Td><Td className="text-[#EF4444]">Baissier</Td><Td>Double headwind</Td><Td>Reduire, hedge avec puts</Td></tr>
                <tr><Td>Crise systemique</Td><Td className="text-[#22C55E]">Tres haussier</Td><Td>Safe haven flows</Td><Td>Position longue core, ignorer le bruit</Td></tr>
                <tr><Td>Inflation + croissance</Td><Td className="text-[#FFA726]">Neutre a haussier</Td><Td>Depends des taux reels nets</Td><Td>Surveiller TIPS spread</Td></tr>
              </tbody>
            </table>
          </div>
          <Takeaway>
            L&apos;or ne rapporte rien — il preserve. Sa valeur est dans la decorrelation et la protection.
            Tradez-le pour ses drivers macro, pas comme un actif technique. Le TIPS 10Y et le DXY
            sont vos deux boussoles fondamentales.
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
