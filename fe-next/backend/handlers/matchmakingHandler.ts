/**
 * Matchmaking Handler
 * Wires MatchmakingQueue into Socket.IO events.
 *
 * Server derives playerId + ELO; clients cannot spoof eligibility.
 * Ranked unlock mirrors client canPlayRanked: unlocked_at OR ≥10 casual games.
 */

import type { Server, Socket } from 'socket.io';
import { z } from 'zod';
import { MatchmakingQueue } from '../services/matchmakingQueue.js';
import logger from '../utils/logger.js';
import { checkRateLimit } from '../utils/rateLimiter.js';
import { validatePayload } from '../utils/socketValidation.js';
import { getSupabase } from '../modules/supabase/client.js';
import { DEFAULT_RATING } from '@/shared/utils/eloRating';
import { getTierFromElo } from '@/lib/ranked/tiers';

const MATCH_INTERVAL_MS = 2000;
const TIMEOUT_MS = 60000;
const CASUAL_GAMES_TO_UNLOCK = 10;

/** Process-wide queue so players on different sockets can match. */
export const sharedMatchmakingQueue = new MatchmakingQueue();

const joinMatchmakingSchema = z.object({
  gameMode: z.string().min(1).max(64),
  language: z.string().min(2).max(10),
});

type JoinMatchmakingData = z.infer<typeof joinMatchmakingSchema>;

async function isRankedEligible(playerId: string): Promise<boolean> {
  try {
    const client = getSupabase();
    if (!client) {
      // Fail closed when we cannot verify progress — do not open ranked to everyone.
      logger.warn('MATCHMAKING', `No Supabase client; denying ranked for ${playerId}`);
      return false;
    }
    const { data } = await client
      .from('ranked_progress')
      .select('casual_games_played, unlocked_at')
      .eq('player_id', playerId)
      .maybeSingle();
    if (!data) return false;
    if (data.unlocked_at) return true;
    return (data.casual_games_played || 0) >= CASUAL_GAMES_TO_UNLOCK;
  } catch (err) {
    logger.warn('MATCHMAKING', `Eligibility check failed for ${playerId}: ${err}`);
    return false;
  }
}

function opponentPayload(entry: { playerId: string; elo: number }) {
  const tier = getTierFromElo(entry.elo);
  return {
    username: entry.playerId,
    elo: entry.elo,
    tier: tier?.id ?? 'bronze',
  };
}

export function registerMatchmakingHandlers(
  io: Server,
  socket: Socket,
  queue: MatchmakingQueue = sharedMatchmakingQueue,
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
    cleanup();

    if (!checkRateLimit(socket.id)) {
      socket.emit('matchmakingError', { error: 'RATE_LIMITED', message: 'Too many requests' });
      return;
    }

    const verifiedUserId = (socket.data as Record<string, unknown>)?.verifiedUserId as string | undefined;
    const fallbackUserId = socket.handshake.auth?.authUserId as string | undefined;
    if (!verifiedUserId && !fallbackUserId) {
      socket.emit('matchmakingError', { error: 'UNAUTHORIZED', message: 'Authentication required' });
      return;
    }

    if (!verifiedUserId && fallbackUserId) {
      logger.warn('MATCHMAKING', `Socket ${socket.id} using unverified fallback authUserId`);
    }

    const playerId = verifiedUserId ?? fallbackUserId!;

    const eligible = await isRankedEligible(playerId);
    if (!eligible) {
      socket.emit('matchmakingError', {
        error: 'NOT_ELIGIBLE',
        message: 'Play 10 casual multiplayer games to unlock ranked',
      });
      return;
    }

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

    const validation = validatePayload(joinMatchmakingSchema, rawData);
    if (!validation.success) {
      socket.emit('matchmakingError', { error: 'INVALID_PAYLOAD', message: validation.error });
      return;
    }

    const { gameMode, language } = validation.data as JoinMatchmakingData;

    queue.joinQueue(socket.id, playerId, elo, gameMode as 'classic' | 'wordHunt', language);

    logger.info('MATCHMAKING', `Player ${playerId} joined queue (elo=${elo}, mode=${gameMode})`);

    const stats = queue.getQueueStats();
    socket.emit('matchmakingUpdate', {
      queueSize: stats.playersInQueue,
      eloRange: queue.getEntryEloRange(socket.id),
    });

    matchInterval = setInterval(() => {
      try {
        const match = queue.tryMatch(socket.id);
        if (match) {
          cleanup();

          io.to(match.player1.socketId).emit('matchFound', {
            roomId: match.roomId,
            role: 'host',
            opponent: opponentPayload(match.player2),
          });

          io.to(match.player2.socketId).emit('matchFound', {
            roomId: match.roomId,
            role: 'joiner',
            opponent: opponentPayload(match.player1),
          });

          logger.info('MATCHMAKING', `Match found: ${match.player1.playerId} vs ${match.player2.playerId} → ${match.roomId}`);
          return;
        }

        const currentStats = queue.getQueueStats();
        socket.emit('matchmakingUpdate', {
          queueSize: currentStats.playersInQueue,
          eloRange: queue.getEntryEloRange(socket.id),
        });
      } catch (err) {
        logger.error('MATCHMAKING', `Interval error for player ${playerId}: ${err}`);
        cleanup();
        socket.emit('matchmakingError', { error: 'INTERNAL_ERROR', message: 'Matchmaking failed' });
      }
    }, MATCH_INTERVAL_MS);

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
