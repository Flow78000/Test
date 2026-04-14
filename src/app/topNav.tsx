"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UWUsageBar } from "@/components/ui/uw-usage-bar";

const SECTIONS = [
  { id: "LIVE", label: "LIVE", color: "#FF6B00", icon: "●",
    pages: [
      { href: "/", label: "Dashboard" },
      { href: "/chain", label: "Chain" },
      { href: "/flow", label: "Flow" },
      { href: "/greeks", label: "GEX" },
      { href: "/dark-pool", label: "Dark Pool" },
      { href: "/dark-pool-alerts", label: "DP Alerts" },
      { href: "/dark-pool-routing", label: "DP Routing" },
      { href: "/straddle", label: "Straddle" },
    ],
  },
  { id: "REGIME", label: "REGIME", color: "#B388FF", icon: "◆",
    pages: [
      { href: "/regime", label: "Engine" },
      { href: "/signals", label: "Signaux" },
    ],
  },
  { id: "VOL", label: "VOL", color: "#FFA726", icon: "▲",
    pages: [
      { href: "/vol-desk", label: "Desk" },
      { href: "/vol-monitor", label: "Monitor" },
      { href: "/vol-cone", label: "Cone" },
      { href: "/term-structure", label: "Structure" },
      { href: "/vol-map", label: "Map" },
      { href: "/surface", label: "Surface" },
    ],
  },
  { id: "MACRO", label: "MACRO", color: "#42A5F5", icon: "■",
    pages: [
      { href: "/heatmap", label: "Secteurs" },
      { href: "/news", label: "News" },
      { href: "/sentiment", label: "Sentiment" },
      { href: "/earnings", label: "Earnings" },
      { href: "/earnings-history", label: "Earnings Hist." },
      { href: "/calendrier", label: "Calendrier" },
      { href: "/central-banks", label: "Banques C." },
      { href: "/fx-matrix", label: "FX" },
      { href: "/range-dashboard", label: "Ranges" },
      { href: "/floq", label: "FLO.Q" },
      { href: "/systemic-risk", label: "Stress" },
      { href: "/strange-days", label: "Strange Days" },
      { href: "/news-trading", label: "Nanex #1" },
    ],
  },
  { id: "OUTILS", label: "OUTILS", color: "#6B6B75", icon: "⚙",
    pages: [
      { href: "/spread-calc", label: "Calculateur" },
      { href: "/pnl-sim", label: "Option Lab" },
      { href: "/pricing-lab", label: "Pricing Lab" },
      { href: "/spread-gap", label: "Spread Gap" },
      { href: "/messages", label: "Messages" },
      { href: "/ibs", label: "IBS" },
    ],
  },
  { id: "ACADEMIE", label: "ACADEMIE", color: "#F0F0F0", icon: "",
    pages: [
      { href: "/academie", label: "Modules" },
      { href: "/academie/cboe-tickers", label: "CBOE Tickers" },
    ],
  },
] as const;

function getActiveSection(pathname: string): string {
  if (pathname === "/") return "LIVE";
  if (["/chain", "/flow", "/greeks", "/dark-pool", "/dark-pool-alerts", "/dark-pool-routing", "/straddle"].some((p) => pathname.startsWith(p))) return "LIVE";
  if (["/regime", "/signals"].some((p) => pathname.startsWith(p))) return "REGIME";
  if (["/vol-", "/term-", "/surface"].some((p) => pathname.startsWith(p))) return "VOL";
  if (["/heatmap", "/news", "/sentiment", "/earnings", "/calendrier", "/central", "/fx-", "/range", "/floq", "/systemic-risk", "/strange", "/news-trading"].some((p) => pathname.startsWith(p))) return "MACRO";
  if (["/spread", "/pnl", "/pricing-lab", "/messages", "/spread-gap", "/ibs"].some((p) => pathname.startsWith(p))) return "OUTILS";
  if (pathname.startsWith("/academie")) return "ACADEMIE";
  return "LIVE";
}

function getMarketStatus() {
  const now = new Date();
  const et = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const h = et.getHours(), d = et.getDay();
  if (d === 0 || d === 6) return { label: "FERME", color: "#EF4444", pulse: false };
  if (h >= 9 && h < 16) return { label: "OUVERT", color: "#22C55E", pulse: true };
  if (h >= 4 && h < 9) return { label: "PRE-MKT", color: "#FFA726", pulse: true };
  if (h >= 16 && h < 20) return { label: "AFTER-H", color: "#FFA726", pulse: false };
  return { label: "FERME", color: "#EF4444", pulse: false };
}

export function TopNav() {
  const pathname = usePathname();
  const active = getActiveSection(pathname);
  const mkt = getMarketStatus();
  const activeSection = SECTIONS.find((s) => s.id === active);

  return (
    <nav className="flex-shrink-0">
      {/* Level 1 */}
      <div className="h-10 bg-[#0D0D10] border-b border-[#1E1E22] flex items-center px-4 gap-1">
        <Link href="/" className="flex items-center pr-4 mr-2">
          <span className="text-sm font-extrabold tracking-tight">
            FLO<span className="text-[#FF6B00] text-base font-black">.</span>
            <span className="text-[#FF6B00]">W</span>
          </span>
        </Link>

        <div className="flex items-center gap-1">
          {SECTIONS.map((s) => {
            const isActive = active === s.id;
            return (
              <Link
                key={s.id}
                href={s.pages[0].href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold tracking-wide transition-all ${
                  isActive
                    ? "bg-[#FF6B00] text-black font-bold"
                    : "text-[#6B6B75] hover:text-[#F0F0F0] hover:bg-[#1A1A1E]"
                }`}
              >
                {s.icon && <span style={{ color: isActive ? "black" : s.color, fontSize: 8 }}>{s.icon}</span>}
                {s.label}
              </Link>
            );
          })}
        </div>

        <div className="ml-auto flex items-center gap-3 text-[10px]">
          <UWUsageBar />
          <span className="flex items-center gap-1.5 px-2 py-1 rounded-md" style={{ background: `${mkt.color}15`, color: mkt.color }}>
            <span className={`w-1.5 h-1.5 rounded-full ${mkt.pulse ? "animate-pulse" : ""}`} style={{ background: mkt.color }} />
            {mkt.label}
          </span>
          <span className="flex items-center gap-1.5 text-[#6B6B75]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
            API
          </span>
        </div>
      </div>

      {/* Level 2 */}
      {activeSection && (
        <div className="h-8 bg-[#111114] border-b border-[#1E1E22] flex items-center px-4 gap-1">
          {activeSection.pages.map((p) => {
            const isActivePage = pathname === p.href || (p.href !== "/" && pathname.startsWith(p.href));
            return (
              <Link
                key={p.href}
                href={p.href}
                className={`px-3 py-1 text-[11px] font-medium transition-all rounded-sm ${
                  isActivePage
                    ? "text-[#FF6B00] border-b-2 border-[#FF6B00]"
                    : "text-[#6B6B75] hover:text-[#F0F0F0]"
                }`}
              >
                {p.label}
              </Link>
            );
          })}
        </div>
      )}
    </nav>
  );
}
