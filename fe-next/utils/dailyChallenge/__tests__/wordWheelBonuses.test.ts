import { describe, it, expect } from 'vitest';
import {
  scoreWord, scoreForLength, WHEEL_BONUS_START_DATE, hasWheelBonuses, comboMultiplier, MAX_COMBO_MULTIPLIER,
  goldLetterFor, wordPoints, maxWheelScore, goldCoinsFor, GOLD_COINS_DAILY_CAP, scaleRankThresholds,
  wheelBreakdown,
} from '../wordWheelScoring';
import { generateWordWheelPuzzle } from '../wordWheelGeneration';

const BEFORE = '2026-10-30';
const AFTER = '2026-10-31';

describe('date gate', () => {
  it('starts on the constant date', () => {
    expect(WHEEL_BONUS_START_DATE).toBe(AFTER);
    expect(hasWheelBonuses(BEFORE)).toBe(false);
    expect(hasWheelBonuses(AFTER)).toBe(true);
    expect(hasWheelBonuses('2026-11-15')).toBe(true);
  });

  it('practice seeds (not a date) never get bonuses', () => {
    expect(hasWheelBonuses('practice-abc')).toBe(false);
  });
});

describe('scoreForLength', () => {
  it('matches scoreWord', () => {
    expect(scoreForLength(3)).toBe(scoreWord('CAT'));
    expect(scoreForLength(7)).toBe(scoreWord('ABCDEFG'));
  });
});

describe('comboMultiplier', () => {
  it('climbs by a quarter per chained word and caps at x2', () => {
    expect(comboMultiplier(0)).toBe(1);
    expect(comboMultiplier(1)).toBe(1);
    expect(comboMultiplier(2)).toBe(1.25);
    expect(comboMultiplier(3)).toBe(1.5);
    expect(comboMultiplier(5)).toBe(2);
    expect(comboMultiplier(12)).toBe(MAX_COMBO_MULTIPLIER);
  });
});

describe('goldLetterFor', () => {
  it('is null before the gate', () => {
    expect(goldLetterFor(generateWordWheelPuzzle(BEFORE, 'en'))).toBeNull();
  });

  it('is always an outer letter, never the center, and deterministic', () => {
    let goldDays = 0;
    for (let d = 1; d <= 28; d++) {
      const date = `2026-11-${String(d).padStart(2, '0')}`;
      const p = generateWordWheelPuzzle(date, 'en');
      const g = goldLetterFor(p);
      expect(goldLetterFor(generateWordWheelPuzzle(date, 'en'))).toBe(g);
      if (g) {
        goldDays++;
        expect(p.outerLetters).toContain(g);
        expect(g).not.toBe(p.centerLetter);
      }
    }
    expect(goldDays).toBeGreaterThan(8);
    expect(goldDays).toBeLessThan(24);
  });

  it('does not change the puzzle letters', () => {
    const p = generateWordWheelPuzzle(AFTER, 'en');
    const copy = JSON.stringify(p);
    goldLetterFor(p);
    expect(JSON.stringify(p)).toBe(copy);
  });
});

describe('wordPoints', () => {
  it('gold adds 50%, combo multiplies on top', () => {
    expect(wordPoints('CAT', { gold: null, multiplier: 1 })).toBe(12);
    expect(wordPoints('CAT', { gold: 'A', multiplier: 1 })).toBe(18);
    expect(wordPoints('CAT', { gold: 'Z', multiplier: 1.5 })).toBe(18);
    expect(wordPoints('CAT', { gold: 'A', multiplier: 2 })).toBe(36);
  });
});

describe('wheelBreakdown', () => {
  it('splits a run into base, combo and gold parts that add up', () => {
    const b = wheelBreakdown([
      { word: 'CAT', multiplier: 1 },
      { word: 'TACK', multiplier: 1.25 },
    ], 'K');
    expect(b.base).toBe(12 + 30);
    expect(b.gold).toBe(15);
    expect(b.combo).toBe(Math.round(45 * 1.25) - 45);
    expect(b.total).toBe(b.base + b.gold + b.combo);
    expect(b.goldWords).toBe(1);
  });
});

describe('maxWheelScore (server clamp)', () => {
  it('is the plain sum before the gate', () => {
    expect(maxWheelScore(['CAT', 'TACK'], null, BEFORE)).toBe(42);
  });
  it('allows full combo and gold after the gate', () => {
    expect(maxWheelScore(['CAT', 'TACK'], 'K', AFTER)).toBe(12 * 2 + Math.round(30 * 1.5 * 2));
  });
});

describe('goldCoinsFor', () => {
  it('pays per gold word, capped per day', () => {
    expect(goldCoinsFor(['CAT', 'TACK'], 'K')).toBe(2);
    expect(goldCoinsFor(['CAT'], null)).toBe(0);
    const many = Array.from({ length: 40 }, (_, i) => `K${i}`);
    expect(goldCoinsFor(many, 'K')).toBe(GOLD_COINS_DAILY_CAP);
  });
});

describe('scaleRankThresholds', () => {
  const base = [0, 12, 42, 90, 160, 260, 400, 600, 850];
  it('keeps old thresholds before the gate', () => {
    expect(scaleRankThresholds(base, BEFORE)).toEqual(base);
  });
  it('raises later ranks after the gate but keeps the floor and first step', () => {
    const s = scaleRankThresholds(base, AFTER);
    expect(s[0]).toBe(0);
    expect(s[1]).toBe(12);
    expect(s[8]).toBeGreaterThan(850);
    for (let i = 1; i < s.length; i++) expect(s[i]).toBeGreaterThan(s[i - 1]);
  });
});
