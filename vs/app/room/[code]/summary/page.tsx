"use client";

import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { RoomState } from "@/lib/gameTypes";

export default function RoomSummaryPage() {
  const params = useParams<{ code: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const code = params.code.toUpperCase();
  const playerId = search.get("playerId") ?? "";
  const name = search.get("name") ?? "";

  const [room, setRoom] = useState<RoomState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

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
  }, []);

  async function handleStart() {
    setStarting(true);
    setError(null);
    try {
      const res = await fetch(`/api/rooms/${code}/round`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "startKnockout" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start game");
      const params = new URLSearchParams({
        playerId,
        name,
      });
      router.push(`/room/${code}/knockout?${params.toString()}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setStarting(false);
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
  const settingsHref = `/room/${code}/settings?${new URLSearchParams({
    playerId,
    name,
  }).toString()}`;

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-4 py-8">
      <button
        type="button"
        onClick={() => router.push(settingsHref)}
        className="absolute left-6 top-6 text-sm font-semibold text-white/90 transition hover:text-green-200"
        style={{ fontFamily: "Racing, serif" }}
      >
        ← Back
      </button>
      <div className="w-full max-w-2xl space-y-8">
        <header className="flex flex-col items-center gap-3 text-center">
          <h1 className="text-4xl font-bold">VS Summary</h1>
          <p className="text-sm text-emerald-200/80">
            Room {room.code} • Host: {name || "Host"}
          </p>
        </header>

        <section className="rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-4 space-y-3">
          <h2 className="text-lg font-semibold text-green-100">Settings</h2>
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
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-green-100">Games list</h2>
            <p className="text-xs text-emerald-200/80">
              {room.gamePool.length} / {room.maxGames} games added
            </p>
          </div>

          <ul className="space-y-1 text-sm text-emerald-100 max-h-64 overflow-y-auto">
            {room.gamePool.map((g, i) => (
              <li
                key={`${g.title}-${i}`}
                className="flex items-center justify-between rounded border border-emerald-500/30 bg-emerald-950/30 px-3 py-1.5"
              >
                <span>
                  {i + 1}. {g.title}
                </span>
                {isHost && (
                  <button
                    onClick={async () => {
                      try {
                        const res = await fetch(`/api/rooms/${code}/settings`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            removeTitle: g.title,
                            playerId,
                          }),
                        });
                        const text = await res.text();
                        const data = text ? JSON.parse(text) : {};
                        if (!res.ok)
                          throw new Error(data.error || "Failed to remove");
                        setRoom(data);
                      } catch (err) {
                        setError((err as Error).message);
                      }
                    }}
                    className="ml-3 text-xs text-slate-500 hover:text-red-400"
                    aria-label={`Remove ${g.title}`}
                    title="Remove"
                  >
                    ×
                  </button>
                )}
              </li>
            ))}
            {room.gamePool.length === 0 && (
              <li className="text-xs text-emerald-200/80">
                No games added yet. Add at least 2 to start.
              </li>
            )}
          </ul>

          {gamesRemaining > 0 && (
            <p className="text-xs text-emerald-200/80">
              Add {gamesRemaining} more game{gamesRemaining === 1 ? "" : "s"} to
              reach the max.
            </p>
          )}
        </section>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          onClick={handleStart}
          disabled={starting || room.gamePool.length < 2}
          className="w-full rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(0,0,0,0.35)] transition hover:bg-slate-700 hover:ring-2 hover:ring-green-400/70 hover:shadow-[0_0_14px_rgba(74,222,128,0.35)] disabled:opacity-60"
        >
          {starting ? "Starting..." : "Start game"}
        </button>
      </div>
    </main>
  );
}

