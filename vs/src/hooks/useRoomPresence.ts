import { useEffect, useRef } from "react";

type Options = {
  code: string;
  playerId: string;
  /** If true, don't send leave (host isn't counted as a player). */
  isHost?: boolean;
};

function sendLeave(code: string, playerId: string) {
  if (!code || !playerId) return;

  const url = `/api/rooms/${code}/leave`;
  const payload = JSON.stringify({ playerId });

  // Best-effort: use sendBeacon when available; fallback to keepalive fetch.
  if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    try {
      navigator.sendBeacon(url, payload);
      return;
    } catch {
      // fallback below
    }
  }

  try {
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // ignore
  }
}

/** Best-effort presence: when tab closes/navigates away, remove the player from the room. */
export function useRoomPresence({ code, playerId, isHost }: Options) {
  const sentRef = useRef(false);

  useEffect(() => {
    sentRef.current = false;

    if (!code || !playerId) return;
    if (isHost) return;

    const onPageHide = () => {
      if (sentRef.current) return;
      sentRef.current = true;
      sendLeave(code, playerId);
    };

    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("beforeunload", onPageHide);
    return () => {
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("beforeunload", onPageHide);
    };
  }, [code, playerId, isHost]);
}

