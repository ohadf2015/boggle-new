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

import type { GameBase, AddUserOptions, AuthContext } from './userManager';
import type { ScoreGameBase, AddWordOptions, LeaderboardPlayer } from './scoreManager';
import type { PresenceGameBase, PresenceData } from './presenceManager';
import type { PeerValidationGameBase } from './peerValidationManager';
import type { SpectatorGameBase, SpectatorOptions } from './spectatorManager';
import type { ReadyStateGameBase } from './readyStateManager';
import type { QueryGameBase } from './gameQueryManager';
import type { HostGameBase, TransferHostResult } from './hostManager';

import { clearEngagementTimeouts } from '../services/gameLifecycle/gameResults';

const logger = require('../utils/logger');
const { canTransition, transition, getValidEvents } = require('../utils/gameStateMachine');

// Re-exports for backwards compatibility
export type { GameSummary, DetailedGame, DetailedGamePlayer } from './gameQueryManager';
export type { SpectatorOptions, SpectatorInfo } from './spectatorManager';
export type { ReadyCountResult } from './readyStateManager';
export type { TransferHostResult } from './hostManager';

// Game storage
const games: Record<string, GameState> = {};

// Persistence helpers (bound to games object)
const persistGameState = (gameCode: string): void => doPersist(gameCode, games);
const persistGameStateNow = (gameCode: string): Promise<void> => doPersistNow(gameCode, games);
const restoreGameFromRedis = (gameCode: string): Promise<GameState | null> => doRestore(gameCode, games);

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
    playerWords: {},
    playerAchievements: {},
    playerCombos: {},
    gameState: 'waiting',
    letterGrid: null,
    timerSeconds: 180,
    tournamentId: null,
    reconnectionTimeout: null,
    isRanked: data.isRanked || false,
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
  persistGameState(gameCode);
  return games[gameCode];
}

function getGame(gameCode: string): GameState | null {
  return games[gameCode] || null;
}

function updateGame(gameCode: string, updates: Partial<GameState>, immediate = false): void {
  if (!games[gameCode]) return;
  Object.assign(games[gameCode], updates, { lastActivity: Date.now() });
  if (immediate) persistGameStateNow(gameCode);
  else persistGameState(gameCode);
}

function deleteGame(gameCode: string): void {
  const game = games[gameCode];
  if (!game) return;

  if ((game as any).hostReconnectionTimeout) clearTimeout((game as any).hostReconnectionTimeout);
  if (game.validationTimeout) clearTimeout(game.validationTimeout);
  clearPersistTimer(gameCode);
  // Clear any pending delayed engagement timeouts to prevent
  // orphaned Supabase queries from disconnected sockets
  clearEngagementTimeouts(gameCode);

  userManager.cleanupUserMappings(asBase<GameBase>(game), gameCode);
  scoreManager.clearLeaderboardThrottle(gameCode);
  deleteGameFromRedis(gameCode);
  delete games[gameCode];
}

const gameExists = (gameCode: string): boolean => !!games[gameCode];
const getGameCount = (): number => Object.keys(games).length;
const getAllGameCodes = (): string[] => Object.keys(games);

function forEachGame(callback: (gameCode: string, game: GameState) => void): void {
  for (const [gameCode, game] of Object.entries(games)) {
    callback(gameCode, game);
  }
}

// State Transitions
function transitionGameState(gameCode: string, eventType: string, options: { immediate?: boolean } = {}): StateTransitionResult {
  const game = games[gameCode];
  if (!game) return { success: false, previousState: null, newState: null, error: `Game ${gameCode} not found` };

  const currentState = game.gameState;
  const result = transition(currentState, eventType);

  if (!result.success) {
    logger.warn('GAME_STATE', `Invalid transition for ${gameCode}: ${currentState} -> ${eventType}`);
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
    logger.info('GAME_STATE', `Reset called in unexpected state: ${currentState}`);
    game.gameState = 'waiting';
    transitionSuccess = true;
  }

  scoreManager.resetScoresForNewRound(asBase<ScoreGameBase>(game));
  peerValidationManager.resetPeerValidation(asBase<PeerValidationGameBase>(game));
  readyStateManager.clearPlayersReadyForNextGame(asBase<ReadyStateGameBase>(game));

  game.earthquakeTriggered = false;
  game.letterGrid = null;
  game.lastActivity = Date.now();
  game.gameEndedAt = null;
  (game as any).wordHuntState = null;
  (game as any).blastModeState = null;
  game.gameSessionId = (game.gameSessionId || 0) + 1;

  persistGameState(gameCode);
  return transitionSuccess;
}

// Cleanup
function cleanupEmptyRooms(): number {
  const emptyRooms = gameQueryManager.getEmptyRooms(games as unknown as Record<string, QueryGameBase>);
  for (const code of emptyRooms) {
    console.log(`[CLEANUP] Removing empty room: ${code}`);
    deleteGame(code);
  }
  return emptyRooms.length;
}

function cleanupStaleGames(maxAge = 30 * 60 * 1000): number {
  const staleCodes = gameQueryManager.getStaleGameCodes(games as unknown as Record<string, QueryGameBase>, maxAge);
  for (const code of staleCodes) {
    console.log(`[CLEANUP] Removing stale game: ${code}`);
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
const getNextEligibleHost = (gameCode: string, excludeUsername?: string): string | null =>
  hostManager.getNextEligibleHost(asBase<HostGameBase>(games[gameCode]), excludeUsername);

function transferHost(gameCode: string, newHostUsername: string): TransferHostResult {
  const result = hostManager.transferHost(asBase<HostGameBase>(games[gameCode]), newHostUsername);
  if (result.success) persistGameState(gameCode);
  return result;
}

// Score Management Delegation
function addPlayerWord(gameCode: string, username: string, word: string, options: AddWordOptions = {}): void {
  scoreManager.addPlayerWord(asBase<ScoreGameBase>(games[gameCode]), username, word, options);
  persistGameState(gameCode);
}

const getFirstFinder = (gameCode: string, word: string, currentUsername: string) =>
  scoreManager.getFirstFinder(asBase<ScoreGameBase>(games[gameCode]), word, currentUsername);

const recordFirstFinder = (gameCode: string, word: string, username: string, avatar?: { avatarImage?: string; emoji?: string; color?: string }): boolean =>
  scoreManager.recordFirstFinder(asBase<ScoreGameBase>(games[gameCode]), word, username, avatar);

const isFirstFinder = (gameCode: string, word: string, username: string): boolean =>
  scoreManager.isFirstFinder(asBase<ScoreGameBase>(games[gameCode]), word, username);

const playerHasWord = (gameCode: string, username: string, word: string): boolean =>
  scoreManager.playerHasWord(asBase<ScoreGameBase>(games[gameCode]), username, word);

function updatePlayerScore(gameCode: string, username: string, score: number, isDelta = false): void {
  scoreManager.updatePlayerScore(asBase<ScoreGameBase>(games[gameCode]), username, score, isDelta);
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
}

function removeSpectatorFromGame(gameCode: string, username: string): void {
  spectatorManager.removeSpectatorFromGame(asBase<SpectatorGameBase>(games[gameCode]), username);
  persistGameState(gameCode);
}

const getGameSpectators = (gameCode: string) =>
  spectatorManager.getGameSpectators(asBase<SpectatorGameBase>(games[gameCode]));

function upgradeSpectatorToPlayer(gameCode: string, username: string): boolean {
  const game = games[gameCode];
  if (game && game.gameState !== 'waiting') {
    return false;
  }
  const { MAX_PLAYERS_PER_ROOM } = require('../utils/consts');
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

// Game Queries Delegation
const getAllGames = () => gameQueryManager.getAllGames(games as unknown as Record<string, QueryGameBase>);
const getDetailedGames = () => gameQueryManager.getDetailedGames(games as unknown as Record<string, QueryGameBase>);
const getActiveRooms = () => gameQueryManager.getActiveRooms(games as unknown as Record<string, QueryGameBase>);
const getEmptyRooms = (): string[] => gameQueryManager.getEmptyRooms(games as unknown as Record<string, QueryGameBase>);
const isRoomEmpty = (gameCode: string): boolean => gameQueryManager.isRoomEmpty(asBase<QueryGameBase>(games[gameCode]));
const getTournamentIdFromGame = (gameCode: string): string | null => gameQueryManager.getTournamentIdFromGame(asBase<QueryGameBase>(games[gameCode]));

function setTournamentIdForGame(gameCode: string, tournamentId: string | null): boolean {
  const result = gameQueryManager.setTournamentIdForGame(asBase<QueryGameBase>(games[gameCode]), tournamentId);
  if (result) persistGameState(gameCode);
  return result;
}

// Exports
export {
  createGame, getGame, updateGame, deleteGame, gameExists, getGameCount, getAllGameCodes, forEachGame,
  addUserToGame, removeUserFromGame, removeUserBySocketId, getGameBySocketId, getUsernameBySocketId,
  getSocketIdByUsername, getUserBySocketId, updateUserSocketId, updateUsernameMapping, getGameUsers,
  addSpectatorToGame, removeSpectatorFromGame, getGameSpectators, upgradeSpectatorToPlayer, isSpectator,
  markPlayerReadyForNextGame, getPlayersReadyCount, isPlayerReadyForNextGame, clearPlayersReadyForNextGame,
  getAllGames, getDetailedGames, getActiveRooms, getEmptyRooms, isRoomEmpty, cleanupEmptyRooms,
  isHost, updateHostSocketId, getNextEligibleHost, transferHost,
  transitionGameState, canTransitionGameState, getValidGameEvents, resetGameForNewRound,
  addPlayerWord, playerHasWord, updatePlayerScore, getLeaderboard, getLeaderboardThrottled,
  getFirstFinder, recordFirstFinder, isFirstFinder,
  trackAiApprovedWord, trackBotWord, selectWordForPeerValidation, recordPeerValidationVote, getPeerValidationWord, removePeerRejectedWordScore,
  cleanupStaleGames, clearAllGames,
  updateUserPresence, updateUserHeartbeat, markUserActivity, getPresenceConfig, checkUserConnectionHealth, markHostActive, reactivateHost,
  getAuthUserConnection, setAuthUserConnection, removeAuthUserConnection, clearSocketMappings, clearSocketMappingsForLeave,
  getTournamentIdFromGame, setTournamentIdForGame,
  persistGameState, persistGameStateNow, restoreGameFromRedis, getAllGameCodesFromRedis
};

// CommonJS exports (re-use ESM exports to avoid duplication)
const cjsExports = {
  createGame, getGame, updateGame, deleteGame, gameExists, getGameCount, getAllGameCodes, forEachGame,
  addUserToGame, removeUserFromGame, removeUserBySocketId, getGameBySocketId, getUsernameBySocketId,
  getSocketIdByUsername, getUserBySocketId, updateUserSocketId, updateUsernameMapping, getGameUsers,
  addSpectatorToGame, removeSpectatorFromGame, getGameSpectators, upgradeSpectatorToPlayer, isSpectator,
  markPlayerReadyForNextGame, getPlayersReadyCount, isPlayerReadyForNextGame, clearPlayersReadyForNextGame,
  getAllGames, getDetailedGames, getActiveRooms, getEmptyRooms, isRoomEmpty, cleanupEmptyRooms,
  isHost, updateHostSocketId, getNextEligibleHost, transferHost,
  transitionGameState, canTransitionGameState, getValidGameEvents, resetGameForNewRound,
  addPlayerWord, playerHasWord, updatePlayerScore, getLeaderboard, getLeaderboardThrottled,
  getFirstFinder, recordFirstFinder, isFirstFinder,
  trackAiApprovedWord, trackBotWord, selectWordForPeerValidation, recordPeerValidationVote, getPeerValidationWord, removePeerRejectedWordScore,
  cleanupStaleGames, clearAllGames,
  updateUserPresence, updateUserHeartbeat, markUserActivity, getPresenceConfig, checkUserConnectionHealth, markHostActive, reactivateHost,
  getAuthUserConnection, setAuthUserConnection, removeAuthUserConnection, clearSocketMappings, clearSocketMappingsForLeave,
  getTournamentIdFromGame, setTournamentIdForGame,
  persistGameState, persistGameStateNow, restoreGameFromRedis, getAllGameCodesFromRedis
};

Object.defineProperty(cjsExports, 'games', {
  get() {
    if (process.env.NODE_ENV !== 'test') throw new Error('[gameStateManager] Direct access to games object is not allowed.');
    return games;
  }
});

module.exports = cjsExports;
