/**
 * Classroom Game Socket.IO Handler
 *
 * Handles Socket.IO events for classroom-scoped multiplayer games.
 * Teachers create games, students receive notifications and join.
 */

import { z } from 'zod';
import type { Server, Socket } from 'socket.io';
import {
  createClassroomGame,
  getClassroomGame,
  getActiveClassroomGames,
  addPlayerToClassroomGame,
  removePlayerFromClassroomGame,
  updateClassroomGameStatus,
  type CreateClassroomGameData,
} from '../modules/classroomGameManager.js';
import { getSupabase } from '../modules/supabase/client.js';
import { getRedisClient } from '../redisClient.js';
import { checkRateLimit } from '../utils/rateLimiter.js';
import { validatePayload, gameCodeSchema, usernameSchema } from '../utils/socketValidation.js';
import logger from '../utils/logger.js';

// ==========================================
// Zod Schemas for classroom events
// ==========================================

const classroomIdSchema = z.string()
  .uuid('classroomId must be a valid UUID');

const createClassroomGameSchema = z.object({
  classroomId: classroomIdSchema,
  teacherId: z.string().uuid('teacherId must be a valid UUID'),
  teacherName: usernameSchema,
  gameCode: gameCodeSchema,
  lessonIds: z.array(z.string().uuid()).max(20).optional(),
  lessonNames: z.array(z.string().max(200)).max(20).optional(),
  vocabularyWords: z.array(z.string().max(100)).max(500).optional(),
  settings: z.object({
    timerMinutes: z.number().int().min(1).max(30).optional(),
    boardSize: z.enum(['small', 'medium', 'large']).optional(),
    allowLateJoin: z.boolean().optional(),
    gameMode: z.enum(['classic', 'wordHunt', 'blast']).optional(),
  }).optional(),
});

const startClassroomGameSchema = z.object({
  gameCode: gameCodeSchema,
});

const endClassroomGameSchema = z.object({
  gameCode: gameCodeSchema,
  playerScores: z.array(z.object({
    userId: z.string().uuid(),
    score: z.number().min(0),
    wordsFound: z.array(z.string()).optional(),
  })).optional(),
});

const getActiveGamesSchema = z.object({
  classroomId: classroomIdSchema,
});

const joinClassroomGameSchema = z.object({
  gameCode: gameCodeSchema,
  userId: z.string().uuid('userId must be a valid UUID'),
  username: usernameSchema,
});

const leaveClassroomGameSchema = z.object({
  gameCode: gameCodeSchema,
  userId: z.string().uuid('userId must be a valid UUID'),
});

/**
 * Extract authenticated user ID from socket handshake.
 * Returns null if not authenticated.
 */
function getAuthUserId(socket: Socket): string | null {
  // Prefer server-verified user ID (set by auth middleware)
  const verified = (socket.data as Record<string, unknown>)?.verifiedUserId as string | undefined;
  if (verified) return verified;
  // Fallback for backwards compatibility — log warning
  const handshakeAuth = (socket.handshake.auth?.authUserId as string) || null;
  if (handshakeAuth) {
    logger.warn('AUTH', `Using unverified authUserId from handshake for socket ${socket.id}`);
  }
  return handshakeAuth;
}

/**
 * Register classroom game socket event handlers
 */
export function registerClassroomGameHandlers(io: Server, socket: Socket): void {
  /**
   * Create a new classroom game
   * Broadcasts notification to all students in the classroom
   */
  socket.on('createClassroomGame', async (data: unknown) => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('rateLimited');
      return;
    }

    // Validate payload
    const validation = createClassroomGameSchema.safeParse(data);
    if (!validation.success) {
      socket.emit('classroomGameError', { error: `Invalid payload: ${validation.error.issues[0]?.message}` });
      return;
    }
    // Type assertion needed because gameCodeSchema/usernameSchema use compiled || fallback pattern
    const payload = validation.data as {
      classroomId: string; teacherId: string; teacherName: string; gameCode: string;
      lessonIds?: string[]; lessonNames?: string[]; vocabularyWords?: string[];
      settings?: { timerMinutes?: number; boardSize?: 'small' | 'medium' | 'large'; allowLateJoin?: boolean; gameMode?: 'classic' | 'wordHunt' | 'blast' };
    };

    // Auth check: teacherId MUST match authenticated user (mandatory, not optional)
    const authUserId = getAuthUserId(socket);
    if (!authUserId) {
      socket.emit('classroomGameError', { error: 'Authentication required to create classroom games' });
      return;
    }
    if (authUserId !== payload.teacherId) {
      socket.emit('classroomGameError', { error: 'Teacher ID does not match authenticated user' });
      return;
    }

    try {
      // Build game data with settings (including gameMode, default to 'classic')
      const gameData: CreateClassroomGameData = {
        gameCode: payload.gameCode,
        classroomId: payload.classroomId,
        teacherId: payload.teacherId,
        teacherName: payload.teacherName,
        lessonIds: payload.lessonIds || [],
        lessonNames: payload.lessonNames || [],
        vocabularyWords: payload.vocabularyWords || [],
        settings: {
          timerMinutes: payload.settings?.timerMinutes,
          boardSize: payload.settings?.boardSize,
          allowLateJoin: payload.settings?.allowLateJoin,
          gameMode: payload.settings?.gameMode || 'classic',
        },
      };

      // Create the game in Redis
      await createClassroomGame(gameData);

      // Join classroom room for notifications
      socket.join(`classroom:${payload.classroomId}`);

      // Broadcast to classroom that a game has been created
      io.to(`classroom:${payload.classroomId}`).emit('classroomGameCreated', {
        gameCode: payload.gameCode,
        classroomId: payload.classroomId,
        teacherName: payload.teacherName,
        lessonNames: payload.lessonNames,
      });

      // Confirm creation to teacher
      socket.emit('classroomGameCreated', {
        success: true,
        gameCode: payload.gameCode,
      });

      logger.info(
        'CLASSROOM_GAME',
        `Teacher ${payload.teacherId} created game ${payload.gameCode} for classroom ${payload.classroomId}`
      );
    } catch (error) {
      logger.error('CLASSROOM_GAME', `Failed to create classroom game: ${error}`);
      socket.emit('classroomGameError', {
        error: 'Failed to create classroom game',
      });
    }
  });

  /**
   * Get active classroom games for a classroom
   */
  socket.on('getActiveClassroomGames', async (data: unknown) => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('rateLimited');
      return;
    }

    // Validate payload
    const gamesValidation = validatePayload(getActiveGamesSchema, data);
    if (!gamesValidation.success) {
      socket.emit('classroomGameError', { error: `Invalid payload: ${gamesValidation.error}` });
      return;
    }
    const gamesPayload = gamesValidation.data as z.infer<typeof getActiveGamesSchema>;

    try {
      const games = await getActiveClassroomGames(gamesPayload.classroomId);

      // Join classroom room to receive future notifications
      socket.join(`classroom:${gamesPayload.classroomId}`);

      socket.emit('activeClassroomGames', { games });
    } catch (error) {
      logger.error('CLASSROOM_GAME', `Failed to get active games: ${error}`);
      socket.emit('classroomGameError', {
        error: 'Failed to get active games',
      });
    }
  });

  /**
   * Join a classroom game
   */
  socket.on('joinClassroomGame', async (data: unknown) => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('rateLimited');
      return;
    }

    // Validate payload
    const joinValidation = validatePayload(joinClassroomGameSchema, data);
    if (!joinValidation.success) {
      socket.emit('classroomGameError', { error: `Invalid payload: ${joinValidation.error}` });
      return;
    }
    const joinPayload = joinValidation.data as { gameCode: string; userId: string; username: string };

    // Auth check: userId must match authenticated user if present
    const joinAuthUserId = getAuthUserId(socket);
    if (joinAuthUserId && joinAuthUserId !== joinPayload.userId) {
      socket.emit('classroomGameError', { error: 'User ID does not match authenticated user' });
      return;
    }

    try {
      await addPlayerToClassroomGame(joinPayload.gameCode, {
        userId: joinPayload.userId,
        username: joinPayload.username,
        socketId: socket.id,
      });

      // Get updated game state
      const game = await getClassroomGame(joinPayload.gameCode);

      // Notify all players in the game
      if (game) {
        io.to(`classroom:${game.classroomId}`).emit('classroomGamePlayerJoined', {
          gameCode: joinPayload.gameCode,
          username: joinPayload.username,
          playerCount: game.players.length,
        });
      }

      socket.emit('joinedClassroomGame', {
        success: true,
        gameCode: joinPayload.gameCode,
      });

      logger.info('CLASSROOM_GAME', `Player ${joinPayload.username} joined game ${joinPayload.gameCode}`);
    } catch (error) {
      logger.error('CLASSROOM_GAME', `Failed to join game: ${error}`);
      socket.emit('classroomGameError', {
        error: 'Failed to join game',
      });
    }
  });

  /**
   * Leave a classroom game
   */
  socket.on('leaveClassroomGame', async (data: unknown) => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('rateLimited');
      return;
    }

    // Validate payload
    const leaveValidation = validatePayload(leaveClassroomGameSchema, data);
    if (!leaveValidation.success) {
      socket.emit('classroomGameError', { error: `Invalid payload: ${leaveValidation.error}` });
      return;
    }
    const leavePayload = leaveValidation.data as { gameCode: string; userId: string };

    // Auth check: authentication required, and userId must match authenticated user
    const leaveAuthUserId = getAuthUserId(socket);
    if (!leaveAuthUserId) {
      socket.emit('classroomGameError', { error: 'Authentication required' });
      return;
    }
    if (leaveAuthUserId !== leavePayload.userId) {
      socket.emit('classroomGameError', { error: 'User ID does not match authenticated user' });
      return;
    }

    try {
      await removePlayerFromClassroomGame(leavePayload.gameCode, leavePayload.userId);

      // Get updated game state
      const game = await getClassroomGame(leavePayload.gameCode);

      // Notify all players
      if (game) {
        io.to(`classroom:${game.classroomId}`).emit('classroomGamePlayerLeft', {
          gameCode: leavePayload.gameCode,
          userId: leavePayload.userId,
          playerCount: game.players.length,
        });
      }

      logger.info('CLASSROOM_GAME', `Player ${leavePayload.userId} left game ${leavePayload.gameCode}`);
    } catch (error) {
      logger.error('CLASSROOM_GAME', `Failed to leave game: ${error}`);
    }
  });

  /**
   * S2.7: Start a classroom game (teacher only)
   * Validates teacher auth, updates status, emits start event to all players
   */
  socket.on('startClassroomGame', async (data: unknown) => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('rateLimited');
      return;
    }

    const validation = startClassroomGameSchema.safeParse(data);
    if (!validation.success) {
      socket.emit('classroomGameError', { error: `Invalid payload: ${validation.error.issues[0]?.message}` });
      return;
    }
    const payload = validation.data as { gameCode: string; playerScores?: Array<{ userId: string; score: number; wordsFound?: string[] }> };

    const authUserId = getAuthUserId(socket);
    if (!authUserId) {
      socket.emit('classroomGameError', { error: 'Authentication required' });
      return;
    }

    try {
      const game = await getClassroomGame(payload.gameCode);
      if (!game) {
        socket.emit('classroomGameError', { error: 'Game not found' });
        return;
      }

      if (authUserId !== game.teacherId) {
        socket.emit('classroomGameError', { error: 'Only the teacher can start this game' });
        return;
      }

      if (game.status !== 'waiting') {
        socket.emit('classroomGameError', { error: 'Game has already started or finished' });
        return;
      }

      await updateClassroomGameStatus(payload.gameCode, 'playing');

      io.to(`classroom:${game.classroomId}`).emit('classroomGameStarted', {
        gameCode: payload.gameCode,
        gameMode: game.settings.gameMode || 'classic',
        settings: game.settings,
        playerCount: game.players.length,
        vocabularyWords: game.vocabularyWords,
      });

      logger.info('CLASSROOM_GAME', `Teacher ${authUserId} started game ${payload.gameCode}`);
    } catch (error) {
      logger.error('CLASSROOM_GAME', `Failed to start game: ${error}`);
      socket.emit('classroomGameError', { error: 'Failed to start game' });
    }
  });

  /**
   * S2.7: End a classroom game early (teacher only)
   * Validates teacher auth, ends game, triggers score persistence (S2.5)
   */
  socket.on('endClassroomGame', async (data: unknown) => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('rateLimited');
      return;
    }

    const validation = endClassroomGameSchema.safeParse(data);
    if (!validation.success) {
      socket.emit('classroomGameError', { error: `Invalid payload: ${validation.error.issues[0]?.message}` });
      return;
    }
    const payload = validation.data as { gameCode: string; playerScores?: Array<{ userId: string; score: number; wordsFound?: string[] }> };

    const authUserId = getAuthUserId(socket);
    if (!authUserId) {
      socket.emit('classroomGameError', { error: 'Authentication required' });
      return;
    }

    try {
      const game = await getClassroomGame(payload.gameCode);
      if (!game) {
        socket.emit('classroomGameError', { error: 'Game not found' });
        return;
      }

      if (authUserId !== game.teacherId) {
        socket.emit('classroomGameError', { error: 'Only the teacher can end this game' });
        return;
      }

      await updateClassroomGameStatus(payload.gameCode, 'finished');

      // Persist scores to Supabase (S2.5)
      await persistClassroomGameScores(game, payload.playerScores);

      io.to(`classroom:${game.classroomId}`).emit('classroomGameEnded', {
        gameCode: payload.gameCode,
      });

      logger.info('CLASSROOM_GAME', `Teacher ${authUserId} ended game ${payload.gameCode}`);
    } catch (error) {
      logger.error('CLASSROOM_GAME', `Failed to end game: ${error}`);
      socket.emit('classroomGameError', { error: 'Failed to end game' });
    }
  });

  /**
   * S2.5: Classroom game end event (triggered by game completion)
   * Persists player scores to practice_sessions and awards education XP
   */
  socket.on('classroomGameEnd', async (data: unknown) => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('rateLimited');
      return;
    }

    const validation = endClassroomGameSchema.safeParse(data);
    if (!validation.success) {
      socket.emit('classroomGameError', { error: `Invalid payload: ${validation.error.issues[0]?.message}` });
      return;
    }
    const payload = validation.data as { gameCode: string; playerScores?: Array<{ userId: string; score: number; wordsFound?: string[] }> };

    const classroomGameEndAuthUserId = getAuthUserId(socket);
    if (!classroomGameEndAuthUserId) {
      socket.emit('classroomGameError', { error: 'Authentication required' });
      return;
    }

    try {
      const game = await getClassroomGame(payload.gameCode);
      if (!game) {
        socket.emit('classroomGameError', { error: 'Game not found' });
        return;
      }

      await updateClassroomGameStatus(payload.gameCode, 'finished');
      await persistClassroomGameScores(game, payload.playerScores);

      io.to(`classroom:${game.classroomId}`).emit('classroomGameEnded', {
        gameCode: payload.gameCode,
      });

      logger.info('CLASSROOM_GAME', `Game ${payload.gameCode} ended, scores persisted`);
    } catch (error) {
      logger.error('CLASSROOM_GAME', `Failed to handle game end: ${error}`);
      socket.emit('classroomGameError', { error: 'Failed to persist game results' });
    }
  });
}

/**
 * S2.5: Persist classroom game scores to Supabase
 * Creates a practice_session row per player and awards education XP
 */
async function persistClassroomGameScores(
  game: Awaited<ReturnType<typeof getClassroomGame>>,
  playerScores?: Array<{ userId: string; score: number; wordsFound?: string[] }>
): Promise<void> {
  if (!game) return;

  // Idempotency guard: only persist once per game using Redis SET NX
  const redis = getRedisClient();
  if (redis) {
    const idempotencyKey = `classroom_game_persisted:${game.gameCode}`;
    // Returns 1 if key was set (first time), 0 if already existed
    const acquired = await redis.set(idempotencyKey, '1', 'EX', 86400, 'NX');
    if (!acquired) {
      logger.info('CLASSROOM_GAME', `Scores for game ${game.gameCode} already persisted — skipping duplicate`);
      return;
    }
  }

  const supabase = getSupabase();
  if (!supabase) {
    logger.warn('CLASSROOM_GAME', 'Supabase not configured, skipping score persistence');
    return;
  }

  const lessonId = game.lessonIds[0];
  if (!lessonId) {
    logger.warn('CLASSROOM_GAME', `Game ${game.gameCode} has no lesson IDs, skipping persistence`);
    return;
  }

  for (const player of game.players) {
    try {
      // Find this player's score from the provided scores, or default to 0
      const playerScore = playerScores?.find(ps => ps.userId === player.userId);
      const score = playerScore?.score ?? 0;
      const wordsFound = playerScore?.wordsFound ?? [];

      // Create practice_session row
      const { error: sessionError } = await supabase
        .from('practice_sessions')
        .insert({
          student_id: player.userId,
          lesson_id: lessonId,
          practice_type: 'solo_board',
          total_score: score,
          words_found: wordsFound,
          completed_at: new Date().toISOString(),
        });

      if (sessionError) {
        logger.error('CLASSROOM_GAME', `Failed to create practice session for ${player.userId}: ${sessionError.message}`);
        continue;
      }

      // Award education XP via RPC
      if (score > 0) {
        const xpAmount = Math.max(10, Math.floor(score / 10));
        const { error: xpError } = await supabase.rpc('award_education_xp', {
          p_student_id: player.userId,
          p_xp_amount: xpAmount,
          p_lesson_id: lessonId,
        });

        if (xpError) {
          logger.error('CLASSROOM_GAME', `Failed to award XP for ${player.userId}: ${xpError.message}`);
        } else {
          logger.info('CLASSROOM_GAME', `Awarded ${xpAmount} XP to ${player.userId} for game ${game.gameCode}`);
        }
      }
    } catch (error) {
      logger.error('CLASSROOM_GAME', `Error persisting score for player ${player.userId}: ${error}`);
    }
  }
}

export default registerClassroomGameHandlers;
