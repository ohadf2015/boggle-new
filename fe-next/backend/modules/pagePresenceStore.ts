/**
 * Page Presence Store (pure, in-memory)
 *
 * Tracks where users currently are on the site (landing page, lobby, etc.) so
 * the admin live monitor can see people who are online but NOT in a game.
 *
 * Ephemeral + TTL-cleaned, no persistence and no Supabase table. Multi-instance
 * fragmentation is an accepted limitation, same as the single-player heartbeat.
 *
 * Pure module (no Express): the route layer is a thin wrapper so this logic is
 * unit-testable directly under the backend test runner.
 */

import { normalizePagePath } from '../../lib/presence/normalizePagePath';

interface PagePresenceData {
  path: string;
  username: string | null;
  playerId: string | null;
  isAuthenticated: boolean;
  timestamp: number;
}

export interface ActivePagePresence {
  sessionId: string;
  path: string;
  username: string | null;
  playerId: string | null;
  isAuthenticated: boolean;
  timestamp: number;
}

export interface RecordPresenceInput {
  sessionId?: string | null;
  path?: string | null;
  username?: string | null;
  playerId?: string | null;
  isAuthenticated?: boolean;
}

const activePagePresence: Map<string, PagePresenceData> = new Map();

export const STALE_THRESHOLD_MS = 45000; // 45s without a heartbeat = gone

/** Is this a page we deliberately do not track (admin dashboard)? */
function isUntrackedPath(path: string): boolean {
  return path === '/admin' || path.startsWith('/admin/');
}

/**
 * Upsert a session's current page. Returns true if stored, false if rejected
 * (missing sessionId) or skipped (admin page). Path is normalized on store.
 */
export function recordPagePresence(input: RecordPresenceInput, now: number = Date.now()): boolean {
  if (!input.sessionId) return false;

  const path = normalizePagePath(input.path);
  if (isUntrackedPath(path)) return false;

  activePagePresence.set(input.sessionId, {
    path,
    username: input.username ?? null,
    playerId: input.playerId ?? null,
    isAuthenticated: !!input.isAuthenticated,
    timestamp: now,
  });
  return true;
}

/** Remove a session (sent on unload / navigation away). */
export function removePagePresence(sessionId: string | null | undefined): void {
  if (sessionId) activePagePresence.delete(sessionId);
}

/** Drop sessions older than the TTL. Returns the number removed. */
export function pruneStale(now: number = Date.now()): number {
  let cleaned = 0;
  for (const [sessionId, data] of activePagePresence) {
    if (now - data.timestamp > STALE_THRESHOLD_MS) {
      activePagePresence.delete(sessionId);
      cleaned++;
    }
  }
  return cleaned;
}

/** All active page-presence entries (paths already normalized), newest first. */
export function getActivePagePresence(): ActivePagePresence[] {
  const out: ActivePagePresence[] = [];
  for (const [sessionId, data] of activePagePresence) {
    out.push({ sessionId, ...data });
  }
  return out.sort((a, b) => b.timestamp - a.timestamp);
}

/** Test-only reset of the in-memory store. */
export function __clearPagePresence(): void {
  activePagePresence.clear();
}
