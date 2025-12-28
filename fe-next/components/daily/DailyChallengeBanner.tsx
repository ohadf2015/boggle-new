'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Target, Flame, Check, Play, ChevronRight, Clock } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import {
  getDailyChallengeDate,
  getPuzzleNumber,
  getSecondsUntilNextDaily,
  formatCountdown,
  hasPlayedWordHuntToday,
  getDailyStreak,
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

  // Initialize state on client
  useEffect(() => {
    setIsClient(true);
    const date = getDailyChallengeDate();
    setPuzzleNumber(getPuzzleNumber(date));
    setHasPlayed(hasPlayedWordHuntToday(language as Language));
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

  // Refresh has played status when language changes
  useEffect(() => {
    if (!isClient) return;
    setHasPlayed(hasPlayedWordHuntToday(language as Language));
    setStreak(getDailyStreak().currentStreak);
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
          compact ? "p-2" : "p-2.5 sm:p-3",
          className
        )}
        whileHover={{ scale: 1.005 }}
        whileTap={{ scale: 0.995 }}
      >
        {/* Animated background shimmer */}
        {!hasPlayed && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full"
            animate={{ translateX: ['100%', '-100%'] }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatDelay: 1,
              ease: 'easeInOut',
            }}
          />
        )}

        <div className="relative flex items-center gap-2 sm:gap-3">
          {/* Icon */}
          <div className={cn(
            "flex items-center justify-center rounded-full border-2 border-neo-black",
            "bg-neo-black/10",
            compact ? "w-8 h-8" : "w-9 h-9 sm:w-10 sm:h-10"
          )}>
            <Target className={cn(
              "text-neo-black",
              compact ? "w-4 h-4" : "w-4 h-4 sm:w-5 sm:h-5"
            )} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <h3 className={cn(
                "font-black uppercase text-neo-black leading-tight",
                compact ? "text-xs" : "text-sm sm:text-base"
              )}>
                {t('daily.badge') || 'Daily Challenge'}
              </h3>
              <span className={cn(
                "font-black text-neo-black/80",
                compact ? "text-xs" : "text-sm sm:text-base"
              )}>
                #{puzzleNumber}
              </span>
              {streak > 0 && (
                <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-neo-black/20 rounded-full">
                  <Flame className="w-3 h-3 text-neo-orange" />
                  <span className="text-xs font-bold text-neo-black">
                    {streak}
                  </span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-neo-black/80 font-medium">
              <Clock className="w-3 h-3" />
              <span>
                {hasPlayed
                  ? `${t('daily.nextPuzzleIn') || 'Next'}: ${countdown}`
                  : countdown
                }
              </span>
            </div>
          </div>

          {/* Status / CTA */}
          <div className="flex-shrink-0">
            {hasPlayed ? (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 bg-neo-lime rounded-full border-2 border-neo-black"
              >
                <Check className="w-4 h-4 sm:w-5 sm:h-5 text-neo-black" strokeWidth={3} />
              </motion.div>
            ) : (
              <motion.div
                className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 bg-neo-black rounded-full"
                animate={{ x: [0, 2, 0] }}
                transition={{ duration: 1, repeat: Infinity, repeatDelay: 2 }}
              >
                <Play className="w-4 h-4 sm:w-5 sm:h-5 text-neo-yellow" fill="currentColor" />
              </motion.div>
            )}
          </div>

          {/* Arrow indicator */}
          <ChevronRight className={cn(
            "w-4 h-4 text-neo-black/60 transition-transform",
            "group-hover:translate-x-1 group-hover:text-neo-black"
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
