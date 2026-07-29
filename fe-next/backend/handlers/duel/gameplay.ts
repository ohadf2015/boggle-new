/**
 * Duel Gameplay Handlers
 *
 * Handles score submission with server-side anti-cheat validation and duel completion.
 * - Words validated server-side against frozen board and dictionary
 * - Score calculated from validated words (not client-submitted score)
 * - XP awarded exactly once via race condition protection
 */

import type { Namespace } from 'socket.io';
import type { DuelSocket } from './types';
import { z } from 'zod';
import { getSupabase } from '@/backend/modules/supabase/client';
import { validateAndScoreWord } from '@/backend/utils/wordValidation';
import { EDUCATION_XP_CONFIG } from '@/backend/modules/educationXpManager';
import { updateDuelChallengeProgress } from './realtime';
import logger from '@/backend/utils/logger';
import { checkRateLimit } from '../../utils/rateLimiter';

// ==========================================
// Validation Schemas
// ==========================================

/**
 * Submit score payload validation
 */
const submitScoreSchema = z.object({
  duelId: z.string().uuid('Invalid duel ID'),
  wordsFound: z.array(z.string().max(50)).max(500, 'Too many words').min(0, 'Words found must be an array'),
});

type SubmitScorePayload = z.infer<typeof submitScoreSchema>;

// ==========================================
// Handler Registration
// ==========================================

/**
 * Register duel gameplay event handlers
 * @param namespace - The /duel namespace
 * @param socket - The connected socket
 */
export function registerGameplayHandlers(
  namespace: Namespace,
  socket: DuelSocket
): void {
  // ==========================================
  // duel:submit-score - Submit score with server-side validation
  // ==========================================
  socket.on('duel:submit-score', async (data: unknown) => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('duel:error', { error: 'Rate limited' });
      return;
    }
    try {
      // Validate payload
      const validation = submitScoreSchema.safeParse(data);
      if (!validation.success) {
        socket.emit('duel:error', {
          message: validation.error.issues[0]?.message || 'Invalid payload',
        });
        return;
      }

      const payload: SubmitScorePayload = validation.data;
      const userId = socket.data.userId;

      const supabase = getSupabase();
      if (!supabase) {
        socket.emit('duel:error', {
          message: 'Database not available',
        });
        logger.error('DUEL', 'Supabase client not initialized');
        return;
      }

      // Fetch duel from database
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
          message: `Cannot submit score: duel is not active (status: ${duel.status})`,
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

      // Get lesson language for dictionary validation
      const { data: lesson, error: lessonError } = await supabase
        .from('vocabulary_lessons')
        .select('language')
        .eq('id', duel.lesson_id)
        .single();

      if (lessonError || !lesson) {
        socket.emit('duel:error', {
          message: 'Lesson not found',
        });
        logger.warn('DUEL', `Lesson not found: ${duel.lesson_id}`);
        return;
      }

      // M2 fix: Use shared validation utility (same pipeline as main MP)
      const boardState = duel.board_state as string[][];
      const validatedWords: string[] = [];
      let serverScore = 0;
      let rejectedCount = 0;

      for (const word of payload.wordsFound) {
        const result = await validateAndScoreWord(
          word,
          boardState,
          lesson.language,
          validatedWords // use validated list as "already found" for dedup
        );

        if (!result.valid) {
          rejectedCount++;
          continue;
        }

        validatedWords.push(result.normalizedWord);
        serverScore += result.score;
      }

      // Reject duplicate submissions from same player — prevents solo duel-win farm
      // where a client fires duel:submit-score twice to hit turnsCount===2 alone.
      // DB-level UNIQUE(duel_id, player_id) recommended as defense-in-depth.
      const { data: existingTurn, error: existingTurnError } = await supabase
        .from('duel_turns')
        .select('id')
        .eq('duel_id', payload.duelId)
        .eq('player_id', userId)
        .maybeSingle();

      if (existingTurnError) {
        socket.emit('duel:error', { message: 'Failed to check turn state' });
        logger.error('DUEL', `Turn lookup failed: ${existingTurnError.message}`);
        return;
      }

      if (existingTurn) {
        socket.emit('duel:error', { message: 'Turn already submitted' });
        logger.warn('DUEL', `Duplicate submit blocked: duel=${payload.duelId} player=${userId}`);
        return;
      }

      // Insert duel turn
      const { data: turn, error: turnError } = await supabase
        .from('duel_turns')
        .insert({
          duel_id: payload.duelId,
          player_id: userId,
          score: serverScore,
          words_found: validatedWords,
          completed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (turnError || !turn) {
        socket.emit('duel:error', {
          message: 'Failed to submit turn',
        });
        logger.error('DUEL', `Failed to insert turn: ${turnError?.message}`);
        return;
      }

      // Update duel score
      const scoreField = isChallenger ? 'challenger_score' : 'opponent_score';
      const { data: updatedDuel, error: updateError } = await supabase
        .from('student_duels')
        .update({ [scoreField]: serverScore })
        .eq('id', payload.duelId)
        .select()
        .single();

      if (updateError || !updatedDuel) {
        socket.emit('duel:error', {
          message: 'Failed to update duel score',
        });
        logger.error('DUEL', `Failed to update duel: ${updateError?.message}`);
        return;
      }

      // Emit score submitted only to the submitting player (not opponent)
      // to prevent second-mover seeing first player's score before playing (GD-017)
      const duelRoom = `duel:${payload.duelId}`;
      socket.emit('duel:score-submitted', {
        playerId: userId,
        score: serverScore,
        wordsValidated: validatedWords.length,
        wordsRejected: rejectedCount,
      });

      // Check for completion (both players submitted)
      // Use duel_turns count to detect submission, not score > 0
      // (a player can legitimately score 0 and still have submitted)
      const { count: turnsCount, error: turnsCountError } = await supabase
        .from('duel_turns')
        .select('*', { count: 'exact', head: true })
        .eq('duel_id', payload.duelId);

      if (!turnsCountError && turnsCount === 2) {
        const challengerScore = updatedDuel.challenger_score ?? 0;
        const opponentScore = updatedDuel.opponent_score ?? 0;
        await completeDuel(
          namespace,
          payload.duelId,
          updatedDuel.challenger_id,
          updatedDuel.opponent_id,
          challengerScore,
          opponentScore,
          duel.lesson_id
        );
      }

      logger.info(
        'DUEL',
        `Score submitted: ${payload.duelId} by ${userId} - ${serverScore} pts (${validatedWords.length} words)`
      );
    } catch (error) {
      logger.error('DUEL', `Error in duel:submit-score: ${(error as Error).message}`);
      socket.emit('duel:error', {
        message: 'Internal server error',
      });
    }
  });
}

// ==========================================
// Completion Logic
// ==========================================

/**
 * Complete a duel: determine winner and award XP
 * Race condition protection via xp_awarded flag
 */
async function completeDuel(
  namespace: Namespace,
  duelId: string,
  challengerId: string,
  opponentId: string,
  challengerScore: number,
  opponentScore: number,
  lessonId: string
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) {
    logger.error('DUEL', 'Cannot complete duel - Supabase not available');
    return;
  }

  try {
    // Determine winner
    let winnerId: string | null = null;
    if (challengerScore > opponentScore) {
      winnerId = challengerId;
    } else if (opponentScore > challengerScore) {
      winnerId = opponentId;
    }
    // null = draw

    // Race condition protection: update only if xp_awarded is false
    const { data: updated, error: updateError, count } = await supabase
      .from('student_duels')
      .update({
        status: 'completed',
        winner_id: winnerId,
        completed_at: new Date().toISOString(),
        xp_awarded: true,
      })
      .eq('id', duelId)
      .eq('xp_awarded', false) // Critical: only update if not already awarded
      .select();

    if (updateError) {
      logger.error('DUEL', `Failed to complete duel: ${updateError.message}`);
      return;
    }

    // If count is 0, XP was already awarded (race condition detected)
    if (!count || count === 0) {
      logger.warn('DUEL', `XP already awarded for duel ${duelId} - skipping`);
      return;
    }

    // Award XP
    // Draw uses challenger/opponent keys; win/loss uses winner/loser keys
    let xpAwarded: { winner?: number; loser?: number; challenger?: number; opponent?: number };

    if (winnerId === null) {
      // Draw - both get DUEL_DRAW XP; use challenger/opponent keys to distinguish draw from win/loss
      xpAwarded = {
        challenger: EDUCATION_XP_CONFIG.DUEL_DRAW,
        opponent: EDUCATION_XP_CONFIG.DUEL_DRAW,
      };

      await Promise.all([
        supabase.rpc('award_education_xp', {
          p_student_id: challengerId,
          p_xp_amount: EDUCATION_XP_CONFIG.DUEL_DRAW,
          p_lesson_id: lessonId,
        }),
        supabase.rpc('award_education_xp', {
          p_student_id: opponentId,
          p_xp_amount: EDUCATION_XP_CONFIG.DUEL_DRAW,
          p_lesson_id: lessonId,
        }),
      ]);

      logger.info(
        'DUEL',
        `Duel ${duelId} completed - DRAW (both get ${EDUCATION_XP_CONFIG.DUEL_DRAW} XP)`
      );
    } else {
      // Win/Loss
      const loserId = winnerId === challengerId ? opponentId : challengerId;
      xpAwarded = {
        winner: EDUCATION_XP_CONFIG.DUEL_WIN_ASYNC,
        loser: EDUCATION_XP_CONFIG.DUEL_LOSS_ASYNC,
      } as { winner: number; loser: number };

      await Promise.all([
        supabase.rpc('award_education_xp', {
          p_student_id: winnerId,
          p_xp_amount: EDUCATION_XP_CONFIG.DUEL_WIN_ASYNC,
          p_lesson_id: lessonId,
        }),
        supabase.rpc('award_education_xp', {
          p_student_id: loserId,
          p_xp_amount: EDUCATION_XP_CONFIG.DUEL_LOSS_ASYNC,
          p_lesson_id: lessonId,
        }),
      ]);

      logger.info(
        'DUEL',
        `Duel ${duelId} completed - Winner: ${winnerId} (${EDUCATION_XP_CONFIG.DUEL_WIN_ASYNC} XP), Loser: ${loserId} (${EDUCATION_XP_CONFIG.DUEL_LOSS_ASYNC} XP)`
      );
    }

    // B12 fix: Update daily challenge progress for duel completion
    updateDuelChallengeProgress(supabase, challengerId, opponentId, winnerId).catch(err =>
      logger.error('DUEL', `Failed to update challenge progress: ${(err as Error).message}`)
    );

    // Emit completion to duel room
    const duelRoom = `duel:${duelId}`;
    namespace.to(duelRoom).emit('duel:completed', {
      winnerId,
      challengerScore,
      opponentScore,
      xpAwarded,
    });
  } catch (error) {
    logger.error('DUEL', `Error completing duel ${duelId}: ${(error as Error).message}`);
  }
}
