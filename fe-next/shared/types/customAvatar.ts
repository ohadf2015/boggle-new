import { z } from 'zod';

// ==================== Gender ====================
export const AVATAR_GENDERS = ['male', 'female'] as const;

// ==================== Face Base Shapes ====================
export const AVATAR_BASES = ['round', 'square', 'oval', 'heart', 'diamond', 'hexagon', 'blob', 'skull', 'shield', 'star', 'dragonHead'] as const;

// ==================== Skin Colors (inclusive range) ====================
export const AVATAR_SKIN_COLORS = [
  '#FFDBB4', '#F8D5C2', '#EDB98A', '#D08B5B', '#AE5D29', '#694D3D',
] as const;

// ==================== Hair ====================
export const AVATAR_HAIR_STYLES = [
  'none', 'spiky', 'curly', 'long', 'buzz', 'mohawk', 'bob', 'ponytail', 'afro', 'wavy',
  'pigtails', 'topknot', 'sideshave', 'dreads', 'braids', 'bun', 'bangs', 'twintails',
  'mullet', 'combover', 'elvis', 'ramen', 'flame', 'galaxy', 'neon',
] as const;

/** Styles that look feminine — shown when gender is female */
export const FEMALE_HAIR_STYLES = [
  'none', 'long', 'bob', 'ponytail', 'wavy', 'pigtails', 'sideshave', 'braids',
  'bun', 'bangs', 'twintails', 'curly', 'afro', 'topknot', 'dreads',
] as const;

/** Styles that look masculine — shown when gender is male */
export const MALE_HAIR_STYLES = [
  'none', 'spiky', 'curly', 'buzz', 'mohawk', 'afro', 'topknot', 'dreads',
  'mullet', 'combover', 'elvis', 'ramen',
] as const;

/** Default hair when switching to female */
export const DEFAULT_FEMALE_HAIR = 'long' as const;
/** Default hair when switching to male */
export const DEFAULT_MALE_HAIR = 'spiky' as const;

export const AVATAR_HAIR_COLORS = [
  '#2C1B18', '#4A3728', '#8B6E4E', '#D4A574', '#E8C07A',
  '#C62828', '#F57F17', '#6A1B9A', '#00897B', '#FF1493',
] as const;

// ==================== Eyes ====================
export const AVATAR_EYE_STYLES = [
  'round', 'sleepy', 'star', 'wink', 'happy', 'angry', 'cool', 'sparkle',
  'hearts', 'dizzy', 'cyclops', 'lashes', 'monocleEye', 'crossEyed', 'laser',
  'hypno', 'money', 'alien', 'crying', 'galaxy', 'flame', 'robot', 'void', 'infinity',
] as const;

// ==================== Mouth ====================
export const AVATAR_MOUTH_STYLES = [
  'smile', 'grin', 'tongue', 'oh', 'smirk', 'flat', 'teeth', 'cat',
  'vampire', 'kiss', 'braces', 'drool', 'goldTooth', 'mustache', 'whistle',
  'zipper', 'blowfish', 'gap', 'pipe', 'dragon', 'diamond', 'glitch',
] as const;

// ==================== Accessories ====================
export const AVATAR_ACCESSORIES = [
  'none', 'glasses', 'sunglasses', 'hat', 'cap', 'headband', 'crown', 'earring', 'bandana', 'horns',
  'monocle', 'eyepatch', 'tiara', 'antenna', 'halo', 'mask', 'scarf', 'bowtie',
  'keffiyeh', 'fez', 'mustacheGlasses', 'sombrero', 'turban', 'noseRing', 'clownNose', 'partyHat',
  'propellerHat', 'viking', 'devilHorns', 'headphones', 'chefHat', 'cucumberFace', 'monkeyEars', 'plunger',
  'samurai', 'astronaut', 'wizardHat', 'ninjaScarf', 'phoenixCrown',
] as const;

export const AVATAR_ACCESSORY_COLORS = [
  '#000000', '#FFFFFF', '#FF1493', '#00FFFF', '#BFFF00', '#8B5CF6', '#FF6B35', '#FFD700',
] as const;

// ==================== Background Colors ====================
export const AVATAR_BG_COLORS = [
  '#1a1a2e', '#FF6B35', '#FF1493', '#00FFFF', '#BFFF00', '#8B5CF6', '#FFE135', '#00897B',
] as const;

// ==================== Hex Color Schema ====================
// Color fields accept any valid hex color, not just palette values.
// The palette arrays above are UI picker constraints only — saved avatars
// may contain colors from older or customized palettes.
const hexColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/);

// ==================== Zod Schema ====================
export const customAvatarSchema = z.object({
  gender: z.enum(AVATAR_GENDERS).default('male'),
  base: z.enum(AVATAR_BASES),
  skinColor: hexColorSchema,
  hair: z.enum(AVATAR_HAIR_STYLES),
  hairColor: hexColorSchema,
  eyes: z.enum(AVATAR_EYE_STYLES),
  mouth: z.enum(AVATAR_MOUTH_STYLES),
  accessory: z.enum(AVATAR_ACCESSORIES),
  accessoryColor: hexColorSchema,
  bgColor: hexColorSchema,
});

export type CustomAvatarConfig = z.output<typeof customAvatarSchema>;

// ==================== Defaults & Helpers ====================

export const DEFAULT_AVATAR_CONFIG: CustomAvatarConfig = {
  gender: 'male',
  base: 'round',
  skinColor: '#FFDBB4',
  hair: 'spiky',
  hairColor: '#2C1B18',
  eyes: 'round',
  mouth: 'smile',
  accessory: 'none',
  accessoryColor: '#000000',
  bgColor: '#1a1a2e',
};

// ==================== Premium Part Definitions (VIP tier) ====================
// VIP = visually striking, fun. ~40% of standard parts.

export const PREMIUM_EYE_STYLES = [
  'laser', 'hypno', 'money', 'alien',
  'star', 'sparkle', 'hearts', 'cyclops',
  'monocleEye',
] as const;

export const PREMIUM_MOUTH_STYLES = [
  'goldTooth', 'pipe', 'vampire',
  'cat', 'zipper', 'blowfish',
  'kiss', 'mustache',
] as const;

export const PREMIUM_ACCESSORIES = [
  'crown', 'tiara', 'halo', 'viking', 'devilHorns', 'headphones', 'chefHat',
  'monocle', 'eyepatch', 'mask', 'sombrero',
  'cucumberFace', 'monkeyEars', 'plunger',
  'mustacheGlasses', 'propellerHat',
] as const;

export const PREMIUM_HAIR_STYLES = [
  'elvis', 'ramen',
  'mohawk', 'sideshave', 'twintails',
] as const;

export const PREMIUM_BG_COLORS = ['#FF0000', '#000000', '#4B0082', '#FFD700'] as const;

export const PREMIUM_BASES = ['hexagon', 'blob', 'diamond', 'heart'] as const;

// ==================== Epic Part Definitions (Legendary tier) ====================
// Gradient-filled, multi-layer, jaw-dropping showpieces. 3-5x VIP price.

export const EPIC_EYE_STYLES = ['galaxy', 'flame', 'robot', 'void', 'infinity'] as const;
export const EPIC_MOUTH_STYLES = ['dragon', 'diamond', 'glitch'] as const;
export const EPIC_ACCESSORIES = ['samurai', 'astronaut', 'wizardHat', 'ninjaScarf', 'phoenixCrown'] as const;
export const EPIC_HAIR_STYLES = ['flame', 'galaxy', 'neon'] as const;
export const EPIC_BASES = ['skull', 'shield', 'star', 'dragonHead'] as const;

// Default prices per category (VIP tier)
export const PREMIUM_PART_PRICES: Record<string, number> = {
  eyes: 400,
  mouth: 400,
  accessory: 500,
  hair: 500,
  bgColor: 250,
  base: 750,
};

// Epic per-part overrides (legendary pricing)
export const EPIC_PART_PRICES: Record<string, number> = {
  'eyes:galaxy': 1500, 'eyes:flame': 1500, 'eyes:robot': 1200, 'eyes:void': 2000,
  'mouth:dragon': 1500, 'mouth:diamond': 2000, 'mouth:glitch': 1200,
  'accessory:samurai': 2500, 'accessory:astronaut': 2500, 'accessory:wizardHat': 2000, 'accessory:ninjaScarf': 1800,
  'hair:flame': 2000, 'hair:galaxy': 2500, 'hair:neon': 1800,
  'base:skull': 3000, 'base:shield': 2500, 'base:star': 2000,
  // LEGENDARY — the 3 rarest items in the game
  'eyes:infinity': 7500,
  'accessory:phoenixCrown': 10000,
  'base:dragonHead': 10000,
};

/** Get price for a part (epic override > category default) */
export function getPartPrice(category: string, partId: string): number {
  return EPIC_PART_PRICES[`${category}:${partId}`] ?? PREMIUM_PART_PRICES[category] ?? 500;
}

/** Check if a part is epic tier */
export function isEpicPart(category: string, value: string): boolean {
  const epicMap: Record<string, readonly string[]> = {
    eyes: EPIC_EYE_STYLES, mouth: EPIC_MOUTH_STYLES,
    accessory: EPIC_ACCESSORIES, hair: EPIC_HAIR_STYLES, base: EPIC_BASES,
  };
  return (epicMap[category] as readonly string[] | undefined)?.includes(value) ?? false;
}

/** The 3 rarest items — shown with special golden LEGENDARY badge */
export const LEGENDARY_PARTS = ['eyes:infinity', 'accessory:phoenixCrown', 'base:dragonHead'] as const;

/** Check if a part is legendary (subset of epic) */
export function isLegendaryPart(category: string, value: string): boolean {
  return LEGENDARY_PARTS.includes(`${category}:${value}` as typeof LEGENDARY_PARTS[number]);
}

// Combined: all non-free parts (VIP + Epic)
const PREMIUM_MAP: Record<string, readonly string[]> = {
  eyes: [...PREMIUM_EYE_STYLES, ...EPIC_EYE_STYLES],
  mouth: [...PREMIUM_MOUTH_STYLES, ...EPIC_MOUTH_STYLES],
  accessory: [...PREMIUM_ACCESSORIES, ...EPIC_ACCESSORIES],
  hair: [...PREMIUM_HAIR_STYLES, ...EPIC_HAIR_STYLES],
  bgColor: PREMIUM_BG_COLORS,
  base: [...PREMIUM_BASES, ...EPIC_BASES],
};

/** Check if a part value is premium (VIP or Epic) */
export function isPremiumPart(category: string, value: string): boolean {
  const premiumList = PREMIUM_MAP[category];
  if (!premiumList) return false;
  return (premiumList as readonly string[]).includes(value);
}

/** Get all premium parts for a category */
export function getPremiumParts(category: string): string[] {
  return [...(PREMIUM_MAP[category] ?? [])];
}

// Free-only arrays (all premium+epic parts filtered out) for random generation
const FREE_BASES = AVATAR_BASES.filter(v => !PREMIUM_MAP.base.includes(v));
const FREE_EYE_STYLES = AVATAR_EYE_STYLES.filter(v => !PREMIUM_MAP.eyes.includes(v));
const FREE_MOUTH_STYLES = AVATAR_MOUTH_STYLES.filter(v => !PREMIUM_MAP.mouth.includes(v));
const FREE_ACCESSORIES = AVATAR_ACCESSORIES.filter(v => !PREMIUM_MAP.accessory.includes(v));
const FREE_HAIR_STYLES = AVATAR_HAIR_STYLES.filter(v => !PREMIUM_MAP.hair.includes(v));

export function getRandomAvatarConfig(): CustomAvatarConfig {
  const pick = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];
  return {
    gender: pick(AVATAR_GENDERS),
    base: pick(FREE_BASES),
    skinColor: pick(AVATAR_SKIN_COLORS),
    hair: pick(FREE_HAIR_STYLES),
    hairColor: pick(AVATAR_HAIR_COLORS),
    eyes: pick(FREE_EYE_STYLES),
    mouth: pick(FREE_MOUTH_STYLES),
    accessory: pick(FREE_ACCESSORIES),
    accessoryColor: pick(AVATAR_ACCESSORY_COLORS),
    bgColor: pick(AVATAR_BG_COLORS),
  };
}

/**
 * Generate a deterministic avatar config from a numeric seed.
 * Same seed always produces the same avatar (no flickering on re-render).
 * Only uses free parts — premium parts must be explicitly unlocked.
 */
export function getSeededAvatarConfig(seed: number): CustomAvatarConfig {
  // mulberry32 PRNG
  let t = seed + 0x6d2b79f5;
  const rand = () => {
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];
  return {
    gender: pick(AVATAR_GENDERS),
    base: pick(FREE_BASES),
    skinColor: pick(AVATAR_SKIN_COLORS),
    hair: pick(FREE_HAIR_STYLES),
    hairColor: pick(AVATAR_HAIR_COLORS),
    eyes: pick(FREE_EYE_STYLES),
    mouth: pick(FREE_MOUTH_STYLES),
    accessory: pick(FREE_ACCESSORIES),
    accessoryColor: pick(AVATAR_ACCESSORY_COLORS),
    bgColor: pick(AVATAR_BG_COLORS),
  };
}

/**
 * Simple string hash to use as seed for getSeededAvatarConfig.
 */
export function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = Math.imul(31, hash) + str.charCodeAt(i) | 0;
  }
  return hash >>> 0;
}

export function isValidCustomAvatar(value: unknown): value is CustomAvatarConfig {
  return customAvatarSchema.safeParse(value).success;
}
