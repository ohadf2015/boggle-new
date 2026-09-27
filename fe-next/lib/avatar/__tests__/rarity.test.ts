import { describe, it, expect } from 'vitest';
import {
  getPartTier,
  getPartRarity,
  getConfigTier,
  getConfigRarity,
  tierToVisual,
  maxRarity,
  RARITY_ORDER,
  RARITY_TOKENS,
} from '../rarity';
import { DEFAULT_AVATAR_CONFIG, getPremiumParts, PREMIUM_CATEGORIES } from '@/shared/types/customAvatar';

describe('rarity — one player-facing scheme', () => {
  it('maps a single part to common / rare / epic / legendary', () => {
    // Given parts from each economy tier
    // Then the player sees the same four words the builder already uses
    expect(getPartRarity('eyes', 'round')).toBe('common');
    expect(getPartRarity('eyes', 'laser')).toBe('rare');
    expect(getPartRarity('eyes', 'galaxy')).toBe('epic');
    expect(getPartRarity('eyes', 'infinity')).toBe('legendary');
    expect(getPartRarity('bgColor', '#FFD700')).toBe('rare');
    expect(getPartRarity('accessory', 'none')).toBe('common');
  });

  it('keeps the internal economy tier alongside it', () => {
    expect(getPartTier('eyes', 'round')).toBe('free');
    expect(getPartTier('eyes', 'laser')).toBe('vip');
    expect(getPartTier('eyes', 'galaxy')).toBe('epic');
    expect(getPartTier('accessory', 'crystalCrown')).toBe('legendary');
    expect(tierToVisual('vip')).toBe('rare');
    expect(tierToVisual('free')).toBe('common');
  });

  it('rates a whole avatar by its rarest equipped part', () => {
    expect(getConfigTier(DEFAULT_AVATAR_CONFIG)).toBe('free');
    expect(getConfigRarity(DEFAULT_AVATAR_CONFIG)).toBe('common');
    expect(getConfigRarity({ ...DEFAULT_AVATAR_CONFIG, eyes: 'laser' })).toBe('rare');
    expect(getConfigRarity({ ...DEFAULT_AVATAR_CONFIG, eyes: 'laser', hair: 'lightning' })).toBe('epic');
    expect(getConfigRarity({ ...DEFAULT_AVATAR_CONFIG, accessory: 'phoenixCrown', eyes: 'laser' })).toBe('legendary');
  });

  it('orders rarities and picks the max', () => {
    expect(RARITY_ORDER).toEqual(['common', 'rare', 'epic', 'legendary']);
    expect(maxRarity([])).toBe('common');
    expect(maxRarity(['rare', 'common', 'epic'])).toBe('epic');
  });

  it('has a color token for every rarity, incl. a hex for canvas/SVG use', () => {
    for (const r of RARITY_ORDER) {
      const tok = RARITY_TOKENS[r];
      expect(tok.hex).toMatch(/^#[0-9A-F]{6}$/i);
      expect(tok.text).toMatch(/^text-/);
      expect(tok.border).toMatch(/^border-/);
      expect(tok.labelKey).toBe(`avatarBuilder.tiers.${r}`);
    }
  });

  it('rates every premium part above common', () => {
    for (const cat of PREMIUM_CATEGORIES) {
      for (const id of getPremiumParts(cat)) {
        expect(getPartRarity(cat, id)).not.toBe('common');
      }
    }
  });
});
