/**
 * THE avatar catalog — the one module the editor (and every other picker)
 * reads to know what can be put on an avatar.
 *
 * Owned by the art track. Consumers (editor, reveal, profile) must NOT import
 * components/avatar/parts/* or components/avatar/art/* directly — they read
 * categories, parts, palettes and the cheap `PartThumb` from here. Exported
 * names are a contract: extend, never rename.
 *
 * Pure data + a component re-export. Rarity comes from lib/avatar/rarity.ts,
 * the level that grants a part from lib/avatar/unlocks.ts, prices from the
 * gold tables in shared/types/customAvatar.ts — so a part can never show a
 * different rarity / level / price here than it has in the economy.
 */
import {
  AVATAR_ACCESSORIES,
  AVATAR_ACCESSORY_COLORS,
  AVATAR_BASES,
  AVATAR_BG_COLORS,
  AVATAR_BODY_STYLES,
  AVATAR_EYEBROW_STYLES,
  AVATAR_EYE_COLORS,
  AVATAR_EYE_STYLES,
  AVATAR_FACIAL_HAIR_STYLES,
  AVATAR_HAIR_COLORS,
  AVATAR_HAIR_STYLES,
  AVATAR_MOUTH_STYLES,
  AVATAR_NOSE_STYLES,
  AVATAR_SHIRT_COLORS,
  AVATAR_SKIN_COLORS,
  FEMALE_HAIR_STYLES,
  HIDDEN_PARTS,
  MALE_HAIR_STYLES,
  PREMIUM_BG_COLORS,
  getPartPrice,
  isNewPart,
  isPremiumPart,
  type CustomAvatarConfig,
} from '@/shared/types/customAvatar';
import { getPartRarity, type VisualTier } from './rarity';
import { getUnlockLevel } from './unlocks';
import { CANONICAL_PARTS } from './legacyMap';

/** Cheap single-layer picker thumbnail — use this, never a full avatar per cell. */
export { PartThumb, type PartThumbProps, type ThumbCategory } from '@/components/avatar/art/PartThumb';

export type AvatarGender = 'male' | 'female';
const BOTH: readonly AvatarGender[] = ['male', 'female'];

/** Config fields that hold a part id. The category id IS the config key. */
export type PartCategoryId =
  | 'base'
  | 'hair'
  | 'eyes'
  | 'eyebrows'
  | 'noseStyle'
  | 'mouth'
  | 'facialHair'
  | 'accessory'
  | 'bodyStyle';

/** Config fields that hold a color. The palette id IS the config key. */
export type PaletteId = 'skinColor' | 'hairColor' | 'eyeColor' | 'accessoryColor' | 'shirtColor' | 'bgColor';

export interface PartCategory {
  id: PartCategoryId;
  configKey: keyof CustomAvatarConfig;
  /** Category name used in premium keys / rarity tables ("category:partId"). */
  rarityCategory: string;
  labelKey: string;
  /** Which palette recolors this category's art (null = fixed colors). */
  palette: PaletteId | null;
  /** 'none' is a valid pick (bare head, no hat…). */
  allowsNone: boolean;
}

export const PART_CATEGORIES: readonly PartCategory[] = [
  { id: 'base', configKey: 'base', rarityCategory: 'base', labelKey: 'avatarBuilder.shape', palette: 'skinColor', allowsNone: false },
  { id: 'hair', configKey: 'hair', rarityCategory: 'hair', labelKey: 'avatarBuilder.hair', palette: 'hairColor', allowsNone: true },
  { id: 'eyes', configKey: 'eyes', rarityCategory: 'eyes', labelKey: 'avatarBuilder.eyes', palette: 'eyeColor', allowsNone: false },
  { id: 'eyebrows', configKey: 'eyebrows', rarityCategory: 'eyebrows', labelKey: 'avatarBuilder.eyebrows', palette: 'hairColor', allowsNone: true },
  { id: 'noseStyle', configKey: 'noseStyle', rarityCategory: 'nose', labelKey: 'avatarBuilder.nose', palette: 'skinColor', allowsNone: true },
  { id: 'mouth', configKey: 'mouth', rarityCategory: 'mouth', labelKey: 'avatarBuilder.mouth', palette: null, allowsNone: false },
  { id: 'facialHair', configKey: 'facialHair', rarityCategory: 'facialHair', labelKey: 'avatarBuilder.facialHair', palette: 'hairColor', allowsNone: true },
  { id: 'accessory', configKey: 'accessory', rarityCategory: 'accessory', labelKey: 'avatarBuilder.accessories', palette: 'accessoryColor', allowsNone: true },
  { id: 'bodyStyle', configKey: 'bodyStyle', rarityCategory: 'body', labelKey: 'avatarBuilder.bodyStyle', palette: 'shirtColor', allowsNone: false },
];

const CATEGORY_BY_ID = new Map(PART_CATEGORIES.map(c => [c.id, c]));

export function getPartCategory(id: PartCategoryId): PartCategory {
  const cat = CATEGORY_BY_ID.get(id);
  if (!cat) throw new Error(`unknown avatar part category: ${id}`);
  return cat;
}

// ── Editor tabs ──

export type CatalogSection =
  | { kind: 'gender'; labelKey: string }
  | { kind: 'parts'; category: PartCategoryId; labelKey: string }
  | { kind: 'colors'; palette: PaletteId; labelKey: string };

export type CatalogTabId = 'face' | 'hair' | 'eyes' | 'mouth' | 'facialHair' | 'accessory' | 'outfit' | 'background';

export interface CatalogTab {
  id: CatalogTabId;
  labelKey: string;
  /** Icon id; matches AvatarCategoryKey glyphs where one exists. */
  icon: string;
  /** Only show the tab for these genders. */
  genders: readonly AvatarGender[];
  sections: readonly CatalogSection[];
}

export const AVATAR_CATALOG_TABS: readonly CatalogTab[] = [
  {
    id: 'face', labelKey: 'avatarBuilder.base', icon: 'base', genders: BOTH,
    sections: [
      { kind: 'gender', labelKey: 'avatarBuilder.gender' },
      { kind: 'colors', palette: 'skinColor', labelKey: 'avatarBuilder.skinColor' },
      { kind: 'parts', category: 'base', labelKey: 'avatarBuilder.shape' },
    ],
  },
  {
    id: 'hair', labelKey: 'avatarBuilder.hair', icon: 'hair', genders: BOTH,
    sections: [
      { kind: 'colors', palette: 'hairColor', labelKey: 'avatarBuilder.hairColor' },
      { kind: 'parts', category: 'hair', labelKey: 'avatarBuilder.style' },
    ],
  },
  {
    id: 'eyes', labelKey: 'avatarBuilder.eyes', icon: 'eyes', genders: BOTH,
    sections: [
      { kind: 'parts', category: 'eyes', labelKey: 'avatarBuilder.style' },
      { kind: 'colors', palette: 'eyeColor', labelKey: 'avatarBuilder.eyeColor' },
      { kind: 'parts', category: 'eyebrows', labelKey: 'avatarBuilder.eyebrows' },
      { kind: 'parts', category: 'noseStyle', labelKey: 'avatarBuilder.nose' },
    ],
  },
  {
    id: 'mouth', labelKey: 'avatarBuilder.mouth', icon: 'mouth', genders: BOTH,
    sections: [{ kind: 'parts', category: 'mouth', labelKey: 'avatarBuilder.style' }],
  },
  {
    id: 'facialHair', labelKey: 'avatarBuilder.facialHair', icon: 'facialHair', genders: ['male'],
    sections: [{ kind: 'parts', category: 'facialHair', labelKey: 'avatarBuilder.facialHairStyle' }],
  },
  {
    id: 'accessory', labelKey: 'avatarBuilder.accessories', icon: 'accessories', genders: BOTH,
    sections: [
      { kind: 'parts', category: 'accessory', labelKey: 'avatarBuilder.type' },
      { kind: 'colors', palette: 'accessoryColor', labelKey: 'avatarBuilder.accessoryColor' },
    ],
  },
  {
    id: 'outfit', labelKey: 'avatarBuilder.bodyStyle', icon: 'outfit', genders: BOTH,
    sections: [
      { kind: 'parts', category: 'bodyStyle', labelKey: 'avatarBuilder.bodyStyle' },
      { kind: 'colors', palette: 'shirtColor', labelKey: 'avatarBuilder.shirtColor' },
    ],
  },
  {
    id: 'background', labelKey: 'avatarBuilder.background', icon: 'background', genders: BOTH,
    sections: [{ kind: 'colors', palette: 'bgColor', labelKey: 'avatarBuilder.bgColor' }],
  },
];

// ── Parts ──

export interface CatalogPart {
  category: PartCategoryId;
  id: string;
  /** "category:partId" — same format as profiles.premium_avatar_parts. */
  key: string;
  rarity: VisualTier;
  genders: readonly AvatarGender[];
  /** Retired / hidden: still renders for old saves, never offered in pickers. */
  isHidden: boolean;
  isNew: boolean;
  /** Gold price, or null for free (common) parts. */
  price: number | null;
  /** Level that grants it for free, or null if not on the ladder. */
  unlockLevel: number | null;
}

const ALL_IDS: Record<PartCategoryId, readonly string[]> = {
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

const FEMALE_HAIR = new Set<string>(FEMALE_HAIR_STYLES);
const MALE_HAIR = new Set<string>(MALE_HAIR_STYLES);

function gendersFor(category: PartCategoryId, id: string): readonly AvatarGender[] {
  if (id === 'none') return BOTH;
  if (category === 'facialHair') return ['male'];
  if (category === 'hair') {
    const g: AvatarGender[] = [];
    if (MALE_HAIR.has(id)) g.push('male');
    if (FEMALE_HAIR.has(id)) g.push('female');
    return g;
  }
  return BOTH;
}

function isHiddenPart(category: PartCategoryId, id: string): boolean {
  const hidden = (HIDDEN_PARTS as Record<string, readonly string[]>)[category] ?? [];
  if (hidden.includes(id)) return true;
  // A hair style in neither gender picker can't be chosen by anyone.
  return category === 'hair' && gendersFor(category, id).length === 0;
}

export function catalogPartKey(rarityCategory: string, id: string): string {
  return `${rarityCategory}:${id}`;
}

function buildPart(category: PartCategoryId, id: string): CatalogPart {
  const rc = getPartCategory(category).rarityCategory;
  const premium = isPremiumPart(rc, id);
  return {
    category,
    id,
    key: catalogPartKey(rc, id),
    rarity: getPartRarity(rc, id),
    genders: gendersFor(category, id),
    isHidden: isHiddenPart(category, id),
    isNew: isNewPart(rc, id),
    price: premium ? getPartPrice(rc, id) : null,
    unlockLevel: getUnlockLevel(rc, id),
  };
}

/** Picker order: drawn parts first (common → legendary, as drawn), retired ids after. */
function orderedIds(category: PartCategoryId): string[] {
  const canon = CANONICAL_PARTS[category];
  return [...canon, ...ALL_IDS[category].filter(id => !canon.includes(id))];
}

const PARTS: Record<PartCategoryId, readonly CatalogPart[]> = Object.fromEntries(
  PART_CATEGORIES.map(c => [c.id, orderedIds(c.id).map(id => buildPart(c.id, id))]),
) as unknown as Record<PartCategoryId, readonly CatalogPart[]>;

export interface PartQuery {
  gender?: AvatarGender;
  /** Include retired/hidden parts (for rendering old saves, admin, tests). */
  includeHidden?: boolean;
}

/** Parts for a category, picker order. Hidden parts are excluded unless asked for. */
export function getCatalogParts(category: PartCategoryId, query: PartQuery = {}): CatalogPart[] {
  return (PARTS[category] ?? []).filter(p =>
    (query.includeHidden || !p.isHidden) && (!query.gender || p.genders.includes(query.gender)),
  );
}

/** One part by category (config key or rarity category name) + id. */
export function getCatalogPart(category: string, id: string): CatalogPart | undefined {
  const cat = PART_CATEGORIES.find(c => c.id === category || c.rarityCategory === category);
  return cat ? PARTS[cat.id].find(p => p.id === id) : undefined;
}

// ── Palettes ──

export interface CatalogColor {
  palette: PaletteId;
  hex: string;
  key: string;
  rarity: VisualTier;
  price: number | null;
  unlockLevel: number | null;
}

export const PALETTE_IDS: readonly PaletteId[] = ['skinColor', 'hairColor', 'eyeColor', 'accessoryColor', 'shirtColor', 'bgColor'];

const PALETTE_HEXES: Record<PaletteId, readonly string[]> = {
  skinColor: AVATAR_SKIN_COLORS,
  hairColor: AVATAR_HAIR_COLORS,
  eyeColor: AVATAR_EYE_COLORS,
  accessoryColor: AVATAR_ACCESSORY_COLORS,
  shirtColor: AVATAR_SHIRT_COLORS,
  bgColor: [...AVATAR_BG_COLORS, ...PREMIUM_BG_COLORS],
};

function buildColor(palette: PaletteId, hex: string): CatalogColor {
  const premium = palette === 'bgColor' && isPremiumPart('bgColor', hex);
  return {
    palette,
    hex,
    key: `${palette}:${hex}`,
    rarity: palette === 'bgColor' ? getPartRarity('bgColor', hex) : 'common',
    price: premium ? getPartPrice('bgColor', hex) : null,
    unlockLevel: palette === 'bgColor' ? getUnlockLevel('bgColor', hex) : null,
  };
}

const PALETTES: Record<PaletteId, readonly CatalogColor[]> = Object.fromEntries(
  PALETTE_IDS.map(id => [id, PALETTE_HEXES[id].map(hex => buildColor(id, hex))]),
) as unknown as Record<PaletteId, readonly CatalogColor[]>;

export function getPalette(id: PaletteId): CatalogColor[] {
  return [...(PALETTES[id] ?? [])];
}
