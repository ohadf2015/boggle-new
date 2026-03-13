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
] as const;

export const AVATAR_HAIR_COLORS = [
  '#2C1B18', '#4A3728', '#8B6E4E', '#D4A574', '#E8C07A',
  '#C62828', '#F57F17', '#6A1B9A', '#00897B', '#FF1493',
] as const;

// ==================== Eyes ====================
export const AVATAR_EYE_STYLES = [
  'round', 'sleepy', 'star', 'wink', 'happy', 'angry', 'cool', 'sparkle',
  'hearts', 'dizzy', 'cyclops', 'lashes',
] as const;

// ==================== Mouth ====================
export const AVATAR_MOUTH_STYLES = [
  'smile', 'grin', 'tongue', 'oh', 'smirk', 'flat', 'teeth', 'cat',
  'vampire', 'kiss', 'braces', 'drool',
] as const;

// ==================== Accessories ====================
export const AVATAR_ACCESSORIES = [
  'none', 'glasses', 'sunglasses', 'hat', 'cap', 'headband', 'crown', 'earring', 'bandana', 'horns',
  'monocle', 'eyepatch', 'tiara', 'antenna', 'halo', 'mask', 'scarf', 'bowtie',
] as const;

export const AVATAR_ACCESSORY_COLORS = [
  '#000000', '#FFFFFF', '#FF1493', '#00FFFF', '#BFFF00', '#8B5CF6', '#FF6B35', '#FFD700',
] as const;

// ==================== Background Colors ====================
export const AVATAR_BG_COLORS = [
  '#1a1a2e', '#FF6B35', '#FF1493', '#00FFFF', '#BFFF00', '#8B5CF6', '#FFE135', '#00897B',
] as const;

// ==================== Zod Schema ====================
export const customAvatarSchema = z.object({
  gender: z.enum(AVATAR_GENDERS).default('male'),
  base: z.enum(AVATAR_BASES),
  skinColor: z.enum(AVATAR_SKIN_COLORS),
  hair: z.enum(AVATAR_HAIR_STYLES),
  hairColor: z.enum(AVATAR_HAIR_COLORS),
  eyes: z.enum(AVATAR_EYE_STYLES),
  mouth: z.enum(AVATAR_MOUTH_STYLES),
  accessory: z.enum(AVATAR_ACCESSORIES),
  accessoryColor: z.enum(AVATAR_ACCESSORY_COLORS),
  bgColor: z.enum(AVATAR_BG_COLORS),
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

export function isValidCustomAvatar(value: unknown): value is CustomAvatarConfig {
  return customAvatarSchema.safeParse(value).success;
}
