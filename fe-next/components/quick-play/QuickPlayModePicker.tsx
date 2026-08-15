'use client';

/**
 * Quick Play Mode Picker — card-based mode selection
 *
 * Four cards with distinct styling (size, weight, layout asymmetry) let players
 * choose their mode at a glance. Each card carries a complete one-line promise
 * so first-timers know what they're getting before committing. Random is secondary.
 *
 * Layout:
 * - Mobile (< md): 2-column grid, uniform heights, full-height promises visible
 * - Desktop (md+): 3-column grid, Classic spans 2 rows (tall hero), others regular
 *
 * CRITICAL: All text on accent fills is BLACK (text-black) for WCAG contrast.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { ModeGlyph } from './ModeGlyph';
import { NODE_COLORS } from './modeColors';
import type { QuickMode } from './types';
import type { WheelSelection } from './wheelGeometry';

const MODES: QuickMode[] = ['classic', 'blast', 'word-hunt', 'wheel-rush'];

// Desktop layout: Classic tall on left (2x2), Blast/Hunt stack right (1x2 each), Wheel spans bottom.
// Mobile: 2-column, uniform height for full-text promises.
const CARD_SIZES: Record<QuickMode, { glyph: number; titleScale: string; blurbScale: string; gridClass: string }> = {
  classic: {
    glyph: 56,
    titleScale: 'text-lg sm:text-xl',
    blurbScale: 'text-sm sm:text-base',
    gridClass: 'md:col-span-2 md:row-span-2'
  },
  blast: {
    glyph: 40,
    titleScale: 'text-base sm:text-lg',
    blurbScale: 'text-xs sm:text-sm',
    gridClass: 'md:col-span-1 md:row-span-1'
  },
  'word-hunt': {
    glyph: 36,
    titleScale: 'text-sm sm:text-base',
    blurbScale: 'text-xs',
    gridClass: 'md:col-span-1 md:row-span-1'
  },
  'wheel-rush': {
    glyph: 44,
    titleScale: 'text-base sm:text-lg',
    blurbScale: 'text-xs sm:text-sm',
    gridClass: 'md:col-span-2 md:row-span-1'
  },
};

interface QuickPlayModePickerProps {
  selection: WheelSelection;
  pendingMode: QuickMode | null;
  onSelect: (mode: WheelSelection, method: 'tap') => void;
}

export function QuickPlayModePicker({
  selection,
  pendingMode,
  onSelect,
}: QuickPlayModePickerProps) {
  const { t } = useLanguage();
  const [focusedIndex, setFocusedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const isLoading = pendingMode !== null;

  const handleModeClick = useCallback(
    (mode: QuickMode) => {
      onSelect(mode, 'tap');
    },
    [onSelect]
  );

  const handleRandomClick = useCallback(() => {
    onSelect('random', 'tap');
  }, [onSelect]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, index: number) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIndex = (index + 1) % (MODES.length + 1);
        setFocusedIndex(nextIndex);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        const prevIndex = index === 0 ? MODES.length : index - 1;
        setFocusedIndex(prevIndex);
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (index < MODES.length) {
          handleModeClick(MODES[index]);
        } else {
          handleRandomClick();
        }
      }
    },
    [handleModeClick, handleRandomClick]
  );

  // Focus management for keyboard nav
  useEffect(() => {
    const buttons = containerRef.current?.querySelectorAll('button');
    if (buttons && focusedIndex < buttons.length) {
      buttons[focusedIndex].focus();
    }
  }, [focusedIndex]);

  return (
    <div
      ref={containerRef}
      className="relative flex w-full flex-col gap-4 px-3 sm:px-4 py-4 sm:py-6 flex-1 justify-between"
      data-testid="quick-play-mode-picker"
    >
      {/* Mode cards grid.
          Mobile: 2-column, uniform height, enough height for full-text promises.
          Desktop: 4-column. Classic is 2x2 hero on left. Blast/Hunt stack right. Wheel spans bottom. */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 md:gap-4 flex-1 auto-rows-fr">
        {MODES.map((mode, idx) => {
          const colors = NODE_COLORS[mode];
          const size = CARD_SIZES[mode];
          const isSelected = selection === mode;
          const isPending = pendingMode === mode;
          const isSiblingDimmed = isLoading && !isPending;

          return (
            <button
              key={mode}
              onClick={() => handleModeClick(mode)}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              disabled={isLoading && !isPending}
              aria-current={isSelected}
              aria-label={t(`quickPlay.solo.mode.${mode}`)}
              data-testid={`mode-card-${mode}`}
              className={`
                group relative flex flex-col items-center justify-center gap-2 rounded-neo border-neo-thick border-black transition-all duration-200
                ${size.gridClass}
                p-3 sm:p-4 md:p-5
                ${colors.bg} shadow-hard
                ${isPending ? 'ring-4 ring-white ring-offset-2 ring-offset-black' : ''}
                ${isSiblingDimmed ? 'opacity-50' : 'opacity-100'}
                ${!isLoading ? 'hover:ring-2 hover:ring-white hover:ring-offset-1 hover:ring-offset-black' : ''}
                ${isLoading && !isPending ? 'cursor-not-allowed' : 'cursor-pointer active:shadow-hard-pressed'}
                focus:outline-none focus:ring-4 focus:ring-white focus:ring-offset-2 focus:ring-offset-black
              `}
            >
              {/* Glyph — high contrast (black) on accent fill. Scale with card importance. */}
              <div
                className="transition-transform duration-200 group-active:scale-95 flex-shrink-0"
                style={{ color: 'black' }}
              >
                <ModeGlyph mode={mode} size={size.glyph} />
              </div>

              {/* Mode name and blurb — BOTH BLACK for WCAG contrast.
                  On mobile: full height allows text to breathe; no clamping.
                  On desktop: Classic gets bigger text, others scale down. */}
              <div className="flex flex-col items-center gap-1 px-2 text-center w-full min-w-0">
                <h3
                  className={`
                    font-neo-display font-bold tracking-wide text-black
                    ${size.titleScale}
                  `}
                >
                  {t(`quickPlay.solo.mode.${mode}`)}
                </h3>
                <p
                  className={`
                    font-neo-body font-normal leading-snug text-black
                    ${size.blurbScale}
                    w-full break-words overflow-hidden
                  `}
                >
                  {t(`quickPlay.solo.blurb.${mode}`)}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Random button — clearly secondary affordance, dark theme.
          Positioned at bottom with margin-top auto to use full frame. */}
      <div className="flex justify-center pt-4 sm:pt-5">
        <button
          onClick={handleRandomClick}
          onKeyDown={(e) => handleKeyDown(e, MODES.length)}
          disabled={isLoading}
          aria-label={t('quickPlay.solo.random')}
          data-testid="random-button"
          className={`
            group relative flex flex-col items-center gap-1 rounded-lg border-2 border-black px-6 py-3 transition-all duration-200
            bg-neo-navy-elevated text-neo-cream
            ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-neo-navy-light'}
            active:shadow-hard-pressed focus:outline-none focus:ring-2 focus:ring-neo-cream focus:ring-offset-2 focus:ring-offset-black
            font-neo-display font-semibold text-sm sm:text-base tracking-wide
          `}
        >
          <span>{t('quickPlay.solo.random')}</span>
          <span className="text-xs font-normal text-neo-cream/80">
            {t('quickPlay.solo.blurb.random')}
          </span>
        </button>
      </div>

      {/* Bottom band reservation: reserve space for push notification + AdMob banner
          so they cannot cover the Random button. Matches QuickPlayResults pattern. */}
      <div
        className="h-[calc(5rem+var(--admob-banner-height,0px)+1.5rem)]"
        data-testid="quick-picker-bottom-spacer"
        aria-hidden="true"
      />
    </div>
  );
}
