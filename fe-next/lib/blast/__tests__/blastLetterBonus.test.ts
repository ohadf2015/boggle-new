import { describe, it, expect } from 'vitest';
import { blastLetterBonus } from '../blastLetterBonus';

describe('blastLetterBonus', () => {
  it('is deterministic — same word, same bonus (no random desync)', () => {
    expect(blastLetterBonus('QUIZ')).toBe(blastLetterBonus('QUIZ'));
  });

  it('rewards rare letters more than common ones', () => {
    // QUIZ (Q10+U1+I1+Z10) should beat a same-length all-common word.
    expect(blastLetterBonus('QUIZ')).toBeGreaterThan(blastLetterBonus('RATE'));
  });

  it('produces non-round, word-specific values', () => {
    // Organic totals: a 5-letter word lands off the round BASE_SCORES grid.
    const bonus = blastLetterBonus('CRANE');
    expect(bonus).toBeGreaterThan(0);
    expect(bonus % 10).not.toBe(0); // not a round multiple of 10
  });

  it('handles empty / falsy input safely', () => {
    expect(blastLetterBonus('')).toBe(0);
  });
});
