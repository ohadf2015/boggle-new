/**
 * Duel Lifecycle Handlers
 *
 * Handles duel creation, acceptance, declining, and cancellation.
 * Server-authoritative state machine prevents invalid transitions.
 */

import type { Namespace } from 'socket.io';
import {
  type DuelSocket,
  type CreateDuelPayload,
  type AcceptDuelPayload,
  type DeclineDuelPayload,
  type CancelDuelPayload,
  createDuelSchema,
  acceptDuelSchema,
  declineDuelSchema,
  cancelDuelSchema,
  rematchDuelSchema,
  type RematchDuelPayload,
  VALID_TRANSITIONS,
} from './types';
import { generateRandomTable } from '@/backend/utils/gameUtils';
import { generateRichBoard } from '@/backend/utils/boardSelection';
import { getSupabase } from '@/backend/modules/supabase/client';
import { startRealtimeDuel } from './realtime';
import logger from '@/backend/utils/logger';
import { checkRateLimit } from '../../utils/rateLimiter';

/**
 * Register duel lifecycle event handlers
 * @param namespace - The /duel namespace
 * @param socket - The connected socket
 */
export function registerLifecycleHandlers(
  namespace: Namespace,
  socket: DuelSocket
): void {
  // ==========================================
  // duel:create - Create a new duel challenge
  // ==========================================
  socket.on('duel:create', async (data: unknown) => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('duel:error', { error: 'Rate limited' });
      return;
    }
    try {
      // Validate payload
      const validation = createDuelSchema.safeParse(data);
      if (!validation.success) {
        socket.emit('duel:error', {
          message: validation.error.issues[0]?.message || 'Invalid payload',
        });
        return;
      }

      const payload: CreateDuelPayload = validation.data;
      const userId = socket.data.userId;
      const displayName = socket.data.displayName;

      // Get lesson details to determine language
      const supabase = getSupabase();
      if (!supabase) {
        socket.emit('duel:error', {
          message: 'Database not available',
        });
        logger.error('DUEL', 'Supabase client not initialized');
        return;
      }

      const { data: lesson, error: lessonError } = await supabase
        .from('vocabulary_lessons')
        .select('language')
        .eq('id', payload.lessonId)
        .single();

      if (lessonError || !lesson) {
        socket.emit('duel:error', {
          message: 'Lesson not found',
        });
        logger.warn('DUEL', `Lesson not found: ${payload.lessonId}`);
        return;
      }

      // Generate frozen board for this duel
      const boardState = generateRichBoard(
        () => generateRandomTable(4, 4, lesson.language),
        lesson.language,
        4,
        4
      );

      // Calculate expiration (24 hours from now)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      // Insert duel into database
      const { data: duel, error: insertError } = await supabase
        .from('student_duels')
        .insert({
          challenger_id: userId,
          opponent_id: payload.opponentId,
          lesson_id: payload.lessonId,
          classroom_id: payload.classroomId,
          duel_type: payload.duelType,
          status: 'pending',
          board_state: boardState,
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (insertError || !duel) {
        socket.emit('duel:error', {
          message: 'Failed to create duel',
        });
        logger.error('DUEL', `Failed to create duel: ${insertError?.message}`);
        return;
      }

      // Emit success to creator
      socket.emit('duel:created', {
        duelId: duel.id,
      });

      // Find opponent socket and notify them
      const opponentSocket = Array.from(namespace.sockets.values()).find(
        (s) => (s as DuelSocket).data.userId === payload.opponentId
      );

      if (opponentSocket) {
        opponentSocket.emit('duel:challenge-received', {
          duelId: duel.id,
          challengerName: displayName,
          lessonId: payload.lessonId,
          duelType: payload.duelType,
        });
      }

      // Emit to lobby room for lobby updates
      namespace.to(`duel:lobby:${payload.classroomId}`).emit('duel:lobby-update', {
        action: 'challenge-created',
        duelId: duel.id,
      });

      logger.info('DUEL', `Duel created: ${duel.id} by ${userId}`);
    } catch (error) {
      logger.error('DUEL', `Error in duel:create: ${(error as Error).message}`);
      socket.emit('duel:error', {
        message: 'Internal server error',
      });
    }
  });

  // ==========================================
  // duel:accept - Accept a duel challenge
  // ==========================================
  socket.on('duel:accept', async (data: unknown) => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('duel:error', { error: 'Rate limited' });
      return;
    }
    try {
      // Validate payload
      const validation = acceptDuelSchema.safeParse(data);
      if (!validation.success) {
        socket.emit('duel:error', {
          message: validation.error.issues[0]?.message || 'Invalid payload',
        });
        return;
      }

      const payload: AcceptDuelPayload = validation.data;
      const userId = socket.data.userId;

      // Fetch duel from database
      const supabase = getSupabase();
      if (!supabase) {
        socket.emit('duel:error', {
          message: 'Database not available',
        });
        logger.error('DUEL', 'Supabase client not initialized');
        return;
      }

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

      // Validate state transition
      if (duel.status !== 'pending') {
        socket.emit('duel:error', {
          message: `Cannot accept duel: duel is not pending (status: ${duel.status})`,
        });
        return;
      }

      // Validate opponent ownership
      if (duel.opponent_id !== userId) {
        socket.emit('duel:error', {
          message: 'You are not the opponent of this duel',
        });
        return;
      }

      // Update duel status to active (atomic: WHERE status='pending' prevents double-accept race)
      const startedAt = new Date().toISOString();
      const { data: updatedDuel, error: updateError } = await supabase
        .from('student_duels')
        .update({
          status: 'active',
          started_at: startedAt,
        })
        .eq('id', payload.duelId)
        .eq('status', 'pending')
        .select()
        .single();

      if (updateError || !updatedDuel) {
        socket.emit('duel:error', {
          message: 'Failed to accept duel',
        });
        logger.error('DUEL', `Failed to accept duel: ${updateError?.message}`);
        return;
      }

      // Both players join duel room
      const duelRoom = `duel:${payload.duelId}`;
      socket.join(duelRoom);

      // Find challenger socket and have them join too
      const challengerSocket = Array.from(namespace.sockets.values()).find(
        (s) => (s as DuelSocket).data.userId === duel.challenger_id
      );
      if (challengerSocket) {
        challengerSocket.join(duelRoom);
      }

      // Check duel type and start appropriate flow
      if (updatedDuel.duel_type === 'realtime') {
        // Real-time duel: Start simultaneous gameplay
        await startRealtimeDuel(namespace, payload.duelId, updatedDuel);
        logger.info('DUEL', `Real-time duel accepted: ${payload.duelId} by ${userId}`);
      } else {
        // Async duel: Emit board state for client-side play
        namespace.to(duelRoom).emit('duel:accepted', {
          duelId: payload.duelId,
          boardState: duel.board_state,
          startedAt: startedAt,
          duelType: 'async',
        });
        logger.info('DUEL', `Async duel accepted: ${payload.duelId} by ${userId}`);
      }
    } catch (error) {
      logger.error('DUEL', `Error in duel:accept: ${(error as Error).message}`);
      socket.emit('duel:error', {
        message: 'Internal server error',
      });
    }
  });

  // ==========================================
  // duel:decline - Decline a duel challenge
  // ==========================================
  socket.on('duel:decline', async (data: unknown) => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('duel:error', { error: 'Rate limited' });
      return;
    }
    try {
      // Validate payload
      const validation = declineDuelSchema.safeParse(data);
      if (!validation.success) {
        socket.emit('duel:error', {
          message: validation.error.issues[0]?.message || 'Invalid payload',
        });
        return;
      }

      const payload: DeclineDuelPayload = validation.data;
      const userId = socket.data.userId;

      // Fetch duel from database
      const supabase = getSupabase();
      if (!supabase) {
        socket.emit('duel:error', {
          message: 'Database not available',
        });
        logger.error('DUEL', 'Supabase client not initialized');
        return;
      }

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

      // Validate state transition
      if (duel.status !== 'pending') {
        socket.emit('duel:error', {
          message: `Cannot decline duel: duel is not pending (status: ${duel.status})`,
        });
        return;
      }

      // Validate opponent ownership
      if (duel.opponent_id !== userId) {
        socket.emit('duel:error', {
          message: 'You are not the opponent of this duel',
        });
        return;
      }

      // Update duel status to declined
      const { error: updateError } = await supabase
        .from('student_duels')
        .update({
          status: 'declined',
        })
        .eq('id', payload.duelId);

      if (updateError) {
        socket.emit('duel:error', {
          message: 'Failed to decline duel',
        });
        logger.error('DUEL', `Failed to decline duel: ${updateError.message}`);
        return;
      }

      // Find challenger socket and notify them
      const challengerSocket = Array.from(namespace.sockets.values()).find(
        (s) => (s as DuelSocket).data.userId === duel.challenger_id
      );

      if (challengerSocket) {
        challengerSocket.emit('duel:declined', {
          duelId: payload.duelId,
        });
      }

      logger.info('DUEL', `Duel declined: ${payload.duelId} by ${userId}`);
    } catch (error) {
      logger.error('DUEL', `Error in duel:decline: ${(error as Error).message}`);
      socket.emit('duel:error', {
        message: 'Internal server error',
      });
    }
  });

  // ==========================================
  // duel:cancel - Cancel a pending duel
  // ==========================================
  socket.on('duel:cancel', async (data: unknown) => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('duel:error', { error: 'Rate limited' });
      return;
    }
    try {
      // Validate payload
      const validation = cancelDuelSchema.safeParse(data);
      if (!validation.success) {
        socket.emit('duel:error', {
          message: validation.error.issues[0]?.message || 'Invalid payload',
        });
        return;
      }

      const payload: CancelDuelPayload = validation.data;
      const userId = socket.data.userId;

      // Fetch duel from database
      const supabase = getSupabase();
      if (!supabase) {
        socket.emit('duel:error', {
          message: 'Database not available',
        });
        logger.error('DUEL', 'Supabase client not initialized');
        return;
      }

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

      // Validate state transition
      if (duel.status !== 'pending') {
        socket.emit('duel:error', {
          message: `Cannot cancel duel: duel is not pending (status: ${duel.status})`,
        });
        return;
      }

      // Validate challenger ownership
      if (duel.challenger_id !== userId) {
        socket.emit('duel:error', {
          message: 'You are not the challenger of this duel',
        });
        return;
      }

      // Update duel status to cancelled
      const { error: updateError } = await supabase
        .from('student_duels')
        .update({
          status: 'cancelled',
        })
        .eq('id', payload.duelId);

      if (updateError) {
        socket.emit('duel:error', {
          message: 'Failed to cancel duel',
        });
        logger.error('DUEL', `Failed to cancel duel: ${updateError.message}`);
        return;
      }

      // Find opponent socket and notify them
      const opponentSocket = Array.from(namespace.sockets.values()).find(
        (s) => (s as DuelSocket).data.userId === duel.opponent_id
      );

      if (opponentSocket) {
        opponentSocket.emit('duel:cancelled', {
          duelId: payload.duelId,
        });
      }

      logger.info('DUEL', `Duel cancelled: ${payload.duelId} by ${userId}`);
    } catch (error) {
      logger.error('DUEL', `Error in duel:cancel: ${(error as Error).message}`);
      socket.emit('duel:error', {
        message: 'Internal server error',
      });
    }
  });

  // ==========================================
  // duel:rematch - Create a rematch between the same two players
  // Requester becomes the new challenger. classroom_id + duel_type inherited
  // from the most recent completed/declined duel between the two users on this lesson.
  // ==========================================
  socket.on('duel:rematch', async (data: unknown) => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('duel:error', { error: 'Rate limited' });
      return;
    }
    try {
      const validation = rematchDuelSchema.safeParse(data);
      if (!validation.success) {
        socket.emit('duel:error', {
          message: validation.error.issues[0]?.message || 'Invalid payload',
        });
        return;
      }

      const payload: RematchDuelPayload = validation.data;
      const userId = socket.data.userId;
      const displayName = socket.data.displayName;

      const supabase = getSupabase();
      if (!supabase) {
        socket.emit('duel:error', { message: 'Database not available' });
        logger.error('DUEL', 'Supabase client not initialized');
        return;
      }

      // Fetch lesson language for fresh board
      const { data: lesson, error: lessonError } = await supabase
        .from('vocabulary_lessons')
        .select('language')
        .eq('id', payload.lessonId)
        .single();

      if (lessonError || !lesson) {
        socket.emit('duel:error', { message: 'Lesson not found' });
        return;
      }

      // Inherit classroom_id + duel_type from prior duel between these users on this lesson.
      // Default to 'realtime' since rematch is triggered from realtime completion UI.
      const { data: priorDuel } = await supabase
        .from('student_duels')
        .select('classroom_id, duel_type')
        .eq('lesson_id', payload.lessonId)
        .or(
          `and(challenger_id.eq.${userId},opponent_id.eq.${payload.opponentId}),and(challenger_id.eq.${payload.opponentId},opponent_id.eq.${userId})`
        )
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const classroomId = priorDuel?.classroom_id ?? null;
      const duelType = priorDuel?.duel_type ?? 'realtime';

      // Fresh board for rematch
      const boardState = generateRichBoard(
        () => generateRandomTable(4, 4, lesson.language),
        lesson.language,
        4,
        4
      );

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      const { data: duel, error: insertError } = await supabase
        .from('student_duels')
        .insert({
          challenger_id: userId,
          opponent_id: payload.opponentId,
          lesson_id: payload.lessonId,
          classroom_id: classroomId,
          duel_type: duelType,
          status: 'pending',
          board_state: boardState,
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (insertError || !duel) {
        socket.emit('duel:error', { message: 'Failed to create rematch' });
        logger.error('DUEL', `Failed to create rematch: ${insertError?.message}`);
        return;
      }

      socket.emit('duel:created', { duelId: duel.id });

      const opponentSocket = Array.from(namespace.sockets.values()).find(
        (s) => (s as DuelSocket).data.userId === payload.opponentId
      );

      if (opponentSocket) {
        opponentSocket.emit('duel:challenge-received', {
          duelId: duel.id,
          challengerName: displayName,
          lessonId: payload.lessonId,
          duelType,
          isRematch: true,
        });
      }

      if (classroomId) {
        namespace.to(`duel:lobby:${classroomId}`).emit('duel:lobby-update', {
          action: 'challenge-created',
          duelId: duel.id,
        });
      }

      logger.info('DUEL', `Rematch created: ${duel.id} by ${userId}`);
    } catch (error) {
      logger.error('DUEL', `Error in duel:rematch: ${(error as Error).message}`);
      socket.emit('duel:error', { message: 'Internal server error' });
    }
  });
}
