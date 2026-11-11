import { rivalWindow } from './pickers';
import type { ResultsMode, RivalRecord, RivalWhy } from './types';

export interface Candidate {
  /** `userId`, or the board identity (`g:<fp>`) for a guest-only daily row. */
  key: string;
  userId?: string;
  /** A score on the current mode's own board: only these earn skill points. `mine` is my score on that same board. */
  skill?: { theirs: number; mine?: number; source: 'daily' | 'ghost' | 'league' };
  record?: RivalRecord;
  recordAt?: string | null;
  friend?: boolean;
  fof?: boolean;
  coPlay?: { count: number; lastAt: string | null };
  onTodayBoard?: boolean;
  boardName?: string;
  boardAvatar?: unknown;
}

export interface CandidateProfile {
  name: string;
  title: string | null;
  avatar: unknown;
  countryCode: string | null;
  language: string | null;
  lastSeenAt: string | null;
  isStudent: boolean;
}

export interface MeProfile {
  countryCode: string | null;
  language: string | null;
}

export interface RankedRival {
  key: string;
  userId?: string;
  name: string;
  title: string | null;
  avatar: unknown;
  score: number;
  gap?: number;
  why: RivalWhy | null;
  candidate: Candidate;
  countryCode: string | null;
}

export interface RankInput {
  mode: ResultsMode;
  candidates: Candidate[];
  /** Public-named, non-test profiles only: a candidate with a user id but no profile is dropped. */
  profiles: Map<string, CandidateProfile>;
  me: MeProfile | null;
  myUserId?: string | null;
  myScore?: number;
  now?: number;
}

const DAY = 86_400_000;
const W = {
  friend: 40,
  playedPerGame: 6,
  playedMaxGames: 5,
  playedRecent: 6,
  fof: 12,
  sameCountry: 6,
  sameLanguage: 6,
  skillMax: 30,
  slightlyAhead: 5,
  closeRecord: 10,
  seen1d: 15,
  seen3d: 10,
  seen7d: 5,
  staleDays: 21,
} as const;

const ageDays = (iso: string | null | undefined, now: number) => (iso ? (now - Date.parse(iso)) / DAY : Infinity);

function activity(lastSeenAt: string | null, now: number): number {
  const d = ageDays(lastSeenAt, now);
  return d <= 1 ? W.seen1d : d <= 3 ? W.seen3d : d <= 7 ? W.seen7d : 0;
}

/** Relation + skill + activity + balance, best first. The top contributing reason becomes `why`. */
export function rankRivals({ candidates, profiles, me, myUserId, myScore, now = Date.now() }: RankInput): RankedRival[] {
  const out: RankedRival[] = [];
  for (const c of candidates) {
    if (myUserId && c.userId === myUserId) continue;
    const p = c.userId ? profiles.get(c.userId) : undefined;
    if (c.userId && (!p || p.isStudent)) continue;
    if (!c.userId && !c.boardName) continue;
    if (p && ageDays(p.lastSeenAt, now) > W.staleDays && p.lastSeenAt && !c.onTodayBoard) continue;

    const reasons: Array<[RivalWhy, number]> = [];
    let total = 0;
    const add = (why: RivalWhy | null, points: number) => {
      if (points <= 0) return;
      total += points;
      if (why) reasons.push([why, points]);
    };

    if (c.friend) add({ kind: 'friend' }, W.friend);
    else if (c.fof) add({ kind: 'friendOfFriend' }, W.fof);

    const recordGames = c.record ? c.record.wins + c.record.losses + c.record.draws : 0;
    const games = Math.max(c.coPlay?.count ?? 0, recordGames);
    if (games > 0) {
      const lastAt = c.coPlay?.lastAt ?? c.recordAt ?? null;
      // "Played together 1x" reads wrong in most languages and says little; a single game earns points, not the chip.
      add(games >= 2 ? { kind: 'playedTogether', count: games } : null, Math.min(games, W.playedMaxGames) * W.playedPerGame + (ageDays(lastAt, now) <= 7 ? W.playedRecent : 0));
    }
    if (c.record && recordGames >= 2 && Math.abs(c.record.wins - c.record.losses) <= 2) add({ kind: 'closeRecord' }, W.closeRecord);

    if (p && me) {
      if (p.countryCode && p.countryCode === me.countryCode) add({ kind: 'sameCountry' }, W.sameCountry);
      if (p.language && p.language === me.language) add(null, W.sameLanguage);
    }

    let gap: number | undefined;
    const mine = c.skill?.mine ?? myScore;
    if (c.skill && mine != null) {
      gap = c.skill.theirs - mine;
      const window = rivalWindow(mine);
      const closeness = W.skillMax * Math.max(0, 1 - Math.abs(gap) / (2 * window));
      add({ kind: 'closeScore' }, closeness + (gap > 0 && gap <= window ? W.slightlyAhead : 0));
    }

    if (p) add(null, activity(p.lastSeenAt, now));

    reasons.sort((a, b) => b[1] - a[1]);
    out.push({
      key: c.key,
      userId: c.userId,
      name: p?.name ?? c.boardName!,
      title: p?.title ?? null,
      avatar: p?.avatar ?? c.boardAvatar ?? null,
      score: total,
      gap,
      why: reasons[0]?.[0] ?? null,
      candidate: c,
      countryCode: p?.countryCode ?? null,
    });
  }
  return out.sort((a, b) =>
    b.score - a.score
    || Math.abs(a.gap ?? Infinity) - Math.abs(b.gap ?? Infinity)
    || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
}
