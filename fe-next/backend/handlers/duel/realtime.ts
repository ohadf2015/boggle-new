/**
 * Real-Time Duel Handlers
 *
 * Handles real-time duel gameplay: word submission with server-side validation,
 * opponent progress broadcasting, and server-side timer-based completion.
 */

import type { Namespace } from 'socket.io';
import type { Language } from '@/shared/types';
import { type DuelSocket, type SubmitWordPayload, submitWordSchema } from './types';
import { getSupabase } from '@/backend/modules/supabase/client';
import { isDictionaryWord } from '@/backend/dictionary';
import { isWordOnBoardAsync } from '@/backend/modules/wordValidatorPool';
import { calculateWordScore } from '@/backend/modules/scoringEngine.types';
import { EDUCATION_XP_CONFIG } from '@/backend/modules/educationXpManager';
import logger from '@/backend/utils/logger';

// ==========================================
// In-Memory Game State
// ==========================================

interface RealtimeGameState {
  challengerId: string;
  opponentId: string;
  boardState: string[][];
  language: string;
  timeLimit: number;
  startTime: string;
  timer: NodeJS.Timeout | null;
  challengerWords: string[];
  opponentWords: string[];
  challengerScore: number;
  opponentScore: number;
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
      if (!gameState) {
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

      // Check duplicate
      if (playerWords.includes(payload.word.toLowerCase())) {
        socket.emit('duel:word-rejected', {
          word: payload.word,
          reason: 'Word already found (duplicate)',
        });
        return;
      }

      // Validate dictionary
      const inDictionary = isDictionaryWord(payload.word, gameState.language as Language);
      if (!inDictionary) {
        socket.emit('duel:word-rejected', {
          word: payload.word,
          reason: 'Word not in dictionary',
        });
        return;
      }

      // Validate on board
      const onBoard = await isWordOnBoardAsync(payload.word, gameState.boardState);
      if (!onBoard) {
        socket.emit('duel:word-rejected', {
          word: payload.word,
          reason: 'Word not on board',
        });
        return;
      }

      // Calculate score (no combo in real-time duels)
      const points = calculateWordScore(payload.word, 0);

      // Update in-memory state
      playerWords.push(payload.word.toLowerCase());
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
      boardState: duel.board_state as string[][],
      language: lesson.language,
      timeLimit: duel.time_limit || 180,
      startTime,
      timer: null,
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

    // Start server-side timer
    gameState.timer = setTimeout(async () => {
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

    // Determine winner
    let winnerId: string | null = null;
    if (gameState.challengerScore > gameState.opponentScore) {
      winnerId = gameState.challengerId;
    } else if (gameState.opponentScore > gameState.challengerScore) {
      winnerId = gameState.opponentId;
    }
    // null = draw

    // Atomic DB update (race condition protection)
    const { data: updated, error: updateError, count } = await supabase
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
      .select();

    if (updateError) {
      logger.error('DUEL', `Failed to complete duel: ${updateError.message}`);
      return;
    }

    // If count is 0, race condition detected (already completed)
    if (!count || count === 0) {
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
    let xpAwarded: { winner?: number; loser?: number; challenger?: number; opponent?: number };

    if (winnerId === null) {
      // Draw - both get DUEL_DRAW XP
      xpAwarded = {
        challenger: EDUCATION_XP_CONFIG.DUEL_DRAW,
        opponent: EDUCATION_XP_CONFIG.DUEL_DRAW,
      };

      await Promise.all([
        supabase.rpc('award_education_xp', {
          p_student_id: gameState.challengerId,
          p_xp_amount: EDUCATION_XP_CONFIG.DUEL_DRAW,
        }),
        supabase.rpc('award_education_xp', {
          p_student_id: gameState.opponentId,
          p_xp_amount: EDUCATION_XP_CONFIG.DUEL_DRAW,
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
      };

      await Promise.all([
        supabase.rpc('award_education_xp', {
          p_student_id: winnerId,
          p_xp_amount: EDUCATION_XP_CONFIG.DUEL_WIN_REALTIME,
        }),
        supabase.rpc('award_education_xp', {
          p_student_id: loserId,
          p_xp_amount: EDUCATION_XP_CONFIG.DUEL_LOSS_REALTIME,
        }),
      ]);

      logger.info(
        'DUEL',
        `Real-time duel ${duelId} completed - Winner: ${winnerId} (${EDUCATION_XP_CONFIG.DUEL_WIN_REALTIME} XP), Loser: ${loserId} (${EDUCATION_XP_CONFIG.DUEL_LOSS_REALTIME} XP)`
      );
    }

    // Emit completion to room
    const duelRoom = `duel:${duelId}`;
    namespace.to(duelRoom).emit('duel:completed', {
      winnerId,
      challengerScore: gameState.challengerScore,
      opponentScore: gameState.opponentScore,
      xpAwarded,
    });

    // Cleanup: clear timer and remove from map
    if (gameState.timer) {
      clearTimeout(gameState.timer);
    }
    realtimeGames.delete(duelId);
  } catch (error) {
    logger.error('DUEL', `Error completing real-time duel ${duelId}: ${(error as Error).message}`);
  }
}
