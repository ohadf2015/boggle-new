/**
 * `public.profiles` is SELECT-restricted to the caller's OWN row, so every
 * cross-player read in the friends module silently returned ZERO rows with
 * `error: null` — the friends list, the request lists and the blocked list all
 * rendered empty. Verified on prod as role `authenticated`:
 *
 *   select … from profiles      where id in (<my two friends>)  -> 0 rows
 *   select … from public_profiles where id in (<same two>)      -> 2 rows
 *
 * These tests pin the table every cross-player read must use. They cannot prove
 * the RLS behaviour (a mocked client answers identically either way) — that was
 * proven by the probe above; this is the cheap guard against a silent revert.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

interface QueryCall {
  table: string;
  columns: string;
}

const calls: QueryCall[] = [];
const results: Record<string, { data: unknown; error: unknown }> = {};

function makeQuery(table: string) {
  const builder: Record<string, unknown> = {};
  let columns = '';
  const chain = (...args: unknown[]) => {
    void args;
    return builder;
  };
  for (const method of ['eq', 'or', 'in', 'neq', 'limit', 'order', 'gte', 'lte']) {
    builder[method] = chain;
  }
  builder.select = (cols: string) => {
    columns = cols;
    calls.push({ table, columns });
    return builder;
  };
  builder.single = () => Promise.resolve(results[table] ?? { data: null, error: null });
  builder.then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve(results[table] ?? { data: [], error: null }).then(resolve);
  return builder;
}

const mockGetUser = vi.fn();

vi.mock('@/utils/supabase/client', () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
    from: (table: string) => makeQuery(table),
  }),
}));

vi.mock('@/utils/logger', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import {
  getFriends,
  getBlockedUsers,
  getPendingRequests,
  getOutgoingRequests,
} from '@/utils/friends';
import { searchUsers, getUserByUsername } from '@/utils/friendsHeadToHead';

const ME = 'me-123';
const THEM = 'them-456';

function profileRow(id = THEM) {
  return {
    id,
    username: 'Eden',
    display_name: 'Eden D',
    avatar_emoji: '🦊',
    avatar_color: '#BFFF00',
    avatar_config: null,
    total_games: 3,
    current_level: 2,
    last_seen_at: new Date().toISOString(),
  };
}

/** Tables a cross-player read is allowed to touch. */
const readTables = () => calls.map((c) => c.table);

describe('friends module reads other players from public_profiles, never profiles', () => {
  beforeEach(() => {
    calls.length = 0;
    for (const k of Object.keys(results)) delete results[k];
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: ME } } });
  });

  it('getFriends resolves friend profiles from public_profiles', async () => {
    results.friends = {
      data: [{ id: 'f1', user_id: ME, friend_id: THEM, status: 'accepted' }],
      error: null,
    };
    results.public_profiles = { data: [profileRow()], error: null };

    const friends = await getFriends(ME);

    expect(readTables()).toContain('public_profiles');
    expect(readTables()).not.toContain('profiles');
    expect(friends).toHaveLength(1);
    expect(friends[0].username).toBe('Eden');
  });

  it('getBlockedUsers resolves blocked profiles from public_profiles', async () => {
    results.friends = { data: [{ friend_id: THEM }], error: null };
    results.public_profiles = { data: [profileRow()], error: null };

    const blocked = await getBlockedUsers();

    expect(readTables()).toContain('public_profiles');
    expect(readTables()).not.toContain('profiles');
    expect(blocked).toHaveLength(1);
  });

  it('getPendingRequests fetches names in a second query, not a PostgREST embed', async () => {
    results.friends = {
      data: [{ id: 'r1', user_id: THEM, created_at: '2026-08-15T00:00:00Z' }],
      error: null,
    };
    results.public_profiles = { data: [profileRow()], error: null };

    const requests = await getPendingRequests(ME);

    // An embed (`profiles!friends_user_id_fkey(...)`) resolves through a FK
    // constraint; `public_profiles` is a view and has none, so the join has to
    // become a second `.in('id', …)` query.
    const friendsSelect = calls.find((c) => c.table === 'friends')?.columns ?? '';
    expect(friendsSelect).not.toMatch(/profiles\s*!/);
    expect(readTables()).toContain('public_profiles');
    expect(requests[0].fromUsername).toBe('Eden');
    expect(requests[0].fromDisplayName).toBe('Eden D');
  });

  it('getOutgoingRequests fetches names in a second query, not a PostgREST embed', async () => {
    results.friends = {
      data: [{ id: 'r2', friend_id: THEM, created_at: '2026-08-15T00:00:00Z' }],
      error: null,
    };
    results.public_profiles = { data: [profileRow()], error: null };

    const requests = await getOutgoingRequests(ME);

    const friendsSelect = calls.find((c) => c.table === 'friends')?.columns ?? '';
    expect(friendsSelect).not.toMatch(/profiles\s*!/);
    expect(readTables()).toContain('public_profiles');
    expect(requests[0].fromUsername).toBe('Eden');
  });

  it('searchUsers searches public_profiles', async () => {
    results.public_profiles = { data: [profileRow()], error: null };
    results.friends = { data: [], error: null };

    await searchUsers('ed');

    expect(readTables()).toContain('public_profiles');
    expect(readTables()).not.toContain('profiles');
  });

  it('getUserByUsername reads public_profiles', async () => {
    results.public_profiles = { data: profileRow(), error: null };

    const user = await getUserByUsername('Eden');

    expect(readTables()).toContain('public_profiles');
    expect(readTables()).not.toContain('profiles');
    expect(user?.username).toBe('Eden');
  });
});
