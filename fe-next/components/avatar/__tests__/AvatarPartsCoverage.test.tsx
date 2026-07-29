/**
 * Avatar parts coverage — the sync-guard spine.
 *
 * Catches the entire "added an enum value but forgot to wire it" bug class:
 *  - every enum value has a renderer in its *_PARTS map
 *  - every part renders to non-empty SVG via the SSR renderer without throwing
 *  - every intended-premium part is gated (priced + tier-classified), so it
 *    can never leak free into the random generator (FREE_* is derived).
 *
 * This is the RED test for new parts: add an enum id -> this fails until the
 * SVG FC + map entry exist; add an epic id without pricing -> the gate block
 * fails until it is classified.
 */
import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import AvatarRendererSsr from '../AvatarRendererSsr';
import {
  DEFAULT_AVATAR_CONFIG,
  AVATAR_BASES,
  AVATAR_HAIR_STYLES,
  AVATAR_EYE_STYLES,
  AVATAR_EYEBROW_STYLES,
  AVATAR_FACIAL_HAIR_STYLES,
  AVATAR_NOSE_STYLES,
  AVATAR_MOUTH_STYLES,
  AVATAR_ACCESSORIES,
  AVATAR_BODY_STYLES,
  isPremiumPart,
  isEpicPart,
  getPartPrice,
  isNewPart,
  NEW_PART_KEYS,
  type CustomAvatarConfig,
} from '@/shared/types/customAvatar';
import { BASE_PARTS } from '../parts/BaseParts';
import { EYE_PARTS } from '../parts/EyeParts';
import { MOUTH_PARTS } from '../parts/MouthParts';
import { HAIR_PARTS } from '../parts/HairParts';
import { ACCESSORY_PARTS } from '../parts/AccessoryParts';
import { EYEBROW_PARTS } from '../parts/EyebrowParts';
import { FACIAL_HAIR_PARTS } from '../parts/FacialHairParts';
import { NOSE_PARTS } from '../parts/NoseParts';
import { BODY_PARTS } from '../parts/BodyParts';

type Cat = {
  name: string;
  enumVals: readonly string[];
  map: Record<string, unknown>;
  field: keyof CustomAvatarConfig;
};

// BODY_PARTS is keyed by gender/bodyStyle; map check skips the gender-keyed extras.
const CATEGORIES: Cat[] = [
  { name: 'base', enumVals: AVATAR_BASES, map: BASE_PARTS, field: 'base' },
  { name: 'hair', enumVals: AVATAR_HAIR_STYLES, map: HAIR_PARTS, field: 'hair' },
  { name: 'eyes', enumVals: AVATAR_EYE_STYLES, map: EYE_PARTS, field: 'eyes' },
  { name: 'eyebrows', enumVals: AVATAR_EYEBROW_STYLES, map: EYEBROW_PARTS, field: 'eyebrows' },
  { name: 'facialHair', enumVals: AVATAR_FACIAL_HAIR_STYLES, map: FACIAL_HAIR_PARTS, field: 'facialHair' },
  { name: 'nose', enumVals: AVATAR_NOSE_STYLES, map: NOSE_PARTS, field: 'noseStyle' },
  { name: 'mouth', enumVals: AVATAR_MOUTH_STYLES, map: MOUTH_PARTS, field: 'mouth' },
  { name: 'accessory', enumVals: AVATAR_ACCESSORIES, map: ACCESSORY_PARTS, field: 'accessory' },
];

describe('avatar parts coverage (sync guard)', () => {
  for (const cat of CATEGORIES) {
    describe(cat.name, () => {
      it('every enum value has a renderer in its parts map', () => {
        const missing = cat.enumVals.filter((v) => !(v in cat.map));
        expect(missing, `${cat.name} enum values missing a *_PARTS entry`).toEqual([]);
      });

      it.each([...cat.enumVals])('renders %s to non-empty SVG without throwing', (val) => {
        const config: CustomAvatarConfig = { ...DEFAULT_AVATAR_CONFIG, [cat.field]: val };
        let svg = '';
        expect(() => {
          svg = renderToStaticMarkup(
            React.createElement(AvatarRendererSsr, { config, size: 96 }),
          );
        }).not.toThrow();
        expect(svg).toContain('<svg');
        // crude "did the part actually draw something" floor — empty parts (e.g.
        // a broken FC returning null) collapse the markup well below this.
        expect(svg.length).toBeGreaterThan(400);
      });
    });
  }

  it('BODY_PARTS covers every body style', () => {
    // 'default' is a sentinel that resolves to the gender-keyed body (male/female),
    // so it is intentionally not a BODY_PARTS key.
    const missing = AVATAR_BODY_STYLES.filter((v) => v !== 'default' && !(v in BODY_PARTS));
    expect(missing).toEqual([]);
  });
});

describe('premium gate integrity (no free leak)', () => {
  // Parts that MUST stay paid. Adding an epic/cool part? List it here and the
  // test enforces it is classified + priced, so it can never fall through to
  // the free random generator (FREE_* arrays are derived from PREMIUM_MAP).
  const MUST_BE_PREMIUM: Array<[string, string]> = [
    // existing epic/legendary anchors (regression guard)
    ['eyes', 'infinity'],
    ['accessory', 'phoenixCrown'],
    ['base', 'dragonHead'],
    ['hair', 'galaxy'],
    ['mouth', 'dragon'],
    // new epic/legendary anchors
    ['accessory', 'crystalCrown'],
    ['accessory', 'angelWings'],
    ['accessory', 'frogHat'],
    ['eyes', 'thirdEye'],
    ['eyes', 'glitchEyes'],
    ['base', 'robotHead'],
    ['hair', 'lightning'],
    ['mouth', 'grillz'],
    ['facialHair', 'flameBeard'],
    // new VIP anchors
    ['accessory', 'gamerHeadset'],
    ['eyes', 'kawaii'],
    ['base', 'slime'],
    ['hair', 'cottonCandy'],
  ];

  it.each(MUST_BE_PREMIUM)('%s:%s is premium and priced', (cat, part) => {
    expect(isPremiumPart(cat, part), `${cat}:${part} should be premium`).toBe(true);
    expect(getPartPrice(cat, part), `${cat}:${part} should have a price > 0`).toBeGreaterThan(0);
  });

  it('every NEW part is a real, renderable, premium-gated part', () => {
    const enumByCat: Record<string, readonly string[]> = {
      base: AVATAR_BASES, hair: AVATAR_HAIR_STYLES, eyes: AVATAR_EYE_STYLES,
      mouth: AVATAR_MOUTH_STYLES, accessory: AVATAR_ACCESSORIES,
      facialHair: AVATAR_FACIAL_HAIR_STYLES,
    };
    expect(NEW_PART_KEYS.length).toBeGreaterThan(0);
    for (const key of NEW_PART_KEYS) {
      const [cat, id] = key.split(':');
      expect(enumByCat[cat], `unknown NEW category ${cat}`).toBeDefined();
      expect(enumByCat[cat]).toContain(id);
      expect(isNewPart(cat, id), `${key} should report isNewPart`).toBe(true);
      // Every new part is premium — guards against a NEW free part leaking into random gen.
      expect(isPremiumPart(cat, id), `${key} should be premium-gated`).toBe(true);
      expect(getPartPrice(cat, id)).toBeGreaterThan(0);
    }
  });

  it('every epic part has an explicit (non-fallback) price', () => {
    // Epic parts should never rely on the cheap category fallback — they are showpieces.
    const epicChecks: Array<[string, readonly string[]]> = CATEGORIES.map((c) => [
      c.name,
      c.enumVals.filter((v) => isEpicPart(c.name, v)),
    ]);
    for (const [cat, parts] of epicChecks) {
      for (const part of parts) {
        const price = getPartPrice(cat, part);
        expect(price, `epic ${cat}:${part} price`).toBeGreaterThanOrEqual(800);
      }
    }
  });
});
