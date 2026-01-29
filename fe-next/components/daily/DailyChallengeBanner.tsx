'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Target, Flame, Check, Clock, Sparkles, X, Star, Zap } from 'lucide-react';
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
  // Performance: Skip updates when tab is hidden to reduce CPU usage
  useEffect(() => {
    if (!isClient) return;

    const updateCountdown = () => {
      // Skip update if tab is not visible (saves CPU cycles)
      if (document.visibilityState === 'hidden') return;
      const seconds = getSecondsUntilNextDaily();
      setCountdown(formatCountdown(seconds));
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    // Update immediately when tab becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updateCountdown();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
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
        "w-full rounded-neo border-3 border-neo-black shadow-hard-lg bg-gradient-to-br from-yellow-300 via-amber-400 to-orange-500",
        compact ? "p-2 sm:p-3" : "p-3 sm:p-4",
        className
      )}>
        <div className="flex items-center gap-3 sm:gap-4">
          <div className={cn(
            "rounded-neo border-2 border-neo-black bg-neo-navy shrink-0",
            compact ? "w-10 h-10" : "w-12 h-12 sm:w-14 sm:h-14"
          )} />
          <div className="flex-1 min-w-0 space-y-2">
            <div className="h-6 w-40 bg-neo-black/15 rounded" />
            <div className="h-4 w-24 bg-neo-black/10 rounded" />
          </div>
        </div>
      </div>
    );
  }

  // Premium gold gradient for "daily treasure" feel
  const gradientClass = hasPlayed
    ? "bg-gradient-to-br from-amber-400 via-orange-400 to-amber-500"
    : "bg-gradient-to-br from-yellow-300 via-amber-400 to-orange-500";

  const glowColor = 'rgba(255, 165, 0, 0.5)';

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
          // Premium gold gradient
          gradientClass,
          compact ? "p-2 sm:p-3" : "p-3 sm:p-4",
          className
        )}
        style={{
          // Hover glow effect - gold/orange color for premium feel
          boxShadow: isHovered
            ? `0 0 30px ${glowColor}, 0 0 60px ${glowColor}, 6px 6px 0px rgb(var(--neo-black))`
            : undefined,
          ...tiltStyle,
        }}
        {...combinedHandlers}
      >
        {/* Animated sparkles for unplayed state - multiple sparkles */}
        {!hasPlayed && enableComplexAnimations && !prefersReducedMotion && (
          <>
            <motion.div
              className="absolute top-2 right-16 rtl:right-auto rtl:left-16"
              animate={{
                rotate: [0, 15, -15, 0],
                scale: [1, 1.3, 1],
                opacity: [0.6, 1, 0.6],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <Sparkles className="w-4 h-4 text-yellow-100" />
            </motion.div>
            <motion.div
              className="absolute top-1 right-8 rtl:right-auto rtl:left-8"
              animate={{
                rotate: [0, -10, 10, 0],
                scale: [1, 1.2, 1],
                opacity: [0.5, 0.9, 0.5],
              }}
              transition={{
                duration: 1.8,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.5
              }}
            >
              <Star className="w-3 h-3 text-yellow-100 fill-yellow-100" />
            </motion.div>
            <motion.div
              className="absolute bottom-2 right-4 rtl:right-auto rtl:left-4"
              animate={{
                rotate: [0, 20, -20, 0],
                scale: [0.8, 1.1, 0.8],
                opacity: [0.4, 0.8, 0.4],
              }}
              transition={{
                duration: 2.2,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 1
              }}
            >
              <Zap className="w-3 h-3 text-yellow-100 fill-yellow-100" />
            </motion.div>
          </>
        )}

        <div className="flex items-center gap-3 sm:gap-4 relative z-10">
          {/* Icon or Mascot - Enhanced with animated ring */}
          {mascot ? (
            <div className="flex-shrink-0">{mascot}</div>
          ) : (
            <div className="relative">
              {/* Animated glow ring for unplayed state */}
              {!hasPlayed && enableComplexAnimations && !prefersReducedMotion && (
                <motion.div
                  className={cn(
                    "absolute inset-0 rounded-neo",
                    compact ? "-inset-1" : "-inset-1.5"
                  )}
                  animate={{
                    boxShadow: [
                      '0 0 0px rgba(255, 165, 0, 0)',
                      '0 0 20px rgba(255, 165, 0, 0.8)',
                      '0 0 0px rgba(255, 165, 0, 0)'
                    ],
                  }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              )}
              <motion.div
                className={cn(
                  "flex items-center justify-center rounded-neo border-2 border-neo-black bg-neo-navy relative",
                  compact ? "w-10 h-10" : "w-12 h-12 sm:w-14 sm:h-14"
                )}
                animate={!hasPlayed ? {
                  scale: [1, 1.05, 1],
                } : undefined}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Target className={cn(
                  "text-amber-400",
                  compact ? "w-5 h-5" : "w-6 h-6 sm:w-7 sm:h-7"
                )} />
              </motion.div>
            </div>
          )}

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className={cn(
                "font-black uppercase text-neo-black leading-tight drop-shadow-sm",
                compact ? "text-base" : "text-lg sm:text-xl"
              )}>
                {t('daily.badge') || 'Daily Challenge'}
              </h2>
              <span className={cn(
                "font-black text-neo-white bg-neo-navy/90 px-2 py-0.5 rounded-neo border-2 border-neo-black shadow-hard-xs",
                compact ? "text-xs" : "text-sm"
              )}>
                #{puzzleNumber}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              {/* Streak badge - more prominent */}
              {streak > 0 && (
                <motion.span
                  className="flex items-center gap-1 px-2 py-0.5 rounded-neo bg-neo-navy text-neo-orange border border-neo-black"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 2 }}
                >
                  <Flame className="w-3.5 h-3.5" />
                  <span className="text-xs font-black">{streak} {t('daily.dayStreak') || 'day streak'}</span>
                </motion.span>
              )}
              {/* Countdown */}
              <div className={cn(
                "flex items-center gap-1.5 text-neo-black/70 font-semibold",
                compact ? "text-xs" : "text-xs sm:text-sm"
              )}>
                <Clock className="w-3.5 h-3.5" />
                <span className="tabular-nums">
                  {hasPlayed
                    ? <><span>{t('daily.nextPuzzleIn') || 'Next'}: </span><span className="font-bold">{countdown}</span></>
                    : <span className="font-bold">{countdown}</span>
                  }
                </span>
              </div>
            </div>
          </div>

          {/* Win/Loss indicator - only show when played */}
          {hasPlayed && (
            <motion.div
              className={cn(
                "flex items-center justify-center rounded-full border-2 border-neo-black",
                compact ? "w-10 h-10" : "w-12 h-12",
                hasSolved
                  ? "bg-neo-lime text-neo-black"  // Green for win
                  : "bg-neo-pink text-neo-black"   // Pink for loss
              )}
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 20 }}
              data-testid={hasSolved ? "won-badge" : "lost-badge"}
            >
              {hasSolved ? (
                <Check className={cn(compact ? "w-5 h-5" : "w-6 h-6")} strokeWidth={3} />
              ) : (
                <X className={cn(compact ? "w-5 h-5" : "w-6 h-6")} strokeWidth={3} />
              )}
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
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent"
                initial={{ x: '-100%' }}
                animate={isHovered ? { x: '200%' } : { x: '-100%' }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            </motion.div>

            {/* Decorative corner accent */}
            <motion.div
              className="absolute top-0 left-0 w-16 h-16 pointer-events-none overflow-hidden rounded-neo"
              initial={false}
            >
              <motion.div
                className="absolute -top-8 -left-8 w-16 h-16 bg-white/15 rotate-45"
                animate={isHovered ? { scale: 1.3, opacity: 0.25 } : { scale: 1, opacity: 0.1 }}
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
