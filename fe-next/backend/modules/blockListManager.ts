/**
 * Block List Manager
 *
 * In-memory, short-TTL cache of the admin moderation blocklist
 * (`blocked_entities` table). The realtime game-join path consults this to
 * refuse entry to a blocked registered player (auth user id), a blocked guest
 * (guest session id), or any client behind a blocked IP.
 *
 * Why a cache (not a per-join DB read): `join` is a hot socket event. A direct
 * Supabase round-trip on every join would add 50–200 ms of latency to a path
 * that fires constantly. Instead we load the (small) blocklist once and refresh
 * it on a 30 s TTL, so a freshly-issued block takes effect within ~30 s while
 * the join path stays in-memory-fast. Expired blocks are also filtered inline
 * on every check, so time-boxed blocks lapse precisely without waiting for a
 * refresh.
 *
 * Writes happen elsewhere (the service-role admin API). This module is
 * read-only against the DB. NEVER subscribe this table to supabase_realtime —
 * see .claude/rules/50-supabase-perf.md.
 */

import { getSupabase } from './supabase';
import logger from '../utils/logger';

export type BlockType = 'auth_user' | 'guest_session' | 'ip';

export interface BlockCheckInput {
  authUserId?: string | null;
  guestSessionId?: string | null;
  ip?: string | null;
}

export interface BlockMatch {
  blockType: BlockType;
  value: string;
  reason: string | null;
}

interface CacheEntry {
  reason: string | null;
  /** epoch ms; null = permanent. */
  expiresAt: number | null;
}

const TABLE = 'blocked_entities';
const REFRESH_TTL_MS = 30_000;

const cache: Record<BlockType, Map<string, CacheEntry>> = {
  auth_user: new Map(),
  guest_session: new Map(),
  ip: new Map(),
};

let lastLoadedAt = 0;
let inFlight: Promise<void> | null = null;
let autoRefreshTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Reload the full blocklist from the DB into the in-memory cache. Best-effort:
 * on a DB error the previous cache is left intact (fail-open — a transient DB
 * blip must not start letting blocked users through OR start rejecting
 * everyone; it simply keeps serving the last known-good list).
 */
export async function refreshBlockList(): Promise<void> {
  const client = getSupabase();
  if (!client) return;

  const { data, error } = await client
    .from(TABLE)
    .select('block_type, value, reason, expires_at');

  if (error) {
    logger.warn('BLOCKLIST', `Failed to refresh blocklist: ${error.message}`);
    return;
  }

  const next: Record<BlockType, Map<string, CacheEntry>> = {
    auth_user: new Map(),
    guest_session: new Map(),
    ip: new Map(),
  };

  for (const row of data || []) {
    const type = row.block_type as BlockType;
    const value = String(row.value ?? '');
    if (!next[type] || !value) continue;
    const expiresAt = row.expires_at ? new Date(row.expires_at).getTime() : null;
    next[type].set(value, { reason: row.reason ?? null, expiresAt });
  }

  cache.auth_user = next.auth_user;
  cache.guest_session = next.guest_session;
  cache.ip = next.ip;
  lastLoadedAt = Date.now();
}

function lookup(type: BlockType, value?: string | null): BlockMatch | null {
  if (!value) return null;
  const entry = cache[type].get(value);
  if (!entry) return null;
  // Inline expiry guard so time-boxed blocks lapse exactly on time, regardless
  // of when the next refresh runs. Evict lazily to keep the map lean.
  if (entry.expiresAt !== null && entry.expiresAt <= Date.now()) {
    cache[type].delete(value);
    return null;
  }
  return { blockType: type, value, reason: entry.reason };
}

/**
 * Synchronous block check against the current cache. Returns the first match
 * (auth user → guest session → IP) or null. Does NOT touch the DB.
 */
export function isBlockedSync(input: BlockCheckInput): BlockMatch | null {
  return (
    lookup('auth_user', input.authUserId) ||
    lookup('guest_session', input.guestSessionId) ||
    lookup('ip', input.ip)
  );
}

async function ensureFresh(): Promise<void> {
  if (Date.now() - lastLoadedAt < REFRESH_TTL_MS) return;
  // Coalesce concurrent refreshes (many joins can race the TTL boundary).
  if (inFlight) {
    await inFlight;
    return;
  }
  inFlight = refreshBlockList().finally(() => {
    inFlight = null;
  });
  await inFlight;
}

/**
 * Async block check used by the join path: refreshes the cache if stale, then
 * performs the in-memory lookup.
 */
export async function isBlocked(input: BlockCheckInput): Promise<BlockMatch | null> {
  // Skip the (possibly DB-touching) freshness check entirely when there is
  // nothing to look up.
  if (!input.authUserId && !input.guestSessionId && !input.ip) return null;
  await ensureFresh();
  return isBlockedSync(input);
}

/**
 * Start the background refresh loop. Called once at server startup so the
 * cache is warm and stays current even on an idle server.
 */
export function startBlockListAutoRefresh(): void {
  if (autoRefreshTimer) return;
  void refreshBlockList();
  autoRefreshTimer = setInterval(() => {
    void refreshBlockList();
  }, REFRESH_TTL_MS);
  if (typeof autoRefreshTimer.unref === 'function') autoRefreshTimer.unref();
}

export function stopBlockListAutoRefresh(): void {
  if (autoRefreshTimer) {
    clearInterval(autoRefreshTimer);
    autoRefreshTimer = null;
  }
}

/** Test-only: clear cache + freshness so each test starts clean. */
export function __resetBlockListForTest(): void {
  cache.auth_user.clear();
  cache.guest_session.clear();
  cache.ip.clear();
  lastLoadedAt = 0;
  inFlight = null;
}
