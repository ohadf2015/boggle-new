'use client';

import React, { memo } from 'react';
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
    timer: 3,
    difficulty: 'HARD',
    minWordLength: 3,
  },
} as const;

export type PresetKey = 'fast' | 'party' | 'challenge';

const PRESET_COLORS: Record<PresetKey, string> = {
  fast: 'bg-neo-cyan border-neo-cyan',
  party: 'bg-neo-yellow border-neo-yellow',
  challenge: 'bg-neo-pink border-neo-pink',
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
    <div className="flex gap-2">
      {presetKeys.map((key) => {
        const preset = GAME_PRESETS[key];
        const isSelected = selectedPreset === key;

        return (
          <button
            key={key}
            onClick={() => onPresetClick(key)}
            className={cn(
              'flex-1 flex flex-col items-center gap-0.5 p-2 rounded-neo font-bold transition-all border-2 relative',
              isSelected
                ? `${PRESET_COLORS[key]} text-neo-black shadow-none`
                : 'bg-neo-navy/60 border-neo-black/50 text-neo-cream shadow-hard-sm'
            )}
          >
            {isSelected && (
              <Check className="absolute -top-1 -right-1 w-4 h-4 bg-neo-black text-neo-white rounded-full p-0.5" />
            )}
            <span className="text-lg">{preset.icon}</span>
            <span className="text-[10px] font-black uppercase">{t(preset.nameKey)}</span>
            <span className="text-[9px] opacity-70">{preset.timer}min</span>
          </button>
        );
      })}
    </div>
  );
});

export default PresetSelector;
