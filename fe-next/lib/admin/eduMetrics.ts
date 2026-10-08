/**
 * Pure education KPI maths for the admin dashboard. No IO: the route feeds timestamps
 * and counts in, so every number here is testable without a database.
 */

const DAY_MS = 86_400_000;

export type WindowDays = 7 | 30 | 90;

export interface WindowRange {
  start: number;
  end: number;
  priorStart: number;
  priorEnd: number;
}

export function windowRange(days: WindowDays, nowMs: number): WindowRange {
  const span = days * DAY_MS;
  return {
    start: nowMs - span,
    end: nowMs,
    priorStart: nowMs - 2 * span,
    priorEnd: nowMs - span,
  };
}

function toMs(ts: string | null | undefined): number | null {
  if (!ts) return null;
  const ms = Date.parse(ts);
  return Number.isNaN(ms) ? null : ms;
}

export function countInRange(
  timestamps: Array<string | null | undefined>,
  start: number,
  end: number,
): number {
  let n = 0;
  for (const ts of timestamps) {
    const ms = toMs(ts);
    if (ms !== null && ms > start && ms <= end) n += 1;
  }
  return n;
}

export interface PeriodDelta {
  current: number;
  prior: number;
  /** Null when the prior period is zero: a percent of zero is undefined, not infinite. */
  pct: number | null;
}

export function periodDelta(current: number, prior: number): PeriodDelta {
  const pct = prior === 0 ? null : Math.round(((current - prior) / prior) * 1000) / 10;
  return { current, prior, pct };
}

/** Counts per day for the last `days` days, oldest first, ending on the day of `nowMs`. */
/** Per day, how many distinct keys (e.g. classrooms) had at least one event. */
export function dailyDistinct(
  events: Array<{ key: string; ts: string | null | undefined }>,
  nowMs: number,
  days: number,
): number[] {
  const perDay = Array.from({ length: days }, () => new Set<string>());
  for (const { key, ts } of events) {
    const ms = toMs(ts);
    if (ms === null || ms > nowMs) continue;
    const ageDays = Math.floor((nowMs - ms) / DAY_MS);
    if (ageDays < days) perDay[days - 1 - ageDays].add(key);
  }
  return perDay.map((set) => set.size);
}

export function dailySeries(
  timestamps: Array<string | null | undefined>,
  nowMs: number,
  days: number,
): number[] {
  const buckets = new Array<number>(days).fill(0);
  for (const ts of timestamps) {
    const ms = toMs(ts);
    if (ms === null || ms > nowMs) continue;
    const ageDays = Math.floor((nowMs - ms) / DAY_MS);
    if (ageDays < days) buckets[days - 1 - ageDays] += 1;
  }
  return buckets;
}

export type TeacherHealth = 'thriving' | 'at_risk' | 'dormant';

/**
 * `roundsLast7d` is null while the classroom_rounds source is not live. Health then rests
 * on last activity alone, rather than reading every teacher as dormant.
 */
export function teacherHealth(input: {
  lastActiveMs: number | null;
  roundsLast7d: number | null;
  nowMs: number;
}): TeacherHealth {
  const { lastActiveMs, roundsLast7d, nowMs } = input;
  if (lastActiveMs === null) return 'dormant';
  const ageDays = (nowMs - lastActiveMs) / DAY_MS;
  if (ageDays <= 7) {
    if (roundsLast7d === null || roundsLast7d > 0) return 'thriving';
    return 'at_risk';
  }
  if (ageDays <= 21) return 'at_risk';
  return 'dormant';
}

export interface FunnelInputStep {
  key: string;
  count: number;
}

export interface FunnelStep extends FunnelInputStep {
  /** Conversion from the previous step. Null for the first step or when the previous count is zero. */
  pctOfPrev: number | null;
  isBiggestDrop: boolean;
}

export function funnelConversion(steps: FunnelInputStep[]): FunnelStep[] {
  const pcts = steps.map((s, i) => {
    if (i === 0) return null;
    const prev = steps[i - 1].count;
    return prev === 0 ? null : Math.round((s.count / prev) * 1000) / 10;
  });
  let worst = -1;
  let worstPct = Infinity;
  pcts.forEach((p, i) => {
    if (p !== null && p < worstPct) {
      worstPct = p;
      worst = i;
    }
  });
  return steps.map((s, i) => ({
    ...s,
    pctOfPrev: pcts[i],
    isBiggestDrop: i === worst,
  }));
}
