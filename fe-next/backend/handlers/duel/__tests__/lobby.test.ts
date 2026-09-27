/**
 * Tests for duel lobby handlers
 *
 * Covers:
 * - Join lobby: socket joins room, lobby-state emitted, lobby-update broadcast
 * - Leave lobby: socket leaves room, lobby-update broadcast
 * - Disconnect: cleanup from all lobbies
 * - Multiple students: all receive updates
 */

import { vi, type Mock, type MockInstance } from 'vitest';
import type { Namespace, Socket } from 'socket.io';
import { z } from 'zod';
import { registerLobbyHandlers } from '../lobby';
import type { DuelSocket } from '../types';

// Mock duels module to avoid importing broken server utilities
vi.mock('@/lib/supabase/education/duels', () => ({
  getPendingDuelsForStudent: vi.fn().mockResolvedValue({ data: [], error: null }),
}));

// Valid UUID for testing
const VALID_CLASSROOM_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

describe('Duel Lobby Handlers', () => {
  let mockNamespace: Mocked<Namespace>;
  let mockSocket: Mocked<DuelSocket>;
  let mockRoom: Set<string>;

  beforeEach(() => {
    // Mock room for tracking joins
    mockRoom = new Set<string>();

    // Mock socket
    mockSocket = {
      id: 'socket-123',
      data: {
        userId: 'user-123',
        displayName: 'Test User',
        classroomIds: ['classroom-1'],
      },
      on: vi.fn(),
      emit: vi.fn(),
      join: vi.fn((room: string) => {
        mockRoom.add(room);
        return Promise.resolve();
      }),
      leave: vi.fn((room: string) => {
        mockRoom.delete(room);
        return Promise.resolve();
      }),
      rooms: mockRoom,
    } as unknown as Mocked<DuelSocket>;

    // Mock namespace
    mockNamespace = {
      to: vi.fn().mockReturnThis(),
      emit: vi.fn(),
      sockets: new Map(),
    } as unknown as Mocked<Namespace>;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================
  // Join Lobby Tests
  // ==========================================

  describe('duel:join-lobby', () => {
    it('should register join-lobby handler', () => {
      registerLobbyHandlers(mockNamespace, mockSocket);

      expect(mockSocket.on).toHaveBeenCalledWith(
        'duel:join-lobby',
        expect.any(Function)
      );
    });

    it('should join lobby room when valid classroomId provided', async () => {
      registerLobbyHandlers(mockNamespace, mockSocket);

      // Get the handler
      const handler = (mockSocket.on as Mock).mock.calls.find(
        (call) => call[0] === 'duel:join-lobby'
      )?.[1];

      // Call handler with valid UUID
      const classroomId = VALID_CLASSROOM_ID;
      await handler({ classroomId });

      expect(mockSocket.join).toHaveBeenCalledWith(`duel:lobby:${classroomId}`);
    });

    it('should emit lobby-state to joining socket', async () => {
      registerLobbyHandlers(mockNamespace, mockSocket);

      const handler = (mockSocket.on as Mock).mock.calls.find(
        (call) => call[0] === 'duel:join-lobby'
      )?.[1];

      const classroomId = VALID_CLASSROOM_ID;
      await handler({ classroomId });

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'duel:lobby-state',
        expect.objectContaining({
          availableOpponents: expect.any(Array),
        })
      );
    });

    it('should broadcast lobby-update to room when student joins', async () => {
      registerLobbyHandlers(mockNamespace, mockSocket);

      const handler = (mockSocket.on as Mock).mock.calls.find(
        (call) => call[0] === 'duel:join-lobby'
      )?.[1];

      const classroomId = VALID_CLASSROOM_ID;
      await handler({ classroomId });

      // Verify namespace.to() was called with correct room
      expect(mockNamespace.to).toHaveBeenCalledWith(`duel:lobby:${classroomId}`);
      // Verify emit was called (mockNamespace.to returns mockNamespace)
      expect(mockNamespace.emit).toHaveBeenCalledWith(
        'duel:lobby-update',
        expect.objectContaining({
          availableOpponents: expect.any(Array),
        })
      );
    });

    it('should reject invalid classroomId', async () => {
      registerLobbyHandlers(mockNamespace, mockSocket);

      const handler = (mockSocket.on as Mock).mock.calls.find(
        (call) => call[0] === 'duel:join-lobby'
      )?.[1];

      await handler({ classroomId: 'invalid-id' });

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'duel:error',
        expect.objectContaining({
          message: expect.stringContaining('Invalid'),
        })
      );
    });

    it('should track multiple students in same lobby', async () => {
      // Use valid UUID for classroom
      const classroomId = VALID_CLASSROOM_ID;

      // Create second socket
      const mockSocket2 = {
        id: 'socket-456',
        data: {
          userId: 'user-456',
          displayName: 'Test User 2',
          classroomIds: [classroomId],
        },
        on: vi.fn(),
        emit: vi.fn(),
        join: vi.fn(),
        rooms: new Set<string>(),
      } as unknown as Mocked<DuelSocket>;

      // Register both sockets
      registerLobbyHandlers(mockNamespace, mockSocket);
      registerLobbyHandlers(mockNamespace, mockSocket2);

      // Get handlers
      const handler1 = (mockSocket.on as Mock).mock.calls.find(
        (call) => call[0] === 'duel:join-lobby'
      )?.[1];
      const handler2 = (mockSocket2.on as Mock).mock.calls.find(
        (call) => call[0] === 'duel:join-lobby'
      )?.[1];

      // Both join lobby
      await handler1({ classroomId });
      await handler2({ classroomId });

      // Second join should show 2 opponents
      const emitCalls = (mockNamespace.emit as Mock).mock.calls;
      const lobbyUpdateCalls = emitCalls.filter(call => call[0] === 'duel:lobby-update');
      const lastUpdate = lobbyUpdateCalls[lobbyUpdateCalls.length - 1];

      expect(lastUpdate).toBeDefined();
      expect(lastUpdate[1].availableOpponents).toHaveLength(2);
    });
  });

  // ==========================================
  // Leave Lobby Tests
  // ==========================================

  describe('duel:leave-lobby', () => {
    it('should register leave-lobby handler', () => {
      registerLobbyHandlers(mockNamespace, mockSocket);

      expect(mockSocket.on).toHaveBeenCalledWith(
        'duel:leave-lobby',
        expect.any(Function)
      );
    });

    it('should leave lobby room', async () => {
      registerLobbyHandlers(mockNamespace, mockSocket);

      const classroomId = VALID_CLASSROOM_ID;

      // Join first
      const joinHandler = (mockSocket.on as Mock).mock.calls.find(
        (call) => call[0] === 'duel:join-lobby'
      )?.[1];
      await joinHandler({ classroomId });

      // Then leave
      const leaveHandler = (mockSocket.on as Mock).mock.calls.find(
        (call) => call[0] === 'duel:leave-lobby'
      )?.[1];
      await leaveHandler({ classroomId });

      expect(mockSocket.leave).toHaveBeenCalledWith(`duel:lobby:${classroomId}`);
    });

    it('should broadcast lobby-update after leaving', async () => {
      registerLobbyHandlers(mockNamespace, mockSocket);

      const classroomId = VALID_CLASSROOM_ID;

      // Join first
      const joinHandler = (mockSocket.on as Mock).mock.calls.find(
        (call) => call[0] === 'duel:join-lobby'
      )?.[1];
      await joinHandler({ classroomId });

      // Clear previous calls
      (mockNamespace.emit as Mock).mockClear();
      (mockNamespace.to as Mock).mockClear();

      // Then leave
      const leaveHandler = (mockSocket.on as Mock).mock.calls.find(
        (call) => call[0] === 'duel:leave-lobby'
      )?.[1];
      await leaveHandler({ classroomId });

      expect(mockNamespace.to).toHaveBeenCalledWith(`duel:lobby:${classroomId}`);
      expect(mockNamespace.emit).toHaveBeenCalledWith(
        'duel:lobby-update',
        expect.objectContaining({
          availableOpponents: expect.any(Array),
        })
      );
    });
  });

  // ==========================================
  // Disconnect Tests
  // ==========================================

  describe('disconnect', () => {
    it('should register disconnect handler', () => {
      registerLobbyHandlers(mockNamespace, mockSocket);

      expect(mockSocket.on).toHaveBeenCalledWith(
        'disconnect',
        expect.any(Function)
      );
    });

    it('should remove from all lobbies on disconnect', async () => {
      registerLobbyHandlers(mockNamespace, mockSocket);

      const classroomId = VALID_CLASSROOM_ID;

      // Join lobby
      const joinHandler = (mockSocket.on as Mock).mock.calls.find(
        (call) => call[0] === 'duel:join-lobby'
      )?.[1];
      await joinHandler({ classroomId });

      // Clear previous calls
      (mockNamespace.emit as Mock).mockClear();
      (mockNamespace.to as Mock).mockClear();

      // Disconnect (synchronous handler, no await)
      const disconnectHandler = (mockSocket.on as Mock).mock.calls.find(
        (call) => call[0] === 'disconnect'
      )?.[1];
      disconnectHandler();

      // Should broadcast lobby-update
      expect(mockNamespace.to).toHaveBeenCalledWith(`duel:lobby:${classroomId}`);
      expect(mockNamespace.emit).toHaveBeenCalledWith(
        'duel:lobby-update',
        expect.objectContaining({
          availableOpponents: expect.any(Array),
        })
      );
    });

    it('should handle disconnect when not in any lobby', () => {
      registerLobbyHandlers(mockNamespace, mockSocket);

      // Disconnect without joining
      const disconnectHandler = (mockSocket.on as Mock).mock.calls.find(
        (call) => call[0] === 'disconnect'
      )?.[1];

      // Should not throw (synchronous handler)
      expect(() => disconnectHandler()).not.toThrow();
    });
  });

  // ==========================================
  // Validation Tests
  // ==========================================

  describe('Payload Validation', () => {
    it('should validate classroomId is a UUID', async () => {
      registerLobbyHandlers(mockNamespace, mockSocket);

      const handler = (mockSocket.on as Mock).mock.calls.find(
        (call) => call[0] === 'duel:join-lobby'
      )?.[1];

      // Invalid UUID
      await handler({ classroomId: 'not-a-uuid' });

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'duel:error',
        expect.objectContaining({
          message: expect.stringContaining('Invalid'),
        })
      );
    });

    it('should handle missing classroomId', async () => {
      registerLobbyHandlers(mockNamespace, mockSocket);

      const handler = (mockSocket.on as Mock).mock.calls.find(
        (call) => call[0] === 'duel:join-lobby'
      )?.[1];

      await handler({});

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'duel:error',
        expect.objectContaining({
          message: expect.stringContaining('Invalid'),
        })
      );
    });
  });
});
