/**
 * One-tap avatar LOOKS — full-body presets the builder offers on the Face tab.
 *
 * Each look is available to every player. Free parts are applied immediately;
 * a look may include at most one premium "signature" part, which goes through
 * the existing single-slot try-on / gold unlock flow (never silently equipped).
 */
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';
import { PART_CATEGORIES } from './catalog';
import { getPartLockInfo, type LockPremium } from '@/components/avatar/editor/partLock';
import type { ConfigKey, TryOn } from '@/components/avatar/editor/editorState';

export const RON_PRESET_GROUP = 'ron' as const;
export const FUN_PRESET_GROUP = 'fun' as const;
export type LookPresetGroupId = typeof RON_PRESET_GROUP | typeof FUN_PRESET_GROUP;

export interface LookPresetGroup {
  id: LookPresetGroupId;
  labelKey: string;
}

export const LOOK_PRESET_GROUPS: readonly LookPresetGroup[] = [
  { id: RON_PRESET_GROUP, labelKey: 'avatarBuilder.presetGroup.ron' },
  { id: FUN_PRESET_GROUP, labelKey: 'avatarBuilder.presetGroup.fun' },
];

export interface LookPreset {
  id: string;
  group: LookPresetGroupId;
  labelKey: string;
  config: CustomAvatarConfig;
}

const OLIVE = '#6B7F3B';

const RON_BASE: CustomAvatarConfig = {
  gender: 'male',
  base: 'round',
  skinColor: '#EDB98A',
  hair: 'shortCrop',
  hairColor: '#2C1B18',
  eyes: 'friendly',
  eyeColor: '#78350F',
  noseStyle: 'button',
  eyebrows: 'natural',
  facialHair: 'boxedBeard',
  mouth: 'smile',
  accessory: 'goldChain',
  accessoryColor: '#FFD700',
  bgColor: '#1a1a2e',
  shirtColor: OLIVE,
  bodyStyle: 'default',
};

export const LOOK_PRESETS: readonly LookPreset[] = [
  {
    id: 'ron',
    group: 'ron',
    labelKey: 'avatarBuilder.preset.ron',
    config: RON_BASE,
  },
  {
    id: 'ronCasual',
    group: 'ron',
    labelKey: 'avatarBuilder.preset.ronCasual',
    config: { ...RON_BASE, bodyStyle: 'hoodie', mouth: 'smirk' },
  },
  {
    id: 'ronCool',
    group: 'ron',
    labelKey: 'avatarBuilder.preset.ronCool',
    config: { ...RON_BASE, eyes: 'cool', mouth: 'smirk', eyebrows: 'flat' },
  },
  {
    id: 'kitty',
    group: 'fun',
    labelKey: 'avatarBuilder.preset.kitty',
    config: {
      gender: 'female',
      base: 'round',
      skinColor: '#FFDBB4',
      hair: 'pigtails',
      hairColor: '#2C1B18',
      eyes: 'happy',
      eyeColor: '#059669',
      noseStyle: 'button',
      eyebrows: 'natural',
      facialHair: 'none',
      mouth: 'kiss',
      accessory: 'catEars',
      accessoryColor: '#FF1493',
      bgColor: '#FF1493',
      shirtColor: '#E85D9B',
      bodyStyle: 'default',
    },
  },
  {
    id: 'sleepyBunny',
    group: 'fun',
    labelKey: 'avatarBuilder.preset.sleepyBunny',
    config: {
      gender: 'female',
      base: 'round',
      skinColor: '#F8D5C2',
      hair: 'bob',
      hairColor: '#D4A574',
      eyes: 'sleepy',
      eyeColor: '#4A6FA5',
      noseStyle: 'button',
      eyebrows: 'flat',
      facialHair: 'none',
      mouth: 'pout',
      accessory: 'bunnyEars',
      accessoryColor: '#FFFFFF',
      bgColor: '#8B5CF6',
      shirtColor: '#E85D9B',
      bodyStyle: 'default',
    },
  },
  {
    id: 'partyPropeller',
    group: 'fun',
    labelKey: 'avatarBuilder.preset.partyPropeller',
    config: {
      gender: 'male',
      base: 'round',
      skinColor: '#FFE0BD',
      hair: 'afro',
      hairColor: '#4A3728',
      eyes: 'dizzy',
      eyeColor: '#3B82F6',
      noseStyle: 'button',
      eyebrows: 'raised',
      facialHair: 'none',
      mouth: 'tongue',
      accessory: 'propellerHat',
      accessoryColor: '#00FFFF',
      bgColor: '#FFE135',
      shirtColor: '#FF6B35',
      bodyStyle: 'default',
    },
  },
  {
    id: 'sunshine',
    group: 'fun',
    labelKey: 'avatarBuilder.preset.sunshine',
    config: {
      gender: 'female',
      base: 'round',
      skinColor: '#FFDBB4',
      hair: 'wavy',
      hairColor: '#E8C07A',
      eyes: 'happy',
      eyeColor: '#D97706',
      noseStyle: 'button',
      eyebrows: 'natural',
      facialHair: 'none',
      mouth: 'smile',
      accessory: 'halo',
      accessoryColor: '#FFD700',
      bgColor: '#FFE135',
      shirtColor: '#FFD700',
      bodyStyle: 'default',
    },
  },
  {
    id: 'coolShades',
    group: 'fun',
    labelKey: 'avatarBuilder.preset.coolShades',
    config: {
      gender: 'male',
      base: 'square',
      skinColor: '#D08B5B',
      hair: 'sideSwept',
      hairColor: '#2C1B18',
      eyes: 'cool',
      eyeColor: '#6B7280',
      noseStyle: 'button',
      eyebrows: 'flat',
      facialHair: 'none',
      mouth: 'smirk',
      accessory: 'sunglasses',
      accessoryColor: '#000000',
      bgColor: '#1a1a2e',
      shirtColor: '#2C1B18',
      bodyStyle: 'default',
    },
  },
  {
    id: 'frogPrince',
    group: 'fun',
    labelKey: 'avatarBuilder.preset.frogPrince',
    config: {
      gender: 'male',
      base: 'round',
      skinColor: '#EDB98A',
      hair: 'none',
      hairColor: '#2C1B18',
      eyes: 'happy',
      eyeColor: '#059669',
      noseStyle: 'button',
      eyebrows: 'raised',
      facialHair: 'none',
      mouth: 'grin',
      accessory: 'frogHat',
      accessoryColor: '#00897B',
      bgColor: '#BFFF00',
      shirtColor: '#00897B',
      bodyStyle: 'default',
    },
  },
  {
    id: 'spaceCadet',
    group: 'fun',
    labelKey: 'avatarBuilder.preset.spaceCadet',
    config: {
      gender: 'male',
      base: 'round',
      skinColor: '#F8D5C2',
      hair: 'none',
      hairColor: '#2C1B18',
      eyes: 'curious',
      eyeColor: '#3B82F6',
      noseStyle: 'button',
      eyebrows: 'raised',
      facialHair: 'none',
      mouth: 'oh',
      accessory: 'astronaut',
      accessoryColor: '#FFFFFF',
      bgColor: '#1a1a2e',
      shirtColor: '#4A90D9',
      bodyStyle: 'default',
    },
  },
  {
    id: 'unicornSparkle',
    group: 'fun',
    labelKey: 'avatarBuilder.preset.unicornSparkle',
    config: {
      gender: 'female',
      base: 'heart',
      skinColor: '#FFDBB4',
      hair: 'long',
      hairColor: '#FF1493',
      eyes: 'sparkle',
      eyeColor: '#A855F7',
      noseStyle: 'button',
      eyebrows: 'natural',
      facialHair: 'none',
      mouth: 'smile',
      accessory: 'unicornHorn',
      accessoryColor: '#FF1493',
      bgColor: '#FF1493',
      shirtColor: '#E85D9B',
      bodyStyle: 'default',
    },
  },
];

export function getLookPresetsInGroup(group: LookPresetGroupId): LookPreset[] {
  return LOOK_PRESETS.filter(p => p.group === group);
}

function lookHasLockedPart(preset: LookPreset, premium: LockPremium | null): boolean {
  return splitLookPreset(preset, premium).tryOn != null;
}

/** Looks offered in the builder: all of them when premium parts are shown,
 *  otherwise only looks that are made entirely of free parts. */
export function visibleLookPresets(showPremium: boolean): LookPreset[] {
  if (showPremium) return [...LOOK_PRESETS];
  return LOOK_PRESETS.filter(p => !lookHasLockedPart(p, null));
}

function rarityCategoryFor(key: keyof CustomAvatarConfig): string {
  const cat = PART_CATEGORIES.find(c => c.configKey === key);
  return cat?.rarityCategory ?? key;
}

/**
 * Split a look into parts the player already owns (committed immediately)
 * and at most one locked signature part for the try-on / purchase panel.
 */
export function splitLookPreset(
  preset: LookPreset,
  premium: LockPremium | null,
): { patch: Partial<CustomAvatarConfig>; tryOn: TryOn | null } {
  const patch: Partial<CustomAvatarConfig> = {};
  let tryOn: TryOn | null = null;
  for (const [key, value] of Object.entries(preset.config) as Array<[ConfigKey, unknown]>) {
    if (value == null) continue;
    const info = getPartLockInfo(rarityCategoryFor(key), String(value), premium);
    if (info.locked) {
      tryOn = { key, value: String(value) };
    } else {
      (patch as Record<string, unknown>)[key] = value;
    }
  }
  return { patch, tryOn };
}
