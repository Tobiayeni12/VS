import { randomUUID } from "crypto";
import { RoomState, Player, Round, Submission, Vote } from "./gameTypes";

const rooms: Map<string, RoomState> =
  (globalThis as unknown as { __vsRooms?: Map<string, RoomState> }).__vsRooms ??
  new Map<string, RoomState>();

(globalThis as unknown as { __vsRooms?: Map<string, RoomState> }).__vsRooms =
  rooms;

function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function createRoom(hostName: string): RoomState {
  let code = generateRoomCode();
  while (rooms.has(code)) {
    code = generateRoomCode();
  }

  const host: Player = {
    id: randomUUID(),
    name: hostName,
    score: 0,
  };

  const room: RoomState = {
    code,
    vsTitle: "",
    hostId: host.id,
    createdAt: Date.now(),
    players: [host],
    currentRound: null,
    status: "settings",
    maxGames: 8,
    maxGamesPerPlayer: 2,
    gamePool: [],
    knockoutBracket: [],
    currentMatchIndex: 0,
    winner: null,
    playerGameCounts: {
      [host.id]: 0,
    },
  };

  rooms.set(code, room);
  return room;
}

export function setSettings(
  code: string,
  maxGames: number,
  maxGamesPerPlayer: number,
  vsTitle?: string
): RoomState | undefined {
  const room = rooms.get(code);
  if (!room) return undefined;
  room.maxGames = Math.max(2, Math.min(32, maxGames));
  room.maxGamesPerPlayer = Math.max(
    1,
    Math.min(room.maxGames, maxGamesPerPlayer)
  );
  if (typeof vsTitle === "string") {
    room.vsTitle = vsTitle.trim();
  }
  room.status = "settings";
  return room;
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function startKnockout(code: string): RoomState | undefined {
  const room = rooms.get(code);
  if (!room) return undefined;
  if (room.gamePool.length < 2) return room;

  const shuffled = shuffle(room.gamePool);
  const roundPairs: string[][] = [];
  for (let i = 0; i < shuffled.length; i += 2) {
    if (i + 1 < shuffled.length) {
      roundPairs.push([shuffled[i] as string, shuffled[i + 1] as string]);
    } else {
      roundPairs.push([shuffled[i] as string]);
    }
  }

  room.knockoutBracket = roundPairs;
  room.currentMatchIndex = 0;
  room.status = "knockout";
  room.winner = null;
  return room;
}

export function chooseWinner(
  code: string,
  winnerTitle: string
): RoomState | undefined {
  const room = rooms.get(code);
  if (!room || room.status !== "knockout") return undefined;
  const currentRound = room.knockoutBracket;
  const match = currentRound[room.currentMatchIndex];
  if (!match) return room;
  if (!match.includes(winnerTitle)) return room;

  (currentRound[room.currentMatchIndex] as string[])[0] = winnerTitle;

  room.currentMatchIndex += 1;

  if (room.currentMatchIndex >= currentRound.length) {
    const winners = currentRound.map((m) => m[0]).filter(Boolean) as string[];
    if (winners.length === 1) {
      room.status = "finished";
      room.winner = winners[0] ?? null;
      return room;
    }

    const nextRound: string[][] = [];
    const shuffled = shuffle(winners);
    for (let i = 0; i < shuffled.length; i += 2) {
      if (i + 1 < shuffled.length) {
        nextRound.push([shuffled[i] as string, shuffled[i + 1] as string]);
      } else {
        nextRound.push([shuffled[i] as string]);
      }
    }

    room.knockoutBracket = nextRound;
    room.currentMatchIndex = 0;
  }

  return room;
}

export function getRoom(code: string): RoomState | undefined {
  return rooms.get(code);
}

export function joinRoom(code: string, name: string): RoomState | undefined {
  const room = rooms.get(code);
  if (!room) return undefined;

  const existing = room.players.find(
    (p) => p.name.toLowerCase() === name.toLowerCase()
  );
  if (existing) {
    return room;
  }

  const player: Player = {
    id: randomUUID(),
    name,
    score: 0,
  };

  room.players.push(player);
  room.playerGameCounts[player.id] = 0;
  return room;
}

export function startRound(code: string, prompt: string): RoomState | undefined {
  const room = rooms.get(code);
  if (!room) return undefined;

  const round: Round = {
    id: randomUUID(),
    index: room.currentRound ? room.currentRound.index + 1 : 1,
    prompt,
    phase: "submitting",
    submissions: [],
    votes: [],
  };

  room.currentRound = round;
  room.status = "lobby";
  return room;
}

export function submitGame(
  code: string,
  playerId: string,
  gameTitle: string
): RoomState | undefined {
  const room = rooms.get(code);
  if (!room || !room.currentRound) return undefined;

  const round = room.currentRound;

  const existing = round.submissions.find((s) => s.playerId === playerId);
  if (existing) {
    existing.gameTitle = gameTitle;
  } else {
    const submission: Submission = {
      id: randomUUID(),
      playerId,
      gameTitle,
    };
    round.submissions.push(submission);
  }

  return room;
}

export function moveToVoting(code: string): RoomState | undefined {
  const room = rooms.get(code);
  if (!room || !room.currentRound) return undefined;
  room.currentRound.phase = "voting";
  return room;
}

export function castVote(
  code: string,
  playerId: string,
  submissionId: string
): RoomState | undefined {
  const room = rooms.get(code);
  if (!room || !room.currentRound) return undefined;

  const round = room.currentRound;

  const existing = round.votes.find((v) => v.playerId === playerId);
  if (existing) {
    existing.submissionId = submissionId;
  } else {
    const vote: Vote = { playerId, submissionId };
    round.votes.push(vote);
  }

  return room;
}

export function finishRound(code: string): RoomState | undefined {
  const room = rooms.get(code);
  if (!room || !room.currentRound) return undefined;

  const round = room.currentRound;

  const scoreBySubmission = new Map<string, number>();
  for (const v of round.votes) {
    scoreBySubmission.set(v.submissionId, (scoreBySubmission.get(v.submissionId) ?? 0) + 1);
  }

  for (const sub of round.submissions) {
    const votes = scoreBySubmission.get(sub.id) ?? 0;
    const player = room.players.find((p) => p.id === sub.playerId);
    if (player) {
      player.score += votes;
    }
  }

  round.phase = "results";
  room.status = "lobby";

  return room;
}

