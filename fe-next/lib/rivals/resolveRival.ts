import { publicNameOrNull } from '@/lib/names/publicName';
import { resolveDisplayTitle } from '@/lib/titles/playerTitles';
import { collectCandidates, markFriendsOfFriends, type BoardRow, type CoPlayRow } from './collectCandidates';
import type { LeagueNeighbors } from './leagueRivals';
import type { H2HRow } from './pickers';
import { rankRivals, type CandidateProfile, type MeProfile, type RankedRival } from './rankRivals';
import type { ResultsMode, RivalKind, RivalSummary } from './types';

export interface RivalProfileRow {
  id: string;
  username: string | null;
  display_name: string | null;
  chosen_title: string | null;
  current_level: number | null;
  avatar_config: unknown;
  avatar_image: string | null;
  country_code?: string | null;
  language?: string | null;
  last_seen_at?: string | null;
}

export type DailyBoardRow = BoardRow;

export interface QuickGhost {
  userId: string;
  scorePct: number;
}

export interface WeeklyGhost {
  rivalId: string;
  rivalScore: number;
  playerScore: number;
}

export interface RivalDeps {
  h2hRows: (me: string) => Promise<H2HRow[]>;
  friendIds: (me: string) => Promise<string[]>;
  /** Accepted friends of these players (one hop out from mine). */
  friendsOf: (ids: string[]) => Promise<string[]>;
  coPlays: (me: string) => Promise<CoPlayRow[]>;
  profiles: (ids: string[]) => Promise<RivalProfileRow[]>;
  /** Ids never offered as a rival: students, players under parental consent, and anyone blocked either way. */
  excludedIds: (me: string | null, ids: string[]) => Promise<string[]>;
  dailyBoard: (date: string, lang: string, caller: string | null) => Promise<DailyBoardRow[]>;
  quickPlayGhosts: (subMode: string, me: string | null, lang: string, myPct: number) => Promise<QuickGhost[]>;
  league: (me: string) => Promise<LeagueNeighbors>;
  weeklyGhost: (me: string) => Promise<WeeklyGhost | null>;
  latestPing: (me: string, them: string) => Promise<string | null>;
  onError?: (source: string, err: unknown) => void;
}

export interface RivalContext {
  mode: ResultsMode;
  userId: string | null;
  guestFp?: string | null;
  score?: number;
  previousBest?: number | null;
  opponentUserIds?: string[];
  date?: string;
  lang?: string;
  subMode?: string;
  now?: number;
}

/** A failing source drops its candidates; it never kills the rival. */
function safe<T>(deps: RivalDeps, source: string, work: (() => Promise<T>) | null, fallback: T): Promise<T> {
  if (!work) return Promise.resolve(fallback);
  return work().catch((err) => {
    deps.onError?.(source, err);
    return fallback;
  });
}

const SKILL_SOURCES: Record<ResultsMode, Array<'daily' | 'quickPlay' | 'league' | 'weekly'>> = {
  daily: ['daily'],
  quickPlay: ['quickPlay'],
  multiplayer: ['league', 'weekly'],
  blast: ['league', 'weekly'],
  tower: ['league', 'weekly'],
  single: ['league', 'weekly'],
  edu: [],
};

/** ONE rival: candidates from every source, scored on relation + skill + activity + balance. */
export async function resolveRival(deps: RivalDeps, ctx: RivalContext): Promise<RivalSummary | null> {
  if (ctx.mode === 'edu') return null;
  const me = ctx.userId;
  const skill = new Set(SKILL_SOURCES[ctx.mode]);
  const caller = me ? `u:${me}` : ctx.guestFp ? `g:${ctx.guestFp}` : null;

  const [board, ghosts, league, weekly, h2h, friendIds, coPlays] = await Promise.all([
    safe(deps, 'dailyBoard', skill.has('daily') && ctx.date ? () => deps.dailyBoard(ctx.date!, 'all', caller) : null, [] as DailyBoardRow[]),
    safe(deps, 'quickPlayGhosts', skill.has('quickPlay') && ctx.subMode && ctx.score != null
      ? () => deps.quickPlayGhosts(ctx.subMode!, me, ctx.lang ?? 'en', ctx.score!) : null, [] as QuickGhost[]),
    safe(deps, 'league', skill.has('league') && me ? () => deps.league(me) : null, null as LeagueNeighbors | null),
    safe(deps, 'weeklyGhost', skill.has('weekly') && me ? () => deps.weeklyGhost(me) : null, null as WeeklyGhost | null),
    safe(deps, 'h2h', me ? () => deps.h2hRows(me) : null, [] as H2HRow[]),
    safe(deps, 'friends', me ? () => deps.friendIds(me) : null, [] as string[]),
    safe(deps, 'coPlays', me ? () => deps.coPlays(me) : null, [] as CoPlayRow[]),
  ]);

  const { candidates, myScore } = collectCandidates({
    mode: ctx.mode, myUserId: me, myIdentity: caller, myScore: ctx.score, now: ctx.now,
    board, ghosts, league, weekly, h2h, friendIds, coPlays, opponentUserIds: ctx.opponentUserIds,
  });

  const ids = [...new Set(candidates.flatMap((c) => (c.userId ? [c.userId] : [])))];
  const [rows, excluded, fofIds] = await Promise.all([
    safe(deps, 'profiles', ids.length || me ? () => deps.profiles(me ? [me, ...ids] : ids) : null, [] as RivalProfileRow[]),
    safe(deps, 'excluded', ids.length ? () => deps.excludedIds(me, ids) : null, null as string[] | null),
    safe(deps, 'friendsOf', friendIds.length ? () => deps.friendsOf(friendIds.slice(0, 50)) : null, [] as string[]),
  ]);
  markFriendsOfFriends(candidates, fofIds, new Set(friendIds));

  // Unknown is not "allowed": if the minors/blocks check failed, only guest-only board rows can be picked.
  const excludedSet = new Set(excluded ?? ids);
  const profiles = new Map<string, CandidateProfile>();
  let meProfile: MeProfile | null = null;
  for (const p of rows) {
    if (p.id === me) {
      meProfile = { countryCode: p.country_code ?? null, language: p.language ?? null };
      continue;
    }
    const name = publicNameOrNull(p.display_name) ?? publicNameOrNull(p.username);
    if (!name) continue;
    profiles.set(p.id, {
      name,
      title: resolveDisplayTitle({ chosenTitle: p.chosen_title, level: p.current_level }),
      avatar: p.avatar_config ?? p.avatar_image ?? null,
      countryCode: p.country_code ?? null,
      language: p.language ?? null,
      lastSeenAt: p.last_seen_at ?? null,
      isStudent: excludedSet.has(p.id),
    });
  }

  const [top] = rankRivals({ mode: ctx.mode, candidates, profiles, me: meProfile, myUserId: me, myScore, now: ctx.now });
  if (top) return withPing(deps, me, toSummary(top));
  if (ctx.previousBest != null && ctx.previousBest > 0) {
    const s: RivalSummary = { kind: 'self', name: '', theirScore: ctx.previousBest };
    return ctx.score == null ? s : { ...s, myScore: ctx.score, gap: ctx.previousBest - ctx.score };
  }
  return null;
}

const SKILL_KIND: Record<'daily' | 'ghost' | 'league', RivalKind> = { daily: 'daily', ghost: 'ghost', league: 'league' };

function toSummary(r: RankedRival): RivalSummary {
  const c = r.candidate;
  const kind: RivalKind = c.skill ? SKILL_KIND[c.skill.source] : c.record ? 'h2h' : 'related';
  const out: RivalSummary = { kind, name: r.name, title: r.title, ...(r.userId ? { userId: r.userId } : {}) };
  if (r.avatar != null) out.avatar = r.avatar;
  if (c.skill && r.gap != null) Object.assign(out, { theirScore: c.skill.theirs, myScore: c.skill.theirs - r.gap, gap: r.gap });
  if (c.record) out.record = c.record;
  if (r.why) out.why = r.why.kind === 'sameCountry' && r.countryCode ? { ...r.why, country: r.countryCode } : r.why;
  return out;
}

async function withPing(deps: RivalDeps, me: string | null, rival: RivalSummary): Promise<RivalSummary> {
  if (!me || !rival.userId) return rival;
  try {
    return { ...rival, pingedMeAt: await deps.latestPing(me, rival.userId) };
  } catch {
    return { ...rival, pingedMeAt: null };
  }
}
