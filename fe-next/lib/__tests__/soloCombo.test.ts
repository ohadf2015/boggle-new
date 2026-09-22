import { describe, expect, it } from 'vitest';
import {
  applySubmission,
  awardedWordPoints,
  initialSoloCombo,
  type SoloComboState,
} from '../soloCombo';

function oks(count: number, gapMs = 1000): SoloComboState {
  let state = initialSoloCombo();
  for (let i = 0; i < count; i++) {
    state = applySubmission(state, 'ok', 1_000 + i * gapMs);
  }
  return state;
}

describe('soloCombo', () => {
  it('starts at streak 0, x1, no praise', () => {
    expect(initialSoloCombo()).toEqual({
      streak: 0, multiplier: 1, praiseKey: null, lastOkMs: null,
    });
  });

  it('only ok extends the streak; dup, invalid and short reset it to 0', () => {
    const hot = oks(5);
    expect(hot.streak).toBe(5);
    expect(applySubmission(hot, 'dup', 7_000).streak).toBe(0);
    expect(applySubmission(hot, 'invalid', 7_000).streak).toBe(0);
    expect(applySubmission(hot, 'short', 7_000).streak).toBe(0);
    expect(applySubmission(hot, 'dup', 7_000).praiseKey).toBeNull();
  });

  it('a gap of exactly 8s does not break the chain, but 8s+1ms does', () => {
    const first = applySubmission(initialSoloCombo(), 'ok', 0);
    const still = applySubmission(first, 'ok', 8000);
    expect(still.streak).toBe(2);
    const broken = applySubmission(first, 'ok', 8001);
    expect(broken.streak).toBe(1);
    expect(broken.multiplier).toBe(1);
  });

  it('an ok after a gap starts a fresh streak at 1 instead of staying at 0', () => {
    const first = applySubmission(initialSoloCombo(), 'ok', 0);
    const after = applySubmission(first, 'ok', 9000);
    expect(after.streak).toBe(1);
    expect(after.lastOkMs).toBe(9000);
  });

  it('multiplier is x1, x2 at streak 4, x3 at streak 8, and caps at x3', () => {
    expect(oks(0).multiplier).toBe(1);
    expect(oks(3).multiplier).toBe(1);
    expect(oks(4).multiplier).toBe(2);
    expect(oks(7).multiplier).toBe(2);
    expect(oks(8).multiplier).toBe(3);
    expect(oks(12).multiplier).toBe(3);
  });

  it('praise ladder holds the highest rung reached and is null below 3', () => {
    expect(oks(2).praiseKey).toBeNull();
    expect(oks(3).praiseKey).toBe('singlePlayer.praise.warm');
    expect(oks(5).praiseKey).toBe('singlePlayer.praise.warm');
    expect(oks(6).praiseKey).toBe('singlePlayer.praise.hot');
    expect(oks(10).praiseKey).toBe('singlePlayer.praise.rampage');
    expect(oks(14).praiseKey).toBe('singlePlayer.praise.rampage');
    expect(oks(15).praiseKey).toBe('singlePlayer.praise.legendary');
    expect(oks(16).praiseKey).toBe('singlePlayer.praise.legendary');
  });

  it('awards base points times the multiplier of the streak AFTER the word', () => {
    let state = initialSoloCombo();
    const awarded: number[] = [];
    for (let i = 0; i < 8; i++) {
      state = applySubmission(state, 'ok', 5_000 + i * 500);
      awarded.push(awardedWordPoints(10, state.multiplier));
    }
    expect(awarded.slice(0, 3)).toEqual([10, 10, 10]);
    expect(awarded[3]).toBe(20);
    expect(awarded[7]).toBe(30);
    expect(awardedWordPoints(15, 1)).toBe(15);
  });
});
