/**
 * Assembles the education admin dashboard from already-fetched, already-filtered rows.
 * Pure: the route does the IO and passes in only non-test rows.
 *
 * `rounds` is null while classroom_rounds is not live in prod. Every number that needs it
 * is then null, and health/dying rules fall back to what does exist, so a missing table
 * reads as "not measured" rather than "nobody is teaching".
 *
 * Every KPI and funnel step ships the ids behind it (`drill`), so a click on a number
 * lists exactly the teachers or classes it counted.
 */

import { buildAttention, type AttentionList } from './eduAttention';
import {
  countInRange,
  dailyDistinct,
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
  /** Non-test profiles with the teacher role. */
  teachers: Array<{ id: string; name: string | null; last_seen_at: string | null }>;
  /** Non-test access requests that were approved, one per person. */
  approvals: Array<{
    user_id: string | null;
    reviewed_at: string | null;
    trial_expires_at: string | null;
    email?: string | null;
  }>;
  /** Number of non-test people who applied, any status — the top of the funnel. */
  requested: number;
  classrooms: Array<{ id: string; teacher_id: string | null; name: string | null; join_code?: string | null }>;
  memberships: Array<{ classroom_id: string; student_id: string }>;
  /** Owner outreach log. Null when admin_edu_outreach is not migrated in this database. */
  outreach?: Array<{ teacher_id: string; channel: string; created_at: string }> | null;
  rounds: Array<{
    classroom_id: string | null;
    teacher_id: string;
    game_mode: string;
    player_count: number;
    completed_at: string;
  }> | null;
  /** Paid Pro subscriptions, earliest per user. */
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

/** Where an approved teacher stopped. Null for teachers never approved. */
export type TeacherStage = 'locked_out' | 'no_class' | 'no_students' | 'has_students';

export interface TeacherRow {
  id: string;
  name: string | null;
  email: string | null;
  lastActiveAt: string | null;
  /** False when an approved person never got the teacher role, so /teacher bounces them. */
  canSignIn: boolean;
  classes: number;
  students: number;
  roundsLast7d: number | null;
  health: TeacherHealth;
  stage: TeacherStage | null;
  trialExpiresAt: string | null;
  paying: boolean;
  joinCode: string | null;
  lastOutreachAt: string | null;
}

export type SparkKey = keyof KpiSet;
export type FunnelKey = 'requested' | 'approved' | 'signin' | 'classroom' | 'student';

export interface EduVerdict {
  /** Funnel step where the biggest drop lands, e.g. 'student'. */
  stepKey: string;
  fromKey: string;
  fromCount: number;
  toCount: number;
  lost: number;
  /** Share of `fromCount` that reached `stepKey`. */
  pct: number | null;
  /** False when the drop is the application step: there is no approved cohort to list. */
  cohortAvailable: boolean;
}

export interface ClassRow {
  id: string;
  name: string | null;
  teacherId: string | null;
  teacherName: string | null;
  students: number;
  lastRoundAt: string | null;
  roundsInWindow: number | null;
}

export interface ModeRow {
  mode: string;
  rounds: number;
  players: number;
}

export interface DrillTarget {
  kind: 'teachers' | 'classes';
  ids: string[];
}

export interface EduDrill {
  /** Ids counted by each KPI's current-window value. Null where the KPI is unmeasured. */
  kpi: Record<SparkKey, DrillTarget | null>;
  /** Teachers who reached each step but not the next one. `requested` is pending applicants, not listed here. */
  funnel: Record<FunnelKey, string[]>;
}

export interface EduDashboard {
  windowDays: WindowDays;
  roundsAvailable: boolean;
  outreachAvailable: boolean;
  kpis: KpiSet;
  /** One value per day over the window, oldest first, keyed by KPI. Null where unmeasured. */
  sparklines: Record<SparkKey, number[] | null>;
  teachers: TeacherRow[];
  classes: ClassRow[];
  dyingClasses: ClassRow[];
  modeMix: ModeRow[];
  funnel: FunnelStep[];
  verdict: EduVerdict | null;
  drill: EduDrill;
  attention: AttentionList;
}

function toMs(ts: string | null | undefined): number | null {
  if (!ts) return null;
  const ms = Date.parse(ts);
  return Number.isNaN(ms) ? null : ms;
}

function distinctStudents(classIds: string[], memberships: EduDashboardInput['memberships']): number {
  const ids = new Set(classIds);
  return new Set(memberships.filter((m) => ids.has(m.classroom_id)).map((m) => m.student_id)).size;
}

const uniq = (ids: Array<string | null | undefined>) => [...new Set(ids.filter((id): id is string => !!id))];

export function buildEduDashboard(input: EduDashboardInput): EduDashboard {
  const { nowMs, windowDays, rounds, subscriptions } = input;
  const cur = windowRange(windowDays, nowMs);
  const inWin = (ts: string | null | undefined, prior = false) => {
    const ms = toMs(ts);
    if (ms === null) return false;
    return prior ? ms > cur.priorStart && ms <= cur.priorEnd : ms > cur.start && ms <= cur.end;
  };
  const countWin = (ts: Array<string | null>, prior: boolean) =>
    prior ? countInRange(ts, cur.priorStart, cur.priorEnd) : countInRange(ts, cur.start, cur.end);

  const classesByTeacher = new Map<string, string[]>();
  for (const c of input.classrooms) {
    if (!c.teacher_id) continue;
    classesByTeacher.set(c.teacher_id, [...(classesByTeacher.get(c.teacher_id) ?? []), c.id]);
  }

  const trialApprovals = input.approvals.filter((a) => a.user_id && a.trial_expires_at);
  const trialUsers = new Set(trialApprovals.map((a) => a.user_id as string));
  const trialStarts = trialApprovals.map((a) => a.reviewed_at);
  const paidTrials = subscriptions.filter((s) => s.status === 'active' && trialUsers.has(s.user_id));
  const paidTs = paidTrials.map((s) => s.created_at);
  const payingIds = new Set(subscriptions.filter((s) => s.status === 'active').map((s) => s.user_id));

  const classesWithRound = (prior: boolean) =>
    uniq((rounds ?? []).filter((r) => inWin(r.completed_at, prior)).map((r) => r.classroom_id));

  const approvalOf = new Map<string, EduDashboardInput['approvals'][number]>();
  for (const a of input.approvals) if (a.user_id) approvalOf.set(a.user_id, a);
  const joinCodeOf = new Map<string, string>();
  for (const c of input.classrooms) {
    if (c.teacher_id && c.join_code && !joinCodeOf.has(c.teacher_id)) joinCodeOf.set(c.teacher_id, c.join_code);
  }
  const lastOutreachOf = new Map<string, string>();
  for (const o of input.outreach ?? []) {
    const prev = lastOutreachOf.get(o.teacher_id);
    if (!prev || (toMs(o.created_at) ?? 0) > (toMs(prev) ?? 0)) lastOutreachOf.set(o.teacher_id, o.created_at);
  }

  const teacherTs = input.teachers.map((t) => t.last_seen_at);
  const kpis: KpiSet = {
    // profiles keep only the last visit, so a prior-window count would miss everyone active in both windows.
    activeTeachers: { current: countWin(teacherTs, false), prior: 0, pct: null },
    newTeachers: periodDelta(
      countWin(input.approvals.map((a) => a.reviewed_at), false),
      countWin(input.approvals.map((a) => a.reviewed_at), true),
    ),
    classesWithLiveGame:
      rounds === null ? null : periodDelta(classesWithRound(false).length, classesWithRound(true).length),
    liveRounds:
      rounds === null
        ? null
        : periodDelta(countWin(rounds.map((r) => r.completed_at), false), countWin(rounds.map((r) => r.completed_at), true)),
    trialsStarted: periodDelta(countWin(trialStarts, false), countWin(trialStarts, true)),
    trialsPaid: periodDelta(countWin(paidTs, false), countWin(paidTs, true)),
  };

  const teacherIds = new Set(input.teachers.map((t) => t.id));
  const approvedIds = uniq(input.approvals.map((a) => a.user_id));
  const stageOf = new Map<string, TeacherStage>();
  for (const id of approvedIds) {
    const classIds = classesByTeacher.get(id) ?? [];
    stageOf.set(
      id,
      distinctStudents(classIds, input.memberships) > 0
        ? 'has_students'
        : classIds.length > 0
          ? 'no_students'
          : teacherIds.has(id)
            ? 'no_class'
            : 'locked_out',
    );
  }

  const roundsSevenDays = (teacherId: string) =>
    rounds === null
      ? null
      : rounds.filter((r) => r.teacher_id === teacherId && (toMs(r.completed_at) ?? 0) > nowMs - 7 * DAY_MS).length;

  const teacherRow = (id: string, name: string | null, lastActiveAt: string | null): TeacherRow => {
    const classIds = classesByTeacher.get(id) ?? [];
    const roundsLast7d = roundsSevenDays(id);
    const approval = approvalOf.get(id);
    return {
      id,
      name,
      email: approval?.email ?? null,
      lastActiveAt,
      canSignIn: teacherIds.has(id),
      classes: classIds.length,
      students: distinctStudents(classIds, input.memberships),
      roundsLast7d,
      health: teacherHealth({ lastActiveMs: toMs(lastActiveAt), roundsLast7d, nowMs }),
      stage: stageOf.get(id) ?? null,
      trialExpiresAt: approval?.trial_expires_at ?? null,
      paying: payingIds.has(id),
      joinCode: joinCodeOf.get(id) ?? null,
      lastOutreachAt: lastOutreachOf.get(id) ?? null,
    };
  };

  const teachers: TeacherRow[] = [
    ...input.teachers.map((t) => teacherRow(t.id, t.name, t.last_seen_at)),
    ...approvedIds.filter((id) => !teacherIds.has(id)).map((id) => teacherRow(id, null, null)),
  ].sort((a, b) => (toMs(b.lastActiveAt) ?? 0) - (toMs(a.lastActiveAt) ?? 0));
  const nameOf = new Map(teachers.map((t) => [t.id, t.name ?? t.email]));

  const classes: ClassRow[] = input.classrooms.map((c) => {
    const classRounds = rounds?.filter((r) => r.classroom_id === c.id) ?? null;
    const lastRoundMs = classRounds ? Math.max(0, ...classRounds.map((r) => toMs(r.completed_at) ?? 0)) : 0;
    return {
      id: c.id,
      name: c.name,
      teacherId: c.teacher_id,
      teacherName: c.teacher_id ? (nameOf.get(c.teacher_id) ?? null) : null,
      students: distinctStudents([c.id], input.memberships),
      lastRoundAt: classRounds && lastRoundMs > 0 ? new Date(lastRoundMs).toISOString() : null,
      roundsInWindow: classRounds ? classRounds.filter((r) => inWin(r.completed_at)).length : null,
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
    if (!inWin(r.completed_at)) continue;
    const row = modeTotals.get(r.game_mode) ?? { mode: r.game_mode, rounds: 0, players: 0 };
    row.rounds += 1;
    row.players += r.player_count;
    modeTotals.set(r.game_mode, row);
  }
  const modeMix = [...modeTotals.values()].sort((a, b) => b.rounds - a.rounds || a.mode.localeCompare(b.mode));

  const atStage = (stage: TeacherStage) => approvedIds.filter((id) => stageOf.get(id) === stage);
  const stuck: Record<FunnelKey, string[]> = {
    requested: [],
    approved: atStage('locked_out'),
    signin: atStage('no_class'),
    classroom: atStage('no_students'),
    student: atStage('has_students'),
  };
  const reached = (from: number) =>
    (['locked_out', 'no_class', 'no_students', 'has_students'] as TeacherStage[])
      .slice(from)
      .reduce((n, stage) => n + atStage(stage).length, 0);
  const funnel = funnelConversion([
    { key: 'requested', count: input.requested },
    { key: 'approved', count: reached(0) },
    { key: 'signin', count: reached(1) },
    { key: 'classroom', count: reached(2) },
    { key: 'student', count: reached(3) },
  ]);

  const recentFirst = (ids: string[]) => {
    const rank = new Map(teachers.map((t, i) => [t.id, i]));
    return [...ids].sort((a, b) => (rank.get(a) ?? 0) - (rank.get(b) ?? 0));
  };
  const teachersOf = (ids: Array<string | null | undefined>): DrillTarget => ({ kind: 'teachers', ids: recentFirst(uniq(ids)) });
  const drill: EduDrill = {
    kpi: {
      activeTeachers: teachersOf(input.teachers.filter((t) => inWin(t.last_seen_at)).map((t) => t.id)),
      newTeachers: teachersOf(input.approvals.filter((a) => inWin(a.reviewed_at)).map((a) => a.user_id)),
      trialsStarted: teachersOf(trialApprovals.filter((a) => inWin(a.reviewed_at)).map((a) => a.user_id)),
      trialsPaid: teachersOf(paidTrials.filter((s) => inWin(s.created_at)).map((s) => s.user_id)),
      liveRounds: rounds === null ? null : teachersOf(rounds.filter((r) => inWin(r.completed_at)).map((r) => r.teacher_id)),
      classesWithLiveGame: rounds === null ? null : { kind: 'classes', ids: classesWithRound(false) },
    },
    funnel: Object.fromEntries(Object.entries(stuck).map(([k, ids]) => [k, recentFirst(ids)])) as Record<FunnelKey, string[]>,
  };

  return {
    windowDays,
    roundsAvailable: rounds !== null,
    outreachAvailable: input.outreach != null,
    kpis,
    sparklines: {
      activeTeachers: null,
      newTeachers: dailySeries(input.approvals.map((a) => a.reviewed_at), nowMs, windowDays),
      classesWithLiveGame:
        rounds === null
          ? null
          : dailyDistinct(
              rounds.map((r) => ({ key: r.classroom_id ?? '', ts: r.completed_at })).filter((e) => e.key !== ''),
              nowMs,
              windowDays,
            ),
      liveRounds: rounds === null ? null : dailySeries(rounds.map((r) => r.completed_at), nowMs, windowDays),
      trialsStarted: dailySeries(trialStarts, nowMs, windowDays),
      trialsPaid: dailySeries(paidTs, nowMs, windowDays),
    },
    teachers,
    classes,
    dyingClasses,
    modeMix,
    funnel,
    verdict: buildVerdict(funnel),
    drill,
    attention: buildAttention({ teachers, dyingClasses, roundsAvailable: rounds !== null, nowMs }),
  };
}

function buildVerdict(funnel: FunnelStep[]): EduVerdict | null {
  const drop = funnel.findIndex((s) => s.isBiggestDrop);
  if (drop < 1 || funnel[0].count === 0) return null;
  const from = funnel[drop - 1];
  const to = funnel[drop];
  return {
    stepKey: to.key,
    fromKey: from.key,
    fromCount: from.count,
    toCount: to.count,
    lost: from.count - to.count,
    pct: to.pctOfPrev,
    cohortAvailable: from.key !== 'requested',
  };
}
