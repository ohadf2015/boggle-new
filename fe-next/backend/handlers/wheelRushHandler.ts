/**
 * Wheel Rush Handler
 * Handles wheel-word submissions for Wheel Rush multiplayer mode.
 */

import type { Server, Socket } from 'socket.io';
import {
  getGame,
  getGameBySocketId,
  getUsernameBySocketId,
  updatePlayerScore,
  addPlayerWord,
} from '../modules/gameStateManager.js';
import {
  getLeaderboard,
  getLeaderboardThrottled,
  type LeaderboardPlayer,
  type ScoreGameBase,
} from '../modules/scoreManager.js';
import {
  validateWheelSubmission,
  applyWheelWord,
  reapExpiredLocks,
} from '../modules/wheelRushManager.js';
import { broadcastToRoom, volatileBroadcastToRoom, getGameRoom } from '../utils/socketHelpers.js';
import { checkRateLimit } from '../utils/rateLimiter.js';
import { validatePayload } from '../utils/socketValidation.js';
import { SubmitWheelWordSchema, type SubmitWheelWordData } from '../../shared/schemas/socketSchemas.js';
import logger from '../utils/logger.js';
import timerManager from '../utils/timerManager.js';
import { gameCleanupEmitter } from '../events/gameCleanup.js';
import type { Language } from '@/shared/types/game';
import { normalizeHebrewLetter } from '@/shared/utils/wordNormalization';

gameCleanupEmitter.onGameEnd(({ gameCode }) => {
  timerManager.clearTimersWithPrefix(`wheelRushReap:${gameCode}:`);
});
gameCleanupEmitter.onGameReset(({ gameCode }) => {
  timerManager.clearTimersWithPrefix(`wheelRushReap:${gameCode}:`);
});

function broadcastWheelLeaderboard(io: Server, gameCode: string): void {
  const game = getGame(gameCode);
  if (!game) return;
  const lbThrottleMs = parseInt(process.env.LEADERBOARD_THROTTLE_MS || '500');
  getLeaderboardThrottled(game as unknown as ScoreGameBase, gameCode, (leaderboard: LeaderboardPlayer[]) => {
    volatileBroadcastToRoom(io, getGameRoom(gameCode), 'updateLeaderboard', { leaderboard });
  }, lbThrottleMs);
}

export function handleSubmitWheelWord(io: Server, socket: Socket, data: SubmitWheelWordData): void {
  const gameCode = getGameBySocketId(socket.id);
  const username = getUsernameBySocketId(socket.id);
  if (!gameCode || !username) { socket.emit('error', { message: 'Not in a game' }); return; }

  const game = getGame(gameCode);
  if (!game) { socket.emit('error', { message: 'Game not found' }); return; }
  if (game.gameState !== 'in-progress') { socket.emit('error', { message: 'Game is not in progress' }); return; }
  if (game.gameMode !== 'wheel-rush') { socket.emit('error', { message: 'Not a wheel-rush game' }); return; }

  const state = game.wheelRushState;
  if (!state) { socket.emit('error', { message: 'Wheel state not initialized' }); return; }

  const rawWord = (data.word || '').toUpperCase().trim();
  if (!rawWord) { socket.emit('error', { message: 'Word required' }); return; }

  const lang = (game.language || 'en') as Language;
  // Hebrew sofit collapse — wheel stores only regular forms; normalize once at the boundary
  // so validation, application, dedup, and broadcast all see the same letter set.
  const word = lang === 'he'
    ? [...rawWord].map((c) => normalizeHebrewLetter(c)).join('')
    : rawWord;
  const validation = validateWheelSubmission(state, word, lang);
  if (!validation.valid) {
    socket.emit('wheelWordResult', { word, accepted: false, error: validation.error });
    return;
  }

  const now = Date.now();
  const outcome = applyWheelWord(state, username, word, now);

  if (outcome.kind === 'locked') {
    updatePlayerScore(gameCode, username, outcome.score, true);
    addPlayerWord(gameCode, username, word, {
      score: outcome.score,
      validated: true,
      autoValidated: true,
    });
    socket.emit('wheelWordResult', {
      word, accepted: true, kind: 'locked',
      score: outcome.score, lockUntil: outcome.lockUntil,
    });
    broadcastToRoom(io, getGameRoom(gameCode), 'wheelWordLocked', {
      word, by: username, lockUntil: outcome.lockUntil,
    });
    broadcastWheelLeaderboard(io, gameCode);
    // Schedule reap sweep for this specific lock expiry
    timerManager.setTimeout(`wheelRushReap:${gameCode}:${word}`, () => {
      const g = getGame(gameCode);
      if (!g?.wheelRushState) return;
      const closed = reapExpiredLocks(g.wheelRushState);
      for (const c of closed) {
        broadcastToRoom(io, getGameRoom(gameCode), 'wheelWordClosed', { word: c.word, finder: c.finder });
      }
    }, Math.max(0, outcome.lockUntil - now) + 50);
    logger.info('WHEEL_RUSH', `${username} locked "${word}" in ${gameCode} (+${outcome.score})`);
    return;
  }

  if (outcome.kind === 'stolen') {
    const total = outcome.score + outcome.stealBonus;
    updatePlayerScore(gameCode, username, total, true);
    addPlayerWord(gameCode, username, word, {
      score: total,
      validated: true,
      autoValidated: true,
    });
    socket.emit('wheelWordResult', {
      word, accepted: true, kind: 'stolen',
      score: total, stolenFrom: outcome.from,
    });
    broadcastToRoom(io, getGameRoom(gameCode), 'wheelWordStolen', {
      word, by: username, from: outcome.from,
    });
    broadcastWheelLeaderboard(io, gameCode);
    logger.info('WHEEL_RUSH', `${username} stole "${word}" from ${outcome.from} in ${gameCode} (+${total})`);
    return;
  }

  if (outcome.kind === 'rejected') {
    socket.emit('wheelWordResult', { word, accepted: false, error: outcome.reason });
    return;
  }
}

/**
 * Resume snapshot for clients that joined late or reconnected mid-game.
 * Includes locks/foundWords/closed so UI can re-hydrate without waiting
 * for the next event tick.
 */
export function handleRequestWheelRushState(socket: Socket): void {
  const gameCode = getGameBySocketId(socket.id);
  if (!gameCode) return;
  const game = getGame(gameCode);
  if (!game || game.gameMode !== 'wheel-rush' || !game.wheelRushState) return;
  const username = getUsernameBySocketId(socket.id);
  const state = game.wheelRushState;
  socket.emit('wheelRushInit', {
    puzzle: state.puzzle,
    startedAt: state.startedAt,
    foundWords: state.foundWords ?? {},
    locks: state.locks ?? {},
    closed: state.closed ?? [],
    myWords: username ? (state.foundWords?.[username] ?? []) : [],
  });
  // Also push a fresh leaderboard directly to this socket. Opponent scores
  // otherwise only refresh on the next score broadcast, so a reconnecting or
  // late-joining player would stare at a stale (or empty) rival chip until
  // someone next scores. This is a single-socket emit, not a room broadcast.
  const leaderboard = getLeaderboard(game as unknown as ScoreGameBase, gameCode);
  socket.emit('updateLeaderboard', { leaderboard });
}

export function registerWheelRushHandlers(io: Server, socket: Socket): void {
  socket.on('requestWheelRushState', () => handleRequestWheelRushState(socket));

  socket.on('submitWheelWord', (data: unknown) => {
    // Weight 5: ~10 submits per 10s window (endgame sprints can spike to 3-4/sec)
    if (!checkRateLimit(socket.id, 5)) {
      socket.emit('rateLimited', { message: 'Too many submissions, slow down' });
      return;
    }
    const validation = validatePayload(SubmitWheelWordSchema, data);
    if (!validation.success || !validation.data) {
      socket.emit('error', { message: `Invalid word: ${validation.success ? 'missing data' : validation.error}` });
      return;
    }
    try {
      handleSubmitWheelWord(io, socket, validation.data);
    } catch (err) {
      logger.error('WHEEL_RUSH', `Error submitWheelWord: ${(err as Error).message}`);
      socket.emit('error', { message: 'Error processing wheel word' });
    }
  });
}
