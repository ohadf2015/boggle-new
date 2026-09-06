/**
 * Tests for Classroom Game Socket.IO Handler
 */

import { vi, type Mock, type MockInstance } from 'vitest';
import type { Server, Socket } from 'socket.io';
import { registerClassroomGameHandlers } from '../classroomGameHandler';
import * as classroomGameManager from '../../modules/classroomGameManager';
import * as gameStateManager from '../../modules/gameStateManager';
import * as classroomMembership from '../../modules/supabase/classroomMembership';

// Mock the modules
vi.mock('../../modules/classroomGameManager');
vi.mock('../../modules/gameStateManager');
vi.mock('../../modules/supabase/classroomMembership', () => ({
  isClassroomTeacher: vi.fn(),
  isClassroomStudent: vi.fn(),
  getClassroomRole: vi.fn(),
  // Three-state forms: the handler uses these so a server fault ("unavailable")
  // is reported as a server error instead of accusing the teacher.
  resolveClassroomTeacher: vi.fn(),
  resolveClassroomStudent: vi.fn(),
  resolveClassroomRole: vi.fn(),
}));
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

    // Default: allow access for existing happy-path tests.
    // Individual tests override these for rejection scenarios.
    (classroomMembership.isClassroomTeacher as Mock).mockResolvedValue(true);
    (classroomMembership.isClassroomStudent as Mock).mockResolvedValue(true);
    (classroomMembership.resolveClassroomRole as Mock).mockResolvedValue({ status: 'ok', role: 'student' });
    (classroomMembership.resolveClassroomTeacher as Mock).mockResolvedValue('yes');
    (classroomMembership.resolveClassroomStudent as Mock).mockResolvedValue('yes');
    (classroomMembership.resolveClassroomRole as Mock).mockResolvedValue({ status: 'ok', role: 'student' });
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

  describe('classroom membership gate (F-03, F-08, F-11, F-12)', () => {
    const validCreatePayload = {
      gameCode: 'ABC123',
      classroomId: '00000000-0000-4000-8000-000000000002',
      teacherId: '00000000-0000-4000-8000-000000000001',
      teacherName: 'Mr Smith',
      lessonIds: ['00000000-0000-4000-8000-000000000003'],
      lessonNames: ['Animals'],
      vocabularyWords: ['cat'],
      settings: {},
    };

    it('createClassroomGame rejects when auth user is not the classroom teacher', async () => {
      // GIVEN auth matches teacherId claim, but Supabase says they do NOT own this classroom
      (classroomMembership.resolveClassroomTeacher as Mock).mockResolvedValue('no');
      (classroomGameManager.createClassroomGame as Mock).mockResolvedValue(undefined);

      registerClassroomGameHandlers(mockIo, mockSocket);
      const createHandler = mockSocket.on.mock.calls.find(
        (c: any[]) => c[0] === 'createClassroomGame'
      )[1];

      // WHEN
      await createHandler(validCreatePayload);

      // THEN - Supabase-level check fires, Redis write never happens
      expect(classroomMembership.resolveClassroomTeacher).toHaveBeenCalledWith(
        validCreatePayload.teacherId,
        validCreatePayload.classroomId
      );
      expect(classroomGameManager.createClassroomGame).not.toHaveBeenCalled();
      expect(mockSocket.emit).toHaveBeenCalledWith('classroomGameError', {
        error: expect.stringMatching(/not the teacher|not authorized|classroom/i),
      });
      expect(mockIo.emit).not.toHaveBeenCalledWith('classroomGameCreated', expect.anything());
    });

    it('joinClassroomGame rejects when user is neither teacher nor enrolled student', async () => {
      // GIVEN
      const studentId = '00000000-0000-4000-8000-000000000099';
      mockSocket.handshake.auth.authUserId = studentId;

      (classroomGameManager.getClassroomGame as Mock).mockResolvedValue({
        gameCode: 'ABC123',
        classroomId: '00000000-0000-4000-8000-000000000002',
        players: [],
      });
      (classroomMembership.resolveClassroomRole as Mock).mockResolvedValue({ status: 'ok', role: null });

      registerClassroomGameHandlers(mockIo, mockSocket);
      const joinHandler = mockSocket.on.mock.calls.find(
        (c: any[]) => c[0] === 'joinClassroomGame'
      )[1];

      // WHEN
      await joinHandler({
        gameCode: 'ABC123',
        userId: studentId,
        username: 'Outsider',
      });

      // THEN - role was checked, addPlayer never called, error emitted
      expect(classroomMembership.resolveClassroomRole).toHaveBeenCalledWith(
        studentId,
        '00000000-0000-4000-8000-000000000002'
      );
      expect(classroomGameManager.addPlayerToClassroomGame).not.toHaveBeenCalled();
      expect(mockSocket.emit).toHaveBeenCalledWith('classroomGameError', {
        error: expect.stringMatching(/not a member|not authorized|classroom/i),
      });
    });

    it('joinClassroomGame allows enrolled student', async () => {
      // GIVEN
      const studentId = '00000000-0000-4000-8000-000000000010';
      mockSocket.handshake.auth.authUserId = studentId;

      (classroomGameManager.getClassroomGame as Mock).mockResolvedValue({
        gameCode: 'ABC123',
        classroomId: '00000000-0000-4000-8000-000000000002',
        players: [{ userId: studentId, username: 'Alice' }],
      });
      (classroomMembership.resolveClassroomRole as Mock).mockResolvedValue({ status: 'ok', role: 'student' });
      (classroomGameManager.addPlayerToClassroomGame as Mock).mockResolvedValue(undefined);

      registerClassroomGameHandlers(mockIo, mockSocket);
      const joinHandler = mockSocket.on.mock.calls.find(
        (c: any[]) => c[0] === 'joinClassroomGame'
      )[1];

      // WHEN
      await joinHandler({
        gameCode: 'ABC123',
        userId: studentId,
        username: 'Alice',
      });

      // THEN
      expect(classroomGameManager.addPlayerToClassroomGame).toHaveBeenCalled();
      expect(mockSocket.emit).toHaveBeenCalledWith('joinedClassroomGame', {
        success: true,
        gameCode: 'ABC123',
      });
    });

    it('joinClassroomGame rejects when game code does not exist (no classroom leak)', async () => {
      // GIVEN: attacker probes a random game code
      const attackerId = '00000000-0000-4000-8000-000000000066';
      mockSocket.handshake.auth.authUserId = attackerId;
      (classroomGameManager.getClassroomGame as Mock).mockResolvedValue(null);

      registerClassroomGameHandlers(mockIo, mockSocket);
      const joinHandler = mockSocket.on.mock.calls.find(
        (c: any[]) => c[0] === 'joinClassroomGame'
      )[1];

      // WHEN
      await joinHandler({
        gameCode: 'ZZZZZZ',
        userId: attackerId,
        username: 'Mallory',
      });

      // THEN - generic error, no membership probe, no player add
      expect(classroomMembership.resolveClassroomRole).not.toHaveBeenCalled();
      expect(classroomGameManager.addPlayerToClassroomGame).not.toHaveBeenCalled();
      expect(mockSocket.emit).toHaveBeenCalledWith('classroomGameError', {
        error: expect.stringMatching(/not found|invalid/i),
      });
    });

    it('getActiveClassroomGames rejects non-members and does not join socket room', async () => {
      // GIVEN: random user tries to subscribe to a classroom they are not in
      const outsiderId = '00000000-0000-4000-8000-000000000077';
      mockSocket.handshake.auth.authUserId = outsiderId;
      (classroomMembership.resolveClassroomRole as Mock).mockResolvedValue({ status: 'ok', role: null });

      registerClassroomGameHandlers(mockIo, mockSocket);
      const getHandler = mockSocket.on.mock.calls.find(
        (c: any[]) => c[0] === 'getActiveClassroomGames'
      )[1];

      // WHEN
      await getHandler({ classroomId: '00000000-0000-4000-8000-000000000002' });

      // THEN
      expect(mockSocket.join).not.toHaveBeenCalledWith(
        'classroom:00000000-0000-4000-8000-000000000002'
      );
      expect(classroomGameManager.getActiveClassroomGames).not.toHaveBeenCalled();
      expect(mockSocket.emit).toHaveBeenCalledWith('classroomGameError', {
        error: expect.stringMatching(/not a member|not authorized|classroom/i),
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
