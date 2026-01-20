'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Target, Flame, Check, Clock, Sparkles, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { useTiltEffect } from '@/hooks/useTiltEffect';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';
import {
  getDailyChallengeDate,
  getPuzzleNumber,
  getSecondsUntilNextDaily,
  formatCountdown,
  getWordHuntStatusToday,
  getDailyStreak,
} from '@/utils/dailyChallenge';
import type { Language } from '@/types';

interface DailyChallengeBannerProps {
  className?: string;
  /** Compact mode for smaller displays */
  compact?: boolean;
  /** Optional mascot element to replace the icon (for mobile portrait) */
  mascot?: React.ReactNode;
}

/**
 * DailyChallengeBanner - Subtle card promoting the Daily Challenge
 * Clean design with puzzle number, streak badge, and completion indicator
 */
const DailyChallengeBanner: React.FC<DailyChallengeBannerProps> = ({
  className = '',
  compact = false,
  mascot,
}) => {
  const { t, language, dir } = useLanguage();
  const [countdown, setCountdown] = useState<string>('');
  const [hasPlayed, setHasPlayed] = useState<boolean>(false);
  const [hasSolved, setHasSolved] = useState<boolean>(false);
  const [streak, setStreak] = useState<number>(0);
  const [puzzleNumber, setPuzzleNumber] = useState<number>(0);
  const [isClient, setIsClient] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const { enableComplexAnimations, prefersReducedMotion } = useDevicePerformance();

  // 3D tilt effect - slightly reduced values for smaller banner
  const { ref: tiltRef, style: tiltStyle, handlers: tiltHandlers } = useTiltEffect<HTMLDivElement>({
    maxTilt: 12,
    hoverScale: 1.04,
    perspective: 800,
  });

  // Combined handlers for hover state tracking
  const combinedHandlers = {
    ...tiltHandlers,
    onMouseEnter: () => {
      setIsHovered(true);
      tiltHandlers.onMouseEnter();
    },
    onMouseLeave: () => {
      setIsHovered(false);
      tiltHandlers.onMouseLeave();
    },
  };

  // Initialize state on client
  useEffect(() => {
    setIsClient(true);
    const date = getDailyChallengeDate();
    setPuzzleNumber(getPuzzleNumber(date));

    // Get full status including win/loss
    const status = getWordHuntStatusToday(language as Language);
    setHasPlayed(!!status);
    setHasSolved(status?.solved ?? false);

    setStreak(getDailyStreak().currentStreak);
  }, [language]);

  // Update countdown timer
  useEffect(() => {
    if (!isClient) return;

    const updateCountdown = () => {
      const seconds = getSecondsUntilNextDaily();
      setCountdown(formatCountdown(seconds));
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [isClient]);

  // Refresh status when language changes
  useEffect(() => {
    if (!isClient) return;
    const status = getWordHuntStatusToday(language as Language);
    setHasPlayed(!!status);
    setHasSolved(status?.solved ?? false);
    setStreak(getDailyStreak().currentStreak);
  }, [language, isClient]);

  // Refresh status when page becomes visible (handles navigation back)
  useEffect(() => {
    if (!isClient) return;

    const refreshStatus = () => {
      const status = getWordHuntStatusToday(language as Language);
      setHasPlayed(!!status);
      setHasSolved(status?.solved ?? false);
      setStreak(getDailyStreak().currentStreak);
    };

    // Refresh on page visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshStatus();
      }
    };

    // Refresh on window focus (handles tab switches and navigation)
    const handleFocus = () => {
      refreshStatus();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [isClient, language]);

  const isRTL = dir === 'rtl';

  if (!isClient) {
    // SSR placeholder to prevent hydration mismatch and CLS
    // Uses exact same structure as rendered content with fixed dimensions
    return (
      <div className={cn(
        "w-full rounded-neo border-3 border-neo-black shadow-hard bg-gradient-to-r from-neo-lime via-lime-300 to-yellow-300",
        compact ? "p-2" : "p-2 sm:p-3",
        className
      )}>
        <div className="flex items-center gap-3">
          <div className={cn(
            "rounded-neo border-2 border-neo-black bg-neo-black/20 shrink-0",
            compact ? "w-8 h-8" : "w-10 h-10 sm:w-12 sm:h-12"
          )} />
          <div className="flex-1 min-w-0 space-y-2">
            <div className="h-5 w-32 bg-neo-black/10 rounded" />
            <div className="h-3 w-20 bg-neo-black/10 rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <Link href={`/${language}/daily`} className="block w-full group">
      <div
        ref={tiltRef}
        className={cn(
          // Base card styles matching ModeCard
          "relative w-full rounded-neo border-3 border-neo-black shadow-hard-lg transition-shadow cursor-pointer overflow-hidden",
          // Active effects matching ModeCard
          isRTL
            ? 'active:translate-x-[-1px] active:translate-y-[1px]'
            : 'active:translate-x-[1px] active:translate-y-[1px]',
          'active:shadow-hard-pressed',
          // Vibrant gradient for premium daily challenge look
          hasPlayed
            ? "bg-gradient-to-r from-neo-lime via-lime-400 to-neo-lime"
            : "bg-gradient-to-r from-neo-lime via-lime-300 to-yellow-300",
          compact ? "p-2" : "p-2 sm:p-3",
          className
        )}
        style={{
          // Hover glow effect - lime color to match gradient
          boxShadow: isHovered
            ? `0 0 25px rgba(191, 255, 0, 0.5), 0 0 50px rgba(191, 255, 0, 0.3), 6px 6px 0px rgb(var(--neo-black))`
            : undefined,
          ...tiltStyle,
        }}
        {...combinedHandlers}
      >
        {/* Animated sparkles for unplayed state */}
        {!hasPlayed && (
          <motion.div
            className="absolute top-1 right-12"
            animate={{
              rotate: [0, 15, -15, 0],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <Sparkles className="w-4 h-4 text-yellow-600/70" />
          </motion.div>
        )}

        <div className="flex items-center gap-3 relative z-10">
          {/* Icon or Mascot */}
          {mascot ? (
            <div className="flex-shrink-0">{mascot}</div>
          ) : (
            <motion.div
              className={cn(
                "flex items-center justify-center rounded-neo border-2 border-neo-black bg-neo-black",
                compact ? "w-8 h-8" : "w-10 h-10 sm:w-12 sm:h-12"
              )}
              animate={!hasPlayed ? {
                boxShadow: ['0 0 0px rgba(191, 255, 0, 0)', '0 0 15px rgba(191, 255, 0, 0.5)', '0 0 0px rgba(191, 255, 0, 0)']
              } : undefined}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Target className={cn(
                "text-neo-lime",
                compact ? "w-4 h-4" : "w-5 h-5 sm:w-6 sm:h-6"
              )} />
            </motion.div>
          )}

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className={cn(
                "font-black uppercase text-neo-black leading-tight",
                compact ? "text-sm" : "text-base sm:text-lg"
              )}>
                {t('daily.badge') || 'Daily Challenge'}
              </h3>
              <span className="font-bold text-neo-black/70 text-sm">
                #{puzzleNumber}
              </span>
              {streak > 0 && (
                <motion.span
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-neo-black/15 text-neo-black"
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 3 }}
                >
                  <Flame className="w-3 h-3 text-orange-600" />
                  <span className="text-xs font-bold">{streak}</span>
                </motion.span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-neo-black/70 font-medium mt-0.5">
              <Clock className="w-3 h-3" />
              <span className="tabular-nums min-w-[5ch]">
                {hasPlayed
                  ? <><span>{t('daily.nextPuzzleIn') || 'Next'}: </span><span className="inline-block min-w-[4.5em]">{countdown}</span></>
                  : <span className="inline-block min-w-[4.5em]">{countdown}</span>
                }
              </span>
            </div>
          </div>

          {/* Win/Loss/Play indicator */}
          {hasPlayed ? (
            <motion.div
              className={cn(
                "flex items-center justify-center w-8 h-8 rounded-full border-2 border-neo-black",
                hasSolved
                  ? "bg-neo-lime-light text-neo-black"  // Green for win
                  : "bg-neo-pink text-neo-black"         // Pink for loss
              )}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 20 }}
              data-testid={hasSolved ? "won-badge" : "lost-badge"}
            >
              {hasSolved ? (
                <Check className="w-4 h-4" strokeWidth={3} />
              ) : (
                <X className="w-4 h-4" strokeWidth={3} />
              )}
            </motion.div>
          ) : (
            <motion.div
              className="text-neo-black font-bold text-xs uppercase px-2 py-1 bg-neo-black/10 rounded-neo"
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              {t('daily.playNow') || 'Play!'}
            </motion.div>
          )}
        </div>

        {/* Premium animated effects - matching ModeCard */}
        {enableComplexAnimations && !prefersReducedMotion && (
          <>
            {/* Shine effect on hover */}
            <motion.div
              className="absolute inset-0 pointer-events-none overflow-hidden rounded-neo"
              initial={false}
              animate={isHovered ? { opacity: 1 } : { opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                initial={{ x: '-100%' }}
                animate={isHovered ? { x: '200%' } : { x: '-100%' }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </motion.div>

            {/* Decorative corner accent */}
            <motion.div
              className="absolute top-0 right-0 w-12 h-12 pointer-events-none overflow-hidden rounded-neo"
              initial={false}
            >
              <motion.div
                className="absolute -top-6 -right-6 w-12 h-12 bg-white/10 rotate-45"
                animate={isHovered ? { scale: 1.2, opacity: 0.15 } : { scale: 1, opacity: 0.08 }}
                transition={{ duration: 0.3 }}
              />
            </motion.div>
          </>
        )}
      </div>
    </Link>
  );
};

export default DailyChallengeBanner;
