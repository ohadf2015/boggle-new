/**
 * Matchmaking Handler — wires MatchmakingQueue into Socket.IO.
 *
 * Hard gates (cannot be bypassed by client payload):
 *  1. RANKED_MATCHMAKING_ENABLED=true (default OFF — in-memory queue is not
 *     replica-safe under the Redis Socket.IO adapter).
 *  2. socket.data.verifiedUserId only (never handshake.auth spoof).
 *  3. ranked_progress eligibility (unlocked_at OR ≥10 casual games).
 *
 * On matchFound, stamps a short-lived RankedMatchTicket on both sockets so
 * createGame(isRanked) / join cannot be forged with a guessed code.
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
import { getAuthUserId } from '../utils/socialHelpers.js';
import {
  buildRankedMatchTicket,
  isRankedMatchmakingEnabled,
  type RankedMatchTicket,
} from '../config/rankedMatchmaking.js';

const MATCH_INTERVAL_MS = 2000;
const TIMEOUT_MS = 60000;
const CASUAL_GAMES_TO_UNLOCK = 10;

export const sharedMatchmakingQueue = new MatchmakingQueue();

const joinMatchmakingSchema = z.object({
  gameMode: z.string().min(1).max(64),
  language: z.string().min(2).max(10),
});

type JoinMatchmakingData = z.infer<typeof joinMatchmakingSchema>;

type SocketData = {
  verifiedUserId?: string;
  rankedMatchTicket?: RankedMatchTicket | null;
};

async function isRankedEligible(playerId: string): Promise<boolean> {
  try {
    const client = getSupabase();
    if (!client) {
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

function opponentPayload(entry: { playerId: string; elo: number; displayName?: string }) {
  const tier = getTierFromElo(entry.elo);
  const label = (entry.displayName || '').trim();
  return {
    // Never render the account UUID — overlay shows this string.
    username: label || 'Opponent',
    elo: entry.elo,
    tier: tier?.id ?? 'bronze',
  };
}

/** Per-socket timer cleanup so a match can clear the peer's interval/timeout. */
const lifecycleBySocket = new Map<string, { generation: number; clearTimers: () => void }>();

function clearLifecycleTimers(socketId: string): void {
  const life = lifecycleBySocket.get(socketId);
  if (!life) return;
  life.clearTimers();
  life.clearTimers = () => {};
}

function bumpLifecycle(socketId: string): number {
  clearLifecycleTimers(socketId);
  const prev = lifecycleBySocket.get(socketId);
  const generation = (prev?.generation ?? 0) + 1;
  lifecycleBySocket.set(socketId, { generation, clearTimers: () => {} });
  return generation;
}

function setLifecycleClear(socketId: string, generation: number, clearTimers: () => void): void {
  const life = lifecycleBySocket.get(socketId);
  if (!life || life.generation !== generation) {
    clearTimers();
    return;
  }
  life.clearTimers = clearTimers;
}

function dropLifecycle(socketId: string): void {
  clearLifecycleTimers(socketId);
  lifecycleBySocket.delete(socketId);
}

function stampTicket(
  io: Server,
  socketId: string,
  ticket: RankedMatchTicket,
): void {
  const sock = io.sockets.sockets.get(socketId) as Socket | undefined;
  if (!sock) return;
  (sock.data as SocketData).rankedMatchTicket = ticket;
}

export function registerMatchmakingHandlers(
  io: Server,
  socket: Socket,
  queue: MatchmakingQueue = sharedMatchmakingQueue,
): void {
  let matchInterval: ReturnType<typeof setInterval> | null = null;
  let timeoutTimer: ReturnType<typeof setTimeout> | null = null;

  function clearLocalTimers() {
    if (matchInterval) {
      clearInterval(matchInterval);
      matchInterval = null;
    }
    if (timeoutTimer) {
      clearTimeout(timeoutTimer);
      timeoutTimer = null;
    }
  }

  function cleanup() {
    clearLocalTimers();
    queue.leaveQueue(socket.id);
    dropLifecycle(socket.id);
  }

  socket.on('joinMatchmaking', async (rawData: unknown) => {
    // Invalidate prior in-flight join + clear prior timers before starting anew.
    clearLocalTimers();
    queue.leaveQueue(socket.id);
    const gen = bumpLifecycle(socket.id);
    (socket.data as SocketData).rankedMatchTicket = null;

    if (!isRankedMatchmakingEnabled()) {
      socket.emit('matchmakingError', {
        error: 'DISABLED',
        message: 'Ranked matchmaking is not enabled on this server',
      });
      return;
    }

    if (!checkRateLimit(socket.id)) {
      socket.emit('matchmakingError', { error: 'RATE_LIMITED', message: 'Too many requests' });
      return;
    }

    // Verified JWT only — handshake.auth.authUserId is client-spoofable.
    const playerId = getAuthUserId(socket);
    if (!playerId) {
      socket.emit('matchmakingError', { error: 'UNAUTHORIZED', message: 'Authentication required' });
      return;
    }

    const stillCurrent = () => {
      const life = lifecycleBySocket.get(socket.id);
      return !!life && life.generation === gen && socket.connected !== false;
    };

    const eligible = await isRankedEligible(playerId);
    if (!stillCurrent()) return;
    if (!eligible) {
      socket.emit('matchmakingError', {
        error: 'NOT_ELIGIBLE',
        message: 'Play 10 casual multiplayer games to unlock ranked',
      });
      return;
    }

    let elo = DEFAULT_RATING;
    let displayName: string | undefined;
    try {
      const client = getSupabase();
      if (client) {
        const { data } = await client
          .from('profiles')
          .select('ranked_mmr, username, display_name')
          .eq('id', playerId)
          .single();
        if (data?.ranked_mmr) elo = data.ranked_mmr;
        const raw = (data?.display_name || data?.username || '').trim();
        if (raw && raw !== playerId) displayName = raw;
      }
    } catch (err) {
      logger.warn('MATCHMAKING', `Failed to fetch ELO for ${playerId}, using default: ${err}`);
    }
    if (!stillCurrent()) return;

    const validation = validatePayload(joinMatchmakingSchema, rawData);
    if (!validation.success) {
      socket.emit('matchmakingError', { error: 'INVALID_PAYLOAD', message: validation.error });
      return;
    }
    if (!stillCurrent()) return;

    const { gameMode, language } = validation.data as JoinMatchmakingData;

    queue.joinQueue(
      socket.id,
      playerId,
      elo,
      gameMode as 'classic' | 'wordHunt',
      language,
      displayName,
    );

    logger.info('MATCHMAKING', `Player ${playerId} joined queue (elo=${elo}, mode=${gameMode})`);

    const stats = queue.getQueueStats();
    socket.emit('matchmakingUpdate', {
      queueSize: stats.playersInQueue,
      eloRange: queue.getEntryEloRange(socket.id),
    });

    matchInterval = setInterval(() => {
      try {
        if (!stillCurrent()) {
          clearLocalTimers();
          return;
        }
        const match = queue.tryMatch(socket.id);
        if (match) {
          // Clear BOTH players' intervals/timeouts — peer used to keep ticking.
          clearLocalTimers();
          clearLifecycleTimers(match.player1.socketId);
          clearLifecycleTimers(match.player2.socketId);
          dropLifecycle(match.player1.socketId);
          dropLifecycle(match.player2.socketId);

          const hostTicket = buildRankedMatchTicket({
            roomId: match.roomId,
            role: 'host',
            playerId: match.player1.playerId,
            opponentId: match.player2.playerId,
          });
          const joinerTicket = buildRankedMatchTicket({
            roomId: match.roomId,
            role: 'joiner',
            playerId: match.player2.playerId,
            opponentId: match.player1.playerId,
          });
          stampTicket(io, match.player1.socketId, hostTicket);
          stampTicket(io, match.player2.socketId, joinerTicket);

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
      if (!stillCurrent()) return;
      socket.emit('matchmakingTimeout');
      cleanup();
      (socket.data as SocketData).rankedMatchTicket = null;
      logger.info('MATCHMAKING', `Player ${playerId} timed out`);
    }, TIMEOUT_MS);

    setLifecycleClear(socket.id, gen, clearLocalTimers);
  });

  socket.on('leaveMatchmaking', () => {
    bumpLifecycle(socket.id); // invalidate in-flight async join
    cleanup();
    (socket.data as SocketData).rankedMatchTicket = null;
  });

  socket.on('disconnect', () => {
    bumpLifecycle(socket.id);
    cleanup();
    (socket.data as SocketData).rankedMatchTicket = null;
  });
}
