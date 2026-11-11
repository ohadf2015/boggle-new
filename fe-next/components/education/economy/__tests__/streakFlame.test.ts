import { afterEach, describe, expect, it } from 'vitest';
import { flameTier, useEconomyStreakStore, publishEconomyStreak, claimHudFlame } from '../streakFlame';

afterEach(() => useEconomyStreakStore.setState({ streak: 0, multiplier: 1, live: false, hudFlames: 0 }));

describe('flameTier: the flame grows with the streak', () => {
  it('Given no streak, Then there is no flame', () => {
    expect(flameTier(0)).toBe(0);
  });

  it('Given a short streak, Then a small flame', () => {
    expect(flameTier(1)).toBe(1);
    expect(flameTier(2)).toBe(1);
  });

  it('Given three in a row, Then the flame is hot', () => {
    expect(flameTier(3)).toBe(2);
    expect(flameTier(5)).toBe(2);
  });

  it('Given six or more, Then the flame blazes', () => {
    expect(flameTier(6)).toBe(3);
    expect(flameTier(40)).toBe(3);
  });
});

describe('economy streak store: one economy hook, read anywhere', () => {
  it('Given the dock publishes a snapshot, Then readers see its streak and multiplier', () => {
    publishEconomyStreak({ streak: 4, multiplier: 2 });
    expect(useEconomyStreakStore.getState()).toMatchObject({ streak: 4, multiplier: 2, live: true });
  });

  it('Given the dock leaves, Then the store goes quiet', () => {
    publishEconomyStreak({ streak: 4, multiplier: 2 });
    publishEconomyStreak(null);
    expect(useEconomyStreakStore.getState()).toMatchObject({ streak: 0, multiplier: 1, live: false });
  });

  it('Given a HUD flame mounts and unmounts, Then the count of HUD flames follows it', () => {
    const release = claimHudFlame();
    expect(useEconomyStreakStore.getState().hudFlames).toBe(1);
    release();
    expect(useEconomyStreakStore.getState().hudFlames).toBe(0);
  });
});
