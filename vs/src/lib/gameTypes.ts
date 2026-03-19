export type Player = {
  id: string;
  name: string;
  score: number;
};

export type GamePoolEntry = {
  title: string;
  submittedBy: string;
};

export type Submission = {
  id: string;
  playerId: string;
  gameTitle: string;
};

export type Vote = {
  playerId: string;
  submissionId: string;
};

export type RoundPhase = "submitting" | "voting" | "results";

export type Round = {
  id: string;
  index: number;
  prompt: string;
  phase: RoundPhase;
  submissions: Submission[];
  votes: Vote[];
};

export type RoomState = {
  code: string;
  vsTitle: string;
  hostId: string;
  createdAt: number;
  players: Player[];
  currentRound: Round | null;
  status: "lobby" | "settings" | "knockout" | "finished";
  maxGames: number;
  maxGamesPerPlayer: number;
  gamePool: GamePoolEntry[];
  knockoutBracket: string[][];
  currentMatchIndex: number;
  winner: string | null;
  playerGameCounts: Record<string, number>;
  knockoutWins: Record<string, number>;
};

