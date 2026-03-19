"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import type { RoomState } from "@/lib/gameTypes";

export default function RoomLobbyPage() {
  const params = useParams<{ code: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const code = params.code.toUpperCase();
  const playerId = search.get("playerId") ?? "";
  const name = search.get("name") ?? "";

  const [room, setRoom] = useState<RoomState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gameTitle, setGameTitle] = useState("");
  const [adding, setAdding] = useState(false);

  async function fetchState() {
    try {
      const res = await fetch(`/api/rooms/${code}/state`);
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
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
    const id = setInterval(fetchState, 1500);
    return () => clearInterval(id);
  }, []);

  async function handleAddGame(e: FormEvent) {
    e.preventDefault();
    if (!gameTitle.trim()) return;
    if (!playerId) {
      setError("Join the room to add games.");
      return;
    }
    setAdding(true);
    setError(null);
    try {
      const res = await fetch(`/api/rooms/${code}/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameTitle, playerId }),
      });
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      if (!res.ok) throw new Error(data.error || "Failed to add game");
      setRoom(data);
      setGameTitle("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setAdding(false);
    }
  }

  if (loading && !room) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-slate-300">Loading room…</p>
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

  const gamesRemaining = room.maxGames - room.gamePool.length;
  const isHost = room.hostId === playerId;
  const canAddGames = Boolean(playerId) && !isHost && room.status === "settings";
  const hasStarted = room.status !== "settings";
  const myCount = playerId ? room.playerGameCounts?.[playerId] ?? 0 : 0;
  const myRemaining = Math.max(0, room.maxGamesPerPlayer - myCount);
  const listFull = room.gamePool.length >= room.maxGames;
  const reachedMyLimit = myRemaining <= 0;

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-4 py-8">
      <button
        type="button"
        onClick={() => router.push("/join")}
        className="absolute left-6 top-6 text-sm font-semibold text-white/90 transition hover:text-green-200"
        style={{ fontFamily: "Racing, serif" }}
      >
        ← Back
      </button>
      <div className="w-full max-w-2xl space-y-8">
        <header className="flex flex-col items-center gap-3 text-center">
          <h1 className="text-4xl font-bold">Room {room.code}</h1>
          <p className="text-sm text-emerald-200/80">
            You are {name || "a viewer"}
          </p>
        </header>

        <section className="rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-4 space-y-3">
          <h2 className="text-lg font-semibold text-green-100">VS settings</h2>
          <ul className="text-sm text-emerald-100/90 space-y-1">
            <li>
              Title of VS:{" "}
              <span className="font-semibold">{room.vsTitle || "Untitled VS"}</span>
            </li>
            <li>
              Total games in this VS:{" "}
              <span className="font-semibold">{room.maxGames}</span>
            </li>
            <li>
              Max games per player:{" "}
              <span className="font-semibold">{room.maxGamesPerPlayer}</span>
            </li>
          </ul>
        </section>

        <section className="rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-4 space-y-3">
          <h2 className="text-lg font-semibold text-green-100">Add your games</h2>
          {canAddGames ? (
            <>
              <form
                onSubmit={handleAddGame}
                className="flex flex-col gap-2 sm:flex-row"
              >
                <input
                  className="flex-1 rounded-lg border border-emerald-500/30 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-100 outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400"
                  value={gameTitle}
                  onChange={(e) => setGameTitle(e.target.value)}
                  placeholder="Type a game title"
                  disabled={listFull || reachedMyLimit}
                />
                <button
                  type="submit"
                  disabled={adding || listFull || reachedMyLimit}
                  className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-slate-200 disabled:opacity-60"
                >
                  {adding ? "Adding..." : "Add"}
                </button>
              </form>
              <p className="text-xs text-emerald-200/80">
                You can add{" "}
                <span className="font-semibold">{myRemaining}</span> more game
                {myRemaining === 1 ? "" : "s"}. Total list:{" "}
                {room.gamePool.length} / {room.maxGames}.
              </p>
            </>
          ) : (
            <p className="text-xs text-emerald-200/80">
              {hasStarted
                ? "The VS has started, so no more games can be added."
                : isHost
                ? "Host view is managed from the settings/summary screens."
                : "Join VS with a name to add games."}
            </p>
          )}
        </section>

        <section className="rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-green-100">Games in this VS</h2>
            <p className="text-xs text-emerald-200/80">
              {room.gamePool.length} / {room.maxGames}
            </p>
          </div>
          <ul className="space-y-1 text-sm text-emerald-100 max-h-64 overflow-y-auto">
            {room.gamePool.map((g, i) => (
              <li
                key={`${g.title}-${i}`}
                className="rounded border border-emerald-500/30 bg-emerald-950/30 px-3 py-1.5"
              >
                {i + 1}. {g.title}
              </li>
            ))}
            {room.gamePool.length === 0 && (
              <li className="text-xs text-emerald-200/80">
                No games added yet. Viewers can add games using the box above.
              </li>
            )}
          </ul>
        </section>

        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>
    </main>
  );
}

