"use client";
import { Card, PageHeader, Badge } from "@/components/ui/card";
import Link from "next/link";

const sections = [
  { num: "01", title: "Marche Physique vs Papier", desc: "Spot, forwards, futures — la chaine de valeur" },
  { num: "02", title: "Contango & Backwardation", desc: "Cost of carry, convenience yield, storage economics" },
  { num: "03", title: "Roll Yield", desc: "Impact du roll sur les ETF/ETN, contango bleed, timing" },
  { num: "04", title: "Crude Oil (CL)", desc: "WTI vs Brent spread, inventories, OPEC dynamics" },
  { num: "05", title: "Natural Gas (NG)", desc: "Seasonality, storage reports, weather premium" },
  { num: "06", title: "Agricultural Commodities", desc: "Crop cycles, WASDE reports, seasonal patterns" },
  { num: "07", title: "Commodity Spreads", desc: "Crack spread, crush spread, spark spread" },
  { num: "08", title: "Trading Pratique", desc: "Sizing, margins, roll dates, position management" },
];

export default function CommoditiesPage() {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-1">
        <Link href="/academie" className="text-[#6B6B75] hover:text-[#FFA726] text-xs transition-colors">
          Academie
        </Link>
        <span className="text-[#6B6B75] text-xs">/</span>
        <span className="text-xs text-[#FFA726]">Module 04</span>
      </div>
      <PageHeader
        title="Commodities Basics"
        subtitle="Physique . Futures . Contango . Spreads — 10 pages"
      >
        <Badge color="#FFA726">Institutionnel</Badge>
      </PageHeader>

      <Card className="p-8 mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#FFA726] opacity-[0.04] rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10 text-center py-8">
          <div className="text-6xl font-black text-[#FFA726] opacity-20 mb-4">04</div>
          <div className="text-xs text-[#FFA726] uppercase tracking-[6px] font-semibold mb-3">
            Module en construction
          </div>
          <h2 className="text-xl font-extrabold mb-2">Commodities Basics</h2>
          <p className="text-sm text-[#6B6B75] max-w-lg mx-auto leading-relaxed">
            Comprendre les marches de matieres premieres : de la dynamique physique aux futures,
            en passant par les spreads inter-commodity et le roll yield.
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
              <span className="text-lg font-black text-[#FFA726]">{s.num}</span>
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
