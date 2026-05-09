import type { RoomState } from "./gameTypes";

export function playerDisplayName(room: RoomState, playerId: string): string {
  return room.players.find((p) => p.id === playerId)?.name ?? "Unknown";
}
