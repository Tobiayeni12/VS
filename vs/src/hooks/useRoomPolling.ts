"use client";

import { useRouter } from "next/navigation";
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
  /** From URL; used only with `guestRedirectOnRoomLost` */
  playerId?: string;
  /**
   * When the host deletes/refreshes the room, joined guests eventually see repeated
   * 404s; after several consecutive failures they go to `/join`. Not used for spectators
   * without `playerId`.
   */
  guestRedirectOnRoomLost?: boolean;
};

/**
 * Fetches room state on an interval. Surfaces "Room not found" only on the
 * initial load so transient polls / navigation glitches don't flash errors.
 *
 * `guestRedirectOnRoomLost` only redirects joined non-host guests after several
 * consecutive 404 polls (KV / serverless blips should not bounce people to Join VS).
 */
const GUEST_ROOM_LOST_REQUIRED_404_POLLS = 3;

/** Cold KV / edge routing occasionally returns 404 once right after room create. */
const INITIAL_STATE_404_ROUNDS = 8;
const INITIAL_STATE_404_GAP_MS = 100;

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

export function useRoomPolling({
  code,
  pollIntervalMs = 1500,
  playerId = "",
  guestRedirectOnRoomLost = false,
}: Options) {
  const router = useRouter();
  const [room, setRoom] = useState<RoomState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadSucceededRef = useRef(false);
  const lastGoodRoomRef = useRef<RoomState | null>(null);
  const consecutive404AfterLoadRef = useRef(0);

  useEffect(() => {
    loadSucceededRef.current = false;
    lastGoodRoomRef.current = null;
    consecutive404AfterLoadRef.current = 0;
    setRoom(null);
    setLoading(true);
    setError(null);
  }, [code]);

  const fetchState = useCallback(async () => {
    if (!code) return;

    try {
      let res!: Response;
      let text = "";
      let data: Record<string, unknown> = {};

      for (let round = 0; round < INITIAL_STATE_404_ROUNDS; round++) {
        if (round > 0) {
          await sleep(INITIAL_STATE_404_GAP_MS);
        }

        res = await fetch(`/api/rooms/${code}/state`, {
          cache: "no-store",
        });
        text = await res.text();
        data = text ? JSON.parse(text) : {};

        if (res.ok) break;

        const retryTransientRoomMiss =
          res.status === 404 &&
          !loadSucceededRef.current &&
          round < INITIAL_STATE_404_ROUNDS - 1;

        if (!retryTransientRoomMiss) {
          break;
        }
      }

      if (!res.ok) {
        const guestWithId =
          Boolean(playerId) &&
          Boolean(lastGoodRoomRef.current) &&
          playerId !== lastGoodRoomRef.current!.hostId;
        const shouldConsiderGuestLost =
          guestRedirectOnRoomLost &&
          guestWithId &&
          res.status === 404 &&
          loadSucceededRef.current;

        if (shouldConsiderGuestLost) {
          consecutive404AfterLoadRef.current += 1;
          if (consecutive404AfterLoadRef.current >= GUEST_ROOM_LOST_REQUIRED_404_POLLS) {
            router.push("/join");
            return;
          }
          return;
        }

        consecutive404AfterLoadRef.current = 0;
        const msg =
          typeof data.error === "string" ? data.error : "Failed to load room";
        throw new Error(msg);
      }

      consecutive404AfterLoadRef.current = 0;
      const roomState = data as RoomState;
      setRoom(roomState);
      lastGoodRoomRef.current = roomState;
      setError(null);
      loadSucceededRef.current = true;
    } catch (err) {
      if (!loadSucceededRef.current) {
        setError((err as Error).message);
      }
    } finally {
      setLoading(false);
    }
  }, [
    code,
    guestRedirectOnRoomLost,
    playerId,
    router,
  ]);

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
