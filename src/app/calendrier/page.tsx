"use client";
import { PageHeader, Card } from "@/components/ui/card";

export default function CalendrierPage() {
  return (
    <div className="p-6">
      <PageHeader title="Calendrier Economique" subtitle="Evenements macro, FOMC, NFP, CPI et publications cles" />
      <Card className="p-8 text-center text-[#6B6B75]">
        <p className="text-lg font-semibold mb-2">Calendrier Economique</p>
        <p className="text-sm">Migration en cours depuis le prototype</p>
      </Card>
    </div>
  );
}
