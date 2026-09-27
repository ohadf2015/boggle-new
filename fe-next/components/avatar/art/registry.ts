/**
 * One lookup for every drawable part id. Callers pass CANONICAL ids (run the
 * config through resolveAvatarConfig first); unknown ids fall back to a safe
 * default so a render can never throw on bad data.
 */
import { HEADS, type HeadDef } from './heads';
import { EYES_FREE, type EyeDef } from './eyes';
import { EYES_PREMIUM } from './eyesPremium';
import { BROWS, NOSES } from './faceBits';
import { MOUTHS } from './mouths';
import { HAIR_FREE, type HairDef } from './hair';
import { HAIR_PREMIUM } from './hairPremium';
import { FACIAL_HAIR } from './facialHair';
import { ACC_FREE, type AccDef } from './accessories';
import { ACC_PREMIUM } from './accessoriesPremium';
import { BODIES } from './bodies';

export const EYES: Record<string, EyeDef> = { ...EYES_FREE, ...EYES_PREMIUM };
export const HAIR: Record<string, HairDef> = { ...HAIR_FREE, ...HAIR_PREMIUM };
export const ACCESSORIES: Record<string, AccDef> = { ...ACC_FREE, ...ACC_PREMIUM };

/** Every id the art can draw, per config field — used by tests + catalog. */
export const DRAWN_IDS: Record<string, readonly string[]> = {
  base: Object.keys(HEADS),
  hair: Object.keys(HAIR),
  eyes: Object.keys(EYES),
  eyebrows: Object.keys(BROWS),
  noseStyle: Object.keys(NOSES),
  mouth: Object.keys(MOUTHS),
  facialHair: Object.keys(FACIAL_HAIR),
  accessory: Object.keys(ACCESSORIES),
  bodyStyle: Object.keys(BODIES),
};

export function eyeDef(id: string): EyeDef {
  return EYES[id] ?? EYES_FREE.round;
}
export function hairDef(id: string): HairDef {
  return HAIR[id] ?? HAIR_FREE.none;
}
export function accDef(id: string): AccDef {
  return ACCESSORIES[id] ?? ACC_FREE.none;
}
export type { HeadDef };
