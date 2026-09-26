'use client';

import React, { useCallback } from 'react';
import { HelpCircle } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { getModeDescription, MODE_ICONS, type GameModeOption } from '@/components/GameModeSelector';
import { useExperiment } from '@/hooks/useExperiment';
import { getModePresentation, type ModeColorFamily } from '@/lib/multiplayer/modePresentation';
import styles from '@/components/multiplayer/lobby/lobby.module.css';

interface BattleModeCardProps {
  selectedGameMode: GameModeOption;
  setSelectedGameMode: (mode: GameModeOption) => void;
  t: (path: string, params?: Record<string, string | number>) => string;
  /** Surfaces the admin-only previews (Word Tower, Sealed Bid, Crossword). */
  isAdmin?: boolean;
  /** Board language — gates admin-only modes by dictionary availability. */
  language?: string | null;
  /** @deprecated Blast is offered to all players now. */
  hasBlastAccess?: boolean;
  /** Opens the how-to-play sheet; renders a "How to play" link beside the rule. */
  onHowToPlay?: () => void;
  className?: string;
}

const MODES: Array<{ mode: GameModeOption; nameKey: string }> = [
  { mode: 'random', nameKey: 'gameModes.random' },
  { mode: 'classic', nameKey: 'gameModes.classic.name' },
  { mode: 'word-hunt', nameKey: 'gameModes.wordHunt.name' },
  { mode: 'wheel-rush', nameKey: 'gameModes.wheelRush.name' },
  { mode: 'blast', nameKey: 'gameModes.blast.name' },
  { mode: 'word-tower', nameKey: 'wordTower.cardTitle' },
  { mode: 'sealed-bid', nameKey: 'gameModes.sealedBid.name' },
  { mode: 'crossword', nameKey: 'gameModes.crossword.name' },
];

/**
 * Full class literals per colour family (Tailwind keeps only literal strings).
 * The family comes from `getModePresentation`, the same palette the countdown
 * and results use, so a mode wears one colour through the whole match.
 */
const FAMILY: Record<ModeColorFamily, { on: string; rest: string; icon: string }> = {
  lime: { on: 'bg-neo-lime text-neo-black', rest: 'border-neo-lime/50 hover:border-neo-lime', icon: 'text-neo-lime' },
  pink: { on: 'bg-neo-pink text-neo-black', rest: 'border-neo-pink/50 hover:border-neo-pink', icon: 'text-neo-pink' },
  cyan: { on: 'bg-neo-cyan text-neo-black', rest: 'border-neo-cyan/50 hover:border-neo-cyan', icon: 'text-neo-cyan' },
  purple: { on: 'bg-neo-purple text-neo-black', rest: 'border-neo-purple/50 hover:border-neo-purple', icon: 'text-neo-purple' },
  orange: { on: 'bg-neo-orange text-neo-black', rest: 'border-neo-orange/50 hover:border-neo-orange', icon: 'text-neo-orange' },
};

/**
 * The lobby mode picker: a 3-column chip grid (icon + short name), the chosen
 * chip flooded in its mode colour, and ONE line under the grid with that
 * mode's rule — the grid never grows when you change your mind.
 */
export function BattleModeCard({
  selectedGameMode,
  setSelectedGameMode,
  t,
  isAdmin = false,
  language = null,
  onHowToPlay,
  className,
}: BattleModeCardProps): React.ReactElement {
  const handleSelect = useCallback((mode: GameModeOption) => setSelectedGameMode(mode), [setSelectedGameMode]);

  // Word Tower stays admin-only AND behind the `word-tower` experiment; Sealed
  // Bid needs curated EN/HE racks; Crossword is an admin preview.
  const { variant: wordTowerVariant } = useExperiment('word-tower');
  const visibleModes = MODES.filter(({ mode }) => {
    if (mode === 'word-tower') return isAdmin && wordTowerVariant === 'on';
    if (mode === 'sealed-bid') return isAdmin && (language === 'en' || language === 'he');
    if (mode === 'crossword') return isAdmin;
    return true;
  });

  return (
    <section className={cn('flex flex-col gap-2 min-w-0', className)}>
      <h3 className="font-neo-display text-sm font-bold uppercase tracking-wider text-neo-white/80">
        {t('hostView.battleMode')}
      </h3>
      <div className="grid grid-cols-3 gap-2">
        {visibleModes.map(({ mode, nameKey }) => {
          const isActive = selectedGameMode === mode;
          const family = FAMILY[getModePresentation(mode).color];
          return (
            <button
              key={mode}
              type="button"
              onClick={() => handleSelect(mode)}
              data-testid={`game-mode-${mode}`}
              aria-pressed={isActive}
              className={cn(
                'flex items-center gap-1.5 min-w-0 min-h-11 tall:min-h-12 desktop-tall:min-h-14 px-2 py-1.5 rounded-neo border-2 text-start',
                'transition-[transform,background-color,border-color] duration-150 active:translate-y-0.5',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-white focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy',
                isActive
                  ? cn(family.on, 'border-neo-black shadow-hard-sm', styles.chipPunch)
                  : cn('bg-neo-navy-light text-neo-white', family.rest),
              )}
            >
              <span aria-hidden="true" className={cn('shrink-0 [&_svg]:w-5 [&_svg]:h-5', isActive ? 'text-neo-black' : family.icon)}>
                {MODE_ICONS[mode]}
              </span>
              <span className="min-w-0 font-neo-display text-[11px] tall:text-xs desktop-tall:text-sm font-bold uppercase leading-[1.1] line-clamp-2 break-words">
                {t(nameKey)}
              </span>
            </button>
          );
        })}
      </div>
      <p className="flex items-start gap-2 min-h-8 text-xs desktop-tall:text-sm leading-snug text-neo-white/80">
        <span className="min-w-0 flex-1 line-clamp-2">{getModeDescription(selectedGameMode, t)}</span>
        {onHowToPlay && (
          <button
            type="button"
            onClick={onHowToPlay}
            data-testid="lobby-how-to-play"
            className="shrink-0 inline-flex items-center gap-1 rounded-full border-2 border-neo-black bg-neo-navy-light px-2 py-1 font-bold text-neo-cyan shadow-hard-sm active:translate-y-0.5"
          >
            <HelpCircle aria-hidden="true" className="w-3.5 h-3.5" />
            {t('mpUi.lobby.howToPlay')}
          </button>
        )}
      </p>
    </section>
  );
}
