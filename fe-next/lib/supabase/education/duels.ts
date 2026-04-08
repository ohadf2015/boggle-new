/**
 * Duel Operations
 * Database CRUD operations for student_duels and duel_turns tables
 */

import { supabase } from '@/lib/supabase';
import logger from '@/utils/logger';

// ============================================
// TYPE DEFINITIONS
// ============================================

export type DuelStatus =
  | 'pending'
  | 'active'
  | 'completed'
  | 'cancelled'
  | 'expired'
  | 'declined';

export type DuelType = 'async' | 'realtime';

export interface DuelRow {
  id: string;
  classroom_id: string;
  challenger_id: string;
  opponent_id: string;
  lesson_id: string;
  duel_type: DuelType;
  status: DuelStatus;
  board_state: string[][] | null;
  challenger_score: number;
  opponent_score: number;
  winner_id: string | null;
  xp_awarded: boolean;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  expires_at: string | null;
}

export interface DuelTurnRow {
  id: string;
  duel_id: string;
  player_id: string;
  score: number;
  words_found: string[];
  board_state_snapshot: string[][] | null;
  started_at: string;
  completed_at: string | null;
}

export interface CreateDuelData {
  challengerId: string;
  opponentId: string;
  classroomId: string;
  lessonId: string;
  boardState: string[][];
  expiresAt?: string;
}

export interface DuelHistoryEntry extends DuelRow {
  challenger: {
    id: string;
    display_name: string;
    avatar_config: Record<string, unknown> | null;
  };
  opponent: {
    id: string;
    display_name: string;
    avatar_config: Record<string, unknown> | null;
  };
  isWin: boolean;
}

export interface DuelStatsResult {
  wins: number;
  losses: number;
  draws: number;
  winStreak: number;
  currentStreak: number;
  opponentStats: Map<string, { wins: number; losses: number }>;
}

// ============================================
// CRUD OPERATIONS
// ============================================

/**
 * Create a new duel challenge
 * @param data - Duel creation data
 * @returns Created duel row or error
 */
export async function createDuel(
  data: CreateDuelData
): Promise<{ data: DuelRow | null; error: { message: string } | null }> {
  try {
    if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };

    // Default expires_at to 24 hours from now if not provided
    const expiresAt =
      data.expiresAt ||
      new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const { data: duel, error } = await supabase
      .from('student_duels')
      .insert({
        challenger_id: data.challengerId,
        opponent_id: data.opponentId,
        classroom_id: data.classroomId,
        lesson_id: data.lessonId,
        board_state: data.boardState,
        duel_type: 'async',
        status: 'pending',
        challenger_score: 0,
        opponent_score: 0,
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (error) {
      logger.error('Error creating duel:', error);
      return { data: null, error: { message: error.message } };
    }

    return { data: duel as DuelRow, error: null };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Exception in createDuel:', error);
    return { data: null, error: { message: error } };
  }
}

/**
 * Get a single duel by ID with challenger and opponent profiles
 * @param duelId - Duel UUID
 * @returns Duel row with profile joins or error
 */
export async function getDuelById(
  duelId: string
): Promise<{ data: any | null; error: { message: string } | null }> {
  try {
    if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };

    const { data: duel, error } = await supabase
      .from('student_duels')
      .select(
        `
        *,
        challenger:profiles!student_duels_challenger_id_fkey(id, display_name, avatar_config),
        opponent:profiles!student_duels_opponent_id_fkey(id, display_name, avatar_config)
      `
      )
      .eq('id', duelId)
      .single();

    if (error) {
      logger.error('Error fetching duel:', error);
      return { data: null, error: { message: error.message } };
    }

    return { data: duel, error: null };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Exception in getDuelById:', error);
    return { data: null, error: { message: error } };
  }
}

/**
 * Update duel status and optional fields
 * @param duelId - Duel UUID
 * @param status - New status
 * @param updates - Optional additional fields to update
 * @returns Updated duel row or error
 */
export async function updateDuelStatus(
  duelId: string,
  status: DuelStatus,
  updates?: Partial<DuelRow>
): Promise<{ data: DuelRow | null; error: { message: string } | null }> {
  try {
    if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };

    const { data: duel, error } = await supabase
      .from('student_duels')
      .update({
        status,
        ...updates,
      })
      .eq('id', duelId)
      .select()
      .single();

    if (error) {
      logger.error('Error updating duel status:', error);
      return { data: null, error: { message: error.message } };
    }

    return { data: duel as DuelRow, error: null };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Exception in updateDuelStatus:', error);
    return { data: null, error: { message: error } };
  }
}

/**
 * Get duel history for a student with profile joins and computed isWin field
 * @param studentId - Student UUID
 * @param limit - Optional limit on results
 * @returns Array of duel history entries or error
 */
export async function getDuelHistory(
  studentId: string,
  limit?: number
): Promise<{ data: DuelHistoryEntry[]; error: { message: string } | null }> {
  try {
    if (!supabase) return { data: [], error: { message: 'Supabase not configured' } };

    let query = supabase
      .from('student_duels')
      .select(
        `
        *,
        challenger:profiles!student_duels_challenger_id_fkey(id, display_name, avatar_config),
        opponent:profiles!student_duels_opponent_id_fkey(id, display_name, avatar_config)
      `
      )
      .eq('status', 'completed')
      .or(`challenger_id.eq.${studentId},opponent_id.eq.${studentId}`)
      .order('completed_at', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data: duels, error } = await query;

    if (error) {
      logger.warn('Error fetching duel history:', error.message);
      return { data: [], error: { message: error.message } };
    }

    // Compute isWin for each duel
    const history = (duels || []).map((duel: any) => ({
      ...duel,
      isWin: duel.winner_id === studentId,
    }));

    return { data: history as DuelHistoryEntry[], error: null };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Exception in getDuelHistory:', error);
    return { data: [], error: { message: error } };
  }
}

/**
 * Get duel statistics for a student
 * Computes wins, losses, draws, streaks, and per-opponent stats
 * @param studentId - Student UUID
 * @returns Duel stats or error
 */
export async function getDuelStats(
  studentId: string
): Promise<{ data: DuelStatsResult | null; error: { message: string } | null }> {
  try {
    if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };

    const { data: duels, error } = await supabase
      .from('student_duels')
      .select('*')
      .eq('status', 'completed')
      .or(`challenger_id.eq.${studentId},opponent_id.eq.${studentId}`)
      .order('completed_at', { ascending: false });

    if (error) {
      logger.warn('Error fetching duel stats:', error.message);
      return { data: null, error: { message: error.message } };
    }

    if (!duels || duels.length === 0) {
      return {
        data: {
          wins: 0,
          losses: 0,
          draws: 0,
          winStreak: 0,
          currentStreak: 0,
          opponentStats: new Map(),
        },
        error: null,
      };
    }

    let wins = 0;
    let losses = 0;
    let draws = 0;
    let currentStreak = 0;
    let maxStreak = 0;
    let tempStreak = 0;
    const opponentStats = new Map<string, { wins: number; losses: number }>();

    // Process duels in chronological order for streak calculation
    const chronologicalDuels = [...duels].reverse();

    for (const duel of chronologicalDuels) {
      const isWin = duel.winner_id === studentId;
      const isDraw = duel.winner_id === null;
      const opponentId =
        duel.challenger_id === studentId
          ? duel.opponent_id
          : duel.challenger_id;

      // Count wins/losses/draws
      if (isWin) {
        wins++;
        tempStreak++;
        maxStreak = Math.max(maxStreak, tempStreak);
      } else if (isDraw) {
        draws++;
        tempStreak = 0;
      } else {
        losses++;
        tempStreak = 0;
      }

      // Track per-opponent stats
      const stats = opponentStats.get(opponentId) || { wins: 0, losses: 0 };
      if (isWin) {
        stats.wins++;
      } else if (!isDraw) {
        stats.losses++;
      }
      opponentStats.set(opponentId, stats);
    }

    // Current streak is the tempStreak at the end (most recent duels)
    currentStreak = tempStreak;

    return {
      data: {
        wins,
        losses,
        draws,
        winStreak: maxStreak,
        currentStreak,
        opponentStats,
      },
      error: null,
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Exception in getDuelStats:', error);
    return { data: null, error: { message: error } };
  }
}

/**
 * Submit a duel turn (async duels only)
 * @param duelId - Duel UUID
 * @param playerId - Player UUID
 * @param score - Turn score
 * @param wordsFound - Array of words found
 * @returns Created turn row or error
 */
export async function submitDuelTurn(
  duelId: string,
  playerId: string,
  score: number,
  wordsFound: string[]
): Promise<{ data: DuelTurnRow | null; error: { message: string } | null }> {
  try {
    if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };

    const { data: turn, error } = await supabase
      .from('duel_turns')
      .insert({
        duel_id: duelId,
        player_id: playerId,
        score,
        words_found: wordsFound,
        completed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      logger.error('Error submitting duel turn:', error);
      return { data: null, error: { message: error.message } };
    }

    return { data: turn as DuelTurnRow, error: null };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Exception in submitDuelTurn:', error);
    return { data: null, error: { message: error } };
  }
}

/**
 * Get pending duels for a student (where they are the opponent)
 * @param studentId - Student UUID
 * @returns Array of pending duel rows or error
 */
export async function getPendingDuelsForStudent(
  studentId: string,
  client?: import('@supabase/supabase-js').SupabaseClient
): Promise<{ data: DuelRow[]; error: { message: string } | null }> {
  try {
    const db = client ?? supabase;
    if (!db) return { data: [], error: { message: 'Supabase not configured' } };

    const { data: duels, error } = await db
      .from('student_duels')
      .select('*')
      .eq('opponent_id', studentId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      logger.warn('Error fetching pending duels:', error.message);
      return { data: [], error: { message: error.message } };
    }

    return { data: (duels || []) as DuelRow[], error: null };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Exception in getPendingDuelsForStudent:', error);
    return { data: [], error: { message: error } };
  }
}