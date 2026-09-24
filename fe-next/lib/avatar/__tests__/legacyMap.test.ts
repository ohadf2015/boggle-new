import { describe, it, expect } from 'vitest';
import {
  LEGACY_CATEGORIES,
  CANONICAL_PARTS,
  mapLegacyPart,
  isRetiredPart,
  resolveAvatarConfig,
  expandOwnedKeys,
} from '../legacyMap';
import {
  AVATAR_ACCESSORIES,
  AVATAR_BASES,
  AVATAR_BODY_STYLES,
  AVATAR_EYEBROW_STYLES,
  AVATAR_EYE_STYLES,
  AVATAR_FACIAL_HAIR_STYLES,
  AVATAR_HAIR_STYLES,
  AVATAR_MOUTH_STYLES,
  AVATAR_NOSE_STYLES,
  HIDDEN_PARTS,
  customAvatarSchema,
  getRandomAvatarConfig,
  getSeededAvatarConfig,
} from '@/shared/types/customAvatar';
import { getPartRarity } from '../rarity';
import { LEVEL_UNLOCK_LADDER } from '../unlocks';
import { MOOD_EXPRESSIONS } from '../avatarMood';

const ALL: Record<string, readonly string[]> = {
  base: AVATAR_BASES,
  hair: AVATAR_HAIR_STYLES,
  eyes: AVATAR_EYE_STYLES,
  eyebrows: AVATAR_EYEBROW_STYLES,
  noseStyle: AVATAR_NOSE_STYLES,
  mouth: AVATAR_MOUTH_STYLES,
  facialHair: AVATAR_FACIAL_HAIR_STYLES,
  accessory: AVATAR_ACCESSORIES,
  bodyStyle: AVATAR_BODY_STYLES,
};
/** premium-key category name for a config field */
const RC: Record<string, string> = { noseStyle: 'nose', bodyStyle: 'body' };
const rc = (cat: string) => RC[cat] ?? cat;

describe('legacyMap', () => {
  it('covers every category of the config', () => {
    expect([...LEGACY_CATEGORIES].sort()).toEqual(Object.keys(ALL).sort());
  });

  it('maps EVERY old enum id (all 9 categories) to a canonical id', () => {
    for (const cat of LEGACY_CATEGORIES) {
      for (const id of ALL[cat]) {
        const to = mapLegacyPart(cat, id);
        expect(CANONICAL_PARTS[cat], `${cat}:${id} -> ${to}`).toContain(to);
      }
    }
  });

  it('canonical ids map to themselves and every canonical id is a valid enum value', () => {
    for (const cat of LEGACY_CATEGORIES) {
      for (const id of CANONICAL_PARTS[cat]) {
        expect(ALL[cat], `${cat}:${id}`).toContain(id);
        expect(mapLegacyPart(cat, id)).toBe(id);
        expect(isRetiredPart(cat, id)).toBe(false);
      }
    }
  });

  it('never changes rarity: a bought legendary stays legendary, a free part never becomes premium', () => {
    for (const cat of LEGACY_CATEGORIES) {
      for (const id of ALL[cat]) {
        const to = mapLegacyPart(cat, id);
        expect(getPartRarity(rc(cat), to), `${cat}:${id} -> ${to}`).toBe(getPartRarity(rc(cat), id));
      }
    }
  });

  it('is total: unknown, empty, null and undefined fall back to a canonical default', () => {
    for (const cat of LEGACY_CATEGORIES) {
      for (const junk of ['definitelyNotAPart', '', null, undefined, 42]) {
        expect(CANONICAL_PARTS[cat]).toContain(mapLegacyPart(cat, junk as unknown as string));
      }
    }
  });

  it('HIDDEN_PARTS is exactly the retired set (pickers and randomizer never offer a retired id)', () => {
    for (const cat of LEGACY_CATEGORIES) {
      const retired = ALL[cat].filter(id => isRetiredPart(cat, id)).sort();
      const hidden = [...(((HIDDEN_PARTS as Record<string, readonly string[]>)[cat]) ?? [])].sort();
      expect(hidden, cat).toEqual(retired);
    }
  });

  it('random + seeded avatars only use canonical parts', () => {
    for (let s = 0; s < 300; s++) {
      for (const cfg of [getSeededAvatarConfig(s), getRandomAvatarConfig()]) {
        for (const cat of LEGACY_CATEGORIES) {
          const v = (cfg as Record<string, unknown>)[cat];
          if (v === undefined) continue;
          expect(isRetiredPart(cat, v as string), `${cat}:${String(v)}`).toBe(false);
        }
      }
    }
  });

  it('keeps every level-ladder part and every mood expression canonical', () => {
    for (const u of LEVEL_UNLOCK_LADDER) {
      if (u.category === 'bgColor') continue;
      expect(isRetiredPart(u.category, u.partId), `${u.category}:${u.partId}`).toBe(false);
    }
    for (const [mood, exp] of Object.entries(MOOD_EXPRESSIONS)) {
      if (exp.eyes) expect(isRetiredPart('eyes', exp.eyes), `${mood} eyes`).toBe(false);
      if (exp.mouth) expect(isRetiredPart('mouth', exp.mouth), `${mood} mouth`).toBe(false);
      if (exp.eyebrows) expect(isRetiredPart('eyebrows', exp.eyebrows), `${mood} brows`).toBe(false);
    }
  });

  it('resolveAvatarConfig turns any saved blob into a full canonical config', () => {
    const legacy = {
      gender: 'female', base: 'hexagon', skinColor: '#8D5524', hair: 'milkmaidBraids', hairColor: '#2C1B18',
      eyes: 'wingedLiner', mouth: 'lipGloss', accessory: 'keffiyeh', accessoryColor: '#000000', bgColor: '#FF1493',
      eyebrows: 'feathered', noseStyle: 'roman', facialHair: 'soulPatch',
    };
    const out = resolveAvatarConfig(legacy);
    expect(customAvatarSchema.safeParse(out).success).toBe(true);
    for (const cat of LEGACY_CATEGORIES) {
      expect(isRetiredPart(cat, (out as Record<string, string>)[cat])).toBe(false);
    }
    expect(out.skinColor).toBe('#8D5524');
    // garbage in → a valid avatar out, never a throw
    const junk = resolveAvatarConfig({ base: 7, skinColor: 'red', hair: null } as unknown);
    expect(customAvatarSchema.safeParse(junk).success).toBe(true);
    expect(customAvatarSchema.safeParse(resolveAvatarConfig(null)).success).toBe(true);
  });

  it('expandOwnedKeys lets a buyer of a retired part equip its replacement', () => {
    const out = expandOwnedKeys(['accessory:ninjaScarf', 'eyes:infinity', 'garbage']);
    expect(out).toContain('accessory:ninjaScarf');
    expect(out).toContain(`accessory:${mapLegacyPart('accessory', 'ninjaScarf')}`);
    expect(out).toContain('eyes:infinity');
    expect(out).toContain('garbage');
    expect(new Set(out).size).toBe(out.length);
  });
});
