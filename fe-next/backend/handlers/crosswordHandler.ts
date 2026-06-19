/**
 * Crossword race Handler — parallel-race progress aggregation.
 *
 * Every player solves the SAME broadcast puzzle. Clients report progress (%
 * complete, solved, elapsed, score); the server stores it, rebroadcasts ranked
 * standings, and finalizes when all (human) players have solved (the overall
 * game timer is the backstop for unsolved players). No per-move resolution and
 * no timers here — idle players just sit at 0% and never stall the room.
 */
import type { Server, Socket } from 'socket.io';
import type { GameState } from '../modules/gameState/types.js';
import {
  getGame,
  getGameBySocketId,
  getUsernameBySocketId,
  transitionGameState,
} from '../modules/gameStateManager.js';
import { applyProgress, standings, allSolved } from '../modules/crosswordMpManager.js';
import { broadcastToRoom, getGameRoom } from '../utils/socketHelpers.js';
import { checkRateLimit } from '../utils/rateLimiter.js';
import { validatePayload } from '../utils/socketValidation.js';
import { SubmitCrosswordProgressSchema, type SubmitCrosswordProgressData } from '../../shared/schemas/socketSchemas.js';
import { clearGameTimer } from '../utils/timerManager.js';
import { isSupabaseConfigured } from '../modules/supabaseServer.js';
import { recordGameResultsToSupabase } from '../services/gameLifecycle/gameResults.js';
import logger from '../utils/logger.js';

/** The non-bot players still racing (bots aren't in the roster, but be defensive). */
function activePlayers(game: GameState): string[] {
  const players = game.crosswordMpState?.players ?? [];
  return players.filter((p) => !game.users?.[p]?.isBot);
}

async function finalizeCrosswordGame(io: Server, gameCode: string, game: GameState): Promise<void> {
  const transitionResult = transitionGameState(gameCode, 'END', { immediate: true });
  if (!transitionResult.success) return;
  clearGameTimer(gameCode);
  if (!isSupabaseConfigured()) return;
  try {
    const state = game.crosswordMpState;
    if (!state) return;
    const ranked = standings(state);
    const winner = ranked[0]?.solved ? ranked[0].username : null;
    const scoresArray = ranked.map((r) => ({
      username: r.username,
      totalScore: r.score,
      wordDetails: [],
      achievements: r.username === winner ? [{ key: 'crossword_win', icon: '🏆' }] : [],
    }));
    await recordGameResultsToSupabase(io, gameCode, scoresArray as never, game);
  } catch (err) {
    logger.error('CROSSWORD', `Failed to record crossword results for ${gameCode}: ${(err as Error).message}`);
  }
}

export function handleSubmitCrosswordProgress(io: Server, socket: Socket, data: SubmitCrosswordProgressData): void {
  const gameCode = getGameBySocketId(socket.id);
  const username = getUsernameBySocketId(socket.id);
  if (!gameCode || !username) return;
  const game = getGame(gameCode);
  if (!game || game.gameMode !== 'crossword' || !game.crosswordMpState) return;

  game.crosswordMpState = applyProgress(game.crosswordMpState, username, {
    percent: data.percent,
    solved: data.solved,
    elapsedMs: data.elapsedMs,
    score: data.score,
  });
  // Mirror score onto the game for the standard results pipeline.
  if (!game.playerScores) game.playerScores = {};
  game.playerScores[username] = game.crosswordMpState.progress[username]?.score ?? 0;

  const room = getGameRoom(gameCode);
  broadcastToRoom(io, room, 'crosswordStandings', { standings: standings(game.crosswordMpState) });

  if (allSolved(game.crosswordMpState, activePlayers(game))) {
    broadcastToRoom(io, room, 'crosswordRaceOver', { standings: standings(game.crosswordMpState) });
    void finalizeCrosswordGame(io, gameCode, game).catch((err) => {
      logger.error('CROSSWORD', `finalizeCrosswordGame failed: ${(err as Error).message}`);
    });
  }
}

/** Push the shared puzzle + current standings to a single socket (mount/reconnect). */
export function handleRequestCrosswordMpState(socket: Socket): void {
  const gameCode = getGameBySocketId(socket.id);
  if (!gameCode) return;
  const game = getGame(gameCode);
  if (!game || game.gameMode !== 'crossword' || !game.crosswordMpState) return;
  socket.emit('crosswordMpInit', {
    puzzle: game.crosswordMpState.puzzle,
    players: game.crosswordMpState.players,
    standings: standings(game.crosswordMpState),
    startedAt: game.crosswordMpState.startedAt,
  });
}

export function registerCrosswordHandlers(io: Server, socket: Socket): void {
  socket.on('requestCrosswordMpState', () => {
    try { handleRequestCrosswordMpState(socket); }
    catch (err) { logger.error('CROSSWORD', `Error requestCrosswordMpState: ${(err as Error).message}`); }
  });

  socket.on('submitCrosswordProgress', (data: unknown) => {
    if (!checkRateLimit(socket.id, 5)) return; // progress is throttled client-side; drop floods silently
    const result = validatePayload(SubmitCrosswordProgressSchema, data);
    if (!result.success || !result.data) return;
    try {
      handleSubmitCrosswordProgress(io, socket, result.data);
    } catch (err) {
      logger.error('CROSSWORD', `Error submitCrosswordProgress: ${(err as Error).message}`);
    }
  });
}
