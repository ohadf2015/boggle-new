import { describe, it, expect } from 'vitest';
import { getPlayLevel, starsForScore, bossStarsForElapsed, BOSS_LEVEL } from '../levels';
import { scoreRun, wordPoints } from '../scoreRun';
import { signAttempt, verifyAttempt } from '../attemptToken';
import { bossPhase, bossAttackIntervalMs } from '../boss';

describe('getPlayLevel', () => {
  it('given a normal level, when read, then it has rising star thresholds and no boss', () => {
    const lvl = getPlayLevel(1, 1);
    expect(lvl.isBoss).toBe(false);
    expect(lvl.stars[0]).toBeGreaterThan(0);
    expect(lvl.stars[1]).toBeGreaterThan(lvl.stars[0]);
    expect(lvl.stars[2]).toBeGreaterThan(lvl.stars[1]);
  });

  it('given level 7, when read, then it is a boss with HP and longer clock', () => {
    const lvl = getPlayLevel(3, BOSS_LEVEL);
    expect(lvl.isBoss).toBe(true);
    expect(lvl.bossHp).toBeGreaterThan(0);
    expect(lvl.seconds).toBeGreaterThan(getPlayLevel(3, 1).seconds);
  });

  it('given later worlds, when compared, then they are harder and bigger', () => {
    expect(getPlayLevel(10, 1).stars[0]).toBeGreaterThan(getPlayLevel(1, 1).stars[0]);
    expect(getPlayLevel(10, 1).size).toBeGreaterThanOrEqual(getPlayLevel(1, 1).size);
  });

  it('given out-of-range input, when read, then it throws', () => {
    expect(() => getPlayLevel(0, 1)).toThrow();
    expect(() => getPlayLevel(1, 8)).toThrow();
    expect(() => getPlayLevel(11, 1)).toThrow();
  });
});

describe('starsForScore', () => {
  it('maps score onto 0-3 stars by threshold', () => {
    const t: [number, number, number] = [100, 200, 300];
    expect(starsForScore(99, t)).toBe(0);
    expect(starsForScore(100, t)).toBe(1);
    expect(starsForScore(250, t)).toBe(2);
    expect(starsForScore(999, t)).toBe(3);
  });
});

describe('bossStarsForElapsed', () => {
  it('rewards a fast kill with more stars', () => {
    expect(bossStarsForElapsed(30_000, 120)).toBe(3);
    expect(bossStarsForElapsed(95_000, 120)).toBe(2);
    expect(bossStarsForElapsed(118_000, 120)).toBe(1);
  });
});

describe('scoreRun', () => {
  const grid = [
    ['c', 'a', 't', 's'],
    ['x', 'x', 'x', 'x'],
    ['d', 'o', 'g', 'x'],
    ['x', 'x', 'x', 'x'],
  ];
  const dict = new Set(['cat', 'cats', 'dog', 'act']);
  const isWord = (w: string) => dict.has(w);

  it('given valid on-board words, when scored, then each counts once', () => {
    const r = scoreRun({ grid, words: ['cat', 'CAT', 'cats', 'dog'], language: 'en', minLength: 3, isWord });
    expect(r.valid.sort()).toEqual(['cat', 'cats', 'dog']);
    expect(r.score).toBe(wordPoints('cat') + wordPoints('cats') + wordPoints('dog'));
  });

  it('given words off the board, not in dictionary or too short, when scored, then they are dropped', () => {
    const r = scoreRun({ grid, words: ['act', 'zzz', 'at', 'god'], language: 'en', minLength: 3, isWord });
    expect(r.valid).toEqual([]);
    expect(r.score).toBe(0);
  });

  it('given a flood of words, when scored, then it caps the list', () => {
    const r = scoreRun({ grid, words: Array(5000).fill('cat'), language: 'en', minLength: 3, isWord });
    expect(r.valid).toEqual(['cat']);
  });
});

describe('attemptToken', () => {
  const secret = 'test-secret';
  const payload = { u: 'user-1', w: 2, l: 3, g: [['a', 'b'], ['c', 'd']], lang: 'en', t: 1_000 };

  it('round-trips a signed payload', () => {
    expect(verifyAttempt(signAttempt(payload, secret), secret)).toEqual(payload);
  });

  it('rejects a tampered payload or wrong secret', () => {
    const token = signAttempt(payload, secret);
    const [body, sig] = token.split('.');
    const forged = Buffer.from(JSON.stringify({ ...payload, w: 9 })).toString('base64url');
    expect(verifyAttempt(`${forged}.${sig}`, secret)).toBeNull();
    expect(verifyAttempt(`${body}.${sig}`, 'other')).toBeNull();
    expect(verifyAttempt('garbage', secret)).toBeNull();
  });

  it('refuses to sign without a secret', () => {
    expect(() => signAttempt(payload, '')).toThrow();
  });
});

describe('boss', () => {
  it('reports phase by remaining HP', () => {
    expect(bossPhase(100, 100)).toBe('idle');
    expect(bossPhase(30, 100)).toBe('enraged');
    expect(bossPhase(0, 100)).toBe('defeated');
  });

  it('attacks faster in later worlds and when enraged', () => {
    expect(bossAttackIntervalMs(10, false)).toBeLessThan(bossAttackIntervalMs(1, false));
    expect(bossAttackIntervalMs(5, true)).toBeLessThan(bossAttackIntervalMs(5, false));
  });
});
