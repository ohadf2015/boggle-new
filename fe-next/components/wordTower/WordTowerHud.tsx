'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Delete, Shuffle, Lightbulb, ChevronDown, ChevronUp, RotateCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type ApplyResult, type ValidationError } from '@/lib/wordTower/wordTowerManager';
import { WordTowerWheel } from './WordTowerWheel';

export interface WordTowerHudProps {
  /** @deprecated chain retired — always '' now; kept for prop-shape stability. */
  anchorLetter: string;
  tray: string[];
  selected: number[];
  word: string;
  heightM: number;
  combo: number;
  scramblesLeft: number;
  /** Tower material colour (CSS hex) — tints the wheel's ring glow + spell path. */
  accentHex?: string;
  reducedMotion?: boolean;
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
    tray, selected, word, heightM, combo, scramblesLeft,
    accentHex = '#7c8a99', reducedMotion = false,
    possibleWords, clueWord, onReroll, goldenLetter, lastError, errorKey, lastResult, resultKey,
    pendingWord, onCraneDrop,
    onSelectTile, onBackspace, onClear, onSubmit, onScramble, onDeckHeight, t, dir,
  } = props;
  void onClear;

  const canSubmit = word.length >= 3;
  // Climb intensity (0..1) — feeds the wheel a "more satisfying the higher you
  // go" glow + spark density. Saturates near the top biome.
  const intensity = Math.min(1, heightM / 800);
  // When a word is in flight (post-BUILD, pre-DROP) the deck flips into "armed"
  // mode: tray + edit buttons lock, the CTA becomes a one-tap DROP — keeps the
  // player's finger pinned to the same spot.
  const isPlacing = !!pendingWord;

  // Clue: reveal a masked sample word on demand; reset when the wheel changes.
  const wheelKey = tray.join('');
  const [clueShown, setClueShown] = useState(false);
  useEffect(() => { setClueShown(false); }, [wheelKey]);
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
          'pointer-events-auto space-y-1 rounded-t-neo border-t-neo-thick border-black px-4 pt-0.5 shadow-[0_-3px_0_rgba(0,0,0,0.5)] backdrop-blur-md transition-colors duration-200',
          isPlacing
            ? 'bg-gradient-to-b from-neo-lime/15 via-neo-navy/95 to-neo-navy/95'
            : 'bg-neo-navy/95',
          deckOpen
            ? 'pb-[calc(env(safe-area-inset-bottom)+0.55rem)]'
            : 'pb-[calc(env(safe-area-inset-bottom)+0.4rem)]',
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
          className="mx-auto flex w-full touch-none flex-col items-center justify-center gap-0.5 py-0.5"
        >
          <span className="h-1.5 w-12 rounded-full bg-neo-white/40" />
          {deckOpen
            ? <ChevronDown className="h-3 w-3 text-neo-white/40" />
            : <ChevronUp className="h-3 w-3 text-neo-white/40" />}
        </button>
        {deckOpen && (
        <div className="space-y-1">
        {/* Rejection feedback — the wheel's centre hub shows the live word, so the
            old framed builder slot is gone; the error line stays. */}
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

        {/* The word WHEEL — spell by dragging a path (or tapping); it morphs into
            the crane steering dial once a word is held for placement. */}
        <div className={cn('transition-[filter] duration-300', lastError && errorKey > 0 && 'animate-neo-shake')}>
          <WordTowerWheel
            tray={tray}
            selected={selected}
            word={word}
            placing={isPlacing}
            canBuild={canSubmit}
            intensity={intensity}
            accentHex={accentHex}
            goldenLetter={goldenLetter}
            reducedMotion={reducedMotion}
            dir={dir}
            t={t}
            onSelectTile={onSelectTile}
            onSubmit={onSubmit}
            onDrop={() => onCraneDrop?.()}
          />
        </div>

        {/* Actions — only the two tray TOOLS live here now. The BUILD / DROP CTA
            moved INTO the wheel's centre hub (build a word → tap the centre to
            lift it → tap again to drop), so the redundant bottom build button is
            gone and the deck is shorter. Disabled while a word is in flight. */}
        <div className="mx-auto flex max-w-md items-center justify-center gap-3">
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
        </div>
        </div>
        )}
      </div>
    </div>
  );
}
