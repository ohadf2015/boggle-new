import { buildFriendsToday } from './friendsToday';
import type { MergedLeaderboardEntry } from '@/lib/daily/mergeDailyLeaderboard';

const e = (name: string, total: number, rank: number, flags: { isYou?: boolean; isFriend?: boolean } = {}): MergedLeaderboardEntry => ({
  rank, key: `k-${name}`, name, total, avatarEmoji: null, avatarColor: null, avatarImage: null, customAvatar: null,
  byMode: { 'word-hunt': total, 'word-wheel': 0, 'word-tower': 0, connections: 0 }, towerHeightM: null, playedModes: ['word-hunt'], ...flags,
});

describe('buildFriendsToday', () => {
  it('ranks you and friends among themselves and drops strangers', () => {
    const t = buildFriendsToday([e('Top', 900, 1), e('Dana', 500, 4, { isFriend: true }), e('Me', 400, 7, { isYou: true }), e('Leo', 300, 9, { isFriend: true })], 3);
    expect(t.rows.map((r) => [r.name, r.rank])).toEqual([['Dana', 1], ['Me', 2], ['Leo', 3]]);
    expect(t.yourRank).toBe(2);
    expect(t.toBeat?.name).toBe('Dana');
    expect(t.notPlayed).toBe(1);
  });

  it('chases the friend just above you, not the leader', () => {
    const t = buildFriendsToday([e('A', 900, 1, { isFriend: true }), e('B', 600, 2, { isFriend: true }), e('Me', 500, 3, { isYou: true })], 2);
    expect(t.toBeat?.name).toBe('B');
  });

  it('when you have not played, points at the top friend', () => {
    const t = buildFriendsToday([e('A', 900, 1, { isFriend: true })], 4);
    expect(t.youPlayed).toBe(false);
    expect(t.toBeat?.name).toBe('A');
    expect(t.notPlayed).toBe(3);
  });

  it('ties share a rank', () => {
    const t = buildFriendsToday([e('A', 500, 1, { isFriend: true }), e('Me', 500, 1, { isYou: true })], 1);
    expect(t.rows.map((r) => r.rank)).toEqual([1, 1]);
    expect(t.toBeat).toBeNull();
  });
});
