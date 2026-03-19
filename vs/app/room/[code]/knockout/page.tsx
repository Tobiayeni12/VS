"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { RoomState } from "@/lib/gameTypes";
import BracketVisualization from "@/components/BracketVisualization";

type ActiveMatch = {
  id: string;
  gameA: string;
  gameB: string;
};

function getActiveMatch(room: RoomState): ActiveMatch | null {
  if (!room.bracket) return null;

  if (room.bracket.currentPhase === "left") {
    for (const round of room.bracket.left.rounds) {
      const match = round.find((m) => !m.winner && m.gameA && m.gameB);
      if (match?.gameB) {
        return { id: match.id, gameA: match.gameA, gameB: match.gameB };
      }
    }
    return null;
  }

  if (room.bracket.currentPhase === "right") {
    for (const round of room.bracket.right.rounds) {
      const match = round.find((m) => !m.winner && m.gameA && m.gameB);
      if (match?.gameB) {
        return { id: match.id, gameA: match.gameA, gameB: match.gameB };
      }
    }
    return null;
  }

  if (room.bracket.currentPhase === "finals" && room.bracket.finals) {
    const finals = room.bracket.finals;
    if (!finals.winner && finals.gameA && finals.gameB) {
      return { id: finals.id, gameA: finals.gameA, gameB: finals.gameB };
    }
  }

  return null;
}

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
  const [showBracketPreview, setShowBracketPreview] = useState(true);
  const [previewCountdown, setPreviewCountdown] = useState(5);

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

  useEffect(() => {
    const interval = setInterval(() => {
      setPreviewCountdown((prev) => (prev > 1 ? prev - 1 : 1));
    }, 1000);

    const timer = setTimeout(() => {
      clearInterval(interval);
      setShowBracketPreview(false);
    }, 5000);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
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
  const activeMatch = getActiveMatch(room);

  const showFinished = room.status === "finished";
  const showPreview = !showFinished && showBracketPreview;

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

        {showPreview ? (
          <div className="space-y-3">
            <div className="mx-auto flex w-full max-w-md items-center justify-center rounded-xl border-2 border-green-500/70 bg-green-950/40 px-4 py-3 shadow-[0_0_20px_rgba(34,197,94,0.25)]">
              <p className="text-center text-xl font-extrabold tracking-wide text-green-300 sm:text-2xl">
                Starting 1v1 in {previewCountdown}...
              </p>
            </div>
            <BracketVisualization
              bracket={room.bracket}
              isHost={false}
              onMatchClick={() => {}}
              disabled
            />
          </div>
        ) : !showFinished ? (
          <section className="mx-auto w-full max-w-2xl rounded-xl border border-slate-700 bg-slate-900/50 p-6 text-center">
            {activeMatch ? (
              <div className="space-y-5">
                <p className="text-xs uppercase tracking-wider text-slate-400">
                  Current Match
                </p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                  <button
                    type="button"
                    disabled={!isHost || choosing}
                    onClick={() => handleMatchClick(activeMatch.id, activeMatch.gameA)}
                    className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-4 text-lg font-semibold text-slate-100 transition hover:border-green-400 hover:text-green-300 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {activeMatch.gameA}
                  </button>

                  <div className="text-sm font-bold text-slate-400">VS</div>

                  <button
                    type="button"
                    disabled={!isHost || choosing}
                    onClick={() => handleMatchClick(activeMatch.id, activeMatch.gameB)}
                    className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-4 text-lg font-semibold text-slate-100 transition hover:border-green-400 hover:text-green-300 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {activeMatch.gameB}
                  </button>
                </div>

                {!isHost && (
                  <p className="text-sm text-slate-400">Waiting for host to choose the winner…</p>
                )}
              </div>
            ) : (
              <p className="text-slate-300">Preparing next matchup…</p>
            )}
          </section>
        ) : null}

        {showFinished && (
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

