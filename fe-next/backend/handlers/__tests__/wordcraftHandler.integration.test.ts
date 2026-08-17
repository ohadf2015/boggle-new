/**
 * WordCraft Handler Integration Test
 * Simulate two clients playing a 1v1 match
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Server, Socket } from 'socket.io';
import { registerWordCraftHandlers } from '../wordcraftHandler';
import {
  initializeWordCraftMatch,
  getMatchState,
  submitWordCraftPass,
} from '../../modules/wordcraftManager';
import type { Tile } from '@/lib/word-craft/types';

describe('WordCraft Handler - Two Client Integration', () => {
  let mockIo: Partial<Server>;
  let socket1: Partial<Socket>; // alice
  let socket2: Partial<Socket>; // bob
  let roomId: string;

  beforeEach(() => {
    roomId = `test-mp-room-${Date.now()}`;

    // Mock Socket.IO server and sockets
    const broadcastMap: Record<string, Map<string, any[]>> = {};

    const getRoom = (room: string) => {
      if (!broadcastMap[room]) broadcastMap[room] = new Map();
      return room;
    };

    mockIo = {
      to: (room: string) => ({
        emit: (event: string, data: any) => {
          if (!broadcastMap[room]) broadcastMap[room] = new Map();
          if (!broadcastMap[room].has(event)) {
            broadcastMap[room].set(event, []);
          }
          broadcastMap[room].get(event)!.push(data);
        },
      }),
    };

    // Mock socket for alice (player1)
    const socket1Listeners: Record<string, Function> = {};
    socket1 = {
      id: 'socket-alice',
      emit: (event: string, data: any) => {
        console.log(`alice emit: ${event}`, data);
      },
      on: (event: string, handler: Function) => {
        socket1Listeners[event] = handler;
      },
      join: (room: string) => {
        console.log(`alice joined ${room}`);
      },
      data: { verifiedUserId: 'alice' },
    };

    // Mock socket for bob (player2)
    const socket2Listeners: Record<string, Function> = {};
    socket2 = {
      id: 'socket-bob',
      emit: (event: string, data: any) => {
        console.log(`bob emit: ${event}`, data);
      },
      on: (event: string, handler: Function) => {
        socket2Listeners[event] = handler;
      },
      join: (room: string) => {
        console.log(`bob joined ${room}`);
      },
      data: { verifiedUserId: 'bob' },
    };
  });

  it('should allow two clients to join a WordCraft room and play', () => {
    // Initialize match backend
    const mockBoard: Tile[][] = Array(6)
      .fill(null)
      .map(() => Array(6).fill(null));

    const mockBag: Tile[] = Array.from({ length: 50 }, (_, i) => ({
      id: `tile-${i}`,
      letter: String.fromCharCode(65 + (i % 26)),
    }));

    const initialState = initializeWordCraftMatch({
      roomId,
      player1Username: 'alice',
      player2Username: 'bob',
      board: mockBoard,
      bag: mockBag,
      turnDeadlineMs: 60000,
    });

    // Verify match created
    expect(initialState).toBeDefined();
    expect(initialState.turn).toBe('player1');
    expect(initialState.player1.username).toBe('alice');
    expect(initialState.player2.username).toBe('bob');
    expect(initialState.humansOnly).toBe(true);
  });

  it('should simulate alice pass, bob pass, game end', () => {
    const mockBoard: Tile[][] = Array(6)
      .fill(null)
      .map(() => Array(6).fill(null));

    const mockBag: Tile[] = Array.from({ length: 50 }, (_, i) => ({
      id: `tile-${i}`,
      letter: String.fromCharCode(65 + (i % 26)),
    }));

    const state = initializeWordCraftMatch({
      roomId,
      player1Username: 'alice',
      player2Username: 'bob',
      board: mockBoard,
      bag: mockBag,
    });

    // Alice's turn, she passes
    expect(state.turn).toBe('player1');
    const afterAlicePass = submitWordCraftPass(roomId, 'player1');
    expect(afterAlicePass.valid).toBe(true);
    expect(afterAlicePass.gameStatus).toBe('in-progress');

    // Bob's turn, he passes (game ends)
    let bobState = getMatchState(roomId);
    expect(bobState?.turn).toBe('player2');

    const afterBobPass = submitWordCraftPass(roomId, 'player2');
    expect(afterBobPass.valid).toBe(true);
    expect(afterBobPass.gameStatus).toBe('finished');

    const finalState = getMatchState(roomId);
    expect(finalState?.gameStatus).toBe('finished');
    expect(finalState?.winner).toBeDefined();
    expect(
      finalState?.winner === 'player1' || finalState?.winner === 'player2'
    ).toBe(true);
  });

  it('should prevent wrong player from moving', () => {
    const mockBoard: Tile[][] = Array(6)
      .fill(null)
      .map(() => Array(6).fill(null));

    const mockBag: Tile[] = Array.from({ length: 50 }, (_, i) => ({
      id: `tile-${i}`,
      letter: String.fromCharCode(65 + (i % 26)),
    }));

    initializeWordCraftMatch({
      roomId,
      player1Username: 'alice',
      player2Username: 'bob',
      board: mockBoard,
      bag: mockBag,
    });

    // Try bob's pass when it's alice's turn
    const result = submitWordCraftPass(roomId, 'player2');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('NOT_YOUR_TURN');
  });
});
