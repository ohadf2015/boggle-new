'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
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
    <div
      data-testid="win-cinematic"
      className="fixed inset-0 z-50 bg-neo-navy flex flex-col items-center justify-center cursor-pointer select-none animate-in fade-in-0 duration-300"
      onClick={handleClick}
    >
      {/* Puzzle label — number rendered explicitly so it's always in the DOM */}
      <div
        className="text-slate-500 text-sm font-black uppercase tracking-widest mb-4 animate-in zoom-in-50 duration-300"
        style={{ animationDelay: '0.1s' }}
      >
        {t('wordHunt.title')} #{puzzleNumber}
      </div>

      {/* Rolling score */}
      <div
        className="text-[8rem] font-black text-neo-lime leading-none tabular-nums animate-in fade-in-0 zoom-in-95 duration-300"
        style={{ animationDelay: '0.2s' }}
      >
        {displayScore}
      </div>

      <div
        className="text-slate-400 text-lg font-bold uppercase tracking-widest animate-in fade-in-0 duration-300"
        style={{ animationDelay: '0.3s' }}
      >
        {t('common.pts')}
      </div>

      {/* Tap to continue */}
      <>
        {showTap && (
          <div
            className="absolute bottom-12 text-slate-500 text-sm uppercase tracking-widest animate-in fade-in-0 duration-300"
          >
            {t('common.tapToContinue')}
          </div>
        )}
      </>
    </div>
  );
};

export default WinCinematic;
