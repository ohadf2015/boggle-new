/**
 * Game Session Logger Module
 * Handles logging game sessions to database for analytics and history tracking
 */

import { type SupabaseClient, createClient } from '@supabase/supabase-js';

import logger from '../utils/logger';

/**
 * Backend-safe error capture that doesn't require @sentry/nextjs
 * Logs errors to console in development and captures via Sentry in production
 * when running within Next.js context (not standalone backend)
 */
function captureBackgroundErrorSafe(
  error: Error,
  context: { operation: string; service?: string; userId?: string }
): void {
  // Always log to our logger for backend visibility
  logger.error('GAME_SESSION_LOGGER', `[${context.operation}] ${error.message}`, {
    service: context.service,
    userId: context.userId,
    stack: error.stack,
  });
}

// Create Supabase client (lazy loaded)
let supabase: SupabaseClient | null = null;

/** Test-only: reset the cached client */
export function _resetSupabaseForTesting(): void {
  supabase = null;
}

function getSupabaseClient(): SupabaseClient | null {
  if (supabase) return supabase;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    logger.warn('GAME_SESSION_LOGGER', 'Supabase not configured. Game sessions will not be logged.');
    return null;
  }

  supabase = createClient(supabaseUrl, supabaseServiceKey);
  return supabase;
}

export interface WordFound {
  word: string;
  timestamp: number;
  points: number;
  length: number;
}

export interface GameSessionData {
  // Player identification (one will be set)
  userId?: string | null;
  guestSessionId?: string | null;

  // Game details
  mode: 'singleplayer' | 'multiplayer' | 'daily_challenge' | 'word_hunt';
  language: string;
  difficulty?: string | null;

  // Results
  score?: number;
  wordsFound?: WordFound[];
  durationSeconds?: number;
  completed?: boolean;

  // Daily challenge specific
  dailyPuzzleNumber?: number | null;
  targetWord?: string | null;
  targetFound?: boolean;
  attemptsUsed?: number | null;
  lifeRemaining?: number | null;
  lifeGained?: number;
  tokensEarned?: number;
  tokensSpent?: number;
  cluesUsed?: number;

  // Multiplayer specific
  roomCode?: string | null;
  playerCount?: number | null;
  finalRank?: number | null;

  // Context
  deviceType?: string | null;
  browser?: string | null;
  country?: string | null;
  referrerSource?: string | null;
  isFirstGame?: boolean;

  // Timestamps
  startedAt: Date;
  completedAt?: Date | null;
}

export interface GameSessionUpdateData {
  score?: number;
  wordsFound?: WordFound[];
  durationSeconds?: number;
  completed?: boolean;
  targetFound?: boolean;
  attemptsUsed?: number;
  lifeRemaining?: number;
  lifeGained?: number;
  tokensEarned?: number;
  tokensSpent?: number;
  cluesUsed?: number;
  finalRank?: number;
  completedAt?: Date;
}

export interface GameSessionFilters {
  userId?: string;
  guestSessionId?: string;
  mode?: string;
  language?: string;
  startDate?: Date;
  endDate?: Date;
  completed?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * Create a new game session log entry
 */
export async function logGameSession(sessionData: GameSessionData): Promise<string | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  // DB check_player_id constraint requires exactly one identifier (XOR)
  if (!sessionData.userId && !sessionData.guestSessionId) {
    logger.debug('GAME_SESSION_LOGGER', 'Skipping game session log: no player identifier');
    return null;
  }
  // When both are set, prefer authenticated userId (XOR enforcement)
  if (sessionData.userId && sessionData.guestSessionId) {
    sessionData = { ...sessionData, guestSessionId: null };
  }

  try {
    const { data, error } = await client
      .from('game_sessions')
      .insert({
        user_id: sessionData.userId || null,
        guest_session_id: sessionData.guestSessionId || null,
        mode: sessionData.mode,
        language: sessionData.language,
        difficulty: sessionData.difficulty || null,
        score: sessionData.score || 0,
        words_found: sessionData.wordsFound || [],
        duration_seconds: sessionData.durationSeconds || null,
        completed: sessionData.completed || false,
        daily_puzzle_number: sessionData.dailyPuzzleNumber || null,
        target_word: sessionData.targetWord || null,
        target_found: sessionData.targetFound || false,
        attempts_used: sessionData.attemptsUsed || null,
        life_remaining: sessionData.lifeRemaining || null,
        life_gained: sessionData.lifeGained || 0,
        tokens_earned: sessionData.tokensEarned || 0,
        tokens_spent: sessionData.tokensSpent || 0,
        clues_used: sessionData.cluesUsed || 0,
        room_code: sessionData.roomCode || null,
        player_count: sessionData.playerCount || null,
        final_rank: sessionData.finalRank || null,
        device_type: sessionData.deviceType || null,
        browser: sessionData.browser || null,
        country: sessionData.country || null,
        referrer_source: sessionData.referrerSource || null,
        is_first_game: sessionData.isFirstGame || false,
        started_at: sessionData.startedAt.toISOString(),
        completed_at: sessionData.completedAt?.toISOString() || null,
      })
      .select('id')
      .single();

    if (error) {
      logger.error('GAME_SESSION_LOGGER', `Failed to log game session: ${error.message}`);
      captureBackgroundErrorSafe(new Error(error.message), {
        operation: 'log_game_session',
        service: 'gameSessionLogger',
        userId: sessionData.userId || undefined,
      });
      return null;
    }

    const actorKind = sessionData.userId ? 'user' : sessionData.guestSessionId ? 'guest' : 'anonymous';
    logger.info('GAME_SESSION_LOGGER', `Logged ${sessionData.mode} session for ${actorKind}`);
    return data.id;
  } catch (err) {
    logger.error('GAME_SESSION_LOGGER', `Exception logging game session: ${err}`);
    captureBackgroundErrorSafe(err instanceof Error ? err : new Error(String(err)), {
      operation: 'log_game_session_exception',
      service: 'gameSessionLogger',
      userId: sessionData.userId || undefined,
    });
    return null;
  }
}

/**
 * Update an existing game session (e.g., when game completes)
 */
export async function updateGameSession(
  sessionId: string,
  updates: GameSessionUpdateData
): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const updateData: Record<string, unknown> = {};

    if (updates.score !== undefined) updateData.score = updates.score;
    if (updates.wordsFound !== undefined) updateData.words_found = updates.wordsFound;
    if (updates.durationSeconds !== undefined) updateData.duration_seconds = updates.durationSeconds;
    if (updates.completed !== undefined) updateData.completed = updates.completed;
    if (updates.targetFound !== undefined) updateData.target_found = updates.targetFound;
    if (updates.attemptsUsed !== undefined) updateData.attempts_used = updates.attemptsUsed;
    if (updates.lifeRemaining !== undefined) updateData.life_remaining = updates.lifeRemaining;
    if (updates.lifeGained !== undefined) updateData.life_gained = updates.lifeGained;
    if (updates.tokensEarned !== undefined) updateData.tokens_earned = updates.tokensEarned;
    if (updates.tokensSpent !== undefined) updateData.tokens_spent = updates.tokensSpent;
    if (updates.cluesUsed !== undefined) updateData.clues_used = updates.cluesUsed;
    if (updates.finalRank !== undefined) updateData.final_rank = updates.finalRank;
    if (updates.completedAt !== undefined) updateData.completed_at = updates.completedAt.toISOString();

    const { error } = await client
      .from('game_sessions')
      .update(updateData)
      .eq('id', sessionId);

    if (error) {
      logger.error('GAME_SESSION_LOGGER', `Failed to update game session: ${error.message}`);
      captureBackgroundErrorSafe(new Error(error.message), {
        operation: 'update_game_session',
        service: 'gameSessionLogger',
      });
      return false;
    }

    logger.info('GAME_SESSION_LOGGER', `Updated game session ${sessionId}`);
    return true;
  } catch (err) {
    logger.error('GAME_SESSION_LOGGER', `Exception updating game session: ${err}`);
    captureBackgroundErrorSafe(err instanceof Error ? err : new Error(String(err)), {
      operation: 'update_game_session_exception',
      service: 'gameSessionLogger',
    });
    return false;
  }
}

/**
 * Get game sessions with filters (for admin/analytics)
 */
export async function getGameSessions(filters: GameSessionFilters = {}): Promise<any[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  try {
    let query = client
      .from('game_sessions')
      .select('*')
      .order('started_at', { ascending: false });

    if (filters.userId) {
      query = query.eq('user_id', filters.userId);
    }

    if (filters.guestSessionId) {
      query = query.eq('guest_session_id', filters.guestSessionId);
    }

    if (filters.mode) {
      query = query.eq('mode', filters.mode);
    }

    if (filters.language) {
      query = query.eq('language', filters.language);
    }

    if (filters.startDate) {
      query = query.gte('started_at', filters.startDate.toISOString());
    }

    if (filters.endDate) {
      query = query.lte('started_at', filters.endDate.toISOString());
    }

    if (filters.completed !== undefined) {
      query = query.eq('completed', filters.completed);
    }

    query = query.limit(filters.limit || 500);

    if (filters.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('GAME_SESSION_LOGGER', `Failed to fetch game sessions: ${error.message}`);
      return [];
    }

    return data || [];
  } catch (err) {
    logger.error('GAME_SESSION_LOGGER', `Exception fetching game sessions: ${err}`);
    return [];
  }
}

/**
 * Get game session statistics (for analytics dashboard)
 */
export async function getGameSessionStats(filters: GameSessionFilters = {}): Promise<{
  totalSessions: number;
  totalPlayers: number;
  averageScore: number;
  averageDuration: number;
  completionRate: number;
  modeBreakdown: Record<string, number>;
  languageBreakdown: Record<string, number>;
}> {
  const client = getSupabaseClient();

  const defaultStats = {
    totalSessions: 0,
    totalPlayers: 0,
    averageScore: 0,
    averageDuration: 0,
    completionRate: 0,
    modeBreakdown: {},
    languageBreakdown: {},
  };

  if (!client) return defaultStats;

  try {
    // Get sessions
    const sessions = await getGameSessions(filters);

    if (sessions.length === 0) return defaultStats;

    // Calculate stats
    const totalSessions = sessions.length;
    const completedSessions = sessions.filter((s) => s.completed).length;
    const totalScore = sessions.reduce((sum, s) => sum + (s.score || 0), 0);
    const totalDuration = sessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0);

    // Count unique players
    const uniquePlayers = new Set([
      ...sessions.filter((s) => s.user_id).map((s) => s.user_id),
      ...sessions.filter((s) => s.guest_session_id).map((s) => s.guest_session_id),
    ]);

    // Mode breakdown
    const modeBreakdown: Record<string, number> = {};
    sessions.forEach((s) => {
      modeBreakdown[s.mode] = (modeBreakdown[s.mode] || 0) + 1;
    });

    // Language breakdown
    const languageBreakdown: Record<string, number> = {};
    sessions.forEach((s) => {
      languageBreakdown[s.language] = (languageBreakdown[s.language] || 0) + 1;
    });

    return {
      totalSessions,
      totalPlayers: uniquePlayers.size,
      averageScore: totalScore / totalSessions,
      averageDuration: totalDuration / totalSessions,
      completionRate: (completedSessions / totalSessions) * 100,
      modeBreakdown,
      languageBreakdown,
    };
  } catch (err) {
    logger.error('GAME_SESSION_LOGGER', `Exception calculating stats: ${err}`);
    return defaultStats;
  }
}
