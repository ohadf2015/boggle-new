/**
 * Tests for Classroom Game Manager
 * Manages Redis-backed classroom multiplayer games
 */

import { vi, type Mock, type MockInstance } from 'vitest';
import {
  createClassroomGame,
  getClassroomGame,
  getClassroomGameByCode,
  getActiveClassroomGames,
  deleteClassroomGame,
  addPlayerToClassroomGame,
  removePlayerFromClassroomGame,
} from '../classroomGameManager';
import { getRedisClient } from '../../redisClient';

// Mock Redis client
vi.mock('../../redisClient');

const mockRedis = {
  setex: vi.fn(),
  get: vi.fn(),
  del: vi.fn(),
  sadd: vi.fn(),
  smembers: vi.fn(),
  srem: vi.fn(),
};

beforeAll(() => {
  (getRedisClient as Mock).mockReturnValue(mockRedis);
});

describe('ClassroomGameManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createClassroomGame', () => {
    it('should create a classroom game in Redis', async () => {
      // GIVEN
      const gameData = {
        gameCode: 'ABC123',
        classroomId: 'classroom-1',
        teacherId: 'teacher-1',
        teacherName: 'Mr. Smith',
        lessonIds: ['lesson-1', 'lesson-2'],
        lessonNames: ['Animals', 'Colors'],
        vocabularyWords: ['cat', 'dog', 'red', 'blue'],
        settings: {
          timerMinutes: 3,
          boardSize: 'medium' as const,
        },
      };

      mockRedis.setex.mockResolvedValue('OK');
      mockRedis.sadd.mockResolvedValue(1);

      // WHEN
      await createClassroomGame(gameData);

      // THEN
      expect(mockRedis.setex).toHaveBeenCalledWith(
        `classroom_game:${gameData.gameCode}`,
        14400, // 4 hour TTL
        expect.stringContaining(gameData.classroomId)
      );
      expect(mockRedis.sadd).toHaveBeenCalledWith(
        `classroom_games:${gameData.classroomId}`,
        gameData.gameCode
      );
    });

    it('should persist classroomId and lessonIds in Redis', async () => {
      // GIVEN
      const gameData = {
        gameCode: 'XYZ789',
        classroomId: 'classroom-99',
        teacherId: 'teacher-1',
        teacherName: 'Ms. Jones',
        lessonIds: ['lesson-A', 'lesson-B'],
        lessonNames: ['Fruits', 'Veggies'],
        vocabularyWords: ['apple', 'carrot'],
        settings: {},
      };

      mockRedis.setex.mockResolvedValue('OK');
      mockRedis.sadd.mockResolvedValue(1);

      // WHEN
      await createClassroomGame(gameData);

      // THEN
      const savedJson = (mockRedis.setex as Mock).mock.calls[0][2];
      const saved = JSON.parse(savedJson);
      expect(saved.classroomId).toBe('classroom-99');
      expect(saved.lessonIds).toEqual(['lesson-A', 'lesson-B']);
    });

    it('should throw error if Redis fails', async () => {
      // GIVEN
      (mockRedis.setex as Mock).mockRejectedValue(new Error('Redis error'));

      // WHEN & THEN
      await expect(
        createClassroomGame({
          gameCode: 'ABC123',
          classroomId: 'classroom-1',
          teacherId: 'teacher-1',
          teacherName: 'Mr. Smith',
          lessonIds: ['lesson-1'],
          lessonNames: ['Test'],
          vocabularyWords: ['test'],
          settings: {},
        })
      ).rejects.toThrow('Redis error');
    });
  });

  describe('getClassroomGame', () => {
    it('should retrieve a classroom game from Redis', async () => {
      // GIVEN
      const gameCode = 'ABC123';
      const gameData = {
        gameCode,
        classroomId: 'classroom-1',
        teacherId: 'teacher-1',
        lessonIds: ['lesson-1'],
        players: [],
      };

      (mockRedis.get as Mock).mockResolvedValue(JSON.stringify(gameData));

      // WHEN
      const result = await getClassroomGame(gameCode);

      // THEN
      expect(result).toEqual(gameData);
      expect(mockRedis.get).toHaveBeenCalledWith(`classroom_game:${gameCode}`);
    });

    it('should return null if game does not exist', async () => {
      // GIVEN
      (mockRedis.get as Mock).mockResolvedValue(null);

      // WHEN
      const result = await getClassroomGame('NONEXISTENT');

      // THEN
      expect(result).toBeNull();
    });
  });

  describe('getActiveClassroomGames', () => {
    it('should retrieve all active games for a classroom', async () => {
      // GIVEN
      const classroomId = 'classroom-1';
      const gameCodes = ['GAME1', 'GAME2'];
      const game1 = { gameCode: 'GAME1', classroomId };
      const game2 = { gameCode: 'GAME2', classroomId };

      (mockRedis.smembers as Mock).mockResolvedValue(gameCodes);
      (mockRedis.get as Mock)
        .mockResolvedValueOnce(JSON.stringify(game1))
        .mockResolvedValueOnce(JSON.stringify(game2));

      // WHEN
      const result = await getActiveClassroomGames(classroomId);

      // THEN
      expect(result).toEqual([game1, game2]);
      expect(mockRedis.smembers).toHaveBeenCalledWith(`classroom_games:${classroomId}`);
    });

    it('should return empty array if no active games', async () => {
      // GIVEN
      (mockRedis.smembers as Mock).mockResolvedValue([]);

      // WHEN
      const result = await getActiveClassroomGames('classroom-1');

      // THEN
      expect(result).toEqual([]);
    });

    it('should filter out games that no longer exist in Redis', async () => {
      // GIVEN
      const classroomId = 'classroom-1';
      const gameCodes = ['GAME1', 'GAME2'];
      const game1 = { gameCode: 'GAME1', classroomId };

      (mockRedis.smembers as Mock).mockResolvedValue(gameCodes);
      (mockRedis.get as Mock)
        .mockResolvedValueOnce(JSON.stringify(game1))
        .mockResolvedValueOnce(null); // GAME2 expired

      // WHEN
      const result = await getActiveClassroomGames(classroomId);

      // THEN
      expect(result).toEqual([game1]);
    });
  });

  describe('deleteClassroomGame', () => {
    it('should delete a classroom game from Redis', async () => {
      // GIVEN
      const gameCode = 'ABC123';
      const classroomId = 'classroom-1';
      const gameData = { gameCode, classroomId };

      (mockRedis.get as Mock).mockResolvedValue(JSON.stringify(gameData));
      (mockRedis.del as Mock).mockResolvedValue(1);
      (mockRedis.srem as Mock).mockResolvedValue(1);

      // WHEN
      await deleteClassroomGame(gameCode);

      // THEN
      expect(mockRedis.del).toHaveBeenCalledWith(`classroom_game:${gameCode}`);
      expect(mockRedis.srem).toHaveBeenCalledWith(
        `classroom_games:${classroomId}`,
        gameCode
      );
    });

    it('should not fail if game does not exist', async () => {
      // GIVEN
      (mockRedis.get as Mock).mockResolvedValue(null);

      // WHEN & THEN
      await expect(deleteClassroomGame('NONEXISTENT')).resolves.not.toThrow();
    });
  });

  describe('addPlayerToClassroomGame', () => {
    it('should add a player to the game', async () => {
      // GIVEN
      const gameCode = 'ABC123';
      const player = { userId: 'student-1', username: 'Alice', socketId: 'socket-1' };
      const gameData = {
        gameCode,
        classroomId: 'classroom-1',
        players: [],
      };

      (mockRedis.get as Mock).mockResolvedValue(JSON.stringify(gameData));
      (mockRedis.setex as Mock).mockResolvedValue('OK');

      // WHEN
      await addPlayerToClassroomGame(gameCode, player);

      // THEN
      expect(mockRedis.setex).toHaveBeenCalledWith(
        `classroom_game:${gameCode}`,
        14400,
        expect.stringContaining(player.userId)
      );
    });

    it('should not add duplicate players', async () => {
      // GIVEN
      const gameCode = 'ABC123';
      const player = { userId: 'student-1', username: 'Alice', socketId: 'socket-1' };
      const gameData = {
        gameCode,
        classroomId: 'classroom-1',
        players: [player],
      };

      (mockRedis.get as Mock).mockResolvedValue(JSON.stringify(gameData));
      (mockRedis.setex as Mock).mockResolvedValue('OK');

      // WHEN
      await addPlayerToClassroomGame(gameCode, player);

      // THEN - player list should still have only 1 player
      const savedData = JSON.parse(
        (mockRedis.setex as Mock).mock.calls[0][2]
      );
      expect(savedData.players).toHaveLength(1);
    });
  });

  describe('getClassroomGameByCode', () => {
    it('should return classroom metadata for a game code', async () => {
      // GIVEN
      const gameData = {
        gameCode: 'ABC123',
        classroomId: 'classroom-1',
        teacherId: 'teacher-1',
        teacherName: 'Mr. Smith',
        lessonIds: ['lesson-1', 'lesson-2'],
        lessonNames: ['Animals', 'Colors'],
        vocabularyWords: ['cat', 'dog'],
        players: [],
        status: 'waiting',
        createdAt: '2026-01-01T00:00:00.000Z',
      };

      (mockRedis.get as Mock).mockResolvedValue(JSON.stringify(gameData));

      // WHEN
      const result = await getClassroomGameByCode('ABC123');

      // THEN
      expect(result).toEqual({
        classroomId: 'classroom-1',
        lessonIds: ['lesson-1', 'lesson-2'],
        teacherName: 'Mr. Smith',
      });
    });

    it('should return null if game does not exist', async () => {
      // GIVEN
      (mockRedis.get as Mock).mockResolvedValue(null);

      // WHEN
      const result = await getClassroomGameByCode('NONEXISTENT');

      // THEN
      expect(result).toBeNull();
    });
  });

  describe('removePlayerFromClassroomGame', () => {
    it('should remove a player from the game', async () => {
      // GIVEN
      const gameCode = 'ABC123';
      const player1 = { userId: 'student-1', username: 'Alice', socketId: 'socket-1' };
      const player2 = { userId: 'student-2', username: 'Bob', socketId: 'socket-2' };
      const gameData = {
        gameCode,
        classroomId: 'classroom-1',
        players: [player1, player2],
      };

      (mockRedis.get as Mock).mockResolvedValue(JSON.stringify(gameData));
      (mockRedis.setex as Mock).mockResolvedValue('OK');

      // WHEN
      await removePlayerFromClassroomGame(gameCode, 'student-1');

      // THEN
      const savedData = JSON.parse(
        (mockRedis.setex as Mock).mock.calls[0][2]
      );
      expect(savedData.players).toHaveLength(1);
      expect(savedData.players[0].userId).toBe('student-2');
    });
  });
});
