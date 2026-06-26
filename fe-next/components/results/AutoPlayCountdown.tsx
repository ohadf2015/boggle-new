'use client';

/**
 * AutoPlayCountdown - Auto-start next game after countdown
 *
 * Shows a circular SVG countdown ring with a large number.
 * Clicking "Play Again" triggers immediately.
 * Clicking "Exit" cancels and shows the normal NextStepPrompt.
 * Respects reduced motion (shows static button instead).
 */

import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { Play, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import useReducedMotion from '@/hooks/useReducedMotion';
import { cn } from '@/lib/utils';

interface AutoPlayCountdownProps {
  /** Called when countdown reaches 0 or user clicks "Play Again" */
  onComplete: () => void;
  /** Called when user clicks "Exit" — parent should show normal navigation */
  onCancel: () => void;
  /** Countdown duration in seconds (default: 5) */
  duration?: number;
  /** Additional CSS classes */
  className?: string;
}

const RING_SIZE = 72;
const RING_STROKE = 4;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const AutoPlayCountdown: React.FC<AutoPlayCountdownProps> = memo(({
  onComplete,
  onCancel,
  duration = 5,
  className,
}) => {
  const { t } = useLanguage();
  const reducedMotion = useReducedMotion();
  const [secondsLeft, setSecondsLeft] = useState(duration);
  const [cancelled, setCancelled] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completedRef = useRef(false);

  const handleComplete = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    if (intervalRef.current) clearInterval(intervalRef.current);
    onComplete();
  }, [onComplete]);

  const handleCancel = useCallback(() => {
    setCancelled(true);
    if (intervalRef.current) clearInterval(intervalRef.current);
    onCancel();
  }, [onCancel]);

  // Countdown timer
  useEffect(() => {
    if (cancelled || reducedMotion) return;

    intervalRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          handleComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [cancelled, reducedMotion, handleComplete]);

  // For reduced motion users: show a simple play again button
  if (reducedMotion) {
    return (
      <div className={cn('flex flex-col items-center gap-3', className)}>
        <button
          type="button"
          onClick={handleComplete}
          className={cn(
            'w-full py-4 px-8',
            'bg-neo-yellow text-neo-navy',
            'font-black text-lg uppercase',
            'border-neo-thick border-neo-black rounded-neo',
            'shadow-hard-lg hover:shadow-hard-xl',
            'hover:-translate-x-1 hover:-translate-y-1',
            'active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-pressed',
            'transition-all duration-150',
          )}
        >
          <Play className="inline-block w-5 h-5 me-2" />
          {t('autoPlay.playAgain')}
        </button>
        <button
          type="button"
          onClick={handleCancel}
          className="text-neo-white hover:text-neo-white text-sm font-bold uppercase transition-colors"
        >
          {t('autoPlay.exit')}
        </button>
      </div>
    );
  }

  if (cancelled) return null;

  // Calculate SVG ring progress
  const progress = secondsLeft / duration;
  const strokeDashoffset = RING_CIRCUMFERENCE * (1 - progress);

  return (
    <div
      className={cn('flex flex-col items-center gap-4', className)}
      role="status"
      aria-live="polite"
      aria-label={t('autoPlay.nextGameIn', { seconds: secondsLeft })}
    >
      {/* Countdown ring + number */}
      <button
        type="button"
        onClick={handleComplete}
        className={cn(
          'relative flex items-center justify-center',
          'w-20 h-20 sm:w-24 sm:h-24',
          'rounded-full',
          'bg-neo-navy border-4 border-neo-yellow/30',
          'shadow-hard-lg',
          'hover:border-neo-yellow hover:shadow-hard-xl',
          'active:shadow-hard-pressed',
          'transition-all duration-150',
          'group cursor-pointer',
        )}
        aria-label={t('autoPlay.playAgain')}
      >
        {/* SVG ring */}
        <svg
          className="absolute inset-0 w-full h-full -rotate-90"
          viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
        >
          {/* Background ring */}
          <circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            fill="none"
            stroke="rgba(255, 225, 53, 0.15)"
            strokeWidth={RING_STROKE}
          />
          {/* Progress ring */}
          <circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            fill="none"
            stroke="#FFE135"
            strokeWidth={RING_STROKE}
            strokeLinecap="round"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={strokeDashoffset}
            className="transition-[stroke-dashoffset] duration-1000 ease-linear"
          />
        </svg>

        {/* Number */}
        <span className="relative z-10 font-neo-display text-4xl sm:text-5xl font-black text-neo-yellow tabular-nums group-hover:hidden">
          {secondsLeft}
        </span>
        {/* Play icon on hover */}
        <Play className="relative z-10 w-8 h-8 sm:w-10 sm:h-10 text-neo-yellow hidden group-hover:block fill-current" />
      </button>

      {/* Label */}
      <span className="text-neo-white text-xs sm:text-sm font-bold uppercase tracking-wider">
        {t('autoPlay.playAgain')}
      </span>

      {/* Exit */}
      <button
        type="button"
        onClick={handleCancel}
        className={cn(
          'flex items-center gap-1.5',
          'text-neo-white hover:text-neo-white',
          'text-xs font-bold uppercase',
          'transition-colors duration-150',
        )}
      >
        <X className="w-3.5 h-3.5" />
        {t('autoPlay.exit')}
      </button>
    </div>
  );
});

AutoPlayCountdown.displayName = 'AutoPlayCountdown';
export default AutoPlayCountdown;
