"use client";
import { Card, PageHeader, Badge } from "@/components/ui/card";
import Link from "next/link";

const sections = [
  { num: "01", title: "Gold Fondamentaux", desc: "Offre, demande, reserves banques centrales, ETF flows" },
  { num: "02", title: "Taux Reels & Gold", desc: "TIPS yield, correlation inverse, breakeven inflation" },
  { num: "03", title: "Dollar & Gold", desc: "DXY correlation, real effective exchange rate, safe haven flows" },
  { num: "04", title: "Gold vs Crypto", desc: "Narrative overlap, correlation regime, diversification" },
  { num: "05", title: "XAU/USD Microstructure", desc: "London fix, COMEX vs LBMA, spot vs futures basis" },
  { num: "06", title: "Volatilite & GVZ", desc: "CBOE Gold Volatility Index, term structure, skew" },
  { num: "07", title: "Day Trading Gold", desc: "Sessions (Asia/London/NY), key levels, sizing rules" },
  { num: "08", title: "Strategies Operationnelles", desc: "Breakout, mean reversion, news trading, hedging" },
];

export default function GoldPage() {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-1">
        <Link href="/academie" className="text-[#6B6B75] hover:text-[#FFD54F] text-xs transition-colors">
          Academie
        </Link>
        <span className="text-[#6B6B75] text-xs">/</span>
        <span className="text-xs text-[#FFD54F]">Module 05</span>
      </div>
      <PageHeader
        title="Gold — XAU/USD"
        subtitle="Taux Reels . Dollar . Strategie Day Trading — 12 pages"
      >
        <Badge color="#FFD54F">Institutionnel</Badge>
      </PageHeader>

      <Card className="p-8 mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#FFD54F] opacity-[0.04] rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10 text-center py-8">
          <div className="text-6xl font-black text-[#FFD54F] opacity-20 mb-4">05</div>
          <div className="text-xs text-[#FFD54F] uppercase tracking-[6px] font-semibold mb-3">
            Module en construction
          </div>
          <h2 className="text-xl font-extrabold mb-2">Gold — XAU/USD</h2>
          <p className="text-sm text-[#6B6B75] max-w-lg mx-auto leading-relaxed">
            L&apos;or reste l&apos;actif refuge par excellence. Comprenez les drivers macro (taux reels, dollar),
            la microstructure du marche, et les strategies de day trading appliquees au XAU/USD.
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
              <span className="text-lg font-black text-[#FFD54F]">{s.num}</span>
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
