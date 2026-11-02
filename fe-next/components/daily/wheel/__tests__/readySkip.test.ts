import { describe, expect, it } from 'vitest';
import { wordWheelSkipsReady } from '../readySkip';

describe('wordWheelSkipsReady', () => {
  it('skips for ?start=1 and for returning players, not for practice or catch-up', () => {
    expect(wordWheelSkipsReady({ startParam: true, hasEverPlayed: false, isCatchup: false, isPractice: false })).toBe(true);
    expect(wordWheelSkipsReady({ startParam: false, hasEverPlayed: true, isCatchup: false, isPractice: false })).toBe(true);
    expect(wordWheelSkipsReady({ startParam: false, hasEverPlayed: false, isCatchup: false, isPractice: false })).toBe(false);
    expect(wordWheelSkipsReady({ startParam: true, hasEverPlayed: false, isCatchup: true, isPractice: false })).toBe(false);
    expect(wordWheelSkipsReady({ startParam: true, hasEverPlayed: false, isCatchup: false, isPractice: true })).toBe(false);
  });
});
