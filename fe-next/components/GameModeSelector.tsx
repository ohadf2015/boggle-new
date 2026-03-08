'use client';

import React from 'react';
import { Shuffle, FileText, Bomb, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GameMode } from '@/shared/types/game';

export type GameModeOption = GameMode | 'random';

interface GameModeSelectorProps {
  /** Currently selected game mode */
  selectedMode: GameModeOption;
  /** Callback when a mode is selected */
  onSelectMode: (mode: GameModeOption) => void;
  /** Translation function */
  t: (key: string, params?: Record<string, string | number>) => string;
  /** Whether to show the 'random' option (lobby only) */
  showRandom?: boolean;
  /** Compact variant for results page */
  compact?: boolean;
}

const MODE_ICONS: Record<GameModeOption, React.ReactNode> = {
  random: <Shuffle className="w-4 h-4" />,
  classic: <FileText className="w-4 h-4" />,
  blast: <Bomb className="w-4 h-4" />,
  'word-hunt': <Target className="w-4 h-4" />,
};

function getModeLabel(mode: GameModeOption, t: GameModeSelectorProps['t']): string {
  const labels: Record<GameModeOption, string> = {
    random: t('gameModes.random'),
    classic: t('gameModes.classic.name'),
    blast: t('gameModes.blast.name'),
    'word-hunt': t('gameModes.wordHunt.name'),
  };
  return labels[mode];
}

/**
 * Shared game mode selector used in lobby and results page.
 * Renders icon-based buttons for each game mode.
 */
export function GameModeSelector({
  selectedMode,
  onSelectMode,
  t,
  showRandom = true,
  compact = false,
}: GameModeSelectorProps) {
  const modes: GameModeOption[] = showRandom
    ? ['random', 'classic', 'blast', 'word-hunt']
    : ['classic', 'blast', 'word-hunt'];

  return (
    <div className={cn('grid gap-1.5', showRandom ? 'grid-cols-4' : 'grid-cols-3')}>
      {modes.map((mode) => {
        const isActive = selectedMode === mode;
        return (
          <button
            key={mode}
            onClick={() => onSelectMode(mode)}
            data-testid={`game-mode-${mode}`}
            className={cn(
              'rounded-lg font-bold text-[9px] uppercase border-2 border-neo-black transition-colors flex flex-col items-center gap-0.5',
              compact ? 'py-1' : 'py-1.5',
              isActive
                ? 'bg-neo-cyan/30 text-neo-cyan border-neo-cyan/60 shadow-hard-sm'
                : 'bg-neo-navy/60 text-neo-cream/70 border-neo-white/20 hover:bg-neo-navy hover:text-neo-cream'
            )}
          >
            <span className={cn('flex items-center justify-center', compact ? 'text-xs' : 'text-sm')}>
              {MODE_ICONS[mode]}
            </span>
            <span className="leading-none">{getModeLabel(mode, t)}</span>
          </button>
        );
      })}
    </div>
  );
}
