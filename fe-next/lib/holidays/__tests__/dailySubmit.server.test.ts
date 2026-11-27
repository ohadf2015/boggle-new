import { beforeEach, describe, expect, it, vi } from 'vitest';

const settle = vi.fn();
const cached = vi.fn();
const generate = vi.fn();
vi.mock('@/backend/redisClient', () => ({ getCachedDailyPuzzle: (...a: unknown[]) => cached(...a) }));
vi.mock('@/utils/dailyChallenge/gridGeneration.server', () => ({ generateDailyPuzzleAsync: (...a: unknown[]) => generate(...a) }));
vi.mock('@/backend/routes/dailyChallenge/utils', () => ({
  isWordValidForDailyChallenge: (w: string) => w !== 'ZZZ',
  normalizeWordForComparison: (w: string) => w.toUpperCase(),
}));
vi.mock('../dailyBonus.server', () => ({ settleHolidayDaily: (...a: unknown[]) => settle(...a) }));
vi.mock('@/utils/logger', () => ({ default: { error: vi.fn() } }));

import { holidayDailyForSubmit } from '../dailySubmit.server';

const base = {
  supabase: {} as never,
  playerId: 'u1',
  holiday: 'hanukkah',
  puzzleDate: '2026-12-06',
  language: 'en',
  wordsDiscovered: [{ word: 'snow' }, { word: 'zzz' }],
  attemptWords: [{ word: 'TREE' }],
  isCatchup: false,
};

beforeEach(() => {
  settle.mockReset().mockResolvedValue({ kind: 'nightly' });
  cached.mockReset().mockResolvedValue({ grid: [['S']] });
  generate.mockReset().mockResolvedValue({ grid: [['G']] });
});

describe('holidayDailyForSubmit', () => {
  it('Given a signed-in holiday submit, Then it settles on the served grid with every traced word and the dictionary check', async () => {
    expect(await holidayDailyForSubmit(base)).toEqual({ kind: 'nightly' });
    const arg = settle.mock.calls[0][0];
    expect(arg).toMatchObject({ userId: 'u1', holiday: 'hanukkah', grid: [['S']], words: ['snow', 'zzz', 'TREE'] });
    expect(arg.isValidWord('zzz')).toBe(false);
    expect(arg.isValidWord('snow')).toBe(true);
  });

  it('Given no cached puzzle, Then the stored puzzle is loaded instead', async () => {
    cached.mockResolvedValue(null);
    await holidayDailyForSubmit(base);
    expect(settle.mock.calls[0][0].grid).toEqual([['G']]);
  });

  it('Given a guest or no holiday, Then nothing settles', async () => {
    expect(await holidayDailyForSubmit({ ...base, playerId: null })).toBeNull();
    expect(await holidayDailyForSubmit({ ...base, holiday: undefined })).toBeNull();
    expect(settle).not.toHaveBeenCalled();
  });

  it('Given settlement throws, Then the daily submit still succeeds without a holiday block', async () => {
    settle.mockRejectedValue(new Error('db down'));
    expect(await holidayDailyForSubmit(base)).toBeNull();
  });
});
