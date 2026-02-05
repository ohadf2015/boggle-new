/**
 * Supabase Client Module
 * Core client initialization and configuration for backend operations
 */

import type { SupabaseClient } from '@supabase/supabase-js';

const { createClient } = require('@supabase/supabase-js');
const logger = require('../../utils/logger');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Log configuration status at startup
logger.info('SUPABASE', `Configuration status: URL=${!!supabaseUrl}, ServiceKey=${!!supabaseServiceKey}`);
if (!supabaseUrl || !supabaseServiceKey) {
  logger.warn('SUPABASE', 'Supabase not fully configured (missing URL or SUPABASE_SERVICE_ROLE_KEY). Stats will not be saved to database.');
} else {
  // Validate service key by testing a simple query on startup
  (async () => {
    try {
      const testClient = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      });
      const { error } = await testClient.from('profiles').select('id').limit(1);
      if (error) {
        logger.error('SUPABASE', `SERVICE KEY VALIDATION FAILED: ${error.message}. Check your SUPABASE_SERVICE_ROLE_KEY in .env`);
        if (error.message.includes('401') || error.code === 'PGRST301') {
          logger.error('SUPABASE', 'The service role key appears to be invalid or expired. Please get a new key from Supabase dashboard > Settings > API');
        }
      } else {
        logger.info('SUPABASE', 'Service role key validated successfully');
      }
    } catch (err) {
      logger.error('SUPABASE', `Failed to validate service key: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  })();
}

let supabase: SupabaseClient | null = null;

/**
 * Initialize Supabase client (lazy initialization)
 * Uses service role key to bypass RLS for server-side operations
 */
export function getSupabase(): SupabaseClient | null {
  if (!supabase && supabaseUrl && supabaseServiceKey) {
    supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }
  return supabase;
}

/**
 * Check if Supabase is configured
 */
export function isSupabaseConfigured(): boolean {
  if (!supabaseUrl || !supabaseServiceKey) {
    return false;
  }

  const trimmedKey = supabaseServiceKey.trim();
  return (
    trimmedKey !== '' &&
    trimmedKey !== 'YOUR_SERVICE_ROLE_KEY_HERE' &&
    trimmedKey !== 'placeholder' &&
    !trimmedKey.includes('SERVICE_ROLE_KEY')
  );
}

// Type definitions shared across modules
export interface GameStats {
  score?: number;
  wordCount?: number;
  longestWord?: string;
  placement?: number;
  achievements?: string[];
  isRanked?: boolean;
  totalPlayers?: number;
  timePlayed?: number;
}

export interface GameResultInput {
  playerId: string;
  gameCode: string;
  score?: number;
  wordCount?: number;
  longestWord?: string;
  placement?: number;
  isRanked?: boolean;
  language?: string;
  timePlayed?: number;
}

export interface PlayerScore {
  username: string;
  score: number;
  wordCount?: number;
  longestWord?: string;
  placement?: number;
  achievements?: string[];
}

export interface GameInfo {
  language?: string;
  isRanked?: boolean;
  timePlayed?: number;
}

export interface UserAuthInfo {
  authUserId?: string | null;
  guestTokenHash?: string | null;
  guestSessionId?: string | null;
  socketId?: string;
}

export interface XpInfo {
  xpEarned: number;
  xpBreakdown: {
    gameCompletion: number;
    scoreXp: number;
    winBonus: number;
    achievementXp: number;
  };
  newTotalXp: number;
  oldLevel: number;
  newLevel: number;
  leveledUp: boolean;
  levelsGained: number;
  newTitles: string[];
}

export interface XpResultWithSocket extends XpInfo {
  socketId?: string;
}

export interface UpdatedUserStats {
  gamesPlayed: number;
  gamesWon: number;
  totalWordsFound: number;
  totalScore: number;
  uniqueDaysPlayed: number;
}

export interface LifetimeAchievement {
  key: string;
  icon: string;
}

// CommonJS exports for backward compatibility
module.exports = {
  getSupabase,
  isSupabaseConfigured,
};
