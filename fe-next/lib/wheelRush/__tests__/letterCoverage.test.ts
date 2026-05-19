import { describe, it, expect } from 'vitest';
import { classifyLetterCoverage } from '../letterCoverage';

describe('classifyLetterCoverage', () => {
  // 7-letter wheel: center A + C T R S N E
  const wheel = ['A', 'C', 'T', 'R', 'S', 'N', 'E'];

  it("returns 'all' when the word uses every distinct wheel letter (pangram)", () => {
    // CANTERS uses A C T R S N E — all 7 distinct letters
    expect(classifyLetterCoverage('CANTERS', wheel)).toBe('all');
  });

  it("returns 'all' regardless of letter casing / repeats", () => {
    // nectars → N E C T A R S = 7 distinct
    expect(classifyLetterCoverage('nectars', wheel)).toBe('all');
  });

  it("returns 'almost' when the word uses all-but-one distinct wheel letter", () => {
    // CANTER uses C A N T E R = 6 of 7 distinct (missing S)
    expect(classifyLetterCoverage('CANTER', wheel)).toBe('almost');
  });

  it("returns 'none' for an ordinary short word well under the threshold", () => {
    // CRANE = C R A N E = 5 distinct of 7 → below almost threshold (6)
    expect(classifyLetterCoverage('CRANE', wheel)).toBe('none');
  });

  it("never fires 'almost' on tiny wheels where 5-distinct coverage is impossible", () => {
    // 4-letter wheel: using 3 of 4 is total-1 but distinct < 5 → must stay 'none'
    expect(classifyLetterCoverage('CAT', ['A', 'C', 'T', 'S'])).toBe('none');
  });

  it("still returns 'all' on a tiny wheel when every letter is used", () => {
    expect(classifyLetterCoverage('CATS', ['A', 'C', 'T', 'S'])).toBe('all');
  });

  it('returns none for empty inputs', () => {
    expect(classifyLetterCoverage('', wheel)).toBe('none');
    expect(classifyLetterCoverage('CRANE', [])).toBe('none');
  });
});
