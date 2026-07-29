'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { fireVictoryConfetti } from '@/utils/confettiUtils';

export interface WinCinematicProps {
  puzzleNumber: number;
  finalScore: number;
  onComplete: () => void;
}

export const WinCinematic: React.FC<WinCinematicProps> = ({
  puzzleNumber,
  finalScore,
  onComplete,
}) => {
  const { t } = useLanguage();
  const [displayScore, setDisplayScore] = useState(0);
  const [showTap, setShowTap] = useState(false);

  // Stable ref for onComplete — prevents timer resets when parent re-renders
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // Rolling score counter — animates from 0 to finalScore over ~1.2s
  useEffect(() => {
    let frame = 0;
    const total = 40;
    const interval = setInterval(() => {
      frame++;
      if (frame >= total) {
        setDisplayScore(finalScore);
        clearInterval(interval);
      } else {
        setDisplayScore(Math.round((frame / total) * finalScore));
      }
    }, 30);
    return () => clearInterval(interval);
  }, [finalScore]);

  // Fire confetti once on mount
  useEffect(() => {
    try {
      fireVictoryConfetti();
    } catch {
      // Graceful no-op in environments where canvas-confetti unavailable
    }
  }, []);

  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const doneTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Show "tap to continue" at 2s, auto-advance at 2.5s
  // Uses ref for onComplete so parent re-renders don't reset the timers
  useEffect(() => {
    tapTimerRef.current = setTimeout(() => setShowTap(true), 2000);
    doneTimerRef.current = setTimeout(() => onCompleteRef.current(), 2500);
    return () => {
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
      if (doneTimerRef.current) clearTimeout(doneTimerRef.current);
    };
  }, []);

  const handleClick = useCallback(() => {
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    if (doneTimerRef.current) clearTimeout(doneTimerRef.current);
    onCompleteRef.current();
  }, []);

  return (
    <m.div
      data-testid="win-cinematic"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-neo-navy flex flex-col items-center justify-center cursor-pointer select-none"
      onClick={handleClick}
    >
      {/* Puzzle label — number rendered explicitly so it's always in the DOM */}
      <m.div
        initial={{ scale: 0, rotate: -10 }}
        animate={{ scale: 1, rotate: -3 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.1 }}
        className="text-slate-500 text-sm font-black uppercase tracking-widest mb-4"
      >
        {t('wordHunt.title')} #{puzzleNumber}
      </m.div>

      {/* Rolling score */}
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 300, damping: 26 }}
        className="text-[8rem] font-black text-neo-lime leading-none tabular-nums"
      >
        {displayScore}
      </m.div>

      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, type: 'spring', stiffness: 280, damping: 26 }}
        className="text-slate-400 text-lg font-bold uppercase tracking-widest"
      >
        {t('common.pts')}
      </m.div>

      {/* Tap to continue */}
      <AnimatePresence>
        {showTap && (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ type: 'spring', stiffness: 280, damping: 26 }}
            className="absolute bottom-12 text-slate-500 text-sm uppercase tracking-widest"
          >
            {t('common.tapToContinue')}
          </m.div>
        )}
      </AnimatePresence>
    </m.div>
  );
};

export default WinCinematic;
