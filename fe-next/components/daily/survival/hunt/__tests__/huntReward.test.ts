import { describe, expect, it } from 'vitest';
import {
  COMBO_WINDOW_MS,
  comboBonus,
  isLuckyWord,
  LUCKY_LIFE_BONUS,
  nextCombo,
  pickVariant,
  praiseFor,
} from '../huntReward';

describe('nextCombo', () => {
  it('starts at 1 for the first word', () => {
    expect(nextCombo(null, 1000)).toEqual({ count: 1, at: 1000 });
  });

  it('grows while words land inside the window', () => {
    const a = nextCombo(null, 0);
    const b = nextCombo(a, COMBO_WINDOW_MS - 1);
    const c = nextCombo(b, COMBO_WINDOW_MS * 2 - 2);
    expect(c.count).toBe(3);
  });

  it('resets after a pause longer than the window', () => {
    const a = nextCombo({ count: 4, at: 0 }, COMBO_WINDOW_MS + 1);
    expect(a.count).toBe(1);
  });
});

describe('comboBonus', () => {
  it('pays nothing for a single word and grows to a cap', () => {
    expect(comboBonus(1)).toBe(0);
    expect(comboBonus(2)).toBe(2);
    expect(comboBonus(3)).toBe(4);
    expect(comboBonus(9)).toBe(6);
  });
});

describe('isLuckyWord', () => {
  it('is the same answer for every player on the same puzzle', () => {
    expect(isLuckyWord('PLANT', 'MAT')).toBe(isLuckyWord('plant', 'mat'));
  });

  it('marks roughly one word in six', () => {
    const words = Array.from({ length: 600 }, (_, i) => `W${i.toString(36)}`);
    const lucky = words.filter((w) => isLuckyWord('PLANT', w)).length;
    expect(lucky).toBeGreaterThan(60);
    expect(lucky).toBeLessThan(150);
  });

  it('gives a real life bonus', () => {
    expect(LUCKY_LIFE_BONUS).toBeGreaterThan(0);
  });
});

describe('praiseFor', () => {
  it('varies the line across words of the same length', () => {
    const lines = new Set(['CAT', 'DOG', 'SUN', 'MAP', 'TEN', 'RAT', 'PEN', 'LOG'].map((w) => praiseFor(w, 1, false).index));
    expect(lines.size).toBeGreaterThan(1);
  });

  it('uses the long pool for 7+ letters and the lucky line for a lucky word', () => {
    expect(praiseFor('PLANETS', 1, false).key).toBe('wordHunt.survival.stage.praiseLong');
    expect(praiseFor('MAT', 1, true).key).toBe('wordHunt.survival.stage.lucky');
  });

  it('calls out a combo of three or more', () => {
    expect(praiseFor('MAT', 3, false).key).toBe('wordHunt.survival.stage.combo');
  });
});

describe('pickVariant', () => {
  it('picks one line from a pool and wraps the index', () => {
    expect(pickVariant('Nice!|Sweet!', 0)).toBe('Nice!');
    expect(pickVariant('Nice!|Sweet!', 3)).toBe('Sweet!');
    expect(pickVariant('Nice!', 2)).toBe('Nice!');
  });
});
