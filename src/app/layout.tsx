import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { TopNav } from "./topNav";

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
          <TopNav />
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </body>
    </html>
  );
}
