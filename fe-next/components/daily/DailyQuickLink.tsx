'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Target, Flame, Check } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import {
  hasPlayedWordHuntToday,
  getDailyStreak,
} from '@/utils/dailyChallenge';
import type { Language } from '@/types';

interface DailyQuickLinkProps {
  className?: string;
  /** When in mobile menu, show full label */
  inline?: boolean;
  /** Callback when link is clicked */
  onClick?: () => void;
}

/**
 * DailyQuickLink - Quick access button for Daily Challenge in header
 * Shows streak badge and completion status
 */
const DailyQuickLink: React.FC<DailyQuickLinkProps> = ({
  className = '',
  inline = false,
  onClick,
}) => {
  const { t, language } = useLanguage();
  const [hasPlayed, setHasPlayed] = useState<boolean>(false);
  const [streak, setStreak] = useState<number>(0);
  const [isClient, setIsClient] = useState(false);

  // Initialize state on client
  useEffect(() => {
    setIsClient(true);
    setHasPlayed(hasPlayedWordHuntToday(language as Language));
    setStreak(getDailyStreak().currentStreak);
  }, [language]);

  if (!isClient) {
    return null;
  }

  // Inline mode (for mobile menu)
  if (inline) {
    return (
      <Link
        href={`/${language}/daily`}
        onClick={onClick}
        className={cn(
          "flex items-center gap-3 w-full px-3 py-3 rounded-neo border-2 transition-all",
          "font-bold text-sm",
          hasPlayed
            ? "bg-neo-lime/20 border-neo-lime text-neo-black dark:text-white"
            : "bg-gradient-to-r from-neo-orange/20 to-neo-yellow/20 border-neo-orange text-neo-black dark:text-white",
          "hover:shadow-hard-sm active:translate-x-[1px] active:translate-y-[1px]",
          className
        )}
      >
        <div className={cn(
          "flex items-center justify-center w-8 h-8 rounded-full border-2 border-neo-black",
          hasPlayed ? "bg-neo-lime" : "bg-neo-orange"
        )}>
          {hasPlayed ? (
            <Check className="w-4 h-4 text-neo-black" strokeWidth={3} />
          ) : (
            <Target className="w-4 h-4 text-neo-black" />
          )}
        </div>
        <div className="flex-1">
          <div className="font-black uppercase">
            {t('daily.badge') || 'Daily Challenge'}
          </div>
          <div className="text-xs font-medium opacity-80">
            {hasPlayed
              ? t('daily.completed') || 'Completed!'
              : t('daily.playNow') || 'Play Now'
            }
          </div>
        </div>
        {streak > 0 && (
          <div className="flex items-center gap-1 px-2 py-1 bg-neo-black/10 rounded-full">
            <Flame className="w-3 h-3 text-neo-orange" />
            <span className="text-xs font-black">{streak}</span>
          </div>
        )}
      </Link>
    );
  }

  // Compact mode (for header)
  return (
    <Link
      href={`/${language}/daily`}
      onClick={onClick}
      className={cn(
        "relative flex items-center justify-center",
        "min-w-[44px] min-h-[44px] w-11 h-11 lg:w-12 lg:h-12 xl:w-12 xl:h-12 2xl:w-14 2xl:h-14",
        "border-3 lg:border-3 2xl:border-3 border-neo-black",
        "rounded-neo lg:rounded-neo shadow-hard lg:shadow-hard 2xl:shadow-hard-lg",
        "hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-hard-lg",
        "active:translate-x-[1px] active:translate-y-[1px] active:shadow-hard-sm",
        "transition-all duration-100",
        hasPlayed
          ? "bg-neo-lime"
          : "bg-gradient-to-br from-neo-orange to-neo-yellow",
        className
      )}
      aria-label={`${t('daily.badge') || 'Daily Challenge'}${streak > 0 ? ` - ${streak} ${t('daily.streak') || 'streak'}` : ''}`}
    >
      {hasPlayed ? (
        <Check className="w-5 h-5 lg:w-5 lg:h-5 xl:w-6 xl:h-6 2xl:w-6 2xl:h-6 text-neo-black" strokeWidth={3} />
      ) : (
        <motion.div
          animate={!hasPlayed ? { scale: [1, 1.1, 1] } : {}}
          transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
        >
          <Target className="w-5 h-5 lg:w-5 lg:h-5 xl:w-6 xl:h-6 2xl:w-6 2xl:h-6 text-neo-black" />
        </motion.div>
      )}

      {/* Streak badge */}
      {streak > 0 && !hasPlayed && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-neo-orange text-neo-black text-[10px] font-black rounded-full border-2 border-neo-black"
        >
          <Flame className="w-2.5 h-2.5 mr-0.5" />
          {streak}
        </motion.span>
      )}

      {/* Completion badge */}
      {hasPlayed && streak > 0 && (
        <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-neo-lime text-neo-black text-[10px] font-black rounded-full border-2 border-neo-black">
          {streak}
        </span>
      )}
    </Link>
  );
};

export default DailyQuickLink;
