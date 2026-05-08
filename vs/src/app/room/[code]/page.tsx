"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import type { RoomState } from "@/lib/gameTypes";
import { youtubeThumbnail, youtubeWatchUrl } from "@/lib/youtube";

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
  const [youtubeInput, setYoutubeInput] = useState("");
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
    if (!youtubeInput.trim()) return;
    if (!playerId) {
      setError("Join the room to add videos.");
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
      if (!res.ok) throw new Error(data.error || "Failed to add video");
      setRoom(data);
      setYoutubeInput("");
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
  const waitingForHostSummary =
    room.status === "settings" && !room.hostReady && !isHost;
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
      >
        ← Back
      </button>
      <div className="w-full max-w-2xl space-y-8">
        {waitingForHostSummary && (
          <section className="rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-6 text-center">
            <h2 className="text-xl font-bold text-green-100">Waiting for host</h2>
            <p className="mt-2 text-sm text-emerald-200/80">
              The host is resetting this VS. You can continue when the host opens the VS Summary page.
            </p>
          </section>
        )}

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
              Total slots in this VS:{" "}
              <span className="font-semibold">{room.maxGames}</span>
            </li>
            <li>
              Max videos per player:{" "}
              <span className="font-semibold">{room.maxGamesPerPlayer}</span>
            </li>
          </ul>
        </section>

        <section className="rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-4 space-y-3">
          <h2 className="text-lg font-semibold text-green-100">Add YouTube clips</h2>
          {waitingForHostSummary ? (
            <p className="text-xs text-emerald-200/80">
              Video submissions are locked until the host opens VS Summary.
            </p>
          ) : canAddGames ? (
            <>
              <form
                onSubmit={handleAddGame}
                className="flex flex-col gap-2 sm:flex-row"
              >
                <input
                  className="flex-1 rounded-lg border border-emerald-500/30 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-100 outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400"
                  value={youtubeInput}
                  onChange={(e) => setYoutubeInput(e.target.value)}
                  placeholder="Paste a YouTube URL or video ID"
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
                <span className="font-semibold">{myRemaining}</span> more video
                {myRemaining === 1 ? "" : "s"}. Total list:{" "}
                {room.gamePool.length} / {room.maxGames}.
              </p>
            </>
          ) : (
            <p className="text-xs text-emerald-200/80">
              {hasStarted
                ? "The VS has started, so no more videos can be added."
                : isHost
                ? "Host view is managed from the settings/summary screens."
                : "Join VS with a name to add videos."}
            </p>
          )}
        </section>

        <section className="rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-green-100">Videos in this VS</h2>
            <p className="text-xs text-emerald-200/80">
              {room.gamePool.length} / {room.maxGames}
            </p>
          </div>
          <ul className="space-y-1 text-sm text-emerald-100 max-h-64 overflow-y-auto">
            {room.gamePool.map((g, i) => (
              <li
                key={`${g.videoId}-${i}`}
                className="flex gap-3 rounded border border-emerald-500/30 bg-emerald-950/30 px-2 py-1.5"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={youtubeThumbnail(g.videoId)}
                  alt=""
                  className="h-12 w-20 shrink-0 rounded bg-black object-cover"
                />
                <div className="min-w-0 flex-1 text-xs leading-tight text-emerald-100">
                  <span className="font-semibold">#{i + 1}</span>
                  <a
                    href={youtubeWatchUrl(g.videoId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 block truncate text-green-300 hover:underline"
                  >
                    youtube.com/watch?v={g.videoId}
                  </a>
                </div>
              </li>
            ))}
            {room.gamePool.length === 0 && (
              <li className="text-xs text-emerald-200/80">
                No clips yet. Paste YouTube links in the box above.
              </li>
            )}
          </ul>
        </section>

        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>
    </main>
  );
}

