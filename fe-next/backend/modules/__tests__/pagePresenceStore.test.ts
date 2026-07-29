/**
 * Page Presence Store tests (pure, no Express).
 * TDD: behaviors written before the store implementation.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  recordPagePresence,
  removePagePresence,
  pruneStale,
  getActivePagePresence,
  __clearPagePresence,
  STALE_THRESHOLD_MS,
} from '../pagePresenceStore';

describe('pagePresenceStore', () => {
  beforeEach(() => {
    __clearPagePresence();
  });

  it('records a presence and normalizes the path', () => {
    const ok = recordPagePresence({ sessionId: 's1', path: '/he/lobby', username: 'Alice' });
    expect(ok).toBe(true);

    const active = getActivePagePresence();
    expect(active).toHaveLength(1);
    expect(active[0]).toMatchObject({ sessionId: 's1', path: '/lobby', username: 'Alice' });
  });

  it('rejects a record with no sessionId', () => {
    expect(recordPagePresence({ path: '/en/play' })).toBe(false);
    expect(getActivePagePresence()).toHaveLength(0);
  });

  it('skips admin pages (does not store them)', () => {
    expect(recordPagePresence({ sessionId: 's1', path: '/en/admin/players/abc' })).toBe(false);
    expect(getActivePagePresence()).toHaveLength(0);
  });

  it('upserts on repeated record for the same session', () => {
    recordPagePresence({ sessionId: 's1', path: '/en/play' });
    recordPagePresence({ sessionId: 's1', path: '/en/lobby' });

    const active = getActivePagePresence();
    expect(active).toHaveLength(1);
    expect(active[0].path).toBe('/lobby');
  });

  it('removes a session', () => {
    recordPagePresence({ sessionId: 's1', path: '/en/play' });
    expect(getActivePagePresence()).toHaveLength(1);

    removePagePresence('s1');
    expect(getActivePagePresence()).toHaveLength(0);
  });

  it('prunes sessions older than the TTL', () => {
    const t0 = 1_000_000;
    recordPagePresence({ sessionId: 'old', path: '/en/play' }, t0);
    recordPagePresence({ sessionId: 'fresh', path: '/en/lobby' }, t0 + STALE_THRESHOLD_MS);

    const removed = pruneStale(t0 + STALE_THRESHOLD_MS + 1);
    expect(removed).toBe(1);

    const active = getActivePagePresence();
    expect(active).toHaveLength(1);
    expect(active[0].sessionId).toBe('fresh');
  });

  it('returns entries newest first', () => {
    recordPagePresence({ sessionId: 'a', path: '/en/play' }, 100);
    recordPagePresence({ sessionId: 'b', path: '/en/lobby' }, 200);
    const active = getActivePagePresence();
    expect(active.map((e) => e.sessionId)).toEqual(['b', 'a']);
  });
});
