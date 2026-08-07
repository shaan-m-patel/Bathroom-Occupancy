"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { StatusPayload } from "@/lib/types";
import { todayWindow } from "@/lib/time";

const POLL_INTERVAL_MS = 3000;

export function useStatus() {
  const [data, setData] = useState<StatusPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

  const refresh = useCallback(() => {
    if (inFlight.current) return Promise.resolve();
    inFlight.current = true;
    const { from, to } = todayWindow();
    return fetch(
      `/api/status?from=${from.toISOString()}&to=${to.toISOString()}`,
      { cache: "no-store" },
    )
      .then((res) => {
        if (!res.ok) throw new Error(`Status request failed (${res.status})`);
        return res.json();
      })
      .then((payload) => {
        setData(payload);
        setError(null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load status");
      })
      .finally(() => {
        inFlight.current = false;
      });
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, POLL_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  return { data, error, refresh };
}
