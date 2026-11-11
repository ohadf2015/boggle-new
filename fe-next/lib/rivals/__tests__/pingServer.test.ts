import { describe, it, expect, vi } from 'vitest';

vi.mock('@/backend/utils/profanityFilter', () => ({ isProfane: (s: string) => s.toLowerCase().includes('badword') }));

import { checkPingAllowed } from '../pingServer';
import { pingFakeDb, has, type Handler } from './pingFakeDb';

const ME = '11111111-1111-4111-8111-111111111111';
const THEM = '22222222-2222-4222-8222-222222222222';
const NOW = new Date('2026-11-11T12:00:00Z');
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3600_000).toISOString();

function db(over: Partial<Record<string, Handler>> = {}) {
  return pingFakeDb({
    profiles: () => ({
      data: [
        { id: ME, display_name: 'Maya', username: 'maya' },
        { id: THEM, display_name: 'Noam', username: 'noam' },
      ],
      error: null,
    }),
    friends: () => ({ data: [], error: null }),
    classroom_memberships: () => ({ data: [], error: null }),
    parental_consents: () => ({ data: [], error: null }),
    user_notifications: () => ({ data: [], error: null }),
    ...over,
  } as Record<string, Handler>);
}

describe('checkPingAllowed', () => {
  it('allows a ping between two named, unblocked adults and returns the sender name', async () => {
    const result = await checkPingAllowed(db().client, ME, THEM, NOW);
    expect(result).toEqual({ ok: true, senderName: 'Maya' });
  });

  it('rejects pinging yourself', async () => {
    expect(await checkPingAllowed(db().client, ME, ME, NOW)).toMatchObject({ ok: false, code: 'self', status: 400 });
  });

  it('404s when the target has no profile', async () => {
    const d = db({ profiles: () => ({ data: [{ id: ME, display_name: 'Maya', username: 'maya' }], error: null }) });
    expect(await checkPingAllowed(d.client, ME, THEM, NOW)).toMatchObject({ ok: false, code: 'not_found', status: 404 });
  });

  it('refuses a target without a public name', async () => {
    const d = db({
      profiles: () => ({
        data: [
          { id: ME, display_name: 'Maya', username: 'maya' },
          { id: THEM, display_name: null, username: 'Player_0a1b2c3d' },
        ],
        error: null,
      }),
    });
    expect(await checkPingAllowed(d.client, ME, THEM, NOW)).toMatchObject({ ok: false, code: 'not_allowed' });
  });

  it('asks the sender to pick a name first when theirs is a placeholder', async () => {
    const d = db({
      profiles: () => ({
        data: [
          { id: ME, display_name: null, username: 'Player_0a1b2c3d' },
          { id: THEM, display_name: 'Noam', username: 'noam' },
        ],
        error: null,
      }),
    });
    expect(await checkPingAllowed(d.client, ME, THEM, NOW)).toMatchObject({ ok: false, code: 'name_required', status: 403 });
  });

  it('says blocked when the sender blocked the target', async () => {
    const d = db({ friends: () => ({ data: [{ user_id: ME }], error: null }) });
    expect(await checkPingAllowed(d.client, ME, THEM, NOW)).toMatchObject({ ok: false, code: 'blocked', status: 403 });
  });

  it('does not reveal that the target blocked the sender', async () => {
    const d = db({ friends: () => ({ data: [{ user_id: THEM }], error: null }) });
    expect(await checkPingAllowed(d.client, ME, THEM, NOW)).toMatchObject({ ok: false, code: 'not_allowed' });
  });

  it('checks the block in both directions', async () => {
    const d = db();
    await checkPingAllowed(d.client, ME, THEM, NOW);
    const friends = d.calls.find((c) => c.table === 'friends')!;
    expect(has(friends.ops, 'eq', 'status', 'blocked')).toBe(true);
    const or = String(friends.ops.find(([m]) => m === 'or')?.[1]);
    expect(or).toContain(`user_id.eq.${ME},friend_id.eq.${THEM}`);
    expect(or).toContain(`user_id.eq.${THEM},friend_id.eq.${ME}`);
  });

  it.each(['classroom_memberships', 'parental_consents'])('refuses when either side is a student (%s)', async (table) => {
    const d = db({ [table]: () => ({ data: [{ id: 'x' }], error: null }) });
    expect(await checkPingAllowed(d.client, ME, THEM, NOW)).toMatchObject({ ok: false, code: 'not_allowed', status: 403 });
  });

  it('caps a sender at 3 pings in a rolling day', async () => {
    const other = '33333333-3333-4333-8333-333333333333';
    const d = db({
      user_notifications: () => ({
        data: [1, 2, 3].map((h) => ({ user_id: other, created_at: hoursAgo(h + 7) })),
        error: null,
      }),
    });
    expect(await checkPingAllowed(d.client, ME, THEM, NOW)).toMatchObject({ ok: false, code: 'daily_limit', status: 429 });
  });

  it('allows one ping per target per 6 hours', async () => {
    const recent = db({ user_notifications: () => ({ data: [{ user_id: THEM, created_at: hoursAgo(5) }], error: null }) });
    expect(await checkPingAllowed(recent.client, ME, THEM, NOW)).toMatchObject({ ok: false, code: 'target_cooldown', status: 429 });

    const older = db({ user_notifications: () => ({ data: [{ user_id: THEM, created_at: hoursAgo(7) }], error: null }) });
    expect(await checkPingAllowed(older.client, ME, THEM, NOW)).toMatchObject({ ok: true });
  });

  it('counts only rival pings this sender sent in the last 24h', async () => {
    const d = db();
    await checkPingAllowed(d.client, ME, THEM, NOW);
    const q = d.calls.find((c) => c.table === 'user_notifications')!;
    expect(has(q.ops, 'eq', 'sender_id', ME)).toBe(true);
    expect(has(q.ops, 'like', 'related_entity_type', 'rival_ping:%')).toBe(true);
    expect(has(q.ops, 'gte', 'created_at', hoursAgo(24))).toBe(true);
  });

  it.each(['profiles', 'friends', 'classroom_memberships', 'parental_consents', 'user_notifications'])(
    'fails closed when the %s lookup errors',
    async (table) => {
      const d = db({ [table]: () => ({ data: null, error: { message: 'boom' } }) });
      expect(await checkPingAllowed(d.client, ME, THEM, NOW)).toMatchObject({ ok: false, code: 'unavailable', status: 503 });
    },
  );
});
