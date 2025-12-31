'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Target, Flame, Check, Clock } from 'lucide-react';
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
 * DailyChallengeBanner - Subtle card promoting the Daily Challenge
 * Clean design with puzzle number, streak badge, and completion indicator
 */
const DailyChallengeBanner: React.FC<DailyChallengeBannerProps> = ({
  className = '',
  compact = false,
}) => {
  const { t, language, dir } = useLanguage();
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

  const isRTL = dir === 'rtl';

  if (!isClient) {
    // SSR placeholder to prevent hydration mismatch
    return (
      <div className={cn(
        "w-full p-3 rounded-neo border-3 border-neo-black shadow-hard bg-neo-yellow",
        className
      )}>
        <div className="h-10" />
      </div>
    );
  }

  return (
    <Link href={`/${language}/daily`} className="block w-full group">
      <div
        className={cn(
          // Base card styles matching ModeCard
          "relative w-full rounded-neo border-3 border-neo-black shadow-hard transition-all cursor-pointer",
          // Hover/active effects matching ModeCard
          isRTL
            ? 'hover:translate-x-[2px] hover:translate-y-[-2px] hover:shadow-[-4px_4px_0px_black]'
            : 'hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_black]',
          isRTL
            ? 'active:translate-x-[-1px] active:translate-y-[1px]'
            : 'active:translate-x-[1px] active:translate-y-[1px]',
          'active:shadow-hard-pressed',
          // Solid neo-yellow for clean neo-brutalist look
          "bg-neo-yellow",
          // Subtle glow effect for visual distinction
          !hasPlayed && "ring-2 ring-neo-orange/40 ring-offset-2 ring-offset-transparent",
          compact ? "p-2" : "p-3 sm:p-4",
          className
        )}
      >
        <div className="flex items-center gap-3">
          {/* Icon */}
          <div className={cn(
            "flex items-center justify-center rounded-neo border-2 border-neo-black bg-neo-black",
            compact ? "w-8 h-8" : "w-10 h-10 sm:w-12 sm:h-12"
          )}>
            <Target className={cn(
              "text-neo-yellow",
              compact ? "w-4 h-4" : "w-5 h-5 sm:w-6 sm:h-6"
            )} />
          </div>

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
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-neo-orange/30 text-neo-black">
                  <Flame className="w-3 h-3" />
                  <span className="text-xs font-bold">{streak}</span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-neo-black/70 font-medium mt-0.5">
              <Clock className="w-3 h-3" />
              <span>
                {hasPlayed
                  ? `${t('daily.nextPuzzleIn') || 'Next'}: ${countdown}`
                  : countdown
                }
              </span>
            </div>
          </div>

          {/* Completion indicator */}
          {hasPlayed && (
            <div className="flex items-center justify-center w-8 h-8 bg-neo-lime rounded-full border-2 border-neo-black">
              <Check className="w-4 h-4 text-neo-black" strokeWidth={3} />
            </div>
          )}
        </div>
      </div>
    </Link>
  );
};

export default DailyChallengeBanner;
