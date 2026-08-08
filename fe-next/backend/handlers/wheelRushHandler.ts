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
} from '../modules/wheelRushManager.js';
import { broadcastToRoom, volatileBroadcastToRoom, getGameRoom } from '../utils/socketHelpers.js';
import { checkRateLimit } from '../utils/rateLimiter.js';
import { validatePayload } from '../utils/socketValidation.js';
import { SubmitWheelWordSchema, type SubmitWheelWordData } from '../../shared/schemas/socketSchemas.js';
import logger from '../utils/logger.js';
import type { Language } from '@/shared/types/game';
import { normalizeHebrewLetter } from '@/shared/utils/wordNormalization';

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
  if (!gameCode || !username) { socket.emit('error', { code: 'NOT_IN_GAME' }); return; }

  const game = getGame(gameCode);
  if (!game) { socket.emit('error', { code: 'GAME_NOT_FOUND' }); return; }
  if (game.gameState !== 'in-progress') { socket.emit('error', { code: 'GAME_NOT_IN_PROGRESS' }); return; }
  if (game.gameMode !== 'wheel-rush') { socket.emit('error', { code: 'NOT_WHEEL_RUSH' }); return; }

  const state = game.wheelRushState;
  if (!state) {
    logger.warn('WHEEL_RUSH', `submitWheelWord from ${username} in ${gameCode} — wheelRushState is null (mode=${game.gameMode}, state=${game.gameState}, users=${Object.keys(game.users).length})`);
    socket.emit('error', { code: 'WHEEL_STATE_NOT_INITIALIZED' });
    return;
  }
  // Defensive: ensure the submitting user exists in foundWords (init may have missed a late-join/bot).
  if (!state.foundWords[username]) {
    logger.warn('WHEEL_RUSH', `submitWheelWord from ${username} in ${gameCode} — foundWords entry missing, initializing inline`);
    state.foundWords[username] = [];
  }

  const rawWord = (data.word || '').toUpperCase().trim();
  if (!rawWord) { socket.emit('error', { code: 'WORD_REQUIRED' }); return; }

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

  const outcome = applyWheelWord(state, username, word, Date.now());

  updatePlayerScore(gameCode, username, outcome.score, true);
  addPlayerWord(gameCode, username, word, {
    score: outcome.score,
    validated: true,
    autoValidated: true,
  });
  // `kind: 'locked'` here means "locked into your own word list" — the client's
  // accepted-word rendering keys off it. Parallel discovery: the word is NOT
  // exclusive; it stays claimable by everyone else at base score. Repeats of a
  // word this player already claimed still land here, just at a lower score.
  socket.emit('wheelWordResult', {
    word, accepted: true, kind: 'locked',
    score: outcome.score,
    firstFinder: outcome.firstFinder,
    firstFinderBonus: outcome.firstFinderBonus,
    repeat: outcome.repeat,
  });
  // Opponent-activity ping (no locking side effects on other clients). Lets the
  // room surface "X found WORD" / leaderboard refresh without gating the word.
  broadcastToRoom(io, getGameRoom(gameCode), 'wheelWordFound', {
    word, by: username, firstFinder: outcome.firstFinder,
  });
  broadcastWheelLeaderboard(io, gameCode);
  logger.info('WHEEL_RUSH', `${username} found "${word}" in ${gameCode} (+${outcome.score}${outcome.firstFinder ? ' first-find' : outcome.repeat ? ' repeat' : ''})`);
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
    firstFinders: state.firstFinders ?? {},
    // `closed` retained (empty) for client-snapshot back-compat — parallel
    // discovery never closes words, so nothing is ever unavailable.
    closed: [],
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
      socket.emit('rateLimited', { code: 'RATE_LIMITED' });
      return;
    }
    const validation = validatePayload(SubmitWheelWordSchema, data);
    if (!validation.success || !validation.data) {
      socket.emit('error', { code: 'INVALID_WORD' });
      return;
    }
    try {
      handleSubmitWheelWord(io, socket, validation.data);
    } catch (err) {
      logger.error('WHEEL_RUSH', `Error submitWheelWord: ${(err as Error).message}`);
      socket.emit('error', { code: 'WORD_PROCESSING_ERROR' });
    }
  });
}
