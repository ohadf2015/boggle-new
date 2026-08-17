/**
 * WordCraft Multiplayer Handler
 * Wires Socket.IO events to WordCraft match manager.
 * Server-authoritative: all moves validated server-side.
 */

import type { Server, Socket } from 'socket.io';
import { z } from 'zod';
import logger from '../utils/logger.js';
import { checkRateLimit } from '../utils/rateLimiter.js';
import { validatePayload } from '../utils/socketValidation.js';
import { broadcastToRoom, getGameRoom } from '../utils/socketHelpers.js';
import {
  initializeWordCraftMatch,
  getMatchState,
  submitWordCraftMove,
  submitWordCraftPass,
  endWordCraftMatch,
  getRemainingTurnTime,
} from '../modules/wordcraftManager.js';
import { getCachedTrie } from '../modules/boggleSolver.js';
import type { WordCraftPlacement } from '@/shared/types/wordcraft';
import type { PlacedTile, RackTile } from '@/lib/word-craft/types';

// Payload schemas
const submitMoveSchema = z.object({
  placements: z.array(
    z.object({
      tileId: z.string(),
      pos: z.object({ row: z.number(), col: z.number() }),
      letter: z.string(),
    })
  ),
  rack: z.array(z.object({ id: z.string(), letter: z.string() })),
});

const submitPassSchema = z.object({});

const requestStateSchema = z.object({});

type SubmitMovePayload = z.infer<typeof submitMoveSchema>;

// Map roomId → { player1SocketId, player2SocketId, started }
const roomSeats = new Map<string, { player1SocketId?: string; player2SocketId?: string; started: boolean }>();

export function registerWordCraftHandlers(io: Server, socket: Socket): void {
  const socketId = socket.id;
  let currentRoomId: string | null = null;
  let currentPlayer: 'player1' | 'player2' | null = null;

  // Track socket's room and assign seats
  socket.on('joinWordCraftRoom', (data: unknown) => {
    if (!checkRateLimit(socketId)) {
      socket.emit('wordcraftError', { error: 'RATE_LIMITED' });
      return;
    }

    const validation = validatePayload(z.object({ roomId: z.string(), username: z.string() }), data);
    if (!validation.success) {
      socket.emit('wordcraftError', { error: 'INVALID_PAYLOAD', message: validation.error });
      return;
    }

    const { roomId, username } = validation.data as { roomId: string; username: string };
    currentRoomId = roomId;

    socket.join(getGameRoom(roomId));

    // Assign seat (player1 or player2) based on who joined first
    let seats = roomSeats.get(roomId);
    if (!seats) {
      seats = { started: false };
      roomSeats.set(roomId, seats);
    }

    if (!seats.player1SocketId) {
      seats.player1SocketId = socketId;
      currentPlayer = 'player1';
      logger.info('WORDCRAFT', `Socket ${socketId} assigned player1 in room ${roomId}`);
    } else if (!seats.player2SocketId) {
      seats.player2SocketId = socketId;
      currentPlayer = 'player2';
      logger.info('WORDCRAFT', `Socket ${socketId} assigned player2 in room ${roomId}`);
    } else {
      socket.emit('wordcraftError', { error: 'ROOM_FULL' });
      return;
    }

    // Create match if it doesn't exist (first player joins)
    let state = getMatchState(roomId);
    if (!state) {
      try {
        const player1Username = currentPlayer === 'player1' ? username : 'Player 1';
        const player2Username = currentPlayer === 'player2' ? username : 'Player 2';

        // Create empty 6x6 board
        const board: PlacedTile[][] = Array(6).fill(null).map(() => Array(6).fill(null));

        // Create tile bag with 100 tiles
        const bag: RackTile[] = Array.from({ length: 100 }, (_, i) => ({
          id: `tile-${i}`,
          letter: String.fromCharCode(65 + (i % 26)),
          value: 1,
          isBlank: false,
        }));

        state = initializeWordCraftMatch({
          roomId,
          player1Username,
          player2Username,
          board,
          bag,
          turnDeadlineMs: 60000,
        });
        logger.info('WORDCRAFT', `Created new match in room ${roomId}`);
      } catch (err) {
        logger.error('WORDCRAFT', `Failed to create match: ${err}`);
        socket.emit('wordcraftError', { error: 'MATCH_CREATION_FAILED' });
        return;
      }
    }

    // Send current state to the joining player
    if (state) {
      socket.emit('wordcraftState', {
        board: state.board,
        player1: {
          username: state.player1.username,
          score: state.player1.score,
          rackCount: state.player1.rack.length,
        },
        player2: {
          username: state.player2.username,
          score: state.player2.score,
          rackCount: state.player2.rack.length,
        },
        turn: state.turn,
        gameStatus: state.gameStatus,
        remainingTime: getRemainingTurnTime(roomId),
        yourSeat: currentPlayer,
      });
    }
  });

  // Submit a move (place tiles)
  socket.on('submitWordCraftMove', async (rawData: unknown) => {
    if (!currentRoomId || !currentPlayer || !checkRateLimit(socketId)) {
      socket.emit('wordcraftError', { error: 'RATE_LIMITED' });
      return;
    }

    const validation = validatePayload(submitMoveSchema, rawData);
    if (!validation.success) {
      socket.emit('wordcraftError', { error: 'INVALID_PAYLOAD', message: validation.error });
      return;
    }

    const { placements, rack } = validation.data as SubmitMovePayload;

    try {
      // Word validator using cached trie (Shiritori pattern)
      const wordValidator = async (word: string) => {
        const trie = getCachedTrie('en'); // TODO: use game language
        if (!trie) return false;
        let node = trie as any;
        for (const char of word.toLowerCase()) {
          node = node[char];
          if (!node) return false;
        }
        return !!(node && node.isWord === true);
      };

      const result = await submitWordCraftMove(
        currentRoomId,
        currentPlayer,
        placements,
        rack,
        wordValidator
      );

      if (result.valid) {
        const state = getMatchState(currentRoomId);
        if (state) {
          // Broadcast move acceptance to room
          broadcastToRoom(io, getGameRoom(currentRoomId), 'wordcraftMoveAccepted', {
            placements,
            score: result.score,
            scoredWords: result.scoredWords,
            newTurn: state.turn,
            remainingTime: getRemainingTurnTime(currentRoomId),
          });
        }
      } else {
        socket.emit('wordcraftError', { error: result.error });
      }
    } catch (err) {
      logger.error('WORDCRAFT', `Move validation error: ${err}`);
      socket.emit('wordcraftError', { error: 'MOVE_VALIDATION_ERROR' });
    }
  });

  // Submit a pass
  socket.on('submitWordCraftPass', (rawData: unknown) => {
    if (!currentRoomId || !currentPlayer || !checkRateLimit(socketId)) {
      socket.emit('wordcraftError', { error: 'RATE_LIMITED' });
      return;
    }

    const validation = validatePayload(submitPassSchema, rawData);
    if (!validation.success) {
      socket.emit('wordcraftError', { error: 'INVALID_PAYLOAD' });
      return;
    }

    try {
      const result = submitWordCraftPass(currentRoomId, currentPlayer);

      if (result.valid) {
        const state = getMatchState(currentRoomId);
        if (state) {
          broadcastToRoom(io, getGameRoom(currentRoomId), 'wordcraftPassAccepted', {
            newTurn: state.turn,
            consecutivePasses: state.consecutivePasses,
            gameStatus: state.gameStatus,
            remainingTime: getRemainingTurnTime(currentRoomId),
          });
        }
      } else {
        socket.emit('wordcraftError', { error: result.error });
      }
    } catch (err) {
      logger.error('WORDCRAFT', `Pass error: ${err}`);
      socket.emit('wordcraftError', { error: 'PASS_ERROR' });
    }
  });

  // Request current game state (polling or reconnect)
  socket.on('requestWordCraftState', (rawData: unknown) => {
    if (!currentRoomId) {
      socket.emit('wordcraftError', { error: 'NOT_IN_ROOM' });
      return;
    }

    const validation = validatePayload(requestStateSchema, rawData);
    if (!validation.success) {
      socket.emit('wordcraftError', { error: 'INVALID_PAYLOAD' });
      return;
    }

    const state = getMatchState(currentRoomId);
    if (state) {
      socket.emit('wordcraftState', {
        board: state.board,
        player1: {
          username: state.player1.username,
          score: state.player1.score,
          rackCount: state.player1.rack.length,
        },
        player2: {
          username: state.player2.username,
          score: state.player2.score,
          rackCount: state.player2.rack.length,
        },
        turn: state.turn,
        gameStatus: state.gameStatus,
        winner: state.winner,
        remainingTime: getRemainingTurnTime(currentRoomId),
        yourSeat: currentPlayer,
      });
    }
  });

  socket.on('disconnect', () => {
    if (currentRoomId) {
      logger.info('WORDCRAFT', `Socket ${socketId} disconnected from room ${currentRoomId}`);
      // TODO: pause game briefly, allow reconnect
    }
  });
}
