/**
 * The single multiplayer roster source for host AND joiner.
 *
 * Two server streams describe the room: `updateUsers` (who is seated: host,
 * bots, presence) and `updateLeaderboard` (who has scored). The host view read
 * the first, the joiner's desktop roster the second, so the joiner showed
 * "PLAYERS 0" in a room of four (pitfall class 3 — two paths to the same fact).
 * Every roster UI (lobby seats, in-round strip, desktop rail) builds from
 * `toMpRoster`, so both sides render the same room.
 */
import type { Avatar } from '@/shared/types/game';

export type MpConn = 'ok' | 'away' | 'gone';

export interface MpRosterPlayer {
  id: string;
  name: string;
  avatar?: Avatar;
  score: number;
  /** 1-based competition rank (ties share a rank: 1, 2, 2, 4). */
  rank: number;
  isHost: boolean;
  isBot: boolean;
  isReady?: boolean;
  conn: MpConn;
  /** Points gained since the previous roster passed in `options.previous`. */
  lastGain?: number;
}

/** Shape of one `updateUsers` / `joined.users` entry (loose on purpose). */
export interface MpRosterUserLike {
  username: string;
  avatar?: Avatar;
  isHost?: boolean;
  isBot?: boolean;
  presenceStatus?: string;
}

/** Shape of one `updateLeaderboard` entry (loose on purpose). */
export interface MpRosterScoreLike {
  username: string;
  score: number;
  avatar?: Avatar;
  isHost?: boolean;
  isBot?: boolean;
}

export interface ToMpRosterOptions {
  readyUsernames?: readonly string[];
  /** The previous roster, to compute `lastGain`. */
  previous?: readonly MpRosterPlayer[];
}

function presenceToConn(presence: string | undefined): MpConn {
  if (!presence || presence === 'active') return 'ok';
  return 'away';
}

export function toMpRoster(
  leaderboard: readonly MpRosterScoreLike[] | undefined,
  users: readonly MpRosterUserLike[] | undefined,
  _meId: string,
  options: ToMpRosterOptions = {},
): MpRosterPlayer[] {
  const seated = users ?? [];
  const scores = leaderboard ?? [];
  const byId = new Map<string, MpRosterPlayer>();
  const ready = options.readyUsernames ? new Set(options.readyUsernames) : null;

  for (const u of seated) {
    if (!u?.username) continue;
    byId.set(u.username, {
      id: u.username,
      name: u.username,
      avatar: u.avatar,
      score: 0,
      rank: 0,
      isHost: !!u.isHost,
      isBot: !!u.isBot,
      conn: presenceToConn(u.presenceStatus),
    });
  }

  const usersKnown = seated.length > 0;
  for (const s of scores) {
    if (!s?.username) continue;
    const existing = byId.get(s.username);
    if (existing) {
      existing.score = s.score ?? 0;
      existing.avatar = existing.avatar ?? s.avatar;
      existing.isHost = existing.isHost || !!s.isHost;
      existing.isBot = existing.isBot || !!s.isBot;
    } else {
      byId.set(s.username, {
        id: s.username,
        name: s.username,
        avatar: s.avatar,
        score: s.score ?? 0,
        rank: 0,
        isHost: !!s.isHost,
        isBot: !!s.isBot,
        // A scorer missing from a KNOWN seat list has left the room.
        conn: usersKnown ? 'gone' : 'ok',
      });
    }
  }

  // Stable sort: equal scores keep seat order.
  const sorted = [...byId.values()].sort((a, b) => b.score - a.score);
  const prevScore = options.previous ? new Map(options.previous.map((p) => [p.id, p.score])) : null;
  sorted.forEach((p, i) => {
    p.rank = i > 0 && sorted[i - 1].score === p.score ? sorted[i - 1].rank : i + 1;
    if (ready) p.isReady = ready.has(p.id);
    if (prevScore) p.lastGain = Math.max(0, p.score - (prevScore.get(p.id) ?? p.score));
  });
  return sorted;
}

/** My rank and the room size, for `MpRankChip`. rank 0 = not on the board. */
export function rankOf(roster: readonly MpRosterPlayer[], meId: string): { rank: number; total: number } {
  const me = roster.find((p) => p.id === meId);
  return { rank: me?.rank ?? 0, total: roster.length };
}

/**
 * The seat list carried on the `joined` payload (every server `joined` emit
 * includes `users: getGameUsers(gameCode)`). PageClient used to drop it, so the
 * lobby mounted empty until the next `updateUsers` broadcast landed. `null`
 * means "no seat list on this payload" — keep whatever roster you have.
 */
export function rosterSeedFromJoined<T extends MpRosterUserLike>(data: { users?: T[] }): T[] | null {
  return Array.isArray(data.users) ? data.users : null;
}
