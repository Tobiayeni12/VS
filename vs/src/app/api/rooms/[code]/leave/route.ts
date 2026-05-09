import { NextRequest, NextResponse } from "next/server";
import { leaveRoom } from "@/lib/roomsStore";

type Params = {
  params: {
    code: string;
  };
};

export async function POST(req: NextRequest, { params }: Params) {
  const code = params.code.toUpperCase();

  // sendBeacon may not set application/json; accept raw text too.
  const raw = await req.text().catch(() => "");
  let body: unknown = {};
  try {
    body = raw ? JSON.parse(raw) : {};
  } catch {
    body = {};
  }

  const playerId =
    typeof (body as { playerId?: unknown }).playerId === "string"
      ? (body as { playerId: string }).playerId
      : "";

  if (!playerId) {
    return NextResponse.json({ ok: true });
  }

  leaveRoom(code, playerId);
  return NextResponse.json({ ok: true });
}

