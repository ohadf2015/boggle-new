import { describe, it, expect } from 'vitest';
import { popFor, rareTierFor, COACH_IDLE_HINT_SEC, COACH_ROUND_SECONDS } from '../roundPops';

const base = { points: 10, multiplier: 1, validCount: 3, coach: false };

describe('popFor', () => {
  it('celebrates the coached first word above everything else', () => {
    expect(popFor({ ...base, word: 'cat', validCount: 1, coach: true, multiplier: 2 })?.kind).toBe('first');
  });

  it('does not treat a normal first word as a coach moment', () => {
    expect(popFor({ ...base, word: 'cat', validCount: 1 })).toBeNull();
  });

  it('pops a golden word', () => {
    expect(popFor({ ...base, word: 'cat', multiplier: 2, points: 20 })).toMatchObject({ kind: 'golden', points: 20 });
  });

  it('pops a rare word and stays quiet for a common one', () => {
    const rare = ['jazz', 'quiz', 'fizzy', 'zax'].find((w) => rareTierFor(w));
    expect(rare).toBeTruthy();
    expect(popFor({ ...base, word: rare! })?.kind).toBe('rare');
    expect(rareTierFor('ate')).toBeNull();
    expect(popFor({ ...base, word: 'ate' })).toBeNull();
  });

  it('keeps the coach timings gentle', () => {
    expect(COACH_IDLE_HINT_SEC).toBe(10);
    expect(COACH_ROUND_SECONDS).toBeLessThan(60);
  });
});
