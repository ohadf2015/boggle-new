/**
 * WeaknessBadge — surfaces the boss's elemental weakness so the player can hunt
 * the right words ("Weak to: PALINDROMES"), and pops a "WEAKNESS! ×crit" burst
 * when a weak hit lands. This is the visible hook for the strategic-word layer.
 */
'use client';

import React from 'react';
import { Crosshair } from 'lucide-react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';

export interface WeaknessCrit {
  id: number;
  label: string;
}

export interface WeaknessBadgeProps {
  labelKey: string;
  crit: WeaknessCrit | null;
  t: (key: string) => string;
}

const WeaknessBadge: React.FC<WeaknessBadgeProps> = ({ labelKey, crit, t }) => {
  return (
    <div className="relative inline-flex">
      {/* Persistent weakness chip */}
      <div
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-neo border-2 border-neo-yellow bg-neo-navy-light shadow-hard-sm"
        aria-label={`${t('adventure.boss.combat.weakLabel')}: ${t(labelKey)}`}
      >
        <Crosshair className="w-3 h-3 text-neo-yellow" aria-hidden="true" />
        <span className="text-[10px] font-bold uppercase tracking-wide text-neo-yellow whitespace-nowrap">
          {t(labelKey)}
        </span>
      </div>

      {/* Crit burst on weak hit */}
      <AdaptiveAnimatePresence>
        {crit && (
          <AdaptiveMotion.div
            key={crit.id}
            className="absolute -top-7 left-1/2 -translate-x-1/2 pointer-events-none whitespace-nowrap"
            initial={{ y: 0, opacity: 0, scale: 0.5 }}
            animate={{ y: -10, opacity: 1, scale: 1.15 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ type: 'spring', stiffness: 500, damping: 18 }}
            role="status"
            aria-live="polite"
          >
            <span className="font-neo-display font-black text-neo-yellow text-sm drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
              {t('adventure.boss.combat.weaknessHit')}
            </span>
          </AdaptiveMotion.div>
        )}
      </AdaptiveAnimatePresence>
    </div>
  );
};

export default WeaknessBadge;
