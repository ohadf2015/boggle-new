import { describe, it, expect } from 'vitest';
import { customAvatarSchema, isPremiumPart, isChestOnlyPart } from '@/shared/types/customAvatar';
import { getCatalogPart, getPalette } from '@/lib/avatar/catalog';
import { getPartRarity } from '@/lib/avatar/rarity';
import {
  LOOK_PRESETS,
  LOOK_PRESET_GROUPS,
  RON_PRESET_GROUP,
  FUN_PRESET_GROUP,
  getLookPresetsInGroup,
  splitLookPreset,
} from '../lookPresets';
import { en } from '@/translations/en.js';
import { he } from '@/translations/he.js';
import { sv } from '@/translations/sv.js';
import { ja } from '@/translations/ja.js';
import { es } from '@/translations/es.js';
import { ru } from '@/translations/ru.js';

const LOCALES: Record<string, Record<string, unknown>> = { en, he, sv, ja, es, ru };

function lookup(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc == null || typeof acc !== 'object') return undefined;
    return (acc as Record<string, unknown>)[key];
  }, obj);
}

describe('look presets', () => {
  it('includes a Ron preset group with the canonical Ron look plus variations', () => {
    expect(RON_PRESET_GROUP).toBe('ron');
    const ron = getLookPresetsInGroup('ron');
    expect(ron.length).toBeGreaterThanOrEqual(2);
    expect(ron.some(p => p.id === 'ron')).toBe(true);
    expect(LOOK_PRESET_GROUPS.some(g => g.id === 'ron' && g.labelKey === 'avatarBuilder.presetGroup.ron')).toBe(true);
    const classic = ron.find(p => p.id === 'ron')!;
    expect(classic.labelKey).toBe('avatarBuilder.preset.ron');
    expect(classic.config.gender).toBe('male');
    expect(classic.config.facialHair).toBe('fullBeard');
    expect(classic.config.accessory).toBe('goldNecklace');
    expect(classic.config.bodyStyle).toBe('default');
    // Olive / khaki-green tee
    expect(classic.config.shirtColor.toLowerCase()).toBe('#6b7f3b');
    expect(getPalette('shirtColor').some(c => c.hex.toLowerCase() === '#6b7f3b')).toBe(true);
  });

  it('offers at least 6 funny or cute presets for every player', () => {
    expect(FUN_PRESET_GROUP).toBe('fun');
    const fun = getLookPresetsInGroup('fun');
    expect(fun.length).toBeGreaterThanOrEqual(6);
    expect(fun.length).toBeLessThanOrEqual(10);
    expect(fun.some(p => p.id === 'ron')).toBe(false);
  });

  it('every preset config is a valid avatar and only uses real, non-hidden parts', () => {
    expect(LOOK_PRESETS.length).toBeGreaterThanOrEqual(8);
    for (const p of LOOK_PRESETS) {
      const parsed = customAvatarSchema.safeParse(p.config);
      expect(parsed.success, `${p.id} schema: ${JSON.stringify(parsed)}`).toBe(true);
      const cfg = parsed.success ? parsed.data : p.config;
      const slots: Array<[string, string | undefined]> = [
        ['base', cfg.base],
        ['hair', cfg.hair],
        ['eyes', cfg.eyes],
        ['eyebrows', cfg.eyebrows],
        ['nose', cfg.noseStyle],
        ['mouth', cfg.mouth],
        ['facialHair', cfg.facialHair],
        ['accessory', cfg.accessory],
        ['body', cfg.bodyStyle],
      ];
      for (const [cat, id] of slots) {
        if (id == null) continue;
        const part = getCatalogPart(cat, id);
        expect(part, `${p.id} unknown part ${cat}:${id}`).toBeDefined();
        expect(part!.isHidden, `${p.id} uses hidden part ${cat}:${id}`).toBe(false);
      }
    }
  });

  it('keeps at most one unowned premium part per preset so the existing try-on slot can unlock it', () => {
    for (const p of LOOK_PRESETS) {
      const premiumParts: string[] = [];
      const cfg = p.config;
      const checks: Array<[string, string | undefined]> = [
        ['hair', cfg.hair],
        ['eyes', cfg.eyes],
        ['eyebrows', cfg.eyebrows],
        ['mouth', cfg.mouth],
        ['facialHair', cfg.facialHair],
        ['accessory', cfg.accessory],
        ['base', cfg.base],
      ];
      for (const [cat, id] of checks) {
        if (!id || id === 'none') continue;
        if (isPremiumPart(cat, id) || isChestOnlyPart(cat, id)) premiumParts.push(`${cat}:${id}`);
      }
      if (isPremiumPart('bgColor', cfg.bgColor)) premiumParts.push(`bgColor:${cfg.bgColor}`);
      expect(premiumParts, `${p.id} has too many paid parts for a single try-on`).toHaveLength(
        premiumParts.length > 1 ? 1 : premiumParts.length,
      );
      expect(premiumParts.length).toBeLessThanOrEqual(1);
    }
  });

  it('labels exist in every locale, including Hebrew "פריסט רון" for the Ron preset', () => {
    const keys = [
      'avatarBuilder.presets',
      'avatarBuilder.presetGroup.ron',
      'avatarBuilder.presetGroup.fun',
      ...LOOK_PRESETS.map(p => p.labelKey),
    ];
    for (const [locale, tree] of Object.entries(LOCALES)) {
      for (const key of keys) {
        const value = lookup(tree, key);
        expect(typeof value, `${locale} missing ${key}`).toBe('string');
        expect(String(value).trim().length, `${locale} empty ${key}`).toBeGreaterThan(0);
      }
    }
    expect(lookup(he, 'avatarBuilder.preset.ron')).toBe('פריסט רון');
    expect(lookup(en, 'avatarBuilder.preset.ron')).toBe('Ron preset');
  });

  it('splitLookPreset commits free parts and isolates the paid signature part for try-on', () => {
    const ron = LOOK_PRESETS.find(p => p.id === 'ron')!;
    const { patch, tryOn } = splitLookPreset(ron, {
      isPartUnlocked: () => false,
      coins: 0,
    });
    expect(patch.accessory ?? 'none').not.toBe('goldNecklace');
    expect(patch.facialHair).toBe('fullBeard');
    expect(patch.shirtColor?.toLowerCase()).toBe('#6b7f3b');
    expect(tryOn).toEqual({ key: 'accessory', value: 'goldNecklace' });
  });

  it('splitLookPreset applies the necklace once it is already owned', () => {
    const ron = LOOK_PRESETS.find(p => p.id === 'ron')!;
    const { patch, tryOn } = splitLookPreset(ron, {
      isPartUnlocked: (cat, id) => cat === 'accessory' && id === 'goldNecklace',
      coins: 9999,
    });
    expect(patch.accessory).toBe('goldNecklace');
    expect(tryOn).toBeNull();
  });

  it('does not treat free signature parts as premium', () => {
    expect(getPartRarity('facialHair', 'fullBeard')).toBe('common');
    expect(getPartRarity('hair', 'buzz')).toBe('common');
  });
});
