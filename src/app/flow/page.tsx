"use client";
import { PageHeader, Card } from "@/components/ui/card";

export default function FlowPage() {
  return (
    <div className="p-6">
      <PageHeader title="Flow d'Options" subtitle="Flux institutionnels — sweeps, blocs et activite inhabituelle" />
      <Card className="p-8 text-center text-[#6B6B75]">
        <p className="text-lg font-semibold mb-2">Flow d'Options</p>
        <p className="text-sm">Migration en cours depuis le prototype</p>
      </Card>
    </div>
  );
}
