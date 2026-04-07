"use client";
import { PageHeader, Card } from "@/components/ui/card";

export default function PnlSimPage() {
  return (
    <div className="p-6">
      <PageHeader title="Simulateur P&L" subtitle="Projection de gains et pertes selon les scenarios de marche" />
      <Card className="p-8 text-center text-[#6B6B75]">
        <p className="text-lg font-semibold mb-2">Simulateur P&L</p>
        <p className="text-sm">Migration en cours depuis le prototype</p>
      </Card>
    </div>
  );
}
