/**
 * Duel Disconnection Handlers Tests
 * TDD tests for disconnection grace period, reconnection, and forfeit logic
 */

import type { Namespace } from 'socket.io';
import type { DuelSocket } from '../types';
import { registerDisconnectionHandlers, handleReconnection } from '../disconnection';
import { getSupabase } from '@/backend/modules/supabase/client';

// Mock dependencies
jest.mock('@/backend/modules/supabase/client');
jest.mock('@/backend/utils/logger');

const mockedGetSupabase = jest.mocked(getSupabase);

// Enable fake timers for grace period testing
jest.useFakeTimers();

describe('Duel Disconnection Handlers', () => {
  let mockSocket: Partial<DuelSocket>;
  let mockNamespace: Partial<Namespace>;
  let mockSupabaseClient: any;
  let mockFrom: jest.Mock;
  let mockSelect: jest.Mock;
  let mockEq: jest.Mock;
  let mockUpdate: jest.Mock;
  let mockSingle: jest.Mock;
  let emittedEvents: Array<{ event: string; data: any }>;
  let roomEmittedEvents: Array<{ room: string; event: string; data: any }>;

  beforeEach(() => {
    // Clear mocks and fake timers
    jest.clearAllMocks();
    jest.clearAllTimers();
    emittedEvents = [];
    roomEmittedEvents = [];

    // Setup mock socket
    mockSocket = {
      id: 'socket-123',
      data: {
        userId: 'user-1',
        displayName: 'Player 1',
        classroomIds: ['classroom-1'],
      },
      emit: jest.fn((event: string, data: any) => {
        emittedEvents.push({ event, data });
      }),
      on: jest.fn(),
      join: jest.fn(),
    } as any;

    // Setup mock namespace
    mockNamespace = {
      to: jest.fn().mockReturnValue({
        emit: jest.fn((event: string, data: any) => {
          const roomCall = (mockNamespace.to as jest.Mock).mock.calls[
            (mockNamespace.to as jest.Mock).mock.calls.length - 1
          ];
          const room = roomCall[0];
          roomEmittedEvents.push({ room, event, data });
        }),
      }),
    } as any;

    // Setup Supabase mock
    mockSingle = jest.fn();
    mockEq = jest.fn();
    mockSelect = jest.fn();
    mockUpdate = jest.fn();
    mockFrom = jest.fn();

    mockSupabaseClient = {
      from: mockFrom,
      rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
    };

    // Mock getSupabase

    mockedGetSupabase.mockReturnValue(mockSupabaseClient);
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('disconnection grace period', () => {
    it('should start 30s grace period and notify opponent on disconnect', async () => {
      // RED: Test should fail - handler doesn't exist yet

      // Mock active realtime duel
      const activeDuel = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        status: 'active',
        duel_type: 'realtime',
        challenger_id: 'user-1',
        opponent_id: 'user-2',
      };

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          or: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: activeDuel,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });

      // Register handlers
      registerDisconnectionHandlers(mockNamespace as Namespace, mockSocket as DuelSocket);

      // Get the disconnecting handler
      const disconnectingHandler = (mockSocket.on as jest.Mock).mock.calls.find(
        (call) => call[0] === 'disconnecting'
      )?.[1];

      expect(disconnectingHandler).toBeDefined();

      // Trigger disconnect
      await disconnectingHandler();

      // Verify opponent notified
      const disconnectedEvent = roomEmittedEvents.find(
        (e) => e.event === 'duel:opponent-disconnected'
      );
      expect(disconnectedEvent).toBeDefined();
      expect(disconnectedEvent?.room).toBe('duel:550e8400-e29b-41d4-a716-446655440001');
      expect(disconnectedEvent?.data).toEqual({
        opponentId: 'user-1',
        gracePeriodSeconds: 30,
      });

      // Verify timer started (don't advance yet)
      expect(jest.getTimerCount()).toBe(1);
    });

    it('should auto-forfeit after 30s if player does not reconnect', async () => {
      // RED: Test should fail

      const activeDuel = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        status: 'active',
        duel_type: 'realtime',
        challenger_id: 'user-1',
        opponent_id: 'user-2',
      };

      // Mock duel query for disconnection
      mockFrom.mockImplementation((table: string) => {
        if (table === 'student_duels') {
          // First call: fetch duel on disconnect
          // Second call: atomic forfeit update
          const callCount = mockFrom.mock.calls.filter(c => c[0] === 'student_duels').length;

          if (callCount === 1) {
            return {
              select: jest.fn().mockReturnValue({
                or: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                      single: jest.fn().mockResolvedValue({
                        data: activeDuel,
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
            };
          } else {
            // Atomic forfeit update: .eq(id).eq(status).eq(xp_awarded).select()
            return {
              update: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                      select: jest.fn().mockResolvedValue({
                        data: [{ ...activeDuel, status: 'forfeited' }],
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
            };
          }
        }
        return {};
      });

      registerDisconnectionHandlers(mockNamespace as Namespace, mockSocket as DuelSocket);

      const disconnectingHandler = (mockSocket.on as jest.Mock).mock.calls.find(
        (call) => call[0] === 'disconnecting'
      )?.[1];

      await disconnectingHandler();

      // Clear previous events
      roomEmittedEvents.length = 0;

      // Advance timer by 30 seconds
      await jest.advanceTimersByTimeAsync(30000);

      // Verify forfeit occurred
      const completedEvent = roomEmittedEvents.find(
        (e) => e.event === 'duel:completed'
      );
      expect(completedEvent).toBeDefined();
      expect(completedEvent?.data).toEqual({
        winnerId: 'user-2', // Opponent wins
        reason: 'opponent_disconnected',
      });

      // Verify XP awarded
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('award_education_xp', {
        p_student_id: 'user-2',
        p_xp_amount: 250, // DUEL_WIN_REALTIME
      });
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('award_education_xp', {
        p_student_id: 'user-1',
        p_xp_amount: 150, // DUEL_LOSS_REALTIME
      });
    });

    it('should not start grace period for non-realtime duel', async () => {
      // RED: Test should fail

      // Mock no active realtime duel (player not in realtime game)
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          or: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });

      registerDisconnectionHandlers(mockNamespace as Namespace, mockSocket as DuelSocket);

      const disconnectingHandler = (mockSocket.on as jest.Mock).mock.calls.find(
        (call) => call[0] === 'disconnecting'
      )?.[1];

      await disconnectingHandler();

      // Verify no timer started
      expect(jest.getTimerCount()).toBe(0);

      // Verify no opponent notification
      const disconnectedEvent = roomEmittedEvents.find(
        (e) => e.event === 'duel:opponent-disconnected'
      );
      expect(disconnectedEvent).toBeUndefined();
    });
  });

  describe('reconnection', () => {
    it('should cancel grace period timer on reconnection', async () => {
      // RED: Test should fail

      const activeDuel = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        status: 'active',
        duel_type: 'realtime',
        challenger_id: 'user-1',
        opponent_id: 'user-2',
        board_state: [['A', 'B'], ['C', 'D']],
      };

      // Setup for disconnection
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          or: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: activeDuel,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });

      registerDisconnectionHandlers(mockNamespace as Namespace, mockSocket as DuelSocket);

      const disconnectingHandler = (mockSocket.on as jest.Mock).mock.calls.find(
        (call) => call[0] === 'disconnecting'
      )?.[1];

      // Trigger disconnect
      await disconnectingHandler();
      expect(jest.getTimerCount()).toBe(1);

      // Clear events from disconnect
      roomEmittedEvents.length = 0;

      // Mock for reconnection - query active duel
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          or: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: activeDuel,
                error: null,
              }),
            }),
          }),
        }),
      });

      // Trigger reconnection
      await handleReconnection(mockNamespace as Namespace, mockSocket as DuelSocket);

      // Verify timer cancelled
      expect(jest.getTimerCount()).toBe(0);

      // Verify opponent notified of reconnection
      const reconnectedEvent = roomEmittedEvents.find(
        (e) => e.event === 'duel:opponent-reconnected'
      );
      expect(reconnectedEvent).toBeDefined();
      expect(reconnectedEvent?.data).toEqual({
        opponentId: 'user-1',
      });

      // Verify player rejoined room
      expect(mockSocket.join).toHaveBeenCalledWith('duel:550e8400-e29b-41d4-a716-446655440001');

      // Verify state synced to reconnecting player
      const stateSyncedEvent = emittedEvents.find(
        (e) => e.event === 'duel:state-synced'
      );
      expect(stateSyncedEvent).toBeDefined();
    });

    it('should not trigger auto-forfeit after reconnection', async () => {
      // RED: Test should fail

      const activeDuel = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        status: 'active',
        duel_type: 'realtime',
        challenger_id: 'user-1',
        opponent_id: 'user-2',
      };

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          or: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: activeDuel,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });

      registerDisconnectionHandlers(mockNamespace as Namespace, mockSocket as DuelSocket);

      const disconnectingHandler = (mockSocket.on as jest.Mock).mock.calls.find(
        (call) => call[0] === 'disconnecting'
      )?.[1];

      await disconnectingHandler();

      // Reconnect
      await handleReconnection(mockNamespace as Namespace, mockSocket as DuelSocket);

      // Clear events
      roomEmittedEvents.length = 0;

      // Advance timer past 30s
      await jest.advanceTimersByTimeAsync(35000);

      // Verify NO forfeit occurred
      const completedEvent = roomEmittedEvents.find(
        (e) => e.event === 'duel:completed'
      );
      expect(completedEvent).toBeUndefined();
    });
  });

  describe('manual forfeit', () => {
    it('should forfeit duel and award XP on duel:forfeit', async () => {
      // RED: Test should fail

      const payload = {
        duelId: '550e8400-e29b-41d4-a716-446655440001',
      };

      const activeDuel = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        status: 'active',
        duel_type: 'realtime',
        challenger_id: 'user-1',
        opponent_id: 'user-2',
      };

      // Mock fetch active duel
      mockFrom.mockImplementation((table: string) => {
        if (table === 'student_duels') {
          const callCount = mockFrom.mock.calls.filter(c => c[0] === 'student_duels').length;

          if (callCount === 1) {
            // First call: fetch duel
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: activeDuel,
                    error: null,
                  }),
                }),
              }),
            };
          } else {
            // Second call: update to forfeited (needs triple .eq() chain: id, status, xp_awarded)
            return {
              update: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                      select: jest.fn().mockResolvedValue({
                        data: [{ ...activeDuel, status: 'forfeited' }],
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
            };
          }
        }
        return {};
      });

      registerDisconnectionHandlers(mockNamespace as Namespace, mockSocket as DuelSocket);

      const forfeitHandler = (mockSocket.on as jest.Mock).mock.calls.find(
        (call) => call[0] === 'duel:forfeit'
      )?.[1];

      expect(forfeitHandler).toBeDefined();

      await forfeitHandler(payload);

      // Verify forfeit event emitted
      const completedEvent = roomEmittedEvents.find(
        (e) => e.event === 'duel:completed'
      );
      expect(completedEvent).toBeDefined();
      expect(completedEvent?.data).toEqual({
        winnerId: 'user-2', // Opponent wins
        reason: 'forfeit',
        forfeitedBy: 'user-1',
      });

      // Verify XP awarded
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('award_education_xp', {
        p_student_id: 'user-2',
        p_xp_amount: 250, // DUEL_WIN_REALTIME
      });
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('award_education_xp', {
        p_student_id: 'user-1',
        p_xp_amount: 150, // DUEL_LOSS_REALTIME (same as loss)
      });
    });

    it('should reject forfeit if duel not active', async () => {
      // RED: Test should fail

      const payload = {
        duelId: '550e8400-e29b-41d4-a716-446655440001',
      };

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: '550e8400-e29b-41d4-a716-446655440001',
                status: 'completed',
                challenger_id: 'user-1',
                opponent_id: 'user-2',
              },
              error: null,
            }),
          }),
        }),
      });

      registerDisconnectionHandlers(mockNamespace as Namespace, mockSocket as DuelSocket);

      const forfeitHandler = (mockSocket.on as jest.Mock).mock.calls.find(
        (call) => call[0] === 'duel:forfeit'
      )?.[1];

      await forfeitHandler(payload);

      // Verify error emitted
      const errorEvent = emittedEvents.find((e) => e.event === 'duel:error');
      expect(errorEvent).toBeDefined();
      expect(errorEvent?.data.message).toContain('not active');
    });

    it('should reject forfeit if user not a participant', async () => {
      // RED: Test should fail

      const payload = {
        duelId: '550e8400-e29b-41d4-a716-446655440001',
      };

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: '550e8400-e29b-41d4-a716-446655440001',
                status: 'active',
                challenger_id: 'other-user-1',
                opponent_id: 'other-user-2',
              },
              error: null,
            }),
          }),
        }),
      });

      registerDisconnectionHandlers(mockNamespace as Namespace, mockSocket as DuelSocket);

      const forfeitHandler = (mockSocket.on as jest.Mock).mock.calls.find(
        (call) => call[0] === 'duel:forfeit'
      )?.[1];

      await forfeitHandler(payload);

      // Verify error emitted
      const errorEvent = emittedEvents.find((e) => e.event === 'duel:error');
      expect(errorEvent).toBeDefined();
      expect(errorEvent?.data.message).toContain('not a participant');
    });

    it('should reject forfeit with invalid payload', async () => {
      // RED: Test should fail

      const payload = {
        duelId: 'invalid-uuid',
      };

      registerDisconnectionHandlers(mockNamespace as Namespace, mockSocket as DuelSocket);

      const forfeitHandler = (mockSocket.on as jest.Mock).mock.calls.find(
        (call) => call[0] === 'duel:forfeit'
      )?.[1];

      await forfeitHandler(payload);

      // Verify error emitted
      const errorEvent = emittedEvents.find((e) => e.event === 'duel:error');
      expect(errorEvent).toBeDefined();
      expect(errorEvent?.data.message).toContain('Invalid');
    });
  });
});
