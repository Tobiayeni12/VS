import { NextResponse } from "next/server";
import { getRoom } from "@/lib/roomsStore";

type Params = {
  params: {
    code: string;
  };
};

export async function GET(_req: Request, { params }: Params) {
  const code = params.code.toUpperCase();
  const room = getRoom(code);

  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  return NextResponse.json(room);
}

