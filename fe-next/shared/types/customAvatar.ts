import { z } from 'zod';

// ==================== Gender ====================
export const AVATAR_GENDERS = ['male', 'female'] as const;

// ==================== Face Base Shapes ====================
export const AVATAR_BASES = ['round', 'square', 'oval', 'heart', 'diamond', 'hexagon', 'blob'] as const;

// ==================== Skin Colors (inclusive range) ====================
export const AVATAR_SKIN_COLORS = [
  '#FFDBB4', '#F8D5C2', '#EDB98A', '#D08B5B', '#AE5D29', '#694D3D',
] as const;

// ==================== Hair ====================
export const AVATAR_HAIR_STYLES = [
  'none', 'spiky', 'curly', 'long', 'buzz', 'mohawk', 'bob', 'ponytail', 'afro', 'wavy',
  'pigtails', 'topknot', 'sideshave', 'dreads', 'braids', 'bun', 'bangs', 'twintails',
  'mullet', 'combover', 'elvis', 'ramen',
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
  'hypno', 'money', 'alien', 'crying',
] as const;

// ==================== Mouth ====================
export const AVATAR_MOUTH_STYLES = [
  'smile', 'grin', 'tongue', 'oh', 'smirk', 'flat', 'teeth', 'cat',
  'vampire', 'kiss', 'braces', 'drool', 'goldTooth', 'mustache', 'whistle',
  'zipper', 'blowfish', 'gap', 'pipe',
] as const;

// ==================== Accessories ====================
export const AVATAR_ACCESSORIES = [
  'none', 'glasses', 'sunglasses', 'hat', 'cap', 'headband', 'crown', 'earring', 'bandana', 'horns',
  'monocle', 'eyepatch', 'tiara', 'antenna', 'halo', 'mask', 'scarf', 'bowtie',
  'keffiyeh', 'fez', 'mustacheGlasses', 'sombrero', 'turban', 'noseRing', 'clownNose', 'partyHat',
  'propellerHat', 'viking', 'devilHorns', 'headphones', 'chefHat', 'cucumberFace', 'monkeyEars', 'plunger',
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

export function getRandomAvatarConfig(): CustomAvatarConfig {
  const pick = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];
  return {
    gender: pick(AVATAR_GENDERS),
    base: pick(AVATAR_BASES),
    skinColor: pick(AVATAR_SKIN_COLORS),
    hair: pick(AVATAR_HAIR_STYLES),
    hairColor: pick(AVATAR_HAIR_COLORS),
    eyes: pick(AVATAR_EYE_STYLES),
    mouth: pick(AVATAR_MOUTH_STYLES),
    accessory: pick(AVATAR_ACCESSORIES),
    accessoryColor: pick(AVATAR_ACCESSORY_COLORS),
    bgColor: pick(AVATAR_BG_COLORS),
  };
}

/**
 * Generate a deterministic avatar config from a numeric seed.
 * Same seed always produces the same avatar (no flickering on re-render).
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
    base: pick(AVATAR_BASES),
    skinColor: pick(AVATAR_SKIN_COLORS),
    hair: pick(AVATAR_HAIR_STYLES),
    hairColor: pick(AVATAR_HAIR_COLORS),
    eyes: pick(AVATAR_EYE_STYLES),
    mouth: pick(AVATAR_MOUTH_STYLES),
    accessory: pick(AVATAR_ACCESSORIES),
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
