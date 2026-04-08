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
            {/* Row 1: Logo + Main tabs */}
            <div className="flex items-center gap-0 px-4 h-12">
              {/* Logo */}
              <a href="/" className="flex items-center gap-1 pr-6 border-r border-[#1E1E22] mr-2">
                <span className="text-base font-extrabold tracking-tight">
                  FLO<span className="text-[#FF6B00] text-lg font-black">.</span><span className="text-[#FF6B00]">W</span>
                </span>
              </a>
              {/* Main nav tabs */}
              <NavTab href="/" label="Dash" />
              <NavTab href="/chain" label="Chain" badge="LIVE" />
              <NavTab href="/flow" label="Flow" badge="LIVE" />
              <NavTab href="/greeks" label="GEX" badge="LIVE" />
              <NavTab href="/regime" label="Regime" badge="LIVE" />
              <NavTab href="/signals" label="Signaux" badge="LIVE" />
              <span className="w-px h-4 bg-[#1E1E22] mx-0.5" />
              <NavTab href="/vol-desk" label="Vol" />
              <NavTab href="/vol-cone" label="Cone" />
              <NavTab href="/term-structure" label="TS" />
              <NavTab href="/range-dashboard" label="Ranges" />
              <span className="w-px h-4 bg-[#1E1E22] mx-0.5" />
              <NavTab href="/heatmap" label="Sectors" />
              <NavTab href="/news" label="News" badge="LIVE" />
              <NavTab href="/earnings" label="Earn." />
              <NavTab href="/calendrier" label="Cal." />
              <NavTab href="/central-banks" label="CB" />
              <span className="w-px h-4 bg-[#1E1E22] mx-0.5" />
              <NavTab href="/vol-map" label="Map" />
              <NavTab href="/academie" label="Acad." />
              {/* Status */}
              <div className="ml-auto flex items-center gap-2 text-[10px] text-[#6B6B75]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
                <span>Connecte</span>
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
