import { NextRequest, NextResponse } from "next/server";
import { deleteRoom } from "@/lib/roomsStore";

type Params = {
  params: {
    code: string;
  };
};

export async function DELETE(req: NextRequest, { params }: Params) {
  const code = params.code.toUpperCase();
  const body = await req.json().catch(() => ({}));
  const playerId = typeof body.playerId === "string" ? body.playerId : "";

  if (!playerId) {
    return NextResponse.json({ error: "playerId required" }, { status: 400 });
  }

  const deleted = deleteRoom(code, playerId);
  if (!deleted) {
    return NextResponse.json(
      { error: "Room not found or not authorized" },
      { status: 403 }
    );
  }

  return NextResponse.json({ ok: true });
}
