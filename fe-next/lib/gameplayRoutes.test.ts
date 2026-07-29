import { describe, it, expect } from 'vitest';
import { isGameplayPath } from './gameplayRoutes';

describe('isGameplayPath', () => {
  it('matches the core game-mode routes (with locale prefix)', () => {
    expect(isGameplayPath('/en/singleplayer')).toBe(true);
    expect(isGameplayPath('/he/multiplayer')).toBe(true);
    expect(isGameplayPath('/es/blast/v2')).toBe(true);
    expect(isGameplayPath('/en/word-craft')).toBe(true);
    expect(isGameplayPath('/en/crossword')).toBe(true);
    expect(isGameplayPath('/sv/adventure/level-3')).toBe(true);
    expect(isGameplayPath('/en/connections/daily')).toBe(true);
    expect(isGameplayPath('/en/daily/word-wheel')).toBe(true);
    expect(isGameplayPath('/ja/party/abc/play')).toBe(true);
  });

  it('matches without a locale prefix', () => {
    expect(isGameplayPath('/singleplayer')).toBe(true);
    expect(isGameplayPath('/blast')).toBe(true);
  });

  it('does NOT match marketing / menu / account routes', () => {
    expect(isGameplayPath('/en')).toBe(false);
    expect(isGameplayPath('/he')).toBe(false);
    expect(isGameplayPath('/en/')).toBe(false);
    expect(isGameplayPath('/en/settings')).toBe(false);
    expect(isGameplayPath('/en/leaderboard')).toBe(false);
    expect(isGameplayPath('/en/admin')).toBe(false);
    expect(isGameplayPath('/en/profile')).toBe(false);
  });

  it('does not partial-match a longer non-gameplay segment', () => {
    // "singleplayer-stats" must not match the "singleplayer" prefix.
    expect(isGameplayPath('/en/singleplayer-stats')).toBe(false);
    expect(isGameplayPath('/en/blastoff')).toBe(false);
  });

  it('handles empty / nullish input', () => {
    expect(isGameplayPath('')).toBe(false);
    expect(isGameplayPath(null)).toBe(false);
    expect(isGameplayPath(undefined)).toBe(false);
  });
});
