import { describe, it, expect } from 'vitest';
import { DEFAULT_AVATAR_CONFIG, type CustomAvatarConfig } from '@/shared/types/customAvatar';
import { getPartRarity } from '@/lib/avatar/rarity';
import { getEditorTabs, EXPRESSION_PRESETS, COLOR_THEMES, type EditorTab } from '../editorTabs';
import { AVATAR_CATEGORY_ICONS } from '../../AvatarCategoryIcons';

const male: CustomAvatarConfig = { ...DEFAULT_AVATAR_CONFIG, gender: 'male' };
const female: CustomAvatarConfig = { ...DEFAULT_AVATAR_CONFIG, gender: 'female', facialHair: 'none' as CustomAvatarConfig['facialHair'] };

const partIds = (tab: EditorTab | undefined, i = 0) => {
  const s = tab?.sections.filter(x => x.kind === 'parts')[i];
  return s && s.kind === 'parts' ? s.parts.map(p => p.id) : [];
};

describe('editorTabs — the editor view model over lib/avatar/catalog', () => {
  it('follows the catalog tab order; facial hair only for male bodies', () => {
    const ids = getEditorTabs(male, { showPremium: true }).map(t => t.id);
    expect(ids[0]).toBe('face');
    expect(ids).toContain('facialHair');
    expect(getEditorTabs(female, { showPremium: true }).map(t => t.id)).not.toContain('facialHair');
  });

  it('every tab has a glyph (no blank icon tabs)', () => {
    for (const tab of getEditorTabs(male, { showPremium: true })) {
      expect(AVATAR_CATEGORY_ICONS[tab.icon as keyof typeof AVATAR_CATEGORY_ICONS], tab.id).toBeTypeOf('function');
    }
  });

  it('pins the tab palette above the grid and keeps part grids in the scroll area', () => {
    const hair = getEditorTabs(male, { showPremium: true }).find(t => t.id === 'hair')!;
    expect(hair.pinned.some(p => p.kind === 'colors' && p.palette === 'hairColor')).toBe(true);
    expect(hair.sections.every(s => s.kind !== 'gender')).toBe(true);
    expect(partIds(hair).length).toBeGreaterThan(3);
  });

  it('the face tab pins the body-type toggle and lands on shapes first', () => {
    const face = getEditorTabs(male, { showPremium: false })[0];
    expect(face.pinned.some(p => p.kind === 'gender')).toBe(true);
    const first = face.sections.find(s => s.kind === 'parts');
    expect(first && first.kind === 'parts' && first.configKey).toBe('base');
    expect(partIds(face)).toContain('square');
  });

  it('hides premium parts and colors entirely without a premium context (onboarding)', () => {
    for (const tab of getEditorTabs(male, { showPremium: false })) {
      for (const s of [...tab.pinned, ...tab.sections]) {
        if (s.kind === 'parts') for (const p of s.parts) expect(p.rarity, p.key).toBe('common');
        if (s.kind === 'colors') for (const c of s.colors) expect(c.rarity, c.key).toBe('common');
      }
    }
  });

  it('shows premium parts (to covet) with a premium context', () => {
    const acc = getEditorTabs(male, { showPremium: true }).find(t => t.id === 'accessory');
    expect(partIds(acc)).toContain('crystalCrown');
  });

  it('never offers hidden parts', () => {
    const tabs = getEditorTabs(male, { showPremium: true });
    expect(partIds(tabs.find(t => t.id === 'mouth'))).not.toContain('drool');
    expect(partIds(tabs.find(t => t.id === 'accessory'))).not.toContain('plunger');
  });

  it('hair options follow the body type', () => {
    const m = partIds(getEditorTabs(male, { showPremium: true }).find(t => t.id === 'hair'));
    const f = partIds(getEditorTabs(female, { showPremium: true }).find(t => t.id === 'hair'));
    expect(m).not.toEqual(f);
  });

  it('hides the accessory color row while no accessory is worn', () => {
    const none = getEditorTabs({ ...male, accessory: 'none' as CustomAvatarConfig['accessory'] }, { showPremium: true });
    const withHat = getEditorTabs({ ...male, accessory: 'glasses' as CustomAvatarConfig['accessory'] }, { showPremium: true });
    const has = (tabs: EditorTab[]) => {
      const acc = tabs.find(t => t.id === 'accessory')!;
      return [...acc.pinned, ...acc.sections].some(s => s.kind === 'colors' && s.palette === 'accessoryColor');
    };
    expect(has(none)).toBe(false);
    expect(has(withHat)).toBe(true);
  });

  it('presets only reference free parts (a preset can never equip a locked part)', () => {
    for (const p of EXPRESSION_PRESETS) {
      expect(getPartRarity('eyes', p.eyes)).toBe('common');
      expect(getPartRarity('mouth', p.mouth)).toBe('common');
      expect(getPartRarity('eyebrows', p.eyebrows)).toBe('common');
    }
    for (const th of COLOR_THEMES) expect(getPartRarity('bgColor', th.colors.bgColor)).toBe('common');
  });
});
