'use client';

import { memo } from 'react';
import { AdaptiveAnimatePresence, AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import type { TranslationFn } from '../types';

export interface SpecialWordEvent {
  word: string;
  bonus: number;
  finderUsername: string;
}

interface SpecialWordToastProps {
  event: SpecialWordEvent | null;
  t: TranslationFn;
}

/**
 * SpecialWordToast - Celebration popup when a special word is found.
 * Auto-dismissed by parent after 3 seconds.
 */
export const SpecialWordToast = memo<SpecialWordToastProps>(function SpecialWordToast({
  event,
  t,
}) {
  return (
    <AdaptiveAnimatePresence>
      {event && (
        <AdaptiveMotion.div
          key={`${event.word}-${event.finderUsername}`}
          initial={{ scale: 0.5, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: -10 }}
          transition={{ type: 'spring', stiffness: 500, damping: 28 }}
          className="
            absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[60]
            pointer-events-none
            flex flex-col items-center gap-1
            px-6 py-4
            bg-neo-navy border-3 border-yellow-400 rounded-neo shadow-hard
            text-center
          "
          role="status"
          aria-live="polite"
        >
          {/* Burst ring */}
          <AdaptiveMotion.div
            initial={{ scale: 0.6, opacity: 0.8 }}
            animate={{ scale: 1.6, opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="absolute inset-0 rounded-neo border-2 border-yellow-400 pointer-events-none"
            aria-hidden="true"
          />

          <span className="text-2xl" aria-hidden="true">🌟</span>
          <span className="font-neo-display font-black text-yellow-400 text-xl sm:text-2xl uppercase tracking-widest">
            {event.word}
          </span>
          <span className="font-bold text-yellow-300 text-base">
            {t('specialWord.bonus', { bonus: event.bonus })}
          </span>
          <span className="text-neo-white text-xs font-neo-body">
            {t('specialWord.foundBy', { username: event.finderUsername })}
          </span>
        </AdaptiveMotion.div>
      )}
    </AdaptiveAnimatePresence>
  );
});
