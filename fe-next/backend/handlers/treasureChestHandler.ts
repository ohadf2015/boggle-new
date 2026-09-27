/**
 * Treasure Chest Handler for Vocab Quiz
 *
 * `openChest`: a student who answered the CURRENT question correctly taps one
 * of three chests. The resolver decides the outcome (seeded per game,
 * question, student and chest) and moves points in the live session.
 *
 * Accepted in the question phase as well as the reveal: the picker appears the
 * moment the answer result lands, which is usually while the clock still runs.
 * Gating on the 3s reveal alone dropped almost every pick without a word.
 *
 * Three emits, three audiences:
 * - actor (private)   `treasureChestResult` — outcome + their new total
 * - room              `treasureChestEvent`  — ticker + standings, no private total
 * - steal/swap victim `chestHit`            — who hit them and their new total
 */

import type { Server, Socket } from 'socket.io';
import { z } from 'zod';

import { getGame, getGameBySocketId, getUsernameBySocketId } from '../modules/gameStateManager.js';
import { getQuizSession } from '../modules/vocabQuizStore.js';
import { markChestOpened, markChestSeen, resolveChestResult } from '../services/treasureChestResolver.js';
import { VOCAB_QUIZ_EVENTS, type TreasureChestHit, type TreasureChestState } from '@/shared/types/vocabQuiz';
import { broadcastToRoom, getGameRoom } from '../utils/socketHelpers.js';
import { checkRateLimit } from '../utils/rateLimiter.js';
import logger from '../utils/logger.js';

const chestSeenSchema = z.object({ index: z.number().int().min(0).max(200) });

const openChestSchema = z.object({
  index: z.number().int().min(0).max(200),
  chest: z.number().int().min(0).max(2),
});

function socketIdFor(gameCode: string, username: string): string | null {
  const game = getGame(gameCode) as { users?: Record<string, { socketId?: string }> } | undefined;
  return game?.users?.[username]?.socketId ?? null;
}

function publicPayload(result: TreasureChestState): TreasureChestState {
  const { myScore: _private, ...rest } = result;
  return rest;
}

export function registerTreasureChestHandlers(io: Server, socket: Socket): void {
  // The phone dismissed its chest reveal: the reveal hold may end early.
  socket.on(VOCAB_QUIZ_EVENTS.chestSeen, (data: unknown) => {
    if (!checkRateLimit(socket.id)) return;
    const gameCode = getGameBySocketId(socket.id);
    const username = getUsernameBySocketId(socket.id);
    const parsed = chestSeenSchema.safeParse(data);
    if (!gameCode || !username || !parsed.success) return;
    const session = getQuizSession(gameCode);
    if (session) markChestSeen(session, parsed.data.index, username);
  });

  socket.on(VOCAB_QUIZ_EVENTS.openChest, (data: unknown) => {
    if (!checkRateLimit(socket.id)) return;

    const gameCode = getGameBySocketId(socket.id);
    const username = getUsernameBySocketId(socket.id);
    if (!gameCode || !username) return;

    const session = getQuizSession(gameCode);
    if (!session || !session.treasureChestsEnabled) return;

    const parsed = openChestSchema.safeParse(data);
    if (!parsed.success) return;
    const { index, chest } = parsed.data;

    if (index !== session.index || (session.phase !== 'question' && session.phase !== 'reveal')) {
      logger.debug('TREASURE_CHEST', `Dropped stale pick ${username} Q${index} (now Q${session.index} ${session.phase}) in ${gameCode}`);
      return;
    }

    const chestKey = `${index}:${username}`;
    const cached = session.chestResults.get(chestKey);
    if (cached) {
      // A double tap or a reconnect replay — never open a second chest.
      socket.emit(VOCAB_QUIZ_EVENTS.treasureChestResult, cached);
      return;
    }

    const playerAnswer = session.answers.get(username);
    if (!session.players.has(username) || !playerAnswer?.correct) return;

    const result = resolveChestResult({
      gameCode,
      questionIndex: index,
      chest,
      username,
      players: session.players,
      answerPoints: playerAnswer.points,
    });
    session.chestResults.set(chestKey, result);
    markChestOpened(session, username, Date.now());

    socket.emit(VOCAB_QUIZ_EVENTS.treasureChestResult, result);
    broadcastToRoom(io, getGameRoom(gameCode), VOCAB_QUIZ_EVENTS.treasureChestEvent, publicPayload(result));

    if ((result.outcome === 'steal' || result.outcome === 'swap') && result.targetUsername) {
      const victim = session.players.get(result.targetUsername);
      const victimSocket = socketIdFor(gameCode, result.targetUsername);
      if (victim && victimSocket) {
        const hit: TreasureChestHit = {
          actor: username,
          outcome: result.outcome,
          amount: Math.max(0, result.amount),
          score: victim.score,
        };
        io.to(victimSocket).emit(VOCAB_QUIZ_EVENTS.chestHit, hit);
      }
    }

    logger.debug('TREASURE_CHEST', `${username} opened chest ${chest} Q${index} in ${gameCode}: ${result.outcome} (${result.amount})`);
  });
}

export default registerTreasureChestHandlers;
