'use client';

import { Flame } from 'lucide-react';
import { m, useReducedMotion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import type { ClassroomEconomySnapshot } from '@/shared/constants/classroomEconomy';

interface EconomyHudProps {
  snapshot: ClassroomEconomySnapshot;
}

/**
 * Compact in-round readout. Shows one streak, one multiplier, once. The MP
 * combo badge must not render next to this, or the student sees two numbers.
 */
export default function EconomyHud({ snapshot }: EconomyHudProps) {
  const { t } = useLanguage();
  const reduced = useReducedMotion() ?? false;
  const delta = snapshot.lastDelta;
  const flaming = snapshot.streak >= 3;
  const doubling = snapshot.doubleCashMsLeft > 0;

  return (
    <div className="flex items-center gap-3 text-sm font-bold text-white" aria-live="polite">
      <span className="relative inline-flex items-center gap-1" data-testid="hud-cash">
        <span>{t('economy.hud.cash', { cash: snapshot.cash })}</span>
        {delta?.kind === 'correct' && delta.delta > 0 && (
          <m.span
            key={`${snapshot.cashEarned}-${delta.delta}`}
            className="text-neo-lime"
            initial={reduced ? false : { y: 6 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {`+${delta.delta}`}
          </m.span>
        )}
        {delta?.kind === 'wrong' && delta.cost > 0 && <span className="text-neo-pink">{`-${delta.cost}`}</span>}
      </span>

      {flaming && (
        <span className="inline-flex items-center gap-1 text-orange-300" data-testid="hud-streak">
          <Flame aria-hidden="true" className="h-4 w-4" />
          <span>{t('economy.hud.multiplier', { multiplier: snapshot.multiplier })}</span>
        </span>
      )}

      {doubling && (
        <span className="text-neo-cyan" data-testid="hud-double">
          {t('economy.hud.doubleCash', { seconds: Math.ceil(snapshot.doubleCashMsLeft / 1000) })}
        </span>
      )}
    </div>
  );
}
