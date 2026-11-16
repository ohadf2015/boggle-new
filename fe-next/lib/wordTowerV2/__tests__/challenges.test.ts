import { describe, expect, it } from 'vitest';
import { CHALLENGE_BONUS, CHALLENGE_EVERY, CHALLENGE_FIRST, challengeAfter, challengeMet } from '../rush/challenges';
import { applyLanding, createRun } from '../run';

describe('floor challenges', () => {
  it('given a run, when floors land, then a challenge arms after the 3rd floor and every 4th after', () => {
    const armed = Array.from({ length: 20 }, (_, i) => (challengeAfter(i + 1, 42) ? i + 1 : null)).filter(Boolean);
    expect(armed[0]).toBe(CHALLENGE_FIRST);
    for (let i = 1; i < armed.length; i += 1) expect((armed[i] as number) - (armed[i - 1] as number)).toBe(CHALLENGE_EVERY);
  });

  it('given each kind, when judged, then only the asked-for landing meets it, and a miss never does', () => {
    expect(challengeMet({ kind: 'long', minLen: 5 }, 'good', 5)).toBe(true);
    expect(challengeMet({ kind: 'long', minLen: 5 }, 'good', 4)).toBe(false);
    expect(challengeMet({ kind: 'long', minLen: 5 }, 'miss', 8)).toBe(false);
    expect(challengeMet({ kind: 'perfect' }, 'good', 8)).toBe(false);
    expect(challengeMet({ kind: 'good' }, 'perfect', 3)).toBe(true);
    expect(challengeMet({ kind: 'good' }, 'sloppy', 3)).toBe(false);
  });

  it('given a met challenge, when the floor lands, then it pays the bonus and always drops a crate', () => {
    const run = createRun(7);
    const plain = applyLanding(run, { quality: 'good', wordLen: 6 });
    const met = applyLanding(run, { quality: 'good', wordLen: 6 }, { challenge: { kind: 'long', minLen: 5 } });
    expect(met.points - plain.points).toBe(CHALLENGE_BONUS);
    expect(met.reward).not.toBeNull();
  });
});
