"use client";

import { useEffect } from "react";
import { writeVsRoomSession } from "@/lib/vsRoomSession";

const HEARTBEAT_MS = 30_000;

/**
 * Persist `{ playerId, name }` for this room code and heartbeat `/presence`
 * so very stale ghosts can be evicted and the same browser can reconnect via `/join`.
 */
export function useVsReconnectSession(opts: {
  code: string;
  playerId: string;
  name: string;
}): void {
  const { code, playerId, name } = opts;
  const roomCode = code.trim().toUpperCase();
  const id = playerId.trim();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!roomCode || !id) return;

    writeVsRoomSession(roomCode, {
      playerId: id,
      name: name.trim() || "Player",
    });
  }, [roomCode, id, name]);

  useEffect(() => {
    if (!roomCode || !id) return;

    async function ping() {
      await fetch(`/api/rooms/${roomCode}/presence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId: id }),
      }).catch(() => undefined);
    }

    void ping();
    const interval = window.setInterval(() => void ping(), HEARTBEAT_MS);
    return () => window.clearInterval(interval);
  }, [roomCode, id]);
}
