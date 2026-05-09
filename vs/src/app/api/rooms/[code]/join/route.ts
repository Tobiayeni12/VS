import { NextRequest, NextResponse } from "next/server";
import { getRoom, joinRoom } from "@/lib/roomsStore";

type Params = {
  params: {
    code: string;
  };
};

export async function POST(req: NextRequest, { params }: Params) {
  const code = params.code.toUpperCase();
  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";

  if (!name) {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }

  const room = await getRoom(code);
  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  const nameTaken = room.players.some(
    (p) => p.name.trim().toLowerCase() === name.toLowerCase()
  );
  if (nameTaken) {
    return NextResponse.json(
      { error: "That name is already taken in this room." },
      { status: 409 }
    );
  }

  const nonHostCount = room.players.filter((p) => p.id !== room.hostId).length;
  if (nonHostCount >= room.maxPlayers) {
    return NextResponse.json(
      { error: "This room is full." },
      { status: 403 }
    );
  }

  const updated = await joinRoom(code, name);
  if (!updated) {
    return NextResponse.json({ error: "Unable to join" }, { status: 500 });
  }

  const player = updated.players.find(
    (p) => p.name.toLowerCase() === name.toLowerCase()
  );

  return NextResponse.json({
    code: updated.code,
    playerId: player?.id,
  });
}

