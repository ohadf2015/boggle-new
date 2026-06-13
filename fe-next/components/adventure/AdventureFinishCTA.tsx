'use client';

import React from 'react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { Flag, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdventureFinishCTAProps {
  /** Show only when all PRIMARY objectives are met but a secondary is still open. */
  visible: boolean;
  /** Stars already banked — shown so the player knows ending now loses nothing earned. */
  starsSoFar: number;
  onFinish: () => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  isRTL: boolean;
}

/**
 * Floating "Finish Level" call-to-action. The level auto-ends once EVERY quest
 * is done; this covers the in-between state where the required objectives are
 * complete but an optional one isn't — letting the player stop the clock and
 * claim their stars instead of waiting it out.
 *
 * Positioned above the bottom HUD bar (and clear of the AdMob anchor) so it sits
 * in its own deliberate slot rather than fighting the crowded HUD chrome.
 */
export default function AdventureFinishCTA({
  visible,
  starsSoFar,
  onFinish,
  t,
  isRTL,
}: AdventureFinishCTAProps): React.JSX.Element {
  return (
    <AdaptiveAnimatePresence>
      {visible && (
        <AdaptiveMotion.div
          key="finish-cta"
          initial={{ y: 24, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 16, opacity: 0, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 320, damping: 22 }}
          className={cn(
            // Centred, above the bottom HUD bar + AdMob banner, below modals.
            'fixed inset-x-0 z-[45] flex justify-center pointer-events-none',
            'bottom-[calc(5.75rem+var(--admob-banner-height,0px))]'
          )}
          dir={isRTL ? 'rtl' : 'ltr'}
        >
          {/* Lime brand-primary glow to pull the eye without overpowering the board */}
          <div className="relative pointer-events-auto">
            <div
              className="absolute -inset-1.5 rounded-neo-lg bg-neo-lime/35 blur-[2px] animate-[ember-pulse_2.4s_ease-in-out_infinite] motion-reduce:animate-none pointer-events-none"
              aria-hidden="true"
            />
            <AdaptiveMotion.button
              type="button"
              onClick={onFinish}
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.96, y: 1 }}
              aria-label={t('adventure.game.finishLevel')}
              className={cn(
                'relative flex items-center gap-2.5 ps-3.5 pe-3 py-2.5',
                'bg-linear-to-b from-neo-lime to-neo-lime-dark',
                'text-neo-black font-neo-display font-black uppercase tracking-wide',
                'border-3 border-neo-black rounded-neo-lg shadow-hard-lg',
                'transition-shadow duration-150 hover:shadow-hard active:shadow-hard-pressed',
                // Beveled top highlight
                'before:absolute before:inset-x-[3px] before:top-[3px] before:h-[3px]',
                'before:bg-white/30 before:rounded-t-neo before:pointer-events-none'
              )}
            >
              <Flag className="w-5 h-5 drop-shadow-[1px_1px_0px_rgba(0,0,0,0.25)]" />
              <span className="flex flex-col items-start leading-none gap-0.5">
                <span className="text-sm drop-shadow-[1px_1px_0px_rgba(0,0,0,0.15)]">
                  {t('adventure.game.finishLevel')}
                </span>
                <span className="flex items-center gap-1 text-[10px] font-bold normal-case opacity-80">
                  <Star className="w-3 h-3 fill-current" />
                  {t('adventure.game.finishKeepStars', { stars: starsSoFar })}
                </span>
              </span>
            </AdaptiveMotion.button>
          </div>
        </AdaptiveMotion.div>
      )}
    </AdaptiveAnimatePresence>
  );
}
