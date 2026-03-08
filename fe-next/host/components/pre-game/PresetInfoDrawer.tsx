'use client';

import React, { memo, useCallback } from 'react';
import { Timer, Grid3X3, Type } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { MobileDrawer } from '../../../components/layout/MobileDrawer';
import { GAME_PRESETS, type PresetKey } from './PresetSelector';
import type { DifficultyLevel } from '@/shared/types/game';

// ==================== Props ====================

interface PresetInfoDrawerProps {
  openPreset: PresetKey | null;
  onClose: () => void;
  onSelectPreset: (key: PresetKey) => void;
  t: (path: string, params?: Record<string, string | number>) => string;
}

// ==================== Helpers ====================

function getBoardSizeText(
  difficulty: DifficultyLevel,
  t: (path: string, params?: Record<string, string | number>) => string
): string {
  if (difficulty === 'HARD') {
    return t('hostView.presetDrawerBoardHard');
  }
  return t('hostView.presetDrawerBoardMedium');
}

function capitalizeFirstLetter(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ==================== Component ====================

export const PresetInfoDrawer = memo<PresetInfoDrawerProps>(function PresetInfoDrawer({
  openPreset,
  onClose,
  onSelectPreset,
  t,
}) {
  const handleSelectPreset = useCallback(() => {
    if (openPreset) {
      onSelectPreset(openPreset);
    }
  }, [openPreset, onSelectPreset]);

  if (!openPreset) {
    return (
      <MobileDrawer isOpen={false} onClose={onClose} title="" height="auto">
        <div />
      </MobileDrawer>
    );
  }

  const preset = GAME_PRESETS[openPreset];
  const presetDescKey = `hostView.preset${capitalizeFirstLetter(openPreset)}Desc`;

  return (
    <MobileDrawer
      isOpen={openPreset !== null}
      onClose={onClose}
      title={t(preset.nameKey)}
      height="auto"
    >
      <div className="space-y-4">
        {/* Preset Header */}
        <div className="flex items-center gap-3">
          <span className="text-4xl">{preset.icon}</span>
          <div>
            <h3 className="text-lg font-black text-neo-black">{t(preset.nameKey)}</h3>
            <p className="text-sm text-neo-black/70">{t(presetDescKey)}</p>
          </div>
        </div>

        {/* Detailed Description */}
        <p className="text-sm text-neo-black/80 leading-relaxed">{t(preset.detailsKey)}</p>

        {/* Settings Breakdown */}
        <div className="bg-neo-black/5 rounded-neo p-3 space-y-2 border-2 border-neo-black/10">
          <h4 className="text-xs font-black uppercase text-neo-black/60 mb-2">
            {t('common.settings')}
          </h4>

          {/* Timer */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Timer className="w-4 h-4 text-neo-black/60" />
              <span className="text-sm font-bold text-neo-black">
                {t('hostView.presetDrawerTimer')}
              </span>
            </div>
            <span className="text-sm font-black text-neo-black">{preset.timer} min</span>
          </div>

          {/* Board Size */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Grid3X3 className="w-4 h-4 text-neo-black/60" />
              <span className="text-sm font-bold text-neo-black">
                {t('hostView.presetDrawerBoard')}
              </span>
            </div>
            <span className="text-sm font-black text-neo-black">
              {getBoardSizeText(preset.difficulty, t)}
            </span>
          </div>

          {/* Min Word Length */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Type className="w-4 h-4 text-neo-black/60" />
              <span className="text-sm font-bold text-neo-black">
                {t('hostView.presetDrawerMinWord')}
              </span>
            </div>
            <span className="text-sm font-black text-neo-black">
              {preset.minWordLength} {t('hostView.presetDrawerLetters')}
            </span>
          </div>
        </div>

        {/* Use This Mode Button */}
        <Button
          onClick={handleSelectPreset}
          className="w-full h-12 text-base bg-neo-lime text-neo-black font-black uppercase border-3 border-neo-black shadow-hard hover:shadow-hard-lg active:shadow-hard-pressed active:translate-y-0.5 transition-all"
        >
          {t('hostView.presetDrawerUseMode')}
        </Button>
      </div>
    </MobileDrawer>
  );
});

export default PresetInfoDrawer;
