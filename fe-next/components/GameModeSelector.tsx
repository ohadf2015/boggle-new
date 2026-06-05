'use client';

import React from 'react';
import { m } from 'framer-motion';
import { Shuffle, FileText, Bomb, Crosshair, Disc3, Building2, Link2 } from 'lucide-react';
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

export const MODE_ICONS: Record<GameModeOption, React.ReactNode> = {
  random: <Shuffle className="w-4 h-4" />,
  classic: <FileText className="w-4 h-4" />,
  blast: <Bomb className="w-4 h-4" />,
  'word-hunt': <Crosshair className="w-4 h-4" />,
  'wheel-rush': <Disc3 className="w-4 h-4" />,
  'word-tower': <Building2 className="w-4 h-4" />,
  shiritori: <Link2 className="w-4 h-4" />,
};

export const MODE_ACTIVE_COLORS: Record<GameModeOption, string> = {
  random: 'bg-neo-purple/30 text-neo-purple border-neo-purple/60',
  classic: 'bg-neo-cyan/30 text-neo-cyan border-neo-cyan/60',
  blast: 'bg-neo-pink/30 text-neo-pink border-neo-pink/60',
  'word-hunt': 'bg-neo-pink/30 text-neo-pink border-neo-pink/60',
  'wheel-rush': 'bg-neo-lime/30 text-neo-lime border-neo-lime/60',
  'word-tower': 'bg-neo-purple/30 text-neo-purple border-neo-purple/60',
  shiritori: 'bg-neo-purple/30 text-neo-purple border-neo-purple/60',
};

const MODE_GLOW: Record<GameModeOption, string> = {
  random: 'shadow-[0_0_10px_rgba(139,92,246,0.25)]',
  classic: 'shadow-[0_0_10px_rgba(0,255,255,0.25)]',
  blast: 'shadow-[0_0_10px_rgba(255,107,53,0.25)]',
  'word-hunt': 'shadow-[0_0_10px_rgba(255,20,147,0.25)]',
  'wheel-rush': 'shadow-[0_0_10px_rgba(191,255,0,0.25)]',
  'word-tower': 'shadow-[0_0_10px_rgba(139,92,246,0.25)]',
  shiritori: 'shadow-[0_0_10px_rgba(139,92,246,0.25)]',
};

export function getModeLabel(mode: GameModeOption, t: GameModeSelectorProps['t']): string {
  const labels: Record<GameModeOption, string> = {
    random: t('gameModes.random'),
    classic: t('gameModes.classic.name'),
    blast: t('gameModes.blast.name'),
    'word-hunt': t('gameModes.wordHunt.name'),
    'wheel-rush': t('gameModes.wheelRush.name'),
    'word-tower': t('wordTower.cardTitle'),
    shiritori: t('gameModes.shiritori.name'),
  };
  return labels[mode];
}

/**
 * Short description used as a hover tooltip (desktop) on mode buttons.
 * Translations live under `gameModes.*.description` (plus `gameModes.randomDescription`).
 */
export function getModeDescription(mode: GameModeOption, t: GameModeSelectorProps['t']): string {
  const descriptions: Record<GameModeOption, string> = {
    random: t('gameModes.randomDescription'),
    classic: t('gameModes.classic.description'),
    blast: t('gameModes.blast.description'),
    'word-hunt': t('gameModes.wordHunt.description'),
    'wheel-rush': t('gameModes.wheelRush.description'),
    'word-tower': t('wordTower.cardDesc'),
    shiritori: t('gameModes.shiritori.description'),
  };
  return descriptions[mode];
}

/**
 * Shared game mode selector used in lobby and results page.
 * Renders icon-based buttons with juicy selection animations.
 */
export function GameModeSelector({
  selectedMode,
  onSelectMode,
  t,
  showRandom = true,
  compact = false,
}: GameModeSelectorProps) {
  const baseModes: GameModeOption[] = ['classic', 'word-hunt', 'wheel-rush', 'blast'];
  const modes: GameModeOption[] = showRandom ? ['random', ...baseModes] : baseModes;
  const [tooltipMode, setTooltipMode] = React.useState<GameModeOption | null>(null);
  const activeTooltip = tooltipMode ?? selectedMode;

  return (
    <div className="flex flex-col gap-1">
    <div className={cn('grid gap-1.5', modes.length >= 5 ? 'grid-cols-5' : modes.length === 4 ? 'grid-cols-4' : modes.length === 3 ? 'grid-cols-3' : 'grid-cols-2')}>
      {modes.map((mode) => {
        const isActive = selectedMode === mode;
        return (
          <m.button
            key={mode}
            onClick={() => {
              setTooltipMode(mode);
              onSelectMode(mode);
            }}
            onPointerEnter={() => setTooltipMode(mode)}
            onPointerLeave={(e) => { if (e.pointerType === 'mouse') setTooltipMode(null); }}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.92 }}
            transition={{ type: 'spring' as const, stiffness: 400, damping: 20 }}
            data-testid={`game-mode-${mode}`}
            title={getModeDescription(mode, t)}
            aria-label={`${getModeLabel(mode, t)} — ${getModeDescription(mode, t)}`}
            className={cn(
              'rounded-lg font-bold text-[9px] uppercase border-2 border-neo-black flex flex-col items-center gap-0.5',
              'transition-[background-color,color,border-color,box-shadow] duration-200',
              compact ? 'min-h-10 py-1' : 'min-h-11 py-1.5',
              isActive
                ? `${MODE_ACTIVE_COLORS[mode]} ${MODE_GLOW[mode]} shadow-hard-sm`
                : 'bg-neo-navy/60 text-neo-white border-neo-white/20 hover:bg-neo-navy hover:text-neo-white'
            )}
          >
            {/* Icon with bounce on active */}
            <m.span
              className={cn('flex items-center justify-center', compact ? 'text-xs' : 'text-sm')}
              animate={isActive ? { y: [0, -2, 0] } : { y: 0 }}
              transition={isActive ? { duration: 0.3, ease: 'easeOut' as const } : {}}
            >
              {MODE_ICONS[mode]}
            </m.span>
            <span className="leading-none">{getModeLabel(mode, t)}</span>
          </m.button>
        );
      })}
    </div>
    <div
      className="min-h-[14px] text-center text-[10px] leading-tight text-neo-white px-2"
      aria-live="polite"
    >
      {activeTooltip ? getModeDescription(activeTooltip, t) : ''}
    </div>
    </div>
  );
}
