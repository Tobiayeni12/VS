import type { RoomState } from "@/lib/gameTypes";

const STORAGE_KEY_PREFIX = "vs-room-session";

/** One-shot snapshot after settings save so Summary can render before KV read catches up. */
export function vsRoomSeedSessionKey(code: string): string {
  return `vs:room-seed:${code.trim().toUpperCase()}`;
}

export function writeVsRoomSeedToSession(code: string, room: RoomState): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      vsRoomSeedSessionKey(code),
      JSON.stringify(room)
    );
  } catch {
    // ignore quota / private mode
  }
}

/** Browser session hint so `/join` can send `resumePlayerId` securely (must match saved name). */
export type VsStoredRoomSession = { playerId: string; name: string };

export function vsRoomSessionKey(code: string): string {
  return `${STORAGE_KEY_PREFIX}:${code.trim().toUpperCase()}`;
}

export function readVsRoomSession(code: string): VsStoredRoomSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(vsRoomSessionKey(code));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof (parsed as VsStoredRoomSession).playerId === "string" &&
      typeof (parsed as VsStoredRoomSession).name === "string"
    ) {
      return {
        playerId: (parsed as VsStoredRoomSession).playerId,
        name: (parsed as VsStoredRoomSession).name,
      };
    }
  } catch {
    // ignore
  }
  return null;
}

export function writeVsRoomSession(
  code: string,
  session: VsStoredRoomSession
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      vsRoomSessionKey(code),
      JSON.stringify({
        playerId: session.playerId,
        name: session.name,
      })
    );
  } catch {
    // ignore quota / private mode
  }
}

export function clearVsRoomSession(code: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(vsRoomSessionKey(code));
  } catch {
    // ignore
  }
}
