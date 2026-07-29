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

  it('Swedish: every dict-validated variety puzzle has aligned compound examples', () => {
    // The sv-v-* batch (2026-06-04) is closed-compound validated: each example
    // compound must equal word1+bridge / bridge+word2 with NO separator, so the
    // bridge is the same string in both — guards future re-materializations.
    const norm = (s: string) => s.toLowerCase().replace(/[^a-zà-ÿ]/g, '');
    const batch = getPuzzlesForLocale('sv').filter((p) => p.id.startsWith('sv-v-'));
    expect(batch.length).toBeGreaterThanOrEqual(10);
    for (const p of batch) {
      const ex = p.examples?.[0];
      expect(ex, `${p.id} has an example`).toBeDefined();
      expect(norm(ex!.w1)).toBe(norm(p.word1) + norm(p.bridge));
      expect(norm(ex!.w2)).toBe(norm(p.bridge) + norm(p.word2));
      expect(p.word1).not.toBe(p.bridge);
      expect(p.bridge).not.toBe(p.word2);
    }
  });

  it('Japanese resolves to a native kanji pool (played via device IME, not the A-Z keyboard)', () => {
    const ja = getPuzzlesForLocale('ja');
    expect(ja.length).toBeGreaterThan(0);
    expect(ja).not.toBe(getPuzzlesForLocale('en'));
    expect(ja.every((p) => p.id.startsWith('ja-'))).toBe(true);
  });

  it('Japanese: the mined variety batch has aligned single-kanji compound examples', () => {
    // ja-v-* (2026-06-04) is mined from the game's own common-word list: each
    // example compound must equal word1+bridge / bridge+word2 with single-kanji
    // parts and no separator — the bridge is the same kanji in both attested
    // 二字熟語. Guards future re-materializations.
    const batch = getPuzzlesForLocale('ja').filter((p) => p.id.startsWith('ja-v-'));
    expect(batch.length).toBeGreaterThanOrEqual(30);
    for (const p of batch) {
      expect([...p.word1].length, `${p.id} word1 single kanji`).toBe(1);
      expect([...p.bridge].length, `${p.id} bridge single kanji`).toBe(1);
      expect([...p.word2].length, `${p.id} word2 single kanji`).toBe(1);
      const ex = p.examples?.[0];
      expect(ex, `${p.id} has an example`).toBeDefined();
      expect(ex!.w1).toBe(p.word1 + p.bridge);
      expect(ex!.w2).toBe(p.bridge + p.word2);
    }
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
