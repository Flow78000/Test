"use client";
import { PageHeader, Card } from "@/components/ui/card";

export default function EarningsPage() {
  return (
    <div className="p-6">
      <PageHeader title="Resultats Financiers" subtitle="Calendrier des earnings et surprises de resultats" />
      <Card className="p-8 text-center text-[#6B6B75]">
        <p className="text-lg font-semibold mb-2">Resultats Financiers</p>
        <p className="text-sm">Migration en cours depuis le prototype</p>
      </Card>
    </div>
  );
}
