export default function Dashboard() {
  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <h1 className="text-2xl font-extrabold">
          FLO<span className="text-[#FF6B00] text-3xl font-black">.</span><span className="text-[#FF6B00]">W</span>
          <span className="text-[#6B6B75] text-lg font-normal ml-3">Dashboard</span>
        </h1>
        <div className="ml-auto flex items-center gap-3">
          <span className="flex items-center gap-2 text-xs text-[#6B6B75]">
            <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse"></span>
            Connecte
          </span>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <KpiCard label="VIX" value="--" sublabel="Regime" />
        <KpiCard label="VIX9D" value="--" sublabel="Court Terme" />
        <KpiCard label="VVIX" value="--" sublabel="Vol de Vol" />
        <KpiCard label="SKEW" value="--" sublabel="Tail Risk" />
      </div>

      {/* Regime Badge */}
      <div className="bg-[#111114] border border-[#1E1E22] rounded-xl p-8 text-center mb-6">
        <div className="text-5xl font-black tracking-wider text-[#6B6B75] mb-2">EN ATTENTE</div>
        <div className="text-lg font-semibold text-[#6B6B75]">Lancez le serveur pour activer le dashboard</div>
        <div className="mt-4 text-sm text-[#6B6B75] font-mono bg-[#08080A] rounded-lg p-4 inline-block">
          cd D:\flo-w && python server.py
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-3 gap-4">
        <QuickLink href="/chain" title="Vol Chain" desc="Options chain institutionnelle — GEX, Vanna, Greeks par strike" />
        <QuickLink href="/regime" title="Regime Engine" desc="DPSS + GEX + Flow Score — 4 regimes de marche" />
        <QuickLink href="/signals" title="Signaux Sierra" desc="Mean reversion, vol synthetique — 12 actifs" />
      </div>
    </div>
  );
}

function KpiCard({ label, value, sublabel }: { label: string; value: string; sublabel: string }) {
  return (
    <div className="bg-[#111114] border border-[#1E1E22] rounded-xl p-4 text-center">
      <div className="text-[10px] text-[#6B6B75] uppercase tracking-widest mb-1">{label}</div>
      <div className="text-2xl font-extrabold font-mono text-[#FF6B00]">{value}</div>
      <div className="text-[10px] text-[#6B6B75] mt-1">{sublabel}</div>
    </div>
  );
}

function QuickLink({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <a
      href={href}
      className="bg-[#111114] border border-[#1E1E22] rounded-xl p-5 hover:border-[#FF6B00] hover:bg-[#16161A] transition-all group"
    >
      <div className="text-base font-bold group-hover:text-[#FF6B00] transition-colors">{title}</div>
      <div className="text-xs text-[#6B6B75] mt-2 leading-relaxed">{desc}</div>
    </a>
  );
}
