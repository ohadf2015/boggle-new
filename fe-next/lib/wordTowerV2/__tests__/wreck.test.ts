import { describe, expect, it } from 'vitest';
import {
  MAX_BALLS,
  buildWreckWorld,
  cutBall,
  decodeRival,
  encodeRival,
  hangBall,
  stepWreck,
  wreckedCount,
} from '../wreck';
import { applyLanding, createRun } from '../run';

const WORDS = ['tower', 'slab', 'anchor', 'crane', 'brick', 'ledge', 'beam', 'stack'];

/** Step the world `ms` at 120Hz. */
const run = (w: ReturnType<typeof buildWreckWorld>, ms: number) => {
  for (let t = 0; t < ms; t += 1000 / 120) stepWreck(w, 1000 / 120);
};

describe('rival share link', () => {
  it('given a tower, when encoded and decoded, then round-trips', () => {
    expect(decodeRival(encodeRival({ name: 'דנה', words: ['שלום', 'בית'] }))).toEqual({ name: 'דנה', words: ['שלום', 'בית'] });
  });

  it('given garbage, when decoded, then null', () => {
    expect(decodeRival('%%%not-base64')).toBeNull();
    expect(decodeRival(btoa('{"name":1}'))).toBeNull();
    expect(decodeRival('')).toBeNull();
  });

  it('given hostile input, when decoded, then clamped to safe sizes', () => {
    const huge = encodeRival({ name: 'x'.repeat(200), words: Array.from({ length: 500 }, () => 'y'.repeat(99)) });
    const r = decodeRival(huge)!;
    expect(r.name.length).toBeLessThanOrEqual(20);
    expect(r.words.length).toBeLessThanOrEqual(30);
    expect(r.words.every((w) => w.length <= 15)).toBe(true);
  });

  it('given control characters, when decoded, then stripped', () => {
    expect(decodeRival(encodeRival({ name: 'a\u0000b\u202Ec', words: ['ok\u0007'] }))).toEqual({ name: 'abc', words: ['ok'] });
  });
});

describe('wreck world', () => {
  it('given rival words, when built, then the tower stands and nothing counts as wrecked', () => {
    const w = buildWreckWorld(WORDS);
    run(w, 800);
    expect(wreckedCount(w)).toBe(0);
    expect(w.tower.collapsed).toBe(false);
  });

  it('given a ball cut at the bottom of its swing, when it flies, then it smashes the tower', () => {
    // Given a standing tower and a hung ball
    const w = buildWreckWorld(WORDS);
    run(w, 600);
    hangBall(w);
    // When the ball swings to its lowest point (quarter period) and is cut
    run(w, w.quarterPeriodMs);
    cutBall(w);
    run(w, 2500);
    // Then a real chunk of the tower is down
    expect(wreckedCount(w)).toBeGreaterThanOrEqual(Math.ceil(WORDS.length * 0.3));
  });

  it('given a ball never cut, when time passes, then it swings but never reaches the tower', () => {
    const w = buildWreckWorld(WORDS);
    run(w, 600);
    hangBall(w);
    run(w, 4000);
    expect(wreckedCount(w)).toBe(0);
  });
});

describe('wrecking balls earned', () => {
  it('given a fresh run, when read, then two balls to start', () => {
    expect(createRun(1).balls).toBe(2);
  });

  it('given a 3-perfect streak, when landed, then a ball is earned', () => {
    let r = createRun(1);
    for (let i = 0; i < 3; i += 1) r = applyLanding(r, { quality: 'perfect', wordLen: 4 }).run;
    expect(r.balls).toBe(3);
  });

  it('given endless perfects, when landed, then balls are capped', () => {
    let r = createRun(1);
    for (let i = 0; i < 60; i += 1) r = applyLanding(r, { quality: 'perfect', wordLen: 4 }).run;
    expect(r.balls).toBe(MAX_BALLS);
  });
});
