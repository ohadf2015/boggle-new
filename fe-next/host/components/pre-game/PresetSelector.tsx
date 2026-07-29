'use client';

import React, { memo } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '../../../lib/utils';
import type { DifficultyLevel } from '@/shared/types/game';

// ==================== Types ====================

export interface GamePreset {
  nameKey: string;
  detailsKey: string;
  icon: string;
  timer: number;
  difficulty: DifficultyLevel;
  minWordLength: number;
}

export const GAME_PRESETS: Record<PresetKey, GamePreset> = {
  fast: {
    nameKey: 'hostView.presetFast',
    detailsKey: 'hostView.presetFastDetails',
    icon: '⚡',
    timer: 1,
    difficulty: 'MEDIUM',
    minWordLength: 2,
  },
  party: {
    nameKey: 'hostView.presetParty',
    detailsKey: 'hostView.presetPartyDetails',
    icon: '🎉',
    timer: 2,
    difficulty: 'MEDIUM',
    minWordLength: 2,
  },
  challenge: {
    nameKey: 'hostView.presetChallenge',
    detailsKey: 'hostView.presetChallengeDetails',
    icon: '🏆',
    timer: 2,
    difficulty: 'HARD',
    minWordLength: 2,
  },
} as const;

export type PresetKey = 'fast' | 'party' | 'challenge';

const PRESET_COLORS: Record<PresetKey, {
  active: string;
  glow: string;
}> = {
  fast: {
    active: 'bg-neo-cyan border-neo-cyan',
    glow: 'shadow-[0_0_12px_rgba(0,255,255,0.3)]',
  },
  party: {
    active: 'bg-neo-yellow border-neo-yellow',
    glow: 'shadow-[0_0_12px_rgba(255,225,53,0.3)]',
  },
  challenge: {
    active: 'bg-neo-pink border-neo-pink',
    glow: 'shadow-[0_0_12px_rgba(255,20,147,0.3)]',
  },
};

// ==================== Animation Variants ====================

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const presetVariants = {
  hidden: { opacity: 0, y: 10, scale: 0.9 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 400, damping: 22 },
  },
};

const checkPopVariants = {
  initial: { scale: 0, rotate: -90 },
  animate: {
    scale: 1,
    rotate: 0,
    transition: { type: 'spring' as const, stiffness: 500, damping: 12 },
  },
  exit: { scale: 0, rotate: 90, transition: { duration: 0.12 } },
};

const iconBounceVariants = {
  idle: { y: 0, scale: 1 },
  selected: {
    y: [0, -6, 0],
    scale: [1, 1.25, 1],
    transition: { duration: 0.4, ease: 'easeOut' as const },
  },
};

// ==================== Props ====================

interface PresetSelectorProps {
  selectedPreset: PresetKey;
  onPresetClick: (key: PresetKey) => void;
  t: (path: string, params?: Record<string, string | number>) => string;
}

// ==================== Component ====================

export const PresetSelector = memo<PresetSelectorProps>(function PresetSelector({
  selectedPreset,
  onPresetClick,
  t,
}) {
  const presetKeys = Object.keys(GAME_PRESETS) as PresetKey[];

  return (
    <m.div
      className="flex gap-2"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {presetKeys.map((key) => {
        const preset = GAME_PRESETS[key];
        const isSelected = selectedPreset === key;
        const colors = PRESET_COLORS[key];

        return (
          <m.button
            key={key}
            variants={presetVariants}
            onClick={() => onPresetClick(key)}
            whileHover={{
              scale: 1.06,
              transition: { type: 'spring', stiffness: 400, damping: 17 },
            }}
            whileTap={{
              scale: 0.92,
              transition: { type: 'spring', stiffness: 500, damping: 20 },
            }}
            className={cn(
              'flex-1 flex flex-col items-center gap-0.5 p-2 rounded-neo font-bold border-2 relative overflow-hidden',
              'transition-[background-color,border-color,box-shadow] duration-300',
              isSelected
                ? `${colors.active} ${colors.glow} text-neo-black shadow-none`
                : 'bg-neo-navy/60 border-neo-black/50 text-neo-cream shadow-hard-sm'
            )}
          >
            {/* Check badge */}
            <AnimatePresence>
              {isSelected && (
                <m.div
                  variants={checkPopVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="absolute -top-1 -right-1 z-10"
                >
                  <Check className="w-4 h-4 bg-neo-black text-neo-white rounded-full p-0.5" />
                </m.div>
              )}
            </AnimatePresence>

            {/* Emoji icon with bounce on selection */}
            <m.span
              className="text-lg"
              variants={iconBounceVariants}
              animate={isSelected ? 'selected' : 'idle'}
            >
              {preset.icon}
            </m.span>

            <span className="text-[10px] font-black uppercase">{t(preset.nameKey)}</span>
            <span className="text-[9px] opacity-70">{preset.timer}min</span>
          </m.button>
        );
      })}
    </m.div>
  );
});

export default PresetSelector;
