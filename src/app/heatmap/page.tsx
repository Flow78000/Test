"use client";
import { PageHeader, Card } from "@/components/ui/card";

export default function HeatmapPage() {
  return (
    <div className="p-6">
      <PageHeader title="Heatmap" subtitle="Carte thermique des variations et correlations inter-actifs" />
      <Card className="p-8 text-center text-[#6B6B75]">
        <p className="text-lg font-semibold mb-2">Heatmap</p>
        <p className="text-sm">Migration en cours depuis le prototype</p>
      </Card>
    </div>
  );
}
