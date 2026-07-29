import { describe, it, expect } from 'vitest';
import { MAX_HEAT, incrementHeat, decrementHeat, isRushActive } from '../heatMeter';

describe('incrementHeat', () => {
  it('increments from 0', () => expect(incrementHeat(0)).toBe(1));
  it('caps at MAX_HEAT', () => expect(incrementHeat(MAX_HEAT)).toBe(MAX_HEAT));
  it('increments mid-range', () => expect(incrementHeat(1)).toBe(2));
});

describe('decrementHeat', () => {
  it('decrements from max', () => expect(decrementHeat(MAX_HEAT)).toBe(MAX_HEAT - 1));
  it('floors at 0', () => expect(decrementHeat(0)).toBe(0));
  it('decrements mid-range', () => expect(decrementHeat(2)).toBe(1));
});

describe('isRushActive', () => {
  it('false below max', () => expect(isRushActive(MAX_HEAT - 1)).toBe(false));
  it('true at max', () => expect(isRushActive(MAX_HEAT)).toBe(true));
  it('false at 0', () => expect(isRushActive(0)).toBe(false));
});
