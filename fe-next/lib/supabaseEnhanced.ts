/**
 * Enhanced Supabase Client Utilities
 * - Retry logic with exponential backoff
 * - Connection health monitoring
 * - Request batching
 * - Error handling with detailed logging
 */

import { supabase } from './supabase';
import logger from '@/utils/logger';

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'object' && err && 'message' in err && typeof (err as { message: unknown }).message === 'string') {
    return (err as { message: string }).message;
  }
  return String(err);
}

// Configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000,  // 1 second
  maxDelay: 10000,  // 10 seconds
  retryableErrors: [
    'PGRST301',     // JWT expired
    'PGRST302',     // JWT invalid
    'PGRST499',     // Connection timeout
    '08000',        // Connection exception
    '08006',        // Connection failure
    '57P01',        // Admin shutdown
    '57P02',        // Crash shutdown
    '57P03',        // Cannot connect now
  ]
};

interface ConnectionHealth {
  isHealthy: boolean;
  lastCheck: string | null;
  failureCount: number;
  lastError: unknown;
}

// Connection health state
let connectionHealth: ConnectionHealth = {
  isHealthy: true,
  lastCheck: null,
  failureCount: 0,
  lastError: null
};

/**
 * Check if error is retryable
 */
function isRetryableError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const msg = errorMessage(error);
  if (msg.includes('fetch failed') ||
      msg.includes('network') ||
      msg.includes('timeout') ||
      msg.includes('ECONNREFUSED')) {
    return true;
  }

  const code = 'code' in error ? (error as { code?: unknown }).code : undefined;
  if (typeof code === 'string' && RETRY_CONFIG.retryableErrors.includes(code)) {
    return true;
  }

  const status = 'status' in error ? (error as { status?: unknown }).status : undefined;
  if (typeof status === 'number' && status >= 500) {
    return true;
  }

  if (status === 429) {
    return true;
  }

  return false;
}

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateDelay(attempt: number): number {
  const exponentialDelay = RETRY_CONFIG.baseDelay * Math.pow(2, attempt);
  const jitter = Math.random() * 1000;
  return Math.min(exponentialDelay + jitter, RETRY_CONFIG.maxDelay);
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

interface RetryOptions {
  maxRetries?: number;
  context?: string;
}

/**
 * Execute a Supabase operation with retry logic
 * @param operation - Async function that returns { data, error }
 * @param options - Retry options
 * @returns Promise with { data, error }
 */
export async function withRetry<T = unknown>(
  operation: () => Promise<{ data: T | null; error: unknown }>,
  options: RetryOptions = {}
): Promise<{ data: T | null; error: unknown }> {
  const {
    maxRetries = RETRY_CONFIG.maxRetries,
    context = 'operation'
  } = options;

  let lastError: unknown = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await operation();

      if (result.error && isRetryableError(result.error)) {
        lastError = result.error;

        if (attempt < maxRetries) {
          const delay = calculateDelay(attempt);
          logger.warn(`[Supabase] ${context} failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms:`, errorMessage(result.error));
          await sleep(delay);
          continue;
        }
      }

      // Success or non-retryable error
      if (!result.error) {
        connectionHealth.isHealthy = true;
        connectionHealth.failureCount = 0;
      }

      return result;
    } catch (err: unknown) {
      lastError = err;

      if (attempt < maxRetries && isRetryableError(err)) {
        const delay = calculateDelay(attempt);
        logger.warn(`[Supabase] ${context} exception (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms:`, errorMessage(err));
        await sleep(delay);
        continue;
      }

      // Track connection issues
      connectionHealth.isHealthy = false;
      connectionHealth.failureCount++;
      connectionHealth.lastError = err;

      return { data: null, error: err };
    }
  }

  // All retries exhausted
  logger.error(`[Supabase] ${context} failed after ${maxRetries + 1} attempts:`, lastError);
  connectionHealth.isHealthy = false;
  connectionHealth.failureCount++;
  connectionHealth.lastError = lastError;

  return { data: null, error: lastError };
}

// Batch queries removed - was unused

/**
 * Enhanced profile operations with optimistic updates
 */
export const profileOperations = {
  /**
   * Get profile with caching hint
   */
  async get(userId: string) {
    return withRetry(
      async () => supabase!
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single(),
      { context: 'getProfile' }
    );
  },

  /**
   * Update profile with validation
   */
  async update(userId: string, updates: Record<string, unknown>) {
    // Validate updates
    const allowedFields = [
      'username', 'display_name', 'avatar_image', 'avatar_emoji', 'avatar_color',
    ];

    const sanitizedUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        sanitizedUpdates[key] = value;
      }
    }

    if (Object.keys(sanitizedUpdates).length === 0) {
      return { data: null, error: { message: 'No valid fields to update' } };
    }

    return withRetry(
      async () => supabase!
        .from('profiles')
        .update(sanitizedUpdates)
        .eq('id', userId)
        .select()
        .single(),
      { context: 'updateProfile' }
    );
  },

  /**
   * Check username availability with debouncing support
   */
  async checkUsername(username: string, excludeUserId: string | null = null) {
    const { data, error } = await withRetry(
      async () => {
        let query = supabase!
          .from('profiles')
          .select('id')
          .ilike('username', username)
          .limit(1);

        if (excludeUserId) {
          query = query.neq('id', excludeUserId);
        }

        return query;
      },
      { context: 'checkUsername' }
    );

    if (error) return { available: false, error };
    return { available: (data?.length ?? 0) === 0, error: null };
  }
};

/**
 * Enhanced leaderboard operations
 */
export const leaderboardOperations = {
  /**
   * Get top players for a season. seasonId omitted = current season (date-windowed).
   * seasonId = 0 = all-time across every season row.
   */
  async getTop(limit = 100, orderBy = 'total_score', seasonId?: number) {
    return withRetry(
      async () => supabase!.rpc('get_leaderboard', {
        p_limit: limit,
        p_offset: 0,
        p_order_by: orderBy,
        p_season_id: seasonId ?? null,
      }),
      { context: 'getLeaderboard' }
    );
  },

  /**
   * Get user's rank using RPC function.
   * seasonId omitted = player's current season row; 0 = all-time lifetime rank.
   */
  async getUserRank(userId: string, seasonId?: number) {
    return withRetry(
      async () => supabase!.rpc('get_user_rank', { p_user_id: userId, p_season_id: seasonId ?? null }),
      { context: 'getUserRank' }
    );
  },

  /**
   * Search players by username
   */
  async searchPlayers(query: string, limit = 20) {
    return withRetry(
      async () => supabase!.rpc('search_players', {
        p_query: query,
        p_limit: limit
      }),
      { context: 'searchPlayers' }
    );
  }
};

/**
 * Enhanced game results operations
 */
export const gameResultsOperations = {
  /**
   * Get player's game history
   */
  async getHistory(playerId: string, limit = 20, offset = 0) {
    return withRetry(
      async () => supabase!
        .from('game_results')
        .select('*')
        .eq('player_id', playerId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1),
      { context: 'getGameHistory' }
    );
  },

  /**
   * Get player statistics summary
   */
  async getStatsSummary(playerId: string) {
    return withRetry(
      async () => supabase!.rpc('get_player_stats_summary', { p_player_id: playerId }),
      { context: 'getStatsSummary' }
    );
  }
};

/**
 * Connection health monitoring
 */
export const connectionMonitor = {
  /**
   * Get current health status
   */
  getHealth(): ConnectionHealth {
    return { ...connectionHealth };
  },

  /**
   * Check connection health
   */
  async checkHealth() {
    if (!supabase) {
      return { healthy: false, error: 'Not configured' };
    }

    try {
      const start = Date.now();
      const { error } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);

      const latency = Date.now() - start;

      connectionHealth.lastCheck = new Date().toISOString();

      if (error) {
        connectionHealth.isHealthy = false;
        connectionHealth.lastError = error;
        return { healthy: false, latency, error };
      }

      connectionHealth.isHealthy = true;
      connectionHealth.failureCount = 0;
      connectionHealth.lastError = null;

      return { healthy: true, latency };
    } catch (err: unknown) {
      connectionHealth.isHealthy = false;
      connectionHealth.failureCount++;
      connectionHealth.lastError = err;
      connectionHealth.lastCheck = new Date().toISOString();

      return { healthy: false, error: errorMessage(err) };
    }
  },

  /**
   * Reset health tracking
   */
  reset() {
    connectionHealth = {
      isHealthy: true,
      lastCheck: null,
      failureCount: 0,
      lastError: null
    };
  }
};

interface QueueItem<T = unknown> {
  operation: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
}

/**
 * Request queue for rate limiting protection
 */
class RequestQueue {
  private maxConcurrent: number;
  private minInterval: number;
  private queue: QueueItem[];
  private active: number;
  private lastRequest: number;

  constructor(maxConcurrent = 10, minInterval = 100) {
    this.maxConcurrent = maxConcurrent;
    this.minInterval = minInterval;
    this.queue = [];
    this.active = 0;
    this.lastRequest = 0;
  }

  async add<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        operation: operation as () => Promise<unknown>,
        resolve: resolve as (value: unknown) => void,
        reject,
      });
      this.process();
    });
  }

  private async process(): Promise<void> {
    if (this.active >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    const timeSinceLastRequest = Date.now() - this.lastRequest;
    if (timeSinceLastRequest < this.minInterval) {
      setTimeout(() => this.process(), this.minInterval - timeSinceLastRequest);
      return;
    }

    const { operation, resolve, reject } = this.queue.shift()!;
    this.active++;
    this.lastRequest = Date.now();

    try {
      const result = await operation();
      resolve(result);
    } catch (err) {
      reject(err);
    } finally {
      this.active--;
      this.process();
    }
  }
}

export const requestQueue = new RequestQueue();

/**
 * Export enhanced utilities
 */
export {
  isRetryableError,
  calculateDelay,
  RETRY_CONFIG
};
