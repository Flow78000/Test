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
  { id: "s1", label: "01 Contango & Backwardation" },
  { id: "s2", label: "02 Roll Yield" },
  { id: "s3", label: "03 Commodities TS" },
  { id: "s4", label: "04 Equity Index Futures" },
  { id: "s5", label: "05 VIX Futures vs Spot" },
  { id: "s6", label: "06 Trading Strategies" },
  { id: "s7", label: "07 Synthese" },
];

export default function TermStructureFuturesPage() {
  const [active, setActive] = useState("s1");

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-1">
        <Link href="/academie" className="text-[#6B6B75] hover:text-[#FF6B00] text-xs transition-colors">
          Academie
        </Link>
        <span className="text-[#6B6B75] text-xs">/</span>
        <span className="text-xs text-[#FF6B00]">Module 09</span>
      </div>
      <PageHeader
        title="Term Structure Futures"
        subtitle="Contango . Backwardation . Roll Yield . Commodities . VIX Futures — 10 pages"
      >
        <Badge color="#B388FF">Institutionnel</Badge>
      </PageHeader>

      <SectionNav sections={SECTIONS} active={active} onSelect={setActive} />

      {/* ────────────────────────────────────────────────────── */}
      {/* SECTION 01 — Contango et Backwardation                */}
      {/* ────────────────────────────────────────────────────── */}
      <section id="s1" className="mb-14">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-black text-[#FF6B00]">01</span>
          <h2 className="text-lg font-bold">Contango et Backwardation</h2>
        </div>
        <Card className="p-6 space-y-4">
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            Le contango et la backwardation sont les deux etats fondamentaux de la courbe des
            futures. En contango, les prix futurs sont superieurs au prix spot — c&apos;est l&apos;etat
            normal quand le cout de portage (storage, financement, assurance) domine. En
            backwardation, les prix futurs sont inferieurs au spot — la demande immediate
            depasse les anticipations futures.
          </p>
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            La theorie du cost of carry explique le contango : le prix futures doit reflecter
            le cout de detenir l&apos;actif sous-jacent jusqu&apos;a l&apos;echeance. Le convenience yield
            — la valeur de detenir l&apos;actif physique plutot que le futures — explique la
            backwardation. Quand le convenience yield depasse le cout de carry, la courbe
            s&apos;inverse.
          </p>

          <Formula>
            F(T) = S x e^((r + s - c) x T)<br/>
            r = taux sans risque . s = cout de stockage . c = convenience yield<br/>
            Contango : r + s &gt; c → F &gt; S<br/>
            Backwardation : c &gt; r + s → F &lt; S
          </Formula>

          <KeyConcept title="Cost of Carry">
            Le cost of carry est la somme de tous les couts de detention d&apos;un actif : financement
            (taux d&apos;interet), stockage (pour les commodities physiques), assurance et depreciation.
            Pour les actifs financiers sans cout de stockage, le carry se reduit essentiellement
            au taux d&apos;interet et aux dividendes.
          </KeyConcept>

          <KeyConcept title="Convenience Yield">
            Le convenience yield est le benefice non-monetaire de detenir l&apos;actif physique :
            securite d&apos;approvisionnement, flexibilite de production, capacite de repondre a la
            demande immediate. Il est eleve quand les stocks sont bas et la demande forte.
            C&apos;est un concept clef pour les commodities mais absent des actifs financiers.
          </KeyConcept>
        </Card>
      </section>

      {/* ────────────────────────────────────────────────────── */}
      {/* SECTION 02 — Roll Yield                               */}
      {/* ────────────────────────────────────────────────────── */}
      <section id="s2" className="mb-14">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-black text-[#FF6B00]">02</span>
          <h2 className="text-lg font-bold">Roll Yield</h2>
        </div>
        <Card className="p-6 space-y-4">
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            Le roll yield est le rendement (positif ou negatif) genere par le renouvellement
            (roll) d&apos;une position futures d&apos;un contrat expirant vers le contrat suivant.
            En contango, le roll yield est negatif : on vend le front month moins cher et
            on achete le deferred plus cher. En backwardation, le roll yield est positif.
          </p>
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            Pour les VIX futures, le roll yield est la composante dominante du rendement.
            Le contango structurel du VIX (80% du temps) genere un roll yield negatif pour
            les positions longues — c&apos;est pourquoi les ETN long-VIX (VXX, UVXY) perdent
            de la valeur systematiquement. Les produits short-VIX (SVXY) capturent ce roll
            yield positif mais avec un risque de tail event catastrophique.
          </p>

          <Formula>
            Roll Yield = (F_front - F_deferred) / F_deferred x (365 / jours_entre_contrats)<br/>
            Roll Yield annualise VIX ~ -3% a -8% en contango normal<br/>
            Roll Yield annualise VIX ~ +5% a +15% en backwardation
          </Formula>

          <KeyConcept title="Roll Yield VIX — Cout du Portage">
            Le VIX futures en contango perd environ 5% de sa valeur par mois en roll yield.
            Sur un an, un position longue VIX futures perd 40-60% en roll yield seul, meme
            si le VIX spot reste stable. C&apos;est la raison pour laquelle le timing est critique
            pour les trades long-VIX : il faut un spike suffisant pour compenser le bleed du roll.
          </KeyConcept>
        </Card>
      </section>

      {/* ────────────────────────────────────────────────────── */}
      {/* SECTION 03 — Commodities Term Structure               */}
      {/* ────────────────────────────────────────────────────── */}
      <section id="s3" className="mb-14">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-black text-[#FF6B00]">03</span>
          <h2 className="text-lg font-bold">Commodities Term Structure</h2>
        </div>
        <Card className="p-6 space-y-4">
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            Les commodities ont des term structures complexes influencees par la saisonnalite,
            les niveaux de stocks, les contraintes de production et la geopolitique. Le petrole
            (CL) alterne entre contango (stocks eleves, demande faible) et backwardation
            (tensions d&apos;approvisionnement, demande forte).
          </p>
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            Le gaz naturel (NG) a une saisonnalite tres prononcee avec des spreads hiver/ete
            qui refletent les besoins de chauffage. Les metaux (GC, SI) ont des term structures
            plus stables, principalement drivees par les taux d&apos;interet et le cout de stockage.
            L&apos;or en particulier est presque toujours en contango en raison de son cout de carry
            positif et l&apos;absence de convenience yield significatif.
          </p>

          <div className="overflow-x-auto mt-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1E1E22]">
                  <Th>Commodity</Th>
                  <Th>Regime Dominant</Th>
                  <Th>Driver Principal</Th>
                  <Th>Saisonnalite</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1A1A1E]">
                <tr className="hover:bg-[#FF6B0006]">
                  <Td className="font-mono text-[#FF6B00]">CL (Petrole)</Td>
                  <Td>Variable</Td>
                  <Td>Stocks, OPEC, geopolitique</Td>
                  <Td>Modere</Td>
                </tr>
                <tr className="hover:bg-[#FF6B0006]">
                  <Td className="font-mono text-[#FF6B00]">NG (Gaz)</Td>
                  <Td>Saisonnier</Td>
                  <Td>Meteo, stocks, production</Td>
                  <Td>Tres forte</Td>
                </tr>
                <tr className="hover:bg-[#FF6B0006]">
                  <Td className="font-mono text-[#FFA726]">GC (Or)</Td>
                  <Td>Contango quasi-permanent</Td>
                  <Td>Taux reels, dollar</Td>
                  <Td>Faible</Td>
                </tr>
                <tr className="hover:bg-[#FF6B0006]">
                  <Td className="font-mono text-[#FFA726]">SI (Argent)</Td>
                  <Td>Contango</Td>
                  <Td>Industriel + monetaire</Td>
                  <Td>Moderee</Td>
                </tr>
              </tbody>
            </table>
          </div>

          <KeyConcept title="Petrole — Backwardation Signal">
            Quand le petrole passe en backwardation profonde (spread M1-M12 &gt; $5), c&apos;est un
            signal de tension physique immediate. L&apos;OPEC utilise la backwardation comme indicateur
            de succes de ses coupes de production. Le spread M1-M6 du CL est un des indicateurs
            les plus suivis par les desks commodities.
          </KeyConcept>
        </Card>
      </section>

      {/* ────────────────────────────────────────────────────── */}
      {/* SECTION 04 — Equity Index Futures                     */}
      {/* ────────────────────────────────────────────────────── */}
      <section id="s4" className="mb-14">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-black text-[#FF6B00]">04</span>
          <h2 className="text-lg font-bold">Equity Index Futures</h2>
        </div>
        <Card className="p-6 space-y-4">
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            Les equity index futures (ES, NQ, YM, RTY) cotent generalement en contango modere.
            Le basis — la difference entre le prix futures et le prix spot de l&apos;indice —
            reflete le cout de financement moins les dividendes attendus. Le fair value est
            la valeur theorique du basis selon le cost of carry.
          </p>
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            Les deviations du basis par rapport au fair value creent des opportunites d&apos;arbitrage
            (cash-and-carry ou reverse cash-and-carry). Le basis converge vers zero a l&apos;expiration.
            Les periodes de dividendes ex-date importants creent des distorsions previsibles
            dans le basis qu&apos;exploitent les desks d&apos;arbitrage.
          </p>

          <Formula>
            Fair Value = S x (e^((r - d) x T) - 1)<br/>
            Basis = F - S<br/>
            Premium = Basis - Fair Value<br/>
            r = taux sans risque . d = dividend yield . T = temps a l&apos;expiration
          </Formula>

          <KeyConcept title="Fair Value et Arbitrage">
            Quand le basis depasse le fair value (premium positif), les arbitrageurs vendent le
            futures et achetent le panier d&apos;actions (cash-and-carry). Quand le basis est inferieur
            au fair value, ils font l&apos;inverse. Ce mecanisme maintient les futures proches de leur
            valeur theorique et genere les « program trades » visibles dans le flux.
          </KeyConcept>

          <KeyConcept title="ES Basis Intraday">
            Le basis ES-SPX varie intraday en fonction du flux. Un basis qui s&apos;elargit signale
            des acheteurs agressifs en futures (anticipation haussiere). Un basis qui se comprime
            ou devient negatif signale de la pression vendeuse en futures. Le suivi du basis
            en temps reel est un indicateur de flux institutionnel.
          </KeyConcept>
        </Card>
      </section>

      {/* ────────────────────────────────────────────────────── */}
      {/* SECTION 05 — VIX Futures vs Spot                      */}
      {/* ────────────────────────────────────────────────────── */}
      <section id="s5" className="mb-14">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-black text-[#FF6B00]">05</span>
          <h2 className="text-lg font-bold">VIX Futures vs Spot</h2>
        </div>
        <Card className="p-6 space-y-4">
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            Le VIX futures ne track pas le VIX spot — c&apos;est une erreur fondamentale que font
            la plupart des traders retail. Le VIX spot est un calcul en temps reel a partir
            des options SPX. Le VIX futures est un contrat a terme qui converge vers le VIX
            spot uniquement a l&apos;expiration. Entre-temps, il a sa propre dynamique.
          </p>
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            Le contango structurel du VIX (80% du temps) signifie que les futures sont
            systematiquement au-dessus du spot. Ce contango encode une prime de risque :
            le marche anticipe que la vol future sera plus elevee que la vol actuelle
            (mean-reversion du VIX vers ~20). La vol-of-vol (VVIX) mesure la volatilite
            de ce processus.
          </p>

          <KeyConcept title="Contango Structurel du VIX">
            Le VIX a un contango structurel car il mean-reverte vers ~18-20. Quand le spot
            est a 12, les futures M2 cotent ~14 car le marche anticipe la mean-reversion.
            Ce contango est le plus prononce quand le spot est tres bas (VIX &lt; 14) et
            se comprime quand le spot approche sa moyenne.
          </KeyConcept>

          <Formula>
            Beta VIX futures vs spot ~ 0.5 (M1) a 0.3 (M2)<br/>
            Un spike VIX de +5 pts → M1 bouge ~ +2.5 pts, M2 ~ +1.5 pts<br/>
            Convergence : F → S quand T → 0
          </Formula>

          <KeyConcept title="Vol-of-Vol (VVIX)">
            Le VVIX mesure la volatilite implicite des options sur le VIX. Un VVIX eleve
            (&gt; 110) signale que le marche anticipe des mouvements violents du VIX —
            dans un sens ou dans l&apos;autre. Le VVIX spike avant le VIX dans de nombreux
            cas, ce qui en fait un indicateur avance de regime change.
          </KeyConcept>
        </Card>
      </section>

      {/* ────────────────────────────────────────────────────── */}
      {/* SECTION 06 — Trading Strategies                       */}
      {/* ────────────────────────────────────────────────────── */}
      <section id="s6" className="mb-14">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-black text-[#FF6B00]">06</span>
          <h2 className="text-lg font-bold">Trading Strategies</h2>
        </div>
        <Card className="p-6 space-y-4">
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            Les strategies de term structure futures exploitent les distorsions de la courbe
            plutot que la direction du sous-jacent. Le carry trade systematique vend le contango
            en shortant le front month et achetant le deferred. Les calendar spreads isolent
            le mouvement relatif entre deux echeances.
          </p>
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            Pour les VIX futures, le trade le plus courant est le short M1/long M2 en contango.
            Pour les commodities, les inter-delivery spreads (meme commodity, echeances differentes)
            et les inter-commodity spreads (crack spread petrole, crush spread soja) offrent des
            opportunites avec un risque directionnel reduit.
          </p>

          <KeyConcept title="Carry Trade Systematique">
            Le carry trade vend le contango de facon repetee. En VIX futures, il genere un rendement
            de 30-50% annualise en moyenne mais avec des drawdowns de 50%+ lors des spikes. La clef
            est le dimensionnement : ne jamais allouer plus de 5-10% du portefeuille et utiliser
            des stops sur le basis (sortie si backwardation depasse un seuil).
          </KeyConcept>

          <KeyConcept title="Calendar Spread Commodities">
            Les calendar spreads en commodities capturent les changements de term structure lies
            aux fondamentaux (stocks, production, demande). Le spread M1-M6 en petrole est un
            indicateur de tension physique. Les inter-delivery spreads en gaz naturel capturent
            la saisonnalite de chauffage (novembre vs mars).
          </KeyConcept>

          <Formula>
            Carry P&L = (F_front - F_deferred) x Nombre de contrats<br/>
            Stop : sortie si basis flip en backwardation &gt; 2 ecarts-types
          </Formula>
        </Card>
      </section>

      {/* ────────────────────────────────────────────────────── */}
      {/* SECTION 07 — Synthese                                 */}
      {/* ────────────────────────────────────────────────────── */}
      <section id="s7" className="mb-14">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-black text-[#FF6B00]">07</span>
          <h2 className="text-lg font-bold">Synthese</h2>
        </div>
        <Card className="p-6 space-y-4">
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            La term structure des futures encode l&apos;ensemble des couts de portage, du convenience
            yield et des anticipations du marche. Le contango et la backwardation ne sont pas
            de simples etats — ils refletent les fondamentaux physiques et financiers de chaque
            marche.
          </p>
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            Le roll yield est la composante cachee du rendement des futures — positive en
            backwardation, negative en contango. Pour le VIX, le contango structurel cree
            des opportunites de carry mais avec un risque asymetrique. Les calendar spreads
            et les inter-commodity spreads offrent des trades a risque reduit.
          </p>

          <Takeaway>
            Identifiez le regime de term structure (contango/backwardation) avant tout trade futures.
            Comprenez le roll yield et son impact sur le rendement total. Distinguez le VIX spot
            du VIX futures — ils ne trackent pas la meme chose. Les strategies de carry sont
            profitables en moyenne mais necessitent un risk management rigoureux pour survivre
            aux inversions de courbe.
          </Takeaway>
        </Card>
      </section>
    </div>
  );
}
