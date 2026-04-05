/**
 * Tests for Classroom Game Socket.IO Handler
 */

import { vi, type Mock, type MockInstance } from 'vitest';
import type { Server, Socket } from 'socket.io';
import { registerClassroomGameHandlers } from '../classroomGameHandler';
import * as classroomGameManager from '../../modules/classroomGameManager';
import * as gameStateManager from '../../modules/gameStateManager';

// Mock the modules
vi.mock('../../modules/classroomGameManager');
vi.mock('../../modules/gameStateManager');
// Mock rate limiter - always allow
vi.mock('../../utils/rateLimiter', () => ({ checkRateLimit: vi.fn(() => true), default: {
  checkRateLimit: vi.fn(() => true),
} }));
vi.mock('../../utils/socketValidation', () => {
  const { z } = require('zod');
  return {
    validatePayload: vi.fn((schema: unknown, data: unknown) => ({
      success: true,
      data,
    })),
    gameCodeSchema: z.string(),
    usernameSchema: z.string(),
  };
});
vi.mock('../../utils/logger', () => ({ default: {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
} }));

describe('ClassroomGameHandler', () => {
  let mockSocket: any;
  let mockIo: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSocket = {
      id: 'socket-123',
      on: vi.fn(),
      emit: vi.fn(),
      join: vi.fn(),
      handshake: {
        auth: {
          authUserId: '00000000-0000-4000-8000-000000000001',
        },
      },
    };

    mockIo = {
      to: vi.fn().mockReturnThis(),
      emit: vi.fn(),
    };
  });

  describe('registerClassroomGameHandlers', () => {
    it('should register socket event handlers', () => {
      // WHEN
      registerClassroomGameHandlers(mockIo, mockSocket);

      // THEN
      expect(mockSocket.on).toHaveBeenCalledWith('createClassroomGame', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('getActiveClassroomGames', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('joinClassroomGame', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('leaveClassroomGame', expect.any(Function));
    });
  });

  describe('createClassroomGame handler', () => {
    it('should create a classroom game and broadcast to classroom', async () => {
      // GIVEN
      const gameData = {
        gameCode: 'ABC123',
        classroomId: '00000000-0000-4000-8000-000000000002',
        teacherId: '00000000-0000-4000-8000-000000000001',
        teacherName: 'Mr Smith',
        lessonIds: ['00000000-0000-4000-8000-000000000003'],
        lessonNames: ['Animals'],
        vocabularyWords: ['cat', 'dog'],
        settings: {
          timerMinutes: 3,
          boardSize: 'medium' as const,
        },
      };

      (classroomGameManager.createClassroomGame as Mock).mockResolvedValue(undefined);

      // Register handlers
      registerClassroomGameHandlers(mockIo, mockSocket);

      // Get the handler function
      const createHandler = mockSocket.on.mock.calls.find(
        (call: any[]) => call[0] === 'createClassroomGame'
      )[1];

      // WHEN
      await createHandler(gameData);

      // THEN - handler restructures payload before passing to createClassroomGame
      expect(classroomGameManager.createClassroomGame).toHaveBeenCalledWith({
        gameCode: gameData.gameCode,
        classroomId: gameData.classroomId,
        teacherId: gameData.teacherId,
        teacherName: gameData.teacherName,
        lessonIds: gameData.lessonIds,
        lessonNames: gameData.lessonNames,
        vocabularyWords: gameData.vocabularyWords,
        settings: {
          timerMinutes: gameData.settings.timerMinutes,
          boardSize: gameData.settings.boardSize,
          allowLateJoin: undefined,
          gameMode: 'classic',
        },
      });
      expect(mockSocket.join).toHaveBeenCalledWith(`classroom:${gameData.classroomId}`);
      expect(mockIo.to).toHaveBeenCalledWith(`classroom:${gameData.classroomId}`);
      expect(mockIo.emit).toHaveBeenCalledWith('classroomGameCreated', {
        gameCode: gameData.gameCode,
        classroomId: gameData.classroomId,
        teacherName: gameData.teacherName,
        lessonNames: gameData.lessonNames,
      });
      expect(mockSocket.emit).toHaveBeenCalledWith('classroomGameCreated', {
        success: true,
        gameCode: gameData.gameCode,
      });
    });

    it('should emit error if creation fails', async () => {
      // GIVEN
      const gameData = {
        gameCode: 'ABC123',
        classroomId: '00000000-0000-4000-8000-000000000002',
        teacherId: '00000000-0000-4000-8000-000000000001',
        teacherName: 'Mr Smith',
        lessonIds: ['00000000-0000-4000-8000-000000000003'],
        lessonNames: ['Animals'],
        vocabularyWords: ['cat', 'dog'],
        settings: {},
      };

      (classroomGameManager.createClassroomGame as Mock).mockRejectedValue(
        new Error('Redis error')
      );

      registerClassroomGameHandlers(mockIo, mockSocket);

      const createHandler = mockSocket.on.mock.calls.find(
        (call: any[]) => call[0] === 'createClassroomGame'
      )[1];

      // WHEN
      await createHandler(gameData);

      // THEN
      expect(mockSocket.emit).toHaveBeenCalledWith('classroomGameError', {
        error: 'Failed to create classroom game',
      });
    });
  });

  describe('getActiveClassroomGames handler', () => {
    it('should return active games for a classroom', async () => {
      // GIVEN
      const classroomId = 'classroom-1';
      const games = [
        {
          gameCode: 'GAME1',
          classroomId,
          teacherName: 'Mr. Smith',
          lessonNames: ['Animals'],
          status: 'waiting' as const,
        },
      ];

      (classroomGameManager.getActiveClassroomGames as Mock).mockResolvedValue(games);

      registerClassroomGameHandlers(mockIo, mockSocket);

      const getHandler = mockSocket.on.mock.calls.find(
        (call: any[]) => call[0] === 'getActiveClassroomGames'
      )[1];

      // WHEN
      await getHandler({ classroomId });

      // THEN
      expect(classroomGameManager.getActiveClassroomGames).toHaveBeenCalledWith(classroomId);
      expect(mockSocket.emit).toHaveBeenCalledWith('activeClassroomGames', { games });
    });
  });

  describe('joinClassroomGame handler', () => {
    it('should add player to game and emit success', async () => {
      // GIVEN
      const studentId = 'student-1';
      const data = {
        gameCode: 'ABC123',
        userId: studentId,
        username: 'Alice',
      };

      // Set auth to student for this test
      mockSocket.handshake.auth.authUserId = studentId;

      (classroomGameManager.addPlayerToClassroomGame as Mock).mockResolvedValue(undefined);
      (classroomGameManager.getClassroomGame as Mock).mockResolvedValue({
        gameCode: data.gameCode,
        players: [{ userId: data.userId, username: data.username }],
      });

      registerClassroomGameHandlers(mockIo, mockSocket);

      const joinHandler = mockSocket.on.mock.calls.find(
        (call: any[]) => call[0] === 'joinClassroomGame'
      )[1];

      // WHEN
      await joinHandler(data);

      // THEN
      expect(classroomGameManager.addPlayerToClassroomGame).toHaveBeenCalledWith(
        data.gameCode,
        {
          userId: data.userId,
          username: data.username,
          socketId: mockSocket.id,
        }
      );
      expect(mockSocket.emit).toHaveBeenCalledWith('joinedClassroomGame', {
        success: true,
        gameCode: data.gameCode,
      });
    });
  });

  describe('startClassroomGame handler', () => {
    it('should include vocabularyWords in classroomGameStarted event', async () => {
      // GIVEN
      const gameCode = 'ABC123';
      const teacherId = '00000000-0000-4000-8000-000000000001';
      const game = {
        gameCode,
        classroomId: '00000000-0000-4000-8000-000000000002',
        teacherId,
        teacherName: 'Mr Smith',
        lessonIds: ['00000000-0000-4000-8000-000000000003'],
        vocabularyWords: ['cat', 'dog', 'bird'],
        settings: { gameMode: 'classic' },
        players: [{ userId: 'student-1', username: 'Alice', socketId: 's1' }],
        status: 'waiting' as const,
        createdAt: '2026-01-01T00:00:00.000Z',
      };

      (classroomGameManager.getClassroomGame as Mock).mockResolvedValue(game);
      (classroomGameManager.updateClassroomGameStatus as Mock).mockResolvedValue(undefined);

      registerClassroomGameHandlers(mockIo, mockSocket);

      const startHandler = mockSocket.on.mock.calls.find(
        (call: any[]) => call[0] === 'startClassroomGame'
      )[1];

      // WHEN
      await startHandler({ gameCode });

      // THEN
      expect(mockIo.emit).toHaveBeenCalledWith('classroomGameStarted', {
        gameCode,
        gameMode: 'classic',
        settings: game.settings,
        playerCount: 1,
        vocabularyWords: ['cat', 'dog', 'bird'],
      });
    });
  });

  describe('leaveClassroomGame handler', () => {
    it('should remove player from game', async () => {
      // GIVEN
      const studentId = 'student-1';
      const data = {
        gameCode: 'ABC123',
        userId: studentId,
      };

      // Set auth to student for this test
      mockSocket.handshake.auth.authUserId = studentId;

      (classroomGameManager.removePlayerFromClassroomGame as Mock).mockResolvedValue(undefined);
      (classroomGameManager.getClassroomGame as Mock).mockResolvedValue({
        gameCode: data.gameCode,
        players: [],
      });

      registerClassroomGameHandlers(mockIo, mockSocket);

      const leaveHandler = mockSocket.on.mock.calls.find(
        (call: any[]) => call[0] === 'leaveClassroomGame'
      )[1];

      // WHEN
      await leaveHandler(data);

      // THEN
      expect(classroomGameManager.removePlayerFromClassroomGame).toHaveBeenCalledWith(
        data.gameCode,
        data.userId
      );
    });
  });
});
