"use client";
import { PageHeader, Card } from "@/components/ui/card";

export default function TermStructurePage() {
  return (
    <div className="p-6">
      <PageHeader title="Structure de Terme" subtitle="Courbe de volatilite par echeance — VIX futures et options" />
      <Card className="p-8 text-center text-[#6B6B75]">
        <p className="text-lg font-semibold mb-2">Structure de Terme</p>
        <p className="text-sm">Migration en cours depuis le prototype</p>
      </Card>
    </div>
  );
}
