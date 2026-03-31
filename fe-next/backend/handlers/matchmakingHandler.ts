/**
 * Matchmaking Handler
 * Wires MatchmakingQueue into Socket.IO events.
 */

import type { Server, Socket } from 'socket.io';
import { MatchmakingQueue } from '../services/matchmakingQueue.js';
import logger from '../utils/logger.js';

const MATCH_INTERVAL_MS = 2000;
const TIMEOUT_MS = 60000;

interface JoinMatchmakingData {
  gameMode: string;
  language: string;
  elo: number;
  playerId: string;
}

export function registerMatchmakingHandlers(
  io: Server,
  socket: Socket,
  queue: MatchmakingQueue
): void {
  let matchInterval: ReturnType<typeof setInterval> | null = null;
  let timeoutTimer: ReturnType<typeof setTimeout> | null = null;

  function cleanup() {
    if (matchInterval) {
      clearInterval(matchInterval);
      matchInterval = null;
    }
    if (timeoutTimer) {
      clearTimeout(timeoutTimer);
      timeoutTimer = null;
    }
    queue.leaveQueue(socket.id);
  }

  socket.on('joinMatchmaking', (data: JoinMatchmakingData) => {
    const { gameMode, language, elo, playerId } = data;

    queue.joinQueue(socket.id, playerId, elo, gameMode as any, language);

    logger.info('MATCHMAKING', `Player ${playerId} joined queue (elo=${elo}, mode=${gameMode})`);

    // Send initial stats
    const stats = queue.getQueueStats();
    socket.emit('matchmakingUpdate', {
      playersInQueue: stats.playersInQueue,
      estimatedWait: stats.avgWaitTime,
      currentRange: queue.getEntryEloRange(socket.id),
    });

    // Start periodic matching
    matchInterval = setInterval(() => {
      const match = queue.tryMatch(socket.id);
      if (match) {
        cleanup();

        // Emit to both players
        io.to(match.player1.socketId).emit('matchFound', {
          roomId: match.roomId,
          opponent: {
            name: match.player2.playerId,
            elo: match.player2.elo,
          },
        });

        io.to(match.player2.socketId).emit('matchFound', {
          roomId: match.roomId,
          opponent: {
            name: match.player1.playerId,
            elo: match.player1.elo,
          },
        });

        logger.info('MATCHMAKING', `Match found: ${match.player1.playerId} vs ${match.player2.playerId} → ${match.roomId}`);
        return;
      }

      // Send periodic update
      const currentStats = queue.getQueueStats();
      socket.emit('matchmakingUpdate', {
        playersInQueue: currentStats.playersInQueue,
        estimatedWait: currentStats.avgWaitTime,
        currentRange: queue.getEntryEloRange(socket.id),
      });
    }, MATCH_INTERVAL_MS);

    // Timeout after 60s
    timeoutTimer = setTimeout(() => {
      socket.emit('matchmakingTimeout');
      cleanup();
      logger.info('MATCHMAKING', `Player ${playerId} timed out`);
    }, TIMEOUT_MS);
  });

  socket.on('leaveMatchmaking', () => {
    cleanup();
  });

  socket.on('disconnect', () => {
    cleanup();
  });
}
