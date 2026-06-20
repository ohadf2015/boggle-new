/**
 * ParryPrompt — the active-defense HUD shown during a boss telegraph.
 *
 * Tells the player exactly how to block the incoming attack ("DEFEND — a 6+
 * letter word!") with a live countdown, then flashes PARRIED! / HIT on result.
 * This is what converts the telegraph from a passive countdown into a decision.
 */
'use client';

import React from 'react';
import { Shield, ShieldCheck } from 'lucide-react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';

export type ParryOutcome = 'parried' | 'hit' | null;

export interface ParryPromptProps {
  active: boolean;
  hintKey: string;
  secondsLeft: number;
  result: ParryOutcome;
  t: (key: string) => string;
}

const ParryPrompt: React.FC<ParryPromptProps> = ({ active, hintKey, secondsLeft, result, t }) => {
  if (!active && !result) return null;

  return (
    <div
      className="fixed top-28 sm:top-32 left-1/2 -translate-x-1/2 z-40 pointer-events-none w-full max-w-sm px-3"
      role="status"
      aria-live="assertive"
    >
      <AdaptiveAnimatePresence mode="wait">
        {result === 'parried' ? (
          <AdaptiveMotion.div
            key="parried"
            initial={{ scale: 0.5, opacity: 0, y: 6 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 1.15, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 22 }}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-neo-lime border-3 border-neo-black rounded-neo shadow-hard-lg"
          >
            <ShieldCheck className="w-5 h-5 text-neo-black" />
            <span className="font-neo-display font-black text-neo-black uppercase tracking-wide">
              {t('adventure.boss.combat.parry.success')}
            </span>
          </AdaptiveMotion.div>
        ) : active ? (
          <AdaptiveMotion.div
            key="defend"
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 24 }}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-neo-navy border-3 border-neo-red rounded-neo shadow-hard"
          >
            <AdaptiveMotion.span
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ repeat: Infinity, duration: 0.7 }}
              aria-hidden="true"
            >
              <Shield className="w-5 h-5 text-neo-red" />
            </AdaptiveMotion.span>
            <span className="font-neo-display font-black text-neo-white text-sm uppercase tracking-wide">
              {t(hintKey)}
            </span>
            <span className="ms-1 font-neo-display font-black text-neo-red tabular-nums">
              {Math.max(0, Math.ceil(secondsLeft))}
            </span>
          </AdaptiveMotion.div>
        ) : null}
      </AdaptiveAnimatePresence>
    </div>
  );
};

export default ParryPrompt;
