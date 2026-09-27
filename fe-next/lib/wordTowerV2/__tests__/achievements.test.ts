import { beforeEach, describe, expect, it } from 'vitest';
import {
  ACHIEVEMENTS,
  type RunStats,
  emptyStats,
  loadUnlocked,
  newlyUnlocked,
  progressOf,
  saveUnlocked,
} from '../achievements';

const stats = (over: Partial<RunStats>): RunStats => ({ ...emptyStats(), ...over });

describe('newlyUnlocked', () => {
  it('given a fresh run, when checked, then nothing unlocks', () => {
    expect(newlyUnlocked(emptyStats(), new Set())).toEqual([]);
  });

  it('given the first floor, when checked, then the first badge unlocks once', () => {
    const got = newlyUnlocked(stats({ floors: 1 }), new Set());
    expect(got).toContain('groundbreaker');
    expect(newlyUnlocked(stats({ floors: 1 }), new Set(got))).not.toContain('groundbreaker');
  });

  it('given a big run, when checked, then every tier it passed unlocks together', () => {
    const got = newlyUnlocked(stats({ floors: 12, bestCombo: 5, longestWord: 8, tenants: 60 }), new Set());
    expect(got).toEqual(expect.arrayContaining(['groundbreaker', 'fiveStory', 'highRise', 'steadyHands', 'wordsmith', 'fullHouse']));
  });

  it('given every badge, when read, then ids are unique (they are i18n keys) and each is reachable', () => {
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
    const maxed = stats({ floors: 99, bestCombo: 99, longestWord: 99, tenants: 999, crates: 99, welds: 9, peakFloors: 99, perfects: 99 });
    expect(newlyUnlocked(maxed, new Set()).length).toBe(ACHIEVEMENTS.length);
  });
});

describe('progressOf', () => {
  it('given a partial run, when measured, then progress is capped at the goal', () => {
    const a = ACHIEVEMENTS.find((x) => x.id === 'highRise')!;
    expect(progressOf(a, stats({ floors: 4 }))).toEqual({ current: 4, goal: a.goal });
    expect(progressOf(a, stats({ floors: 400 })).current).toBe(a.goal);
  });
});

describe('persistence', () => {
  beforeEach(() => window.localStorage.clear());

  it('given saved badges, when loaded, then the same set comes back', () => {
    saveUnlocked(new Set(['groundbreaker', 'fiveStory']));
    expect([...loadUnlocked()].sort()).toEqual(['fiveStory', 'groundbreaker']);
  });

  it('given junk in storage, when loaded, then an empty set, not a crash', () => {
    window.localStorage.setItem('wordTowerV2.achievements', '{nope');
    expect(loadUnlocked().size).toBe(0);
  });

  it('given unknown ids in storage, when loaded, then they are dropped', () => {
    window.localStorage.setItem('wordTowerV2.achievements', JSON.stringify(['groundbreaker', 'ghost']));
    expect([...loadUnlocked()]).toEqual(['groundbreaker']);
  });
});
