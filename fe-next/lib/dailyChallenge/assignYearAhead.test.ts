import { describe, it, expect, vi } from 'vitest';
import { assignYearAhead, type YearAheadDeps } from './assignYearAhead';

type Pool = Array<{ word: string; meaning: string; interestingness: number }>;

function memDeps(opts: {
  pool: Pool;
  recentlyUsed?: string[];
  occupied?: string[]; // dates already filled by a human override (skip)
}) {
  const assigned: Array<{ date: string; word: string; meaning: string }> = [];
  const bankUsed: string[] = [];
  const deps: YearAheadDeps = {
    getApprovedPool: vi.fn(async () => [...opts.pool]),
    getRecentlyUsedWords: vi.fn(async () => new Set((opts.recentlyUsed ?? []).map((w) => w.toUpperCase()))),
    getHumanOverrideDates: vi.fn(async () => new Set(opts.occupied ?? [])),
    assignSlot: vi.fn(async (_lang, date, word, meaning) => {
      assigned.push({ date, word, meaning });
    }),
    markBankUsed: vi.fn(async (_lang, word) => {
      bankUsed.push(word);
    }),
  };
  return { deps, assigned, bankUsed };
}

const POOL: Pool = [
  { word: 'DRAGON', meaning: 'mythical beast', interestingness: 5 },
  { word: 'ROCKET', meaning: 'space vehicle', interestingness: 5 },
  { word: 'GARDEN', meaning: 'plant plot', interestingness: 4 },
  { word: 'AMOUNT', meaning: 'quantity', interestingness: 2 },
];

describe('assignYearAhead', () => {
  it('fills empty future dates with distinct words, highest-interest first', async () => {
    const { deps, assigned } = memDeps({ pool: POOL });
    const summary = await assignYearAhead(deps, { language: 'en', startDate: '2026-07-01', days: 3 });

    expect(assigned).toEqual([
      { date: '2026-07-01', word: 'DRAGON', meaning: 'mythical beast' },
      { date: '2026-07-02', word: 'ROCKET', meaning: 'space vehicle' },
      { date: '2026-07-03', word: 'GARDEN', meaning: 'plant plot' },
    ]);
    expect(summary.assigned).toBe(3);
    expect(summary.shortfall).toBe(0);
  });

  it('NEVER repeats a word across the assigned window', async () => {
    const { deps, assigned } = memDeps({ pool: POOL });
    await assignYearAhead(deps, { language: 'en', startDate: '2026-07-01', days: 4 });
    const words = assigned.map((a) => a.word);
    expect(new Set(words).size).toBe(words.length); // all distinct
  });

  it('excludes recently-used words (no-repeat across the year horizon)', async () => {
    const { deps, assigned } = memDeps({ pool: POOL, recentlyUsed: ['dragon', 'rocket'] });
    await assignYearAhead(deps, { language: 'en', startDate: '2026-07-01', days: 4 });
    const words = assigned.map((a) => a.word);
    expect(words).not.toContain('DRAGON');
    expect(words).not.toContain('ROCKET');
    expect(words).toEqual(['GARDEN', 'AMOUNT']); // only the 2 unused remain
  });

  it('skips dates already held by a human override', async () => {
    const { deps, assigned } = memDeps({ pool: POOL, occupied: ['2026-07-02'] });
    await assignYearAhead(deps, { language: 'en', startDate: '2026-07-01', days: 3 });
    const dates = assigned.map((a) => a.date);
    expect(dates).toEqual(['2026-07-01', '2026-07-03']); // 07-02 left untouched
  });

  it('reports a shortfall when the pool cannot cover the whole year (alert signal)', async () => {
    const { deps, assigned } = memDeps({ pool: POOL }); // 4 words
    const summary = await assignYearAhead(deps, { language: 'en', startDate: '2026-07-01', days: 10 });
    expect(assigned.length).toBe(4);
    expect(summary.assigned).toBe(4);
    expect(summary.shortfall).toBe(6); // 10 requested - 4 available
  });

  it('marks each assigned word used in the bank so the daily selector cannot re-pick it', async () => {
    const { deps, bankUsed } = memDeps({ pool: POOL });
    await assignYearAhead(deps, { language: 'en', startDate: '2026-07-01', days: 2 });
    expect(bankUsed).toEqual(['DRAGON', 'ROCKET']);
  });
});
