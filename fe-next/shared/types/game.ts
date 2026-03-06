/**
 * Shared Game Type Definitions
 * Used by both frontend and backend
 */

import type { BlastTileType } from './blast';

// ==================== Core Types ====================

export type Language = 'he' | 'en' | 'sv' | 'ja' | 'es' | 'fr' | 'de';

export type GameState = 'waiting' | 'in-progress' | 'finished' | 'validating';

export type GameMode = 'classic' | 'blast' | 'word-hunt';
export type GameModeSelection = GameMode | 'random';

export type DifficultyLevel = 'EASY' | 'MEDIUM' | 'HARD';

export type PresenceStatus = 'active' | 'idle' | 'afk';

/** Chat history entry (also matches ChatMessagePayload in socket.ts) */
export interface ChatHistoryEntry {
  username: string;
  message: string;
  timestamp: number;
  isHost: boolean;
}

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

/**
 * Avatar data structure
 * Primary fields: avatarImage (character avatar ID) and profilePictureUrl (OAuth profile picture)
 * The emoji and color fields are deprecated but kept for backward compatibility
 */
export interface Avatar {
  /** Primary: Avatar image ID (e.g., 'broccoli-bob', 'pizza-pete') or '__profile_avatar__' for profile picture */
  avatarImage?: string;
  /** Profile picture URL from OAuth provider (Google, Discord, etc.) */
  profilePictureUrl?: string | null;
  /** @deprecated - kept for backward compatibility, will be removed */
  emoji?: string;
  /** @deprecated - kept for backward compatibility, will be removed */
  color?: string;
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

export interface Spectator {
  socketId: string;
  username?: string;
  avatar: Avatar | null;
  authUserId: string | null;
  guestTokenHash: string | null;
  joinedAt: number;
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
  validated: boolean;
  isDuplicate: boolean;
  autoValidated?: boolean;
  comboBonus?: number;
  comboLevel?: number;
  fireRoundBonus?: number;
  fireRoundMultiplier?: number;
  validatedByCommunity?: boolean;
  isBot?: boolean;
  isAiVerified?: boolean;
  isPendingValidation?: boolean;
  potentialScore?: number;
  invalidReason?: string;
  aiReason?: string;
  inDictionary?: boolean;
  validationSource?: 'dictionary' | 'community' | 'ai' | 'cached' | 'none';
  isUnique?: boolean;
  /** First player to find this word (for first-to-find scoring) */
  foundBy?: string;
  /** Avatar of the first finder */
  foundByAvatar?: Avatar;
  /** Whether this player was the first to find this word */
  isFirstFinder?: boolean;
  /** Whether this word is from lesson vocabulary (classroom games only) */
  fromLesson?: boolean;
}

/** Entry tracking who found a word first */
export interface FirstFinderEntry {
  username: string;
  avatar?: Partial<Avatar> | null;
  timestamp: number;
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
  hostSocketId: string | null;
  hostUsername: string | null;
  hostPlayerId?: string | null;
  roomName: string;
  language: Language;
  users: Record<string, GameUser>;
  spectators?: Record<string, Spectator>;
  playerScores: Record<string, number>;
  playerWords: Record<string, string[]>;
  playerWordDetails: Record<string, WordDetail[]>;
  playerAchievements: Record<string, string[]>;
  playerCombos?: Record<string, number>;
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
  /** Maps word to the first player who found it (for first-to-find scoring) */
  firstFinderMap?: Record<string, FirstFinderEntry>;
  /** Chat message history (persists across rounds, max 100 messages) */
  chatHistory?: ChatHistoryEntry[];
  /** Current game mode for multiplayer mode rotation */
  gameMode?: GameMode;
  /** History of game modes played in this room (for no-repeat rotation) */
  modeHistory?: GameMode[];
  /** Game session ID (incremented per round for stale-event detection) */
  gameSessionId?: number;
  /** Total words on board (calculated after start, cached for late joiners) */
  totalBoardWords?: number;
  /** Players who confirmed ready for next game */
  playersReadyForNextGame?: Record<string, boolean>;
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

// ==================== Word Hunt Types ====================

/** Letter feedback for Wordle-style target word guessing */
export type LetterFeedback = 'correct' | 'present' | 'absent';

/** Word Hunt mode state tracked per game */
export interface WordHuntModeState {
  targetWord: string;
  targetWordLength: number;
  playerLives: Record<string, number>;
  eliminatedPlayers: string[];
  targetFoundBy: string | null;
  isFirstFinderClaimed: boolean;
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

// ==================== Blast Multiplayer Types ====================

/** Blast mode tile overlay for multiplayer */
export interface BlastTileOverlay {
  row: number;
  col: number;
  type: BlastTileType;
}

/** Blast mode state tracked per game */
export interface BlastModeState {
  overlay: BlastTileOverlay[];
  playerMoves: Record<string, number>;
  playerBonusMoves: Record<string, number>;
  /**
   * Seeded PRNG seed for deterministic multiplayer refills.
   * Generated server-side in initBlastModeState and broadcast with startGame.
   * Clients use createSeededRandom(seed) to produce identical tile refills.
   * NOTE: Boards remain client-authoritative; seeded refill reduces divergence
   *       but does not guarantee lockstep (different words clear different cells).
   */
  seed?: number;
}
