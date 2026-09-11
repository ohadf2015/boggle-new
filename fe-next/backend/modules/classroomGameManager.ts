/**
 * Classroom Game Manager
 *
 * Manages classroom-scoped multiplayer games using Redis storage.
 * These games are linked to specific classrooms and notify students automatically.
 */

import { getRedisClient } from '../redisClient';
import type { PracticeFocusSetting } from '@/lib/education/vocabFocus';
import logger from '../utils/logger';
import { isClassroomSessionEnded } from './classroomGameSessionState';

/** Exported so in-place settings edits (classroomGameSettings) re-use ONE TTL. */
export const CLASSROOM_GAME_TTL = 14400; // 4 hours

function getRedis() {
  const client = getRedisClient();
  if (!client) {
    throw new Error('Redis client not available');
  }
  return client;
}

export interface ClassroomGamePlayer {
  userId: string;
  username: string;
  socketId: string;
  joinedAt?: string;
}

export interface ClassroomGameSettings {
  timerMinutes?: number;
  boardSize?: 'small' | 'medium' | 'large';
  allowLateJoin?: boolean;
  /**
   * `vocab-quiz` is a live 4-choice question round, not a board game. It is
   * deliberately absent from the canonical `GameMode` union in
   * shared/types/game.ts: a quiz has no letter grid, no submitted words and no
   * duplicate/rarity scoring, so widening that union would drag it into random
   * mode rolls, quick-play matchmaking and every board-engine mode branch.
   */
  gameMode?: 'classic' | 'blast' | 'word-hunt' | 'wheel-rush' | 'vocab-quiz';
  /**
   * Word Hunt only: the lesson word the teacher pinned as the hunted target.
   * Empty/absent means "let the game pick". Re-validated against the lesson at
   * game start — never trusted from the socket payload alone.
   */
  targetWord?: string;
  /**
   * Vocab Quiz only: which skill to drill. `any` mixes what the lesson supports.
   * Typed off the shared builder's own union so a newly added focus cannot
   * silently fall out of the classroom settings.
   */
  vocabQuizFocus?: PracticeFocusSetting;
  /** Vocab Quiz only: questions in the round (capped by what the lesson can build). */
  vocabQuizQuestionCount?: number;
  /** Vocab Quiz only: seconds on each question's clock. */
  vocabQuizSeconds?: number;
  /** Free-for-all or team battle (weekly teams / juegos en equipo). */
  playStyle?: 'ffa' | 'teams';
  /** Team count when playStyle === 'teams' (server clamps to 2-4). */
  teamCount?: number;
  /** SPED-friendly accommodations chosen in the setup wizard. */
  accessibility?: {
    largeText?: boolean;
    audioCues?: boolean;
    participationPoints?: boolean;
  };
}

export interface ClassroomGame {
  gameCode: string;
  classroomId: string;
  teacherId: string;
  teacherName: string;
  lessonIds: string[];
  lessonNames: string[];
  vocabularyWords: string[];
  /**
   * The subset of `vocabularyWords` the generated board actually carries,
   * written once at game start. Embedding is best-effort — placement is capped
   * at roughly one word per three cells and skips anything longer than the
   * board — so this is usually SMALLER than `vocabularyWords`. Absent until the
   * board exists; a support student's word bank falls back to the full lesson
   * list until then.
   */
  placedVocabulary?: string[];
  settings: ClassroomGameSettings;
  players: ClassroomGamePlayer[];
  createdAt: string;
  startedAt?: string;
  /**
   * The ROUND clock. `'finished'` is written at the end of every round, not at
   * the end of the lesson, so it never means "this code is dead" — see
   * `classroomGameSession.ts`.
   */
  status: 'waiting' | 'playing' | 'finished' | 'ended';
  /** The SESSION clock: set once when the teacher ends the game. Terminal. */
  endedAt?: string;
}

export interface CreateClassroomGameData {
  gameCode: string;
  classroomId: string;
  teacherId: string;
  teacherName: string;
  lessonIds: string[];
  lessonNames: string[];
  vocabularyWords: string[];
  settings: ClassroomGameSettings;
}

/**
 * Create a new classroom game
 */
export async function createClassroomGame(data: CreateClassroomGameData): Promise<void> {
  const game: ClassroomGame = {
    ...data,
    players: [],
    createdAt: new Date().toISOString(),
    status: 'waiting',
  };

  try {
    const redis = getRedis();

    // Store game data with TTL
    await redis.setex(
      `classroom_game:${data.gameCode}`,
      CLASSROOM_GAME_TTL,
      JSON.stringify(game)
    );

    // Add game code to classroom's active games set
    await redis.sadd(`classroom_games:${data.classroomId}`, data.gameCode);

    logger.info('CLASSROOM_GAME', `Created classroom game ${data.gameCode} for classroom ${data.classroomId}`);
  } catch (error) {
    logger.error('CLASSROOM_GAME', `Failed to create classroom game: ${error}`);
    throw error;
  }
}

/**
 * Get a classroom game by game code
 */
export async function getClassroomGame(gameCode: string): Promise<ClassroomGame | null> {
  try {
    const redis = getRedis();
    const data = await redis.get(`classroom_game:${gameCode}`);
    if (!data) return null;

    return JSON.parse(data) as ClassroomGame;
  } catch (error) {
    logger.error('CLASSROOM_GAME', `Failed to get classroom game ${gameCode}: ${error}`);
    return null;
  }
}

/**
 * Get classroom metadata by game code (classroomId, lessonIds, teacherName)
 */
export async function getClassroomGameByCode(gameCode: string): Promise<{ classroomId: string; lessonIds: string[]; teacherName: string } | null> {
  const game = await getClassroomGame(gameCode);
  if (!game) return null;

  return {
    classroomId: game.classroomId,
    lessonIds: game.lessonIds,
    teacherName: game.teacherName,
  };
}

/**
 * Get all active classroom games for a classroom
 */
export async function getActiveClassroomGames(classroomId: string): Promise<ClassroomGame[]> {
  try {
    const redis = getRedis();
    const gameCodes = await redis.smembers(`classroom_games:${classroomId}`);
    if (!gameCodes || gameCodes.length === 0) return [];

    const games: ClassroomGame[] = [];
    for (const gameCode of gameCodes) {
      const game = await getClassroomGame(gameCode);
      if (!game) {
        // Game expired, remove from set
        await redis.srem(`classroom_games:${classroomId}`, gameCode);
        continue;
      }
      if (isClassroomSessionEnded(game)) {
        // "Active" has to mean JOINABLE. An ended game kept its Redis key for
        // the rest of the 4h TTL and stayed in this set, so the student banner —
        // which shows games[0], and a Redis set has no order — routinely
        // advertised a game that was already over, under whichever lesson name
        // that older game carried. Tapping JOIN walked the student into a dead
        // room and out to the generic multiplayer hub with no error at all.
        // Prune it here, the same way an expired key is already pruned, or every
        // 15-second poll re-filters it for four hours.
        // ENDED, not `'finished'`: a finished ROUND is still a live game whose
        // teacher has not pressed "next round" yet, and pruning it there hid a
        // running lesson from its own class.
        await redis.srem(`classroom_games:${classroomId}`, gameCode);
        continue;
      }
      games.push(game);
    }

    return games;
  } catch (error) {
    logger.error('CLASSROOM_GAME', `Failed to get active classroom games: ${error}`);
    return [];
  }
}

/**
 * Delete a classroom game
 */
export async function deleteClassroomGame(gameCode: string): Promise<void> {
  try {
    const redis = getRedis();
    const game = await getClassroomGame(gameCode);
    if (!game) return;

    await redis.del(`classroom_game:${gameCode}`);
    await redis.srem(`classroom_games:${game.classroomId}`, gameCode);

    logger.info('CLASSROOM_GAME', `Deleted classroom game ${gameCode}`);
  } catch (error) {
    logger.error('CLASSROOM_GAME', `Failed to delete classroom game: ${error}`);
  }
}

/**
 * Add a player to a classroom game
 */
export async function addPlayerToClassroomGame(
  gameCode: string,
  player: ClassroomGamePlayer
): Promise<void> {
  try {
    const redis = getRedis();
    const game = await getClassroomGame(gameCode);
    if (!game) {
      throw new Error(`Game ${gameCode} not found`);
    }

    // Check if player already exists (by userId)
    const existingPlayerIndex = game.players.findIndex(p => p.userId === player.userId);

    if (existingPlayerIndex >= 0) {
      // Update existing player's socket ID
      game.players[existingPlayerIndex] = {
        ...player,
        joinedAt: game.players[existingPlayerIndex].joinedAt,
      };
    } else {
      // Add new player
      game.players.push({
        ...player,
        joinedAt: new Date().toISOString(),
      });
    }

    // Save updated game
    await redis.setex(
      `classroom_game:${gameCode}`,
      CLASSROOM_GAME_TTL,
      JSON.stringify(game)
    );

    logger.info('CLASSROOM_GAME', `Added player ${player.username} to game ${gameCode}`);
  } catch (error) {
    logger.error('CLASSROOM_GAME', `Failed to add player to game: ${error}`);
    throw error;
  }
}

/**
 * Remove a player from a classroom game
 */
export async function removePlayerFromClassroomGame(
  gameCode: string,
  userId: string
): Promise<void> {
  try {
    const redis = getRedis();
    const game = await getClassroomGame(gameCode);
    if (!game) return;

    game.players = game.players.filter(p => p.userId !== userId);

    await redis.setex(
      `classroom_game:${gameCode}`,
      CLASSROOM_GAME_TTL,
      JSON.stringify(game)
    );

    logger.info('CLASSROOM_GAME', `Removed player ${userId} from game ${gameCode}`);
  } catch (error) {
    logger.error('CLASSROOM_GAME', `Failed to remove player from game: ${error}`);
  }
}

/**
 * Update classroom game status
 */
export async function updateClassroomGameStatus(
  gameCode: string,
  status: 'waiting' | 'playing' | 'finished' | 'ended'
): Promise<void> {
  try {
    const redis = getRedis();
    const game = await getClassroomGame(gameCode);
    if (!game) return;

    game.status = status;
    if (status === 'playing' && !game.startedAt) {
      game.startedAt = new Date().toISOString();
    }
    // `'ended'` is the one terminal status, and it is the ONLY writer of the
    // session marker every join gate reads. Stamping it here rather than in a
    // second "end the game" function keeps one writer for one outcome — the
    // teacher's socket event and the room teardown reach the same line.
    if (status === 'ended' && !game.endedAt) {
      game.endedAt = new Date().toISOString();
    }

    await redis.setex(
      `classroom_game:${gameCode}`,
      CLASSROOM_GAME_TTL,
      JSON.stringify(game)
    );
    // Out of the classroom's index in the same breath, or the student hub's
    // banner keeps advertising a game nobody can join.
    if (status === 'ended') {
      await redis.srem(`classroom_games:${game.classroomId}`, gameCode);
    }

    logger.info('CLASSROOM_GAME', `Updated game ${gameCode} status to ${status}`);
  } catch (error) {
    logger.error('CLASSROOM_GAME', `Failed to update game status: ${error}`);
  }
}

/**
 * Mark this code live again because a round is starting in its room.
 *
 * `status: 'finished'` is written at the end of EVERY round — `gameScores.ts`
 * for a board round, `vocabQuizRound.ts` for a quiz — not at the end of the
 * lesson, and until now nothing ever wrote it back. `startClassroomGame` cannot:
 * it refuses any status but `'waiting'`, and no client emits it. The teacher's
 * "Rematch" is `onReturnToRoom` — the same room, the same code, a new round.
 *
 * That mattered the moment the code stopped resolving for a finished game
 * (`lib/education/classroomGameLookup.ts`, and the SREM in
 * `getActiveClassroomGames` below): round one ending killed the projector code
 * for the rest of the lesson, so a student who dropped wifi during round two and
 * re-scanned the QR was told their code was not recognised while the class was
 * playing it. Kahoot's bar is that a PIN is dead when the game is over, not
 * between two rounds of it.
 *
 * The SADD is half the fix, not a flourish: the finish pruned the code out of
 * `classroom_games:<classroomId>`, and without putting it back the student hub's
 * banner would keep saying there is no live game — a dead end traded for an
 * invisible one.
 *
 * Best-effort by construction. Called on every game start, including the many
 * that are not classroom games at all, so it must be cheap when there is nothing
 * to do (one Redis read, no write) and must never throw: a round has to start
 * even when Redis is unreachable.
 */
export async function reopenClassroomGameForRound(
  gameCode: string,
  /**
   * The record when the caller already read it this tick (the vocab-quiz start
   * does). Passing it makes this the zero-read variant of `beginClassroomRound`
   * below for callers that must not await the write.
   */
  preloaded?: ClassroomGame | null
): Promise<void> {
  try {
    const game = preloaded ?? (await getClassroomGame(gameCode));
    if (!game) return;
    await markRoundLive(game);
  } catch (error) {
    logger.error('CLASSROOM_GAME', `Failed to reopen classroom game ${gameCode}: ${error}`);
  }
}

/**
 * The same reopen, folded into the read the caller was doing anyway.
 *
 * Game start needs the classroom record (lesson words, settings) AND needs the
 * code marked live. As two calls that was two Redis reads of one key on every
 * game start in the app — most of them not classroom games at all — plus a
 * window in which an un-awaited reopen could land after, and clobber, the
 * placed-vocabulary write that happens later in the same start. One awaited
 * call, one read, no race.
 *
 * Returns the record for the caller, or null when the code is an ordinary
 * multiplayer room (the common case). Never throws and never blocks a round: if
 * Redis refuses the write the code may stay shut, but the game still starts and
 * the failure is logged rather than swallowed.
 */
export async function beginClassroomRound(gameCode: string): Promise<ClassroomGame | null> {
  try {
    const game = await getClassroomGame(gameCode);
    if (!game) return null;
    try {
      await markRoundLive(game);
    } catch (error) {
      logger.error('CLASSROOM_GAME', `Failed to reopen classroom game ${gameCode}: ${error}`);
    }
    return game;
  } catch (error) {
    logger.error('CLASSROOM_GAME', `Classroom lookup failed at round start for ${gameCode}: ${error}`);
    return null;
  }
}

/**
 * Write `status: 'playing'` back and re-index the code. No-op when the record
 * already says playing — every round start passes through here, and a no-op
 * must not cost a write and a fresh TTL on a record nobody changed.
 */
async function markRoundLive(game: ClassroomGame): Promise<void> {
  if (game.status === 'playing') return;
  // Terminal means terminal. This runs on EVERY `startGame` in the app, so a
  // stray start on a code whose game the teacher ended must not resurrect it —
  // that would reopen the original dead-room bug from the other end.
  if (isClassroomSessionEnded(game)) return;

  const redis = getRedis();
  game.status = 'playing';
  if (!game.startedAt) game.startedAt = new Date().toISOString();

  await redis.setex(
    `classroom_game:${game.gameCode}`,
    CLASSROOM_GAME_TTL,
    JSON.stringify(game)
  );
  await redis.sadd(`classroom_games:${game.classroomId}`, game.gameCode);

  logger.info('CLASSROOM_GAME', `Reopened classroom game ${game.gameCode} for a new round`);
}

/**
 * Record which lesson words the generated board actually carries.
 *
 * Called once from game start, after the grid exists. A support student's word
 * bank reads this instead of the full lesson list, so it stops listing words
 * that are not on the board. Best-effort: a failure here degrades the bank back
 * to the whole lesson, which is the old behaviour, so it never blocks the game.
 */
export async function setClassroomGamePlacedVocabulary(
  gameCode: string,
  placedVocabulary: string[]
): Promise<void> {
  try {
    const redis = getRedis();
    const game = await getClassroomGame(gameCode);
    if (!game) return;

    game.placedVocabulary = placedVocabulary;

    await redis.setex(
      `classroom_game:${gameCode}`,
      CLASSROOM_GAME_TTL,
      JSON.stringify(game)
    );

    logger.info(
      'CLASSROOM_GAME',
      `Game ${gameCode} board carries ${placedVocabulary.length}/${game.vocabularyWords.length} lesson words`
    );
  } catch (error) {
    logger.error('CLASSROOM_GAME', `Failed to record placed vocabulary: ${error}`);
  }
}
