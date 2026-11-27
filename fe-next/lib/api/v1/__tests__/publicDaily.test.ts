import { describe, it, expect } from 'vitest';
import { buildPublicDailyPuzzle, buildShareResult, parseDailyDate } from '../publicDaily';

describe('publicDaily', () => {
  const today = '2026-11-27';

  it('hides the target word on the current day', () => {
    const p = buildPublicDailyPuzzle(today, 'en', today);
    expect(p.grid.length).toBeGreaterThan(0);
    expect(p.targetWord).toBeUndefined();
    expect(p.puzzleNumber).toBeGreaterThan(0);
  });

  it('reveals the target word for a prior day', () => {
    const p = buildPublicDailyPuzzle('2026-11-20', 'en', today);
    expect(typeof p.targetWord).toBe('string');
  });

  it('is deterministic per date and language', () => {
    expect(buildPublicDailyPuzzle(today, 'en', today).grid).toEqual(buildPublicDailyPuzzle(today, 'en', today).grid);
  });

  it('rejects bad or future dates', () => {
    expect(parseDailyDate('nope', today)).toBeNull();
    expect(parseDailyDate('2026-12-01', today)).toBeNull();
    expect(parseDailyDate('2026-11-20', today)).toBe('2026-11-20');
    expect(parseDailyDate(null, today)).toBe(today);
  });

  it('builds a share link tagged ref=agent', () => {
    const s = buildShareResult({ date: today, language: 'en', score: 12, wordsFound: 5 });
    expect(s.url).toBe('https://www.lexiclash.live/en/daily?ref=agent');
    expect(s.text).toContain('12');
  });
});
