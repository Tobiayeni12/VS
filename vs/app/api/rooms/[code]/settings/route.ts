import { NextRequest, NextResponse } from "next/server";
import {
  setSettings,
  getRoomWithBriefRetry,
  markHostReady,
  saveRoom,
} from "@/lib/roomsStore";
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
      maxPlayers,
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
      maxPlayers?: number;
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

      const room = await markHostReady(code, playerId);
      if (!room) {
        return NextResponse.json(
          { error: "Room not found or not authorized" },
          { status: 403 }
        );
      }

      return NextResponse.json(room);
    }

    const roomForRemove = await getRoomWithBriefRetry(code);
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
        return NextResponse.json({ error: "Game not found in list" }, { status: 404 });
      }

      const [removed] = roomForRemove.gamePool.splice(idx, 1);
      if (removed) {
        const prev = roomForRemove.playerGameCounts[removed.submittedBy] ?? 0;
        roomForRemove.playerGameCounts[removed.submittedBy] = Math.max(
          0,
          prev - 1
        );
      }

      await saveRoom(roomForRemove);
      return NextResponse.json(roomForRemove);
    }

    const paste =
      typeof youtubeUrl === "string"
        ? youtubeUrl.trim()
        : typeof gameTitle === "string"
          ? gameTitle.trim()
          : "";

    if (paste) {
      const room = await getRoomWithBriefRetry(code);
      if (!room) {
        return NextResponse.json({ error: "Room not found" }, { status: 404 });
      }
      if (room.status !== "settings") {
        return NextResponse.json(
          { error: "Cannot add games after the VS has started" },
          { status: 400 }
        );
      }
      if (!playerId) {
        return NextResponse.json(
          { error: "playerId required to add games" },
          { status: 400 }
        );
      }
      if (playerId === room.hostId) {
        return NextResponse.json(
          { error: "Host cannot add games" },
          { status: 403 }
        );
      }

      const currentCount = room.playerGameCounts[playerId] ?? 0;
      if (currentCount >= room.maxGamesPerPlayer) {
        return NextResponse.json(
          { error: "You have already added the maximum number of games" },
          { status: 400 }
        );
      }

      if (room.gamePool.length >= room.maxGames) {
        return NextResponse.json(
          { error: "Game list is already full" },
          { status: 400 }
        );
      }

      const videoId = parseYouTubeVideoId(paste);
      if (!videoId) {
        return NextResponse.json(
          { error: "Paste a valid YouTube link or 11-character ID" },
          { status: 400 }
        );
      }

      if (room.gamePool.some((g) => videoIdsEqual(g.videoId, videoId))) {
        return NextResponse.json(
          { error: "That game is already in the list" },
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

      await saveRoom(room);
      return NextResponse.json(room);
    }

    if (
      typeof maxGames === "number" &&
      typeof maxGamesPerPlayer === "number" &&
      typeof maxPlayers === "number"
    ) {
      const roomBefore = await getRoomWithBriefRetry(code);
      if (!roomBefore) {
        return NextResponse.json({ error: "Room not found" }, { status: 404 });
      }
      const nonHostCount = roomBefore.players.filter(
        (p) => p.id !== roomBefore.hostId
      ).length;
      const capPlayers = Math.max(1, Math.min(32, Math.floor(maxPlayers)));
      if (capPlayers < nonHostCount) {
        return NextResponse.json(
          {
            error: `Max players must be at least ${nonHostCount} (${nonHostCount} already joined).`,
          },
          { status: 400 }
        );
      }
      const room = await setSettings(
        code,
        maxGames,
        maxGamesPerPlayer,
        capPlayers,
        vsTitle
      );
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
