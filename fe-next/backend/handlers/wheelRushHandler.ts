/**
 * Wheel Rush Handler
 * Handles wheel-word submissions for Wheel Rush multiplayer mode.
 */

import { z } from 'zod';
import type { Server, Socket } from 'socket.io';
import {
  getGame,
  getGameBySocketId,
  getUsernameBySocketId,
  updatePlayerScore,
} from '../modules/gameStateManager.js';
import {
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
import logger from '../utils/logger.js';
import timerManager from '../utils/timerManager.js';
import { gameCleanupEmitter } from '../events/gameCleanup.js';
import type { Language } from '@/shared/types/game';

gameCleanupEmitter.onGameEnd(({ gameCode }) => {
  timerManager.clearTimersWithPrefix(`wheelRushReap:${gameCode}:`);
});
gameCleanupEmitter.onGameReset(({ gameCode }) => {
  timerManager.clearTimersWithPrefix(`wheelRushReap:${gameCode}:`);
});

const submitWheelWordSchema = z.object({
  word: z.string().min(1).max(20).transform(s => s.toUpperCase().trim()),
});

interface SubmitWheelWordPayload { word: string; }

function broadcastWheelLeaderboard(io: Server, gameCode: string): void {
  const game = getGame(gameCode);
  if (!game) return;
  const lbThrottleMs = parseInt(process.env.LEADERBOARD_THROTTLE_MS || '500');
  getLeaderboardThrottled(game as unknown as ScoreGameBase, gameCode, (leaderboard: LeaderboardPlayer[]) => {
    volatileBroadcastToRoom(io, getGameRoom(gameCode), 'updateLeaderboard', { leaderboard });
  }, lbThrottleMs);
}

export function handleSubmitWheelWord(io: Server, socket: Socket, data: SubmitWheelWordPayload): void {
  const gameCode = getGameBySocketId(socket.id);
  const username = getUsernameBySocketId(socket.id);
  if (!gameCode || !username) { socket.emit('error', { message: 'Not in a game' }); return; }

  const game = getGame(gameCode);
  if (!game) { socket.emit('error', { message: 'Game not found' }); return; }
  if (game.gameState !== 'in-progress') { socket.emit('error', { message: 'Game is not in progress' }); return; }
  if (game.gameMode !== 'wheel-rush') { socket.emit('error', { message: 'Not a wheel-rush game' }); return; }

  const state = game.wheelRushState;
  if (!state) { socket.emit('error', { message: 'Wheel state not initialized' }); return; }

  const word = (data.word || '').toUpperCase().trim();
  if (!word) { socket.emit('error', { message: 'Word required' }); return; }

  const lang = (game.language || 'en') as Language;
  const validation = validateWheelSubmission(state, word, lang);
  if (!validation.valid) {
    socket.emit('wheelWordResult', { word, accepted: false, error: validation.error });
    return;
  }

  const now = Date.now();
  const outcome = applyWheelWord(state, username, word, now);

  if (outcome.kind === 'locked') {
    updatePlayerScore(gameCode, username, outcome.score, true);
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

export function registerWheelRushHandlers(io: Server, socket: Socket): void {
  socket.on('requestWheelRushState', () => {
    const gameCode = getGameBySocketId(socket.id);
    if (!gameCode) return;
    const game = getGame(gameCode);
    if (!game || game.gameMode !== 'wheel-rush' || !game.wheelRushState) return;
    socket.emit('wheelRushInit', {
      puzzle: game.wheelRushState.puzzle,
      startedAt: game.wheelRushState.startedAt,
    });
  });

  socket.on('submitWheelWord', (data: unknown) => {
    if (!checkRateLimit(socket.id, 20)) {
      socket.emit('rateLimited', { message: 'Too many submissions, slow down' });
      return;
    }
    const validation = validatePayload(submitWheelWordSchema, data);
    if (!validation.success) {
      socket.emit('error', { message: `Invalid word: ${validation.error}` });
      return;
    }
    try {
      handleSubmitWheelWord(io, socket, validation.data as SubmitWheelWordPayload);
    } catch (err) {
      logger.error('WHEEL_RUSH', `Error submitWheelWord: ${(err as Error).message}`);
      socket.emit('error', { message: 'Error processing wheel word' });
    }
  });
}
