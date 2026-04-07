"use client";
import { PageHeader, Card } from "@/components/ui/card";

export default function NewsPage() {
  return (
    <div className="p-6">
      <PageHeader title="Actualites" subtitle="Flux d'actualites macro et micro — impact marche en temps reel" />
      <Card className="p-8 text-center text-[#6B6B75]">
        <p className="text-lg font-semibold mb-2">Actualites</p>
        <p className="text-sm">Migration en cours depuis le prototype</p>
      </Card>
    </div>
  );
}
