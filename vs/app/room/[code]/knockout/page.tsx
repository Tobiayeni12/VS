"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { RoomState } from "@/lib/gameTypes";
import BracketVisualization from "@/components/BracketVisualization";

export default function KnockoutPage() {
  const params = useParams<{ code: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const code = params.code.toUpperCase();
  const playerId = search.get("playerId") ?? "";
  const name = search.get("name") ?? "";

  const [room, setRoom] = useState<RoomState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [choosing, setChoosing] = useState(false);

  async function fetchState() {
    try {
      const res = await fetch(`/api/rooms/${code}/state`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load room");
      setRoom(data);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchState();
    const id = setInterval(fetchState, 2000);
    return () => clearInterval(id);
  }, []);

  async function handleMatchClick(matchId: string, winner: string) {
    setChoosing(true);
    setError(null);
    try {
      const res = await fetch(`/api/rooms/${code}/round`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "chooseWinner", matchId, winner }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to choose winner");
      setRoom(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setChoosing(false);
    }
  }

  if (loading && !room) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-slate-300">Loading VS…</p>
      </main>
    );
  }

  if (!room || !room.bracket) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-slate-300">{error || "Room not found."}</p>
      </main>
    );
  }

  const isHost = room.hostId === playerId;

  return (
    <main className="flex min-h-screen flex-col items-center px-4 py-6">
      <div className="w-full space-y-6">
        <header className="space-y-1 text-center">
          <h1 className="text-2xl font-bold">VS Knockout</h1>
          <p className="text-sm font-semibold capitalize">
            {room.bracket.currentPhase === "finished"
              ? "Tournament Complete"
              : `Phase: ${room.bracket.currentPhase.toUpperCase()}`}
          </p>
          <p className="text-sm text-slate-400">
            Room {room.code} • Host: {name || "Host"}
          </p>
        </header>

        {/* Bracket Visualization */}
        <BracketVisualization
          bracket={room.bracket}
          isHost={isHost}
          onMatchClick={handleMatchClick}
          disabled={choosing}
        />

        {/* Finished State with Leaderboard */}
        {room.status === "finished" && (
          <section className="rounded-xl border border-emerald-500/60 bg-emerald-950/30 p-6 text-center space-y-3">
            <h2 className="text-xl font-bold text-emerald-300">
              Tournament Champion
            </h2>
            <p className="text-3xl font-extrabold text-emerald-200">
              {room.winner}
            </p>

            {isHost && (
              <button
                type="button"
                onClick={() => router.push("/")}
                className="mx-auto mt-4 block w-full max-w-md rounded-lg bg-slate-800 px-4 py-3 text-lg font-semibold text-green-300 shadow-[0_2px_8px_rgba(0,0,0,0.35)] transition hover:bg-slate-700 hover:ring-2 hover:ring-green-400/70"
              >
                Back to Lobby
              </button>
            )}

            <hr className="my-4 border-emerald-500/40" />

            <h3 className="text-lg font-bold text-emerald-300">
              Game Wins Leaderboard
            </h3>
            <div className="max-w-md mx-auto">
              <ul className="space-y-2 text-left">
                {Object.entries(room.knockoutWins)
                  .map(([playerId, wins]) => {
                    const player = room.players.find((p) => p.id === playerId);
                    return {
                      name: player?.name ?? "Unknown",
                      wins,
                    };
                  })
                  .sort((a, b) => b.wins - a.wins)
                  .map((entry, idx) => (
                    <li
                      key={idx}
                      className="flex items-center justify-between rounded border border-emerald-500/30 bg-emerald-950/30 px-4 py-2"
                    >
                      <span className="flex items-center gap-2 font-semibold">
                        <span className="text-emerald-400 text-sm font-bold w-6">
                          #{idx + 1}
                        </span>
                        {entry.name}
                      </span>
                      <span className="text-emerald-300 font-bold">
                        {entry.wins}
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          </section>
        )}

        {error && (
          <div className="rounded-lg border border-red-500/50 bg-red-950/30 p-4">
            <p className="text-sm text-red-200">{error}</p>
          </div>
        )}
      </div>
    </main>
  );
}

