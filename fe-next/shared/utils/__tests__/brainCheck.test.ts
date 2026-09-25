/**
 * Brain Check — fixed-protocol repeated measurement + reliable-change analysis.
 */
import { describe, it, expect } from 'vitest';
import {
  analyzeBrainChecks,
  brainCheckValue,
  isBrainCheckAvailable,
  BRAIN_CHECK_COOLDOWN_MS,
  BRAIN_CHECK_PROTOCOL,
  isBrainCheckDrill,
  splitRecentSessions,
  summarizeBrainChecks,
} from '../brainCheck';

const DAY = 24 * 60 * 60 * 1000;
const T0 = Date.UTC(2026, 8, 1);
const pts = (values: number[], stepDays = 2) =>
  values.map((value, i) => ({ value, at: new Date(T0 + i * stepDays * DAY).toISOString() }));

describe('analyzeBrainChecks', () => {
  it('Given no runs, When analyzed, Then needs 5 more runs and has no baseline', () => {
    const a = analyzeBrainChecks([]);
    expect(a.verdict).toBe('need-more');
    expect(a.runsNeeded).toBe(5);
    expect(a.baseline).toBeNull();
  });

  it('Given 3 runs, Then baseline excludes the familiarisation run and verdict waits', () => {
    const a = analyzeBrainChecks(pts([2, 10, 12]));
    expect(a.baseline).toBe(11);
    expect(a.verdict).toBe('need-more');
    expect(a.runsNeeded).toBe(2);
  });

  it('Given a big jump on the familiarisation run only, Then it never counts as improvement', () => {
    const a = analyzeBrainChecks(pts([1, 10, 10, 10, 10, 10, 10]));
    expect(a.verdict).toBe('stable');
    expect(a.changePct).toBe(0);
  });

  it('Given a clear sustained gain over 7+ days, Then verdict is improved with positive RCI', () => {
    const a = analyzeBrainChecks(pts([8, 10, 11, 12, 13, 15, 16], 2));
    expect(a.verdict).toBe('improved');
    expect(a.rci).toBeGreaterThan(1.96);
    expect(a.changePct).toBeCloseTo(((15.5 - 10.5) / 10.5) * 100, 5);
  });

  it('Given noisy runs whose mean shift is within noise, Then verdict is stable', () => {
    const a = analyzeBrainChecks(pts([5, 10, 14, 9, 15, 11, 13], 2));
    expect(a.verdict).toBe('stable');
    expect(Math.abs(a.rci ?? 99)).toBeLessThan(1.96);
  });

  it('Given a clear sustained drop, Then verdict is declined', () => {
    const a = analyzeBrainChecks(pts([10, 16, 15, 13, 12, 10, 9], 2));
    expect(a.verdict).toBe('declined');
  });

  it('Given 5+ runs crammed into under 7 days, Then verdict waits for more days', () => {
    const a = analyzeBrainChecks(pts([8, 10, 11, 14, 16, 18], 1));
    expect(a.verdict).toBe('need-more');
    expect(a.runsNeeded).toBe(0);
    expect(a.daysNeeded).toBeGreaterThan(0);
  });

  it('Given unsorted input, Then it analyzes in chronological order', () => {
    const sorted = pts([8, 10, 11, 12, 13, 15, 16], 2);
    const shuffled = [sorted[4], sorted[0], sorted[6], sorted[2], sorted[1], sorted[5], sorted[3]];
    expect(analyzeBrainChecks(shuffled)).toEqual(analyzeBrainChecks(sorted));
  });

  it('Given perfectly flat runs, Then noise floor prevents a division blow-up', () => {
    const a = analyzeBrainChecks(pts([10, 10, 10, 10, 10, 10], 3));
    expect(a.verdict).toBe('stable');
    expect(Number.isFinite(a.rci)).toBe(true);
  });
});

describe('brainCheckValue', () => {
  const row = (o: Partial<{ score: number; duration_seconds: number; words_found: number; extra_data: Record<string, unknown> }>) => ({
    score: 0, duration_seconds: 45, words_found: 0, extra_data: { benchmark: true }, ...o,
  });

  it('lightning-round = words per minute', () => {
    expect(brainCheckValue('lightning-round', row({ words_found: 9, duration_seconds: 45 }))).toBe(12);
  });
  it('memory-hunt = words recalled across all rounds', () => {
    expect(brainCheckValue('memory-hunt', row({ words_found: 1, extra_data: { benchmark: true, totalWords: 3, recalled: 9 } }))).toBe(9);
  });
  it('combo-master = best chain', () => {
    expect(brainCheckValue('combo-master', row({ extra_data: { benchmark: true, maxCombo: 7 } }))).toBe(7);
  });
  it('rare-gems = rare gems found (not score, which includes random Lucky Gem doubling)', () => {
    expect(brainCheckValue('rare-gems', row({ score: 140, extra_data: { benchmark: true, rareWordsFound: 3 } }))).toBe(3);
    expect(brainCheckValue('rare-gems', row({ score: 140 }))).toBeNull();
  });
  it('returns null for unusable rows (zero duration, missing totals)', () => {
    expect(brainCheckValue('lightning-round', row({ duration_seconds: 0 }))).toBeNull();
    expect(brainCheckValue('memory-hunt', row({ extra_data: { benchmark: true, totalWords: 3 } }))).toBeNull();
  });
});

describe('cooldown + protocol', () => {
  it('allows a check when none taken or cooldown elapsed', () => {
    const now = T0 + 10 * DAY;
    expect(isBrainCheckAvailable(null, now)).toBe(true);
    expect(isBrainCheckAvailable(new Date(now - BRAIN_CHECK_COOLDOWN_MS - 1).toISOString(), now)).toBe(true);
    expect(isBrainCheckAvailable(new Date(now - 60_000).toISOString(), now)).toBe(false);
  });

  it('protocol pins one fixed level per measured drill; pattern-switcher is not measured', () => {
    expect(Object.keys(BRAIN_CHECK_PROTOCOL).sort()).toEqual(['combo-master', 'lightning-round', 'memory-hunt', 'rare-gems']);
    expect(isBrainCheckDrill('pattern-switcher')).toBe(false);
    expect(isBrainCheckDrill('memory-hunt')).toBe(true);
  });
});

describe('splitRecentSessions', () => {
  it('finds the latest check timestamp and the latest TRAINING run separately', () => {
    const rows = [
      { score: 90, level: 2, created_at: '2026-09-25T10:00:00Z', extra_data: { benchmark: true } },
      { score: 40, level: 3, created_at: '2026-09-25T09:00:00Z', extra_data: { submissionId: 'x' } },
      { score: 70, level: 2, created_at: '2026-09-20T09:00:00Z', extra_data: { benchmark: true } },
    ];
    expect(splitRecentSessions(rows)).toEqual({
      lastCheckAt: '2026-09-25T10:00:00Z',
      lastTraining: { score: 40, level: 3 },
    });
  });

  it('a rejected (cooldown) check is neither a check nor a training run', () => {
    const rows = [{ score: 5, level: 2, created_at: '2026-09-25T10:00:00Z', extra_data: { benchmark: false, benchmarkRejected: true } }];
    expect(splitRecentSessions(rows)).toEqual({ lastCheckAt: null, lastTraining: null });
    expect(splitRecentSessions(null)).toEqual({ lastCheckAt: null, lastTraining: null });
  });
});

describe('summarizeBrainChecks', () => {
  it('groups check rows per measured drill, drops unusable rows, and reports availability', () => {
    const now = Date.UTC(2026, 8, 25, 12);
    const CD = BRAIN_CHECK_COOLDOWN_MS;
    const rows = [
      { drill_type: 'lightning-round', score: 0, duration_seconds: 45, words_found: 9, extra_data: { benchmark: true }, created_at: new Date(now - 3600_000).toISOString() },
      { drill_type: 'lightning-round', score: 0, duration_seconds: 0, words_found: 9, extra_data: { benchmark: true }, created_at: new Date(now - 2 * CD).toISOString() },
      { drill_type: 'pattern-switcher', score: 10, duration_seconds: 45, words_found: 1, extra_data: { benchmark: true }, created_at: new Date(now).toISOString() },
    ];
    const s = summarizeBrainChecks(rows, now);
    expect(Object.keys(s).sort()).toEqual(['combo-master', 'lightning-round', 'memory-hunt', 'rare-gems']);
    expect(s['lightning-round'].analysis.runs).toBe(1);
    expect(s['lightning-round'].analysis.points[0].value).toBe(12);
    expect(s['lightning-round'].available).toBe(false);
    expect(s['lightning-round'].nextAvailableAt).toBe(new Date(now - 3600_000 + CD).toISOString());
    expect(s['memory-hunt'].available).toBe(true);
    expect(s['memory-hunt'].nextAvailableAt).toBeNull();
  });
});

describe('measurement resolution floor', () => {
  it('Given flat perfect recall then ONE missed word, Then no verdict flips (memory, unit 0.25)', () => {
    const a = analyzeBrainChecks(pts([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0.75]), 0.25);
    expect(a.verdict).toBe('stable');
  });

  it('Given a steady combo of 5 then a single 6, Then it is not "reliably better" (combo, unit 1)', () => {
    const a = analyzeBrainChecks(pts([5, 5, 5, 5, 5, 5, 5, 5, 5, 6]), 1);
    expect(a.verdict).toBe('stable');
  });

  it('Given a sustained multi-unit gain, Then improvement is still detected with the unit floor', () => {
    const a = analyzeBrainChecks(pts([3, 5, 5, 6, 7, 8, 9, 9]), 1);
    expect(a.verdict).toBe('improved');
  });
});
