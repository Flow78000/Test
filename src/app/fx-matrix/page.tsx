"use client";
import { PageHeader, Card } from "@/components/ui/card";

export default function FxMatrixPage() {
  return (
    <div className="p-6">
      <PageHeader title="Matrice FX" subtitle="Correlations et forces relatives des devises majeures" />
      <Card className="p-8 text-center text-[#6B6B75]">
        <p className="text-lg font-semibold mb-2">Matrice FX</p>
        <p className="text-sm">Migration en cours depuis le prototype</p>
      </Card>
    </div>
  );
}
