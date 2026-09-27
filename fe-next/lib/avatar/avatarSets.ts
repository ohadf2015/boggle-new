/**
 * Curated avatar SETS — themed collections of premium parts. Owning/equipping a
 * full set is a completionist goal: the buy-confirmation surface shows how close
 * a purchase brings you to finishing a set, nudging "1 more to complete" spends.
 *
 * Part keys are "category:id" (same shape as premium unlock keys). Every id here
 * must exist as a real premium part in customAvatar.ts.
 */

export interface AvatarSet {
  id: string;
  /** Short display name. Proper-noun set names (kept brand-neutral, like mode names). */
  name: string;
  /** Accent color for the set's pips/aura (brand palette). */
  color: string;
  /** Member part keys, "category:id". */
  parts: readonly string[];
}

export const AVATAR_SETS: readonly AvatarSet[] = [
  {
    id: 'cosmic',
    name: 'Cosmic',
    color: '#A855F7',
    parts: ['eyes:galaxy', 'hair:galaxy', 'accessory:astronaut', 'mouth:neonSmile', 'base:moonBase'],
  },
  {
    id: 'dragon',
    name: 'Dragon',
    color: '#FF6B00',
    parts: ['base:dragonHead', 'eyes:flame', 'hair:flame', 'mouth:dragon', 'eyes:laserEye'],
  },
  {
    id: 'cyber',
    name: 'Cyber',
    color: '#00FFFF',
    parts: ['accessory:cyberpunkVisor', 'eyes:robot', 'mouth:robotMouth', 'hair:neon', 'eyes:cyberEye'],
  },
  {
    id: 'royal',
    name: 'Royal',
    color: '#FFD700',
    parts: ['accessory:crystalCrown', 'eyes:money', 'mouth:grillz', 'accessory:tiara'],
  },
  {
    id: 'mythic',
    name: 'Mythic',
    color: '#8B5CF6',
    parts: ['eyes:moonEye', 'eyes:gemEye', 'accessory:flamingHalo', 'accessory:wings', 'hair:longFlow'],
  },
  {
    id: 'neon',
    name: 'Neon',
    color: '#FF1493',
    parts: ['eyes:cyberEye', 'hair:neon', 'accessory:cyberpunkVisor', 'mouth:robotMouth', 'accessory:headphones'],
  },
  {
    id: 'ocean',
    name: 'Ocean',
    color: '#00FFFF',
    parts: ['eyes:sleepyEye', 'hair:bobCut', 'accessory:earrings', 'accessory:tiara', 'eyes:gemEye'],
  },
] as const;

export interface SetProgress {
  set: AvatarSet;
  owned: number;
  total: number;
  complete: boolean;
  /** Part keys still missing. */
  missing: string[];
}

/** All sets that include the given part. */
export function getSetsForPart(category: string, id: string): AvatarSet[] {
  const key = `${category}:${id}`;
  return AVATAR_SETS.filter(s => s.parts.includes(key));
}

/**
 * Progress for one set against a set of owned part keys.
 * @param ownedKeys "category:id" keys the player already owns/has unlocked.
 */
export function getSetProgress(set: AvatarSet, ownedKeys: Iterable<string>): SetProgress {
  const owned = new Set(ownedKeys);
  const have = set.parts.filter(p => owned.has(p));
  const missing = set.parts.filter(p => !owned.has(p));
  return {
    set,
    owned: have.length,
    total: set.parts.length,
    complete: missing.length === 0,
    missing,
  };
}
