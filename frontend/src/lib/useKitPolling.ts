"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { kitApi, KitDetail } from "./api";

const POLL_INTERVAL_MS = 3000;

/**
 * Polls GET /api/kits/:id while status is pending/generating, and stops
 * once it reaches a terminal state (completed/failed). Section 13 calls
 * out that generation is slow (~90s) and failure-prone, so the interface
 * needs visible progress rather than a blocking request — this hook is
 * the client-side half of that async design (the server half is the
 * fire-and-forget background job from Step 11).
 */
export function useKitPolling(kitId: string) {
  const [kit, setKit] = useState<KitDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchOnce = useCallback(async () => {
    try {
      const result = await kitApi.get(kitId);
      setKit(result);
      if (result.status === "completed" || result.status === "failed") {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
      return result;
    } catch (err) {
      setError("Could not load this kit.");
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return null;
    }
  }, [kitId]);

  useEffect(() => {
    fetchOnce();
    intervalRef.current = setInterval(fetchOnce, POLL_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchOnce]);

  const refetch = useCallback(() => fetchOnce(), [fetchOnce]);

  return { kit, error, refetch, setKit };
}