/**
 * searchUsers — the query is spliced into a PostgREST `.or()` filter, so
 * filter-syntax characters must be stripped and LIKE wildcards escaped; and users
 * in a block relationship (either direction) must not show up.
 */
import { vi } from 'vitest';

const { orFilters, profilesResult, relationsResult } = vi.hoisted(() => ({
  orFilters: [] as string[],
  profilesResult: { data: [] as unknown[], error: null as unknown },
  relationsResult: { data: [] as unknown[] },
}));

vi.mock('@/utils/logger', () => ({ default: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() } }));
vi.mock('./../onlineStatusThrottle', () => ({ shouldWriteOnlineStatus: () => true }));
vi.mock('@/utils/supabase/loadClient', () => ({
  loadSupabaseClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'me' } } }) },
    from: (table: string) => {
      const chain: Record<string, unknown> = {};
      chain.select = () => chain;
      chain.neq = () => chain;
      chain.limit = async () => profilesResult;
      chain.or = (f: string) => {
        orFilters.push(f);
        // profiles query chains .neq().limit(); friends query is awaited directly
        return table === 'friends' ? Promise.resolve(relationsResult) : chain;
      };
      return chain;
    },
  }),
}));

import { searchUsers } from '../friendsHeadToHead';

const profile = (id: string) => ({
  id, username: id, display_name: id, avatar_emoji: null, avatar_color: null,
  avatar_image: null, avatar_config: null, last_seen_at: null, total_games: 0, current_level: 1,
});

describe('searchUsers', () => {
  beforeEach(() => {
    orFilters.length = 0;
    profilesResult.data = [];
    relationsResult.data = [];
  });

  it('strips filter-syntax characters so a query cannot add its own PostgREST clauses', async () => {
    await searchUsers('bob),id.neq.x,(');

    const filter = orFilters[0];
    expect(filter).toBe('username.ilike.%bobid.neq.x%,display_name.ilike.%bobid.neq.x%');
  });

  it('escapes LIKE wildcards so "%" and "_" match literally', async () => {
    await searchUsers('50%_off');

    expect(orFilters[0]).toBe('username.ilike.%50\\%\\_off%,display_name.ilike.%50\\%\\_off%');
  });

  it('does not query at all when the sanitised query is shorter than 2 chars', async () => {
    const result = await searchUsers('a,');
    expect(result).toEqual([]);
    expect(orFilters).toHaveLength(0);
  });

  it('hides users we blocked and users who blocked us', async () => {
    profilesResult.data = [profile('blocked-by-me'), profile('blocked-me'), profile('ok')];
    relationsResult.data = [
      { user_id: 'me', friend_id: 'blocked-by-me', status: 'blocked' },
      { user_id: 'blocked-me', friend_id: 'me', status: 'blocked' },
    ];

    const result = await searchUsers('bo');

    expect(result.map((u) => u.odUserId)).toEqual(['ok']);
  });
});
