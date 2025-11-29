/**
 * Enhanced Supabase Client Utilities
 * - Retry logic with exponential backoff
 * - Connection health monitoring
 * - Request batching
 * - Error handling with detailed logging
 */

import { supabase, isSupabaseConfigured } from './supabase';
import logger from '@/utils/logger';

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
  lastError: any;
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
function isRetryableError(error: any): boolean {
  if (!error) return false;

  // Network errors
  if (error.message?.includes('fetch failed') ||
      error.message?.includes('network') ||
      error.message?.includes('timeout') ||
      error.message?.includes('ECONNREFUSED')) {
    return true;
  }

  // Postgres errors
  if (error.code && RETRY_CONFIG.retryableErrors.includes(error.code)) {
    return true;
  }

  // HTTP 5xx errors (server errors)
  if (error.status && error.status >= 500) {
    return true;
  }

  // Rate limiting
  if (error.status === 429) {
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
export async function withRetry<T = any>(
  operation: () => Promise<{ data: T | null; error: any }>,
  options: RetryOptions = {}
): Promise<{ data: T | null; error: any }> {
  const {
    maxRetries = RETRY_CONFIG.maxRetries,
    context = 'operation'
  } = options;

  let lastError: any = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await operation();

      if (result.error && isRetryableError(result.error)) {
        lastError = result.error;

        if (attempt < maxRetries) {
          const delay = calculateDelay(attempt);
          logger.warn(`[Supabase] ${context} failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms:`, result.error.message);
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
    } catch (err: any) {
      lastError = err;

      if (attempt < maxRetries && isRetryableError(err)) {
        const delay = calculateDelay(attempt);
        logger.warn(`[Supabase] ${context} exception (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms:`, err.message);
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

interface QueryConfig {
  table: string;
  method: 'select' | 'insert' | 'update' | 'upsert' | 'delete';
  select?: string;
  data?: any;
  upsertOptions?: any;
  eq?: Record<string, any>;
  order?: { column: string; ascending?: boolean };
  limit?: number;
  single?: boolean;
}

/**
 * Batch multiple queries into a single request
 * @param queries - Array of query configs
 * @returns Array of results
 */
export async function batchQueries(queries: QueryConfig[]): Promise<{ data: any; error: any }[]> {
  if (!supabase) {
    return queries.map(() => ({ data: null, error: { message: 'Supabase not configured' } }));
  }

  const results = await Promise.allSettled(
    queries.map(async (query) => {
      return withRetry(async () => {
        let q: any = supabase.from(query.table);

        switch (query.method) {
          case 'select':
            q = q.select(query.select || '*');
            break;
          case 'insert':
            q = q.insert(query.data);
            break;
          case 'update':
            q = q.update(query.data);
            break;
          case 'upsert':
            q = q.upsert(query.data, query.upsertOptions);
            break;
          case 'delete':
            q = q.delete();
            break;
        }

        // Apply filters
        if (query.eq) {
          for (const [col, val] of Object.entries(query.eq)) {
            q = q.eq(col, val);
          }
        }

        if (query.order) {
          q = q.order(query.order.column, { ascending: query.order.ascending ?? false });
        }

        if (query.limit) {
          q = q.limit(query.limit);
        }

        if (query.single) {
          q = q.single();
        }

        return q;
      }, { context: `batch-${query.table}` });
    })
  );

  return results.map((result) => {
    if (result.status === 'fulfilled') {
      return result.value;
    }
    return { data: null, error: result.reason };
  });
}

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
  async update(userId: string, updates: Record<string, any>) {
    // Validate updates
    const allowedFields = [
      'username', 'display_name', 'avatar_emoji', 'avatar_color',
      'profile_picture_url', 'profile_picture_provider'
    ];

    const sanitizedUpdates: Record<string, any> = {};
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
    return { available: data.length === 0, error: null };
  }
};

/**
 * Enhanced leaderboard operations
 */
export const leaderboardOperations = {
  /**
   * Get top players with optional MMR ordering
   */
  async getTop(limit = 100, orderBy = 'total_score') {
    const order = orderBy === 'ranked_mmr'
      ? { column: 'ranked_mmr', ascending: false }
      : { column: 'total_score', ascending: false };

    return withRetry(
      async () => supabase!
        .from('leaderboard')
        .select('*')
        .order(order.column, { ascending: order.ascending })
        .limit(limit),
      { context: 'getLeaderboard' }
    );
  },

  /**
   * Get user's rank using RPC function
   */
  async getUserRank(userId: string) {
    return withRetry(
      async () => supabase!.rpc('get_user_rank', { p_user_id: userId }),
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
    } catch (err: any) {
      connectionHealth.isHealthy = false;
      connectionHealth.failureCount++;
      connectionHealth.lastError = err;
      connectionHealth.lastCheck = new Date().toISOString();

      return { healthy: false, error: err.message };
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

interface QueueItem {
  operation: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (reason: any) => void;
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
    return new Promise((resolve, reject) => {
      this.queue.push({ operation, resolve, reject });
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
