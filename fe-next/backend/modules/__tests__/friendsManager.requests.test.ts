/**
 * friendsManager — request lifecycle hardening.
 *  - ids are interpolated into PostgREST `.or()` filters, so they must be UUIDs
 *  - a request sent while the target already has a pending request to us accepts it
 *  - outgoing pending requests are capped
 *  - block / unblock are server-side so the Redis friendship cache is invalidated
 */
vi.mock('../../utils/logger', () => {
  const l = { info: vi.fn(), error: vi.fn(), debug: vi.fn(), warn: vi.fn() };
  return { __esModule: true, default: l, ...l };
});
vi.mock('../supabaseServer', () => ({ __esModule: true, getSupabase: vi.fn() }));
vi.mock('../../redis', () => ({
  __esModule: true,
  getCachedFriendshipStatus: vi.fn().mockResolvedValue(null),
  cacheFriendshipStatus: vi.fn().mockResolvedValue(undefined),
  invalidateFriendshipStatus: vi.fn().mockResolvedValue(undefined),
}));

import { vi } from 'vitest';
import {
  sendFriendRequest,
  blockUser,
  unblockUser,
  MAX_PENDING_OUTGOING_REQUESTS,
} from '../friendsManager';
import { getSupabase } from '../supabaseServer';
import { invalidateFriendshipStatus } from '../../redis';

const ME = '11111111-1111-4111-8111-111111111111';
const THEM = '22222222-2222-4222-8222-222222222222';

type Result = { data?: unknown; error?: { message: string; code?: string } | null; count?: number | null };

/**
 * Chainable, awaitable Supabase query stub. Every builder method returns the
 * same chain; awaiting it (or `.single()/.maybeSingle()`) resolves the next
 * queued result for that table+operation.
 */
function makeSupabase(plan: Record<string, Result[]>) {
  const calls: Array<{ table: string; op: string; args: unknown[] }> = [];
  const from = vi.fn((table: string) => {
    let op = 'select';
    const chain: Record<string, unknown> = {};
    const next = (): Result => {
      const key = `${table}:${op}`;
      const q = plan[key];
      return q && q.length ? q.shift()! : { data: null, error: null };
    };
    const passthrough = [
      'select', 'eq', 'neq', 'or', 'in', 'limit', 'order', 'lt', 'lte',
    ];
    for (const m of passthrough) {
      chain[m] = vi.fn((...args: unknown[]) => {
        if (m === 'select' && op === 'select') calls.push({ table, op: 'select', args });
        return chain;
      });
    }
    for (const m of ['insert', 'update', 'delete'] as const) {
      chain[m] = vi.fn((...args: unknown[]) => {
        op = m;
        calls.push({ table, op: m, args });
        return chain;
      });
    }
    chain.single = vi.fn(async () => next());
    chain.maybeSingle = vi.fn(async () => next());
    chain.then = (resolve: (r: Result) => unknown, reject: (e: unknown) => unknown) =>
      Promise.resolve(next()).then(resolve, reject);
    return chain;
  });
  return { client: { from }, calls };
}

describe('sendFriendRequest — id validation', () => {
  it('rejects a target id that is not a UUID before touching the DB (filter-injection guard)', async () => {
    const result = await sendFriendRequest(ME, 'x),status.eq.blocked,and(user_id.eq.y');
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('VALIDATION_FAILED');
    expect(getSupabase).not.toHaveBeenCalled();
  });
});

describe('sendFriendRequest — mutual request', () => {
  beforeEach(() => vi.clearAllMocks());

  it('accepts the target\'s pending request instead of reporting REQUEST_ALREADY_EXISTS', async () => {
    const { client, calls } = makeSupabase({
      'friends:select': [{ data: [{ id: 'req-1', user_id: THEM, friend_id: ME, status: 'pending' }], error: null }],
      'friends:update': [{ data: null, error: null }],
    });
    (getSupabase as ReturnType<typeof vi.fn>).mockReturnValue(client);

    const result = await sendFriendRequest(ME, THEM);

    expect(result.success).toBe(true);
    expect(result.autoAccepted).toBe(true);
    expect(result.request?.status).toBe('accepted');
    expect(calls.some((c) => c.op === 'update' && (c.args[0] as { status: string }).status === 'accepted')).toBe(true);
    expect(calls.some((c) => c.op === 'insert')).toBe(false);
    expect(invalidateFriendshipStatus).toHaveBeenCalledWith(ME, THEM);
  });

  it('still reports REQUEST_ALREADY_EXISTS for our own outgoing pending request', async () => {
    const { client } = makeSupabase({
      'friends:select': [{ data: [{ id: 'req-1', user_id: ME, friend_id: THEM, status: 'pending' }], error: null }],
    });
    (getSupabase as ReturnType<typeof vi.fn>).mockReturnValue(client);

    const result = await sendFriendRequest(ME, THEM);

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('REQUEST_ALREADY_EXISTS');
  });

  it('prefers the blocked row when duplicate rows exist for the pair', async () => {
    const { client } = makeSupabase({
      'friends:select': [{
        data: [
          { id: 'a', user_id: ME, friend_id: THEM, status: 'pending' },
          { id: 'b', user_id: THEM, friend_id: ME, status: 'blocked' },
        ],
        error: null,
      }],
    });
    (getSupabase as ReturnType<typeof vi.fn>).mockReturnValue(client);

    const result = await sendFriendRequest(ME, THEM);

    expect(result.errorCode).toBe('USER_BLOCKED');
  });
});

describe('sendFriendRequest — outgoing cap', () => {
  beforeEach(() => vi.clearAllMocks());

  it('refuses once the sender has MAX_PENDING_OUTGOING_REQUESTS pending requests', async () => {
    const { client, calls } = makeSupabase({
      'friends:select': [
        { data: [], error: null }, // no existing row for the pair
        { data: null, error: null, count: MAX_PENDING_OUTGOING_REQUESTS }, // pending count
      ],
    });
    (getSupabase as ReturnType<typeof vi.fn>).mockReturnValue(client);

    const result = await sendFriendRequest(ME, THEM);

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('TOO_MANY_PENDING_REQUESTS');
    expect(calls.some((c) => c.op === 'insert')).toBe(false);
  });
});

describe('blockUser / unblockUser', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects blocking yourself and non-UUID targets', async () => {
    expect((await blockUser(ME, ME)).errorCode).toBe('CANNOT_ADD_SELF');
    expect((await blockUser(ME, 'nope')).errorCode).toBe('VALIDATION_FAILED');
    expect(getSupabase).not.toHaveBeenCalled();
  });

  it('flips an existing friendship row to a block in ONE update (no delete-then-insert data loss)', async () => {
    const { client, calls } = makeSupabase({
      'friends:select': [{ data: [{ id: 'row-1', user_id: THEM, friend_id: ME, status: 'accepted' }], error: null }],
      'friends:update': [{ data: null, error: null }],
    });
    (getSupabase as ReturnType<typeof vi.fn>).mockReturnValue(client);

    const result = await blockUser(ME, THEM);

    expect(result.success).toBe(true);
    expect(result.wasFriends).toBe(true);
    const update = calls.find((c) => c.table === 'friends' && c.op === 'update');
    expect(update?.args[0]).toMatchObject({ user_id: ME, friend_id: THEM, status: 'blocked' });
    expect(calls.some((c) => c.table === 'friends' && c.op === 'delete')).toBe(false);
    expect(invalidateFriendshipStatus).toHaveBeenCalledWith(ME, THEM);
  });

  it('inserts a block row when no relationship exists', async () => {
    const { client, calls } = makeSupabase({
      'friends:select': [{ data: [], error: null }],
      'friends:insert': [{ data: null, error: null }],
    });
    (getSupabase as ReturnType<typeof vi.fn>).mockReturnValue(client);

    const result = await blockUser(ME, THEM);

    expect(result.success).toBe(true);
    expect(result.wasFriends).toBe(false);
    const insert = calls.find((c) => c.op === 'insert' && c.table === 'friends');
    expect(insert?.args[0]).toMatchObject({ user_id: ME, friend_id: THEM, status: 'blocked' });
  });

  it('unblock only deletes OUR block row and invalidates the cache', async () => {
    const { client, calls } = makeSupabase({ 'friends:delete': [{ data: null, error: null }] });
    (getSupabase as ReturnType<typeof vi.fn>).mockReturnValue(client);

    const result = await unblockUser(ME, THEM);

    expect(result.success).toBe(true);
    expect(calls.some((c) => c.op === 'delete' && c.table === 'friends')).toBe(true);
    expect(invalidateFriendshipStatus).toHaveBeenCalledWith(ME, THEM);
  });
});
