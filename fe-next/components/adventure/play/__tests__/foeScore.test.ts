import { describe, it, expect } from 'vitest';
import { foeScore } from '../foeScore';

describe('foeScore — the score the level foe is drawn from', () => {
  it('given a classic level, then the foe takes every point', () => {
    expect(foeScore({ score: 200, top: 140, kind: 'classic', huntMet: false })).toBe(200);
  });
  it('given a hunt with its goal unmet, then the foe clings to 1 HP however high the score', () => {
    expect(foeScore({ score: 200, top: 140, kind: 'hunt', huntMet: false })).toBe(139);
    expect(foeScore({ score: 60, top: 140, kind: 'hunt', huntMet: false })).toBe(60);
  });
  it('given a hunt with its goal met, then the foe can fall', () => {
    expect(foeScore({ score: 200, top: 140, kind: 'hunt', huntMet: true })).toBe(200);
  });
});
