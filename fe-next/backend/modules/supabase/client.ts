/**
 * Supabase Client Module
 * Core client initialization and configuration for backend operations.
 * Uses a concurrency-limited fetch to prevent Varnish 503 "max_conn reached" errors.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import logger from '../../utils/logger';
import type { FoundWord } from './foundWords';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Max concurrent HTTP requests to Supabase PostgREST API.
// Supabase free/Pro Varnish layer typically allows 20-60 concurrent connections.
// Default bumped from 15→25 to handle burst writes at game-end (multiple players saving results).
const MAX_CONCURRENT_REQUESTS = parseInt(process.env.SUPABASE_MAX_CONCURRENT || '25', 10);

// Queue depth warning threshold — alert when too many requests are waiting
const QUEUE_DEPTH_WARNING = parseInt(process.env.SUPABASE_QUEUE_WARN || '10', 10);

// Semaphore for limiting concurrent Supabase API requests
let activeRequests = 0;
const requestQueue: Array<() => void> = [];

function acquireSlot(): Promise<void> {
  if (activeRequests < MAX_CONCURRENT_REQUESTS) {
    activeRequests++;
    return Promise.resolve();
  }
  return new Promise<void>((resolve) => {
    requestQueue.push(() => {
      activeRequests++;
      resolve();
    });
  });
}

function releaseSlot(): void {
  activeRequests--;
  const next = requestQueue.shift();
  if (next) next();

  // Warn when queue depth indicates sustained backpressure
  if (requestQueue.length >= QUEUE_DEPTH_WARNING) {
    logger.warn('SUPABASE', `Request queue depth: ${requestQueue.length} (threshold: ${QUEUE_DEPTH_WARNING}). Active: ${activeRequests}/${MAX_CONCURRENT_REQUESTS}`);
  }
}

// Concurrency-limited fetch wrapper for Supabase client
const originalFetch = globalThis.fetch;
function concurrencyLimitedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const isSupabaseRequest = supabaseUrl && url.startsWith(supabaseUrl);

  if (!isSupabaseRequest) {
    return originalFetch(input, init);
  }

  return acquireSlot().then(() => {
    return originalFetch(input, init).finally(() => {
      releaseSlot();
    });
  });
}

// Log configuration status at startup
logger.info('SUPABASE', `Configuration status: URL=${!!supabaseUrl}, ServiceKey=${!!supabaseServiceKey}, MaxConcurrent=${MAX_CONCURRENT_REQUESTS}`);
if (!supabaseUrl || !supabaseServiceKey) {
  logger.warn('SUPABASE', 'Supabase not fully configured (missing URL or SUPABASE_SERVICE_ROLE_KEY). Stats will not be saved to database.');
} else {
  // Validate service key by testing a simple query on startup
  (async () => {
    try {
      const testClient = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
        global: { fetch: concurrencyLimitedFetch }
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
 * Uses service role key to bypass RLS for server-side operations.
 * Includes concurrency-limited fetch to prevent Varnish max_conn exhaustion.
 */
export function getSupabase(): SupabaseClient | null {
  if (!supabase && supabaseUrl && supabaseServiceKey) {
    supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      global: {
        fetch: concurrencyLimitedFetch
      }
    });
  }
  return supabase;
}

/** Expose metrics for monitoring */
export function getConnectionMetrics() {
  return { activeRequests, queueLength: requestQueue.length, maxConcurrent: MAX_CONCURRENT_REQUESTS };
}

/**
 * Check if Supabase is configured
 */
export function isSupabaseConfigured(): boolean {
  if (!supabaseUrl || !supabaseServiceKey) {
    return false;
  }
  // Only check non-empty — the startup test query validates the actual key
  return supabaseServiceKey.trim() !== '';
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
  /** Game mode — used to down-weight casual leaderboard (total_score) contributions. */
  gameMode?: string;
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
  /** Landing-page game mode: singleplayer, multiplayer, daily, adventure, blast */
  gameMode?: string;
  /**
   * Number of REAL (non-bot) players in the game. Used by the leaderboard to
   * exclude games with no real opponent (a lone human vs bots). Omit/undefined
   * when unknown — such rows are treated as legacy and still count.
   */
  realPlayerCount?: number;
}

export interface PlayerScore {
  username: string;
  score: number;
  wordCount?: number;
  longestWord?: string;
  placement?: number;
  achievements?: string[];
  /**
   * The validated words this player found, in the `game_sessions.words_found`
   * shape, for admin analytics. Optional so non-word modes can omit it.
   */
  words?: FoundWord[];
}

export interface GameInfo {
  language?: string;
  isRanked?: boolean;
  timePlayed?: number;
  /** Landing-page game mode: singleplayer, multiplayer, daily, adventure, blast */
  gameMode?: string;
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
  getConnectionMetrics,
};
