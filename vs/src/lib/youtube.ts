/** Extract a canonical YouTube video id from pasted URL or raw id string. */

const ID_RE = /^[a-zA-Z0-9_-]{11}$/;

export function parseYouTubeVideoId(input: string): string | null {
  const s = input.trim();
  if (!s) return null;
  if (ID_RE.test(s)) return s.toLowerCase();

  try {
    const url = new URL(/^[a-z]+:\/\//i.test(s) ? s : `https://${s}`);
    const host = url.hostname.replace(/^www\./i, "");

    if (host === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0]?.split("?")[0];
      return id && ID_RE.test(id) ? id.toLowerCase() : null;
    }

    if (host.endsWith("youtube.com")) {
      const v = url.searchParams.get("v");
      if (v && ID_RE.test(v)) return v.toLowerCase();

      const parts = url.pathname.split("/").filter(Boolean);
      for (const marker of ["embed", "shorts", "live"] as const) {
        const i = parts.indexOf(marker);
        if (i >= 0 && parts[i + 1]) {
          const id = parts[i + 1]!.split("?")[0];
          if (id && ID_RE.test(id)) return id.toLowerCase();
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
