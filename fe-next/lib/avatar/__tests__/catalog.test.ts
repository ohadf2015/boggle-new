import { describe, it, expect } from 'vitest';
import {
  AVATAR_CATALOG_TABS,
  PART_CATEGORIES,
  getCatalogParts,
  getCatalogPart,
  getPalette,
  PALETTE_IDS,
  catalogPartKey,
} from '../catalog';
import { customAvatarSchema, DEFAULT_AVATAR_CONFIG } from '@/shared/types/customAvatar';
import { getPartRarity } from '../rarity';
import { LEVEL_UNLOCK_LADDER } from '../unlocks';

describe('avatar catalog', () => {
  it('every listed part id is a valid config value for its field', () => {
    for (const cat of PART_CATEGORIES) {
      for (const part of getCatalogParts(cat.id, { includeHidden: true })) {
        const cfg = { ...DEFAULT_AVATAR_CONFIG, [cat.configKey]: part.id };
        expect(customAvatarSchema.safeParse(cfg).success, `${cat.id}:${part.id}`).toBe(true);
      }
    }
  });

  it('rarity comes from lib/avatar/rarity for every part and color', () => {
    for (const cat of PART_CATEGORIES) {
      for (const part of getCatalogParts(cat.id, { includeHidden: true })) {
        expect(part.rarity).toBe(getPartRarity(cat.rarityCategory, part.id));
      }
    }
    for (const pid of PALETTE_IDS) {
      for (const c of getPalette(pid)) {
        expect(c.rarity).toBe(pid === 'bgColor' ? getPartRarity('bgColor', c.hex) : 'common');
      }
    }
  });

  it('hides hidden parts by default and exposes them with includeHidden', () => {
    const visible = getCatalogParts('mouth').map(p => p.id);
    const all = getCatalogParts('mouth', { includeHidden: true });
    expect(all.length).toBeGreaterThan(visible.length);
    for (const p of all) {
      if (p.isHidden) expect(visible).not.toContain(p.id);
    }
  });

  it('filters gendered parts by gender', () => {
    const female = getCatalogParts('hair', { gender: 'female' });
    const male = getCatalogParts('hair', { gender: 'male' });
    expect(female.length).toBeGreaterThan(3);
    expect(male.length).toBeGreaterThan(3);
    for (const p of female) expect(p.genders).toContain('female');
    for (const p of male) expect(p.genders).toContain('male');
    expect(getCatalogParts('facialHair', { gender: 'female' }).every(p => p.id === 'none')).toBe(true);
  });

  it('every level-ladder part is a visible catalog entry carrying its unlock level', () => {
    for (const u of LEVEL_UNLOCK_LADDER) {
      if (u.category === 'bgColor') {
        const c = getPalette('bgColor').find(x => x.hex === u.partId);
        expect(c, u.partId).toBeDefined();
        expect(c!.unlockLevel).toBe(u.level);
        continue;
      }
      const part = getCatalogPart(u.category, u.partId);
      expect(part, `${u.category}:${u.partId}`).toBeDefined();
      expect(part!.isHidden).toBe(false);
      expect(part!.unlockLevel).toBe(u.level);
    }
  });

  it('premium parts carry a gold price and the premium key format', () => {
    const crown = getCatalogPart('accessory', 'crystalCrown');
    expect(crown?.rarity).toBe('legendary');
    expect(crown?.price).toBeGreaterThan(0);
    expect(crown?.key).toBe('accessory:crystalCrown');
    expect(catalogPartKey('accessory', 'crystalCrown')).toBe('accessory:crystalCrown');
    const free = getCatalogParts('eyes').find(p => p.rarity === 'common');
    expect(free?.price).toBeNull();
  });

  it('every tab has an i18n label key, an icon and at least one section', () => {
    expect(AVATAR_CATALOG_TABS.length).toBeGreaterThanOrEqual(6);
    for (const tab of AVATAR_CATALOG_TABS) {
      expect(tab.labelKey).toMatch(/^avatarBuilder\./);
      expect(tab.icon).toBeTruthy();
      expect(tab.sections.length).toBeGreaterThan(0);
    }
  });
});
