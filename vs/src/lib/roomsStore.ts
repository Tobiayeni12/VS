import { randomUUID } from "crypto";
import { RoomState, Player, Round, Submission, Vote, GamePoolEntry, BracketMatch, BracketSide, TournamentBracket } from "./gameTypes";

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
    hostReady: false,
    createdAt: Date.now(),
    players: [host],
    currentRound: null,
    status: "settings",
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
  room.hostReady = false;
  room.status = "settings";
  return room;
}

export function markHostReady(code: string, requesterId: string): RoomState | undefined {
  const room = rooms.get(code);
  if (!room) return undefined;
  if (room.hostId !== requesterId) return undefined;
  room.hostReady = true;
  return room;
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

export function getRoom(code: string): RoomState | undefined {
  return rooms.get(code);
}

export function deleteRoom(code: string, requesterId: string): boolean {
  const room = rooms.get(code);
  if (!room) return false;
  if (room.hostId !== requesterId) return false;
  return rooms.delete(code);
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

  const shuffled = shuffle(room.gamePool.map((g) => g.title));
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

  room.bracket = bracket;
  room.status = "knockout";
  room.winner = null;
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

export function chooseWinner(
  code: string,
  matchId: string,
  winner: string
): RoomState | undefined {
  const room = rooms.get(code);
  if (!room || !room.bracket || room.status !== "knockout") return undefined;

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
        bracket.currentPhase = "right";
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
    if (!bracket.finals.winner && (bracket.finals.gameA === winner || bracket.finals.gameB === winner)) {
      bracket.finals.winner = winner;
      room.status = "finished";
      room.winner = winner;
      matchFound = true;
    }
  }

  // Track knockout win
  const winningGame = room.gamePool.find((g) => g.title === winner);
  if (winningGame && matchFound) {
    room.knockoutWins[winningGame.submittedBy] =
      (room.knockoutWins[winningGame.submittedBy] ?? 0) + 1;
  }

  return room;
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

