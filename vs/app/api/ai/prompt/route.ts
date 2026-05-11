import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

export async function POST() {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "AI not configured" }, { status: 503 });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    const message = await client.messages.create({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 32,
      messages: [
        {
          role: "user",
          content:
            "Generate a single short VS tournament title for a group of friends debating their favourite video games. " +
            "Examples: 'Best Open World Game of All Time', 'Most Iconic Final Boss', 'Hardest Game Ever Made', 'Best Multiplayer Game', 'Most Nostalgic Game'. " +
            "Reply with only the title, no punctuation at the end, no quotes, no explanation.",
        },
      ],
    });

    const title =
      message.content[0]?.type === "text" ? message.content[0].text.trim() : "";

    if (!title) {
      return NextResponse.json({ error: "No title generated" }, { status: 500 });
    }

    return NextResponse.json({ title });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to generate prompt";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
