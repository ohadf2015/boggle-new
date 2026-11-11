import { describe, it, expect, vi } from 'vitest';

vi.mock('@/backend/utils/profanityFilter', () => ({ isProfane: () => false }));

import { loadIncomingPings } from '../pingServer';
import { pingFakeDb, has, type Handler } from './pingFakeDb';

const ME = 'me';
const A = 'aaaa';
const B = 'bbbb';
const NOW = new Date('2026-11-11T12:00:00Z');

function db(over: Partial<Record<string, Handler>> = {}) {
  return pingFakeDb({
    user_notifications: () => ({
      data: [
        { id: 'n1', sender_id: A, related_entity_type: 'rival_ping:gg', created_at: '2026-11-11T11:00:00Z' },
        { id: 'n2', sender_id: B, related_entity_type: 'rival_ping:rematch', created_at: '2026-11-11T10:00:00Z' },
        { id: 'n3', sender_id: A, related_entity_type: 'rival_ping:bogus', created_at: '2026-11-11T09:00:00Z' },
      ],
      error: null,
    }),
    profiles: () => ({
      data: [
        { id: A, display_name: 'Maya', username: 'maya', avatar_emoji: '🦊', avatar_color: '#fff', avatar_image: null, avatar_config: null },
        { id: B, display_name: null, username: 'Player_0a1b2c3d', avatar_emoji: null, avatar_color: null, avatar_image: null, avatar_config: null },
      ],
      error: null,
    }),
    friends: () => ({ data: [], error: null }),
    ...over,
  } as Record<string, Handler>);
}

describe('loadIncomingPings', () => {
  it('returns unread pings from the last 48h with the sender public name and avatar', async () => {
    const d = db();
    const pings = await loadIncomingPings(d.client, ME, NOW);
    expect(pings).toEqual([
      {
        id: 'n1',
        pingId: 'gg',
        createdAt: '2026-11-11T11:00:00Z',
        sender: { id: A, name: 'Maya', avatar: { emoji: '🦊', color: '#fff', image: null, config: null } },
      },
    ]);
    const q = d.calls.find((c) => c.table === 'user_notifications')!.ops;
    expect(has(q, 'eq', 'user_id', ME)).toBe(true);
    expect(has(q, 'eq', 'read', false)).toBe(true);
    expect(has(q, 'like', 'related_entity_type', 'rival_ping:%')).toBe(true);
    expect(has(q, 'gte', 'created_at', '2026-11-09T12:00:00.000Z')).toBe(true);
    expect(has(q, 'limit', 10)).toBe(true);
  });

  it('hides pings from anyone in a block with me', async () => {
    const d = db({ friends: () => ({ data: [{ user_id: ME, friend_id: A }], error: null }) });
    expect(await loadIncomingPings(d.client, ME, NOW)).toEqual([]);
  });

  it('returns nothing without a profile lookup when there are no pings', async () => {
    const d = db({ user_notifications: () => ({ data: [], error: null }) });
    expect(await loadIncomingPings(d.client, ME, NOW)).toEqual([]);
    expect(d.calls.map((c) => c.table)).toEqual(['user_notifications']);
  });

  it('throws on a lookup error so the route can answer 503', async () => {
    const d = db({ profiles: () => ({ data: null, error: { message: 'x' } }) });
    await expect(loadIncomingPings(d.client, ME, NOW)).rejects.toThrow();
  });
});
