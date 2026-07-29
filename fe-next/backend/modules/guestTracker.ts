/**
 * Guest Tracker Module
 * Handles tracking and managing guest (unauthenticated) sessions for analytics
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import logger from '../utils/logger';

// Create Supabase client (lazy loaded)
let supabase: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient | null {
  if (supabase) return supabase;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey || supabaseServiceKey === 'placeholder') {
    logger.warn('GUEST_TRACKER', 'Supabase not configured (missing or placeholder service key). Guest sessions will not be tracked.');
    return null;
  }

  const { createClient } = require('@supabase/supabase-js');
  supabase = createClient(supabaseUrl, supabaseServiceKey);
  return supabase;
}

const DB_TIMEOUT_MS = 5000;

/**
 * Run a Supabase query with both an AbortSignal-driven cancel and a JS-level timeout.
 *
 * The JS race rejects the awaited promise on schedule, but does not cancel the
 * underlying fetch — without `.abortSignal()`, the socket stays open until the
 * Supabase edge closes it. Wiring AbortSignal.timeout into postgrest-js asks the
 * client to abort the in-flight fetch when our budget elapses; whether it actually
 * frees the pool slot depends on the postgrest-js version honouring the signal.
 * The +50ms on the JS timer ensures the AbortSignal fires first when both are armed.
 */
function runQuery<T>(
  buildQuery: (signal: AbortSignal) => PromiseLike<T>,
  label: string,
  ms: number = DB_TIMEOUT_MS
): Promise<T> {
  const signal = AbortSignal.timeout(ms);
  return Promise.race([
    Promise.resolve(buildQuery(signal)),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms + 50)
    ),
  ]);
}

export interface GuestSessionData {
  sessionId: string;
  deviceType?: string | null;
  browser?: string | null;
  language?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  referrer?: string | null;
  country?: string | null;
}

export interface GuestSessionUpdateData {
  deviceType?: string;
  browser?: string;
  language?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  referrer?: string;
  country?: string;
  lastVisitAt?: Date;
}

/**
 * Get or create a guest session
 * Returns the guest session record
 */
export async function getOrCreateGuestSession(
  sessionData: GuestSessionData
): Promise<any | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    // Try to get existing session
    const { data: existingSession, error: fetchError } = await runQuery(
      (signal) => client
        .from('guest_sessions')
        .select('id, session_id, first_visit_at, last_visit_at, device_type, browser, language, utm_source, utm_medium, utm_campaign, referrer, country, user_id, linked_at, created_at')
        .eq('session_id', sessionData.sessionId)
        .abortSignal(signal)
        .single(),
      'getOrCreate:fetch'
    );

    if (existingSession && !fetchError) {
      // Update last visit time — fire and forget, don't block response.
      // 5s AbortSignal so the connection releases even if Supabase stalls.
      const bgSignal = AbortSignal.timeout(DB_TIMEOUT_MS);
      Promise.resolve(
        client
          .from('guest_sessions')
          .update({ last_visit_at: new Date().toISOString() })
          .eq('session_id', sessionData.sessionId)
          .abortSignal(bgSignal)
      ).catch((err: unknown) => logger.error('GUEST_TRACKER', `Failed to update last visit: ${err}`));

      logger.info('GUEST_TRACKER', `Updated last visit for session ${sessionData.sessionId}`);
      return existingSession;
    }

    // Create new session
    const { data: newSession, error: insertError } = await runQuery(
      (signal) => client
        .from('guest_sessions')
        .insert({
          session_id: sessionData.sessionId,
          device_type: sessionData.deviceType || null,
          browser: sessionData.browser || null,
          language: sessionData.language || null,
          utm_source: sessionData.utmSource || null,
          utm_medium: sessionData.utmMedium || null,
          utm_campaign: sessionData.utmCampaign || null,
          referrer: sessionData.referrer || null,
          country: sessionData.country || null,
          first_visit_at: new Date().toISOString(),
          last_visit_at: new Date().toISOString(),
        })
        .select()
        .abortSignal(signal)
        .single(),
      'getOrCreate:insert'
    );

    if (insertError) {
      logger.error('GUEST_TRACKER', `Failed to create guest session: ${insertError.message}`);
      return null;
    }

    logger.info('GUEST_TRACKER', `Created new guest session ${sessionData.sessionId}`);
    return newSession;
  } catch (err) {
    logger.error('GUEST_TRACKER', `Exception getting/creating guest session: ${err}`);
    return null;
  }
}

/**
 * Update guest session data
 */
export async function updateGuestSession(
  sessionId: string,
  updates: GuestSessionUpdateData
): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const updateData: Record<string, unknown> = {};

    if (updates.deviceType !== undefined) updateData.device_type = updates.deviceType;
    if (updates.browser !== undefined) updateData.browser = updates.browser;
    if (updates.language !== undefined) updateData.language = updates.language;
    if (updates.utmSource !== undefined) updateData.utm_source = updates.utmSource;
    if (updates.utmMedium !== undefined) updateData.utm_medium = updates.utmMedium;
    if (updates.utmCampaign !== undefined) updateData.utm_campaign = updates.utmCampaign;
    if (updates.referrer !== undefined) updateData.referrer = updates.referrer;
    if (updates.country !== undefined) updateData.country = updates.country;
    if (updates.lastVisitAt !== undefined) {
      updateData.last_visit_at = updates.lastVisitAt.toISOString();
    }

    const { error } = await runQuery(
      (signal) => client
        .from('guest_sessions')
        .update(updateData)
        .eq('session_id', sessionId)
        .abortSignal(signal),
      'updateGuestSession'
    );

    if (error) {
      logger.error('GUEST_TRACKER', `Failed to update guest session: ${error.message}`);
      return false;
    }

    logger.info('GUEST_TRACKER', `Updated guest session ${sessionId}`);
    return true;
  } catch (err) {
    logger.error('GUEST_TRACKER', `Exception updating guest session: ${err}`);
    return false;
  }
}

/**
 * Link a guest session to a user account (when they sign up)
 */
export async function linkGuestSessionToUser(
  sessionId: string,
  userId: string
): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await runQuery(
      (signal) => client
        .from('guest_sessions')
        .update({
          user_id: userId,
          linked_at: new Date().toISOString(),
        })
        .eq('session_id', sessionId)
        .abortSignal(signal),
      'linkGuestSessionToUser'
    );

    if (error) {
      logger.error('GUEST_TRACKER', `Failed to link guest session to user: ${error.message}`);
      return false;
    }

    logger.info('GUEST_TRACKER', `Linked guest session ${sessionId} to user ${userId}`);
    return true;
  } catch (err) {
    logger.error('GUEST_TRACKER', `Exception linking guest session to user: ${err}`);
    return false;
  }
}

/**
 * Get guest session by session ID
 */
export async function getGuestSession(sessionId: string): Promise<any | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await runQuery(
      (signal) => client
        .from('guest_sessions')
        .select('id, session_id, first_visit_at, last_visit_at, device_type, browser, language, utm_source, utm_medium, utm_campaign, referrer, country, user_id, linked_at, created_at')
        .eq('session_id', sessionId)
        .abortSignal(signal)
        .single(),
      'getGuestSession'
    );

    if (error) {
      logger.error('GUEST_TRACKER', `Failed to get guest session: ${error.message}`);
      return null;
    }

    return data;
  } catch (err) {
    logger.error('GUEST_TRACKER', `Exception getting guest session: ${err}`);
    return null;
  }
}

/**
 * Get all guest sessions for a user (after they sign up)
 */
export async function getUserGuestSessions(userId: string): Promise<any[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  try {
    const { data, error } = await client
      .from('guest_sessions')
      .select('id, session_id, first_visit_at, last_visit_at, device_type, browser, language, utm_source, utm_medium, utm_campaign, referrer, country, user_id, linked_at, created_at')
      .eq('user_id', userId)
      .order('first_visit_at', { ascending: false });

    if (error) {
      logger.error('GUEST_TRACKER', `Failed to get user guest sessions: ${error.message}`);
      return [];
    }

    return data || [];
  } catch (err) {
    logger.error('GUEST_TRACKER', `Exception getting user guest sessions: ${err}`);
    return [];
  }
}

/**
 * Delete old guest sessions (for privacy compliance)
 * Deletes unlinked sessions older than specified days
 */
export async function deleteOldGuestSessions(daysOld: number = 90): Promise<number> {
  const client = getSupabaseClient();
  if (!client) return 0;

  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const { data, error } = await client
      .from('guest_sessions')
      .delete()
      .is('user_id', null) // Only delete unlinked sessions
      .lt('last_visit_at', cutoffDate.toISOString())
      .select('id');

    if (error) {
      logger.error('GUEST_TRACKER', `Failed to delete old guest sessions: ${error.message}`);
      return 0;
    }

    const deletedCount = data?.length || 0;
    logger.info('GUEST_TRACKER', `Deleted ${deletedCount} old guest sessions (>${daysOld} days)`);
    return deletedCount;
  } catch (err) {
    logger.error('GUEST_TRACKER', `Exception deleting old guest sessions: ${err}`);
    return 0;
  }
}

/**
 * Get guest session analytics
 */
export async function getGuestSessionAnalytics(): Promise<{
  totalSessions: number;
  linkedSessions: number;
  conversionRate: number;
  topSources: Array<{ source: string; count: number }>;
  topCountries: Array<{ country: string; count: number }>;
  topDevices: Array<{ device: string; count: number }>;
}> {
  const client = getSupabaseClient();

  const defaultAnalytics = {
    totalSessions: 0,
    linkedSessions: 0,
    conversionRate: 0,
    topSources: [],
    topCountries: [],
    topDevices: [],
  };

  if (!client) return defaultAnalytics;

  try {
    // Run all aggregations in parallel using DB-side grouping (no full table scan)
    const [totalsResult, sourcesResult, countriesResult, devicesResult] = await Promise.all([
      // Totals + conversion in one lightweight count query
      (client.rpc('get_guest_session_totals').single() as unknown) as Promise<{ data: { total: number; linked: number } | null; error: unknown }>,
      // Top sources — fallback to manual aggregation if RPC not available
      client
        .from('guest_sessions')
        .select('utm_source')
        .not('utm_source', 'is', null)
        .limit(5000),
      client
        .from('guest_sessions')
        .select('country')
        .not('country', 'is', null)
        .limit(5000),
      client
        .from('guest_sessions')
        .select('device_type')
        .limit(5000),
    ]);

    // Totals — use RPC if available, otherwise fall back to count queries
    let totalSessions = 0;
    let linkedSessions = 0;
    if (totalsResult.data && !totalsResult.error) {
      totalSessions = totalsResult.data.total;
      linkedSessions = totalsResult.data.linked;
    } else {
      // Fallback: lightweight HEAD counts instead of loading all rows
      const [totalRes, linkedRes] = await Promise.all([
        client.from('guest_sessions').select('id', { count: 'exact', head: true }),
        client.from('guest_sessions').select('id', { count: 'exact', head: true }).not('user_id', 'is', null),
      ]);
      totalSessions = totalRes.count ?? 0;
      linkedSessions = linkedRes.count ?? 0;
    }

    const conversionRate = totalSessions > 0 ? (linkedSessions / totalSessions) * 100 : 0;

    // Aggregate top-N from fetched rows (capped at 5000 — safe memory)
    const countTop = <T extends Record<string, unknown>>(rows: T[] | null, key: keyof T, fallback: string): Array<{ [k: string]: string | number }> => {
      const counts: Record<string, number> = {};
      for (const row of rows || []) {
        const val = (row[key] as string) || fallback;
        counts[val] = (counts[val] || 0) + 1;
      }
      return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }));
    };

    const topSources = countTop(sourcesResult.data, 'utm_source', 'direct').map(r => ({ source: r.name as string, count: r.count as number }));
    const topCountries = countTop(countriesResult.data, 'country', 'unknown').map(r => ({ country: r.name as string, count: r.count as number }));
    const topDevices = countTop(devicesResult.data, 'device_type', 'unknown').map(r => ({ device: r.name as string, count: r.count as number }));

    return {
      totalSessions,
      linkedSessions,
      conversionRate,
      topSources,
      topCountries,
      topDevices,
    };
  } catch (err) {
    logger.error('GUEST_TRACKER', `Exception getting guest analytics: ${err}`);
    return defaultAnalytics;
  }
}
