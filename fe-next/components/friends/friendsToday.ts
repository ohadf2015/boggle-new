import type { MergedLeaderboardEntry } from '@/lib/daily/mergeDailyLeaderboard';

export interface FriendsTodayRow {
  key: string;
  name: string;
  total: number;
  isYou: boolean;
  avatarImage: string | null;
  customAvatar: unknown;
  /** Rank among the viewer and their friends, 1..N (ties share a rank). */
  rank: number;
}

export interface FriendsToday {
  rows: FriendsTodayRow[];
  youPlayed: boolean;
  /** Friends who have not played today's daily yet. */
  notPlayed: number;
  /** Viewer's rank among those who played (null when they have not). */
  yourRank: number | null;
  /** The friend to chase: the one just above you, or today's top friend if you have not played. */
  toBeat: FriendsTodayRow | null;
}

/** You + friends from the combined daily board, ranked among themselves. */
export function buildFriendsToday(entries: MergedLeaderboardEntry[], friendCount: number): FriendsToday {
  const mine = entries
    .filter((e) => e.isYou || e.isFriend)
    .sort((a, b) => b.total - a.total || a.rank - b.rank);
  const rows: FriendsTodayRow[] = [];
  mine.forEach((e, i) => {
    const prev = rows[i - 1];
    rows.push({
      key: e.key ?? `${e.name}-${i}`,
      name: e.name,
      total: e.total,
      isYou: !!e.isYou,
      avatarImage: e.avatarImage,
      customAvatar: e.customAvatar,
      rank: prev && prev.total === e.total ? prev.rank : i + 1,
    });
  });
  const you = rows.find((r) => r.isYou) ?? null;
  const friendRows = rows.filter((r) => !r.isYou);
  // Played: the friend just above you. Not played yet: today's top friend.
  const toBeat = you
    ? friendRows.filter((r) => r.total > you.total).slice(-1)[0] ?? null
    : friendRows[0] ?? null;
  return {
    rows,
    youPlayed: !!you,
    notPlayed: Math.max(0, friendCount - friendRows.length),
    yourRank: you?.rank ?? null,
    toBeat,
  };
}
