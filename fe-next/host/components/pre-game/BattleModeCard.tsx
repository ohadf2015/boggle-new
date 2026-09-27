'use client';

import React, { useCallback } from 'react';
import { cn } from '../../../lib/utils';
import { getModeDescription, type GameModeOption } from '@/components/GameModeSelector';
import { HowToArt, ModeArt } from '@/components/multiplayer/lobby/ModeArt';
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
  /** Opens the how-to-play sheet; adds a "How to play" tile in the grid's spare slot. */
  onHowToPlay?: () => void;
  /** Stretch the tile grid to the space the parent gives it (lobby body). */
  fill?: boolean;
  className?: string;
}

const MODES: Array<{ mode: GameModeOption; nameKey: string }> = [
  { mode: 'random', nameKey: 'gameModes.random' },
  { mode: 'classic', nameKey: 'gameModes.classic.name' },
  { mode: 'word-hunt', nameKey: 'gameModes.wordHunt.name' },
  { mode: 'wheel-rush', nameKey: 'gameModes.wheelRush.name' },
  { mode: 'blast', nameKey: 'gameModes.blast.name' },
  { mode: 'sealed-bid', nameKey: 'gameModes.sealedBid.name' },
  { mode: 'crossword', nameKey: 'gameModes.crossword.name' },
];

/**
 * Full class literals per colour family (Tailwind keeps only literal strings).
 * The family comes from `getModePresentation`, the same palette the countdown
 * and results use, so a mode wears one colour through the whole match.
 */
const FAMILY: Record<ModeColorFamily, { on: string; rest: string; icon: string }> = {
  lime: { on: 'bg-neo-lime/20 border-neo-lime', rest: 'border-neo-lime/50 hover:border-neo-lime', icon: 'text-neo-lime' },
  pink: { on: 'bg-neo-pink/20 border-neo-pink', rest: 'border-neo-pink/50 hover:border-neo-pink', icon: 'text-neo-pink' },
  cyan: { on: 'bg-neo-cyan/20 border-neo-cyan', rest: 'border-neo-cyan/50 hover:border-neo-cyan', icon: 'text-neo-cyan' },
  purple: { on: 'bg-neo-purple/20 border-neo-purple', rest: 'border-neo-purple/50 hover:border-neo-purple', icon: 'text-neo-purple' },
  orange: { on: 'bg-neo-orange/20 border-neo-orange', rest: 'border-neo-orange/50 hover:border-neo-orange', icon: 'text-neo-orange' },
};

/**
 * The lobby mode picker: a 3-column grid of illustrated tiles (sticker art +
 * short name), the chosen tile tinted + ringed in its mode colour (a tint, not a
 * solid flood — the footer START is the lobby's one solid CTA), and ONE line under
 * the grid with that mode's rule — the grid never grows when you change your
 * mind. With `fill` the tiles stretch into the body's free height.
 */
export function BattleModeCard({
  selectedGameMode,
  setSelectedGameMode,
  t,
  isAdmin = false,
  language = null,
  onHowToPlay,
  fill = false,
  className,
}: BattleModeCardProps): React.ReactElement {
  const handleSelect = useCallback((mode: GameModeOption) => setSelectedGameMode(mode), [setSelectedGameMode]);

  // Sealed Bid needs curated EN/HE racks; Crossword is an admin preview.
  // (Legacy MP Word Tower left the picker on master — bf90dc061.)
  const visibleModes = MODES.filter(({ mode }) => {
    if (mode === 'sealed-bid') return isAdmin && (language === 'en' || language === 'he');
    if (mode === 'crossword') return isAdmin;
    return true;
  });

  return (
    <section className={cn('flex flex-col gap-2 min-w-0', fill && 'flex-1', className)}>
      <h3 className="font-neo-display text-[length:calc(14px*var(--mp-u,1))] font-bold uppercase tracking-wider text-neo-white/80">
        {t('hostView.battleMode')}
      </h3>
      {/*
       * Rows keep their automatic (content) minimum: fr rows inside a
       * definite-height grid are what let the tiles compress into each other
       * on short phones. fill only stretches the grid into FREE height — it
       * can never shrink below the tiles' min-h.
       */}
      <div className={cn('grid grid-cols-3 gap-2 desktop-tall:gap-[calc(10px*var(--mp-u,1))]', fill && 'flex-1 auto-rows-fr')}>
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
                styles.modeTile,
                'group flex flex-col items-center justify-center gap-1 min-w-0 min-h-[72px] tall:min-h-[80px] max-h-[calc(150px*var(--mp-u,1))] px-1.5 pt-1.5 pb-2 rounded-neo border-2 text-center',
                'transition-[transform,background-color,border-color,box-shadow] duration-150 active:translate-y-0.5 active:shadow-none',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-white focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy',
                isActive
                  ? cn(family.on, 'border-[3px] text-neo-white shadow-hard', styles.chipPunch)
                  : cn('bg-neo-navy-light text-neo-white shadow-hard-sm', family.rest),
              )}
            >
              <ModeArt
                mode={mode}
                className={cn(
                  styles.modeArt,
                  'block w-full flex-1 min-h-0 max-h-[calc(72px*var(--mp-u,1))]',
                  family.icon,
                  isActive && styles.modeArtOn,
                )}
              />
              <span className="shrink-0 max-w-full font-neo-display text-[11px] tall:text-xs desktop-tall:text-[length:calc(14px*var(--mp-u,1))] font-bold uppercase leading-[1.1] line-clamp-2 break-words">
                {t(nameKey)}
              </span>
            </button>
          );
        })}
        {onHowToPlay && (
          <button
            type="button"
            onClick={onHowToPlay}
            data-testid="lobby-how-to-play"
            className={cn(
              styles.modeTile,
              'flex flex-col items-center justify-center gap-1 min-w-0 min-h-[72px] tall:min-h-[80px] max-h-[calc(150px*var(--mp-u,1))] px-1.5 pt-1.5 pb-2 rounded-neo border-2 border-dashed border-neo-cyan/60 bg-neo-navy text-neo-cyan text-center',
              'transition-[transform,border-color] duration-150 hover:border-neo-cyan active:translate-y-0.5',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-white focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy',
            )}
          >
            <HowToArt className={cn(styles.modeArt, 'block w-full flex-1 min-h-0 max-h-[calc(72px*var(--mp-u,1))]')} />
            <span className="shrink-0 max-w-full font-neo-display text-[11px] tall:text-xs desktop-tall:text-[length:calc(14px*var(--mp-u,1))] font-bold uppercase leading-[1.1] line-clamp-2 break-words">
              {t('mpUi.lobby.howToPlay')}
            </span>
          </button>
        )}
      </div>
      <p className="min-h-5 text-xs desktop-tall:text-[length:calc(14px*var(--mp-u,1))] leading-snug font-bold text-neo-white/80 line-clamp-2">
        {getModeDescription(selectedGameMode, t)}
      </p>
    </section>
  );
}
