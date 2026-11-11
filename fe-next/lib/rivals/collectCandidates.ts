import type { LeagueNeighbors } from './leagueRivals';
import { rivalWindow, type H2HRow } from './pickers';
import type { Candidate } from './rankRivals';
import type { ResultsMode } from './types';

export interface BoardRow {
  identity: string;
  name: string;
  total: number;
  publicName: boolean;
  customAvatar: unknown;
}

export interface CoPlayRow {
  userId: string;
  gameCode: string;
  at: string | null;
}

export interface CollectInput {
  mode: ResultsMode;
  myUserId: string | null;
  myIdentity?: string | null;
  myScore?: number;
  now?: number;
  board?: BoardRow[];
  ghosts?: Array<{ userId: string; scorePct: number }>;
  league?: LeagueNeighbors | null;
  weekly?: { rivalId: string; rivalScore: number; playerScore: number } | null;
  h2h?: H2HRow[];
  friendIds?: string[];
  coPlays?: CoPlayRow[];
  opponentUserIds?: string[];
  fofIds?: string[];
}

const PER_SOURCE = 10;
const THIS_GAME_MS = 2 * 60 * 60 * 1000;

/** Every source's candidates merged into one entry per person. Pure. */
export function collectCandidates(input: CollectInput): { candidates: Candidate[]; myScore?: number } {
  const { myUserId, now = Date.now() } = input;
  const byKey = new Map<string, Candidate>();
  const get = (key: string, userId?: string): Candidate | null => {
    if (myUserId && userId === myUserId) return null;
    let c = byKey.get(key);
    if (!c) {
      c = { key, userId };
      byKey.set(key, c);
    }
    return c;
  };
  const friends = new Set(input.friendIds ?? []);
  for (const id of friends) {
    const c = get(id, id);
    if (c) c.friend = true;
  }

  let myScore = input.myScore;
  if (input.board) {
    const mine = input.myIdentity ? input.board.find((r) => r.identity === input.myIdentity) : undefined;
    myScore = mine?.total ?? myScore;
    const others = input.board.filter((r) => r.publicName && r.identity !== input.myIdentity);
    const picked = new Set<BoardRow>();
    if (myScore != null) {
      const window = rivalWindow(myScore);
      const s = myScore;
      others.filter((r) => Math.abs(r.total - s) <= window).sort((a, b) => Math.abs(a.total - s) - Math.abs(b.total - s))
        .slice(0, PER_SOURCE).forEach((r) => picked.add(r));
      const below = others.filter((r) => r.total <= s).sort((a, b) => b.total - a.total)[0];
      if (below) picked.add(below);
    }
    for (const r of others) if (r.identity.startsWith('u:') && friends.has(r.identity.slice(2))) picked.add(r);
    for (const r of picked) {
      const userId = r.identity.startsWith('u:') ? r.identity.slice(2) : undefined;
      const c = get(userId ?? r.identity, userId);
      if (!c) continue;
      Object.assign(c, { skill: { theirs: r.total, source: 'daily' }, onTodayBoard: true, boardName: r.name, boardAvatar: r.customAvatar ?? undefined });
    }
  }

  for (const g of (input.ghosts ?? []).filter((x) => !x.userId.startsWith('synthetic:')).slice(0, PER_SOURCE)) {
    const c = get(g.userId, g.userId);
    if (c) c.skill = { theirs: g.scorePct, source: 'ghost' };
  }

  const lg = input.league;
  if (lg?.player) {
    for (const n of [lg.above, lg.below]) {
      const c = n ? get(n.userId, n.userId) : null;
      if (c && n) c.skill ??= { theirs: n.score, mine: lg.player.score, source: 'league' };
    }
  }
  if (input.weekly) {
    const c = get(input.weekly.rivalId, input.weekly.rivalId);
    if (c) c.skill ??= { theirs: input.weekly.rivalScore, mine: input.weekly.playerScore, source: 'ghost' };
  }

  if (myUserId) {
    for (const r of (input.h2h ?? []).slice(0, PER_SOURCE * 2)) {
      const mineIs1 = r.player1_id === myUserId;
      if (!mineIs1 && r.player2_id !== myUserId) continue;
      const other = mineIs1 ? r.player2_id : r.player1_id;
      const c = get(other, other);
      if (!c) continue;
      c.record = {
        wins: (mineIs1 ? r.player1_wins : r.player2_wins) ?? 0,
        losses: (mineIs1 ? r.player2_wins : r.player1_wins) ?? 0,
        draws: r.draws ?? 0,
      };
      c.recordAt = r.last_game_at;
    }
  }

  const shared = new Map<string, { codes: Set<string>; lastAt: string | null }>();
  for (const row of input.coPlays ?? []) {
    if (row.userId === myUserId) continue;
    const e = shared.get(row.userId) ?? { codes: new Set<string>(), lastAt: null };
    e.codes.add(row.gameCode);
    if (row.at && (!e.lastAt || row.at > e.lastAt)) e.lastAt = row.at;
    shared.set(row.userId, e);
  }
  const justNow = new Date(now).toISOString();
  for (const id of input.opponentUserIds ?? []) {
    const e = shared.get(id) ?? { codes: new Set<string>(), lastAt: null };
    // This game may already be saved under its real room code.
    if (e.lastAt && now - Date.parse(e.lastAt) <= THIS_GAME_MS) continue;
    e.codes.add('__this_game__');
    e.lastAt = justNow;
    shared.set(id, e);
  }
  [...shared.entries()]
    .sort((a, b) => b[1].codes.size - a[1].codes.size || (b[1].lastAt ?? '').localeCompare(a[1].lastAt ?? ''))
    .slice(0, PER_SOURCE)
    .forEach(([id, e]) => {
      const c = get(id, id);
      if (c) c.coPlay = { count: e.codes.size, lastAt: e.lastAt };
    });

  markFriendsOfFriends(byKey.values(), input.fofIds ?? [], friends);
  return { candidates: [...byKey.values()], myScore };
}

export function markFriendsOfFriends(candidates: Iterable<Candidate>, fofIds: string[], friendIds: Set<string>): void {
  const fof = new Set(fofIds);
  for (const c of candidates) if (c.userId && !friendIds.has(c.userId) && fof.has(c.userId)) c.fof = true;
}
