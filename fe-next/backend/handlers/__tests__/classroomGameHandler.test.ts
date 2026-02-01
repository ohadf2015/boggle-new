/**
 * Tests for Classroom Game Socket.IO Handler
 */

import type { Server, Socket } from 'socket.io';
import { registerClassroomGameHandlers } from '../classroomGameHandler';
import * as classroomGameManager from '../../modules/classroomGameManager';
import * as gameStateManager from '../../modules/gameStateManager';

// Mock the modules
jest.mock('../../modules/classroomGameManager');
jest.mock('../../modules/gameStateManager');
jest.mock('../../utils/rateLimiter', () => ({
  checkRateLimit: jest.fn(() => true),
}));

describe('ClassroomGameHandler', () => {
  let mockSocket: any;
  let mockIo: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSocket = {
      id: 'socket-123',
      on: jest.fn(),
      emit: jest.fn(),
      join: jest.fn(),
    };

    mockIo = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
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
        classroomId: 'classroom-1',
        teacherId: 'teacher-1',
        teacherName: 'Mr. Smith',
        lessonIds: ['lesson-1'],
        lessonNames: ['Animals'],
        vocabularyWords: ['cat', 'dog'],
        settings: {
          timerMinutes: 3,
          boardSize: 'medium' as const,
        },
      };

      (classroomGameManager.createClassroomGame as jest.Mock).mockResolvedValue(undefined);

      // Register handlers
      registerClassroomGameHandlers(mockIo, mockSocket);

      // Get the handler function
      const createHandler = mockSocket.on.mock.calls.find(
        (call: any[]) => call[0] === 'createClassroomGame'
      )[1];

      // WHEN
      await createHandler(gameData);

      // THEN
      expect(classroomGameManager.createClassroomGame).toHaveBeenCalledWith(gameData);
      expect(mockSocket.join).toHaveBeenCalledWith(`classroom:${gameData.classroomId}`);
      expect(mockIo.to).toHaveBeenCalledWith(`classroom:${gameData.classroomId}`);
      expect(mockIo.emit).toHaveBeenCalledWith('classroomGameCreated', {
        gameCode: gameData.gameCode,
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
        classroomId: 'classroom-1',
        teacherId: 'teacher-1',
        teacherName: 'Mr. Smith',
        lessonIds: ['lesson-1'],
        lessonNames: ['Animals'],
        vocabularyWords: ['cat', 'dog'],
        settings: {},
      };

      (classroomGameManager.createClassroomGame as jest.Mock).mockRejectedValue(
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

      (classroomGameManager.getActiveClassroomGames as jest.Mock).mockResolvedValue(games);

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
      const data = {
        gameCode: 'ABC123',
        userId: 'student-1',
        username: 'Alice',
      };

      (classroomGameManager.addPlayerToClassroomGame as jest.Mock).mockResolvedValue(undefined);
      (classroomGameManager.getClassroomGame as jest.Mock).mockResolvedValue({
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

  describe('leaveClassroomGame handler', () => {
    it('should remove player from game', async () => {
      // GIVEN
      const data = {
        gameCode: 'ABC123',
        userId: 'student-1',
      };

      (classroomGameManager.removePlayerFromClassroomGame as jest.Mock).mockResolvedValue(undefined);

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
