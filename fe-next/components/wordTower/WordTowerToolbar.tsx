'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Coins, Lightbulb, RotateCw, Shuffle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRewardedAd } from '@/hooks/useRewardedAd';
import { CLUE_RUN_CAP, canRequestClue } from '@/lib/wordTower/clueGate';

export interface WordTowerToolbarProps {
  /** How many dictionary words the current wheel can still build. 0 = stuck. */
  possibleWords: number | null;
  /** Nth clue for the current wheel (0-based). Rotates so clue #2 differs from #1. */
  getClue: (skip: number) => string | null;
  /** Banked BONUS scrambles (earned from surprises / wreck compensation). */
  scramblesLeft: number;
  /** Coin price of a fresh wheel once banked bonus scrambles run out. */
  scrambleCost?: number;
  coinBalance?: number;
  onScramble: () => void;
  /** Free soft-lock escape: re-spin to a wheel that HAS buildable words. */
  onReroll?: () => void;
  /** Changes whenever the wheel does — drops the revealed clue + rotation. */
  wheelKey?: string;
  /** True while a word is in flight on the crane — tools lock so the player
   *  can't reroll the letters out from under an armed drop. */
  disabled?: boolean;
  t: (key: string, params?: Record<string, string | number>) => string;
  dir: 'ltr' | 'rtl';
}

/**
 * The tower's play TOOLS, lifted out of the bottom deck into the top bar.
 *
 * Two things drove the extraction (founder 2026-08-14):
 *  1. "All the buttons near the top" — the deck below the wheel had grown a
 *     clue button, a scramble button and a backspace button around the wheel,
 *     which is exactly the chrome that was supposed to disappear so the tower
 *     could breathe.
 *  2. The clue was STUCK: the old button disabled itself after one reveal and
 *     `pickClueWord` was deterministic on (dict, wheel, usedWords), so a second
 *     clue — bought with a rewarded ad — handed back the same word. The rotation
 *     index lives here now, next to the ad call that spends it: press N shows
 *     candidate N.
 */
export function WordTowerToolbar({
  possibleWords, getClue, scramblesLeft, scrambleCost = 0, coinBalance = 0,
  onScramble, onReroll, wheelKey = '', disabled = false, t, dir,
}: WordTowerToolbarProps) {
  const isStuck = possibleWords === 0;
  const hasBonusScramble = scramblesLeft > 0;
  const canBuyScramble = scrambleCost > 0 && coinBalance >= scrambleCost;
  const canScramble = hasBonusScramble || canBuyScramble;

  // Revealed clue for the CURRENT wheel; the rotation index is per-run (the ad
  // cap is per-run too), the shown word is per-wheel.
  const [clue, setClue] = useState<string | null>(null);
  const [cluesUsed, setCluesUsed] = useState(0);
  const cluesUsedRef = useRef(0);
  useEffect(() => { setClue(null); }, [wheelKey]);

  const revealClue = useCallback(() => {
    const next = getClue(cluesUsedRef.current);
    cluesUsedRef.current += 1;
    setCluesUsed(cluesUsedRef.current);
    setClue(next);
  }, [getClue]);

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
  const capReached = !canRequestClue(cluesUsed);
  const cluesLeft = CLUE_RUN_CAP - cluesUsed;

  return (
    <div className="pointer-events-none flex flex-col items-center gap-1" dir={dir}>
      <div className="pointer-events-auto flex items-center gap-1.5">
        {isStuck ? (
          <button
            type="button"
            data-testid="wt-reroll-button"
            onClick={onReroll}
            disabled={disabled || !onReroll}
            aria-label={t('wordTower.hud.stuck')}
            title={t('wordTower.hud.stuck')}
            className="flex h-9 w-9 items-center justify-center rounded-full border-neo border-black bg-neo-orange text-black shadow-hard-sm transition-transform active:translate-y-0.5 disabled:opacity-40"
          >
            <RotateCw className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            data-testid="wt-clue-button"
            onClick={requestClue}
            disabled={disabled || clueBusy || capReached}
            aria-label={t('wordTower.hud.cluesLeft', { n: cluesLeft })}
            title={t('wordTower.hud.clue')}
            className="relative flex h-9 w-9 items-center justify-center rounded-full border-neo border-black bg-neo-navy-light/95 text-neo-cyan shadow-hard-sm transition-transform active:translate-y-0.5 disabled:opacity-60"
          >
            <Lightbulb className="h-4 w-4" />
            {cluesLeft > 0 && (
              <span className="absolute -end-1.5 -top-1.5 min-w-[1.1rem] rounded-full border border-black bg-neo-cyan px-1 text-center font-neo-body text-[10px] font-black leading-4 text-black tabular-nums">
                {cluesLeft}
              </span>
            )}
            {/* Every clue costs a rewarded ad — the 📺 makes the price obvious. */}
            {!capReached && (
              <span className="absolute -bottom-1.5 -start-1.5 text-[10px] leading-none">📺</span>
            )}
          </button>
        )}

        {/* Paid escape — only offered once the wheel is genuinely dead. */}
        {isStuck && (
          <button
            type="button"
            data-testid="wt-scramble-button"
            onClick={onScramble}
            disabled={!canScramble || disabled}
            aria-label={t('wordTower.hud.scramble')}
            className="flex h-9 items-center gap-1 rounded-full border-neo border-black bg-neo-purple px-2.5 font-neo-display text-[11px] font-bold uppercase text-neo-white shadow-hard-sm transition-transform active:translate-y-0.5 disabled:opacity-40"
          >
            <Shuffle className="h-4 w-4" />
            {hasBonusScramble ? (
              <span className="tabular-nums">{scramblesLeft}</span>
            ) : (
              <span className="flex items-center gap-0.5 tabular-nums">
                <Coins className="h-3 w-3" aria-hidden />{scrambleCost}
              </span>
            )}
          </button>
        )}
      </div>

      {clue && (
        <span
          data-testid="wt-clue-word"
          className={cn(
            'pointer-events-none rounded-neo border-neo border-black bg-neo-navy px-2 py-0.5',
            'font-neo-display text-sm tracking-[0.25em] text-neo-yellow shadow-hard',
          )}
        >
          {clue}
        </span>
      )}
    </div>
  );
}
