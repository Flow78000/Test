/**
 * FLO.W Shared Formatting Utilities
 * Used across all pages — DO NOT duplicate in page files
 */

export function fmtNum(v: number | null | undefined, decimals = 2): string {
  if (v == null || isNaN(v)) return "--";
  return v.toFixed(decimals);
}

export function fmtPct(v: number | null | undefined, decimals = 1): string {
  if (v == null || isNaN(v)) return "--";
  return (v > 0 ? "+" : "") + v.toFixed(decimals) + "%";
}

export function fmtPremium(v: number | null | undefined): string {
  if (v == null || isNaN(v)) return "--";
  const a = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  if (a >= 1e9) return sign + "$" + (a / 1e9).toFixed(1) + "B";
  if (a >= 1e6) return sign + "$" + (a / 1e6).toFixed(1) + "M";
  if (a >= 1e3) return sign + "$" + (a / 1e3).toFixed(0) + "K";
  return sign + "$" + a.toFixed(0);
}

export function fmtK(v: number | null | undefined): string {
  if (v == null || isNaN(v)) return "--";
  const a = Math.abs(v);
  if (a >= 1e9) return (v / 1e9).toFixed(1) + "B";
  if (a >= 1e6) return (v / 1e6).toFixed(1) + "M";
  if (a >= 1e3) return (v / 1e3).toFixed(1) + "K";
  return v.toFixed(0);
}

export function fmtPrice(v: number | null | undefined): string {
  if (v == null || isNaN(v)) return "--";
  return "$" + v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function timeAgo(ts: string): string {
  if (!ts) return "--";
  const d = new Date(ts);
  if (isNaN(d.getTime())) return "--";
  const now = new Date();
  const min = Math.round((now.getTime() - d.getTime()) / 60000);
  if (min < 0) return "--";
  if (min < 1) return "MAINTENANT";
  if (min < 60) return `il y a ${min}min`;
  if (min < 1440) return `il y a ${Math.round(min / 60)}h`;
  return `il y a ${Math.round(min / 1440)}j`;
}

export function fmtTime(ts: string, tz = "America/New_York"): string {
  try {
    return new Date(ts).toLocaleTimeString("fr-FR", { timeZone: tz, hour: "2-digit", minute: "2-digit" });
  } catch {
    return "--";
  }
}

export function colorByLevel(val: number, low: number, mid: number): string {
  if (val > mid) return "#EF4444";
  if (val > low) return "#FFA726";
  return "#22C55E";
}

export function regimeFromIV(iv: number): { label: string; color: string; advice: string } {
  if (iv > 35) return { label: "CRISE", color: "#FF1744", advice: "Protection maximale — Cash, BTAL, puts deep OTM" };
  if (iv > 25) return { label: "STRESS", color: "#EF4444", advice: "Credit spreads OTM — Ne pas acheter en directionnel" };
  if (iv > 18) return { label: "TRANSITION", color: "#FFA726", advice: "Prudence — Reduire taille, elargir stops" };
  return { label: "CALME", color: "#22C55E", advice: "Conditions stables — Vente de vol, positions directionnelles" };
}
