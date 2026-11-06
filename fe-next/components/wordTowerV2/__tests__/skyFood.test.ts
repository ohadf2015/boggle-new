import { describe, expect, it } from 'vitest';
import { FOOD_KINDS } from '@/lib/wordTowerV2/biomes';
import { dripLength, foodBlink } from '../skyFood';
import { isCritter } from '../skyCritters';

describe('sky snacks', () => {
  it('given every snack and toy, when checked, then each is drawn as a critter with a face', () => {
    for (const kind of FOOD_KINDS) expect(isCritter(kind)).toBe(true);
  });

  it('given reduced motion (t=0), when read, then eyes stay open and the cheese does not drip', () => {
    expect(foodBlink(0, 0.4)).toBe(1);
    expect(dripLength(0, 0.4)).toBe(0);
  });

  it('given a few seconds, when sampled, then the snack blinks briefly and mostly keeps its eyes open', () => {
    const samples = Array.from({ length: 800 }, (_, i) => foodBlink(i / 100, 0.6));
    const closed = samples.filter((v) => v < 0.5).length;
    expect(closed).toBeGreaterThan(0);
    expect(closed / samples.length).toBeLessThan(0.1);
  });

  it('given the drip cycle, when sampled, then it grows and starts over', () => {
    expect(dripLength(1.2, 0)).toBeGreaterThan(dripLength(0.6, 0));
    expect(dripLength(2.41, 0)).toBeLessThan(0.05);
  });
});
