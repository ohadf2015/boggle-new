/**
 * Assembles the education admin dashboard from already-fetched, already-filtered rows.
 * Pure: the route does the IO and passes in only non-test rows.
 *
 * `rounds` is null while classroom_rounds is not live in prod. Every number that needs it
 * is then null, and health/dying rules fall back to what does exist, so a missing table
 * reads as "not measured" rather than "nobody is teaching".
 */

import {
  countInRange,
  dailySeries,
  funnelConversion,
  periodDelta,
  teacherHealth,
  windowRange,
  type FunnelStep,
  type PeriodDelta,
  type TeacherHealth,
  type WindowDays,
} from './eduMetrics';

const DAY_MS = 86_400_000;
const DYING_AFTER_DAYS = 14;

export interface EduDashboardInput {
  nowMs: number;
  windowDays: WindowDays;
  teachers: Array<{ id: string; name: string | null; last_seen_at: string | null }>;
  /** Non-test access requests that were approved. */
  approvals: Array<{ user_id: string | null; reviewed_at: string | null; trial_expires_at: string | null }>;
  /** Number of non-test access requests, any status — the top of the funnel. */
  requested: number;
  classrooms: Array<{ id: string; teacher_id: string | null; name: string | null }>;
  memberships: Array<{ classroom_id: string; student_id: string }>;
  rounds: Array<{
    classroom_id: string | null;
    teacher_id: string;
    game_mode: string;
    player_count: number;
    completed_at: string;
  }> | null;
  subscriptions: Array<{ user_id: string; status: string; created_at: string }>;
}

export interface KpiSet {
  activeTeachers: PeriodDelta;
  newTeachers: PeriodDelta;
  classesWithLiveGame: PeriodDelta | null;
  liveRounds: PeriodDelta | null;
  trialsStarted: PeriodDelta;
  trialsPaid: PeriodDelta;
}

/** Furthest funnel stage an approved teacher reached. Null for teachers never approved. */
export type TeacherStage = 'approved' | 'classroom' | 'student';

export interface TeacherRow {
  id: string;
  name: string | null;
  lastActiveAt: string | null;
  classes: number;
  students: number;
  roundsLast7d: number | null;
  health: TeacherHealth;
  stage: TeacherStage | null;
}

export interface EduVerdict {
  /** Funnel step where the biggest drop lands, e.g. 'student'. */
  stepKey: string;
  fromKey: string;
  fromCount: number;
  toCount: number;
  lost: number;
  /** Share of `fromCount` that reached `stepKey`. */
  pct: number | null;
  /** False when the leak is the application step: there is no approved cohort to rescue. */
  cohortAvailable: boolean;
  /** Teachers stuck at `fromKey`, most recently active first, capped for display. */
  rescue: TeacherRow[];
  rescueTotal: number;
}

export interface ClassRow {
  id: string;
  name: string | null;
  teacherId: string | null;
  students: number;
  lastRoundAt: string | null;
  roundsInWindow: number | null;
}

export interface ModeRow {
  mode: string;
  rounds: number;
  players: number;
}

export interface EduDashboard {
  windowDays: WindowDays;
  roundsAvailable: boolean;
  kpis: KpiSet;
  /** One value per day over the window, oldest first, keyed by KPI. Null where unmeasured. */
  sparklines: Record<'activeTeachers' | 'liveRounds', number[] | null>;
  teachers: TeacherRow[];
  classes: ClassRow[];
  dyingClasses: ClassRow[];
  modeMix: ModeRow[];
  funnel: FunnelStep[];
  verdict: EduVerdict | null;
}

const RESCUE_LIMIT = 8;

function toMs(ts: string | null): number | null {
  if (!ts) return null;
  const ms = Date.parse(ts);
  return Number.isNaN(ms) ? null : ms;
}

function distinctStudents(classIds: string[], memberships: EduDashboardInput['memberships']): number {
  const ids = new Set(classIds);
  return new Set(memberships.filter((m) => ids.has(m.classroom_id)).map((m) => m.student_id)).size;
}

export function buildEduDashboard(input: EduDashboardInput): EduDashboard {
  const { nowMs, windowDays, rounds, subscriptions } = input;
  const cur = windowRange(windowDays, nowMs);
  const countWin = (ts: Array<string | null>, prior: boolean) =>
    prior ? countInRange(ts, cur.priorStart, cur.priorEnd) : countInRange(ts, cur.start, cur.end);

  const lastActiveOf = new Map(input.teachers.map((t) => [t.id, t.last_seen_at]));
  const teacherTs = input.teachers.map((t) => t.last_seen_at);

  const classesByTeacher = new Map<string, string[]>();
  for (const c of input.classrooms) {
    if (!c.teacher_id) continue;
    classesByTeacher.set(c.teacher_id, [...(classesByTeacher.get(c.teacher_id) ?? []), c.id]);
  }

  const roundsWin = (prior: boolean) =>
    rounds === null
      ? null
      : countWin(rounds.map((r) => r.completed_at), prior);

  const trialUsers = new Set(
    input.approvals.filter((a) => a.user_id && a.trial_expires_at).map((a) => a.user_id as string),
  );
  const trialStarts = input.approvals
    .filter((a) => a.user_id && a.trial_expires_at)
    .map((a) => a.reviewed_at);
  const paidTs = subscriptions
    .filter((s) => s.status === 'active' && trialUsers.has(s.user_id))
    .map((s) => s.created_at);

  const classesWithRoundTs = (prior: boolean): number | null => {
    if (rounds === null) return null;
    const ids = new Set<string>();
    for (const r of rounds) {
      const ms = toMs(r.completed_at);
      if (!r.classroom_id || ms === null) continue;
      const inWin = prior
        ? ms > cur.priorStart && ms <= cur.priorEnd
        : ms > cur.start && ms <= cur.end;
      if (inWin) ids.add(r.classroom_id);
    }
    return ids.size;
  };

  const kpis: KpiSet = {
    activeTeachers: periodDelta(countWin(teacherTs, false), countWin(teacherTs, true)),
    newTeachers: periodDelta(
      countWin(input.approvals.map((a) => a.reviewed_at), false),
      countWin(input.approvals.map((a) => a.reviewed_at), true),
    ),
    classesWithLiveGame:
      rounds === null ? null : periodDelta(classesWithRoundTs(false) ?? 0, classesWithRoundTs(true) ?? 0),
    liveRounds:
      rounds === null ? null : periodDelta(roundsWin(false) ?? 0, roundsWin(true) ?? 0),
    trialsStarted: periodDelta(countWin(trialStarts, false), countWin(trialStarts, true)),
    trialsPaid: periodDelta(countWin(paidTs, false), countWin(paidTs, true)),
  };

  const roundsSevenDays = (teacherId: string) =>
    rounds === null
      ? null
      : rounds.filter(
          (r) =>
            r.teacher_id === teacherId &&
            (toMs(r.completed_at) ?? 0) > nowMs - 7 * DAY_MS,
        ).length;

  const approvedIds = [...new Set(input.approvals.map((a) => a.user_id).filter((id): id is string => !!id))];
  const stageOf = new Map<string, TeacherStage>();
  for (const id of approvedIds) {
    const classIds = classesByTeacher.get(id) ?? [];
    stageOf.set(
      id,
      distinctStudents(classIds, input.memberships) > 0
        ? 'student'
        : classIds.length > 0
          ? 'classroom'
          : 'approved',
    );
  }

  const teacherRow = (id: string, name: string | null, lastActiveAt: string | null): TeacherRow => {
    const classIds = classesByTeacher.get(id) ?? [];
    const roundsLast7d = roundsSevenDays(id);
    return {
      id,
      name,
      lastActiveAt,
      classes: classIds.length,
      students: distinctStudents(classIds, input.memberships),
      roundsLast7d,
      health: teacherHealth({ lastActiveMs: toMs(lastActiveAt), roundsLast7d, nowMs }),
      stage: stageOf.get(id) ?? null,
    };
  };

  const teachers: TeacherRow[] = input.teachers
    .map((t) => teacherRow(t.id, t.name, t.last_seen_at))
    .sort((a, b) => (toMs(b.lastActiveAt) ?? 0) - (toMs(a.lastActiveAt) ?? 0));

  const classes: ClassRow[] = input.classrooms.map((c) => {
    const classRounds = rounds?.filter((r) => r.classroom_id === c.id) ?? null;
    const lastRoundMs = classRounds
      ? Math.max(0, ...classRounds.map((r) => toMs(r.completed_at) ?? 0))
      : 0;
    return {
      id: c.id,
      name: c.name,
      teacherId: c.teacher_id,
      students: distinctStudents([c.id], input.memberships),
      lastRoundAt: classRounds && lastRoundMs > 0 ? new Date(lastRoundMs).toISOString() : null,
      roundsInWindow: classRounds
        ? classRounds.filter((r) => {
            const ms = toMs(r.completed_at);
            return ms !== null && ms > cur.start && ms <= cur.end;
          }).length
        : null,
    };
  });

  const dyingClasses =
    rounds === null
      ? []
      : classes.filter((c) => {
          if (c.students === 0) return false;
          const last = toMs(c.lastRoundAt);
          return last === null || nowMs - last > DYING_AFTER_DAYS * DAY_MS;
        });

  const modeTotals = new Map<string, ModeRow>();
  for (const r of rounds ?? []) {
    const ms = toMs(r.completed_at);
    if (ms === null || !(ms > cur.start && ms <= cur.end)) continue;
    const row = modeTotals.get(r.game_mode) ?? { mode: r.game_mode, rounds: 0, players: 0 };
    row.rounds += 1;
    row.players += r.player_count;
    modeTotals.set(r.game_mode, row);
  }
  const modeMix = [...modeTotals.values()].sort((a, b) => b.rounds - a.rounds || a.mode.localeCompare(b.mode));

  const stageCount = (min: TeacherStage) =>
    approvedIds.filter((id) => {
      const stage = stageOf.get(id);
      return stage !== undefined && STAGE_ORDER.indexOf(stage) >= STAGE_ORDER.indexOf(min);
    }).length;
  const funnel = funnelConversion([
    { key: 'requested', count: input.requested },
    { key: 'approved', count: approvedIds.length },
    { key: 'classroom', count: stageCount('classroom') },
    { key: 'student', count: stageCount('student') },
  ]);
  const verdict = buildVerdict(funnel, approvedIds, stageOf, teacherRow, input.teachers);

  return {
    windowDays,
    roundsAvailable: rounds !== null,
    kpis,
    sparklines: {
      activeTeachers: dailySeries(teacherTs, nowMs, windowDays),
      liveRounds: rounds === null ? null : dailySeries(rounds.map((r) => r.completed_at), nowMs, windowDays),
    },
    teachers,
    classes,
    dyingClasses,
    modeMix,
    funnel,
    verdict,
  };
}

const STAGE_ORDER: TeacherStage[] = ['approved', 'classroom', 'student'];

function buildVerdict(
  funnel: FunnelStep[],
  approvedIds: string[],
  stageOf: Map<string, TeacherStage>,
  teacherRow: (id: string, name: string | null, lastActiveAt: string | null) => TeacherRow,
  profiles: EduDashboardInput['teachers'],
): EduVerdict | null {
  const drop = funnel.findIndex((s) => s.isBiggestDrop);
  if (drop < 1 || funnel[0].count === 0) return null;

  const from = funnel[drop - 1];
  const to = funnel[drop];
  const cohortStage = from.key as TeacherStage;
  const cohortAvailable = STAGE_ORDER.includes(cohortStage);

  const nameOf = new Map(profiles.map((p) => [p.id, { name: p.name, last: p.last_seen_at }]));
  const cohort = cohortAvailable
    ? approvedIds
        .filter((id) => stageOf.get(id) === cohortStage)
        .map((id) => teacherRow(id, nameOf.get(id)?.name ?? null, nameOf.get(id)?.last ?? null))
        .sort(
          (a, b) =>
            (toMs(b.lastActiveAt) ?? -Infinity) - (toMs(a.lastActiveAt) ?? -Infinity) ||
            b.classes - a.classes,
        )
    : [];

  return {
    stepKey: to.key,
    fromKey: from.key,
    fromCount: from.count,
    toCount: to.count,
    lost: from.count - to.count,
    pct: to.pctOfPrev,
    cohortAvailable,
    rescue: cohort.slice(0, RESCUE_LIMIT),
    rescueTotal: cohort.length,
  };
}
