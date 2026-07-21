'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Delete, Shuffle, Lightbulb, ChevronDown, ChevronUp, RotateCw, Coins, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type ApplyResult, type ValidationError } from '@/lib/wordTower/wordTowerManager';
import { useRewardedAd } from '@/hooks/useRewardedAd';
import { canRequestClue, CLUE_RUN_CAP } from '@/lib/wordTower/clueGate';
import { type ActiveRunPerk } from '@/lib/wordTower/useRunStreakPerk';
import { WordTowerWheel } from './WordTowerWheel';

export interface WordTowerHudProps {
  /** @deprecated chain retired — always '' now; kept for prop-shape stability. */
  anchorLetter: string;
  tray: string[];
  selected: number[];
  word: string;
  heightM: number;
  combo: number;
  /** Banked BONUS scrambles (earned from surprises / wreck-compensation). */
  scramblesLeft: number;
  /** Coin price of a fresh wheel once banked bonus scrambles run out. */
  scrambleCost?: number;
  /** Live coin balance — gates the buy-a-scramble path when bonuses are gone. */
  coinBalance?: number;
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
  onScramble: () => void;
  /** Reports the bottom control-deck height (px) so the tower can ground just above it. */
  onDeckHeight?: (px: number) => void;
  /** Active ephemeral run-streak perks (Hot Streak badges above the deck). */
  runPerks?: ActiveRunPerk[];
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
    tray, selected, word, heightM, combo, scramblesLeft, scrambleCost = 0, coinBalance = 0,
    accentHex = '#7c8a99', reducedMotion = false,
    possibleWords, clueWord, onReroll, goldenLetter, lastError, errorKey, lastResult, resultKey,
    pendingWord, gainPreview, onCraneDrop, onCancelPlacement,
    onSelectTile, onDeselectTile, onBackspace, onClear, onSubmit, onScramble, onDeckHeight, runPerks, t, dir,
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

  // Scramble gating (founder 2026-06-26): spend a banked BONUS scramble first;
  // once gone, BUY a spin with coins. Disabled only when neither is available.
  const hasBonusScramble = scramblesLeft > 0;
  const canBuyScramble = scrambleCost > 0 && coinBalance >= scrambleCost;
  const canScramble = hasBonusScramble || canBuyScramble;
  // Scramble is a "need a revenge" tool, not an anytime reroll — only show it
  // once the current wheel has zero buildable words.
  const isStuck = possibleWords === 0;

  // Clue: reveal a sample word on demand; reset when the wheel changes.
  const wheelKey = tray.join('');
  const [clueShown, setClueShown] = useState(false);
  useEffect(() => { setClueShown(false); }, [wheelKey]);
  const maskedClue = clueWord ?? ''; // reveal the FULL word — a masked clue led to wrong last-letter guesses ("not in dictionary")

  // Clue gating: capped at CLUE_RUN_CAP clues per run; every clue (including
  // the first) costs a rewarded ad. The "N words possible" count stays free
  // (it doesn't solve). The used-count is a ref (persists across the
  // per-wheel `clueShown` resets above) mirrored into state so the disabled
  // button re-renders once the cap is hit.
  const cluesUsedRef = useRef(0);
  const [cluesUsed, setCluesUsed] = useState(0);
  const needsAd = !clueShown;
  const capReached = !canRequestClue(cluesUsed);
  const revealClue = useCallback(() => {
    cluesUsedRef.current += 1;
    setCluesUsed(cluesUsedRef.current);
    setClueShown(true);
  }, []);
  const clueAd = useRewardedAd({
    surface: 'hint',
    rewardKind: 'feature',
    onRewardEarned: revealClue,
    onAdError: revealClue, // web / no fill → still reveal (never punish non-native)
  });
  const requestClue = useCallback(() => {
    if (!canRequestClue(cluesUsedRef.current)) return;
    clueAd.showAd();
  }, [clueAd]);
  const clueBusy = clueAd.status === 'loading' || clueAd.status === 'showing';

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

      {/* Hot Streak badges — ephemeral run perks earned at height milestones.
          Kept small and quiet so they read as ambient status, not extra HUD noise. */}
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

      {/* Bottom controls — a solid "control deck" that grounds the rack and
          caps the play area (hides the busy parallax behind a clean surface).
          While placing, the deck tints lime to read as ARMED. */}
      <div
        ref={deckRef}
        className={cn(
          'pointer-events-auto relative space-y-1 rounded-t-neo border-t-neo-thick border-black px-4 pt-0.5 shadow-[0_-3px_0_rgba(0,0,0,0.5)] backdrop-blur-md transition-colors duration-200',
          isPlacing
            ? 'bg-gradient-to-b from-neo-lime/15 via-neo-navy/95 to-neo-navy/95'
            : 'bg-neo-navy/95',
          // Keep the bottom controls clear of the screen edge / home-indicator so
          // they're comfortable to tap (open), and float the grab handle well
          // above the edge when collapsed so re-opening the drawer never grazes
          // the system back-gesture zone and exits the game.
          deckOpen
            ? 'pb-[calc(env(safe-area-inset-bottom)+1.65rem)]'
            : 'pb-[calc(env(safe-area-inset-bottom)+1.6rem)]',
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
          className={cn(
            'mx-auto flex w-full touch-none flex-col items-center justify-center gap-0.5',
            // Collapsed: a fat, easy-to-grab handle so a single tap brings the
            // drawer back without hunting for a thin sliver at the screen edge.
            deckOpen ? 'py-0.5' : 'py-3',
          )}
        >
          <span className={cn('rounded-full bg-neo-white/40', deckOpen ? 'h-1.5 w-12' : 'h-2 w-16')} />
          {deckOpen
            ? <ChevronDown className="h-3 w-3 text-neo-white/40" />
            : <ChevronUp className="h-5 w-5 text-neo-white/60" />}
        </button>
        {deckOpen && (
        <div className="space-y-0.5">
        {/* Rejection feedback — the wheel's centre hub shows the live word, so the
            old framed builder slot is gone; the error line stays. */}
        {lastError && errorKey > 0 && (
          <p key={`err-${errorKey}`} className="text-center font-neo-body text-sm font-bold text-neo-red">
            {t(`wordTower.error.${lastError}`)}
          </p>
        )}

        {/* Hint — pinned to the deck's top-end corner as a single icon (absolute,
            so it never costs a row of deck height). Tap to reveal a sample word;
            the buildable-word count rides as a small badge. With NO buildable
            words it flips to a one-tap reroll. */}
        {possibleWords != null && (
          <div className="absolute end-3 top-1.5 z-10 flex flex-col items-end gap-1" dir={dir}>
            {possibleWords === 0 && onReroll ? (
              <button
                type="button"
                onClick={onReroll}
                aria-label={t('wordTower.hud.stuck')}
                title={t('wordTower.hud.stuck')}
                className="flex h-9 w-9 items-center justify-center rounded-full border-neo border-black bg-neo-orange text-black shadow-hard-sm transition-transform active:translate-y-0.5"
              >
                <RotateCw className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={requestClue}
                disabled={!clueWord || clueShown || clueBusy || capReached}
                aria-label={t('wordTower.hud.cluesLeft', { n: CLUE_RUN_CAP - cluesUsed })}
                title={t('wordTower.hud.clue')}
                className="relative flex h-9 w-9 items-center justify-center rounded-full border-neo border-black bg-neo-navy-light/70 text-neo-cyan shadow-hard-sm transition-transform active:translate-y-0.5 disabled:opacity-60"
              >
                <Lightbulb className="h-4 w-4" />
                {/* Badge shows clues the PLAYER has left this run, not how many
                    buildable words exist in the dictionary (founder: the old
                    possibleWords count read as a clue tally and confused players). */}
                {CLUE_RUN_CAP - cluesUsed > 0 && (
                  <span className="absolute -end-1.5 -top-1.5 min-w-[1.1rem] rounded-full border border-black bg-neo-cyan px-1 text-center font-neo-body text-[10px] font-black leading-4 text-black tabular-nums">
                    {CLUE_RUN_CAP - cluesUsed}
                  </span>
                )}
                {/* Every clue costs a rewarded ad (capped at CLUE_RUN_CAP/run) — a
                    small 📺 marks the button so the cost is obvious. */}
                {needsAd && !capReached && (
                  <span className="absolute -bottom-1.5 -start-1.5 text-[10px] leading-none">📺</span>
                )}
              </button>
            )}
            {clueShown && maskedClue && (
              <span className="rounded-neo border-neo border-black bg-neo-navy px-2 py-0.5 font-neo-display text-sm tracking-[0.25em] text-neo-yellow shadow-hard">
                {maskedClue}
              </span>
            )}
          </div>
        )}

        {/* Builder row — the WHEEL centered, flanked by SYMMETRIC tool slots.
            Each side reserves an equal fixed-width column that is ALWAYS in flow
            (even when its tool is hidden), so the wheel sits in the grid's centre
            column and stays screen-centered regardless of which flanking tools
            are visible OR the writing direction. The previous `flex` layout put
            the wheel in a `flex-1` region flanked by only the single always-on
            trailing tool — that one-sided offset pulled the wheel off-centre, and
            under RTL it flipped to the visual right edge (the reported bug). A
            grid with equal side tracks makes centring direction-agnostic: `mx-auto`
            on the wheel alone can't, because the flanks eat unequal space. The
            BUILD / DROP CTA still lives in the wheel's centre hub; tools are
            disabled while a word is in flight. */}
        <div
          data-testid="wt-builder-row"
          className="mx-auto grid max-w-md grid-cols-[3.5rem_1fr_3.5rem] items-center gap-3"
        >
          {/* Start slot — scramble (only when stuck); the column is reserved
              either way so its presence/absence never shifts the wheel. */}
          <div data-testid="wt-tool-slot-start" className="flex justify-center">
            {isStuck && (
              <button
                type="button"
                onClick={onScramble}
                disabled={!canScramble || isPlacing}
                className="flex shrink-0 flex-col items-center gap-0.5 rounded-neo border-neo-thick border-black bg-neo-purple px-2.5 py-2 font-neo-display text-[10px] font-bold uppercase tracking-wide text-neo-white shadow-hard disabled:opacity-40 active:translate-y-0.5 active:shadow-hard-pressed"
                aria-label={t('wordTower.hud.scramble')}
              >
                <Shuffle className="h-5 w-5" />
                {hasBonusScramble ? (
                  // Free bonus scramble in the bank — show how many remain.
                  <span className="tabular-nums">{scramblesLeft}</span>
                ) : (
                  // Out of bonuses → the coin price to buy a fresh wheel.
                  <span className="flex items-center gap-0.5 tabular-nums">
                    <Coins className="h-3 w-3" aria-hidden />{scrambleCost}
                  </span>
                )}
              </button>
            )}
          </div>
          {/* Wheel — the grid's centre column keeps it strictly screen-centered
              in both LTR and RTL, whatever tools flank it. */}
          <div className={cn('w-full transition-[filter] duration-300', lastError && errorKey > 0 && 'animate-neo-shake')}>
            <WordTowerWheel
              tray={tray}
              selected={selected}
              word={word}
              placing={isPlacing}
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
              BUILDING (bail back to the wheel with the spell path intact so the
              player can add/remove letters instead of being forced to drop the
              word the auto-hand-off grabbed, founder ask 2026-07-17); otherwise
              it's the backspace tool. */}
          <div data-testid="wt-tool-slot-end" className="flex justify-center">
            {isPlacing ? (
              <button
                type="button"
                onClick={onCancelPlacement}
                className="flex shrink-0 flex-col items-center gap-0.5 rounded-neo border-neo-thick border-black bg-neo-cyan px-2.5 py-2 font-neo-display text-[10px] font-bold uppercase tracking-wide text-black shadow-hard active:translate-y-0.5 active:shadow-hard-pressed"
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
                className="flex shrink-0 flex-col items-center gap-0.5 rounded-neo border-neo-thick border-black bg-neo-navy-light px-2.5 py-2 font-neo-display text-[10px] font-bold uppercase tracking-wide text-neo-white shadow-hard disabled:opacity-40 active:translate-y-0.5 active:shadow-hard-pressed"
                aria-label={t('wordTower.hud.backspace')}
              >
                <Delete className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
        </div>
        )}
      </div>
    </div>
  );
}
