import { NextRequest, NextResponse } from "next/server";
import { touchPlayerPresence } from "@/lib/roomsStore";

type Params = {
  params: {
    code: string;
  };
};

export async function POST(req: NextRequest, { params }: Params) {
  const code = params.code.toUpperCase();
  const body = await req.json().catch(() => ({}));

  const playerId =
    typeof (body as { playerId?: unknown }).playerId === "string"
      ? (body as { playerId: string }).playerId.trim()
      : "";

  if (!playerId) {
    return NextResponse.json({ error: "playerId required" }, { status: 400 });
  }

  const ok = await touchPlayerPresence(code, playerId);
  if (!ok) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  return new NextResponse(null, { status: 204 });
}
