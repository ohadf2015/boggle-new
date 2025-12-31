'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Target, Flame, Check, Play, ChevronRight, Clock, AlertTriangle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import {
  getDailyChallengeDate,
  getPuzzleNumber,
  getSecondsUntilNextDaily,
  formatCountdown,
  hasPlayedWordHuntToday,
  getDailyStreak,
  isStreakAtRisk,
} from '@/utils/dailyChallenge';
import type { Language } from '@/types';

interface DailyChallengeBannerProps {
  className?: string;
  /** Compact mode for smaller displays */
  compact?: boolean;
}

/**
 * DailyChallengeBanner - Prominent banner promoting the Daily Challenge
 * Displays puzzle number, streak, completion status, and countdown
 */
const DailyChallengeBanner: React.FC<DailyChallengeBannerProps> = ({
  className = '',
  compact = false,
}) => {
  const { t, language } = useLanguage();
  const [countdown, setCountdown] = useState<string>('');
  const [hasPlayed, setHasPlayed] = useState<boolean>(false);
  const [streak, setStreak] = useState<number>(0);
  const [puzzleNumber, setPuzzleNumber] = useState<number>(0);
  const [isClient, setIsClient] = useState(false);
  const [streakRisk, setStreakRisk] = useState<{ atRisk: boolean; hoursRemaining: number }>({ atRisk: false, hoursRemaining: 0 });

  // Initialize state on client
  useEffect(() => {
    setIsClient(true);
    const date = getDailyChallengeDate();
    setPuzzleNumber(getPuzzleNumber(date));
    setHasPlayed(hasPlayedWordHuntToday(language as Language));
    setStreak(getDailyStreak().currentStreak);

    // Check if streak is at risk
    const risk = isStreakAtRisk();
    setStreakRisk({ atRisk: risk.atRisk, hoursRemaining: risk.hoursRemaining });
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

  // Refresh has played status when language changes
  useEffect(() => {
    if (!isClient) return;
    setHasPlayed(hasPlayedWordHuntToday(language as Language));
    setStreak(getDailyStreak().currentStreak);

    // Refresh streak risk status
    const risk = isStreakAtRisk();
    setStreakRisk({ atRisk: risk.atRisk, hoursRemaining: risk.hoursRemaining });
  }, [language, isClient]);

  if (!isClient) {
    // SSR placeholder to prevent hydration mismatch
    return (
      <div className={cn(
        "w-full p-4 rounded-neo-lg border-4 border-neo-black shadow-hard bg-gradient-to-r from-neo-orange via-neo-yellow to-neo-pink",
        className
      )}>
        <div className="h-16 animate-pulse" />
      </div>
    );
  }

  return (
    <Link href={`/${language}/daily`}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className={cn(
          "group relative w-full rounded-neo-lg border-3 border-neo-black shadow-hard transition-all cursor-pointer overflow-hidden",
          "hover:shadow-hard-lg hover:translate-x-[-2px] hover:translate-y-[-2px]",
          "active:translate-x-[1px] active:translate-y-[1px] active:shadow-hard-pressed",
          "bg-gradient-to-r from-neo-orange via-neo-yellow to-neo-pink",
          compact ? "p-2" : "p-2.5 sm:p-3 lg:p-5 xl:p-6",
          className
        )}
        whileHover={{ scale: 1.005 }}
        whileTap={{ scale: 0.995 }}
      >
        {/* Subtle gradient overlay for unplayed state - no animation */}
        {!hasPlayed && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
        )}

        <div className="relative flex items-center gap-2 sm:gap-3 lg:gap-4 xl:gap-5">
          {/* Icon */}
          <div className={cn(
            "flex items-center justify-center rounded-full border-2 lg:border-3 border-neo-black",
            "bg-neo-black/10",
            compact ? "w-8 h-8" : "w-9 h-9 sm:w-10 sm:h-10 lg:w-14 lg:h-14 xl:w-16 xl:h-16"
          )}>
            <Target className={cn(
              "text-neo-black",
              compact ? "w-4 h-4" : "w-4 h-4 sm:w-5 sm:h-5 lg:w-7 lg:h-7 xl:w-8 xl:h-8"
            )} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-3 flex-wrap">
              <h3 className={cn(
                "font-black uppercase text-neo-black leading-tight",
                compact ? "text-xs" : "text-sm sm:text-base lg:text-xl xl:text-2xl"
              )}>
                {t('daily.badge') || 'Daily Challenge'}
              </h3>
              <span className={cn(
                "font-black text-neo-black/80",
                compact ? "text-xs" : "text-sm sm:text-base lg:text-xl xl:text-2xl"
              )}>
                #{puzzleNumber}
              </span>
              {streak > 0 && (
                <span className={cn(
                  "flex items-center gap-0.5 lg:gap-1 px-1.5 lg:px-2.5 py-0.5 lg:py-1 rounded-full",
                  streakRisk.atRisk ? "bg-neo-red/30 animate-pulse" : "bg-neo-black/20"
                )}>
                  {streakRisk.atRisk ? (
                    <AlertTriangle className="w-3 h-3 lg:w-5 lg:h-5 text-neo-red" />
                  ) : (
                    <Flame className="w-3 h-3 lg:w-5 lg:h-5 text-neo-orange" />
                  )}
                  <span className={cn(
                    "text-xs lg:text-sm xl:text-base font-bold",
                    streakRisk.atRisk ? "text-neo-red" : "text-neo-black"
                  )}>
                    {streak}
                  </span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 lg:gap-2 text-xs lg:text-sm xl:text-base text-neo-black/80 font-medium lg:mt-1">
              {streakRisk.atRisk && !hasPlayed ? (
                <span className="text-neo-red font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 lg:w-4 lg:h-4" />
                  {t('daily.streakAtRisk') || `Play today to save your ${streak}-day streak!`}
                </span>
              ) : (
                <>
                  <Clock className="w-3 h-3 lg:w-4 lg:h-4" />
                  <span>
                    {hasPlayed
                      ? `${t('daily.nextPuzzleIn') || 'Next'}: ${countdown}`
                      : countdown
                    }
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Status / CTA */}
          <div className="flex-shrink-0">
            {hasPlayed ? (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 lg:w-12 lg:h-12 xl:w-14 xl:h-14 bg-neo-lime rounded-full border-2 lg:border-3 border-neo-black"
              >
                <Check className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 xl:w-8 xl:h-8 text-neo-black" strokeWidth={3} />
              </motion.div>
            ) : (
              <div className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 lg:w-12 lg:h-12 xl:w-14 xl:h-14 bg-neo-black rounded-full group-hover:scale-105 transition-transform">
                <Play className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 xl:w-8 xl:h-8 text-neo-yellow" fill="currentColor" />
              </div>
            )}
          </div>

          {/* Arrow indicator */}
          <ChevronRight className={cn(
            "w-4 h-4 lg:w-6 lg:h-6 xl:w-8 xl:h-8 text-neo-black/60 transition-transform rtl:rotate-180",
            "group-hover:translate-x-1 rtl:group-hover:-translate-x-1 group-hover:text-neo-black"
          )} />
        </div>

        {/* "PLAY NOW" text for not played state - hidden on small screens to save space */}
        {!hasPlayed && !compact && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="absolute top-1.5 right-10 sm:right-12 hidden sm:block"
          >
            <span className="text-[10px] font-black uppercase text-neo-black/70 bg-neo-black/10 px-1.5 py-0.5 rounded-full">
              {t('daily.playNow') || 'Play Now'}
            </span>
          </motion.div>
        )}
      </motion.div>
    </Link>
  );
};

export default DailyChallengeBanner;
