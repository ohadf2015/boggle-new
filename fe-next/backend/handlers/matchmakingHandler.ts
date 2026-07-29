/**
 * Matchmaking Handler
 * Wires MatchmakingQueue into Socket.IO events.
 */

import type { Server, Socket } from 'socket.io';
import { z } from 'zod';
import { MatchmakingQueue } from '../services/matchmakingQueue.js';
import logger from '../utils/logger.js';
import { checkRateLimit } from '../utils/rateLimiter.js';
import { validatePayload } from '../utils/socketValidation.js';
import { getSupabase } from '../modules/supabase/client.js';
import { DEFAULT_RATING } from '@/shared/utils/eloRating';

const MATCH_INTERVAL_MS = 2000;
const TIMEOUT_MS = 60000;

// SEC-007: Zod schema for joinMatchmaking payload (elo/playerId ignored — derived server-side)
const joinMatchmakingSchema = z.object({
  gameMode: z.string().min(1).max(64),
  language: z.string().min(2).max(10),
});

type JoinMatchmakingData = z.infer<typeof joinMatchmakingSchema>;

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

  socket.on('joinMatchmaking', async (rawData: unknown) => {
    // SEC-008: Clear any existing timers/queue entry before creating new ones
    cleanup();

    // SEC-007: Rate limiting
    if (!checkRateLimit(socket.id)) {
      socket.emit('matchmakingError', { error: 'RATE_LIMITED', message: 'Too many requests' });
      return;
    }

    // SEC-007: Auth check — require a verified or handshake user id
    const verifiedUserId = (socket.data as Record<string, unknown>)?.verifiedUserId as string | undefined;
    const fallbackUserId = socket.handshake.auth?.authUserId as string | undefined;
    if (!verifiedUserId && !fallbackUserId) {
      socket.emit('matchmakingError', { error: 'UNAUTHORIZED', message: 'Authentication required' });
      return;
    }

    if (!verifiedUserId && fallbackUserId) {
      logger.warn('MATCHMAKING', `Socket ${socket.id} using unverified fallback authUserId — JWT verification may be missing`);
    }

    // SEC-001: Use server-side player id, never trust client-supplied playerId
    const playerId = verifiedUserId ?? fallbackUserId!;

    // SEC-001: Fetch real ELO from Supabase — ignore any client-supplied value.
    let elo = DEFAULT_RATING;
    try {
      const client = getSupabase();
      if (client) {
        const { data } = await client
          .from('profiles')
          .select('ranked_mmr')
          .eq('id', playerId)
          .single();
        if (data?.ranked_mmr) elo = data.ranked_mmr;
      }
    } catch (err) {
      logger.warn('MATCHMAKING', `Failed to fetch ELO for ${playerId}, using default: ${err}`);
    }

    // SEC-007: Zod validation
    const validation = validatePayload(joinMatchmakingSchema, rawData);
    if (!validation.success) {
      socket.emit('matchmakingError', { error: 'INVALID_PAYLOAD', message: validation.error });
      return;
    }

    const { gameMode, language } = validation.data as JoinMatchmakingData;

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
      // BE-006: Wrap interval body in try/catch to prevent interval leak on unhandled error
      try {
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
      } catch (err) {
        logger.error('MATCHMAKING', `Interval error for player ${playerId}: ${err}`);
        cleanup();
        socket.emit('matchmakingError', { error: 'INTERNAL_ERROR', message: 'Matchmaking failed' });
      }
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
