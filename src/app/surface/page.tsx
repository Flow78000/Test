"use client";

import { useState, useMemo } from "react";
import { Card, PageHeader, Badge, LiveBadge } from "@/components/ui/card";
import { RefreshTimer } from "@/components/ui/refresh-timer";
import { VolSurface3D } from "@/components/ui/vol-surface-3d";
import { useApiQueryStrict } from "@/lib/use-api-query";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine,
} from "recharts";

const API = "http://localhost:3850";
const WATCHLIST = ["SPY", "QQQ", "IWM", "DIA", "AAPL", "NVDA", "TSLA", "GLD", "TLT"];

interface AtmRow {
  dte: string;
  iv: number | null;
  samples: number;
}
interface SkewRow {
  dte: string;
  put_iv: number | null;
  call_iv: number | null;
  skew: number | null;
}
interface Stats {
  min_iv: number;
  max_iv: number;
  avg_iv: number;
  total_contracts: number;
  total_raw_contracts: number;
}
interface SurfaceResponse {
  ok: boolean;
  ticker: string;
  spot: number;
  vix: number;
  atm: number;
  moneyness: string[];
  dtes: string[];
  surface: (number | null)[][];
  sample_size: number[][];
  atm_term: AtmRow[];
  skew_25d: SkewRow[];
  stats: Stats;
  generated_at: string;
  error?: string;
}

/* ── IV color scale — auto range ── */
function ivColor(v: number | null, min: number, max: number): string {
  if (v === null) return "#1A1A1E";
  if (max <= min) return "#FFA726";
  const t = Math.max(0, Math.min(1, (v - min) / (max - min)));
  // blue -> green -> orange -> red
  if (t < 0.25) return "#42A5F5";
  if (t < 0.5) return "#66BB6A";
  if (t < 0.75) return "#FFA726";
  if (t < 0.9) return "#FF7043";
  return "#EF4444";
}

function IvCell({ v, n, min, max }: { v: number | null; n: number; min: number; max: number }) {
  const color = ivColor(v, min, max);
  return (
    <td
      className="p-1.5 text-center text-[11px] font-mono border border-[#1E1E22]"
      style={{
        color: v === null ? "#6B6B75" : color,
        backgroundColor: v === null ? "#0D0D10" : `${color}15`,
      }}
      title={`IV ${v?.toFixed(2) ?? "--"}% (${n} contrats)`}
    >
      {v === null ? "—" : v.toFixed(1)}
    </td>
  );
}

export default function SurfacePage() {
  const [ticker, setTicker] = useState("SPY");

  // React Query: result is cached for the QueryClient lifetime, persists across
  // navigations, and is shared with the hover-prefetch fired from TopNav.
  const q = useApiQueryStrict<SurfaceResponse>(
    ["vol-surface", ticker],
    `/api/uw/vol-surface?ticker=${ticker}`,
    {
      refetchInterval: 60_000,
      // Keep showing the previous ticker's data while a new one loads instead
      // of flashing a blank "Construction..." screen.
      placeholderData: (prev) => prev,
    },
  );

  const data = q.data ?? null;
  const loading = q.isLoading;       // true only on the very first request, no prev data
  const error = q.error?.message ?? null;

  const atmChartData =
    data?.atm_term
      .filter((a) => a.iv !== null)
      .map((a) => ({
        dte: Number(a.dte),
        iv: a.iv,
        samples: a.samples,
      })) || [];

  const skewChartData =
    data?.skew_25d
      .filter((s) => s.skew !== null)
      .map((s) => ({
        dte: Number(s.dte),
        skew: s.skew,
        put: s.put_iv,
        call: s.call_iv,
      })) || [];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        timer={<RefreshTimer intervalSeconds={60} />}
        title="Surface Volatilite"
        subtitle="IV surface reelle — smile, term structure, skew 25 delta"
      >
        <select
          value={ticker}
          onChange={(e) => setTicker(e.target.value)}
          className="bg-[#111114] border border-[#1E1E22] rounded-lg px-3 py-1.5 text-xs text-white"
        >
          {WATCHLIST.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <LiveBadge />
      </PageHeader>

      {/* Non-blocking refresh indicator: keeps current data visible while refetching */}
      {q.isFetching && data && (
        <div className="absolute top-2 right-4 z-50 flex items-center gap-1.5 text-[10px] text-[#FF6B00] bg-[#FF6B0010] border border-[#FF6B0033] px-2 py-0.5 rounded">
          <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B00] animate-pulse" />
          REFRESH
        </div>
      )}

      {loading && !data ? (
        <Card className="p-12 text-center text-[#6B6B75]">
          Construction de la surface IV pour {ticker}...
        </Card>
      ) : error && !data ? (
        <Card className="p-12 text-center text-[#6B6B75]">
          <span className="text-[#FF6B00] font-semibold">Erreur</span>
          <div className="text-xs mt-2">{error}</div>
        </Card>
      ) : data ? (
        <>
          {/* Market snapshot KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mb-4">
            <Card className="p-3">
              <div className="text-[9px] uppercase text-[#6B6B75]">Ticker</div>
              <div className="text-xl font-extrabold font-mono text-[#FF6B00]">{data.ticker}</div>
            </Card>
            <Card className="p-3">
              <div className="text-[9px] uppercase text-[#6B6B75]">Spot</div>
              <div className="text-xl font-extrabold font-mono text-[#F0F0F0]">
                ${data.spot.toFixed(2)}
              </div>
            </Card>
            <Card className="p-3">
              <div className="text-[9px] uppercase text-[#6B6B75]">VIX</div>
              <div className="text-xl font-extrabold font-mono text-[#FFA726]">
                {data.vix.toFixed(2)}
              </div>
            </Card>
            <Card className="p-3">
              <div className="text-[9px] uppercase text-[#6B6B75]">IV moyen</div>
              <div className="text-xl font-extrabold font-mono text-[#42A5F5]">
                {data.stats.avg_iv.toFixed(1)}%
              </div>
            </Card>
            <Card className="p-3">
              <div className="text-[9px] uppercase text-[#6B6B75]">IV range</div>
              <div className="text-xl font-extrabold font-mono text-[#B388FF]">
                {data.stats.min_iv.toFixed(0)}–{data.stats.max_iv.toFixed(0)}%
              </div>
            </Card>
            <Card className="p-3">
              <div className="text-[9px] uppercase text-[#6B6B75]">Contrats</div>
              <div className="text-xl font-extrabold font-mono text-[#F0F0F0]">
                {data.stats.total_contracts}
              </div>
              <div className="text-[9px] text-[#6B6B75]">/ {data.stats.total_raw_contracts}</div>
            </Card>
          </div>

          {/* IV Surface 3D interactive (Plotly) */}
          <Card className="p-4 mb-4">
            <h2 className="text-sm font-bold text-[#FFA726] uppercase tracking-wider mb-2">
              Surface de Volatilite 3D — {data.ticker}
            </h2>
            <p className="text-xs text-[#6B6B75] mb-3">
              Surface interactive temps reel — cliquez-glissez pour tourner, molette pour zoomer,
              shift+glisser pour panner. X = DTE (jours avant expiration), Y = Moneyness
              (strike/spot, 100% = ATM), Z = IV. Surface construite a partir des option-contracts
              Unusual Whales.
            </p>
            <VolSurface3D
              ticker={data.ticker}
              spot={data.spot}
              moneyness={data.moneyness}
              dtes={data.dtes}
              surface={data.surface}
              height={580}
            />
          </Card>

          {/* IV Surface heatmap 2D */}
          <Card className="p-4 mb-4">
            <h2 className="text-sm font-bold text-[#FFA726] uppercase tracking-wider mb-2">
              Implied Volatility Surface — {data.ticker}
            </h2>
            <p className="text-xs text-[#6B6B75] mb-4">
              IV reelle par moneyness (strike/spot) et echeance (DTE). Les colonnes sont les
              jours avant expiration. Lignes = strike relatif au spot (100% = ATM). Le smile est
              visible : IV elevee sur les puts OTM (ailes gauches) et OTM calls (ailes droites).
            </p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-[#1E1E22]">
                    <th className="text-left p-2 text-[#6B6B75] text-[10px] uppercase tracking-wide">
                      Moneyness
                    </th>
                    {data.dtes.map((d) => (
                      <th
                        key={d}
                        className="text-center p-2 text-[#6B6B75] text-[10px] uppercase tracking-wide"
                      >
                        {d}d
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.moneyness.map((m, i) => (
                    <tr key={m} className={m === "100%" ? "bg-[#FFA72608]" : ""}>
                      <td
                        className={`p-2 text-[11px] font-mono font-bold ${
                          m === "100%" ? "text-[#FFA726]" : "text-[#6B6B75]"
                        }`}
                      >
                        {m}
                      </td>
                      {data.surface[i].map((v, j) => (
                        <IvCell
                          key={j}
                          v={v}
                          n={data.sample_size[i][j]}
                          min={data.stats.min_iv}
                          max={data.stats.max_iv}
                        />
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center gap-3 mt-3 text-[10px] text-[#6B6B75]">
              <span>Echelle:</span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-2 rounded-sm" style={{ backgroundColor: "#42A5F5" }} /> bas
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-2 rounded-sm" style={{ backgroundColor: "#66BB6A" }} /> bas+
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-2 rounded-sm" style={{ backgroundColor: "#FFA726" }} /> moy
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-2 rounded-sm" style={{ backgroundColor: "#FF7043" }} /> haut
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-2 rounded-sm" style={{ backgroundColor: "#EF4444" }} /> haut+
              </span>
              <span className="ml-auto">
                Genere {new Date(data.generated_at).toLocaleTimeString("fr-FR")}
              </span>
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* ATM Term Structure */}
            <Card className="p-4">
              <h3 className="text-xs font-bold text-[#42A5F5] uppercase tracking-wider mb-2">
                Term Structure ATM
              </h3>
              <p className="text-[10px] text-[#6B6B75] mb-3">
                IV des options ATM (±3% du spot) par echeance. Pente haussiere = contango
                (normal) / pente baissiere = backwardation (stress).
              </p>
              {atmChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={atmChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E1E22" />
                    <XAxis dataKey="dte" tick={{ fill: "#6B6B75", fontSize: 10 }} label={{ value: "DTE", fill: "#6B6B75", fontSize: 10, position: "insideBottom", offset: -4 }} />
                    <YAxis tick={{ fill: "#6B6B75", fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#111114",
                        border: "1px solid #1E1E22",
                        borderRadius: 8,
                        fontSize: 11,
                      }}
                    />
                    <ReferenceLine y={data.vix} stroke="#FFA726" strokeDasharray="3 3" label={{ value: `VIX ${data.vix.toFixed(1)}`, fill: "#FFA726", fontSize: 9 }} />
                    <Line
                      dataKey="iv"
                      stroke="#42A5F5"
                      strokeWidth={2}
                      dot={{ r: 4, fill: "#42A5F5" }}
                      name="IV ATM"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-8 text-[#6B6B75] text-xs">
                  Pas assez de samples ATM
                </div>
              )}
            </Card>

            {/* 25d Skew */}
            <Card className="p-4">
              <h3 className="text-xs font-bold text-[#B388FF] uppercase tracking-wider mb-2">
                Skew 25-Delta (Put - Call)
              </h3>
              <p className="text-[10px] text-[#6B6B75] mb-3">
                Ecart IV entre puts OTM ~5% et calls OTM ~5%. Un skew positif indique que les
                puts sont plus chers (demande de protection).
              </p>
              {skewChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={skewChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E1E22" />
                    <XAxis dataKey="dte" tick={{ fill: "#6B6B75", fontSize: 10 }} />
                    <YAxis tick={{ fill: "#6B6B75", fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#111114",
                        border: "1px solid #1E1E22",
                        borderRadius: 8,
                        fontSize: 11,
                      }}
                    />
                    <ReferenceLine y={0} stroke="#6B6B75" />
                    <Line dataKey="put" stroke="#EF4444" strokeWidth={1.5} dot={{ r: 3, fill: "#EF4444" }} name="Put IV" />
                    <Line dataKey="call" stroke="#22C55E" strokeWidth={1.5} dot={{ r: 3, fill: "#22C55E" }} name="Call IV" />
                    <Line dataKey="skew" stroke="#B388FF" strokeWidth={2} dot={{ r: 4, fill: "#B388FF" }} name="Skew" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-8 text-[#6B6B75] text-xs">
                  Pas assez de samples OTM
                </div>
              )}
            </Card>
          </div>

          {/* Educational panel — kept */}
          <Card className="p-5 mb-4">
            <h2 className="text-sm font-bold text-[#22C55E] uppercase tracking-wider mb-3">
              Lecture de la surface
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-[#6B6B75] leading-relaxed">
              <div>
                <div className="font-bold text-[#F0F0F0] mb-1">Le smile</div>
                Les OTM puts et calls ont toujours un IV superieur a l'ATM. Ce smile est la
                traduction du skew : les marches anticipent les moves extremes plus souvent que
                ne le predit une distribution log-normale.
              </div>
              <div>
                <div className="font-bold text-[#F0F0F0] mb-1">Term structure</div>
                En temps normal, les longues echeances cotent plus d'IV (contango — couvre
                l'incertitude). En stress, la courbe s'inverse (backwardation) : l'IV court
                terme depasse le long terme.
              </div>
              <div>
                <div className="font-bold text-[#F0F0F0] mb-1">Skew 25d</div>
                Skew = IV put 25d - IV call 25d. Plus c'est positif, plus les puts coutent
                cher relativement aux calls — les acheteurs de protection dominent. Skew qui
                s'ecrase = levee de couverture.
              </div>
            </div>
          </Card>
        </>
      ) : null}
    </div>
  );
}
