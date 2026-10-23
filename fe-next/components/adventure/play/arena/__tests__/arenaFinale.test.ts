import { describe, it, expect } from 'vitest';
import { castImpactMs, deathBeats, finaleTiming, isFinisher } from '../arenaBeats';
import { arenaLayout } from '../arenaLayout';

describe('finaleTiming', () => {
  it('lets the killing word land before the foe dies', () => {
    expect(finaleTiming('butterflies', true).deathAtMs).toBe(castImpactMs('butterflies', false));
  });

  it('holds a boss kill banner a full second past the death so the freeze and bursts are seen', () => {
    const f = finaleTiming('planet', true);
    expect(f.bannerAtMs - f.deathAtMs).toBeGreaterThanOrEqual(1000);
  });

  it('never makes an elite kill faster than the old 1150ms banner', () => {
    expect(finaleTiming('cat', false).bannerAtMs).toBeGreaterThanOrEqual(1150);
  });

  it('keeps the loot flight inside the gap between death and banner', () => {
    for (const boss of [true, false]) {
      const f = finaleTiming('wizards', boss);
      expect(f.lootWindowMs).toBeGreaterThanOrEqual(500);
      expect(f.deathAtMs + f.lootWindowMs).toBeLessThan(f.bannerAtMs);
    }
  });
});

describe('deathBeats', () => {
  it('gives a boss a longer freeze and more staggered bursts than an elite', () => {
    const boss = deathBeats(true);
    const elite = deathBeats(false);
    expect(boss.length).toBeGreaterThan(elite.length);
    expect(boss[0].freezeMs).toBeGreaterThan(elite[0].freezeMs);
  });

  it('starts at once and ends before the banner can arrive', () => {
    for (const boss of [true, false]) {
      const b = deathBeats(boss);
      expect(b[0].atMs).toBe(0);
      expect([...b].sort((x, y) => x.atMs - y.atMs)).toEqual(b);
      expect(b[b.length - 1].atMs).toBeLessThan(800);
    }
  });
});

describe('isFinisher', () => {
  it('follows the hitTier CRIT rule, not a second length threshold', () => {
    expect(isFinisher('cat', 6)).toBe(false);
    expect(isFinisher('wizards', 60)).toBe(true);
  });
});

describe('arenaLayout boss stage', () => {
  it('makes a boss silhouette bigger than the same stage for an elite', () => {
    const elite = arenaLayout(352, 194, false);
    const boss = arenaLayout(352, 194, false, true);
    expect(boss.foe.h).toBeGreaterThan(elite.foe.h);
    expect(boss.foe.x).toBeGreaterThanOrEqual(0);
    expect(boss.foe.x + boss.foe.w).toBeLessThanOrEqual(352);
  });

  it('keeps the boss hand anchor on the hero side and above the floor', () => {
    const l = arenaLayout(352, 194, false, true);
    expect(l.foeHand.x).toBeLessThan(l.foe.x + l.foe.w / 2);
    expect(l.foeHand.y).toBeLessThan(l.groundY);
  });
});
