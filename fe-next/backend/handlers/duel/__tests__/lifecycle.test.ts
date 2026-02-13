/**
 * Duel Lifecycle Handlers Tests
 * Tests for create, accept, decline, cancel duel handlers
 */

import type { Namespace } from 'socket.io';
import type { DuelSocket } from '../types';
import { registerLifecycleHandlers } from '../lifecycle';

// Mock dependencies
jest.mock('@/backend/utils/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

jest.mock('@/backend/utils/gameUtils', () => ({
  generateRandomTable: jest.fn(() => [
    ['A', 'B', 'C', 'D'],
    ['E', 'F', 'G', 'H'],
    ['I', 'J', 'K', 'L'],
    ['M', 'N', 'O', 'P']
  ]),
}));

// Mock Supabase
const mockSupabaseFrom = jest.fn();
const mockSupabaseSelect = jest.fn();
const mockSupabaseEq = jest.fn();
const mockSupabaseSingle = jest.fn();
const mockSupabaseInsert = jest.fn();
const mockSupabaseUpdate = jest.fn();

jest.mock('@/backend/modules/supabase/client', () => ({
  getSupabase: jest.fn(() => ({
    from: mockSupabaseFrom,
  })),
}));

describe('Duel Lifecycle Handlers', () => {
  let mockNamespace: jest.Mocked<Namespace>;
  let mockSocket: jest.Mocked<DuelSocket>;
  let socketHandlers: Record<string, Function>;
  let opponentSocket: jest.Mocked<DuelSocket>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset Supabase mock chains
    mockSupabaseFrom.mockReturnValue({
      select: mockSupabaseSelect,
      insert: mockSupabaseInsert,
      update: mockSupabaseUpdate,
    });
    mockSupabaseSelect.mockReturnValue({
      eq: mockSupabaseEq,
    });
    mockSupabaseEq.mockReturnValue({
      single: mockSupabaseSingle,
    });
    mockSupabaseInsert.mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: { id: 'duel-123' },
          error: null,
        }),
      }),
    });
    mockSupabaseUpdate.mockReturnValue({
      eq: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: 'duel-123', status: 'active' },
            error: null,
          }),
        }),
      }),
    });

    // Mock socket
    socketHandlers = {};
    mockSocket = {
      id: 'socket-123',
      data: {
        userId: 'user-123',
        displayName: 'TestUser',
        classroomIds: ['classroom-1'],
      },
      on: jest.fn((event: string, handler: Function) => {
        socketHandlers[event] = handler;
      }),
      emit: jest.fn(),
      join: jest.fn(),
    } as unknown as jest.Mocked<DuelSocket>;

    // Create opponent socket mock
    opponentSocket = {
      id: 'opponent-socket-id',
      data: { userId: 'opponent-id', displayName: 'OpponentUser', classroomIds: [] },
      emit: jest.fn(),
      join: jest.fn(),
    } as unknown as jest.Mocked<DuelSocket>;

    // Mock namespace
    mockNamespace = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
      sockets: new Map([
        ['opponent-socket-id', opponentSocket],
      ]),
    } as unknown as jest.Mocked<Namespace>;

    // Register handlers
    registerLifecycleHandlers(mockNamespace, mockSocket);
  });

  describe('duel:create handler', () => {
    test('should validate payload with Zod schema', async () => {
      const invalidPayload = {
        opponentId: 'not-a-uuid',
        lessonId: 'lesson-123',
        classroomId: 'classroom-1',
      };

      await socketHandlers['duel:create'](invalidPayload);

      expect(mockSocket.emit).toHaveBeenCalledWith('duel:error', expect.objectContaining({
        message: expect.stringContaining('Invalid opponent ID'),
      }));
    });

    test('should generate board using generateRandomTable', async () => {
      const { generateRandomTable } = require('@/backend/utils/gameUtils');

      const validPayload = {
        opponentId: '550e8400-e29b-41d4-a716-446655440000',
        lessonId: '550e8400-e29b-41d4-a716-446655440001',
        classroomId: '550e8400-e29b-41d4-a716-446655440002',
      };

      mockSupabaseSingle.mockResolvedValue({
        data: { language: 'en' },
        error: null,
      });

      await socketHandlers['duel:create'](validPayload);

      expect(generateRandomTable).toHaveBeenCalledWith(4, 4, 'en');
    });

    test('should insert duel into database with correct fields', async () => {
      const validPayload = {
        opponentId: '550e8400-e29b-41d4-a716-446655440000',
        lessonId: '550e8400-e29b-41d4-a716-446655440001',
        classroomId: '550e8400-e29b-41d4-a716-446655440002',
      };

      mockSupabaseSingle.mockResolvedValue({
        data: { language: 'en' },
        error: null,
      });

      await socketHandlers['duel:create'](validPayload);

      expect(mockSupabaseFrom).toHaveBeenCalledWith('student_duels');
      expect(mockSupabaseInsert).toHaveBeenCalledWith(expect.objectContaining({
        challenger_id: 'user-123',
        opponent_id: '550e8400-e29b-41d4-a716-446655440000',
        lesson_id: '550e8400-e29b-41d4-a716-446655440001',
        classroom_id: '550e8400-e29b-41d4-a716-446655440002',
        status: 'pending',
        board_state: expect.any(Array),
      }));
    });

    test('should emit duel:created to creator', async () => {
      const validPayload = {
        opponentId: '550e8400-e29b-41d4-a716-446655440000',
        lessonId: '550e8400-e29b-41d4-a716-446655440001',
        classroomId: '550e8400-e29b-41d4-a716-446655440002',
      };

      mockSupabaseSingle.mockResolvedValue({
        data: { language: 'en' },
        error: null,
      });

      await socketHandlers['duel:create'](validPayload);

      expect(mockSocket.emit).toHaveBeenCalledWith('duel:created', expect.objectContaining({
        duelId: 'duel-123',
      }));
    });

    test('should emit duel:challenge-received to opponent', async () => {
      const validPayload = {
        opponentId: 'opponent-id',
        lessonId: '550e8400-e29b-41d4-a716-446655440001',
        classroomId: '550e8400-e29b-41d4-a716-446655440002',
      };

      mockSupabaseSingle.mockResolvedValue({
        data: { language: 'en' },
        error: null,
      });

      await socketHandlers['duel:create'](validPayload);

      expect(opponentSocket.emit).toHaveBeenCalledWith('duel:challenge-received', expect.objectContaining({
        duelId: 'duel-123',
        challengerName: 'TestUser',
      }));
    });

    test('should emit to lobby room for lobby updates', async () => {
      const validPayload = {
        opponentId: '550e8400-e29b-41d4-a716-446655440000',
        lessonId: '550e8400-e29b-41d4-a716-446655440001',
        classroomId: '550e8400-e29b-41d4-a716-446655440002',
      };

      mockSupabaseSingle.mockResolvedValue({
        data: { language: 'en' },
        error: null,
      });

      await socketHandlers['duel:create'](validPayload);

      expect(mockNamespace.to).toHaveBeenCalledWith('duel:lobby:550e8400-e29b-41d4-a716-446655440002');
      expect(mockNamespace.emit).toHaveBeenCalled();
    });
  });

  describe('duel:accept handler', () => {
    test('should validate payload with Zod schema', async () => {
      const invalidPayload = {
        duelId: 'not-a-uuid',
      };

      await socketHandlers['duel:accept'](invalidPayload);

      expect(mockSocket.emit).toHaveBeenCalledWith('duel:error', expect.objectContaining({
        message: expect.stringContaining('Invalid duel ID'),
      }));
    });

    test('should reject if duel status is not pending', async () => {
      const validPayload = {
        duelId: '550e8400-e29b-41d4-a716-446655440000',
      };

      mockSupabaseSingle.mockResolvedValue({
        data: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          status: 'active',
          opponent_id: 'user-123',
        },
        error: null,
      });

      await socketHandlers['duel:accept'](validPayload);

      expect(mockSocket.emit).toHaveBeenCalledWith('duel:error', expect.objectContaining({
        message: expect.stringContaining('not pending'),
      }));
    });

    test('should reject if user is not the opponent', async () => {
      const validPayload = {
        duelId: '550e8400-e29b-41d4-a716-446655440000',
      };

      mockSupabaseSingle.mockResolvedValue({
        data: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          status: 'pending',
          opponent_id: 'other-user',
        },
        error: null,
      });

      await socketHandlers['duel:accept'](validPayload);

      expect(mockSocket.emit).toHaveBeenCalledWith('duel:error', expect.objectContaining({
        message: expect.stringContaining('not the opponent'),
      }));
    });

    test('should update duel status to active', async () => {
      const validPayload = {
        duelId: '550e8400-e29b-41d4-a716-446655440000',
      };

      mockSupabaseSingle.mockResolvedValueOnce({
        data: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          status: 'pending',
          opponent_id: 'user-123',
          board_state: [['A', 'B'], ['C', 'D']],
        },
        error: null,
      });

      await socketHandlers['duel:accept'](validPayload);

      expect(mockSupabaseUpdate).toHaveBeenCalledWith(expect.objectContaining({
        status: 'active',
        started_at: expect.any(String),
      }));
    });

    test('should make both players join duel room', async () => {
      const validPayload = {
        duelId: '550e8400-e29b-41d4-a716-446655440000',
      };

      mockSupabaseSingle.mockResolvedValueOnce({
        data: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          status: 'pending',
          opponent_id: 'user-123',
          board_state: [['A', 'B'], ['C', 'D']],
        },
        error: null,
      });

      await socketHandlers['duel:accept'](validPayload);

      expect(mockSocket.join).toHaveBeenCalledWith('duel:550e8400-e29b-41d4-a716-446655440000');
    });

    test('should emit duel:accepted to duel room', async () => {
      const validPayload = {
        duelId: '550e8400-e29b-41d4-a716-446655440000',
      };

      const boardState = [['A', 'B'], ['C', 'D']];
      mockSupabaseSingle.mockResolvedValueOnce({
        data: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          status: 'pending',
          opponent_id: 'user-123',
          board_state: boardState,
        },
        error: null,
      });

      await socketHandlers['duel:accept'](validPayload);

      expect(mockNamespace.to).toHaveBeenCalledWith('duel:550e8400-e29b-41d4-a716-446655440000');
      expect(mockNamespace.emit).toHaveBeenCalledWith('duel:accepted', expect.objectContaining({
        duelId: '550e8400-e29b-41d4-a716-446655440000',
        boardState: boardState,
        startedAt: expect.any(String),
      }));
    });
  });

  describe('duel:decline handler', () => {
    test('should validate payload with Zod schema', async () => {
      const invalidPayload = {
        duelId: 'not-a-uuid',
      };

      await socketHandlers['duel:decline'](invalidPayload);

      expect(mockSocket.emit).toHaveBeenCalledWith('duel:error', expect.objectContaining({
        message: expect.stringContaining('Invalid duel ID'),
      }));
    });

    test('should reject if duel status is not pending', async () => {
      const validPayload = {
        duelId: '550e8400-e29b-41d4-a716-446655440000',
      };

      mockSupabaseSingle.mockResolvedValue({
        data: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          status: 'active',
          opponent_id: 'user-123',
        },
        error: null,
      });

      await socketHandlers['duel:decline'](validPayload);

      expect(mockSocket.emit).toHaveBeenCalledWith('duel:error', expect.objectContaining({
        message: expect.stringContaining('not pending'),
      }));
    });

    test('should reject if user is not the opponent', async () => {
      const validPayload = {
        duelId: '550e8400-e29b-41d4-a716-446655440000',
      };

      mockSupabaseSingle.mockResolvedValue({
        data: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          status: 'pending',
          opponent_id: 'other-user',
          challenger_id: 'challenger-id',
        },
        error: null,
      });

      await socketHandlers['duel:decline'](validPayload);

      expect(mockSocket.emit).toHaveBeenCalledWith('duel:error', expect.objectContaining({
        message: expect.stringContaining('not the opponent'),
      }));
    });

    test('should update duel status to declined', async () => {
      const validPayload = {
        duelId: '550e8400-e29b-41d4-a716-446655440000',
      };

      mockSupabaseSingle.mockResolvedValueOnce({
        data: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          status: 'pending',
          opponent_id: 'user-123',
          challenger_id: 'challenger-id',
        },
        error: null,
      });

      await socketHandlers['duel:decline'](validPayload);

      expect(mockSupabaseUpdate).toHaveBeenCalledWith(expect.objectContaining({
        status: 'declined',
      }));
    });

    test('should emit duel:declined to challenger', async () => {
      const validPayload = {
        duelId: '550e8400-e29b-41d4-a716-446655440000',
      };

      mockSupabaseSingle.mockResolvedValueOnce({
        data: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          status: 'pending',
          opponent_id: 'user-123',
          challenger_id: 'opponent-id', // matches socket in namespace
        },
        error: null,
      });

      await socketHandlers['duel:decline'](validPayload);

      const challengerSocket = mockNamespace.sockets.get('opponent-socket-id');
      expect(challengerSocket?.emit).toHaveBeenCalledWith('duel:declined', expect.objectContaining({
        duelId: '550e8400-e29b-41d4-a716-446655440000',
      }));
    });
  });

  describe('duel:cancel handler', () => {
    test('should validate payload with Zod schema', async () => {
      const invalidPayload = {
        duelId: 'not-a-uuid',
      };

      await socketHandlers['duel:cancel'](invalidPayload);

      expect(mockSocket.emit).toHaveBeenCalledWith('duel:error', expect.objectContaining({
        message: expect.stringContaining('Invalid duel ID'),
      }));
    });

    test('should reject if duel status is not pending', async () => {
      const validPayload = {
        duelId: '550e8400-e29b-41d4-a716-446655440000',
      };

      mockSupabaseSingle.mockResolvedValue({
        data: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          status: 'active',
          challenger_id: 'user-123',
        },
        error: null,
      });

      await socketHandlers['duel:cancel'](validPayload);

      expect(mockSocket.emit).toHaveBeenCalledWith('duel:error', expect.objectContaining({
        message: expect.stringContaining('not pending'),
      }));
    });

    test('should reject if user is not the challenger', async () => {
      const validPayload = {
        duelId: '550e8400-e29b-41d4-a716-446655440000',
      };

      mockSupabaseSingle.mockResolvedValue({
        data: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          status: 'pending',
          challenger_id: 'other-user',
          opponent_id: 'opponent-id',
        },
        error: null,
      });

      await socketHandlers['duel:cancel'](validPayload);

      expect(mockSocket.emit).toHaveBeenCalledWith('duel:error', expect.objectContaining({
        message: expect.stringContaining('not the challenger'),
      }));
    });

    test('should update duel status to cancelled', async () => {
      const validPayload = {
        duelId: '550e8400-e29b-41d4-a716-446655440000',
      };

      mockSupabaseSingle.mockResolvedValueOnce({
        data: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          status: 'pending',
          challenger_id: 'user-123',
          opponent_id: 'opponent-id',
        },
        error: null,
      });

      await socketHandlers['duel:cancel'](validPayload);

      expect(mockSupabaseUpdate).toHaveBeenCalledWith(expect.objectContaining({
        status: 'cancelled',
      }));
    });

    test('should emit duel:cancelled to opponent', async () => {
      const validPayload = {
        duelId: '550e8400-e29b-41d4-a716-446655440000',
      };

      mockSupabaseSingle.mockResolvedValueOnce({
        data: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          status: 'pending',
          challenger_id: 'user-123',
          opponent_id: 'opponent-id', // matches socket in namespace
        },
        error: null,
      });

      await socketHandlers['duel:cancel'](validPayload);

      const opponentSocket = mockNamespace.sockets.get('opponent-socket-id');
      expect(opponentSocket?.emit).toHaveBeenCalledWith('duel:cancelled', expect.objectContaining({
        duelId: '550e8400-e29b-41d4-a716-446655440000',
      }));
    });
  });
});
