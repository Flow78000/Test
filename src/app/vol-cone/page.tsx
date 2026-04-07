"use client";
import { PageHeader, Card } from "@/components/ui/card";

export default function VolConePage() {
  return (
    <div className="p-6">
      <PageHeader title="Cone de Volatilite" subtitle="Percentiles historiques de volatilite realisee vs implicite" />
      <Card className="p-8 text-center text-[#6B6B75]">
        <p className="text-lg font-semibold mb-2">Cone de Volatilite</p>
        <p className="text-sm">Migration en cours depuis le prototype</p>
      </Card>
    </div>
  );
}
