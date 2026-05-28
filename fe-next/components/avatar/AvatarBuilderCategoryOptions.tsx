'use client';

import {
  type CustomAvatarConfig,
  AVATAR_BASES,
  AVATAR_SKIN_COLORS,
  AVATAR_HAIR_COLORS,
  AVATAR_EYE_STYLES,
  AVATAR_EYEBROW_STYLES,
  AVATAR_NOSE_STYLES,
  AVATAR_MOUTH_STYLES,
  AVATAR_ACCESSORIES,
  AVATAR_ACCESSORY_COLORS,
  AVATAR_BG_COLORS,
  AVATAR_SHIRT_COLORS,
  AVATAR_BODY_STYLES,
  AVATAR_FACIAL_HAIR_STYLES,
  AVATAR_EYE_COLORS,
  FEMALE_HAIR_STYLES,
  MALE_HAIR_STYLES,
  isPremiumPart,
  getPartPrice,
  PREMIUM_BG_COLORS,
  visibleParts,
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

// ==================== Expression Presets ====================
interface ExpressionPreset {
  name: string;
  labelKey: string;
  emoji: string;
  eyes: string;
  eyebrows: string;
  mouth: string;
}

const EXPRESSION_PRESETS: ExpressionPreset[] = [
  { name: 'happy', labelKey: 'avatar.expression.happy', emoji: '😊', eyes: 'happy', eyebrows: 'natural', mouth: 'smile' },
  { name: 'cool', labelKey: 'avatar.expression.cool', emoji: '😎', eyes: 'cool', eyebrows: 'flat', mouth: 'smirk' },
  { name: 'angry', labelKey: 'avatar.expression.angry', emoji: '😠', eyes: 'angry', eyebrows: 'angry', mouth: 'flat' },
  { name: 'sad', labelKey: 'avatar.expression.sad', emoji: '😢', eyes: 'sad', eyebrows: 'worried', mouth: 'frown' },
  { name: 'silly', labelKey: 'avatar.expression.silly', emoji: '🤪', eyes: 'dizzy', eyebrows: 'raised', mouth: 'tongue' },
  { name: 'sleepy', labelKey: 'avatar.expression.sleepy', emoji: '😴', eyes: 'sleepy', eyebrows: 'flat', mouth: 'flat' },
  { name: 'wink', labelKey: 'avatar.expression.wink', emoji: '😉', eyes: 'wink', eyebrows: 'natural', mouth: 'smirk' },
  { name: 'surprised', labelKey: 'avatar.expression.surprised', emoji: '😮', eyes: 'wide', eyebrows: 'raised', mouth: 'oh' },
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
            label={t('avatarBuilder.shape')}
            partType="base"
            premiumCategory="base"
            options={visibleParts('base', AVATAR_BASES)}
            selected={config.base}
            onSelect={v => updateConfig('base', v)}
            config={config}
            premium={premium}
            t={t}
            onCoinSpend={onCoinSpend}
          />
          <ColorStrip
            label={t('avatarBuilder.skinColor')}
            colors={AVATAR_SKIN_COLORS}
            selected={config.skinColor}
            onSelect={v => updateConfig('skinColor', v)}
          />
        </div>
      );
    case 'hair': {
      const hairOptions = visibleParts('hair', config.gender === 'female' ? FEMALE_HAIR_STYLES : MALE_HAIR_STYLES);
      return (
        <div className="space-y-3">
          <PartPreviewGrid
            label={t('avatarBuilder.style')}
            partType="hair"
            premiumCategory="hair"
            options={hairOptions}
            selected={config.hair}
            onSelect={v => updateConfig('hair', v)}
            config={config}
            noneLabel={t('avatarBuilder.none')}
            premium={premium}
            t={t}
            onCoinSpend={onCoinSpend}
          />
          <ColorStrip
            label={t('avatarBuilder.hairColor')}
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
          {/* Expression Presets — one-click emotion combos */}
          <div>
            <p className="text-neo-white text-xs font-bold uppercase mb-2">
              {t('avatarBuilder.expressions') || 'Expressions'}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {EXPRESSION_PRESETS.map(preset => (
                <button
                  key={preset.name}
                  onClick={() => {
                    updateConfig('eyes', preset.eyes as CustomAvatarConfig['eyes']);
                    updateConfig('eyebrows', preset.eyebrows as CustomAvatarConfig['eyebrows']);
                    updateConfig('mouth', preset.mouth as CustomAvatarConfig['mouth']);
                  }}
                  className="flex items-center gap-1 px-2 py-1.5 rounded-neo border-2 border-neo-white/15 hover:border-neo-white/40 bg-neo-navy-light hover:bg-neo-navy-light/80 transition-colors"
                  title={t(preset.labelKey) || preset.name}
                >
                  <span className="text-base">{preset.emoji}</span>
                  <span className="text-neo-white text-xs font-bold capitalize">
                    {t(preset.labelKey) || preset.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <PartPreviewGrid
            label={t('avatarBuilder.style')}
            partType="eyes"
            premiumCategory="eyes"
            options={visibleParts('eyes', AVATAR_EYE_STYLES)}
            selected={config.eyes}
            onSelect={v => updateConfig('eyes', v)}
            config={config}
            premium={premium}
            t={t}
            onCoinSpend={onCoinSpend}
          />
          <ColorStrip
            label={t('avatarBuilder.eyeColor') || 'Iris Color'}
            colors={AVATAR_EYE_COLORS}
            selected={config.eyeColor || '#4A6FA5'}
            onSelect={v => updateConfig('eyeColor', v)}
          />
          <PartPreviewGrid
            label={t('avatarBuilder.nose') || 'Nose'}
            partType="nose"
            premiumCategory="nose"
            options={AVATAR_NOSE_STYLES}
            selected={config.noseStyle ?? 'none'}
            onSelect={v => updateConfig('noseStyle', v)}
            config={config}
            noneLabel={t('avatarBuilder.none')}
            premium={premium}
            t={t}
            onCoinSpend={onCoinSpend}
          />
          <PartPreviewGrid
            label={t('avatarBuilder.eyebrows') || 'Eyebrows'}
            partType="eyebrows"
            premiumCategory="eyebrows"
            options={AVATAR_EYEBROW_STYLES}
            selected={config.eyebrows ?? 'none'}
            onSelect={v => updateConfig('eyebrows', v)}
            config={config}
            noneLabel={t('avatarBuilder.none')}
            premium={premium}
            t={t}
            onCoinSpend={onCoinSpend}
          />
        </div>
      );
    case 'mouth':
      return (
        <PartPreviewGrid
          label={t('avatarBuilder.style')}
          partType="mouth"
          premiumCategory="mouth"
          options={visibleParts('mouth', AVATAR_MOUTH_STYLES)}
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
          label={t('avatarBuilder.facialHairStyle') || 'Style'}
          partType="facialHair"
          premiumCategory="facialHair"
          options={AVATAR_FACIAL_HAIR_STYLES}
          selected={config.facialHair ?? 'none'}
          onSelect={v => updateConfig('facialHair', v)}
          config={config}
          noneLabel={t('avatarBuilder.none')}
          premium={premium}
          t={t}
          onCoinSpend={onCoinSpend}
        />
      );
    case 'accessories':
      return (
        <div className="space-y-3">
          <PartPreviewGrid
            label={t('avatarBuilder.type')}
            partType="accessory"
            premiumCategory="accessory"
            options={visibleParts('accessory', AVATAR_ACCESSORIES)}
            selected={config.accessory}
            onSelect={v => updateConfig('accessory', v)}
            config={config}
            noneLabel={t('avatarBuilder.none')}
            premium={premium}
            t={t}
            onCoinSpend={onCoinSpend}
          />
          {config.accessory !== 'none' && (
            <ColorStrip
              label={t('avatarBuilder.accessoryColor')}
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
            <p className="text-neo-white text-xs font-bold uppercase mb-2">
              {t('avatarBuilder.colorTheme') || 'Color Theme'}
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
                    {([
                      ['bg', theme.colors.bgColor],
                      ['shirt', theme.colors.shirtColor],
                      ['hair', theme.colors.hairColor],
                    ] as const).map(([role, c]) => (
                      <span key={role} className="w-3 h-3 rounded-full border border-black/40" style={{ backgroundColor: c }} />
                    ))}
                  </span>
                  <span className="text-neo-white text-xs font-bold capitalize">
                    {t(theme.labelKey) || theme.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <ColorStrip
            label={t('avatarBuilder.bgColor')}
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
            label={t('avatarBuilder.shirtColor') || 'Shirt Color'}
            colors={AVATAR_SHIRT_COLORS}
            selected={config.shirtColor || (config.gender === 'female' ? '#E85D9B' : '#4A90D9')}
            onSelect={v => updateConfig('shirtColor', v)}
          />
          {/* Body/Clothing Style */}
          <div>
            <p className="text-neo-white text-xs font-bold uppercase mb-2">
              {t('avatarBuilder.bodyStyle') || 'Outfit'}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {AVATAR_BODY_STYLES.map(style => (
                <button
                  key={style}
                  onClick={() => updateConfig('bodyStyle', style)}
                  className={`px-3 py-1.5 rounded-neo border-2 text-xs font-bold capitalize transition-colors ${
                    (config.bodyStyle || 'default') === style
                      ? 'border-neo-yellow bg-neo-yellow/20 text-neo-yellow'
                      : 'border-neo-white/15 text-neo-white hover:border-neo-white/40'
                  }`}
                >
                  {t(`avatarBuilder.bodyStyles.${style}`) || style}
                </button>
              ))}
            </div>
          </div>
        </div>
      );
    }
  }
}
