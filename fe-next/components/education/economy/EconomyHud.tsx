'use client';

import { Flame } from 'lucide-react';
import { m, useReducedMotion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import type { ClassroomEconomySnapshot } from '@/shared/constants/classroomEconomy';

interface EconomyHudProps {
  snapshot: ClassroomEconomySnapshot;
}

/**
 * Compact in-round readout. One cash total, one streak chip (from the first
 * correct word), and the cash each word adds. The MP combo badge must not
 * render next to this, or the student sees two numbers.
 */
export default function EconomyHud({ snapshot }: EconomyHudProps) {
  const { t } = useLanguage();
  const reduced = useReducedMotion() ?? false;
  const delta = snapshot.lastDelta;
  const hot = snapshot.streak >= 3;
  const doubling = snapshot.doubleCashMsLeft > 0;

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-sm font-bold text-white" aria-live="polite">
      <span className="relative inline-flex items-baseline gap-2 text-2xl font-black" data-testid="hud-cash">
        <span>{t('economy.hud.cash', { cash: snapshot.cash })}</span>
        {delta?.kind === 'correct' && delta.delta > 0 && (
          <m.span
            key={`${snapshot.cashEarned}-${delta.delta}`}
            className="text-xl text-neo-lime"
            initial={reduced ? false : { scale: 1.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 380, damping: 12 }}
          >
            {`+${delta.delta}`}
          </m.span>
        )}
        {delta?.kind === 'wrong' && delta.cost > 0 && <span className="text-xl text-neo-pink">{`-${delta.cost}`}</span>}
      </span>

      {snapshot.streak >= 1 && (
        <m.span
          key={`streak-${snapshot.multiplier}`}
          className={hot ? 'inline-flex items-center gap-1 rounded-full border-2 border-black bg-orange-400 px-2 py-0.5 text-neo-navy' : 'inline-flex items-center gap-1 rounded-full border-2 border-white/40 px-2 py-0.5 text-white'}
          data-testid="hud-streak"
          initial={reduced ? false : { scale: 1.25 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 14 }}
        >
          <Flame aria-hidden="true" className="h-4 w-4" />
          <span>{t('economy.hud.streak', { streak: snapshot.streak })}</span>
          <span className="font-black">{t('economy.hud.multiplier', { multiplier: snapshot.multiplier })}</span>
        </m.span>
      )}

      {doubling && (
        <span className="text-neo-cyan" data-testid="hud-double">
          {t('economy.hud.doubleCash', { seconds: Math.ceil(snapshot.doubleCashMsLeft / 1000) })}
        </span>
      )}
    </div>
  );
}
