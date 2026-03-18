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
  type CreateClassroomGameData,
} from '../modules/classroomGameManager.js';
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
  lessonNames: z.array(z.string().max(200)).max(20).optional(),
  vocabularyWords: z.array(z.string().max(100)).max(500).optional(),
  timerMinutes: z.number().int().min(1).max(30).optional(),
  boardSize: z.enum(['small', 'medium', 'large']).optional(),
  allowLateJoin: z.boolean().optional(),
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
  return (socket.handshake.auth?.authUserId as string) || null;
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
    const validation = validatePayload(createClassroomGameSchema, data);
    if (!validation.success) {
      socket.emit('classroomGameError', { error: `Invalid payload: ${validation.error}` });
      return;
    }
    const payload = validation.data as z.infer<typeof createClassroomGameSchema>;

    // Auth check: teacherId must match authenticated user
    const authUserId = getAuthUserId(socket);
    if (authUserId && authUserId !== payload.teacherId) {
      socket.emit('classroomGameError', { error: 'Teacher ID does not match authenticated user' });
      return;
    }

    try {
      // Create the game in Redis
      await createClassroomGame(payload as CreateClassroomGameData);

      // Join classroom room for notifications
      socket.join(`classroom:${payload.classroomId}`);

      // Broadcast to classroom that a game has been created
      io.to(`classroom:${payload.classroomId}`).emit('classroomGameCreated', {
        gameCode: payload.gameCode,
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

    // Auth check: userId must match authenticated user if present
    const leaveAuthUserId = getAuthUserId(socket);
    if (leaveAuthUserId && leaveAuthUserId !== leavePayload.userId) {
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
}

export default registerClassroomGameHandlers;
