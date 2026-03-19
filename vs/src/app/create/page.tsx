"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function CreatePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name || "Host" }),
      });
      if (!res.ok) throw new Error("Failed to create room");
      const data = await res.json();
      const params = new URLSearchParams({
        playerId: data.hostId,
        name: name || "Host",
      });
      router.push(`/room/${data.code}/settings?${params.toString()}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-4">
      <button
        type="button"
        onClick={() => router.push("/")}
        className="absolute left-6 top-6 text-sm font-semibold text-white/90 transition hover:text-green-200"
        style={{ fontFamily: "Racing, serif" }}
      >
        ← Back
      </button>
      <div className="w-full max-w-md space-y-6">
        <h1 className="text-3xl font-bold text-center">Create VS</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-200">
              Your name
            </label>
            <input
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Host"
            />
          </div>
          {error && (
            <p className="text-sm text-red-400 text-center">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full text-sm font-semibold text-green-300 transition hover:text-green-200 disabled:opacity-60"
          >
            {loading ? "Creating..." : "Create room"}
          </button>
        </form>
      </div>
    </main>
  );
}

