import { describe, it, expect } from 'vitest';
import { loadFriendsHome, type FriendsHomeDeps } from '../loadFriendsHome';

const NOW = Date.parse('2026-11-12T12:00:00Z');
const daysAgo = (d: number) => new Date(NOW - d * 86_400_000).toISOString();

type ProfileRow = Awaited<ReturnType<FriendsHomeDeps['profiles']>>[number];
const profile = (id: string, over: Partial<ProfileRow> = {}): ProfileRow => ({
  id,
  username: id,
  display_name: id[0].toUpperCase() + id.slice(1),
  avatar_config: null,
  avatar_image: null,
  last_seen_at: daysAgo(1),
  is_test_account: false,
  birth_year: 1990,
  social_features_override: null,
  created_at: daysAgo(400),
  ...over,
});

function deps(over: Partial<FriendsHomeDeps> = {}): FriendsHomeDeps & { profileCalls: string[][] } {
  const profileCalls: string[][] = [];
  const all: Record<string, ProfileRow> = Object.fromEntries(
    [
      profile('bea'),
      profile('cal', { last_seen_at: daysAgo(0.001) }),
      profile('asker'),
      profile('opp'),
      profile('oldopp'),
      profile('blocked'),
      profile('outgoing'),
      profile('tester', { is_test_account: true }),
      profile('gen', { username: 'disco_llama-8erqwm', display_name: 'disco_llama-8erqwm' }),
      profile('kid', { birth_year: 2016 }),
      profile('newbie', { birth_year: null, created_at: daysAgo(1) }),
    ].map((p) => [p.id, p]),
  );
  return {
    profileCalls,
    now: () => NOW,
    presence: (ids) => ids.map((userId) => ({ userId, status: null })),
    myProfile: async () => ({ birth_year: 1990, social_features_override: null, created_at: daysAgo(400) }),
    friendRows: async () => [
      { id: 'r1', user_id: 'me', friend_id: 'bea', status: 'accepted', created_at: daysAgo(10) },
      { id: 'r2', user_id: 'cal', friend_id: 'me', status: 'accepted', created_at: daysAgo(10) },
      { id: 'r3', user_id: 'asker', friend_id: 'me', status: 'pending', created_at: daysAgo(1) },
      { id: 'r4', user_id: 'me', friend_id: 'outgoing', status: 'pending', created_at: daysAgo(1) },
      { id: 'r5', user_id: 'me', friend_id: 'blocked', status: 'blocked', created_at: daysAgo(1) },
    ],
    incomingRequests: async () => [{ id: 'r3', user_id: 'asker', friend_id: 'me', status: 'pending', created_at: daysAgo(1) }],
    h2hRows: async () => [
      { player1_id: 'me', player2_id: 'kid', player1_wins: 1, player2_wins: 0, draws: 0, last_game_at: daysAgo(3) },
      { player1_id: 'me', player2_id: 'newbie', player1_wins: 1, player2_wins: 0, draws: 0, last_game_at: daysAgo(3) },
      { player1_id: 'bea', player2_id: 'me', player1_wins: 1, player2_wins: 3, draws: 0, last_game_at: daysAgo(2) },
      { player1_id: 'me', player2_id: 'opp', player1_wins: 0, player2_wins: 2, draws: 0, last_game_at: daysAgo(3) },
      { player1_id: 'me', player2_id: 'blocked', player1_wins: 1, player2_wins: 0, draws: 0, last_game_at: daysAgo(3) },
      { player1_id: 'me', player2_id: 'outgoing', player1_wins: 1, player2_wins: 0, draws: 0, last_game_at: daysAgo(3) },
      { player1_id: 'me', player2_id: 'tester', player1_wins: 1, player2_wins: 0, draws: 0, last_game_at: daysAgo(3) },
      { player1_id: 'me', player2_id: 'gen', player1_wins: 1, player2_wins: 0, draws: 0, last_game_at: daysAgo(3) },
      { player1_id: 'oldopp', player2_id: 'me', player1_wins: 1, player2_wins: 0, draws: 0, last_game_at: daysAgo(45) },
    ],
    profiles: async (ids) => {
      profileCalls.push([...ids]);
      return ids.map((id) => all[id]).filter(Boolean);
    },
    ...over,
  };
}

describe('loadFriendsHome', () => {
  it('Given friends, Then they come most-recently-seen first with my head-to-head record', async () => {
    const out = await loadFriendsHome(deps(), 'me');
    expect(out.friendCount).toBe(2);
    expect(out.friends.map((f) => f.userId)).toEqual(['cal', 'bea']);
    expect(out.friends.find((f) => f.userId === 'bea')).toMatchObject({ name: 'Bea', wins: 3, losses: 1 });
    expect(out.friends.find((f) => f.userId === 'cal')).toMatchObject({ wins: 0, losses: 0 });
  });

  it('Given incoming and outgoing requests, Then only incoming ones are listed, with names', async () => {
    const out = await loadFriendsHome(deps(), 'me');
    expect(out.incoming).toEqual({ count: 1, first: [expect.objectContaining({ requestId: 'r3', userId: 'asker', name: 'Asker' })] });
  });

  it('Given under 3 friends, Then recent opponents are suggested minus friends, pending, blocked, test and generated names, and older than 30 days', async () => {
    const out = await loadFriendsHome(deps(), 'me');
    expect(out.suggestions.map((s) => s.userId)).toEqual(['opp']);
    expect(out.suggestions[0]).toMatchObject({ name: 'Opp', wins: 0, losses: 2 });
  });

  it('Given 3 or more friends, Then no suggestions unless asked', async () => {
    const rows = ['f1', 'f2', 'f3'].map((id, i) => ({ id: `x${i}`, user_id: 'me', friend_id: id, status: 'accepted', created_at: daysAgo(1) }));
    const d = deps({ friendRows: async () => rows });
    expect((await loadFriendsHome(d, 'me')).suggestions).toEqual([]);
    expect((await loadFriendsHome(d, 'me', { suggestions: true })).suggestions.map((s) => s.userId)).toContain('opp');
  });

  it('Given an account that may not add contacts, Then no suggestions and canAddFriends is false', async () => {
    const d = deps({ myProfile: async () => ({ birth_year: 2016, social_features_override: null, created_at: daysAgo(1) }) });
    const out = await loadFriendsHome(d, 'me');
    expect(out.canAddFriends).toBe(false);
    expect(out.suggestions).toEqual([]);
  });

  it('Given many friends, Then at most 6 come back and the full count is kept', async () => {
    const rows = Array.from({ length: 9 }, (_, i) => ({ id: `x${i}`, user_id: 'me', friend_id: `f${i}`, status: 'accepted', created_at: daysAgo(1) }));
    const d = deps({ friendRows: async () => rows, profiles: async (ids) => ids.map((id) => profile(id)) });
    const out = await loadFriendsHome(d, 'me');
    expect(out.friends).toHaveLength(6);
    expect(out.friendCount).toBe(9);
  });

  it('Given a friend in an open lobby, Then they sort first and their presence comes back with the shown friends only', async () => {
    const rows = Array.from({ length: 8 }, (_, i) => ({ id: `x${i}`, user_id: 'me', friend_id: `f${i}`, status: 'accepted', created_at: daysAgo(1) }));
    const d = deps({
      friendRows: async () => rows,
      profiles: async (ids) => ids.map((id, i) => profile(id, { last_seen_at: daysAgo(i + 1) })),
      presence: (ids) => ids.map((userId) => (userId === 'f7' ? { userId, status: 'in_lobby' as const, gameCode: 'ROOM' } : { userId, status: null })),
    });
    const out = await loadFriendsHome(d, 'me');
    expect(out.friends[0].userId).toBe('f7');
    expect(out.presence).toEqual([{ userId: 'f7', status: 'in_lobby', gameCode: 'ROOM' }]);
  });

  it('Given recent opponents who are children or of unknown age, Then they are never suggested', async () => {
    const out = await loadFriendsHome(deps(), 'me');
    expect(out.suggestions.map((s) => s.userId)).not.toContain('kid');
    expect(out.suggestions.map((s) => s.userId)).not.toContain('newbie');
  });

  it('Given a friend or requester with only a generated name, Then the name is null (the card shows a generic label)', async () => {
    const d = deps({
      friendRows: async () => [{ id: 'g', user_id: 'me', friend_id: 'gen', status: 'accepted', created_at: daysAgo(1) }],
      incomingRequests: async () => [{ id: 'q', user_id: 'gen', friend_id: 'me', status: 'pending', created_at: daysAgo(1) }],
    });
    const out = await loadFriendsHome(d, 'me');
    expect(out.friends[0].name).toBeNull();
    expect(out.incoming.first[0].name).toBeNull();
  });

  it('Given many friends, Then requests and candidates get their own profile reads, so none are cut off', async () => {
    const rows = Array.from({ length: 2 }, (_, i) => ({ id: `x${i}`, user_id: 'me', friend_id: `f${i}`, status: 'accepted', created_at: daysAgo(1) }));
    const d = deps({ friendRows: async () => rows });
    const out = await loadFriendsHome(d, 'me');
    expect(d.profileCalls).toEqual([['f0', 'f1'], ['asker'], ['kid', 'newbie', 'bea', 'opp', 'blocked', 'outgoing', 'tester', 'gen']].filter((c) => c.length));
    expect(out.incoming.first.map((r) => r.userId)).toEqual(['asker']);
  });
});
