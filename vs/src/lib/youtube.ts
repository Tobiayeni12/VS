/** Extract YouTube video id from pasted URL or raw id. Preserves exact casing (required for valid watch URLs). */

const ID_RE = /^[a-zA-Z0-9_-]{11}$/;

export function parseYouTubeVideoId(input: string): string | null {
  const s = input.trim();
  if (!s) return null;
  if (ID_RE.test(s)) return s;

  try {
    const url = new URL(/^[a-z]+:\/\//i.test(s) ? s : `https://${s}`);
    const host = url.hostname.replace(/^www\./i, "");

    if (host === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0]?.split("?")[0];
      return id && ID_RE.test(id) ? id : null;
    }

    if (host.endsWith("youtube.com")) {
      const v = url.searchParams.get("v");
      if (v && ID_RE.test(v)) return v;

      const parts = url.pathname.split("/").filter(Boolean);
      for (const marker of ["embed", "shorts", "live"] as const) {
        const i = parts.indexOf(marker);
        if (i >= 0 && parts[i + 1]) {
          const id = parts[i + 1]!.split("?")[0];
          if (id && ID_RE.test(id)) return id;
        }
      }
    }
  } catch {
    /* not a usable URL */
  }

  return null;
}

export function youtubeThumbnail(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
}

export function youtubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export function youtubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}`;
}

export function videoIdsEqual(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

/** Title + thumbnail via YouTube Data API v3 when YOUTUBE_API_KEY is set,
 *  falling back to oEmbed (no key required, fine for low-volume / dev use). */
export async function fetchYoutubeMetadata(videoId: string): Promise<{
  title: string;
  thumbnailUrl: string;
}> {
  const apiKey = process.env.YOUTUBE_API_KEY;

  // --- YouTube Data API v3 (preferred) ---
  if (apiKey) {
    try {
      const url = new URL("https://www.googleapis.com/youtube/v3/videos");
      url.searchParams.set("part", "snippet");
      url.searchParams.set("id", videoId);
      url.searchParams.set("key", apiKey);

      const r = await fetch(url.toString(), { cache: "no-store" });
      if (r.ok) {
        const j = await r.json() as {
          items?: { snippet?: { title?: string; thumbnails?: { medium?: { url?: string } } } }[];
        };
        const snippet = j.items?.[0]?.snippet;
        if (snippet) {
          const title = typeof snippet.title === "string" && snippet.title.trim()
            ? snippet.title.trim()
            : "Game";
          const thumbnailUrl = snippet.thumbnails?.medium?.url ?? youtubeThumbnail(videoId);
          return { title, thumbnailUrl };
        }
      }
    } catch {
      /* fall through to oEmbed */
    }
  }

  // --- oEmbed fallback (no API key needed) ---
  try {
    const oembed = new URL("https://www.youtube.com/oembed");
    oembed.searchParams.set("url", youtubeWatchUrl(videoId));
    oembed.searchParams.set("format", "json");

    const r = await fetch(oembed.toString(), {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (r.ok) {
      const j = (await r.json()) as { title?: string; thumbnail_url?: string };
      const title = typeof j.title === "string" && j.title.trim()
        ? j.title.trim()
        : "Game";
      const thumbnailUrl = typeof j.thumbnail_url === "string" && j.thumbnail_url.startsWith("http")
        ? j.thumbnail_url
        : youtubeThumbnail(videoId);
      return { title, thumbnailUrl };
    }
  } catch {
    /* use generic fallback */
  }

  return { title: "Game", thumbnailUrl: youtubeThumbnail(videoId) };
}
