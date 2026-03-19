import { NextRequest, NextResponse } from "next/server";
import { setSettings, getRoom } from "@/lib/roomsStore";

type Params = {
  params: {
    code: string;
  };
};

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const code = params.code.toUpperCase();
    const body = await req.json().catch(() => ({}));
    const { maxGames, maxGamesPerPlayer, gameTitle, playerId, vsTitle } = body as {
      maxGames?: number;
      maxGamesPerPlayer?: number;
      gameTitle?: string;
      playerId?: string;
      vsTitle?: string;
    };

    if (typeof gameTitle === "string" && gameTitle.trim()) {
      const room = getRoom(code);
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

      const clean = gameTitle.trim();
      if (!clean) {
        return NextResponse.json(
          { error: "Empty game title" },
          { status: 400 }
        );
      }

      room.gamePool.push({ title: clean, submittedBy: playerId });
      room.playerGameCounts[playerId] = currentCount + 1;

      return NextResponse.json(room);
    }

    if (
      typeof maxGames === "number" &&
      typeof maxGamesPerPlayer === "number"
    ) {
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

