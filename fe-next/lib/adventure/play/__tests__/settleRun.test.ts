import { describe, it, expect } from 'vitest';
import { settleRun, GRACE_MS } from '../settleRun';
import { getPlayLevel } from '../levels';
import { wordPoints } from '../scoreRun';

const grid = [
  ['c', 'a', 't', 's'],
  ['o', 'x', 'x', 'x'],
  ['d', 'o', 'g', 'x'],
  ['x', 'x', 'x', 'x'],
];
const dict = new Set(['cat', 'cats', 'dog']);
const base = { u: 'u1', g: grid, lang: 'en', t: 1_000_000 };

describe('settleRun', () => {
  it('given a normal level, when words beat the 1-star bar, then stars come from the server score', () => {
    const lvl = getPlayLevel(1, 1);
    const r = settleRun({
      payload: { ...base, w: 1, l: 1 },
      words: ['cat', 'cats', 'dog'],
      now: base.t + 60_000,
      isWord: (w) => dict.has(w),
      prevStars: 0,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.score).toBe(wordPoints('cat') + wordPoints('cats') + wordPoints('dog'));
    expect(r.stars).toBe(r.score >= lvl.stars[0] ? 1 : 0);
  });

  it('given a submit after the clock plus grace, when settled, then it is rejected', () => {
    const lvl = getPlayLevel(1, 1);
    const r = settleRun({
      payload: { ...base, w: 1, l: 1 },
      words: ['cat'],
      now: base.t + lvl.seconds * 1000 + GRACE_MS + 1,
      isWord: (w) => dict.has(w),
      prevStars: 0,
    });
    expect(r).toEqual({ ok: false, error: 'expired' });
  });

  it('given a boss whose HP is not reached, when settled, then it is a loss with 0 stars', () => {
    const r = settleRun({
      payload: { ...base, w: 1, l: 7 },
      words: ['cat'],
      now: base.t + 30_000,
      isWord: (w) => dict.has(w),
      prevStars: 0,
    });
    expect(r.ok && r.won).toBe(false);
    expect(r.ok && r.stars).toBe(0);
    expect(r.ok && r.rewards).toEqual([]);
  });

  it('given a boss knocked out fast, when settled, then it is a 3-star win with the trophy', () => {
    const lvl = getPlayLevel(1, 7);
    const many = Array.from({ length: 200 }, () => 'x');
    const r = settleRun({
      payload: { ...base, w: 1, l: 7 },
      words: ['cat', 'cats', 'dog', ...many],
      now: base.t + 20_000,
      // every word counts huge so HP is certainly reached
      isWord: (w) => dict.has(w),
      prevStars: 0,
      pointsFor: () => lvl.bossHp,
    });
    expect(r.ok && r.won).toBe(true);
    expect(r.ok && r.stars).toBe(3);
    expect(r.ok && r.rewards).toContain('boss-trophy-w1');
  });

  it('given a better replay, when settled, then only newly earned rewards are granted', () => {
    const r = settleRun({
      payload: { ...base, w: 1, l: 1 },
      words: ['cat', 'cats', 'dog'],
      now: base.t + 10_000,
      isWord: (w) => dict.has(w),
      prevStars: 1,
      pointsFor: () => 1000,
    });
    expect(r.ok && r.stars).toBe(3);
    expect(r.ok && r.rewards).toEqual(['rune-fragment']);
  });

  it('given an elite level, when damage reaches enemy HP, then it is a combat win with time stars', () => {
    const lvl = getPlayLevel(1, 4);
    const r = settleRun({
      payload: { ...base, w: 1, l: 4, k: 'elite' },
      words: ['cat'],
      now: base.t + 10_000,
      isWord: (w) => dict.has(w),
      prevStars: 0,
      pointsFor: () => lvl.enemyHp!,
    });
    expect(r.ok && r.won).toBe(true);
    expect(r.ok && r.stars).toBe(3);
  });

  it('given relics in the token, when settled, then damage is relic-modified', () => {
    const r = settleRun({
      payload: { ...base, w: 1, l: 1, r: ['twin-ink'] },
      words: ['cat', 'dog'],
      now: base.t + 10_000,
      isWord: (w) => dict.has(w),
      prevStars: 0,
    });
    expect(r.ok && r.score).toBe(wordPoints('cat') * 2 + wordPoints('dog'));
  });

  it('given a hunt, when fewer targets than huntCount are found, then it is a loss even with a big score', () => {
    const lvl = getPlayLevel(1, 2);
    expect(lvl.kind).toBe('hunt');
    const payload = { ...base, w: 1, l: 2, k: 'hunt' as const, tg: ['cats', 'dog', 'cat'] };
    const lose = settleRun({ payload, words: ['cats'], now: base.t + 5_000, isWord: (w) => dict.has(w), prevStars: 0, pointsFor: () => 999 });
    expect(lose.ok && lose.won).toBe(false);
    expect(lose.ok && lose.stars).toBe(0);
    expect(lose.ok && lose.targetsFound).toEqual(['cats']);
    const win = settleRun({ payload, words: ['cats', 'dog'], now: base.t + 5_000, isWord: (w) => dict.has(w), prevStars: 0 });
    expect(win.ok && win.won).toBe(true);
    expect(win.ok && win.stars).toBeGreaterThanOrEqual(1);
  });

  it('given a chain level, when words break the chain, then broken words score 0', () => {
    const r = settleRun({
      payload: { ...base, w: 2, l: 2, k: 'chain' },
      words: ['cat', 'dog'],
      now: base.t + 5_000,
      isWord: (w) => dict.has(w),
      prevStars: 0,
    });
    expect(r.ok && r.score).toBe(wordPoints('cat'));
  });

  it('given hourglass + time potions in the token, when submitted late, then the clock allowance grows', () => {
    const lvl = getPlayLevel(1, 1);
    const late = base.t + lvl.seconds * 1000 + GRACE_MS + 20_000;
    const plain = settleRun({ payload: { ...base, w: 1, l: 1 }, words: ['cat'], now: late, isWord: (w) => dict.has(w), prevStars: 0 });
    expect(plain.ok).toBe(false);
    const boosted = settleRun({ payload: { ...base, w: 1, l: 1, r: ['hourglass'], tp: 1 }, words: ['cat'], now: late, isWord: (w) => dict.has(w), prevStars: 0 });
    expect(boosted.ok).toBe(true);
  });
});
