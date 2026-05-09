"use client";

import { useParams, useSearchParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { normalizeRoomCode, useRoomPolling } from "@/hooks/useRoomPolling";
import { useRoomPresence } from "@/hooks/useRoomPresence";
import { youtubeThumbnail, youtubeWatchUrl } from "@/lib/youtube";

export default function RoomSummaryPage() {
  const params = useParams<{ code: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const code = normalizeRoomCode(params.code);
  const playerId = search.get("playerId") ?? "";
  const name = search.get("name") ?? "";

  const { room, setRoom, loading, error, setError } = useRoomPolling({
    code,
    pollIntervalMs: 1500,
  });

  const isHost = room?.hostId === playerId;
  useRoomPresence({ code, playerId, isHost });

  async function handleBack() {
    if (playerId && code && !isHost) {
      await fetch(`/api/rooms/${code}/leave`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId }),
        keepalive: true,
      }).catch(() => undefined);
    }
    router.push("/join");
  }

  const [youtubeInput, setYoutubeInput] = useState("");
  const [adding, setAdding] = useState(false);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    const isHost = Boolean(playerId && room && room.hostId === playerId);
    if (!isHost) return;

    fetch(`/api/rooms/${code}/settings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markReady: true, playerId }),
    }).catch(() => undefined);
  }, [code, playerId, room?.hostId]);

  async function handleAddGame(e: FormEvent) {
    e.preventDefault();
    if (!youtubeInput.trim()) return;
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
        body: JSON.stringify({ youtubeUrl: youtubeInput.trim(), playerId }),
      });
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      if (!res.ok) throw new Error(data.error || "Failed to add game");
      setRoom(data);
      setYoutubeInput("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setAdding(false);
    }
  }

  async function handleStart() {
    setStarting(true);
    setError(null);
    try {
      const res = await fetch(`/api/rooms/${code}/round`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "startKnockout" }),
      });
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      if (!res.ok) throw new Error(data.error || "Failed to start knockout");
      const qp = new URLSearchParams({
        playerId,
        name,
      });
      router.push(`/room/${code}/knockout?${qp.toString()}`);
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
  const isHostStrict = room.hostId === playerId;
  const canAddGames =
    Boolean(playerId) && !isHostStrict && room.status === "settings";
  const settingsHref = `/room/${code}/settings?${new URLSearchParams({
    playerId,
    name,
  }).toString()}`;

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-4 py-8">
      <button
        type="button"
        onClick={handleBack}
        className="absolute left-6 top-6 text-sm font-semibold text-white/90 transition hover:text-green-200"
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

          {canAddGames ? (
            <form
              onSubmit={handleAddGame}
              className="flex flex-col gap-2 sm:flex-row"
            >
              <input
                className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
                value={youtubeInput}
                onChange={(e) => setYoutubeInput(e.target.value)}
                placeholder="Paste a YouTube URL…"
                disabled={room.gamePool.length >= room.maxGames}
                autoComplete="off"
                spellCheck={false}
              />
              <button
                type="submit"
                disabled={adding || room.gamePool.length >= room.maxGames}
                className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-60"
              >
                {adding ? "Adding..." : "Add"}
              </button>
            </form>
          ) : (
            <p className="text-xs text-emerald-200/80">
              {isHost
                ? "Host view: only players who join with the code can add games."
                : "Join the room to add games."}
            </p>
          )}

          <ul className="space-y-1 text-sm text-emerald-100 max-h-64 overflow-y-auto">
            {room.gamePool.map((g, i) => (
              <li
                key={`${g.videoId}-${i}`}
                className="flex items-center justify-between gap-2 rounded border border-emerald-500/30 bg-emerald-950/30 px-2 py-1.5"
              >
                <span className="flex min-w-0 flex-1 gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={g.thumbnailUrl || youtubeThumbnail(g.videoId)}
                    alt=""
                    className="h-12 w-20 shrink-0 rounded bg-black object-cover"
                  />
                  <span className="min-w-0 flex flex-col justify-center gap-0.5 text-emerald-100">
                    <span className="text-xs font-semibold text-emerald-200">#{i + 1}</span>
                    <span className="line-clamp-2 text-sm font-medium text-emerald-50">
                      {g.title || "Game"}
                    </span>
                    <a
                      href={youtubeWatchUrl(g.videoId)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate text-[11px] text-green-300 hover:underline"
                    >
                      Open on YouTube
                    </a>
                  </span>
                </span>
                {isHost && (
                  <button
                    onClick={async () => {
                      try {
                        const res = await fetch(`/api/rooms/${code}/settings`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            removeVideoId: g.videoId,
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
                  >
                    ×
                  </button>
                )}
              </li>
            ))}
            {room.gamePool.length === 0 && (
              <li className="text-xs text-emerald-200/80">
                No games added yet. Add at least two to start.
              </li>
            )}
          </ul>

          {gamesRemaining > 0 && (
            <p className="text-xs text-emerald-200/80">
              Add {gamesRemaining} more game{gamesRemaining === 1 ? "" : "s"} to reach
              the max.
            </p>
          )}
        </section>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          onClick={handleStart}
          disabled={starting || room.gamePool.length < 2}
          className="w-full rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(0,0,0,0.35)] transition hover:bg-slate-700 hover:ring-2 hover:ring-green-400/70 hover:shadow-[0_0_14px_rgba(74,222,128,0.35)] disabled:opacity-60"
        >
          {starting ? "Starting..." : "Start knockout"}
        </button>
      </div>
    </main>
  );
}

