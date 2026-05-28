'use client';

import { Lock } from 'lucide-react';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import {
  AVATAR_GENDERS,
  isPremiumPart,
  getPartPrice,
} from '@/shared/types/customAvatar';
import type { AvatarPremium } from './AvatarBuilderModal';

// Bounce button spring (from animate-ai: playful-spring-bounce-button)
const BUTTON_SPRING = { type: 'spring' as const, stiffness: 400, damping: 17 };

// ==================== Color Strip (with spring feedback) ====================

export interface ColorStripProps<T extends string> {
  label: string;
  colors: readonly T[];
  selected: T;
  onSelect: (value: T) => void;
  large?: boolean;
  premiumCategory?: string;
  premium?: AvatarPremium | undefined;
}

export function ColorStrip<T extends string>({ label, colors, selected, onSelect, large, premiumCategory, premium }: ColorStripProps<T>) {
  const size = large ? 'w-9 h-9 sm:w-11 sm:h-11' : 'w-7 h-7 sm:w-8 sm:h-8';
  // Hide premium colors when no premium context (e.g. onboarding)
  const visibleColors = premiumCategory && !premium
    ? colors.filter(c => !isPremiumPart(premiumCategory, c))
    : colors;
  return (
    <div>
      <p className="text-neo-white text-xs font-bold uppercase mb-2">{label}</p>
      <div className="flex flex-wrap gap-2">
        {visibleColors.map(color => {
          const isLocked = premiumCategory && premium
            && isPremiumPart(premiumCategory, color)
            && !premium.isPartUnlocked(premiumCategory, color);

          return (
            <AdaptiveMotion.button
              key={color}
              onClick={() => onSelect(color)}
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.85 }}
              transition={BUTTON_SPRING}
              className={`${size} rounded-full border-3 transition-shadow relative ${
                selected === color
                  ? 'border-neo-lime shadow-hard-sm ring-2 ring-neo-lime/40'
                  : isLocked
                    ? 'border-neo-yellow/40 opacity-50'
                    : 'border-black hover:border-neo-white/50'
              }`}
              style={{ backgroundColor: color }}
              aria-label={color}
            >
              {isLocked && (
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <Lock className="w-3 h-3 text-white drop-shadow-md" />
                  {premiumCategory && (
                    <span className="text-[7px] font-black text-neo-yellow drop-shadow-md leading-none mt-0.5">
                      {getPartPrice(premiumCategory, color)}
                    </span>
                  )}
                </div>
              )}
            </AdaptiveMotion.button>
          );
        })}
      </div>
    </div>
  );
}

// ==================== Gender Toggle ====================

export interface GenderToggleProps {
  selected: (typeof AVATAR_GENDERS)[number];
  onSelect: (value: (typeof AVATAR_GENDERS)[number]) => void;
  t: (key: string) => string;
}

export function GenderToggle({ selected, onSelect, t }: GenderToggleProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <p className="text-neo-white text-[11px] font-bold uppercase tracking-wide shrink-0">{t('avatarBuilder.gender')}</p>
      <div className="inline-flex gap-1 p-1 rounded-neo bg-neo-navy-light/60 border border-neo-white/10">
        {AVATAR_GENDERS.map(gender => (
          <AdaptiveMotion.button
            key={gender}
            onClick={() => onSelect(gender)}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.92 }}
            transition={BUTTON_SPRING}
            className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-[6px] transition-colors ${
              selected === gender
                ? 'bg-neo-lime text-neo-black shadow-hard-sm'
                : 'text-neo-white hover:text-neo-white'
            }`}
          >
            <span className="text-base leading-none">{gender === 'male' ? '\u2642' : '\u2640'}</span>
            <span>{t(`avatarBuilder.${gender}`)}</span>
          </AdaptiveMotion.button>
        ))}
      </div>
    </div>
  );
}
