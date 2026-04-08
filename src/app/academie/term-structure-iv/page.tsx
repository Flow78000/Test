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
  { id: "s1", label: "01 Construction TS" },
  { id: "s2", label: "02 Regimes TS" },
  { id: "s3", label: "03 Revolution 0DTE" },
  { id: "s4", label: "04 Dealer & Gamma" },
  { id: "s5", label: "05 Calendar Spreads" },
  { id: "s6", label: "06 Signal Detection" },
  { id: "s7", label: "07 Synthese" },
];

export default function TermStructureIVPage() {
  const [active, setActive] = useState("s1");

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-1">
        <Link href="/academie" className="text-[#6B6B75] hover:text-[#FF6B00] text-xs transition-colors">
          Academie
        </Link>
        <span className="text-[#6B6B75] text-xs">/</span>
        <span className="text-xs text-[#FF6B00]">Module 08</span>
      </div>
      <PageHeader
        title="Term Structure IV"
        subtitle="VIX Term Structure . Regimes . 0DTE . Dealer Mechanics . Calendar Spreads — 10 pages"
      >
        <Badge color="#42A5F5">Institutionnel</Badge>
      </PageHeader>

      <SectionNav sections={SECTIONS} active={active} onSelect={setActive} />

      {/* ────────────────────────────────────────────────────── */}
      {/* SECTION 01 — Construction de la Term Structure        */}
      {/* ────────────────────────────────────────────────────── */}
      <section id="s1" className="mb-14">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-black text-[#FF6B00]">01</span>
          <h2 className="text-lg font-bold">Construction de la Term Structure</h2>
        </div>
        <Card className="p-6 space-y-4">
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            La term structure de volatilite implicite represente le niveau du VIX a differentes
            echeances. Le CBOE publie une famille d&apos;indices couvrant l&apos;ensemble du spectre
            temporel : VIX1D (1 jour), VIX9D (9 jours), VIX (30 jours), VIX3M (3 mois)
            et VIX6M (6 mois).
          </p>
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            La forme de cette courbe encode les anticipations du marche sur la volatilite future.
            En regime normal, la courbe est en contango (VIX3M &gt; VIX) car l&apos;incertitude
            augmente avec le temps. En regime de stress, la courbe s&apos;inverse (backwardation)
            car la peur a court terme depasse les anticipations long terme.
          </p>

          <KeyConcept title="Famille VIX du CBOE">
            VIX1D capture la volatilite intraday (0DTE), VIX9D la vol a court terme, VIX la
            reference standard 30 jours, VIX3M la tendance trimestrielle. Le ratio entre ces
            indices revele le regime de marche : un ratio VIX1D/VIX superieur a 1.2 signale
            un stress aigu a court terme.
          </KeyConcept>

          <Formula>
            VIX = 100 x sqrt((2/T) x sum(dK/K^2 x e^(rT) x Mid(K)) - (1/T)(F/K0 - 1)^2)<br/>
            T = Maturite . K = Strikes . F = Forward . Mid = Midpoint prix options
          </Formula>
        </Card>
      </section>

      {/* ────────────────────────────────────────────────────── */}
      {/* SECTION 02 — Regimes de Term Structure                */}
      {/* ────────────────────────────────────────────────────── */}
      <section id="s2" className="mb-14">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-black text-[#FF6B00]">02</span>
          <h2 className="text-lg font-bold">Regimes de Term Structure</h2>
        </div>
        <Card className="p-6 space-y-4">
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            La term structure oscille entre quatre regimes principaux qui definissent l&apos;environnement
            de trading. Chaque regime correspond a un etat du marche avec des implications directes
            pour le positionnement et la gestion du risque.
          </p>
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            L&apos;identification du regime en temps reel est cruciale car les strategies qui fonctionnent
            en contango (vente de vol, carry) echouent en backwardation. Le passage d&apos;un regime
            a l&apos;autre est souvent brutal et precede les mouvements directionnels majeurs du SPX.
          </p>

          <div className="overflow-x-auto mt-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1E1E22]">
                  <Th>Regime</Th>
                  <Th>VIX3M vs VIX</Th>
                  <Th>Signal</Th>
                  <Th>Strategie</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1A1A1E]">
                <tr className="hover:bg-[#FF6B0006]">
                  <Td className="font-mono text-[#22C55E]">Contango Profond</Td>
                  <Td>VIX3M &gt;&gt; VIX (&gt; 1.15)</Td>
                  <Td>Complaisance extreme</Td>
                  <Td>Vente de vol front, calendars</Td>
                </tr>
                <tr className="hover:bg-[#FF6B0006]">
                  <Td className="font-mono text-[#22C55E]">Contango Normal</Td>
                  <Td>VIX3M &gt; VIX (1.00 - 1.15)</Td>
                  <Td>Regime normal</Td>
                  <Td>Carry trades, short vol</Td>
                </tr>
                <tr className="hover:bg-[#FF6B0006]">
                  <Td className="font-mono text-[#FFA726]">Backwardation</Td>
                  <Td>VIX &gt; VIX3M (0.85 - 1.00)</Td>
                  <Td>Stress en cours</Td>
                  <Td>Reduire taille, hedges</Td>
                </tr>
                <tr className="hover:bg-[#FF6B0006]">
                  <Td className="font-mono text-[#EF4444]">Inversion Profonde</Td>
                  <Td>VIX &gt;&gt; VIX3M (&lt; 0.85)</Td>
                  <Td>Panique / crise</Td>
                  <Td>Long vol front, protection</Td>
                </tr>
              </tbody>
            </table>
          </div>

          <KeyConcept title="Transition Contango vers Backwardation">
            Le flip de contango a backwardation est un des signaux les plus fiables en finance.
            Il se produit quand le VIX spot depasse le VIX3M — la peur immediate depasse les
            anticipations a moyen terme. Ce flip precede ou accompagne les sell-offs majeurs du SPX.
          </KeyConcept>
        </Card>
      </section>

      {/* ────────────────────────────────────────────────────── */}
      {/* SECTION 03 — Revolution 0DTE                          */}
      {/* ────────────────────────────────────────────────────── */}
      <section id="s3" className="mb-14">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-black text-[#FF6B00]">03</span>
          <h2 className="text-lg font-bold">Revolution 0DTE</h2>
        </div>
        <Card className="p-6 space-y-4">
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            Les options 0DTE (Zero Days to Expiration) ont transforme la microstructure du marche
            des options depuis 2022. Le volume des SPX 0DTE represente desormais plus de 45% du
            volume total des options SPX. Cette revolution a des implications profondes sur la
            concentration du gamma et le comportement intraday du marche.
          </p>
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            L&apos;impact structurel des 0DTE se manifeste par une concentration massive du gamma
            sur les strikes proches de l&apos;ATM avec une decroissance quasi-instantanee (gamma
            exponentiel proche de l&apos;expiration). Cette concentration cree des effets de pin
            risk et de gamma squeeze intraday qui n&apos;existaient pas avant.
          </p>

          <KeyConcept title="Gamma Concentration 0DTE">
            A l&apos;approche de l&apos;expiration, le gamma se concentre sur un seul strike (ATM).
            Les dealers qui sont short ces options doivent hedger en temps reel, creant des
            mouvements amplifies ou amortis selon qu&apos;ils sont long ou short gamma net.
            Le VIX1D capture cette dynamique intraday.
          </KeyConcept>

          <KeyConcept title="Impact sur la Microstructure">
            Les 0DTE ont change le profil de volatilite intraday. Les mouvements sont plus
            concentres autour des heures d&apos;expiration (15h30-16h00 ET). Le gamma dealer
            provenant des 0DTE peut supprimer la volatilite (quand dealers long gamma) ou
            l&apos;amplifier (quand dealers short gamma) sur des timeframes de minutes.
          </KeyConcept>

          <Formula>
            Gamma 0DTE = N&apos;(d1) / (S x sigma x sqrt(T))<br/>
            Quand T → 0 et S ≈ K : Gamma → infini<br/>
            Delta flip : 0 → 1 en quelques ticks
          </Formula>
        </Card>
      </section>

      {/* ────────────────────────────────────────────────────── */}
      {/* SECTION 04 — Mecanique Dealer et Gamma                */}
      {/* ────────────────────────────────────────────────────── */}
      <section id="s4" className="mb-14">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-black text-[#FF6B00]">04</span>
          <h2 className="text-lg font-bold">Mecanique Dealer et Gamma</h2>
        </div>
        <Card className="p-6 space-y-4">
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            Les market makers (dealers) qui vendent des options aux clients retail et institutionnels
            accumulent des positions en greeks qu&apos;ils doivent couvrir. Le gamma net dealer (GEX)
            determine si les dealers amplifient ou amortissent les mouvements du sous-jacent. C&apos;est
            la mecanique fondamentale qui drive la volatilite realisee intraday.
          </p>
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            Au-dela du gamma, les dealers sont exposes au vanna (sensibilite du delta a la vol)
            et au charm (sensibilite du delta au temps). Ces greeks d&apos;ordre superieur generent
            des flux de hedging systematiques qui creent des patterns previsibles dans le marche.
            Le pin risk pres de l&apos;expiration est l&apos;exemple le plus visible de ces effets.
          </p>

          <KeyConcept title="Vanna et Charm">
            Le vanna genere des flux quand la vol implicite change — si les dealers sont long vanna,
            une baisse de vol les force a acheter du delta (achat du sous-jacent), ce qui amplifie
            les rallyes. Le charm genere des flux avec le passage du temps, creant un biais
            directionnel systematique en fin de journee.
          </KeyConcept>

          <Formula>
            Vanna = dDelta/dVol = dVega/dSpot<br/>
            Charm = dDelta/dTime = -dTheta/dSpot<br/>
            GEX = sum(OI_calls x Gamma_call - OI_puts x Gamma_put) x 100 x S^2
          </Formula>

          <KeyConcept title="Pin Risk">
            Le pin risk se produit quand le prix du sous-jacent est attire vers un strike a forte
            open interest proche de l&apos;expiration. Les dealers qui sont gamma-neutres sur ce strike
            creent un effet d&apos;absorption : chaque mouvement est couvert immediatement, ce qui
            ramene le prix vers le strike — c&apos;est le pinning.
          </KeyConcept>
        </Card>
      </section>

      {/* ────────────────────────────────────────────────────── */}
      {/* SECTION 05 — Spreads Calendar et Strategies           */}
      {/* ────────────────────────────────────────────────────── */}
      <section id="s5" className="mb-14">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-black text-[#FF6B00]">05</span>
          <h2 className="text-lg font-bold">Spreads Calendar et Strategies</h2>
        </div>
        <Card className="p-6 space-y-4">
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            Les VIX calendar spreads exploitent la difference entre les futures VIX de differentes
            echeances. En contango normal, le front month est moins cher que le deferred —
            vendre le spread (short front, long deferred) capture le roll yield negatif.
            En backwardation, c&apos;est l&apos;inverse.
          </p>
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            Les strategies de term structure utilisent les ratios entre les differents indices VIX
            pour identifier les distorsions exploitables. Le spread VIX-VIX3M, le ratio VIX1D/VIX
            et le z-score de ces ratios fournissent des signaux de mean-reversion avec un edge
            statistique historiquement positif.
          </p>

          <KeyConcept title="VIX Calendar Spread">
            Short VIX front month, long VIX deferred. Profite du contango — le front month converge
            vers le spot plus vite que le deferred. Ce trade genere un rendement positif 70% du temps
            en contango mais peut produire des pertes massives lors d&apos;un flip en backwardation.
            La gestion du risque est critique.
          </KeyConcept>

          <Formula>
            Calendar P&L = (VIX_M2 - VIX_M1)_entry - (VIX_M2 - VIX_M1)_exit<br/>
            Roll Yield = (VIX_M1 - VIX_spot) / jours_avant_expiration
          </Formula>

          <KeyConcept title="Contango Harvesting">
            Le roll yield negatif (front &gt; spot a l&apos;expiration) est la source de profit
            principale des produits short-VIX (SVXY). Vendre le contango de facon systematique
            genere un rendement positif dans 80% des mois mais les 20% restants peuvent produire
            des drawdowns de 30% ou plus. Position sizing et stops sont essentiels.
          </KeyConcept>
        </Card>
      </section>

      {/* ────────────────────────────────────────────────────── */}
      {/* SECTION 06 — Signal Detection                         */}
      {/* ────────────────────────────────────────────────────── */}
      <section id="s6" className="mb-14">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-black text-[#FF6B00]">06</span>
          <h2 className="text-lg font-bold">Signal Detection</h2>
        </div>
        <Card className="p-6 space-y-4">
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            La detection de signaux dans la term structure repose sur des indicateurs quantitatifs
            derives des ratios entre les indices VIX. Le ratio VIX1D/VIX est le plus reactif —
            il capture les spikes intraday de stress avant que le VIX 30 jours ne reagisse.
            Le z-score de ces ratios normalise le signal pour identifier les extremes statistiques.
          </p>
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            Les seuils de z-score definissent des zones d&apos;action : au-dela de +2 sigma,
            le stress est extreme et une mean-reversion est probable. En dessous de -2 sigma,
            la complaisance est extreme et un spike de vol est probable. Ces signaux ont
            une valeur predictive sur 1 a 5 jours.
          </p>

          <KeyConcept title="Ratio VIX1D / VIX">
            Le ratio VIX1D/VIX mesure la tension intraday relative a la vol 30 jours.
            Un ratio superieur a 1.5 signale un stress intraday extreme. Un ratio inferieur
            a 0.6 signale une compression intraday anormale. Le z-score sur 20 jours
            de ce ratio est le filtre optimal pour les signaux actionables.
          </KeyConcept>

          <Formula>
            Z-score = (Ratio_t - Mean_20d) / Sigma_20d<br/>
            Signal Long Vol : Z &gt; +2.0<br/>
            Signal Short Vol : Z &lt; -2.0<br/>
            Neutre : -1.0 &lt; Z &lt; +1.0
          </Formula>

          <KeyConcept title="Combinaison Multi-Signal">
            La combinaison du z-score VIX1D/VIX avec le regime de term structure (contango/backwardation)
            et le GEX dealer produit un signal composite robuste. Un z-score &gt; +2 en backwardation
            avec GEX negatif est le setup le plus baissier pour le SPX. La convergence de ces trois
            indicateurs augmente significativement la probabilite de succes.
          </KeyConcept>
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
            La term structure de volatilite implicite est un outil de lecture de marche
            incontournable. Les quatre regimes (contango profond, normal, backwardation, inversion)
            definissent l&apos;environnement de trading et dictent les strategies appropriees.
          </p>
          <p className="text-sm text-[#A0A0A8] leading-relaxed">
            La revolution 0DTE a ajoute une dimension intraday a cette analyse avec le VIX1D.
            La mecanique dealer (gamma, vanna, charm) est le moteur sous-jacent de la volatilite
            realisee. Les calendar spreads et les signaux z-score offrent des opportunites
            de trading systematiques avec un edge quantifiable.
          </p>

          <Takeaway>
            Identifiez le regime de term structure (contango vs backwardation) avant tout trade.
            Utilisez le ratio VIX1D/VIX et son z-score pour les signaux court terme. Comprenez
            la mecanique dealer (GEX, vanna, charm) pour anticiper les mouvements intraday.
            Le flip de contango a backwardation est le signal d&apos;alerte ultime.
          </Takeaway>
        </Card>
      </section>
    </div>
  );
}
