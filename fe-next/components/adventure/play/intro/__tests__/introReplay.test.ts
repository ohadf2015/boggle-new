import { describe, it, expect, beforeEach } from 'vitest';
import { rememberLoss, isReplay, clearReplay } from '../introReplay';

describe('introReplay', () => {
  beforeEach(() => clearReplay());

  it('given a lost fight, when the same fight is dealt again, then it is a replay', () => {
    rememberLoss(1, 'r0l0');
    expect(isReplay(1, 'r0l0')).toBe(true);
  });

  it('given a lost fight, when a different fight or world is dealt, then the intro still plays', () => {
    rememberLoss(1, 'r0l0');
    expect(isReplay(1, 'r1l0')).toBe(false);
    expect(isReplay(2, 'r0l0')).toBe(false);
  });

  it('given a replay that has begun, when the same fight comes back without a new loss, then the intro plays', () => {
    rememberLoss(1, 1);
    clearReplay();
    expect(isReplay(1, 1)).toBe(false);
  });
});
