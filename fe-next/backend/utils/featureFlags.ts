import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import logger from './logger';

// Lazy initialization to avoid build-time errors when env vars are missing
let supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient | null {
  if (!supabase && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }
  return supabase;
}

export interface FeatureFlag {
  flag_name: string;
  enabled: boolean;
  admin_only: boolean;
  rollout_percentage: number;
  created_at: string;
}

export const FLAG_CACHE_TTL_MS = 60_000;

interface CacheEntry {
  value: FeatureFlag | null;
  expiresAt: number;
}

const flagCache = new Map<string, CacheEntry>();

/** Test-only: clear the in-memory cache. */
export function __clearFlagCache(): void {
  flagCache.clear();
}

function invalidateFlag(flagName: string): void {
  flagCache.delete(flagName);
}

/**
 * Get feature flag configuration from database (with 60s in-memory cache).
 * Null (missing flag) is also cached to avoid repeated PGRST116 errors.
 */
export async function getFeatureFlag(flagName: string): Promise<FeatureFlag | null> {
  const now = Date.now();
  const cached = flagCache.get(flagName);
  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  const client = getSupabase();
  if (!client) {
    logger.warn('FLAGS', 'Supabase not configured - feature flags unavailable');
    return null;
  }

  try {
    const { data, error } = await client
      .from('feature_flags')
      .select('*')
      .eq('flag_name', flagName)
      .maybeSingle();

    if (error) {
      const errorMessage = error.message || 'Unknown error';
      logger.error('FLAGS', `Error fetching feature flag ${flagName}`, { error: errorMessage });
      return null;
    }

    const value = (data as FeatureFlag | null) ?? null;
    flagCache.set(flagName, { value, expiresAt: now + FLAG_CACHE_TTL_MS });
    return value;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('FLAGS', `Error fetching feature flag ${flagName}`, { error: errorMessage });
    return null;
  }
}

/**
 * Check if user can access a specific feature based on feature flags
 * @param userId User ID to check (optional - null for guest users)
 * @param flagName Feature flag name
 * @returns True if user has access, false otherwise
 */
export async function canAccessFeature(
  userId: string | null,
  flagName: string
): Promise<boolean> {
  try {
    // Get feature flag
    const flag = await getFeatureFlag(flagName);

    if (!flag) {
      // If flag doesn't exist, default to disabled
      return false;
    }

    if (!flag.enabled) {
      // Feature is disabled globally
      return false;
    }

    // If no user ID (guest user), check if feature is publicly available
    if (!userId) {
      // Guest users can only access if: not admin_only AND 100% rollout
      return !flag.admin_only && flag.rollout_percentage === 100;
    }

    // Check if user is admin
    const isAdmin = await checkIsAdmin(userId);
    if (isAdmin) {
      // Admins always have access when feature is enabled
      return true;
    }

    if (flag.admin_only) {
      // Feature is admin-only and user is not admin
      return false;
    }

    // Check rollout percentage
    if (flag.rollout_percentage === 0) {
      return false;
    }

    if (flag.rollout_percentage === 100) {
      return true;
    }

    // Use consistent hash of user ID to determine rollout
    const userHash = hashUserId(userId);
    return (userHash % 100) < flag.rollout_percentage;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('FLAGS', `Error checking feature access for ${flagName}`, { error: errorMessage });
    return false;
  }
}

/**
 * Check if user is admin
 * @param userId User ID to check
 * @returns True if user is admin
 */
async function checkIsAdmin(userId: string): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;

  try {
    const { data, error } = await client
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      // maybeSingle() tolerates 0 rows (returns {data:null,error:null}); .single()
      // throws PGRST116 "Cannot coerce…" for users without a profile row — e.g. the
      // all-zeros sentinel UUID probed via curl (Sentry JAVASCRIPT-NEXTJS-1M8).
      // No profile simply means "not admin", never an error-level log.
      .maybeSingle();

    if (error) {
      const errorMessage = error.message || 'Unknown error';
      logger.error('FLAGS', `Error checking admin status for user ${userId}`, { error: errorMessage });
      return false;
    }

    return data?.is_admin === true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('FLAGS', 'Error checking admin status', { error: errorMessage });
    return false;
  }
}

/**
 * Hash user ID for consistent rollout distribution
 * @param userId User ID to hash
 * @returns Number between 0-99
 */
function hashUserId(userId: string): number {
  const hash = crypto.createHash('md5').update(userId).digest('hex');
  // Take first 8 characters and convert to number mod 100
  return parseInt(hash.substring(0, 8), 16) % 100;
}

/**
 * ADMIN ONLY: Create or update a feature flag
 * @param flagName Feature flag name
 * @param config Feature flag configuration
 * @returns True if successful
 */
export async function setFeatureFlag(
  flagName: string,
  config: Partial<Omit<FeatureFlag, 'flag_name' | 'created_at'>>
): Promise<boolean> {
  const client = getSupabase();
  if (!client) {
    logger.error('FLAGS', 'Supabase not configured - cannot set feature flags');
    return false;
  }

  try {
    const { error } = await client
      .from('feature_flags')
      .upsert({
        flag_name: flagName,
        enabled: config.enabled ?? true,
        admin_only: config.admin_only ?? false,
        rollout_percentage: config.rollout_percentage ?? 0,
      });

    if (error) {
      const errorMessage = error.message || 'Unknown error';
      logger.error('FLAGS', `Error setting feature flag ${flagName}`, { error: errorMessage });
      return false;
    }

    invalidateFlag(flagName);
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('FLAGS', 'Error setting feature flag', { error: errorMessage });
    return false;
  }
}

/**
 * ADMIN ONLY: Delete a feature flag
 * @param flagName Feature flag name
 * @returns True if successful
 */
export async function deleteFeatureFlag(flagName: string): Promise<boolean> {
  const client = getSupabase();
  if (!client) {
    logger.error('FLAGS', 'Supabase not configured - cannot delete feature flags');
    return false;
  }

  try {
    const { error } = await client
      .from('feature_flags')
      .delete()
      .eq('flag_name', flagName);

    if (error) {
      const errorMessage = error.message || 'Unknown error';
      logger.error('FLAGS', `Error deleting feature flag ${flagName}`, { error: errorMessage });
      return false;
    }

    invalidateFlag(flagName);
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('FLAGS', 'Error deleting feature flag', { error: errorMessage });
    return false;
  }
}

/**
 * ADMIN ONLY: List all feature flags
 * @returns Array of all feature flags
 */
export async function listFeatureFlags(): Promise<FeatureFlag[]> {
  const client = getSupabase();
  if (!client) {
    logger.warn('FLAGS', 'Supabase not configured - feature flags unavailable');
    return [];
  }

  try {
    const { data, error } = await client
      .from('feature_flags')
      .select('*')
      .order('flag_name');

    if (error) {
      const errorMessage = error.message || 'Unknown error';
      logger.error('FLAGS', 'Error listing feature flags', { error: errorMessage });
      return [];
    }

    return data || [];
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('FLAGS', 'Error listing feature flags', { error: errorMessage });
    return [];
  }
}
