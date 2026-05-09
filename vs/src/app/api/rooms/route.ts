import { NextRequest, NextResponse } from "next/server";
import { createRoom, RoomPersistError } from "@/lib/roomsStore";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" && body.name.trim() ? body.name.trim() : "Host";

  try {
    const room = await createRoom(name);
    return NextResponse.json({
      code: room.code,
      hostId: room.hostId,
    });
  } catch (err) {
    if (err instanceof RoomPersistError) {
      return NextResponse.json(
        {
          error:
            "Could not save the room to storage. Wait a moment and create again.",
        },
        { status: 503 }
      );
    }
    throw err;
  }
}

