/**
 * Editor view model over lib/avatar/catalog.ts — PURE.
 *
 * The catalog says WHAT exists (tabs, sections, parts, palettes). This decides
 * how the editor lays it out on one phone screen:
 *   - `pinned`  — body-type toggle + the tab's main palette, fixed above the grid;
 *   - `sections` — part grids (+ secondary palettes / presets) in the ONE
 *     scrolling area.
 * and applies the editor's visibility rules (gender, onboarding hides premium,
 * accessory color only while an accessory is worn).
 */
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';
import {
  AVATAR_CATALOG_TABS,
  PART_CATEGORIES,
  getCatalogParts,
  getPalette,
  getPartCategory,
  type AvatarGender,
  type CatalogColor,
  type CatalogPart,
  type CatalogTabId,
  type PaletteId,
  type PartCategoryId,
} from '@/lib/avatar/catalog';

export interface GenderSection { kind: 'gender'; labelKey: string }
export interface ColorSection { kind: 'colors'; palette: PaletteId; configKey: PaletteId; labelKey: string; colors: CatalogColor[] }
export interface PartsSection {
  kind: 'parts';
  category: PartCategoryId;
  configKey: keyof CustomAvatarConfig;
  /** Category name for premium keys / lock checks ("nose", "accessory", …). */
  rarityCategory: string;
  labelKey: string;
  parts: CatalogPart[];
}
export interface PresetSection { kind: 'expressions' | 'themes'; labelKey: string }

export type PinnedSection = GenderSection | ColorSection;
export type ScrollSection = PartsSection | ColorSection | PresetSection;

export interface EditorTab {
  id: CatalogTabId;
  labelKey: string;
  icon: string;
  pinned: PinnedSection[];
  sections: ScrollSection[];
}

export interface EditorTabOptions {
  /** false (onboarding / tutorial) → premium parts and colors are not offered at all. */
  showPremium: boolean;
}

function isVisible(rarity: string, opts: EditorTabOptions): boolean {
  return opts.showPremium || rarity === 'common';
}

function colorSection(palette: PaletteId, labelKey: string, opts: EditorTabOptions): ColorSection {
  return {
    kind: 'colors',
    palette,
    configKey: palette,
    labelKey,
    colors: getPalette(palette).filter(c => isVisible(c.rarity, opts)),
  };
}

export function getEditorTabs(config: CustomAvatarConfig, opts: EditorTabOptions): EditorTab[] {
  const gender: AvatarGender = config.gender === 'female' ? 'female' : 'male';
  const tabs: EditorTab[] = [];
  for (const tab of AVATAR_CATALOG_TABS) {
    if (!tab.genders.includes(gender)) continue;
    const pinned: PinnedSection[] = [];
    const sections: ScrollSection[] = [];
    for (const s of tab.sections) {
      if (s.kind === 'gender') {
        pinned.push({ kind: 'gender', labelKey: s.labelKey });
      } else if (s.kind === 'colors') {
        if (s.palette === 'accessoryColor' && (!config.accessory || config.accessory === 'none')) continue;
        const cs = colorSection(s.palette, s.labelKey, opts);
        if (cs.colors.length === 0) continue;
        // The tab's first palette is pinned above the grid (Duolingo-style); later ones scroll.
        if (!pinned.some(p => p.kind === 'colors')) pinned.push(cs);
        else sections.push(cs);
      } else {
        const cat = getPartCategory(s.category);
        const parts = getCatalogParts(s.category, { gender }).filter(p => isVisible(p.rarity, opts));
        if (parts.length === 0) continue;
        sections.push({
          kind: 'parts',
          category: s.category,
          configKey: cat.configKey,
          rarityCategory: cat.rarityCategory,
          labelKey: s.labelKey,
          parts,
        });
      }
    }
    if (tab.id === 'eyes') sections.unshift({ kind: 'expressions', labelKey: 'avatarBuilder.expressions' });
    if (tab.id === 'background') sections.push({ kind: 'themes', labelKey: 'avatarBuilder.colorTheme' });
    if (pinned.length === 0 && sections.length === 0) continue;
    tabs.push({ id: tab.id, labelKey: tab.labelKey, icon: tab.icon, pinned, sections });
  }
  return tabs;
}

// ── One-tap presets (free parts only — guarded by test) ──

export interface ExpressionPreset {
  id: string;
  labelKey: string;
  emoji: string;
  eyes: string;
  eyebrows: string;
  mouth: string;
}

export const EXPRESSION_PRESETS: readonly ExpressionPreset[] = [
  { id: 'happy', labelKey: 'avatar.expression.happy', emoji: '😊', eyes: 'happy', eyebrows: 'natural', mouth: 'smile' },
  { id: 'cool', labelKey: 'avatar.expression.cool', emoji: '😎', eyes: 'cool', eyebrows: 'flat', mouth: 'smirk' },
  { id: 'angry', labelKey: 'avatar.expression.angry', emoji: '😠', eyes: 'angry', eyebrows: 'angry', mouth: 'flat' },
  { id: 'sad', labelKey: 'avatar.expression.sad', emoji: '😢', eyes: 'sad', eyebrows: 'worried', mouth: 'frown' },
  { id: 'silly', labelKey: 'avatar.expression.silly', emoji: '🤪', eyes: 'dizzy', eyebrows: 'raised', mouth: 'tongue' },
  { id: 'sleepy', labelKey: 'avatar.expression.sleepy', emoji: '😴', eyes: 'sleepy', eyebrows: 'flat', mouth: 'flat' },
  { id: 'wink', labelKey: 'avatar.expression.wink', emoji: '😉', eyes: 'wink', eyebrows: 'natural', mouth: 'smirk' },
  { id: 'surprised', labelKey: 'avatar.expression.surprised', emoji: '😮', eyes: 'wide', eyebrows: 'raised', mouth: 'oh' },
];

export interface ColorTheme {
  id: string;
  labelKey: string;
  colors: Pick<CustomAvatarConfig, 'skinColor' | 'hairColor' | 'bgColor' | 'shirtColor' | 'accessoryColor'>;
}

export const COLOR_THEMES: readonly ColorTheme[] = [
  { id: 'classic', labelKey: 'avatarBuilder.theme.classic', colors: { skinColor: '#FFDBB4', hairColor: '#2C1B18', bgColor: '#1a1a2e', shirtColor: '#4A90D9', accessoryColor: '#000000' } },
  { id: 'fire', labelKey: 'avatarBuilder.theme.fire', colors: { skinColor: '#EDB98A', hairColor: '#C62828', bgColor: '#FF6B35', shirtColor: '#FFD700', accessoryColor: '#000000' } },
  { id: 'electric', labelKey: 'avatarBuilder.theme.electric', colors: { skinColor: '#F8D5C2', hairColor: '#FF1493', bgColor: '#1a1a2e', shirtColor: '#2C1B18', accessoryColor: '#00FFFF' } },
  { id: 'toxic', labelKey: 'avatarBuilder.theme.toxic', colors: { skinColor: '#D08B5B', hairColor: '#4A3728', bgColor: '#00897B', shirtColor: '#2C1B18', accessoryColor: '#BFFF00' } },
  { id: 'royal', labelKey: 'avatarBuilder.theme.royal', colors: { skinColor: '#694D3D', hairColor: '#2C1B18', bgColor: '#8B5CF6', shirtColor: '#FFD700', accessoryColor: '#FFD700' } },
  { id: 'pop', labelKey: 'avatarBuilder.theme.pop', colors: { skinColor: '#FFE0BD', hairColor: '#FF1493', bgColor: '#FFE135', shirtColor: '#FF6B35', accessoryColor: '#FF1493' } },
];

// ── Try-on slot description (for the unlock panel) ──

const PALETTE_LABEL: Record<PaletteId, string> = {
  skinColor: 'avatarBuilder.skinColor',
  hairColor: 'avatarBuilder.hairColor',
  eyeColor: 'avatarBuilder.eyeColor',
  accessoryColor: 'avatarBuilder.accessoryColor',
  shirtColor: 'avatarBuilder.shirtColor',
  bgColor: 'avatarBuilder.bgColor',
};

/** Which premium/rarity category + label a config key belongs to. */
export function describeSlot(key: keyof CustomAvatarConfig): { rarityCategory: string; labelKey: string } {
  const cat = PART_CATEGORIES.find(c => c.configKey === key);
  if (cat) return { rarityCategory: cat.rarityCategory, labelKey: cat.labelKey };
  return { rarityCategory: key, labelKey: PALETTE_LABEL[key as PaletteId] ?? 'avatarBuilder.title' };
}
