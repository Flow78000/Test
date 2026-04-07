"use client";
import { Card, PageHeader, Badge } from "@/components/ui/card";
import Link from "next/link";

const sections = [
  { num: "01", title: "Duration & DV01", desc: "Sensibilite prix/taux, Macaulay vs Modified Duration" },
  { num: "02", title: "Convexite", desc: "Effet de second ordre, acceleration de la sensibilite" },
  { num: "03", title: "Hedging DV01-Neutre", desc: "Construction de positions taux-neutres, ratio de couverture" },
  { num: "04", title: "Variance Swaps", desc: "Replication, pricing, P&L mechanics, vega notionnel" },
  { num: "05", title: "Vol Swaps vs Variance Swaps", desc: "Convexity bias, Jensen inequality, arbitrage" },
  { num: "06", title: "Spreads de Taux", desc: "2s10s, 5s30s, TED spread, swap spread" },
  { num: "07", title: "Valeur Neutre (Market Neutral)", desc: "Beta-neutral, dollar-neutral, factor-neutral" },
  { num: "08", title: "Applications Pratiques", desc: "Portfolio immunization, ALM, risk budgeting taux" },
];

export default function DV01Page() {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-1">
        <Link href="/academie" className="text-[#6B6B75] hover:text-[#B388FF] text-xs transition-colors">
          Academie
        </Link>
        <span className="text-[#6B6B75] text-xs">/</span>
        <span className="text-xs text-[#B388FF]">Module 03</span>
      </div>
      <PageHeader
        title="DV01 . Variance . Valeur Neutre"
        subtitle="Duration . Hedging . Spreads Taux — 14 pages"
      >
        <Badge color="#B388FF">Institutionnel</Badge>
      </PageHeader>

      <Card className="p-8 mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#B388FF] opacity-[0.04] rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10 text-center py-8">
          <div className="text-6xl font-black text-[#B388FF] opacity-20 mb-4">03</div>
          <div className="text-xs text-[#B388FF] uppercase tracking-[6px] font-semibold mb-3">
            Module en construction
          </div>
          <h2 className="text-xl font-extrabold mb-2">DV01, Variance & Valeur Neutre</h2>
          <p className="text-sm text-[#6B6B75] max-w-lg mx-auto leading-relaxed">
            Les fondamentaux de la gestion de risque taux : duration, convexite, hedging neutre,
            et les mecaniques des variance swaps. L&apos;arsenal du desk fixed income.
          </p>
        </div>
      </Card>

      <div className="text-xs text-[#6B6B75] uppercase tracking-[3px] font-semibold mb-4">
        Sommaire du Module
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {sections.map((s) => (
          <Card key={s.num} className="p-5 opacity-60">
            <div className="flex items-start gap-3">
              <span className="text-lg font-black text-[#B388FF]">{s.num}</span>
              <div>
                <div className="text-sm font-bold mb-1">{s.title}</div>
                <div className="text-xs text-[#6B6B75]">{s.desc}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="text-center mt-8">
        <Link
          href="/academie"
          className="inline-block px-6 py-2 bg-[#1A1A1E] text-[#6B6B75] text-sm font-semibold rounded-lg hover:bg-[#222228] hover:text-[#F0F0F0] transition-colors"
        >
          Retour aux Modules
        </Link>
      </div>
    </div>
  );
}
