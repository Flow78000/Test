"use client";

import { useEffect, useRef, useState } from "react";

export type PollingPauseReason = "hidden" | "idle" | null;

export interface UseVisiblePollingOptions {
  /** Idle threshold in ms before polling is paused (default 10 min). Set to 0 to disable idle detection. */
  idleTimeoutMs?: number;
}

/**
 * setInterval that pauses when:
 *  - the browser tab is hidden (document.visibilityState === "hidden"), or
 *  - the user has been inactive on the page for `idleTimeoutMs` (default 10 min).
 *
 * Resumes (and immediately fires once) as soon as the tab becomes visible
 * or the user interacts again (mousemove, keydown, click, scroll, touchstart).
 *
 * Returns `{ paused, reason }` so the UI can show a "paused" indicator.
 *
 * Use this instead of raw setInterval for any polling loop that hits the
 * network — we share a global UW daily quota (20k) and there is no reason
 * to burn it on tabs the user isn't looking at or has walked away from.
 */
export function useVisiblePolling(
  callback: () => void,
  intervalMs: number,
  options: UseVisiblePollingOptions = {},
): { paused: boolean; reason: PollingPauseReason } {
  const { idleTimeoutMs = 10 * 60 * 1000 } = options;
  const cbRef = useRef(callback);
  cbRef.current = callback;

  const [reason, setReason] = useState<PollingPauseReason>(null);

  useEffect(() => {
    let pollId: ReturnType<typeof setInterval> | null = null;
    let idleTimerId: ReturnType<typeof setTimeout> | null = null;
    let isHidden = typeof document !== "undefined" && document.visibilityState === "hidden";
    let isIdle = false;

    const updateReason = () => {
      if (isHidden) setReason("hidden");
      else if (isIdle) setReason("idle");
      else setReason(null);
    };

    const startPoll = () => {
      if (pollId != null) return;
      pollId = setInterval(() => cbRef.current(), intervalMs);
    };
    const stopPoll = () => {
      if (pollId != null) {
        clearInterval(pollId);
        pollId = null;
      }
    };

    const resumeIfPossible = (fireNow: boolean) => {
      if (!isHidden && !isIdle) {
        if (fireNow) cbRef.current();
        startPoll();
      }
      updateReason();
    };

    const scheduleIdle = () => {
      if (idleTimerId != null) clearTimeout(idleTimerId);
      if (idleTimeoutMs <= 0) return;
      idleTimerId = setTimeout(() => {
        isIdle = true;
        stopPoll();
        updateReason();
      }, idleTimeoutMs);
    };

    const onActivity = () => {
      const wasIdle = isIdle;
      isIdle = false;
      scheduleIdle();
      if (wasIdle) resumeIfPossible(true);
    };

    const onVisibility = () => {
      const nowHidden = document.visibilityState === "hidden";
      if (nowHidden === isHidden) return;
      isHidden = nowHidden;
      if (isHidden) {
        stopPoll();
        updateReason();
      } else {
        // Returning to the tab counts as activity.
        isIdle = false;
        scheduleIdle();
        resumeIfPossible(true);
      }
    };

    // Initial state
    if (!isHidden) startPoll();
    scheduleIdle();
    updateReason();

    document.addEventListener("visibilitychange", onVisibility);
    const activityEvents = ["mousemove", "keydown", "click", "scroll", "touchstart"] as const;
    for (const ev of activityEvents) {
      window.addEventListener(ev, onActivity, { passive: true });
    }

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      for (const ev of activityEvents) {
        window.removeEventListener(ev, onActivity);
      }
      if (idleTimerId != null) clearTimeout(idleTimerId);
      stopPoll();
    };
  }, [intervalMs, idleTimeoutMs]);

  return { paused: reason != null, reason };
}
