'use client';

import React from 'react';
import { m } from 'framer-motion';
import { Check, Monitor, Shuffle, FileText, Target } from 'lucide-react';
import { cn } from '../../../../lib/utils';
import type { GameModeOption } from '@/components/GameModeSelector';

// ==================== Types ====================

export interface SettingsPanelProps {
  /** Currently selected game mode */
  selectedGameMode: GameModeOption;
  /** Callback when a game mode is clicked */
  onGameModeClick: (mode: GameModeOption) => void;
  /** Whether TV mode (host not playing) is enabled */
  tvMode: boolean;
  /** Callback when TV mode is toggled */
  onTvModeToggle: () => void;
  /** Translation function */
  t: (path: string, params?: Record<string, string | number>) => string;
}

// ==================== Constants ====================

const MODE_CONFIG: {
  mode: GameModeOption;
  icon: typeof Shuffle;
  nameKey: string;
  descKey: string;
  colors: { bg: string; border: string; text: string };
}[] = [
  {
    mode: 'random',
    icon: Shuffle,
    nameKey: 'gameModes.random',
    descKey: 'gameModes.randomizing',
    colors: { bg: 'bg-neo-purple/20', border: 'border-neo-purple', text: 'text-neo-purple' },
  },
  {
    mode: 'classic',
    icon: FileText,
    nameKey: 'gameModes.classic.name',
    descKey: 'gameModes.classic.description',
    colors: { bg: 'bg-neo-cyan/20', border: 'border-neo-cyan', text: 'text-neo-cyan' },
  },
  {
    mode: 'word-hunt',
    icon: Target,
    nameKey: 'gameModes.wordHunt.name',
    descKey: 'gameModes.wordHunt.description',
    colors: { bg: 'bg-neo-pink/20', border: 'border-neo-pink', text: 'text-neo-pink' },
  },
  {
    mode: 'wheel-rush',
    icon: Target,
    nameKey: 'gameModes.wheelRush.name',
    descKey: 'gameModes.wheelRush.description',
    colors: { bg: 'bg-neo-lime/20', border: 'border-neo-lime', text: 'text-neo-lime' },
  },
];

// ==================== Component ====================

export function SettingsPanel({
  selectedGameMode,
  onGameModeClick,
  tvMode,
  onTvModeToggle,
  t,
}: SettingsPanelProps): React.ReactElement {
  return (
    <div
      data-testid="settings-panel"
      className="flex flex-col gap-4 xl:gap-5"
    >
      {/* Game Mode Section */}
      <div className="relative rounded-neo-lg border-4 border-neo-black bg-slate-800 shadow-hard overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1.5 xl:h-2 bg-linear-to-r from-neo-pink via-neo-yellow to-neo-cyan" />

        <div className="p-4 pt-5 xl:p-5 xl:pt-6">
          <p className="text-xs xl:text-sm font-bold uppercase text-neo-cream/60 mb-3 xl:mb-4">
            {t('gameModes.nextMode')}
          </p>

          <div className="flex flex-col gap-2 xl:gap-3">
            {MODE_CONFIG.map(({ mode, icon: Icon, nameKey, descKey, colors }) => {
              const isSelected = selectedGameMode === mode;

              return (
                <m.button
                  key={mode}
                  data-testid={`game-mode-${mode}`}
                  data-selected={isSelected}
                  onClick={() => onGameModeClick(mode)}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    'flex items-center gap-3 xl:gap-4 p-3 xl:p-4 rounded-neo border-2 xl:border-3 transition-all text-start',
                    isSelected
                      ? `${colors.bg} ${colors.border} shadow-none`
                      : 'bg-neo-navy/40 border-neo-black/50 hover:border-neo-black shadow-hard-sm'
                  )}
                >
                  <div
                    className={cn(
                      'p-2 xl:p-2.5 rounded-neo',
                      isSelected ? colors.text : 'text-neo-cream/70'
                    )}
                  >
                    <Icon className="w-5 h-5 xl:w-6 xl:h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      'font-bold text-sm xl:text-base',
                      isSelected ? colors.text : 'text-neo-cream'
                    )}>
                      {t(nameKey)}
                    </p>
                    <p className="text-xs xl:text-sm text-neo-cream/50 truncate">
                      {t(descKey)}
                    </p>
                  </div>
                  {isSelected && (
                    <Check className={cn('w-5 h-5 xl:w-6 xl:h-6', colors.text)} />
                  )}
                </m.button>
              );
            })}
          </div>
        </div>
      </div>

      {/* TV Mode Toggle */}
      <button
        data-testid="tv-mode-toggle"
        data-checked={tvMode}
        onClick={onTvModeToggle}
        className={cn(
          'flex items-center gap-3 xl:gap-4 p-3 xl:p-4 rounded-neo border-2 xl:border-3 transition-all',
          tvMode
            ? 'bg-neo-purple/20 border-neo-purple'
            : 'bg-neo-navy/40 border-neo-black/50 hover:border-neo-black'
        )}
      >
        <Monitor className={cn('w-5 h-5 xl:w-6 xl:h-6', tvMode ? 'text-neo-purple' : 'text-neo-cream/70')} />
        <div className="flex-1 text-start">
          <p className={cn('font-bold text-sm xl:text-base', tvMode ? 'text-neo-purple' : 'text-neo-cream')}>
            {t('hostView.broadcastModeTitle')}
          </p>
          <p className="text-xs xl:text-sm text-neo-cream/50">
            {t('hostView.broadcastModeDesc')}
          </p>
        </div>
        <div
          className={cn(
            'w-10 h-6 xl:w-12 xl:h-7 rounded-full border-2 transition-all relative',
            tvMode
              ? 'bg-neo-purple border-neo-purple'
              : 'bg-neo-navy border-neo-black/50'
          )}
        >
          <div
            className={cn(
              'w-4 h-4 xl:w-5 xl:h-5 rounded-full bg-neo-white absolute top-0.5 xl:top-0.5 transition-all',
              tvMode ? 'left-4 xl:left-5' : 'left-0.5'
            )}
          />
        </div>
      </button>
    </div>
  );
}

export default SettingsPanel;
