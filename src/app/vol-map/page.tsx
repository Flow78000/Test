"use client";
import { PageHeader, Card } from "@/components/ui/card";

export default function VolMapPage() {
  return (
    <div className="p-6">
      <PageHeader title="Carte de Volatilite" subtitle="Surface de volatilite 3D — smile, skew et terme par strike" />
      <Card className="p-8 text-center text-[#6B6B75]">
        <p className="text-lg font-semibold mb-2">Carte de Volatilite</p>
        <p className="text-sm">Migration en cours depuis le prototype</p>
      </Card>
    </div>
  );
}
