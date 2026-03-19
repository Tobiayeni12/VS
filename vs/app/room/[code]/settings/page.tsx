"use client";

import { useParams, useSearchParams, useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function RoomSettingsPage() {
  const params = useParams<{ code: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const code = params.code.toUpperCase();
  const playerId = search.get("playerId") ?? "";
  const name = search.get("name") ?? "";

  const [maxGames, setMaxGames] = useState(8);
  const [maxGamesPerPlayer, setMaxGamesPerPlayer] = useState(2);
  const [vsTitle, setVsTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLeaveRoom() {
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
      const res = await fetch(`/api/rooms/${code}/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          maxGames,
          maxGamesPerPlayer,
          vsTitle,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save settings");

      const params = new URLSearchParams({
        playerId,
        name,
      });
      router.push(`/room/${code}/summary?${params.toString()}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-4 py-8">
      <button
        type="button"
        onClick={handleLeaveRoom}
        className="absolute left-6 top-6 text-sm font-semibold text-white/90 transition hover:text-green-200"
        style={{ fontFamily: "Racing, serif" }}
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

        <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-green-100">
              How many games should participate in this VS?
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
              How many games can each player play?
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
              This limits how many different games each person can bring into the VS.
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
        </form>
      </div>
    </main>
  );
}

