/**
 * Per-item "attitude" for the unlock reveal: the face the avatar pulls, the
 * head tilt, what the free hand does and which little effect floats around
 * it — so Heart Eyes gets floating hearts and a thumbs-up, Frog Hat a wink,
 * a tongue and bubbles, Beat Headphones closed eyes and music notes. A stock
 * grin on every reward read as clip-art; this is the character's reaction.
 *
 * Pure data + helpers (no React). Faces only use FREE, drawn expression ids,
 * and the unlocked part is applied LAST, so an eyes/mouth/face reward is
 * never covered by the reaction.
 */
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';
import { partKey, type LevelUnlock } from '@/lib/avatar/unlocks';
import { applyUnlockToConfig, revealPartNameKey } from '@/lib/avatar/revealTrigger';

export const REVEAL_FX_KINDS = ['notes', 'hearts', 'sparkles', 'stars', 'bubbles', 'bats', 'bolts', 'snow'] as const;
export type RevealFx = (typeof REVEAL_FX_KINDS)[number];

/** grip = both hands on the box rim; thumbsUp = one hand pops up beside the head. */
export const REVEAL_POSES = ['grip', 'thumbsUp'] as const;
export type RevealPose = (typeof REVEAL_POSES)[number];

export type RevealFace = Partial<Pick<CustomAvatarConfig, 'eyes' | 'eyebrows' | 'mouth'>>;

export interface RevealAttitude {
  face: RevealFace;
  /** Head tilt in degrees (negative = toward the start side of the art). */
  tilt: number;
  fx: RevealFx;
  pose: RevealPose;
  /** Background unlocks: show the new color as a big backdrop behind the head. */
  backdrop: boolean;
}

function att(face: RevealFace, tilt: number, fx: RevealFx, pose: RevealPose, backdrop = false): RevealAttitude {
  return { face, tilt, fx, pose, backdrop };
}

/** Keyed by "category:partId" (same key format as profiles.premium_avatar_parts). */
export const REVEAL_ATTITUDES: Readonly<Record<string, RevealAttitude>> = {
  'accessory:headphones': att({ eyes: 'happy', eyebrows: 'raised', mouth: 'smile' }, -6, 'notes', 'grip'),
  'eyes:kawaii': att({ eyebrows: 'raised', mouth: 'oh' }, 5, 'sparkles', 'grip'),
  'hair:cottonCandy': att({ eyes: 'happy', eyebrows: 'raised', mouth: 'tongue' }, -4, 'sparkles', 'thumbsUp'),
  'accessory:cowboyHat': att({ eyes: 'wink', eyebrows: 'raised', mouth: 'smirk' }, 7, 'stars', 'thumbsUp'),
  'bgColor:#4B0082': att({ eyes: 'happy', eyebrows: 'raised', mouth: 'grin' }, -3, 'sparkles', 'grip', true),
  'eyes:heartEye': att({ eyebrows: 'raised', mouth: 'grin' }, 4, 'hearts', 'thumbsUp'),
  'mouth:fangs': att({ eyes: 'sleepy', eyebrows: 'angry' }, -5, 'bats', 'grip'),
  'accessory:duckHat': att({ eyes: 'wide', eyebrows: 'raised', mouth: 'oh' }, 6, 'bubbles', 'grip'),
  'hair:vaporwave': att({ eyes: 'cool', eyebrows: 'flat', mouth: 'smirk' }, -5, 'sparkles', 'thumbsUp'),
  'accessory:frogHat': att({ eyes: 'wink', eyebrows: 'raised', mouth: 'tongue' }, -6, 'bubbles', 'grip'),
  'bgColor:#000000': att({ eyes: 'cool', eyebrows: 'flat', mouth: 'smirk' }, 3, 'stars', 'thumbsUp', true),
  'base:slime': att({ eyes: 'wide', eyebrows: 'raised', mouth: 'grin' }, 5, 'bubbles', 'grip'),
  'eyes:starEye': att({ eyebrows: 'raised', mouth: 'oh' }, -4, 'stars', 'thumbsUp'),
  'hair:lightning': att({ eyes: 'wide', eyebrows: 'angry', mouth: 'grin' }, 6, 'bolts', 'thumbsUp'),
  'accessory:butterflyWings': att({ eyes: 'happy', eyebrows: 'raised', mouth: 'smile' }, -5, 'sparkles', 'grip'),
  'mouth:neonSmile': att({ eyes: 'cool', eyebrows: 'raised' }, 5, 'sparkles', 'thumbsUp'),
  'base:ghostFace': att({ eyes: 'wide', eyebrows: 'worried', mouth: 'oh' }, -6, 'bats', 'grip'),
  'hair:rainbowMohawk': att({ eyes: 'cool', eyebrows: 'angry', mouth: 'smirk' }, 6, 'bolts', 'thumbsUp'),
  'accessory:iceCrown': att({ eyes: 'sleepy', eyebrows: 'raised', mouth: 'smirk' }, -3, 'snow', 'grip'),
};

/** For a part that is not on the ladder yet: a cheerful, drawable default per category. */
const CATEGORY_DEFAULT: Record<LevelUnlock['category'], RevealAttitude> = {
  base: att({ eyes: 'wide', eyebrows: 'raised', mouth: 'grin' }, 4, 'sparkles', 'grip'),
  hair: att({ eyes: 'happy', eyebrows: 'raised', mouth: 'grin' }, -4, 'sparkles', 'thumbsUp'),
  eyes: att({ eyebrows: 'raised', mouth: 'grin' }, 4, 'sparkles', 'thumbsUp'),
  mouth: att({ eyes: 'happy', eyebrows: 'raised' }, -4, 'sparkles', 'grip'),
  accessory: att({ eyes: 'happy', eyebrows: 'raised', mouth: 'grin' }, -5, 'sparkles', 'grip'),
  bgColor: att({ eyes: 'happy', eyebrows: 'raised', mouth: 'grin' }, 3, 'sparkles', 'grip', true),
};

export function revealAttitude(unlock: Pick<LevelUnlock, 'category' | 'partId'>): RevealAttitude {
  return REVEAL_ATTITUDES[partKey(unlock.category, unlock.partId)] ?? CATEGORY_DEFAULT[unlock.category];
}

/** The avatar as staged: the item's face first, then the unlocked part on top. */
export function attitudeConfig(config: CustomAvatarConfig, unlock: LevelUnlock): CustomAvatarConfig {
  const { face } = revealAttitude(unlock);
  return applyUnlockToConfig({ ...config, ...face } as CustomAvatarConfig, unlock);
}

/**
 * Costume heads paint head + neck in a fixed color instead of the skin; the
 * hands on the box rim follow, or a slime face gets peach hands. Mirrors the
 * art's head table (a test guards that they never drift apart).
 */
export const COSTUME_HANDS: Readonly<Record<string, string>> = {
  slime: '#6BE36B',
  diamond: '#8BEBFF',
  skull: '#F3ECD9',
  robotHead: '#B9C6DA',
  alienHead: '#9CF26E',
  ghostFace: '#F4F6FF',
  dragonHead: '#E8413C',
};

export function handColor(config: Pick<CustomAvatarConfig, 'base' | 'skinColor'>): string {
  return COSTUME_HANDS[config.base] ?? config.skinColor ?? '#FFDBB4';
}

/** t() key for the item's one-liner; mirrors the part-name key. */
export function revealVoiceKey(unlock: Pick<LevelUnlock, 'category' | 'partId'>): string {
  return revealPartNameKey(unlock).replace('revealUnlock.parts.', 'revealUnlock.voice.');
}
