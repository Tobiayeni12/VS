"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  code: string;
  hostDisplayName: string;
  playerId: string;
  /** True only when loaded room confirms this client is the host */
  isHost: boolean;
};

export function VsHostFloatingActions({
  code,
  hostDisplayName,
  playerId,
  isHost,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  if (!isHost || !playerId || !code) return null;

  async function refreshRoom() {
    const confirmed = window.confirm(
      "Start a completely new VS? This removes the current room code, wipes games and joined players, and opens a fresh VS settings screen."
    );
    if (!confirmed) return;

    setBusy(true);
    try {
      await fetch(`/api/rooms/${code}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId }),
      }).catch(() => undefined);

      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: hostDisplayName.trim() || "Host" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not create a new room");

      const qp = new URLSearchParams({
        playerId: data.hostId as string,
        name: hostDisplayName.trim() || "Host",
      });
      router.replace(`/room/${data.code}/settings?${qp.toString()}`);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const bubbleBtn =
    "flex h-12 w-12 items-center justify-center rounded-full border border-white/30 bg-green-600/35 text-white shadow-lg backdrop-blur-sm transition hover:bg-green-600/55 hover:border-white/60 focus:outline-none focus:ring-2 focus:ring-green-300/70 disabled:opacity-50";

  return (
    <div
      className="absolute right-4 top-4 z-40 flex flex-row gap-3 sm:right-6 sm:top-6"
      aria-label="Host actions"
    >
      <button
        type="button"
        className={bubbleBtn}
        onClick={refreshRoom}
        disabled={busy}
        title="New VS — new room code and reset"
        aria-label="New VS room"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-6 w-6"
          aria-hidden="true"
        >
          <path d="M21 12a9 9 0 1 1-9-9" />
          <path d="M21 3v9h-9" />
        </svg>
      </button>
      <button
        type="button"
        className={`${bubbleBtn} select-none font-medium`}
        onClick={() => router.push("/")}
        title="Home"
        aria-label="Home"
      >
        {/* House emoji toned white for contrast */}
        <span className="text-xl leading-none brightness-0 invert">🏠</span>
      </button>
    </div>
  );
}
