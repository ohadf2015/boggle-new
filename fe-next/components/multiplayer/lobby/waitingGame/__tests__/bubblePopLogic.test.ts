// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { COMBO_WINDOW_MS, MAX_COMBO, START, makeBubble, missBubble, readBest, scorePop, spawnDelay, writeBest } from '../bubblePopLogic';

describe('bubblePopLogic', () => {
  it('Given a fresh round, When a bubble pops, Then it scores 1 at combo 1', () => {
    expect(scorePop(START, 'bubble', 1000)).toEqual({ score: 1, combo: 1, lastPopAt: 1000 });
  });

  it('Given a pop, When the next pops inside the combo window, Then the combo climbs and multiplies points', () => {
    const a = scorePop(START, 'bubble', 1000);
    const b = scorePop(a, 'bubble', 1000 + COMBO_WINDOW_MS - 1);
    expect(b).toMatchObject({ combo: 2, score: 1 + 2 });
  });

  it('Given a pop, When the next comes after the window, Then the combo resets to 1', () => {
    const a = scorePop(scorePop(START, 'bubble', 0), 'bubble', 100);
    expect(scorePop(a, 'bubble', 100 + COMBO_WINDOW_MS + 1).combo).toBe(1);
  });

  it('caps the combo and makes a star worth 5 base points', () => {
    let s = START;
    for (let i = 0; i < 10; i++) s = scorePop(s, 'bubble', i * 100);
    expect(s.combo).toBe(MAX_COMBO);
    expect(scorePop(s, 'star', 1000).score - s.score).toBe(5 * MAX_COMBO);
  });

  it('Given a combo, When a bubble escapes, Then the combo breaks but the score stays', () => {
    const s = scorePop(scorePop(START, 'bubble', 0), 'bubble', 10);
    expect(missBubble(s)).toEqual({ score: s.score, combo: 0, lastPopAt: null });
  });

  it('makes bubbles inside the arena and spawns faster as the round goes on', () => {
    const b = makeBubble(7, () => 0.999);
    expect(b.id).toBe(7);
    expect(b.x).toBeGreaterThanOrEqual(10);
    expect(b.x).toBeLessThanOrEqual(90);
    expect(makeBubble(1, () => 0.01).kind).toBe('star');
    expect(spawnDelay(15000)).toBeLessThan(spawnDelay(0));
  });

  describe('local best', () => {
    beforeEach(() => localStorage.clear());

    it('persists only a higher score', () => {
      expect(readBest()).toBe(0);
      expect(writeBest(12)).toBe(true);
      expect(writeBest(5)).toBe(false);
      expect(readBest()).toBe(12);
    });

    it('survives storage that throws', () => {
      const get = Storage.prototype.getItem;
      Storage.prototype.getItem = () => { throw new Error('blocked'); };
      try {
        expect(readBest()).toBe(0);
      } finally {
        Storage.prototype.getItem = get;
      }
    });
  });
});
