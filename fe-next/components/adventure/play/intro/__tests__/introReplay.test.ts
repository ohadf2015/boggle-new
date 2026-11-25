import { describe, it, expect, beforeEach } from 'vitest';
import { rememberLoss, isReplay, clearReplay } from '../introReplay';

const classic1 = { level: 1, kind: 'classic' as const };

describe('introReplay', () => {
  beforeEach(() => clearReplay());

  it('given a lost fight, when the same fight is dealt again, then it is a replay', () => {
    rememberLoss(1, 'r0l0', classic1);
    expect(isReplay(1, 'r0l0', classic1)).toBe(true);
  });

  it('given a lost fight, when another node, world or board is dealt, then the intro still plays', () => {
    rememberLoss(1, 'r0l0', classic1);
    expect(isReplay(1, 'r1l0', classic1)).toBe(false);
    expect(isReplay(2, 'r0l0', classic1)).toBe(false);
    expect(isReplay(1, 'r0l0', { level: 2, kind: 'hunt' })).toBe(false);
  });

  it('given a replay that has begun, when the same fight comes back without a new loss, then the intro plays', () => {
    rememberLoss(1, null, classic1);
    clearReplay();
    expect(isReplay(1, null, classic1)).toBe(false);
  });
});
