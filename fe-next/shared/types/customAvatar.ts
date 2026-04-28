import { z } from 'zod';

// ==================== Gender ====================
export const AVATAR_GENDERS = ['male', 'female'] as const;

// ==================== Face Base Shapes ====================
export const AVATAR_BASES = ['round', 'square', 'oval', 'heart', 'diamond', 'hexagon', 'blob', 'skull', 'shield', 'dragonHead', 'triangle', 'catFace', 'oblong', 'rectangular', 'pear'] as const;

// ==================== Skin Colors (inclusive range) ====================
export const AVATAR_SKIN_COLORS = [
  '#FFDBB4', '#F8D5C2', '#EDB98A', '#D08B5B', '#AE5D29', '#694D3D',
  '#FFE0BD', '#C68642', '#8D5524', '#4A2912',
  '#87CEEB', '#98FB98', '#FFB6C1', '#E6E6FA', '#FFFACD',
  '#808080', '#A9A9A9',
] as const;

// ==================== Hair ====================
export const AVATAR_HAIR_STYLES = [
  'none', 'spiky', 'curly', 'long', 'buzz', 'mohawk', 'bob', 'ponytail', 'afro', 'wavy',
  'pigtails', 'topknot', 'sideshave', 'dreads', 'braids', 'bun', 'bangs', 'twintails',
  'mullet', 'combover', 'elvis', 'ramen', 'flame', 'galaxy', 'neon',
  'pixie', 'undercut', 'spaceBuns', 'straight', 'fade', 'cornrows', 'wolfCut',
  'curtainBangs', 'halfUp', 'himecut',
  'frenchBob', 'shag', 'flatTop', 'lob', 'fingerWaves', 'curlyBangs', 'quiff', 'sideSwept',
  'fadeCurly',
  'frizzle', 'durag', 'locsShort',
] as const;

/** Styles that look feminine — shown when gender is female */
export const FEMALE_HAIR_STYLES = [
  'none', 'long', 'bob', 'ponytail', 'wavy', 'pigtails', 'sideshave', 'braids',
  'bun', 'bangs', 'twintails', 'curly', 'afro', 'topknot', 'dreads',
  'pixie', 'spaceBuns', 'straight', 'wolfCut', 'cornrows',
  'curtainBangs', 'halfUp', 'himecut',
  'frenchBob', 'shag', 'lob', 'fingerWaves', 'curlyBangs', 'sideSwept',
  'frizzle', 'locsShort',
] as const;

/** Styles that look masculine — shown when gender is male */
export const MALE_HAIR_STYLES = [
  'none', 'spiky', 'curly', 'buzz', 'mohawk', 'afro', 'topknot', 'dreads',
  'mullet', 'combover', 'elvis', 'ramen',
  'undercut', 'fade', 'cornrows', 'wolfCut', 'ponytail', 'bun', 'straight',
  'flatTop', 'quiff', 'shag', 'sideSwept', 'fadeCurly',
  'frizzle', 'durag', 'locsShort',
] as const;

/** Default hair when switching to female */
export const DEFAULT_FEMALE_HAIR = 'long' as const;
/** Default hair when switching to male */
export const DEFAULT_MALE_HAIR = 'spiky' as const;

export const AVATAR_HAIR_COLORS = [
  '#2C1B18', '#4A3728', '#8B6E4E', '#D4A574', '#E8C07A',
  '#C62828', '#F57F17', '#6A1B9A', '#00897B', '#FF1493',
  '#FFFFFF', '#C0C0C0', '#808080',
] as const;

// ==================== Eye Colors ====================
export const AVATAR_EYE_COLORS = [
  '#4A6FA5', '#3B82F6', '#2563EB', '#1D4ED8',  // Blues
  '#059669', '#10B981', '#047857',                // Greens
  '#92400E', '#78350F', '#6B4423',                // Browns
  '#6B7280', '#9CA3AF',                           // Grays
  '#7C3AED', '#A855F7',                           // Violet
  '#B45309', '#D97706',                           // Amber/Hazel
] as const;

// ==================== Eyes ====================
export const AVATAR_EYE_STYLES = [
  'none', 'round', 'sleepy', 'star', 'wink', 'happy', 'angry', 'cool', 'sparkle',
  'hearts', 'dizzy', 'cyclops', 'lashes', 'monocleEye', 'crossEyed', 'laser',
  'hypno', 'money', 'alien', 'crying', 'galaxy', 'flame', 'robot', 'void', 'infinity',
  'curious', 'determined', 'doe',
  'closed', 'catPupils', 'wide', 'squint', 'sad',
  'wingedLiner', 'smokyEye', 'confident', 'relaxed', 'focused',
] as const;

// ==================== Eyebrows ====================
export const AVATAR_EYEBROW_STYLES = [
  'none', 'natural', 'thin', 'thick', 'angry', 'raised', 'unibrow', 'flat', 'worried',
  'arched', 'bushy', 'scarred', 'short', 'feathered', 'angryThick',
] as const;

// ==================== Facial Hair (male only) ====================
export const AVATAR_FACIAL_HAIR_STYLES = [
  'none', 'stubble', 'mustache', 'goatee', 'shortBeard', 'fullBeard',
  'soulPatch', 'chinStrap', 'muttonChops', 'vanDyke', 'handlebar',
  'wizardBeard', 'pencilMustache', 'braidedBeard', 'fuManchu', 'trimmedBeard',
] as const;

// ==================== Nose ====================
export const AVATAR_NOSE_STYLES = [
  'none', 'button', 'pointed', 'round', 'snub', 'long', 'wide', 'roman', 'dot', 'cat', 'clown',
] as const;

// ==================== Mouth ====================
export const AVATAR_MOUTH_STYLES = [
  'none', 'smile', 'grin', 'tongue', 'oh', 'smirk', 'flat', 'teeth', 'cat',
  'vampire', 'kiss', 'braces', 'drool', 'goldTooth', 'mustache', 'whistle',
  'zipper', 'blowfish', 'gap', 'pipe', 'dragon', 'diamond', 'glitch',
  'frown', 'pout', 'bubbleGum', 'buckTeeth', 'sideSmile',
  'lipstick', 'lipGloss', 'closedSmile', 'thinLips',
] as const;

// ==================== Accessories ====================
export const AVATAR_ACCESSORIES = [
  'none', 'glasses', 'sunglasses', 'hat', 'cap', 'headband', 'crown', 'earring', 'bandana', 'horns',
  'monocle', 'eyepatch', 'tiara', 'antenna', 'halo', 'mask', 'scarf', 'bowtie',
  'keffiyeh', 'fez', 'mustacheGlasses', 'sombrero', 'turban', 'noseRing', 'clownNose', 'partyHat',
  'propellerHat', 'viking', 'devilHorns', 'headphones', 'chefHat', 'cucumberFace', 'plunger',
  'samurai', 'astronaut', 'wizardHat', 'ninjaScarf', 'phoenixCrown',
  'monkeyEars',
  'beanie', 'catEars', 'flowerCrown', 'goggles', 'bunnyEars', 'cyberpunkVisor',
  'bow', 'pearls', 'heartGlasses', 'choker', 'butterflyClip',
] as const;

export const AVATAR_ACCESSORY_COLORS = [
  '#000000', '#FFFFFF', '#FF1493', '#00FFFF', '#BFFF00', '#8B5CF6', '#FF6B35', '#FFD700',
] as const;

// ==================== Shirt Colors ====================
export const AVATAR_SHIRT_COLORS = [
  '#4A90D9', '#E85D9B', '#FF6B35', '#00897B', '#8B5CF6', '#C62828', '#FFD700', '#2C1B18',
] as const;

// ==================== Body Styles ====================
export const AVATAR_BODY_STYLES = ['default', 'hoodie', 'suit', 'turtleneck', 'offShoulder', 'cropTop'] as const;

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
  /** Eye/iris color — optional for backward compat (defaults to classic blue) */
  eyeColor: hexColorSchema.optional(),
  /** Nose style — optional for backward compat (defaults to none) */
  noseStyle: z.enum(AVATAR_NOSE_STYLES).optional(),
  /** Eyebrow style — optional for backward compatibility with saved avatars */
  eyebrows: z.enum(AVATAR_EYEBROW_STYLES).optional(),
  facialHair: z.enum(AVATAR_FACIAL_HAIR_STYLES).optional(),
  mouth: z.enum(AVATAR_MOUTH_STYLES),
  accessory: z.enum(AVATAR_ACCESSORIES),
  accessoryColor: hexColorSchema,
  bgColor: hexColorSchema,
  /** Shirt/body color — defaults based on gender for backward compat */
  shirtColor: hexColorSchema.optional(),
  /** Body/clothing style — defaults to gender-based body if not set */
  bodyStyle: z.enum(AVATAR_BODY_STYLES).optional(),
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
  eyeColor: '#4A6FA5',
  noseStyle: 'button',
  eyebrows: 'none',
  mouth: 'smile',
  accessory: 'none',
  accessoryColor: '#000000',
  bgColor: '#1a1a2e',
  shirtColor: '#4A90D9',
};

// ==================== Premium Part Definitions (VIP tier) ====================
// VIP = aspirational but attainable. ~25-35% of parts per category.
// Philosophy: free players get enough variety for a unique avatar,
// VIP parts are noticeably cooler / themed / cosplay.

export const PREMIUM_EYE_STYLES = [
  'laser', 'hypno', 'money', 'alien',
  'cyclops', 'monocleEye',
  'confident',
] as const;

export const PREMIUM_MOUTH_STYLES = [
  'goldTooth', 'pipe', 'vampire',
  'zipper', 'blowfish',
] as const;

export const PREMIUM_ACCESSORIES = [
  'crown', 'tiara', 'viking', 'devilHorns', 'headphones',
  'monocle', 'eyepatch', 'mask', 'sombrero',
  'flowerCrown',
] as const;

export const PREMIUM_HAIR_STYLES = [
  'elvis', 'ramen', 'twintails',
  'undercut', 'spaceBuns', 'fadeCurly',
] as const;

export const PREMIUM_BG_COLORS = ['#FF0000', '#000000', '#4B0082', '#FFD700'] as const;

export const PREMIUM_BASES = ['diamond'] as const;

// ==================== Epic Part Definitions (Legendary tier) ====================
// Gradient-filled, multi-layer, jaw-dropping showpieces. 3-5x VIP price.

export const EPIC_EYE_STYLES = ['galaxy', 'flame', 'robot', 'void', 'infinity'] as const;
export const EPIC_MOUTH_STYLES = ['dragon', 'diamond', 'glitch'] as const;
export const EPIC_ACCESSORIES = ['samurai', 'astronaut', 'wizardHat', 'ninjaScarf', 'phoenixCrown', 'cyberpunkVisor'] as const;
export const EPIC_HAIR_STYLES = ['flame', 'galaxy', 'neon'] as const;
export const EPIC_BASES = ['skull', 'shield', 'dragonHead'] as const;

export const PREMIUM_EYEBROW_STYLES = ['arched', 'bushy', 'scarred'] as const;
export const EPIC_EYEBROW_STYLES = ['angryThick'] as const;

export const PREMIUM_FACIAL_HAIR_STYLES = ['vanDyke', 'handlebar', 'fuManchu', 'trimmedBeard'] as const;
export const EPIC_FACIAL_HAIR_STYLES = ['wizardBeard', 'braidedBeard'] as const;

// ==================== Per-Part Pricing ====================
// Every premium part has an explicit price. Fallback by category only for
// parts accidentally missing from this map.

// Category-level fallback (safety net)
export const PREMIUM_PART_PRICES: Record<string, number> = {
  eyes: 400,
  mouth: 400,
  accessory: 500,
  hair: 500,
  bgColor: 250,
  base: 750,
  facialHair: 450,
  eyebrows: 350,
};

// VIP per-part prices
export const VIP_PART_PRICES: Record<string, number> = {
  // ── Eyes (VIP) ──
  'eyes:laser': 500,
  'eyes:hypno': 450,
  'eyes:money': 400,
  'eyes:alien': 450,
  'eyes:cyclops': 400,
  'eyes:monocleEye': 350,
  'eyes:confident': 400,
  // ── Mouth (VIP) ──
  'mouth:goldTooth': 500,
  'mouth:pipe': 450,
  'mouth:vampire': 400,
  'mouth:zipper': 350,
  'mouth:blowfish': 350,
  // ── Accessories (VIP) ──
  'accessory:crown': 800,
  'accessory:tiara': 700,
  'accessory:viking': 650,
  'accessory:devilHorns': 500,
  'accessory:headphones': 450,
  'accessory:monocle': 500,
  'accessory:eyepatch': 400,
  'accessory:mask': 450,
  'accessory:sombrero': 500,
  'accessory:flowerCrown': 500,
  // ── Hair (VIP) ──
  'hair:elvis': 600,
  'hair:ramen': 550,
  'hair:twintails': 500,
  'hair:undercut': 450,
  'hair:spaceBuns': 500,
  'hair:fadeCurly': 500,
  // ── Eyebrows (VIP) ──
  'eyebrows:arched': 350,
  'eyebrows:bushy': 300,
  'eyebrows:scarred': 400,
  // ── Facial Hair (VIP) ──
  'facialHair:vanDyke': 500,
  'facialHair:handlebar': 600,
  'facialHair:fuManchu': 500,
  'facialHair:trimmedBeard': 450,
  // ── Bases (VIP) ──
  'base:diamond': 900,
  // ── Background Colors (VIP) ──
  'bgColor:#FF0000': 250,
  'bgColor:#000000': 300,
  'bgColor:#4B0082': 250,
  'bgColor:#FFD700': 350,
};

// Epic per-part prices (legendary tier)
export const EPIC_PART_PRICES: Record<string, number> = {
  // ── Eyes (Epic) ──
  'eyes:galaxy': 1500, 'eyes:flame': 1500, 'eyes:robot': 1200, 'eyes:void': 2000,
  // ── Mouth (Epic) ──
  'mouth:dragon': 1500, 'mouth:diamond': 2000, 'mouth:glitch': 1200,
  // ── Eyebrows (Epic) ──
  'eyebrows:angryThick': 800,
  // ── Facial Hair (Epic) ──
  'facialHair:wizardBeard': 2000, 'facialHair:braidedBeard': 1800,
  // ── Accessories (Epic) ──
  'accessory:samurai': 2500, 'accessory:astronaut': 2500, 'accessory:wizardHat': 2000, 'accessory:ninjaScarf': 1800,
  'accessory:cyberpunkVisor': 2000,
  // ── Hair (Epic) ──
  'hair:flame': 2000, 'hair:galaxy': 2500, 'hair:neon': 1800,
  // ── Bases (Epic) ──
  'base:skull': 3000, 'base:shield': 2500,
  // LEGENDARY — the 3 rarest items in the game
  'eyes:infinity': 7500,
  'accessory:phoenixCrown': 10000,
  'base:dragonHead': 10000,
};

/** Get price for a part (epic > vip per-part > category default) */
export function getPartPrice(category: string, partId: string): number {
  const key = `${category}:${partId}`;
  return EPIC_PART_PRICES[key] ?? VIP_PART_PRICES[key] ?? PREMIUM_PART_PRICES[category] ?? 500;
}

/** Check if a part is epic tier */
export function isEpicPart(category: string, value: string): boolean {
  const epicMap: Record<string, readonly string[]> = {
    eyes: EPIC_EYE_STYLES, mouth: EPIC_MOUTH_STYLES,
    accessory: EPIC_ACCESSORIES, hair: EPIC_HAIR_STYLES, base: EPIC_BASES,
    facialHair: EPIC_FACIAL_HAIR_STYLES, eyebrows: EPIC_EYEBROW_STYLES,
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
  facialHair: [...PREMIUM_FACIAL_HAIR_STYLES, ...EPIC_FACIAL_HAIR_STYLES],
  eyebrows: [...PREMIUM_EYEBROW_STYLES, ...EPIC_EYEBROW_STYLES],
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

/** All categories that have premium parts (for iteration) */
export const PREMIUM_CATEGORIES = Object.keys(PREMIUM_MAP) as readonly string[];

// ==================== Hidden Parts ====================
// Parts that look broken or read wrong — hidden from picker + random generation,
// but kept in the schema enum so existing saved configs still validate and render.
// Bar for hiding: clearly looks bad AND isn't stylized/funny enough to redeem.
// Stylized-but-unusual parts (cyclops, hypno, geometric bases) stay visible.
export const HIDDEN_PARTS = {
  base: [],
  eyes: [],
  mouth: ['pipe', 'drool', 'mustache'],
  hair: ['frizzle'],
  accessory: ['plunger'],
} as const;

type HiddenCategory = keyof typeof HIDDEN_PARTS;

/** Return only the parts that should be shown in the picker UI. */
export function visibleParts<T extends string>(category: HiddenCategory, all: readonly T[]): T[] {
  const hidden = HIDDEN_PARTS[category] as readonly string[];
  return all.filter(p => !hidden.includes(p));
}

const isHidden = (cat: HiddenCategory, v: string) =>
  (HIDDEN_PARTS[cat] as readonly string[]).includes(v);

// Free-only arrays (all premium+epic+hidden parts filtered out) for random generation
// Also exclude 'none' from face parts so random avatars always have a complete face
const FREE_BASES = AVATAR_BASES.filter(v => !PREMIUM_MAP.base.includes(v) && !isHidden('base', v));
const FREE_EYE_STYLES = AVATAR_EYE_STYLES.filter(v => v !== 'none' && !PREMIUM_MAP.eyes.includes(v) && !isHidden('eyes', v));
const FREE_MOUTH_STYLES = AVATAR_MOUTH_STYLES.filter(v => v !== 'none' && !PREMIUM_MAP.mouth.includes(v) && !isHidden('mouth', v));
const FREE_ACCESSORIES = AVATAR_ACCESSORIES.filter(v => !PREMIUM_MAP.accessory.includes(v) && !isHidden('accessory', v));
const FREE_FACIAL_HAIR_STYLES = AVATAR_FACIAL_HAIR_STYLES.filter(v => !PREMIUM_MAP.facialHair.includes(v));
const FREE_EYEBROW_STYLES = AVATAR_EYEBROW_STYLES.filter(v => !PREMIUM_MAP.eyebrows.includes(v));
const FREE_HAIR_STYLES = AVATAR_HAIR_STYLES.filter(v => v !== 'none' && !PREMIUM_MAP.hair.includes(v) && !isHidden('hair', v));

export function getRandomAvatarConfig(): CustomAvatarConfig {
  const pick = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];
  const gender = pick(AVATAR_GENDERS);
  return {
    gender,
    base: pick(FREE_BASES),
    skinColor: pick(AVATAR_SKIN_COLORS),
    hair: pick(FREE_HAIR_STYLES),
    hairColor: pick(AVATAR_HAIR_COLORS),
    eyes: pick(FREE_EYE_STYLES),
    eyeColor: pick(AVATAR_EYE_COLORS),
    noseStyle: pick(AVATAR_NOSE_STYLES),
    eyebrows: pick(FREE_EYEBROW_STYLES),
    facialHair: gender === 'male' ? pick(FREE_FACIAL_HAIR_STYLES) : 'none',
    mouth: pick(FREE_MOUTH_STYLES),
    accessory: pick(FREE_ACCESSORIES),
    accessoryColor: pick(AVATAR_ACCESSORY_COLORS),
    bgColor: pick(AVATAR_BG_COLORS),
    shirtColor: pick(AVATAR_SHIRT_COLORS),
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
  const gender = pick(AVATAR_GENDERS);
  return {
    gender,
    base: pick(FREE_BASES),
    skinColor: pick(AVATAR_SKIN_COLORS),
    hair: pick(FREE_HAIR_STYLES),
    hairColor: pick(AVATAR_HAIR_COLORS),
    eyes: pick(FREE_EYE_STYLES),
    eyeColor: pick(AVATAR_EYE_COLORS),
    noseStyle: pick(AVATAR_NOSE_STYLES),
    eyebrows: pick(FREE_EYEBROW_STYLES),
    facialHair: gender === 'male' ? pick(FREE_FACIAL_HAIR_STYLES) : 'none',
    mouth: pick(FREE_MOUTH_STYLES),
    accessory: pick(FREE_ACCESSORIES),
    accessoryColor: pick(AVATAR_ACCESSORY_COLORS),
    bgColor: pick(AVATAR_BG_COLORS),
    shirtColor: pick(AVATAR_SHIRT_COLORS),
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
