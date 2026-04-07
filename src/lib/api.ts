/**
 * FLO.W API Client
 * Connects to local FastAPI server (port 3849) for:
 * - UW proxy (options, greeks, flow, dark pool)
 * - TWS market data (vol regime, FX, stress)
 * - Sierra Chart signals (MR, zones, performance)
 * - Regime Engine (DPSS + GEX + Flow)
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3850";

async function fetchApi<T>(endpoint: string): Promise<T | null> {
  try {
    const resp = await fetch(`${API_BASE}${endpoint}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!resp.ok) throw new Error(`API ${resp.status}`);
    return await resp.json();
  } catch (e) {
    console.warn(`[FLO.W] API error: ${endpoint}`, e);
    return null;
  }
}

// ============================================================
// UW Proxy endpoints
// ============================================================
export const uw = {
  optionContracts: (ticker = "SPX", expiration = "") =>
    fetchApi(`/api/uw/option-contracts?ticker=${ticker}&expiration=${expiration}`),
  greekExposureStrike: (ticker = "SPX") =>
    fetchApi(`/api/uw/greek-exposure/strike?ticker=${ticker}`),
  greekExposure: (ticker = "SPX") =>
    fetchApi(`/api/uw/greek-exposure?ticker=${ticker}`),
  greekFlow: (ticker = "SPX") =>
    fetchApi(`/api/uw/greek-flow?ticker=${ticker}`),
  ivRank: (ticker = "SPY") =>
    fetchApi(`/api/uw/iv-rank?ticker=${ticker}`),
  realizedVol: (ticker = "SPY") =>
    fetchApi(`/api/uw/volatility/realized?ticker=${ticker}`),
  marketTide: () => fetchApi(`/api/uw/market-tide`),
  flowAlerts: () => fetchApi(`/api/uw/flow-alerts`),
  sectorEtfs: () => fetchApi(`/api/uw/sector-etfs`),
  news: () => fetchApi(`/api/uw/news`),
  earningsPremarket: () => fetchApi(`/api/uw/earnings/premarket`),
  earningsAfterHours: () => fetchApi(`/api/uw/earnings/afterhours`),
  economicCalendar: () => fetchApi(`/api/uw/economic-calendar`),
  darkpool: (ticker = "SPY") => fetchApi(`/api/uw/darkpool/${ticker}`),
  spotExposures: (ticker = "SPY") =>
    fetchApi(`/api/uw/spot-exposures/strike?ticker=${ticker}`),
  totalOptionsVolume: () => fetchApi(`/api/uw/total-options-volume`),
};

// ============================================================
// TWS Market Data
// ============================================================
export const tws = {
  volRegime: () => fetchApi(`/api/market/vol-regime`),
  fxMatrix: () => fetchApi(`/api/market/fx-matrix`),
  stress: () => fetchApi(`/api/market/stress`),
  reconnect: () => fetchApi(`/api/market/reconnect`),
};

// ============================================================
// Sierra Chart
// ============================================================
export const sierra = {
  files: () => fetchApi(`/api/sierra/files`),
  signals: (symbol = "USEquities") =>
    fetchApi(`/api/sierra/signals?symbol=${symbol}`),
  lastBars: (symbol = "USEquities", n = 20) =>
    fetchApi(`/api/sierra/last?symbol=${symbol}&n=${n}`),
  history: (symbol = "USEquities", bars = 200) =>
    fetchApi(`/api/sierra/history?symbol=${symbol}&bars=${bars}`),
  columns: (symbol = "USEquities") =>
    fetchApi(`/api/sierra/columns?symbol=${symbol}`),
  zones: (symbol = "USEquities") =>
    fetchApi(`/api/sierra/zones?symbol=${symbol}`),
  meanReversion: (symbol = "USEquities", bars = 100) =>
    fetchApi(`/api/sierra/mean-reversion?symbol=${symbol}&bars=${bars}`),
  dashboard: () => fetchApi(`/api/sierra/dashboard`),
  performance: (symbol = "USEquities") =>
    fetchApi(`/api/sierra/performance?symbol=${symbol}`),
  performanceAll: () => fetchApi(`/api/sierra/performance-all`),
};

// ============================================================
// Regime Engine
// ============================================================
export const regime = {
  full: () => fetchApi(`/api/regime/full`),
  settings: () => fetchApi(`/api/regime/settings`),
  history: () => fetchApi(`/api/regime/history`),
};

// ============================================================
// Health
// ============================================================
export const health = () => fetchApi(`/api/health`);
