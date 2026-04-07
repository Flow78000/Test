"use client";
import { Card, PageHeader, Badge } from "@/components/ui/card";
import Link from "next/link";

const sections = [
  { num: "01", title: "Basis Trading", desc: "Cash vs Futures, cost of carry, convergence mechanics" },
  { num: "02", title: "Cheapest-to-Deliver (CTD)", desc: "Bond futures delivery, conversion factors, switch risk" },
  { num: "03", title: "Calendar Spreads", desc: "Roll dynamics, contango/backwardation exploitation" },
  { num: "04", title: "Butterfly Spreads", desc: "Curvature trades, belly vs wings, regime sensitivity" },
  { num: "05", title: "Credit Spreads", desc: "IG vs HY, CDS basis, spread compression/decompression" },
  { num: "06", title: "Cross-Asset RV", desc: "Equity vs credit, FX carry, commodity inter-market" },
  { num: "07", title: "Pairs Trading", desc: "Cointegration, z-score, mean reversion pairs" },
  { num: "08", title: "Risk Management RV", desc: "DV01 neutrality, beta hedging, correlation risk" },
];

export default function RVSpreadsPage() {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-1">
        <Link href="/academie" className="text-[#6B6B75] hover:text-[#42A5F5] text-xs transition-colors">
          Academie
        </Link>
        <span className="text-[#6B6B75] text-xs">/</span>
        <span className="text-xs text-[#42A5F5]">Module 02</span>
      </div>
      <PageHeader
        title="Relative Value & Spreads"
        subtitle="Basis . CTD . Butterfly . Credit . Cross-Asset — 14 pages"
      >
        <Badge color="#42A5F5">Institutionnel</Badge>
      </PageHeader>

      {/* Coming soon hero */}
      <Card className="p-8 mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#42A5F5] opacity-[0.04] rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10 text-center py-8">
          <div className="text-6xl font-black text-[#42A5F5] opacity-20 mb-4">02</div>
          <div className="text-xs text-[#42A5F5] uppercase tracking-[6px] font-semibold mb-3">
            Module en construction
          </div>
          <h2 className="text-xl font-extrabold mb-2">Relative Value & Spreads</h2>
          <p className="text-sm text-[#6B6B75] max-w-lg mx-auto leading-relaxed">
            Maitrisez les strategies de valeur relative utilisees par les desks institutionnels.
            Du basis trading au butterfly, en passant par les spreads de credit cross-asset.
          </p>
        </div>
      </Card>

      {/* Section outline */}
      <div className="text-xs text-[#6B6B75] uppercase tracking-[3px] font-semibold mb-4">
        Sommaire du Module
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {sections.map((s) => (
          <Card key={s.num} className="p-5 opacity-60">
            <div className="flex items-start gap-3">
              <span className="text-lg font-black text-[#42A5F5]">{s.num}</span>
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
