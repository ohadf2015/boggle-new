/**
 * Brain Check — the measurement half of Brain Drills.
 *
 * Training drills adapt their difficulty, so their scores can't be compared
 * across weeks. A Brain Check runs a drill under a FIXED protocol (same level
 * for everyone, forever) at most once per cooldown window, then asks one
 * question: has your performance changed by more than your own run-to-run
 * noise? (Reliable Change Index, Jacobson & Truax 1991.)
 *
 * What it does NOT claim: that gains on these word tasks transfer to general
 * cognition. The UI copy says so.
 *
 * @module shared/utils/brainCheck
 */
import type { DrillType } from '@/shared/types/cognitive';

/**
 * Fixed level per measured drill. NEVER change a level — it breaks every
 * existing trend. `unit` is the metric's measurement resolution at that level
 * (one word / one recalled word / one chain link / one rare gem): the noise
 * estimate is floored at it so a single-unit wobble can never be "reliable".
 */
// Levels chosen from prod data (2026-09-25: every drill run so far was level 1;
// Memory Hunt recall 44%, ~1 rare gem per run) — low levels avoid floor effects.
export const BRAIN_CHECK_PROTOCOL = {
  'lightning-round': { level: 1, unit: 1 }, // 60s round → 1 word = 1 wpm
  'memory-hunt': { level: 2, unit: 1 },     // words recalled over up to 5 rounds × 3
  'combo-master': { level: 1, unit: 1 },    // best chain, 8s link timeout
  'rare-gems': { level: 1, unit: 1 },       // rare gems found in 90s
} as const;

export type BrainCheckDrill = keyof typeof BRAIN_CHECK_PROTOCOL;
export const BRAIN_CHECK_DRILLS = Object.keys(BRAIN_CHECK_PROTOCOL) as BrainCheckDrill[];

export function isBrainCheckDrill(d: string): d is BrainCheckDrill {
  return Object.prototype.hasOwnProperty.call(BRAIN_CHECK_PROTOCOL, d);
}

/** One check per drill per 20h — spaced measures, not same-session practice. */
export const BRAIN_CHECK_COOLDOWN_MS = 20 * 60 * 60 * 1000;

export function isBrainCheckAvailable(lastCheckAtIso: string | null, now = Date.now()): boolean {
  if (!lastCheckAtIso) return true;
  const last = Date.parse(lastCheckAtIso);
  return !Number.isFinite(last) || now - last >= BRAIN_CHECK_COOLDOWN_MS;
}

export interface BrainCheckRow {
  score: number;
  duration_seconds: number;
  words_found: number;
  extra_data: Record<string, unknown> | null;
}

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** The single measured number per drill (higher = better). null = unusable row. */
export function brainCheckValue(drill: DrillType, row: BrainCheckRow): number | null {
  const extra = row.extra_data ?? {};
  switch (drill) {
    case 'lightning-round':
      return row.duration_seconds > 0 ? (row.words_found / row.duration_seconds) * 60 : null;
    case 'memory-hunt':
      // Words recalled across every round (words_found only covers the last round).
      return num(extra.recalled);
    case 'combo-master':
      return num(extra.maxCombo);
    case 'rare-gems':
      // Rare-gem COUNT, not score: score includes the random Lucky Gem doubling.
      return num(extra.rareWordsFound);
    default:
      return null;
  }
}

export interface BrainCheckPoint {
  value: number;
  at: string;
}

export type BrainCheckVerdict = 'need-more' | 'improved' | 'stable' | 'declined';

export interface BrainCheckAnalysis {
  verdict: BrainCheckVerdict;
  runs: number;
  /** Checks still needed before a verdict (0 once enough runs). */
  runsNeeded: number;
  /** Days still needed between baseline and latest check. */
  daysNeeded: number;
  baseline: number | null;
  current: number | null;
  changePct: number | null;
  rci: number | null;
  points: BrainCheckPoint[];
}

const FAMILIARISATION_RUNS = 1;
const BASELINE_RUNS = 2;
const CURRENT_RUNS = 2;
const MIN_RUNS = FAMILIARISATION_RUNS + BASELINE_RUNS + CURRENT_RUNS;
const MIN_SPAN_DAYS = 7;
const RELIABLE_Z = 1.96;
const NOISE_FLOOR_FRACTION = 0.05;
const DAY_MS = 24 * 60 * 60 * 1000;

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

/**
 * Within-person SD from successive differences (von Neumann MSSD): run-to-run
 * jitter only, so a genuine trend doesn't inflate the noise estimate.
 */
function successiveDiffSd(xs: number[]): number {
  if (xs.length < 2) return 0;
  let sum = 0;
  for (let i = 1; i < xs.length; i++) sum += (xs[i] - xs[i - 1]) ** 2;
  return Math.sqrt(sum / (xs.length - 1) / 2);
}

export function analyzeBrainChecks(input: BrainCheckPoint[], unit = 0): BrainCheckAnalysis {
  const points = [...input].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  const measured = points.slice(FAMILIARISATION_RUNS).map((p) => p.value);
  const baselineVals = measured.slice(0, BASELINE_RUNS);
  const baseline = baselineVals.length > 0 ? mean(baselineVals) : null;
  const empty = { runs: points.length, points, current: null, changePct: null, rci: null };

  if (points.length < MIN_RUNS) {
    return { ...empty, verdict: 'need-more', runsNeeded: MIN_RUNS - points.length, daysNeeded: 0, baseline };
  }

  const current = mean(measured.slice(-CURRENT_RUNS));
  const lastBaselineAt = Date.parse(points[FAMILIARISATION_RUNS + BASELINE_RUNS - 1].at);
  const spanDays = (Date.parse(points[points.length - 1].at) - lastBaselineAt) / DAY_MS;
  const b = baseline as number;
  const sd = Math.max(successiveDiffSd(measured), Math.abs(b) * NOISE_FLOOR_FRACTION, unit, 1e-6);
  const seDiff = sd * Math.sqrt(1 / BASELINE_RUNS + 1 / CURRENT_RUNS);
  const rci = (current - b) / seDiff;
  const changePct = b !== 0 ? ((current - b) / Math.abs(b)) * 100 : null;
  const result = { ...empty, baseline, current, changePct, rci, runsNeeded: 0 };

  if (spanDays < MIN_SPAN_DAYS) {
    return { ...result, verdict: 'need-more', daysNeeded: Math.ceil(MIN_SPAN_DAYS - spanDays) };
  }
  const verdict: BrainCheckVerdict = rci >= RELIABLE_Z ? 'improved' : rci <= -RELIABLE_Z ? 'declined' : 'stable';
  return { ...result, verdict, daysNeeded: 0 };
}

export interface RecentSessionRow {
  score: number;
  level: number;
  created_at: string;
  extra_data: Record<string, unknown> | null;
}

/**
 * From newest-first recent sessions: when was the last Brain Check (cooldown),
 * and what was the last TRAINING run (adaptive staircase). Rejected checks were
 * played at the protocol level, not the player's, so they count as neither.
 */
export function splitRecentSessions(rows: RecentSessionRow[] | null | undefined): {
  lastCheckAt: string | null;
  lastTraining: { score: number; level: number } | null;
} {
  let lastCheckAt: string | null = null;
  let lastTraining: { score: number; level: number } | null = null;
  for (const r of rows ?? []) {
    const extra = r.extra_data ?? {};
    if (extra.benchmark === true) lastCheckAt ??= r.created_at;
    else if (!extra.benchmarkRejected) lastTraining ??= { score: r.score, level: r.level };
  }
  return { lastCheckAt, lastTraining };
}

export interface BrainCheckSummary {
  analysis: BrainCheckAnalysis;
  lastCheckAt: string | null;
  available: boolean;
  nextAvailableAt: string | null;
}

/** Group raw check rows (any order) into one summary per measured drill. */
export function summarizeBrainChecks(
  rows: (BrainCheckRow & { drill_type: string; created_at: string })[],
  now = Date.now(),
): Record<BrainCheckDrill, BrainCheckSummary> {
  const out = {} as Record<BrainCheckDrill, BrainCheckSummary>;
  for (const drill of BRAIN_CHECK_DRILLS) {
    const points: BrainCheckPoint[] = [];
    let lastCheckAt: string | null = null;
    for (const r of rows) {
      if (r.drill_type !== drill) continue;
      if (!lastCheckAt || Date.parse(r.created_at) > Date.parse(lastCheckAt)) lastCheckAt = r.created_at;
      const value = brainCheckValue(drill, r);
      if (value !== null) points.push({ value, at: r.created_at });
    }
    const available = isBrainCheckAvailable(lastCheckAt, now);
    out[drill] = {
      analysis: analyzeBrainChecks(points, BRAIN_CHECK_PROTOCOL[drill].unit),
      lastCheckAt,
      available,
      nextAvailableAt: available || !lastCheckAt
        ? null
        : new Date(Date.parse(lastCheckAt) + BRAIN_CHECK_COOLDOWN_MS).toISOString(),
    };
  }
  return out;
}

/**
 * Check boards: generate a few and keep the one with the MEDIAN number of
 * findable words. Median-of-3 narrows board-difficulty spread (a big share of
 * run-to-run noise) without hand-tuned per-language constants.
 */
export function pickMedianBoard<T extends { words: unknown[] }>(boards: T[]): T | null {
  if (boards.length === 0) return null;
  const sorted = [...boards].sort((a, b) => a.words.length - b.words.length);
  return sorted[Math.floor((sorted.length - 1) / 2)];
}
