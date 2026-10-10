'use client';

import React from 'react';
import { m } from 'framer-motion';
import { InlineConfetti } from '@/components/effects/InlineConfetti';
import { cn } from '@/lib/utils';
import type { WordHuntSolveTier } from '@/shared/utils/wordHuntScoring';

export function HuntSolveCelebration({
  tier,
  onDone,
  t,
}: {
  tier: WordHuntSolveTier | null;
  onDone: () => void;
  t: (key: string) => string;
}) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex h-20 items-center justify-center">
      <InlineConfetti size="lg" duration={tier && tier.tier <= 1 ? 3500 : 2500} onComplete={onDone} />
      {tier && (
        <m.span
          initial={{ scale: 0.4, y: 12 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 240, damping: 14 }}
          className={cn(
            'px-5 py-2 rounded-neo border-3 border-neo-black shadow-hard-lg font-neo-display font-black uppercase tracking-wider',
            tier.tier <= 1 ? 'text-2xl sm:text-4xl bg-neo-yellow text-neo-black' : 'text-xl sm:text-2xl bg-neo-lime text-neo-black',
          )}
        >
          {t(tier.labelKey)}
        </m.span>
      )}
    </div>
  );
}
