import { NextRequest, NextResponse } from "next/server";
import { startKnockout, chooseWinner } from "@/lib/roomsStore";

type Params = {
  params: {
    code: string;
  };
};

export async function POST(req: NextRequest, { params }: Params) {
  const code = params.code.toUpperCase();
  const body = await req.json().catch(() => ({}));
  const action = body.action as "startKnockout" | "chooseWinner" | undefined;

  if (!action) {
    return NextResponse.json({ error: "Action required" }, { status: 400 });
  }

  switch (action) {
    case "startKnockout": {
      const room = startKnockout(code);
      if (!room)
        return NextResponse.json({ error: "Room not found" }, { status: 404 });
      return NextResponse.json(room);
    }
    case "chooseWinner": {
      const winnerTitle =
        typeof body.winnerTitle === "string" ? body.winnerTitle : "";
      if (!winnerTitle) {
        return NextResponse.json(
          { error: "winnerTitle required" },
          { status: 400 }
        );
      }
      const room = chooseWinner(code, winnerTitle);
      if (!room)
        return NextResponse.json({ error: "Room not found" }, { status: 404 });
      return NextResponse.json(room);
    }
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}

