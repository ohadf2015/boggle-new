/**
 * Classroom Game Socket.IO Handler
 *
 * Handles Socket.IO events for classroom-scoped multiplayer games.
 * Teachers create games, students receive notifications and join.
 */

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
import logger from '../utils/logger.js';

interface CreateClassroomGamePayload extends CreateClassroomGameData {}

interface GetActiveGamesPayload {
  classroomId: string;
}

interface JoinClassroomGamePayload {
  gameCode: string;
  userId: string;
  username: string;
}

interface LeaveClassroomGamePayload {
  gameCode: string;
  userId: string;
}

/**
 * Register classroom game socket event handlers
 */
export function registerClassroomGameHandlers(io: Server, socket: Socket): void {
  /**
   * Create a new classroom game
   * Broadcasts notification to all students in the classroom
   */
  socket.on('createClassroomGame', async (data: CreateClassroomGamePayload) => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('rateLimited');
      return;
    }

    try {
      // Create the game in Redis
      await createClassroomGame(data);

      // Join classroom room for notifications
      socket.join(`classroom:${data.classroomId}`);

      // Broadcast to classroom that a game has been created
      io.to(`classroom:${data.classroomId}`).emit('classroomGameCreated', {
        gameCode: data.gameCode,
        teacherName: data.teacherName,
        lessonNames: data.lessonNames,
      });

      // Confirm creation to teacher
      socket.emit('classroomGameCreated', {
        success: true,
        gameCode: data.gameCode,
      });

      logger.info(
        'CLASSROOM_GAME',
        `Teacher ${data.teacherId} created game ${data.gameCode} for classroom ${data.classroomId}`
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
  socket.on('getActiveClassroomGames', async (data: GetActiveGamesPayload) => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('rateLimited');
      return;
    }

    try {
      const games = await getActiveClassroomGames(data.classroomId);

      // Join classroom room to receive future notifications
      socket.join(`classroom:${data.classroomId}`);

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
  socket.on('joinClassroomGame', async (data: JoinClassroomGamePayload) => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('rateLimited');
      return;
    }

    try {
      await addPlayerToClassroomGame(data.gameCode, {
        userId: data.userId,
        username: data.username,
        socketId: socket.id,
      });

      // Get updated game state
      const game = await getClassroomGame(data.gameCode);

      // Notify all players in the game
      if (game) {
        io.to(`classroom:${game.classroomId}`).emit('classroomGamePlayerJoined', {
          gameCode: data.gameCode,
          username: data.username,
          playerCount: game.players.length,
        });
      }

      socket.emit('joinedClassroomGame', {
        success: true,
        gameCode: data.gameCode,
      });

      logger.info('CLASSROOM_GAME', `Player ${data.username} joined game ${data.gameCode}`);
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
  socket.on('leaveClassroomGame', async (data: LeaveClassroomGamePayload) => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('rateLimited');
      return;
    }

    try {
      await removePlayerFromClassroomGame(data.gameCode, data.userId);

      // Get updated game state
      const game = await getClassroomGame(data.gameCode);

      // Notify all players
      if (game) {
        io.to(`classroom:${game.classroomId}`).emit('classroomGamePlayerLeft', {
          gameCode: data.gameCode,
          userId: data.userId,
          playerCount: game.players.length,
        });
      }

      logger.info('CLASSROOM_GAME', `Player ${data.userId} left game ${data.gameCode}`);
    } catch (error) {
      logger.error('CLASSROOM_GAME', `Failed to leave game: ${error}`);
    }
  });
}

export default registerClassroomGameHandlers;
