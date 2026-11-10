/**
 * Owner-facing insights layered on the same rows as buildEduDashboard: how much is
 * taught and when, whether teachers come back, how big classes are, and where the Pro
 * trial pipeline stands. Pure; `rounds: null` (table missing) yields null sections.
 * Weekdays are UTC so the numbers do not depend on where the server runs.
 *
 * Rounds are parsed and split into the current and previous window once; every section
 * reads those two lists (and the shared per-teacher counts) instead of rescanning.
 */

import { DAY_MS, toMs, windowRange, type WindowDays } from './eduMetrics';
import { momentum, trailingZeros } from './seriesStats';

const SOON_DAYS = 7;
const FADE_MIN_PRIOR_ROUNDS = 3;

interface Round {
  classroom_id: string | null;
  teacher_id: string;
  game_mode: string;
  player_count: number;
  completed_at: string;
}

/** A round with its timestamp parsed once. */
interface Hit {
  r: Round;
  ms: number;
}

export interface EduInsightsInput {
  nowMs: number;
  windowDays: WindowDays;
  rounds: Round[] | null;
  classes: Array<{ id: string; students: number }>;
  approvals: Array<{ user_id: string | null; reviewed_at: string | null; trial_expires_at: string | null }>;
  subscriptions: Array<{ user_id: string; status: string; created_at: string }>;
}

export interface ModeInsight {
  mode: string;
  /** Games in the window and in the period before it. */
  rounds: number;
  priorRounds: number;
  /** Teachers who ran the mode in the window. */
  teachers: number;
  avgPlayers: number;
  /** Teachers who ran the mode exactly once in the window. */
  oneAndDone: number;
}

export interface UsageInsight {
  rounds: number;
  players: number;
  avgPlayersPerRound: number | null;
  /** Players per day over the window, oldest first. */
  dailyPlayers: number[];
  /** Rounds per UTC weekday, index 0 = Sunday. */
  byWeekday: number[];
  peakWeekday: number | null;
  /** Per-mode health, most played first. */
  modes: ModeInsight[];
  /** Games per day over the window, oldest first. */
  dailyRounds: number[];
  /** Trailing days (up to the window) with no game at all: a long run may mean an outage or lost tracking. */
  quietDays: number;
  /** Players per day over the last 3 days vs the earlier days of the window. Null when there is no baseline. */
  momentumPct: number | null;
  /** Still teaching, but at most half the games of the previous period. */
  fadingIds: string[];
  /** The top teacher's percent of all games in the window. */
  topTeacherShare: number | null;
  topTeachers: Array<{ teacherId: string; rounds: number; players: number }>;
}

export interface RetentionInsight {
  priorTeachers: number;
  returned: number;
  /** Share of last period's teaching teachers who taught again. */
  pct: number | null;
  newlyTeaching: number;
  /** Taught last period, silent this one. */
  lostIds: string[];
}

export interface ClassSizeInsight {
  buckets: Array<{ key: 'empty' | '1-9' | '10-19' | '20-29' | '30+'; count: number }>;
  avgStudents: number | null;
}

export interface ProInsight {
  trialsActive: string[];
  expiringSoon: string[];
  lapsedUnpaid: string[];
  paying: number;
  conversionPct: number | null;
}

export interface EduInsights {
  usage: UsageInsight | null;
  retention: RetentionInsight | null;
  classSizes: ClassSizeInsight;
  pro: ProInsight;
}

function splitWindows(rounds: Round[], nowMs: number, windowDays: WindowDays): { cur: Hit[]; prior: Hit[] } {
  const w = windowRange(windowDays, nowMs);
  const cur: Hit[] = [];
  const prior: Hit[] = [];
  for (const r of rounds) {
    const ms = toMs(r.completed_at);
    if (ms === null) continue;
    if (ms > w.start && ms <= w.end) cur.push({ r, ms });
    else if (ms > w.priorStart && ms <= w.priorEnd) prior.push({ r, ms });
  }
  return { cur, prior };
}

function teacherCounts(hits: Hit[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const { r } of hits) counts.set(r.teacher_id, (counts.get(r.teacher_id) ?? 0) + 1);
  return counts;
}

function modeHealth(cur: Hit[], prior: Hit[]): ModeInsight[] {
  const priorByMode = new Map<string, number>();
  for (const { r } of prior) priorByMode.set(r.game_mode, (priorByMode.get(r.game_mode) ?? 0) + 1);
  const byMode = new Map<string, { rounds: number; players: number; perTeacher: Map<string, number> }>();
  for (const { r } of cur) {
    const row = byMode.get(r.game_mode) ?? { rounds: 0, players: 0, perTeacher: new Map() };
    row.rounds += 1;
    row.players += r.player_count;
    row.perTeacher.set(r.teacher_id, (row.perTeacher.get(r.teacher_id) ?? 0) + 1);
    byMode.set(r.game_mode, row);
  }
  return [...byMode]
    .sort(([an, a], [bn, b]) => b.rounds - a.rounds || b.players - a.players || an.localeCompare(bn))
    .map(([mode, v]) => ({
      mode,
      rounds: v.rounds,
      priorRounds: priorByMode.get(mode) ?? 0,
      teachers: v.perTeacher.size,
      avgPlayers: Math.round((v.players / v.rounds) * 10) / 10,
      oneAndDone: [...v.perTeacher.values()].filter((n) => n === 1).length,
    }));
}

function buildUsage(
  cur: Hit[],
  prior: Hit[],
  curCounts: Map<string, number>,
  priorCounts: Map<string, number>,
  nowMs: number,
  windowDays: WindowDays,
): UsageInsight {
  const dailyPlayers = new Array<number>(windowDays).fill(0);
  const dailyRounds = new Array<number>(windowDays).fill(0);
  const byWeekday = new Array<number>(7).fill(0);
  const perTeacher = new Map<string, number>();
  let players = 0;
  for (const { r, ms } of cur) {
    players += r.player_count;
    const day = windowDays - 1 - Math.floor((nowMs - ms) / DAY_MS);
    if (day >= 0) {
      dailyPlayers[day] += r.player_count;
      dailyRounds[day] += 1;
    }
    byWeekday[new Date(ms).getUTCDay()] += 1;
    perTeacher.set(r.teacher_id, (perTeacher.get(r.teacher_id) ?? 0) + r.player_count);
  }
  const peak = Math.max(...byWeekday);
  const topTeachers = [...curCounts]
    .map(([teacherId, rounds]) => ({ teacherId, rounds, players: perTeacher.get(teacherId) ?? 0 }))
    .sort((a, b) => b.rounds - a.rounds || b.players - a.players || a.teacherId.localeCompare(b.teacherId))
    .slice(0, 5);
  return {
    rounds: cur.length,
    players,
    avgPlayersPerRound: cur.length === 0 ? null : Math.round((players / cur.length) * 10) / 10,
    dailyPlayers,
    byWeekday,
    peakWeekday: peak === 0 ? null : byWeekday.indexOf(peak),
    modes: modeHealth(cur, prior),
    dailyRounds,
    quietDays: trailingZeros(dailyRounds),
    momentumPct: momentum(dailyPlayers),
    fadingIds: [...priorCounts]
      .filter(([id, n]) => n >= FADE_MIN_PRIOR_ROUNDS && (curCounts.get(id) ?? 0) > 0 && (curCounts.get(id) ?? 0) * 2 <= n)
      .map(([id]) => id),
    topTeacherShare: cur.length === 0 ? null : Math.round((topTeachers[0].rounds / cur.length) * 100),
    topTeachers,
  };
}

function buildRetention(curCounts: Map<string, number>, priorCounts: Map<string, number>): RetentionInsight {
  const returned = [...priorCounts.keys()].filter((id) => curCounts.has(id)).length;
  return {
    priorTeachers: priorCounts.size,
    returned,
    pct: priorCounts.size === 0 ? null : Math.round((returned / priorCounts.size) * 100),
    newlyTeaching: [...curCounts.keys()].filter((id) => !priorCounts.has(id)).length,
    lostIds: [...priorCounts.keys()].filter((id) => !curCounts.has(id)),
  };
}

function buildClassSizes(classes: EduInsightsInput['classes']): ClassSizeInsight {
  const counts = { empty: 0, '1-9': 0, '10-19': 0, '20-29': 0, '30+': 0 };
  let populated = 0;
  let students = 0;
  for (const c of classes) {
    counts[c.students === 0 ? 'empty' : c.students < 10 ? '1-9' : c.students < 20 ? '10-19' : c.students < 30 ? '20-29' : '30+'] += 1;
    if (c.students > 0) {
      populated += 1;
      students += c.students;
    }
  }
  return {
    buckets: (Object.keys(counts) as Array<keyof typeof counts>).map((key) => ({ key, count: counts[key] })),
    avgStudents: populated === 0 ? null : Math.round(students / populated),
  };
}

function buildPro(input: EduInsightsInput): ProInsight {
  const { nowMs } = input;
  const payingIds = new Set(input.subscriptions.filter((s) => s.status === 'active').map((s) => s.user_id));
  const trials = new Map<string, number>();
  for (const a of input.approvals) {
    const exp = toMs(a.trial_expires_at);
    if (a.user_id && exp !== null) trials.set(a.user_id, exp);
  }
  const trialsActive: string[] = [];
  const expiringSoon: string[] = [];
  const lapsedUnpaid: string[] = [];
  let concluded = 0;
  let paidOfConcluded = 0;
  for (const [id, exp] of trials) {
    const paid = payingIds.has(id);
    if (exp <= nowMs || paid) {
      concluded += 1;
      if (paid) paidOfConcluded += 1;
    }
    if (paid) continue;
    if (exp <= nowMs) lapsedUnpaid.push(id);
    else {
      trialsActive.push(id);
      if (exp <= nowMs + SOON_DAYS * DAY_MS) expiringSoon.push(id);
    }
  }
  return {
    trialsActive,
    expiringSoon,
    lapsedUnpaid,
    paying: payingIds.size,
    conversionPct: concluded === 0 ? null : Math.round((paidOfConcluded / concluded) * 100),
  };
}

export function buildEduInsights(input: EduInsightsInput): EduInsights {
  const { rounds, nowMs, windowDays } = input;
  let usage: UsageInsight | null = null;
  let retention: RetentionInsight | null = null;
  if (rounds !== null) {
    const { cur, prior } = splitWindows(rounds, nowMs, windowDays);
    const curCounts = teacherCounts(cur);
    const priorCounts = teacherCounts(prior);
    usage = buildUsage(cur, prior, curCounts, priorCounts, nowMs, windowDays);
    retention = buildRetention(curCounts, priorCounts);
  }
  return { usage, retention, classSizes: buildClassSizes(input.classes), pro: buildPro(input) };
}
