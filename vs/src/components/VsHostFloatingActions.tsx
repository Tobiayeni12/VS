"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { RoomState } from "@/lib/gameTypes";

type Props = {
  code: string;
  hostDisplayName: string;
  playerId: string;
  /** True only when loaded room confirms this client is the host */
  isHost: boolean;
  room?: RoomState | null;
};

export function VsHostFloatingActions({
  code,
  hostDisplayName,
  playerId,
  isHost,
  room,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  if (!isHost || !playerId || !code) return null;

  async function refreshRoom() {
    const confirmed = window.confirm(
      "Start a completely new VS? This removes the current room code, wipes games and joined players, and opens a fresh VS settings screen."
    );
    if (!confirmed) return;

    setBusy(true);
    try {
      await fetch(`/api/rooms/${code}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId }),
      }).catch(() => undefined);

      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: hostDisplayName.trim() || "Host" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not create a new room");

      const qp = new URLSearchParams({
        playerId: data.hostId as string,
        name: hostDisplayName.trim() || "Host",
      });
      router.replace(`/room/${data.code}/settings?${qp.toString()}`);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const leaderboardEntries = room
    ? Object.entries(room.knockoutWins)
        .map(([pid, wins]) => ({
          name: room.players.find((p) => p.id === pid)?.name ?? "Unknown",
          wins,
        }))
        .sort((a, b) => b.wins - a.wins)
        .slice(0, 10)
    : [];

  const bubbleBtn =
    "flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-green-600/35 text-white shadow-md backdrop-blur-sm transition hover:bg-green-600/55 hover:border-white/60 focus:outline-none focus:ring-2 focus:ring-green-300/70 disabled:opacity-50";

  return (
    <div className="absolute right-6 top-6 z-40 flex flex-col items-end gap-2" aria-label="Host actions">
      <div className="flex flex-row gap-2">
        <button
          type="button"
          className={bubbleBtn}
          onClick={() => setShowLeaderboard((v) => !v)}
          title="Leaderboard"
          aria-label="Leaderboard"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/vs-leaderboard-icon.png"
            alt=""
            className="size-3.5 object-contain"
            aria-hidden="true"
            draggable={false}
          />
        </button>

        <button
          type="button"
          className={bubbleBtn}
          onClick={refreshRoom}
          disabled={busy}
          title="New VS — new room code and reset"
          aria-label="New VS room"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/vs-reset-icon.png"
            alt=""
            className="size-3.5 object-contain"
            aria-hidden="true"
            draggable={false}
          />
        </button>

        <button
          type="button"
          className={`${bubbleBtn} select-none`}
          onClick={() => router.push("/")}
          title="Home"
          aria-label="Home"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/vs-home-icon.png"
            alt=""
            className="size-3.5 object-contain"
            aria-hidden="true"
            draggable={false}
          />
        </button>
      </div>

      {showLeaderboard && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowLeaderboard(false)}
        >
          <div
            className="w-full max-w-md mx-4 rounded-2xl border border-emerald-500/40 bg-slate-900 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-emerald-500/20">
              <h2 className="text-2xl font-extrabold tracking-tight text-emerald-300">
                Leaderboard
              </h2>
              <button
                type="button"
                onClick={() => setShowLeaderboard(false)}
                className="text-slate-400 hover:text-white text-xl leading-none"
                aria-label="Close leaderboard"
              >
                ✕
              </button>
            </div>

            {leaderboardEntries.length === 0 ? (
              <p className="px-6 py-8 text-center text-slate-400 text-lg">
                No wins yet.
              </p>
            ) : (
              <ul className="px-6 py-4 space-y-3">
                {leaderboardEntries.map((entry, idx) => (
                  <li
                    key={idx}
                    className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-950/30 px-5 py-3"
                  >
                    <span className="flex items-center gap-4">
                      <span className="text-lg font-extrabold text-emerald-400 w-8">
                        #{idx + 1}
                      </span>
                      <span className="text-lg font-semibold text-slate-100">
                        {entry.name}
                      </span>
                    </span>
                    <span className="text-xl font-extrabold text-emerald-300">
                      {entry.wins}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <div className="px-6 pb-6" />
          </div>
        </div>
      )}
    </div>
  );
}
