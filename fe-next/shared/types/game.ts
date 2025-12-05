/**
 * Shared Game Type Definitions
 * Used by both frontend and backend
 */

// ==================== Core Types ====================

export type Language = 'he' | 'en' | 'sv' | 'ja' | 'es' | 'fr' | 'de';

export type GameState = 'waiting' | 'in-progress' | 'finished' | 'validating';

export type DifficultyLevel = 'EASY' | 'MEDIUM' | 'HARD';

export type PresenceStatus = 'active' | 'idle' | 'afk';

export type LetterGrid = string[][];

// ==================== Game Configuration ====================

export interface Difficulty {
  nameKey: string;
  rows: number;
  cols: number;
}

export interface DifficultySettings {
  EASY: Difficulty;
  MEDIUM: Difficulty;
  HARD: Difficulty;
}

export interface MinWordLengthOption {
  value: number;
  labelKey: string;
}

// ==================== Grid Types ====================

export interface GridPosition {
  row: number;
  col: number;
  letter?: string;
}

// ==================== User Types ====================

export interface Avatar {
  emoji: string;
  color: string;
  profilePictureUrl?: string | null;
}

export interface BaseUser {
  username: string;
  avatar: Avatar;
  isHost: boolean;
}

export interface GameUser extends BaseUser {
  socketId: string;
  authUserId?: string | null;
  guestTokenHash?: string | null;
  playerId?: string | null;
  presence?: PresenceStatus;
  lastActivity?: number;
  lastHeartbeat?: number;
  disconnected?: boolean;
  disconnectedAt?: number;
  isBot?: boolean;
  botDifficulty?: string;
}

// ==================== Word Types ====================

export interface WordSubmission {
  word: string;
  points: number;
  timestamp: number;
  isValid?: boolean;
  path?: GridPosition[];
}

export interface WordDetail {
  word: string;
  score: number;
  autoValidated: boolean;
  comboBonus?: number;
  comboLevel?: number;
  validated?: boolean;
  validatedByCommunity?: boolean;
  isBot?: boolean;
}

export interface AiApprovedWord {
  word: string;
  submitter: string;
  score: number;
  confidence: number;
}

// ==================== Score Types ====================

export interface PlayerScore {
  username: string;
  score: number;
  wordsFound: number;
  validWords: number;
  achievements: string[];
}

export interface LeaderboardEntry {
  username: string;
  score: number;
  avatar: Avatar;
  isHost: boolean;
  wordsFound: number;
}

// ==================== Game Types ====================

export interface Game {
  gameCode: string;
  hostSocketId: string;
  hostUsername: string;
  hostPlayerId?: string | null;
  roomName: string;
  language: Language;
  users: Record<string, GameUser>;
  playerScores: Record<string, number>;
  playerWords: Record<string, string[]>;
  playerWordDetails: Record<string, WordDetail[]>;
  playerAchievements: Record<string, string[]>;
  playerCombos: Record<string, number>;
  gameState: GameState;
  letterGrid: LetterGrid | null;
  letterPositions?: Map<string, GridPosition[]>;
  timerSeconds: number;
  remainingTime?: number;
  gameDuration?: number;
  tournamentId: string | null;
  reconnectionTimeout: ReturnType<typeof setTimeout> | null;
  validationTimeout?: ReturnType<typeof setTimeout> | null;
  isRanked: boolean;
  allowLateJoin: boolean;
  createdAt: number;
  lastActivity: number;
  difficulty?: DifficultyLevel;
  minWordLength?: number;
  startedAt?: number;
  gameStartedAt?: number;
  firstWordFound?: boolean;
  startTime?: number;
  aiApprovedWords?: AiApprovedWord[];
  peerValidationWord?: AiApprovedWord | null;
  peerValidationVotes?: Record<string, 'valid' | 'invalid'>;
}

export interface ActiveRoom {
  gameCode: string;
  roomName: string;
  language: Language;
  playerCount: number;
  gameState: GameState;
  isRanked: boolean;
  createdAt: number;
}

// ==================== Tournament Types ====================

export interface TournamentPlayer {
  socketId: string;
  username: string;
  avatar: Avatar;
  totalScore: number;
  roundScores: number[];
}

export interface Tournament {
  id: string;
  name: string;
  totalRounds: number;
  currentRound: number;
  status: 'created' | 'in-progress' | 'completed' | 'cancelled';
  players: Record<string, TournamentPlayer>;
  createdAt: number;
}

export interface TournamentStanding {
  rank: number;
  username: string;
  avatar: Avatar;
  totalScore: number;
  roundScores: number[];
}
