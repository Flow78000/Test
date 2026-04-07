"use client";
import { PageHeader, Card } from "@/components/ui/card";

export default function VolDeskPage() {
  return (
    <div className="p-6">
      <PageHeader title="Vol Desk" subtitle="Terminal de volatilite institutionnel" />
      <Card className="p-8 text-center text-[#6B6B75]">
        <p className="text-lg font-semibold mb-2">Vol Desk</p>
        <p className="text-sm">Migration en cours depuis le prototype</p>
      </Card>
    </div>
  );
}
