"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RoomState } from "@/lib/gameTypes";

/** Safe `[code]` param → uppercase room code (empty if missing). */
export function normalizeRoomCode(raw: unknown): string {
  if (typeof raw === "string" && raw.trim()) return raw.trim().toUpperCase();
  if (Array.isArray(raw) && raw[0]) return String(raw[0]).trim().toUpperCase();
  return "";
}

type Options = {
  /** Uppercase room code from the URL */
  code: string;
  pollIntervalMs?: number;
};

/**
 * Fetches room state on an interval. Surfaces "Room not found" only on the
 * initial load so transient polls / navigation glitches don't flash errors.
 */
export function useRoomPolling({ code, pollIntervalMs = 1500 }: Options) {
  const [room, setRoom] = useState<RoomState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadSucceededRef = useRef(false);

  useEffect(() => {
    loadSucceededRef.current = false;
    setRoom(null);
    setLoading(true);
    setError(null);
  }, [code]);

  const fetchState = useCallback(async () => {
    if (!code) return;

    try {
      const res = await fetch(`/api/rooms/${code}/state`, {
        cache: "no-store",
      });
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      if (!res.ok) {
        throw new Error(data.error || "Failed to load room");
      }
      setRoom(data);
      setError(null);
      loadSucceededRef.current = true;
    } catch (err) {
      if (!loadSucceededRef.current) {
        setError((err as Error).message);
      }
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => {
    if (!code) {
      setLoading(false);
      setError("Invalid room link.");
      return;
    }

    fetchState();
    const id = setInterval(fetchState, pollIntervalMs);
    return () => clearInterval(id);
  }, [code, fetchState, pollIntervalMs]);

  return { room, setRoom, loading, error, setError, fetchState };
}
