import { describe, it, expect } from 'vitest';
import {
  dailySeed,
  dailyDifficulty,
  generateDailyPuzzle,
  generateFreeplayPuzzle,
} from './generate.daily';

describe('dailySeed', () => {
  it('GIVEN same date+locale THEN returns the same seed (deterministic)', () => {
    expect(dailySeed('2026-06-20', 'en')).toBe(dailySeed('2026-06-20', 'en'));
  });

  it('GIVEN different dates THEN returns different seeds', () => {
    expect(dailySeed('2026-06-20', 'en')).not.toBe(dailySeed('2026-06-21', 'en'));
  });

  it('GIVEN different locales THEN returns different seeds', () => {
    expect(dailySeed('2026-06-20', 'en')).not.toBe(dailySeed('2026-06-20', 'he'));
  });
});

describe('dailyDifficulty (newspaper-style weekday escalation)', () => {
  it('GIVEN early-week days THEN easy', () => {
    expect(dailyDifficulty('2026-06-22')).toBe('easy'); // Monday
    expect(dailyDifficulty('2026-06-23')).toBe('easy'); // Tuesday
  });
  it('GIVEN midweek days THEN medium', () => {
    expect(dailyDifficulty('2026-06-24')).toBe('medium'); // Wednesday
    expect(dailyDifficulty('2026-06-26')).toBe('medium'); // Friday
  });
  it('GIVEN weekend days THEN hard', () => {
    expect(dailyDifficulty('2026-06-20')).toBe('hard'); // Saturday
    expect(dailyDifficulty('2026-06-21')).toBe('hard'); // Sunday
  });
});

describe('generateDailyPuzzle', () => {
  it("GIVEN a date THEN the daily's difficulty matches the weekday escalation", async () => {
    const p = await generateDailyPuzzle('2026-06-22', 'en'); // Monday → easy
    expect(p?.difficulty).toBe('easy');
  });

  it('GIVEN an EN date THEN generates a valid daily puzzle with a stable id', async () => {
    const p = await generateDailyPuzzle('2026-06-20', 'en');
    expect(p).not.toBeNull();
    expect(p!.locale).toBe('en');
    expect(p!.id).toContain('2026-06-20');
    expect(p!.slots.every((s) => s.clue.length > 0)).toBe(true);
  });

  it('GIVEN the same date THEN regenerates the identical puzzle (deterministic daily)', async () => {
    const a = await generateDailyPuzzle('2026-06-20', 'en');
    const b = await generateDailyPuzzle('2026-06-20', 'en');
    const sig = (p: typeof a) => p!.cells.map((c) => c.solution || '#').join('');
    expect(sig(a)).toBe(sig(b));
  });

  it('GIVEN a fallback locale (sv) THEN still returns a playable puzzle', async () => {
    const p = await generateDailyPuzzle('2026-06-20', 'sv');
    expect(p).not.toBeNull();
    expect(p!.slots.length).toBeGreaterThan(0);
  });
});

describe('Japanese', () => {
  const kanaOnly = (p: Awaited<ReturnType<typeof generateDailyPuzzle>>) =>
    p!.cells.filter((c) => !c.block).every((c) => /^[\u3041-\u3096ー]$/.test(c.solution));

  it('GIVEN ja THEN the daily is a 4×4 kana grid from the ja clue bank, not an English one', async () => {
    const p = await generateDailyPuzzle('2026-06-20', 'ja');
    expect(p).not.toBeNull();
    expect(p!.locale).toBe('ja');
    expect(p!.size).toBe(4);
    expect(kanaOnly(p)).toBe(true);
    expect(p!.slots.every((s) => s.clue.length > 0)).toBe(true);
  });

  it('GIVEN ja freeplay THEN also kana', async () => {
    const p = await generateFreeplayPuzzle(7, 'ja');
    expect(p).not.toBeNull();
    expect(kanaOnly(p)).toBe(true);
  });
});

describe('generateFreeplayPuzzle', () => {
  it('GIVEN a seed THEN returns a valid puzzle', async () => {
    const p = await generateFreeplayPuzzle(123, 'en');
    expect(p).not.toBeNull();
    expect(p!.source).toBe('generated');
  });

  it('GIVEN different seeds THEN produces variety (endless)', async () => {
    const sigs = new Set<string>();
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const p = await generateFreeplayPuzzle(seed, 'en');
      if (p) sigs.add(p.cells.map((c) => c.solution || '#').join(''));
    }
    expect(sigs.size).toBeGreaterThan(2);
  });

  it('GIVEN a difficulty THEN labels the puzzle with that difficulty', async () => {
    const p = await generateFreeplayPuzzle(50, 'en', 'easy');
    expect(p?.difficulty).toBe('easy');
  });
});
