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
        <div className="flex flex-col h-screen overflow-hidden">
          {/* Top Navigation Bar */}
          <nav className="bg-[#111114] border-b border-[#1E1E22] flex-shrink-0">
            <div className="flex items-center gap-0 px-4 h-12">
              {/* Logo */}
              <a href="/" className="flex items-center gap-1 pr-4 border-r border-[#1E1E22] mr-1">
                <span className="text-sm font-extrabold tracking-tight">
                  FLO<span className="text-[#FF6B00] text-base font-black">.</span><span className="text-[#FF6B00]">W</span>
                </span>
              </a>

              {/* Group 1: LIVE TRADING */}
              <span className="text-[8px] text-[#FF6B00] font-bold uppercase tracking-[1.5px] px-2">LIVE</span>
              <NavTab href="/chain" label="Chain" badge="LIVE" />
              <NavTab href="/flow" label="Flow" badge="LIVE" />
              <NavTab href="/greeks" label="GEX" badge="LIVE" />
              <NavTab href="/dark-pool" label="Dark Pool" badge="LIVE" />

              <span className="w-px h-5 bg-[#1E1E22] mx-1" />

              {/* Group 2: REGIME */}
              <span className="text-[8px] text-[#B388FF] font-bold uppercase tracking-[1.5px] px-2">REGIME</span>
              <NavTab href="/regime" label="Engine" badge="LIVE" />
              <NavTab href="/signals" label="Signaux" badge="LIVE" />

              <span className="w-px h-5 bg-[#1E1E22] mx-1" />

              {/* Group 3: VOLATILITE */}
              <span className="text-[8px] text-[#FFA726] font-bold uppercase tracking-[1.5px] px-2">VOL</span>
              <NavTab href="/vol-desk" label="Desk" />
              <NavTab href="/vol-cone" label="Cone" />
              <NavTab href="/term-structure" label="TS" />
              <NavTab href="/vol-map" label="Map" />
              <NavTab href="/surface" label="Surface" />

              <span className="w-px h-5 bg-[#1E1E22] mx-1" />

              {/* Group 4: MACRO */}
              <span className="text-[8px] text-[#42A5F5] font-bold uppercase tracking-[1.5px] px-2">MACRO</span>
              <NavTab href="/heatmap" label="Sectors" />
              <NavTab href="/news" label="News" badge="LIVE" />
              <NavTab href="/earnings" label="Earn." />
              <NavTab href="/calendrier" label="Cal." />
              <NavTab href="/central-banks" label="CB" />
              <NavTab href="/fx-matrix" label="FX" />

              <span className="w-px h-5 bg-[#1E1E22] mx-1" />

              {/* Group 5: TOOLS */}
              <span className="text-[8px] text-[#6B6B75] font-bold uppercase tracking-[1.5px] px-2">OUTILS</span>
              <NavTab href="/spread-calc" label="Calc" />
              <NavTab href="/pnl-sim" label="P&L" />
              <NavTab href="/range-dashboard" label="Ranges" />
              <NavTab href="/academie" label="Acad." />

              {/* Status */}
              <div className="ml-auto flex items-center gap-2 text-[10px] text-[#6B6B75]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
                <span>OK</span>
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

function NavTab({ href, label, badge }: { href: string; label: string; badge?: string }) {
  return (
    <a
      href={href}
      className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-[#6B6B75] hover:text-[#F0F0F0] hover:bg-[#1A1A1E] border border-transparent hover:border-[#2A2A30] transition-all rounded-md whitespace-nowrap"
    >
      <span>{label}</span>
      {badge && (
        <span className="flex items-center gap-0.5 text-[8px] text-[#FF6B00]">
          <span className="w-1 h-1 rounded-full bg-[#FF6B00] animate-pulse" />
        </span>
      )}
    </a>
  );
}
