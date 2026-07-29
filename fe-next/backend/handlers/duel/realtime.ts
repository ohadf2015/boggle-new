/**
 * Real-Time Duel Handlers
 *
 * Handles real-time duel gameplay: word submission with server-side validation,
 * opponent progress broadcasting, and server-side timer-based completion.
 */

import type { Namespace } from 'socket.io';
// Language type no longer needed — validateAndScoreWord handles it internally
import { type DuelSocket, type SubmitWordPayload, submitWordSchema } from './types';
import { getSupabase } from '@/backend/modules/supabase/client';
import { validateAndScoreWord } from '@/backend/utils/wordValidation';
import { EDUCATION_XP_CONFIG } from '@/backend/modules/educationXpManager';
import logger from '@/backend/utils/logger';
import timerManager from '@/backend/utils/timerManager';
import { checkRateLimit } from '../../utils/rateLimiter';

// ==========================================
// In-Memory Game State
// ==========================================

interface RealtimeGameState {
  challengerId: string;
  opponentId: string;
  lessonId: string;
  boardState: string[][];
  language: string;
  timeLimit: number;
  startTime: string;
  challengerWords: string[];
  opponentWords: string[];
  challengerScore: number;
  opponentScore: number;
  /** Set to true when completion is in progress — blocks new word submissions */
  completing?: boolean;
}

/**
 * In-memory map of active real-time duels
 * Exported for testing access
 */
export const realtimeGames = new Map<string, RealtimeGameState>();

// ==========================================
// Handler Registration
// ==========================================

/**
 * Register real-time duel event handlers
 * @param namespace - The /duel namespace
 * @param socket - The connected socket
 */
export function registerRealtimeHandlers(
  namespace: Namespace,
  socket: DuelSocket
): void {
  // ==========================================
  // duel:submit-word - Submit word with server-side validation
  // ==========================================
  socket.on('duel:submit-word', async (data: unknown) => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('duel:error', { error: 'Rate limited' });
      return;
    }
    try {
      // Validate payload
      const validation = submitWordSchema.safeParse(data);
      if (!validation.success) {
        socket.emit('duel:error', {
          message: validation.error.issues[0]?.message || 'Invalid payload',
        });
        return;
      }

      const payload: SubmitWordPayload = validation.data;
      const userId = socket.data.userId;

      // Get game state
      const gameState = realtimeGames.get(payload.duelId);
      if (!gameState || gameState.completing) {
        socket.emit('duel:error', {
          message: 'Duel not found or not active',
        });
        return;
      }

      // Validate participant
      const isChallenger = gameState.challengerId === userId;
      const isOpponent = gameState.opponentId === userId;

      if (!isChallenger && !isOpponent) {
        socket.emit('duel:error', {
          message: 'You are not a participant in this duel',
        });
        return;
      }

      // Get player's words array
      const playerWords = isChallenger ? gameState.challengerWords : gameState.opponentWords;

      // M2 fix: Use shared validation utility (same pipeline as main MP)
      const result = await validateAndScoreWord(
        payload.word,
        gameState.boardState,
        gameState.language,
        playerWords
      );

      if (!result.valid) {
        socket.emit('duel:word-rejected', {
          word: payload.word,
          reason: result.reason || 'invalid',
        });
        return;
      }

      const points = result.score;

      // Update in-memory state
      playerWords.push(result.normalizedWord);
      if (isChallenger) {
        gameState.challengerScore += points;
      } else {
        gameState.opponentScore += points;
      }

      // Emit to submitter: word accepted
      socket.emit('duel:word-accepted', {
        word: payload.word,
        points,
        totalScore: isChallenger ? gameState.challengerScore : gameState.opponentScore,
        wordCount: playerWords.length,
      });

      // Broadcast to opponent: progress update
      const duelRoom = `duel:${payload.duelId}`;
      socket.to(duelRoom).emit('duel:opponent-progress', {
        opponentId: userId,
        totalScore: isChallenger ? gameState.challengerScore : gameState.opponentScore,
        wordCount: playerWords.length,
      });

      logger.info(
        'DUEL',
        `Real-time word submitted: ${payload.duelId} by ${userId} - ${payload.word} (${points} pts)`
      );
    } catch (error) {
      logger.error('DUEL', `Error in duel:submit-word: ${(error as Error).message}`);
      socket.emit('duel:error', {
        message: 'Internal server error',
      });
    }
  });
}

// ==========================================
// Duel Lifecycle Functions
// ==========================================

/**
 * Start a real-time duel: initialize game state and emit duel:started
 * @param namespace - The /duel namespace
 * @param duelId - The duel ID
 * @param duel - The duel data from database
 */
export async function startRealtimeDuel(
  namespace: Namespace,
  duelId: string,
  duel: any
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) {
    logger.error('DUEL', 'Cannot start real-time duel - Supabase not available');
    return;
  }

  try {
    // Fetch lesson language
    const { data: lesson, error: lessonError } = await supabase
      .from('vocabulary_lessons')
      .select('language')
      .eq('id', duel.lesson_id)
      .single();

    if (lessonError || !lesson) {
      logger.error('DUEL', `Lesson not found: ${duel.lesson_id}`);
      return;
    }

    const startTime = new Date().toISOString();

    // Initialize game state
    const gameState: RealtimeGameState = {
      challengerId: duel.challenger_id,
      opponentId: duel.opponent_id,
      lessonId: duel.lesson_id,
      boardState: duel.board_state as string[][],
      language: lesson.language,
      timeLimit: duel.time_limit || 180,
      startTime,
      challengerWords: [],
      opponentWords: [],
      challengerScore: 0,
      opponentScore: 0,
    };

    realtimeGames.set(duelId, gameState);

    // Emit duel:started to room
    const duelRoom = `duel:${duelId}`;
    namespace.to(duelRoom).emit('duel:started', {
      duelId,
      boardState: duel.board_state,
      startTime,
      timeLimit: gameState.timeLimit,
      players: [duel.challenger_id, duel.opponent_id],
    });

    // M3 fix: Use timerManager instead of raw setTimeout (survives cleanup)
    timerManager.setTimeout(`duel:${duelId}`, async () => {
      await completeRealtimeDuel(namespace, duelId);
    }, gameState.timeLimit * 1000);

    logger.info('DUEL', `Real-time duel started: ${duelId} (${gameState.timeLimit}s)`);
  } catch (error) {
    logger.error('DUEL', `Error starting real-time duel: ${(error as Error).message}`);
  }
}

/**
 * Complete a real-time duel: determine winner, award XP, emit completion
 * @param namespace - The /duel namespace
 * @param duelId - The duel ID
 */
async function completeRealtimeDuel(
  namespace: Namespace,
  duelId: string
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) {
    logger.error('DUEL', 'Cannot complete duel - Supabase not available');
    return;
  }

  try {
    // Get game state
    const gameState = realtimeGames.get(duelId);
    if (!gameState) {
      logger.warn('DUEL', `Game state not found for duel ${duelId}`);
      return;
    }

    // Mark as completing to block concurrent word submissions
    if (gameState.completing) {
      logger.warn('DUEL', `Duel ${duelId} already completing - skipping`);
      return;
    }
    gameState.completing = true;

    // Determine winner
    let winnerId: string | null = null;
    if (gameState.challengerScore > gameState.opponentScore) {
      winnerId = gameState.challengerId;
    } else if (gameState.opponentScore > gameState.challengerScore) {
      winnerId = gameState.opponentId;
    }
    // null = draw

    // Atomic DB update (race condition protection)
    const { data: updated, error: updateError } = await supabase
      .from('student_duels')
      .update({
        status: 'completed',
        winner_id: winnerId,
        challenger_score: gameState.challengerScore,
        opponent_score: gameState.opponentScore,
        completed_at: new Date().toISOString(),
        xp_awarded: true,
      })
      .eq('id', duelId)
      .eq('status', 'active') // Only update if still active
      .eq('xp_awarded', false) // Prevent double XP if completion races with forfeit
      .select();

    if (updateError) {
      logger.error('DUEL', `Failed to complete duel: ${updateError.message}`);
      return;
    }

    // If no rows returned, race condition detected (already completed)
    if (!updated || updated.length === 0) {
      logger.warn('DUEL', `Duel ${duelId} already completed - skipping`);
      return;
    }

    // Insert duel turns for both players
    await supabase.from('duel_turns').insert([
      {
        duel_id: duelId,
        player_id: gameState.challengerId,
        score: gameState.challengerScore,
        words_found: gameState.challengerWords,
        completed_at: new Date().toISOString(),
      },
      {
        duel_id: duelId,
        player_id: gameState.opponentId,
        score: gameState.opponentScore,
        words_found: gameState.opponentWords,
        completed_at: new Date().toISOString(),
      },
    ]).select();

    // Award XP
    // winner/loser keys match what the client reads (result.xpAwarded.winner / .loser)
    let xpAwarded: { winner: number; loser: number };

    if (winnerId === null) {
      // Draw - both get DUEL_DRAW XP; winner and loser have the same value
      xpAwarded = {
        winner: EDUCATION_XP_CONFIG.DUEL_DRAW,
        loser: EDUCATION_XP_CONFIG.DUEL_DRAW,
      };

      await Promise.all([
        supabase.rpc('award_education_xp', {
          p_student_id: gameState.challengerId,
          p_xp_amount: EDUCATION_XP_CONFIG.DUEL_DRAW,
          p_lesson_id: gameState.lessonId,
        }),
        supabase.rpc('award_education_xp', {
          p_student_id: gameState.opponentId,
          p_xp_amount: EDUCATION_XP_CONFIG.DUEL_DRAW,
          p_lesson_id: gameState.lessonId,
        }),
      ]);

      logger.info(
        'DUEL',
        `Real-time duel ${duelId} completed - DRAW (both get ${EDUCATION_XP_CONFIG.DUEL_DRAW} XP)`
      );
    } else {
      // Win/Loss
      const loserId = winnerId === gameState.challengerId
        ? gameState.opponentId
        : gameState.challengerId;

      xpAwarded = {
        winner: EDUCATION_XP_CONFIG.DUEL_WIN_REALTIME,
        loser: EDUCATION_XP_CONFIG.DUEL_LOSS_REALTIME,
      } as { winner: number; loser: number };

      await Promise.all([
        supabase.rpc('award_education_xp', {
          p_student_id: winnerId,
          p_xp_amount: EDUCATION_XP_CONFIG.DUEL_WIN_REALTIME,
          p_lesson_id: gameState.lessonId,
        }),
        supabase.rpc('award_education_xp', {
          p_student_id: loserId,
          p_xp_amount: EDUCATION_XP_CONFIG.DUEL_LOSS_REALTIME,
          p_lesson_id: gameState.lessonId,
        }),
      ]);

      logger.info(
        'DUEL',
        `Real-time duel ${duelId} completed - Winner: ${winnerId} (${EDUCATION_XP_CONFIG.DUEL_WIN_REALTIME} XP), Loser: ${loserId} (${EDUCATION_XP_CONFIG.DUEL_LOSS_REALTIME} XP)`
      );
    }

    // B12 fix: Update daily challenge progress for duel completion
    updateDuelChallengeProgress(supabase, gameState.challengerId, gameState.opponentId, winnerId).catch(err =>
      logger.error('DUEL', `Failed to update challenge progress: ${(err as Error).message}`)
    );

    // Emit completion to room
    const duelRoom = `duel:${duelId}`;
    namespace.to(duelRoom).emit('duel:completed', {
      winnerId,
      challengerScore: gameState.challengerScore,
      opponentScore: gameState.opponentScore,
      xpAwarded,
    });

    // Cleanup: clear timer and remove from map
    timerManager.clearTimer(`duel:${duelId}`);
    realtimeGames.delete(duelId);
  } catch (error) {
    logger.error('DUEL', `Error completing real-time duel ${duelId}: ${(error as Error).message}`);
  }
}

/**
 * B12 fix: Update daily challenge progress after a duel completes.
 * Increments duel_played for both players, duel_wins for the winner only.
 */
export async function updateDuelChallengeProgress(
   
  supabaseClient: any,
  challengerId: string,
  opponentId: string,
  winnerId: string | null
): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const players = [challengerId, opponentId];

  for (const playerId of players) {
    const types = ['duel_played'];
    if (winnerId === playerId) types.push('duel_wins');

    const { data: challenges } = await supabaseClient
      .from('daily_challenges')
      .select('id, current_value, target_value, challenge_type')
      .eq('player_id', playerId)
      .eq('challenge_date', today)
      .eq('completed', false)
      .in('challenge_type', types);

    if (!challenges) continue;

    for (const c of challenges) {
      const newVal = c.current_value + 1;
      const isCompleted = newVal >= c.target_value;
      await supabaseClient.from('daily_challenges').update({
        current_value: newVal,
        ...(isCompleted ? { completed: true, completed_at: new Date().toISOString() } : {}),
      }).eq('id', c.id);
    }
  }
}
