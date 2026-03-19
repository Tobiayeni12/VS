"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";
import type { RoomState } from "@/lib/gameTypes";

type ActiveMatch = {
  id: string;
  gameA: string;
  gameB: string;
  phase: "left" | "right" | "finals";
  roundIndex: number;
  matchIndex: number;
};

function getActiveMatch(room: RoomState): ActiveMatch | null {
  if (!room.bracket) return null;

  if (room.bracket.currentPhase === "left") {
    for (let roundIndex = 0; roundIndex < room.bracket.left.rounds.length; roundIndex++) {
      const round = room.bracket.left.rounds[roundIndex]!;
      const matchIndex = round.findIndex((m) => !m.winner && m.gameA && m.gameB);
      const match = matchIndex >= 0 ? round[matchIndex] : undefined;
      if (match?.gameB) {
        return {
          id: match.id,
          gameA: match.gameA,
          gameB: match.gameB,
          phase: "left",
          roundIndex,
          matchIndex,
        };
      }
    }
    return null;
  }

  if (room.bracket.currentPhase === "right") {
    for (let roundIndex = 0; roundIndex < room.bracket.right.rounds.length; roundIndex++) {
      const round = room.bracket.right.rounds[roundIndex]!;
      const matchIndex = round.findIndex((m) => !m.winner && m.gameA && m.gameB);
      const match = matchIndex >= 0 ? round[matchIndex] : undefined;
      if (match?.gameB) {
        return {
          id: match.id,
          gameA: match.gameA,
          gameB: match.gameB,
          phase: "right",
          roundIndex,
          matchIndex,
        };
      }
    }
    return null;
  }

  if (room.bracket.currentPhase === "finals" && room.bracket.finals) {
    const finals = room.bracket.finals;
    if (!finals.winner && finals.gameA && finals.gameB) {
      return {
        id: finals.id,
        gameA: finals.gameA,
        gameB: finals.gameB,
        phase: "finals",
        roundIndex: 0,
        matchIndex: 0,
      };
    }
  }

  return null;
}

function getStageLabel(room: RoomState, activeMatch: ActiveMatch | null): string {
  if (!activeMatch) return "Preparing next matchup";
  if (activeMatch.phase === "finals") return "Final";

  const totalTeams = room.gamePool.length;
  const teamsInRound = Math.max(2, Math.floor(totalTeams / 2 ** activeMatch.roundIndex));

  if (teamsInRound === 8) return "Quarterfinals";
  if (teamsInRound === 4) return "Semifinals";
  if (teamsInRound === 2) return "Final";
  return `Round of ${teamsInRound}`;
}

function getMatchLabel(room: RoomState, activeMatch: ActiveMatch | null): string {
  if (!activeMatch || activeMatch.phase === "finals") return "";

  const leftMatchesInRound =
    room.bracket?.left.rounds[activeMatch.roundIndex]?.length ?? 0;
  const globalMatchNumber =
    activeMatch.phase === "left"
      ? activeMatch.matchIndex + 1
      : leftMatchesInRound + activeMatch.matchIndex + 1;

  return `Match ${globalMatchNumber}`;
}

function getPreviewGames(room: RoomState): string[] {
  if (!room.bracket) return room.gamePool.map((g) => g.title);

  const titles: string[] = [];
  for (const match of room.bracket.left.rounds[0] ?? []) {
    if (match.gameA) titles.push(match.gameA);
    if (match.gameB) titles.push(match.gameB);
  }
  for (const match of room.bracket.right.rounds[0] ?? []) {
    if (match.gameA) titles.push(match.gameA);
    if (match.gameB) titles.push(match.gameB);
  }

  return titles.length > 0 ? titles : room.gamePool.map((g) => g.title);
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

  if (!room) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-slate-300">{error || "Room not found."}</p>
      </main>
    );
  }

  // Game was reset by host — send everyone back to the lobby
  if (!room.bracket) {
    const qp = new URLSearchParams({ playerId, name });
    router.push(`/room/${code}?${qp.toString()}`);
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-slate-300">Game was reset. Heading back to lobby…</p>
      </main>
    );
  }

  const isHost = room.hostId === playerId;
  const activeMatch = getActiveMatch(room);

  const showFinished = room.status === "finished";
  const showPreview = !showFinished && showBracketPreview;
  const stageLabel = getStageLabel(room, activeMatch);
  const matchLabel = getMatchLabel(room, activeMatch);
  const previewGames = getPreviewGames(room);

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
            <section className="mx-auto w-full max-w-5xl rounded-xl border border-slate-700 bg-slate-900/50 p-5">
              <h2 className="mb-4 text-center text-lg font-bold text-slate-100">
                Games Playing In This Bracket
              </h2>
              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {previewGames.map((title, idx) => (
                  <li
                    key={`${title}-${idx}`}
                    className="rounded-md border border-slate-600 bg-slate-800/80 px-3 py-2 text-sm font-semibold text-slate-100"
                  >
                    {idx + 1}. {title}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        ) : !showFinished ? (
          <section className="mx-auto flex min-h-[76vh] w-full max-w-7xl flex-col justify-center rounded-2xl border border-slate-700 bg-slate-900/50 p-6 text-center sm:p-8">
            {activeMatch ? (
              <div className="space-y-8">
                <div className="space-y-2">
                  <p className="text-xl font-extrabold uppercase tracking-wide text-green-300 sm:text-3xl">
                    {stageLabel}
                  </p>
                  {matchLabel && (
                    <p className="text-base font-bold uppercase tracking-wider text-slate-300 sm:text-xl">
                      {matchLabel}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-[1fr_auto_1fr] sm:items-stretch">
                  <button
                    type="button"
                    disabled={!isHost || choosing}
                    onClick={() => handleMatchClick(activeMatch.id, activeMatch.gameA)}
                    className="flex min-h-[32vh] w-full items-center justify-center rounded-xl border-2 border-slate-600 bg-slate-800 px-6 py-8 text-3xl font-black text-slate-100 transition hover:border-green-400 hover:text-green-300 sm:text-5xl disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {activeMatch.gameA}
                  </button>

                  <div className="flex items-center justify-center">
                    <Image
                      src="/VSlogo.png"
                      alt="VS"
                      width={140}
                      height={140}
                      className="h-24 w-24 sm:h-32 sm:w-32"
                      priority
                    />
                  </div>

                  <button
                    type="button"
                    disabled={!isHost || choosing}
                    onClick={() => handleMatchClick(activeMatch.id, activeMatch.gameB)}
                    className="flex min-h-[32vh] w-full items-center justify-center rounded-xl border-2 border-slate-600 bg-slate-800 px-6 py-8 text-3xl font-black text-slate-100 transition hover:border-green-400 hover:text-green-300 sm:text-5xl disabled:cursor-not-allowed disabled:opacity-60"
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
                onClick={() => {
                  const qp = new URLSearchParams({
                    playerId,
                    name,
                  });
                  router.push(`/room/${code}/settings?${qp.toString()}`);
                }}
                className="mx-auto mt-4 block w-full max-w-md rounded-lg bg-slate-800 px-4 py-3 text-lg font-semibold text-green-300 shadow-[0_2px_8px_rgba(0,0,0,0.35)] transition hover:bg-slate-700 hover:ring-2 hover:ring-green-400/70"
              >
                Restart
              </button>
            )}

            <hr className="my-4 border-emerald-500/40" />

            <h3 className="text-lg font-bold text-emerald-300">
              Tournament Wins Leaderboard
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

