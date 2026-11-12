import { describe, expect, it } from 'vitest';
import { isPracticeRound, isRehearsalRound } from '../isPracticeRound';

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

describe('isRehearsalRound — the room says it is a rehearsal', () => {
  it('Given the explicit rehearsal flag and the practice seat dropped from the scores, When judged, Then it is a rehearsal', () => {
    expect(isRehearsalRound([{ isHost: true }], true)).toBe(true);
  });

  it('Given the explicit rehearsal flag but a real student in the scores, When judged, Then it is a real round', () => {
    expect(isRehearsalRound([{ isHost: true }, { isPractice: true }, {}], true)).toBe(false);
  });

  it('Given no explicit flag, When judged, Then it falls back to who played', () => {
    expect(isRehearsalRound([{ isHost: true }, { isBot: true }], undefined)).toBe(true);
    expect(isRehearsalRound([{ isHost: true }, {}], undefined)).toBe(false);
    expect(isRehearsalRound([{ isHost: true }], undefined)).toBe(false);
  });
});
