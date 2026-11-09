import { describe, expect, it } from 'vitest';
import { isPracticeRound } from '../isPracticeRound';

describe('isPracticeRound', () => {
  it('is a practice round when only bots played', () => {
    expect(isPracticeRound([{ isHost: true }, { isBot: true }, { isBot: true }])).toBe(true);
  });

  it("counts the teacher's practice seat as practice, not as a student", () => {
    expect(isPracticeRound([{ isHost: true }, { isPractice: true }, { isBot: true }])).toBe(true);
    expect(isPracticeRound([{ isPractice: true }])).toBe(true);
  });

  it('is a real round once one student played', () => {
    expect(isPracticeRound([{ isPractice: true }, { isBot: true }, {}])).toBe(false);
  });

  it('is not a practice round with nobody seated', () => {
    expect(isPracticeRound([{ isHost: true }])).toBe(false);
    expect(isPracticeRound(undefined)).toBe(false);
  });
});
