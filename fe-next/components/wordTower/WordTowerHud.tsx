'use client';

import { useEffect, useMemo, useRef } from 'react';
import { Delete, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type ApplyResult, type ValidationError } from '@/lib/wordTower/wordTowerManager';
import { type ActiveRunPerk } from '@/lib/wordTower/useRunStreakPerk';
import { WordTowerWheel } from './WordTowerWheel';
import type { PlacementQuality } from '@/lib/wordTower/cranePlacement';

export interface WordTowerHudProps {
  /** @deprecated chain retired — always '' now; kept for prop-shape stability. */
  anchorLetter: string;
  tray: string[];
  selected: number[];
  word: string;
  heightM: number;
  combo: number;
  /** Tower material colour (CSS hex) — tints the wheel's ring glow + spell path. */
  accentHex?: string;
  reducedMotion?: boolean;
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
  /** The band the crane's aim would currently score, mirrored onto the DROP hub
   *  so the shot can be timed from the bottom of the screen. `null` = not aiming. */
  aimBand?: PlacementQuality | null;
  /** Pre-formatted height reward ("+3m") for the current word — shown on the
   *  wheel's BUILD hub so the payoff is visible before committing. */
  gainPreview?: string;
  /** Triggered by the swapped-in DROP CTA — wires through to the crane's
   *  imperative `drop()`. */
  onCraneDrop?: () => void;
  /** Bail out of the crane hand-off back to the word builder, KEEPING the spell
   *  path intact so the player can continue building the same word. */
  onCancelPlacement?: () => void;
  onSelectTile: (i: number) => void;
  /** Tap an already-selected wheel tile to unselect it. */
  onDeselectTile?: (i: number) => void;
  onBackspace: () => void;
  onClear: () => void;
  onSubmit: () => void;
  /** Reports the builder's height (px) so the tower can ground just above it. */
  onDeckHeight?: (px: number) => void;
  /** Active ephemeral run-streak perks (Hot Streak badges above the wheel). */
  runPerks?: ActiveRunPerk[];
  t: (key: string, params?: Record<string, string | number>) => string;
  dir: 'ltr' | 'rtl';
}

const TIER_KEY: Record<NonNullable<ApplyResult['tier']>, string> = {
  none: '',
  highRise: 'wordTower.celebration.highRise',
  tall: 'wordTower.celebration.tall',
  skyscraper: 'wordTower.celebration.skyscraper',
};

/**
 * The BUILDER: the wheel, and nothing else that can be helped.
 *
 * The old "control deck" was a solid navy panel with a drag-to-collapse drawer,
 * a clue button, a scramble button and the wheel inside it — a slab of chrome
 * across the bottom third of a game whose whole appeal is watching a tower grow.
 * Founder 2026-08-14: "maybe we don't need drawer, we just need that the wheel
 * itself will have nice bg and the rest can be without bg and transparent."
 *
 * So: the panel and the drawer are gone, the tools moved to the top bar
 * ({@link WordTowerToolbar}), and the wheel carries its own dark disc. Two
 * things the deleted panel used to own had to move onto the builder wrapper
 * rather than vanish with it:
 *
 *  1. `onDeckHeight` — the Pixi tower grounds exactly on top of this measurement.
 *  2. The `env(safe-area-inset-bottom)` + `--admob-banner-height` clearance.
 *     Native AdMob banners COMPOSITE ABOVE the WebView, so without that reserved
 *     band the wheel's bottom letters sit under the banner on Android (and the
 *     tower grounds into it) — invisible in any web-only QA pass.
 */
export function WordTowerHud(props: WordTowerHudProps) {
  const {
    tray, selected, word, heightM, combo,
    accentHex = '#7c8a99', reducedMotion = false,
    goldenLetter, lastError, errorKey, lastResult, resultKey,
    pendingWord, aimBand, gainPreview, onCraneDrop, onCancelPlacement,
    onSelectTile, onDeselectTile, onBackspace, onClear, onSubmit, onDeckHeight, runPerks, t, dir,
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

  // Measure the builder so the Pixi tower can ground exactly on top of it.
  const deckRef = useRef<HTMLDivElement>(null);
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

  return (
    <div className="pointer-events-none relative flex h-full flex-col justify-end">
      {/* Screen-reader live announcements */}
      <div aria-live="polite" className="sr-only">{liveText}</div>

      {/* Hot Streak badges — ephemeral run perks earned at height milestones. */}
      {runPerks && runPerks.length > 0 && (
        <div className="pointer-events-none mb-1 flex items-end justify-center gap-1.5 px-4">
          {runPerks.map((pk, i) => (
            <div
              key={`${pk.id}-${i}`}
              role="status"
              aria-label={t('wordTower.runPerk.hotStreak.a11y', { n: pk.dropsRemaining })}
              className="flex items-center gap-1 rounded-full border border-black bg-neo-orange px-2 py-0.5 font-neo-body text-[10px] font-black text-black shadow-hard-sm"
            >
              <span aria-hidden>🔥</span>
              <span>+{Math.round((pk.heightMult - 1) * 100)}%</span>
              <span className="rounded-full bg-black/20 px-1 tabular-nums">×{pk.dropsRemaining}</span>
            </div>
          ))}
        </div>
      )}

      {/* Builder — TRANSPARENT: no panel, no border, no backdrop. The wheel draws
          its own disc so the tower and its parallax stay visible right down to
          the bottom edge. Bottom clearance still reserved here (see the note on
          the component): safe-area + AdMob band + a tap gap. */}
      <div
        ref={deckRef}
        data-testid="wt-control-deck"
        className="pointer-events-none relative space-y-1 px-4 pb-[calc(env(safe-area-inset-bottom)+var(--admob-banner-height,0px)+1.35rem)]"
      >
        {/* Rejection feedback — the wheel's centre hub shows the live word, so the
            old framed builder slot is gone; the error line stays. */}
        {lastError && errorKey > 0 && (
          <p
            key={`err-${errorKey}`}
            className="mx-auto w-fit rounded-neo border-neo border-black bg-neo-navy/90 px-2 py-0.5 text-center font-neo-body text-sm font-bold text-neo-red shadow-hard-sm"
          >
            {t(`wordTower.error.${lastError}`)}
          </p>
        )}

        {/* Builder row — the WHEEL centered, flanked by SYMMETRIC tool slots.
            Each side reserves an equal fixed-width column that is ALWAYS in flow,
            so the wheel sits in the grid's centre column and stays screen-centered
            regardless of writing direction (`mx-auto` on the wheel alone can't:
            unequal flanks eat unequal space, which is what threw the wheel to the
            right edge under RTL). The BUILD / DROP CTA lives in the wheel's hub. */}
        <div
          data-testid="wt-builder-row"
          className="mx-auto grid max-w-md grid-cols-[3.5rem_1fr_3.5rem] items-center gap-3"
        >
          {/* Start slot — reserved for symmetry; the tools live in the top bar now. */}
          <div data-testid="wt-tool-slot-start" aria-hidden />

          <div className={cn('pointer-events-auto w-full transition-[filter] duration-300', lastError && errorKey > 0 && 'animate-neo-shake')}>
            <WordTowerWheel
              tray={tray}
              selected={selected}
              word={word}
              placing={isPlacing}
              aimBand={aimBand}
              canBuild={canSubmit}
              gainPreview={gainPreview}
              intensity={intensity}
              accentHex={accentHex}
              goldenLetter={goldenLetter}
              reducedMotion={reducedMotion}
              dir={dir}
              t={t}
              onSelectTile={onSelectTile}
              onDeselectTile={onDeselectTile}
              onSubmit={onSubmit}
              onDrop={() => onCraneDrop?.()}
            />
          </div>

          {/* End slot — while a word is armed on the crane this flips to KEEP
              BUILDING (bail back to the wheel with the spell path intact instead
              of being forced to drop what the auto-hand-off grabbed); otherwise
              it's backspace. Round + borderless-background so it reads as a
              floating control, not the last survivor of the old deck. */}
          <div data-testid="wt-tool-slot-end" className="pointer-events-auto flex justify-center">
            {isPlacing ? (
              <button
                type="button"
                onClick={onCancelPlacement}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-neo-thick border-black bg-neo-cyan text-black shadow-hard active:translate-y-0.5 active:shadow-hard-pressed"
                aria-label={t('wordTower.hud.keepBuilding')}
                title={t('wordTower.hud.keepBuilding')}
              >
                <Pencil className="h-5 w-5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onBackspace}
                disabled={selected.length === 0}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-neo-thick border-black bg-neo-navy/95 text-neo-white shadow-hard disabled:opacity-30 active:translate-y-0.5 active:shadow-hard-pressed"
                aria-label={t('wordTower.hud.backspace')}
              >
                <Delete className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
