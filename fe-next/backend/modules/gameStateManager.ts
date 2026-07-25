/**
 * Game State Manager
 * Centralized game state management for Socket.IO
 *
 * ARCHITECTURE: This file is a thin facade that orchestrates focused modules:
 * - gameState/types.ts - Type definitions
 * - gameState/persistence.ts - Redis persistence
 * - userManager.ts - User CRUD, socket mappings
 * - scoreManager.ts - Player scores, words, leaderboard
 * - presenceManager.ts - Presence status, heartbeat
 * - peerValidationManager.ts - AI word tracking, peer validation
 * - spectatorManager.ts - Spectator CRUD and upgrades
 * - readyStateManager.ts - Ready-for-next-game tracking
 * - gameQueryManager.ts - Game queries, filtering
 * - hostManager.ts - Host transfer and eligibility
 */

// Types - re-export from centralized location
export type {
  GameState,
  GameUser,
  Spectator,
  AiApprovedWord,
  PlayerAchievement,
  GameCreationData,
  StateTransitionResult
} from './gameState/types';

import type { GameState, GameCreationData, StateTransitionResult } from './gameState/types';

// Persistence
import {
  persistGameState as doPersist,
  persistGameStateNow as doPersistNow,
  restoreGameFromRedis as doRestore,
  restoreAllGamesFromRedis as doRestoreAll,
  getAllGameCodesFromRedis,
  deleteGameFromRedis,
  clearPersistTimer
} from './gameState/persistence';

// Sub-modules with types
import * as userManager from './userManager';
import * as scoreManager from './scoreManager';
import * as presenceManager from './presenceManager';
import * as peerValidationManager from './peerValidationManager';
import * as spectatorManager from './spectatorManager';
import * as readyStateManager from './readyStateManager';
import * as gameQueryManager from './gameQueryManager';
import * as hostManager from './hostManager';
import * as metrics from '../utils/metrics';
import { gameCleanupEmitter } from '../events/gameCleanup';

import type { GameBase, AddUserOptions, AuthContext } from './userManager';
import type { ScoreGameBase, AddWordOptions, LeaderboardPlayer } from './scoreManager';
import type { PresenceGameBase, PresenceData } from './presenceManager';
import type { PeerValidationGameBase } from './peerValidationManager';
import type { SpectatorGameBase, SpectatorOptions } from './spectatorManager';
import type { ReadyStateGameBase } from './readyStateManager';
import type { QueryGameBase } from './gameQueryManager';
import type { HostGameBase, TransferHostResult } from './hostManager';

import { clearEngagementTimeouts } from '../services/gameLifecycle/gameResults';
import timerManager from '../utils/timerManager';
import { cleanupGameBots } from './botManager';
import { cleanupGameTracking } from './communityWordHybridValidation';
import { clearOpponentWordFeed } from '../utils/opponentWordFeedBatcher';
import { clearPlayerFoundWords } from '../utils/playerFoundWordBatcher';
import { MAX_PLAYERS_PER_ROOM } from '../utils/consts';
import { LRUCache } from 'lru-cache';
import { publishCacheInvalidation, startCacheInvalidationListener, stopCacheInvalidationListener } from '../redis/cacheInvalidation';

import logger from '../utils/logger';
const { canTransition, transition, getValidEvents } = require('../utils/gameStateMachine');

// Re-exports for backwards compatibility
export type { GameSummary, DetailedGame, DetailedGamePlayer } from './gameQueryManager';
export type { SpectatorOptions, SpectatorInfo } from './spectatorManager';
export type { ReadyCountResult } from './readyStateManager';
export type { TransferHostResult } from './hostManager';

// Feature flag: when true, Redis is source of truth with local LRU cache
const REDIS_PRIMARY = process.env.REDIS_PRIMARY === 'true';

// Game storage (in-memory primary mode)
const games: Record<string, GameState> = {};

// LRU cache for Redis-primary mode — holds recently-accessed games in memory
// to avoid Redis round-trips on every getGame() call
const gameCache = new LRUCache<string, GameState>({
  max: parseInt(process.env.GAME_CACHE_MAX || '200', 10),
  ttl: 30 * 60 * 1000, // 30 min — stale games evicted automatically
});

// Active rooms cache (dirty-flag pattern to avoid O(n) on every call)
let activeRoomsCache: ReturnType<typeof gameQueryManager.getActiveRooms> | null = null;
let activeRoomsCacheDirty = true;

function markActiveRoomsDirty(): void {
  activeRoomsCacheDirty = true;
}

// Persistence helpers (bound to games object)
const persistGameState = (gameCode: string): void => doPersist(gameCode, games);
const persistGameStateNow = (gameCode: string): Promise<void> => doPersistNow(gameCode, games);
const restoreAllGamesFromRedis = (): Promise<number> => doRestoreAll(games);

// Per-game restoration lock to prevent duplicate concurrent restores
const restoreLocks = new Map<string, Promise<GameState | null>>();
const restoreGameFromRedis = (gameCode: string): Promise<GameState | null> => {
  // If game already exists in memory, no need to restore
  if (games[gameCode]) return Promise.resolve(games[gameCode]);

  // If a restore is already in-flight for this game, return the same promise
  const existing = restoreLocks.get(gameCode);
  if (existing) return existing;

  const promise = doRestore(gameCode, games).finally(() => {
    restoreLocks.delete(gameCode);
  });
  restoreLocks.set(gameCode, promise);
  return promise;
};

// Type casting helper for sub-module calls
const asBase = <T>(game: GameState | null | undefined): T => game as unknown as T;

// Game CRUD Operations
function createGame(gameCode: string, data: GameCreationData): GameState {
  games[gameCode] = {
    gameCode,
    hostSocketId: data.hostSocketId,
    hostUsername: data.hostUsername,
    hostPlayerId: data.hostPlayerId,
    roomName: data.roomName || gameCode,
    language: data.language || 'en',
    users: {},
    spectators: {},
    playerScores: {},
    playerEventBonuses: {},
    playerWords: {},
    playerAchievements: {},
    playerCombos: {},
    gameState: 'waiting',
    letterGrid: null,
    timerSeconds: 180,
    tournamentId: null,
    reconnectionTimeout: null,
    isRanked: data.isRanked || false,
    isPrivate: data.isPrivate || false,
    isClassroom: data.isClassroom || false,
    allowLateJoin: data.allowLateJoin !== false,
    aiApprovedWords: [],
    peerValidationWord: null,
    peerValidationVotes: {},
    createdAt: Date.now(),
    lastActivity: Date.now(),
    gameSessionId: 0,
    playersReadyForNextGame: {},
    selectedVocabulary: new Set<string>(),
    gameMode: 'classic',
    modeHistory: []
  };
  markActiveRoomsDirty();
  persistGameState(gameCode);
  return games[gameCode];
}

function getGame(gameCode: string): GameState | null {
  return games[gameCode] || null;
}

/**
 * Async version of getGame that checks the LRU cache first, then Redis.
 * When REDIS_PRIMARY=true, this is the preferred accessor.
 * Handlers can migrate from getGame() → getGameAsync() incrementally.
 */
async function getGameAsync(gameCode: string): Promise<GameState | null> {
  // Fast path: in-memory hit (works in both modes)
  const local = games[gameCode];
  if (local) return local;

  if (!REDIS_PRIMARY) return null;

  // LRU cache hit
  const cached = gameCache.get(gameCode);
  if (cached) return cached;

  // Redis fetch
  const restored = await restoreGameFromRedis(gameCode);
  if (restored) {
    gameCache.set(gameCode, restored);
  }
  return restored;
}

function updateGame(gameCode: string, updates: Partial<GameState>, immediate = false): void {
  if (!games[gameCode]) return;
  Object.assign(games[gameCode], updates, { lastActivity: Date.now() });
  markActiveRoomsDirty();

  if (REDIS_PRIMARY) {
    // In Redis-primary mode, always persist immediately and update cache
    gameCache.set(gameCode, games[gameCode]);
    persistGameStateNow(gameCode);
    publishCacheInvalidation(gameCode);
  } else if (immediate) {
    persistGameStateNow(gameCode);
  } else {
    persistGameState(gameCode);
  }
}

function deleteGame(gameCode: string): void {
  const game = games[gameCode];
  if (!game) return;

  // Kill the per-second game tick interval FIRST. Without this, a game
  // deleted mid-round (cleanup sweep, host-left, abandonment) leaves its
  // interval registered until the original endTimestamp — each tick retains
  // the closure (io, game ref) and ends by calling endGame() on a dead game.
  // Leaked per-second intervals are a prime suspect in the OOM sawtooth.
  timerManager.clearTimer(`game:${gameCode}`);
  timerManager.clearTimer(`hostReconnect:${gameCode}`);
  if (game.validationTimeout) clearTimeout(game.validationTimeout);
  clearPersistTimer(gameCode);
  // Clear any pending delayed engagement timeouts to prevent
  // orphaned Supabase queries from disconnected sockets
  clearEngagementTimeouts(gameCode);
  // Clear tracked spam cooldown timers for this game
  timerManager.clearTimersWithPrefix(`spam:cooldown:${gameCode}:`);
  // Clear player reconnection timers
  timerManager.clearTimersWithPrefix(`reconnect:${gameCode}:`);
  // Clear feedback and other orphaned timers keyed by gameCode
  timerManager.clearTimer(`feedback:${gameCode}`);
  timerManager.clearTimer(`wordHuntEnd:${gameCode}`);

  userManager.cleanupUserMappings(asBase<GameBase>(game), gameCode);
  scoreManager.clearLeaderboardThrottle(gameCode);
  // Bots + their id counter are module-level Maps keyed by gameCode. Handler
  // teardown paths call cleanupGameBots() by hand, but the periodic sweeps
  // (cleanupEmptyRooms / cleanupStaleGames) reach deleteGame() directly — so
  // every abandoned room used to retain its Bot objects forever. Cleaning here
  // covers ALL delete paths; the hand-written calls stay harmless (idempotent).
  cleanupGameBots(gameCode);
  cleanupGameTracking(gameCode);
  clearOpponentWordFeed(gameCode);
  clearPlayerFoundWords(gameCode);
  // Notify all per-game state holders (rushTiles, roundEvents, earthquake,
  // hint, wordHunt, bots) so games deleted WITHOUT a normal endGame —
  // abandonment sweep, empty-room cleanup, host-left pre-start — don't leak
  // their map entries and pending timers. Idempotent: a game that already
  // ended normally just re-runs no-op deletes.
  gameCleanupEmitter.emitGameEnd(gameCode);
  metrics.deleteRoom(gameCode);
  deleteGameFromRedis(gameCode);
  delete games[gameCode];
  gameCache.delete(gameCode);
  if (REDIS_PRIMARY) publishCacheInvalidation(gameCode);
  markActiveRoomsDirty();
}

const gameExists = (gameCode: string): boolean => !!games[gameCode];
const getGameCount = (): number => Object.keys(games).length;
const getAllGameCodes = (): string[] => Object.keys(games);

function forEachGame(callback: (gameCode: string, game: GameState) => void | boolean): void {
  for (const [gameCode, game] of Object.entries(games)) {
    if (callback(gameCode, game) === false) break;
  }
}

// State Transitions
function transitionGameState(gameCode: string, eventType: string, options: { immediate?: boolean } = {}): StateTransitionResult {
  const game = games[gameCode];
  if (!game) return { success: false, previousState: null, newState: null, error: `Game ${gameCode} not found` };

  const currentState = game.gameState;
  const result = transition(currentState, eventType);

  if (!result.success) {
    logger.debug('GAME_STATE', `Transition rejected for ${gameCode}: ${currentState} -> ${eventType} (${result.error})`);
    return { success: false, previousState: currentState, newState: null, error: result.error };
  }

  game.gameState = result.newState;
  game.lastActivity = Date.now();
  logger.info('GAME_STATE', `Game ${gameCode}: ${currentState} -> ${result.newState} (${eventType})`);

  if (options.immediate) persistGameStateNow(gameCode);
  else persistGameState(gameCode);

  return { success: true, previousState: currentState, newState: result.newState };
}

function canTransitionGameState(gameCode: string, eventType: string): boolean {
  const game = games[gameCode];
  return game ? canTransition(game.gameState, eventType) : false;
}

function getValidGameEvents(gameCode: string): string[] {
  const game = games[gameCode];
  return game ? getValidEvents(game.gameState) : [];
}

function resetGameForNewRound(gameCode: string): boolean {
  const game = games[gameCode];
  if (!game) return false;

  const currentState = game.gameState;
  let transitionSuccess = false;

  if (currentState === 'finished') {
    const result = transition(currentState, 'RESET');
    transitionSuccess = result.success;
    if (result.success) game.gameState = result.newState;
  } else if (currentState === 'validating') {
    const result = transition(currentState, 'VALIDATION_COMPLETE');
    transitionSuccess = result.success;
    if (result.success) game.gameState = result.newState;
  } else if (currentState === 'waiting') {
    transitionSuccess = true;
  } else {
    // Defensive recovery: reset was called from a state with no defined
    // RESET/VALIDATION_COMPLETE edge (e.g. 'playing', 'countdown'). Force
    // back to 'waiting' so the room isn't wedged — but this bypasses the
    // state machine, so surface it loudly: reaching here means an upstream
    // path ended a round without going through 'finished'/'validating'.
    logger.warn('GAME_STATE', `Reset from unexpected state '${currentState}' for ${gameCode} — forcing 'waiting' (state-machine bypassed)`);
    game.gameState = 'waiting';
    transitionSuccess = true;
  }

  scoreManager.resetScoresForNewRound(asBase<ScoreGameBase>(game));
  scoreManager.clearLeaderboardThrottle(gameCode);
  clearOpponentWordFeed(gameCode);
  clearPlayerFoundWords(gameCode);
  peerValidationManager.resetPeerValidation(asBase<PeerValidationGameBase>(game));
  readyStateManager.clearPlayersReadyForNextGame(asBase<ReadyStateGameBase>(game));

  // Stop all bots for this game — they'll be re-added when the next round starts.
  // Without this, bot timers accumulate across rounds.
  // Also zero each bot's per-round score/combo: bots are REUSED across rounds, and
  // the dedicated blast/wheel-rush drivers never re-zero bot.score (only the classic
  // word-pool prep does). Without this, a reused bot kept a stale-high score and
  // shouldBotScore rejected every word, freezing the bot at 0 on repeat blast rounds.
  try {
    const { stopAllBots, resetBotsForNewRound } = require('../modules/botManager');
    stopAllBots(gameCode);
    resetBotsForNewRound(gameCode);
  } catch {
    // botManager may not be loaded in test environments
  }

  // Clear all player reconnection timeouts to prevent orphaned timeouts
  // from removing players from the NEW game after reset
  for (const [username] of Object.entries(game.users)) {
    timerManager.clearTimer(`reconnect:${gameCode}:${username}`);
  }
  // Also clear host reconnection timeout
  timerManager.clearTimer(`hostReconnect:${gameCode}`);

  game.earthquakeTriggered = false;
  game.letterGrid = null;
  game.minWordLength = undefined;
  game.lastActivity = Date.now();
  game.gameEndedAt = null;
  game.wordHuntState = null;
  game.blastModeState = null;
  // firstFinderMap is cleared by scoreManager.resetScoresForNewRound above
  game.playerCombos = {};
  game.gameSessionId = (game.gameSessionId || 0) + 1;

  persistGameState(gameCode);
  return transitionSuccess;
}

// Cleanup
// Mirror connectionHandler.HOST_RECONNECTION_GRACE_PERIOD so the periodic
// empty-room sweep does not race-delete a room while its host is briefly
// backgrounded (Chrome tab away, phone locked) and the host-disconnect grace
// timer is still pending.
const EMPTY_ROOM_GRACE_MS = parseInt(process.env.HOST_RECONNECTION_GRACE_PERIOD || '300000');

function cleanupEmptyRooms(): number {
  const emptyRooms = gameQueryManager.getEmptyRooms(
    games as unknown as Record<string, QueryGameBase>,
    { gracePeriodMs: EMPTY_ROOM_GRACE_MS }
  );
  for (const code of emptyRooms) {
    logger.info('CLEANUP', `Removing empty room: ${code}`);
    deleteGame(code);
  }

  // Piggyback: clean stale auth connections whose games no longer exist
  const activeGameCodes = new Set(Object.keys(games));
  const staleAuthCleaned = userManager.cleanupStaleAuthConnections(activeGameCodes);
  if (staleAuthCleaned > 0) {
    logger.info('CLEANUP', `Removed ${staleAuthCleaned} stale auth user connections`);
  }

  return emptyRooms.length;
}

function cleanupStaleGames(maxAge = 30 * 60 * 1000): number {
  const staleCodes = gameQueryManager.getStaleGameCodes(games as unknown as Record<string, QueryGameBase>, maxAge);
  for (const code of staleCodes) {
    logger.info('CLEANUP', `Removing stale game: ${code}`);
    deleteGame(code);
  }
  return staleCodes.length;
}

function clearAllGames(): number {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('[gameStateManager] clearAllGames() can only be called in test environment');
  }
  const gameCodes = Object.keys(games);
  for (const code of gameCodes) deleteGame(code);
  return gameCodes.length;
}

// User Management Delegation
function addUserToGame(gameCode: string, username: string, socketId: string, options: AddUserOptions = {}): boolean {
  const result = userManager.addUserToGame(asBase<GameBase>(games[gameCode]), gameCode, username, socketId, options);
  if (result) persistGameState(gameCode);
  return result;
}

function removeUserFromGame(gameCode: string, username: string): void {
  userManager.removeUserFromGame(asBase<GameBase>(games[gameCode]), gameCode, username);
  persistGameState(gameCode);
}

function removeUserBySocketId(socketId: string): { gameCode: string; username: string } | null {
  return userManager.removeUserBySocketId(games as unknown as Record<string, GameBase>, socketId, removeUserFromGame);
}

const getGameBySocketId = userManager.getGameBySocketId;
const getUsernameBySocketId = userManager.getUsernameBySocketId;
const getSocketIdByUsername = userManager.getSocketIdByUsername;

function getUserBySocketId(socketId: string): GameState['users'][string] | null {
  const info = userManager.getUserBySocketId(games as unknown as Record<string, GameBase>, socketId);
  return info ? games[info.gameCode]?.users[info.username] || null : null;
}

function updateUserSocketId(gameCode: string, username: string, newSocketId: string, authContext: AuthContext | null = null): boolean {
  const result = userManager.updateUserSocketId(asBase<GameBase>(games[gameCode]), gameCode, username, newSocketId, authContext);
  if (result) persistGameState(gameCode);
  return result;
}

function updateUsernameMapping(gameCode: string, oldUsername: string, newUsername: string, socketId: string): void {
  userManager.updateUsernameMapping(gameCode, oldUsername, newUsername, socketId);
}

function getGameUsers(gameCode: string): Array<{ username: string; score?: number } & GameState['users'][string]> {
  const game = games[gameCode];
  return userManager.getGameUsers(asBase<GameBase>(game)).map(u => ({
    ...u,
    socketId: u.socketId,
    avatar: u.avatar || { emoji: '', color: '' },
    isHost: u.isHost,
    username: u.username,
    score: game?.playerScores?.[u.username] ?? 0,
  })) as Array<{ username: string; score?: number } & GameState['users'][string]>;
}

function isHost(socketId: string): boolean {
  return userManager.isHost(games as unknown as Record<string, GameBase>, socketId);
}

function updateHostSocketId(gameCode: string, newSocketId: string): void {
  userManager.updateHostSocketId(asBase<GameBase>(games[gameCode]), newSocketId);
  persistGameState(gameCode);
}

const getAuthUserConnection = userManager.getAuthUserConnection;
const setAuthUserConnection = (authUserId: string, info: { gameCode: string; username: string; socketId: string }): void => {
  userManager.setAuthUserConnection(authUserId, { ...info, isHost: false });
};
const removeAuthUserConnection = userManager.removeAuthUserConnection;

function clearSocketMappings(socketId: string): { gameCode: string | null; username: string | null } {
  const result = userManager.clearSocketMappings(socketId);
  return { gameCode: result?.gameCode ?? null, username: result?.username ?? null };
}

const clearSocketMappingsForLeave = userManager.clearSocketMappingsForLeave;

// Host Management Delegation
const getNextEligibleHost = (gameCode: string, exclude?: string | string[]): string | null =>
  hostManager.getNextEligibleHost(asBase<HostGameBase>(games[gameCode]), exclude);

function transferHost(gameCode: string, newHostUsername: string): TransferHostResult {
  const result = hostManager.transferHost(asBase<HostGameBase>(games[gameCode]), newHostUsername);
  // Audit T10 (2026-05-10): use immediate-persist (not debounced 1s) so a
  // crash within the window doesn't leave Redis pointing at the old host.
  // Fire-and-forget — caller flow is sync; persistence error is logged
  // inside doPersistNow without blocking the broadcast.
  if (result.success) {
    persistGameStateNow(gameCode).catch(() => {
      // Already logged inside persistGameStateNow; swallow to avoid
      // unhandled-rejection on the sync caller path.
    });
  }
  return result;
}

// Score Management Delegation
function addPlayerWord(gameCode: string, username: string, word: string, options: AddWordOptions = {}): void {
  scoreManager.addPlayerWord(asBase<ScoreGameBase>(games[gameCode]), username, word, options);
  persistGameState(gameCode);
}

const getFirstFinder = (gameCode: string, word: string, currentUsername: string) =>
  scoreManager.getFirstFinder(asBase<ScoreGameBase>(games[gameCode]), word, currentUsername);

const recordFirstFinder = (gameCode: string, word: string, username: string, avatar?: { avatarImage?: string; customAvatar?: import('@/shared/types/customAvatar').CustomAvatarConfig; emoji?: string; color?: string }): boolean =>
  scoreManager.recordFirstFinder(asBase<ScoreGameBase>(games[gameCode]), word, username, avatar);

const isFirstFinder = (gameCode: string, word: string, username: string): boolean =>
  scoreManager.isFirstFinder(asBase<ScoreGameBase>(games[gameCode]), word, username);

const playerHasWord = (gameCode: string, username: string, word: string): boolean =>
  scoreManager.playerHasWord(asBase<ScoreGameBase>(games[gameCode]), username, word);

function updatePlayerScore(gameCode: string, username: string, score: number, isDelta = false): void {
  scoreManager.updatePlayerScore(asBase<ScoreGameBase>(games[gameCode]), username, score, isDelta);
  persistGameState(gameCode);
}

function addPlayerEventBonus(gameCode: string, username: string, amount: number): void {
  scoreManager.addPlayerEventBonus(asBase<ScoreGameBase>(games[gameCode]), username, amount);
  persistGameState(gameCode);
}

const getLeaderboard = (gameCode: string): LeaderboardPlayer[] =>
  scoreManager.getLeaderboard(asBase<ScoreGameBase>(games[gameCode]));

const getLeaderboardThrottled = (gameCode: string, broadcastFn: (lb: LeaderboardPlayer[]) => void, throttleMs = 500): void =>
  scoreManager.getLeaderboardThrottled(asBase<ScoreGameBase>(games[gameCode]), gameCode, broadcastFn, throttleMs);

// Presence Management Delegation
const updateUserPresence = (gameCode: string, username: string, presenceData: PresenceData | null) =>
  presenceManager.updateUserPresence(asBase<PresenceGameBase>(games[gameCode]), username, presenceData);

const updateUserHeartbeat = (gameCode: string, username: string) =>
  presenceManager.updateUserHeartbeat(asBase<PresenceGameBase>(games[gameCode]), username);

const checkUserConnectionHealth = (gameCode: string, username: string) =>
  presenceManager.checkUserConnectionHealth(asBase<PresenceGameBase>(games[gameCode]), username);

const markUserActivity = (gameCode: string, username: string): void =>
  presenceManager.markUserActivity(asBase<PresenceGameBase>(games[gameCode]), username);

const getPresenceConfig = presenceManager.getPresenceConfig;

const markHostActive = (gameCode: string): void =>
  presenceManager.markHostActive(asBase<PresenceGameBase>(games[gameCode]));

const reactivateHost = (gameCode: string): boolean =>
  presenceManager.reactivateHost(asBase<PresenceGameBase>(games[gameCode]));

// Peer Validation Delegation
const trackAiApprovedWord = (gameCode: string, word: string, submitter: string, score: number, confidence: number): void =>
  peerValidationManager.trackAiApprovedWord(asBase<PeerValidationGameBase>(games[gameCode]), word, submitter, score, confidence);

const trackBotWord = (gameCode: string, word: string, botUsername: string, score: number): void =>
  peerValidationManager.trackBotWord(asBase<PeerValidationGameBase>(games[gameCode]), word, botUsername, score);

const selectWordForPeerValidation = (gameCode: string) =>
  peerValidationManager.selectWordForPeerValidation(asBase<PeerValidationGameBase>(games[gameCode]));

const recordPeerValidationVote = (gameCode: string, username: string, isValid: boolean) =>
  peerValidationManager.recordPeerValidationVote(asBase<PeerValidationGameBase>(games[gameCode]), username, isValid);

const getPeerValidationWord = (gameCode: string) =>
  peerValidationManager.getPeerValidationWord(asBase<PeerValidationGameBase>(games[gameCode]));

const removePeerRejectedWordScore = (gameCode: string, word: string, submitter: string): number =>
  peerValidationManager.removePeerRejectedWordScore(asBase<PeerValidationGameBase>(games[gameCode]), word, submitter);

// Spectator Management Delegation
function addSpectatorToGame(gameCode: string, username: string, socketId: string, options: SpectatorOptions = {}): void {
  spectatorManager.addSpectatorToGame(asBase<SpectatorGameBase>(games[gameCode]), username, socketId, options);
  persistGameState(gameCode);
  markActiveRoomsDirty();
}

function removeSpectatorFromGame(gameCode: string, username: string): void {
  spectatorManager.removeSpectatorFromGame(asBase<SpectatorGameBase>(games[gameCode]), username);
  persistGameState(gameCode);
  markActiveRoomsDirty();
}

const getGameSpectators = (gameCode: string) =>
  spectatorManager.getGameSpectators(asBase<SpectatorGameBase>(games[gameCode]));

function upgradeSpectatorToPlayer(gameCode: string, username: string): boolean {
  const game = games[gameCode];
  if (game && game.gameState !== 'waiting') {
    return false;
  }
  const result = spectatorManager.upgradeSpectatorToPlayer(asBase<SpectatorGameBase>(game), username, MAX_PLAYERS_PER_ROOM);
  if (result) persistGameState(gameCode);
  return result;
}

const isSpectator = (gameCode: string, username: string): boolean =>
  spectatorManager.isSpectator(asBase<SpectatorGameBase>(games[gameCode]), username);

// Ready State Delegation
function markPlayerReadyForNextGame(gameCode: string, username: string) {
  const result = readyStateManager.markPlayerReadyForNextGame(asBase<ReadyStateGameBase>(games[gameCode]), username);
  if (result) persistGameState(gameCode);
  return result;
}

const getPlayersReadyCount = (gameCode: string) =>
  readyStateManager.getPlayersReadyCount(asBase<ReadyStateGameBase>(games[gameCode]));

const isPlayerReadyForNextGame = (gameCode: string, username: string): boolean =>
  readyStateManager.isPlayerReadyForNextGame(asBase<ReadyStateGameBase>(games[gameCode]), username);

function clearPlayersReadyForNextGame(gameCode: string): void {
  readyStateManager.clearPlayersReadyForNextGame(asBase<ReadyStateGameBase>(games[gameCode]));
  persistGameState(gameCode);
}

function unmarkPlayerReady(gameCode: string, username: string): void {
  readyStateManager.removePlayerFromReadyList(asBase<ReadyStateGameBase>(games[gameCode]), username);
}

// Game Queries Delegation
const getAllGames = () => gameQueryManager.getAllGames(games as unknown as Record<string, QueryGameBase>);
const getDetailedGames = () => gameQueryManager.getDetailedGames(games as unknown as Record<string, QueryGameBase>);
function getActiveRooms(): ReturnType<typeof gameQueryManager.getActiveRooms> {
  if (!activeRoomsCacheDirty && activeRoomsCache !== null) {
    return activeRoomsCache;
  }
  activeRoomsCache = gameQueryManager.getActiveRooms(games as unknown as Record<string, QueryGameBase>);
  activeRoomsCacheDirty = false;
  return activeRoomsCache;
}
const getEmptyRooms = (): string[] => gameQueryManager.getEmptyRooms(games as unknown as Record<string, QueryGameBase>);
const isRoomEmpty = (gameCode: string): boolean => gameQueryManager.isRoomEmpty(asBase<QueryGameBase>(games[gameCode]));
const getTournamentIdFromGame = (gameCode: string): string | null => gameQueryManager.getTournamentIdFromGame(asBase<QueryGameBase>(games[gameCode]));

function setTournamentIdForGame(gameCode: string, tournamentId: string | null): boolean {
  const result = gameQueryManager.setTournamentIdForGame(asBase<QueryGameBase>(games[gameCode]), tournamentId);
  if (result) persistGameState(gameCode);
  return result;
}

// Cache invalidation lifecycle
async function initCacheInvalidation(): Promise<void> {
  if (!REDIS_PRIMARY) return;
  await startCacheInvalidationListener((gameCode) => {
    gameCache.delete(gameCode);
    logger.debug('CACHE_INVALIDATION', `Evicted ${gameCode} from local LRU cache`);
  });
}

async function shutdownCacheInvalidation(): Promise<void> {
  await stopCacheInvalidationListener();
}

// Exports
export {
  createGame, getGame, getGameAsync, updateGame, deleteGame, gameExists, getGameCount, getAllGameCodes, forEachGame,
  addUserToGame, removeUserFromGame, removeUserBySocketId, getGameBySocketId, getUsernameBySocketId,
  getSocketIdByUsername, getUserBySocketId, updateUserSocketId, updateUsernameMapping, getGameUsers,
  addSpectatorToGame, removeSpectatorFromGame, getGameSpectators, upgradeSpectatorToPlayer, isSpectator,
  markPlayerReadyForNextGame, getPlayersReadyCount, isPlayerReadyForNextGame, clearPlayersReadyForNextGame, unmarkPlayerReady,
  getAllGames, getDetailedGames, getActiveRooms, getEmptyRooms, isRoomEmpty, cleanupEmptyRooms,
  isHost, updateHostSocketId, getNextEligibleHost, transferHost,
  transitionGameState, canTransitionGameState, getValidGameEvents, resetGameForNewRound,
  addPlayerWord, playerHasWord, updatePlayerScore, addPlayerEventBonus, getLeaderboard, getLeaderboardThrottled,
  getFirstFinder, recordFirstFinder, isFirstFinder,
  trackAiApprovedWord, trackBotWord, selectWordForPeerValidation, recordPeerValidationVote, getPeerValidationWord, removePeerRejectedWordScore,
  cleanupStaleGames, clearAllGames,
  updateUserPresence, updateUserHeartbeat, markUserActivity, getPresenceConfig, checkUserConnectionHealth, markHostActive, reactivateHost,
  getAuthUserConnection, setAuthUserConnection, removeAuthUserConnection, clearSocketMappings, clearSocketMappingsForLeave,
  getTournamentIdFromGame, setTournamentIdForGame,
  persistGameState, persistGameStateNow, restoreGameFromRedis, restoreAllGamesFromRedis, getAllGameCodesFromRedis,
  initCacheInvalidation, shutdownCacheInvalidation
};

// Default export for tests and legacy CommonJS-style imports
export default {
  createGame, getGame, getGameAsync, updateGame, deleteGame, gameExists, getGameCount, getAllGameCodes, forEachGame,
  addUserToGame, removeUserFromGame, removeUserBySocketId, getGameBySocketId, getUsernameBySocketId,
  getSocketIdByUsername, getUserBySocketId, updateUserSocketId, updateUsernameMapping, getGameUsers,
  addSpectatorToGame, removeSpectatorFromGame, getGameSpectators, upgradeSpectatorToPlayer, isSpectator,
  markPlayerReadyForNextGame, getPlayersReadyCount, isPlayerReadyForNextGame, clearPlayersReadyForNextGame, unmarkPlayerReady,
  getAllGames, getDetailedGames, getActiveRooms, getEmptyRooms, isRoomEmpty, cleanupEmptyRooms,
  isHost, updateHostSocketId, getNextEligibleHost, transferHost,
  transitionGameState, canTransitionGameState, getValidGameEvents, resetGameForNewRound,
  addPlayerWord, playerHasWord, updatePlayerScore, addPlayerEventBonus, getLeaderboard, getLeaderboardThrottled,
  getFirstFinder, recordFirstFinder, isFirstFinder,
  trackAiApprovedWord, trackBotWord, selectWordForPeerValidation, recordPeerValidationVote, getPeerValidationWord, removePeerRejectedWordScore,
  cleanupStaleGames, clearAllGames,
  updateUserPresence, updateUserHeartbeat, markUserActivity, getPresenceConfig, checkUserConnectionHealth, markHostActive, reactivateHost,
  getAuthUserConnection, setAuthUserConnection, removeAuthUserConnection, clearSocketMappings, clearSocketMappingsForLeave,
  getTournamentIdFromGame, setTournamentIdForGame,
  persistGameState, persistGameStateNow, restoreGameFromRedis, restoreAllGamesFromRedis, getAllGameCodesFromRedis,
  initCacheInvalidation, shutdownCacheInvalidation
};

// Expose game query helpers on globalThis so integration tests can access
// the same module instance used by handlers (avoids Vitest dual-specifier issues).
// Test-only — production bundles must not leak game-state surface.
if (process.env.NODE_ENV === 'test' || process.env.VITEST) {
  (globalThis as any).__gameStateManager = { gameExists, getGame, clearAllGames };
}
