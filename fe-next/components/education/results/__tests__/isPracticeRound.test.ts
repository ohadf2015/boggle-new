import { describe, it, expect } from 'vitest';
import { isPracticeRound } from '../isPracticeRound';

describe('isPracticeRound', () => {
  it('Given every player was a bot, Then the round is a practice round', () => {
    expect(isPracticeRound([{ isBot: true }, { isBot: true }])).toBe(true);
  });

  it('Given one real student played, Then it is a real class round', () => {
    expect(isPracticeRound([{ isBot: true }, { isBot: false }])).toBe(false);
  });

  it('Given bots played and the host sat in the scores, as the live payload sends it, Then it is still a practice round', () => {
    expect(isPracticeRound([{ isBot: true }, { isBot: true }, { isBot: false, isHost: true }])).toBe(true);
  });

  it('Given only the host is in the scores, Then it is not treated as practice', () => {
    expect(isPracticeRound([{ isBot: false, isHost: true }])).toBe(false);
  });

  it('Given no player list, Then it is not treated as practice', () => {
    expect(isPracticeRound(undefined)).toBe(false);
    expect(isPracticeRound([])).toBe(false);
  });
});
