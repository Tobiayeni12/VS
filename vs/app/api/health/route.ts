import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    return NextResponse.json({
      youtube: "missing",
      detail: "YOUTUBE_API_KEY env var is not set",
    }, { status: 200 });
  }

  // Test with a known stable video (YouTube's own "Me at the zoo" - first ever YouTube video)
  const testVideoId = "jNQXAC9IVRw";
  try {
    const url = new URL("https://www.googleapis.com/youtube/v3/videos");
    url.searchParams.set("part", "snippet");
    url.searchParams.set("id", testVideoId);
    url.searchParams.set("key", apiKey);

    const r = await fetch(url.toString(), { cache: "no-store" });
    const j = await r.json() as {
      items?: { snippet?: { title?: string } }[];
      error?: { message?: string; status?: string };
    };

    if (!r.ok) {
      return NextResponse.json({
        youtube: "error",
        status: r.status,
        detail: j.error?.message ?? "Unknown error from YouTube API",
      });
    }

    const title = j.items?.[0]?.snippet?.title;
    return NextResponse.json({
      youtube: "ok",
      keyConfigured: true,
      testVideo: title ?? "(no title returned)",
    });
  } catch (err) {
    return NextResponse.json({
      youtube: "error",
      detail: (err as Error).message,
    });
  }
}
