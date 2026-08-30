/**
 * Classroom Game Manager
 *
 * Manages classroom-scoped multiplayer games using Redis storage.
 * These games are linked to specific classrooms and notify students automatically.
 */

import { getRedisClient } from '../redisClient.js';
import logger from '../utils/logger.js';

const CLASSROOM_GAME_TTL = 14400; // 4 hours

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
  gameMode?: 'classic' | 'blast' | 'word-hunt' | 'wheel-rush';
  /**
   * Word Hunt only: the lesson word the teacher pinned as the hunted target.
   * Empty/absent means "let the game pick". Re-validated against the lesson at
   * game start — never trusted from the socket payload alone.
   */
  targetWord?: string;
}

export interface ClassroomGame {
  gameCode: string;
  classroomId: string;
  teacherId: string;
  teacherName: string;
  lessonIds: string[];
  lessonNames: string[];
  vocabularyWords: string[];
  settings: ClassroomGameSettings;
  players: ClassroomGamePlayer[];
  createdAt: string;
  startedAt?: string;
  status: 'waiting' | 'playing' | 'finished';
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
      if (game) {
        games.push(game);
      } else {
        // Game expired, remove from set
        await redis.srem(`classroom_games:${classroomId}`, gameCode);
      }
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
  status: 'waiting' | 'playing' | 'finished'
): Promise<void> {
  try {
    const redis = getRedis();
    const game = await getClassroomGame(gameCode);
    if (!game) return;

    game.status = status;
    if (status === 'playing' && !game.startedAt) {
      game.startedAt = new Date().toISOString();
    }

    await redis.setex(
      `classroom_game:${gameCode}`,
      CLASSROOM_GAME_TTL,
      JSON.stringify(game)
    );

    logger.info('CLASSROOM_GAME', `Updated game ${gameCode} status to ${status}`);
  } catch (error) {
    logger.error('CLASSROOM_GAME', `Failed to update game status: ${error}`);
  }
}
