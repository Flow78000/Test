"use client";

import { useEffect, useRef } from "react";

type Plotly3DProps = {
  ticker: string;
  spot: number;
  moneyness: string[]; // "80%" ... "115%"
  dtes: (string | number)[];
  surface: (number | null)[][]; // [moneyness][dte]
  height?: number;
};

/**
 * Real interactive 3D volatility surface rendered with Plotly.js.
 * Draggable with the mouse (orbit / zoom / pan).
 * X = DTE (days to expiration), Y = Moneyness (strike / spot), Z = IV %
 */
export function VolSurface3D({
  ticker,
  spot,
  moneyness,
  dtes,
  surface,
  height = 560,
}: Plotly3DProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    let cancelled = false;
    let purgeFn: ((el: HTMLElement) => void) | null = null;
    const el = ref.current;

    (async () => {
      const mod = await import("plotly.js-dist-min");
      const Plotly = mod.default;
      if (cancelled || !el) return;
      purgeFn = (node: HTMLElement) => Plotly.purge(node);

      // Parse moneyness rows like "100%" -> 1.0
      const yValues = moneyness.map((m) => {
        const v = parseFloat(m.replace("%", ""));
        return isNaN(v) ? 0 : v / 100;
      });
      const xValues = dtes.map((d) => Number(d));

      // Plotly's surface z is [y][x] matrix (rows = y, cols = x).
      // Our input surface is already [moneyness][dte] = [y][x], perfect.
      const z = surface.map((row) => row.map((v) => (v === null ? null : v)));

      const trace = {
        type: "surface" as const,
        x: xValues,
        y: yValues,
        z,
        colorscale: [
          [0, "#0D47A1"],
          [0.15, "#1565C0"],
          [0.30, "#1E88E5"],
          [0.45, "#42A5F5"],
          [0.60, "#64B5F6"],
          [0.75, "#90CAF9"],
          [0.90, "#BBDEFB"],
          [1, "#E3F2FD"],
        ],
        reversescale: true,
        contours: {
          z: {
            show: true,
            usecolormap: true,
            highlightcolor: "#FF6B00",
            project: { z: true },
          },
        },
        lighting: {
          ambient: 0.6,
          diffuse: 0.8,
          roughness: 0.4,
          specular: 0.2,
        },
        hovertemplate:
          "DTE %{x}j<br>Moneyness %{y:.0%}<br>IV %{z:.2f}%<extra></extra>",
        showscale: true,
        colorbar: {
          tickfont: { color: "#B0B0B8", size: 10 },
          thickness: 14,
          len: 0.75,
          title: {
            text: "IV (%)",
            font: { color: "#F0F0F0", size: 11 },
          },
        },
      };

      const layout = {
        paper_bgcolor: "#08080A",
        plot_bgcolor: "#08080A",
        font: { color: "#E0E0E5", family: "system-ui, sans-serif", size: 11 },
        autosize: true,
        height,
        margin: { l: 0, r: 0, t: 30, b: 0 },
        title: {
          text: `${ticker} — Surface IV 3D (spot ${spot.toFixed(2)})`,
          font: { color: "#FFA726", size: 13 },
          x: 0.5,
          xanchor: "center" as const,
        },
        scene: {
          bgcolor: "#08080A",
          xaxis: {
            title: { text: "DTE (jours)", font: { color: "#FFA726", size: 11 } },
            backgroundcolor: "#0A0A0C",
            gridcolor: "#1E1E22",
            zerolinecolor: "#2A2A30",
            tickfont: { color: "#B0B0B8", size: 10 },
            showbackground: true,
          },
          yaxis: {
            title: { text: "Moneyness (K/S)", font: { color: "#42A5F5", size: 11 } },
            backgroundcolor: "#0A0A0C",
            gridcolor: "#1E1E22",
            zerolinecolor: "#2A2A30",
            tickformat: ".0%",
            tickfont: { color: "#B0B0B8", size: 10 },
            showbackground: true,
          },
          zaxis: {
            title: { text: "IV (%)", font: { color: "#EF4444", size: 11 } },
            backgroundcolor: "#0A0A0C",
            gridcolor: "#1E1E22",
            zerolinecolor: "#2A2A30",
            tickfont: { color: "#B0B0B8", size: 10 },
            showbackground: true,
          },
          camera: {
            eye: { x: 1.6, y: -1.6, z: 0.9 },
          },
          aspectmode: "cube" as const,
        },
      };

      const config = {
        responsive: true,
        displaylogo: false,
        modeBarButtonsToRemove: [
          "sendDataToCloud",
          "editInChartStudio",
          "toImage",
        ],
        displayModeBar: true as const,
      };

      await Plotly.newPlot(el, [trace], layout, config);
    })();

    return () => {
      cancelled = true;
      if (purgeFn && el) {
        try {
          purgeFn(el);
        } catch {
          /* ignore */
        }
      }
    };
  }, [ticker, spot, moneyness, dtes, surface, height]);

  return (
    <div
      ref={ref}
      className="w-full rounded-lg overflow-hidden border border-[#1E1E22] bg-[#08080A]"
      style={{ minHeight: height }}
    />
  );
}
