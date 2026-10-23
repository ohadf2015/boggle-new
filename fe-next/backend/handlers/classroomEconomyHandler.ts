/**
 * Socket surface for the classroom economy. The student's own state goes only
 * to that student's socket. Chest reveals go to each student's user room, so
 * one student never receives another's roll.
 */

import type { Server, Socket } from 'socket.io';
import { getAuthUserId } from './classroomSocketAuth.js';
import { checkRateLimit } from '../utils/rateLimiter.js';
import { getRedisClient } from '../redisClient.js';
import { getGameAsync } from '../modules/gameStateManager.js';
import { getClassroomGame } from '../modules/classroomGameManager.js';
import { resolveClassroomRole } from '../modules/supabase/classroomMembership.js';
import { CLASSROOM_ECONOMY_EVENTS } from '@/shared/constants/classroomEconomy';
import {
  applyCorrectWord,
  applyWrongWord,
  buildBoard,
  buyPowerUpFor,
  roundSummaryFor,
  toSnapshot,
  spendHintFor,
} from '../modules/classroomEconomyService.js';
import { loadConfig, saveEconomyConfig, readEconomy } from '../modules/classroomEconomyStore.js';
import { grantRoundChest } from '../modules/classroomEconomyChest.js';
import { roomBossWon } from '../services/classroomBoss/roomBoss.js';
import { readLocker } from '../modules/classroomEconomyLocker.js';
import logger from '../utils/logger.js';

const E = CLASSROOM_ECONOMY_EVENTS;

interface GameRef {
  gameCode: string;
  roundId: string;
}

/** The live MP round's id. Word path and socket path must both call this. */
export function roundIdOf(game: { gameSessionId?: unknown } | null | undefined, gameCode: string): string {
  return String(game?.gameSessionId ?? gameCode);
}

async function roundOf(gameCode: string): Promise<string | null> {
  const game = await getGameAsync(gameCode);
  return game ? roundIdOf(game as { gameSessionId?: unknown }, gameCode) : null;
}

async function isClassroomGame(gameCode: string): Promise<boolean> {
  return (await getClassroomGame(gameCode)) !== null;
}

/** Seated = a verified non-bot user of this round; the class roster misses students who joined via the base `join` door. */
export function isSeatedInRound(game: unknown, userId: string): boolean {
  const users = (game as { users?: Record<string, { authUserId?: string | null; isBot?: boolean } | undefined> } | null)?.users ?? {};
  return Object.values(users).some((u) => !!u && !u.isBot && u.authUserId === userId);
}

async function isPlayer(gameCode: string, userId: string): Promise<boolean> {
  return isSeatedInRound(await getGameAsync(gameCode), userId);
}

/** Word path hook: a socket without a verified identity simply gets no economy. */
export function economyUserIdOf(socket: Socket): string | null {
  try {
    return getAuthUserId(socket);
  } catch {
    return null;
  }
}

/** Called by the word path after an accepted word. Self-only emit. */
export async function economyOnWordAccepted(
  socket: Socket,
  input: GameRef & { userId: string; word: string; fromLesson: boolean }
): Promise<void> {
  try {
    if (!(await isClassroomGame(input.gameCode))) return;
    const snap = await applyCorrectWord({
      gameCode: input.gameCode,
      roundId: input.roundId,
      userId: input.userId,
      wordLength: input.word.length,
      fromLesson: input.fromLesson,
      now: Date.now(),
    });
    if (snap) socket.emit(E.state, snap);
  } catch (err) {
    logger.error('CLASSROOM_ECONOMY', `Word award failed in ${input.gameCode}: ${(err as Error).message}`);
  }
}

/** Called by the word path when a typed word is not a word. Self-only emit. */
export async function economyOnWordRejected(socket: Socket, input: GameRef & { userId: string }): Promise<void> {
  try {
    if (!(await isClassroomGame(input.gameCode))) return;
    const snap = await applyWrongWord({ ...input, now: Date.now() });
    if (snap) socket.emit(E.state, snap);
  } catch (err) {
    logger.error('CLASSROOM_ECONOMY', `Wrong-answer cost failed in ${input.gameCode}: ${(err as Error).message}`);
  }
}

/**
 * The round's chest, asked for by the student's own results screen. Refused
 * until the server has finished that round (its results payload exists for
 * exactly that round id), so a chest can never be rolled mid-round.
 */
export function roundIsOver(cachedResultsPayload: unknown, roundId: string): boolean {
  const id = (cachedResultsPayload as { gameSessionId?: unknown } | null | undefined)?.gameSessionId;
  return id !== undefined && id !== null && String(id) === roundId;
}

/** A silent refusal looks like "nothing to show" on the phone, so every early exit says why. */
function refused(action: string, gameCode: string, reason: string): void {
  logger.warn('CLASSROOM_ECONOMY', `${action} refused in ${gameCode}: ${reason}`);
}

/** Logs the refusal and tells this student's socket, so the phone never waits on silence. */
function refusedTo(
  socket: Socket,
  action: string,
  gameCode: string,
  reason: string,
  event: string,
  payload: unknown
): void {
  refused(action, gameCode, reason);
  socket.emit(event, payload);
}

export function registerClassroomEconomyHandlers(_io: Server, socket: Socket): void {
  socket.on(E.requestState, async (data: { gameCode?: unknown }) => {
    const userId = getAuthUserId(socket);
    const gameCode = typeof data?.gameCode === 'string' ? data.gameCode : null;
    if (!gameCode) return;
    if (!userId) return refusedTo(socket, 'requestState', gameCode, 'not_signed_in', E.error, { reason: 'not_signed_in' });
    if (!checkRateLimit(socket.id)) return refused('requestState', gameCode, 'rate_limited');
    const roundId = await roundOf(gameCode);
    if (!roundId) return refusedTo(socket, 'requestState', gameCode, 'no_game', E.error, { reason: 'no_game' });
    if (!(await isPlayer(gameCode, userId))) return refusedTo(socket, 'requestState', gameCode, 'not_seated', E.error, { reason: 'not_seated' });
    const state = await readEconomy(gameCode, userId, roundId);
    const config = await loadConfig(gameCode);
    if (!state) { socket.emit(E.error, { reason: 'unavailable' }); return; }
    socket.emit(E.state, toSnapshot(state, config, null, Date.now()));
    socket.emit(E.board, await buildBoard(gameCode, userId));
  });

  socket.on(E.requestReward, async (data: { gameCode?: unknown; roundId?: unknown }) => {
    const userId = getAuthUserId(socket);
    const gameCode = typeof data?.gameCode === 'string' ? data.gameCode : null;
    const roundId = typeof data?.roundId === 'string' ? data.roundId : null;
    if (!gameCode || !roundId) return;
    if (!userId) return refusedTo(socket, 'requestReward', gameCode, 'not_signed_in', E.reward, null);
    if (!checkRateLimit(socket.id)) return refusedTo(socket, 'requestReward', gameCode, 'rate_limited', E.reward, null);
    const game = await getGameAsync(gameCode);
    if (!game) return refusedTo(socket, 'requestReward', gameCode, 'no_game', E.reward, null);
    if (game.gameState !== 'finished') return refusedTo(socket, 'requestReward', gameCode, 'round_not_over', E.reward, null);
    if (roundId !== roundIdOf(game, gameCode)) return refusedTo(socket, 'requestReward', gameCode, 'round_mismatch', E.reward, null);
    if (!roundIsOver(game.cachedResultsPayload, roundId)) return refusedTo(socket, 'requestReward', gameCode, 'no_results', E.reward, null);
    if (!(await isPlayer(gameCode, userId))) return refusedTo(socket, 'requestReward', gameCode, 'not_seated', E.reward, null);
    const classroom = await getClassroomGame(gameCode);
    if (!classroom) return refusedTo(socket, 'requestReward', gameCode, 'no_classroom', E.reward, null);
    const membership = await resolveClassroomRole(userId, classroom.classroomId);
    if (membership.role !== 'student') {
      const reason = membership.status === 'unavailable' ? 'membership_unavailable' : 'not_a_student';
      return refusedTo(socket, 'requestReward', gameCode, reason, E.reward, null);
    }
    const summary = await roundSummaryFor(gameCode, roundId, userId);
    const reveal = await grantRoundChest({ gameCode, roundId, userId, summary, bossWin: roomBossWon(gameCode, roundId) });
    socket.emit(E.reward, reveal);
  });

  socket.on(E.requestLocker, async () => {
    const userId = getAuthUserId(socket);
    if (!userId || !checkRateLimit(socket.id)) return;
    socket.emit(E.locker, await readLocker(userId));
  });

  socket.on(E.buyPowerUp, async (data: { gameCode?: unknown; powerUpId?: unknown }) => {
    const userId = getAuthUserId(socket);
    const gameCode = typeof data?.gameCode === 'string' ? data.gameCode : null;
    if (!userId || !gameCode || typeof data?.powerUpId !== 'string') return;
    if (!checkRateLimit(socket.id)) return refused('buyPowerUp', gameCode, 'rate_limited');
    const roundId = await roundOf(gameCode);
    if (!roundId) return refused('buyPowerUp', gameCode, 'no_game');
    if (!(await isPlayer(gameCode, userId))) return refused('buyPowerUp', gameCode, 'not_seated');
    const live = (await getGameAsync(gameCode))?.gameState !== 'finished';
    if (!live && data.powerUpId === 'doubleCash') { socket.emit(E.error, { reason: 'between_rounds' }); return; }
    const res = await buyPowerUpFor({ gameCode, roundId, userId, powerUpId: data.powerUpId, now: Date.now() });
    if (res.ok) socket.emit(E.state, res.snapshot);
    else socket.emit(E.error, { reason: res.reason });
  });

  socket.on(E.useHint, async (data: { gameCode?: unknown }) => {
    const userId = getAuthUserId(socket);
    const gameCode = typeof data?.gameCode === 'string' ? data.gameCode : null;
    if (!userId || !gameCode || !checkRateLimit(socket.id)) return;
    const roundId = await roundOf(gameCode);
    if (!roundId || !(await isPlayer(gameCode, userId))) return;
    const res = await spendHintFor({ gameCode, roundId, userId, now: Date.now() });
    if (!res.ok) { socket.emit(E.error, { reason: res.reason }); return; }
    const game = await getGameAsync(gameCode);
    const words = Array.from((game as { lessonVocabulary?: Iterable<string> } | null)?.lessonVocabulary ?? []).filter((w) => w.length > 0);
    if (words.length === 0) { socket.emit(E.error, { reason: 'no_lesson_words' }); return; }
    const pick = words[Math.floor(Math.random() * words.length)];
    socket.emit(E.hint, { letter: pick[0], length: pick.length });
    socket.emit(E.state, res.snapshot);
  });

  socket.on(E.setConfig, async (data: { gameCode?: unknown; economy?: { wrongAnswerCost?: unknown; powerUps?: unknown } }) => {
    const userId = getAuthUserId(socket);
    const gameCode = typeof data?.gameCode === 'string' ? data.gameCode : null;
    if (!userId || !gameCode || !checkRateLimit(socket.id)) return;
    const game = await getClassroomGame(gameCode);
    if (!game || game.teacherId !== userId) { socket.emit(E.error, { reason: 'not_teacher' }); return; }
    if (!getRedisClient()) { socket.emit(E.error, { reason: 'unavailable' }); return; }
    const next = {
      wrongAnswerCost: data.economy?.wrongAnswerCost === true,
      powerUps: data.economy?.powerUps !== false,
    };
    const saved = await saveEconomyConfig(gameCode, next);
    socket.emit(saved ? E.configSaved : E.error, saved ? next : { reason: 'unavailable' });
  });
}

export default registerClassroomEconomyHandlers;
