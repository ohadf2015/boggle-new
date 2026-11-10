/**
 * "What is working, what is not": turns the dashboard numbers into a short ranked list of
 * findings. Pure rules with fixed thresholds; every finding carries the ids behind it so a
 * click lists exactly those teachers or classes. Copy lives in the UI, keyed by `id`.
 */

import type { EduVerdict } from './eduDashboard';
import type { EduInsights } from './eduInsights';
import type { PeriodDelta } from './eduMetrics';

/** `early` = a leading indicator: not yet a problem in the numbers, but where one starts. */
export type FindingTone = 'problem' | 'early' | 'win' | 'fact';

export interface Finding {
  id: string;
  tone: FindingTone;
  params: Record<string, string | number>;
  drill?: { kind: 'teachers' | 'classes'; ids: string[] };
}

export interface FindingsInput {
  roundsAvailable: boolean;
  kpis: { liveRounds: PeriodDelta | null; newTeachers: PeriodDelta };
  verdict: EduVerdict | null;
  /** Teacher ids stopped at each funnel step, keyed by step. */
  funnelStuck: Partial<Record<string, string[]>>;
  teachers: Array<{
    id: string;
    health: 'thriving' | 'at_risk' | 'dormant';
    students: number;
    roundsLast7d: number | null;
    trialExpiresAt: string | null;
  }>;
  classes: Array<{ id: string; students: number }>;
  dyingClasses: Array<{ id: string; students: number }>;
  insights: EduInsights;
}

const ORDER: Record<FindingTone, number> = { problem: 0, early: 1, win: 2, fact: 3 };
const SURGE_PCT = 20;
const GOOD_RETENTION = 60;
const LOW_RETENTION = 40;
const GOOD_CONVERSION = 30;
const LOW_CONVERSION = 15;
const MIN_TEACHERS_TO_JUDGE = 5;
const MIN_CLASSES_TO_JUDGE = 4;
const SMALL_GAME = 5;
const MIN_ROUNDS_FOR_SMALL_GAMES = 3;
const NEW_TEACHERS_SURGE_PCT = 25;
const MIN_NEW_TEACHERS = 2;
const MAJORITY = 0.5;
const MIN_ROUNDS_TO_JUDGE = 10;
const QUIET_DAYS_ALERT = 2;
const MOMENTUM_DROP_PCT = 50;
const DEPENDENCE_PCT = 60;
const MIN_MODE_TEACHERS = 3;
const SMALL_MODE_RATIO = 0.6;
const ONE_AND_DONE_SHARE = 0.6;
const MODE_FADE_MIN_PRIOR = 5;
const MAX_NAMED_MODES = 3;
const STUCK_STAGES: Array<[string, string]> = [
  ['approved', 'stuck_locked_out'],
  ['signin', 'stuck_no_class'],
  ['classroom', 'stuck_no_students'],
];

export function buildFindings(d: FindingsInput): Finding[] {
  const out: Finding[] = [];
  const { usage, retention, pro } = d.insights;

  const add = (id: string, tone: FindingTone, params: Finding['params'] = {}, drill?: Finding['drill']) =>
    out.push({ id, tone, params, drill });
  /** A finding about a list of teachers or classes: skipped when the list is empty. */
  const addList = (
    id: string,
    tone: FindingTone,
    kind: 'teachers' | 'classes',
    ids: string[],
    extra: Finding['params'] = {},
  ) => {
    if (ids.length > 0) add(id, tone, { count: ids.length, ...extra }, { kind, ids });
  };

  const rounds = d.roundsAvailable ? d.kpis.liveRounds : null;
  if (rounds && rounds.pct !== null) {
    if (rounds.pct >= SURGE_PCT && rounds.current > 0) add('rounds_up', 'win', { pct: rounds.pct, current: rounds.current });
    if (rounds.pct <= -SURGE_PCT) add('rounds_down', 'problem', { pct: Math.abs(rounds.pct), current: rounds.current, prior: rounds.prior });
  }

  const newT = d.kpis.newTeachers;
  if (newT.pct !== null && newT.pct >= NEW_TEACHERS_SURGE_PCT && newT.current >= MIN_NEW_TEACHERS) {
    add('new_teachers_up', 'win', { pct: newT.pct, current: newT.current });
  }

  if (retention && retention.pct !== null) {
    if (retention.pct >= GOOD_RETENTION) add('retention_good', 'win', { pct: retention.pct });
    if (retention.pct < LOW_RETENTION) {
      add('retention_low', 'problem', { pct: retention.pct, lost: retention.lostIds.length }, { kind: 'teachers', ids: retention.lostIds });
    }
  }

  const covered = d.verdict?.cohortAvailable ? d.verdict.fromKey : null;
  if (d.verdict) {
    const stuck = covered ? (d.funnelStuck[covered] ?? []) : [];
    add('funnel_drop', 'problem', { lost: d.verdict.lost, from: d.verdict.fromKey, to: d.verdict.stepKey }, stuck.length > 0 ? { kind: 'teachers', ids: stuck } : undefined);
  }
  for (const [step, id] of STUCK_STAGES) {
    if (step !== covered) addList(id, 'problem', 'teachers', d.funnelStuck[step] ?? []);
  }

  const soon = new Set(pro.expiringSoon);
  const thriving: string[] = [];
  const dormant: string[] = [];
  const atRisk: string[] = [];
  const idleTrial: string[] = [];
  for (const t of d.teachers) {
    if (t.health === 'thriving') thriving.push(t.id);
    else if (t.health === 'dormant') dormant.push(t.id);
    else if (t.students > 0) atRisk.push(t.id);
    if (soon.has(t.id) && t.roundsLast7d === 0) idleTrial.push(t.id);
  }
  addList('thriving', 'win', 'teachers', thriving);
  if (d.teachers.length >= MIN_TEACHERS_TO_JUDGE && dormant.length / d.teachers.length >= MAJORITY) {
    addList('dormant_many', 'problem', 'teachers', dormant, { total: d.teachers.length });
  }

  addList('trials_expiring', 'early', 'teachers', pro.expiringSoon);
  addList('trials_lapsed', 'problem', 'teachers', pro.lapsedUnpaid);
  if (pro.conversionPct !== null) {
    if (pro.conversionPct >= GOOD_CONVERSION) add('conversion_good', 'win', { pct: pro.conversionPct });
    if (pro.conversionPct < LOW_CONVERSION) add('conversion_low', 'problem', { pct: pro.conversionPct });
  }

  addList('classes_dying', 'problem', 'classes', d.dyingClasses.map((c) => c.id));
  const empty = d.classes.filter((c) => c.students === 0);
  if (d.classes.length >= MIN_CLASSES_TO_JUDGE && empty.length / d.classes.length >= MAJORITY) {
    addList('empty_classes', 'problem', 'classes', empty.map((c) => c.id), { total: d.classes.length });
  }

  addList('at_risk_with_students', 'early', 'teachers', atRisk);
  addList('trial_idle', 'early', 'teachers', idleTrial);

  if (usage) {
    addList('teachers_fading', 'early', 'teachers', usage.fadingIds);
    if (usage.rounds >= MIN_ROUNDS_TO_JUDGE && usage.quietDays >= QUIET_DAYS_ALERT) {
      add('activity_stopped', 'early', { days: usage.quietDays });
    } else if (usage.momentumPct !== null && usage.momentumPct <= -MOMENTUM_DROP_PCT) {
      add('momentum_drop', 'early', { pct: Math.abs(usage.momentumPct) });
    }

    const top = usage.topTeachers[0];
    if (top && usage.rounds >= MIN_ROUNDS_TO_JUDGE && (usage.topTeacherShare ?? 0) >= DEPENDENCE_PCT) {
      add('one_teacher_carries', 'early', { pct: usage.topTeacherShare ?? 0, teacherId: top.teacherId });
    }

    const judged = usage.modes.filter((m) => m.teachers >= MIN_MODE_TEACHERS);
    const named = (list: typeof judged) => ({ modes: list.slice(0, MAX_NAMED_MODES).map((m) => m.mode).join(', '), count: list.length });
    const overall = usage.avgPlayersPerRound;
    const small = overall === null ? [] : judged.filter((m) => m.avgPlayers < overall * SMALL_MODE_RATIO);
    if (small.length > 0) add('mode_small', 'problem', { ...named(small), avg: small[0].avgPlayers, overall: overall ?? 0 });
    const oneAndDone = judged.filter((m) => m.oneAndDone / m.teachers >= ONE_AND_DONE_SHARE);
    if (oneAndDone.length > 0) add('mode_one_and_done', 'problem', named(oneAndDone));
    const losing = judged.filter((m) => m.priorRounds >= MODE_FADE_MIN_PRIOR && m.rounds * 2 <= m.priorRounds);
    if (losing.length > 0) add('mode_fading', 'early', named(losing));

    if (overall !== null && usage.rounds >= MIN_ROUNDS_FOR_SMALL_GAMES && overall < SMALL_GAME) add('small_games', 'problem', { avg: overall });

    const modeTotal = usage.modes.reduce((n, m) => n + m.rounds, 0);
    if (usage.modes.length >= 2 && modeTotal > 0) add('top_mode', 'fact', { mode: usage.modes[0].mode, pct: Math.round((usage.modes[0].rounds / modeTotal) * 100) });
    if (usage.peakWeekday !== null) add('peak_day', 'fact', { weekday: usage.peakWeekday });
    if (top) add('top_teacher', 'fact', { teacherId: top.teacherId, rounds: top.rounds, players: top.players });
  }

  return out.sort((a, b) => ORDER[a.tone] - ORDER[b.tone]);
}
