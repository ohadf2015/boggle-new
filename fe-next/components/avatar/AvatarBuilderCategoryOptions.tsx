'use client';

import {
  type CustomAvatarConfig,
  AVATAR_BASES,
  AVATAR_SKIN_COLORS,
  AVATAR_HAIR_COLORS,
  AVATAR_EYE_STYLES,
  AVATAR_EYEBROW_STYLES,
  AVATAR_MOUTH_STYLES,
  AVATAR_ACCESSORIES,
  AVATAR_ACCESSORY_COLORS,
  AVATAR_BG_COLORS,
  AVATAR_SHIRT_COLORS,
  AVATAR_FACIAL_HAIR_STYLES,
  FEMALE_HAIR_STYLES,
  MALE_HAIR_STYLES,
  isPremiumPart,
  getPartPrice,
  PREMIUM_BG_COLORS,
} from '@/shared/types/customAvatar';
import type { AvatarPremium } from './AvatarBuilderModal';
import PartPreviewGrid from './AvatarBuilderPartGrid';
import { ColorStrip, GenderToggle } from './AvatarBuilderColorControls';
import toast from 'react-hot-toast';

type Category = 'base' | 'hair' | 'eyes' | 'mouth' | 'facialHair' | 'accessories' | 'background';

// ==================== Color Theme Presets ====================
interface ColorTheme {
  name: string;
  labelKey: string;
  colors: { skinColor: string; hairColor: string; bgColor: string; shirtColor: string; accessoryColor: string };
}

const COLOR_THEMES: ColorTheme[] = [
  { name: 'classic', labelKey: 'avatarBuilder.theme.classic', colors: { skinColor: '#FFDBB4', hairColor: '#2C1B18', bgColor: '#1a1a2e', shirtColor: '#4A90D9', accessoryColor: '#000000' } },
  { name: 'fire', labelKey: 'avatarBuilder.theme.fire', colors: { skinColor: '#EDB98A', hairColor: '#C62828', bgColor: '#FF6B35', shirtColor: '#FFD700', accessoryColor: '#000000' } },
  { name: 'electric', labelKey: 'avatarBuilder.theme.electric', colors: { skinColor: '#F8D5C2', hairColor: '#FF1493', bgColor: '#1a1a2e', shirtColor: '#2C1B18', accessoryColor: '#00FFFF' } },
  { name: 'toxic', labelKey: 'avatarBuilder.theme.toxic', colors: { skinColor: '#D08B5B', hairColor: '#4A3728', bgColor: '#00897B', shirtColor: '#2C1B18', accessoryColor: '#BFFF00' } },
  { name: 'royal', labelKey: 'avatarBuilder.theme.royal', colors: { skinColor: '#694D3D', hairColor: '#2C1B18', bgColor: '#8B5CF6', shirtColor: '#FFD700', accessoryColor: '#FFD700' } },
  { name: 'pop', labelKey: 'avatarBuilder.theme.pop', colors: { skinColor: '#FFE0BD', hairColor: '#FF1493', bgColor: '#FFE135', shirtColor: '#FF6B35', accessoryColor: '#FF1493' } },
];

export interface CategoryOptionsProps {
  category: Category;
  config: CustomAvatarConfig;
  updateConfig: <K extends keyof CustomAvatarConfig>(key: K, value: CustomAvatarConfig[K]) => void;
  t: (key: string) => string;
  premium: AvatarPremium | undefined;
  onCoinSpend?: (amount: number) => void;
}

export default function CategoryOptions({ category, config, updateConfig, t, premium, onCoinSpend }: CategoryOptionsProps) {
  switch (category) {
    case 'base':
      return (
        <div className="space-y-3">
          <GenderToggle
            selected={config.gender}
            onSelect={v => updateConfig('gender', v)}
            t={t}
          />
          <PartPreviewGrid
            label={t('avatar.builder.shape')}
            partType="base"
            premiumCategory="base"
            options={AVATAR_BASES}
            selected={config.base}
            onSelect={v => updateConfig('base', v)}
            config={config}
            premium={premium}
            t={t}
            onCoinSpend={onCoinSpend}
          />
          <ColorStrip
            label={t('avatar.builder.skinColor')}
            colors={AVATAR_SKIN_COLORS}
            selected={config.skinColor}
            onSelect={v => updateConfig('skinColor', v)}
          />
        </div>
      );
    case 'hair': {
      const hairOptions = config.gender === 'female' ? FEMALE_HAIR_STYLES : MALE_HAIR_STYLES;
      return (
        <div className="space-y-3">
          <PartPreviewGrid
            label={t('avatar.builder.style')}
            partType="hair"
            premiumCategory="hair"
            options={hairOptions}
            selected={config.hair}
            onSelect={v => updateConfig('hair', v)}
            config={config}
            noneLabel={t('avatar.builder.none')}
            premium={premium}
            t={t}
            onCoinSpend={onCoinSpend}
          />
          <ColorStrip
            label={t('avatar.builder.hairColor')}
            colors={AVATAR_HAIR_COLORS}
            selected={config.hairColor}
            onSelect={v => updateConfig('hairColor', v)}
          />
        </div>
      );
    }
    case 'eyes':
      return (
        <div className="space-y-3">
          <PartPreviewGrid
            label={t('avatar.builder.style')}
            partType="eyes"
            premiumCategory="eyes"
            options={AVATAR_EYE_STYLES}
            selected={config.eyes}
            onSelect={v => updateConfig('eyes', v)}
            config={config}
            premium={premium}
            t={t}
            onCoinSpend={onCoinSpend}
          />
          <PartPreviewGrid
            label={t('avatar.builder.eyebrows') || 'Eyebrows'}
            partType="eyebrows"
            premiumCategory="eyebrows"
            options={AVATAR_EYEBROW_STYLES}
            selected={config.eyebrows ?? 'none'}
            onSelect={v => updateConfig('eyebrows', v)}
            config={config}
            noneLabel={t('avatar.builder.none')}
            premium={premium}
            t={t}
            onCoinSpend={onCoinSpend}
          />
        </div>
      );
    case 'mouth':
      return (
        <PartPreviewGrid
          label={t('avatar.builder.style')}
          partType="mouth"
          premiumCategory="mouth"
          options={AVATAR_MOUTH_STYLES}
          selected={config.mouth}
          onSelect={v => updateConfig('mouth', v)}
          config={config}
          premium={premium}
          t={t}
          onCoinSpend={onCoinSpend}
        />
      );
    case 'facialHair':
      return (
        <PartPreviewGrid
          label={t('avatar.builder.facialHairStyle') || 'Style'}
          partType="facialHair"
          premiumCategory="facialHair"
          options={AVATAR_FACIAL_HAIR_STYLES}
          selected={config.facialHair ?? 'none'}
          onSelect={v => updateConfig('facialHair', v)}
          config={config}
          noneLabel={t('avatar.builder.none')}
          premium={premium}
          t={t}
          onCoinSpend={onCoinSpend}
        />
      );
    case 'accessories':
      return (
        <div className="space-y-3">
          <PartPreviewGrid
            label={t('avatar.builder.type')}
            partType="accessory"
            premiumCategory="accessory"
            options={AVATAR_ACCESSORIES}
            selected={config.accessory}
            onSelect={v => updateConfig('accessory', v)}
            config={config}
            noneLabel={t('avatar.builder.none')}
            premium={premium}
            t={t}
            onCoinSpend={onCoinSpend}
          />
          {config.accessory !== 'none' && (
            <ColorStrip
              label={t('avatar.builder.accessoryColor')}
              colors={AVATAR_ACCESSORY_COLORS}
              selected={config.accessoryColor}
              onSelect={v => updateConfig('accessoryColor', v)}
            />
          )}
        </div>
      );
    case 'background': {
      const allBgColors = [...AVATAR_BG_COLORS, ...PREMIUM_BG_COLORS] as const;
      return (
        <div className="space-y-4">
          {/* Color Theme Presets */}
          <div>
            <p className="text-neo-white/60 text-xs font-bold uppercase mb-2">
              {t('avatar.builder.colorTheme') || 'Color Theme'}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {COLOR_THEMES.map(theme => (
                <button
                  key={theme.name}
                  onClick={() => {
                    Object.entries(theme.colors).forEach(([key, value]) => {
                      updateConfig(key as keyof CustomAvatarConfig, value);
                    });
                  }}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-neo border-2 border-neo-white/15 hover:border-neo-white/40 bg-neo-navy-light hover:bg-neo-navy-light/80 transition-colors"
                  title={t(theme.labelKey) || theme.name}
                >
                  {/* Mini color swatch preview */}
                  <span className="flex -space-x-1">
                    {[theme.colors.bgColor, theme.colors.shirtColor, theme.colors.hairColor].map((c, i) => (
                      <span key={i} className="w-3 h-3 rounded-full border border-black/40" style={{ backgroundColor: c }} />
                    ))}
                  </span>
                  <span className="text-neo-white/70 text-xs font-bold capitalize">
                    {t(theme.labelKey) || theme.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <ColorStrip
            label={t('avatar.builder.bgColor')}
            colors={allBgColors}
            selected={config.bgColor}
            onSelect={v => {
              if (isPremiumPart('bgColor', v) && premium && !premium.isPartUnlocked('bgColor', v)) {
                const price = getPartPrice('bgColor', v);
                toast(`${price} gold needed`, { icon: '🔒', duration: 2000 });
                return;
              }
              updateConfig('bgColor', v);
            }}
            large
            premiumCategory="bgColor"
            premium={premium}
          />
          <ColorStrip
            label={t('avatar.builder.shirtColor') || 'Shirt Color'}
            colors={AVATAR_SHIRT_COLORS}
            selected={config.shirtColor || (config.gender === 'female' ? '#E85D9B' : '#4A90D9')}
            onSelect={v => updateConfig('shirtColor', v)}
          />
        </div>
      );
    }
  }
}
