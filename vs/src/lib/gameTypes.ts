export type Player = {
  id: string;
  name: string;
  score: number;
  /** Last client heartbeat (`/presence`); used only to evict very stale ghosts. */
  lastSeen?: number;
};

/** Each game is backed by a YouTube link; bracket stores matching video ids */
export type GamePoolEntry = {
  videoId: string;
  title: string;
  thumbnailUrl: string;
  submittedBy: string;
};

export type BracketMatch = {
  id: string;
  gameA: string;
  gameB: string | null;
  winner: string | null;
};

export type BracketSide = {
  rounds: BracketMatch[][];
  winner: string | null;
  completed: boolean;
};

export type TournamentBracket = {
  left: BracketSide;
  right: BracketSide;
  finals: BracketMatch | null;
  currentPhase: 'left' | 'right' | 'finals' | 'finished';
  animationComplete: boolean;
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
  hostReady: boolean;
  createdAt: number;
  players: Player[];
  currentRound: Round | null;
  status: "lobby" | "settings" | "knockout" | "finished";
  /** Max non-host players who can join (1–32). Host is not counted. */
  maxPlayers: number;
  maxGames: number;
  maxGamesPerPlayer: number;
  gamePool: GamePoolEntry[];
  bracket: TournamentBracket | null;
  winner: string | null;
  playerGameCounts: Record<string, number>;
  knockoutWins: Record<string, number>;
  /** Set when the host intentionally closes the room so clients redirect immediately. */
  closed?: boolean;
};

