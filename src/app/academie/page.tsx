"use client";
import { Card, PageHeader } from "@/components/ui/card";
import Link from "next/link";

const modules = [
  {
    id: "volatilite",
    num: "01",
    title: "Indices de Volatilite",
    subtitle: "VIX . MOVE . SKEW . VVIX . Term Structure . VRP",
    level: "Institutionnel",
    pages: 12,
    color: "#FF6B00",
    status: "available",
  },
  {
    id: "rv-spreads",
    num: "02",
    title: "Relative Value & Spreads",
    subtitle: "Basis . CTD . Butterfly . Credit . Cross-Asset",
    level: "Institutionnel",
    pages: 14,
    color: "#42A5F5",
    status: "coming",
  },
  {
    id: "dv01",
    num: "03",
    title: "DV01 . Variance . Valeur Neutre",
    subtitle: "Duration . Hedging . Spreads Taux",
    level: "Institutionnel",
    pages: 14,
    color: "#B388FF",
    status: "coming",
  },
  {
    id: "commodities",
    num: "04",
    title: "Commodities Basics",
    subtitle: "Physique . Futures . Contango . Spreads",
    level: "Institutionnel",
    pages: 10,
    color: "#FFA726",
    status: "coming",
  },
  {
    id: "gold",
    num: "05",
    title: "Gold — XAU/USD",
    subtitle: "Taux Reels . Dollar . Strategie Day Trading",
    level: "Institutionnel",
    pages: 12,
    color: "#FFD54F",
    status: "coming",
  },
];

export default function AcademiePage() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        title="FLO.W Academie"
        subtitle="Programme Traders Professionnels — Phidias 2026"
      />

      {/* Hero banner */}
      <Card className="p-8 mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#FF6B00] opacity-[0.03] rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10">
          <div className="text-[10px] text-[#FF6B00] uppercase tracking-[4px] font-semibold mb-3">
            Formation Institutionnelle
          </div>
          <h2 className="text-2xl font-extrabold mb-2">
            5 Modules . 62 Pages . 1 Objectif
          </h2>
          <p className="text-sm text-[#6B6B75] max-w-2xl leading-relaxed">
            Maitrisez les concepts utilises par les desks institutionnels : volatilite implicite,
            term structure, spreads relatifs, duration, commodities et metaux precieux.
            Chaque module est construit pour etre actionnable en trading reel.
          </p>
          <div className="flex items-center gap-4 mt-5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#22C55E]" />
              <span className="text-xs text-[#6B6B75]">1 module disponible</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#FF6B00]" />
              <span className="text-xs text-[#6B6B75]">4 en construction</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Module grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {modules.map((m) => (
          <Link key={m.id} href={`/academie/${m.id}`}>
            <Card hover className="p-6 h-full relative overflow-hidden group">
              {/* Decorative corner */}
              <div
                className="absolute top-0 right-0 w-20 h-20 opacity-[0.06] rounded-bl-3xl transition-opacity group-hover:opacity-[0.12]"
                style={{ backgroundColor: m.color }}
              />

              <div className="relative z-10">
                <div
                  className="text-4xl font-black mb-3 transition-transform group-hover:translate-x-1"
                  style={{ color: m.color }}
                >
                  {m.num}
                </div>
                <div className="text-base font-bold mb-1">{m.title}</div>
                <div className="text-xs text-[#6B6B75] mb-4 leading-relaxed">
                  {m.subtitle}
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span
                    className="px-2 py-0.5 rounded font-semibold"
                    style={{
                      background: `${m.color}15`,
                      color: m.color,
                    }}
                  >
                    {m.level}
                  </span>
                  <span className="text-[#6B6B75]">{m.pages} pages</span>
                  {m.status === "coming" && (
                    <span className="text-[#6B6B75] italic ml-auto text-[10px]">
                      Bientot
                    </span>
                  )}
                  {m.status === "available" && (
                    <span className="text-[#22C55E] ml-auto text-[10px] font-semibold uppercase tracking-wider">
                      Disponible
                    </span>
                  )}
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
