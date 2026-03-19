"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { RoomState } from "@/lib/gameTypes";

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

  async function handleChoose(winnerTitle: string) {
    setChoosing(true);
    setError(null);
    try {
      const res = await fetch(`/api/rooms/${code}/round`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "chooseWinner", winnerTitle }),
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

  const currentRound = room.knockoutBracket;
  const match = currentRound[room.currentMatchIndex] ?? [];
  const [gameA, gameB] = match;
  const isHost = room.hostId === playerId;
  const roundNumber = (() => {
    if (currentRound.length === 0) return 1;
    let round = 1;
    let participants = Math.max(room.gamePool.length, 2);
    while (
      participants > 1 &&
      Math.ceil(participants / 2) !== currentRound.length
    ) {
      participants = Math.ceil(participants / 2);
      round += 1;
    }
    return round;
  })();

  return (
    <main className="flex min-h-screen flex-col items-center px-4 py-6">
      <div className="w-full max-w-[96vw] space-y-6">
        <header className="space-y-1 text-center">
          <h1 className="text-2xl font-bold">VS Knockout</h1>
          <p className="text-sm font-semibold text-emerald-300">Round {roundNumber}</p>
          <p className="text-sm text-slate-400">
            Room {room.code} • Host: {name || "Host"}
          </p>
        </header>

        {room.status === "finished" && (
          <section className="rounded-xl border border-emerald-500/60 bg-emerald-950/30 p-6 text-center space-y-3">
            <h2 className="text-xl font-bold text-emerald-300">
              Final Winner
            </h2>
            <p className="text-2xl font-extrabold">{room.winner}</p>
            {isHost && (
              <button
                type="button"
                onClick={() => router.push("/")}
                className="mx-auto mt-4 block w-full max-w-md rounded-lg bg-slate-800 px-4 py-3 text-xl font-semibold text-green-300 shadow-[0_2px_8px_rgba(0,0,0,0.35)] transition hover:bg-slate-700 hover:ring-2 hover:ring-green-400/70"
              >
                Restart
              </button>
            )}
          </section>
        )}

        {room.status === "knockout" && gameA && (
          <section className="flex min-h-[68vh] flex-col items-center justify-center gap-4">
            <div className="flex flex-col items-center justify-center gap-5 sm:flex-row">
              <button
                onClick={() => handleChoose(gameA)}
                disabled={choosing}
                className="w-full sm:w-[44vw] max-w-[760px] min-h-[38vh] rounded-xl border border-red-500 bg-slate-950 px-8 py-10 text-center text-3xl font-bold text-slate-50 hover:border-red-400 sm:text-5xl"
              >
                {gameA}
              </button>

              {gameB && (
                <img
                  src="/VSlogo.png"
                  alt="VS"
                  className="h-16 w-16 object-contain sm:h-20 sm:w-20"
                />
              )}

              {gameB && (
                <button
                  onClick={() => handleChoose(gameB)}
                  disabled={choosing}
                  className="w-full sm:w-[44vw] max-w-[760px] min-h-[38vh] rounded-xl border border-blue-500 bg-slate-950 px-8 py-10 text-center text-3xl font-bold text-slate-50 hover:border-blue-400 sm:text-5xl"
                >
                  {gameB}
                </button>
              )}
            </div>
            <p className="text-center text-xs text-slate-500">
              Match {room.currentMatchIndex + 1} of {currentRound.length}
            </p>
          </section>
        )}

        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>
    </main>
  );
}

