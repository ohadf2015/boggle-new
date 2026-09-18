/**
 * Treasure Chest Handler for Vocab Quiz
 *
 * Handles openChest event: student picks a chest after a correct answer,
 * resolver determines outcome and modifies standings. Server-authoritative,
 * seeded per (gameCode, questionIndex, username).
 *
 * Separate file because vocabQuizHandler.ts is already large; follows the
 * pattern of classroomGameModeHandler.ts (one event, one concern).
 */

import type { Server, Socket } from 'socket.io';
import { z } from 'zod';

import {
  getGame,
  getGameBySocketId,
  getUsernameBySocketId,
} from '../modules/gameStateManager.js';
import { getQuizSession } from '../modules/vocabQuizStore.js';
import { resolveChestResult } from '../services/treasureChestResolver.js';
import { VOCAB_QUIZ_EVENTS } from '@/shared/types/vocabQuiz';
import { broadcastToRoom, getGameRoom } from '../utils/socketHelpers.js';
import { checkRateLimit } from '../utils/rateLimiter.js';
import logger from '../utils/logger.js';

const openChestSchema = z.object({
  index: z.number().int().min(0).max(200),
});

/**
 * The quiz this socket is in, or null.
 */
function quizForSocket(socket: Socket): { gameCode: string; username: string } | null {
  const gameCode = getGameBySocketId(socket.id);
  if (!gameCode) return null;
  const username = getUsernameBySocketId(socket.id);
  if (!username) return null;
  const session = getQuizSession(gameCode);
  return session ? { gameCode, username } : null;
}

export function registerTreasureChestHandlers(io: Server, socket: Socket): void {
  socket.on(VOCAB_QUIZ_EVENTS.openChest, (data: unknown) => {
    if (!checkRateLimit(socket.id)) return;

    const ctx = quizForSocket(socket);
    if (!ctx) return;

    const parsed = openChestSchema.safeParse(data);
    if (!parsed.success) return;

    const session = getQuizSession(ctx.gameCode);
    if (!session || !session.treasureChestsEnabled) return;

    const { index } = parsed.data;

    // Chest is only valid for the current question if in reveal phase
    if (index !== session.index || session.phase !== 'reveal') return;

    const player = session.players.get(ctx.username);
    if (!player) return;

    // Only allow chest pick if player answered correctly and hasn't already picked
    const chestKey = `${index}:${ctx.username}`;
    if (session.chestResults.has(chestKey)) {
      // Already revealed for this question, send the cached result
      const cached = session.chestResults.get(chestKey);
      socket.emit(VOCAB_QUIZ_EVENTS.treasureChestResult, cached);
      return;
    }

    // Look up the answer for this question to find base points
    const playerAnswer = session.answers.get(ctx.username);
    if (!playerAnswer || !playerAnswer.correct) {
      // Should never reach here, but guard against it
      return;
    }

    // Resolve the chest outcome (modifies player scores in-place)
    const chestResult = resolveChestResult({
      gameCode: ctx.gameCode,
      questionIndex: index,
      username: ctx.username,
      players: session.players,
      currentScore: player.score - playerAnswer.points, // Score before this answer
      baseCorrectedPoints: playerAnswer.points,
    });

    // Cache the result
    session.chestResults.set(chestKey, chestResult);

    // Emit to the player
    socket.emit(VOCAB_QUIZ_EVENTS.treasureChestResult, chestResult);

    // Broadcast updated standings to the room (everyone sees the chest outcomes)
    broadcastToRoom(io, getGameRoom(ctx.gameCode), VOCAB_QUIZ_EVENTS.treasureChestResult, chestResult);

    logger.debug(
      'TREASURE_CHEST',
      `Player ${ctx.username} opened chest for Q${index} in ${ctx.gameCode}: ${chestResult.outcome} (+${chestResult.amount})`
    );
  });
}

export default registerTreasureChestHandlers;
