import { describe, it, expect } from 'vitest';
import {
  TOWER_SKINS,
  DEFAULT_SKIN_ID,
  towerSkin,
  skinPalette,
  isSkinUnlocked,
  unlockedSkinIds,
  newlyUnlockedSkin,
  type TowerSkinId,
} from '../skins';
import { ZONE_MATERIAL } from '../blockGrade';
import { WORD_TOWER_BIOMES } from '@/shared/constants/wordTowerConstants';

describe('tower skins', () => {
  it('has the classic skin unlocked from the start (threshold 0) and as the default', () => {
    expect(DEFAULT_SKIN_ID).toBe('classic');
    expect(towerSkin('classic').unlockAtM).toBe(0);
    expect(isSkinUnlocked('classic', 0)).toBe(true);
  });

  it("classic skin === the existing zone materials (no visual change for new players)", () => {
    const pal = skinPalette('classic');
    for (const biome of WORD_TOWER_BIOMES) {
      expect(pal[biome.id]).toBe(ZONE_MATERIAL[biome.id]);
    }
  });

  it('every skin defines one material per biome zone', () => {
    for (const skin of TOWER_SKINS) {
      for (const biome of WORD_TOWER_BIOMES) {
        expect(typeof skin.palette[biome.id]).toBe('number');
      }
    }
  });

  it('skins unlock monotonically by personal-best height', () => {
    // Climbing past a skin's threshold unlocks it and never re-locks a lower one.
    const lowM = 0;
    const highM = 5000;
    const lowUnlocked = unlockedSkinIds(lowM);
    const highUnlocked = unlockedSkinIds(highM);
    expect(lowUnlocked).toEqual(['classic']); // only the freebie at ground level
    // every skin is reachable by 5000m
    expect(highUnlocked.length).toBe(TOWER_SKINS.length);
    // low set is a subset of high set (no re-locking)
    for (const id of lowUnlocked) expect(highUnlocked).toContain(id);
  });

  it('isSkinUnlocked gates exactly on the threshold', () => {
    const gold = TOWER_SKINS.find((s) => s.id !== 'classic')!;
    expect(isSkinUnlocked(gold.id, gold.unlockAtM - 0.01)).toBe(false);
    expect(isSkinUnlocked(gold.id, gold.unlockAtM)).toBe(true);
  });

  it('newlyUnlockedSkin returns the skin crossed on a new best (the variable-reward moment)', () => {
    const target = TOWER_SKINS.find((s) => s.unlockAtM > 0)!;
    // crossing the threshold this run reveals exactly that skin
    expect(newlyUnlockedSkin(target.unlockAtM - 10, target.unlockAtM + 1)?.id).toBe(target.id);
    // no crossing → nothing
    expect(newlyUnlockedSkin(target.unlockAtM + 1, target.unlockAtM + 50)).toBeNull();
    // already above → nothing (no double-grant)
    expect(newlyUnlockedSkin(0, 0)).toBeNull();
  });

  it('newlyUnlockedSkin surfaces only the HIGHEST skin when several thresholds are jumped at once', () => {
    const sorted = [...TOWER_SKINS].filter((s) => s.unlockAtM > 0).sort((a, b) => a.unlockAtM - b.unlockAtM);
    if (sorted.length >= 2) {
      const top = sorted[sorted.length - 1]!;
      const got = newlyUnlockedSkin(0, top.unlockAtM + 1);
      expect(got?.id).toBe(top.id); // headline the best one earned
    }
  });

  it('skin ids are unique', () => {
    const ids = TOWER_SKINS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('unknown skin id falls back to classic palette (defensive)', () => {
    expect(skinPalette('totally-not-a-skin' as TowerSkinId)).toEqual(skinPalette('classic'));
  });
});
