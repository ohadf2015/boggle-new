'use client';

/**
 * Quick Play Mode Picker — card-based mode selection
 *
 * Four colour-coded keycaps let players choose a mode at a glance. Each carries
 * a one-line promise so first-timers know what they're getting. Random is a
 * secondary bar under the grid, not a fifth peer.
 *
 * Hierarchy is TWO roles, not four. The previous version gave every mode its own
 * glyph size (56/44/40/36), its own title scale and its own blurb scale; four
 * bespoke scales sitting side by side read as a broken layout, not as emphasis.
 * Now: one hero (Classic — the lime "start here" token) plus three sibling cards
 * sharing a single spec, and the hero earns its rank through grid footprint and
 * one responsive step-up at `lg`.
 *
 * Layout: the grid fills whatever height the hub gives it, so the menu never
 * scrolls on a phone.
 * - < lg: 2 columns × 3 rows. Classic spans the top row (the taller one);
 *   Blast | Hunt, then Wheel | Random. Random is a fifth tile, not a bar.
 * - lg+: 4×2. Classic 2×2 hero, the other four 1×1 around it.
 *
 * CRITICAL: All text on accent fills is BLACK (text-black) for WCAG contrast.
 */

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Timer } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { ModeGlyph } from './ModeGlyph';
import { RandomGlyph } from './RandomGlyph';
import { NODE_COLORS } from './modeColors';
import { QUICK_ROUND_SECONDS, type QuickMode } from './types';
import type { WheelSelection } from './wheelGeometry';

const MODES: QuickMode[] = ['classic', 'blast', 'word-hunt', 'wheel-rush'];

/** The one card that outranks the others. Everything else shares SIBLING_SPEC. */
const HERO: QuickMode = 'classic';

const SIBLING_SPEC = {
  glyph: 'h-9 w-9 sm:h-10 sm:w-10',
  title: 'text-base sm:text-lg',
  // Short tiles (small phones) drop the promise rather than clip it.
  blurb: 'text-[11px] leading-snug sm:text-sm line-clamp-3 [@container(max-height:7.5rem)]:hidden',
} as const;

// The hero owns a cell twice as tall as a sibling's, so it needs mass to match:
// at `lg` the same 40px glyph and 18px title left ~180px of empty colour field
// in the middle of the card and it read as unfinished, not as emphasis.
const HERO_SPEC = {
  glyph: `${SIBLING_SPEC.glyph} lg:h-24 lg:w-24`,
  title: `${SIBLING_SPEC.title} lg:text-4xl`,
  blurb: `${SIBLING_SPEC.blurb} lg:text-lg`,
} as const;

const GRID_SPANS: Record<QuickMode, string> = {
  classic: 'col-span-2 lg:col-span-2 lg:row-span-2',
  blast: '',
  'word-hunt': '',
  'wheel-rush': '',
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
  // Scope the label/description ids to this instance — hardcoded ids would make
  // aria-labelledby resolve to the first match in document order if the picker
  // ever mounted twice (or collided with another component's ids).
  const uid = useId();
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

  // Prefers-reduced-motion check
  const prefersReducedMotion =
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;

  return (
    <div
      ref={containerRef}
      className="relative mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col gap-2.5 px-1 sm:gap-3 lg:justify-center lg:gap-5"
      data-testid="quick-play-mode-picker"
    >
      {/* One sticker for all five tiles: every round is the same length. */}
      <div className="flex justify-center">
        <div
          className="inline-flex -rotate-1 items-center gap-1.5 rounded-full border-[3px] border-black bg-neo-yellow px-3 py-1 text-black shadow-hard-sm"
          data-testid="duration-banner"
          id={`${uid}-duration`}
        >
          <Timer className="h-4 w-4" strokeWidth={2.75} aria-hidden="true" />
          <span className="font-neo-display text-sm font-bold sm:text-base">
            {t('quickPlay.solo.durationLabel')} <b className="tabular-nums">{QUICK_ROUND_SECONDS}</b> {t('quickPlay.solo.durationUnit')}
          </span>
        </div>
      </div>

      {/* Both topologies tile exactly: 2×2 below lg, 4×2 at lg+ (hero 2×2,
          two 1×1 siblings on the top-right, Wheel 2×1 across the bottom). */}
      <div className="grid min-h-0 flex-1 grid-cols-2 grid-rows-[minmax(0,1.25fr)_minmax(0,1fr)_minmax(0,1fr)] gap-2.5 sm:gap-3 lg:grid-cols-4 lg:grid-rows-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-4">
        {MODES.map((mode, idx) => {
          const colors = NODE_COLORS[mode];
          const spec = mode === HERO ? HERO_SPEC : SIBLING_SPEC;
          const isSelected = selection === mode;
          const isPending = pendingMode === mode;
          const isSiblingDimmed = isLoading && !isPending;

          // Staggered entrance animation delay
          const animationDelay = prefersReducedMotion ? undefined : idx * 60; // 0ms, 60ms, 120ms, 180ms

          return (
            <button
              key={mode}
              onClick={() => handleModeClick(mode)}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              disabled={isLoading && !isPending}
              aria-current={isSelected}
              // labelledby/describedby, NOT aria-label: an aria-label REPLACES the
              // element's content for assistive tech, so the promise line — the
              // whole reason a first-timer can tell these modes apart — was
              // announced to nobody.
              aria-labelledby={`${uid}-${mode}-name`}
              aria-describedby={`${uid}-${mode}-blurb ${uid}-duration`}
              data-testid={`mode-card-${mode}`}
              style={
                animationDelay !== undefined
                  ? { animationDelay: `${animationDelay}ms` }
                  : undefined
              }
              className={`
                group relative flex min-h-0 min-w-0 flex-col items-start justify-between gap-2 overflow-hidden rounded-neo border-neo-thick border-black text-start transition duration-200 [container-type:size]
                ${mode === HERO ? 'lg:justify-center lg:gap-5' : ''}
                ${GRID_SPANS[mode]}
                p-2.5 sm:p-4 lg:p-5
                ${colors.bg} shadow-hard animate-neo-pop
                ${isPending ? 'ring-4 ring-white ring-offset-2 ring-offset-black' : ''}
                ${isSiblingDimmed ? 'opacity-50' : 'opacity-100'}
                ${!isLoading ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-hard-lg motion-reduce:hover:translate-y-0' : ''}
                ${isLoading && !isPending ? 'cursor-not-allowed' : 'active:translate-y-0 active:shadow-hard-pressed'}
                focus:outline-none focus:ring-4 focus:ring-white focus:ring-offset-2 focus:ring-offset-black
              `}
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -end-6 -top-6 h-28 w-28 rounded-full bg-[radial-gradient(circle,rgba(0,0,0,0.18)_1.5px,transparent_1.6px)] bg-size-[9px_9px]"
              />
              {/* Glyph keycap — the black ink needs an edge to sit against, or it
                  floats as a smudge in the middle of a large colour field. */}
              <span
                className="flex flex-shrink-0 items-center justify-center rounded-[6px] border-2 border-black bg-black/10 p-1.5 text-black transition-transform duration-200 group-active:scale-95"
                aria-hidden="true"
              >
                <ModeGlyph mode={mode} size={40} className={spec.glyph} />
              </span>

              {/* Name + promise — BOTH BLACK for WCAG contrast on the accent fill.
                  The measure cap keeps the hero's line readable when its cell is
                  ~500px wide; without it the promise runs past 100 characters. */}
              <span className="flex min-w-0 flex-col gap-0.5">
                <h3
                  id={`${uid}-${mode}-name`}
                  className={`font-neo-display font-bold tracking-wide text-black ${spec.title}`}
                >
                  {t(`quickPlay.solo.mode.${mode}`)}
                </h3>
                <p
                  id={`${uid}-${mode}-blurb`}
                  className={`font-neo-body font-normal text-black ${spec.blurb} max-w-[38ch] break-words`}
                >
                  {t(`quickPlay.solo.blurb.${mode}`)}
                </p>
              </span>
            </button>
          );
        })}
        {/* Random — the fifth tile, same keycap + name + promise language. */}
        <button
          onClick={handleRandomClick}
          onKeyDown={(e) => handleKeyDown(e, MODES.length)}
          disabled={isLoading}
          aria-labelledby={`${uid}-random-name`}
          aria-describedby={`${uid}-random-blurb`}
          data-testid="random-button"
          className={`
            group relative flex min-h-0 min-w-0 flex-col items-start justify-between gap-2 overflow-hidden rounded-neo border-neo-thick border-black bg-neo-navy-elevated text-start shadow-hard transition duration-200 [container-type:size] p-2.5 sm:p-4 lg:p-5
            ${isLoading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:shadow-hard-lg hover:-translate-y-0.5 motion-reduce:hover:translate-y-0'}
            active:shadow-hard-pressed active:translate-y-0
            focus:outline-none focus:ring-4 focus:ring-white focus:ring-offset-2 focus:ring-offset-black
          `}
        >
          {/* Glyph keycap — matches mode card styling */}
          <span className="flex flex-shrink-0 items-center justify-center rounded-[6px] border-2 border-black bg-neo-white p-1.5 text-black transition-transform duration-200 group-active:scale-95">
            <RandomGlyph size={40} className="h-9 w-9 sm:h-10 sm:w-10" />
          </span>

          {/* Name + promise */}
          <span className="flex min-w-0 flex-col gap-0.5">
            <span id={`${uid}-random-name`} className="font-neo-display font-bold tracking-wide text-neo-cream text-base sm:text-lg">
              {t('quickPlay.solo.random')}
            </span>
            <span id={`${uid}-random-blurb`} className="font-neo-body font-normal text-neo-cream/80 text-[11px] leading-snug sm:text-sm line-clamp-3 [@container(max-height:7.5rem)]:hidden max-w-[38ch] break-words">
              {t('quickPlay.solo.blurb.random')}
            </span>
          </span>
        </button>
      </div>
    </div>
  );
}
