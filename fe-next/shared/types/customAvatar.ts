import { z } from 'zod';

// ==================== Gender ====================
export const AVATAR_GENDERS = ['male', 'female'] as const;

// ==================== Face Base Shapes ====================
export const AVATAR_BASES = ['round', 'square', 'oval', 'heart', 'diamond', 'hexagon', 'blob', 'skull', 'shield', 'dragonHead', 'triangle', 'catFace', 'oblong', 'rectangular', 'pear', 'slime', 'robotHead', 'alienHead', 'ghostFace'] as const;

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
  'mullet', 'combover', 'trumpSwoop', 'elvis', 'ramen', 'flame', 'galaxy', 'neon',
  'pixie', 'undercut', 'spaceBuns', 'straight', 'fade', 'cornrows', 'wolfCut',
  'curtainBangs', 'halfUp', 'himecut',
  'frenchBob', 'shag', 'flatTop', 'lob', 'fingerWaves', 'curlyBangs', 'quiff', 'sideSwept',
  'fadeCurly',
  'frizzle', 'durag', 'locsShort',
  /* Feminine-only additions (girly differentiation) */
  'heartBuns', 'sideBow', 'milkmaidBraids', 'butterflyClips', 'lowPigtailsBow',
  'princessBraid', 'sideBraidBow',
  /* New epic/cool hair */
  'lightning', 'rainbowMohawk', 'iceSpikes', 'cottonCandy', 'vaporwave',
] as const;

/** Styles that look feminine — shown when gender is female. No overlap with MALE except gender-neutral shared (curly, afro, dreads, cornrows, straight). */
export const FEMALE_HAIR_STYLES = [
  'none',
  /* Femme-coded back-layer styles */
  'long', 'bob', 'wavy', 'pigtails', 'braids', 'bangs', 'twintails',
  'pixie', 'spaceBuns', 'curtainBangs', 'halfUp', 'himecut',
  'frenchBob', 'lob', 'fingerWaves', 'curlyBangs', 'sideshave',
  /* New girly-only styles */
  'heartBuns', 'sideBow', 'milkmaidBraids', 'butterflyClips', 'lowPigtailsBow',
  'princessBraid', 'sideBraidBow',
  /* Gender-neutral shared */
  'curly', 'afro', 'dreads', 'cornrows', 'straight',
  /* New epic/cool hair (unisex) */
  'lightning', 'rainbowMohawk', 'iceSpikes', 'cottonCandy', 'vaporwave',
] as const;

/** Styles that look masculine — shown when gender is male. */
export const MALE_HAIR_STYLES = [
  'none', 'spiky', 'buzz', 'mohawk', 'topknot',
  'mullet', 'combover', 'trumpSwoop', 'elvis', 'ramen',
  'undercut', 'fade', 'wolfCut', 'ponytail', 'bun',
  'flatTop', 'quiff', 'shag', 'sideSwept', 'fadeCurly',
  'frizzle', 'durag', 'locsShort',
  /* Gender-neutral shared */
  'curly', 'afro', 'dreads', 'cornrows', 'straight',
  /* New epic/cool hair (unisex) */
  'lightning', 'rainbowMohawk', 'iceSpikes', 'cottonCandy', 'vaporwave',
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
  /* New epic/cool eyes */
  'pixelEyes', 'targetEyes', 'kawaii', 'glitchEyes', 'rainbowEyes', 'thirdEye',
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
  /* New epic facial hair */
  'rainbowBeard', 'flameBeard',
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
  /* New epic/cool mouths */
  'fangs', 'rainbowTongue', 'robotMouth', 'grillz', 'neonSmile',
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
  /* New epic/cool accessories */
  'angelWings', 'demonWings', 'butterflyWings', 'gamerHeadset', 'cowboyHat',
  'pirateHat', 'topHat', 'graduationCap', 'tinfoilHat', 'duckHat', 'vrHeadset',
  'frogHat', 'flamingHalo', 'iceCrown', 'crystalCrown',
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
  // New VIP eyes
  'pixelEyes', 'targetEyes', 'kawaii',
] as const;

export const PREMIUM_MOUTH_STYLES = [
  'goldTooth', 'pipe', 'vampire',
  'zipper', 'blowfish',
  // New VIP mouths
  'fangs', 'rainbowTongue', 'robotMouth',
] as const;

export const PREMIUM_ACCESSORIES = [
  'crown', 'tiara', 'viking', 'devilHorns', 'headphones',
  'monocle', 'eyepatch', 'mask', 'sombrero',
  'flowerCrown',
  // New VIP accessories
  'gamerHeadset', 'cowboyHat', 'pirateHat', 'topHat', 'graduationCap',
  'tinfoilHat', 'duckHat', 'vrHeadset',
] as const;

export const PREMIUM_HAIR_STYLES = [
  'elvis', 'ramen', 'twintails',
  'undercut', 'spaceBuns', 'fadeCurly',
  // New VIP hair
  'cottonCandy', 'vaporwave',
] as const;

export const PREMIUM_BG_COLORS = ['#FF0000', '#000000', '#4B0082', '#FFD700'] as const;

export const PREMIUM_BASES = ['diamond', 'slime'] as const;

// ==================== Epic Part Definitions (Legendary tier) ====================
// Gradient-filled, multi-layer, jaw-dropping showpieces. 3-5x VIP price.

export const EPIC_EYE_STYLES = ['galaxy', 'flame', 'robot', 'void', 'infinity', 'glitchEyes', 'rainbowEyes', 'thirdEye'] as const;
export const EPIC_MOUTH_STYLES = ['dragon', 'diamond', 'glitch', 'grillz', 'neonSmile'] as const;
export const EPIC_ACCESSORIES = ['samurai', 'astronaut', 'wizardHat', 'ninjaScarf', 'phoenixCrown', 'cyberpunkVisor',
  // New epic accessories
  'angelWings', 'demonWings', 'butterflyWings', 'frogHat', 'flamingHalo', 'iceCrown', 'crystalCrown'] as const;
export const EPIC_HAIR_STYLES = ['flame', 'galaxy', 'neon', 'lightning', 'rainbowMohawk', 'iceSpikes', 'trumpSwoop'] as const;
export const EPIC_BASES = ['skull', 'shield', 'dragonHead', 'robotHead', 'alienHead', 'ghostFace'] as const;

export const PREMIUM_EYEBROW_STYLES = ['arched', 'bushy', 'scarred'] as const;
export const EPIC_EYEBROW_STYLES = ['angryThick'] as const;

export const PREMIUM_FACIAL_HAIR_STYLES = ['vanDyke', 'handlebar', 'fuManchu', 'trimmedBeard'] as const;
export const EPIC_FACIAL_HAIR_STYLES = ['wizardBeard', 'braidedBeard', 'rainbowBeard', 'flameBeard'] as const;

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
  'eyes:pixelEyes': 450,
  'eyes:targetEyes': 500,
  'eyes:kawaii': 500,
  // ── Mouth (VIP) ──
  'mouth:goldTooth': 500,
  'mouth:pipe': 450,
  'mouth:vampire': 400,
  'mouth:zipper': 350,
  'mouth:blowfish': 350,
  'mouth:fangs': 400,
  'mouth:rainbowTongue': 400,
  'mouth:robotMouth': 450,
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
  'accessory:gamerHeadset': 650,
  'accessory:cowboyHat': 500,
  'accessory:pirateHat': 600,
  'accessory:topHat': 550,
  'accessory:graduationCap': 500,
  'accessory:tinfoilHat': 450,
  'accessory:duckHat': 550,
  'accessory:vrHeadset': 700,
  // ── Hair (VIP) ──
  'hair:elvis': 600,
  'hair:ramen': 550,
  'hair:twintails': 500,
  'hair:undercut': 450,
  'hair:spaceBuns': 500,
  'hair:fadeCurly': 500,
  'hair:cottonCandy': 550,
  'hair:vaporwave': 600,
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
  'base:slime': 800,
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
  'eyes:glitchEyes': 1500, 'eyes:rainbowEyes': 1500, 'eyes:thirdEye': 8000,
  // ── Mouth (Epic) ──
  'mouth:dragon': 1500, 'mouth:diamond': 2000, 'mouth:glitch': 1200,
  'mouth:grillz': 1500, 'mouth:neonSmile': 1500,
  // ── Eyebrows (Epic) ──
  'eyebrows:angryThick': 800,
  // ── Facial Hair (Epic) ──
  'facialHair:wizardBeard': 2000, 'facialHair:braidedBeard': 1800,
  'facialHair:rainbowBeard': 1500, 'facialHair:flameBeard': 1500,
  // ── Accessories (Epic) ──
  'accessory:samurai': 2500, 'accessory:astronaut': 2500, 'accessory:wizardHat': 2000, 'accessory:ninjaScarf': 1800,
  'accessory:cyberpunkVisor': 2000,
  'accessory:angelWings': 2200, 'accessory:demonWings': 2200, 'accessory:butterflyWings': 1800,
  'accessory:frogHat': 1500, 'accessory:flamingHalo': 2000, 'accessory:iceCrown': 1800,
  // ── Hair (Epic) ──
  'hair:flame': 2000, 'hair:galaxy': 2500, 'hair:neon': 1800,
  'hair:lightning': 2000, 'hair:rainbowMohawk': 1800, 'hair:iceSpikes': 1800,
  // ── Bases (Epic) ──
  'base:skull': 3000, 'base:shield': 2500,
  'base:robotHead': 2500, 'base:alienHead': 2200, 'base:ghostFace': 2000,
  // LEGENDARY — the rarest items in the game
  'eyes:infinity': 7500,
  'accessory:phoenixCrown': 10000,
  'base:dragonHead': 10000,
  'accessory:crystalCrown': 12000,
  'hair:trumpSwoop': 9000, // celebrity lookalike part — legendary
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
export const LEGENDARY_PARTS = ['eyes:infinity', 'accessory:phoenixCrown', 'base:dragonHead', 'accessory:crystalCrown', 'eyes:thirdEye', 'hair:trumpSwoop'] as const;

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

// ==================== "NEW" parts (freshly added — show a NEW ribbon) ====================
// Drives the NEW badge in the builder so players discover the latest drops.
// Keyed by category -> part ids. Bump this list when a new batch ships.
const NEW_PARTS_MAP: Record<string, readonly string[]> = {
  accessory: [
    'angelWings', 'demonWings', 'butterflyWings', 'gamerHeadset', 'cowboyHat',
    'pirateHat', 'topHat', 'graduationCap', 'tinfoilHat', 'duckHat', 'vrHeadset',
    'frogHat', 'flamingHalo', 'iceCrown', 'crystalCrown',
  ],
  eyes: ['pixelEyes', 'targetEyes', 'kawaii', 'glitchEyes', 'rainbowEyes', 'thirdEye'],
  mouth: ['fangs', 'rainbowTongue', 'robotMouth', 'grillz', 'neonSmile'],
  hair: ['lightning', 'rainbowMohawk', 'iceSpikes', 'cottonCandy', 'vaporwave'],
  base: ['slime', 'robotHead', 'alienHead', 'ghostFace'],
  facialHair: ['rainbowBeard', 'flameBeard'],
};

/** Whether a part was added in the latest drop (shows a NEW ribbon in the builder). */
export function isNewPart(category: string, value: string): boolean {
  return (NEW_PARTS_MAP[category] as readonly string[] | undefined)?.includes(value) ?? false;
}

/** All NEW parts as "category:id" keys (for counts / discovery surfaces). */
export const NEW_PART_KEYS: readonly string[] = Object.entries(NEW_PARTS_MAP).flatMap(
  ([cat, ids]) => ids.map((id) => `${cat}:${id}`),
);

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
// "Real" (non-empty) variants — used so accessories/beards are an opt-IN highlight,
// not a coin-flip that fills every slot (the generated-slop tell).
const FREE_REAL_ACCESSORIES = FREE_ACCESSORIES.filter(v => v !== 'none');
const FREE_REAL_FACIAL_HAIR = FREE_FACIAL_HAIR_STYLES.filter(v => v !== 'none');
const FREE_EYEBROW_STYLES = AVATAR_EYEBROW_STYLES.filter(v => !PREMIUM_MAP.eyebrows.includes(v));
// Gender-specific free hair lists prevent cross-gender style mismatch in random generation
const FREE_FEMALE_HAIR_STYLES = FEMALE_HAIR_STYLES.filter(v => v !== 'none' && !isPremiumPart('hair', v) && !isHidden('hair', v));
const FREE_MALE_HAIR_STYLES = MALE_HAIR_STYLES.filter(v => v !== 'none' && !isPremiumPart('hair', v) && !isHidden('hair', v));

// Curated color vibes for random generation — pick a vibe first, then draw all colors from it.
// This prevents jarring clashes (dark bg + near-black hair, warm skin + icy blue eyes, etc.).
type AvatarVibe = {
  skin: readonly string[];
  hair: readonly string[];
  eyes: readonly string[];
  bg: readonly string[];
  shirt: readonly string[];
  accessory: readonly string[];
};

const AVATAR_VIBES: readonly AvatarVibe[] = [
  // Warm & Earthy — warm skin, natural brown/honey hair, amber/brown eyes
  {
    skin: ['#FFDBB4', '#F8D5C2', '#EDB98A', '#D08B5B', '#FFE0BD', '#C68642'],
    hair: ['#2C1B18', '#4A3728', '#8B6E4E', '#D4A574', '#E8C07A'],
    eyes: ['#92400E', '#78350F', '#6B4423', '#B45309', '#D97706'],
    bg: ['#1a1a2e', '#FF6B35'],
    shirt: ['#FF6B35', '#C62828', '#4A90D9', '#2C1B18'],
    accessory: ['#FFD700', '#000000', '#FF6B35'],
  },
  // Cool & Nordic — light skin, silver/blonde/black hair, blue/grey eyes
  {
    skin: ['#FFDBB4', '#F8D5C2', '#FFE0BD'],
    hair: ['#FFFFFF', '#C0C0C0', '#808080', '#2C1B18', '#E8C07A'],
    eyes: ['#4A6FA5', '#3B82F6', '#2563EB', '#1D4ED8', '#6B7280', '#9CA3AF'],
    bg: ['#1a1a2e', '#00FFFF'],
    shirt: ['#4A90D9', '#8B5CF6', '#2C1B18'],
    accessory: ['#00FFFF', '#FFFFFF', '#000000'],
  },
  // Fiery Passion — any warm skin, red/orange hair, amber eyes
  {
    skin: ['#FFDBB4', '#EDB98A', '#D08B5B', '#AE5D29', '#C68642', '#8D5524'],
    hair: ['#C62828', '#F57F17'],
    eyes: ['#B45309', '#D97706', '#92400E', '#78350F'],
    bg: ['#1a1a2e', '#FF6B35', '#FF1493'],
    shirt: ['#C62828', '#FF6B35', '#FFD700'],
    accessory: ['#FF6B35', '#FFD700', '#FF1493'],
  },
  // Dark & Moody — deep skin, dark/purple hair, violet eyes
  {
    skin: ['#AE5D29', '#694D3D', '#8D5524', '#4A2912'],
    hair: ['#2C1B18', '#4A3728', '#6A1B9A'],
    eyes: ['#7C3AED', '#A855F7', '#4A6FA5'],
    bg: ['#1a1a2e', '#8B5CF6'],
    shirt: ['#8B5CF6', '#4A90D9', '#2C1B18', '#C62828'],
    accessory: ['#8B5CF6', '#BFFF00', '#000000'],
  },
  // Candy Pop — light/pastel skin, vivid pink/purple/teal hair, bright eyes
  {
    skin: ['#FFDBB4', '#F8D5C2', '#FFE0BD', '#FFB6C1', '#E6E6FA'],
    hair: ['#FF1493', '#6A1B9A', '#00897B', '#C62828'],
    eyes: ['#3B82F6', '#7C3AED', '#059669', '#10B981'],
    bg: ['#FF1493', '#BFFF00', '#8B5CF6', '#FFE135'],
    shirt: ['#E85D9B', '#8B5CF6', '#FFD700', '#FF6B35'],
    accessory: ['#FF1493', '#BFFF00', '#8B5CF6', '#FFFFFF'],
  },
  // Fantasy & Otherworldly — fantastical skin (blue/green/lavender/grey), mystical hair
  {
    skin: ['#87CEEB', '#98FB98', '#FFB6C1', '#E6E6FA', '#FFFACD', '#808080', '#A9A9A9'],
    hair: ['#FFFFFF', '#C0C0C0', '#6A1B9A', '#00897B', '#FF1493', '#4A3728'],
    eyes: ['#7C3AED', '#A855F7', '#059669', '#10B981', '#4A6FA5'],
    bg: ['#8B5CF6', '#1a1a2e', '#00897B'],
    shirt: ['#8B5CF6', '#00897B', '#E85D9B', '#4A90D9'],
    accessory: ['#BFFF00', '#8B5CF6', '#FFFFFF', '#00FFFF'],
  },
  // Nature & Earthy — medium-to-dark skin, earthy/teal hair, green eyes
  {
    skin: ['#EDB98A', '#D08B5B', '#AE5D29', '#C68642', '#8D5524', '#694D3D'],
    hair: ['#00897B', '#4A3728', '#2C1B18', '#8B6E4E'],
    eyes: ['#059669', '#10B981', '#047857', '#92400E'],
    bg: ['#00897B', '#1a1a2e'],
    shirt: ['#00897B', '#4A90D9', '#C62828', '#FF6B35'],
    accessory: ['#00FFFF', '#BFFF00', '#FFD700'],
  },
  // Neon Cyber — light/medium skin, high-contrast hair (white or black), vivid eyes + neon accents
  {
    skin: ['#FFDBB4', '#F8D5C2', '#EDB98A', '#D08B5B'],
    hair: ['#FFFFFF', '#2C1B18', '#808080', '#C0C0C0'],
    eyes: ['#059669', '#10B981', '#3B82F6', '#7C3AED'],
    bg: ['#1a1a2e', '#BFFF00', '#FF1493', '#00FFFF'],
    shirt: ['#2C1B18', '#8B5CF6', '#4A90D9', '#00897B'],
    accessory: ['#BFFF00', '#00FFFF', '#FF1493', '#8B5CF6'],
  },
] as const;

// How often an auto-generated avatar gets a "statement" extra. Tuned so most
// avatars read as a clean, characterful face + at most ONE highlight — not a
// slot machine that staples a random hat on everyone.
const ACCESSORY_CHANCE = 0.33;
const FACIAL_HAIR_CHANCE = 0.3;

function buildConfig(
  gender: (typeof AVATAR_GENDERS)[number],
  vibe: AvatarVibe,
  pick: <T>(arr: readonly T[]) => T,
  rand: () => number,
): CustomAvatarConfig {
  const hairList = gender === 'female' ? FREE_FEMALE_HAIR_STYLES : FREE_MALE_HAIR_STYLES;
  // One highlight at most: an accessory OR facial hair, usually neither.
  const accessory = rand() < ACCESSORY_CHANCE ? pick(FREE_REAL_ACCESSORIES) : 'none';
  const facialHair =
    gender === 'male' && accessory === 'none' && rand() < FACIAL_HAIR_CHANCE
      ? pick(FREE_REAL_FACIAL_HAIR)
      : 'none';
  return {
    gender,
    base: pick(FREE_BASES),
    skinColor: pick(vibe.skin),
    hair: pick(hairList),
    hairColor: pick(vibe.hair),
    eyes: pick(FREE_EYE_STYLES),
    eyeColor: pick(vibe.eyes),
    noseStyle: pick(AVATAR_NOSE_STYLES),
    eyebrows: pick(FREE_EYEBROW_STYLES),
    facialHair,
    mouth: pick(FREE_MOUTH_STYLES),
    accessory,
    accessoryColor: pick(vibe.accessory),
    bgColor: pick(vibe.bg),
    shirtColor: pick(vibe.shirt),
  };
}

export function getRandomAvatarConfig(): CustomAvatarConfig {
  const rand = () => Math.random();
  const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];
  return buildConfig(pick(AVATAR_GENDERS), pick(AVATAR_VIBES), pick, rand);
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
  return buildConfig(pick(AVATAR_GENDERS), pick(AVATAR_VIBES), pick, rand);
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
