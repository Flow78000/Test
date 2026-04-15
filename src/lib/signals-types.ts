/**
 * Types TypeScript pour les signaux FLOW (SVI, Range Levels, Range Heatmap).
 * Doit correspondre exactement au JSON produit par Sierra Chart et relaye
 * par le bridge Python (flow_bridge/bridge.py).
 */

export type SVILevel = "low" | "normal" | "high" | "extreme";
export type AssetFamily =
  | "indices"
  | "commodities"
  | "fx"
  | "rates"
  | "agri";

export interface SVIEntry {
  rmc: number;
  current_range: number;
  pct_of_rmc: number;
  level: SVILevel;
}

export interface RangeLevel {
  pct: number;                // -200..200 (exclut 0)
  price: number;
  side: "up" | "down";
}

export interface RangeLevelsEntry {
  open: number;
  current_price: number;
  rmc: number;
  levels: RangeLevel[];
}

export interface HeatmapAsset {
  symbol: string;
  family: AssetFamily;
  pct_vs_rmc: number;
  range_pts: number;
  rmc: number;
}

export interface RangeHeatmapData {
  date: string;
  assets: HeatmapAsset[];
}

export interface SignalsPayload {
  timestamp: string;
  session_date: string;
  svi: Record<string, SVIEntry>;
  range_levels: Record<string, RangeLevelsEntry>;
  range_heatmap: RangeHeatmapData;
}

// --- Helpers de categorisation ---

export function sviColor(pct: number): string {
  if (pct < 50) return "#EF4444"; // rouge
  if (pct < 75) return "#F59E0B"; // orange
  if (pct < 125) return "#10B981"; // vert
  return "#A855F7";               // violet (extension)
}

export function sviLabel(pct: number): string {
  if (pct < 50) return "Tres faible";
  if (pct < 75) return "Faible";
  if (pct < 125) return "Normal";
  if (pct < 175) return "Extension";
  return "Extension extreme";
}

export function heatmapColor(pct: number): string {
  // Palette du brief : <75 rouge, 75-100 jaune, 100-150 vert, >150 violet
  if (pct < 75) return "#C0392B";
  if (pct < 100) return "#F39C12";
  if (pct < 150) return "#27AE60";
  return "#8E44AD";
}

export function heatmapColorSoft(pct: number): string {
  // Version avec transparence pour fond de cellule
  if (pct < 75) return "rgba(192, 57, 43, 0.28)";
  if (pct < 100) return "rgba(243, 156, 18, 0.28)";
  if (pct < 150) return "rgba(39, 174, 96, 0.28)";
  return "rgba(142, 68, 173, 0.32)";
}

export const FAMILY_LABEL: Record<AssetFamily, string> = {
  indices: "Indices",
  commodities: "Commodites",
  fx: "FX",
  rates: "Taux",
  agri: "Agri",
};

export const FAMILY_ORDER: AssetFamily[] = [
  "indices",
  "commodities",
  "fx",
  "rates",
  "agri",
];
