/**
 * Game State Manager
 * Centralized game state management for Socket.IO
 *
 * REFACTORED: Core functionality has been extracted into focused modules:
 * - userManager.ts - User CRUD, socket mappings, auth connections
 * - scoreManager.ts - Player scores, words, leaderboard
 * - presenceManager.ts - Presence status, heartbeat, connection health
 * - peerValidationManager.ts - AI word tracking, peer validation votes
 *
 * This file now acts as a facade, re-exporting all functionality for backwards compatibility.
 *
 * REDIS PERSISTENCE: Game state is persisted to Redis for:
 * - Recovery after server restarts
 * - Cross-instance state sharing in scaled deployments
 */

import type { LetterGrid, Language } from '@/shared/types/game';

// Import focused modules
import * as userManager from './userManager';
import type { GameBase } from './userManager';
import * as scoreManager from './scoreManager';
import type { ScoreGameBase } from './scoreManager';
import * as presenceManager from './presenceManager';
import type { PresenceGameBase } from './presenceManager';
import * as peerValidationManager from './peerValidationManager';
import type { PeerValidationGameBase } from './peerValidationManager';

const logger = require('../utils/logger');

// Redis client interface
interface RedisClient {
  saveGameState: (gameCode: string, state: GameState) => Promise<void>;
  getGameState: (gameCode: string) => Promise<GameState | null>;
  deleteGameState?: (gameCode: string) => Promise<void>;
  getAllGameKeys?: () => Promise<string[]>;
}

// Redis client for persistence (lazy import to avoid circular dependencies)
let redisClient: RedisClient | null = null;
function getRedisClient(): RedisClient {
  if (!redisClient) {
    try {
      redisClient = require('../redisClient');
    } catch (e) {
      // Redis not available, persistence disabled
      redisClient = {
        saveGameState: async () => { },
        getGameState: async () => null,
        deleteGameState: async () => { }
      };
    }
  }
  return redisClient as RedisClient;
}

// Game user interface
export interface GameUser {
  socketId: string;
  avatar: {
    avatarImage?: string;
    emoji?: string;
    color?: string;
  } | null;
  isHost: boolean;
  authUserId: string | null;
  guestTokenHash: string | null;
  guestSessionId?: string | null;
  isBot?: boolean;
  disconnected?: boolean;
  presence?: {
    status: string;
    lastHeartbeat: number;
    lastActivity: number;
  };
}

// Spectator interface
export interface Spectator {
  socketId: string;
  avatar: {
    avatarImage?: string;
    emoji?: string;
    color?: string;
  } | null;
  authUserId: string | null;
  guestTokenHash: string | null;
  joinedAt: number;
}

// AI-approved word interface
export interface AiApprovedWord {
  word: string;
  submitter: string;
  score: number;
  confidence: number;
}

// Player achievement interface
export interface PlayerAchievement {
  id: string;
  achievedAt: number;
  [key: string]: unknown;
}

// Game state interface
export interface GameState {
  gameCode: string;
  hostSocketId: string | null;
  hostUsername: string | null;
  hostPlayerId?: string;
  roomName: string;
  language: Language;
  users: Record<string, GameUser>;
  spectators: Record<string, Spectator>;
  playerScores: Record<string, number>;
  playerWords: Record<string, string[]>;
  playerAchievements: Record<string, PlayerAchievement[]>;
  playerCombos: Record<string, number>;
  gameState: 'waiting' | 'in-progress' | 'validating' | 'finished';
  letterGrid: LetterGrid | null;
  timerSeconds: number;
  tournamentId: string | null;
  reconnectionTimeout: ReturnType<typeof setTimeout> | null;
  validationTimeout?: ReturnType<typeof setTimeout> | null;
  isRanked: boolean;
  allowLateJoin: boolean;
  aiApprovedWords: AiApprovedWord[];
  peerValidationWord: AiApprovedWord | null;
  peerValidationVotes: Record<string, 'valid' | 'invalid'>;
  createdAt: number;
  lastActivity: number;
  restoredFromRedis?: boolean;
  gameSessionId: number;
  earthquakeTriggered?: boolean;
  gameEndedAt?: number | null;
  playerWordDetails?: Record<string, unknown[]>;
  // Track players who confirmed they want to play again (after results screen)
  playersReadyForNextGame: Record<string, boolean>;
}

// Game creation data interface
export interface GameCreationData {
  hostSocketId: string;
  hostUsername: string;
  hostPlayerId?: string;
  roomName?: string;
  language?: Language;
  isRanked?: boolean;
  allowLateJoin?: boolean;
}

// Game summary interface
export interface GameSummary {
  gameCode: string;
  roomName: string;
  hostUsername: string | null;
  playerCount: number;
  gameState: string;
  language: Language;
}

// Detailed game interface for admin dashboard
export interface DetailedGamePlayer {
  username: string;
  avatar: { emoji?: string; color?: string; avatarImage?: string } | null;
  isHost: boolean;
  isBot: boolean;
  presence: 'active' | 'idle' | 'afk' | 'disconnected';
  score: number;
  isAuthenticated: boolean;
}

export interface DetailedGame {
  gameCode: string;
  roomName: string;
  language: Language;
  gameState: 'waiting' | 'in-progress' | 'validating' | 'finished';
  isRanked: boolean;
  createdAt: number;
  timerSeconds: number;
  players: DetailedGamePlayer[];
}

// State transition result interface
export interface StateTransitionResult {
  success: boolean;
  previousState: string | null;
  newState: string | null;
  error?: string;
}

// Debounce timers for persistence
const persistTimers: Record<string, ReturnType<typeof setTimeout>> = {};
const PERSIST_DEBOUNCE_MS = 1000; // Debounce persistence calls by 1 second

// Game storage - maps gameCode to game object
const games: Record<string, GameState> = {};

// ==========================================
// Redis Persistence Functions
// ==========================================

/**
 * Persist game state to Redis (debounced)
 * @param gameCode - Game code to persist
 */
function persistGameState(gameCode: string): void {
  // Clear any existing timer for this game
  if (persistTimers[gameCode]) {
    clearTimeout(persistTimers[gameCode]);
  }

  // Set a new timer to persist after debounce period
  persistTimers[gameCode] = setTimeout(async () => {
    const game = games[gameCode];
    if (!game) {
      delete persistTimers[gameCode];
      return;
    }

    try {
      await getRedisClient().saveGameState(gameCode, game);
      logger.debug('PERSIST', `Game ${gameCode} persisted to Redis`);
    } catch (error) {
      logger.error('PERSIST', `Failed to persist game ${gameCode}`, error);
    }

    delete persistTimers[gameCode];
  }, PERSIST_DEBOUNCE_MS);
}

/**
 * Immediately persist game state (no debounce)
 * Used for critical state changes like game end
 * @param gameCode - Game code to persist
 */
async function persistGameStateNow(gameCode: string): Promise<void> {
  // Clear any pending timer
  if (persistTimers[gameCode]) {
    clearTimeout(persistTimers[gameCode]);
    delete persistTimers[gameCode];
  }

  const game = games[gameCode];
  if (!game) return;

  try {
    await getRedisClient().saveGameState(gameCode, game);
    logger.debug('PERSIST', `Game ${gameCode} immediately persisted to Redis`);
  } catch (error) {
    logger.error('PERSIST', `Failed to persist game ${gameCode}`, error);
  }
}

/**
 * Restore game state from Redis
 * @param gameCode - Game code to restore
 * @returns Restored game state or null
 */
async function restoreGameFromRedis(gameCode: string): Promise<GameState | null> {
  try {
    const redisState = await getRedisClient().getGameState(gameCode);
    if (!redisState) {
      return null;
    }

    logger.info('PERSIST', `Restoring game ${gameCode} from Redis`);

    // Create a minimal game object from Redis state
    // Note: We can't restore socket connections, so restored games
    // need players to reconnect
    games[gameCode] = {
      gameCode,
      hostSocketId: null, // Socket connections need to be re-established
      hostUsername: null,
      roomName: redisState.roomName,
      language: redisState.language || 'en',
      users: {}, // Users must reconnect
      spectators: {},
      playerScores: redisState.playerScores || {},
      playerWords: redisState.playerWords || {},
      playerAchievements: redisState.playerAchievements || {},
      playerCombos: {},
      gameState: redisState.gameState || 'waiting',
      letterGrid: redisState.letterGrid,
      timerSeconds: redisState.timerSeconds || 180,
      tournamentId: redisState.tournamentId,
      reconnectionTimeout: null,
      isRanked: false,
      allowLateJoin: true,
      aiApprovedWords: [],
      peerValidationWord: null,
      peerValidationVotes: {},
      createdAt: Date.now(),
      lastActivity: Date.now(),
      restoredFromRedis: true,
      gameSessionId: 0,
      playersReadyForNextGame: {}
    };

    return games[gameCode];
  } catch (error) {
    logger.error('PERSIST', `Failed to restore game ${gameCode} from Redis`, error);
    return null;
  }
}

/**
 * Get all game codes from Redis (for recovery after restart)
 * @returns Array of game codes
 */
async function getAllGameCodesFromRedis(): Promise<string[]> {
  try {
    const redis = getRedisClient();
    if (redis.getAllGameKeys) {
      return await redis.getAllGameKeys();
    }
    return [];
  } catch (error) {
    logger.error('PERSIST', 'Failed to get game codes from Redis', error);
    return [];
  }
}

// ==========================================
// Game CRUD Operations
// ==========================================

/**
 * Create a new game
 * @param gameCode - Unique game code
 * @param gameData - Initial game data
 */
function createGame(gameCode: string, gameData: GameCreationData): GameState {
  games[gameCode] = {
    gameCode,
    hostSocketId: gameData.hostSocketId,
    hostUsername: gameData.hostUsername,
    hostPlayerId: gameData.hostPlayerId,
    roomName: gameData.roomName || gameCode,
    language: gameData.language || 'en',
    users: {}, // username -> { socketId, avatar, isHost, authUserId, guestTokenHash }
    spectators: {}, // username -> { socketId, avatar, authUserId, guestTokenHash }
    playerScores: {},
    playerWords: {},
    playerAchievements: {},
    playerCombos: {}, // Track combo level per player for STREAK_MASTER achievement
    gameState: 'waiting', // waiting, in-progress, finished
    letterGrid: null,
    timerSeconds: 180,
    tournamentId: null,
    reconnectionTimeout: null, // Store timeout ID for host reconnection grace period
    isRanked: gameData.isRanked || false, // Ranked mode flag
    allowLateJoin: gameData.allowLateJoin !== false, // Allow late joins (default true, false for ranked)
    // AI-approved words tracking for peer validation
    aiApprovedWords: [], // Array of { word, submitter, score, confidence }
    peerValidationWord: null, // The randomly selected AI-approved word for peer validation
    peerValidationVotes: {}, // username -> 'valid' | 'invalid'
    createdAt: Date.now(),
    lastActivity: Date.now(),
    // Game session ID - increments on each reset to help clients ignore stale events
    gameSessionId: 0,
    // Track players ready for next game
    playersReadyForNextGame: {}
  };

  // Persist to Redis (debounced)
  persistGameState(gameCode);

  return games[gameCode];
}

/**
 * Get a game by code
 * @param gameCode - Game code
 * @returns Game object or null
 */
function getGame(gameCode: string): GameState | null {
  return games[gameCode] || null;
}

/**
 * Update a game
 * @param gameCode - Game code
 * @param updates - Updates to apply
 * @param immediate - Whether to persist immediately (default: false)
 */
function updateGame(gameCode: string, updates: Partial<GameState>, immediate: boolean = false): void {
  if (games[gameCode]) {
    Object.assign(games[gameCode], updates, { lastActivity: Date.now() });

    // Persist to Redis
    if (immediate) {
      persistGameStateNow(gameCode);
    } else {
      persistGameState(gameCode);
    }
  }
}

/**
 * Delete a game
 * @param gameCode - Game code
 */
function deleteGame(gameCode: string): void {
  if (games[gameCode]) {
    const game = games[gameCode];

    // Clean up any active timeouts to prevent memory leaks
    if (game.reconnectionTimeout) {
      clearTimeout(game.reconnectionTimeout);
      game.reconnectionTimeout = null;
    }
    if (game.validationTimeout) {
      clearTimeout(game.validationTimeout);
      game.validationTimeout = null;
    }

    // Cancel any pending persistence
    if (persistTimers[gameCode]) {
      clearTimeout(persistTimers[gameCode]);
      delete persistTimers[gameCode];
    }

    // Clean up user mappings using userManager
    userManager.cleanupUserMappings(game as unknown as GameBase, gameCode);

    // Clean up leaderboard throttle state using scoreManager
    scoreManager.clearLeaderboardThrottle(gameCode);

    // Delete from Redis (async, don't wait)
    getRedisClient().deleteGameState?.(gameCode);

    delete games[gameCode];
  }
}

/**
 * Check if a game exists
 * @param gameCode - Game code
 * @returns boolean
 */
function gameExists(gameCode: string): boolean {
  return !!games[gameCode];
}

// ==========================================
// User Management (delegated to userManager)
// ==========================================

interface AddUserOptions {
  avatar?: {
    avatarImage?: string;
    emoji?: string;
    color?: string;
  } | null;
  isHost?: boolean;
  authUserId?: string | null;
  guestTokenHash?: string | null;
  guestSessionId?: string | null;
  isBot?: boolean;
}

function addUserToGame(gameCode: string, username: string, socketId: string, options: AddUserOptions = {}): boolean {
  const game = games[gameCode];
  return userManager.addUserToGame(game as unknown as GameBase, gameCode, username, socketId, options as userManager.AddUserOptions);
}

function removeUserFromGame(gameCode: string, username: string): void {
  const game = games[gameCode];
  userManager.removeUserFromGame(game as unknown as GameBase, gameCode, username);
}

function removeUserBySocketId(socketId: string): { gameCode: string; username: string } | null {
  return userManager.removeUserBySocketId(games as unknown as Record<string, GameBase>, socketId, removeUserFromGame);
}

function getGameBySocketId(socketId: string): string | null {
  return userManager.getGameBySocketId(socketId);
}

function getUsernameBySocketId(socketId: string): string | null {
  return userManager.getUsernameBySocketId(socketId);
}

function getSocketIdByUsername(gameCode: string, username: string): string | null {
  return userManager.getSocketIdByUsername(gameCode, username);
}

function getUserBySocketId(socketId: string): GameUser | null {
  const userInfo = userManager.getUserBySocketId(games as unknown as Record<string, GameBase>, socketId);
  if (!userInfo) return null;
  const game = games[userInfo.gameCode];
  return game?.users[userInfo.username] || null;
}

interface AuthContext {
  authUserId?: string | null;
  guestTokenHash?: string | null;
}

function updateUserSocketId(gameCode: string, username: string, newSocketId: string, authContext: AuthContext | null = null): boolean {
  const game = games[gameCode];
  return userManager.updateUserSocketId(game as unknown as GameBase, gameCode, username, newSocketId, authContext);
}

function getGameUsers(gameCode: string): Array<{ username: string; score?: number } & GameUser> {
  const game = games[gameCode];
  const users = userManager.getGameUsers(game as unknown as GameBase);
  return users.map(u => ({
    ...u,
    socketId: u.socketId,
    avatar: u.avatar || { emoji: '', color: '' },
    isHost: u.isHost,
    username: u.username,
    score: game?.playerScores?.[u.username] ?? 0,
  })) as Array<{ username: string; score?: number } & GameUser>;
}

function isHost(socketId: string): boolean {
  return userManager.isHost(games as unknown as Record<string, GameBase>, socketId);
}

function updateHostSocketId(gameCode: string, newSocketId: string): void {
  const game = games[gameCode];
  userManager.updateHostSocketId(game as unknown as GameBase, newSocketId);
}

interface AuthUserConnection {
  gameCode: string;
  username: string;
  socketId: string;
}

function getAuthUserConnection(authUserId: string): AuthUserConnection | undefined {
  const conn = userManager.getAuthUserConnection(authUserId);
  return conn ? { gameCode: conn.gameCode, username: conn.username, socketId: conn.socketId } : undefined;
}

function setAuthUserConnection(authUserId: string, connectionInfo: AuthUserConnection): void {
  userManager.setAuthUserConnection(authUserId, { ...connectionInfo, isHost: false });
}

function removeAuthUserConnection(authUserId: string): void {
  userManager.removeAuthUserConnection(authUserId);
}

function clearSocketMappings(socketId: string): { gameCode: string | null; username: string | null } {
  const result = userManager.clearSocketMappings(socketId);
  return { gameCode: result?.gameCode ?? null, username: result?.username ?? null };
}

function clearSocketMappingsForLeave(socketId: string, gameCode: string, username: string): void {
  userManager.clearSocketMappingsForLeave(socketId, gameCode, username);
}

// ==========================================
// Score Management (delegated to scoreManager)
// ==========================================

interface AddWordOptions {
  points?: number;
  comboBonus?: number;
  timeSinceStart?: number;
  validated?: boolean;
  autoValidated?: boolean;
  isDuplicate?: boolean;
  comboLevel?: number;
  isBot?: boolean;
}

function addPlayerWord(gameCode: string, username: string, word: string, options: AddWordOptions = {}): void {
  const game = games[gameCode];
  scoreManager.addPlayerWord(game as unknown as ScoreGameBase, username, word, options);
}

// First-finder tracking interface
interface FirstFinderEntry {
  username: string;
  avatar?: {
    avatarImage?: string;
    emoji?: string;
    color?: string;
  } | null;
  timestamp: number;
}

function getFirstFinder(gameCode: string, word: string, currentUsername: string): FirstFinderEntry | null {
  const game = games[gameCode];
  return scoreManager.getFirstFinder(game as unknown as ScoreGameBase, word, currentUsername);
}

function recordFirstFinder(gameCode: string, word: string, username: string, avatar?: { avatarImage?: string; emoji?: string; color?: string }): boolean {
  const game = games[gameCode];
  return scoreManager.recordFirstFinder(game as unknown as ScoreGameBase, word, username, avatar);
}

function isFirstFinder(gameCode: string, word: string, username: string): boolean {
  const game = games[gameCode];
  return scoreManager.isFirstFinder(game as unknown as ScoreGameBase, word, username);
}

function playerHasWord(gameCode: string, username: string, word: string): boolean {
  const game = games[gameCode];
  return scoreManager.playerHasWord(game as unknown as ScoreGameBase, username, word);
}

function updatePlayerScore(gameCode: string, username: string, score: number, isDelta: boolean = false): void {
  const game = games[gameCode];
  scoreManager.updatePlayerScore(game as unknown as ScoreGameBase, username, score, isDelta);
}

interface LeaderboardPlayer {
  username: string;
  score: number;
  wordCount: number;
  avatar: {
    avatarImage?: string;
    emoji?: string;
    color?: string;
  } | null;
  isBot?: boolean;
}

function getLeaderboard(gameCode: string): LeaderboardPlayer[] {
  const game = games[gameCode];
  return scoreManager.getLeaderboard(game as unknown as ScoreGameBase) as LeaderboardPlayer[];
}

function getLeaderboardThrottled(gameCode: string, broadcastFn: (leaderboard: LeaderboardPlayer[]) => void, throttleMs: number = 500): void {
  const game = games[gameCode];
  scoreManager.getLeaderboardThrottled(game as unknown as ScoreGameBase, gameCode, broadcastFn as (leaderboard: scoreManager.LeaderboardPlayer[]) => void, throttleMs);
}

// ==========================================
// Presence Management (delegated to presenceManager)
// ==========================================

function updateUserPresence(gameCode: string, username: string, presenceData: presenceManager.PresenceData | null): 'active' | 'idle' | 'afk' | null {
  const game = games[gameCode];
  return presenceManager.updateUserPresence(game as unknown as PresenceGameBase, username, presenceData);
}

function updateUserHeartbeat(gameCode: string, username: string): presenceManager.ConnectionStatusChange | null {
  const game = games[gameCode];
  return presenceManager.updateUserHeartbeat(game as unknown as PresenceGameBase, username);
}

function checkUserConnectionHealth(gameCode: string, username: string): presenceManager.ConnectionHealthStatus {
  const game = games[gameCode];
  return presenceManager.checkUserConnectionHealth(game as unknown as PresenceGameBase, username);
}

function markUserActivity(gameCode: string, username: string): void {
  const game = games[gameCode];
  presenceManager.markUserActivity(game as unknown as PresenceGameBase, username);
}

function getPresenceConfig(): typeof presenceManager.PRESENCE_CONFIG {
  return presenceManager.getPresenceConfig();
}

function markHostActive(gameCode: string): void {
  const game = games[gameCode];
  presenceManager.markHostActive(game as unknown as PresenceGameBase);
}

function reactivateHost(gameCode: string): boolean {
  const game = games[gameCode];
  return presenceManager.reactivateHost(game as unknown as PresenceGameBase);
}

// ==========================================
// Peer Validation (delegated to peerValidationManager)
// ==========================================

function trackAiApprovedWord(gameCode: string, word: string, submitter: string, score: number, confidence: number): void {
  const game = games[gameCode];
  peerValidationManager.trackAiApprovedWord(game as unknown as PeerValidationGameBase, word, submitter, score, confidence);
}

function trackBotWord(gameCode: string, word: string, botUsername: string, score: number): void {
  const game = games[gameCode];
  peerValidationManager.trackBotWord(game as unknown as PeerValidationGameBase, word, botUsername, score);
}

function selectWordForPeerValidation(gameCode: string): AiApprovedWord | null {
  const game = games[gameCode];
  return peerValidationManager.selectWordForPeerValidation(game as unknown as PeerValidationGameBase);
}

function recordPeerValidationVote(gameCode: string, username: string, isValid: boolean): peerValidationManager.VoteResult {
  const game = games[gameCode];
  return peerValidationManager.recordPeerValidationVote(game as unknown as PeerValidationGameBase, username, isValid);
}

function getPeerValidationWord(gameCode: string): AiApprovedWord | null {
  const game = games[gameCode];
  return peerValidationManager.getPeerValidationWord(game as unknown as PeerValidationGameBase);
}

function removePeerRejectedWordScore(gameCode: string, word: string, submitter: string): number {
  const game = games[gameCode];
  return peerValidationManager.removePeerRejectedWordScore(game as unknown as PeerValidationGameBase, word, submitter);
}

// ==========================================
// Game State Operations
// ==========================================

// Import state machine utilities
const { canTransition, transition, getValidEvents } = require('../utils/gameStateMachine');

/**
 * Safely transition game state using state machine guards
 * Prevents invalid state transitions like 'waiting' -> 'finished'
 *
 * @param gameCode - Game code
 * @param eventType - Event type (START, END, TIMEOUT, VALIDATE, RESET, etc.)
 * @param options - Additional options
 * @returns State transition result
 */
function transitionGameState(gameCode: string, eventType: string, options: { immediate?: boolean } = {}): StateTransitionResult {
  const game = games[gameCode];
  if (!game) {
    return {
      success: false,
      previousState: null,
      newState: null,
      error: `Game ${gameCode} not found`,
    };
  }

  const currentState = game.gameState;
  const result = transition(currentState, eventType);

  if (!result.success) {
    logger.warn('GAME_STATE', `Invalid transition for ${gameCode}: ${currentState} -> ${eventType}`);
    return {
      success: false,
      previousState: currentState,
      newState: null,
      error: result.error,
    };
  }

  // Apply the transition
  game.gameState = result.newState;
  game.lastActivity = Date.now();

  logger.info('GAME_STATE', `Game ${gameCode}: ${currentState} -> ${result.newState} (${eventType})`);

  // Persist to Redis
  if (options.immediate) {
    persistGameStateNow(gameCode);
  } else {
    persistGameState(gameCode);
  }

  return {
    success: true,
    previousState: currentState,
    newState: result.newState,
  };
}

/**
 * Check if a state transition is valid without performing it
 * @param gameCode - Game code
 * @param eventType - Event type to check
 * @returns True if transition would be valid
 */
function canTransitionGameState(gameCode: string, eventType: string): boolean {
  const game = games[gameCode];
  if (!game) return false;
  return canTransition(game.gameState, eventType);
}

/**
 * Get valid events for the current game state
 * @param gameCode - Game code
 * @returns Array of valid event types
 */
function getValidGameEvents(gameCode: string): string[] {
  const game = games[gameCode];
  if (!game) return [];
  return getValidEvents(game.gameState);
}

/**
 * Reset game state for a new round
 * Uses state machine to ensure valid transition
 * @param gameCode - Game code
 * @returns True if reset succeeded
 */
function resetGameForNewRound(gameCode: string): boolean {
  const game = games[gameCode];
  if (!game) return false;

  // Try to transition to waiting state
  // Accept RESET from 'finished' or SKIP_VALIDATION from 'finished'
  let transitionSuccess = false;
  const currentState = game.gameState;

  if (currentState === 'finished') {
    const result = transition(currentState, 'RESET');
    transitionSuccess = result.success;
    if (result.success) {
      game.gameState = result.newState;
    }
  } else if (currentState === 'validating') {
    const result = transition(currentState, 'VALIDATION_COMPLETE');
    transitionSuccess = result.success;
    if (result.success) {
      game.gameState = result.newState;
    }
  } else if (currentState === 'waiting') {
    // Already in waiting, no transition needed
    transitionSuccess = true;
  } else {
    // For 'in-progress', we need to end first then reset
    // This shouldn't happen normally, but handle it gracefully
    logger.warn('GAME_STATE', `Reset called in unexpected state: ${currentState}`);
    game.gameState = 'waiting';
    transitionSuccess = true;
  }

  // Reset scores using scoreManager
  scoreManager.resetScoresForNewRound(game as unknown as ScoreGameBase);

  // Reset peer validation
  peerValidationManager.resetPeerValidation(game as unknown as PeerValidationGameBase);

  // Reset earthquake state for new round
  game.earthquakeTriggered = false;

  game.letterGrid = null;
  game.lastActivity = Date.now();
  game.gameEndedAt = null; // Clear end timestamp for new game

  // Clear players ready for next game (they need to confirm again after next game)
  game.playersReadyForNextGame = {};

  // Increment game session ID to help clients ignore stale events from previous games
  game.gameSessionId = (game.gameSessionId || 0) + 1;

  // Persist the change
  persistGameState(gameCode);

  return transitionSuccess;
}

// ==========================================
// Game Queries
// ==========================================

/**
 * Get all active games
 * @returns Array of game summaries
 */
function getAllGames(): GameSummary[] {
  return Object.values(games).map(game => ({
    gameCode: game.gameCode,
    roomName: game.roomName,
    hostUsername: game.hostUsername,
    playerCount: Object.keys(game.users).length,
    gameState: game.gameState,
    language: game.language
  }));
}

/**
 * Get detailed game information for admin dashboard
 * Includes full player details with presence and scores
 * @returns Array of detailed game info
 */
function getDetailedGames(): DetailedGame[] {
  return Object.values(games).map(game => {
    const players: DetailedGamePlayer[] = Object.entries(game.users).map(([username, user]) => {
      // Determine presence status
      let presence: 'active' | 'idle' | 'afk' | 'disconnected' = 'active';
      if (user.disconnected) {
        presence = 'disconnected';
      } else if (user.presence?.status === 'afk') {
        presence = 'afk';
      } else if (user.presence?.status === 'idle') {
        presence = 'idle';
      }

      return {
        username,
        avatar: user.avatar,
        isHost: user.isHost,
        isBot: user.isBot || false,
        presence,
        score: game.playerScores[username] || 0,
        isAuthenticated: !!user.authUserId,
      };
    });

    // Sort players: host first, then by score descending
    players.sort((a, b) => {
      if (a.isHost && !b.isHost) return -1;
      if (!a.isHost && b.isHost) return 1;
      return b.score - a.score;
    });

    return {
      gameCode: game.gameCode,
      roomName: game.roomName,
      language: game.language,
      gameState: game.gameState as 'waiting' | 'in-progress' | 'validating' | 'finished',
      isRanked: game.isRanked,
      createdAt: game.createdAt,
      timerSeconds: game.timerSeconds,
      players,
    };
  });
}

/**
 * Get active rooms for lobby display
 * Filters out rooms with no human players (bots don't count)
 * @returns Array of room info
 */
function getActiveRooms(): GameSummary[] {
  return Object.values(games)
    .filter(game => {
      // Only show rooms with active human players (bots and disconnected players don't count)
      const humanPlayers = Object.values(game.users).filter(user => !user.isBot && !user.disconnected);
      return humanPlayers.length > 0;
    })
    .map(game => {
      // Count only active human players for display (exclude disconnected)
      const humanPlayerCount = Object.values(game.users).filter(user => !user.isBot && !user.disconnected).length;
      return {
        gameCode: game.gameCode,
        roomName: game.roomName,
        hostUsername: game.hostUsername,
        playerCount: humanPlayerCount,
        gameState: game.gameState,
        language: game.language
      };
    });
}

/**
 * Check if a specific room is empty (no active human players)
 * @param gameCode - Game code to check
 * @returns True if room is empty or doesn't exist
 */
function isRoomEmpty(gameCode: string): boolean {
  const game = games[gameCode];
  if (!game) return true;

  const users = Object.values(game.users);
  // Room is empty if no users at all
  if (users.length === 0) return true;
  // Room is empty if no active human players (bots don't count as real players)
  const activeHumanUsers = users.filter(user => !user.disconnected && !user.isBot);
  return activeHumanUsers.length === 0;
}

/**
 * Get empty rooms (rooms with no active human players)
 * @returns Array of game codes for empty rooms
 */
function getEmptyRooms(): string[] {
  return Object.values(games)
    .filter(game => {
      const users = Object.values(game.users);
      // Room is empty if no users at all
      if (users.length === 0) return true;
      // Room is empty if no active human players (bots don't count as real players)
      const activeHumanUsers = users.filter(user => !user.disconnected && !user.isBot);
      return activeHumanUsers.length === 0;
    })
    .map(game => game.gameCode);
}

/**
 * Clean up empty rooms (rooms with no players)
 * @returns Number of rooms cleaned up
 */
function cleanupEmptyRooms(): number {
  const emptyRooms = getEmptyRooms();

  for (const gameCode of emptyRooms) {
    console.log(`[CLEANUP] Removing empty room: ${gameCode}`);
    deleteGame(gameCode);
  }

  return emptyRooms.length;
}

/**
 * Cleanup stale games (older than maxAge)
 * @param maxAge - Maximum age in milliseconds (default 30 minutes)
 */
function cleanupStaleGames(maxAge: number = 30 * 60 * 1000): number {
  const now = Date.now();
  const staleCodes: string[] = [];

  for (const [code, game] of Object.entries(games)) {
    if (now - game.lastActivity > maxAge) {
      staleCodes.push(code);
    }
  }

  for (const code of staleCodes) {
    console.log(`[CLEANUP] Removing stale game: ${code}`);
    deleteGame(code);
  }

  return staleCodes.length;
}

// ==========================================
// Tournament Management
// ==========================================

/**
 * Get tournament ID for a game
 * @param gameCode - Game code
 * @returns Tournament ID or null
 */
function getTournamentIdFromGame(gameCode: string): string | null {
  return games[gameCode]?.tournamentId || null;
}

/**
 * Set tournament ID for a game
 * @param gameCode - Game code
 * @param tournamentId - Tournament ID to set
 * @returns Whether the operation succeeded
 */
function setTournamentIdForGame(gameCode: string, tournamentId: string | null): boolean {
  if (games[gameCode]) {
    games[gameCode].tournamentId = tournamentId;
    return true;
  }
  return false;
}

// ==========================================
// Encapsulation Helpers
// ==========================================

/**
 * Get count of active games (for metrics)
 * @returns Number of active games
 */
function getGameCount(): number {
  return Object.keys(games).length;
}

/**
 * Get all game codes (for iteration)
 * @returns Array of game codes
 */
function getAllGameCodes(): string[] {
  return Object.keys(games);
}

/**
 * Iterate over all games with a callback
 * Provides safe access without exposing internal state
 * @param callback - Function to call with (gameCode, game) for each game
 */
function forEachGame(callback: (gameCode: string, game: GameState) => void): void {
  for (const [gameCode, game] of Object.entries(games)) {
    callback(gameCode, game);
  }
}

/**
 * Clear all games - TEST ONLY
 * This function is intended for test cleanup only
 * @throws Error - If called outside of test environment
 */
function clearAllGames(): number {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('[gameStateManager] clearAllGames() can only be called in test environment');
  }
  const gameCodes = Object.keys(games);
  for (const code of gameCodes) {
    deleteGame(code);
  }
  return gameCodes.length;
}

// ==========================================
// Ready for Next Game Management
// ==========================================

/**
 * Mark a player as ready for the next game
 * @param gameCode - Game code
 * @param username - Username
 * @returns Object with ready count and total player count
 */
function markPlayerReadyForNextGame(gameCode: string, username: string): { readyCount: number; totalPlayers: number } | null {
  const game = games[gameCode];
  if (!game) return null;

  // Host should not be in the ready list - they click "Start Game" instead
  const user = game.users[username];
  if (user?.isHost) {
    return null;
  }

  game.playersReadyForNextGame[username] = true;
  game.lastActivity = Date.now();
  persistGameState(gameCode);

  const readyCount = Object.keys(game.playersReadyForNextGame).length;
  // Count non-bot, non-host users who are currently connected (host clicks Start, not Ready)
  const totalPlayers = Object.values(game.users).filter(u => !u.isBot && !u.disconnected && !u.isHost).length;

  return { readyCount, totalPlayers };
}

/**
 * Get the count of players ready for next game
 * @param gameCode - Game code
 * @returns Object with ready count and total player count
 */
function getPlayersReadyCount(gameCode: string): { readyCount: number; totalPlayers: number; readyUsernames: string[] } | null {
  const game = games[gameCode];
  if (!game) return null;

  const readyUsernames = Object.keys(game.playersReadyForNextGame);
  const readyCount = readyUsernames.length;
  // Count non-bot, non-host users who are currently connected (host clicks Start, not Ready)
  const totalPlayers = Object.values(game.users).filter(u => !u.isBot && !u.disconnected && !u.isHost).length;

  return { readyCount, totalPlayers, readyUsernames };
}

/**
 * Check if a player is ready for next game
 * @param gameCode - Game code
 * @param username - Username
 * @returns True if player is ready
 */
function isPlayerReadyForNextGame(gameCode: string, username: string): boolean {
  const game = games[gameCode];
  if (!game) return false;
  return !!game.playersReadyForNextGame[username];
}

/**
 * Clear all ready statuses (called when game starts or resets)
 * @param gameCode - Game code
 */
function clearPlayersReadyForNextGame(gameCode: string): void {
  const game = games[gameCode];
  if (!game) return;
  game.playersReadyForNextGame = {};
  persistGameState(gameCode);
}

// ==========================================
// Spectator Management
// ==========================================

interface SpectatorOptions {
  avatar?: {
    avatarImage?: string;
    emoji?: string;
    color?: string;
  } | null;
  authUserId?: string | null;
  guestTokenHash?: string | null;
}

/**
 * Add a spectator to a game
 * @param gameCode - Game code
 * @param username - Spectator username
 * @param socketId - Socket ID
 * @param options - Additional spectator data (avatar, authUserId, guestTokenHash)
 */
function addSpectatorToGame(gameCode: string, username: string, socketId: string, options: SpectatorOptions = {}): void {
  const game = getGame(gameCode);
  if (!game) return;

  game.spectators[username] = {
    socketId,
    avatar: options.avatar || null,
    authUserId: options.authUserId || null,
    guestTokenHash: options.guestTokenHash || null,
    joinedAt: Date.now()
  };

  persistGameState(gameCode);
}

/**
 * Remove a spectator from a game
 * @param gameCode - Game code
 * @param username - Spectator username
 */
function removeSpectatorFromGame(gameCode: string, username: string): void {
  const game = getGame(gameCode);
  if (!game) return;

  delete game.spectators[username];
  persistGameState(gameCode);
}

/**
 * Get all spectators in a game
 * @param gameCode - Game code
 * @returns Array of spectator objects with username
 */
function getGameSpectators(gameCode: string): Array<{ username: string } & Spectator> {
  const game = getGame(gameCode);
  if (!game) return [];

  return Object.keys(game.spectators).map(username => ({
    username,
    ...game.spectators[username]
  }));
}

/**
 * Upgrade a spectator to active player
 * @param gameCode - Game code
 * @param username - Spectator username
 * @returns True if upgrade successful, false otherwise
 */
function upgradeSpectatorToPlayer(gameCode: string, username: string): boolean {
  const game = getGame(gameCode);
  if (!game || !game.spectators[username]) {
    return false;
  }

  const { MAX_PLAYERS_PER_ROOM } = require('../utils/consts');

  // Check if room has space
  if (Object.keys(game.users).length >= MAX_PLAYERS_PER_ROOM) {
    return false;
  }

  // Move spectator to users
  const spectatorData = game.spectators[username];
  game.users[username] = {
    socketId: spectatorData.socketId,
    avatar: spectatorData.avatar,
    isHost: false,
    authUserId: spectatorData.authUserId,
    guestTokenHash: spectatorData.guestTokenHash
  };

  // Remove from spectators
  delete game.spectators[username];

  persistGameState(gameCode);
  return true;
}

/**
 * Check if a user is a spectator
 * @param gameCode - Game code
 * @param username - Username to check
 * @returns True if user is a spectator
 */
function isSpectator(gameCode: string, username: string): boolean {
  const game = getGame(gameCode);
  if (!game) return false;
  return !!game.spectators[username];
}

// ==========================================
// Module Exports
// ==========================================

// ESM exports
export {
  // Game CRUD
  createGame,
  getGame,
  updateGame,
  deleteGame,
  gameExists,
  getGameCount,
  getAllGameCodes,
  forEachGame,

  // User management
  addUserToGame,
  removeUserFromGame,
  removeUserBySocketId,
  getGameBySocketId,
  getUsernameBySocketId,
  getSocketIdByUsername,
  getUserBySocketId,
  updateUserSocketId,
  getGameUsers,

  // Spectator management
  addSpectatorToGame,
  removeSpectatorFromGame,
  getGameSpectators,
  upgradeSpectatorToPlayer,
  isSpectator,

  // Ready for next game management
  markPlayerReadyForNextGame,
  getPlayersReadyCount,
  isPlayerReadyForNextGame,
  clearPlayersReadyForNextGame,

  // Game queries
  getAllGames,
  getDetailedGames,
  getActiveRooms,
  getEmptyRooms,
  isRoomEmpty,
  cleanupEmptyRooms,

  // Host management
  isHost,
  updateHostSocketId,

  // Game state transitions
  transitionGameState,
  canTransitionGameState,
  getValidGameEvents,
  resetGameForNewRound,

  // Player data
  addPlayerWord,
  playerHasWord,
  updatePlayerScore,
  getLeaderboard,
  getLeaderboardThrottled,

  // First-finder tracking (for first-to-find scoring)
  getFirstFinder,
  recordFirstFinder,
  isFirstFinder,

  // AI word peer validation
  trackAiApprovedWord,
  trackBotWord,
  selectWordForPeerValidation,
  recordPeerValidationVote,
  getPeerValidationWord,
  removePeerRejectedWordScore,

  // Cleanup
  cleanupStaleGames,
  clearAllGames,

  // Presence tracking
  updateUserPresence,
  updateUserHeartbeat,
  markUserActivity,
  getPresenceConfig,
  checkUserConnectionHealth,
  markHostActive,
  reactivateHost,

  // Auth user tracking
  getAuthUserConnection,
  setAuthUserConnection,
  removeAuthUserConnection,
  clearSocketMappings,
  clearSocketMappingsForLeave,

  // Tournament management
  getTournamentIdFromGame,
  setTournamentIdForGame,

  // Redis persistence
  persistGameState,
  persistGameStateNow,
  restoreGameFromRedis,
  getAllGameCodesFromRedis
};

// CommonJS exports for backward compatibility
module.exports = {
  // Game CRUD - NOTE: games object is NOT exported to maintain encapsulation
  // Use getGame(), getAllGames(), forEachGame() instead of direct access
  createGame,
  getGame,
  updateGame,
  deleteGame,
  gameExists,
  getGameCount,
  getAllGameCodes,
  forEachGame,

  // User management (from userManager)
  addUserToGame,
  removeUserFromGame,
  removeUserBySocketId,
  getGameBySocketId,
  getUsernameBySocketId,
  getSocketIdByUsername,
  getUserBySocketId,
  updateUserSocketId,
  getGameUsers,

  // Spectator management
  addSpectatorToGame,
  removeSpectatorFromGame,
  getGameSpectators,
  upgradeSpectatorToPlayer,
  isSpectator,

  // Ready for next game management
  markPlayerReadyForNextGame,
  getPlayersReadyCount,
  isPlayerReadyForNextGame,
  clearPlayersReadyForNextGame,

  // Game queries
  getAllGames,
  getDetailedGames,
  getActiveRooms,
  getEmptyRooms,
  isRoomEmpty,
  cleanupEmptyRooms,

  // Host management
  isHost,
  updateHostSocketId,

  // Game state transitions (state machine)
  transitionGameState,
  canTransitionGameState,
  getValidGameEvents,
  resetGameForNewRound,

  // Player data (from scoreManager)
  addPlayerWord,
  playerHasWord,
  updatePlayerScore,
  getLeaderboard,
  getLeaderboardThrottled,

  // First-finder tracking (for first-to-find scoring)
  getFirstFinder,
  recordFirstFinder,
  isFirstFinder,

  // AI word peer validation (from peerValidationManager)
  trackAiApprovedWord,
  trackBotWord,
  selectWordForPeerValidation,
  recordPeerValidationVote,
  getPeerValidationWord,
  removePeerRejectedWordScore,

  // Cleanup
  cleanupStaleGames,
  clearAllGames,

  // Presence tracking (from presenceManager)
  updateUserPresence,
  updateUserHeartbeat,
  markUserActivity,
  getPresenceConfig,
  checkUserConnectionHealth,
  markHostActive,
  reactivateHost,

  // Auth user tracking (from userManager)
  getAuthUserConnection,
  setAuthUserConnection,
  removeAuthUserConnection,
  clearSocketMappings,
  clearSocketMappingsForLeave,

  // Tournament management
  getTournamentIdFromGame,
  setTournamentIdForGame,

  // Redis persistence
  persistGameState,
  persistGameStateNow,
  restoreGameFromRedis,
  getAllGameCodesFromRedis,

  // TEST ONLY - Direct access to games object for test verification
  // DO NOT use in production code - use getGame(), forEachGame(), clearAllGames() instead
  get games() {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('[gameStateManager] Direct access to games object is not allowed. Use getGame(), getAllGameCodes(), forEachGame(), or clearAllGames() instead.');
    }
    return games;
  }
};
