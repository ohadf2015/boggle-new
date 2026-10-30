import { describe, it, expect } from 'vitest';
import { validateDailySubmission, resolveDailySubmission } from '../dailyScore';

const TODAY = '2026-05-30';
const MAX = 1000;

function body(over: Record<string, unknown> = {}) {
  return {
    puzzleDate: TODAY,
    language: 'he',
    displayName: 'Dana',
    score: 500,
    timeTakenSeconds: 42,
    puzzlesSolved: 5,
    ...over,
  };
}

describe('validateDailySubmission — anti-cheat gate', () => {
  it('accepts a well-formed submission', () => {
    const r = validateDailySubmission(body(), MAX, TODAY);
    expect(r.ok).toBe(true);
  });

  it('rejects a score above the day max (cheat clamp)', () => {
    const r = validateDailySubmission(body({ score: MAX + 1 }), MAX, TODAY);
    expect(r.ok).toBe(false);
  });

  it('accepts a score exactly at the max', () => {
    expect(validateDailySubmission(body({ score: MAX }), MAX, TODAY).ok).toBe(true);
  });

  it('rejects a future puzzle date', () => {
    expect(validateDailySubmission(body({ puzzleDate: '2026-05-31' }), MAX, TODAY).ok).toBe(false);
  });

  it('rejects a stale date older than yesterday', () => {
    expect(validateDailySubmission(body({ puzzleDate: '2026-05-28' }), MAX, TODAY).ok).toBe(false);
  });

  it('accepts yesterday (UTC midnight skew tolerance)', () => {
    expect(validateDailySubmission(body({ puzzleDate: '2026-05-29' }), MAX, TODAY).ok).toBe(true);
  });

  it('rejects an unknown language', () => {
    expect(validateDailySubmission(body({ language: 'fr' }), MAX, TODAY).ok).toBe(false);
  });

  it('rejects an empty or over-long display name', () => {
    expect(validateDailySubmission(body({ displayName: '' }), MAX, TODAY).ok).toBe(false);
    expect(validateDailySubmission(body({ displayName: 'x'.repeat(51) }), MAX, TODAY).ok).toBe(false);
  });

  it('rejects non-integer / negative numerics', () => {
    expect(validateDailySubmission(body({ score: -1 }), MAX, TODAY).ok).toBe(false);
    expect(validateDailySubmission(body({ timeTakenSeconds: 1.5 }), MAX, TODAY).ok).toBe(false);
    expect(validateDailySubmission(body({ score: 'lots' }), MAX, TODAY).ok).toBe(false);
  });
});

describe('resolveDailySubmission — best-keeps upsert decision', () => {
  it('inserts when there is no existing row', () => {
    expect(resolveDailySubmission({ existing: null, incoming: { score: 100, timeTakenSeconds: 10 } }).action).toBe('insert');
  });
  it('updates on a higher score', () => {
    expect(
      resolveDailySubmission({ existing: { score: 100, timeTakenSeconds: 10 }, incoming: { score: 200, timeTakenSeconds: 99 } }).action,
    ).toBe('update');
  });
  it('updates on equal score with a faster time', () => {
    expect(
      resolveDailySubmission({ existing: { score: 100, timeTakenSeconds: 30 }, incoming: { score: 100, timeTakenSeconds: 20 } }).action,
    ).toBe('update');
  });
  it('keeps the existing row when the new attempt is not better', () => {
    expect(
      resolveDailySubmission({ existing: { score: 200, timeTakenSeconds: 10 }, incoming: { score: 100, timeTakenSeconds: 5 } }).action,
    ).toBe('keep');
    expect(
      resolveDailySubmission({ existing: { score: 100, timeTakenSeconds: 10 }, incoming: { score: 100, timeTakenSeconds: 10 } }).action,
    ).toBe('keep');
  });
});

describe('validateDailySubmission — score must match the run', () => {
  it('rejects points with nothing solved', () => {
    expect(validateDailySubmission(body({ score: 100, puzzlesSolved: 0 }), MAX, TODAY).ok).toBe(false);
  });

  it('rejects more points than the solved puzzles can earn', () => {
    expect(validateDailySubmission(body({ score: 900, puzzlesSolved: 1 }), MAX, TODAY).ok).toBe(false);
  });

  it('rejects a solve faster than one second per puzzle', () => {
    expect(validateDailySubmission(body({ timeTakenSeconds: 2, puzzlesSolved: 5 }), MAX, TODAY).ok).toBe(false);
  });

  it('accepts a zero-solve run with zero points', () => {
    expect(validateDailySubmission(body({ score: 0, puzzlesSolved: 0, timeTakenSeconds: 0 }), MAX, TODAY).ok).toBe(true);
  });
});

describe('resolveDailySubmission — one language per day', () => {
  it('keeps the first row when a better score arrives in another language', () => {
    expect(
      resolveDailySubmission({
        existing: { score: 100, timeTakenSeconds: 90, language: 'en' },
        incoming: { score: 900, timeTakenSeconds: 30, language: 'he' },
      }),
    ).toEqual({ action: 'keep' });
  });

  it('still upgrades within the same language', () => {
    expect(
      resolveDailySubmission({
        existing: { score: 100, timeTakenSeconds: 90, language: 'en' },
        incoming: { score: 900, timeTakenSeconds: 30, language: 'en' },
      }),
    ).toEqual({ action: 'update' });
  });
});
