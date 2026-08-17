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
  setWordCraftTimeoutHandler,
  setWordCraftGameOverHandler,
  endWordCraftMatch,
  getRemainingTurnTime,
} from '../modules/wordcraftManager.js';
import { validateWord } from '../modules/wordValidator.js';
import type { WordCraftPlacement } from '@/shared/types/wordcraft';

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

export function registerWordCraftHandlers(io: Server, socket: Socket): void {
  const socketId = socket.id;
  let currentRoomId: string | null = null;

  // Track socket's room
  socket.on('joinWordCraftRoom', (data: unknown) => {
    if (!checkRateLimit(socketId)) {
      socket.emit('wordcraftError', { error: 'RATE_LIMITED' });
      return;
    }

    const validation = validatePayload(z.object({ roomId: z.string() }), data);
    if (!validation.success) {
      socket.emit('wordcraftError', { error: 'INVALID_PAYLOAD', message: validation.error });
      return;
    }

    const { roomId } = validation.data as { roomId: string };
    currentRoomId = roomId;

    socket.join(getGameRoom(roomId));
    logger.info('WORDCRAFT', `Socket ${socketId} joined room ${roomId}`);

    // Send current state to the joining player
    const state = getMatchState(roomId);
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
      });
    }
  });

  // Submit a move (place tiles)
  socket.on('submitWordCraftMove', async (rawData: unknown) => {
    if (!currentRoomId || !checkRateLimit(socketId)) {
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
      const result = await submitWordCraftMove(
        currentRoomId,
        'player1', // TODO: map socket to player1/player2
        placements,
        rack,
        async (positions, word) => {
          // Validate word using existing word validator
          return await validateWord(word, 'en'); // TODO: use game language
        }
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
    if (!currentRoomId || !checkRateLimit(socketId)) {
      socket.emit('wordcraftError', { error: 'RATE_LIMITED' });
      return;
    }

    const validation = validatePayload(submitPassSchema, rawData);
    if (!validation.success) {
      socket.emit('wordcraftError', { error: 'INVALID_PAYLOAD' });
      return;
    }

    try {
      const result = submitWordCraftPass(currentRoomId, 'player1'); // TODO: map socket to player

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
