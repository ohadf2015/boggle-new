'use client';

import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { Sparkles } from 'lucide-react';

/**
 * PouchFullBeat — a short cosy "Pouch Full!" payoff shown over the board for
 * ~900ms when the rare-gem target is hit, before the results phase. Extracted
 * from RareGems.tsx for the 500-line cap.
 */
export default function PouchFullBeat({
  visible,
  t,
}: {
  visible: boolean;
  t: (key: string) => string;
}) {
  return (
    <AdaptiveAnimatePresence>
      {visible && (
        <AdaptiveMotion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="status"
          aria-live="assertive"
          data-testid="pouch-full-beat"
          className="absolute inset-0 z-20 flex items-center justify-center bg-neo-navy/70"
        >
          <AdaptiveMotion.div
            initial={{ scale: 0.6, rotate: -4 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 14 }}
            className="flex flex-col items-center gap-2 px-8 py-6 rounded-neo border-3 border-neo-black shadow-hard-lg bg-neo-lime text-neo-black"
          >
            <Sparkles className="w-10 h-10 motion-safe:animate-neo-wobble" />
            <span className="text-2xl font-black uppercase tracking-wide">
              {t('brain.drills.pouchFull')}
            </span>
          </AdaptiveMotion.div>
        </AdaptiveMotion.div>
      )}
    </AdaptiveAnimatePresence>
  );
}
