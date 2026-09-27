import { describe, it, expect } from 'vitest';
import {
  getSeasonTwist,
  SEASON_CATALOG_SIZE,
  getCurrentSeasonDynamic,
  getCurrentSeason,
} from '../seasons';

describe('season twists + catalog', () => {
  it('gives every season a twist (key, emoji, title, blurb, scoreMultiplier)', () => {
    for (let id = 1; id <= SEASON_CATALOG_SIZE; id++) {
      const t = getSeasonTwist(id);
      expect(t.key).toBeTruthy();
      expect(t.emoji).toBeTruthy();
      expect(t.title).toBeTruthy();
      expect(t.blurb).toBeTruthy();
      expect(typeof t.scoreMultiplier).toBe('number');
    }
  });

  it('has a catalog of distinct twists (no duplicate keys within one cycle)', () => {
    const keys = Array.from({ length: SEASON_CATALOG_SIZE }, (_, i) => getSeasonTwist(i + 1).key);
    expect(new Set(keys).size).toBe(SEASON_CATALOG_SIZE);
    expect(SEASON_CATALOG_SIZE).toBeGreaterThanOrEqual(12);
  });

  it('cycles: season N and season N+catalogSize share the same twist', () => {
    expect(getSeasonTwist(1).key).toBe(getSeasonTwist(1 + SEASON_CATALOG_SIZE).key);
    expect(getSeasonTwist(7).key).toBe(getSeasonTwist(7 + SEASON_CATALOG_SIZE).key);
  });

  it('keeps scoreMultiplier neutral-or-positive (twists are atmospheric, never punitive)', () => {
    for (let id = 1; id <= SEASON_CATALOG_SIZE; id++) {
      expect(getSeasonTwist(id).scoreMultiplier).toBeGreaterThanOrEqual(1);
    }
  });

  it('exposes twist + gridSkinClass on the live season object', () => {
    const s = getCurrentSeasonDynamic(new Date('2026-06-15T00:00:00Z')); // season 3
    expect(s.twist).toBeDefined();
    expect(s.twist.key).toBe(getSeasonTwist(s.id).key);
    expect(s.gridSkinClass).toMatch(/^season-skin-/);
  });

  it('preserves the existing identities of seasons 1-6 (names unchanged)', () => {
    // Season 3 is the active "Vocab Victors" — must not drift.
    const s3 = getCurrentSeasonDynamic(new Date('2026-06-15T00:00:00Z'));
    expect(s3.id).toBe(3);
    expect(s3.theme).toBe('Vocab Victors');
    expect(s3.accentColor).toBe('#00FFFF');
    // Legacy quarterly accessor stays intact too.
    expect(getCurrentSeason(new Date('2026-02-15T00:00:00Z')).theme).toBe('Word Warriors');
  });
});
