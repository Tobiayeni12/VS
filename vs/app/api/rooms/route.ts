import { NextRequest, NextResponse } from "next/server";
import { createRoom } from "@/lib/roomsStore";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const name =
    typeof body.name === "string" && body.name.trim()
      ? body.name.trim()
      : "Host";

  const room = createRoom(name);

  return NextResponse.json({
    code: room.code,
    hostId: room.hostId,
  });
}

