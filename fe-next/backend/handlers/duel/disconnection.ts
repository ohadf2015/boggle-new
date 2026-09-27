/**
 * Duel Disconnection Handlers
 *
 * Handles disconnection grace period, reconnection, and forfeit logic for real-time duels.
 * - 30s grace period on disconnect with opponent notification
 * - Reconnection cancels grace period timer
 * - Auto-forfeit after 30s if no reconnection
 * - Manual forfeit via duel:forfeit event
 */

import type { Namespace } from 'socket.io';
import type { DuelSocket, forfeitDuelSchema } from './types';
import { EDUCATION_XP_CONFIG } from '@/backend/modules/educationXpManager';
import { getSupabase } from '@/backend/modules/supabase/client';
import { realtimeGames } from './realtime';
import timerManager from '@/backend/utils/timerManager';
import logger from '@/backend/utils/logger';
import { checkRateLimit } from '../../utils/rateLimiter';

// ==========================================
// Grace Period Tracking
// ==========================================

/**
 * Map of userId -> grace period timer
 * Exported for testing
 */
export const gracePeriodTimers = new Map<string, NodeJS.Timeout>();

// ==========================================
// Handler Registration
// ==========================================

/**
 * Register disconnection handlers for a socket
 * @param namespace - The /duel namespace
 * @param socket - The connected socket
 */
export function registerDisconnectionHandlers(
  namespace: Namespace,
  socket: DuelSocket
): void {
  const userId = socket.data.userId;

  // ==========================================
  // disconnecting - Handle disconnection
  // ==========================================
  socket.on('disconnecting', async () => {
    try {
      const supabase = getSupabase();
      if (!supabase) {
        logger.error('DUEL', 'Supabase client not initialized');
        return;
      }

      // Check if player has active realtime duel
      const { data: duel, error } = await supabase
        .from('student_duels')
        .select('*')
        .or(`challenger_id.eq.${userId},opponent_id.eq.${userId}`)
        .eq('status', 'active')
        .eq('duel_type', 'realtime')
        .single();

      if (error || !duel) {
        // No active realtime duel - no grace period needed
        return;
      }

      // Determine opponent
      const opponentId = duel.challenger_id === userId ? duel.opponent_id : duel.challenger_id;
      const duelRoom = `duel:${duel.id}`;

      // Notify opponent of disconnection
      namespace.to(duelRoom).emit('duel:opponent-disconnected', {
        opponentId: userId,
        gracePeriodSeconds: 30,
      });

      logger.info('DUEL', `User ${userId} disconnected from duel ${duel.id} - grace period started`);

      // Start 30s grace period timer
      const timer = setTimeout(async () => {
        // Defense-in-depth: if the timer was already dequeued but user reconnected
        // (clearTimeout race), check if grace period was already cancelled
        if (!gracePeriodTimers.has(userId)) {
          logger.info('DUEL', `Grace period timer fired for ${userId} but already cancelled - skipping forfeit`);
          return;
        }

        // Verify user hasn't reconnected by checking for active duel socket
        // If handleReconnection ran, it deleted the timer entry — but in the
        // rare event-loop race where both fire, this DB-level guard catches it
        // (forfeitDuel now has .eq('xp_awarded', false) atomic guard too)

        // Auto-forfeit after 30s
        await forfeitDuel(namespace, duel.id, userId, opponentId, 'timeout');

        // Clean up timer
        gracePeriodTimers.delete(userId);
      }, 30000);

      // Store timer for potential cancellation
      gracePeriodTimers.set(userId, timer);
    } catch (error) {
      logger.error('DUEL', `Error in disconnecting handler: ${(error as Error).message}`);
    }
  });

  // ==========================================
  // duel:forfeit - Manual forfeit
  // ==========================================
  socket.on('duel:forfeit', async (data: unknown) => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('duel:error', { error: 'Rate limited' });
      return;
    }
    try {
      // Validate payload
      const { forfeitDuelSchema: schema } = await import('./types');
      const validation = schema.safeParse(data);

      if (!validation.success) {
        socket.emit('duel:error', {
          message: validation.error.issues[0]?.message || 'Invalid payload',
        });
        return;
      }

      const payload = validation.data;
      const supabase = getSupabase();
      if (!supabase) {
        socket.emit('duel:error', {
          message: 'Database not available',
        });
        logger.error('DUEL', 'Supabase client not initialized');
        return;
      }

      // Fetch duel
      const { data: duel, error: fetchError } = await supabase
        .from('student_duels')
        .select('*')
        .eq('id', payload.duelId)
        .single();

      if (fetchError || !duel) {
        socket.emit('duel:error', {
          message: 'Duel not found',
        });
        return;
      }

      // Validate status
      if (duel.status !== 'active') {
        socket.emit('duel:error', {
          message: `Cannot forfeit: duel is not active (status: ${duel.status})`,
        });
        return;
      }

      // Validate participant
      const isChallenger = duel.challenger_id === userId;
      const isOpponent = duel.opponent_id === userId;

      if (!isChallenger && !isOpponent) {
        socket.emit('duel:error', {
          message: 'You are not a participant in this duel',
        });
        return;
      }

      // Determine winner (the non-forfeiting player)
      const winnerId = isChallenger ? duel.opponent_id : duel.challenger_id;

      // Execute forfeit
      await forfeitDuel(namespace, duel.id, userId, winnerId, 'manual');

      logger.info('DUEL', `User ${userId} manually forfeited duel ${duel.id}`);
    } catch (error) {
      logger.error('DUEL', `Error in duel:forfeit: ${(error as Error).message}`);
      socket.emit('duel:error', {
        message: 'Internal server error',
      });
    }
  });
}

/**
 * Handle reconnection
 * Cancels grace period timer and syncs game state
 * @param namespace - The /duel namespace
 * @param socket - The reconnected socket
 */
export async function handleReconnection(
  namespace: Namespace,
  socket: DuelSocket
): Promise<void> {
  const userId = socket.data.userId;

  try {
    // Check if user has grace period timer
    const timer = gracePeriodTimers.get(userId);
    if (timer) {
      clearTimeout(timer);
      gracePeriodTimers.delete(userId);
      logger.info('DUEL', `Grace period cancelled for ${userId} - reconnected`);
    }

    // Get active duel
    const supabase = getSupabase();
    if (!supabase) {
      logger.error('DUEL', 'Supabase client not initialized');
      return;
    }

    const { data: duel, error } = await supabase
      .from('student_duels')
      .select('*')
      .or(`challenger_id.eq.${userId},opponent_id.eq.${userId}`)
      .eq('status', 'active')
      .single();

    if (error || !duel) {
      // No active duel to rejoin
      return;
    }

    const duelRoom = `duel:${duel.id}`;

    // Rejoin duel room
    await socket.join(duelRoom);

    // Notify opponent of reconnection
    namespace.to(duelRoom).emit('duel:opponent-reconnected', {
      opponentId: userId,
    });

    // Sync game state from in-memory realtime state (or fall back to DB)
    const gameState = realtimeGames.get(duel.id);
    const timeRemaining = gameState
      ? Math.max(0, gameState.timeLimit - Math.floor((Date.now() - new Date(gameState.startTime).getTime()) / 1000))
      : 0;

    socket.emit('duel:state-synced', {
      duelId: duel.id,
      challengerScore: gameState?.challengerScore ?? (duel.challenger_score || 0),
      opponentScore: gameState?.opponentScore ?? (duel.opponent_score || 0),
      challengerWords: gameState?.challengerWords ?? [],
      opponentWords: gameState?.opponentWords ?? [],
      timeRemaining,
    });

    logger.info('DUEL', `User ${userId} reconnected to duel ${duel.id}`);
  } catch (error) {
    logger.error('DUEL', `Error in handleReconnection: ${(error as Error).message}`);
  }
}

// ==========================================
// Helper Functions
// ==========================================

/**
 * Forfeit a duel
 * Updates duel status, awards XP, and notifies participants
 */
async function forfeitDuel(
  namespace: Namespace,
  duelId: string,
  forfeiterId: string,
  winnerId: string,
  reason: 'timeout' | 'manual'
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) {
    logger.error('DUEL', 'Cannot forfeit duel - Supabase not available');
    return;
  }

  try {
    // Atomic update to forfeited status — also guard xp_awarded to prevent double XP
    const { data: updated, error: updateError } = await supabase
      .from('student_duels')
      .update({
        status: 'forfeited',
        winner_id: winnerId,
        completed_at: new Date().toISOString(),
        forfeit_reason: reason,
        xp_awarded: true,
      })
      .eq('id', duelId)
      .eq('status', 'active') // Atomic: only update if still active
      .eq('xp_awarded', false) // Prevent double XP if forfeit races with completion
      .select();

    if (updateError) {
      logger.error('DUEL', `Failed to forfeit duel: ${updateError?.message}`);
      return;
    }

    // If no rows returned, duel was already completed/forfeited or XP already awarded
    if (!updated || updated.length === 0) {
      logger.warn('DUEL', `Duel ${duelId} already resolved or XP already awarded - skipping forfeit`);
      return;
    }

    // Award XP
    // Winner gets DUEL_WIN_REALTIME, forfeiter gets DUEL_LOSS_REALTIME
    await Promise.all([
      supabase.rpc('award_education_xp', {
        p_student_id: winnerId,
        p_xp_amount: EDUCATION_XP_CONFIG.DUEL_WIN_REALTIME,
      }),
      supabase.rpc('award_education_xp', {
        p_student_id: forfeiterId,
        p_xp_amount: EDUCATION_XP_CONFIG.DUEL_LOSS_REALTIME,
      }),
    ]);

    // Emit completion event
    const duelRoom = `duel:${duelId}`;
    const eventData: any = {
      winnerId,
      reason: reason === 'manual' ? 'forfeit' : 'opponent_disconnected',
    };

    if (reason === 'manual') {
      eventData.forfeitedBy = forfeiterId;
    }

    namespace.to(duelRoom).emit('duel:completed', eventData);

    // Clean up in-memory state and timers (mirrors completeRealtimeDuel cleanup)
    timerManager.clearTimer(`duel:${duelId}`);
    realtimeGames.delete(duelId);

    logger.info(
      'DUEL',
      `Duel ${duelId} forfeited (${reason}) - Winner: ${winnerId}, Forfeiter: ${forfeiterId}`
    );
  } catch (error) {
    logger.error('DUEL', `Error forfeiting duel ${duelId}: ${(error as Error).message}`);
  }
}
