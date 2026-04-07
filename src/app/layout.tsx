import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FLO.W — Flow Liquidity & Options Warehouse",
  description: "Quant Vol Desk — Dark Pool, GEX, Regime Switching, Sierra Chart Signals",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${outfit.variable} dark`}>
      <body className="min-h-screen bg-[#08080A] text-[#F0F0F0] font-sans">
        <div className="flex h-screen overflow-hidden">
          {/* Sidebar */}
          <nav className="w-56 bg-[#111114] border-r border-[#1E1E22] flex flex-col flex-shrink-0">
            {/* Logo */}
            <div className="p-5 border-b border-[#1E1E22]">
              <h1 className="text-xl font-extrabold tracking-tight">
                FLO<span className="text-[#FF6B00] text-2xl font-black">.</span><span className="text-[#FF6B00]">W</span>
              </h1>
              <p className="text-[9px] text-[#6B6B75] mt-1 uppercase tracking-[2px]">Flow Liquidity & Options Warehouse</p>
            </div>
            {/* Navigation */}
            <div className="flex-1 py-4 overflow-y-auto">
              <NavGroup label="MARCHE">
                <NavItem href="/" label="Dashboard" />
                <NavItem href="/chain" label="Vol Chain" badge="LIVE" />
                <NavItem href="/flow" label="Flow Alerts" badge="LIVE" />
              </NavGroup>
              <NavGroup label="GREEKS">
                <NavItem href="/greeks" label="GEX / Vanna / Charm" badge="LIVE" />
                <NavItem href="/vol-map" label="Vol Map" />
              </NavGroup>
              <NavGroup label="REGIME">
                <NavItem href="/regime" label="Regime Engine" badge="LIVE" />
                <NavItem href="/signals" label="Signaux Sierra" badge="LIVE" />
              </NavGroup>
              <NavGroup label="VOL DESK">
                <NavItem href="/vol-desk" label="Vol Regime" />
                <NavItem href="/term-structure" label="Term Structure" />
                <NavItem href="/vol-cone" label="Vol Cone" />
              </NavGroup>
              <NavGroup label="MACRO">
                <NavItem href="/heatmap" label="Heatmap Secteurs" />
                <NavItem href="/fx-matrix" label="FX Matrix" />
                <NavItem href="/news" label="Fil d'Actu" badge="LIVE" />
                <NavItem href="/earnings" label="Earnings" />
                <NavItem href="/calendrier" label="Calendrier Eco" />
              </NavGroup>
              <NavGroup label="ACADEMIE">
                <NavItem href="/academie" label="Modules" />
                <NavItem href="/academie/volatilite" label="01 — Volatilite" />
                <NavItem href="/academie/rv-spreads" label="02 — RV Spreads" />
                <NavItem href="/academie/dv01" label="03 — DV01 & Taux" />
                <NavItem href="/academie/commodities" label="04 — Commodities" />
                <NavItem href="/academie/gold" label="05 — Gold" />
              </NavGroup>
              <NavGroup label="OUTILS">
                <NavItem href="/spread-calc" label="Calculateur Spread" />
                <NavItem href="/pnl-sim" label="Simulateur P&L" />
              </NavGroup>
            </div>
            {/* Status bar */}
            <div className="p-3 border-t border-[#1E1E22] text-[10px] text-[#6B6B75]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse"></span>
                <span>UW API Connecte</span>
              </div>
            </div>
          </nav>
          {/* Main content */}
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}

function NavGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="px-5 py-1 text-[9px] font-semibold text-[#6B6B75] uppercase tracking-[2px]">{label}</div>
      {children}
    </div>
  );
}

function NavItem({ href, label, badge }: { href: string; label: string; badge?: string }) {
  return (
    <a
      href={href}
      className="flex items-center gap-2 px-5 py-2 text-[13px] text-[#6B6B75] hover:text-[#F0F0F0] hover:bg-[#1A1A1E] transition-colors"
    >
      <span>{label}</span>
      {badge && (
        <span className="flex items-center gap-1 text-[9px] text-[#FF6B00]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B00] animate-pulse"></span>
          {badge}
        </span>
      )}
    </a>
  );
}
