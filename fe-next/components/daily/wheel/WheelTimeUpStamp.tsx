'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import { m } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { SPRING_PRESETS } from '@/lib/animation/presets';

export const FINISH_BEAT_MS = 900;

/** Only a run the clock ended gets the beat; a hand-ended practice run or reduced motion goes straight to results. */
export function shouldPlayFinishBeat(timeSeconds: number): boolean {
  if (timeSeconds <= 0 || typeof window === 'undefined') return false;
  return !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

interface WheelTimeUpStampProps {
  wordsFound: number;
  onDone: () => void;
}

/** The buzzer moment between the last second and the results: a slammed stamp, tap to skip. */
export default function WheelTimeUpStamp({ wordsFound, onDone }: WheelTimeUpStampProps) {
  const { t } = useLanguage();
  const doneRef = useRef(false);
  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone();
  }, [onDone]);

  useEffect(() => {
    const id = setTimeout(finish, FINISH_BEAT_MS);
    return () => clearTimeout(id);
  }, [finish]);

  return (
    <button
      type="button"
      data-testid="wheel-time-up"
      onClick={finish}
      aria-label={t('wordWheel.gameOver')}
      className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-5 px-4 bg-neo-navy/60 cursor-pointer"
    >
      <m.span
        className="-rotate-6 max-w-[88vw] px-5 py-2 rounded-neo border-4 border-neo-black bg-neo-yellow text-neo-black text-center font-neo-display font-black text-[clamp(2rem,10vw,3.75rem)] leading-none uppercase tracking-wide shadow-hard-lg"
        initial={{ scale: 2.4 }}
        animate={{ scale: 1 }}
        transition={{ ...SPRING_PRESETS.bouncy, stiffness: 520, damping: 18 }}
      >
        {t('wordWheel.gameOver')}
      </m.span>
      <m.span
        className="px-3 py-1 rounded-full border-2 border-neo-black bg-neo-navy text-neo-white font-black text-sm tabular-nums shadow-hard-sm"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ ...SPRING_PRESETS.bouncy, delay: 0.25 }}
      >
        {wordsFound} · {t('wordWheel.results.wordsFound')}
      </m.span>
    </button>
  );
}
