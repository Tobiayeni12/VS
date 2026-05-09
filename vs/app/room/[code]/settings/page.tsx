"use client";

import { useParams, useSearchParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { VsHostFloatingActions } from "@/components/VsHostFloatingActions";
import { normalizeRoomCode, useRoomPolling } from "@/hooks/useRoomPolling";

export default function RoomSettingsPage() {
  const params = useParams<{ code: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const code = normalizeRoomCode(params.code);
  const playerId = search.get("playerId") ?? "";
  const name = search.get("name") ?? "";
  const summaryHref = `/room/${code}/summary?${new URLSearchParams({
    playerId,
    name,
  }).toString()}`;

  const { room, loading: roomLoading, error: roomError, fetchState } =
    useRoomPolling({
      code,
      pollIntervalMs: 1500,
    });

  const [maxPlayers, setMaxPlayers] = useState(32);
  const [maxGames, setMaxGames] = useState(8);
  const [maxGamesPerPlayer, setMaxGamesPerPlayer] = useState(2);
  const [vsTitle, setVsTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const initializedRef = useRef(false);
  useEffect(() => {
    initializedRef.current = false;
  }, [code]);

  useEffect(() => {
    if (!room) return;
    if (initializedRef.current) return;
    initializedRef.current = true;
    setMaxPlayers(room.maxPlayers);
    setMaxGames(room.maxGames);
    setMaxGamesPerPlayer(room.maxGamesPerPlayer);
    setVsTitle(room.vsTitle ?? "");
  }, [room]);

  async function handleLeaveRoomCode() {
    const confirmed = window.confirm(
      "Leave this room and clear this lobby code? All joined users in this room will be removed."
    );
    if (!confirmed) return;

    if (playerId) {
      await fetch(`/api/rooms/${code}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId }),
      }).catch(() => undefined);
    }
    router.push("/create");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      for (let attempt = 0; attempt < 2; attempt++) {
        const res = await fetch(`/api/rooms/${code}/settings`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            maxPlayers,
            maxGames,
            maxGamesPerPlayer,
            vsTitle,
          }),
        });

        const text = await res.text();
        const data = text ? JSON.parse(text) : {};
        if (!res.ok) {
          const msg = typeof data.error === "string" ? data.error : "";
          if (
            attempt === 0 &&
            res.status === 404 &&
            msg.toLowerCase().includes("not found")
          ) {
            await new Promise((r) => setTimeout(r, 400));
            await fetchState();
            continue;
          }
          throw new Error(data.error || "Failed to save settings");
        }

        const qp = new URLSearchParams({
          playerId,
          name,
        });
        router.push(`/room/${code}/summary?${qp.toString()}`);
        break;
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-4 py-8">
      <VsHostFloatingActions
        code={code}
        hostDisplayName={name}
        playerId={playerId}
        isHost={Boolean(room && playerId === room.hostId)}
      />
      <button
        type="button"
        onClick={() => router.push(summaryHref)}
        className="absolute left-6 top-6 text-sm font-semibold text-white/90 transition hover:text-green-200"
      >
        ← Back
      </button>
      <div className="w-full max-w-2xl space-y-8">
        <header className="flex flex-col items-center gap-3 text-center">
          <h1 className="text-4xl font-bold">VS Settings</h1>
          <p className="text-sm text-emerald-200/80">
            Room {code} • Host: {name || "Host"}
          </p>
        </header>

        {roomError && (
          <p className="text-center text-sm text-red-400">{roomError}</p>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-4"
        >
          <div className="space-y-2">
            <label className="block text-sm font-medium text-green-100">
              Max players
            </label>
            <select
              className="w-full rounded-lg border border-emerald-500/30 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-100 outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400"
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(Number(e.target.value))}
            >
              {Array.from({ length: 32 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <p className="text-xs text-emerald-200/80">
              Only this many people can join with the room code before the VS
              starts.
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-green-100">
              How many games should be in this VS?
            </label>
            <select
              className="w-full rounded-lg border border-emerald-500/30 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-100 outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400"
              value={maxGames}
              onChange={(e) => setMaxGames(Number(e.target.value))}
            >
              {Array.from({ length: 32 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-green-100">
              How many games can each player submit?
            </label>
            <select
              className="w-full rounded-lg border border-emerald-500/30 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-100 outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400"
              value={maxGamesPerPlayer}
              onChange={(e) => setMaxGamesPerPlayer(Number(e.target.value))}
            >
              {Array.from({ length: maxGames }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <p className="text-xs text-emerald-200/80">
              Each player submits that many games (via YouTube link) before the
              knockout starts.
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-green-100">
              Title of the VS
            </label>
            <input
              className="w-full rounded-lg border border-emerald-500/30 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-100 outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400"
              value={vsTitle}
              onChange={(e) => setVsTitle(e.target.value)}
              placeholder="Enter VS title"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(0,0,0,0.35)] transition hover:bg-slate-700 hover:ring-2 hover:ring-green-400/70 hover:shadow-[0_0_14px_rgba(74,222,128,0.35)] disabled:opacity-60"
          >
            {loading ? "Saving..." : "Next"}
          </button>

          <button
            type="button"
            onClick={handleLeaveRoomCode}
            className="w-full text-sm font-semibold text-red-300 transition hover:text-red-200"
          >
            Leave room code
          </button>
        </form>

        <div className="flex w-full justify-center pt-2">
          <div className="flex flex-col items-center rounded-xl border border-emerald-500/40 bg-emerald-950/30 px-6 py-4 text-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-9 w-9 text-emerald-200"
              aria-hidden="true"
            >
              <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-4.418 0-8 2.239-8 5v1h16v-1c0-2.761-3.582-5-8-5Z" />
            </svg>
            <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-emerald-200/80">
              Players
            </p>
            <p className="mt-1 text-3xl font-extrabold text-emerald-50 tabular-nums">
              {roomLoading && !room
                ? "0"
                : Math.max(0, (room?.players?.length ?? 0) - 1)}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

