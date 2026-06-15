'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Delete, Shuffle, ArrowUp, Lightbulb, ChevronDown, ChevronUp, RotateCw, ChevronsDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type ApplyResult, type ValidationError } from '@/lib/wordTower/wordTowerManager';

export interface WordTowerHudProps {
  anchorLetter: string;
  tray: string[];
  selected: number[];
  word: string;
  heightM: number;
  combo: number;
  scramblesLeft: number;
  /** How many dictionary words are buildable from the current anchor + tray. */
  possibleWords?: number | null;
  /** A sample buildable word for the clue reveal (canonical form). */
  clueWord?: string | null;
  /** Re-anchor to a fresh viable letter when the chain dead-ends. */
  onReroll?: () => void;
  /** Daily "golden letter" mutator — tray tiles of this letter score extra and glow. */
  goldenLetter?: string;
  lastError: ValidationError | null;
  errorKey: number;
  lastResult: ApplyResult | null;
  resultKey: number;
  /** Word being placed (set after BUILD, cleared on commitPlacement). When
   *  truthy the BUILD CTA flips to a DROP CTA at the SAME screen position so
   *  the player's thumb never has to chase the crane. */
  pendingWord?: string | null;
  /** Triggered by the swapped-in DROP CTA — wires through to the crane's
   *  imperative `drop()`. */
  onCraneDrop?: () => void;
  onSelectTile: (i: number) => void;
  onBackspace: () => void;
  onClear: () => void;
  onSubmit: () => void;
  onScramble: () => void;
  /** Reports the bottom control-deck height (px) so the tower can ground just above it. */
  onDeckHeight?: (px: number) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  dir: 'ltr' | 'rtl';
}

/** How long the reward popup stays before it fades away (matches the
 *  wt-reward-pop keyframe's full run so the unmount lands after the fade). */

const TIER_KEY: Record<NonNullable<ApplyResult['tier']>, string> = {
  none: '',
  highRise: 'wordTower.celebration.highRise',
  tall: 'wordTower.celebration.tall',
  skyscraper: 'wordTower.celebration.skyscraper',
};

export function WordTowerHud(props: WordTowerHudProps) {
  const {
    anchorLetter, tray, selected, word, heightM, combo, scramblesLeft,
    possibleWords, clueWord, onReroll, goldenLetter, lastError, errorKey, lastResult, resultKey,
    pendingWord, onCraneDrop,
    onSelectTile, onBackspace, onClear, onSubmit, onScramble, onDeckHeight, t,
  } = props;
  void onClear;

  const canSubmit = word.length >= 3;
  // When a word is in flight (post-BUILD, pre-DROP) the deck flips into "armed"
  // mode: tray + edit buttons lock, the CTA becomes a one-tap DROP — keeps the
  // player's finger pinned to the same spot.
  const isPlacing = !!pendingWord;

  // Clue: reveal a masked sample word on demand; reset when the anchor changes.
  const [clueShown, setClueShown] = useState(false);
  useEffect(() => { setClueShown(false); }, [anchorLetter]);
  const maskedClue = clueWord ?? ''; // reveal the FULL word — a masked clue led to wrong last-letter guesses ("not in dictionary")

  // Mobile drawer: the deck collapses to a peek bar to free the screen for the tower.
  const [deckOpen, setDeckOpen] = useState(true);

  // Measure the control deck so the Pixi tower can ground exactly on top of it.
  const deckRef = useRef<HTMLDivElement>(null);
  const swipeStartY = useRef<number | null>(null);
  useEffect(() => {
    const el = deckRef.current;
    if (!el || !onDeckHeight) return;
    const report = () => onDeckHeight(el.offsetHeight);
    report();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(report);
    ro.observe(el);
    return () => ro.disconnect();
  }, [onDeckHeight]);

  const liveText = useMemo(() => {
    if (resultKey > 0 && lastResult) {
      const tier = lastResult.tier !== 'none' ? t(TIER_KEY[lastResult.tier]) + ' ' : '';
      return `${tier}${t('wordTower.a11y.height', { m: heightM.toFixed(0) })}${combo > 1 ? ' ' + t('wordTower.a11y.combo', { n: combo }) : ''}`;
    }
    return '';
  }, [resultKey, lastResult, heightM, combo, t]);

  // justify-END (not -between): the altitude readout moved to the header, so the
  // deck is the only in-flow child (the sr-only live region is position:absolute)
  // — pin it to the bottom of the screen.
  return (
    <div className="pointer-events-none relative flex h-full flex-col justify-end">
      {/* The floating "+X.X m / SKYSCRAPER" reward pop was REMOVED here — it
          duplicated the centre drop-verdict (which now carries both the tier
          celebration kicker AND the metres gained), so two near-identical pops
          stacked on every drop. One consolidated verdict reads far cleaner. */}
      {/* Altitude readout now lives in the top-bar's centre column (see
          WordTowerStatHud in WordTowerPlay) so it can never sit behind the back
          button. This deck owns only the builder + controls. */}

      {/* Screen-reader live announcements */}
      <div aria-live="polite" className="sr-only">{liveText}</div>

      {/* Bottom controls — a solid "control deck" that grounds the rack and
          caps the play area (hides the busy parallax behind a clean surface).
          While placing, the deck tints lime to read as ARMED. */}
      <div
        ref={deckRef}
        className={cn(
          'pointer-events-auto space-y-2 rounded-t-neo border-t-neo-thick border-black px-4 pt-1.5 shadow-[0_-3px_0_rgba(0,0,0,0.5)] backdrop-blur-md transition-colors duration-200',
          isPlacing
            ? 'bg-gradient-to-b from-neo-lime/15 via-neo-navy/95 to-neo-navy/95'
            : 'bg-neo-navy/95',
          deckOpen
            ? 'pb-[calc(env(safe-area-inset-bottom)+1.5rem)]'
            : 'pb-[calc(env(safe-area-inset-bottom)+0.5rem)]',
        )}
      >
        {/* Drawer grip — collapse the deck to free the screen for the tower. */}
        <button
          type="button"
          onPointerDown={(e) => { swipeStartY.current = e.clientY; }}
          onPointerUp={(e) => {
            const start = swipeStartY.current;
            swipeStartY.current = null;
            const dy = start == null ? 0 : e.clientY - start;
            if (Math.abs(dy) < 16) setDeckOpen((o) => !o); // tap toggles
            else setDeckOpen(dy < 0); // swipe up = expand, down = collapse
          }}
          aria-label={t(deckOpen ? 'wordTower.hud.collapse' : 'wordTower.hud.expand')}
          className="mx-auto flex w-full touch-none flex-col items-center justify-center gap-0.5 py-1.5"
        >
          <span className="h-1.5 w-12 rounded-full bg-neo-white/40" />
          {deckOpen
            ? <ChevronDown className="h-3 w-3 text-neo-white/40" />
            : <ChevronUp className="h-3 w-3 text-neo-white/40" />}
        </button>
        {deckOpen && (
        <div className="space-y-1.5">
        {/* Word builder — framed slot so the anchor + selected letters read as
            a "preview viewfinder" rather than free-floating tiles. */}
        <div
          key={`builder-${errorKey}`}
          className={cn(
            'mx-auto flex min-h-[44px] max-w-md items-center justify-center gap-1 rounded-neo border-neo border-black bg-neo-navy-light/60 px-3 py-1.5 shadow-hard-sm',
            lastError && errorKey > 0 && 'animate-neo-shake border-neo-red',
          )}
        >
          {Array.from(anchorLetter).map((ch, k) => (
            <Tile key={`anchor-${k}`} letter={ch} variant="anchor" />
          ))}
          {selected.map((idx, k) => (
            <Tile key={`${idx}-${k}`} letter={tray[idx] ?? ''} variant="selected" />
          ))}
          {selected.length === 0 && (
            <span className="font-neo-body text-[11px] font-bold uppercase tracking-[0.2em] text-neo-white/40">
              {t('wordTower.hud.pickLetters')}
            </span>
          )}
        </div>
        {lastError && errorKey > 0 && (
          <p key={`err-${errorKey}`} className="text-center font-neo-body text-sm font-bold text-neo-red">
            {t(`wordTower.error.${lastError}`)}
          </p>
        )}

        {/* "N words possible" + tap-for-clue (reveals a masked sample word). */}
        {possibleWords != null && (
          <div className="flex justify-center">
            {possibleWords === 0 && onReroll ? (
              <button
                type="button"
                onClick={onReroll}
                className="inline-flex items-center gap-1 rounded-neo border-neo border-black bg-neo-orange px-2.5 py-0.5 font-neo-body text-[11px] font-bold text-black transition-transform active:translate-y-0.5"
              >
                <RotateCw className="h-3 w-3" />
                {t('wordTower.hud.stuck')}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setClueShown(true)}
                disabled={!clueWord || clueShown}
                aria-label={t('wordTower.hud.clue')}
                className="inline-flex items-center gap-1.5 rounded-full border border-black/60 bg-neo-navy-light/60 px-2 py-0.5 font-neo-body text-[10px] font-bold uppercase tracking-wider text-neo-cyan/90 transition-transform active:translate-y-0.5 disabled:opacity-60"
              >
                <Lightbulb className="h-3 w-3" />
                {t('wordTower.hud.possible', { n: possibleWords })}
                {clueShown && maskedClue && (
                  <span className="ms-1 font-neo-display tracking-[0.25em] text-neo-yellow">{maskedClue}</span>
                )}
              </button>
            )}
          </div>
        )}

        {/* Tray — dimmed + non-interactive while placing */}
        <div
          className={cn(
            'mx-auto grid max-w-md grid-cols-6 gap-1 transition-opacity',
            isPlacing && 'opacity-30',
          )}
          aria-disabled={isPlacing}
        >
          {tray.map((letter, i) => {
            const isSel = selected.includes(i);
            // Golden-letter day: this tile climbs extra — ring it gold so the
            // player spots the high-value tiles at a glance.
            const isGolden = !!goldenLetter && letter.toUpperCase() === goldenLetter.toUpperCase();
            return (
              <button
                key={i}
                type="button"
                disabled={isSel || isPlacing}
                onClick={() => onSelectTile(i)}
                aria-label={t(isGolden ? 'wordTower.a11y.goldenTile' : 'wordTower.a11y.tile', { letter })}
                className={cn(
                  'relative flex aspect-square min-h-[36px] items-center justify-center rounded-neo border-neo-thick border-black font-neo-display text-lg font-bold shadow-hard transition-transform active:translate-y-0.5 active:shadow-hard-pressed',
                  isSel
                    ? 'bg-neo-navy-light text-neo-white/30'
                    : isGolden
                      ? 'bg-gradient-to-b from-neo-yellow to-neo-orange text-black hover:-translate-y-0.5 ring-2 ring-neo-yellow ring-offset-1 ring-offset-black'
                      : 'bg-gradient-to-b from-neo-lime-light to-neo-lime text-black hover:-translate-y-0.5',
                )}
              >
                {isGolden && !isSel && <span aria-hidden className="absolute -top-1.5 -right-1.5 text-[11px]">🌟</span>}
                {letter}
              </button>
            );
          })}
        </div>

        {/* Actions */}
        <div className="mx-auto flex max-w-md items-center gap-2">
          <button
            type="button"
            onClick={onScramble}
            disabled={scramblesLeft <= 0 || isPlacing}
            className="flex items-center gap-1 rounded-neo border-neo-thick border-black bg-neo-purple px-3 py-2 font-neo-display font-bold text-neo-white shadow-hard disabled:opacity-40 active:translate-y-0.5 active:shadow-hard-pressed"
            aria-label={t('wordTower.hud.scramble')}
          >
            <Shuffle className="h-5 w-5" />
            <span className="tabular-nums">{scramblesLeft}</span>
          </button>
          <button
            type="button"
            onClick={onBackspace}
            disabled={selected.length === 0 || isPlacing}
            className="rounded-neo border-neo-thick border-black bg-neo-navy-light px-3 py-2.5 text-neo-white shadow-hard disabled:opacity-40 active:translate-y-0.5 active:shadow-hard-pressed"
            aria-label={t('wordTower.hud.backspace')}
          >
            <Delete className="h-5 w-5" />
          </button>
          {/* Primary CTA — Build flips to Drop in-place when a word is in flight */}
          {isPlacing ? (
            <button
              type="button"
              onClick={onCraneDrop}
              aria-label={t('wordTower.crane.tapToDrop')}
              className="relative flex flex-1 items-center justify-center gap-2 overflow-hidden rounded-neo border-neo-thick border-black bg-gradient-to-b from-neo-lime-light to-neo-lime py-3 font-neo-display text-lg font-black uppercase tracking-wide text-black shadow-hard animate-neo-pop active:translate-y-0.5 active:shadow-hard-pressed"
            >
              <ChevronsDown className="h-5 w-5 animate-bounce" />
              {t('wordTower.crane.tapToDrop')}
              <ChevronsDown className="h-5 w-5 animate-bounce" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onSubmit}
              disabled={!canSubmit}
              className={cn(
                'flex flex-1 items-center justify-center gap-2 rounded-neo border-neo-thick border-black py-2.5 font-neo-display text-lg font-bold text-black shadow-hard disabled:opacity-40 active:translate-y-0.5 active:shadow-hard-pressed',
                canSubmit
                  ? 'bg-gradient-to-b from-neo-cyan-light to-neo-cyan ring-2 ring-neo-cyan/40 ring-offset-2 ring-offset-neo-navy'
                  : 'bg-neo-cyan',
              )}
            >
              <ArrowUp className="h-5 w-5" />
              {t('wordTower.hud.build')}
            </button>
          )}
        </div>
        </div>
        )}
      </div>
    </div>
  );
}

function Tile({ letter, variant }: { letter: string; variant: 'anchor' | 'selected' }) {
  return (
    <span
      className={`flex h-8 w-8 items-center justify-center rounded-neo border-neo-thick border-black font-neo-display text-lg font-bold shadow-hard ${
        variant === 'anchor'
          ? 'bg-neo-yellow text-black ring-2 ring-neo-yellow ring-offset-2 ring-offset-neo-navy'
          : 'bg-neo-cyan text-black'
      }`}
    >
      {letter}
    </span>
  );
}
