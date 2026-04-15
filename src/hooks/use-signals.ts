"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { SignalsPayload } from "@/lib/signals-types";

const DEFAULT_BRIDGE = "http://localhost:5050";
const BRIDGE =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_FLOW_BRIDGE) ||
  DEFAULT_BRIDGE;

function wsUrl(httpBase: string): string {
  return httpBase.replace(/^http/, "ws") + "/ws/signals";
}

export interface SignalsState {
  signals: SignalsPayload | null;
  isConnected: boolean;
  lastUpdate: string | null;
  source: "sierra" | "mock" | "none";
  error: string | null;
}

export interface UseSignalsReturn extends SignalsState {
  reconnect: () => void;
  toggleMock: () => Promise<void>;
  bridgeUrl: string;
}

/**
 * Hook principal pour consommer les signaux FLOW depuis le bridge.
 *
 * - Se connecte au WebSocket ws://localhost:5050/ws/signals
 * - Reconnexion automatique toutes les 3 secondes
 * - Fallback REST polling toutes les 5 secondes si WS indispo
 * - Ping applicatif toutes les 25 secondes (keep-alive)
 */
export function useSignals(): UseSignalsReturn {
  const [state, setState] = useState<SignalsState>({
    signals: null,
    isConnected: false,
    lastUpdate: null,
    source: "none",
    error: null,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const pingTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const closedByUs = useRef<boolean>(false);

  const stopPolling = useCallback(() => {
    if (pollTimer.current) {
      clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    if (pollTimer.current) return;
    const tick = async () => {
      try {
        const r = await fetch(`${BRIDGE}/api/signals`, { cache: "no-store" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json();
        if (j?.ok && j?.data && Object.keys(j.data).length > 0) {
          setState((s) => ({
            ...s,
            signals: j.data as SignalsPayload,
            lastUpdate: j.last_update || s.lastUpdate,
            source: j.source || "none",
            error: null,
          }));
        }
      } catch (e: any) {
        setState((s) => ({ ...s, error: `REST: ${e.message || "erreur"}` }));
      }
    };
    tick();
    pollTimer.current = setInterval(tick, 5000);
  }, []);

  const connect = useCallback(() => {
    closedByUs.current = false;
    try {
      const ws = new WebSocket(wsUrl(BRIDGE));
      wsRef.current = ws;

      ws.onopen = () => {
        setState((s) => ({ ...s, isConnected: true, error: null }));
        stopPolling();
        // Keep-alive ping every 25s
        if (pingTimer.current) clearInterval(pingTimer.current);
        pingTimer.current = setInterval(() => {
          try {
            ws.send("ping");
          } catch {}
        }, 25000);
      };

      ws.onmessage = (evt) => {
        if (evt.data === "pong") return;
        try {
          const msg = JSON.parse(String(evt.data));
          if (
            (msg?.type === "signals_init" || msg?.type === "signals_update") &&
            msg?.data
          ) {
            const data = msg.data as SignalsPayload;
            if (Object.keys(data).length > 0) {
              setState((s) => ({
                ...s,
                signals: data,
                lastUpdate: msg.last_update || msg.ts || s.lastUpdate,
                source: msg.source || s.source,
                error: null,
              }));
            }
          }
        } catch {}
      };

      ws.onerror = () => {
        setState((s) => ({ ...s, error: "WebSocket error" }));
      };

      ws.onclose = () => {
        setState((s) => ({ ...s, isConnected: false }));
        if (pingTimer.current) {
          clearInterval(pingTimer.current);
          pingTimer.current = null;
        }
        // Fallback REST tant que le WS est down
        startPolling();
        if (!closedByUs.current) {
          if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
          reconnectTimer.current = setTimeout(connect, 3000);
        }
      };
    } catch (e: any) {
      setState((s) => ({ ...s, error: `WS init: ${e.message || "erreur"}` }));
      startPolling();
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      reconnectTimer.current = setTimeout(connect, 3000);
    }
  }, [startPolling, stopPolling]);

  const reconnect = useCallback(() => {
    if (wsRef.current) {
      closedByUs.current = true;
      try {
        wsRef.current.close();
      } catch {}
      wsRef.current = null;
    }
    if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    reconnectTimer.current = setTimeout(connect, 200);
  }, [connect]);

  const toggleMock = useCallback(async () => {
    try {
      await fetch(`${BRIDGE}/api/mock/toggle`, { method: "POST" });
    } catch {}
  }, []);

  useEffect(() => {
    connect();
    return () => {
      closedByUs.current = true;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (pollTimer.current) clearInterval(pollTimer.current);
      if (pingTimer.current) clearInterval(pingTimer.current);
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch {}
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { ...state, reconnect, toggleMock, bridgeUrl: BRIDGE };
}
