/**
 * Every catalog / shop / renderer part that is meant to be available must
 * actually appear in the avatar builder. Hidden/retired parts are the only
 * exception, and they must be listed in HIDDEN_PARTS with a reason.
 */
import { describe, it, expect } from 'vitest';
import {
  DEFAULT_AVATAR_CONFIG,
  HIDDEN_PARTS,
  isChestOnlyPart,
  isPremiumPart,
  getPartPrice,
  type CustomAvatarConfig,
} from '@/shared/types/customAvatar';
import {
  PART_CATEGORIES,
  getCatalogParts,
  getCatalogPart,
  type PartCategoryId,
} from '@/lib/avatar/catalog';
import { DRAWN_IDS, accDef } from '@/components/avatar/art/registry';
import { getEditorTabs, type EditorTab } from '@/components/avatar/editor/editorTabs';

function listedPartIds(tabs: EditorTab[]): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  for (const tab of tabs) {
    for (const s of tab.sections) {
      if (s.kind !== 'parts') continue;
      const set = out.get(s.category) ?? new Set<string>();
      for (const p of s.parts) set.add(p.id);
      out.set(s.category, set);
    }
  }
  return out;
}

describe('avatar builder part reachability', () => {
  it('lists goldNecklace as a paid (not free) accessory', () => {
    expect(isPremiumPart('accessory', 'goldNecklace')).toBe(true);
    expect(isChestOnlyPart('accessory', 'goldNecklace')).toBe(false);
    expect(getPartPrice('accessory', 'goldNecklace')).toBeGreaterThan(0);
    const part = getCatalogPart('accessory', 'goldNecklace');
    expect(part, 'goldNecklace must exist in the catalog').toBeDefined();
    expect(part!.isHidden).toBe(false);
    expect(part!.price).toBeGreaterThan(0);
  });

  it('shows goldNecklace in the builder accessory grid when premium parts are offered', () => {
    const tabs = getEditorTabs(DEFAULT_AVATAR_CONFIG, { showPremium: true });
    const listed = listedPartIds(tabs).get('accessory') ?? new Set();
    expect(listed.has('goldNecklace'), 'goldNecklace missing from the builder accessory grid').toBe(true);
  });

  it('every non-hidden catalog part appears in the builder for a gender that can wear it', () => {
    const maleTabs = listedPartIds(getEditorTabs({ ...DEFAULT_AVATAR_CONFIG, gender: 'male' }, { showPremium: true }));
    const femaleCfg: CustomAvatarConfig = { ...DEFAULT_AVATAR_CONFIG, gender: 'female', facialHair: 'none' };
    const femaleTabs = listedPartIds(getEditorTabs(femaleCfg, { showPremium: true }));

    const missing: string[] = [];
    for (const cat of PART_CATEGORIES) {
      for (const part of getCatalogParts(cat.id, { includeHidden: true })) {
        if (part.isHidden) continue;
        const inMale = part.genders.includes('male') && (maleTabs.get(cat.id)?.has(part.id) ?? false);
        const inFemale = part.genders.includes('female') && (femaleTabs.get(cat.id)?.has(part.id) ?? false);
        if (!inMale && !inFemale) missing.push(part.key);
      }
    }
    expect(missing, `catalog parts unreachable in the builder:\n${missing.join('\n')}`).toEqual([]);
  });

  it('every hidden part is explicitly listed in HIDDEN_PARTS (with a reason in that file)', () => {
    const unexplained: string[] = [];
    for (const cat of PART_CATEGORIES) {
      const listed = new Set((HIDDEN_PARTS as Record<string, readonly string[]>)[cat.id] ?? []);
      for (const part of getCatalogParts(cat.id, { includeHidden: true })) {
        if (!part.isHidden) continue;
        // 'none' can be hidden as a style (eyes/mouth) — still must be listed.
        if (!listed.has(part.id)) unexplained.push(`${cat.id}:${part.id}`);
      }
    }
    expect(unexplained, `hidden parts missing from HIDDEN_PARTS:\n${unexplained.join('\n')}`).toEqual([]);
  });

  it('every drawable registry id is a catalog part (no orphan art)', () => {
    const fieldToCategory: Record<string, PartCategoryId> = {
      base: 'base',
      hair: 'hair',
      eyes: 'eyes',
      eyebrows: 'eyebrows',
      noseStyle: 'noseStyle',
      mouth: 'mouth',
      facialHair: 'facialHair',
      accessory: 'accessory',
      bodyStyle: 'bodyStyle',
    };
    const orphans: string[] = [];
    for (const [field, ids] of Object.entries(DRAWN_IDS)) {
      const cat = fieldToCategory[field];
      if (!cat) {
        orphans.push(`unknown field ${field}`);
        continue;
      }
      for (const id of ids) {
        if (!getCatalogPart(cat, id)) orphans.push(`${field}:${id}`);
      }
    }
    expect(orphans).toEqual([]);
  });

  it('every priced / chest-only part that is not hidden is offered in the builder', () => {
    const listed = listedPartIds(getEditorTabs(DEFAULT_AVATAR_CONFIG, { showPremium: true }));
    const femaleListed = listedPartIds(
      getEditorTabs({ ...DEFAULT_AVATAR_CONFIG, gender: 'female', facialHair: 'none' }, { showPremium: true }),
    );
    const missing: string[] = [];
    for (const cat of PART_CATEGORIES) {
      for (const part of getCatalogParts(cat.id, { includeHidden: true })) {
        if (part.isHidden) continue;
        if (part.price == null && !isChestOnlyPart(cat.rarityCategory, part.id) && !isPremiumPart(cat.rarityCategory, part.id)) {
          continue;
        }
        const shown =
          (listed.get(cat.id)?.has(part.id) ?? false) || (femaleListed.get(cat.id)?.has(part.id) ?? false);
        if (!shown) missing.push(part.key);
      }
    }
    expect(missing, `purchasable parts missing from the builder:\n${missing.join('\n')}`).toEqual([]);
  });

  it('neck-layer accessories (including goldNecklace) are still classified as neck, so thumbs can frame them', () => {
    expect(accDef('goldNecklace').layer).toBe('neck');
    expect(accDef('scarf').layer).toBe('neck');
    expect(accDef('earrings').layer).toBe('neck');
  });
});
