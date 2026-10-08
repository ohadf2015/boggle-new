/**
 * Crossword race Handler — parallel-race progress aggregation.
 *
 * Every player solves the SAME broadcast puzzle. Clients report progress (%
 * complete, solved, elapsed, score); the server stores it, rebroadcasts ranked
 * standings, and ends the round through the standard endGame once every racer
 * has solved (the overall game timer is the backstop for unsolved players). No per-move resolution and
 * no timers here — idle players just sit at 0% and never stall the room.
 */
import type { Server, Socket } from 'socket.io';
import type { GameState } from '../modules/gameState/types.js';
import { getGame, getGameBySocketId, getUsernameBySocketId } from '../modules/gameStateManager.js';
import { applyProgress, standings, allSolved } from '../modules/crosswordMpManager.js';
import { broadcastToRoom, getGameRoom } from '../utils/socketHelpers.js';
import { checkRateLimit } from '../utils/rateLimiter.js';
import { validatePayload } from '../utils/socketValidation.js';
import { SubmitCrosswordProgressSchema, type SubmitCrosswordProgressData } from '../../shared/schemas/socketSchemas.js';
import { endGame } from '../services/gameLifecycle/gameEnd.js';
import logger from '../utils/logger.js';

/** The non-bot players still racing (bots aren't in the roster, but be defensive). */
function activePlayers(game: GameState): string[] {
  const players = game.crosswordMpState?.players ?? [];
  return players.filter((p) => !game.users?.[p]?.isBot);
}

export function handleSubmitCrosswordProgress(io: Server, socket: Socket, data: SubmitCrosswordProgressData): void {
  const gameCode = getGameBySocketId(socket.id);
  const username = getUsernameBySocketId(socket.id);
  if (!gameCode || !username) return;
  const game = getGame(gameCode);
  if (!game || game.gameMode !== 'crossword' || !game.crosswordMpState || game.gameState !== 'in-progress') return;

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
    void endGame(io, gameCode).catch((err) => {
      logger.error('CROSSWORD', `endGame after race over failed for ${gameCode}: ${(err as Error).message}`);
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
