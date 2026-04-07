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
            <div className="flex items-center gap-0 px-5 h-14">
              {/* Logo */}
              <a href="/" className="flex items-center gap-1 pr-6 border-r border-[#1E1E22] mr-2">
                <span className="text-base font-extrabold tracking-tight">
                  FLO<span className="text-[#FF6B00] text-lg font-black">.</span><span className="text-[#FF6B00]">W</span>
                </span>
              </a>
              {/* Main nav tabs */}
              <NavTab href="/" label="Dashboard" />
              <NavTab href="/chain" label="Vol Chain" badge="LIVE" />
              <NavTab href="/flow" label="Flow" badge="LIVE" />
              <NavTab href="/greeks" label="Greeks" badge="LIVE" />
              <NavTab href="/regime" label="Regime" badge="LIVE" />
              <NavTab href="/signals" label="Signaux" badge="LIVE" />
              <span className="w-px h-5 bg-[#1E1E22] mx-1" />
              <NavTab href="/vol-desk" label="Vol Desk" />
              <NavTab href="/term-structure" label="Term Struct." />
              <NavTab href="/vol-cone" label="Vol Cone" />
              <span className="w-px h-5 bg-[#1E1E22] mx-1" />
              <NavTab href="/heatmap" label="Heatmap" />
              <NavTab href="/news" label="News" badge="LIVE" />
              <NavTab href="/earnings" label="Earnings" />
              <NavTab href="/calendrier" label="Calendrier" />
              <span className="w-px h-5 bg-[#1E1E22] mx-1" />
              <NavTab href="/academie" label="Academie" />
              <NavTab href="/vol-map" label="Vol Map" />
              <NavTab href="/spread-calc" label="Calc" />
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
      className="flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium text-[#6B6B75] hover:text-[#F0F0F0] hover:bg-[#1A1A1E] transition-colors rounded whitespace-nowrap"
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
