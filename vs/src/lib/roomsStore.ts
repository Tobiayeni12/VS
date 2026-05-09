import { randomUUID } from "crypto";
import { RoomState, Player, Round, Submission, Vote, GamePoolEntry, BracketMatch, BracketSide, TournamentBracket } from "./gameTypes";
import { videoIdsEqual } from "./youtube";
import { kvDel, kvEnabled, kvGetJson, kvSetJson } from "./roomsKv";

const rooms: Map<string, RoomState> =
  (globalThis as unknown as { __vsRooms?: Map<string, RoomState> }).__vsRooms ??
  new Map<string, RoomState>();

(globalThis as unknown as { __vsRooms?: Map<string, RoomState> }).__vsRooms =
  rooms;

const ROOM_TTL_SECONDS = 60 * 60 * 6; // 6 hours

function roomKey(code: string) {
  return `vs:room:${code}`;
}

async function persistRoom(room: RoomState): Promise<void> {
  rooms.set(room.code, room);
  if (kvEnabled()) {
    await kvSetJson(roomKey(room.code), room, ROOM_TTL_SECONDS);
  }
}

export async function saveRoom(room: RoomState): Promise<void> {
  await persistRoom(room);
}

function ensureRoomShape(room: RoomState): void {
  if (
    typeof room.maxPlayers !== "number" ||
    room.maxPlayers < 1 ||
    room.maxPlayers > 32
  ) {
    room.maxPlayers = 32;
  }
}

async function loadRoom(code: string): Promise<RoomState | undefined> {
  const cached = rooms.get(code);
  if (cached) {
    ensureRoomShape(cached);
    return cached;
  }
  if (!kvEnabled()) return undefined;
  const fromKv = await kvGetJson<RoomState>(roomKey(code));
  if (fromKv) {
    ensureRoomShape(fromKv);
    rooms.set(code, fromKv);
    return fromKv;
  }
  return undefined;
}

function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function createRoom(hostName: string): Promise<RoomState> {
  let code = generateRoomCode();
  // ensure uniqueness across KV too
  while (rooms.has(code) || (kvEnabled() && (await kvGetJson(roomKey(code))))) {
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
    hostReady: false,
    createdAt: Date.now(),
    players: [host],
    currentRound: null,
    status: "settings",
    maxPlayers: 32,
    maxGames: 8,
    maxGamesPerPlayer: 2,
    gamePool: [],
    bracket: null,
    winner: null,
    playerGameCounts: {
      [host.id]: 0,
    },
    knockoutWins: {},
  };

  await persistRoom(room);
  return room;
}

export function setSettings(
  code: string,
  maxGames: number,
  maxGamesPerPlayer: number,
  maxPlayers: number,
  vsTitle?: string
): Promise<RoomState | undefined> {
  return (async () => {
  const room = await loadRoom(code);
  if (!room) return undefined;
  const resettingLobby = room.status !== "settings";

  if (resettingLobby) {
    room.gamePool = [];
    room.currentRound = null;
    room.bracket = null;
    room.winner = null;
    room.playerGameCounts = Object.fromEntries(
      room.players.map((player) => [player.id, 0])
    );
  }

  room.maxPlayers = Math.max(1, Math.min(32, maxPlayers));

  room.maxGames = Math.max(2, Math.min(32, maxGames));
  room.maxGamesPerPlayer = Math.max(
    1,
    Math.min(room.maxGames, maxGamesPerPlayer)
  );
  if (typeof vsTitle === "string") {
    room.vsTitle = vsTitle.trim();
  }
  room.hostReady = false;
  room.status = "settings";
  await persistRoom(room);
  return room;
  })();
}

export function markHostReady(code: string, requesterId: string): Promise<RoomState | undefined> {
  return (async () => {
  const room = await loadRoom(code);
  if (!room) return undefined;
  if (room.hostId !== requesterId) return undefined;
  room.hostReady = true;
  await persistRoom(room);
  return room;
  })();
}

function createBracketRounds(games: string[]): BracketMatch[][] {
  const rounds: BracketMatch[][] = [];

  if (games.length === 0) return rounds;

  // First round: pair up all games
  const firstRound: BracketMatch[] = [];
  for (let i = 0; i < games.length; i += 2) {
    const gameA = games[i]!;
    const gameB = games[i + 1] ?? null;
    firstRound.push({
      id: randomUUID(),
      gameA,
      gameB,
      winner: null,
    });
  }
  rounds.push(firstRound);

  // Subsequent rounds: progressively halve the number of matches
  let currentRoundMatches = firstRound.length;
  while (currentRoundMatches > 1) {
    const nextRound: BracketMatch[] = [];
    const newCount = Math.ceil(currentRoundMatches / 2);
    for (let i = 0; i < newCount; i++) {
      nextRound.push({
        id: randomUUID(),
        gameA: "",
        gameB: null,
        winner: null,
      });
    }
    rounds.push(nextRound);
    currentRoundMatches = newCount;
  }

  return rounds;
}

export function getRoom(code: string): Promise<RoomState | undefined> {
  return loadRoom(code);
}

export async function deleteRoom(code: string, requesterId: string): Promise<boolean> {
  const room = await loadRoom(code);
  if (!room) return false;
  if (room.hostId !== requesterId) return false;
  rooms.delete(code);
  if (kvEnabled()) await kvDel(roomKey(code));
  return true;
}

export function leaveRoom(code: string, requesterId: string): Promise<RoomState | undefined> {
  return (async () => {
  const room = await loadRoom(code);
  if (!room) return undefined;

  // If the host leaves, delete the room entirely.
  if (room.hostId === requesterId) {
    rooms.delete(code);
    if (kvEnabled()) await kvDel(roomKey(code));
    return undefined;
  }

  const before = room.players.length;
  room.players = room.players.filter((p) => p.id !== requesterId);

  if (room.players.length === before) {
    return room;
  }

  delete room.playerGameCounts[requesterId];
  delete room.knockoutWins[requesterId];

  // Note: gamePool submissions remain, since they may be part of the VS already.
  await persistRoom(room);
  return room;
  })();
}

function autoResolveByes(rounds: BracketMatch[][]): void {
  // Only the first round can have a bye (last match with gameB null)
  const round0 = rounds[0];
  if (!round0) return;
  for (let matchIdx = 0; matchIdx < round0.length; matchIdx++) {
    const match = round0[matchIdx]!;
    if (match.gameA && !match.gameB && !match.winner) {
      match.winner = match.gameA;
      if (rounds.length > 1) {
        const nextRound = rounds[1]!;
        const nextMatchIndex = Math.floor(matchIdx / 2);
        const isLeftSlot = matchIdx % 2 === 0;
        const nextMatch = nextRound[nextMatchIndex];
        if (nextMatch) {
          if (isLeftSlot) nextMatch.gameA = match.gameA;
          else nextMatch.gameB = match.gameA;
        }
      }
    }
  }
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export async function startKnockout(code: string): Promise<RoomState | undefined> {
  const room = await loadRoom(code);
  if (!room) return undefined;
  if (room.gamePool.length < 2) return room;

  const shuffled = shuffle(room.gamePool.map((g) => g.videoId));
  const mid = Math.ceil(shuffled.length / 2);
  const leftGames = shuffled.slice(0, mid);
  const rightGames = shuffled.slice(mid);

  const bracket: TournamentBracket = {
    left: {
      rounds: createBracketRounds(leftGames),
      winner: null,
      completed: false,
    },
    right: {
      rounds: createBracketRounds(rightGames),
      winner: null,
      completed: false,
    },
    finals: null,
    currentPhase: "left",
    animationComplete: false,
  };

  // Auto-resolve bye matches created by odd-length game lists
  autoResolveByes(bracket.left.rounds);
  autoResolveByes(bracket.right.rounds);

  // If right side is fully resolved by byes (e.g. 1 game), mark it complete now
  const rightFinal = bracket.right.rounds[bracket.right.rounds.length - 1];
  if (rightFinal && rightFinal.every((m) => m.winner)) {
    bracket.right.winner = rightFinal[0]?.winner ?? null;
    bracket.right.completed = true;
  }

  // If left is also fully resolved (edge case: 2 games total, both byes), go straight to finals
  const leftFinal = bracket.left.rounds[bracket.left.rounds.length - 1];
  if (leftFinal && leftFinal.every((m) => m.winner)) {
    bracket.left.winner = leftFinal[0]?.winner ?? null;
    bracket.left.completed = true;
    if (bracket.left.winner && bracket.right.winner) {
      bracket.finals = {
        id: randomUUID(),
        gameA: bracket.left.winner,
        gameB: bracket.right.winner,
        winner: null,
      };
      bracket.currentPhase = "finals";
    } else {
      bracket.currentPhase = "right";
    }
  }

  room.bracket = bracket;
  room.status = "knockout";
  room.winner = null;
  await persistRoom(room);
  return room;
}

function advanceInPhase(rounds: BracketMatch[][], matchId: string, winner: string): boolean {
  for (let roundIdx = 0; roundIdx < rounds.length; roundIdx++) {
    const round = rounds[roundIdx]!;
    for (const match of round) {
      if (match.id === matchId && !match.winner) {
        match.winner = winner;

        if (roundIdx < rounds.length - 1) {
          const nextRound = rounds[roundIdx + 1]!;
          const matchIndexInRound = round.indexOf(match);
          const nextMatchIndex = Math.floor(matchIndexInRound / 2);
          const isLeftInNextMatch = matchIndexInRound % 2 === 0;

          const nextMatch = nextRound[nextMatchIndex];
          if (nextMatch) {
            if (isLeftInNextMatch) {
              nextMatch.gameA = winner;
            } else {
              nextMatch.gameB = winner;
            }
          }
        }
        return true;
      }
    }
  }
  return false;
}

export async function chooseWinner(
  code: string,
  matchId: string,
  winner: string
): Promise<RoomState | undefined> {
  const room = await loadRoom(code);
  if (!room || !room.bracket) return undefined;

  // After the final pick, status becomes "finished". A duplicate POST (double-click,
  // retry) must still return the room — otherwise the API falsely reports "Room not found".
  if (room.status === "finished") {
    return room;
  }

  if (room.status !== "knockout") return undefined;

  const bracket = room.bracket;
  const { currentPhase } = bracket;
  let matchFound = false;

  if (currentPhase === "left") {
    matchFound = advanceInPhase(bracket.left.rounds, matchId, winner);
    if (matchFound) {
      const finalRound = bracket.left.rounds[bracket.left.rounds.length - 1];
      if (finalRound && finalRound.every((m) => m.winner)) {
        bracket.left.winner = finalRound[0]?.winner || null;
        bracket.left.completed = true;
        // If right was already resolved by byes, jump straight to finals
        if (bracket.right.completed && bracket.left.winner && bracket.right.winner) {
          bracket.finals = {
            id: randomUUID(),
            gameA: bracket.left.winner,
            gameB: bracket.right.winner,
            winner: null,
          };
          bracket.currentPhase = "finals";
        } else {
          bracket.currentPhase = "right";
        }
      }
    }
  } else if (currentPhase === "right") {
    matchFound = advanceInPhase(bracket.right.rounds, matchId, winner);
    if (matchFound) {
      const finalRound = bracket.right.rounds[bracket.right.rounds.length - 1];
      if (finalRound && finalRound.every((m) => m.winner)) {
        bracket.right.winner = finalRound[0]?.winner || null;
        bracket.right.completed = true;

        if (bracket.left.winner && bracket.right.winner) {
          bracket.finals = {
            id: randomUUID(),
            gameA: bracket.left.winner,
            gameB: bracket.right.winner,
            winner: null,
          };
          bracket.currentPhase = "finals";
        }
      }
    }
  } else if (currentPhase === "finals" && bracket.finals) {
    const f = bracket.finals;
    const pickA = f.gameA && videoIdsEqual(f.gameA, winner) ? f.gameA : null;
    const pickB =
      f.gameB && videoIdsEqual(f.gameB, winner) ? f.gameB : null;
    if (!f.winner && (pickA || pickB)) {
      const canonical = pickA ?? pickB!;
      f.winner = canonical;
      room.status = "finished";
      room.winner = canonical;
      bracket.currentPhase = "finished";
      matchFound = true;

      const winningGame = room.gamePool.find((g) =>
        videoIdsEqual(g.videoId, canonical)
      );
      if (winningGame) {
        room.knockoutWins[winningGame.submittedBy] =
          (room.knockoutWins[winningGame.submittedBy] ?? 0) + 1;
      }
    }
  }

  await persistRoom(room);
  return room;
}

export async function joinRoom(code: string, name: string): Promise<RoomState | undefined> {
  const room = await loadRoom(code);
  if (!room) return undefined;

  const existing = room.players.find(
    (p) => p.name.toLowerCase() === name.toLowerCase()
  );
  if (existing) {
    return room;
  }

  const nonHostCount = room.players.filter((p) => p.id !== room.hostId).length;
  if (nonHostCount >= room.maxPlayers) {
    return undefined;
  }

  const player: Player = {
    id: randomUUID(),
    name,
    score: 0,
  };

  room.players.push(player);
  room.playerGameCounts[player.id] = 0;
  await persistRoom(room);
  return room;
}

export async function startRound(code: string, prompt: string): Promise<RoomState | undefined> {
  const room = await loadRoom(code);
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
  await persistRoom(room);
  return room;
}

export async function submitGame(
  code: string,
  playerId: string,
  gameTitle: string
): Promise<RoomState | undefined> {
  const room = await loadRoom(code);
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

export async function moveToVoting(code: string): Promise<RoomState | undefined> {
  const room = await loadRoom(code);
  if (!room || !room.currentRound) return undefined;
  room.currentRound.phase = "voting";
  await persistRoom(room);
  return room;
}

export async function castVote(
  code: string,
  playerId: string,
  submissionId: string
): Promise<RoomState | undefined> {
  const room = await loadRoom(code);
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

export async function finishRound(code: string): Promise<RoomState | undefined> {
  const room = await loadRoom(code);
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

  await persistRoom(room);
  return room;
}

