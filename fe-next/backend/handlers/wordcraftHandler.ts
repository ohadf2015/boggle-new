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
  startWordCraftClock,
  getMatchState,
  submitWordCraftMove,
  submitWordCraftPass,
  endWordCraftMatch,
  getRemainingTurnTime,
} from '../modules/wordcraftManager.js';
import { getCachedTrie } from '../modules/boggleSolver.js';
import { createWordCraftBoard, createWordCraftBag } from '@/shared/utils/wordcraftBag.js';
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
// Usernames are recorded alongside the sockets so a player who drops and comes
// back is put in the SAME seat. Without that, if both players vanished the first
// to rejoin would take seat 1 — and seat 1's rack is a different player's tiles.
const roomSeats = new Map<
  string,
  {
    player1SocketId?: string;
    player2SocketId?: string;
    player1Username?: string;
    player2Username?: string;
    started: boolean;
  }
>();

/**
 * Emit fresh game state to both players with their private racks.
 * Called after a move/pass to sync the board, scores, and refilled racks.
 */
function broadcastPrivateWordCraftState(io: Server, roomId: string): void {
  const state = getMatchState(roomId);
  const seats = roomSeats.get(roomId);
  if (!state || !seats) return;

  const room = getGameRoom(roomId);

  // Emit to player1 with their rack
  if (seats.player1SocketId) {
    const socket1 = io.sockets.sockets.get(seats.player1SocketId);
    if (socket1) {
      socket1.emit('wordcraftState', {
        board: state.board,
        player1: {
          username: state.player1.username,
          score: state.player1.score,
          rack: state.player1.rack,
        },
        player2: {
          username: state.player2.username,
          score: state.player2.score,
          rackCount: state.player2.rack.length,
        },
        turn: state.turn,
        gameStatus: state.gameStatus,
        remainingTime: getRemainingTurnTime(roomId),
        yourSeat: 'player1',
      });
    }
  }

  // Emit to player2 with their rack
  if (seats.player2SocketId) {
    const socket2 = io.sockets.sockets.get(seats.player2SocketId);
    if (socket2) {
      socket2.emit('wordcraftState', {
        board: state.board,
        player1: {
          username: state.player1.username,
          score: state.player1.score,
          rackCount: state.player1.rack.length,
        },
        player2: {
          username: state.player2.username,
          score: state.player2.score,
          rack: state.player2.rack,
        },
        turn: state.turn,
        gameStatus: state.gameStatus,
        remainingTime: getRemainingTurnTime(roomId),
        yourSeat: 'player2',
      });
    }
  }
}

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

    // A returning player reclaims their own seat before any free seat is handed
    // out, so a reconnect can never drop someone into the opponent's rack.
    const reclaim: 'player1' | 'player2' | null =
      !seats.player1SocketId && seats.player1Username === username
        ? 'player1'
        : !seats.player2SocketId && seats.player2Username === username
          ? 'player2'
          : null;

    if (reclaim === 'player1' || (!reclaim && !seats.player1SocketId)) {
      seats.player1SocketId = socketId;
      seats.player1Username = username;
      currentPlayer = 'player1';
      logger.info(
        'WORDCRAFT',
        `Socket ${socketId} ${reclaim ? 'reclaimed' : 'assigned'} player1 in room ${roomId}`,
      );
    } else if (reclaim === 'player2' || !seats.player2SocketId) {
      seats.player2SocketId = socketId;
      seats.player2Username = username;
      currentPlayer = 'player2';
      logger.info(
        'WORDCRAFT',
        `Socket ${socketId} ${reclaim ? 'reclaimed' : 'assigned'} player2 in room ${roomId}`,
      );
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

        // Create real 13x13 board and properly distributed tile bag
        const board = createWordCraftBoard(13);
        const bag = createWordCraftBag(Date.now());

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

    // Both seats filled → now the turn clock may run. Before this point the
    // first player is alone and must not be able to forfeit on time.
    if (state && seats.player1SocketId && seats.player2SocketId && !seats.started) {
      seats.started = true;
      startWordCraftClock(roomId);
      logger.info('WORDCRAFT', `Both seats filled in room ${roomId} — turn clock started`);
    }

    // Send current state to the joining player
    // Only send your own rack for security (opponent can't see your tiles)
    if (state) {
      const yourRack = currentPlayer === 'player1' ? state.player1.rack : state.player2.rack;
      socket.emit('wordcraftState', {
        board: state.board,
        player1: {
          username: state.player1.username,
          score: state.player1.score,
          rack: currentPlayer === 'player1' ? state.player1.rack : [],
        },
        player2: {
          username: state.player2.username,
          score: state.player2.score,
          rack: currentPlayer === 'player2' ? state.player2.rack : [],
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
          // Emit fresh state to both players with their private racks and opponent counts
          broadcastPrivateWordCraftState(io, currentRoomId);
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
          // Emit fresh state to both players with their private racks
          broadcastPrivateWordCraftState(io, currentRoomId);
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
          rack: currentPlayer === 'player1' ? state.player1.rack : [],
        },
        player2: {
          username: state.player2.username,
          score: state.player2.score,
          rack: currentPlayer === 'player2' ? state.player2.rack : [],
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
    if (!currentRoomId) return;

    // Release the seat, keep the match. Seats used to be held forever, so a
    // player who refreshed was told ROOM_FULL and locked out of their own game.
    // The match state itself survives on purpose — rejoining must land back on
    // the same board.
    const seats = roomSeats.get(currentRoomId);
    if (seats) {
      if (seats.player1SocketId === socketId) seats.player1SocketId = undefined;
      if (seats.player2SocketId === socketId) seats.player2SocketId = undefined;
    }
    logger.info('WORDCRAFT', `Socket ${socketId} left room ${currentRoomId} — seat released`);
  });
}
