/**
 * Shared Game Type Definitions
 * Used by both frontend and backend
 */

import type { BlastTileType, BlastTileState } from './blast';
import type { CustomAvatarConfig } from './customAvatar';

// ==================== Core Types ====================

export type Language = 'he' | 'en' | 'sv' | 'ja' | 'es' | 'fr' | 'de';

export type GameState = 'waiting' | 'in-progress' | 'finished' | 'validating';

/**
 * Canonical multiplayer game mode. Identifies live rules + state for an
 * in-progress MP room (classic Boggle, blast, word-hunt, wheel-rush).
 *
 * This is NOT the right type for:
 * - Share cards → use `ShareGameMode` from `shared/utils/shareResultGenerator`
 * - Standalone modes (daily / adventure / endless / drill / single player)
 *   which have their own local types in their respective modules.
 */
export type GameMode = 'classic' | 'blast' | 'word-hunt' | 'wheel-rush' | 'word-tower' | 'shiritori' | 'sealed-bid' | 'crossword';
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
 * Primary fields: avatarImage (character avatar ID) and customAvatar (SVG avatar)
 * The emoji and color fields are deprecated but kept for backward compatibility
 */
export interface Avatar {
  /** Primary: Avatar image ID (e.g., 'broccoli-bob', 'pizza-pete') */
  avatarImage?: string;
  /** Custom SVG avatar configuration */
  customAvatar?: CustomAvatarConfig;
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
  /**
   * Server-clock submit time (Date.now()). Required for the scoreMultiplier
   * boost to verify a word landed inside the boost window (audit SRV-CRIT-1).
   * Optional so existing surfaces that don't need it stay backwards-compatible.
   */
  timestamp?: number;
  /**
   * How the word was submitted: keyboard or by dragging tiles.
   * Used for UI indicators (e.g., ⌨️ chip on desktop WordsLadder).
   */
  inputMethod?: 'kb' | 'drag';
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
  /** Per-player accumulator for live-only event bonuses (golden/lightning/special-word/word-hunt board + target finder) that the end-of-game word recompute can't reconstruct. Added back into the final result score so it matches the in-game leaderboard. */
  playerEventBonuses?: Record<string, number>;
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
  hostReconnectionTimeout?: ReturnType<typeof setTimeout> | null;
  validationTimeout?: ReturnType<typeof setTimeout> | null;
  isRanked: boolean;
  /** Classroom-mode rooms skip auto-host-transfer (audit T4, 2026-05-10). */
  isClassroom?: boolean;
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
  /** Blast mode state (present during blast games) */
  blastModeState?: {
    overlay: BlastTileOverlay[];
    seed: number | null;
    playerMoves: Record<string, number>;
    playerBonusMoves: Record<string, number>;
    [key: string]: unknown;
  } | null;
  /** Word hunt state (present during word-hunt games) */
  wordHuntState?: {
    targetWord: string;
    targetWordLength: number;
    targetFoundBy: string | null;
    eliminatedPlayers: string[];
    playerLives: Record<string, number>;
    isFirstFinderClaimed: boolean;
    discoveryWordCount?: number;
    [key: string]: unknown;
  } | null;
  /** Shiritori (しりとり) word-chain state (present during shiritori games) */
  shiritoriState?: ShiritoriModeState | null;
  /** Sealed Bid auction state (present during sealed-bid games) */
  sealedBidState?: SealedBidModeState | null;
  /** Crossword race state (present during crossword MP games) */
  crosswordMpState?: CrosswordMpModeState | null;
}

export interface RoomPlayerAvatar {
  avatarImage?: string;
  customAvatar?: CustomAvatarConfig;
  username?: string;
}

export interface ActiveRoom {
  gameCode: string;
  roomName: string;
  language: Language;
  playerCount: number;
  maxPlayers?: number;
  gameState: GameState;
  isRanked: boolean;
  createdAt: number;
  gameMode?: GameMode;
  playerAvatars?: RoomPlayerAvatar[];
}

// ==================== Word Hunt Types ====================

/** Letter feedback for Wordle-style target word guessing */
export type LetterFeedback = 'correct' | 'present' | 'absent';

/** Word Hunt mode state tracked per game */
export interface WordHuntModeState {
  targetWord: string;
  targetWordLength: number;
  /** Semantic category of the target word (e.g. 'animals'), or null if uncategorized */
  targetCategory?: string | null;
  playerLives: Record<string, number>;
  eliminatedPlayers: string[];
  targetFoundBy: string | null;
  isFirstFinderClaimed: boolean;
  /** How many players have found the target word (used for decreasing bonuses) */
  finderCount?: number;
  discoveryWordCount?: number;
  /** Timestamp of last wordHandler life broadcast (prevents double broadcast with timer) */
  lastLifeUpdateAt?: number;
  /** Per-player timestamp of last clue broadcast (throttling) */
  lastClueAt?: Record<string, number>;
}

// ==================== Wheel Rush Types ====================

/** Puzzle definition for wheel-rush MP mode (mirrors daily WordWheelPuzzle) */
export interface WheelPuzzle {
  centerLetter: string;
  outerLetters: string[];
  allLetters: string[];
  /** Dictionary words formable from {center+outer} that include centerLetter */
  solutions?: string[];
}

/** Lock claimed by first finder — word is temporarily stealable, then permanently closed */
export interface WheelWordLock {
  by: string;
  /** Absolute epoch ms when steal window expires */
  until: number;
}

/** Per-player wheel-rush stats tracked during a game */
export interface WheelRushPlayerStats {
  wordsLocked: number;
  wordsStolen: number;
  wordsStolenFromMe: number;
  bestWord: string;
  totalScore: number;
}

/** Wheel Rush mode state tracked per game */
export interface WheelRushModeState {
  puzzle: WheelPuzzle;
  /** Words each player has claimed (after lock resolved) */
  foundWords: Record<string, string[]>;
  /** Words currently stealable — keyed by word */
  locks: Record<string, WheelWordLock>;
  /** Words permanently closed (anyone tries → already-found feedback) */
  closed: string[];
  /** Timestamp when round started, for fog-of-war reveal gating */
  startedAt: number;
  /** Per-player domination stats for end-game awards screen */
  playerStats: Record<string, WheelRushPlayerStats>;
}

/** Shiritori (しりとり) word-chain mode state tracked per game. */
export interface ShiritoriModeState {
  /** Turn order. */
  players: string[];
  /** Index into `players` of whose turn it is. */
  turnIndex: number;
  /** Words played so far, in order. */
  chain: string[];
  /** Words already used this round (no repeats). */
  used: string[];
  /** Kana the next word must start with (null on the opening move). */
  requiredHead: string | null;
  startedAt: number;
  /** Absolute epoch ms by which the current player must answer. */
  turnDeadline: number;
  /** Eliminated flag per player. */
  eliminated: Record<string, boolean>;
  finished: boolean;
  winner: string | null;
}

/** A locked bid for the current Sealed Bid round (cross-player resolution at reveal). */
export interface SealedBidEntry {
  /** Normalized bid word, or null for a pass. */
  word: string | null;
  /** Server-validated: dict + formable + min length. */
  valid: boolean;
  locked: boolean;
}

/** Sealed Bid (auction) multiplayer mode state tracked per game. */
export interface SealedBidModeState {
  players: string[];
  /** Shared racks for the match (same for all players). */
  racks: string[];
  /** Current round index (0-based). */
  index: number;
  phase: 'bidding' | 'revealed' | 'done';
  /** Per-player locked bid for the CURRENT round (reset each round). */
  bids: Record<string, SealedBidEntry>;
  /** Cumulative score per player. */
  scores: Record<string, number>;
  startedAt: number;
  /** Absolute epoch ms by which bids for the current round must be in. */
  roundDeadline: number;
}

/** One player's live progress in a Crossword race. */
export interface CrosswordMpPlayerProgress {
  /** 0..100 correct-cell completion. */
  percent: number;
  solved: boolean;
  elapsedMs: number;
  score: number;
}

/** Crossword race (parallel-race) multiplayer mode state. All players solve the
 *  SAME puzzle simultaneously; the server aggregates progress + ranks finishers. */
export interface CrosswordMpModeState {
  players: string[];
  /** The shared CrosswordPuzzle JSON. Typed `unknown` to avoid a shared→lib dep;
   *  the client casts it to CrosswordPuzzle. */
  puzzle: unknown;
  progress: Record<string, CrosswordMpPlayerProgress>;
  startedAt: number;
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

/** Per-player blast stats tracked during a game */
export interface BlastPlayerStats {
  maxCombo: number;
  gemsCollected: number;
  wordsFound: string[];
  bestWord: string;
  tilesCleared: number;
  totalTileBonus: number;
  boardClears: number;
}

/** Blast mode state tracked per game */
/**
 * One player's INDEPENDENT blast board. In MP blast every player gets their own
 * board (same starting layout via the shared seed, but evolving independently),
 * so one player's tile clears never affect another's. Cloned lazily from the
 * BlastModeState template by getOrInitPlayerBoard.
 */
export interface BlastPlayerBoard {
  grid: string[][];
  tileStates: BlastTileState[][];
  overlay: BlastTileOverlay[];
  overlayMap: Map<string, BlastTileType>;
  seed: number;
  totalMoves: number;
  refillCount: number;
}

export interface BlastModeState {
  overlay: BlastTileOverlay[];
  /** Pre-built lookup map from "row,col" → tile type for O(1) path queries */
  overlayMap: Map<string, BlastTileType>;
  /**
   * Per-player independent boards (MP). Keyed by username. Lazily populated by
   * getOrInitPlayerBoard from the shared template fields below. The top-level
   * grid/tileStates/overlay/seed act as the immutable STARTING template every
   * player's board is cloned from.
   */
  playerBoards?: Record<string, BlastPlayerBoard>;
  playerMoves: Record<string, number>;
  playerBonusMoves: Record<string, number>;
  /** Rich per-player stats for results page */
  playerStats: Record<string, BlastPlayerStats>;
  /**
   * Seeded PRNG seed for deterministic multiplayer refills.
   * Generated server-side in initBlastModeState and broadcast with startGame.
   */
  seed?: number;
  /** Server-authoritative letter grid for MP board sync */
  grid?: string[][];
  /** Server-authoritative tile states for MP board sync */
  tileStates?: BlastTileState[][];
  /** Tracks total moves across all players for seeded RNG sequencing */
  totalMoves?: number;
  /**
   * Wave number used to generate the overlay / distribution. Persisted so
   * server word-validation and client engine both use the same value the
   * overlay was rolled against (prevents overlay ↔ rules divergence).
   */
  wave?: number;
  /** Number of times the board has been regenerated in place (timer-era refills). */
  refillCount?: number;
}
