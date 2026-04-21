/**
 * Duel Lifecycle Handlers Tests
 * Tests for create, accept, decline, cancel duel handlers
 */

import { vi, type Mock, type MockInstance } from 'vitest';
import type { Namespace } from 'socket.io';
import type { DuelSocket } from '../types';
import { registerLifecycleHandlers } from '../lifecycle';
import { generateRandomTable } from '@/backend/utils/gameUtils';

// Mock dependencies
vi.mock('@/backend/utils/logger', () => ({ default: {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
} }));

vi.mock('@/backend/utils/gameUtils', () => ({
  generateRandomTable: vi.fn(() => [
    ['A', 'B', 'C', 'D'],
    ['E', 'F', 'G', 'H'],
    ['I', 'J', 'K', 'L'],
    ['M', 'N', 'O', 'P']
  ]),
}));

// Mock Supabase
const mockSupabaseFrom = vi.fn();
const mockSupabaseSelect = vi.fn();
const mockSupabaseEq = vi.fn();
const mockSupabaseSingle = vi.fn();
const mockSupabaseInsert = vi.fn();
const mockSupabaseUpdate = vi.fn();

vi.mock('@/backend/modules/supabase/client', () => ({
  getSupabase: vi.fn(() => ({
    from: mockSupabaseFrom,
  })),
}));

describe('Duel Lifecycle Handlers', () => {
  let mockNamespace: Mocked<Namespace>;
  let mockSocket: Mocked<DuelSocket>;
  let socketHandlers: Record<string, Function>;
  let opponentSocket: Mocked<DuelSocket>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset Supabase mock chains for read operations
    mockSupabaseFrom.mockReturnValue({
      select: mockSupabaseSelect,
      insert: mockSupabaseInsert,
      update: mockSupabaseUpdate,
    });

    // Select chain for reads (fetch)
    mockSupabaseSelect.mockReturnValue({
      eq: mockSupabaseEq,
    });

    // Eq chain for reads (WHERE clause)
    mockSupabaseEq.mockReturnValue({
      single: mockSupabaseSingle,
    });

    // Single for reads - will be set per test
    mockSupabaseSingle.mockResolvedValue({
      data: { id: 'duel-123', status: 'pending' },
      error: null,
    });

    // Insert chain (for duel:create)
    const mockInsertSelect = vi.fn();
    const mockInsertSingle = vi.fn();
    mockInsertSelect.mockReturnValue({
      single: mockInsertSingle,
    });
    mockInsertSingle.mockResolvedValue({
      data: { id: 'duel-123' },
      error: null,
    });
    mockSupabaseInsert.mockReturnValue({
      select: mockInsertSelect,
    });

    // Update chain (for duel:accept)
    const mockUpdateEq1 = vi.fn();
    const mockUpdateEq2 = vi.fn();
    const mockUpdateSelect = vi.fn();
    const mockUpdateSingle = vi.fn();

    mockUpdateEq1.mockReturnValue({
      eq: mockUpdateEq2,
    });
    mockUpdateEq2.mockReturnValue({
      select: mockUpdateSelect,
    });
    mockUpdateSelect.mockReturnValue({
      single: mockUpdateSingle,
    });
    mockUpdateSingle.mockResolvedValue({
      data: { id: 'duel-123', status: 'active' },
      error: null,
    });
    mockSupabaseUpdate.mockReturnValue({
      eq: mockUpdateEq1,
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
      on: vi.fn((event: string, handler: Function) => {
        socketHandlers[event] = handler;
      }),
      emit: vi.fn(),
      join: vi.fn(),
    } as unknown as Mocked<DuelSocket>;

    // Create opponent socket mock
    opponentSocket = {
      id: 'opponent-socket-id',
      data: { userId: '550e8400-e29b-41d4-a716-446655440099', displayName: 'OpponentUser', classroomIds: [] },
      emit: vi.fn(),
      join: vi.fn(),
    } as unknown as Mocked<DuelSocket>;

    // Mock namespace
    mockNamespace = {
      to: vi.fn().mockReturnThis(),
      emit: vi.fn(),
      sockets: new Map([
        ['opponent-socket-id', opponentSocket],
      ]),
    } as unknown as Mocked<Namespace>;

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
        opponentId: '550e8400-e29b-41d4-a716-446655440099',
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
          challenger_id: '550e8400-e29b-41d4-a716-446655440099', // matches socket in namespace
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
          opponent_id: '550e8400-e29b-41d4-a716-446655440099',
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
          opponent_id: '550e8400-e29b-41d4-a716-446655440099',
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
          opponent_id: '550e8400-e29b-41d4-a716-446655440099', // matches socket in namespace
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

  describe('duel:rematch handler', () => {
    const VALID_OPPONENT = '550e8400-e29b-41d4-a716-446655440099';
    const VALID_LESSON = '550e8400-e29b-41d4-a716-446655440001';

    // Build a per-test `from` dispatcher: lesson lookup, prior-duel `or/maybeSingle`,
    // then insert/select/single for the new row.
    const installRematchMocks = (priorDuel: { classroom_id: string | null; duel_type: string } | null) => {
      const lessonSingle = vi.fn().mockResolvedValue({ data: { language: 'en' }, error: null });
      const lessonEq = vi.fn(() => ({ single: lessonSingle }));
      const lessonSelect = vi.fn(() => ({ eq: lessonEq }));

      const maybeSingle = vi.fn().mockResolvedValue({ data: priorDuel, error: null });
      const limit = vi.fn(() => ({ maybeSingle }));
      const order = vi.fn(() => ({ limit }));
      const or = vi.fn(() => ({ order }));
      const duelEq = vi.fn(() => ({ or }));
      const duelSelect = vi.fn(() => ({ eq: duelEq }));

      const insertSingle = vi.fn().mockResolvedValue({
        data: { id: 'rematch-duel-1', classroom_id: priorDuel?.classroom_id ?? null },
        error: null,
      });
      const insertSelect = vi.fn(() => ({ single: insertSingle }));
      const insertFn = vi.fn(() => ({ select: insertSelect }));

      let duelCallCount = 0;
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'vocabulary_lessons') return { select: lessonSelect };
        if (table === 'student_duels') {
          duelCallCount += 1;
          return duelCallCount === 1
            ? { select: duelSelect }
            : { insert: insertFn };
        }
        return {};
      });

      return { insertFn, or };
    };

    test('should reject payload with invalid opponent UUID', async () => {
      await socketHandlers['duel:rematch']({ opponentId: 'not-a-uuid', lessonId: VALID_LESSON });

      expect(mockSocket.emit).toHaveBeenCalledWith('duel:error', expect.objectContaining({
        message: expect.stringContaining('Invalid opponent ID'),
      }));
    });

    test('should inherit classroom_id and duel_type from prior duel', async () => {
      const { insertFn, or } = installRematchMocks({
        classroom_id: '550e8400-e29b-41d4-a716-446655440002',
        duel_type: 'async',
      });

      await socketHandlers['duel:rematch']({ opponentId: VALID_OPPONENT, lessonId: VALID_LESSON });

      // Bidirectional filter covers both player orderings
      expect(or).toHaveBeenCalledWith(expect.stringContaining(`challenger_id.eq.user-123,opponent_id.eq.${VALID_OPPONENT}`));
      expect(or).toHaveBeenCalledWith(expect.stringContaining(`challenger_id.eq.${VALID_OPPONENT},opponent_id.eq.user-123`));

      expect(insertFn).toHaveBeenCalledWith(expect.objectContaining({
        challenger_id: 'user-123',
        opponent_id: VALID_OPPONENT,
        lesson_id: VALID_LESSON,
        classroom_id: '550e8400-e29b-41d4-a716-446655440002',
        duel_type: 'async',
        status: 'pending',
      }));
    });

    test('should default to realtime duel_type when no prior duel exists', async () => {
      const { insertFn } = installRematchMocks(null);

      await socketHandlers['duel:rematch']({ opponentId: VALID_OPPONENT, lessonId: VALID_LESSON });

      expect(insertFn).toHaveBeenCalledWith(expect.objectContaining({
        duel_type: 'realtime',
        classroom_id: null,
      }));
    });

    test('should emit duel:created to requester and isRematch challenge to opponent', async () => {
      installRematchMocks({ classroom_id: null, duel_type: 'realtime' });

      await socketHandlers['duel:rematch']({ opponentId: VALID_OPPONENT, lessonId: VALID_LESSON });

      expect(mockSocket.emit).toHaveBeenCalledWith('duel:created', expect.objectContaining({
        duelId: 'rematch-duel-1',
      }));
      expect(opponentSocket.emit).toHaveBeenCalledWith('duel:challenge-received', expect.objectContaining({
        duelId: 'rematch-duel-1',
        isRematch: true,
      }));
    });
  });
});
