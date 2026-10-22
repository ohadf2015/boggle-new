import { describe, it, expect } from 'vitest';
import { LOBBY_ROSTER_TIERS, lobbyRosterLayout } from '@/components/education/live/eduLobbyRosterModel';

describe('lobbyRosterLayout', () => {
  it('given a small group, when laid out, then chips stay big with three columns', () => {
    expect(lobbyRosterLayout(6)).toBe(LOBBY_ROSTER_TIERS[0]);
  });

  it('given a 25-student class, when laid out, then it gets a denser tier than a small group', () => {
    const tier = lobbyRosterLayout(25);
    expect(tier).not.toBe(LOBBY_ROSTER_TIERS[0]);
    expect(tier.upTo).toBeGreaterThanOrEqual(25);
  });

  it('given a growing room, when each student arrives, then the tier never gets less dense', () => {
    let previous = 0;
    for (let count = 0; count <= 60; count++) {
      const index = LOBBY_ROSTER_TIERS.indexOf(lobbyRosterLayout(count));
      expect(index).toBeGreaterThanOrEqual(previous);
      previous = index;
    }
  });

  it('given any class up to 40, when laid out, then the tier fits every seat without scrolling', () => {
    for (const count of [1, 12, 25, 32, 40]) {
      const tier = lobbyRosterLayout(count);
      expect(tier.scrolls).toBe(false);
    }
  });

  it('given a room far past a class, when laid out, then the list may scroll as a last resort', () => {
    expect(lobbyRosterLayout(80).scrolls).toBe(true);
  });

  it('given every tier, when its classes are read, then each is a whole literal string (Tailwind v4 sees only verbatim utilities)', () => {
    for (const tier of LOBBY_ROSTER_TIERS) {
      for (const cls of [tier.grid, tier.chip, tier.avatar]) {
        expect(cls).not.toMatch(/\$\{|undefined/);
        expect(cls.length).toBeGreaterThan(0);
      }
    }
  });
});
