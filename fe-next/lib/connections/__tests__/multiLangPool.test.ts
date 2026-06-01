import { describe, it, expect } from 'vitest';
import { getPuzzlesForLocale } from '../puzzles';
import { checkGuess } from '../gameLogic';
import { dailyPuzzleSet, maxDailyScore, DAILY_PUZZLE_COUNT } from '../daily';

describe('multi-language native pools (es/sv) + ja fallback', () => {
  it('Spanish resolves to a native pool, not the English fallback', () => {
    const es = getPuzzlesForLocale('es');
    const en = getPuzzlesForLocale('en');
    expect(es.length).toBeGreaterThan(0);
    expect(es).not.toBe(en);
    expect(es.every((p) => p.id.startsWith('es-'))).toBe(true);
  });

  it('Swedish resolves to a native pool of real closed-compound bridges', () => {
    const sv = getPuzzlesForLocale('sv');
    expect(sv.length).toBeGreaterThan(0);
    expect(sv.every((p) => p.id.startsWith('sv-'))).toBe(true);
    // fot + boll + plan → fotboll / bollplan
    expect(sv.some((p) => p.bridge === 'boll')).toBe(true);
  });

  it('Japanese (no IME yet) falls back to English — no broken kanji-on-Latin mode', () => {
    expect(getPuzzlesForLocale('ja')).toBe(getPuzzlesForLocale('en'));
  });

  it('a Spanish bridge is solvable typing base letters on the A–Z keyboard', () => {
    const es = getPuzzlesForLocale('es');
    const anos = es.find((p) => p.bridge === 'años');
    expect(anos).toBeDefined();
    // player can only type a-z → "anos" must match "años"
    expect(checkGuess('anos', anos!).correct).toBe(true);
  });

  it('a Swedish å/ä bridge is solvable typing base letters', () => {
    const sv = getPuzzlesForLocale('sv');
    const ros = sv.find((p) => p.bridge === 'stjärna');
    expect(ros).toBeDefined();
    expect(checkGuess('stjarna', ros!).correct).toBe(true);
  });

  it('es/sv build a full deterministic daily set with a sane max score', () => {
    for (const loc of ['es', 'sv'] as const) {
      const set = dailyPuzzleSet('2026-06-01', loc);
      expect(set).toHaveLength(DAILY_PUZZLE_COUNT);
      expect(new Set(set.map((p) => p.id)).size).toBe(DAILY_PUZZLE_COUNT); // no dupes
      expect(set.every((p) => p.id.startsWith(`${loc}-`))).toBe(true); // native, not en
      const max = maxDailyScore('2026-06-01', loc);
      expect(max).toBeGreaterThan(0);
    }
    // same day + locale is stable (leaderboard integrity)
    expect(dailyPuzzleSet('2026-06-01', 'es').map((p) => p.id)).toEqual(
      dailyPuzzleSet('2026-06-01', 'es').map((p) => p.id),
    );
  });
});
