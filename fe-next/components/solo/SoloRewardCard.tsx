'use client';

/**
 * SoloRewardCard — reusable daily-reward panel for the session-only beta modes.
 *
 * Purely presentational: it takes already-resolved values plus a `t` fn so it can be
 * dropped into any mode's end screen and unit-tested without a LanguageContext provider.
 * Fires the shared confetti juice on a real award (claimed=false, awarded>0).
 */

import { useEffect, useRef } from 'react';
import { Coins, Sparkles, Gift, Share2, RotateCcw } from 'lucide-react';
import { fireConfetti } from '@/utils/confettiUtils';
import type { SoloModifier } from '@/lib/solo/soloDaily';

type TFunc = (key: string, params?: Record<string, string | number>) => string;

export interface SoloRewardCardProps {
  t: TFunc;
  /** Coins awarded this completion (0 on a practice replay). */
  awarded: number;
  /** Variable surprise bonus included in `awarded` (shown as a flourish when > 0). */
  bonus: number;
  /** The day's modifier (always shown as a badge). */
  modifier: SoloModifier;
  /** True when today's daily was already claimed → practice replay messaging. */
  claimed: boolean;
  onPlayAgain: () => void;
  onShare?: () => void;
}

export function SoloRewardCard({
  t,
  awarded,
  bonus,
  modifier,
  claimed,
  onPlayAgain,
  onShare,
}: SoloRewardCardProps) {
  const firedRef = useRef(false);
  useEffect(() => {
    if (!claimed && awarded > 0 && !firedRef.current) {
      firedRef.current = true;
      fireConfetti();
    }
  }, [claimed, awarded]);

  return (
    <div
      data-testid="solo-reward-card"
      className="w-full animate-neo-pop rounded-neo border-3 border-black bg-neo-navy-light p-5 text-center shadow-hard-lg space-y-4"
    >
      {/* Daily "today's twist" — a flavor theme badge (display-only preview). */}
      <div className="flex flex-col items-center gap-1">
        <span className="font-neo-body text-[0.6rem] font-bold uppercase tracking-widest text-neo-cream/70">
          {t('solo.modifier.todaysTwist')}
        </span>
        <span
          className="inline-flex items-center gap-1.5 rounded-neo border-3 border-black bg-neo-purple px-3 py-1 font-neo-display font-black text-[0.7rem] uppercase tracking-wide text-neo-white shadow-hard-sm"
          title={t(modifier.descKey)}
        >
          <Sparkles className="h-3.5 w-3.5" />
          {t(modifier.labelKey)}
        </span>
      </div>

      {claimed ? (
        <p className="font-neo-body font-bold text-sm text-neo-cream/90">
          {t('solo.reward.comeBackTomorrow')}
        </p>
      ) : awarded <= 0 ? (
        <p className="font-neo-body font-bold text-sm text-neo-cream/90">
          {t('solo.reward.noCoins')}
        </p>
      ) : (
        <div data-testid="solo-reward-coins" className="space-y-1.5">
          <div className="flex items-center justify-center gap-2 font-neo-display font-black text-4xl text-neo-yellow">
            <Coins className="h-8 w-8" />
            <span aria-label={t('solo.reward.coinsEarned', { n: awarded })}>+{awarded}</span>
          </div>
          {bonus > 0 && (
            <div
              data-testid="solo-reward-bonus"
              className="inline-flex items-center gap-1.5 rounded-neo border-3 border-black bg-neo-orange px-2.5 py-1 font-neo-display font-black text-xs uppercase text-neo-navy shadow-hard-sm animate-neo-wobble"
            >
              <Gift className="h-3.5 w-3.5" />
              <span>+{bonus} {t('solo.reward.surpriseBonus')}</span>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={onPlayAgain}
          className="inline-flex items-center gap-2 rounded-neo border-3 border-black bg-neo-lime px-5 py-2.5 font-neo-display font-black uppercase tracking-wide text-neo-navy shadow-hard"
        >
          <RotateCcw className="h-4 w-4" />
          {t('solo.reward.playAgain')}
        </button>
        {onShare && (
          <button
            type="button"
            onClick={onShare}
            className="inline-flex items-center gap-2 rounded-neo border-3 border-black bg-neo-cyan px-5 py-2.5 font-neo-display font-black uppercase tracking-wide text-neo-navy shadow-hard"
          >
            <Share2 className="h-4 w-4" />
            {t('solo.reward.share')}
          </button>
        )}
      </div>
    </div>
  );
}
