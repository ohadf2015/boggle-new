import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';

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

/**
 * Get feature flag configuration from database
 * @param flagName Name of the feature flag
 * @returns Feature flag configuration or null if not found
 */
export async function getFeatureFlag(flagName: string): Promise<FeatureFlag | null> {
  const client = getSupabase();
  if (!client) {
    console.warn('Supabase not configured - feature flags unavailable');
    return null;
  }

  try {
    const { data, error } = await client
      .from('feature_flags')
      .select('*')
      .eq('flag_name', flagName)
      .single();

    if (error) {
      const errorMessage = error.message || 'Unknown error';
      console.error(`Error fetching feature flag ${flagName}:`, errorMessage);
      return null;
    }

    return data;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error fetching feature flag ${flagName}:`, errorMessage);
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
    console.error(`Error checking feature access for ${flagName}:`, errorMessage);
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
      .single();

    if (error) {
      const errorMessage = error.message || 'Unknown error';
      console.error(`Error checking admin status for user ${userId}:`, errorMessage);
      return false;
    }

    return data?.is_admin === true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error checking admin status:`, errorMessage);
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
    console.error('Supabase not configured - cannot set feature flags');
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
      console.error(`Error setting feature flag ${flagName}:`, errorMessage);
      return false;
    }

    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error setting feature flag:`, errorMessage);
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
    console.error('Supabase not configured - cannot delete feature flags');
    return false;
  }

  try {
    const { error } = await client
      .from('feature_flags')
      .delete()
      .eq('flag_name', flagName);

    if (error) {
      const errorMessage = error.message || 'Unknown error';
      console.error(`Error deleting feature flag ${flagName}:`, errorMessage);
      return false;
    }

    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error deleting feature flag:`, errorMessage);
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
    console.warn('Supabase not configured - feature flags unavailable');
    return [];
  }

  try {
    const { data, error } = await client
      .from('feature_flags')
      .select('*')
      .order('flag_name');

    if (error) {
      const errorMessage = error.message || 'Unknown error';
      console.error('Error listing feature flags:', errorMessage);
      return [];
    }

    return data || [];
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error listing feature flags:', errorMessage);
    return [];
  }
}

/**
 * Specific helper for Daily Buzz images feature
 * @param userId User ID to check (optional - null for guest users)
 * @returns True if user can see Daily Buzz images
 */
export async function canAccessDailyBuzzImages(userId: string | null): Promise<boolean> {
  return canAccessFeature(userId, 'daily_buzz_images');
}
