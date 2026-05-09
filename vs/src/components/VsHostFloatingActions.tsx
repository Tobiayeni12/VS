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

  // Icon size aligns with «← Back» links (text-sm ≈ 0.875rem); bubbles stay modest for mobile headers.
  const bubbleBtn =
    "flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-green-600/35 text-white shadow-md backdrop-blur-sm transition hover:bg-green-600/55 hover:border-white/60 focus:outline-none focus:ring-2 focus:ring-green-300/70 disabled:opacity-50";

  return (
    <div
      className="absolute right-6 top-6 z-40 flex flex-row gap-2"
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
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/vs-reset-icon.png"
          alt=""
          className="size-3.5 object-contain"
          aria-hidden="true"
          draggable={false}
        />
      </button>
      <button
        type="button"
        className={`${bubbleBtn} select-none`}
        onClick={() => router.push("/")}
        title="Home"
        aria-label="Home"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/vs-home-icon.png"
          alt=""
          className="size-3.5 object-contain"
          aria-hidden="true"
          draggable={false}
        />
      </button>
    </div>
  );
}
