import { NextRequest, NextResponse } from "next/server";
import { setSettings, getRoom, markHostReady } from "@/lib/roomsStore";
import {
  fetchYoutubeMetadata,
  parseYouTubeVideoId,
  videoIdsEqual,
} from "@/lib/youtube";

type Params = {
  params: {
    code: string;
  };
};

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const code = params.code.toUpperCase();
    const body = await req.json().catch(() => ({}));

    const {
      maxGames,
      maxGamesPerPlayer,
      youtubeUrl,
      gameTitle,
      playerId,
      removeVideoId,
      removeTitle,
      vsTitle,
      markReady,
    } = body as {
      maxGames?: number;
      maxGamesPerPlayer?: number;
      youtubeUrl?: string;
      gameTitle?: string;
      playerId?: string;
      removeVideoId?: string;
      removeTitle?: string;
      vsTitle?: string;
      markReady?: boolean;
    };

    if (markReady === true) {
      if (!playerId) {
        return NextResponse.json(
          { error: "playerId required to mark host ready" },
          { status: 400 }
        );
      }

      const room = markHostReady(code, playerId);
      if (!room) {
        return NextResponse.json(
          { error: "Room not found or not authorized" },
          { status: 403 }
        );
      }

      return NextResponse.json(room);
    }

    const roomForRemove = getRoom(code);
    const removeCandidate =
      typeof removeVideoId === "string"
        ? removeVideoId.trim()
        : typeof removeTitle === "string"
          ? removeTitle.trim()
          : "";

    if (removeCandidate) {
      if (!roomForRemove) {
        return NextResponse.json({ error: "Room not found" }, { status: 404 });
      }
      if (playerId !== roomForRemove.hostId) {
        return NextResponse.json(
          { error: "Only host can remove entries" },
          { status: 403 }
        );
      }

      const targetId =
        parseYouTubeVideoId(removeCandidate) ?? removeCandidate;

      const idx = roomForRemove.gamePool.findIndex((g) =>
        videoIdsEqual(g.videoId, targetId)
      );
      if (idx === -1) {
        return NextResponse.json({ error: "Video not found in list" }, { status: 404 });
      }

      const [removed] = roomForRemove.gamePool.splice(idx, 1);
      if (removed) {
        const prev = roomForRemove.playerGameCounts[removed.submittedBy] ?? 0;
        roomForRemove.playerGameCounts[removed.submittedBy] = Math.max(
          0,
          prev - 1
        );
      }

      return NextResponse.json(roomForRemove);
    }

    const paste =
      typeof youtubeUrl === "string"
        ? youtubeUrl.trim()
        : typeof gameTitle === "string"
          ? gameTitle.trim()
          : "";

    if (paste) {
      const room = getRoom(code);
      if (!room) {
        return NextResponse.json({ error: "Room not found" }, { status: 404 });
      }
      if (room.status !== "settings") {
        return NextResponse.json(
          { error: "Cannot add videos after the VS has started" },
          { status: 400 }
        );
      }
      if (!playerId) {
        return NextResponse.json(
          { error: "playerId required to add videos" },
          { status: 400 }
        );
      }
      if (playerId === room.hostId) {
        return NextResponse.json(
          { error: "Host cannot add videos" },
          { status: 403 }
        );
      }

      const currentCount = room.playerGameCounts[playerId] ?? 0;
      if (currentCount >= room.maxGamesPerPlayer) {
        return NextResponse.json(
          { error: "You have already added the maximum number of videos" },
          { status: 400 }
        );
      }

      if (room.gamePool.length >= room.maxGames) {
        return NextResponse.json(
          { error: "Video list is already full" },
          { status: 400 }
        );
      }

      const videoId = parseYouTubeVideoId(paste);
      if (!videoId) {
        return NextResponse.json(
          { error: "Paste a valid YouTube link or 11-character video ID" },
          { status: 400 }
        );
      }

      if (room.gamePool.some((g) => videoIdsEqual(g.videoId, videoId))) {
        return NextResponse.json(
          { error: "That video is already in the list" },
          { status: 400 }
        );
      }

      const meta = await fetchYoutubeMetadata(videoId);
      room.gamePool.push({
        videoId,
        title: meta.title,
        thumbnailUrl: meta.thumbnailUrl,
        submittedBy: playerId,
      });
      room.playerGameCounts[playerId] = currentCount + 1;

      return NextResponse.json(room);
    }

    if (typeof maxGames === "number" && typeof maxGamesPerPlayer === "number") {
      const room = setSettings(code, maxGames, maxGamesPerPlayer, vsTitle);
      if (!room)
        return NextResponse.json({ error: "Room not found" }, { status: 404 });
      return NextResponse.json(room);
    }

    return NextResponse.json(
      { error: "Invalid settings payload" },
      { status: 400 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Internal error" },
      { status: 500 }
    );
  }
}
