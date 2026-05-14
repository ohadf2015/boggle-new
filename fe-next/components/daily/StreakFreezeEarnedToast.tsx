'use client';

import React, { useEffect } from 'react';
import { m } from 'framer-motion';

interface StreakFreezeEarnedToastProps {
  freezeCount: number;
  t: (key: string) => string;
  onDismiss: () => void;
}

const AUTO_DISMISS_MS = 4000;

/**
 * StreakFreezeEarnedToast - Toast shown when a streak freeze is earned
 */
export function StreakFreezeEarnedToast({ freezeCount, t, onDismiss }: StreakFreezeEarnedToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <m.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed top-20 inset-x-0 mx-auto w-fit z-50 px-4 py-3 bg-neo-cyan/90 text-neo-black border-3 border-neo-black rounded-neo shadow-hard font-bold text-sm flex items-center gap-2"
    >
      <span className="text-lg">{'\u2744\uFE0F'}</span>
      <span>{t('daily.streakFreezeEarned')}</span>
      <span className="ms-1 px-2 py-0.5 bg-neo-black/20 rounded text-xs font-black">
        {freezeCount}/3
      </span>
    </m.div>
  );
}
